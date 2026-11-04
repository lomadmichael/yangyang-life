import { CATEGORIES, PLAY_CATEGORIES, STORY_TAGS, STORY_TYPES } from "./labels";
import type { PlaceFilter } from "./places-filter";
import type { Place, PlayCategory, StoryTag, StoryType } from "./types";

// 목록 화면의 필터는 주소 쿼리에 산다.
//   장소   /places  ?cat=food&open=1&en=1&price=2
//   놀거리 /play    ?cat=surf&rain=1
//   이야기 /stories ?type=course&tag=nocar
// 모르는 값(옛 분류 키 shop 등)은 오류 없이 무시한다.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Raw = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function pick<K extends string>(list: readonly K[], v: string | undefined): K | undefined {
  return v !== undefined && (list as readonly string[]).includes(v) ? (v as K) : undefined;
}

/** 키 순서는 넣은 순서 그대로, 빈 값은 생략. 앞에 ? 포함, 없으면 "" */
function qs(entries: [string, string | undefined][]): string {
  const q = new URLSearchParams();
  for (const [k, v] of entries) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function parsePlacesQuery(raw: Raw): PlaceFilter {
  const f: PlaceFilter = {};
  const cat = pick<Place["category"]>(CATEGORIES, one(raw.cat));
  if (cat) f.category = cat;
  if (one(raw.open) === "1") f.openNow = true;
  if (one(raw.en) === "1") f.englishMenu = true;
  const price = Number(one(raw.price));
  if (price === 1 || price === 2 || price === 3) f.price = price;
  return f;
}

export function placesQueryString(f: PlaceFilter): string {
  return qs([
    ["cat", f.category],
    ["open", f.openNow ? "1" : undefined],
    ["en", f.englishMenu ? "1" : undefined],
    ["price", f.price ? String(f.price) : undefined],
  ]);
}

export interface PlayFilter {
  category?: PlayCategory;
  rainy?: boolean;
}

export function parsePlayQuery(raw: Raw): PlayFilter {
  const f: PlayFilter = {};
  const cat = pick(PLAY_CATEGORIES, one(raw.cat));
  if (cat) f.category = cat;
  if (one(raw.rain) === "1") f.rainy = true;
  return f;
}

export function playQueryString(f: PlayFilter): string {
  return qs([
    ["cat", f.category],
    ["rain", f.rainy ? "1" : undefined],
  ]);
}

export interface StoriesFilter {
  type?: StoryType;
  tag?: StoryTag;
  /** 글쓴이(contributors.id) — uuid 만 받는다 */
  author?: string;
}

export function parseStoriesQuery(raw: Raw): StoriesFilter {
  const f: StoriesFilter = {};
  const type = pick(STORY_TYPES, one(raw.type));
  if (type) f.type = type;
  const tag = pick(STORY_TAGS, one(raw.tag));
  if (tag) f.tag = tag;
  const author = one(raw.author);
  if (author && UUID_RE.test(author)) f.author = author;
  return f;
}

export function storiesQueryString(f: StoriesFilter): string {
  return qs([
    ["type", f.type],
    ["tag", f.tag],
    ["author", f.author],
  ]);
}
