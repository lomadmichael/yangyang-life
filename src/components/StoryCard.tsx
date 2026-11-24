import { t, tf, type Lang } from "@/i18n";
import { formatVerifiedDate } from "@/lib/format";
import { STORY_TYPE_KEY } from "@/lib/labels";
import type { Story, StoryType } from "@/lib/types";
import { Badge } from "./Badge";
import { PhotoFrame } from "./PhotoCard";

// 이야기 표시 도우미 — 갈래 배지(관리 미리보기)·글쓴이 줄·날짜 줄. 목록 카드는 v4 에서 각 화면(이야기 목록·홈)이 잡지 지면으로 직접 그린다.

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

/** 사진 틀은 PhotoCard.tsx 에 있다 — 기존 import(`@/components/StoryCard`, 관리 이야기 편집기)를 위해 다시 내보낸다 */
export { PhotoFrame };
