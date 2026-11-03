import { describe, expect, it } from "vitest";
import { GUIDE_STALE_DAYS, STALE_DAYS, isStale } from "../src/lib/stale";

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
