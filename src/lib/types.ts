import type { Lang } from "../i18n";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** 요일별 영업 구간. 예: { fri: [["18:00","02:00"]] } — 끝 ≤ 시작이면 다음 날 새벽까지 */
export type WeeklyHours = Partial<Record<Weekday, [string, string][]>>;

export type VerifiedMethod = "visit" | "phone" | "interview" | "public";

export interface Place {
  id: string;
  code: string;
  slug: string;
  category: "food" | "cafe" | "bar" | "surf" | "shop";
  status: "participating" | "listed" | "closed";
  name_ko: string;
  name_en: string | null;
  name_roman: string | null;
  summary_ko: string | null;
  summary_en: string | null;
  address_ko: string;
  lat: number;
  lng: number;
  hours: WeeklyHours;
  price_level: 1 | 2 | 3;
  parking: boolean | null;
  foreign_card: boolean | null;
  how_to_get_ko: string | null;
  how_to_get_en: string | null;
  photos: string[];
  verified_method: VerifiedMethod;
  verified_at: string | null;
  verified_by_name: string | null;
  created_by_name: string | null;
  has_english_menu: boolean;
  is_sample: boolean;
}

export interface MenuItem {
  id: string;
  place_id: string;
  sort: number;
  name_ko: string;
  name_roman: string | null;
  name_en: string | null;
  desc_en: string | null;
  price: number | null;
  allergens: string[];
  vegan: boolean;
  spicy: 0 | 1 | 2 | 3;
}

export interface Activity {
  id: string;
  kind: "dated" | "always";
  title_ko: string;
  title_en: string | null;
  desc_ko: string | null;
  desc_en: string | null;
  place_id: string | null;
  location_ko: string | null;
  location_en: string | null;
  starts_on: string | null;
  ends_on: string | null;
  /** 0=일 ~ 6=토 */
  weekdays: number[];
  time_note_ko: string | null;
  time_note_en: string | null;
  rainy_ok: boolean;
  link: string | null;
  verified_method: VerifiedMethod;
  verified_at: string | null;
  verified_by_name: string | null;
  created_by_name: string | null;
  is_sample: boolean;
}

export interface Contributor {
  id: string;
  display_name: string;
  team: string | null;
  role_label: string | null;
  cohort: string | null;
  show: boolean;
}

export interface PublicTip {
  id: string;
  target_type: "place" | "activity";
  target_id: string;
  kind: "changed" | "tip" | "directions";
  body: string;
  nickname: string | null;
  lang: Lang;
  created_at: string;
  handled: boolean;
}
