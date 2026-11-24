"use client";

import { useState, type ReactNode } from "react";

/**
 * 좁은 화면(1180px 이하)에서 목록 위의 약도를 접었다 펼 수 있게 — 처음엔 펼쳐 둔다.
 * 넓은 화면에서는 단추가 숨고 약도가 늘 보인다(magazine-places.css).
 */
export function MapFold({ openLabel, closeLabel, children }: { openLabel: string; closeLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`map-fold ${open ? "is-open" : "is-closed"}`}>
      <button type="button" className="map-fold-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
          <path d="M9 4v14M15 6v14" />
        </svg>
        <span>{open ? closeLabel : openLabel}</span>
        <i aria-hidden="true" />
      </button>
      <div className="map-fold-body">{children}</div>
    </div>
  );
}
