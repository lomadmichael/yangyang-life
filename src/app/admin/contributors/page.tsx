import { can } from "@/lib/permissions";
import { requireAdmin } from "../auth";
import { listContributorsAdmin } from "../data";
import { ContributorAdd, ContributorRow } from "../_components/ContributorEditor";
import { Card, PageTitle } from "../_components/ui";

export default async function ContributorsPage() {
  const admin = await requireAdmin();
  if (!can(admin.role, "manage_contributors")) {
    return (
      <>
        <PageTitle>기여자</PageTitle>
        <p className="rounded-xl border border-line bg-surface p-4 text-sm">기여자 관리는 운영 담당(owner)만 할 수 있어요.</p>
      </>
    );
  }
  const people = await listContributorsAdmin();

  return (
    <>
      <PageTitle>기여자</PageTitle>
      <p className="-mt-2 text-sm text-muted">
        사람마다 개인 코드를 따로 발급해요(나눠 쓰기 금지). 코드는 발급할 때 한 번만 보이고, DB 에는 알아볼 수 없는 값만 남아요.
      </p>
      <Card title="새 기여자">
        <ContributorAdd />
      </Card>
      <ul className="flex flex-col gap-2">
        {people.map((c) => (
          <ContributorRow
            key={c.id}
            isMe={c.id === admin.id}
            initial={{
              id: c.id,
              display_name: c.display_name,
              team: c.team ?? "",
              role_label: c.role_label ?? "",
              cohort: c.cohort ?? "",
              show: c.show,
              role: c.role,
              has_code: c.has_code,
              is_sample: c.is_sample,
            }}
          />
        ))}
      </ul>
    </>
  );
}
