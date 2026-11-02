import { seoulParts } from "./hours";
import type { Activity } from "./types";

/** 오늘(서울) 할 거리: 진행 중 dated(끝나는 날 가까운 순) → 해당 요일 always(입력 순서) */
export function activitiesForDay(
  list: Activity[],
  now: Date,
  opts: { rainy?: boolean } = {},
): Activity[] {
  const { ymd, weekday } = seoulParts(now);
  const usable = opts.rainy ? list.filter((a) => a.rainy_ok) : list;

  const dated = usable
    .filter(
      (a) =>
        a.kind === "dated" &&
        (a.starts_on === null || a.starts_on <= ymd) &&
        (a.ends_on === null || a.ends_on >= ymd),
    )
    .sort((a, b) => (a.ends_on ?? "9999-12-31").localeCompare(b.ends_on ?? "9999-12-31"));

  const always = usable.filter((a) => a.kind === "always" && a.weekdays.includes(weekday));

  return [...dated, ...always];
}
