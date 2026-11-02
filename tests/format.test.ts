import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatDateRange,
  formatToday,
  formatVerifiedDate,
  formatWeekdays,
  formatWon,
  photoUrl,
} from "../src/lib/format";
import { tf } from "../src/i18n";

describe("formatVerifiedDate", () => {
  it("서울 날짜로 ko·en 형식을 맞춘다", () => {
    // UTC 로는 10/30 16:00 이지만 서울은 10/31 01:00
    expect(formatVerifiedDate("2026-10-30T16:00:00+00:00", "ko")).toBe("2026. 10. 31.");
    expect(formatVerifiedDate("2026-10-30T16:00:00+00:00", "en")).toBe("Oct 31, 2026");
    expect(formatVerifiedDate("2026-11-02T01:00:00+00:00", "ko")).toBe("2026. 11. 2.");
  });
  it("값이 없거나 이상하면 빈 문자열", () => {
    expect(formatVerifiedDate(null, "ko")).toBe("");
    expect(formatVerifiedDate("not-a-date", "en")).toBe("");
  });
});

describe("tf", () => {
  it("문구 자리를 채운다", () => {
    expect(tf("ko", "verifiedLine", { by: "김샘플", date: "2026. 10. 30." })).toBe("정리·확인: 김샘플 · 2026. 10. 30.");
    expect(tf("en", "verifiedLine", { by: "Kim", date: "Oct 30, 2026" })).toBe("Checked by Kim · Oct 30, 2026");
  });
});

describe("formatWon", () => {
  it("₩ + 천 단위 쉼표", () => {
    expect(formatWon(10000)).toBe("₩10,000");
    expect(formatWon(1500000)).toBe("₩1,500,000");
    expect(formatWon(800)).toBe("₩800");
  });
});

describe("photoUrl", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("파일 이름은 place-photos 공개 주소로, http 주소는 그대로", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    expect(photoUrl("a/b.jpg")).toBe("https://abc.supabase.co/storage/v1/object/public/place-photos/a/b.jpg");
    expect(photoUrl("https://example.com/x.jpg")).toBe("https://example.com/x.jpg");
  });
});

describe("formatWeekdays", () => {
  it("매일 / 요일 나열 (월요일부터)", () => {
    expect(formatWeekdays([0, 1, 2, 3, 4, 5, 6], "ko")).toBe("매일");
    expect(formatWeekdays([0, 6], "ko")).toBe("매주 토·일");
    expect(formatWeekdays([6, 0], "en")).toBe("Every Sat, Sun");
    expect(formatWeekdays([], "en")).toBe("");
  });
});

describe("formatDateRange / formatToday", () => {
  it("기간 표기", () => {
    expect(formatDateRange("2026-10-25", "2026-11-30", "ko")).toBe("10월 25일 ~ 11월 30일");
    expect(formatDateRange("2026-10-25", "2026-11-30", "en")).toBe("Oct 25 – Nov 30");
    expect(formatDateRange("2026-11-14", "2026-11-14", "en")).toBe("Nov 14");
    expect(formatDateRange(null, null, "en")).toBe("");
  });
  it("오늘 날짜(서울)와 요일", () => {
    // 서울 2026-11-14 10:00
    const now = new Date("2026-11-14T01:00:00Z");
    expect(formatToday(now, "ko")).toBe("11월 14일 (토)");
    expect(formatToday(now, "en")).toBe("Sat, Nov 14");
  });
});
