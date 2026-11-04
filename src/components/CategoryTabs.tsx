import Link from "next/link";

/**
 * 분류 탭 한 줄 — 맨 앞 「전체」 + 넘겨받은 분류(항목 있는 분류만 넘긴다).
 * 넘치면 옆으로 밀어 보기. 상태는 주소(쿼리)에 있어 서버 화면에서도 그대로 동작한다.
 * 장소·놀거리·이야기 목록이 함께 쓴다.
 */
export function CategoryTabs<K extends string>({
  items,
  current,
  hrefFor,
  labelFor,
  allLabel,
  label,
}: {
  items: K[];
  current?: K;
  hrefFor: (k?: K) => string;
  labelFor: (k: K) => string;
  allLabel: string;
  /** 화면 낭독기용 묶음 이름 */
  label?: string;
}) {
  const tabs: { key: string; text: string; href: string; active: boolean }[] = [
    { key: "", text: allLabel, href: hrefFor(undefined), active: current === undefined },
    ...items.map((k) => ({ key: k, text: labelFor(k), href: hrefFor(k), active: current === k })),
  ];

  return (
    <nav aria-label={label} className="-mx-4 border-b border-line">
      <ul className="flex gap-1 overflow-x-auto px-4">
        {tabs.map((tab) => (
          <li key={tab.key} className="shrink-0">
            <Link
              href={tab.href}
              scroll={false}
              aria-current={tab.active ? "page" : undefined}
              className={
                tab.active
                  ? "-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 border-sea px-3 font-bold text-ink"
                  : "-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 border-transparent px-3 text-muted hover:text-ink"
              }
            >
              {tab.text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
