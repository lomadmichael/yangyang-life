import { describe, expect, it } from "vitest";
import {
  SAVED_KEY,
  SAVED_MAX,
  isSaved,
  parseSaved,
  readSaved,
  sanitizeSavedInput,
  toggleSaved,
  writeSaved,
} from "../src/lib/saved";

const empty = { place: [], activity: [], story: [] };

describe("saved", () => {
  it("망가진 저장값·막힌 storage", () => {
    expect(parseSaved("{oops")).toEqual({ place: [], activity: [], story: [] });
    expect(parseSaved('{"place":"x"}')).toEqual({ place: [], activity: [], story: [] });
    expect(readSaved(null)).toEqual({ place: [], activity: [], story: [] });
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readSaved(throwing)).toEqual({ place: [], activity: [], story: [] });
    expect(writeSaved(throwing, parseSaved(null))).toBe(false);
  });
  it("예전 형식·이상한 값은 걸러낸다", () => {
    expect(parseSaved("[1,2]")).toEqual(empty);
    expect(parseSaved("null")).toEqual(empty);
    expect(parseSaved('{"place":["a",3,"a","b"],"story":["s"]}')).toEqual({
      place: ["a", "b"],
      activity: [],
      story: ["s"],
    });
  });
  it("toggle: 넣기·빼기·상한", () => {
    const s0 = parseSaved(null);
    const s1 = toggleSaved(s0, "place", "a");
    expect(s1.place).toEqual(["a"]);
    expect(isSaved(s1, "place", "a")).toBe(true);
    expect(isSaved(s1, "story", "a")).toBe(false);
    const s2 = toggleSaved(s1, "place", "b");
    expect(s2.place).toEqual(["b", "a"]); // 새 항목은 앞에
    expect(toggleSaved(toggleSaved(s2, "activity", "x"), "activity", "x")).toEqual(s2);
    expect(toggleSaved(s2, "place", "b")).toEqual(s1);
    expect(s0).toEqual(empty); // 원본은 그대로

    let s = s0;
    for (let i = 1; i <= SAVED_MAX; i++) s = toggleSaved(s, "story", `id${i}`);
    expect(s.story).toHaveLength(SAVED_MAX);
    s = toggleSaved(s, "story", "id101");
    expect(s.story).toHaveLength(100);
    expect(s.story[0]).toBe("id101");
    expect(s.story).not.toContain("id1"); // 가장 오래된 것이 빠짐
    expect(s.story).toContain("id2");
  });
  it("읽기·쓰기 왕복", () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    };
    const s = toggleSaved(parseSaved(null), "activity", "x");
    expect(writeSaved(storage, s)).toBe(true);
    expect(mem.has(SAVED_KEY)).toBe(true);
    expect(readSaved(storage)).toEqual(s);
    expect(writeSaved(null, s)).toBe(false);
    expect(SAVED_KEY).toBe("yl_saved_v1");
  });
  it("sanitizeSavedInput: 서버로 온 값은 믿지 않는다", () => {
    const A = "11111111-1111-4111-8111-111111111111";
    const B = "22222222-2222-4222-8222-222222222222";
    expect(sanitizeSavedInput(null)).toEqual(empty);
    expect(sanitizeSavedInput("x")).toEqual(empty);
    expect(sanitizeSavedInput([A])).toEqual(empty);
    expect(sanitizeSavedInput({ place: A })).toEqual(empty);
    expect(
      sanitizeSavedInput({ place: [A, "not-a-uuid", 3, B, A, "' or 1=1"], activity: [B], story: [{}], extra: [A] }),
    ).toEqual({ place: [A, B], activity: [B], story: [] });
    const many = Array.from({ length: 150 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    const out = sanitizeSavedInput({ place: many, activity: [], story: many });
    expect(out.place).toHaveLength(SAVED_MAX);
    expect(out.place[0]).toBe(many[0]); // 저장 순서 유지, 앞 100개
    expect(out.story).toHaveLength(SAVED_MAX);
  });
});
