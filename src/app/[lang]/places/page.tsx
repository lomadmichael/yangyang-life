import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { CategoryTabs } from "@/components/CategoryTabs";
import { FallbackNote } from "@/components/FallbackNote";
import { FilterChips, type Chip } from "@/components/FilterChips";
import { MapCard } from "@/components/map/MapCard";
import { hoodText, toMapPlaces } from "@/components/map/map-places";
import { isAmenityCategory } from "@/components/PlaceCard";
import { SafeImage } from "@/components/SafeImage";
import { SaveButton } from "@/components/SaveButton";
import { isLang, pickText, t, tf, type Lang } from "@/i18n";
import { photoUrl } from "@/lib/format";
import { parsePlacesQuery, placesQueryString } from "@/lib/list-query";
import { CATEGORIES, CATEGORY_KEY, PRICE_KEY, priceSymbol } from "@/lib/labels";
import { groupByNeighborhood, numberPlaces } from "@/lib/neighborhood";
import { canShowPlacePhotos } from "@/lib/place-photos";
import { featureCount, featureScore, placeName, placeState, type PlaceState } from "@/lib/place-view";
import { filterPlaces, visibleCategories, type PlaceFilter } from "@/lib/places-filter";
import { seoulParts } from "@/lib/hours";
import { formatToday } from "@/lib/format";
import { listPlaces } from "@/lib/queries";
import type { Place, PlaceCategory } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");

/** 분류 짧은 영문 표기 (사진 없는 색면 카드 위 작은 글자) — 장식 */
const CAT_SHORT: Record<PlaceCategory, string> = {
  food: "EAT",
  cafe: "CAFÉ",
  stay: "STAY",
  surf: "SURF",
  bar: "BAR",
  spot: "SIGHTS",
  life: "LIFE",
};

type Item = {
  p: Place;
  no: string;
  name: ReturnType<typeof placeName>;
  summary: { text: string; fallback: boolean };
  state: PlaceState;
  photo: string | null;
};

function stateLabel(lang: Lang, s: PlaceState): string {
  return s === "shut" ? t(lang, "statusClosed") : s === "open" ? t(lang, "openNow") : s === "later" ? t(lang, "closedNow") : "";
}

function State({ lang, s }: { lang: Lang; s: PlaceState }) {
  if (s === "none") return <span />;
  return (
    <span className={`st ${s}`}>
      <i aria-hidden="true" />
      {stateLabel(lang, s)}
    </span>
  );
}

/** 분류 · (가격) · (영어 메뉴판) */
function Marks({ lang, p }: { lang: Lang; p: Place }) {
  const amenity = isAmenityCategory(p.category);
  return (
    <>
      <span className={`cat cat-${p.category}`}>
        <i aria-hidden="true" />
        {CATEGORY_KEY[p.category] ? t(lang, CATEGORY_KEY[p.category]) : p.category}
      </span>
      {amenity ? null : (
        <span className="mk" aria-label={`${t(lang, "priceLabel")}: ${t(lang, PRICE_KEY[p.price_level])}`}>
          {priceSymbol(p.price_level)}
        </span>
      )}
      {!amenity && p.has_english_menu ? <span className="mk">{t(lang, "badgeEnglishMenu")}</span> : null}
    </>
  );
}

/** 대표 카드 — 자체 사진이 있으면 사진, 없으면 분류색 색면 + 사선 무늬 + 이름(같은 대표 사진이 반복되지 않게) */
function Tile({ it, lang }: { it: Item; lang: Lang }) {
  const { p } = it;
  const catLabel = CATEGORY_KEY[p.category] ? t(lang, CATEGORY_KEY[p.category]) : p.category;
  const glyph = it.name.text.replace(/^양양\s*/, "").charAt(0);
  return (
    <li className={`tile ${it.state === "shut" ? "is-shut" : ""}`} data-row={p.id}>
      <Link href={`/${lang}/place/${p.slug}`} className="tile-a">
        <div className="ph">
          <span className={`noimg cat-${p.category}`} aria-hidden="true">
            <span className="top-l">
              <span>No. {it.no}</span>
              <span>{CAT_SHORT[p.category] ?? ""}</span>
            </span>
            <svg className="waves" viewBox="0 0 300 70" preserveAspectRatio="none">
              <path d="M0 10 q18 -8 36 0 t36 0 t36 0 t36 0 t36 0 t36 0 t36 0 t36 0 t36 0" />
              <path d="M0 30 q18 -8 36 0 t36 0 t36 0 t36 0 t36 0 t36 0 t36 0 t36 0 t36 0" />
              <path d="M0 50 q18 -8 36 0 t36 0 t36 0 t36 0 t36 0 t36 0 t36 0 t36 0 t36 0" />
            </svg>
            <span className="glyph">{glyph}</span>
            <span className="nm">
              {it.name.text}
              {it.name.sub ? <small>{it.name.sub}</small> : null}
            </span>
          </span>
          {it.photo ? (
            <>
              <SafeImage src={photoUrl(it.photo)} alt={tf(lang, "photoAlt", { name: it.name.text })} />
              <span className="tag">No. {it.no}</span>
            </>
          ) : null}
        </div>
        <div className="meta">
          <span className="label">{catLabel}</span>
          <h3>
            {it.name.text}
            <FallbackNote lang={lang} show={it.name.fallback} />
          </h3>
          {it.summary.text ? (
            <p>
              {it.summary.text}
              <FallbackNote lang={lang} show={it.summary.fallback} />
            </p>
          ) : null}
          <State lang={lang} s={it.state} />
        </div>
      </Link>
      <span className="tile-save">
        <SaveButton kind="place" id={p.id} lang={lang} />
      </span>
    </li>
  );
}

function Row({ it, lang }: { it: Item; lang: Lang }) {
  const { p } = it;
  return (
    <li className={`row has-save ${it.state === "shut" ? "is-shut" : ""}`} data-row={p.id}>
      <Link href={`/${lang}/place/${p.slug}`}>
        <span className="no">{it.no}</span>
        <div className="min-w-0">
          <h3>
            {it.name.text}
            {it.name.sub ? <small>{it.name.sub}</small> : null}
            <FallbackNote lang={lang} show={it.name.fallback} />
          </h3>
          <p>
            <Marks lang={lang} p={p} />
            {it.summary.text}
            <FallbackNote lang={lang} show={it.summary.fallback && !!it.summary.text} />
          </p>
        </div>
        <State lang={lang} s={it.state} />
      </Link>
      <span className="row-save">
        <SaveButton kind="place" id={p.id} lang={lang} />
      </span>
    </li>
  );
}

// 장소 목록 (v4 「북에서 남으로 네 동네」, 디자인 명세 yangyang-design/out/v3/d/index.html 02 장소 색인) —
// 잡지 꼭지 머리 · 분류 탭 · 조건 칩(주소 쿼리, list-query) · 왼쪽 고정 약도 + 오른쪽 동네별 대표 카드와 번호 색인.
// 조건 거르기는 기존 filterPlaces 그대로, 묶음 안 순서는 약도 번호(북→남). 약도에는 모든 장소를 찍고 조건 밖 핀은 흐리게.
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
    c && isAmenityCategory(c) ? href({ openNow: f.openNow, category: c }) : href({ ...f, category: c });

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

  // 탭 옆 개수 — 분류 안의 전체 장소 수(조건과 무관). 항목 0 분류는 탭 자체가 없다
  const countFor = (c?: PlaceCategory) => (c ? all.filter((p) => p.category === c).length : all.length);

  const numbers = numberPlaces(all);
  const shownIds = new Set(places.map((p) => p.id));
  const items: Item[] = places
    .map((p) => {
      const row = p as unknown as Record<string, unknown>;
      const own = canShowPlacePhotos(p) ? (p.photos ?? [])[0] : undefined;
      return {
        p,
        no: numbers.get(p.id) ?? "",
        name: placeName(p, lang),
        summary: pickText(row, "summary", lang),
        state: placeState(p, now),
        photo: own ?? null,
      };
    })
    .sort((a, b) => a.no.localeCompare(b.no));
  const groups = groupByNeighborhood(items.map((it) => ({ ...it, lat: it.p.lat, lng: it.p.lng })));

  const { minutes } = seoulParts(now);
  const clock = `${formatToday(now, lang)} · ${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

  return (
    <div className="mz-places">
      <section className="sec">
        <div className="wrap">
          <header className="sec-head">
            <span className="sec-no">02</span>
            <div>
              <span className="label">{t(lang, "placesKicker")}</span>
              <h1>{t(lang, "placesHeadTitle")}</h1>
            </div>
            <p>{tf(lang, "placesHeadLead", { n: String(all.length) })}</p>
          </header>

          <CategoryTabs
            items={visibleCategories(CATEGORIES, all)}
            current={f.category}
            hrefFor={tabHref}
            labelFor={(c) => t(lang, CATEGORY_KEY[c])}
            allLabel={t(lang, "filterAll")}
            label={t(lang, "categoryLabel")}
            countFor={countFor}
          />
          <div className="pl-bar">
            <FilterChips label={t(lang, "filterLabel")} chips={optionChips} />
            <p className="pl-count">
              <span>
                <b>{places.length}</b>
                {places.length === 1 ? t(lang, "placesCountOne").replace("{n}", "") : t(lang, "placesCount").replace("{n}", "")}
              </span>
              {hasConditions && places.length > 0 ? (
                <Link href={clearHref} scroll={false}>
                  {t(lang, "filterReset")}
                </Link>
              ) : null}
            </p>
          </div>

          <div className="index2 has-side">
            <div className="idx-side">
              <MapCard
                lang={lang}
                uid="places-map"
                fold
                places={toMapPlaces(all, numbers, lang)}
                dimIds={all.filter((p) => !shownIds.has(p.id)).map((p) => p.id)}
              />
            </div>
            <div>
              {groups.length === 0 ? (
                <div className="pl-empty">
                  <span className="label">{t(lang, "placesEmptyKicker")}</span>
                  <h2>{t(lang, "emptyPlacesTitle")}</h2>
                  <p>{t(lang, "emptyPlacesBody")}</p>
                  <div className="acts">
                    {filtered ? (
                      <Link className="btn-line" href={hasConditions ? clearHref : base} scroll={false}>
                        {t(lang, "filterReset")}
                      </Link>
                    ) : null}
                    {f.category ? (
                      <Link className="more" href={base} scroll={false}>
                        {t(lang, "placesEmptyAll")}
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : (
                groups.map((g, gi) => {
                  const text = hoodText(g.hood, lang);
                  const list = g.items;
                  const k = featureCount(list.length);
                  // 대표 카드: 자체 사진 > 참여 가게 > 지금 영업 중, 같은 점수면 번호 순. 보여 줄 때는 번호 순
                  const picked = new Set(
                    [...list]
                      .sort(
                        (a, b) =>
                          featureScore({ ownPhoto: !!b.photo, participating: b.p.status === "participating", open: b.state === "open" }) -
                            featureScore({ ownPhoto: !!a.photo, participating: a.p.status === "participating", open: a.state === "open" }) ||
                          a.no.localeCompare(b.no),
                      )
                      .slice(0, k)
                      .map((it) => it.p.id),
                  );
                  const tiles = list.filter((it) => picked.has(it.p.id));
                  const rows = list.filter((it) => !picked.has(it.p.id));
                  const headId = `hood-${g.hood}`;
                  return (
                    <section key={g.hood} className="hood" id={g.hood} aria-labelledby={headId}>
                      <header className="grp-h">
                        <span className="gno">{pad(gi + 1)}</span>
                        <div>
                          <h2 id={headId}>{text.name}</h2>
                          <span className="gsub">{text.sub}</span>
                        </div>
                        <span className="gcount">
                          {tf(lang, list.length === 1 ? "hoodCountOne" : "hoodCount", { n: String(list.length) })}
                        </span>
                      </header>
                      <p className="hood-lede">{text.lede}</p>
                      <ul className={`tiles n${tiles.length}`}>
                        {tiles.map((it) => (
                          <Tile key={it.p.id} it={it} lang={lang} />
                        ))}
                      </ul>
                      {rows.length ? (
                        <ol className="rows in-hood">
                          {rows.map((it) => (
                            <Row key={it.p.id} it={it} lang={lang} />
                          ))}
                        </ol>
                      ) : null}
                    </section>
                  );
                })
              )}
              <div className="rows-more">
                <span className="note">{tf(lang, "placesStatusAsOf", { time: clock })}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
