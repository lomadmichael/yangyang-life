import Link from "next/link";
import { pickText, t, tf, type Lang } from "@/i18n";
import { formatVerifiedDate, photoUrl } from "@/lib/format";
import { STORY_TAG_KEY, STORY_TYPE_KEY } from "@/lib/labels";
import type { Story, StoryType } from "@/lib/types";
import { Badge } from "./Badge";
import { FallbackNote } from "./FallbackNote";
import { IconBook } from "./icons";
import { SafeImage } from "./SafeImage";
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

/**
 * 사진 틀 — 바탕(sea-soft)에 아이콘을 깔고 그 위에 사진을 얹는다.
 * 사진을 못 불러오면 SafeImage 가 사라지고 아이콘 바탕만 남아 자리가 무너지지 않는다.
 */
export function PhotoFrame({ src, alt, className }: { src: string; alt: string; className: string }) {
  return (
    <div className={`relative overflow-hidden bg-sea-soft ${className}`}>
      <span className="absolute inset-0 flex items-center justify-center text-sea" aria-hidden="true">
        <IconBook className="h-8 w-8 opacity-60" />
      </span>
      <SafeImage src={photoUrl(src)} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}

/**
 * 이야기 한 칸. lg = 목록(대표 사진 16:9 · 요약 · 태그), sm = 다른 화면에 곁들이는 작은 카드(사진 없음).
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

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      {lg && story.cover_photo ? (
        // 사진도 같은 곳으로 가는 링크 — 키보드·낭독기에는 아래 제목 링크 하나만 보인다
        <Link href={href} tabIndex={-1} aria-hidden="true" className="block">
          <PhotoFrame src={story.cover_photo} alt="" className="aspect-video w-full" />
        </Link>
      ) : null}
      <div className="relative">
        <Link href={href} className={`block active:bg-sea-soft ${lg ? "p-4 pr-14" : "px-4 py-3 pr-14"}`}>
          <StoryTypeBadge type={story.type} lang={lang} />
          <h3 className={`mt-2 font-bold leading-snug ${lg ? "text-lg" : ""}`}>
            {title.text}
            <FallbackNote lang={lang} show={title.fallback} />
          </h3>
          {lg && summary.text ? (
            <p className="mt-1 text-sm text-ink">
              {summary.text}
              <FallbackNote lang={lang} show={summary.fallback} />
            </p>
          ) : null}
          {byline ? <p className="mt-1 text-sm text-muted">{byline}</p> : null}
          {lg && tags.length > 0 ? <p className="text-sm text-muted">{tags.join(" · ")}</p> : null}
        </Link>
        <div className="absolute right-1.5 top-1.5">
          <SaveButton kind="story" id={story.id} lang={lang} />
        </div>
      </div>
    </div>
  );
}
