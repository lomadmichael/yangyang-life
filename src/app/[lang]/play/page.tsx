import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ActivityCard } from "@/components/ActivityCard";
import { Badge } from "@/components/Badge";
import { CategoryTabs } from "@/components/CategoryTabs";
import { EmptyState } from "@/components/EmptyState";
import { FallbackNote } from "@/components/FallbackNote";
import { FilterChips } from "@/components/FilterChips";
import { SaveButton } from "@/components/SaveButton";
import { isLang, pickText, t, tf, type Lang } from "@/i18n";
import { formatToday } from "@/lib/format";
import { PLAY_CATEGORIES, PLAY_CATEGORY_KEY } from "@/lib/labels";
import { parsePlayQuery, playQueryString } from "@/lib/list-query";
import { visibleCategories } from "@/lib/places-filter";
import { groupPlay } from "@/lib/play";
import { getGuide, listActivities } from "@/lib/queries";
import { activitiesForDay } from "@/lib/today";
import type { Activity, PlayCategory, Story } from "@/lib/types";

type PlayFilter = { category?: PlayCategory; rainy?: boolean };

export default async function PlayPage({ params, searchParams }: PageProps<"/[lang]/play">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  await connection(); // 「오늘」은 요청 시각 기준

  const f = parsePlayQuery(await searchParams);
  const now = new Date();
  const all = await listActivities();
  // 탭은 오늘 볼 수 있는 놀거리(비시즌 포함)가 1개 이상인 분류만
  const tabs = visibleCategories(PLAY_CATEGORIES, activitiesForDay(all, now, {}));
  const { dated, always, offSeason } = groupPlay(all, now, f);
  const total = dated.length + always.length + offSeason.length;

  // 가이드는 곁들이 — 못 불러오면 카드만 숨기고 목록은 그대로 보여 준다
  let guide: Story | null = null;
  if (f.category) {
    try {
      guide = await getGuide(f.category);
    } catch {
      guide = null;
    }
  }

  const base = `/${lang}/play`;
  const href = (next: PlayFilter) => `${base}${playQueryString(next)}`;

  return (
    <div className="flex flex-col gap-4 px-4 pb-10">
      <div className="pt-2">
        <p className="text-sm text-muted">{tf(lang, "playTodayLine", { date: formatToday(now, lang) })}</p>
        <h1 className="text-2xl font-bold">{t(lang, "playTitle")}</h1>
      </div>
      <CategoryTabs
        items={tabs}
        current={f.category}
        hrefFor={(c) => href({ ...f, category: c })}
        labelFor={(c) => t(lang, PLAY_CATEGORY_KEY[c])}
        allLabel={t(lang, "filterAll")}
        label={t(lang, "categoryLabel")}
      />
      <FilterChips
        label={t(lang, "filterLabel")}
        chips={[{ label: t(lang, "rainyToggle"), href: href({ ...f, rainy: !f.rainy }), active: !!f.rainy }]}
      />

      {guide ? <GuideCard story={guide} lang={lang} /> : null}

      {total === 0 ? (
        f.rainy ? (
          <EmptyState
            title={t(lang, "emptyRainyTitle")}
            body={t(lang, "emptyRainyBody")}
            action={{ href: href({ category: f.category }), label: t(lang, "filterReset") }}
          />
        ) : (
          <EmptyState
            title={t(lang, "emptyActivitiesTitle")}
            body={t(lang, "emptyActivitiesBody")}
            action={{ href: `/${lang}/places`, label: t(lang, "homeWhereToEat") }}
          />
        )
      ) : (
        <>
          <Group title={t(lang, "kindDated")} list={dated} lang={lang} />
          <Group title={t(lang, "kindAlways")} list={always} lang={lang} />
          {offSeason.length > 0 ? (
            <details className="group rounded-2xl border border-line bg-surface">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <span className="font-bold text-muted">{t(lang, "offSeasonTitle")}</span>
                <span className="text-sm text-muted">
                  {tf(lang, "offSeasonCount", { n: String(offSeason.length) })}
                  <span aria-hidden className="ml-2 inline-block group-open:rotate-180">
                    ▾
                  </span>
                </span>
              </summary>
              <ul className="flex flex-col gap-3 px-3 pb-3">
                {offSeason.map((a) => (
                  <li key={a.id}>
                    <ActivityCard activity={a} lang={lang} dimmed />
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </div>
  );
}

function Group({ title, list, lang }: { title: string; list: Activity[]; lang: Lang }) {
  if (list.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold text-muted">{title}</h2>
      <ul className="flex flex-col gap-3">
        {list.map((a) => (
          <li key={a.id}>
            <ActivityCard activity={a} lang={lang} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 고른 분류의 가이드 — 목록 맨 위. 이야기 화면(/stories/{slug})으로 간다 */
function GuideCard({ story, lang }: { story: Story; lang: Lang }) {
  const title = pickText(story as unknown as Record<string, unknown>, "title", lang);
  const summary = pickText(story as unknown as Record<string, unknown>, "summary", lang);
  return (
    <div className="relative rounded-2xl border border-sea bg-surface">
      <Link href={`/${lang}/stories/${story.slug}`} className="block rounded-2xl p-4 pr-14">
        <Badge tone="info">{t(lang, "storyGuide")}</Badge>
        <h2 className="mt-2 text-lg font-bold leading-snug">
          {title.text}
          <FallbackNote lang={lang} show={title.fallback} />
        </h2>
        {summary.text ? (
          <p className="mt-1 text-sm text-ink">
            {summary.text}
            <FallbackNote lang={lang} show={summary.fallback} />
          </p>
        ) : null}
        {story.author_name ? (
          <p className="mt-2 text-sm text-muted">{tf(lang, "guideBy", { name: story.author_name })}</p>
        ) : null}
      </Link>
      <div className="absolute right-1.5 top-1.5">
        <SaveButton kind="story" id={story.id} lang={lang} />
      </div>
    </div>
  );
}
