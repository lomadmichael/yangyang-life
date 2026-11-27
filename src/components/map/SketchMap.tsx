import { t, tf, type DictKey, type Lang } from "@/i18n";
import {
  focusViewBox,
  inMap,
  MAP_H,
  MAP_W,
  project,
  ROAD,
  SCALE_500M,
  seaPath,
  smoothPath,
  COAST,
  type Pt,
  type ViewBox,
} from "@/lib/sketch-map";
import { MapHost, type MapTip } from "./MapHost";

/** 약도에 찍을 장소 한 곳 (좌표는 DB 값 그대로) */
export type MapPlace = MapTip & { href: string; lat: number; lng: number };

const f1 = (n: number) => n.toFixed(1);
const P = (lat: number, lng: number) => project(lat, lng);

// ── 고정 그림(지형) — 콘텐츠가 아니라 그림이다. 시안 app.js buildMap 과 같은 자리·모양 ──

function pine(x: number, y: number, s: number, key: string) {
  return (
    <g key={key} className="m-pine" transform={`translate(${f1(x)} ${f1(y)}) scale(${s})`}>
      <path d="M0 -15 L6 -5 L3 -5 L8 3 L-8 3 L-3 -5 L-6 -5 Z" />
      <path d="M0 3 V8" className="m-trunk" />
    </g>
  );
}

function trees(lat: number, lng: number, n: number, seed: number) {
  const [cx, cy] = P(lat, lng);
  return Array.from({ length: n }, (_, i) => {
    const a = i * 2.399 + seed;
    const r = 6 + i * 4.2;
    return pine(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, 0.7 + ((i * 37 + seed * 11) % 5) / 16, `t${seed}-${i}`);
  });
}

function boat([x, y]: Pt, s: number) {
  return (
    <g className="m-boat" transform={`translate(${f1(x)} ${f1(y)}) scale(${s})`}>
      <path d="M-14 0 h28 l-5 7 h-18 z" />
      <path d="M-2 0 v-14 l9 12 z" className="m-sail" />
      <path d="M-20 12 q4 -3 8 0 t8 0" className="m-wake" />
    </g>
  );
}

function board([x, y]: Pt, r: number) {
  return (
    <g className="m-board" transform={`translate(${f1(x)} ${f1(y)}) rotate(${r})`}>
      <ellipse rx="4" ry="14" />
      <path d="M0 -10 V10" />
    </g>
  );
}

/** 지형 — 땅·언덕·바다·해안선·모래·석호(매호)·방파제·등대·7번 국도·소나무·배·서핑보드 */
function Terrain({ uid }: { uid: string }) {
  const coast = smoothPath(COAST);
  const sea = seaPath();
  const road = smoothPath(ROAD);
  const lag = P(37.9556, 128.7656);
  const br1 = P(37.947, 128.7905);
  const br2 = P(37.9481, 128.7936);
  const lh = P(37.9481, 128.7938);
  const lh2 = P(37.9702, 128.7652);
  const sb = P(37.9683, 128.7655);
  const sb2 = P(37.9765, 128.7638);
  const sh = P(37.9655, 128.7542);
  const sands: [number, number, number, number][] = [
    [37.979, 128.7616, 37.9733, 128.7606],
    [37.9697, 128.7631, 37.965, 128.7643],
    [37.9585, 128.7694, 37.951, 128.7736],
  ];
  return (
    <g>
      <rect width={MAP_W} height={MAP_H} className="m-land" />
      <path
        className="m-hill"
        d={`M0 ${MAP_H * 0.28} q60 -40 120 -8 t120 -14 M0 ${MAP_H * 0.58} q70 -50 140 -10 t110 -8 M0 ${MAP_H * 0.86} q80 -44 170 -6 t130 -10`}
      />
      <path d={sea} className="m-sea" />
      <path d={sea} fill={`url(#${uid}w)`} />
      <path d={coast} className="m-coast2" transform="translate(8 3)" />
      <path d={coast} className="m-coast3" transform="translate(18 6)" />
      <path d={coast} className="m-coast" />
      {sands.map((b, i) => {
        const a = P(b[0], b[1]);
        const z = P(b[2], b[3]);
        return <path key={i} className="m-sand" d={`M${f1(a[0] - 3)} ${f1(a[1])} L${f1(z[0] - 3)} ${f1(z[1])}`} />;
      })}
      <ellipse className="m-lagoon" cx={f1(lag[0])} cy={f1(lag[1])} rx="26" ry="17" transform={`rotate(-25 ${f1(lag[0])} ${f1(lag[1])})`} />
      <path
        className="m-reed"
        d={`M${f1(lag[0] - 34)} ${f1(lag[1] + 18)} v-8 m5 8 v-11 m5 11 v-7 M${f1(lag[0] + 26)} ${f1(lag[1] - 12)} v-8 m5 8 v-11`}
      />
      <path className="m-break" d={`M${f1(br1[0])} ${f1(br1[1])} L${f1(br2[0])} ${f1(br2[1])}`} />
      <g className="m-lh" transform={`translate(${f1(lh[0])} ${f1(lh[1] - 2)})`}>
        <path d="M-4 0 L-2.5 -18 L2.5 -18 L4 0 Z" />
        <rect x="-3.4" y="-12" width="6.8" height="3" className="m-lh-band" />
        <path d="M-3.5 -18 h7 l-3.5 -5 z" className="m-lh-top" />
      </g>
      <g className="m-lh m-lh-w" transform={`translate(${f1(lh2[0])} ${f1(lh2[1] + 6)}) scale(.7)`}>
        <path d="M-4 0 L-2.5 -18 L2.5 -18 L4 0 Z" />
        <path d="M-3.5 -18 h7 l-3.5 -5 z" className="m-lh-top" />
      </g>
      <path d={road} className="m-road-o" />
      <path d={road} className="m-road" />
      <g className="m-shield" transform={`translate(${f1(sh[0])} ${f1(sh[1])})`}>
        <path d="M-11 -11 h22 v9 c0 7 -5 11 -11 14 c-6 -3 -11 -7 -11 -14 z" />
        <text y="5" textAnchor="middle">
          7
        </text>
      </g>
      {trees(37.9722, 128.7646, 5, 1)}
      {trees(37.9768, 128.7588, 6, 2)}
      {trees(37.9845, 128.7565, 4, 3)}
      {trees(37.9622, 128.766, 4, 4)}
      {trees(37.9505, 128.7708, 5, 5)}
      {trees(37.941, 128.7855, 3, 6)}
      {trees(37.966, 128.759, 3, 7)}
      {boat(P(37.9432, 128.7938), 1)}
      {boat(P(37.955, 128.78), 0.8)}
      {board(sb, 28)}
      {board([sb[0] + 13, sb[1] + 8], -14)}
      {board(sb2, 40)}
    </g>
  );
}

/** 지명 — 마을 이름(작은 글자)과 바닷가 지명(손글씨). 손글씨 글꼴은 약도 안에서만 */
const TOWNS: [number, number, DictKey][] = [
  [37.983, 128.754, "mapTownDongsan"],
  [37.9745, 128.7515, "mapTownIngu"],
  [37.959, 128.7545, "mapTownGwangjin"],
  [37.9478, 128.762, "mapTownNamae"],
];
const HANDS: [number, number, DictKey, number, number, number, string][] = [
  [37.9737, 128.7674, "mapLblJukdo", 6, -2, -6, "m-hand"],
  [37.9678, 128.766, "mapLblInguBeach", 10, 4, -4, "m-hand"],
  [37.9612, 128.77, "mapLblHyuhyuam", 12, 4, -3, "m-hand"],
  [37.9535, 128.7735, "mapLblNamaeBeach", 12, 2, -4, "m-hand"],
  [37.9488, 128.7898, "mapLblNamaePort", -6, -12, -3, "m-hand"],
  [37.9789, 128.764, "mapLblDongsanpo", 10, 0, -5, "m-hand"],
  [37.9556, 128.7656, "mapLblMaeho", -56, 4, 0, "m-hand-s"],
];

function label(lat: number, lng: number, text: string, cls: string, dx = 0, dy = 0, rot = 0, key?: string) {
  const [cx, cy] = P(lat, lng);
  const x = f1(cx + dx);
  const y = f1(cy + dy);
  return (
    <text key={key ?? text} className={cls} x={x} y={y} transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}>
      {text}
    </text>
  );
}

function Pin({ p, at, scale, dim = false, near = false }: { p: MapPlace; at: Pt; scale: number; dim?: boolean; near?: boolean }) {
  const cls = `m-pin cat-${p.cat}${dim ? " is-dim" : ""}${near ? " is-near" : ""}`;
  const common = {
    className: cls,
    "data-pin": p.id,
    "data-cat": p.cat,
    "data-x": f1(at[0]),
    "data-y": f1(at[1]),
    transform: `translate(${f1(at[0])} ${f1(at[1])}) scale(${scale})`,
  };
  const body = (
    <>
      <circle className="m-pin-hit" cy="-14" r="14" />
      <g className="m-pin-in">
        <path d="M0 0 C-3 -6 -9 -9 -9 -16 A9 9 0 1 1 9 -16 C9 -9 3 -6 0 0 Z" />
        <circle cy="-16" r="3.2" className="m-pin-dot" />
      </g>
    </>
  );
  return (
    <a href={p.href} {...common} aria-label={`${p.no}. ${p.name} · ${p.catLabel}`}>
      {body}
    </a>
  );
}

/**
 * 손그림 약도 (서버에서 SVG 를 그린다). 움직임은 MapHost(클라이언트)가 맡는다.
 *  · full  — 현남면 해안 전체. 장소 목록 옆에 고정해 둔다
 *  · focus — 한 장소를 가운데 두고 확대(상세). 근처 장소(nearIds)는 그대로, 나머지 핀은 옅게
 * 핀은 약도 범위 안 좌표를 가진 장소만. 같은 정보가 지도 밖 목록에 있으므로 지형·지명은 aria-hidden.
 */
export function SketchMap({
  places,
  lang,
  uid,
  variant = "full",
  focusId,
  nearIds = [],
  dimIds = [],
  scrollToRow = false,
  className = "",
}: {
  places: MapPlace[];
  lang: Lang;
  /** 한 화면 안에서 겹치지 않는 그림 id 접두 */
  uid: string;
  variant?: "full" | "focus";
  focusId?: string;
  nearIds?: string[];
  dimIds?: string[];
  scrollToRow?: boolean;
  className?: string;
}) {
  const drawn = places.filter((p) => inMap(p.lat, p.lng));
  const focusPlace = focusId ? drawn.find((p) => p.id === focusId) : undefined;
  const full = variant === "full" || !focusPlace;
  const vb: ViewBox = full ? [0, 0, MAP_W, MAP_H] : focusViewBox(focusPlace.lat, focusPlace.lng, 330);
  const pinScale = full ? 1.25 : 1.7;
  const dim = new Set(dimIds);
  const near = new Set(nearIds);
  const focusAt = focusPlace ? P(focusPlace.lat, focusPlace.lng) : null;

  const sunY = MAP_H * 0.7;
  const seaX = MAP_W - 130;
  const seaY = MAP_H * 0.5;

  // 그리는 순서: 가까운 곳·초점 장소를 맨 위로
  const order = (p: MapPlace) => (p.id === focusId ? 2 : near.has(p.id) ? 1 : 0);
  const pins = [...drawn].sort((a, b) => order(a) - order(b));

  return (
    <MapHost
      tips={drawn.map(({ id, no, cat, catLabel, name }) => ({ id, no, cat, catLabel, name }))}
      viewBox={vb}
      focus={focusAt && focusPlace ? { id: focusPlace.id, x: focusAt[0], y: focusAt[1] } : undefined}
      scrollToRow={scrollToRow}
      className={`${full ? "is-full" : "is-focus"} ${className}`}
      label={t(lang, "mapTitle")}
    >
      <svg className="map-svg" viewBox={vb.map(f1).join(" ")} aria-labelledby={`${uid}-t ${uid}-d`}>
        <title id={`${uid}-t`}>{t(lang, "mapTitle")}</title>
        <desc id={`${uid}-d`}>{tf(lang, "mapDesc", { n: String(drawn.length) })}</desc>
        <defs>
          <pattern id={`${uid}w`} width="46" height="26" patternUnits="userSpaceOnUse">
            <path d="M4 14 q5 -5 10 0 t10 0" className="m-wavep" />
            <path d="M27 24 q5 -5 10 0" className="m-wavep" />
          </pattern>
        </defs>

        <g aria-hidden="true">
          <Terrain uid={uid} />
          {full ? (
            <g className="m-sun" transform={`translate(${MAP_W - 58} ${sunY})`}>
              <circle r="15" />
              <path d="M-27 0 h-7 M27 0 h7 M0 -27 v-7 M-19 -19 l-5 -5 M19 -19 l5 -5" />
            </g>
          ) : null}
          {full ? (
            <text className="m-sea-label" x={seaX} y={seaY} transform={`rotate(90 ${seaX} ${seaY})`}>
              {t(lang, "mapSea")}
            </text>
          ) : null}
          {TOWNS.map(([la, ln, k]) => label(la, ln, t(lang, k), "m-town", 0, 0, 0, k))}
          {HANDS.map(([la, ln, k, dx, dy, rot, cls]) => label(la, ln, t(lang, k), cls, dx, dy, rot, k))}
          <g className="m-compass" transform={`translate(${f1(vb[0] + vb[2] - 70)} ${f1(vb[1] + 76)})`}>
            <circle r="24" />
            <path d="M0 -32 L6 0 L0 -5 L-6 0 Z" className="m-needle" />
            <path d="M0 32 L6 0 L0 5 L-6 0 Z" />
            <text y="-38" textAnchor="middle">
              N
            </text>
          </g>
          <g className="m-scale" transform={`translate(${f1(vb[0] + 26)} ${f1(vb[1] + vb[3] - 34)})`}>
            <path d={`M0 0 h${f1(SCALE_500M)} M0 -5 v10 M${f1(SCALE_500M)} -5 v10 M${f1(SCALE_500M / 2)} -3 v6`} />
            <text x={f1(SCALE_500M + 8)} y="5">
              500m
            </text>
          </g>
        </g>

        <g className="m-pins">
          {pins.map((p) => (
            <Pin
              key={p.id}
              p={p}
              at={P(p.lat, p.lng)}
              scale={pinScale}
              dim={dim.has(p.id) || (!full && p.id !== focusId && !near.has(p.id))}
              near={near.has(p.id)}
            />
          ))}
        </g>

      </svg>
    </MapHost>
  );
}
