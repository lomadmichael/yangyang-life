import Link from "next/link";
import { pickText, t, type Lang } from "@/i18n";
import { isOpenNow } from "@/lib/hours";
import { AMENITY_KEY, CATEGORY_KEY, PRICE_KEY, priceSymbol } from "@/lib/labels";
import type { Place } from "@/lib/types";
import { Badge } from "./Badge";
import { FallbackNote } from "./FallbackNote";
import { SaveButton } from "./SaveButton";

/** 가격·영어 메뉴 대신 편의(주차·화장실·샤워장)를 보여 주는 분류 */
export function isAmenityCategory(category: Place["category"]): boolean {
  return category === "spot" || category === "life";
}

/**
 * 장소 목록 한 칸. 휴업 가게는 흐리게 + 「휴업」.
 * ★ 저장 버튼은 링크 밖(오른쪽 위)에 둔다 — 링크 안에 버튼을 넣을 수 없다.
 */
export function PlaceCard({ place, lang, now }: { place: Place; lang: Lang; now: Date }) {
  const row = place as unknown as Record<string, unknown>;
  const name = pickText(row, "name", lang);
  const summary = pickText(row, "summary", lang);
  const closed = place.status === "closed";
  const open = isOpenNow(place.hours, place.status, now);
  const amenityMode = isAmenityCategory(place.category);
  const categoryKey = CATEGORY_KEY[place.category];
  // 0003 적용 전 DB 에는 amenities 칸이 없을 수 있다
  const amenities = place.amenities ?? [];

  return (
    <div className={`relative rounded-2xl border border-line bg-surface ${closed ? "opacity-60" : ""}`}>
      <Link href={`/${lang}/place/${place.slug}`} className="block rounded-2xl p-4 pr-14 active:bg-sea-soft">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-lg font-bold leading-snug">
            {name.text}
            <FallbackNote lang={lang} show={name.fallback} />
          </h3>
          {amenityMode ? null : (
            <span
              className="shrink-0 pt-1 text-sm text-muted"
              aria-label={`${t(lang, "priceLabel")}: ${t(lang, PRICE_KEY[place.price_level])}`}
            >
              {priceSymbol(place.price_level)}
            </span>
          )}
        </div>
        {lang === "en" && !name.fallback ? <p className="text-sm text-muted">{place.name_ko}</p> : null}
        {summary.text ? (
          <p className="mt-1 text-sm text-muted">
            {summary.text}
            <FallbackNote lang={lang} show={summary.fallback} />
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categoryKey ? <Badge tone="muted">{t(lang, categoryKey)}</Badge> : null}
          {closed ? (
            <Badge tone="closed">{t(lang, "statusClosed")}</Badge>
          ) : open ? (
            <Badge tone="open">{t(lang, "openNow")}</Badge>
          ) : amenityMode ? null : (
            <Badge tone="muted">{t(lang, "closedNow")}</Badge>
          )}
          {place.status === "participating" ? <Badge tone="partner">{t(lang, "badgePartner")}</Badge> : null}
          {amenityMode ? (
            <>
              {place.parking ? <Badge tone="muted">{t(lang, "parking")}</Badge> : null}
              {amenities.map((a) =>
                AMENITY_KEY[a] ? (
                  <Badge key={a} tone="muted">
                    {t(lang, AMENITY_KEY[a])}
                  </Badge>
                ) : null,
              )}
            </>
          ) : place.has_english_menu ? (
            <Badge tone="info">{t(lang, "badgeEnglishMenu")}</Badge>
          ) : null}
        </div>
      </Link>
      <div className="absolute right-1.5 top-1.5">
        <SaveButton kind="place" id={place.id} lang={lang} />
      </div>
    </div>
  );
}
