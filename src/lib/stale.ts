// 재확인 기준: 마지막 확인일에서 이 날수가 지나면 「다시 확인할 때」로 본다.

/** 장소·놀거리 */
export const STALE_DAYS = 90;
/** 가이드 이야기 */
export const GUIDE_STALE_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 확인일이 없거나 days 일을 넘겼으면 true. 시각 차이만 보므로 시간대와 무관하다 */
export function isStale(verifiedAt: string | null, now: Date, days = STALE_DAYS): boolean {
  if (!verifiedAt) return true;
  return now.getTime() - new Date(verifiedAt).getTime() > days * DAY_MS;
}
