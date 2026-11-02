import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { Badge } from "@/components/Badge";
import { FallbackNote } from "@/components/FallbackNote";
import { HoursTable } from "@/components/HoursTable";
import { InfoRow } from "@/components/InfoRow";
import { MapLinks } from "@/components/MapLinks";
import { SafeImage } from "@/components/SafeImage";
import { TipList } from "@/components/TipList";
import { VerifiedLine } from "@/components/VerifiedLine";
import { isLang, pickText, t, tf, type DictKey, type Lang } from "@/i18n";
import { photoUrl } from "@/lib/format";
import { isOpenNow } from "@/lib/hours";
import { CATEGORY_KEY, PRICE_KEY, priceSymbol } from "@/lib/labels";
import { getPlaceBySlug } from "@/lib/queries";

function yesNo(lang: Lang, v: boolean | null): string {
  const key: DictKey = v === null ? "unknown" : v ? "yes" : "no";
  return t(lang, key);
}

export default async function PlacePage({ params }: PageProps<"/[lang]/place/[slug]">) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  await connection();

  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  const now = new Date();
  const row = place as unknown as Record<string, unknown>;
  const name = pickText(row, "name", lang);
  const summary = pickText(row, "summary", lang);
  const howTo = pickText(row, "how_to_get", lang);
  const closed = place.status === "closed";
  const open = isOpenNow(place.hours, place.status, now);
  // 사진은 동의한 참여 가게만 (공개 뷰도 비워 주지만 화면에서 한 번 더 막는다)
  const photos = place.status === "participating" ? place.photos : [];

  return (
    <article className="flex flex-col gap-5 px-4 pb-10">
      <BackLink href={`/${lang}/eat`} label={t(lang, "eatTitle")} />

      {photos.length > 0 ? (
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 empty:hidden">
          {photos.map((p) => (
            <SafeImage
              key={p}
              src={photoUrl(p)}
              alt={tf(lang, "photoAlt", { name: name.text })}
              className="aspect-[4/3] w-[85%] shrink-0 snap-start rounded-2xl bg-sea-soft object-cover"
            />
          ))}
        </div>
      ) : null}

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="muted">{t(lang, CATEGORY_KEY[place.category])}</Badge>
          {closed ? (
            <Badge tone="closed">{t(lang, "statusClosed")}</Badge>
          ) : open ? (
            <Badge tone="open">{t(lang, "openNow")}</Badge>
          ) : (
            <Badge tone="muted">{t(lang, "closedNow")}</Badge>
          )}
          {place.status === "participating" ? <Badge tone="partner">{t(lang, "badgePartner")}</Badge> : null}
        </div>
        <h1 className="text-2xl font-bold leading-snug">
          {name.text}
          <FallbackNote lang={lang} show={name.fallback} />
        </h1>
        {lang === "en" && !name.fallback ? <p className="text-muted">{place.name_ko}</p> : null}
        {summary.text ? (
          <p>
            {summary.text}
            <FallbackNote lang={lang} show={summary.fallback} />
          </p>
        ) : null}
      </header>

      {place.has_english_menu ? (
        <Link
          href={`/${lang}/m/${place.code}`}
          className="flex min-h-12 items-center justify-center rounded-xl bg-salmon-strong px-4 font-bold text-on-sea"
        >
          {t(lang, "viewEnglishMenu")}
        </Link>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">{t(lang, "address")}</h2>
        <p>{place.address_ko}</p>
        <MapLinks lat={place.lat} lng={place.lng} name={place.name_ko} lang={lang} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">{t(lang, "hours")}</h2>
        {closed ? <p className="text-muted">{t(lang, "statusClosed")}</p> : <HoursTable hours={place.hours} lang={lang} now={now} />}
      </section>

      <dl className="rounded-2xl border border-line bg-surface px-4">
        <InfoRow label={t(lang, "priceLabel")}>
          {priceSymbol(place.price_level)} · {t(lang, PRICE_KEY[place.price_level])}
        </InfoRow>
        <InfoRow label={t(lang, "parking")}>{yesNo(lang, place.parking)}</InfoRow>
        <InfoRow label={t(lang, "foreignCard")}>{yesNo(lang, place.foreign_card)}</InfoRow>
      </dl>

      {howTo.text ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-bold">{t(lang, "howToGet")}</h2>
          <p>
            {howTo.text}
            <FallbackNote lang={lang} show={howTo.fallback} />
          </p>
        </section>
      ) : null}

      <VerifiedLine method={place.verified_method} at={place.verified_at} by={place.verified_by_name} lang={lang} />

      {/* 팁: 「바뀌었어요·꿀팁·가는 법」 목록 + 쓰기 폼 (<section id="tips">) */}
      <TipList lang={lang} targetType="place" targetId={place.id} />
    </article>
  );
}
