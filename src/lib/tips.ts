// 사용자 팁 검사 규칙 — 순수 함수만 둔다(서버 액션과 테스트가 같이 쓴다).

export const TIP_KINDS = ["changed", "tip", "directions"] as const;
export type TipKind = (typeof TIP_KINDS)[number];

export const NICKNAME_MAX = 20;
export const BODY_MIN = 2;
export const BODY_MAX = 500;
export const CONTACT_MAX = 100;
/** 같은 기기: 60초 안에 1건, 24시간 안에 10건까지 */
export const POST_GAP_MS = 60_000;
export const POST_DAY_MS = 24 * 60 * 60_000;
export const POST_DAY_LIMIT = 10;
/** 서로 다른 기기 신고가 이만큼 모이면 자동 숨김 */
export const REPORT_HIDE_AT = 3;

export type TipRejectReason = "length" | "link" | "phone" | "kind" | "nickname";

export interface TipInput {
  kind: TipKind;
  body: string;
  nickname: string;
  /** 비공개 연락처 — 운영진만 본다. 전화번호 검사는 하지 않는다 */
  contact?: string;
}

export function isTipKind(v: unknown): v is TipKind {
  return typeof v === "string" && (TIP_KINDS as readonly string[]).includes(v);
}

// 링크: http(s)://, www., 맨 도메인(abc.com · naver.me/x · shop.co.kr)
const LINK_RE = /https?:\/\/|\bwww\.|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b/i;

// 전화: 한국 휴대폰·지역번호·070, 구분자(공백 . -) 있든 없든, +82 국제 표기 포함
const PHONE_RE = /(?<!\d)(?:\+82[\s.-]?0?|0)(?:1[016789]|2|[3-6][1-5]|70)[\s.-]?\d{3,4}[\s.-]?\d{4}(?!\d)/;

export function hasLink(text: string): boolean {
  return LINK_RE.test(text);
}

export function hasPhone(text: string): boolean {
  return PHONE_RE.test(text);
}

/** 검사 순서: 종류 → 닉네임 → 길이 → 링크 → 전화 */
export function validateTip(input: TipInput): { ok: true } | { ok: false; reason: TipRejectReason } {
  if (!isTipKind(input.kind)) return { ok: false, reason: "kind" };
  const nickname = typeof input.nickname === "string" ? input.nickname.trim() : "";
  if (nickname.length < 1 || nickname.length > NICKNAME_MAX) return { ok: false, reason: "nickname" };
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (body.length < BODY_MIN || body.length > BODY_MAX) return { ok: false, reason: "length" };
  if (hasLink(body)) return { ok: false, reason: "link" };
  if (hasPhone(body)) return { ok: false, reason: "phone" };
  return { ok: true };
}

/** 같은 기기의 최근 작성 시각으로 지금 써도 되는지 */
export function canPost(recent: Date[], now: Date): boolean {
  const nowMs = now.getTime();
  let inDay = 0;
  for (const d of recent) {
    // DB 시계가 조금 앞서면 방금 쓴 글이 "미래"로 보일 수 있다 → 0초 전으로 친다(막는 쪽)
    const age = Math.max(0, nowMs - d.getTime());
    if (age < POST_GAP_MS) return false;
    if (age < POST_DAY_MS) inDay += 1;
  }
  return inDay < POST_DAY_LIMIT;
}
