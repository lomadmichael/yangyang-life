"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { toPercent, type ViewBox } from "@/lib/sketch-map";

/** 말풍선에 쓸 장소 한 곳 — 서버가 그린 핀(data-pin)과 같은 id */
export type MapTip = { id: string; no: string; cat: string; catLabel: string; name: string };

/** 홈 장소 색인의 분류 탭이 보내는 이벤트 — 약도의 다른 분류 핀을 흐리게 한다 */
export const MAP_FILTER_EVENT = "yl-map-filter";

type On = { id: string; left: number; top: number };

const esc = (s: string) => (typeof CSS !== "undefined" && CSS.escape ? CSS.escape(s) : s.replace(/"/g, '\\"'));

/**
 * 손그림 약도의 움직이는 부분만 — 그림(SVG)은 서버가 그려 children 으로 넘긴다.
 *  · 핀에 손을 올리거나(키보드 초점 포함) 같은 화면의 목록 행([data-row])에 손을 올리면 말풍선 + 핀 강조 + 행 강조
 *  · 핀을 누르면 scrollToRow 일 때 같은 화면의 행으로 옮겨 가고, 행이 없으면 핀 링크대로 상세로 간다
 *  · 분류 탭 이벤트(MAP_FILTER_EVENT)를 받으면 다른 분류 핀을 흐리게
 *  · focus 가 있으면(상세의 확대 약도) 아무것도 가리키지 않을 때 그 장소 말풍선을 계속 띄운다
 */
export function MapHost({
  tips,
  viewBox,
  focus,
  scrollToRow = false,
  className = "",
  label,
  children,
}: {
  tips: MapTip[];
  viewBox: ViewBox;
  /** 기본으로 띄워 둘 장소와 그 핀의 그림 좌표 */
  focus?: { id: string; x: number; y: number };
  scrollToRow?: boolean;
  className?: string;
  /** 약도 묶음 이름 (화면 낭독기) */
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(tips.map((t) => [t.id, t])), [tips]);
  const initial: On | null = focus
    ? (() => {
        const [left, top] = toPercent([focus.x, focus.y], viewBox);
        return { id: focus.id, left, top };
      })()
    : null;
  const [on, setOn] = useState<On | null>(initial);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let rowOn: string | null = null;

    const markPins = (id: string | null) => {
      host.querySelectorAll<SVGElement>(".m-pin").forEach((g) => g.classList.toggle("is-on", g.dataset.pin === id));
    };
    const markRows = (id: string | null) => {
      if (rowOn === id) return;
      if (rowOn) document.querySelectorAll(`[data-row="${esc(rowOn)}"]`).forEach((r) => r.classList.remove("hi"));
      if (id) document.querySelectorAll(`[data-row="${esc(id)}"]`).forEach((r) => r.classList.add("hi"));
      rowOn = id;
    };
    const show = (id: string, el?: SVGElement | null, fromRow = false) => {
      if (!byId.has(id)) return;
      const pin =
        el ??
        host.querySelector<SVGElement>(`.m-pin[data-pin="${esc(id)}"]`);
      if (!pin) return;
      const [left, top] = toPercent([Number(pin.dataset.x), Number(pin.dataset.y)], viewBox);
      setOn({ id, left, top });
      markPins(id);
      if (!fromRow) markRows(id);
    };
    const hide = () => {
      markRows(null);
      if (focus) {
        show(focus.id, null, true);
        return;
      }
      setOn(null);
      markPins(null);
    };

    const pinOf = (t: EventTarget | null) => (t instanceof Element ? (t.closest(".m-pin") as SVGElement | null) : null);
    const onOver = (e: Event) => {
      const pin = pinOf(e.target);
      if (pin?.dataset.pin) show(pin.dataset.pin, pin);
    };
    const onOut = (e: Event) => {
      const pin = pinOf(e.target);
      const next = (e as PointerEvent | FocusEvent).relatedTarget;
      if (pin && !(next instanceof Node && pin.contains(next))) hide();
    };
    const onClick = (e: MouseEvent) => {
      const pin = pinOf(e.target);
      const id = pin?.dataset.pin;
      if (!pin || !id || !scrollToRow) return;
      const row = Array.from(document.querySelectorAll<HTMLElement>(`[data-row="${esc(id)}"]`)).find(
        (r) => !host.contains(r) && r.offsetParent !== null,
      );
      if (!row) return; // 같은 화면에 행이 없으면 핀 링크대로 상세로
      e.preventDefault();
      row.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      row.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
      row.classList.remove("flash");
      void row.offsetWidth;
      row.classList.add("flash");
      show(id, pin);
    };

    // 같은 화면의 목록 행 ↔ 핀
    const rowOf = (t: EventTarget | null) =>
      t instanceof Element ? (t.closest("[data-row]") as HTMLElement | null) : null;
    const onRowOver = (e: Event) => {
      const row = rowOf(e.target);
      if (!row || host.contains(row)) return;
      const id = row.dataset.row;
      if (id && byId.has(id)) {
        show(id, null, true);
        markRows(null);
      }
    };
    const onRowOut = (e: Event) => {
      const row = rowOf(e.target);
      if (!row || host.contains(row)) return;
      const next = (e as PointerEvent).relatedTarget;
      if (next instanceof Node && row.contains(next)) return;
      hide();
    };
    const onFilter = (e: Event) => {
      const cat = (e as CustomEvent<string>).detail;
      host.querySelectorAll<SVGElement>(".m-pin").forEach((g) => g.classList.toggle("is-dim", cat !== "all" && g.dataset.cat !== cat));
    };

    host.addEventListener("pointerover", onOver);
    host.addEventListener("pointerout", onOut);
    host.addEventListener("focusin", onOver);
    host.addEventListener("focusout", onOut);
    host.addEventListener("click", onClick);
    document.addEventListener("pointerover", onRowOver);
    document.addEventListener("pointerout", onRowOut);
    window.addEventListener(MAP_FILTER_EVENT, onFilter);
    if (focus) markPins(focus.id);
    return () => {
      host.removeEventListener("pointerover", onOver);
      host.removeEventListener("pointerout", onOut);
      host.removeEventListener("focusin", onOver);
      host.removeEventListener("focusout", onOut);
      host.removeEventListener("click", onClick);
      document.removeEventListener("pointerover", onRowOver);
      document.removeEventListener("pointerout", onRowOut);
      window.removeEventListener(MAP_FILTER_EVENT, onFilter);
      markRows(null);
    };
    // viewBox·focus 는 배열·객체라 매 렌더 새로 오지만 같은 값 — id 로만 다시 건다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byId, scrollToRow, focus?.id]);

  const tip = on ? byId.get(on.id) : undefined;
  const style = { "--ar": `${viewBox[2]} / ${viewBox[3]}` } as CSSProperties;

  return (
    <div ref={ref} className={`map ${className}`} style={style} role="group" aria-label={label}>
      {children}
      <div
        className={`map-tip ${tip ? "on" : ""}`}
        aria-hidden="true"
        style={on ? ({ left: `${on.left}%`, top: `${on.top}%` } as CSSProperties) : undefined}
      >
        {tip ? (
          <>
            <b className={`cat-${tip.cat}`}>
              {tip.no} · {tip.catLabel}
            </b>
            <strong>{tip.name}</strong>
          </>
        ) : null}
      </div>
    </div>
  );
}
