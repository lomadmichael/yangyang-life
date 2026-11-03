import { describe, expect, it } from "vitest";
import { parseStoryBlocks, resolveStops, savablePlaceIds, stopTargets, stopView, storyNeedsCheck } from "../src/lib/story-blocks";
import type { Activity, Place, StoryBlock } from "../src/lib/types";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID2 = "22222222-2222-4222-8222-222222222222";
const UUID3 = "33333333-3333-4333-8333-333333333333";
const UUID4 = "44444444-4444-4444-8444-444444444444";

function place(p: Partial<Place> & { id: string }): Place {
  return {
    code: "ABC123",
    slug: "s",
    category: "food",
    status: "listed",
    name_ko: p.id,
    name_en: null,
    name_roman: null,
    summary_ko: null,
    summary_en: null,
    address_ko: "양양",
    lat: 38,
    lng: 128.7,
    hours: {},
    price_level: 1,
    parking: null,
    foreign_card: null,
    how_to_get_ko: null,
    how_to_get_en: null,
    photos: [],
    verified_method: "visit",
    verified_at: null,
    verified_by_name: null,
    created_by_name: null,
    has_english_menu: false,
    is_sample: true,
    amenities: [],
    ...p,
  };
}

function act(p: Partial<Activity> & { id: string }): Activity {
  return {
    kind: "always",
    title_ko: p.id,
    title_en: null,
    desc_ko: null,
    desc_en: null,
    place_id: null,
    location_ko: null,
    location_en: null,
    starts_on: null,
    ends_on: null,
    weekdays: [],
    time_note_ko: null,
    time_note_en: null,
    rainy_ok: false,
    link: null,
    verified_method: "public",
    verified_at: null,
    verified_by_name: null,
    created_by_name: null,
    is_sample: true,
    category: "village",
    season_months: [],
    ...p,
  };
}

const stop = (p: Partial<Extract<StoryBlock, { t: "stop" }>>): StoryBlock => ({
  t: "stop",
  place_id: null,
  activity_id: null,
  time_ko: null,
  time_en: null,
  note_ko: null,
  note_en: null,
  ...p,
});

describe("parseStoryBlocks", () => {
  it("stop 은 place_id/activity_id 중 정확히 하나", () => {
    expect(parseStoryBlocks([{ t: "stop", place_id: UUID, activity_id: UUID2 }]).ok).toBe(false);
    expect(parseStoryBlocks([{ t: "stop", place_id: null, activity_id: null }]).ok).toBe(false);
    expect(parseStoryBlocks([{ t: "photo", url: "http://x" }]).ok).toBe(false);
    expect(parseStoryBlocks(Array(61).fill({ t: "text", ko: "a" })).ok).toBe(false);
  });
  it("정상 블록은 빈 칸을 null 로 채워 돌려준다", () => {
    const r = parseStoryBlocks([
      { t: "heading", ko: " 아침 " },
      { t: "text", ko: "본문", en: "Body" },
      { t: "photo", url: "https://example.com/a.jpg", caption_ko: "바다" },
      { t: "stop", place_id: UUID, note_ko: "메밀국수" },
    ]);
    expect(r).toEqual({
      ok: true,
      value: [
        { t: "heading", ko: "아침", en: null },
        { t: "text", ko: "본문", en: "Body" },
        { t: "photo", url: "https://example.com/a.jpg", caption_ko: "바다", caption_en: null },
        stop({ place_id: UUID, note_ko: "메밀국수" }),
      ],
    });
    expect(parseStoryBlocks(Array(60).fill({ t: "text", ko: "a" })).ok).toBe(true);
  });
  it("길이·형식 검사", () => {
    expect(parseStoryBlocks("x").ok).toBe(false);
    expect(parseStoryBlocks([{ t: "video" }]).ok).toBe(false);
    expect(parseStoryBlocks([{ t: "text", ko: "  " }]).ok).toBe(false);
    expect(parseStoryBlocks([{ t: "text", ko: "a".repeat(4001) }]).ok).toBe(false);
    expect(parseStoryBlocks([{ t: "text", ko: "a".repeat(4000) }]).ok).toBe(true);
    expect(parseStoryBlocks([{ t: "stop", place_id: "not-uuid" }]).ok).toBe(false);
    expect(parseStoryBlocks([{ t: "stop", activity_id: UUID, note_ko: "a".repeat(201) }]).ok).toBe(false);
    expect(parseStoryBlocks([{ t: "stop", activity_id: UUID, time_en: "a".repeat(200) }]).ok).toBe(true);
    expect(parseStoryBlocks([{ t: "photo", url: "javascript:alert(1)" }]).ok).toBe(false);
  });
});

describe("들른 곳", () => {
  const A = place({ id: UUID, status: "participating" });
  const B = place({ id: UUID2, status: "closed" });
  const blocks: StoryBlock[] = [
    { t: "text", ko: "시작", en: null },
    stop({ place_id: A.id }),
    { t: "photo", url: "https://example.com/p.jpg", caption_ko: null, caption_en: null },
    stop({ place_id: B.id }),
    stop({ place_id: UUID3 }),
  ];

  it("resolveStops: 휴업·사라짐·정상, 번호는 stop 만", () => {
    const r = resolveStops(blocks, new Map([[A.id, A], [B.id, B]]), new Map());
    expect(r.map((s) => [s.n, s.state])).toEqual([[1, "ok"], [2, "closed"], [3, "missing"]]);
    expect(r[0].place).toBe(A);
    expect(r[2].place).toBeNull();
    expect(storyNeedsCheck(blocks, new Map([[A.id, A], [B.id, B]]), new Map())).toBe(true);
  });
  it("놀거리 stop 과 모두 정상인 경우", () => {
    const X = act({ id: UUID4 });
    const b2: StoryBlock[] = [stop({ place_id: A.id }), stop({ activity_id: X.id })];
    const r = resolveStops(b2, new Map([[A.id, A]]), new Map([[X.id, X]]));
    expect(r.map((s) => s.state)).toEqual(["ok", "ok"]);
    expect(r[1].activity).toBe(X);
    expect(storyNeedsCheck(b2, new Map([[A.id, A]]), new Map([[X.id, X]]))).toBe(false);
    expect(storyNeedsCheck(b2, new Map([[A.id, A]]), new Map())).toBe(true);
  });
  it("stopTargets: 중복 제거", () => {
    const b3 = [...blocks, stop({ place_id: A.id }), stop({ activity_id: UUID4 })];
    expect(stopTargets(b3)).toEqual({ placeIds: [UUID, UUID2, UUID3], activityIds: [UUID4] });
  });
});

describe("들른 곳 카드 표시 (stopView) — 휴업·사라짐", () => {
  // 2026-11-14(토) 12:00 서울
  const NOON_SAT = new Date("2026-11-14T03:00:00Z");
  const OPEN = place({ id: UUID, slug: "open-shop", status: "listed", hours: { sat: [["10:00", "20:00"]] } });
  const SHUT = place({ id: UUID2, slug: "shut-shop", status: "listed", hours: { sat: [["18:00", "22:00"]] } });
  const CLOSED = place({ id: UUID3, slug: "closed-shop", status: "closed", hours: { sat: [["10:00", "20:00"]] } });
  const BEACH = place({ id: UUID4, slug: "beach", category: "spot", status: "listed", hours: {} });
  const X = act({ id: "55555555-5555-4555-8555-555555555555" });
  const GONE = "66666666-6666-4666-8666-666666666666";
  const blocks: StoryBlock[] = [
    stop({ place_id: OPEN.id }),
    stop({ place_id: SHUT.id }),
    stop({ place_id: CLOSED.id }),
    stop({ place_id: BEACH.id }),
    stop({ activity_id: X.id }),
    stop({ place_id: GONE }),
    stop({ activity_id: GONE }),
    stop({ place_id: OPEN.id }),
  ];
  const places = new Map([OPEN, SHUT, CLOSED, BEACH].map((p) => [p.id, p]));
  const r = resolveStops(blocks, places, new Map([[X.id, X]]));

  it("상태별 배지·안내 문구·링크", () => {
    expect(r.map((s) => stopView(s, NOON_SAT))).toEqual([
      { kind: "place", id: OPEN.id, href: "/place/open-shop", badge: "open", notice: null },
      { kind: "place", id: SHUT.id, href: "/place/shut-shop", badge: "closedNow", notice: null },
      { kind: "place", id: CLOSED.id, href: "/place/closed-shop", badge: "closed", notice: "stopClosedNote" },
      // 해변·생활 편의는 영업시간이 뜻이 없다 → 닫힘 배지 없음
      { kind: "place", id: BEACH.id, href: "/place/beach", badge: null, notice: null },
      { kind: "activity", id: X.id, href: `/activity/${X.id}`, badge: null, notice: null },
      // 지워졌거나 운영에서 숨겨진 곳: 링크·★ 없음
      { kind: null, id: null, href: null, badge: null, notice: "stopMissingNote" },
      { kind: null, id: null, href: null, badge: null, notice: "stopMissingNote" },
      { kind: "place", id: OPEN.id, href: "/place/open-shop", badge: "open", notice: null },
    ]);
  });
  it("「모두 저장」은 안내 중·휴업 장소만, 중복 없이 순서대로", () => {
    expect(savablePlaceIds(r)).toEqual([OPEN.id, SHUT.id, CLOSED.id, BEACH.id]);
    expect(savablePlaceIds([])).toEqual([]);
  });
});
