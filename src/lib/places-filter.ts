import { isOpenNow } from "./hours";
import type { Place } from "./types";

export interface PlaceFilter {
  category?: Place["category"];
  openNow?: boolean;
  englishMenu?: boolean;
  price?: 1 | 2 | 3;
}

const STATUS_RANK: Record<Place["status"], number> = { participating: 0, listed: 1, closed: 2 };

/**
 * 「오늘 뭐 먹지」 목록 필터 — 조건은 모두 AND.
 * 정렬: 참여 → 일반 → 휴업, 같은 상태 안에서는 지금 영업 중 먼저, 그다음은 입력 순서 그대로.
 */
export function filterPlaces(places: Place[], f: PlaceFilter, now: Date): Place[] {
  const rows = places.map((p, i) => ({ p, i, open: isOpenNow(p.hours, p.status, now) }));
  return rows
    .filter(({ p, open }) => {
      if (f.category && p.category !== f.category) return false;
      if (f.price && p.price_level !== f.price) return false;
      if (f.englishMenu && !p.has_english_menu) return false;
      if (f.openNow && !open) return false;
      return true;
    })
    .sort(
      (a, b) =>
        STATUS_RANK[a.p.status] - STATUS_RANK[b.p.status] ||
        Number(b.open) - Number(a.open) ||
        a.i - b.i,
    )
    .map(({ p }) => p);
}
