import Link from "next/link";

/**
 * 분류 탭 한 줄 — 맨 앞 「전체」 + 넘겨받은 분류(항목 있는 분류만 넘긴다).
 * 넘치면 옆으로 밀어 보기. 상태는 주소(쿼리)에 있어 서버 화면에서도 그대로 동작한다.
 * 장소·놀거리·이야기 목록이 함께 쓴다. countFor 를 주면 탭 옆에 개수를 작은 이탤릭 숫자로 붙인다(k 없음 = 전체).
 * 모양은 v4 잡지 탭(가는 밑줄 + 고른 탭 아래 굵은 먹 줄).
 */
export function CategoryTabs<K extends string>({
  items,
  current,
  hrefFor,
  labelFor,
  allLabel,
  label,
  countFor,
}: {
  items: K[];
  current?: K;
  hrefFor: (k?: K) => string;
  labelFor: (k: K) => string;
  allLabel: string;
  /** 화면 낭독기용 묶음 이름 */
  label?: string;
  countFor?: (k?: K) => number;
}) {
  const tabs: { key: string; text: string; href: string; active: boolean; count?: number }[] = [
    { key: "", text: allLabel, href: hrefFor(undefined), active: current === undefined, count: countFor?.(undefined) },
    ...items.map((k) => ({ key: k, text: labelFor(k), href: hrefFor(k), active: current === k, count: countFor?.(k) })),
  ];

  return (
    <nav aria-label={label} className="-mx-4 border-b border-rule lg:mx-0">
      <ul className="flex gap-5 overflow-x-auto px-4 [scrollbar-width:none] lg:flex-wrap lg:gap-x-8 lg:px-0">
        {tabs.map((tab) => (
          <li key={tab.key} className="shrink-0">
            <Link
              href={tab.href}
              scroll={false}
              aria-current={tab.active ? "page" : undefined}
              className={
                tab.active
                  ? "-mb-px inline-flex min-h-12 items-center whitespace-nowrap border-b-3 border-ink text-base font-semibold text-ink"
                  : "-mb-px inline-flex min-h-12 items-center whitespace-nowrap border-b-3 border-transparent text-base font-medium text-ink-2 hover:text-ink"
              }
            >
              {tab.text}
              {tab.count !== undefined ? (
                <sup className="ml-1 font-display text-base italic text-deep-2">{tab.count}</sup>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
