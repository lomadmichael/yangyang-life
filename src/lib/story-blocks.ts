import { isUuid, type Parsed } from "./admin-input";
import { isOpenNow } from "./hours";
import type { Activity, Place, StoryBlock } from "./types";

// 이야기 본문 블록 — 입력 검사, 들른 곳(stop) 대상 모으기·현재 값으로 풀기.
// stop 은 장소·놀거리 id 만 저장한다. 화면에서는 항상 지금의 장소 값을 그린다.

export const MAX_BLOCKS = 60;
const MAX_TEXT = 4000;
const MAX_NOTE = 200;
const MAX_URL = 2000;

type StopBlock = Extract<StoryBlock, { t: "stop" }>;

const ok = <T,>(value: T): Parsed<T> => ({ ok: true, value });
const bad = (error: string): { ok: false; error: string } => ({ ok: false, error });

class BlockError extends Error {}

function rec(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

/** 선택 문자열: 앞뒤 공백 제거, 비면 null, 넘치면 오류 */
function opt(v: unknown, max: number, what: string): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") throw new BlockError(`${what} 형식이 잘못됐어요`);
  const s = v.trim();
  if (s.length > max) throw new BlockError(`${what}은 ${max}자까지예요`);
  return s || null;
}

function req(v: unknown, max: number, what: string): string {
  const s = opt(v, max, what);
  if (!s) throw new BlockError(`${what}을 적어 주세요`);
  return s;
}

function httpsUrl(v: unknown): string {
  if (typeof v !== "string" || v.length > MAX_URL) throw new BlockError("사진 주소는 https:// 로 시작해야 해요");
  const s = v.trim();
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new BlockError("사진 주소는 https:// 로 시작해야 해요");
  }
  if (u.protocol !== "https:" || !s.startsWith("https://")) throw new BlockError("사진 주소는 https:// 로 시작해야 해요");
  return s;
}

function idOrNull(v: unknown): string | null | undefined {
  if (v === null || v === undefined || v === "") return null;
  return isUuid(v) ? v : undefined; // undefined = 잘못된 값
}

function parseBlock(raw: unknown, i: number): StoryBlock {
  const r = rec(raw);
  const at = `${i + 1}번째 블록`;
  switch (r.t) {
    case "text":
    case "heading":
      return { t: r.t, ko: req(r.ko, MAX_TEXT, `${at} 국문`), en: opt(r.en, MAX_TEXT, `${at} 영문`) };
    case "photo":
      return {
        t: "photo",
        url: httpsUrl(r.url),
        caption_ko: opt(r.caption_ko, MAX_NOTE, `${at} 사진 설명`),
        caption_en: opt(r.caption_en, MAX_NOTE, `${at} 사진 설명(영문)`),
      };
    case "stop": {
      const place_id = idOrNull(r.place_id);
      const activity_id = idOrNull(r.activity_id);
      if (place_id === undefined || activity_id === undefined) throw new BlockError(`${at}: 들른 곳 id 가 잘못됐어요`);
      if ((place_id === null) === (activity_id === null)) {
        throw new BlockError(`${at}: 들른 곳은 장소나 놀거리 중 하나만 골라 주세요`);
      }
      return {
        t: "stop",
        place_id,
        activity_id,
        time_ko: opt(r.time_ko, MAX_NOTE, `${at} 시간`),
        time_en: opt(r.time_en, MAX_NOTE, `${at} 시간(영문)`),
        note_ko: opt(r.note_ko, MAX_NOTE, `${at} 메모`),
        note_en: opt(r.note_en, MAX_NOTE, `${at} 메모(영문)`),
      };
    }
    default:
      throw new BlockError(`${at}: 알 수 없는 블록 종류예요`);
  }
}

/** 브라우저가 보낸 블록 배열을 검사해 정돈된 StoryBlock[] 로 바꾼다 */
export function parseStoryBlocks(raw: unknown): Parsed<StoryBlock[]> {
  if (!Array.isArray(raw)) return bad("본문 형식이 잘못됐어요");
  if (raw.length > MAX_BLOCKS) return bad(`본문 블록은 ${MAX_BLOCKS}개까지예요`);
  try {
    return ok(raw.map(parseBlock));
  } catch (e) {
    if (e instanceof BlockError) return bad(e.message);
    throw e;
  }
}

function stops(blocks: StoryBlock[]): StopBlock[] {
  return blocks.filter((b): b is StopBlock => b.t === "stop");
}

/** 들른 곳 대상 id (중복 제거, 처음 나온 순서) */
export function stopTargets(blocks: StoryBlock[]): { placeIds: string[]; activityIds: string[] } {
  const placeIds = new Set<string>();
  const activityIds = new Set<string>();
  for (const s of stops(blocks)) {
    if (s.place_id) placeIds.add(s.place_id);
    if (s.activity_id) activityIds.add(s.activity_id);
  }
  return { placeIds: [...placeIds], activityIds: [...activityIds] };
}

export type ResolvedStop = {
  block: StopBlock;
  /** 1부터, stop 블록만 센다 */
  n: number;
  /** ok = 안내 중 · closed = 휴업(장소 status closed) · missing = 지워졌거나 숨겨져 맵에 없음 */
  state: "ok" | "closed" | "missing";
  place: Place | null;
  activity: Activity | null;
};

export function resolveStops(
  blocks: StoryBlock[],
  places: Map<string, Place>,
  activities: Map<string, Activity>,
): ResolvedStop[] {
  return stops(blocks).map((block, i) => {
    const place = block.place_id ? (places.get(block.place_id) ?? null) : null;
    const activity = block.activity_id ? (activities.get(block.activity_id) ?? null) : null;
    const state: ResolvedStop["state"] =
      !place && !activity ? "missing" : place?.status === "closed" ? "closed" : "ok";
    return { block, n: i + 1, state, place, activity };
  });
}

/** 들른 곳 중 휴업·사라진 곳이 하나라도 있으면 true (관리 화면 「확인 필요」) */
export function storyNeedsCheck(
  blocks: StoryBlock[],
  places: Map<string, Place>,
  activities: Map<string, Activity>,
): boolean {
  return resolveStops(blocks, places, activities).some((s) => s.state !== "ok");
}

/** 들른 곳 카드 한 장에 그릴 것 — 상태(ok·closed·missing)에 따라 링크·배지·안내 문구를 고른다 */
export interface StopView {
  /** ★ 저장·링크 대상 종류. missing 이면 null */
  kind: "place" | "activity" | null;
  id: string | null;
  /** 언어 앞마디를 뺀 주소 (/place/{slug} · /activity/{id}). missing 이면 링크 없음 */
  href: string | null;
  /** 장소 영업 배지 — open 영업 중 · closedNow 지금은 닫힘 · closed 휴업 */
  badge: "open" | "closedNow" | "closed" | null;
  /** 카드 안내 줄의 사전 키 */
  notice: "stopClosedNote" | "stopMissingNote" | null;
}

/** 해변·명소·생활 편의는 영업시간이 뜻이 없다(PlaceCard 와 같은 기준) → 「지금은 닫힘」을 붙이지 않는다 */
function hoursMatter(category: Place["category"]): boolean {
  return category !== "spot" && category !== "life";
}

export function stopView(s: ResolvedStop, now: Date): StopView {
  if (s.state === "missing") return { kind: null, id: null, href: null, badge: null, notice: "stopMissingNote" };
  if (s.place) {
    const p = s.place;
    const href = `/place/${p.slug}`;
    if (s.state === "closed") return { kind: "place", id: p.id, href, badge: "closed", notice: "stopClosedNote" };
    const badge = isOpenNow(p.hours ?? {}, p.status, now) ? "open" : hoursMatter(p.category) ? "closedNow" : null;
    return { kind: "place", id: p.id, href, badge, notice: null };
  }
  const a = s.activity as Activity;
  return { kind: "activity", id: a.id, href: `/activity/${a.id}`, badge: null, notice: null };
}

/** 「이 코스의 장소 모두 저장」 대상 — 안내 중(ok)·휴업(closed) 장소 id, 중복 없이 나온 순서대로. 놀거리·사라진 곳은 뺀다 */
export function savablePlaceIds(resolved: ResolvedStop[]): string[] {
  const ids = new Set<string>();
  for (const s of resolved) {
    if (s.state !== "missing" && s.place) ids.add(s.place.id);
  }
  return [...ids];
}
