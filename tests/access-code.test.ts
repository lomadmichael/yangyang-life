import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_CODE_ALPHABET, generateAccessCode, hashAccessCode, normalizeAccessCode } from "../src/lib/access-code";

const PEPPER = "test-pepper-0123456789abcdef0123456789abcdef";

describe("access codes", () => {
  beforeEach(() => vi.stubEnv("YL_CODE_PEPPER", PEPPER));
  afterEach(() => vi.unstubAllEnvs());

  it("8 chars from an alphabet without 0/O/1/I/L", () => {
    expect(ACCESS_CODE_ALPHABET).not.toMatch(/[0O1IL]/);
    for (let i = 0; i < 200; i++) {
      const c = generateAccessCode();
      expect(c).toMatch(/^[A-Z2-9]{8}$/);
      expect(c).not.toMatch(/[0O1IL]/);
    }
  });

  it("codes are not repeated (crypto randomness)", () => {
    const set = new Set(Array.from({ length: 500 }, () => generateAccessCode()));
    expect(set.size).toBe(500);
  });

  it("normalizes what people type (spaces, hyphens, lower case)", () => {
    expect(normalizeAccessCode(" abcd-efgh ")).toBe("ABCDEFGH");
    expect(normalizeAccessCode("abcd efgh")).toBe("ABCDEFGH");
    expect(normalizeAccessCode("ABC")).toBeNull();
    expect(normalizeAccessCode("ABCDEFG0")).toBeNull(); // 혼동 문자는 코드에 없다
  });

  it("hash is deterministic HMAC-SHA256 hex, keyed by the pepper", () => {
    const h = hashAccessCode("ABCDEFGH");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashAccessCode("abcd-efgh")).toBe(h);
    expect(hashAccessCode("ABCDEFGJ")).not.toBe(h);
    vi.stubEnv("YL_CODE_PEPPER", PEPPER + "x");
    expect(hashAccessCode("ABCDEFGH")).not.toBe(h);
  });

  it("refuses to hash without a pepper", () => {
    vi.stubEnv("YL_CODE_PEPPER", "");
    expect(() => hashAccessCode("ABCDEFGH")).toThrow(/YL_CODE_PEPPER/);
  });
});
