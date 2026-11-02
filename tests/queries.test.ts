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
    for (const p of seeded) {
      expect(await getPlaceBySlug(p.slug)).toBeNull();
      expect(await getPlaceByCode(p.code)).toBeNull();
    }
  });
});
