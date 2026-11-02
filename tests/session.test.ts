import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession, readSession } from "../src/lib/session";

const SECRET = "test-session-secret-0123456789abcdef0123456789abcdef";

describe("session (brief)", () => {
  beforeEach(() => {
    vi.stubEnv("YL_SESSION_SECRET", SECRET);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("round-trips a contributor id", () => {
    const tok = makeSession("c1");
    expect(readSession(tok)).toEqual({ contributorId: "c1" });
  });

  it("rejects a forged token (last char changed — Ruling R4)", () => {
    const tok = makeSession("c1");
    const last = tok.slice(-1);
    expect(readSession(tok.slice(0, -1) + (last === "0" ? "1" : "0"))).toBeNull();
  });

  it("rejects a token whose id was swapped", () => {
    const tok = makeSession("c1");
    expect(readSession(tok.replace(/^c1\./, "c2."))).toBeNull();
  });

  it("rejects missing / malformed tokens", () => {
    expect(readSession(undefined)).toBeNull();
    expect(readSession("")).toBeNull();
    expect(readSession("garbage")).toBeNull();
    expect(readSession("a.b.c.d")).toBeNull();
  });

  it("expires after 12 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-14T09:00:00+09:00"));
    const tok = makeSession("c1");
    vi.setSystemTime(new Date("2026-11-14T20:59:00+09:00"));
    expect(readSession(tok)).toEqual({ contributorId: "c1" });
    vi.setSystemTime(new Date("2026-11-14T22:00:00+09:00")); // 13시간 뒤
    expect(readSession(tok)).toBeNull();
  });

  it("a token signed with another secret is rejected", () => {
    const tok = makeSession("c1");
    vi.stubEnv("YL_SESSION_SECRET", SECRET.replace("test", "evil"));
    expect(readSession(tok)).toBeNull();
  });

  it("refuses to work without a secret (no fallback)", () => {
    vi.stubEnv("YL_SESSION_SECRET", "");
    expect(() => makeSession("c1")).toThrow(/YL_SESSION_SECRET/);
    expect(() => readSession("c1.1.abc")).toThrow(/YL_SESSION_SECRET/);
  });
});
