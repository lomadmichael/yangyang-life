import { getImageProps } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ActivityCard } from "@/components/ActivityCard";
import { Badge } from "@/components/Badge";
import { FALLBACK_VISUAL, PLACE_VISUAL, PLAY_VISUAL, type Visual } from "@/components/category-visual";
import { FallbackNote } from "@/components/FallbackNote";
import { IconUser } from "@/components/icons";
import { PhotoCard, PhotoFrame } from "@/components/PhotoCard";
import { isAmenityCategory } from "@/components/PlaceCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StoryCard } from "@/components/StoryCard";
import { isLang, pickText, t, tf, type DictKey, type Lang } from "@/i18n";
import { formatToday } from "@/lib/format";
import { isOpenNow } from "@/lib/hours";
import { CATEGORIES, CATEGORY_KEY, PLAY_CATEGORIES, PLAY_CATEGORY_KEY, PRICE_KEY, priceSymbol } from "@/lib/labels";
import { parsePlayQuery, playQueryString, placesQueryString, storiesQueryString } from "@/lib/list-query";
import { visibleCategories } from "@/lib/places-filter";
import { groupPlay } from "@/lib/play";
import { listActivities, listContributors, listPlaces, listStories } from "@/lib/queries";
import { activitiesForDay } from "@/lib/today";
import type { Place } from "@/lib/types";

const OPEN_MAX = 10;
const PLAY_MAX = 3;
const SHORTCUT_MAX = 8;
const STORY_MAX = 3;

/** 조회 실패는 그 묶음만 숨긴다 — 홈 전체가 오류 화면이 되지 않게 */
async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

type Shortcut = { key: string; href: string; label: string; visual: Visual };

// 홈 — ① 히어로(큰 사진·제목·목적 칩) ② 오늘 양양 + 비 오는 날 ③ 지금 열린 곳 ④ 이번 주 놀거리 ⑤ 분류 바로가기
// ⑥ 새 이야기 ⑦ 숫자 띠 ⑧ 만든 사람들 (PRD F2 · v3 계획 Task 4)
// 각 묶음은 비어 있거나 조회에 실패하면 그리지 않는다. 장소·놀거리·이야기가 하나도 없으면(운영 DB 공개 전)
// 히어로·묶음 대신 「곧 채워집니다」 안내 하나만 크게 보여 준다.
export default async function HomePage({ params, searchParams }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  await connection(); // 「지금 열린 곳」·「오늘」은 요청 시각 기준

  const rainy = !!parsePlayQuery(await searchParams).rainy;
  const now = new Date();
  const [places, activities, stories, contributors] = await Promise.all([
    orNull(listPlaces()),
    orNull(listActivities()),
    orNull(listStories()),
    orNull(listContributors()),
  ]);

  // ③ 지금 영업 중인 곳. 휴업은 빼고, 영업시간이 비어 있는 곳(해변 등)은 isOpenNow 가 거짓이라 자연히 빠진다.
  // 해변·생활 편의라도 영업시간이 있고 지금 열려 있으면(예: 마트) 보여 준다.
  // 비 오는 날이어도 거르지 않는다: 장소에는 실내·실외 정보가 없다.
  const openNow = (places ?? [])
    .filter((p) => p.status !== "closed" && isOpenNow(p.hours, p.status, now))
    .slice(0, OPEN_MAX);

  // ④ 오늘 볼 수 있는 놀거리(비시즌 제외). 비 오는 날이면 비 와도 좋은 것만
  const play = activities ? groupPlay(activities, now, { rainy }) : null;
  const thisWeek = play ? [...play.dated, ...play.always].slice(0, PLAY_MAX) : [];

  // ⑤ 항목이 있는 분류만(R18), 장소 → 놀거리 순, 최대 8칸. 놀거리는 놀거리 화면 탭과 같은 기준(오늘 볼 수 있는 것)
  // 장소 분류(최대 7)가 8칸을 다 먹지 않게 각자 절반을 먼저 보장하고, 남는 칸은 다른 쪽이 채운다.
  const placeCuts: Shortcut[] = (places ? visibleCategories(CATEGORIES, places) : []).map((c) => ({
    key: `place-${c}`,
    href: `/${lang}/places${placesQueryString({ category: c })}`,
    label: t(lang, CATEGORY_KEY[c]),
    visual: PLACE_VISUAL[c] ?? FALLBACK_VISUAL,
  }));
  const playCuts: Shortcut[] = (
    activities ? visibleCategories(PLAY_CATEGORIES, activitiesForDay(activities, now, {})) : []
  ).map((c) => ({
    key: `play-${c}`,
    href: `/${lang}/play${playQueryString({ category: c })}`,
    label: t(lang, PLAY_CATEGORY_KEY[c]),
    visual: PLAY_VISUAL[c] ?? FALLBACK_VISUAL,
  }));
  const half = SHORTCUT_MAX / 2;
  const placeTake = Math.min(placeCuts.length, Math.max(half, SHORTCUT_MAX - playCuts.length));
  const shortcuts: Shortcut[] = [
    ...placeCuts.slice(0, placeTake),
    ...playCuts.slice(0, SHORTCUT_MAX - placeTake),
  ];

  const newStories = (stories ?? []).slice(0, STORY_MAX);
  const makers = contributors ? contributors.filter((c) => c.show).length : 0;

  // ⑦ 숫자 띠 — 각 목록 화면이 보여 주는 것과 같은 기준의 실제 개수. 0 인 칸은 빼고, 다 0 이면 띠를 그리지 않는다
  const allPlay = activities ? groupPlay(activities, now, {}) : null;
  const playTotal = allPlay ? allPlay.dated.length + allPlay.always.length + allPlay.offSeason.length : 0;
  const statRows: { key: DictKey; n: number; href: string }[] = [
    { key: "homeStatPlaces", n: places?.length ?? 0, href: `/${lang}/places` },
    { key: "homeStatPlay", n: playTotal, href: `/${lang}/play` },
    { key: "homeStatStories", n: stories?.length ?? 0, href: `/${lang}/stories` },
    { key: "homeStatMakers", n: makers, href: `/${lang}/makers` },
  ];
  const stats = statRows.filter((s) => s.n > 0);

  // 공개 전(장소·놀거리·이야기 모두 0 또는 조회 실패) — 준비 중 안내로 대신한다
  const empty = !places?.length && !activities?.length && !stories?.length;

  const homeHref = (r: boolean) => `/${lang}${playQueryString({ rainy: r })}`;
  const playHref = `/${lang}/play${playQueryString({ rainy })}`;

  return (
    <div className="flex flex-col gap-10 px-4 pb-12 lg:gap-16 lg:px-8 lg:pb-20">
      {empty ? <ComingSoon lang={lang} /> : <Hero lang={lang} />}

      {/* ② 오늘 양양 + 비 오는 날 */}
      {empty ? null : (
        <section className="-mt-2 flex flex-col gap-3 lg:-mt-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <h2 className="text-xl font-bold leading-snug lg:text-2xl">
            {tf(lang, "homeGreeting", { date: formatToday(now, lang) })}
          </h2>
          <Link
            href={homeHref(!rainy)}
            scroll={false}
            aria-current={rainy ? "true" : undefined}
            className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 active:bg-sea-soft lg:w-96 lg:shrink-0 lg:hover:border-sea"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{t(lang, "homeRainyTitle")}</span>
              <span className="block text-sm text-muted">{t(lang, "homeRainySub")}</span>
            </span>
            <span
              aria-hidden="true"
              className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 ${rainy ? "justify-end bg-sea" : "justify-start bg-line"}`}
            >
              <span className="h-6 w-6 rounded-full bg-surface" />
            </span>
          </Link>
        </section>
      )}

      {/* ③ 지금 열린 곳 — 가로 카드 줄 (PC 는 한 화면에 4장) */}
      {openNow.length > 0 ? (
        <section className="flex flex-col gap-3 lg:gap-5">
          <SectionHeader
            title={t(lang, "homeOpenNowTitle")}
            href={`/${lang}/places${placesQueryString({ openNow: true })}`}
            moreLabel={t(lang, "homeSeeAll")}
          />
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:gap-6 lg:px-0">
            {openNow.map((p) => (
              <li key={p.id} className="w-60 shrink-0 snap-start lg:w-[calc(25%-1.125rem)]">
                <OpenCard place={p} lang={lang} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ④ 이번 주 놀거리 — PC 3단 */}
      {thisWeek.length > 0 ? (
        <section className="flex flex-col gap-3 lg:gap-5">
          <SectionHeader title={t(lang, "homeThisWeekTitle")} href={playHref} moreLabel={t(lang, "homeSeeAll")} />
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-6">
            {thisWeek.map((a) => (
              <li key={a.id}>
                <ActivityCard activity={a} lang={lang} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ⑤ 분류 바로가기 — 대표 사진 위 분류 이름 (모바일 2단 · PC 4단) */}
      {shortcuts.length > 0 ? (
        <section className="flex flex-col gap-3 lg:gap-5">
          <SectionHeader title={t(lang, "homeBrowseTitle")} />
          <ul aria-label={t(lang, "homeBrowseTitle")} className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
            {shortcuts.map((s) => (
              <li key={s.key}>
                <PhotoCard
                  href={s.href}
                  fallback={s.visual.photo}
                  Icon={s.visual.Icon}
                  tone={s.visual.tone}
                  title={s.label}
                  heading="p"
                  className="aspect-4/3 lg:aspect-video"
                  sizes="(min-width: 1024px) 280px, 50vw"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ⑥ 새 이야기 — PC 3단 큰 카드 */}
      {newStories.length > 0 ? (
        <section className="flex flex-col gap-3 lg:gap-5">
          <SectionHeader title={t(lang, "homeNewStoriesTitle")} href={`/${lang}/stories`} moreLabel={t(lang, "homeSeeAll")} />
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-6">
            {newStories.map((s) => (
              <li key={s.id}>
                <StoryCard story={s} lang={lang} size="lg" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ⑦ 숫자 띠 — 공개 전(empty)에는 「만든 사람」 하나만 남아 아래 띠와 겹치므로 그리지 않는다 */}
      {stats.length > 0 && !empty ? (
        <section aria-label={t(lang, "homeStatsLabel")} className="rounded-2xl bg-sea px-4 py-6 text-on-sea lg:px-10 lg:py-10">
          <ul className={`grid gap-y-5 ${stats.length === 1 ? "grid-cols-1" : stats.length === 3 ? "grid-cols-3" : "grid-cols-2"} ${stats.length >= 4 ? "lg:grid-cols-4" : ""}`}>
            {stats.map((s) => (
              <li key={s.key}>
                <Link href={s.href} className="flex flex-col items-center gap-1 rounded-xl py-1 text-center hover:bg-sea-strong">
                  <span className="text-3xl font-bold tabular-nums lg:text-5xl">{s.n}</span>
                  <span className="text-base font-medium">{t(lang, s.key)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ⑧ 만든 사람들 */}
      {makers > 0 ? (
        <Link
          href={`/${lang}/makers`}
          className="flex min-h-14 items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-4 active:bg-sea-soft lg:gap-6 lg:px-8 lg:py-8 lg:hover:border-pine"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pine-soft text-pine lg:h-16 lg:w-16">
            <IconUser className="h-6 w-6 lg:h-8 lg:w-8" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold leading-snug lg:text-2xl">{t(lang, "homeMakersTitle")}</span>
            <span className="mt-0.5 block text-base text-ink">
              {tf(lang, makers === 1 ? "homeMakersMoreOne" : "homeMakersMore", { n: String(makers) })}
            </span>
          </span>
          <span aria-hidden="true" className="text-xl text-muted">
            →
          </span>
        </Link>
      ) : null}
    </div>
  );
}

/** 히어로·준비 중 안내가 같이 쓰는 전면 사진 — 모바일은 작은 판(-sm), 768px 이상은 큰 판 */
function HeroPhoto() {
  const common = { alt: "", fill: true, sizes: "100vw", loading: "eager" as const, fetchPriority: "high" as const };
  const {
    props: { srcSet: wide },
  } = getImageProps({ ...common, src: "/images/hero-1.jpg" });
  const {
    props: { srcSet: narrow, ...rest },
  } = getImageProps({ ...common, src: "/images/hero-1-sm.jpg" });
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={wide} />
      {/* next/image 의 아트 디렉션 방식(getImageProps + picture) — 문서 권장대로 img 를 직접 쓴다. 장식용 사진이라 alt="" */}
      <img {...rest} alt="" srcSet={narrow} className="object-cover" />
    </picture>
  );
}

/** 전면 폭 사진 띠 — 본문 단(max-w-6xl) 밖으로 화면 끝까지. 글자는 본문 단 폭 안에 */
function FullBleed({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section
      aria-label={label}
      className="relative left-1/2 flex min-h-96 w-screen -translate-x-1/2 items-end overflow-hidden bg-ink lg:h-[65vh] lg:min-h-[30rem]"
    >
      <HeroPhoto />
      {/* 어두운 덮개 — 전체를 한 겹, 글자가 놓이는 아래쪽을 한 겹 더 */}
      <div aria-hidden="true" className="absolute inset-0 bg-ink/35" />
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/30 to-transparent" />
      <div className="relative mx-auto w-full max-w-md px-4 pb-8 pt-24 text-on-sea lg:max-w-6xl lg:px-8 lg:pb-16">{children}</div>
    </section>
  );
}

/** ① 히어로 — 윗줄 · 큰 제목 · 한 줄 소개 · 목적 칩 6개 */
function Hero({ lang }: { lang: Lang }) {
  const chips: { key: DictKey; href: string }[] = [
    { key: "homeChipOpenNow", href: `/${lang}/places${placesQueryString({ openNow: true })}` },
    { key: "homeChipRainy", href: `/${lang}/play${playQueryString({ rainy: true })}` },
    { key: "homeChipNoCar", href: `/${lang}/stories${storiesQueryString({ tag: "nocar" })}` },
    { key: "homeChipEnglishMenu", href: `/${lang}/places${placesQueryString({ englishMenu: true })}` },
    { key: "homeChipSpots", href: `/${lang}/places${placesQueryString({ category: "spot" })}` },
    { key: "homeChipStories", href: `/${lang}/stories` },
  ];
  return (
    <FullBleed label={t(lang, "homeHeroTitle")}>
      <p className="text-sm font-medium lg:text-base">{t(lang, "homeHeroEyebrow")}</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight lg:mt-3 lg:text-6xl">{t(lang, "homeHeroTitle")}</h1>
      <p className="mt-2 text-base lg:mt-4 lg:text-xl">{t(lang, "homeHeroLead")}</p>
      <nav aria-label={t(lang, "homeChipsLabel")} className="mt-5 lg:mt-8">
        <ul className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:gap-3">
          {chips.map((c) => (
            <li key={c.key}>
              <Link
                href={c.href}
                className="flex min-h-11 items-center justify-center rounded-full border border-on-sea/60 bg-ink/30 px-4 text-center text-base font-medium leading-tight backdrop-blur-sm hover:bg-surface hover:text-ink lg:min-h-12 lg:px-6 lg:text-base"
              >
                {t(lang, c.key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </FullBleed>
  );
}

/** 공개 전 안내 — 장소·놀거리·이야기가 하나도 없을 때 히어로 자리를 대신한다 */
function ComingSoon({ lang }: { lang: Lang }) {
  return (
    <FullBleed label={t(lang, "homeComingTitle")}>
      <p className="text-sm font-medium lg:text-base">{t(lang, "homeHeroEyebrow")}</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight lg:mt-3 lg:text-6xl">{t(lang, "homeComingTitle")}</h1>
      <p className="mt-3 max-w-2xl text-base lg:mt-5 lg:text-xl">{t(lang, "homeComingBody")}</p>
      <p className="mt-5 inline-flex rounded-full bg-surface px-4 py-1.5 text-base font-bold text-sea lg:mt-8">
        {t(lang, "homeComingEyebrow")}
      </p>
    </FullBleed>
  );
}

/** 「지금 열린 곳」 가로 카드 — 사진(없으면 분류 대표 사진) · 이름 · 분류·가격 · 영업 중 */
function OpenCard({ place, lang }: { place: Place; lang: Lang }) {
  const name = pickText(place as unknown as Record<string, unknown>, "name", lang);
  const categoryKey = CATEGORY_KEY[place.category];
  const visual = PLACE_VISUAL[place.category] ?? FALLBACK_VISUAL;
  return (
    <Link
      href={`/${lang}/place/${place.slug}`}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface active:bg-sea-soft lg:hover:border-sea"
    >
      <PhotoFrame
        src={place.photos?.[0]}
        fallback={visual.photo}
        alt=""
        Icon={visual.Icon}
        tone={visual.tone}
        iconClassName="h-10 w-10"
        sizes="(min-width: 1024px) 280px, 240px"
        className="aspect-4/3 w-full"
      />
      <span className="flex flex-1 flex-col gap-1 p-4">
        <span className="line-clamp-2 text-lg font-bold leading-snug">
          {name.text}
          <FallbackNote lang={lang} show={name.fallback} />
        </span>
        <span className="text-sm text-muted">
          {categoryKey ? t(lang, categoryKey) : null}
          {/* 해변·생활 편의에는 가격이 뜻이 없다(PlaceCard 와 같은 규칙) */}
          {isAmenityCategory(place.category) ? null : (
            <span aria-label={`${t(lang, "priceLabel")}: ${t(lang, PRICE_KEY[place.price_level])}`}>
              {categoryKey ? " · " : null}
              {priceSymbol(place.price_level)}
            </span>
          )}
        </span>
        <span className="mt-auto flex flex-wrap gap-1.5 pt-2">
          <Badge tone="open">{t(lang, "openNow")}</Badge>
          {place.has_english_menu ? <Badge tone="info">{t(lang, "badgeEnglishMenu")}</Badge> : null}
        </span>
      </span>
    </Link>
  );
}
