// 홈 「지금 양양」 띠 — 날씨·기온·바람·파도·일출을 Open-Meteo(https://open-meteo.com, 키 없음, CC BY 4.0 → 푸터에 출처 표기)
// 에서 서버가 가져온다. 요청에는 아래 고정 좌표와 받을 항목 이름만 넣는다(방문자 정보 없음).
// 값이 없거나 요청이 실패하면 그 칸은 null — 화면은 그 칸만 숨긴다. 대체값을 지어내지 않는다.
// 아래 parse* · weatherKind · oneDecimal 은 순수 함수(tests/now-yangyang.test.ts).

/** 현남면 죽도해변 근처 바다 쪽 고정 좌표 */
export const NOW_COORDS = { lat: 37.97, lng: 128.77 } as const;

const FORECAST_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${NOW_COORDS.lat}&longitude=${NOW_COORDS.lng}` +
  "&current=temperature_2m,weather_code,wind_speed_10m&daily=sunrise&timezone=Asia%2FSeoul&forecast_days=1&wind_speed_unit=ms";
const MARINE_URL =
  `https://marine-api.open-meteo.com/v1/marine?latitude=${NOW_COORDS.lat}&longitude=${NOW_COORDS.lng}` +
  "&current=wave_height,wave_period&timezone=Asia%2FSeoul";

/** 30분마다 새로 받는다 */
export const NOW_REVALIDATE_SECONDS = 1800;

export type NowForecast = {
  /** 기온 °C */
  tempC: number | null;
  /** WMO 날씨 코드 */
  code: number | null;
  /** 바람 m/s (10m 높이) */
  windMs: number | null;
  /** 오늘 일출 "HH:MM" (서울) */
  sunrise: string | null;
};

export type NowMarine = {
  /** 파고 m */
  waveM: number | null;
  /** 파도 주기 초 */
  wavePeriodS: number | null;
};

export type NowYangyang = NowForecast & NowMarine;

export const EMPTY_FORECAST: NowForecast = { tempC: null, code: null, windMs: null, sunrise: null };
export const EMPTY_MARINE: NowMarine = { waveM: null, wavePeriodS: null };

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** forecast API 응답 → 값. 모양이 다르거나 값이 이상하면 그 칸만 null */
export function parseForecast(json: unknown): NowForecast {
  const root = obj(json);
  const cur = obj(root?.current);
  const daily = obj(root?.daily);
  const tempC = num(cur?.temperature_2m);
  const code = num(cur?.weather_code);
  const windMs = num(cur?.wind_speed_10m);
  const sunriseRaw = Array.isArray(daily?.sunrise) ? daily.sunrise[0] : null;
  // "2026-11-25T07:15" (timezone=Asia/Seoul 로 받은 현지 시각) → "07:15"
  const m = typeof sunriseRaw === "string" ? sunriseRaw.match(/T(\d{2}):(\d{2})/) : null;
  return {
    tempC: tempC !== null && tempC > -60 && tempC < 60 ? tempC : null,
    code: code !== null && Number.isInteger(code) && code >= 0 && code <= 99 ? code : null,
    windMs: windMs !== null && windMs >= 0 && windMs < 100 ? windMs : null,
    sunrise: m ? `${m[1]}:${m[2]}` : null,
  };
}

/** marine API 응답 → 값 */
export function parseMarine(json: unknown): NowMarine {
  const cur = obj(obj(json)?.current);
  const waveM = num(cur?.wave_height);
  const wavePeriodS = num(cur?.wave_period);
  return {
    waveM: waveM !== null && waveM >= 0 && waveM < 30 ? waveM : null,
    wavePeriodS: wavePeriodS !== null && wavePeriodS > 0 && wavePeriodS < 40 ? wavePeriodS : null,
  };
}

export type WeatherKind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "shower" | "storm";

/** WMO 날씨 코드(https://open-meteo.com/en/docs) → 화면 낱말 갈래. 모르는 코드는 null(낱말 없이 기온만) */
export function weatherKind(code: number | null): WeatherKind | null {
  if (code === null) return null;
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || code === 80 || code === 81 || code === 82) return code >= 80 ? "shower" : "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95 && code <= 99) return "storm";
  return null;
}

/** 소수 첫째 자리 (0.98 → "1.0", 5.1 → "5.1") */
export function oneDecimal(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    next: { revalidate: NOW_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return res.json();
}

/** 서버에서만 부른다. 실패해도 던지지 않고 빈 칸(null)으로 돌려준다 */
export async function fetchNowYangyang(): Promise<NowYangyang> {
  const [forecast, marine] = await Promise.all([
    getJson(FORECAST_URL).then(parseForecast, () => EMPTY_FORECAST),
    getJson(MARINE_URL).then(parseMarine, () => EMPTY_MARINE),
  ]);
  return { ...forecast, ...marine };
}
