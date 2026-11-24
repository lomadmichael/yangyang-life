// 현남면 바닷가를 북→남 네 동네로 묶는다 — 위도만 본다(해안선이 남북으로 길게 뻗어 있어서).
// 경계 위도는 디자인 명세(yangyang-design/out/v3/d/app.js GROUPS)의 묶음과 같은 결과가 나오게 정했다:
//   동산포·죽도 ≥ 37.9715 > 인구 ≥ 37.9655 > 휴휴암·남애해변 ≥ 37.95 > 남애항
// 현남면 바깥이거나 좌표가 이상하면 「그 밖」.

export type Hood = "dongsan" | "ingu" | "hyuhyu" | "namae" | "other";

/** 북→남 순서 (「그 밖」은 맨 뒤) */
export const HOODS: readonly Hood[] = ["dongsan", "ingu", "hyuhyu", "namae", "other"];

const MIN_LAT: { hood: Exclude<Hood, "other">; min: number }[] = [
  { hood: "dongsan", min: 37.9715 },
  { hood: "ingu", min: 37.9655 },
  { hood: "hyuhyu", min: 37.95 },
  { hood: "namae", min: -Infinity },
];

/** 현남면 바닷가로 보는 범위 (넉넉하게 — 약도 범위보다 조금 넓다) */
const HYEONNAM = { latMax: 37.995, latMin: 37.925, lngMin: 128.74, lngMax: 128.8 };

export function neighborhoodOf(p: { lat: unknown; lng: unknown }): Hood {
  const { lat, lng } = p;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return "other";
  if (lat > HYEONNAM.latMax || lat < HYEONNAM.latMin || lng < HYEONNAM.lngMin || lng > HYEONNAM.lngMax) return "other";
  for (const g of MIN_LAT) if (lat >= g.min) return g.hood;
  return "other";
}

/** 동네별로 묶어 북→남 순서로. 빈 동네는 뺀다. 묶음 안 순서는 넘겨준 순서 그대로 */
export function groupByNeighborhood<T extends { lat: unknown; lng: unknown }>(items: readonly T[]): { hood: Hood; items: T[] }[] {
  const by = new Map<Hood, T[]>();
  for (const it of items) {
    const h = neighborhoodOf(it);
    by.set(h, [...(by.get(h) ?? []), it]);
  }
  return HOODS.filter((h) => by.has(h)).map((hood) => ({ hood, items: by.get(hood)! }));
}

/**
 * 장소 번호 — 북쪽(위도 큰 곳)부터 "01". 같은 위도면 이름 순. 약도 핀·색인·상세가 같은 번호를 쓴다.
 * 좌표가 없는 곳은 맨 뒤.
 */
export function numberPlaces(places: readonly { id: string; lat: number; name_ko: string }[]): Map<string, string> {
  const lat = (v: number) => (Number.isFinite(v) ? v : -Infinity);
  const sorted = [...places].sort((a, b) => lat(b.lat) - lat(a.lat) || a.name_ko.localeCompare(b.name_ko, "ko"));
  return new Map(sorted.map((p, i) => [p.id, String(i + 1).padStart(2, "0")]));
}
