import { describe, expect, it } from "vitest";
import { activitiesForDay } from "../src/lib/today";
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

const list: Activity[] = [
  act({ id: "always-weekday", weekdays: [1, 2, 3, 4, 5] }),
  act({ id: "always-weekend", weekdays: [0, 6] }),
  act({ id: "dated-ended", kind: "dated", starts_on: "2026-11-01", ends_on: "2026-11-10" }),
  act({ id: "dated-on", kind: "dated", starts_on: "2026-11-13", ends_on: "2026-11-15" }),
  act({ id: "always-rain", weekdays: [6], rainy_ok: true }),
];
const ids = (l: Activity[]) => l.map((a) => a.id);
// 서울 2026-11-14(토) 10:00
const now = new Date("2026-11-14T01:00:00Z");

describe("activitiesForDay", () => {
  it("진행 중 dated → 해당 요일 always 순, 끝난 것·다른 요일은 제외", () => {
    expect(ids(activitiesForDay(list, now))).toEqual(["dated-on", "always-weekend", "always-rain"]);
  });
  it("비 오는 날은 rainy_ok만", () => {
    expect(ids(activitiesForDay(list, now, { rainy: true }))).toEqual(["always-rain"]);
  });
  it("dated는 끝나는 날이 가까운 순", () => {
    const l = [
      act({ id: "late", kind: "dated", starts_on: "2026-11-01", ends_on: "2026-11-30" }),
      act({ id: "soon", kind: "dated", starts_on: "2026-11-01", ends_on: "2026-11-15" }),
    ];
    expect(ids(activitiesForDay(l, now))).toEqual(["soon", "late"]);
  });
  it("always 요일이 비어 있으면 매일 보임", () => {
    const l = [act({ id: "any-day", weekdays: [] })];
    expect(ids(activitiesForDay(l, now))).toEqual(["any-day"]);
    expect(ids(activitiesForDay(l, new Date("2026-11-16T01:00:00Z")))).toEqual(["any-day"]); // 서울 11-16
  });
  it("always 도 끝나는 날이 지났으면 숨김", () => {
    const l = [act({ id: "ended", weekdays: [], ends_on: "2026-11-13" })];
    expect(ids(activitiesForDay(l, now))).toEqual([]);
  });
  it("always 도 시작일이 아직이면 숨김", () => {
    const l = [act({ id: "future", weekdays: [6], starts_on: "2026-11-15" })];
    expect(ids(activitiesForDay(l, now))).toEqual([]);
  });
  it("always 기간 경계(시작일=오늘, 끝나는 날=오늘)는 보임", () => {
    const l = [act({ id: "edge", weekdays: [], starts_on: "2026-11-14", ends_on: "2026-11-14" })];
    expect(ids(activitiesForDay(l, now))).toEqual(["edge"]);
  });
  it("서울 날짜 기준: UTC로는 14일이어도 서울 15일 새벽이면 15일로 판정", () => {
    const l = [act({ id: "ends14", kind: "dated", starts_on: "2026-11-14", ends_on: "2026-11-14" })];
    expect(ids(activitiesForDay(l, new Date("2026-11-14T16:00:00Z")))).toEqual([]);
  });
});
