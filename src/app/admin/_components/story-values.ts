import type { StoryBlock, StoryStatus, StoryTag, StoryType } from "@/lib/types";
import type { AdminStory } from "../data";

// 이야기 폼 값 — "use client" 밖에 두어 서버 컴포넌트에서도 값으로 쓴다.
// 빈 칸은 빈 문자열로 들고 있다가 그대로 보낸다(서버 parseStoryInput 이 null 로 바꾸고 검사한다).

export type BlockValue =
  | { key: string; t: "text" | "heading"; ko: string; en: string }
  | { key: string; t: "photo"; url: string; caption_ko: string; caption_en: string }
  | {
      key: string;
      t: "stop";
      place_id: string;
      activity_id: string;
      time_ko: string;
      time_en: string;
      note_ko: string;
      note_en: string;
    };

export interface StoryFormValues {
  type: StoryType;
  guide_topic: string;
  slug: string;
  title_ko: string;
  title_en: string;
  summary_ko: string;
  summary_en: string;
  cover_photo: string;
  visited_on: string;
  tags: StoryTag[];
  blocks: BlockValue[];
}

let seq = 0;
/** 블록 목록의 React key (저장되지 않는다 — 서버는 모르는 칸을 버린다) */
export function blockKey(): string {
  seq += 1;
  return `b${Date.now().toString(36)}${seq}`;
}

export function emptyBlock(t: BlockValue["t"]): BlockValue {
  const key = blockKey();
  if (t === "photo") return { key, t, url: "", caption_ko: "", caption_en: "" };
  if (t === "stop") return { key, t, place_id: "", activity_id: "", time_ko: "", time_en: "", note_ko: "", note_en: "" };
  return { key, t, ko: "", en: "" };
}

export const EMPTY_STORY: StoryFormValues = {
  type: "course",
  guide_topic: "",
  slug: "",
  title_ko: "",
  title_en: "",
  summary_ko: "",
  summary_en: "",
  cover_photo: "",
  visited_on: "",
  tags: [],
  blocks: [],
};

function blockToValue(b: StoryBlock, i: number): BlockValue {
  const key = `s${i}`;
  if (b.t === "photo") return { key, t: "photo", url: b.url, caption_ko: b.caption_ko ?? "", caption_en: b.caption_en ?? "" };
  if (b.t === "stop") {
    return {
      key,
      t: "stop",
      place_id: b.place_id ?? "",
      activity_id: b.activity_id ?? "",
      time_ko: b.time_ko ?? "",
      time_en: b.time_en ?? "",
      note_ko: b.note_ko ?? "",
      note_en: b.note_en ?? "",
    };
  }
  return { key, t: b.t, ko: b.ko, en: b.en ?? "" };
}

export function storyToValues(s: AdminStory): StoryFormValues {
  return {
    type: s.type,
    guide_topic: s.guide_topic ?? "",
    slug: s.slug,
    title_ko: s.title_ko,
    title_en: s.title_en ?? "",
    summary_ko: s.summary_ko ?? "",
    summary_en: s.summary_en ?? "",
    cover_photo: s.cover_photo ?? "",
    visited_on: s.visited_on ?? "",
    tags: s.tags ?? [],
    blocks: (s.blocks ?? []).map(blockToValue),
  };
}

const n = (v: string): string | null => (v.trim() ? v.trim() : null);

/**
 * 미리보기용: 폼 값 → 공개 화면 StoryBody 가 그리는 블록. 아직 빈 블록(본문 없는 문단, 주소 없는 사진,
 * 고르지 않은 들른 곳)은 미리보기에서 건너뛴다 — 저장할 때는 서버가 다시 검사해 알려 준다.
 */
export function valuesToPreviewBlocks(blocks: BlockValue[]): StoryBlock[] {
  const out: StoryBlock[] = [];
  for (const b of blocks) {
    if (b.t === "text" || b.t === "heading") {
      if (b.ko.trim()) out.push({ t: b.t, ko: b.ko.trim(), en: n(b.en) });
    } else if (b.t === "photo") {
      if (b.url.trim().startsWith("https://")) {
        out.push({ t: "photo", url: b.url.trim(), caption_ko: n(b.caption_ko), caption_en: n(b.caption_en) });
      }
    } else if (b.t === "stop" && (b.place_id || b.activity_id)) {
      out.push({
        t: "stop",
        place_id: b.place_id || null,
        activity_id: b.place_id ? null : b.activity_id || null,
        time_ko: n(b.time_ko),
        time_en: n(b.time_en),
        note_ko: n(b.note_ko),
        note_en: n(b.note_en),
      });
    }
  }
  return out;
}

export const STORY_STATUS_KO: Record<StoryStatus, string> = {
  draft: "초안",
  review: "검토 대기",
  returned: "돌려받음",
  published: "공개",
};
export const STORY_STATUS_TONE: Record<StoryStatus, "muted" | "info" | "warn" | "ok"> = {
  draft: "muted",
  review: "info",
  returned: "warn",
  published: "ok",
};
