"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isLang, t, type DictKey, type Lang } from "@/i18n";
import { serviceClient } from "@/lib/supabase";
import { tipTargetExists } from "@/lib/queries";
import {
  CONTACT_MAX,
  DEVICE_COOKIE,
  POST_DAY_LIMIT,
  POST_DAY_MS,
  REPORT_HIDE_AT,
  canPost,
  isTipKind,
  isTipTarget,
  validateTip,
  type TipRejectReason,
} from "@/lib/tips";

// 팁 쓰기·신고 서버 액션. DB 쓰기는 전부 service role — 브라우저엔 키가 가지 않는다.

const ONE_YEAR_S = 60 * 60 * 24 * 365;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REASON_KEY: Record<TipRejectReason, DictKey> = {
  target: "tipErrTarget",
  length: "tipErrLength",
  link: "tipErrLink",
  phone: "tipErrPhone",
  kind: "tipErrKind",
  nickname: "tipErrNickname",
};

const DETAIL_ROUTE = {
  place: "/[lang]/place/[slug]",
  activity: "/[lang]/activity/[id]",
  story: "/[lang]/stories/[slug]",
} as const;

/** 기기 식별 쿠키 — 없거나 이상하면 새로 발급(1년) */
async function deviceId(): Promise<string> {
  const jar = await cookies();
  const current = jar.get(DEVICE_COOKIE)?.value;
  if (current && UUID_RE.test(current)) return current;
  const id = crypto.randomUUID();
  jar.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_S,
    path: "/",
  });
  return id;
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}

export async function submitTip(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const rawLang = str(formData.get("lang"));
  const lang: Lang = isLang(rawLang) ? rawLang : "ko";
  const say = (ok: boolean, key: DictKey) => ({ ok, message: t(lang, key) });

  const targetType = str(formData.get("target_type"));
  const targetId = str(formData.get("target_id"));
  if (!isTipTarget(targetType) || !UUID_RE.test(targetId)) return say(false, "tipErrTarget");

  const kind = str(formData.get("kind"));
  const body = str(formData.get("body"));
  const nickname = str(formData.get("nickname"));
  const checked = validateTip({ target_type: targetType, kind: kind as never, body, nickname });
  if (!checked.ok) return say(false, REASON_KEY[checked.reason]);
  if (!isTipKind(kind)) return say(false, "tipErrKind"); // 위에서 걸러지지만 타입 좁히기용

  // 연락처는 「바뀌었어요」에서만 받는다(비공개 칸, 전화번호 검사 없음)
  const contact = kind === "changed" ? str(formData.get("contact")).trim().slice(0, CONTACT_MAX) || null : null;

  try {
    if (!(await tipTargetExists(targetType, targetId))) return say(false, "tipErrTarget");

    const did = await deviceId();
    const db = serviceClient();
    const since = new Date(Date.now() - POST_DAY_MS).toISOString();
    const { data: recent, error: recentErr } = await db
      .from("tips")
      .select("created_at")
      .eq("device_id", did)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(POST_DAY_LIMIT + 1);
    if (recentErr) throw recentErr;
    const times = (recent ?? []).map((r) => new Date(r.created_at as string));
    if (!canPost(times, new Date())) {
      return say(false, times.length >= POST_DAY_LIMIT ? "tipErrTooMany" : "tipErrTooFast");
    }

    const { error: insertErr } = await db.from("tips").insert({
      target_type: targetType,
      target_id: targetId,
      kind,
      body: body.trim(),
      nickname: nickname.trim(),
      lang,
      contact,
      device_id: did,
    });
    if (insertErr) throw insertErr;
  } catch (e) {
    console.error("[submitTip]", e instanceof Error ? e.message : e);
    return say(false, "tipErrServer");
  }

  revalidatePath(DETAIL_ROUTE[targetType], "page");
  return say(true, "tipOk");
}

export async function reportTip(tipId: string): Promise<{ ok: boolean }> {
  if (typeof tipId !== "string" || !UUID_RE.test(tipId)) return { ok: false };
  try {
    const db = serviceClient();
    const { data: tip, error: tipErr } = await db
      .from("tips")
      .select("id,target_type,hidden")
      .eq("id", tipId)
      .maybeSingle();
    if (tipErr) throw tipErr;
    if (!tip) return { ok: false };

    const did = await deviceId();
    const { error: insertErr } = await db.from("tip_reports").insert({ tip_id: tipId, device_id: did });
    // 같은 기기가 두 번 신고 → unique 위반(23505) = 이미 신고함, 성공으로 친다
    if (insertErr && insertErr.code !== "23505") throw insertErr;

    const { count, error: countErr } = await db
      .from("tip_reports")
      .select("device_id", { count: "exact", head: true })
      .eq("tip_id", tipId);
    if (countErr) throw countErr;
    const reports = count ?? 0;

    // 숨김은 한 방향 — 해제는 관리 화면에서만
    const hide = !tip.hidden && reports >= REPORT_HIDE_AT;
    const { error: updErr } = await db
      .from("tips")
      .update(hide ? { report_count: reports, hidden: true } : { report_count: reports })
      .eq("id", tipId);
    if (updErr) throw updErr;

    if (hide) revalidatePath(DETAIL_ROUTE[tip.target_type as keyof typeof DETAIL_ROUTE], "page");
    return { ok: true };
  } catch (e) {
    console.error("[reportTip]", e instanceof Error ? e.message : e);
    return { ok: false };
  }
}
