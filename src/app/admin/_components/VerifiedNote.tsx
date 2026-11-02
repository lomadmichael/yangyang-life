import { METHOD_KO } from "@/lib/admin-input";
import { formatVerifiedDate } from "@/lib/format";
import type { VerifiedMethod } from "@/lib/types";
import { Pill } from "./ui";

/** 관리 화면의 확인 기록 한 줄. 공개 화면과 같은 「정리·확인: 이름 · 날짜」 + 방법 */
export function VerifiedNote({
  at,
  by,
  method,
  stale,
}: {
  at: string | null;
  by: string | null;
  method: VerifiedMethod;
  stale?: boolean;
}) {
  const date = formatVerifiedDate(at, "ko");
  if (!date || !by) return <Pill tone="warn">확인 기록 없음</Pill>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1 text-sm text-muted">
      <span>
        정리·확인: {by} · {date} ({METHOD_KO[method] ?? method})
      </span>
      {stale ? <Pill tone="warn">30일 지남</Pill> : null}
    </span>
  );
}
