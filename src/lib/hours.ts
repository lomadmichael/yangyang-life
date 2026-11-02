import type { Place, Weekday, WeeklyHours } from "./types";

const DAY_KEYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const seoulFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 서울 기준 날짜(YYYY-MM-DD)·요일(0=일)·자정 이후 분. 서버 TZ에 의존하지 않는다. */
export function seoulParts(now: Date): { ymd: string; weekday: number; minutes: number } {
  const p: Record<string, string> = {};
  for (const part of seoulFormatter.formatToParts(now)) p[part.type] = part.value;
  return {
    ymd: `${p.year}-${p.month}-${p.day}`,
    weekday: WEEKDAY_INDEX[p.weekday],
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function isOpenNow(hours: WeeklyHours, status: Place["status"], now: Date): boolean {
  if (status === "closed") return false;
  const { weekday, minutes } = seoulParts(now);

  // 오늘 요일의 구간: 시작 이후(같은 날) 이거나, 끝 > 시작이면 끝 이전
  for (const [open, close] of hours[DAY_KEYS[weekday]] ?? []) {
    const s = toMinutes(open);
    const e = toMinutes(close);
    if (e > s ? minutes >= s && minutes < e : minutes >= s) return true;
  }
  // 전날 요일의 자정 넘김 구간(끝 ≤ 시작): 오늘 새벽 끝 시각까지
  for (const [open, close] of hours[DAY_KEYS[(weekday + 6) % 7]] ?? []) {
    const s = toMinutes(open);
    const e = toMinutes(close);
    if (e <= s && minutes < e) return true;
  }
  return false;
}
