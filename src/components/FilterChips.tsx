import Link from "next/link";

export interface Chip {
  label: string;
  href: string;
  active: boolean;
  /** 화면에 짧게(₩₩) 보일 때 읽어 줄 이름 */
  ariaLabel?: string;
}

/** 링크로 된 필터 칩 한 줄(넘치면 옆으로 밀어 보기) — 상태는 주소(쿼리)에 있으므로 서버 화면에서도 그대로 동작한다 */
export function FilterChips({ label, chips }: { label: string; chips: Chip[] }) {
  return (
    <ul aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
      {chips.map((c) => (
        <li key={c.href + c.label} className="shrink-0">
          <Link
            href={c.href}
            scroll={false}
            aria-current={c.active ? "true" : undefined}
            aria-label={c.ariaLabel}
            className={
              c.active
                ? "inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-sea bg-sea px-4 text-sm font-medium text-on-sea"
                : "inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-line bg-surface px-4 text-sm text-ink"
            }
          >
            {c.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
