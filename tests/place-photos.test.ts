import { describe, expect, it } from "vitest";
import { canShowPlacePhotos, placePhone, telHref } from "../src/lib/place-photos";

describe("canShowPlacePhotos (0004 places_public.photos 규칙과 같게)", () => {
  it("참여 가게는 분류와 무관하게 사진 공개", () => {
    expect(canShowPlacePhotos({ status: "participating", category: "food" })).toBe(true);
  });
  it("해변·명소는 참여 가게가 아니어도 공개", () => {
    expect(canShowPlacePhotos({ status: "listed", category: "spot" })).toBe(true);
    expect(canShowPlacePhotos({ status: "closed", category: "spot" })).toBe(true);
  });
  it("그 밖의 일반·휴업 장소는 비공개", () => {
    expect(canShowPlacePhotos({ status: "listed", category: "food" })).toBe(false);
    expect(canShowPlacePhotos({ status: "closed", category: "cafe" })).toBe(false);
  });
});

describe("placePhone (0004 적용 전 DB 에는 phone 칸이 없다)", () => {
  it("칸이 없거나(undefined) 비면 null", () => {
    expect(placePhone({})).toBeNull();
    expect(placePhone({ phone: null })).toBeNull();
    expect(placePhone({ phone: "  " })).toBeNull();
  });
  it("값이 있으면 앞뒤 공백만 뺀다", () => {
    expect(placePhone({ phone: " 033-671-1234 " })).toBe("033-671-1234");
  });
});

describe("telHref", () => {
  it("숫자만 남긴 tel: 링크", () => {
    expect(telHref("033-671-1234")).toBe("tel:0336711234");
    expect(telHref("010 9542 3775")).toBe("tel:01095423775");
  });
});
