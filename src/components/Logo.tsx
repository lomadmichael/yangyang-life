/**
 * 양양생활 로고 — 심벌(SVG: 원 · 떠오르는 해 · 수평선 · 물결 두 줄) + 글자(실제 텍스트, 웹 글꼴에 기대지 않고
 * 명조 → 기기 명조 순으로 내려간다). 디자인 원본: yangyang-design/out/v3/d/logo.svg (쪽빛 남색 기준).
 *
 * tone="ink"   종이 바탕용 — 원·수평선은 먹, 물결은 쪽빛 남색, 해는 해돋이 주황
 * tone="light" 사진·남색 바탕용 — 선은 모두 글자색(currentColor, 보통 흰색), 해만 주황
 * 크기는 className 으로(글자는 부모 글자 크기를 따른다). 서버·클라이언트 어디서 써도 된다.
 */
export function LogoMark({ tone = "ink", className = "h-10 w-10" }: { tone?: "ink" | "light"; className?: string }) {
  const wave = tone === "ink" ? "stroke-deep" : "stroke-current";
  return (
    <svg viewBox="0 0 112 112" fill="none" strokeLinecap="round" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <circle cx="56" cy="56" r="54.5" className="stroke-current" strokeWidth="2.4" />
      <path d="M30 60 A26 26 0 0 1 82 60" className="stroke-sunrise" strokeWidth="3.6" />
      <path d="M14 60 H98" className="stroke-current" strokeWidth="2.4" />
      <path d="M26 74 q7.5 -5 15 0 t15 0 t15 0 t15 0" className={wave} strokeWidth="2.4" />
      <path d="M38 86 q7.5 -5 15 0 t15 0 t9 0" className={wave} strokeWidth="2.4" />
    </svg>
  );
}

/** 심벌 + 「양양생활」 + YANGYANG LIFE. 링크·제목 요소는 부르는 쪽이 감싼다 */
export function Logo({
  tone = "ink",
  size = "md",
  className = "",
}: {
  tone?: "ink" | "light";
  size?: "sm" | "md";
  className?: string;
}) {
  const sm = size === "sm";
  return (
    <span className={`inline-flex items-center ${sm ? "gap-2.5" : "gap-3"} ${className}`}>
      <LogoMark tone={tone} className={sm ? "h-8 w-8" : "h-10 w-10"} />
      <span className="flex flex-col">
        <span className={`logo-wm ${sm ? "logo-sm" : ""}`}>양양생활</span>
        <span className={`logo-en ${sm ? "logo-sm" : ""} ${tone === "ink" ? "text-deep" : "opacity-90"}`}>YANGYANG LIFE</span>
      </span>
    </span>
  );
}
