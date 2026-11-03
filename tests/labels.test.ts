import { describe, expect, it } from "vitest";
import { t } from "../src/i18n";
import {
  AMENITIES,
  AMENITY_KEY,
  CATEGORIES,
  CATEGORY_KEY,
  PLAY_CATEGORIES,
  PLAY_CATEGORY_KEY,
  STORY_TAGS,
  STORY_TAG_KEY,
  STORY_TYPES,
  STORY_TYPE_KEY,
} from "../src/lib/labels";

describe("labels", () => {
  it("분류 순서와 사전 키", () => {
    expect(CATEGORIES).toEqual(["food", "cafe", "stay", "surf", "bar", "spot", "life"]);
    expect(PLAY_CATEGORIES).toEqual(["surf", "festival", "eco", "hike", "fishing", "walk", "yoga", "village"]);
    expect(STORY_TYPES).toEqual(["course", "people", "guide"]);
    expect(STORY_TAGS).toEqual(["solo", "couple", "family", "nocar", "rainy"]);
    for (const c of CATEGORIES) expect(t("ko", CATEGORY_KEY[c])).not.toBe(CATEGORY_KEY[c]);
    expect(t("en", PLAY_CATEGORY_KEY.village)).toBe("Village experiences");
    expect(t("ko", CATEGORY_KEY.life)).toBe("생활 편의");
  });
  it("모든 키에 ko·en 이름이 있다 (Global Constraints 표 그대로)", () => {
    const ko = [...CATEGORIES.map((c) => CATEGORY_KEY[c])].map((k) => t("ko", k));
    expect(ko).toEqual(["식당", "카페", "숙소", "서핑샵", "펍·바", "해변·명소", "생활 편의"]);
    expect(CATEGORIES.map((c) => t("en", CATEGORY_KEY[c]))).toEqual([
      "Restaurants", "Cafés", "Stay", "Surf shops", "Pubs & bars", "Beaches & sights", "Essentials",
    ]);
    expect(PLAY_CATEGORIES.map((c) => t("ko", PLAY_CATEGORY_KEY[c]))).toEqual([
      "서핑·SUP", "축제·행사", "생태·자연", "등산", "낚시", "산책 코스", "요가·웰니스", "마을·농촌 체험",
    ]);
    expect(STORY_TYPES.map((c) => t("en", STORY_TYPE_KEY[c]))).toEqual(["Routes", "People", "Guides"]);
    expect(STORY_TAGS.map((c) => t("ko", STORY_TAG_KEY[c]))).toEqual(["혼자", "커플", "가족", "차 없이", "비 오는 날"]);
    expect(AMENITIES).toEqual(["toilet", "shower"]);
    expect(AMENITIES.map((c) => t("en", AMENITY_KEY[c]))).toEqual(["Toilets", "Showers"]);
  });
});
