import { describe, expect, it } from "vitest";
import { canPost, validateTip } from "../src/lib/tips";

describe("validateTip (brief)", () => {
  it("accepts a normal tip", () => {
    expect(validateTip({ kind: "tip", body: "해 질 녘 2층 창가 자리가 좋아요", nickname: "서퍼" })).toEqual({ ok: true });
  });
  it("rejects too-short body", () => {
    expect(validateTip({ kind: "tip", body: "a", nickname: "x" })).toEqual({ ok: false, reason: "length" });
  });
  it("rejects links", () => {
    expect(validateTip({ kind: "tip", body: "여기 보세요 https://ad.example", nickname: "x" })).toMatchObject({ reason: "link" });
    expect(validateTip({ kind: "tip", body: "예약 www.abc.com", nickname: "x" })).toMatchObject({ reason: "link" });
  });
  it("rejects phone numbers in the body", () => {
    expect(validateTip({ kind: "tip", body: "연락 010-1234-5678", nickname: "x" })).toMatchObject({ reason: "phone" });
  });
  it("allows a phone number in the private contact field", () => {
    expect(
      validateTip({ kind: "changed", body: "월요일 휴무로 바뀜", nickname: "사장", contact: "010-1234-5678" }),
    ).toEqual({ ok: true });
  });
  it("rejects unknown kinds", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validateTip({ kind: "review", body: "좋아요", nickname: "x" } as any)).toMatchObject({ reason: "kind" });
  });
});

describe("validateTip (controller rulings)", () => {
  it("nickname: trimmed, 1–20 chars", () => {
    expect(validateTip({ kind: "tip", body: "좋아요 좋아요", nickname: "   " })).toEqual({ ok: false, reason: "nickname" });
    expect(validateTip({ kind: "tip", body: "좋아요 좋아요", nickname: "가".repeat(21) })).toEqual({ ok: false, reason: "nickname" });
    expect(validateTip({ kind: "tip", body: "좋아요 좋아요", nickname: `  ${"가".repeat(20)}  ` })).toEqual({ ok: true });
  });
  it("body: trimmed, 2–500 chars", () => {
    expect(validateTip({ kind: "tip", body: "  a  ", nickname: "x" })).toEqual({ ok: false, reason: "length" });
    expect(validateTip({ kind: "tip", body: "가".repeat(500), nickname: "x" })).toEqual({ ok: true });
    expect(validateTip({ kind: "tip", body: "가".repeat(501), nickname: "x" })).toEqual({ ok: false, reason: "length" });
  });
  it("check order: kind → nickname → length → link → phone", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validateTip({ kind: "nope", body: "a", nickname: "" } as any)).toMatchObject({ reason: "kind" });
    expect(validateTip({ kind: "tip", body: "a", nickname: "" })).toMatchObject({ reason: "nickname" });
    expect(validateTip({ kind: "tip", body: "a", nickname: "x" })).toMatchObject({ reason: "length" });
    expect(validateTip({ kind: "tip", body: "abc.com 010-1234-5678", nickname: "x" })).toMatchObject({ reason: "link" });
  });
  it.each([
    "http://x.kr 참고",
    "HTTPS://Example.com",
    "www.naver.com 검색",
    "abc.com 가보세요",
    "naver.me/x 지도",
    "인스타 shop.co.kr 에서",
  ])("detects link: %s", (body) => {
    expect(validateTip({ kind: "tip", body, nickname: "x" })).toMatchObject({ reason: "link" });
  });
  it.each(["010-1234-5678", "01012345678", "010 1234 5678", "033-123-4567", "0336721234", "+82 10 1234 5678", "+82-10-1234-5678", "02-123-4567", "010.1234.5678"])(
    "detects phone: %s",
    (p) => {
      expect(validateTip({ kind: "tip", body: `문의 ${p} 로`, nickname: "x" })).toMatchObject({ reason: "phone" });
    },
  );
  it.each([
    "2층 창가 자리 3개, 오후 5시 30분쯤이 좋아요",
    "주차 2.5시간 무료, 가격은 12,000원",
    "버스 9-1번 타고 10분",
    "Order the No.1 set, it's great.",
    "2026.11.14 행사 있어요",
  ])("does not flag ordinary text: %s", (body) => {
    expect(validateTip({ kind: "tip", body, nickname: "x" })).toEqual({ ok: true });
  });
});

describe("canPost", () => {
  it("brief cases", () => {
    expect(canPost([new Date("2026-11-14T01:00:00Z")], new Date("2026-11-14T01:00:30Z"))).toBe(false);
    expect(canPost([], new Date())).toBe(true);
  });
  it("allows after 60 seconds", () => {
    expect(canPost([new Date("2026-11-14T01:00:00Z")], new Date("2026-11-14T01:01:00Z"))).toBe(true);
  });
  it("blocks the 11th within 24h, allows once the oldest ages out", () => {
    const base = new Date("2026-11-14T00:00:00Z").getTime();
    const ten = Array.from({ length: 10 }, (_, i) => new Date(base + i * 3600_000)); // 00:00 ~ 09:00
    expect(canPost(ten, new Date(base + 10 * 3600_000))).toBe(false);
    expect(canPost(ten.slice(0, 9), new Date(base + 10 * 3600_000))).toBe(true);
    expect(canPost(ten, new Date(base + 24 * 3600_000 + 1))).toBe(true); // 첫 건이 24시간 밖으로
  });
});
