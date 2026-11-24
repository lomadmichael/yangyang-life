/** 작은 상태 표시. tone 은 색 토큰 묶음 이름 */
const TONES = {
  open: "bg-pine-soft text-pine",
  partner: "bg-salmon-soft text-salmon-strong",
  info: "bg-sea-soft text-sea",
  muted: "border border-rule bg-paper-card text-ink-2",
  closed: "bg-ink text-on-sea",
} as const;

export function Badge({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-xs px-2 py-0.5 text-xs font-semibold tracking-wide ${TONES[tone]}`}>
      {children}
    </span>
  );
}
