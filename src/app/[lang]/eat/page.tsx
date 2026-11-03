import { connection } from "next/server";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips, type Chip } from "@/components/FilterChips";
import { PlaceCard } from "@/components/PlaceCard";
import { isLang, t } from "@/i18n";
import { parsePlacesQuery, placesQueryString } from "@/lib/list-query";
import { CATEGORIES, CATEGORY_KEY, PRICE_KEY, priceSymbol } from "@/lib/labels";
import { filterPlaces, type PlaceFilter } from "@/lib/places-filter";
import { listPlaces } from "@/lib/queries";

export default async function EatPage({ params, searchParams }: PageProps<"/[lang]/eat">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  await connection(); // 「지금 영업 중」은 요청 시각 기준

  const f = parsePlacesQuery(await searchParams);
  const now = new Date();
  const places = filterPlaces(await listPlaces(), f, now);
  const base = `/${lang}/eat`;
  const href = (next: PlaceFilter) => `${base}${placesQueryString(next)}`;

  const categoryChips: Chip[] = [
    { label: t(lang, "filterAll"), href: href({ ...f, category: undefined }), active: !f.category },
    ...CATEGORIES.map((c) => ({
      label: t(lang, CATEGORY_KEY[c]),
      href: href({ ...f, category: f.category === c ? undefined : c }),
      active: f.category === c,
    })),
  ];
  const optionChips: Chip[] = [
    { label: t(lang, "filterOpenNow"), href: href({ ...f, openNow: !f.openNow }), active: !!f.openNow },
    { label: t(lang, "filterEnglishMenu"), href: href({ ...f, englishMenu: !f.englishMenu }), active: !!f.englishMenu },
    ...([1, 2, 3] as const).map((p) => ({
      label: priceSymbol(p),
      ariaLabel: `${t(lang, "priceLabel")}: ${t(lang, PRICE_KEY[p])}`,
      href: href({ ...f, price: f.price === p ? undefined : p }),
      active: f.price === p,
    })),
  ];
  const filtered = placesQueryString(f) !== "";

  return (
    <div className="flex flex-col gap-4 px-4 pb-10">
      <BackLink href={`/${lang}`} label={t(lang, "backHome")} />
      <h1 className="text-2xl font-bold">{t(lang, "eatTitle")}</h1>
      <section aria-label={t(lang, "filterLabel")} className="flex flex-col gap-2">
        <FilterChips label={t(lang, "filterLabel")} chips={categoryChips} />
        <FilterChips label={t(lang, "filterLabel")} chips={optionChips} />
      </section>
      {places.length === 0 ? (
        <EmptyState
          title={t(lang, "emptyPlacesTitle")}
          body={t(lang, "emptyPlacesBody")}
          action={filtered ? { href: base, label: t(lang, "filterReset") } : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {places.map((p) => (
            <li key={p.id}>
              <PlaceCard place={p} lang={lang} now={now} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
