import type { AdminActivity } from "../data";
import type { PlayCategory } from "@/lib/types";

// 할 거리 폼 값 — "use client" 밖에 두어 서버 컴포넌트에서도 값으로 쓴다

export interface ActivityFormValues {
  kind: "dated" | "always";
  /** 빈 문자열 = 아직 안 고름(저장 시 거절) */
  category: PlayCategory | "";
  /** 1~12. 비우면 사계절 */
  season_months: number[];
  title_ko: string;
  title_en: string;
  desc_ko: string;
  desc_en: string;
  place_id: string;
  location_ko: string;
  location_en: string;
  starts_on: string;
  ends_on: string;
  weekdays: number[];
  time_note_ko: string;
  time_note_en: string;
  rainy_ok: boolean;
  link: string;
}

export const EMPTY_ACTIVITY: ActivityFormValues = {
  kind: "dated",
  category: "",
  season_months: [],
  title_ko: "",
  title_en: "",
  desc_ko: "",
  desc_en: "",
  place_id: "",
  location_ko: "",
  location_en: "",
  starts_on: "",
  ends_on: "",
  weekdays: [],
  time_note_ko: "",
  time_note_en: "",
  rainy_ok: false,
  link: "",
};

export function activityToValues(a: AdminActivity): ActivityFormValues {
  return {
    kind: a.kind,
    category: a.category ?? "",
    season_months: a.season_months ?? [],
    title_ko: a.title_ko,
    title_en: a.title_en ?? "",
    desc_ko: a.desc_ko ?? "",
    desc_en: a.desc_en ?? "",
    place_id: a.place_id ?? "",
    location_ko: a.location_ko ?? "",
    location_en: a.location_en ?? "",
    starts_on: a.starts_on ?? "",
    ends_on: a.ends_on ?? "",
    weekdays: a.weekdays ?? [],
    time_note_ko: a.time_note_ko ?? "",
    time_note_en: a.time_note_en ?? "",
    rainy_ok: a.rainy_ok,
    link: a.link ?? "",
  };
}
