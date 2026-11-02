import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { anonClient } from "../src/lib/supabase";
import {
  getPlaceByCode,
  getPlaceBySlug,
  listActivities,
  listContributors,
  listMenu,
  listPlaces,
  listTips,
} from "../src/lib/queries";

const hasDb = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const original = process.env.YL_SHOW_SAMPLES;

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
    expect((await listContributors()).every((c) => !c.display_name.includes("샘플"))).toBe(true);
  });

  it("지금은 실제 데이터가 없으므로 listPlaces() = 0건 (실데이터 입력 시작하면 이 테스트를 지울 것)", async () => {
    expect(await listPlaces()).toHaveLength(0);
  });
});
