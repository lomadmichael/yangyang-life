import { ko } from "../i18n/ko";
import type { Activity, MenuItem, Place, VerifiedMethod, Weekday, WeeklyHours } from "./types";

// 관리 화면 입력 검사 — 브라우저가 보낸 값은 전부 여기서 다시 확인해 DB 행으로 바꾼다.
// 클라이언트가 보낸 code·created_by·verified_*·is_sample 은 절대 받지 않는다(서버 액션이 따로 채움).

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T,>(value: T): Parsed<T> => ({ ok: true, value });
const bad = (error: string): { ok: false; error: string } => ({ ok: false, error });

export const WEEKDAYS_MON_FIRST: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const WEEKDAY_KO: Record<Weekday, string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금",
  sat: "토",
  sun: "일",
};
/** 0=일 ~ 6=토 (activities.weekdays) */
export const WEEKDAY_NUM_KO = ["일", "월", "화", "수", "목", "금", "토"];

export const CATEGORY_KO: Record<Place["category"], string> = {
  food: "식당",
  cafe: "카페",
  stay: "숙소",
  surf: "서핑샵",
  bar: "펍·바",
  spot: "해변·명소",
  life: "생활 편의",
};
export const STATUS_KO: Record<Place["status"], string> = {
  participating: "참여 가게 (사진·영어 메뉴 공개)",
  listed: "일반 (정보만)",
  closed: "휴업·폐업",
};
export const METHOD_KO: Record<VerifiedMethod, string> = {
  visit: "직접 방문",
  phone: "전화 확인",
  interview: "사장님 인터뷰",
  public: "공개 자료",
};
export const VERIFIED_METHODS = Object.keys(METHOD_KO) as VerifiedMethod[];

export const ALLERGEN_CODES: string[] = Object.keys(ko)
  .filter((k) => k.startsWith("allergen."))
  .map((k) => k.slice("allergen.".length));
export const ALLERGEN_KO: Record<string, string> = Object.fromEntries(
  ALLERGEN_CODES.map((c) => [c, (ko as Record<string, string>)[`allergen.${c}`]]),
);

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function rec(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

/** 문자열 칸: 앞뒤 공백 제거, 비면 null, 최대 길이 자름 */
function text(v: unknown, max = 2000): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const s = String(v).trim().slice(0, max);
  return s ? s : null;
}

function triState(v: unknown): boolean | null {
  if (v === true || v === "yes") return true;
  if (v === false || v === "no") return false;
  return null;
}

/** 영업시간: 요일별 구간 여러 개. 끝 ≤ 시작이면 다음 날 새벽까지(자정 넘김) */
export function parseHours(raw: unknown): Parsed<WeeklyHours> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bad("영업시간 형식이 잘못됐어요");
  const out: WeeklyHours = {};
  for (const [day, ranges] of Object.entries(raw as Record<string, unknown>)) {
    if (!(WEEKDAYS_MON_FIRST as string[]).includes(day)) return bad(`알 수 없는 요일: ${day}`);
    if (!Array.isArray(ranges)) return bad("영업시간 형식이 잘못됐어요");
    const dayKo = WEEKDAY_KO[day as Weekday];
    const list: [string, string][] = [];
    for (const r of ranges) {
      if (!Array.isArray(r) || r.length !== 2 || !TIME_RE.test(String(r[0])) || !TIME_RE.test(String(r[1]))) {
        return bad(`${dayKo}요일 시간을 HH:MM(예 09:30)으로 적어 주세요`);
      }
      list.push([String(r[0]), String(r[1])]);
    }
    if (list.length > 6) return bad(`${dayKo}요일 구간이 너무 많아요(최대 6개)`);
    list.sort((a, b) => a[0].localeCompare(b[0]));
    if (list.length) out[day as Weekday] = list;
  }
  return ok(out);
}

/** "18:00 ~ 다음 날 02:00까지" / "11:00 ~ 20:00" */
export function formatRange([s, e]: [string, string]): string {
  return e <= s ? `${s} ~ 다음 날 ${e}까지` : `${s} ~ ${e}`;
}

/** 로마자·영문 이름 → 주소용 slug 제안 (한글만 있으면 빈 문자열) */
export function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export type PlaceRow = Omit<
  Place,
  | "id"
  | "code"
  | "photos"
  | "verified_method"
  | "verified_at"
  | "verified_by_name"
  | "created_by_name"
  | "has_english_menu"
  | "is_sample"
  // v2 새 칸(amenities)은 입력 폼이 붙을 때(Task 9) 받는다. 그전엔 DB 기본값 '{}'
  | "amenities"
>;

export function parsePlaceInput(raw: unknown): Parsed<PlaceRow> {
  const r = rec(raw);
  const slug = String(r.slug ?? "").trim();
  if (!SLUG_RE.test(slug) || slug.length > 60) {
    return bad("주소 이름(slug)은 영문 소문자·숫자·하이픈만 (예: hyeonnam-makguksu)");
  }
  const category = String(r.category ?? "");
  if (!Object.prototype.hasOwnProperty.call(CATEGORY_KO, category)) return bad("종류를 골라 주세요");
  const status = String(r.status ?? "");
  if (!Object.prototype.hasOwnProperty.call(STATUS_KO, status)) return bad("상태를 골라 주세요");
  const name_ko = text(r.name_ko, 100);
  if (!name_ko) return bad("가게 이름(국문)을 적어 주세요");
  const address_ko = text(r.address_ko, 300);
  if (!address_ko) return bad("주소(국문)를 적어 주세요");
  const latStr = String(r.lat ?? "").trim();
  const lngStr = String(r.lng ?? "").trim();
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!latStr || !Number.isFinite(lat) || lat < 33 || lat > 39) return bad("위도는 숫자로 (양양은 37.9 근처)");
  if (!lngStr || !Number.isFinite(lng) || lng < 124 || lng > 132) return bad("경도는 숫자로 (양양은 128.7 근처)");
  const price = Number(r.price_level);
  if (![1, 2, 3].includes(price)) return bad("가격대를 골라 주세요");
  const hours = parseHours(r.hours ?? {});
  if (!hours.ok) return hours;

  return ok({
    slug,
    category: category as Place["category"],
    status: status as Place["status"],
    name_ko,
    name_en: text(r.name_en, 100),
    name_roman: text(r.name_roman, 100),
    summary_ko: text(r.summary_ko, 500),
    summary_en: text(r.summary_en, 500),
    address_ko,
    lat,
    lng,
    hours: hours.value,
    price_level: price as Place["price_level"],
    parking: triState(r.parking),
    foreign_card: triState(r.foreign_card),
    how_to_get_ko: text(r.how_to_get_ko, 1000),
    how_to_get_en: text(r.how_to_get_en, 1000),
  });
}

export type MenuRow = Omit<MenuItem, "id" | "place_id"> & { id?: string };

export function parseMenuInput(raw: unknown): Parsed<MenuRow[]> {
  if (!Array.isArray(raw)) return bad("메뉴 형식이 잘못됐어요");
  if (raw.length > 200) return bad("메뉴가 너무 많아요(최대 200개)");
  const out: MenuRow[] = [];
  for (const [i, item] of raw.entries()) {
    const r = rec(item);
    const n = i + 1;
    const name_ko = text(r.name_ko, 100);
    if (!name_ko) return bad(`${n}번째 메뉴의 국문 이름을 적어 주세요`);
    const priceStr = String(r.price ?? "").replace(/[,\s원₩]/g, "");
    let price: number | null = null;
    if (priceStr !== "") {
      price = Number(priceStr);
      if (!Number.isInteger(price) || price < 0 || price > 10_000_000) return bad(`${n}번째 메뉴 가격은 0 이상 숫자로`);
    }
    const spicy = Number(r.spicy ?? 0);
    if (![0, 1, 2, 3].includes(spicy)) return bad(`${n}번째 메뉴 맵기는 0~3`);
    const allergens = Array.isArray(r.allergens)
      ? [...new Set(r.allergens.map(String).filter((a) => ALLERGEN_CODES.includes(a)))]
      : [];
    const row: MenuRow = {
      sort: i,
      name_ko,
      name_roman: text(r.name_roman, 100),
      name_en: text(r.name_en, 100),
      desc_en: text(r.desc_en, 500),
      price,
      allergens,
      vegan: r.vegan === true,
      spicy: spicy as MenuItem["spicy"],
    };
    if (isUuid(r.id)) row.id = r.id;
    out.push(row);
  }
  return ok(out);
}

export type ActivityRow = Omit<
  Activity,
  | "id"
  | "verified_method"
  | "verified_at"
  | "verified_by_name"
  | "created_by_name"
  | "is_sample"
  // v2 새 칸(category·season_months)은 입력 폼이 붙을 때(Task 9) 받는다. 그전엔 DB 기본값
  | "category"
  | "season_months"
>;

function ymd(v: unknown): string | null | false {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (!YMD_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : false;
}

export function parseActivityInput(raw: unknown): Parsed<ActivityRow> {
  const r = rec(raw);
  const kind = String(r.kind ?? "");
  if (kind !== "dated" && kind !== "always") return bad("종류(기간 행사 / 상시)를 골라 주세요");
  const title_ko = text(r.title_ko, 120);
  if (!title_ko) return bad("제목(국문)을 적어 주세요");
  const starts_on = ymd(r.starts_on);
  const ends_on = ymd(r.ends_on);
  if (starts_on === false || ends_on === false) return bad("날짜 형식이 잘못됐어요");
  if (kind === "dated" && !starts_on) return bad("기간 행사는 시작일이 필요해요");
  if (starts_on && ends_on && ends_on < starts_on) return bad("끝나는 날이 시작일보다 앞이에요");
  const weekdays = Array.isArray(r.weekdays)
    ? [...new Set(r.weekdays.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort(
        (a, b) => a - b,
      )
    : [];
  const link = text(r.link, 500);
  if (link && !/^https?:\/\/\S+$/i.test(link)) return bad("링크는 http:// 또는 https:// 로 시작해야 해요");

  return ok({
    kind,
    title_ko,
    title_en: text(r.title_en, 120),
    desc_ko: text(r.desc_ko, 2000),
    desc_en: text(r.desc_en, 2000),
    place_id: isUuid(r.place_id) ? r.place_id : null,
    location_ko: text(r.location_ko, 200),
    location_en: text(r.location_en, 200),
    starts_on,
    ends_on,
    weekdays,
    time_note_ko: text(r.time_note_ko, 200),
    time_note_en: text(r.time_note_en, 200),
    rainy_ok: r.rainy_ok === true,
    link,
  });
}

export function isVerifiedMethod(v: unknown): v is VerifiedMethod {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(METHOD_KO, v);
}
