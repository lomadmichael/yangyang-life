import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { FallbackNote } from "@/components/FallbackNote";
import { IconAlert } from "@/components/icons";
import { SaveAllButton, SaveButton } from "@/components/SaveButton";
import { StoryBody } from "@/components/StoryBody";
import { FALLBACK_VISUAL, STORY_VISUAL } from "@/components/category-visual";
import { PhotoFrame, storyAuthor, storyDateLine, StoryTypeBadge } from "@/components/StoryCard";
import { TipList } from "@/components/TipList";
import { isLang, pickText, t, tf, type Lang } from "@/i18n";
import { STORY_TAG_KEY } from "@/lib/labels";
import { getStoryBySlug, listActivitiesByIds, listPlacesByIds } from "@/lib/queries";
import { GUIDE_STALE_DAYS, isStale } from "@/lib/stale";
import { resolveStops, savablePlaceIds, stopTargets, stopView, type ResolvedStop } from "@/lib/story-blocks";

/** PC 옆 카드의 들른 곳 한 줄 — 지금의 장소·놀거리 이름(사라진 곳은 안내 문구) */
function stopLine(s: ResolvedStop, lang: Lang, now: Date): { label: string; href: string | null } {
  const view = stopView(s, now);
  if (s.place) return { label: pickText(s.place as unknown as Record<string, unknown>, "name", lang).text, href: view.href };
  if (s.activity) return { label: pickText(s.activity as unknown as Record<string, unknown>, "title", lang).text, href: view.href };
  return { label: t(lang, "stopMissingNote"), href: null };
}

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
  const coverFallback = STORY_VISUAL[story.type] ?? FALLBACK_VISUAL;

  const coverCls = "-mx-4 aspect-video lg:mx-0 lg:aspect-[5/2] lg:rounded-2xl";
  const byline = author || dateLine ? (
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
  ) : null;
  const saveAll =
    saveIds.length > 0 ? (
      <SaveAllButton
        placeIds={saveIds}
        lang={lang}
        label={t(lang, story.type === "course" ? "saveAllCourse" : "saveAllStory")}
      />
    ) : null;

  return (
    <article className="flex flex-col gap-5 px-4 pb-10 lg:gap-8 lg:px-8 lg:pb-16 lg:pt-6">
      {stale ? (
        <div role="note" className="-mx-4 flex gap-3 bg-salmon-soft px-4 py-3 text-ink lg:mx-0 lg:rounded-2xl lg:px-6 lg:py-4">
          <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-salmon-strong" />
          <p className="text-sm lg:text-base">
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
        <PhotoFrame
          src={story.cover_photo}
          fallback={coverFallback.photo}
          fallbackLabel={t(lang, "categoryPhotoLabel")}
          alt={title.text}
          className={coverCls}
        />
      ) : coverFallback.photo ? (
        // 표지가 없으면 갈래 대표 사진 — 이 이야기의 사진이 아니므로 구석에 표시
        <PhotoFrame
          fallback={coverFallback.photo}
          fallbackLabel={t(lang, "categoryPhotoLabel")}
          alt=""
          Icon={coverFallback.Icon}
          tone={coverFallback.tone}
          sizes="(min-width: 1024px) 1152px, 100vw"
          className={coverCls}
        />
      ) : null}

      {/* 모바일은 한 줄. PC(lg)는 왼쪽 2칸 본문(읽기 폭) + 오른쪽 1칸 글쓴이·들른 곳 요약(PC 전용 — 모바일은 본문에 다 있다) */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:items-start lg:gap-x-12">
        <div className="flex flex-col gap-5 lg:col-span-2 lg:gap-8">
          <header className="flex flex-col gap-2 lg:gap-3">
            <span>
              <StoryTypeBadge type={story.type} lang={lang} />
            </span>
            <h1 className="text-2xl font-bold leading-snug lg:text-4xl">
              {title.text}
              <FallbackNote lang={lang} show={title.fallback} />
            </h1>
            {summary.text ? (
              <p className="lg:text-lg">
                {summary.text}
                <FallbackNote lang={lang} show={summary.fallback} />
              </p>
            ) : null}
            {byline ? <div className="lg:hidden">{byline}</div> : null}
            {tags.length > 0 ? <p className="text-sm text-muted">{tags.join(" · ")}</p> : null}
          </header>

          <StoryBody blocks={blocks} resolved={resolved} lang={lang} numbered={!guide} now={now} />

          {saveAll ? <div className="lg:hidden">{saveAll}</div> : null}

          {author || dateLine ? (
            <p className="text-sm text-muted">
              {[author ? tf(lang, "storyByline", { name: author }) : "", dateLine].filter(Boolean).join(" · ")}
            </p>
          ) : null}

          {/* 팁: 「바뀌었어요·꿀팁·가는 법」 목록 + 쓰기 폼 (<section id="tips">) */}
          <TipList lang={lang} targetType="story" targetId={story.id} />
        </div>

        <aside
          aria-label={t(lang, "storyStops")}
          className="hidden lg:sticky lg:top-24 lg:col-start-3 lg:row-start-1 lg:flex lg:flex-col lg:gap-5 lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-6"
        >
          {byline}
          {resolved.length > 0 ? (
            <section className={`flex flex-col gap-3 ${byline ? "border-t border-line pt-5" : ""}`}>
              <h2 className="text-lg font-bold">{t(lang, "storyStops")}</h2>
              <ol className="flex flex-col">
                {resolved.map((s) => {
                  const line = stopLine(s, lang, now);
                  const num = (
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        s.state === "missing" ? "bg-line text-muted" : "bg-sea text-on-sea"
                      }`}
                    >
                      {s.n}
                    </span>
                  );
                  return (
                    <li key={`${s.n}`} className={s.state === "closed" ? "opacity-60" : ""}>
                      {line.href ? (
                        <Link
                          href={`/${lang}${line.href}`}
                          className="flex min-h-11 items-center gap-3 rounded-lg text-ink hover:text-sea"
                        >
                          {guide ? null : num}
                          <span className="min-w-0 font-medium">{line.label}</span>
                        </Link>
                      ) : (
                        <span className="flex min-h-11 items-center gap-3 text-muted">
                          {guide ? null : num}
                          <span className="min-w-0 text-sm">{line.label}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}
          {saveAll}
        </aside>
      </div>
    </article>
  );
}
