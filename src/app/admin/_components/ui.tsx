// 관리 화면 공통 모양. 색은 globals.css 토큰만 쓴다. 입력 칸 글자는 16px(아이폰 확대 방지).

export const inputCls =
  "w-full min-h-11 rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-muted/70 focus:border-sea focus:outline-none focus:ring-2 focus:ring-sea/30";
export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-sea px-4 font-medium text-on-sea hover:bg-sea-strong disabled:opacity-50";
export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-line bg-surface px-4 font-medium text-ink hover:bg-sea-soft disabled:opacity-50";
export const btnDanger =
  "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-salmon-strong bg-surface px-4 font-medium text-salmon-strong hover:bg-salmon-soft disabled:opacity-50";
export const btnSmall =
  "inline-flex min-h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-line bg-surface px-2.5 text-sm text-ink hover:bg-sea-soft disabled:opacity-50";

export function Card({ title, children, aside }: { title?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-bold">{title}</h2>
          {aside}
        </div>
      ) : null}
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function PageTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h1 className="text-xl font-bold">{children}</h1>
      {aside}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Notice({ result }: { result: { ok: boolean; message?: string } | null }) {
  if (!result?.message) return null;
  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={`rounded-lg px-3 py-2 text-sm ${result.ok ? "bg-pine-soft text-pine" : "bg-salmon-soft text-salmon-strong"}`}
    >
      {result.message}
    </p>
  );
}

export function Pill({ tone, children }: { tone: "ok" | "warn" | "info" | "muted"; children: React.ReactNode }) {
  const cls = {
    ok: "bg-pine-soft text-pine",
    warn: "bg-salmon-soft text-salmon-strong",
    info: "bg-sea-soft text-sea",
    muted: "border border-line bg-surface text-muted",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}
