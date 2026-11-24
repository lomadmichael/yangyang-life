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

/**
 * 자체 사진이 없을 때 분류 대표 사진(public/images)을 대신 써도 되는 장소인지 — 해변·명소만.
 * 가게(식당·카페·숙소·서핑샵 등)에 분류 대표 사진을 깔면 그 가게의 음식·시설로 오해된다(예: 횟집에 막국수 사진)
 * → 가게는 자체 사진이 없으면 색면 표지(분류색 + 가는 무늬 + 큰 이름). 놀거리·이야기는 이 규칙과 별개로 대표 사진을 쓴다.
 */
export function placeUsesCategoryPhoto(place: Pick<Place, "category">): boolean {
  return place.category === "spot";
}

/** 해변·명소의 분류 대표 사진 (public/images, 출처 CREDITS.md) */
const SPOT_PHOTO = "/images/cat-spot.jpg";

/** 장소의 대체 사진(자체 사진이 없을 때) — 해변·명소만 분류 대표 사진, 가게는 null(= 색면). 홈·목록·상세·근처·들른 곳이 같이 쓴다 */
export function placeFallbackPhoto(category: Place["category"]): string | null {
  return placeUsesCategoryPhoto({ category }) ? SPOT_PHOTO : null;
}

/** 장소의 표지로 쓸 자체 사진(첫 장) — 보여 줄 수 있는 곳(canShowPlacePhotos)의 사진만. 없으면 null */
export function placeOwnPhoto(place: Pick<Place, "status" | "category"> & { photos?: string[] | null }): string | null {
  if (!canShowPlacePhotos(place)) return null;
  return (place.photos ?? []).find((p) => typeof p === "string" && p.trim() !== "") ?? null;
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
