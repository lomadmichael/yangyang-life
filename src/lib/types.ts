import type { Lang } from "../i18n";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** 요일별 영업 구간. 예: { fri: [["18:00","02:00"]] } — 끝 ≤ 시작이면 다음 날 새벽까지 */
export type WeeklyHours = Partial<Record<Weekday, [string, string][]>>;

export type VerifiedMethod = "visit" | "phone" | "interview" | "public";

/** 장소 분류 7종 (순서는 labels.ts CATEGORIES) */
export type PlaceCategory = "food" | "cafe" | "stay" | "surf" | "bar" | "spot" | "life";
/** 장소 편의 (주차는 별도 parking 칸) */
export type Amenity = "toilet" | "shower";
/** 놀거리 분류 8종 */
export type PlayCategory = "surf" | "festival" | "eco" | "hike" | "fishing" | "walk" | "yoga" | "village";

export interface Place {
  id: string;
  code: string;
  slug: string;
  category: PlaceCategory;
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
  amenities: Amenity[];
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
  category: PlayCategory;
  /** 운영하는 달 1~12. 빈 배열 = 사계절 */
  season_months: number[];
}

export type StoryType = "course" | "people" | "guide";
export type StoryTag = "solo" | "couple" | "family" | "nocar" | "rainy";
export type StoryStatus = "draft" | "review" | "returned" | "published";

/** 이야기 본문 블록. stop 은 place_id·activity_id 중 정확히 하나만 채운다(id 만 저장, 화면은 현재 값으로 그림) */
export type StoryBlock =
  | { t: "text"; ko: string; en: string | null }
  | { t: "heading"; ko: string; en: string | null }
  | { t: "photo"; url: string; caption_ko: string | null; caption_en: string | null }
  | {
      t: "stop";
      place_id: string | null;
      activity_id: string | null;
      time_ko: string | null;
      time_en: string | null;
      note_ko: string | null;
      note_en: string | null;
    };

/** stories_public 한 행 (공개된 이야기만) */
export interface Story {
  id: string;
  slug: string;
  type: StoryType;
  guide_topic: string | null;
  title_ko: string;
  title_en: string | null;
  summary_ko: string | null;
  summary_en: string | null;
  cover_photo: string | null;
  visited_on: string | null;
  tags: StoryTag[];
  blocks: StoryBlock[];
  author_id: string | null;
  author_name: string | null;
  author_team: string | null;
  published_at: string;
  verified_at: string | null;
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
  target_type: "place" | "activity" | "story";
  target_id: string;
  kind: "changed" | "tip" | "directions";
  body: string;
  nickname: string | null;
  lang: Lang;
  created_at: string;
  handled: boolean;
}
