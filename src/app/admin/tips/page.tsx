import Link from "next/link";
import { can } from "@/lib/permissions";
import { serviceClient } from "@/lib/supabase";
import { requireAdmin } from "../auth";
import { TipActions } from "../_components/TipActions";
import { PageTitle, Pill } from "../_components/ui";

interface TipRow {
  id: string;
  target_type: "place" | "activity";
  target_id: string;
  kind: "changed" | "tip" | "directions";
  body: string;
  nickname: string | null;
  lang: "ko" | "en";
  contact: string | null;
  hidden: boolean;
  report_count: number;
  handled_at: string | null;
  created_at: string;
}

const KIND_KO = { changed: "바뀌었어요", tip: "팁", directions: "가는 길" } as const;
const KIND_ORDER = { changed: 0, directions: 1, tip: 2 } as const;

const fmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export default async function TipsInbox({ searchParams }: PageProps<"/admin/tips">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const showDone = sp.done === "1";
  const db = serviceClient();

  let q = db
    .from("tips")
    .select("id,target_type,target_id,kind,body,nickname,lang,contact,hidden,report_count,handled_at,created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (!showDone) q = q.is("handled_at", null);
  const { data, error } = await q;
  if (error) throw new Error(`팁 조회 실패: ${error.message}`);
  const tips = ((data ?? []) as TipRow[]).sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || Number(Boolean(a.handled_at)) - Number(Boolean(b.handled_at)),
  );

  const placeIds = [...new Set(tips.filter((t) => t.target_type === "place").map((t) => t.target_id))];
  const actIds = [...new Set(tips.filter((t) => t.target_type === "activity").map((t) => t.target_id))];
  const [places, acts] = await Promise.all([
    placeIds.length ? db.from("places").select("id,name_ko").in("id", placeIds) : Promise.resolve({ data: [], error: null }),
    actIds.length ? db.from("activities").select("id,title_ko").in("id", actIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const targetName = new Map<string, string>([
    ...((places.data ?? []) as { id: string; name_ko: string }[]).map((p) => [p.id, p.name_ko] as [string, string]),
    ...((acts.data ?? []) as { id: string; title_ko: string }[]).map((a) => [a.id, a.title_ko] as [string, string]),
  ]);
  const canHide = can(admin.role, "hide_tip");

  return (
    <>
      <PageTitle>팁함</PageTitle>
      <p className="-mt-2 text-sm text-muted">
        「바뀌었어요」가 먼저 나와요. 가게 정보를 고친 뒤 「처리 완료」를 눌러 주세요. 연락처는 이 화면에서만 보여요.
        {canHide ? "" : " 숨김/해제는 운영 담당만 할 수 있어요."}
      </p>
      <div className="flex gap-2 text-sm">
        <Link
          href="/admin/tips"
          aria-pressed={!showDone}
          className={`rounded-full border px-3 py-1.5 ${!showDone ? "border-sea bg-sea-soft text-sea" : "border-line bg-surface"}`}
        >
          처리 전
        </Link>
        <Link
          href="/admin/tips?done=1"
          aria-pressed={showDone}
          className={`rounded-full border px-3 py-1.5 ${showDone ? "border-sea bg-sea-soft text-sea" : "border-line bg-surface"}`}
        >
          전체 (처리 완료 포함)
        </Link>
      </div>

      {tips.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          {showDone ? "팁이 없어요." : "처리할 팁이 없어요. 👍"}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tips.map((t) => {
            const name = targetName.get(t.target_id);
            const href = t.target_type === "place" ? `/admin/places/${t.target_id}` : `/admin/activities/${t.target_id}`;
            return (
              <li
                key={t.id}
                className={`flex flex-col gap-2 rounded-xl border bg-surface p-3 ${t.kind === "changed" && !t.handled_at ? "border-salmon" : "border-line"} ${t.hidden ? "opacity-80" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone={t.kind === "changed" ? "warn" : "info"}>{KIND_ORDER[t.kind] === 0 ? `⚠ ${KIND_KO[t.kind]}` : KIND_KO[t.kind]}</Pill>
                  {t.handled_at ? <Pill tone="ok">처리 완료</Pill> : null}
                  {t.hidden ? <Pill tone="muted">숨김</Pill> : null}
                  {t.report_count > 0 ? <Pill tone="warn">신고 {t.report_count}</Pill> : null}
                  <span className="text-xs text-muted">
                    {fmt.format(new Date(t.created_at))} · {t.lang === "en" ? "영어" : "한국어"}
                  </span>
                </div>
                <p className="text-sm">
                  {name ? (
                    <Link href={href} className="font-medium text-sea underline underline-offset-2">
                      {name}
                    </Link>
                  ) : (
                    <span className="text-muted">(지워진 대상)</span>
                  )}
                </p>
                <p className="whitespace-pre-wrap">{t.body}</p>
                <p className="text-xs text-muted">
                  — {t.nickname || "이름 없음"}
                  {t.contact ? (
                    <>
                      {" "}
                      · 연락처: <span className="font-medium text-ink">{t.contact}</span>
                    </>
                  ) : null}
                </p>
                <TipActions id={t.id} handled={Boolean(t.handled_at)} hidden={t.hidden} canHide={canHide} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
