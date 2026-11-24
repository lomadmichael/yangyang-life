import type { Place } from "./types";

// 장소 사진·전화 표시 규칙 — 서버 전용 모듈을 쓰지 않는 순수 함수(공개 화면·관리 화면·관리 미리보기가 같이 쓴다).

/**
 * 장소 사진을 보여 주거나 올릴 수 있는지 — 0004 의 places_public.photos 규칙과 같다.
 * 참여 가게(사장님 동의) 또는 해변·명소(동의할 사장님이 없는 풍경 사진).
 * 공개 뷰가 이미 비워 주지만 화면에서도 한 번 더 막는다(0004 적용 전 뷰는 해변 사진을 비워 보낸다 → 그냥 안 보임).
 */
export function canShowPlacePhotos(place: Pick<Place, "status" | "category">): boolean {
  return place.status === "participating" || place.category === "spot";
}

/** 전화번호 — 0004 적용 전 DB 에는 phone 칸이 없다(undefined). 없거나 비면 null */
export function placePhone(place: { phone?: string | null }): string | null {
  const v = typeof place.phone === "string" ? place.phone.trim() : "";
  return v ? v : null;
}

/** tel: 링크 — 숫자만 남긴다 */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9]/g, "")}`;
}
