// 아이콘 SVG — 새 의존성 없이 직접 그린다. 색은 글자색(currentColor)을 따른다.
// 24×24, 선 굵기 1.75, 화면 낭독기에는 숨김(옆 글자가 이름 역할).

import type { ReactNode } from "react";

type IconProps = { className?: string };

function Svg({ className, children, filled = false }: IconProps & { children: ReactNode; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconHome({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3.5 10.5 12 3.75l8.5 6.75" />
      <path d="M5.5 9v10.25h13V9" />
      <path d="M10 19.25v-5.5h4v5.5" />
    </Svg>
  );
}

export function IconPin({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 21s-6.5-5.75-6.5-11a6.5 6.5 0 0 1 13 0c0 5.25-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  );
}

export function IconWave({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2.75 9.5c1.6 0 2.4-1.5 4.6-1.5s3 1.5 4.65 1.5 2.45-1.5 4.65-1.5 3 1.5 4.6 1.5" />
      <path d="M2.75 14c1.6 0 2.4-1.5 4.6-1.5s3 1.5 4.65 1.5 2.45-1.5 4.65-1.5 3 1.5 4.6 1.5" />
      <path d="M2.75 18.5c1.6 0 2.4-1.5 4.6-1.5s3 1.5 4.65 1.5 2.45-1.5 4.65-1.5 3 1.5 4.6 1.5" />
    </Svg>
  );
}

export function IconBook({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 6.5C10.25 5.25 7.75 4.75 4 4.75v13.5c3.75 0 6.25.5 8 1.75 1.75-1.25 4.25-1.75 8-1.75V4.75c-3.75 0-6.25.5-8 1.75Z" />
      <path d="M12 6.5V20" />
    </Svg>
  );
}

export function IconUser({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.75 20c.75-3.75 3.6-5.75 7.25-5.75s6.5 2 7.25 5.75" />
    </Svg>
  );
}

const STAR = "M12 3.5l2.6 5.3 5.85.85-4.23 4.12 1 5.83L12 16.85 6.78 19.6l1-5.83L3.55 9.65l5.85-.85L12 3.5Z";

export function IconStar({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d={STAR} />
    </Svg>
  );
}

export function IconStarFilled({ className }: IconProps) {
  return (
    <Svg className={className} filled>
      <path d={STAR} />
    </Svg>
  );
}

/** 경고 — 「확인한 지 오래된 가이드」 띠 */
export function IconAlert({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10.3 4.2 2.9 17.5A2 2 0 0 0 4.65 20.5h14.7a2 2 0 0 0 1.75-3L13.7 4.2a1.95 1.95 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4.25" />
      <path d="M12 17.25h.01" />
    </Svg>
  );
}

// ── 분류 아이콘 — 사진이 없는 카드의 바탕 그림(category-visual.ts) ──

/** 식당 — 포크와 칼 */
export function IconUtensils({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7 3.5v17" />
      <path d="M4.5 3.5v4.75a2.5 2.5 0 0 0 5 0V3.5" />
      <path d="M17 20.5v-17c-2 1.25-3 3.75-3 7v3.5h3" />
    </Svg>
  );
}

/** 카페 — 잔 */
export function IconCup({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4.5 9h12v5.5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9Z" />
      <path d="M16.5 10.5h1.25a2.5 2.5 0 0 1 0 5H16" />
      <path d="M8.5 3.5v2.5M12.5 3.5v2.5" />
    </Svg>
  );
}

/** 숙소 — 침대 */
export function IconBed({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3.5 6v13.5" />
      <path d="M3.5 15.5h17v4" />
      <path d="M20.5 15.5v-3a3 3 0 0 0-3-3h-7v6" />
      <circle cx="7" cy="11.75" r="1.75" />
    </Svg>
  );
}

/** 술집 — 잔 */
export function IconGlass({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 4h12l-1.25 7a4.8 4.8 0 0 1-9.5 0L6 4Z" />
      <path d="M12 15.75v4.75" />
      <path d="M8.5 20.5h7" />
    </Svg>
  );
}

/** 명소·등산 — 산 */
export function IconMountain({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m2.75 19.5 6.5-12 4 7 2.25-3.5 5.75 8.5H2.75Z" />
    </Svg>
  );
}

/** 생태 — 잎 */
export function IconLeaf({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 19c0-8 5-13.5 14.5-14.5C19 14 13.5 19 5.5 19" />
      <path d="M5 19c3-4 6-6.5 9.5-8.5" />
    </Svg>
  );
}

/** 요가·해변 — 해 */
export function IconSun({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.45 5.45l1.4 1.4M17.15 17.15l1.4 1.4M5.45 18.55l1.4-1.4M17.15 6.85l1.4-1.4" />
    </Svg>
  );
}

/** 낚시 — 물고기 */
export function IconFish({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 12c2.5-3.5 6-5.25 9.5-5.25 3.75 0 6.25 2.5 7.75 5.25-1.5 2.75-4 5.25-7.75 5.25C9 17.25 5.5 15.5 3 12Z" />
      <path d="M3 12 1.5 9M3 12l-1.5 3" />
      <path d="M15.5 11h.01" />
    </Svg>
  );
}

/** 축제 — 반짝임 */
export function IconSparkle({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3.5c.6 4.4 2.1 5.9 6.5 6.5-4.4.6-5.9 2.1-6.5 6.5-.6-4.4-2.1-5.9-6.5-6.5 4.4-.6 5.9-2.1 6.5-6.5Z" />
      <path d="M18.5 15.5c.25 1.75.75 2.25 2.5 2.5-1.75.25-2.25.75-2.5 2.5-.25-1.75-.75-2.25-2.5-2.5 1.75-.25 2.25-.75 2.5-2.5Z" />
    </Svg>
  );
}
