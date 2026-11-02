import Link from "next/link";
import { formatDateRange, formatWeekdays } from "@/lib/format";
import { requireAdmin } from "../auth";
import { contributorNames, listActivitiesAdmin } from "../data";
import { VerifiedNote } from "../_components/VerifiedNote";
import { PageTitle, Pill, btnPrimary } from "../_components/ui";

export default async function AdminActivities() {
  await requireAdmin();
  const [items, names] = await Promise.all([listActivitiesAdmin(), contributorNames()]);

  return (
    <>
      <PageTitle
        aside={
          <Link href="/admin/activities/new" className={btnPrimary}>
            + 할 거리 추가
          </Link>
        }
      >
        할 거리
      </PageTitle>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          아직 없어요. 「+ 할 거리 추가」로 행사·상시 체험을 넣어 주세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/activities/${a.id}`} className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-3 hover:border-sea">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold">{a.title_ko}</span>
                  <Pill tone={a.kind === "dated" ? "info" : "ok"}>{a.kind === "dated" ? "기간" : "상시"}</Pill>
                  {a.is_sample ? <Pill tone="muted">샘플</Pill> : null}
                </span>
                <span className="text-sm text-muted">
                  {a.kind === "dated"
                    ? formatDateRange(a.starts_on, a.ends_on, "ko")
                    : formatWeekdays(a.weekdays, "ko")}
                </span>
                <span className={`text-sm ${a.title_en ? "" : "text-salmon-strong"}`}>{a.title_en ?? "영문 제목 없음"}</span>
                <VerifiedNote at={a.verified_at} by={a.verified_by ? (names.get(a.verified_by) ?? null) : null} method={a.verified_method} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
