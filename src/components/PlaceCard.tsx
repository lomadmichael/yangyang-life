import Link from "next/link";
import { pickText, t, type Lang } from "@/i18n";
import { isOpenNow } from "@/lib/hours";
import { AMENITY_KEY, CATEGORY_KEY, PRICE_KEY, priceSymbol } from "@/lib/labels";
import type { Place } from "@/lib/types";
import { Badge } from "./Badge";
import { FALLBACK_VISUAL, PLACE_VISUAL } from "./category-visual";
import { FallbackNote } from "./FallbackNote";
import { PhotoCard } from "./PhotoCard";
import { SaveButton } from "./SaveButton";

/** 가격·영어 메뉴 대신 편의(주차·화장실·샤워장)를 보여 주는 분류 */
export function isAmenityCategory(category: Place["category"]): boolean {
  return category === "spot" || category === "life";
}

/**
 * 장소 목록 한 칸. 휴업 가게는 흐리게 + 「휴업」.
 * PC 격자(lg 이상이면서 카드 폭 36rem 미만 — 홈·상세처럼 넓게 펼친 카드는 모바일 모양 그대로)에서는 위에 사진 칸(없으면 분류 아이콘 바탕)을 두고 분류·이름을 사진 위에 겹쳐 쓴다.
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
  const visual = PLACE_VISUAL[place.category] ?? FALLBACK_VISUAL;
  // 0003 적용 전 DB 에는 amenities 칸이 없을 수 있다
  const amenities = place.amenities ?? [];
  const nameNode = (
    <>
      {name.text}
      <FallbackNote lang={lang} show={name.fallback} />
    </>
  );
  const price = amenityMode ? null : (
    <span
      className="shrink-0 pt-1 text-sm text-muted"
      aria-label={`${t(lang, "priceLabel")}: ${t(lang, PRICE_KEY[place.price_level])}`}
    >
      {priceSymbol(place.price_level)}
    </span>
  );

  return (
    <div className={`@container relative h-full overflow-hidden border border-rule bg-paper-card ${closed ? "opacity-60" : ""}`}>
      <Link href={`/${lang}/place/${place.slug}`} className="flex h-full flex-col active:bg-paper-2">
        <div className="hidden lg:block @xl:hidden">
          <PhotoCard
            photo={place.photos?.[0]}
            fallback={visual.photo}
            Icon={visual.Icon}
            tone={visual.tone}
            eyebrow={categoryKey ? t(lang, categoryKey) : undefined}
            title={nameNode}
          />
        </div>
        <div className="flex flex-1 flex-col p-4 pr-14 lg:pr-4 @xl:pr-14">
          <div className="flex items-start justify-between gap-3 lg:hidden @xl:flex">
            <h3 className="min-w-0 font-serif text-lg font-semibold leading-snug">{nameNode}</h3>
            {price}
          </div>
          {lang === "en" && !name.fallback ? <p className="text-sm text-muted">{place.name_ko}</p> : null}
          {summary.text ? (
            <p className="mt-1 text-sm text-ink lg:line-clamp-2 lg:text-base @xl:line-clamp-none">
              {summary.text}
              <FallbackNote lang={lang} show={summary.fallback} />
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 lg:mt-auto lg:pt-3">
            {categoryKey ? (
              <span className="lg:hidden @xl:inline">
                <Badge tone="muted">{t(lang, categoryKey)}</Badge>
              </span>
            ) : null}
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
            {price ? <span className="ml-auto hidden lg:inline @xl:hidden">{price}</span> : null}
          </div>
        </div>
      </Link>
      <div className="absolute right-1.5 top-1.5 bg-paper-card/90">
        <SaveButton kind="place" id={place.id} lang={lang} />
      </div>
    </div>
  );
}
