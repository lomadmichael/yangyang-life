import Image, { getImageProps } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { PLAY_VISUAL, STORY_VISUAL } from "@/components/category-visual";
import { CoverShell } from "@/components/home/CoverShell";
import { PlaceIndex, type IndexRow, type IndexTab } from "@/components/home/PlaceIndex";
import { SafeImage } from "@/components/SafeImage";
import { isLang, pickText, t, tf, type DictKey, type Lang } from "@/i18n";
import { formatDateRange, formatToday, formatWeekdays, photoUrl, seasonLabel } from "@/lib/format";
import { isOpenNow, seoulParts } from "@/lib/hours";
import { CATEGORIES, CATEGORY_KEY, PLAY_CATEGORY_KEY, STORY_TYPE_KEY } from "@/lib/labels";
import { placesQueryString, playQueryString, storiesQueryString } from "@/lib/list-query";
import { fetchNowYangyang, oneDecimal, weatherKind, type NowYangyang } from "@/lib/now-yangyang";
import { activityEnded, inSeason } from "@/lib/play";
import { listActivities, listContributors, listPlaces, listStories } from "@/lib/queries";
import { activitiesForDay } from "@/lib/today";
import type { Activity, Place, Story } from "@/lib/types";

/** 조회 실패는 그 단락만 숨긴다 — 홈 전체가 오류 화면이 되지 않게 */
async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 화살표 (더 보기 링크) */
function Arrow() {
  return (
    <svg viewBox="0 0 20 12" aria-hidden="true">
      <path d="M0 6h18M13 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// 홈 (v4 「바다 잡지」, 디자인 명세 yangyang-design/out/v3/d/index.html) —
// ① 표지(사진 4장 크로스페이드 · 호수 · 큰 명조 제목 · 오른쪽 차례) ② 지금 양양(실제 날씨·파도·일출·지금 열린 곳)
// ③ 여는 글 + 차례 ④ 장소 색인(02) ⑤ 놀거리(03, 남색 단락) ⑥ 이야기(04) ⑦ 큰 인용문 ⑧ 만든 사람들(05).
// 모든 숫자·이름은 DB·API 에서 온 실제 값만. 없으면 그 칸·단락을 숨기거나 빈 상태로 그린다.
export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  await connection(); // 「지금 열린 곳」·오늘 날짜는 요청 시각 기준

  const now = new Date();
  const [places, activities, stories, contributors, weather] = await Promise.all([
    orNull(listPlaces()),
    orNull(listActivities()),
    orNull(listStories()),
    orNull(listContributors()),
    fetchNowYangyang(),
  ]);

  const placeList = places ?? [];
  const openCount = placeList.filter((p) => isOpenNow(p.hours, p.status, now)).length;
  const play = orderActivities(activities ?? [], now);
  const storyList = stories ?? [];
  const makers = contributors ? contributors.filter((c) => c.show).length : 0;

  const { minutes } = seoulParts(now);
  const clock = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  const stamp = `${formatToday(now, lang)} · ${clock}`;

  return (
    <div className="mz-home">
      <Cover lang={lang} placeCount={placeList.length} playCount={play.length} storyCount={storyList.length} />
      <NowBand lang={lang} stamp={stamp} weather={weather} openCount={places ? openCount : null} total={placeList.length} />
      <Intro lang={lang} placeCount={placeList.length} playCount={play.length} storyCount={storyList.length} />
      {placeList.length ? <PlacesSection lang={lang} places={placeList} now={now} clock={stamp} /> : null}
      {play.length ? <PlaySection lang={lang} items={play} /> : null}
      <StoriesSection lang={lang} stories={storyList} />
      <Pull lang={lang} />
      <Masthead
        lang={lang}
        makers={makers}
        places={placeList.length}
        play={play.length}
        stories={storyList.length}
      />
    </div>
  );
}

/* ───────── ① 표지 ───────── */

// 표지 사진 4장 (public/images/cover-N.jpg · 모바일은 세로로 자른 cover-N-sm.jpg, 출처 CREDITS.md).
// o = 확대 기준점(큰 판의 object-position) — 시안 index.html 의 --o 값.
//
// ▶ 나중에 영상으로 바꾸려면: COVER_SLIDES 대신 slides 에 영상 하나만 넘기면 된다. 예)
//   slides={[<video key="v" src="/video/cover.mp4" poster="/images/cover-1.jpg" autoPlay muted loop playsInline aria-hidden />]}
//   captions={[t(lang, "coverCaption1")]}
//   CoverShell 은 1개면 넘기기 단추·번호를 그리지 않고, magazine.css 의 느린 확대(.slide.on video)도 그대로 걸린다.
//   움직임 줄이기 사용자를 위해 영상은 poster 만 보이게 하려면 CoverShell 의 reduce 값을 영상에도 넘겨 autoPlay 를 끄면 된다.
const COVER_SLIDES: { n: 1 | 2 | 3 | 4; o: string }[] = [
  { n: 1, o: "70% 60%" },
  { n: 2, o: "55% 60%" },
  { n: 3, o: "30% 40%" },
  { n: 4, o: "80% 40%" },
];

function CoverPhoto({ n, o, alt, first }: { n: number; o: string; alt: string; first: boolean }) {
  const common = { alt, fill: true, sizes: "100vw", quality: 80 };
  const {
    props: { srcSet: wide },
  } = getImageProps({ ...common, src: `/images/cover-${n}.jpg` });
  const {
    props: { srcSet: narrow, ...rest },
  } = getImageProps({
    ...common,
    src: `/images/cover-${n}-sm.jpg`,
    // 첫 장은 먼저, 나머지는 뒤로 미뤄 받되(low) 넘어가는 순간 비어 보이지 않게 미리 받는다
    loading: "eager" as const,
    fetchPriority: first ? ("high" as const) : ("low" as const),
  });
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={wide} />
      {/* next/image 아트 디렉션(getImageProps + picture) — 문서 권장대로 img 를 직접 쓴다 */}
      <img {...rest} alt={alt} srcSet={narrow} style={{ ...rest.style, ["--o" as string]: o }} />
    </picture>
  );
}

function Cover({ lang, placeCount, playCount, storyCount }: { lang: Lang; placeCount: number; playCount: number; storyCount: number }) {
  const lines: { no: string; href: string; title: string; sub: string }[] = [
    { no: "p.02", href: "#places", title: t(lang, "tocPlacesTitle"), sub: tf(lang, "tocPlacesSub", { n: String(placeCount) }) },
    { no: "p.03", href: "#play", title: t(lang, "tocPlayTitle"), sub: tf(lang, "tocPlaySub", { n: String(playCount) }) },
    {
      no: "p.04",
      href: "#stories",
      title: t(lang, "tocStoriesTitle"),
      sub: storyCount ? tf(lang, "tocStoriesSub", { n: String(storyCount) }) : t(lang, "tocStoriesSubEmpty"),
    },
    { no: "p.05", href: "#people", title: t(lang, "tocMakersTitle"), sub: t(lang, "tocMakersSub") },
  ].filter((l) => (l.href === "#places" ? placeCount > 0 : l.href === "#play" ? playCount > 0 : true));

  const captions = COVER_SLIDES.map((s) => t(lang, `coverCaption${s.n}` as DictKey));
  return (
    <CoverShell
      label={t(lang, "coverLabel")}
      slides={COVER_SLIDES.map((s, i) => (
        <CoverPhoto key={s.n} n={s.n} o={s.o} alt={t(lang, `coverAlt${s.n}` as DictKey)} first={i === 0} />
      ))}
      captions={captions}
      dotsLabel={t(lang, "coverSlidesLabel")}
      dotLabels={COVER_SLIDES.map((s) => tf(lang, "coverSlideN", { n: String(s.n) }))}
      scrollLabel={t(lang, "coverScroll")}
    >
      <div className="cover-meta rise">
        <span className="it">{t(lang, "coverIssueNo")}</span>
        <span className="label">{t(lang, "coverIssueLabel")}</span>
        <span className="it">{t(lang, "coverIssueSeason")}</span>
      </div>
      <div className="cover-title">
        <div>
          <h1 className="rise d1">
            <span className="en">{t(lang, "coverTitleEn")}</span>
            {t(lang, "coverTitle")}
          </h1>
          <p className="cover-lede rise d2">{t(lang, "coverLede")}</p>
        </div>
        <nav aria-label={t(lang, "coverTocLabel")} className="rise d3">
          <ol className="coverlines">
            {lines.map((l) => (
              <li key={l.href}>
                <a href={l.href}>
                  <span className="no">{l.no}</span>
                  <span>
                    <strong>{l.title}</strong>
                    <small>{l.sub}</small>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </CoverShell>
  );
}

/* ───────── ② 지금 양양 ───────── */

function NowBand({
  lang,
  stamp,
  weather,
  openCount,
  total,
}: {
  lang: Lang;
  stamp: string;
  weather: NowYangyang;
  openCount: number | null;
  total: number;
}) {
  const kind = weatherKind(weather.code);
  const weatherWords = [
    kind ? t(lang, `weather.${kind}` as DictKey) : null,
    weather.windMs !== null ? tf(lang, "nowWind", { v: oneDecimal(weather.windMs) }) : null,
  ].filter(Boolean);
  const cells: { key: string; label: string; value: string; note?: string; icon: ReactNode; href?: string }[] = [];
  if (weather.tempC !== null) {
    cells.push({
      key: "weather",
      label: t(lang, "nowWeather"),
      value: `${Math.round(weather.tempC)}°`,
      note: weatherWords.join(" · "),
      icon: (
        <>
          <circle cx="17" cy="17" r="6" />
          <path d="M17 3v4M17 27v4M3 17h4M27 17h4M7 7l3 3M24 24l3 3M27 7l-3 3M10 24l-3 3" />
        </>
      ),
    });
  }
  if (weather.waveM !== null) {
    cells.push({
      key: "surf",
      label: t(lang, "nowSurf"),
      value: `${oneDecimal(weather.waveM)}m`,
      note: weather.wavePeriodS !== null ? tf(lang, "nowWavePeriod", { s: String(Math.round(weather.wavePeriodS)) }) : undefined,
      icon: (
        <>
          <path d="M3 20c4-6 8-6 12 0s8 6 12 0 4-3 4-3" />
          <path d="M3 27c4-4 8-4 12 0s8 4 12 0" />
          <path d="M8 13c2-6 9-8 13-4" />
        </>
      ),
    });
  }
  if (weather.sunrise !== null) {
    cells.push({
      key: "sunrise",
      label: t(lang, "nowSunrise"),
      value: weather.sunrise,
      note: t(lang, "nowSunriseNote"),
      icon: (
        <>
          <path d="M8 22a9 9 0 0 1 18 0" />
          <path d="M3 22h28M8 27h18" />
          <path d="M17 5v5M13 8l4-4 4 4" />
        </>
      ),
    });
  }
  if (openCount !== null && total > 0) {
    cells.push({
      key: "open",
      label: t(lang, "nowOpen"),
      value: `${openCount}${t(lang, "nowOpenUnit")}`,
      note: tf(lang, "nowOpenOf", { n: String(total) }),
      href: `/${lang}/places${placesQueryString({ openNow: true })}`,
      icon: (
        <>
          <path d="M5 14l2-7h20l2 7" />
          <path d="M5 14v13h24V14" />
          <path d="M14 27v-7h6v7" />
        </>
      ),
    });
  }

  return (
    <section className="now" aria-label={t(lang, "nowLabel")}>
      <div className="now-in">
        <div className="now-h">
          <b>{t(lang, "nowLabel")}</b>
          <span>{stamp}</span>
        </div>
        {cells.map((c) => {
          const body = (
            <>
              <svg viewBox="0 0 34 34" aria-hidden="true">
                {c.icon}
              </svg>
              <div>
                <small>{c.label}</small>
                <strong>
                  {c.value}
                  {c.note ? <em>{c.note}</em> : null}
                </strong>
              </div>
            </>
          );
          return c.href ? (
            <Link key={c.key} href={c.href} className="now-c">
              {body}
            </Link>
          ) : (
            <div key={c.key} className="now-c">
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ───────── ③ 여는 글 + 차례 ───────── */

function Intro({ lang, placeCount, playCount, storyCount }: { lang: Lang; placeCount: number; playCount: number; storyCount: number }) {
  const toc = [
    { no: "02", href: "#places", title: t(lang, "tocPlacesTitle"), sub: tf(lang, "tocPlacesSub", { n: String(placeCount) }), show: placeCount > 0 },
    { no: "03", href: "#play", title: t(lang, "tocPlayTitle"), sub: tf(lang, "tocPlaySub", { n: String(playCount) }), show: playCount > 0 },
    {
      no: "04",
      href: "#stories",
      title: t(lang, "tocStoriesTitle"),
      sub: storyCount ? tf(lang, "tocStoriesSub", { n: String(storyCount) }) : t(lang, "tocStoriesSubEmpty"),
      show: true,
    },
    { no: "05", href: "#people", title: t(lang, "tocMakersTitle"), sub: t(lang, "tocMakersSub"), show: true },
  ].filter((x) => x.show);
  return (
    <section className="intro" aria-label={t(lang, "introLabel")}>
      <div className="wrap">
        <div className="intro-grid">
          <div className="intro-k rv">
            <span className="label">{t(lang, "introLabel")}</span>
            <p>{t(lang, "introPlace").replace(", Yangyang", ",\nYangyang")}</p>
          </div>
          <div className="intro-t">
            <h2 className="rv d1">
              {t(lang, "introTitleA")}
              <em>{t(lang, "introTitleEm")}</em>
              {t(lang, "introTitleB")}
            </h2>
            <div className="body rv d2">
              <p>{t(lang, "introBody1")}</p>
              <p>{t(lang, "introBody2")}</p>
            </div>
          </div>
        </div>
        <nav className="toc rv" aria-label={t(lang, "tocLabel")}>
          {toc.map((x) => (
            <a key={x.no} href={x.href}>
              <span className="no">{x.no}</span>
              <b>{x.title}</b>
              <span className="sub">{x.sub}</span>
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}

/* ───────── ④ 장소 색인 ───────── */

/** 장소 번호 — 북쪽(위도 큰 곳)부터 01. 같은 위도면 이름 순. 2단계 약도 핀 번호와 같게 쓴다 */
function numberPlaces(places: Place[]): Map<string, string> {
  const sorted = [...places].sort((a, b) => b.lat - a.lat || a.name_ko.localeCompare(b.name_ko, "ko"));
  return new Map(sorted.map((p, i) => [p.id, pad(i + 1)]));
}

function hasHours(p: Place): boolean {
  return Object.values(p.hours ?? {}).some((v) => (v?.length ?? 0) > 0);
}

function PlacesSection({ lang, places, now, clock }: { lang: Lang; places: Place[]; now: Date; clock: string }) {
  const numbers = numberPlaces(places);
  const rows: IndexRow[] = places.map((p) => {
    const row = p as unknown as Record<string, unknown>;
    const name = pickText(row, "name", lang);
    const summary = pickText(row, "summary", lang);
    const open = isOpenNow(p.hours, p.status, now);
    const state: IndexRow["state"] = p.status === "closed" ? "shut" : open ? "open" : hasHours(p) ? "later" : "none";
    const stateLabel = state === "shut" ? t(lang, "statusClosed") : state === "open" ? t(lang, "openNow") : state === "later" ? t(lang, "closedNow") : "";
    // 이름 옆 작은 글자: 국문 화면은 로마자 이름, 영문 화면은 한글 이름(영문 이름이 있을 때)
    const sub = lang === "ko" ? p.name_roman || null : !name.fallback ? p.name_ko : p.name_roman || null;
    return {
      id: p.id,
      no: numbers.get(p.id) ?? "",
      href: `/${lang}/place/${p.slug}`,
      name: name.text,
      sub,
      cat: p.category,
      catLabel: CATEGORY_KEY[p.category] ? t(lang, CATEGORY_KEY[p.category]) : p.category,
      summary: summary.text || null,
      state,
      stateLabel,
    };
  });
  const placesHref = (category?: Place["category"]) => `/${lang}/places${placesQueryString(category ? { category } : {})}`;
  const tabs: IndexTab[] = [
    { key: "all", label: t(lang, "filterAll"), count: places.length, href: placesHref(), seeAll: t(lang, "placesSeeAll") },
    ...CATEGORIES.filter((c) => places.some((p) => p.category === c)).map((c) => ({
      key: c,
      label: t(lang, CATEGORY_KEY[c]),
      count: places.filter((p) => p.category === c).length,
      href: placesHref(c),
      seeAll: tf(lang, "placesSeeAllCat", { cat: t(lang, CATEGORY_KEY[c]) }),
    })),
  ];

  return (
    <section className="sec sec-first" id="places">
      {/* 2단계: 손그림 약도는 PlaceIndex 의 side 로 넣는다 → 왼쪽 약도 · 오른쪽 목록 */}
      <div className="wrap">
        <header className="sec-head rv">
          <span className="sec-no">02</span>
          <div>
            <span className="label">{t(lang, "secPlacesKicker")}</span>
            <h2>{tf(lang, "secPlacesTitle", { n: String(places.length) })}</h2>
          </div>
          <p>{t(lang, "secPlacesLead")}</p>
        </header>
        <PlaceIndex
          rows={rows}
          tabs={tabs}
          tabsLabel={t(lang, "placesTabsLabel")}
          empty={t(lang, "emptyPlacesTitle")}
          note={
            <div className="flex flex-col gap-1">
              <nav className="quick" aria-label={t(lang, "homeChipsLabel")}>
                <Link href={`/${lang}/places${placesQueryString({ openNow: true })}`}>{t(lang, "homeChipOpenNow")}</Link>
                <Link href={`/${lang}/places${placesQueryString({ englishMenu: true })}`}>{t(lang, "homeChipEnglishMenu")}</Link>
                <Link href={`/${lang}/stories${storiesQueryString({ tag: "nocar" })}`}>{t(lang, "homeChipNoCar")}</Link>
              </nav>
              <span className="note">{tf(lang, "placesStatusAsOf", { time: clock })}</span>
            </div>
          }
        />
      </div>
    </section>
  );
}

/* ───────── ⑤ 놀거리 ───────── */

type PlayItem = { a: Activity; no: string; offSeason: boolean };

/** 끝난 행사는 빼고: 오늘 볼 수 있는 것(계절 안) → 그 밖(요일이 아닌 날 등) → 비시즌. 01 부터 번호 */
function orderActivities(list: Activity[], now: Date): PlayItem[] {
  const live = list.filter((a) => !activityEnded(a, now));
  const todayIds = new Set(activitiesForDay(live, now).map((a) => a.id));
  const season = (a: Activity) => inSeason({ season_months: a.season_months ?? [] }, now);
  const ordered = [
    ...live.filter((a) => season(a) && todayIds.has(a.id)),
    ...live.filter((a) => season(a) && !todayIds.has(a.id)),
    ...live.filter((a) => !season(a)),
  ];
  return ordered.map((a, i) => ({ a, no: pad(i + 1), offSeason: !season(a) }));
}

function playWhen(a: Activity, lang: Lang): string {
  if (a.kind === "dated") return formatDateRange(a.starts_on, a.ends_on, lang);
  return seasonLabel(a.season_months ?? [], lang) ?? formatWeekdays(a.weekdays, lang);
}

function PlaySection({ lang, items }: { lang: Lang; items: PlayItem[] }) {
  // 큰 칸 1 + 작은 칸 2 — 같은 분류 대표 사진이 한 화면에 두 번 나오지 않게 분류가 다른 것으로 고른다
  const featured: PlayItem[] = [];
  const usedCats = new Set<string>();
  for (const it of items) {
    if (featured.length === 3) break;
    if (it.offSeason || usedCats.has(it.a.category)) continue;
    featured.push(it);
    usedCats.add(it.a.category);
  }
  const rest = items.filter((it) => !featured.includes(it));
  const [big, ...stack] = featured;
  const cat = (a: Activity) => (PLAY_CATEGORY_KEY[a.category] ? t(lang, PLAY_CATEGORY_KEY[a.category]) : a.category);

  const tile = (it: PlayItem, size: "big" | "small", delay: string) => {
    const title = pickText(it.a as unknown as Record<string, unknown>, "title", lang);
    const desc = pickText(it.a as unknown as Record<string, unknown>, "desc", lang);
    const photo = PLAY_VISUAL[it.a.category]?.photo;
    const label = [cat(it.a), playWhen(it.a, lang)].filter(Boolean).join(" · ");
    return (
      <Link key={it.a.id} href={`/${lang}/activity/${it.a.id}`} className={`pl ${size === "big" ? "big" : ""} rv ${delay}`}>
        {photo ? (
          <>
            <Image src={photo} alt="" fill sizes={size === "big" ? "(min-width: 861px) 58vw, 100vw" : "(min-width: 861px) 42vw, 100vw"} />
            <span className="rep">{t(lang, "categoryPhotoLabel")}</span>
          </>
        ) : (
          <span className={`noimg play-${it.a.category}`} aria-hidden="true">
            <span className="glyph">{title.text.slice(0, 1)}</span>
          </span>
        )}
        <span className="no">{it.no}</span>
        <span className="tx">
          <span className="label">{label}</span>
          <h3>{title.text}</h3>
          {size === "big" && desc.text ? <p>{desc.text}</p> : null}
        </span>
      </Link>
    );
  };

  return (
    <section className="sec play" id="play">
      <div className="wrap">
        <header className="sec-head rv">
          <span className="sec-no">03</span>
          <div>
            <span className="label">{t(lang, "secPlayKicker")}</span>
            <h2>{tf(lang, "secPlayTitle", { n: String(items.length) })}</h2>
          </div>
          <p>{t(lang, "secPlayLead")}</p>
        </header>
        {big ? (
          <div className="play-grid">
            {tile(big, "big", "")}
            {stack.length ? <div className="pl-stack">{stack.map((it, i) => tile(it, "small", i ? "d2" : "d1"))}</div> : null}
          </div>
        ) : null}
        {rest.length ? (
          <ul className="play-list">
            {rest.map((it) => {
              const row = it.a as unknown as Record<string, unknown>;
              const title = pickText(row, "title", lang);
              const desc = pickText(row, "desc", lang);
              const when = playWhen(it.a, lang);
              return (
                <li key={it.a.id}>
                  <Link href={`/${lang}/activity/${it.a.id}`} className="pi rv">
                    <span className="no">{it.no}</span>
                    <span>
                      <h4>{title.text}</h4>
                      {desc.text ? <p>{desc.text}</p> : null}
                      <span className="chips">
                        <span className="chip">{cat(it.a)}</span>
                        {when ? <span className="chip">{when}</span> : null}
                        {it.a.rainy_ok ? <span className="chip warm">{t(lang, "rainyOk")}</span> : null}
                        {it.offSeason ? <span className="chip">{t(lang, "offSeasonTitle")}</span> : null}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="play-more rv">
          <Link className="btn-line" href={`/${lang}/play`}>
            {t(lang, "playSeeAll")}
            <Arrow />
          </Link>
          <Link className="more" href={`/${lang}/play${playQueryString({ rainy: true })}`}>
            {t(lang, "homeChipRainy")}
            <Arrow />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ───────── ⑥ 이야기 ───────── */

/** 이야기 사진: 표지 사진 → 없으면 갈래 대표 사진(+ 「분류 대표 사진」 표기) */
function StoryPhoto({ story, lang, sizes }: { story: Story; lang: Lang; sizes: string }) {
  const fallback = STORY_VISUAL[story.type]?.photo ?? null;
  if (story.cover_photo) {
    return (
      <SafeImage
        src={photoUrl(story.cover_photo)}
        alt=""
        fallbackSrc={fallback}
        fallbackLabel={t(lang, "categoryPhotoLabel")}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  if (!fallback) return null;
  return (
    <>
      <Image src={fallback} alt="" fill sizes={sizes} />
      <span className="rep">{t(lang, "categoryPhotoLabel")}</span>
    </>
  );
}

function StoriesSection({ lang, stories }: { lang: Lang; stories: Story[] }) {
  const [lead, ...others] = stories;
  const small = others.slice(0, 3);
  const typeLabel = (s: Story) => (STORY_TYPE_KEY[s.type] ? t(lang, STORY_TYPE_KEY[s.type]) : s.type);

  return (
    <section className="sec" id="stories">
      <div className="wrap">
        <header className="sec-head rv">
          <span className="sec-no">04</span>
          <div>
            <span className="label">{t(lang, "secStoriesKicker")}</span>
            <h2>{t(lang, "secStoriesTitle")}</h2>
          </div>
          {lead ? (
            <Link className="more" href={`/${lang}/stories`}>
              {t(lang, "storiesSeeAll")}
              <Arrow />
            </Link>
          ) : (
            <span />
          )}
        </header>

        {lead ? (
          (() => {
            const row = lead as unknown as Record<string, unknown>;
            const title = pickText(row, "title", lang);
            const summary = pickText(row, "summary", lang);
            const author = [lead.author_name, lead.author_team].filter(Boolean).join(" · ");
            const href = `/${lang}/stories/${lead.slug}`;
            return (
              <article className="feature rv">
                <Link className="ph" href={href} tabIndex={-1} aria-hidden="true">
                  <StoryPhoto story={lead} lang={lang} sizes="(min-width: 861px) 58vw, 100vw" />
                </Link>
                <div className="tx">
                  <span className="label">{typeLabel(lead)}</span>
                  <h3>
                    <Link href={href}>{title.text}</Link>
                  </h3>
                  {summary.text ? <p className="dek">{summary.text}</p> : null}
                  <div className="by">
                    <span>{author ? tf(lang, "storyByline", { name: author }) : null}</span>
                    <Link className="more" href={href}>
                      {t(lang, "storyRead")}
                      <Arrow />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })()
        ) : (
          <article className="feature is-empty rv">
            <div className="ph">
              <div className="noimg" aria-hidden="true">
                <span className="glyph">{lang === "ko" ? "이" : "S"}</span>
                <span className="it">{t(lang, "coverIssueSeason")}</span>
              </div>
            </div>
            <div className="tx">
              <span className="label">{t(lang, "storiesEmptyKicker")}</span>
              <h3>{t(lang, "storiesEmptyTitle")}</h3>
              <p className="dek">{t(lang, "storiesEmptyBody")}</p>
              <div className="by">
                <span />
                <Link className="more" href={`/${lang}/makers`}>
                  {t(lang, "makersSeeAll")}
                  <Arrow />
                </Link>
              </div>
            </div>
          </article>
        )}

        {small.length ? (
          <div className="stories">
            {small.map((s, i) => {
              const row = s as unknown as Record<string, unknown>;
              const title = pickText(row, "title", lang);
              const summary = pickText(row, "summary", lang);
              return (
                <Link key={s.id} className={`story rv ${i ? `d${i}` : ""}`} href={`/${lang}/stories/${s.slug}`}>
                  <div className="ph">
                    <StoryPhoto story={s} lang={lang} sizes="(min-width: 861px) 30vw, 100vw" />
                  </div>
                  <span className="label">{typeLabel(s)}</span>
                  <h4>{title.text}</h4>
                  {summary.text ? <p>{summary.text}</p> : null}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ───────── ⑦ 큰 인용문 ───────── */

function Pull({ lang }: { lang: Lang }) {
  return (
    <section className="pull" aria-label={t(lang, "pullLabel")}>
      <div className="wrap">
        <blockquote className="rv">{t(lang, "pullQuote")}</blockquote>
        <cite className="rv d1">{t(lang, "pullCite")}</cite>
        <svg className="hz line-draw" viewBox="0 0 520 40" fill="none" strokeLinecap="round" aria-hidden="true">
          <path d="M0 24 H520" className="stroke-ink" strokeWidth="1" />
          <path d="M232 24 A28 28 0 0 1 288 24" className="stroke-sunrise" strokeWidth="2" />
        </svg>
      </div>
    </section>
  );
}

/* ───────── ⑧ 만든 사람들 ───────── */

function Masthead({ lang, makers, places, play, stories }: { lang: Lang; makers: number; places: number; play: number; stories: number }) {
  const facts: { dt: DictKey; unit: DictKey; n: number }[] = [
    { dt: "colMakers", unit: "unitPeople", n: makers },
    { dt: "colPlaces", unit: "unitPlaces", n: places },
    { dt: "colPlay", unit: "unitPlay", n: play },
    { dt: "colStories", unit: "unitStories", n: stories },
  ];
  return (
    <section className="sec" id="people">
      <div className="wrap">
        <header className="sec-head rv">
          <span className="sec-no">05</span>
          <div>
            <span className="label">{t(lang, "secMakersKicker")}</span>
            <h2>{t(lang, "secMakersTitle")}</h2>
          </div>
          <span />
        </header>
        <div className="mast">
          <div className="rv">
            <p className="mast-lede">{t(lang, "makersLede")}</p>
            <Link className="btn-line" href={`/${lang}/makers`}>
              {t(lang, "makersSeeAll")}
              <Arrow />
            </Link>
          </div>
          <dl className="colophon rv d1">
            {facts
              .filter((f) => f.n > 0)
              .map((f) => (
                <div key={f.dt}>
                  <dt>{t(lang, f.dt)}</dt>
                  <dd className="num">{tf(lang, f.unit, { n: String(f.n) })}</dd>
                </div>
              ))}
            <div>
              <dt>{t(lang, "colSupport")}</dt>
              <dd>{t(lang, "supportOrg")}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
