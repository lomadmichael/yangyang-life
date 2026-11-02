"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { generateAccessCode, hashAccessCode, normalizeAccessCode } from "@/lib/access-code";
import {
  isUuid,
  isVerifiedMethod,
  parseActivityInput,
  parseMenuInput,
  parsePlaceInput,
} from "@/lib/admin-input";
import { isRole } from "@/lib/permissions";
import { ADMIN_COOKIE, ADMIN_COOKIE_PATH, SESSION_TTL_S, makeSession } from "@/lib/session";
import { serviceClient } from "@/lib/supabase";
import { draftEnglish, translationAvailable } from "@/lib/translate";
import { authorize, type ActionResult } from "./auth";

// 관리 화면 서버 액션. 모든 액션이 레이아웃과 별개로 세션 + can() 을 직접 검사한다(R20).
// 쓰기는 전부 service role. 코드·비밀키는 로그에 남기지 않는다.

type Fail = { ok: false; message: string };
const fail = (message: string): Fail => ({ ok: false, message });
const SERVER_ERR = "저장하지 못했어요. 잠시 뒤 다시 해 주세요.";

function logErr(where: string, e: unknown) {
  console.error(`[admin:${where}]`, e && typeof e === "object" && "message" in e ? (e as { message: string }).message : e);
}

/** 공개 화면 전부(/ko·/en 아래) + 관리 화면 다시 그리기 */
function refreshAll() {
  revalidatePath("/[lang]", "layout");
  revalidatePath("/admin", "layout");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────── 로그인 ─────────────────────────

export async function login(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const raw = formData.get("code");
  const code = normalizeAccessCode(typeof raw === "string" ? raw : "");
  const started = Date.now();
  const generic = async () => {
    // 실패는 항상 같은 문구 + 약 1초 지연 (코드 맞히기 늦추기)
    await sleep(Math.max(0, 1000 - (Date.now() - started)));
    return fail("코드가 맞지 않아요. 다시 확인해 주세요.");
  };
  if (!code) return generic();

  let id: string;
  try {
    const { data, error } = await serviceClient()
      .from("contributors")
      .select("id,role")
      .eq("access_code_hash", hashAccessCode(code))
      .limit(2);
    if (error) throw error;
    if (!data || data.length !== 1 || !isRole(data[0].role)) return generic();
    id = data[0].id as string;
  } catch (e) {
    logErr("login", e);
    return fail("지금은 로그인할 수 없어요. 잠시 뒤 다시 해 주세요.");
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, makeSession(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: ADMIN_COOKIE_PATH,
    maxAge: SESSION_TTL_S,
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, "", { path: ADMIN_COOKIE_PATH, maxAge: 0, httpOnly: true, sameSite: "lax" });
  redirect("/admin/login");
}

// ───────────────────────── 가게 ─────────────────────────

export async function savePlace(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { admin, denied } = await authorize("edit_content");
  if (!admin) return denied;
  if (id !== null && !isUuid(id)) return fail("잘못된 가게입니다.");
  const parsed = parsePlaceInput(input);
  if (!parsed.ok) return fail(parsed.error);

  const db = serviceClient();
  try {
    if (id === null) {
      const { data, error } = await db
        .from("places")
        .insert({ ...parsed.value, created_by: admin.id, is_sample: false })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") return fail("같은 주소 이름(slug)이 이미 있어요. 다른 이름으로 바꿔 주세요.");
        throw error;
      }
      refreshAll();
      return { ok: true, message: "새 가게를 저장했어요.", data: { id: data.id as string } };
    }
    const { data, error } = await db.from("places").update(parsed.value).eq("id", id).select("id");
    if (error) {
      if (error.code === "23505") return fail("같은 주소 이름(slug)이 이미 있어요. 다른 이름으로 바꿔 주세요.");
      throw error;
    }
    if (!data?.length) return fail("가게를 찾을 수 없어요.");
    refreshAll();
    return { ok: true, message: "저장했어요.", data: { id } };
  } catch (e) {
    logErr("savePlace", e);
    return fail(SERVER_ERR);
  }
}

async function markVerified(table: "places" | "activities", id: string, method: unknown): Promise<ActionResult> {
  const { admin, denied } = await authorize("edit_content");
  if (!admin) return denied;
  if (!isUuid(id)) return fail("잘못된 항목입니다.");
  if (!isVerifiedMethod(method)) return fail("확인 방법을 골라 주세요.");
  try {
    const { data, error } = await serviceClient()
      .from(table)
      .update({ verified_at: new Date().toISOString(), verified_by: admin.id, verified_method: method })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!data?.length) return fail("항목을 찾을 수 없어요.");
  } catch (e) {
    logErr("verify", e);
    return fail(SERVER_ERR);
  }
  refreshAll();
  return { ok: true, message: `확인 완료로 기록했어요 (${admin.display_name}).` };
}

export async function verifyPlace(id: string, method: string): Promise<ActionResult> {
  return markVerified("places", id, method);
}

export async function deletePlace(id: string): Promise<ActionResult> {
  const { admin, denied } = await authorize("delete_content");
  if (!admin) return denied;
  if (!isUuid(id)) return fail("잘못된 가게입니다.");
  const db = serviceClient();
  try {
    const { data: place, error: getErr } = await db.from("places").select("photos").eq("id", id).maybeSingle();
    if (getErr) throw getErr;
    if (!place) return fail("가게를 찾을 수 없어요.");
    const own = ((place.photos as string[]) ?? []).filter((p) => !/^https?:\/\//.test(p));
    if (own.length) {
      const { error: rmErr } = await db.storage.from(PHOTO_BUCKET).remove(own);
      if (rmErr) logErr("deletePlace:photos", rmErr); // 사진 정리 실패는 삭제를 막지 않는다
    }
    // 이 가게에 달린 팁도 같이 지운다(대상이 없는 팁은 어디에도 안 보임)
    const { error: tipErr } = await db.from("tips").delete().eq("target_type", "place").eq("target_id", id);
    if (tipErr) throw tipErr;
    const { error } = await db.from("places").delete().eq("id", id); // 메뉴는 cascade
    if (error) throw error;
  } catch (e) {
    logErr("deletePlace", e);
    return fail("지우지 못했어요.");
  }
  refreshAll();
  redirect("/admin/places");
}

// ───────────────────────── 사진 ─────────────────────────

const PHOTO_BUCKET = "place-photos";
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_MAX_COUNT = 12;
const PHOTO_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function loadPlaceForPhotos(id: string) {
  const { data, error } = await serviceClient()
    .from("places")
    .select("id,code,status,photos")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; code: string; status: string; photos: string[] } | null;
}

export async function uploadPlacePhoto(formData: FormData): Promise<ActionResult> {
  const { admin, denied } = await authorize("edit_content");
  if (!admin) return denied;
  const placeId = formData.get("place_id");
  const file = formData.get("file");
  if (typeof placeId !== "string" || !isUuid(placeId)) return fail("잘못된 가게입니다.");
  if (!(file instanceof File) || file.size === 0) return fail("사진 파일을 골라 주세요.");
  const ext = PHOTO_EXT[file.type];
  if (!ext) return fail("JPG·PNG·WEBP 사진만 올릴 수 있어요.");
  if (file.size > PHOTO_MAX_BYTES) return fail("사진이 5MB보다 커요.");

  const db = serviceClient();
  try {
    const place = await loadPlaceForPhotos(placeId);
    if (!place) return fail("가게를 찾을 수 없어요.");
    if (place.status !== "participating") return fail("사진은 참여 가게(동의한 가게)만 올릴 수 있어요.");
    if ((place.photos ?? []).length >= PHOTO_MAX_COUNT) return fail(`사진은 ${PHOTO_MAX_COUNT}장까지예요.`);

    const name = `${place.code}/${Date.now().toString(36)}-${randomBytes(4).toString("hex")}.${ext}`;
    const { error: upErr } = await db.storage
      .from(PHOTO_BUCKET)
      .upload(name, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (upErr) throw upErr;
    const { error } = await db
      .from("places")
      .update({ photos: [...(place.photos ?? []), name] })
      .eq("id", placeId);
    if (error) {
      await db.storage.from(PHOTO_BUCKET).remove([name]);
      throw error;
    }
  } catch (e) {
    logErr("uploadPhoto", e);
    return fail("사진을 올리지 못했어요.");
  }
  refreshAll();
  return { ok: true, message: "사진을 올렸어요." };
}

export async function removePlacePhoto(placeId: string, name: string): Promise<ActionResult> {
  const { admin, denied } = await authorize("edit_content");
  if (!admin) return denied;
  if (!isUuid(placeId) || typeof name !== "string") return fail("잘못된 요청입니다.");
  const db = serviceClient();
  try {
    const place = await loadPlaceForPhotos(placeId);
    if (!place || !(place.photos ?? []).includes(name)) return fail("사진을 찾을 수 없어요.");
    const { error } = await db
      .from("places")
      .update({ photos: place.photos.filter((p) => p !== name) })
      .eq("id", placeId);
    if (error) throw error;
    if (!/^https?:\/\//.test(name)) {
      const { error: rmErr } = await db.storage.from(PHOTO_BUCKET).remove([name]);
      if (rmErr) logErr("removePhoto:storage", rmErr);
    }
  } catch (e) {
    logErr("removePhoto", e);
    return fail("사진을 지우지 못했어요.");
  }
  refreshAll();
  return { ok: true, message: "사진을 뺐어요." };
}

export async function makeCoverPhoto(placeId: string, name: string): Promise<ActionResult> {
  const { admin, denied } = await authorize("edit_content");
  if (!admin) return denied;
  if (!isUuid(placeId) || typeof name !== "string") return fail("잘못된 요청입니다.");
  try {
    const place = await loadPlaceForPhotos(placeId);
    if (!place || !(place.photos ?? []).includes(name)) return fail("사진을 찾을 수 없어요.");
    const { error } = await serviceClient()
      .from("places")
      .update({ photos: [name, ...place.photos.filter((p) => p !== name)] })
      .eq("id", placeId);
    if (error) throw error;
  } catch (e) {
    logErr("coverPhoto", e);
    return fail(SERVER_ERR);
  }
  refreshAll();
  return { ok: true, message: "대표 사진으로 바꿨어요." };
}

// ───────────────────────── 메뉴 ─────────────────────────

/** 메뉴 전체 저장: 화면의 순서가 곧 sort. 화면에서 뺀 줄은 지운다(메뉴 줄 정리는 내용 편집으로 본다) */
export async function saveMenu(placeId: string, rows: unknown): Promise<ActionResult> {
  const { admin, denied } = await authorize("edit_content");
  if (!admin) return denied;
  if (!isUuid(placeId)) return fail("잘못된 가게입니다.");
  const parsed = parseMenuInput(rows);
  if (!parsed.ok) return fail(parsed.error);

  const db = serviceClient();
  try {
    const { data: place, error: pErr } = await db.from("places").select("id").eq("id", placeId).maybeSingle();
    if (pErr) throw pErr;
    if (!place) return fail("가게를 찾을 수 없어요.");
    const { data: existing, error: eErr } = await db.from("menu_items").select("id").eq("place_id", placeId);
    if (eErr) throw eErr;
    const existingIds = new Set((existing ?? []).map((r) => r.id as string));

    const keep = parsed.value.filter((r) => r.id && existingIds.has(r.id));
    const fresh = parsed.value.filter((r) => !r.id || !existingIds.has(r.id)).map((r) => {
      const row = { ...r };
      delete row.id;
      return row;
    });
    const removed = [...existingIds].filter((id) => !keep.some((r) => r.id === id));

    if (removed.length) {
      const { error } = await db.from("menu_items").delete().eq("place_id", placeId).in("id", removed);
      if (error) throw error;
    }
    if (keep.length) {
      const { error } = await db.from("menu_items").upsert(keep.map((r) => ({ ...r, place_id: placeId })));
      if (error) throw error;
    }
    if (fresh.length) {
      const { error } = await db.from("menu_items").insert(fresh.map((r) => ({ ...r, place_id: placeId })));
      if (error) throw error;
    }
  } catch (e) {
    logErr("saveMenu", e);
    return fail(SERVER_ERR);
  }
  refreshAll();
  return { ok: true, message: `메뉴 ${parsed.value.length}개를 저장했어요.` };
}

// ───────────────────────── 할 거리 ─────────────────────────

export async function saveActivity(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { admin, denied } = await authorize("edit_content");
  if (!admin) return denied;
  if (id !== null && !isUuid(id)) return fail("잘못된 항목입니다.");
  const parsed = parseActivityInput(input);
  if (!parsed.ok) return fail(parsed.error);

  const db = serviceClient();
  try {
    if (parsed.value.place_id) {
      const { data: p, error } = await db.from("places").select("id").eq("id", parsed.value.place_id).maybeSingle();
      if (error) throw error;
      if (!p) return fail("연결한 가게를 찾을 수 없어요.");
    }
    if (id === null) {
      const { data, error } = await db
        .from("activities")
        .insert({ ...parsed.value, created_by: admin.id, is_sample: false })
        .select("id")
        .single();
      if (error) throw error;
      refreshAll();
      return { ok: true, message: "새 할 거리를 저장했어요.", data: { id: data.id as string } };
    }
    const { data, error } = await db.from("activities").update(parsed.value).eq("id", id).select("id");
    if (error) throw error;
    if (!data?.length) return fail("항목을 찾을 수 없어요.");
  } catch (e) {
    logErr("saveActivity", e);
    return fail(SERVER_ERR);
  }
  refreshAll();
  return { ok: true, message: "저장했어요.", data: { id } };
}

export async function verifyActivity(id: string, method: string): Promise<ActionResult> {
  return markVerified("activities", id, method);
}

export async function deleteActivity(id: string): Promise<ActionResult> {
  const { admin, denied } = await authorize("delete_content");
  if (!admin) return denied;
  if (!isUuid(id)) return fail("잘못된 항목입니다.");
  const db = serviceClient();
  try {
    const { error: tipErr } = await db.from("tips").delete().eq("target_type", "activity").eq("target_id", id);
    if (tipErr) throw tipErr;
    const { error } = await db.from("activities").delete().eq("id", id);
    if (error) throw error;
  } catch (e) {
    logErr("deleteActivity", e);
    return fail("지우지 못했어요.");
  }
  refreshAll();
  redirect("/admin/activities");
}

// ───────────────────────── 팁함 ─────────────────────────

/** 「처리 완료」 — 로그인한 누구나(R6) */
export async function setTipHandled(id: string, handled: boolean): Promise<ActionResult> {
  const { admin, denied } = await authorize("edit_content");
  if (!admin) return denied;
  if (!isUuid(id)) return fail("잘못된 팁입니다.");
  try {
    const { data, error } = await serviceClient()
      .from("tips")
      .update({ handled_at: handled ? new Date().toISOString() : null })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!data?.length) return fail("팁을 찾을 수 없어요.");
  } catch (e) {
    logErr("tipHandled", e);
    return fail(SERVER_ERR);
  }
  refreshAll();
  return { ok: true, message: handled ? "처리 완료로 표시했어요." : "처리 전으로 되돌렸어요." };
}

/** 숨김/해제 — owner 만 */
export async function setTipHidden(id: string, hidden: boolean): Promise<ActionResult> {
  const { admin, denied } = await authorize("hide_tip");
  if (!admin) return denied;
  if (!isUuid(id)) return fail("잘못된 팁입니다.");
  try {
    const { data, error } = await serviceClient().from("tips").update({ hidden }).eq("id", id).select("id");
    if (error) throw error;
    if (!data?.length) return fail("팁을 찾을 수 없어요.");
  } catch (e) {
    logErr("tipHidden", e);
    return fail(SERVER_ERR);
  }
  refreshAll();
  return { ok: true, message: hidden ? "숨겼어요." : "다시 보이게 했어요." };
}

// ───────────────────────── 기여자 (owner) ─────────────────────────

function contributorFields(input: unknown) {
  const r = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const s = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  return {
    display_name: s(r.display_name, 40),
    team: s(r.team, 40),
    role_label: s(r.role_label, 40),
    cohort: s(r.cohort, 40),
    show: r.show !== false,
    role: isRole(r.role) ? r.role : "member",
  };
}

export async function createContributor(input: unknown): Promise<ActionResult> {
  const { admin, denied } = await authorize("manage_contributors");
  if (!admin) return denied;
  const f = contributorFields(input);
  if (!f.display_name) return fail("이름을 적어 주세요.");
  try {
    const { error } = await serviceClient()
      .from("contributors")
      .insert({ ...f, is_sample: false });
    if (error) throw error;
  } catch (e) {
    logErr("createContributor", e);
    return fail(SERVER_ERR);
  }
  refreshAll();
  return { ok: true, message: `${f.display_name} 님을 추가했어요. 「코드 발급」을 눌러 코드를 전해 주세요.` };
}

export async function updateContributor(id: string, input: unknown): Promise<ActionResult> {
  const { admin, denied } = await authorize("manage_contributors");
  if (!admin) return denied;
  if (!isUuid(id)) return fail("잘못된 기여자입니다.");
  const f = contributorFields(input);
  if (!f.display_name) return fail("이름을 적어 주세요.");
  if (id === admin.id && f.role !== "owner") return fail("자기 자신의 owner 권한은 뺄 수 없어요.");
  try {
    const { data, error } = await serviceClient().from("contributors").update(f).eq("id", id).select("id");
    if (error) throw error;
    if (!data?.length) return fail("기여자를 찾을 수 없어요.");
  } catch (e) {
    logErr("updateContributor", e);
    return fail(SERVER_ERR);
  }
  refreshAll();
  return { ok: true, message: "저장했어요." };
}

/** 코드 발급(재발급) — 코드는 이 응답에서 한 번만 보여 준다 */
export async function issueContributorCode(id: string): Promise<ActionResult<{ code: string }>> {
  const { admin, denied } = await authorize("manage_contributors");
  if (!admin) return denied;
  if (!isUuid(id)) return fail("잘못된 기여자입니다.");
  const db = serviceClient();
  try {
    let code: string | null = null;
    for (let i = 0; i < 5 && !code; i++) {
      const c = generateAccessCode();
      const { count, error } = await db
        .from("contributors")
        .select("id", { count: "exact", head: true })
        .eq("access_code_hash", hashAccessCode(c));
      if (error) throw error;
      if (!count) code = c;
    }
    if (!code) return fail("코드를 만들지 못했어요. 다시 눌러 주세요.");
    const { data, error } = await db
      .from("contributors")
      .update({ access_code_hash: hashAccessCode(code) })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!data?.length) return fail("기여자를 찾을 수 없어요.");
    refreshAll();
    return { ok: true, message: "새 코드를 만들었어요. 이전 코드는 이제 안 돼요.", data: { code } };
  } catch (e) {
    logErr("issueCode", e);
    return fail(SERVER_ERR);
  }
}

/** 코드 회수 — 그 사람은 바로 로그인이 풀린다 */
export async function revokeContributorCode(id: string): Promise<ActionResult> {
  const { admin, denied } = await authorize("manage_contributors");
  if (!admin) return denied;
  if (!isUuid(id)) return fail("잘못된 기여자입니다.");
  if (id === admin.id) return fail("자기 코드는 회수할 수 없어요.");
  try {
    const { error } = await serviceClient().from("contributors").update({ access_code_hash: null }).eq("id", id);
    if (error) throw error;
  } catch (e) {
    logErr("revokeCode", e);
    return fail(SERVER_ERR);
  }
  refreshAll();
  return { ok: true, message: "코드를 회수했어요." };
}

// ───────────────────────── 번역 초안 ─────────────────────────

export async function draftEnglishAction(fields: Record<string, string>): Promise<ActionResult<Record<string, string>>> {
  const { admin, denied } = await authorize("edit_content");
  if (!admin) return denied;
  if (!translationAvailable()) return fail("번역 초안 기능이 꺼져 있어요(키 없음).");
  if (!fields || typeof fields !== "object") return fail("잘못된 요청입니다.");
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields).slice(0, 20)) {
    if (/^[a-z_0-9]{1,40}$/i.test(k) && typeof v === "string") clean[k] = v;
  }
  try {
    const out = await draftEnglish(clean);
    return { ok: true, message: "초안을 채웠어요. 읽어 보고 고친 뒤 저장해 주세요.", data: out };
  } catch (e) {
    logErr("draftEnglish", e);
    return fail("번역 초안을 만들지 못했어요.");
  }
}
