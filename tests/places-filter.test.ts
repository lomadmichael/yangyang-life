import { describe, expect, it } from "vitest";
import { filterPlaces, visibleCategories } from "../src/lib/places-filter";
import { CATEGORIES } from "../src/lib/labels";
import type { Place } from "../src/lib/types";

function place(p: Partial<Place> & { id: string }): Place {
  return {
    code: p.id,
    slug: p.id,
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

const allDay = { sat: [["09:00", "21:00"]], sun: [["09:00", "21:00"]] } as Place["hours"];
const night = { fri: [["18:00", "02:00"]], sat: [["18:00", "02:00"]] } as Place["hours"];

// 입력 순서를 일부러 섞어 둔다 (휴업이 맨 앞, 참여가 뒤)
const samples: Place[] = [
  place({ id: "closed-surf", category: "surf", status: "closed", hours: allDay, price_level: 3 }),
  place({ id: "listed-cafe-open", category: "cafe", status: "listed", hours: allDay, price_level: 2 }),
  place({ id: "part-bar-shut", category: "bar", status: "participating", hours: night, price_level: 2, has_english_menu: true }),
  place({ id: "listed-food-shut", category: "food", status: "listed", hours: night }),
  place({ id: "part-food-open", category: "food", status: "participating", hours: allDay, has_english_menu: true }),
];
const ids = (l: Place[]) => l.map((p) => p.id);
// 서울 2026-11-14(토) 12:00
const satNoon = new Date("2026-11-14T03:00:00Z");

describe("filterPlaces", () => {
  it("영업 중만 보면 휴업 가게는 빠진다", () => {
    const r = filterPlaces(samples, { openNow: true }, satNoon);
    expect(r.some((p) => p.status === "closed")).toBe(false);
    expect(ids(r)).toEqual(["part-food-open", "listed-cafe-open"]);
  });

  it("정렬: 참여 → 일반 → 휴업, 같은 상태 안에서는 영업 중 먼저", () => {
    const all = filterPlaces(samples, {}, satNoon);
    expect(all.at(-1)?.status).toBe("closed");
    expect(all[0].status).toBe("participating");
    expect(ids(all)).toEqual([
      "part-food-open",
      "part-bar-shut",
      "listed-cafe-open",
      "listed-food-shut",
      "closed-surf",
    ]);
  });

  it("영어 메뉴 필터는 영어 메뉴판 있는 가게만", () => {
    const r = filterPlaces(samples, { englishMenu: true }, satNoon);
    expect(r.length).toBe(2);
    expect(r.every((p) => p.has_english_menu)).toBe(true);
  });

  it("종류·가격대 필터는 같은 값만 남긴다 (조건은 AND)", () => {
    expect(ids(filterPlaces(samples, { category: "food" }, satNoon))).toEqual(["part-food-open", "listed-food-shut"]);
    expect(ids(filterPlaces(samples, { price: 2 }, satNoon))).toEqual(["part-bar-shut", "listed-cafe-open"]);
    expect(ids(filterPlaces(samples, { category: "bar", openNow: true }, satNoon))).toEqual([]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const before = ids(samples);
    filterPlaces(samples, {}, satNoon);
    expect(ids(samples)).toEqual(before);
  });
});

describe("visibleCategories", () => {
  it("항목이 있는 분류만, 정해진 순서대로", () => {
    const items = [place({ id: "a", category: "life" }), place({ id: "b", category: "cafe" }), place({ id: "c", category: "life" })];
    expect(visibleCategories(CATEGORIES, items)).toEqual(["cafe", "life"]);
    expect(visibleCategories(CATEGORIES, [])).toEqual([]);
    expect(visibleCategories(["village", "surf"] as const, [{ category: "surf" }, { category: "village" }])).toEqual([
      "village",
      "surf",
    ]);
  });
});
