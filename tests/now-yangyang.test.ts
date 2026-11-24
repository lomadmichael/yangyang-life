import { describe, expect, it } from "vitest";
import { oneDecimal, parseForecast, parseMarine, weatherKind } from "../src/lib/now-yangyang";

describe("parseForecast", () => {
  it("Open-Meteo forecast 응답에서 기온·날씨 코드·바람·일출(HH:MM)을 꺼낸다", () => {
    const json = {
      current: { time: "2026-11-25T03:00", temperature_2m: -1.1, weather_code: 0, wind_speed_10m: 9.01 },
      daily: { time: ["2026-11-25"], sunrise: ["2026-11-25T07:15"] },
    };
    expect(parseForecast(json)).toEqual({ tempC: -1.1, code: 0, windMs: 9.01, sunrise: "07:15" });
  });

  it("빠지거나 이상한 값은 그 칸만 null — 지어내지 않는다", () => {
    expect(parseForecast({ current: { temperature_2m: null, weather_code: "x" }, daily: { sunrise: [] } })).toEqual({
      tempC: null,
      code: null,
      windMs: null,
      sunrise: null,
    });
    expect(parseForecast({ current: { temperature_2m: 999, weather_code: 3.5, wind_speed_10m: -2 } })).toEqual({
      tempC: null,
      code: null,
      windMs: null,
      sunrise: null,
    });
  });

  it("응답이 객체가 아니어도 던지지 않는다", () => {
    for (const bad of [null, undefined, "error", 42, []]) {
      expect(parseForecast(bad)).toEqual({ tempC: null, code: null, windMs: null, sunrise: null });
    }
  });
});

describe("parseMarine", () => {
  it("파고·주기를 꺼낸다", () => {
    expect(parseMarine({ current: { wave_height: 0.98, wave_period: 5.1 } })).toEqual({ waveM: 0.98, wavePeriodS: 5.1 });
  });

  it("값이 없으면 null", () => {
    expect(parseMarine({ current: { wave_height: null } })).toEqual({ waveM: null, wavePeriodS: null });
    expect(parseMarine({ error: true, reason: "No data" })).toEqual({ waveM: null, wavePeriodS: null });
    expect(parseMarine(null)).toEqual({ waveM: null, wavePeriodS: null });
  });
});

describe("weatherKind", () => {
  it("WMO 코드를 갈래로", () => {
    expect(weatherKind(0)).toBe("clear");
    expect(weatherKind(2)).toBe("partly");
    expect(weatherKind(3)).toBe("cloudy");
    expect(weatherKind(45)).toBe("fog");
    expect(weatherKind(53)).toBe("drizzle");
    expect(weatherKind(63)).toBe("rain");
    expect(weatherKind(81)).toBe("shower");
    expect(weatherKind(73)).toBe("snow");
    expect(weatherKind(95)).toBe("storm");
  });

  it("모르는 코드·없음은 null", () => {
    expect(weatherKind(null)).toBeNull();
    expect(weatherKind(4)).toBeNull();
  });
});

describe("oneDecimal", () => {
  it("소수 첫째 자리", () => {
    expect(oneDecimal(0.98)).toBe("1.0");
    expect(oneDecimal(5.1)).toBe("5.1");
    expect(oneDecimal(-1.14)).toBe("-1.1");
  });
});
