import Link from "next/link";

/** 화면 맨 위 「‹ 뒤로」 — 넉넉한 누름 영역 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="-ml-2 inline-flex min-h-11 items-center px-2 text-sm text-sea">
      <span aria-hidden="true" className="mr-1">‹</span>
      {label}
    </Link>
  );
}
