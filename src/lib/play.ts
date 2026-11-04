import { seoulParts } from "./hours";
import { activitiesForDay } from "./today";
import type { Activity, PlayCategory } from "./types";

/** 운영 계절 안인지 (서울 기준 이번 달). 빈 배열 = 사계절. 11·12·1월처럼 해를 넘겨도 달 목록이라 그대로 맞다 */
export function inSeason(a: Pick<Activity, "season_months">, now: Date): boolean {
  if (a.season_months.length === 0) return true;
  const month = Number(seoulParts(now).ymd.slice(5, 7));
  return a.season_months.includes(month);
}

/** 이미 끝난 기간 행사인가 — dated 이고 마지막 날(끝나는 날, 없으면 시작일)이 서울 오늘보다 앞 */
export function activityEnded(a: Pick<Activity, "kind" | "starts_on" | "ends_on">, now: Date): boolean {
  const lastDay = a.ends_on ?? a.starts_on;
  return a.kind === "dated" && !!lastDay && lastDay < seoulParts(now).ymd;
}

/**
 * 장소 상세 「여기서 할 수 있는 놀거리」: 끝난 기간 행사는 빼고, 비시즌은 뒤로(offSeason=true → 흐리게).
 * 같은 묶음 안의 순서는 들어온 순서 그대로.
 */
export function placeActivities(list: Activity[], now: Date): { activity: Activity; offSeason: boolean }[] {
  const live = list.filter((a) => !activityEnded(a, now));
  // 0003 적용 전 DB 에는 season_months 칸이 없을 수 있다 → 사계절로 본다
  const tagged = live.map((a) => ({ activity: a, offSeason: !inSeason({ season_months: a.season_months ?? [] }, now) }));
  return [...tagged.filter((x) => !x.offSeason), ...tagged.filter((x) => x.offSeason)];
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
