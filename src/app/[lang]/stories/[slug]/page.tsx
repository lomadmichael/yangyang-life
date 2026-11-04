import { connection } from "next/server";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { FallbackNote } from "@/components/FallbackNote";
import { IconAlert } from "@/components/icons";
import { SaveAllButton, SaveButton } from "@/components/SaveButton";
import { StoryBody } from "@/components/StoryBody";
import { PhotoFrame, storyAuthor, storyDateLine, StoryTypeBadge } from "@/components/StoryCard";
import { TipList } from "@/components/TipList";
import { isLang, pickText, t, tf } from "@/i18n";
import { STORY_TAG_KEY } from "@/lib/labels";
import { getStoryBySlug, listActivitiesByIds, listPlacesByIds } from "@/lib/queries";
import { GUIDE_STALE_DAYS, isStale } from "@/lib/stale";
import { resolveStops, savablePlaceIds, stopTargets } from "@/lib/story-blocks";

export default async function StoryPage({ params }: PageProps<"/[lang]/stories/[slug]">) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  await connection(); // 들른 곳의 영업 여부는 요청 시각 기준

  const story = await getStoryBySlug(slug);
  if (!story) notFound();

  // 들른 곳은 id 만 저장돼 있다 → 지금의 장소·놀거리 값을 불러와 그린다(R20). 공개 뷰에 없으면 missing 카드
  const blocks = Array.isArray(story.blocks) ? story.blocks : [];
  const { placeIds, activityIds } = stopTargets(blocks);
  const [places, activities] = await Promise.all([listPlacesByIds(placeIds), listActivitiesByIds(activityIds)]);
  const resolved = resolveStops(
    blocks,
    new Map(places.map((p) => [p.id, p])),
    new Map(activities.map((a) => [a.id, a])),
  );

  const now = new Date();
  const guide = story.type === "guide";
  const stale = guide && isStale(story.verified_at ?? story.published_at, now, GUIDE_STALE_DAYS);
  const row = story as unknown as Record<string, unknown>;
  const title = pickText(row, "title", lang);
  const summary = pickText(row, "summary", lang);
  const author = storyAuthor(story);
  const dateLine = storyDateLine(story, lang);
  const tags = (story.tags ?? []).filter((k) => STORY_TAG_KEY[k]).map((k) => t(lang, STORY_TAG_KEY[k]));
  const saveIds = guide ? [] : savablePlaceIds(resolved);

  return (
    <article className="flex flex-col gap-5 px-4 pb-10">
      {stale ? (
        <div role="note" className="-mx-4 flex gap-3 bg-salmon-soft px-4 py-3 text-ink">
          <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-salmon-strong" />
          <p className="text-sm">
            <span className="block font-bold">{t(lang, "guideStaleTitle")}</span>
            {t(lang, "guideStaleBody")}
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <BackLink href={`/${lang}/stories`} label={t(lang, "storiesTitle")} />
        <SaveButton kind="story" id={story.id} lang={lang} size="md" />
      </div>

      {story.cover_photo ? (
        <PhotoFrame src={story.cover_photo} alt={title.text} className="-mx-4 aspect-video" />
      ) : null}

      <header className="flex flex-col gap-2">
        <span>
          <StoryTypeBadge type={story.type} lang={lang} />
        </span>
        <h1 className="text-2xl font-bold leading-snug">
          {title.text}
          <FallbackNote lang={lang} show={title.fallback} />
        </h1>
        {summary.text ? (
          <p>
            {summary.text}
            <FallbackNote lang={lang} show={summary.fallback} />
          </p>
        ) : null}
        {author || dateLine ? (
          <div className="mt-1 flex items-center gap-3">
            {story.author_name ? (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sea-soft font-bold text-sea"
              >
                {story.author_name.trim().charAt(0)}
              </span>
            ) : null}
            <div className="min-w-0 text-sm">
              {author ? <p className="font-medium">{tf(lang, "storyByline", { name: author })}</p> : null}
              {dateLine ? <p className="text-muted">{dateLine}</p> : null}
            </div>
          </div>
        ) : null}
        {tags.length > 0 ? <p className="text-sm text-muted">{tags.join(" · ")}</p> : null}
      </header>

      <StoryBody blocks={blocks} resolved={resolved} lang={lang} numbered={!guide} now={now} />

      {saveIds.length > 0 ? (
        <SaveAllButton
          placeIds={saveIds}
          lang={lang}
          label={t(lang, story.type === "course" ? "saveAllCourse" : "saveAllStory")}
        />
      ) : null}

      {author || dateLine ? (
        <p className="text-sm text-muted">
          {[author ? tf(lang, "storyByline", { name: author }) : "", dateLine].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      {/* 팁: 「바뀌었어요·꿀팁·가는 법」 목록 + 쓰기 폼 (<section id="tips">) */}
      <TipList lang={lang} targetType="story" targetId={story.id} />
    </article>
  );
}
