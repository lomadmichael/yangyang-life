import { describe, expect, it } from "vitest";
import { groupPlay, inSeason } from "../src/lib/play";
import type { Activity } from "../src/lib/types";

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
const ids = (l: Activity[]) => l.map((a) => a.id);

// 2026-12-15T03:00:00Z 는 서울 12월, 2026-06-15T03:00:00Z 는 6월
describe("inSeason", () => {
  it("해를 넘기는 계절", () => {
    const winter = { season_months: [11, 12, 1, 2, 3] };
    expect(inSeason(winter, new Date("2026-12-15T03:00:00Z"))).toBe(true);
    expect(inSeason(winter, new Date("2027-01-10T03:00:00Z"))).toBe(true);
    expect(inSeason(winter, new Date("2026-06-15T03:00:00Z"))).toBe(false);
    expect(inSeason({ season_months: [] }, new Date("2026-06-15T03:00:00Z"))).toBe(true);
  });
  it("서울 기준 월 경계: 2026-10-31T15:30:00Z 는 서울 11월 1일", () => {
    expect(inSeason({ season_months: [4, 5, 6, 7, 8, 9, 10] }, new Date("2026-10-31T15:30:00Z"))).toBe(false);
  });
});

describe("groupPlay", () => {
  const surf = act({ id: "surf", category: "surf", season_months: [4, 5, 6, 7, 8, 9, 10] });
  const village = act({ id: "village", category: "village", rainy_ok: true });
  const festival = act({
    id: "festival",
    kind: "dated",
    category: "festival",
    starts_on: "2026-11-13",
    ends_on: "2026-11-15",
  });
  const list = [surf, village, festival];
  // 서울 2026-11-14(토) 10:00
  const now = new Date("2026-11-14T01:00:00Z");

  it("비시즌 상시는 offSeason 으로", () => {
    const g = groupPlay(list, now, {});
    expect(ids(g.dated)).toEqual(["festival"]);
    expect(ids(g.always)).toEqual(["village"]);
    expect(ids(g.offSeason)).toEqual(["surf"]);
  });
  it("분류 필터", () => {
    const g = groupPlay(list, now, { category: "surf" });
    expect(ids(g.dated)).toEqual([]);
    expect(ids(g.always)).toEqual([]);
    expect(ids(g.offSeason)).toEqual(["surf"]);
  });
  it("비 오는 날 필터", () => {
    const g = groupPlay(list, now, { rainy: true });
    expect(ids(g.dated)).toEqual([]);
    expect(ids(g.always)).toEqual(["village"]);
    expect(ids(g.offSeason)).toEqual([]);
  });
  it("dated 도 계절 밖이면 offSeason", () => {
    const off = act({ ...festival, id: "festival-off", season_months: [6, 7, 8] });
    const g = groupPlay([off], now, {});
    expect(ids(g.dated)).toEqual([]);
    expect(ids(g.offSeason)).toEqual(["festival-off"]);
  });
});
