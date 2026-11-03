import Link from "next/link";
import { redirect } from "next/navigation";
import { CATEGORY_KO } from "@/lib/admin-input";
import { seoulParts } from "@/lib/hours";
import { can } from "@/lib/permissions";
import { sampleValues } from "@/lib/samples";
import { GUIDE_STALE_DAYS, STALE_DAYS, isStale } from "@/lib/stale";
import { resolveStops, storyNeedsCheck } from "@/lib/story-blocks";
import type { Activity, Place } from "@/lib/types";
import { requireAdmin } from "../auth";
import {
  contributorNames,
  listActivitiesAdmin,
  listPlacesAdmin,
  listPublishedStoriesAdmin,
  type AdminActivity,
  type AdminPlace,
  type AdminPublishedStory,
} from "../data";
import { VerifiedNote } from "../_components/VerifiedNote";
import { Card, PageTitle, Pill } from "../_components/ui";

// F35 재확인 목록 — 편집·운영만. 장소·놀거리 90일(휴업·끝난 행사 제외, 확인 기록 없음 포함),
// 가이드 180일, 들른 곳이 휴업·사라진 공개 이야기.

const STOP_STATE_KO = { closed: "휴업", missing: "사라짐" } as const;

interface StaleData {
  places: AdminPlace[];
  activities: AdminActivity[];
  guides: AdminPublishedStory[];
  broken: { story: AdminPublishedStory; problems: string[] }[];
  names: Map<string, string>;
}

async function loadStale(now: Date): Promise<StaleData> {
  const samples = sampleValues();
  const today = seoulParts(now).ymd;
  const [allPlaces, allActivities, allStories, names] = await Promise.all([
    listPlacesAdmin(),
    listActivitiesAdmin(),
    listPublishedStoriesAdmin(),
    contributorNames(),
  ]);
  // 운영(샘플 숨김)에서는 샘플을 뺀다 — 공개 화면이 보는 것과 같은 범위
  const placesVisible = allPlaces.filter((p) => samples.includes(p.is_sample));
  const activitiesVisible = allActivities.filter((a) => samples.includes(a.is_sample));
  const stories = allStories.filter((s) => samples.includes(s.is_sample));

  const places = placesVisible.filter((p) => p.status !== "closed" && isStale(p.verified_at, now));
  const activities = activitiesVisible.filter((a) => {
    // 이미 끝난 기간 행사는 다시 확인할 필요가 없다
    const lastDay = a.ends_on ?? a.starts_on;
    if (a.kind === "dated" && lastDay && lastDay < today) return false;
    return isStale(a.verified_at, now);
  });
  // 가이드는 확인일이 없으면 공개일부터 센다(공개 = 검토를 거친 날)
  const guides = stories.filter(
    (s) => s.type === "guide" && isStale(s.verified_at ?? s.published_at, now, GUIDE_STALE_DAYS),
  );

  // resolveStops 는 status 와 존재 여부만 본다. 관리 원본 행을 공개 타입 자리에 넣는다
  const placeMap = new Map(placesVisible.map((p) => [p.id, p as unknown as Place]));
  const activityMap = new Map(activitiesVisible.map((a) => [a.id, a as unknown as Activity]));
  const broken = stories
    .filter((s) => storyNeedsCheck(s.blocks, placeMap, activityMap))
    .map((story) => ({
      story,
      problems: resolveStops(story.blocks, placeMap, activityMap)
        .filter((r) => r.state !== "ok")
        .map((r) => {
          const name = r.place?.name_ko ?? r.activity?.title_ko ?? "지워졌거나 숨겨진 곳";
          return `${r.n}번 ${name} · ${STOP_STATE_KO[r.state as "closed" | "missing"]}`;
        }),
    }));

  return { places, activities, guides, broken, names };
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

export default async function StalePage() {
  const admin = await requireAdmin();
  if (!can(admin.role, "publish_story")) redirect("/admin");

  const now = new Date();
  let data: StaleData | null = null;
  let error: string | null = null;
  try {
    data = await loadStale(now);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <>
      <PageTitle>재확인 목록</PageTitle>
      <p className="-mt-2 text-sm text-muted">
        장소·놀거리는 확인 {STALE_DAYS}일, 가이드는 {GUIDE_STALE_DAYS}일이 지나면 여기에 올라와요. 다시 보고 「확인
        완료」를 누르면 빠져요.
      </p>

      {error || !data ? (
        <div role="alert" className="rounded-xl border border-salmon-strong bg-salmon-soft p-4 text-salmon-strong">
          <p className="font-bold">목록을 불러오지 못했어요</p>
          <p className="mt-1 text-sm">{error ?? "알 수 없는 오류"}</p>
          <p className="mt-1 text-sm">DB 0003 마이그레이션이 아직 적용되지 않았으면 이 화면은 열리지 않아요.</p>
        </div>
      ) : (
        <>
          <Card title={`장소 ${data.places.length}곳`} aside={<span className="text-xs text-muted">휴업 제외</span>}>
            {data.places.length === 0 ? (
              <Empty>다시 확인할 장소가 없어요.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.places.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/places/${p.id}`}
                      className="flex flex-col gap-1 rounded-lg border border-line p-3 hover:border-sea"
                    >
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold">{p.name_ko}</span>
                        <span className="text-xs text-muted">{CATEGORY_KO[p.category]}</span>
                        {p.is_sample ? <Pill tone="muted">샘플</Pill> : null}
                      </span>
                      <VerifiedNote
                        at={p.verified_at}
                        by={p.verified_by ? (data.names.get(p.verified_by) ?? null) : null}
                        method={p.verified_method}
                        stale
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`놀거리 ${data.activities.length}개`} aside={<span className="text-xs text-muted">끝난 행사 제외</span>}>
            {data.activities.length === 0 ? (
              <Empty>다시 확인할 놀거리가 없어요.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.activities.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/admin/activities/${a.id}`}
                      className="flex flex-col gap-1 rounded-lg border border-line p-3 hover:border-sea"
                    >
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold">{a.title_ko}</span>
                        {a.is_sample ? <Pill tone="muted">샘플</Pill> : null}
                      </span>
                      <VerifiedNote
                        at={a.verified_at}
                        by={a.verified_by ? (data.names.get(a.verified_by) ?? null) : null}
                        method={a.verified_method}
                        stale
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`가이드 ${data.guides.length}편`} aside={<span className="text-xs text-muted">{GUIDE_STALE_DAYS}일 기준</span>}>
            {data.guides.length === 0 ? (
              <Empty>다시 확인할 가이드가 없어요.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.guides.map((s) => (
                  <li key={s.id} className="flex flex-col gap-1 rounded-lg border border-line p-3">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/ko/stories/${s.slug}`}
                        target="_blank"
                        className="font-bold text-sea underline underline-offset-2"
                      >
                        {s.title_ko} ↗
                      </Link>
                      {s.is_sample ? <Pill tone="muted">샘플</Pill> : null}
                    </span>
                    <span className="text-xs text-muted">
                      {s.verified_at
                        ? `마지막 확인 ${s.verified_at.slice(0, 10)}`
                        : `확인 기록 없음 · 공개 ${s.published_at?.slice(0, 10) ?? "날짜 없음"}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`들른 곳 확인 필요 이야기 ${data.broken.length}편`}>
            {data.broken.length === 0 ? (
              <Empty>휴업·사라진 곳이 들어간 공개 이야기가 없어요.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.broken.map(({ story, problems }) => (
                  <li key={story.id} className="flex flex-col gap-1 rounded-lg border border-line p-3">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/ko/stories/${story.slug}`}
                        target="_blank"
                        className="font-bold text-sea underline underline-offset-2"
                      >
                        {story.title_ko} ↗
                      </Link>
                      {story.is_sample ? <Pill tone="muted">샘플</Pill> : null}
                    </span>
                    <ul className="text-sm text-salmon-strong">
                      {problems.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </>
  );
}
