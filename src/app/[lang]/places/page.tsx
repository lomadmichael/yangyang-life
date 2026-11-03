import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { CategoryTabs } from "@/components/CategoryTabs";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips, type Chip } from "@/components/FilterChips";
import { isAmenityCategory, PlaceCard } from "@/components/PlaceCard";
import { isLang, t, tf } from "@/i18n";
import { parsePlacesQuery, placesQueryString } from "@/lib/list-query";
import { CATEGORIES, CATEGORY_KEY, PRICE_KEY, priceSymbol } from "@/lib/labels";
import { filterPlaces, visibleCategories, type PlaceFilter } from "@/lib/places-filter";
import { listPlaces } from "@/lib/queries";
import type { PlaceCategory } from "@/lib/types";

export default async function PlacesPage({ params, searchParams }: PageProps<"/[lang]/places">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  await connection(); // 「지금 영업 중」은 요청 시각 기준

  const f = parsePlacesQuery(await searchParams);
  const now = new Date();
  const all = await listPlaces();
  const places = filterPlaces(all, f, now);
  const base = `/${lang}/places`;
  const href = (next: PlaceFilter) => `${base}${placesQueryString(next)}`;

  // 해변·명소·생활 편의에는 가격·영어 메뉴 조건이 뜻이 없다 → 그 탭으로 갈 때 두 조건을 떼고, 칩도 숨긴다
  const amenityMode = f.category !== undefined && isAmenityCategory(f.category);
  const tabHref = (c?: PlaceCategory) =>
    c && isAmenityCategory(c)
      ? href({ openNow: f.openNow, category: c })
      : href({ ...f, category: c });

  const optionChips: Chip[] = [
    { label: t(lang, "filterOpenNow"), href: href({ ...f, openNow: !f.openNow }), active: !!f.openNow },
    ...(amenityMode
      ? []
      : [
          { label: t(lang, "filterEnglishMenu"), href: href({ ...f, englishMenu: !f.englishMenu }), active: !!f.englishMenu },
          ...([1, 2, 3] as const).map((p) => ({
            label: priceSymbol(p),
            ariaLabel: `${t(lang, "priceLabel")}: ${t(lang, PRICE_KEY[p])}`,
            href: href({ ...f, price: f.price === p ? undefined : p }),
            active: f.price === p,
          })),
        ]),
  ];
  // 분류 탭은 그대로 두고 조건만 지운다
  const hasConditions = !!(f.openNow || f.englishMenu || f.price);
  const clearHref = href({ category: f.category });
  const filtered = placesQueryString(f) !== "";

  return (
    <div className="flex flex-col gap-4 px-4 pb-10">
      <h1 className="pt-2 text-2xl font-bold">{t(lang, "placesTitle")}</h1>
      <CategoryTabs
        items={visibleCategories(CATEGORIES, all)}
        current={f.category}
        hrefFor={tabHref}
        labelFor={(c) => t(lang, CATEGORY_KEY[c])}
        allLabel={t(lang, "filterAll")}
        label={t(lang, "categoryLabel")}
      />
      <FilterChips label={t(lang, "filterLabel")} chips={optionChips} />
      <div className="flex min-h-11 items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {tf(lang, places.length === 1 ? "placesCountOne" : "placesCount", { n: String(places.length) })}
        </p>
        {hasConditions && places.length > 0 ? (
          <Link href={clearHref} scroll={false} className="inline-flex min-h-11 items-center text-sm font-medium text-sea">
            {t(lang, "filterReset")}
          </Link>
        ) : null}
      </div>
      {places.length === 0 ? (
        <EmptyState
          title={t(lang, "emptyPlacesTitle")}
          body={t(lang, "emptyPlacesBody")}
          action={filtered ? { href: hasConditions ? clearHref : base, label: t(lang, "filterReset") } : undefined}
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
