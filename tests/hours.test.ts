import { describe, expect, it } from "vitest";
import { isOpenNow, seoulParts } from "../src/lib/hours";
import type { WeeklyHours } from "../src/lib/types";

// 2026-11-14 = 토요일
describe("seoulParts", () => {
  it("서버가 UTC여도 서울 날짜·요일·분으로 변환한다", () => {
    expect(seoulParts(new Date("2026-11-14T15:30:00Z"))).toEqual({
      ymd: "2026-11-15",
      weekday: 0,
      minutes: 30,
    });
    expect(seoulParts(new Date("2026-11-14T03:00:00Z"))).toEqual({
      ymd: "2026-11-14",
      weekday: 6,
      minutes: 12 * 60,
    });
  });
});

describe("isOpenNow", () => {
  const late = { fri: [["18:00", "02:00"]], sat: [["18:00", "02:00"]] } as WeeklyHours;

  it("자정을 넘기는 영업은 다음 날 새벽에도 열려 있다", () => {
    expect(isOpenNow(late, "listed", new Date("2026-11-14T16:30:00Z"))).toBe(true);
  });
  it("영업 시간 밖이면 닫혀 있다", () => {
    expect(isOpenNow(late, "listed", new Date("2026-11-14T03:00:00Z"))).toBe(false);
  });
  it("자정 넘김의 끝 시각(02:00) 이후는 닫혀 있다", () => {
    expect(isOpenNow(late, "listed", new Date("2026-11-14T17:00:00Z"))).toBe(false); // 서울 일 02:00
  });
  it("같은 날 구간 안이면 열려 있다", () => {
    expect(isOpenNow({ sat: [["11:00", "21:00"]] }, "participating", new Date("2026-11-14T03:00:00Z"))).toBe(true);
  });
  it("휴업이면 시간이 맞아도 닫혀 있다", () => {
    expect(isOpenNow({ sat: [["11:00", "21:00"]] }, "closed", new Date("2026-11-14T03:00:00Z"))).toBe(false);
  });
  it("시간표가 비어 있으면 닫혀 있다", () => {
    expect(isOpenNow({}, "listed", new Date("2026-11-14T03:00:00Z"))).toBe(false);
  });
});
