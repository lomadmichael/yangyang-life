import type { Lang } from "../i18n";
import { isOpenNow, seoulParts } from "./hours";
import type { Place, Weekday, WeeklyHours } from "./types";

// 장소 화면(홈 색인·장소 목록·상세·약도)이 같이 쓰는 표시용 순수 함수.

/** 이름 — 영문 화면은 name_en → name_roman → name_ko(이때 fallback=true). sub = 이름 옆 작은 글자 */
export function placeName(
  p: Pick<Place, "name_ko" | "name_en" | "name_roman">,
  lang: Lang,
): { text: string; fallback: boolean; sub: string | null } {
  const en = p.name_en?.trim();
  const roman = p.name_roman?.trim();
  if (lang === "ko") return { text: p.name_ko, fallback: false, sub: roman || null };
  if (en) return { text: en, fallback: false, sub: p.name_ko };
  if (roman) return { text: roman, fallback: false, sub: p.name_ko };
  return { text: p.name_ko, fallback: true, sub: null };
}

export type PlaceState = "open" | "later" | "shut" | "none";

export function hasHours(hours: WeeklyHours | null | undefined): boolean {
  return Object.values(hours ?? {}).some((v) => (v?.length ?? 0) > 0);
}

/** 지금 상태 — 영업 중 / 지금은 닫힘(시간 정보 있음) / 휴업 / 시간 정보 없음 */
export function placeState(p: Pick<Place, "hours" | "status">, now: Date): PlaceState {
  if (p.status === "closed") return "shut";
  if (isOpenNow(p.hours ?? {}, p.status, now)) return "open";
  return hasHours(p.hours) ? "later" : "none";
}

const DAY_KEYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** 월→일 순서 요일 키 */
export const WEEK_MON_FIRST: { key: Weekday; index: number }[] = [1, 2, 3, 4, 5, 6, 0].map((index) => ({ key: DAY_KEYS[index], index }));

/** 서울 기준 오늘의 영업 구간 「09:00–18:00」 (여러 구간은 쉼표). 없으면 null */
export function todayHoursText(hours: WeeklyHours | null | undefined, now: Date): string | null {
  const ranges = (hours ?? {})[DAY_KEYS[seoulParts(now).weekday]] ?? [];
  return ranges.length ? ranges.map(([o, c]) => `${o}–${c}`).join(", ") : null;
}

/** 대표 카드로 올릴 곳 고르기 점수 — 자체 사진 > 참여 가게 > 지금 영업 중 */
export function featureScore(p: { ownPhoto: boolean; participating: boolean; open: boolean }): number {
  return (p.ownPhoto ? 4 : 0) + (p.participating ? 2 : 0) + (p.open ? 1 : 0);
}

/** 동네 안 장소 수에 따른 대표 카드 수 (나머지는 행 목록) */
export function featureCount(n: number): number {
  if (n >= 5) return 3;
  if (n >= 2) return 2;
  return n;
}

/** 가격·영어 메뉴 대신 편의(주차·화장실·샤워장)를 보여 주는 분류 — 해변·명소, 생활 편의 */
export function isAmenityCategory(category: Place["category"]): boolean {
  return category === "spot" || category === "life";
}

/**
 * 화면 가득 표지의 큰 제목 크기 단계 — 장소·놀거리·이야기 상세가 같이 쓴다(magazine CSS 의 .sz-xl … .sz-xs).
 * 한글 한 글자 = 1, 그 밖(영문·숫자·공백)은 0.55 로 센 글자 폭 기준.
 */
export function coverTitleSize(title: string): "sz-xl" | "sz-l" | "sz-m" | "sz-s" | "sz-xs" {
  const chars = [...title];
  const hangul = chars.filter((c) => /[ㄱ-힣]/.test(c)).length;
  const w = hangul + (chars.length - hangul) * 0.55;
  if (w <= 3.6) return "sz-xl";
  if (w <= 5.8) return "sz-l";
  if (w <= 10) return "sz-m";
  if (w <= 18) return "sz-s";
  return "sz-xs";
}
