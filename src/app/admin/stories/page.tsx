import Link from "next/link";
import { STORY_TYPE_KO } from "@/lib/admin-input";
import { formatVerifiedDate } from "@/lib/format";
import { requireAdmin } from "../auth";
import { contributorNames, listStoriesAdmin } from "../data";
import { STORY_STATUS_KO, STORY_STATUS_TONE } from "../_components/story-values";
import { PageTitle, Pill, btnPrimary } from "../_components/ui";

// F32 이야기 목록(관리) — 탭 「내 글 / 전체」. 원본 stories 를 service role 로(초안·검토 포함, 관리 화면에서만).

export default async function AdminStories({ searchParams }: PageProps<"/admin/stories">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const all = sp.all === "1";
  const [items, names] = await Promise.all([
    listStoriesAdmin(all ? {} : { authorId: admin.id }),
    contributorNames(),
  ]);

  const tab = (on: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${on ? "border-sea bg-sea-soft font-medium text-sea" : "border-line bg-surface"}`;

  return (
    <>
      <PageTitle
        aside={
          <Link href="/admin/stories/new" className={btnPrimary}>
            + 이야기 쓰기
          </Link>
        }
      >
        이야기
      </PageTitle>
      <div className="flex gap-2">
        <Link href="/admin/stories" aria-current={!all ? "page" : undefined} className={tab(!all)}>
          내 글
        </Link>
        <Link href="/admin/stories?all=1" aria-current={all ? "page" : undefined} className={tab(all)}>
          전체
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          {all ? "아직 이야기가 없어요." : "아직 쓴 이야기가 없어요. 「+ 이야기 쓰기」로 다녀온 코스·만난 사람·가이드를 남겨 주세요."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((s) => {
            const author = s.author_id ? names.get(s.author_id) : null;
            const edited = formatVerifiedDate(s.updated_at, "ko");
            return (
              <li key={s.id}>
                <Link
                  href={`/admin/stories/${s.id}`}
                  className={`flex flex-col gap-1 rounded-xl border bg-surface p-3 hover:border-sea ${s.status === "returned" && s.author_id === admin.id ? "border-salmon" : "border-line"}`}
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold">{s.title_ko}</span>
                    <Pill tone={STORY_STATUS_TONE[s.status]}>{STORY_STATUS_KO[s.status]}</Pill>
                    {s.is_sample ? <Pill tone="muted">샘플</Pill> : null}
                  </span>
                  <span className="text-sm text-muted">
                    {[STORY_TYPE_KO[s.type], all ? (author ?? "글쓴이 없음") : null, edited ? `${edited} 고침` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
