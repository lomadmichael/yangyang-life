import Link from "next/link";
import { pickText, t, type Lang } from "@/i18n";
import { isOpenNow } from "@/lib/hours";
import { CATEGORY_KEY, PRICE_KEY, priceSymbol } from "@/lib/labels";
import type { Place } from "@/lib/types";
import { Badge } from "./Badge";
import { FallbackNote } from "./FallbackNote";

/** 「오늘 뭐 먹지」 목록 한 칸. 휴업 가게는 흐리게 + 「휴업」 */
export function PlaceCard({ place, lang, now }: { place: Place; lang: Lang; now: Date }) {
  const row = place as unknown as Record<string, unknown>;
  const name = pickText(row, "name", lang);
  const summary = pickText(row, "summary", lang);
  const closed = place.status === "closed";
  const open = isOpenNow(place.hours, place.status, now);

  return (
    <Link
      href={`/${lang}/place/${place.slug}`}
      className={`block rounded-2xl border border-line bg-surface p-4 active:bg-sea-soft ${closed ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-lg font-bold leading-snug">
          {name.text}
          <FallbackNote lang={lang} show={name.fallback} />
        </h3>
        <span
          className="shrink-0 pt-1 text-sm text-muted"
          aria-label={`${t(lang, "priceLabel")}: ${t(lang, PRICE_KEY[place.price_level])}`}
        >
          {priceSymbol(place.price_level)}
        </span>
      </div>
      {lang === "en" && !name.fallback ? <p className="text-sm text-muted">{place.name_ko}</p> : null}
      {summary.text ? (
        <p className="mt-1 text-sm text-muted">
          {summary.text}
          <FallbackNote lang={lang} show={summary.fallback} />
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone="muted">{t(lang, CATEGORY_KEY[place.category])}</Badge>
        {closed ? (
          <Badge tone="closed">{t(lang, "statusClosed")}</Badge>
        ) : open ? (
          <Badge tone="open">{t(lang, "openNow")}</Badge>
        ) : (
          <Badge tone="muted">{t(lang, "closedNow")}</Badge>
        )}
        {place.status === "participating" ? <Badge tone="partner">{t(lang, "badgePartner")}</Badge> : null}
        {place.has_english_menu ? <Badge tone="info">{t(lang, "badgeEnglishMenu")}</Badge> : null}
      </div>
    </Link>
  );
}
