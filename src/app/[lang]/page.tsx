import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ActivityCard } from "@/components/ActivityCard";
import { Badge } from "@/components/Badge";
import { FallbackNote } from "@/components/FallbackNote";
import { IconPin, IconUser, IconWave } from "@/components/icons";
import { isAmenityCategory } from "@/components/PlaceCard";
import { StoryCard } from "@/components/StoryCard";
import { isLang, pickText, t, tf, type Lang } from "@/i18n";
import { formatToday } from "@/lib/format";
import { isOpenNow } from "@/lib/hours";
import { CATEGORIES, CATEGORY_KEY, PLAY_CATEGORIES, PLAY_CATEGORY_KEY, PRICE_KEY, priceSymbol } from "@/lib/labels";
import { parsePlayQuery, playQueryString, placesQueryString } from "@/lib/list-query";
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

type Shortcut = { key: string; href: string; label: string; kind: "place" | "play" };

// 홈 — ① 인사 + 비 오는 날 ② 지금 열린 곳 ③ 이번 주 놀거리 ④ 분류 바로가기 ⑤ 새 이야기 ⑥ 만든 사람들 (PRD F2)
// 각 묶음은 비어 있거나 조회에 실패하면 그리지 않는다.
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

  // ② 지금 영업 중인 곳. 휴업은 빼고, 영업시간이 비어 있는 곳(해변 등)은 isOpenNow 가 거짓이라 자연히 빠진다.
  // 해변·생활 편의라도 영업시간이 있고 지금 열려 있으면(예: 마트) 보여 준다.
  // 비 오는 날이어도 거르지 않는다: 장소에는 실내·실외 정보가 없다.
  const openNow = (places ?? [])
    .filter((p) => p.status !== "closed" && isOpenNow(p.hours, p.status, now))
    .slice(0, OPEN_MAX);

  // ③ 오늘 볼 수 있는 놀거리(비시즌 제외). 비 오는 날이면 비 와도 좋은 것만
  const play = activities ? groupPlay(activities, now, { rainy }) : null;
  const thisWeek = play ? [...play.dated, ...play.always].slice(0, PLAY_MAX) : [];

  // ④ 항목이 있는 분류만(R18), 장소 → 놀거리 순, 최대 8칸. 놀거리는 놀거리 화면 탭과 같은 기준(오늘 볼 수 있는 것)
  const shortcuts: Shortcut[] = [
    ...(places ? visibleCategories(CATEGORIES, places) : []).map((c) => ({
      key: `place-${c}`,
      href: `/${lang}/places${placesQueryString({ category: c })}`,
      label: t(lang, CATEGORY_KEY[c]),
      kind: "place" as const,
    })),
    ...(activities ? visibleCategories(PLAY_CATEGORIES, activitiesForDay(activities, now, {})) : []).map((c) => ({
      key: `play-${c}`,
      href: `/${lang}/play${playQueryString({ category: c })}`,
      label: t(lang, PLAY_CATEGORY_KEY[c]),
      kind: "play" as const,
    })),
  ].slice(0, SHORTCUT_MAX);

  const newStories = (stories ?? []).slice(0, STORY_MAX);
  const makers = contributors ? contributors.filter((c) => c.show).length : 0;

  const homeHref = (r: boolean) => `/${lang}${playQueryString({ rainy: r })}`;
  const playHref = `/${lang}/play${playQueryString({ rainy })}`;

  return (
    <div className="flex flex-col gap-6 px-4 pb-10 pt-2">
      {/* ① 인사 + 비 오는 날 */}
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold leading-snug">{tf(lang, "homeGreeting", { date: formatToday(now, lang) })}</h1>
        <Link
          href={homeHref(!rainy)}
          scroll={false}
          aria-current={rainy ? "true" : undefined}
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 active:bg-sea-soft"
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

      {/* ② 지금 열린 곳 */}
      {openNow.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHead title={t(lang, "homeOpenNowTitle")} more={{ href: `/${lang}/places${placesQueryString({ openNow: true })}`, label: t(lang, "homeSeeAll") }} />
          <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {openNow.map((p) => (
              <li key={p.id} className="w-56 shrink-0">
                <OpenCard place={p} lang={lang} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ③ 이번 주 놀거리 */}
      {thisWeek.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHead title={t(lang, "homeThisWeekTitle")} more={{ href: playHref, label: t(lang, "homeSeeMore") }} />
          <ul className="flex flex-col gap-3">
            {thisWeek.map((a) => (
              <li key={a.id}>
                <ActivityCard activity={a} lang={lang} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ④ 분류 바로가기 */}
      {shortcuts.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHead title={t(lang, "homeBrowseTitle")} />
          <ul aria-label={t(lang, "homeBrowseTitle")} className="grid grid-cols-4 gap-2">
            {shortcuts.map((s) => (
              <li key={s.key}>
                <Link
                  href={s.href}
                  className="flex h-full min-h-20 flex-col items-center justify-start gap-1.5 rounded-2xl border border-line bg-surface px-1 py-3 text-center text-xs font-medium leading-tight text-ink active:bg-sea-soft"
                >
                  {s.kind === "place" ? (
                    <IconPin className="h-6 w-6 text-sea" />
                  ) : (
                    <IconWave className="h-6 w-6 text-pine" />
                  )}
                  <span className="break-keep">{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ⑤ 새 이야기 */}
      {newStories.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHead title={t(lang, "homeNewStoriesTitle")} more={{ href: `/${lang}/stories`, label: t(lang, "homeSeeAll") }} />
          <ul className="flex flex-col gap-3">
            {newStories.map((s) => (
              <li key={s.id}>
                <StoryCard story={s} lang={lang} size="lg" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ⑥ 만든 사람들 */}
      {makers > 0 ? (
        <Link
          href={`/${lang}/makers`}
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 active:bg-sea-soft"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-soft text-pine">
            <IconUser className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold leading-snug">
              {tf(lang, makers === 1 ? "homeMakersBandOne" : "homeMakersBand", { n: String(makers) })}
            </span>
            <span className="block text-sm text-muted">{t(lang, "homeMakers")}</span>
          </span>
          <span aria-hidden="true" className="text-muted">
            ›
          </span>
        </Link>
      ) : null}
    </div>
  );
}

function SectionHead({ title, more }: { title: string; more?: { href: string; label: string } }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {more ? (
        <Link href={more.href} className="inline-flex min-h-11 items-center text-sm font-medium text-sea">
          {more.label}
        </Link>
      ) : null}
    </div>
  );
}

/** 「지금 열린 곳」 가로 카드 — 이름·분류·가격·영업 중 */
function OpenCard({ place, lang }: { place: Place; lang: Lang }) {
  const name = pickText(place as unknown as Record<string, unknown>, "name", lang);
  const categoryKey = CATEGORY_KEY[place.category];
  return (
    <Link
      href={`/${lang}/place/${place.slug}`}
      className="flex h-full min-h-28 flex-col gap-1 rounded-2xl border border-line bg-surface p-4 active:bg-sea-soft"
    >
      <span className="line-clamp-2 font-bold leading-snug">
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
      <span className="mt-auto flex flex-wrap gap-1.5 pt-1">
        <Badge tone="open">{t(lang, "openNow")}</Badge>
        {place.has_english_menu ? <Badge tone="info">{t(lang, "badgeEnglishMenu")}</Badge> : null}
      </span>
    </Link>
  );
}
