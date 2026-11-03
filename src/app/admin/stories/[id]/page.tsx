import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryBody } from "@/components/StoryBody";
import { STORY_TYPE_KO, guideTopicKo, isUuid } from "@/lib/admin-input";
import { formatVerifiedDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { listActivities, listPlaces } from "@/lib/queries";
import { resolveStops, stopTargets } from "@/lib/story-blocks";
import { canEditStory } from "@/lib/story-status";
import { translationAvailable } from "@/lib/translate";
import { requireAdmin } from "../../auth";
import { contributorNames, getStoryAdmin, stopOptions } from "../../data";
import { StoryEditor } from "../../_components/StoryEditor";
import { StoryReviewPanel } from "../../_components/StoryReviewPanel";
import { STORY_STATUS_KO, STORY_STATUS_TONE, storyToValues } from "../../_components/story-values";
import { Card, PageTitle, Pill } from "../../_components/ui";

const STOP_STATE_KO = { closed: "휴업", missing: "사라짐" } as const;

// 이야기 한 편 — 쓰기(F33) + 편집·운영의 검토(F34)를 한 화면에서.
// 고칠 수 있는지는 화면에서도 canEditStory 로 정하지만, 진짜 판정은 서버 액션(saveStory)이 DB 의 글쓴이로 다시 한다.
export default async function StoryAdminPage({ params }: PageProps<"/admin/stories/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const story = await getStoryAdmin(id);
  if (!story) notFound();

  const isAuthor = story.author_id !== null && story.author_id === admin.id;
  const editable = canEditStory(admin.role, isAuthor);
  const reviewer = can(admin.role, "publish_story");
  const [names, opts, previewPlaces, previewActivities] = await Promise.all([
    contributorNames(),
    editable ? stopOptions(stopTargets(story.blocks)) : Promise.resolve(null),
    listPlaces(),
    listActivities(),
  ]);

  // 방문객 기준으로 들른 곳을 풀어 「확인 필요」를 판정한다(공개 뷰에 없으면 사라짐)
  const resolved = resolveStops(
    story.blocks,
    new Map(previewPlaces.map((p) => [p.id, p])),
    new Map(previewActivities.map((a) => [a.id, a])),
  );
  const problems = resolved
    .filter((r) => r.state !== "ok")
    .map((r) => `${r.n}번 ${r.place?.name_ko ?? r.activity?.title_ko ?? "지워졌거나 숨겨진 곳"} · ${STOP_STATE_KO[r.state as "closed" | "missing"]}`);

  const author = story.author_id ? (names.get(story.author_id) ?? "글쓴이 없음") : "글쓴이 없음";
  const edited = formatVerifiedDate(story.updated_at, "ko");
  const published = formatVerifiedDate(story.published_at, "ko");

  return (
    <>
      <Link href={reviewer && story.status === "review" ? "/admin/review" : "/admin/stories"} className="inline-flex min-h-11 items-center text-sm text-sea">
        ← {reviewer && story.status === "review" ? "검토 목록" : "이야기 목록"}
      </Link>
      <PageTitle>{story.title_ko}</PageTitle>
      <div className="-mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
        <Pill tone={STORY_STATUS_TONE[story.status]}>{STORY_STATUS_KO[story.status]}</Pill>
        {story.is_sample ? <Pill tone="muted">샘플</Pill> : null}
        <span>
          {STORY_TYPE_KO[story.type]}
          {story.guide_topic ? ` · ${guideTopicKo(story.guide_topic)}` : ""} · {author}
          {edited ? ` · ${edited} 고침` : ""}
          {story.status === "published" && published ? ` · 공개 ${published}` : ""}
        </span>
        {story.status === "published" ? (
          <Link href={`/ko/stories/${story.slug}`} target="_blank" className="text-sea underline underline-offset-2">
            공개 화면 보기 ↗
          </Link>
        ) : null}
      </div>

      {story.status === "returned" && story.review_note ? (
        <section className="rounded-xl border border-salmon bg-surface p-4" aria-label="편집 메모">
          <p className="text-sm font-bold text-salmon-strong">돌려받은 이유 (편집 메모)</p>
          <p className="mt-1 whitespace-pre-wrap">{story.review_note}</p>
          <p className="mt-2 text-xs text-muted">고친 뒤 아래 「다시 검토 요청」을 눌러 주세요.</p>
        </section>
      ) : null}

      {problems.length > 0 || !story.cover_photo ? (
        <div role="note" className="rounded-xl bg-salmon-soft p-3 text-sm text-salmon-strong">
          {problems.length > 0 ? (
            <>
              <p className="font-bold">확인 필요 — 들른 곳에 휴업·사라진 곳이 있어요</p>
              <ul className="mt-1">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs">공개해도 휴업 카드는 흐리게, 사라진 곳은 「더 이상 안내하지 않는 곳」으로 보여요.</p>
            </>
          ) : null}
          {!story.cover_photo ? <p className={problems.length ? "mt-2 font-bold" : "font-bold"}>대표 사진 없음</p> : null}
        </div>
      ) : null}

      {reviewer ? (
        <Card title="검토 (편집·운영)">
          <StoryReviewPanel
            id={story.id}
            status={story.status}
            isGuide={story.type === "guide"}
            title={story.title_ko}
            author={author}
          />
          {story.type === "guide" && story.verified_at ? (
            <p className="text-xs text-muted">가이드 마지막 확인 {formatVerifiedDate(story.verified_at, "ko")}</p>
          ) : null}
        </Card>
      ) : null}

      {editable && opts ? (
        <StoryEditor
          storyId={story.id}
          initial={storyToValues(story)}
          status={story.status}
          role={admin.role}
          places={opts.places}
          activities={opts.activities}
          previewPlaces={previewPlaces}
          previewActivities={previewActivities}
          aiEnabled={translationAvailable()}
          authorLine={`글: ${author}`}
          startInPreview={reviewer && story.status === "review"}
        />
      ) : (
        <Card title="미리보기 · 방문객에게 이렇게 보여요">
          <p className="text-sm text-muted">다른 사람이 쓴 글이라 읽기만 할 수 있어요. 고칠 점은 글쓴이나 편집 담당에게 알려 주세요.</p>
          <StoryBody blocks={story.blocks} resolved={resolved} lang="ko" numbered={story.type !== "guide"} />
        </Card>
      )}
    </>
  );
}
