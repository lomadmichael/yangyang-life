import type { Amenity, WeeklyHours } from "@/lib/types";
import type { AdminPlace } from "../data";

// 가게 폼 값(클라이언트 상태) — "use client" 파일 밖에 두어 서버 컴포넌트에서도 값으로 쓸 수 있게

export interface PlaceFormValues {
  slug: string;
  category: string;
  status: string;
  name_ko: string;
  name_en: string;
  name_roman: string;
  summary_ko: string;
  summary_en: string;
  address_ko: string;
  lat: string;
  lng: string;
  hours: WeeklyHours;
  price_level: string;
  parking: string;
  foreign_card: string;
  how_to_get_ko: string;
  how_to_get_en: string;
  amenities: Amenity[];
}

export const EMPTY_PLACE: PlaceFormValues = {
  slug: "",
  category: "food",
  status: "listed",
  name_ko: "",
  name_en: "",
  name_roman: "",
  summary_ko: "",
  summary_en: "",
  address_ko: "",
  lat: "",
  lng: "",
  hours: {},
  price_level: "2",
  parking: "unknown",
  foreign_card: "unknown",
  how_to_get_ko: "",
  how_to_get_en: "",
  amenities: [],
};

function tri(v: boolean | null): string {
  return v === null ? "unknown" : v ? "yes" : "no";
}

/** DB 행 → 폼 값 */
export function placeToValues(p: AdminPlace): PlaceFormValues {
  return {
    slug: p.slug,
    category: p.category,
    status: p.status,
    name_ko: p.name_ko,
    name_en: p.name_en ?? "",
    name_roman: p.name_roman ?? "",
    summary_ko: p.summary_ko ?? "",
    summary_en: p.summary_en ?? "",
    address_ko: p.address_ko,
    lat: String(p.lat),
    lng: String(p.lng),
    hours: p.hours ?? {},
    price_level: String(p.price_level),
    parking: tri(p.parking),
    foreign_card: tri(p.foreign_card),
    how_to_get_ko: p.how_to_get_ko ?? "",
    how_to_get_en: p.how_to_get_en ?? "",
    amenities: p.amenities ?? [],
  };
}
