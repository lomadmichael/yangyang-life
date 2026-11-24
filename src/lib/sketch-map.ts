// 손그림 약도의 순수 계산 — 좌표 → 그림 좌표, 해안선 곡선, 확대 렌즈, 직선거리.
// 화면 부품 없이 값·함수만 둔다(테스트에서 바로 부른다). 디자인 명세: yangyang-design/out/v3/d/app.js 「손그림 약도」.
//
// 해안선·도로·지명 위치는 「그림」이다(콘텐츠 아님) — 현남면 해안을 손으로 따라 그린 점들.
// 핀은 화면이 DB 의 실제 장소 좌표로 project() 해서 찍는다.

/** 약도가 그리는 범위 (북 lat0 · 남 lat1 · 서 lng0 · 동 lng1) */
export const MAP_BOUNDS = { lat0: 37.9865, lat1: 37.9315, lng0: 128.7495, lng1: 128.7945 } as const;

/** 경도·위도 1도당 그림 단위 — 위도 38도 부근에서 가로·세로 축척이 같아지게 고른 값 */
const KX = 14327;
const KY = 18182;

/** 그림 전체 폭·높이 (viewBox 단위) */
export const MAP_W = Math.round((MAP_BOUNDS.lng1 - MAP_BOUNDS.lng0) * KX);
export const MAP_H = Math.round((MAP_BOUNDS.lat0 - MAP_BOUNDS.lat1) * KY);

export type Pt = [number, number];
export type LatLng = [number, number];
export type ViewBox = [number, number, number, number];

/** 위도·경도 → 그림 좌표 [x, y] (왼쪽 위가 0,0 · 아래로 갈수록 남쪽) */
export function project(lat: number, lng: number): Pt {
  return [(lng - MAP_BOUNDS.lng0) * KX, (MAP_BOUNDS.lat0 - lat) * KY];
}

/** 약도 범위 안의 좌표인지 — 밖이거나 숫자가 아니면 핀을 찍지 않는다 */
export function inMap(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat <= MAP_BOUNDS.lat0 && lat >= MAP_BOUNDS.lat1 && lng >= MAP_BOUNDS.lng0 && lng <= MAP_BOUNDS.lng1;
}

const f1 = (n: number) => n.toFixed(1);

/** 점들을 지나는 부드러운 곡선(Catmull-Rom → 3차 베지어) SVG path. 위경도 점을 받는다 */
export function smoothPath(points: readonly LatLng[]): string {
  if (points.length === 0) return "";
  const p = points.map(([la, ln]) => project(la, ln));
  let d = `M${f1(p[0][0])} ${f1(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}

/** 해안선 (북→남) */
export const COAST: readonly LatLng[] = [
  [37.9905, 128.7568], [37.986, 128.759], [37.9825, 128.7618], [37.9812, 128.764], [37.98, 128.7643], [37.979, 128.7619],
  [37.977, 128.7607], [37.9745, 128.7605], [37.9729, 128.7609], [37.9727, 128.7625], [37.9736, 128.7641], [37.9729, 128.7661],
  [37.9713, 128.7665], [37.9702, 128.7651], [37.9699, 128.7636], [37.9692, 128.7629], [37.967, 128.7631], [37.9645, 128.7646],
  [37.9625, 128.7668], [37.9611, 128.7693], [37.959, 128.7693], [37.9565, 128.7701], [37.9537, 128.7713], [37.9505, 128.7741],
  [37.948, 128.7781], [37.9468, 128.783], [37.9465, 128.7862], [37.947, 128.7905], [37.9462, 128.7913], [37.945, 128.7896],
  [37.944, 128.7901], [37.9425, 128.7894], [37.94, 128.7889], [37.937, 128.7901], [37.934, 128.7911], [37.93, 128.7926],
  [37.927, 128.7933],
];

/** 7번 국도 */
export const ROAD: readonly LatLng[] = [
  [37.9905, 128.7522], [37.978, 128.7553], [37.968, 128.7568], [37.96, 128.76], [37.952, 128.7648], [37.945, 128.7738],
  [37.938, 128.78], [37.927, 128.7845],
];

/** 바다 면 — 해안선을 따라 그린 뒤 그림 오른쪽 바깥으로 닫는다 */
export function seaPath(): string {
  return `${smoothPath(COAST)} L${MAP_W + 20} ${MAP_H + 20} L${MAP_W + 20} -20 Z`;
}

/** 한 장소를 가운데 둔 정사각 확대 창 — 그림 밖으로 나가지 않게 민다 */
export function focusViewBox(lat: number, lng: number, size: number): ViewBox {
  const [x, y] = project(lat, lng);
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));
  return [clamp(x - size / 2, MAP_W - size), clamp(y - size / 2, MAP_H - size), size, size];
}

/** 그림 좌표를 화면 상자 안의 백분율 위치로 (말풍선 자리) */
export function toPercent([x, y]: Pt, vb: ViewBox): Pt {
  return [((x - vb[0]) / vb[2]) * 100, ((y - vb[1]) / vb[3]) * 100];
}

/**
 * 돋보기 확대 렌즈 — 인구·죽도 일대(장소가 가장 몰린 곳)를 오른쪽 바다 위 원 안에 2.9배로 다시 그린다.
 * src = 확대할 곳의 그림 좌표, (cx, cy, r) = 렌즈 원, k = 배율.
 */
export const LENS = (() => {
  const src = project(37.9701, 128.7613);
  const k = 2.9;
  const cx = MAP_W - 196;
  const cy = 300;
  const r = 172;
  return { src, k, cx, cy, r, srcR: r / k + 4 } as const;
})();

/** 원래 그림 좌표 → 렌즈 안 좌표 */
export function lensPoint([x, y]: Pt): Pt {
  return [LENS.cx + (x - LENS.src[0]) * LENS.k, LENS.cy + (y - LENS.src[1]) * LENS.k];
}

/** 렌즈 안에 다시 그릴 만큼 렌즈 중심 가까이에 있는지 (가장자리에 걸린 핀은 뺀다) */
export function inLens([x, y]: Pt): boolean {
  const lim = LENS.r / LENS.k - 4;
  return (x - LENS.src[0]) ** 2 + (y - LENS.src[1]) ** 2 <= lim * lim;
}

/** 렌즈에서 확대 원으로 잇는 점선의 두 끝 */
export function lensLeader(): [Pt, Pt] {
  const ang = Math.atan2(LENS.cy - LENS.src[1], LENS.cx - LENS.src[0]);
  const a: Pt = [LENS.src[0] + Math.cos(ang) * LENS.srcR, LENS.src[1] + Math.sin(ang) * LENS.srcR];
  const b: Pt = [LENS.cx - Math.cos(ang) * (LENS.r + 8), LENS.cy - Math.sin(ang) * (LENS.r + 8)];
  return [a, b];
}

/** 축척 막대 길이 (500m, 그림 단위) */
export const SCALE_500M = (500 / 88000) * KX;

/** 두 지점의 직선거리(km) — 하버사인 */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 1km 미만은 10m 단위 「740m」, 그 이상은 소수 한 자리 「1.2km」 */
export function formatDistance(km: number): string {
  if (km < 1) {
    const m = Math.max(10, Math.round(km * 100) * 10);
    return m >= 1000 ? "1.0km" : `${m}m`;
  }
  return `${km.toFixed(1)}km`;
}

/** 기준 장소에서 가까운 순으로 n곳 (자기 자신·좌표 없는 곳 제외) */
export function nearest<T extends { id: string; lat: number; lng: number }>(
  me: { id: string; lat: number; lng: number },
  list: readonly T[],
  n: number,
): { item: T; km: number }[] {
  return list
    .filter((p) => p.id !== me.id && Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .map((item) => ({ item, km: distanceKm(me, item) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}
