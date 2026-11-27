import { describe, expect, it } from "vitest";
import {
  COAST,
  distanceKm,
  focusViewBox,
  formatDistance,
  inMap,
  MAP_BOUNDS,
  MAP_H,
  MAP_W,
  nearest,
  project,
  smoothPath,
  toPercent,
} from "../src/lib/sketch-map";

describe("project", () => {
  it("북서 모서리는 0,0 · 남동 모서리는 그림 끝", () => {
    const [x0, y0] = project(MAP_BOUNDS.lat0, MAP_BOUNDS.lng0);
    expect(x0).toBeCloseTo(0);
    expect(y0).toBeCloseTo(0);
    const [x1, y1] = project(MAP_BOUNDS.lat1, MAP_BOUNDS.lng1);
    expect(x1).toBeCloseTo(MAP_W, 0);
    expect(y1).toBeCloseTo(MAP_H, 0);
  });

  it("남쪽일수록 아래, 동쪽일수록 오른쪽", () => {
    const north = project(37.98, 128.76);
    const south = project(37.95, 128.76);
    const east = project(37.98, 128.78);
    expect(south[1]).toBeGreaterThan(north[1]);
    expect(east[0]).toBeGreaterThan(north[0]);
  });

  it("그림 크기는 시안과 같은 645 × 1000", () => {
    expect(MAP_W).toBe(645);
    expect(MAP_H).toBe(1000);
  });
});

describe("inMap", () => {
  it("현남면 해안 안쪽은 참, 바깥·이상한 값은 거짓", () => {
    expect(inMap(37.96122, 128.76745)).toBe(true); // 휴휴암
    expect(inMap(37.75, 128.9)).toBe(false); // 강릉 쪽
    expect(inMap(Number.NaN, 128.76)).toBe(false);
    expect(inMap(null, 128.76)).toBe(false);
  });
});

describe("smoothPath", () => {
  it("M 로 시작하고 점 사이마다 C 하나", () => {
    const d = smoothPath(COAST);
    expect(d.startsWith("M")).toBe(true);
    expect(d.match(/C/g)?.length).toBe(COAST.length - 1);
  });
  it("빈 배열은 빈 문자열", () => {
    expect(smoothPath([])).toBe("");
  });
});

describe("focusViewBox", () => {
  it("가운데 있는 곳은 그 점이 창 한가운데", () => {
    const vb = focusViewBox(37.96, 128.77, 330);
    const [x, y] = project(37.96, 128.77);
    expect(vb[0] + vb[2] / 2).toBeCloseTo(x);
    expect(vb[1] + vb[3] / 2).toBeCloseTo(y);
  });
  it("가장자리 장소는 그림 밖으로 나가지 않게 민다", () => {
    const vb = focusViewBox(MAP_BOUNDS.lat0, MAP_BOUNDS.lng0, 330);
    expect(vb[0]).toBe(0);
    expect(vb[1]).toBe(0);
    const vb2 = focusViewBox(MAP_BOUNDS.lat1, MAP_BOUNDS.lng1, 330);
    expect(vb2[0]).toBeCloseTo(MAP_W - 330);
    expect(vb2[1]).toBeCloseTo(MAP_H - 330);
  });
});

describe("toPercent", () => {
  it("창 안 위치를 백분율로", () => {
    expect(toPercent([50, 25], [0, 0, 100, 100])).toEqual([50, 25]);
    expect(toPercent([150, 150], [100, 100, 100, 100])).toEqual([50, 50]);
  });
});

describe("distanceKm · formatDistance", () => {
  it("같은 점은 0, 위도 0.01도는 약 1.11km", () => {
    expect(distanceKm({ lat: 37.96, lng: 128.76 }, { lat: 37.96, lng: 128.76 })).toBe(0);
    expect(distanceKm({ lat: 37.96, lng: 128.76 }, { lat: 37.97, lng: 128.76 })).toBeCloseTo(1.112, 2);
  });
  it("1km 미만은 10m 단위, 이상은 소수 한 자리 km", () => {
    expect(formatDistance(0.7349)).toBe("730m");
    expect(formatDistance(0.001)).toBe("10m");
    expect(formatDistance(0.998)).toBe("1.0km");
    expect(formatDistance(1.26)).toBe("1.3km");
  });
});

describe("nearest", () => {
  const list = [
    { id: "a", lat: 37.96, lng: 128.76 },
    { id: "b", lat: 37.961, lng: 128.76 },
    { id: "c", lat: 37.97, lng: 128.76 },
    { id: "d", lat: 37.9605, lng: 128.76 },
    { id: "e", lat: Number.NaN, lng: 128.76 },
  ];
  it("자기 자신과 좌표 없는 곳을 빼고 가까운 순", () => {
    const r = nearest(list[0], list, 3);
    expect(r.map((x) => x.item.id)).toEqual(["d", "b", "c"]);
  });
});
