"use client";

import { WEEKDAYS_MON_FIRST, WEEKDAY_KO } from "@/lib/admin-input";
import type { Weekday, WeeklyHours } from "@/lib/types";
import { btnSmall } from "./ui";

// 시간 칸은 좁은 화면에서 「오전 11:00」이 잘리지 않게 안쪽 여백을 줄인다
const timeCls =
  "w-full min-h-11 rounded-lg border border-line bg-surface px-2 py-2 text-base text-ink focus:border-sea focus:outline-none focus:ring-2 focus:ring-sea/30";

/** 요일별 영업 구간 여러 개. 끝 ≤ 시작이면 「다음 날 HH:MM까지」(자정 넘김). 구간이 없으면 휴무 */
export function HoursEditor({ value, onChange }: { value: WeeklyHours; onChange: (v: WeeklyHours) => void }) {
  function setDay(day: Weekday, ranges: [string, string][]) {
    const next: WeeklyHours = { ...value };
    if (ranges.length) next[day] = ranges;
    else delete next[day];
    onChange(next);
  }

  function copyToAll(from: Weekday) {
    const src = value[from] ?? [];
    const next: WeeklyHours = {};
    for (const d of WEEKDAYS_MON_FIRST) if (src.length) next[d] = src.map((r) => [...r] as [string, string]);
    onChange(next);
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">영업시간</legend>
      <p className="text-xs text-muted">
        요일마다 구간을 여러 개 넣을 수 있어요(점심·저녁 따로). 끝나는 시각이 시작보다 이르면 자정을 넘겨 「다음 날」로 봐요. 구간이
        없으면 휴무.
      </p>
      <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
        {WEEKDAYS_MON_FIRST.map((day) => {
          const ranges = value[day] ?? [];
          return (
            <li key={day} className="flex flex-col gap-2 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="w-8 font-bold">{WEEKDAY_KO[day]}</span>
                {ranges.length === 0 ? <span className="flex-1 text-sm text-muted">휴무</span> : <span className="flex-1" />}
                {ranges.length > 0 ? (
                  <button type="button" className={btnSmall} onClick={() => copyToAll(day)}>
                    매일 같게
                  </button>
                ) : null}
                <button
                  type="button"
                  className={btnSmall}
                  onClick={() => setDay(day, [...ranges, ranges.length ? ["17:00", "21:00"] : ["11:00", "20:00"]])}
                  disabled={ranges.length >= 6}
                >
                  + 구간
                </button>
              </div>
              {ranges.map(([s, e], i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-1.5 gap-y-1 pl-1">
                  <input
                    type="time"
                    value={s}
                    aria-label={`${WEEKDAY_KO[day]}요일 ${i + 1}번째 시작`}
                    onChange={(ev) => setDay(day, ranges.map((r, j) => (j === i ? [ev.target.value, r[1]] : r)))}
                    className={timeCls}
                    required
                  />
                  <span aria-hidden>~</span>
                  <input
                    type="time"
                    value={e}
                    aria-label={`${WEEKDAY_KO[day]}요일 ${i + 1}번째 끝`}
                    onChange={(ev) => setDay(day, ranges.map((r, j) => (j === i ? [r[0], ev.target.value] : r)))}
                    className={timeCls}
                    required
                  />
                  <div className="col-span-3 flex items-center justify-between gap-2">
                    {e && s && e <= s ? (
                      <span className="text-xs font-medium text-sea">→ 다음 날 {e}까지 (자정 넘김)</span>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      aria-label="이 구간 빼기"
                      className={btnSmall}
                      onClick={() => setDay(day, ranges.filter((_, j) => j !== i))}
                    >
                      ✕ 빼기
                    </button>
                  </div>
                </div>
              ))}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
