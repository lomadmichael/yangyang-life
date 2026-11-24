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
    <div className="border-t-2 border-ink bg-paper-card px-5 py-9 text-center">
      <p className="font-serif text-xl font-semibold lg:text-2xl">{title}</p>
      {body ? <p className="mt-2 text-base text-ink-2">{body}</p> : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-5 inline-flex min-h-11 items-center border border-ink px-5 text-base font-semibold text-ink hover:bg-ink hover:text-paper"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
