import Link from "next/link";
import { sampleValues } from "@/lib/samples";
import { serviceClient } from "@/lib/supabase";
import { requireAdmin } from "./auth";
import { Card, PageTitle, btnSecondary } from "./_components/ui";

const STALE_DAYS = 30;

export default async function AdminHome() {
  const admin = await requireAdmin();
  const db = serviceClient();
  const now = new Date();
  const cutoff = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // 운영(샘플 숨김)에서는 샘플 가게·할 거리를 개수에서 뺀다
  const samples = sampleValues();

  const [stale, changed, places, activities] = await Promise.all([
    db
      .from("places")
      .select("id", { count: "exact", head: true })
      .in("is_sample", samples)
      .neq("status", "closed")
      .or(`verified_at.is.null,verified_at.lt.${cutoff}`),
    db
      .from("tips")
      .select("id", { count: "exact", head: true })
      .eq("kind", "changed")
      .is("handled_at", null)
      .eq("hidden", false),
    db.from("places").select("id", { count: "exact", head: true }).in("is_sample", samples),
    db.from("activities").select("id", { count: "exact", head: true }).in("is_sample", samples),
  ]);
  for (const r of [stale, changed, places, activities]) if (r.error) throw new Error(r.error.message);

  return (
    <>
      <PageTitle>안녕하세요, {admin.display_name} 님</PageTitle>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin/places?stale=1" className="rounded-xl border border-line bg-surface p-4 hover:border-sea">
          <p className="text-sm text-muted">확인 {STALE_DAYS}일 지난 가게</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-salmon-strong">{stale.count ?? 0}</p>
          <p className="mt-1 text-xs text-muted">휴업 제외 · 확인 기록 없는 곳 포함</p>
        </Link>
        <Link href="/admin/tips" className="rounded-xl border border-line bg-surface p-4 hover:border-sea">
          <p className="text-sm text-muted">새 「바뀌었어요」 팁</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-sea">{changed.count ?? 0}</p>
          <p className="mt-1 text-xs text-muted">처리 전 · 숨김 제외</p>
        </Link>
      </div>
      <Card title="바로 가기">
        <div className="grid grid-cols-2 gap-2">
          <Link href="/admin/places/new" className={btnSecondary}>
            + 가게 추가
          </Link>
          <Link href="/admin/activities/new" className={btnSecondary}>
            + 할 거리 추가
          </Link>
          <Link href="/admin/places" className={btnSecondary}>
            가게 {places.count ?? 0}곳
          </Link>
          <Link href="/admin/activities" className={btnSecondary}>
            할 거리 {activities.count ?? 0}개
          </Link>
        </div>
      </Card>
      <Card title="입력 순서">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>국문 칸을 먼저 채우고, 영문 칸은 외국인이 읽을 문장으로 채워요.</li>
          <li>현장에서 직접 본 내용이면 저장 뒤 「확인 완료」를 눌러요 — 공개 화면에 「정리·확인: 이름 · 날짜」로 나가요.</li>
          <li>사진·영어 메뉴는 사장님이 동의한 「참여 가게」만 올려요.</li>
        </ol>
      </Card>
    </>
  );
}
