import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { CategoryTabs } from "@/components/CategoryTabs";
import { FallbackNote } from "@/components/FallbackNote";
import { FilterChips, type Chip } from "@/components/FilterChips";
import { SafeImage } from "@/components/SafeImage";
import { SaveButton } from "@/components/SaveButton";
import { StoryPhoto } from "@/components/StoryPhoto";
import { storyAuthor, storyDateLine } from "@/components/StoryCard";
import { isLang, pickText, t, tf, type Lang } from "@/i18n";
import { photoUrl } from "@/lib/format";
import { STORY_TAGS, STORY_TAG_KEY, STORY_TYPES, STORY_TYPE_KEY } from "@/lib/labels";
import { parseStoriesQuery, storiesQueryString, type StoriesFilter } from "@/lib/list-query";
import { visibleCategories } from "@/lib/places-filter";
import { listStories } from "@/lib/queries";
import type { Story, StoryType } from "@/lib/types";

const Arrow = () => (
  <svg viewBox="0 0 20 12" aria-hidden="true">
    <path d="M0 6h18M13 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const typeLabel = (lang: Lang, s: Story) => (STORY_TYPE_KEY[s.type] ? t(lang, STORY_TYPE_KEY[s.type]) : s.type);

// 이야기 목록 (v4 「바다 잡지」 04 꼭지 — 잡지 목차처럼) —
// 꼭지 머리 · 갈래 탭(코스·사람·가이드) + 추천 태그 칩(주소 쿼리) · 맨 앞 1편을 크게(특집) · 나머지는 격자.
// 0편이면 「다음 호 예고」 빈 지면. 표지 사진이 없는 작은 칸은 갈래색 색면 + 큰 제목(같은 대표 사진이 반복되지 않게).
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
  // 탭 옆 개수 — 갈래 안의 전체 이야기 수(태그·글쓴이 조건과 무관)
  const countFor = (k?: StoryType) => (k ? all.filter((s) => s.type === k).length : all.length);
  const usedTags = new Set(all.flatMap((s) => s.tags ?? []));
  const tagChips: Chip[] = STORY_TAGS.filter((k) => usedTags.has(k) || f.tag === k).map((k) => ({
    label: t(lang, STORY_TAG_KEY[k]),
    href: href({ ...f, tag: f.tag === k ? undefined : k }),
    active: f.tag === k,
  }));
  const [lead, ...others] = stories;

  return (
    <div className="mz-stories">
      <section className="sec page-head">
        <div className="wrap">
          <header className="sec-head">
            <span className="sec-no">04</span>
            <div>
              <span className="label">{t(lang, "secStoriesKicker")}</span>
              <h1>{t(lang, "secStoriesTitle")}</h1>
            </div>
            <p>
              {authorName ? <b className="by-author">{tf(lang, "storiesByAuthor", { name: authorName })}</b> : null}
              {t(lang, "storiesLead")}
            </p>
          </header>
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
              <div className="pl-bar">
                {tagChips.length > 0 ? <FilterChips label={t(lang, "storyTagLabel")} chips={tagChips} /> : <span />}
                <p className="pl-count">
                  <span>
                    <b>{stories.length}</b>
                    {t(lang, stories.length === 1 ? "storiesCountUnitOne" : "storiesCountUnit")}
                  </span>
                  {f.type || f.tag || f.author ? (
                    <Link href={base} scroll={false}>
                      {t(lang, "filterReset")}
                    </Link>
                  ) : null}
                </p>
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="sec page-body">
        <div className="wrap">
          {all.length === 0 ? (
            <NextIssue lang={lang} />
          ) : stories.length === 0 ? (
            <div className="pl-empty">
              <span className="label">{t(lang, "placesEmptyKicker")}</span>
              <h2>{t(lang, "emptyStoriesTitle")}</h2>
              <p>{t(lang, "emptyStoriesBody")}</p>
              <div className="acts">
                <Link className="btn-line" href={base} scroll={false}>
                  {t(lang, "filterReset")}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <Lead story={lead} lang={lang} />
              {others.length ? (
                <ul className="stories st-list">
                  {others.map((s) => (
                    <Card key={s.id} story={s} lang={lang} />
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/** 특집 — 가장 앞(최근) 1편을 크게. 표지 사진이 없으면 갈래 대표 사진(+ 표기) */
function Lead({ story, lang }: { story: Story; lang: Lang }) {
  const row = story as unknown as Record<string, unknown>;
  const title = pickText(row, "title", lang);
  const summary = pickText(row, "summary", lang);
  const author = storyAuthor(story);
  const dateLine = storyDateLine(story, lang, true);
  const href = `/${lang}/stories/${story.slug}`;
  return (
    <article className="feature st-lead">
      <Link className="ph" href={href} tabIndex={-1} aria-hidden="true">
        <StoryPhoto story={story} lang={lang} sizes="(min-width: 861px) 58vw, 100vw" />
      </Link>
      <div className="tx">
        <span className="label">
          {t(lang, "storiesFeatureKicker")} · {typeLabel(lang, story)}
        </span>
        <h2>
          <Link href={href}>
            {title.text}
            <FallbackNote lang={lang} show={title.fallback} />
          </Link>
        </h2>
        {summary.text ? (
          <p className="dek">
            {summary.text}
            <FallbackNote lang={lang} show={summary.fallback} />
          </p>
        ) : null}
        <div className="by">
          <span>
            {author ? <b>{tf(lang, "storyByline", { name: author })}</b> : null}
            {dateLine ? <span className="block">{dateLine}</span> : null}
          </span>
          <span className="flex items-center gap-3">
            <SaveButton kind="story" id={story.id} lang={lang} />
            <Link className="more" href={href}>
              {t(lang, "storyRead")}
              <Arrow />
            </Link>
          </span>
        </div>
      </div>
    </article>
  );
}

/** 격자 한 칸 — 표지 사진, 없으면 갈래색 색면 위에 큰 제목 */
function Card({ story, lang }: { story: Story; lang: Lang }) {
  const row = story as unknown as Record<string, unknown>;
  const title = pickText(row, "title", lang);
  const summary = pickText(row, "summary", lang);
  const author = storyAuthor(story);
  const dateLine = storyDateLine(story, lang, true);
  const href = `/${lang}/stories/${story.slug}`;
  return (
    <li className="st-card">
      <Link className="story" href={href}>
        <div className="ph">
          <span className={`noimg story-${story.type}`}>
            <span className="top-l" aria-hidden="true">
              <span>{typeLabel(lang, story)}</span>
            </span>
            <span className="glyph" aria-hidden="true">
              {title.text.charAt(0)}
            </span>
            {story.cover_photo ? null : <span className="nm">{title.text}</span>}
          </span>
          {story.cover_photo ? (
            <SafeImage src={photoUrl(story.cover_photo)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
        </div>
        <span className="label">{[typeLabel(lang, story), dateLine].filter(Boolean).join(" · ")}</span>
        {story.cover_photo ? (
          <h3>
            {title.text}
            <FallbackNote lang={lang} show={title.fallback} />
          </h3>
        ) : (
          <FallbackNote lang={lang} show={title.fallback} />
        )}
        {summary.text ? <p>{summary.text}</p> : null}
        {author ? <span className="st-byline">{tf(lang, "storyByline", { name: author })}</span> : null}
      </Link>
      <span className="st-save">
        <SaveButton kind="story" id={story.id} lang={lang} />
      </span>
    </li>
  );
}

/** 이야기 0편 — 잡지 「다음 호 예고」 빈 지면 (홈 이야기 단락의 빈 지면과 같은 모양) */
function NextIssue({ lang }: { lang: Lang }) {
  return (
    <article className="feature is-empty">
      <div className="ph">
        <div className="noimg" aria-hidden="true">
          <span className="glyph">{lang === "ko" ? "이" : "S"}</span>
          <span className="it">{t(lang, "coverIssueSeason")}</span>
        </div>
      </div>
      <div className="tx">
        <span className="label">{t(lang, "storiesEmptyKicker")}</span>
        <h2>{t(lang, "storiesEmptyTitle")}</h2>
        <p className="dek">{t(lang, "storiesEmptyBody")}</p>
        <div className="by">
          <span>{t(lang, "storiesEmptyNote")}</span>
          <Link className="more" href={`/${lang}/makers`}>
            {t(lang, "makersSeeAll")}
            <Arrow />
          </Link>
        </div>
      </div>
    </article>
  );
}
