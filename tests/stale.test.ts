import { describe, expect, it } from "vitest";
import { GUIDE_STALE_DAYS, STALE_DAYS, activityNeedsRecheck, isStale } from "../src/lib/stale";

describe("isStale", () => {
  it("90일·180일", () => {
    const now = new Date("2026-11-14T00:00:00Z");
    expect(isStale("2026-08-15T00:00:00Z", now)).toBe(true); // 91일
    expect(isStale("2026-08-17T00:00:00Z", now)).toBe(false); // 89일
    expect(isStale("2026-08-15T00:00:00Z", now, GUIDE_STALE_DAYS)).toBe(false);
    expect(isStale(null, now)).toBe(true);
  });
  it("기준일 상수", () => {
    expect(STALE_DAYS).toBe(90);
    expect(GUIDE_STALE_DAYS).toBe(180);
  });
});

describe("activityNeedsRecheck (관리 홈 개수 = 재확인 목록)", () => {
  // 서울 2026-11-14 오전 0시 30분 = UTC 11-13 15:30 — 서울 날짜로 판정해야 한다
  const now = new Date("2026-11-13T15:30:00Z");
  const old = "2026-01-01T00:00:00Z";
  const base = { kind: "always" as const, starts_on: null, ends_on: null, verified_at: old };
  it("끝난 기간 행사는 오래돼도 빠진다", () => {
    expect(activityNeedsRecheck({ ...base, kind: "dated", starts_on: "2026-10-01", ends_on: "2026-11-13" }, now)).toBe(false);
    expect(activityNeedsRecheck({ ...base, kind: "dated", starts_on: "2026-11-13", ends_on: null }, now)).toBe(false);
    expect(activityNeedsRecheck({ ...base, kind: "dated", starts_on: "2026-10-01", ends_on: "2026-11-14" }, now)).toBe(true);
  });
  it("상시·확인 기록 없음", () => {
    expect(activityNeedsRecheck(base, now)).toBe(true);
    expect(activityNeedsRecheck({ ...base, verified_at: null }, now)).toBe(true);
    expect(activityNeedsRecheck({ ...base, verified_at: "2026-11-01T00:00:00Z" }, now)).toBe(false);
    expect(activityNeedsRecheck({ ...base, kind: "always", ends_on: "2026-01-01" }, now)).toBe(true);
  });
});
