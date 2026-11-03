// 사용자 팁 검사 규칙 — 순수 함수만 둔다(서버 액션과 테스트가 같이 쓴다).

export const TIP_KINDS = ["changed", "tip", "directions"] as const;
export type TipKind = (typeof TIP_KINDS)[number];

/** 팁을 달 수 있는 대상 — 가게·놀거리·이야기 */
export const TIP_TARGETS = ["place", "activity", "story"] as const;
export type TipTarget = (typeof TIP_TARGETS)[number];

export function isTipTarget(v: unknown): v is TipTarget {
  return typeof v === "string" && (TIP_TARGETS as readonly string[]).includes(v);
}

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

export type TipRejectReason = "target" | "length" | "link" | "phone" | "kind" | "nickname";

export interface TipInput {
  /** 대상 종류 — 주면 TIP_TARGETS 안인지 본다(서버 액션은 항상 준다) */
  target_type?: TipTarget;
  kind: TipKind;
  body: string;
  nickname: string;
  /** 비공개 연락처 — 운영진만 본다. 전화번호 검사는 하지 않는다 */
  contact?: string;
}

export function isTipKind(v: unknown): v is TipKind {
  return typeof v === "string" && (TIP_KINDS as readonly string[]).includes(v);
}

// 링크: http(s):// 와 www. 는 항상. 맨 도메인은 알려진 TLD 로 끝나거나 바로 뒤에 / 가 올 때만
// (Mt.Seorak · St.Mary · node.js 같은 영어 문장은 통과)
export const LINK_TLDS = [
  "com", "net", "org", "kr", "me", "io", "ly", "gl", "app", "shop", "xyz", "info", "biz", "link", "site", "page",
] as const; // co.kr 은 kr 로 끝나므로 같이 잡힌다
const LINK_PROTO_RE = /https?:\/\/|\bwww\./i;
const LINK_TLD_RE = new RegExp(String.raw`\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:${LINK_TLDS.join("|")})\b`, "i");
const LINK_SLASH_RE = /\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.[a-z]{2,}\//i;

// 전화: 먼저 NFKC(전각 숫자·괄호 → 반각) 후 여러 대시(‐‑‒–—―−﹘﹣－)·가운뎃점(·•‧∙・･)·괄호를 - 로 바꾼 뒤 본다.
// 휴대폰·지역번호·070, +82 국제 표기, 구분자 0~3글자(공백 . -) — "010 - 1234 - 5678", "(033) 672-1234"
const PHONE_SEP_CHARS = new RegExp(String.raw`[‐-―−﹘﹣－·•‧∙・･()[\]]`, "g");
const SEP = String.raw`[\s.\-]{0,3}`;
const PHONE_RE = new RegExp(
  String.raw`(?<!\d)(?:\+?82${SEP}(?:0${SEP})?|0)(?:1[016789]|2|[3-6][1-5]|70)${SEP}\d{3,4}${SEP}\d{4}(?!\d)`,
);
// 대표번호 15xx·16xx·18xx + 4자리. 뒤에 단위·시간 말이 오면 범위로 보고 제외
// (1500-2000원 가격, 1500-1800 영업 시각, 1800-1900년 연도, 1500-1700까지 / 1500-1800시)
const REP_PHONE_RE = new RegExp(String.raw`(?<!\d)1[568]\d{2}${SEP}\d{4}(?!\d|\s*(?:원|시|년|영업|까지))`);

function normalizeForPhone(text: string): string {
  return text.normalize("NFKC").replace(PHONE_SEP_CHARS, "-");
}

export function hasLink(text: string): boolean {
  const s = text.normalize("NFKC");
  return LINK_PROTO_RE.test(s) || LINK_TLD_RE.test(s) || LINK_SLASH_RE.test(s);
}

export function hasPhone(text: string): boolean {
  const s = normalizeForPhone(text);
  return PHONE_RE.test(s) || REP_PHONE_RE.test(s);
}

/** 검사 순서: 대상 → 종류 → 닉네임 → 길이 → 링크 → 전화 */
export function validateTip(input: TipInput): { ok: true } | { ok: false; reason: TipRejectReason } {
  if (input.target_type !== undefined && !isTipTarget(input.target_type)) return { ok: false, reason: "target" };
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
