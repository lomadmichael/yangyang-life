import Link from "next/link";
import { pickText, t, tf, type Lang } from "@/i18n";
import { formatVerifiedDate } from "@/lib/format";
import { STORY_TAG_KEY, STORY_TYPE_KEY } from "@/lib/labels";
import type { Story, StoryType } from "@/lib/types";
import { Badge } from "./Badge";
import { FALLBACK_VISUAL, STORY_VISUAL } from "./category-visual";
import { FallbackNote } from "./FallbackNote";
import { PhotoCard, PhotoFrame } from "./PhotoCard";
import { SaveButton } from "./SaveButton";

/** 이야기 갈래 배지 색 (디자인 인계 2-5: 코스 salmon · 사람 pine · 가이드 sea) */
export const STORY_TONE: Record<StoryType, "partner" | "open" | "info"> = { course: "partner", people: "open", guide: "info" };

export function StoryTypeBadge({ type, lang }: { type: StoryType; lang: Lang }) {
  return <Badge tone={STORY_TONE[type] ?? "muted"}>{STORY_TYPE_KEY[type] ? t(lang, STORY_TYPE_KEY[type]) : type}</Badge>;
}

/** 「글: 이름 · 팀」 — 글쓴이가 없으면 "" */
export function storyAuthor(story: Pick<Story, "author_name" | "author_team">): string {
  return [story.author_name, story.author_team].filter(Boolean).join(" · ");
}

/** 가이드는 「마지막 확인」 날짜(verified_at, 없으면 공개일), 코스·사람은 「다녀온 날」 */
export function storyDateLine(story: Story, lang: Lang, short = false): string {
  if (story.type === "guide") {
    const date = formatVerifiedDate(story.verified_at ?? story.published_at, lang);
    return date ? tf(lang, short ? "storyCheckedShort" : "guideLastChecked", { date }) : "";
  }
  const date = formatVerifiedDate(story.visited_on, lang);
  return date ? tf(lang, "storyVisitedOn", { date }) : "";
}

/** 사진 틀은 PhotoCard.tsx 로 옮겼다 — 기존 import(`@/components/StoryCard`)를 위해 다시 내보낸다 */
export { PhotoFrame };

/**
 * 이야기 한 칸. lg = 목록(대표 사진 16:9 · 요약 · 태그), sm = 다른 화면에 곁들이는 작은 카드(사진 없음).
 * 목록(lg)은 PC 격자(lg 이상이면서 카드 폭 36rem 미만)에서 격자 카드로 바뀐다 — 사진(없으면 갈래 아이콘 바탕) 위에 갈래·제목을 겹쳐 쓴다.
 * ★ 저장 버튼은 링크 밖(오른쪽 위)에 둔다 — 링크 안에 버튼을 넣을 수 없다.
 */
export function StoryCard({ story, lang, size = "lg" }: { story: Story; lang: Lang; size?: "lg" | "sm" }) {
  const row = story as unknown as Record<string, unknown>;
  const title = pickText(row, "title", lang);
  const summary = pickText(row, "summary", lang);
  const author = storyAuthor(story);
  const dateLine = storyDateLine(story, lang, true);
  const byline = [author ? tf(lang, "storyByline", { name: author }) : "", dateLine].filter(Boolean).join(" · ");
  const tags = (story.tags ?? []).filter((k) => STORY_TAG_KEY[k]).map((k) => t(lang, STORY_TAG_KEY[k]));
  const href = `/${lang}/stories/${story.slug}`;
  const lg = size === "lg";
  const visual = STORY_VISUAL[story.type] ?? FALLBACK_VISUAL;
  const titleNode = (
    <>
      {title.text}
      <FallbackNote lang={lang} show={title.fallback} />
    </>
  );

  return (
    <div className="@container flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      {lg && story.cover_photo ? (
        // 모바일: 사진도 같은 곳으로 가는 링크 — 키보드·낭독기에는 아래 제목 링크 하나만 보인다
        <Link href={href} tabIndex={-1} aria-hidden="true" className="block lg:hidden @xl:block">
          <PhotoFrame src={story.cover_photo} alt="" className="aspect-video w-full" />
        </Link>
      ) : null}
      {/* 별은 이 칸 오른쪽 위 — 모바일은 사진 아래 글 칸, PC 는 사진 칸 위 */}
      <div className="relative flex-1">
        <Link href={href} className={`block h-full active:bg-sea-soft ${lg ? "" : "px-4 py-3 pr-14"}`}>
          {lg ? (
            <div className="hidden lg:block @xl:hidden">
              <PhotoCard
                photo={story.cover_photo}
                Icon={visual.Icon}
                tone={visual.tone}
                eyebrow={STORY_TYPE_KEY[story.type] ? t(lang, STORY_TYPE_KEY[story.type]) : story.type}
                title={titleNode}
              />
            </div>
          ) : null}
          <div className={lg ? "p-4 pr-14 lg:pr-4 @xl:pr-14" : ""}>
            <span className={lg ? "lg:hidden @xl:inline" : ""}>
              <StoryTypeBadge type={story.type} lang={lang} />
            </span>
            <h3 className={`mt-2 font-bold leading-snug ${lg ? "text-lg lg:hidden @xl:block" : ""}`}>{titleNode}</h3>
            {lg && summary.text ? (
              <p className="mt-1 text-sm text-ink lg:mt-0 lg:line-clamp-3 lg:text-base @xl:mt-1 @xl:line-clamp-none">
                {summary.text}
                <FallbackNote lang={lang} show={summary.fallback} />
              </p>
            ) : null}
            {byline ? <p className="mt-1 text-sm text-muted">{byline}</p> : null}
            {lg && tags.length > 0 ? <p className="text-sm text-muted">{tags.join(" · ")}</p> : null}
          </div>
        </Link>
        <div className="absolute right-1.5 top-1.5 rounded-full bg-surface/90">
          <SaveButton kind="story" id={story.id} lang={lang} />
        </div>
      </div>
    </div>
  );
}
