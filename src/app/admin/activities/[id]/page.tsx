import Link from "next/link";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/admin-input";
import { can } from "@/lib/permissions";
import { translationAvailable } from "@/lib/translate";
import { requireAdmin } from "../../auth";
import { contributorNames, getActivityAdmin, placeOptions } from "../../data";
import { ActivityForm } from "../../_components/ActivityForm";
import { activityToValues } from "../../_components/activity-values";
import { DeleteButton } from "../../_components/DeleteButton";
import { VerifiedNote } from "../../_components/VerifiedNote";
import { VerifyPanel } from "../../_components/VerifyPanel";
import { Card, PageTitle, Pill } from "../../_components/ui";

export default async function EditActivityPage({ params }: PageProps<"/admin/activities/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [a, names, places] = await Promise.all([getActivityAdmin(id), contributorNames(), placeOptions()]);
  if (!a) notFound();

  return (
    <>
      <Link href="/admin/activities" className="inline-flex min-h-11 items-center text-sm text-sea">
        ← 할 거리 목록
      </Link>
      <PageTitle>{a.title_ko}</PageTitle>
      <div className="-mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
        {a.is_sample ? <Pill tone="muted">샘플</Pill> : null}
        <span>등록: {(a.created_by && names.get(a.created_by)) || "기록 없음"}</span>
        <Link href={`/ko/activity/${a.id}`} target="_blank" className="text-sea underline underline-offset-2">
          공개 화면 보기 ↗
        </Link>
      </div>

      <Card title="확인 기록">
        <VerifiedNote at={a.verified_at} by={a.verified_by ? (names.get(a.verified_by) ?? null) : null} method={a.verified_method} />
        <VerifyPanel kind="activity" id={a.id} current={a.verified_method} />
      </Card>

      <ActivityForm activityId={a.id} initial={activityToValues(a)} places={places} aiEnabled={translationAvailable()} />

      {can(admin.role, "delete_content") ? (
        <Card title="지우기 (운영 담당만)">
          <DeleteButton kind="activity" id={a.id} name={a.title_ko} />
        </Card>
      ) : null}
    </>
  );
}
