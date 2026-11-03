import { connection } from "next/server";
import { notFound } from "next/navigation";
import { CategoryTabs } from "@/components/CategoryTabs";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips, type Chip } from "@/components/FilterChips";
import { StoryCard } from "@/components/StoryCard";
import { isLang, t } from "@/i18n";
import { STORY_TAGS, STORY_TAG_KEY, STORY_TYPES, STORY_TYPE_KEY } from "@/lib/labels";
import { parseStoriesQuery, storiesQueryString, type StoriesFilter } from "@/lib/list-query";
import { visibleCategories } from "@/lib/places-filter";
import { listStories } from "@/lib/queries";

export default async function StoriesPage({ params, searchParams }: PageProps<"/[lang]/stories">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  await connection();

  const f = parseStoriesQuery(await searchParams);
  // 한 번만 읽고 탭·칩·목록을 모두 여기서 거른다 (이야기 수가 많지 않다)
  const all = await listStories();
  const stories = all.filter((s) => (!f.type || s.type === f.type) && (!f.tag || (s.tags ?? []).includes(f.tag)));

  const base = `/${lang}/stories`;
  const href = (next: StoriesFilter) => `${base}${storiesQueryString(next)}`;

  // 탭: 이야기가 1편 이상인 갈래만(R18). 칩: 이야기에 실제로 붙은 태그만 + 지금 고른 태그
  const types = visibleCategories(
    STORY_TYPES,
    all.map((s) => ({ category: s.type })),
  );
  const usedTags = new Set(all.flatMap((s) => s.tags ?? []));
  const tagChips: Chip[] = STORY_TAGS.filter((k) => usedTags.has(k) || f.tag === k).map((k) => ({
    label: t(lang, STORY_TAG_KEY[k]),
    href: href({ ...f, tag: f.tag === k ? undefined : k }),
    active: f.tag === k,
  }));

  return (
    <div className="flex flex-col gap-4 px-4 pb-10">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">{t(lang, "storiesTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t(lang, "storiesLead")}</p>
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
        <ul className="flex flex-col gap-4">
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
