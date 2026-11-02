import { seoulParts } from "./hours";
import type { Activity } from "./types";

/** 시작일·끝나는 날(각각 선택) 안에 오늘이 들어가는지 */
function inWindow(a: Activity, ymd: string): boolean {
  return (a.starts_on === null || a.starts_on <= ymd) && (a.ends_on === null || a.ends_on >= ymd);
}

/**
 * 오늘(서울) 할 거리: 진행 중 dated(끝나는 날 가까운 순) → 해당 요일 always(입력 순서)
 * always 의 요일이 비어 있으면 「매일」. always 도 시작일·끝나는 날이 있으면 그 기간만.
 */
export function activitiesForDay(
  list: Activity[],
  now: Date,
  opts: { rainy?: boolean } = {},
): Activity[] {
  const { ymd, weekday } = seoulParts(now);
  const usable = opts.rainy ? list.filter((a) => a.rainy_ok) : list;

  const dated = usable
    .filter((a) => a.kind === "dated" && inWindow(a, ymd))
    .sort((a, b) => (a.ends_on ?? "9999-12-31").localeCompare(b.ends_on ?? "9999-12-31"));

  const always = usable.filter(
    (a) =>
      a.kind === "always" &&
      (a.weekdays.length === 0 || a.weekdays.includes(weekday)) &&
      inWindow(a, ymd),
  );

  return [...dated, ...always];
}
