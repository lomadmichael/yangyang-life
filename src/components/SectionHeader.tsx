import Link from "next/link";

/**
 * 단락 제목 한 줄 — 왼쪽 제목, 오른쪽 「전체 보기 →」(href 가 있을 때만).
 * 문구는 부르는 쪽이 t() 로 넘긴다(moreLabel 이 없으면 링크도 없다).
 */
export function SectionHeader({ title, href, moreLabel }: { title: string; href?: string; moreLabel?: string }) {
  return (
    <div className="flex min-h-11 items-end justify-between gap-3">
      <h2 className="text-lg font-bold text-ink lg:text-2xl">{title}</h2>
      {href && moreLabel ? (
        <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-medium text-sea hover:text-sea-strong lg:text-base">
          {moreLabel}
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
