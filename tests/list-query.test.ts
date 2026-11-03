import { describe, expect, it } from "vitest";
import {
  parsePlacesQuery,
  parsePlayQuery,
  parseStoriesQuery,
  placesQueryString,
  playQueryString,
  storiesQueryString,
} from "../src/lib/list-query";

describe("list-query", () => {
  it("옛 분류 키 shop 은 무시", () => {
    expect(parsePlacesQuery({ cat: "shop", open: "1" })).toEqual({ openNow: true });
    expect(parsePlayQuery({ cat: "village", rain: "1" })).toEqual({ category: "village", rainy: true });
    expect(storiesQueryString({ type: "course", tag: "nocar" })).toBe("?type=course&tag=nocar");
  });
  it("장소 쿼리 왕복 (기존 키 유지)", () => {
    const f = parsePlacesQuery({ cat: "spot", open: "1", en: "1", price: "2" });
    expect(f).toEqual({ category: "spot", openNow: true, englishMenu: true, price: 2 });
    expect(placesQueryString(f)).toBe("?cat=spot&open=1&en=1&price=2");
    expect(placesQueryString({})).toBe("");
  });
  it("놀거리·이야기: 모르는 값 무시, 배열은 첫 값", () => {
    expect(parsePlayQuery({ cat: "shop", rain: "0" })).toEqual({});
    expect(playQueryString({ category: "surf", rainy: true })).toBe("?cat=surf&rain=1");
    expect(playQueryString({})).toBe("");
    expect(parseStoriesQuery({ type: ["guide", "course"], tag: "nope" })).toEqual({ type: "guide" });
    expect(parseStoriesQuery({ tag: "rainy" })).toEqual({ tag: "rainy" });
    expect(storiesQueryString({})).toBe("");
  });
});
