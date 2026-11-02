import Link from "next/link";

/** 보여줄 데이터가 0건일 때 — 제목 한 줄 + 설명 + (선택) 다음 행동 링크 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-5 py-8 text-center">
      <p className="font-bold">{title}</p>
      {body ? <p className="mt-1 text-sm text-muted">{body}</p> : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-sea px-4 text-sm font-medium text-sea"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
