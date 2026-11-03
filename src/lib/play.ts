import { seoulParts } from "./hours";
import { activitiesForDay } from "./today";
import type { Activity, PlayCategory } from "./types";

/** 운영 계절 안인지 (서울 기준 이번 달). 빈 배열 = 사계절. 11·12·1월처럼 해를 넘겨도 달 목록이라 그대로 맞다 */
export function inSeason(a: Pick<Activity, "season_months">, now: Date): boolean {
  if (a.season_months.length === 0) return true;
  const month = Number(seoulParts(now).ymd.slice(5, 7));
  return a.season_months.includes(month);
}

/**
 * 놀거리 목록 묶기: 오늘(서울) 볼 수 있는 것(activitiesForDay) → 분류로 거름 → 계절 밖은 offSeason 으로.
 * dated 도 계절 밖이면 offSeason. 각 묶음 안의 순서는 activitiesForDay 순서 그대로.
 */
export function groupPlay(
  list: Activity[],
  now: Date,
  f: { category?: PlayCategory; rainy?: boolean },
): { dated: Activity[]; always: Activity[]; offSeason: Activity[] } {
  const today = activitiesForDay(list, now, { rainy: f.rainy }).filter(
    (a) => !f.category || a.category === f.category,
  );
  const out = { dated: [] as Activity[], always: [] as Activity[], offSeason: [] as Activity[] };
  for (const a of today) {
    if (!inSeason(a, now)) out.offSeason.push(a);
    else if (a.kind === "dated") out.dated.push(a);
    else out.always.push(a);
  }
  return out;
}
