"use client";

import { useEffect, useState, type ReactNode } from "react";

const INTERVAL_MS = 7000;

/**
 * 홈 표지 틀 — 뒤에 깔린 사진(slides)을 7초마다 서서히 바꾸고(크로스페이드 + magazine.css 의 느린 확대),
 * 아래 줄에 지금 사진 번호·설명과 넘기기 단추를 둔다. 표지 글자(children)는 서버가 그린 그대로 끼운다.
 * 움직임 줄이기(prefers-reduced-motion)면 저절로 넘어가지 않는다(단추로는 넘길 수 있다).
 * 사진이 1장(또는 영상 1개)이면 단추·번호를 그리지 않는다.
 */
export function CoverShell({
  label,
  slides,
  captions,
  dotsLabel,
  dotLabels,
  scrollLabel,
  children,
}: {
  label: string;
  slides: ReactNode[];
  captions: string[];
  dotsLabel: string;
  dotLabels: string[];
  scrollLabel: string;
  children: ReactNode;
}) {
  const [cur, setCur] = useState(0);
  const [auto, setAuto] = useState(true);
  const [reduce, setReduce] = useState(false);
  const n = slides.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!auto || reduce || n < 2) return;
    const id = window.setTimeout(() => setCur((c) => (c + 1) % n), INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [cur, auto, reduce, n]);

  const pad = (i: number) => String(i).padStart(2, "0");

  return (
    <section className="cover" aria-label={label}>
      <div className="cover-media">
        {slides.map((s, i) => (
          <div key={i} className={`slide ${i === cur ? "on" : ""}`} aria-hidden={i === cur ? undefined : true}>
            {s}
          </div>
        ))}
      </div>
      <div className="cover-in">
        {children}
        <div className="cover-foot">
          <div className="cap" aria-live="polite">
            {n > 1 ? (
              <span className="it">
                {pad(cur + 1)} / {pad(n)}
              </span>
            ) : null}
            <span>{captions[cur]}</span>
          </div>
          {n > 1 ? (
            <div className={`dots ${auto && !reduce ? "" : "is-paused"}`} role="group" aria-label={dotsLabel}>
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={dotLabels[i]}
                  aria-pressed={i === cur}
                  onClick={() => {
                    setAuto(false);
                    setCur(i);
                  }}
                >
                  {/* 진행 막대 — 다시 그리려고 key 에 현재 번호를 넣는다 */}
                  <i key={i === cur ? `on-${cur}` : "off"} />
                </button>
              ))}
            </div>
          ) : null}
          <div className="scroll-cue" aria-hidden="true">
            <i />
            <span>{scrollLabel}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
