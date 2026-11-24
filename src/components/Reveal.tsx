"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * 스크롤 등장 효과 — 화면에 들어온 `.rv`(·`.line-draw`) 요소에 `.in` 을 붙인다(magazine.css 가 서서히 떠오르게 그린다).
 * 숨기는 규칙은 html 에 `js-reveal` 이 붙은 뒤에만 걸리므로, JS 가 없거나 늦어도 글이 안 보이는 일은 없다.
 * 처음 화면 안에 이미 보이는 것은 바로 `.in`(깜빡임 없음). 움직임 줄이기(prefers-reduced-motion)면 아무것도 숨기지 않는다.
 * 레이아웃에 한 번만 둔다. 화면이 바뀔 때마다(pathname) 새 요소를 다시 찾는다.
 */
export function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".rv:not(.in), .line-draw:not(.in)"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const vh = window.innerHeight;
    const later: HTMLElement[] = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) el.classList.add("in");
      else later.push(el);
    }
    root.classList.add("js-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    later.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
