import { t, tf, type DictKey, type Lang } from "../i18n";

// 화면 표기용 작은 함수들. 날짜는 전부 서울 시간(Asia/Seoul) 기준이다.

const TZ = "Asia/Seoul";

function validDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 확인일: ko "2026. 10. 30." / en "Oct 30, 2026". 값이 없으면 "" */
export function formatVerifiedDate(at: string | null | undefined, lang: Lang): string {
  const d = validDate(at);
  if (!d) return "";
  if (lang === "ko") {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric" })
        .formatToParts(d)
        .map((x) => [x.type, x.value]),
    );
    return `${p.year}. ${Number(p.month)}. ${Number(p.day)}.`;
  }
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" }).format(d);
}

/** ₩ + 천 단위 쉼표: 10000 → "₩10,000" */
export function formatWon(price: number): string {
  return `₩${Math.round(price).toLocaleString("en-US")}`;
}

/** 사진 이름 → Supabase Storage 공개 주소 (http 로 시작하면 그대로) */
export function photoUrl(name: string): string {
  if (/^https?:\/\//.test(name)) return name;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  return `${base}/storage/v1/object/public/place-photos/${name.replace(/^\//, "")}`;
}

/** 0=일 ~ 6=토 → 사전 키 */
export const WEEKDAY_KEYS: DictKey[] = ["daySun", "dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat"];

/** 상시형 요일: 비었거나 7일이면 「매일」, 아니면 월요일부터 「매주 토·일」 */
export function formatWeekdays(weekdays: number[], lang: Lang): string {
  const set = new Set(weekdays.filter((d) => d >= 0 && d <= 6));
  if (set.size === 0 || set.size === 7) return t(lang, "everyDay");
  const ordered = [1, 2, 3, 4, 5, 6, 0].filter((d) => set.has(d)).map((d) => t(lang, WEEKDAY_KEYS[d]));
  return tf(lang, "everyWeek", { days: ordered.join(lang === "ko" ? "·" : ", ") });
}

/** "2026-11-14" → 서울 그날 정오 (요일·날짜 계산이 어긋나지 않게) */
function ymdToDate(ymd: string): Date | null {
  return validDate(`${ymd}T12:00:00+09:00`);
}

function monthDay(d: Date, lang: Lang): string {
  return lang === "ko"
    ? new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, month: "long", day: "numeric" }).format(d)
    : new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" }).format(d);
}

/** 기간형 행사 날짜: ko "10월 25일 ~ 11월 30일" / en "Oct 25 – Nov 30" */
export function formatDateRange(starts: string | null, ends: string | null, lang: Lang): string {
  const s = starts ? ymdToDate(starts) : null;
  const e = ends ? ymdToDate(ends) : null;
  const sep = lang === "ko" ? " ~ " : " – ";
  if (s && e) return starts === ends ? monthDay(s, lang) : `${monthDay(s, lang)}${sep}${monthDay(e, lang)}`;
  if (s) return `${monthDay(s, lang)}${sep}`;
  if (e) return `${sep}${monthDay(e, lang)}`;
  return "";
}

/** 오늘(서울): ko "11월 14일 (토)" / en "Sat, Nov 14" */
export function formatToday(now: Date, lang: Lang): string {
  if (lang === "ko") {
    const md = monthDay(now, "ko");
    const wd = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, weekday: "short" }).format(now);
    return `${md} (${wd})`;
  }
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" }).format(now);
}
