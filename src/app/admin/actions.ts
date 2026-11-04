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
  parseStoryInput,
} from "@/lib/admin-input";
import { photoUrl } from "@/lib/format";
import { isRole } from "@/lib/permissions";
import { canEditStory, nextStatusOnSave } from "@/lib/story-status";
import {
  PHOTO_BUCKET,
  orphanStoryPhotos,
  realPhotoObjects,
  storyPhotoFolder,
  storyPhotoUrls,
  usesOtherStoryPhoto,
  type StorageObject,
} from "@/lib/story-photos";
import type { StoryStatus } from "@/lib/types";
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

// Vercel 함수 요청 본문 한도 4.5MB 보다 작게 (next.config.ts bodySizeLimit 4.5mb, PhotoManager MAX_BYTES 와 같이)
const PHOTO_MAX_BYTES = 4 * 1024 * 1024;
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
  if (file.size > PHOTO_MAX_BYTES) return fail("사진이 너무 커요(4MB 이하). 휴대폰에서 JPG로 저장해 다시 올려 주세요.");

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
    const db = serviceClient();
    if (!hidden) {
      // 다시 보이게 할 때는 신고 기록을 비운다 — 안 비우면 다음 신고 1건에 3건 이상으로 세어 바로 다시 숨겨진다
      const { error: delErr } = await db.from("tip_reports").delete().eq("tip_id", id);
      if (delErr) throw delErr;
    }
    const { data, error } = await db
      .from("tips")
      .update(hidden ? { hidden } : { hidden, report_count: 0 })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!data?.length) return fail("팁을 찾을 수 없어요.");
  } catch (e) {
    logErr("tipHidden", e);
    return fail(SERVER_ERR);
  }
  refreshAll();
  return { ok: true, message: hidden ? "숨겼어요." : "다시 보이게 했어요. 신고 기록도 비웠어요." };
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

// ───────────────────────── 이야기 ─────────────────────────
// 권한: 쓰기·검토 요청 = edit_content + canEditStory(member 는 자기 글만), 공개·돌려보내기·공개 내리기·가이드 확인 = publish_story.
// 작성자 여부는 언제나 DB 의 author_id 와 로그인한 사람을 비교해 서버에서 정한다(브라우저가 보낸 값은 받지 않음).
// 상태를 바꾸는 update 는 「읽은 그 상태일 때만」(eq status) 실행한다 — 그사이 편집이 공개했는데 member 저장이
// 공개 상태를 유지한 채 덮어쓰는 경합을 막는다.

const STALE_STATE = "그사이 이 이야기의 상태가 바뀌었어요. 화면을 새로 고친 뒤 다시 해 주세요.";
const SLUG_TAKEN = "같은 주소 이름(slug)의 이야기가 이미 있어요. 다른 이름으로 바꿔 주세요.";
const NOT_YOURS = "다른 사람이 쓴 이야기는 편집·운영 담당만 고칠 수 있어요.";
const NOTE_MAX = 500;

interface StoryMeta {
  id: string;
  author_id: string | null;
  status: StoryStatus;
  published_at: string | null;
}

async function loadStoryMeta(id: string): Promise<StoryMeta | null> {
  const { data, error } = await serviceClient()
    .from("stories")
    .select("id,author_id,status,published_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as StoryMeta | null) ?? null;
}

const SAVED_MSG: Record<StoryStatus, string> = {
  draft: "초안을 저장했어요. 방문객에게는 아직 안 보여요.",
  returned: "저장했어요. 다 고쳤으면 「다시 검토 요청」을 눌러 주세요.",
  review: "검토를 요청했어요 — 편집이 보고 공개하면 방문객에게 보여요.",
  published: "저장했어요. 공개 화면에 바로 반영돼요.",
};

/**
 * 이야기 저장(초안 저장 / 검토 요청). 새 글(id=null)의 글쓴이는 로그인한 사람.
 * member 가 공개된 자기 글을 저장하면 다시 검토 대기로 내려간다(nextStatusOnSave).
 */
export async function saveStory(
  id: string | null,
  input: unknown,
  intent: "save" | "submit",
): Promise<ActionResult<{ id: string; status: StoryStatus }>> {
  const { admin, denied } = await authorize("edit_content");
  if (!admin) return denied;
  if (id !== null && !isUuid(id)) return fail("잘못된 이야기입니다.");
  if (intent !== "save" && intent !== "submit") return fail("잘못된 요청입니다.");
  const parsed = parseStoryInput(input, supabaseUrl());
  if (!parsed.ok) return fail(parsed.error);
  const row = parsed.value;
  if (usesOtherStoryPhoto(storyPhotoUrls(row), id, supabaseUrl())) {
    return fail("다른 이야기에 올린 사진은 쓸 수 없어요 — 이 이야기에서 사진을 다시 올려 주세요.");
  }
  if (intent === "submit" && !row.cover_photo) {
    return fail("대표 사진이 있어야 검토를 요청할 수 있어요 — 대표 사진 칸에서 올려 주세요.");
  }

  const db = serviceClient();
  try {
    if (id === null) {
      const status = nextStatusOnSave("draft", admin.role, true, intent);
      if (status === "forbidden") return fail(NOT_YOURS);
      const slug = row.slug ?? `story-${randomBytes(4).toString("hex")}`;
      const { data, error } = await db
        .from("stories")
        .insert({ ...row, slug, status, author_id: admin.id, is_sample: false })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") return fail(SLUG_TAKEN);
        throw error;
      }
      refreshAll();
      return { ok: true, message: SAVED_MSG[status], data: { id: data.id as string, status } };
    }

    const meta = await loadStoryMeta(id);
    if (!meta) return fail("이야기를 찾을 수 없어요.");
    const isAuthor = meta.author_id !== null && meta.author_id === admin.id;
    const status = nextStatusOnSave(meta.status, admin.role, isAuthor, intent);
    if (status === "forbidden") return fail(NOT_YOURS);

    const { slug, ...rest } = row;
    const update: Record<string, unknown> = { ...rest, status };
    if (slug) update.slug = slug; // 비우면 지금 주소 이름을 그대로 둔다
    const { data, error } = await db.from("stories").update(update).eq("id", id).eq("status", meta.status).select("id");
    if (error) {
      if (error.code === "23505") return fail(SLUG_TAKEN);
      throw error;
    }
    if (!data?.length) return fail(STALE_STATE);
    await cleanupStoryPhotos(id, storyPhotoUrls(row));
    refreshAll();
    const message =
      meta.status === "published" && status === "review"
        ? "저장했어요. 공개 글을 고쳐서 검토 대기로 바뀌었어요 — 편집이 다시 공개할 때까지 방문객에게 안 보여요."
        : SAVED_MSG[status];
    return { ok: true, message, data: { id, status } };
  } catch (e) {
    logErr("saveStory", e);
    return fail(SERVER_ERR);
  }
}

/** 공개 — 처음 공개할 때만 published_at 을 지금으로. 돌려보내기 메모는 지운다 */
export async function publishStory(id: string): Promise<ActionResult> {
  const { admin, denied } = await authorize("publish_story");
  if (!admin) return denied;
  if (!isUuid(id)) return fail("잘못된 이야기입니다.");
  try {
    const meta = await loadStoryMeta(id);
    if (!meta) return fail("이야기를 찾을 수 없어요.");
    if (meta.status === "published") return { ok: true, message: "이미 공개된 이야기예요." };
    const { data, error } = await serviceClient()
      .from("stories")
      .update({ status: "published", published_at: meta.published_at ?? new Date().toISOString(), review_note: null })
      .eq("id", id)
      .eq("status", meta.status)
      .select("id");
    if (error) throw error;
    if (!data?.length) return fail(STALE_STATE);
  } catch (e) {
    logErr("publishStory", e);
    return fail(SERVER_ERR);
  }
  refreshAll();
  return { ok: true, message: "공개했어요 — 방문객 이야기 목록에 보여요." };
}

/** 돌려보내기 — 메모 1~500자 필수. 글쓴이 화면 맨 위에 보인다. 공개 글을 돌려보내면 공개에서도 내려간다 */
export async function returnStory(id: string, note: string): Promise<ActionResult> {
  const { admin, denied } = await authorize("publish_story");
  if (!admin) return denied;
  if (!isUuid(id)) return fail("잘못된 이야기입니다.");
  const memo = typeof note === "string" ? note.trim() : "";
  if (!memo) return fail("메모를 적어야 돌려보낼 수 있어요 — 글쓴이가 무엇을 고칠지 알 수 있게.");
  if (memo.length > NOTE_MAX) return fail(`메모는 ${NOTE_MAX}자까지예요.`);
  try {
    const meta = await loadStoryMeta(id);
    if (!meta) return fail("이야기를 찾을 수 없어요.");
    const { data, error } = await serviceClient()
      .from("stories")
      .update({ status: "returned", review_note: memo })
      .eq("id", id)
      .eq("status", meta.status)
      .select("id");
    if (error) throw error;
    if (!data?.length) return fail(STALE_STATE);
  } catch (e) {
    logErr("returnStory", e);
    return fail(SERVER_ERR);
  }
  refreshAll();
  return { ok: true, message: "돌려보냈어요. 글쓴이 화면 맨 위에 메모가 보여요." };
}

/** 공개 내리기 — 초안으로 되돌린다(방문객 화면에서 바로 사라짐) */
export async function unpublishStory(id: string): Promise<ActionResult> {
  const { admin, denied } = await authorize("publish_story");
  if (!admin) return denied;
  if (!isUuid(id)) return fail("잘못된 이야기입니다.");
  try {
    const { data, error } = await serviceClient()
      .from("stories")
      .update({ status: "draft" })
      .eq("id", id)
      .eq("status", "published")
      .select("id");
    if (error) throw error;
    if (!data?.length) return fail("공개 중인 이야기가 아니에요. 화면을 새로 고쳐 주세요.");
  } catch (e) {
    logErr("unpublishStory", e);
    return fail(SERVER_ERR);
  }
  refreshAll();
  return { ok: true, message: "공개를 내렸어요. 초안으로 돌아갔어요." };
}

/** 가이드 「마지막 확인」 — 오늘 다시 봤다는 기록(verified_at=now). 가이드만 */
export async function verifyGuide(id: string): Promise<ActionResult> {
  const { admin, denied } = await authorize("publish_story");
  if (!admin) return denied;
  if (!isUuid(id)) return fail("잘못된 이야기입니다.");
  try {
    const { data, error } = await serviceClient()
      .from("stories")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", id)
      .eq("type", "guide")
      .select("id");
    if (error) throw error;
    if (!data?.length) return fail("가이드를 찾을 수 없어요.");
  } catch (e) {
    logErr("verifyGuide", e);
    return fail(SERVER_ERR);
  }
  refreshAll();
  return { ok: true, message: `가이드를 오늘 확인한 것으로 기록했어요 (${admin.display_name}).` };
}

function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

/** 이야기 사진 폴더(stories/{id}) 의 파일 목록. 실패하면 throw */
async function listStoryPhotoObjects(storyId: string): Promise<StorageObject[]> {
  const { data, error } = await serviceClient()
    .storage.from(PHOTO_BUCKET)
    .list(storyPhotoFolder(storyId), { limit: 1000 });
  if (error) throw error;
  return (data ?? []) as StorageObject[];
}

/**
 * 저장 뒤 정리 — 이야기 폴더에서 저장된 대표 사진·사진 블록에 없는 파일을 지운다(방금 올린 것은 남김, orphanStoryPhotos).
 * 정리가 실패해도 저장은 이미 끝났으므로 로그만 남긴다.
 */
async function cleanupStoryPhotos(storyId: string, keptUrls: string[]): Promise<void> {
  try {
    const orphans = orphanStoryPhotos({
      storyId,
      objects: await listStoryPhotoObjects(storyId),
      keptUrls,
      supabaseUrl: supabaseUrl(),
      now: new Date(),
    });
    if (!orphans.length) return;
    const { error } = await serviceClient().storage.from(PHOTO_BUCKET).remove(orphans);
    if (error) throw error;
  } catch (e) {
    logErr("saveStory:cleanupPhotos", e);
  }
}

/**
 * 이야기 사진 올리기 — 가게 사진과 같은 place-photos 버킷, 경로 stories/{이야기 id}/….
 * 이야기 행은 바꾸지 않고 공개 주소만 돌려준다(브라우저가 대표 사진·사진 블록에 넣고 「저장」해야 반영).
 * 그래서 새 글은 먼저 초안을 저장해 id 가 생긴 뒤에 올릴 수 있다.
 */
export async function uploadStoryPhoto(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const { admin, denied } = await authorize("edit_content");
  if (!admin) return denied;
  const storyId = formData.get("story_id");
  const file = formData.get("file");
  if (typeof storyId !== "string" || !isUuid(storyId)) {
    return fail("먼저 「초안 저장」을 눌러 이야기를 만든 뒤 사진을 올려 주세요.");
  }
  if (!(file instanceof File) || file.size === 0) return fail("사진 파일을 골라 주세요.");
  const ext = PHOTO_EXT[file.type];
  if (!ext) return fail("JPG·PNG·WEBP 사진만 올릴 수 있어요.");
  if (file.size > PHOTO_MAX_BYTES) return fail("사진이 너무 커요(4MB 이하). 휴대폰에서 JPG로 저장해 다시 올려 주세요.");
  try {
    const meta = await loadStoryMeta(storyId);
    if (!meta) return fail("이야기를 찾을 수 없어요.");
    const isAuthor = meta.author_id !== null && meta.author_id === admin.id;
    if (!canEditStory(admin.role, isAuthor)) return fail(NOT_YOURS);
    // 한 이야기 사진 상한 = 가게 사진 상한과 같게. 저장 안 한 사진도 저장 뒤 정리 전까지는 센다
    if (realPhotoObjects(await listStoryPhotoObjects(storyId)).length >= PHOTO_MAX_COUNT) {
      return fail(`이야기 하나에 사진은 ${PHOTO_MAX_COUNT}장까지예요. 안 쓰는 사진을 빼고 「저장」해 주세요 — 올린 지 10분이 지난 사진부터 저장할 때 정리돼요.`);
    }
    const name = `${storyPhotoFolder(storyId)}/${Date.now().toString(36)}-${randomBytes(4).toString("hex")}.${ext}`;
    const { error } = await serviceClient()
      .storage.from(PHOTO_BUCKET)
      .upload(name, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (error) throw error;
    return { ok: true, message: "사진을 올렸어요. 「저장」을 눌러야 이야기에 반영돼요.", data: { url: photoUrl(name) } };
  } catch (e) {
    logErr("uploadStoryPhoto", e);
    return fail("사진을 올리지 못했어요.");
  }
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
