"use server";

import { cookies } from "next/headers";
import { isLang, pickText, type Lang } from "@/i18n";
import { listActivitiesByIds, listPlacesByIds, listStoriesByIds } from "@/lib/queries";
import { sanitizeSavedInput } from "@/lib/saved";
import { serviceClient } from "@/lib/supabase";
import { DEVICE_COOKIE, isTipKind, isTipTarget, type TipKind, type TipTarget } from "@/lib/tips";
import type { Activity, Place, Story } from "@/lib/types";

// MY 서버 액션. 방문객 계정이 없으므로 「이 기기」만 본다(R10).
// - 저장 목록: 브라우저가 보낸 id 를 믿지 않고 sanitize → 공개 뷰(anon)에서만 읽는다
// - 내 팁: httpOnly 기기 쿠키로 원본 tips 를 service role 로 읽되, device_id·contact 는 돌려주지 않는다

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MY_TIPS_MAX = 50;

export async function loadSaved(s: unknown): Promise<{ places: Place[]; activities: Activity[]; stories: Story[] }> {
  const clean = sanitizeSavedInput(s);
  // listXxxByIds 는 넘겨준 순서(저장 순서)대로 돌려주고, 공개 화면에 안 보이는 id 는 조용히 뺀다
  const [places, activities, stories] = await Promise.all([
    listPlacesByIds(clean.place),
    listActivitiesByIds(clean.activity),
    listStoriesByIds(clean.story),
  ]);
  return { places, activities, stories };
}

export type MyTip = {
  id: string;
  target_type: TipTarget;
  target_id: string;
  /** 공개 화면에 안 보이는 대상(지워짐·샘플 숨김 등)이면 null */
  target_name: string | null;
  /** 상세 화면 주소 조각(장소·이야기 = slug, 놀거리 = id). 대상이 안 보이면 null */
  target_path: string | null;
  kind: TipKind;
  body: string;
  created_at: string;
  handled: boolean;
};

const DETAIL_SEGMENT: Record<TipTarget, string> = { place: "place", activity: "activity", story: "stories" };

export async function listMyTips(rawLang: string = "ko"): Promise<MyTip[]> {
  const lang: Lang = isLang(rawLang) ? rawLang : "ko";
  const jar = await cookies();
  const did = jar.get(DEVICE_COOKIE)?.value;
  if (!did || !UUID_RE.test(did)) return [];

  // device_id·contact 는 select 하지 않는다 — 처음부터 메모리에도 올리지 않는다
  const { data, error } = await serviceClient()
    .from("tips")
    .select("id,target_type,target_id,kind,body,created_at,handled_at")
    .eq("device_id", did)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(MY_TIPS_MAX);
  if (error) {
    // 쿠키 값은 남기지 않는다
    console.error("[listMyTips]", error.message);
    throw new Error("내 팁 조회 실패");
  }

  type Row = { id: string; target_type: TipTarget; target_id: string; kind: TipKind; body: string; created_at: string; handled_at: string | null };
  const rows = ((data ?? []) as Record<string, unknown>[]).filter(
    (r): r is Row => isTipTarget(r.target_type) && isTipKind(r.kind),
  );
  const ids = (type: TipTarget) => [...new Set(rows.filter((r) => r.target_type === type).map((r) => r.target_id))];

  // 대상 이름은 공개 뷰에서만 — 공개 화면 규칙(샘플 숨김 포함)과 같게 보인다
  const [places, activities, stories] = await Promise.all([
    listPlacesByIds(ids("place")),
    listActivitiesByIds(ids("activity")),
    listStoriesByIds(ids("story")),
  ]);
  const targets = new Map<string, { name: string; path: string }>();
  const name = (row: object, field: string) => pickText(row as Record<string, unknown>, field, lang).text;
  for (const p of places) targets.set(`place:${p.id}`, { name: name(p, "name"), path: p.slug });
  for (const a of activities) targets.set(`activity:${a.id}`, { name: name(a, "title"), path: a.id });
  for (const s of stories) targets.set(`story:${s.id}`, { name: name(s, "title"), path: s.slug });

  return rows.map((r) => {
    const target = targets.get(`${r.target_type}:${r.target_id}`) ?? null;
    return {
      id: r.id,
      target_type: r.target_type,
      target_id: r.target_id,
      target_name: target?.name ?? null,
      target_path: target ? `/${lang}/${DETAIL_SEGMENT[r.target_type]}/${target.path}` : null,
      kind: r.kind,
      body: r.body,
      created_at: r.created_at,
      handled: r.handled_at != null,
    };
  });
}
