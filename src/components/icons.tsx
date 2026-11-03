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
