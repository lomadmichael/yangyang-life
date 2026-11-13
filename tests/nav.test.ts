import { describe, expect, it } from "vitest";
import { activeTab, isMenuBoardPath, NAV_TABS } from "../src/lib/nav";

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
