"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

export type IndexRow = {
  id: string;
  /** 북→남 순번 ("01") — 2단계 약도의 핀 번호와 같은 값 */
  no: string;
  href: string;
  name: string;
  /** 이름 옆 작은 이탤릭 (영문 화면의 한글 이름, 국문 화면의 로마자 이름) */
  sub: string | null;
  cat: string;
  catLabel: string;
  summary: string | null;
  state: "open" | "later" | "shut" | "none";
  stateLabel: string;
};

export type IndexTab = { key: string; label: string; count: number; href: string; seeAll: string };

const PREVIEW = 8;
const STATE_RANK = { open: 0, later: 1, none: 1, shut: 2 } as const;

/**
 * 홈 장소 색인 — 분류 탭(누르면 이 자리에서 거른다) + 번호 색인 몇 줄 + 「전체 보기」.
 * 지금 열린 곳을 먼저, 그다음 번호(북→남) 순. 휴업은 맨 뒤.
 * side 를 주면(2단계 약도) 왼쪽 칸에 끼우고 목록은 한 단으로 바뀐다.
 */
export function PlaceIndex({
  rows,
  tabs,
  tabsLabel,
  note,
  empty,
  side,
}: {
  rows: IndexRow[];
  tabs: IndexTab[];
  tabsLabel: string;
  note: ReactNode;
  empty: string;
  side?: ReactNode;
}) {
  const [cat, setCat] = useState("all");
  const tab = tabs.find((x) => x.key === cat) ?? tabs[0];
  const shown = rows
    .filter((r) => cat === "all" || r.cat === cat)
    .sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || a.no.localeCompare(b.no))
    .slice(0, PREVIEW);

  return (
    <>
      <div className="tabs rv" role="tablist" aria-label={tabsLabel}>
        {tabs.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            id={`idx-tab-${x.key}`}
            aria-selected={x.key === cat}
            aria-controls="idx-rows"
            onClick={() => setCat(x.key)}
          >
            {x.label}
            <sup>{x.count}</sup>
          </button>
        ))}
      </div>
      <div className={`index2 ${side ? "has-side" : ""}`}>
        {side ? <div className="idx-side">{side}</div> : null}
        <div id="idx-rows" role="tabpanel" aria-labelledby={`idx-tab-${cat}`}>
          {shown.length ? (
            <ol className="rows">
              {shown.map((r) => (
                <li key={r.id} className="row">
                  <Link href={r.href}>
                    <span className="no">{r.no}</span>
                    <div className="min-w-0">
                      <h3>
                        {r.name}
                        {r.sub ? <small>{r.sub}</small> : null}
                      </h3>
                      <p>
                        <span className={`cat cat-${r.cat}`}>
                          <i aria-hidden="true" />
                          {r.catLabel}
                        </span>
                        {r.summary}
                      </p>
                    </div>
                    {r.state === "none" ? (
                      <span />
                    ) : (
                      <span className={`st ${r.state}`}>
                        <i aria-hidden="true" />
                        {r.stateLabel}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rows-empty">{empty}</p>
          )}
          <div className="rows-more">
            {tab ? (
              <Link className="btn-line" href={tab.href}>
                {tab.seeAll}
                <svg viewBox="0 0 20 12" aria-hidden="true">
                  <path d="M0 6h18M13 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </Link>
            ) : null}
            {note}
          </div>
        </div>
      </div>
    </>
  );
}
