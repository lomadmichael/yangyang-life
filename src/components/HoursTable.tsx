import { t, type Lang } from "@/i18n";
import { WEEKDAY_KEYS } from "@/lib/format";
import { seoulParts } from "@/lib/hours";
import type { Weekday, WeeklyHours } from "@/lib/types";

const DAY_ORDER: { key: Weekday; index: number }[] = [
  { key: "mon", index: 1 },
  { key: "tue", index: 2 },
  { key: "wed", index: 3 },
  { key: "thu", index: 4 },
  { key: "fri", index: 5 },
  { key: "sat", index: 6 },
  { key: "sun", index: 0 },
];

/** 요일별 영업시간 (월→일), 오늘 줄은 굵게. 끝 ≤ 시작이면 다음 날 새벽까지라 그대로 "18:00–02:00" */
export function HoursTable({ hours, lang, now }: { hours: WeeklyHours; lang: Lang; now: Date }) {
  const hasAny = DAY_ORDER.some(({ key }) => (hours[key] ?? []).length > 0);
  if (!hasAny) return <p className="text-sm text-muted">{t(lang, "hoursUnknown")}</p>;
  const today = seoulParts(now).weekday;

  return (
    <dl className="grid grid-cols-[3.5rem_1fr] gap-y-1 text-sm">
      {DAY_ORDER.map(({ key, index }) => {
        const ranges = hours[key] ?? [];
        const isToday = index === today;
        return (
          <div key={key} className={`contents ${isToday ? "font-bold" : ""}`}>
            <dt>
              {t(lang, WEEKDAY_KEYS[index])}
              {isToday ? <span className="sr-only"> ({t(lang, "today")})</span> : null}
            </dt>
            <dd className={ranges.length ? "" : "text-muted"}>
              {ranges.length ? ranges.map(([o, c]) => `${o}–${c}`).join(", ") : t(lang, "dayOff")}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
