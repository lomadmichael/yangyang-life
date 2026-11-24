import { t, type DictKey, type Lang } from "@/i18n";
import { CATEGORY_KEY } from "@/lib/labels";
import type { Hood } from "@/lib/neighborhood";
import { placeName } from "@/lib/place-view";
import type { Place } from "@/lib/types";
import type { MapPlace } from "./SketchMap";

/** DB 장소 → 약도 핀 (번호는 numberPlaces 결과) */
export function toMapPlaces(places: readonly Place[], numbers: Map<string, string>, lang: Lang): MapPlace[] {
  return places.map((p) => ({
    id: p.id,
    no: numbers.get(p.id) ?? "",
    cat: p.category,
    catLabel: CATEGORY_KEY[p.category] ? t(lang, CATEGORY_KEY[p.category]) : p.category,
    name: placeName(p, lang).text,
    href: `/${lang}/place/${p.slug}`,
    lat: p.lat,
    lng: p.lng,
  }));
}

const HOOD_KEYS: Record<Hood, { name: DictKey; sub: DictKey; lede: DictKey }> = {
  dongsan: { name: "hoodDongsan", sub: "hoodDongsanSub", lede: "hoodDongsanLede" },
  ingu: { name: "hoodIngu", sub: "hoodInguSub", lede: "hoodInguLede" },
  hyuhyu: { name: "hoodHyuhyu", sub: "hoodHyuhyuSub", lede: "hoodHyuhyuLede" },
  namae: { name: "hoodNamae", sub: "hoodNamaeSub", lede: "hoodNamaeLede" },
  other: { name: "hoodOther", sub: "hoodOtherSub", lede: "hoodOtherLede" },
};

/** 동네 이름·다른 말 이름·소개 한 줄 */
export function hoodText(hood: Hood, lang: Lang): { name: string; sub: string; lede: string } {
  const k = HOOD_KEYS[hood];
  return { name: t(lang, k.name), sub: t(lang, k.sub), lede: t(lang, k.lede) };
}
