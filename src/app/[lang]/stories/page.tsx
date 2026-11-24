import { connection } from "next/server";
import { notFound } from "next/navigation";
import { CategoryTabs } from "@/components/CategoryTabs";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips, type Chip } from "@/components/FilterChips";
import { StoryCard } from "@/components/StoryCard";
import { isLang, t, tf } from "@/i18n";
import { STORY_TAGS, STORY_TAG_KEY, STORY_TYPES, STORY_TYPE_KEY } from "@/lib/labels";
import { parseStoriesQuery, storiesQueryString, type StoriesFilter } from "@/lib/list-query";
import { visibleCategories } from "@/lib/places-filter";
import { listStories } from "@/lib/queries";
import type { StoryType } from "@/lib/types";

export default async function StoriesPage({ params, searchParams }: PageProps<"/[lang]/stories">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  await connection();

  const f = parseStoriesQuery(await searchParams);
  // 한 번만 읽고 탭·칩·목록을 모두 여기서 거른다 (이야기 수가 많지 않다)
  const all = await listStories();
  const stories = all.filter(
    (s) =>
      (!f.type || s.type === f.type) && (!f.tag || (s.tags ?? []).includes(f.tag)) && (!f.author || s.author_id === f.author),
  );

  const authorName = f.author ? stories.find((s) => s.author_name)?.author_name : null;

  const base = `/${lang}/stories`;
  const href = (next: StoriesFilter) => `${base}${storiesQueryString(next)}`;

  // 탭: 이야기가 1편 이상인 갈래만(R18). 칩: 이야기에 실제로 붙은 태그만 + 지금 고른 태그
  const types = visibleCategories(
    STORY_TYPES,
    all.map((s) => ({ category: s.type })),
  );
  // 탭 옆 개수(PC) — 갈래 안의 전체 이야기 수(태그·글쓴이 조건과 무관)
  const countFor = (k?: StoryType) => (k ? all.filter((s) => s.type === k).length : all.length);
  const usedTags = new Set(all.flatMap((s) => s.tags ?? []));
  const tagChips: Chip[] = STORY_TAGS.filter((k) => usedTags.has(k) || f.tag === k).map((k) => ({
    label: t(lang, STORY_TAG_KEY[k]),
    href: href({ ...f, tag: f.tag === k ? undefined : k }),
    active: f.tag === k,
  }));

  return (
    <div className="flex flex-col gap-4 px-4 pb-10 lg:gap-6 lg:px-8 lg:pb-16">
      <div className="pt-2 lg:pt-10">
        <h1 className="text-2xl font-bold lg:text-4xl">{t(lang, "storiesTitle")}</h1>
        <p className="mt-1 text-sm text-muted lg:mt-3 lg:text-lg lg:text-ink">{t(lang, "storiesLead")}</p>
        {authorName ? (
          <p className="mt-1 text-sm font-medium text-pine lg:text-base">{tf(lang, "storiesByAuthor", { name: authorName })}</p>
        ) : null}
      </div>
      {all.length > 0 ? (
        <>
          <CategoryTabs
            items={types}
            current={f.type}
            hrefFor={(type) => href({ ...f, type })}
            labelFor={(k) => t(lang, STORY_TYPE_KEY[k])}
            allLabel={t(lang, "filterAll")}
            label={t(lang, "storyTypeLabel")}
            countFor={countFor}
          />
          {tagChips.length > 0 ? <FilterChips label={t(lang, "storyTagLabel")} chips={tagChips} /> : null}
        </>
      ) : null}

      {all.length === 0 ? (
        <EmptyState title={t(lang, "emptyStoriesNoneTitle")} body={t(lang, "emptyStoriesNoneBody")} />
      ) : stories.length === 0 ? (
        <EmptyState
          title={t(lang, "emptyStoriesTitle")}
          body={t(lang, "emptyStoriesBody")}
          action={{ href: base, label: t(lang, "filterReset") }}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          {stories.map((s) => (
            <li key={s.id}>
              <StoryCard story={s} lang={lang} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
