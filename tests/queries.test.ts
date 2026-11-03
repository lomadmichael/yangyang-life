import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { anonClient } from "../src/lib/supabase";
import {
  getPlaceByCode,
  getPlaceBySlug,
  listActivities,
  getGuide,
  getStoryBySlug,
  listActivitiesByIds,
  listContributors,
  listMenu,
  listPlaces,
  listPlacesByIds,
  listStories,
  listStoriesByIds,
  listStoriesMentioning,
  listTips,
  tipTargetExists,
} from "../src/lib/queries";

const hasDb = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const original = process.env.YL_SHOW_SAMPLES;
// 이야기(0003 마이그레이션 + seed_v2) 검사는 운영 DB 에 stories_public 이 생긴 뒤에만 돈다
const hasStories =
  hasDb && !(await anonClient().from("stories_public").select("id").limit(1)).error;
const BARAMGIL = "00000000-0000-4000-8000-000000000104";
const RAINY_STORY = "00000000-0000-4000-8000-000000000501";

describe.skipIf(!hasDb)("queries (샘플 표시 YL_SHOW_SAMPLES=1)", () => {
  beforeEach(() => {
    process.env.YL_SHOW_SAMPLES = "1";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.YL_SHOW_SAMPLES;
    else process.env.YL_SHOW_SAMPLES = original;
  });

  it("가게 목록 · 영문 메뉴 · 팁 비공개 컬럼 제외", async () => {
    const places = await listPlaces();
    expect(places.length).toBeGreaterThanOrEqual(4);
    expect(places.find((p) => p.status === "participating")?.has_english_menu).toBe(true);
    expect(places.every((p) => /^[a-z0-9]{6}$/.test(p.code))).toBe(true);
    const tips = await listTips("place", places[0].id);
    expect(tips.every((t) => !("contact" in t) && !("device_id" in t))).toBe(true);
  });

  it("샘플 팁: 숨김 팁은 빠지고 공개 팁엔 연락처·기기값이 없다", async () => {
    const noodle = await getPlaceBySlug("sample-noodle-house");
    expect(noodle).not.toBeNull();
    const tips = await listTips("place", noodle!.id);
    expect(tips.length).toBe(1);
    expect(tips[0].handled).toBe(false);
    expect(Object.keys(tips[0]).sort()).toEqual(
      ["body", "created_at", "handled", "id", "kind", "lang", "nickname", "target_id", "target_type"],
    );
  });

  it("slug · code 로 한 곳 조회, 없으면 null", async () => {
    const [first] = await listPlaces();
    expect((await getPlaceBySlug(first.slug))?.id).toBe(first.id);
    expect((await getPlaceByCode(first.code))?.id).toBe(first.id);
    expect(await getPlaceBySlug("no-such-place")).toBeNull();
    expect(await getPlaceByCode("zzzzzz")).toBeNull();
  });

  it("메뉴 · 할 거리 · 기여자", async () => {
    const places = await listPlaces();
    const part = places.find((p) => p.status === "participating" && p.has_english_menu)!;
    const menu = await listMenu(part.id);
    expect(menu.length).toBeGreaterThan(0);
    expect(menu.map((m) => m.sort)).toEqual([...menu.map((m) => m.sort)].sort((a, b) => a - b));
    expect((await listActivities()).length).toBeGreaterThanOrEqual(5);
    const people = await listContributors();
    expect(people.length).toBeGreaterThanOrEqual(2);
    expect(people.every((c) => !("access_code_hash" in c) && !("role" in c))).toBe(true);
  });

  it("anon 으로 원본 테이블 직접 조회 → 0행 또는 권한 오류", async () => {
    const db = anonClient();
    for (const table of ["tips", "tip_reports", "contributors"]) {
      const { data, error } = await db.from(table).select("*");
      expect(error !== null || (data ?? []).length === 0, table).toBe(true);
    }
    const { data, error } = await db.from("tips").select("contact,device_id");
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("anon 원본 테이블은 공개 컬럼을 콕 집어도 못 읽는다 (뷰만 공개 창구)", async () => {
    const db = anonClient();
    const probes: [string, string][] = [
      ["contributors", "display_name,show"],
      ["tips", "id,body"],
      ["tips", "hidden,handled_at"],
      ["places", "id"],
      ["menu_items", "id"],
      ["activities", "id"],
      ["tip_reports", "tip_id"],
    ];
    for (const [table, cols] of probes) {
      const { data, error } = await db.from(table).select(cols);
      expect(error !== null || (data ?? []).length === 0, `${table}(${cols})`).toBe(true);
    }
  });

  it("show=false 기여자는 「만든 사람들」에서 빠지지만 확인자 이름으로는 나온다", async () => {
    const people = await listContributors();
    expect(people.map((c) => c.display_name)).not.toContain("박숨김");
    expect(people.every((c) => c.show)).toBe(true);
    const cafe = await getPlaceBySlug("sample-beach-cafe");
    expect(cafe?.verified_by_name).toBe("박숨김");
  });

  it("사진·영문 메뉴·메뉴는 참여 가게만", async () => {
    const places = await listPlaces();
    for (const p of places.filter((x) => x.status !== "participating")) {
      expect(p.has_english_menu, p.slug).toBe(false);
      expect(p.photos, p.slug).toEqual([]);
      expect(await listMenu(p.id), p.slug).toEqual([]);
    }
    const noodle = places.find((p) => p.slug === "sample-noodle-house")!;
    expect(noodle.photos.length).toBeGreaterThan(0);
    expect((await listMenu(noodle.id)).length).toBe(4);
  });
});

describe.skipIf(!hasDb)("queries (샘플 숨김, YL_SHOW_SAMPLES 없음)", () => {
  beforeEach(() => {
    delete process.env.YL_SHOW_SAMPLES;
  });
  afterEach(() => {
    if (original !== undefined) process.env.YL_SHOW_SAMPLES = original;
  });

  it("샘플은 하나도 안 나온다", async () => {
    const places = await listPlaces();
    expect(places.every((p) => !p.is_sample)).toBe(true);
    expect((await listActivities()).every((a) => !a.is_sample)).toBe(true);
    const seeded = await (async () => {
      process.env.YL_SHOW_SAMPLES = "1";
      const all = await listPlaces();
      delete process.env.YL_SHOW_SAMPLES;
      return all.filter((p) => p.is_sample);
    })();
    expect(seeded.length).toBeGreaterThanOrEqual(4);
    const visibleIds = new Set(places.map((p) => p.id));
    for (const p of seeded) {
      expect(visibleIds.has(p.id)).toBe(false);
      expect(await getPlaceBySlug(p.slug)).toBeNull();
      expect(await getPlaceByCode(p.code)).toBeNull();
      expect(await listMenu(p.id)).toEqual([]);
      expect(await listTips("place", p.id)).toEqual([]);
    }
  });

  it("seed 의 고정 샘플 UUID 는 어느 목록에도 안 나온다 (실데이터가 들어와도 유지되는 검사)", async () => {
    const sid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => sid(from + i));
    const samplePlaces = range(101, 104);
    const disjoint = (ids: string[], sample: string[]) => ids.filter((id) => sample.includes(id));

    expect(disjoint((await listPlaces()).map((p) => p.id), samplePlaces)).toEqual([]);
    expect(disjoint((await listActivities()).map((a) => a.id), range(301, 305))).toEqual([]);
    expect(disjoint((await listContributors()).map((c) => c.id), range(1, 3))).toEqual([]);
    for (const placeId of samplePlaces) {
      expect(disjoint((await listTips("place", placeId)).map((t) => t.id), range(401, 402))).toEqual([]);
      expect(await listMenu(placeId)).toEqual([]);
    }
  });
});

describe.skipIf(!hasStories)("이야기 queries (0003 적용 후, 샘플 표시)", () => {
  beforeEach(() => {
    process.env.YL_SHOW_SAMPLES = "1";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.YL_SHOW_SAMPLES;
    else process.env.YL_SHOW_SAMPLES = original;
  });

  it("이야기 목록 · 갈래 · 가이드", async () => {
    const stories = await listStories();
    expect(stories.length).toBeGreaterThanOrEqual(3);
    const times = stories.map((s) => s.published_at);
    expect(times).toEqual([...times].sort().reverse());
    const guides = await listStories({ type: "guide" });
    expect(guides.length).toBe(1);
    expect(guides[0].guide_topic).toBe("surf");
    expect((await getGuide("surf"))?.id).toBe(guides[0].id);
    expect(await getGuide("no-such-topic")).toBeNull();
    expect((await listStories({ tag: "nocar" })).every((s) => s.tags.includes("nocar"))).toBe(true);
  });

  it("들른 곳 역조회: 바람길 서핑하우스가 나오는 이야기", async () => {
    const found = await listStoriesMentioning("place", BARAMGIL);
    expect(found.map((s) => s.id)).toContain(RAINY_STORY);
    expect(found.find((s) => s.id === RAINY_STORY)?.title_ko).toBe("비 오는 날 차 없이 현남 하루");
    expect(await listStoriesMentioning("place", "not-a-uuid")).toEqual([]);
  });

  it("공개 이야기엔 status·review_note 가 없다", async () => {
    const [first] = await listStories();
    const story = await getStoryBySlug(first.slug);
    expect(story?.id).toBe(first.id);
    expect(story && "status" in story).toBe(false);
    expect(story && "review_note" in story).toBe(false);
    expect(await getStoryBySlug("no-such-story")).toBeNull();
  });

  it("id 묶음 조회: 순서 유지 · 빈 배열 · 이상한 id", async () => {
    const places = await listPlaces();
    const ids = places.slice(0, 3).map((p) => p.id).reverse();
    expect((await listPlacesByIds(ids)).map((p) => p.id)).toEqual(ids);
    expect(await listPlacesByIds([])).toEqual([]);
    expect(await listActivitiesByIds(["nope"])).toEqual([]);
    expect((await listStoriesByIds([RAINY_STORY])).map((s) => s.id)).toEqual([RAINY_STORY]);
    expect(await tipTargetExists("story", RAINY_STORY)).toBe(true);
  });
});

describe.skipIf(!hasStories)("이야기 queries (0003 적용 후, 샘플 숨김)", () => {
  beforeEach(() => {
    delete process.env.YL_SHOW_SAMPLES;
  });
  afterEach(() => {
    if (original !== undefined) process.env.YL_SHOW_SAMPLES = original;
  });

  it("샘플 이야기도 안 나온다 (실데이터 이야기가 들어와도 유지되는 검사)", async () => {
    const sampleStories = [501, 502, 503].map((n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`);
    const stories = await listStories();
    expect(stories.every((s) => !s.is_sample)).toBe(true);
    expect(stories.map((s) => s.id).filter((id) => sampleStories.includes(id))).toEqual([]);
    expect(await listStoriesByIds(sampleStories)).toEqual([]);
    for (const id of sampleStories) {
      expect(await tipTargetExists("story", id), id).toBe(false);
      expect(await listTips("story", id), id).toEqual([]);
    }
  });
});
