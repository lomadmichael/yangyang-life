import Link from "next/link";
import { redirect } from "next/navigation";
import { STORY_TYPE_KO } from "@/lib/admin-input";
import { formatVerifiedDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { listActivities, listPlaces } from "@/lib/queries";
import { sampleValues } from "@/lib/samples";
import { storyNeedsCheck } from "@/lib/story-blocks";
import { requireAdmin } from "../auth";
import { contributorNames, listStoriesAdmin, type AdminStoryListItem } from "../data";
import { STORY_STATUS_KO, STORY_STATUS_TONE } from "../_components/story-values";
import { Card, PageTitle, Pill } from "../_components/ui";

// F34 검토 — 편집·운영만(member 는 /admin 으로). 검토 대기(오래된 것부터) + 최근 공개한 글(확인 필요 표시).

export default async function ReviewPage() {
  const admin = await requireAdmin();
  if (!can(admin.role, "publish_story")) redirect("/admin");

  const [waitingAll, publishedAll, names, places, activities] = await Promise.all([
    listStoriesAdmin({ status: ["review"], order: "oldest" }),
    listStoriesAdmin({ status: ["published"], order: "published", limit: 20 }),
    contributorNames(),
    listPlaces(),
    listActivities(),
  ]);
  // 운영(샘플 숨김)에서는 샘플 이야기를 뺀다 — 공개 화면·재확인 목록과 같은 범위
  const samples = sampleValues();
  const waiting = waitingAll.filter((s) => samples.includes(s.is_sample));
  const published = publishedAll.filter((s) => samples.includes(s.is_sample));
  // 「확인 필요」는 방문객이 보는 공개 뷰 기준(휴업·사라진 들른 곳)
  const placeMap = new Map(places.map((p) => [p.id, p]));
  const activityMap = new Map(activities.map((a) => [a.id, a]));
  const needsCheck = (s: AdminStoryListItem) => storyNeedsCheck(s.blocks, placeMap, activityMap);

  const row = (s: AdminStoryListItem, dateLine: string) => {
    const author = s.author_id ? (names.get(s.author_id) ?? "글쓴이 없음") : "글쓴이 없음";
    const check = needsCheck(s);
    return (
      <li key={s.id}>
        <Link
          href={`/admin/stories/${s.id}`}
          className={`flex flex-col gap-1 rounded-lg border p-3 hover:border-sea ${check ? "border-salmon" : "border-line"}`}
        >
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold">{s.title_ko}</span>
            <Pill tone={STORY_STATUS_TONE[s.status]}>{STORY_STATUS_KO[s.status]}</Pill>
            {check ? <Pill tone="warn">확인 필요</Pill> : null}
            {s.is_sample ? <Pill tone="muted">샘플</Pill> : null}
          </span>
          <span className="text-sm text-muted">
            {STORY_TYPE_KO[s.type]} · {author}
          </span>
          <span className="text-xs text-muted">
            {[dateLine, s.cover_photo ? null : "대표 사진 없음"].filter(Boolean).join(" · ")}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <PageTitle>검토</PageTitle>
      <p className="-mt-2 text-sm text-muted">
        열어서 미리보기로 읽고 「공개」 또는 「돌려보내기」(메모 필수)를 눌러 주세요. 직접 고친 뒤 공개해도 돼요.
      </p>

      <Card title={`검토 대기 ${waiting.length}`}>
        {waiting.length === 0 ? (
          <p className="text-sm text-muted">검토를 기다리는 이야기가 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {waiting.map((s) => row(s, `검토 요청 ${formatVerifiedDate(s.updated_at, "ko")}`))}
          </ul>
        )}
      </Card>

      <Card title="최근 공개한 글" aside={<span className="text-xs text-muted">공개 내리기는 열어서</span>}>
        {published.length === 0 ? (
          <p className="text-sm text-muted">공개한 이야기가 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {published.map((s) => row(s, s.published_at ? `공개 ${formatVerifiedDate(s.published_at, "ko")}` : "공개"))}
          </ul>
        )}
      </Card>
    </>
  );
}
