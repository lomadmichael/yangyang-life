import { describe, expect, it } from "vitest";
import { activeTab, hasCoverHero, isMenuBoardPath, NAV_TABS } from "../src/lib/nav";

describe("hasCoverHero", () => {
  it("홈과 장소·놀거리·이야기 상세만 화면 가득 표지", () => {
    expect(hasCoverHero("/ko")).toBe(true);
    expect(hasCoverHero("/en/")).toBe(true);
    expect(hasCoverHero("/ko/place/hyuhyuam")).toBe(true);
    expect(hasCoverHero("/en/activity/1")).toBe(true);
    expect(hasCoverHero("/ko/stories/first-day")).toBe(true);
  });
  it("목록·MY·만든 사람들·메뉴판은 표지 없음", () => {
    expect(hasCoverHero("/ko/places")).toBe(false);
    expect(hasCoverHero("/ko/place")).toBe(false);
    expect(hasCoverHero("/ko/play")).toBe(false);
    expect(hasCoverHero("/ko/stories")).toBe(false);
    expect(hasCoverHero("/ko/my")).toBe(false);
    expect(hasCoverHero("/ko/makers")).toBe(false);
    expect(hasCoverHero("/en/m/ABC123")).toBe(false);
  });
});

describe("activeTab", () => {
  it("언어 첫 화면은 홈", () => {
    expect(activeTab("/ko")).toBe("home");
    expect(activeTab("/en/")).toBe("home");
  });

  it("상세 화면은 부모 칸", () => {
    expect(activeTab("/ko/place/abc")).toBe("places");
    expect(activeTab("/en/activity/1")).toBe("play");
    expect(activeTab("/ko/stories/some-slug")).toBe("stories");
    expect(activeTab("/ko/makers")).toBe("my");
  });

  it("모르는 화면은 표시 없음", () => {
    expect(activeTab("/ko/m/ABC123")).toBeNull();
  });
});

describe("isMenuBoardPath", () => {
  it("메뉴판 착지만 참", () => {
    expect(isMenuBoardPath("/en/m/ABC123")).toBe(true);
    expect(isMenuBoardPath("/en/my")).toBe(false);
    expect(isMenuBoardPath("/ko")).toBe(false);
  });
});

describe("NAV_TABS", () => {
  it("5칸, 각 칸 경로가 activeTab 으로 자기 칸이 된다", () => {
    expect(NAV_TABS).toHaveLength(5);
    for (const { tab, path } of NAV_TABS) expect(activeTab(`/ko${path}`)).toBe(tab);
  });
});
