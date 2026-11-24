import { describe, expect, it } from "vitest";
import { coverTitleSize, isAmenityCategory } from "../src/lib/place-view";

describe("coverTitleSize (상세 표지 큰 제목 단계)", () => {
  it("짧은 한글 이름은 가장 크게", () => {
    expect(coverTitleSize("휴휴암")).toBe("sz-xl");
    expect(coverTitleSize("강원횟집")).toBe("sz-l");
  });
  it("영문은 한 글자를 좁게 센다", () => {
    expect(coverTitleSize("Hyuhyuam")).toBe("sz-l");
    expect(coverTitleSize("Gangwon Hoetjip")).toBe("sz-m");
  });
  it("이야기 제목처럼 긴 글은 작은 단계", () => {
    expect(coverTitleSize("비 오는 날 차 없이 현남 하루")).toBe("sz-s");
    expect(coverTitleSize("처음 서핑하는 사람을 위한 죽도해변 안내와 장비 빌리기")).toBe("sz-xs");
  });
});

describe("isAmenityCategory", () => {
  it("해변·명소와 생활 편의만 편의 정보 모드", () => {
    expect(isAmenityCategory("spot")).toBe(true);
    expect(isAmenityCategory("life")).toBe(true);
    expect(isAmenityCategory("food")).toBe(false);
  });
});
