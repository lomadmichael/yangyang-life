import "server-only";
import { sampleValues } from "./samples";
import { anonClient } from "./supabase";
import type { Activity, Contributor, MenuItem, Place, PublicTip, Story, StoryTag, StoryType } from "./types";

// 공개 읽기 함수 — 전부 anon 키로 *_public 뷰만 읽는다.
// YL_SHOW_SAMPLES === "1" 이 아니면 샘플(is_sample=true)은 빼고 돌려준다.

function fail(what: string, error: { message: string }): never {
  throw new Error(`${what} 조회 실패: ${error.message}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** id 묶음 조회 한 번에 받는 최대 개수 (MY 저장 상한과 같다) */
export const BY_IDS_MAX = 100;

/** uuid 모양만, 중복 없이, 최대 BY_IDS_MAX 개 — 이상한 값이 DB 형 변환 오류를 내지 않게 */
function cleanIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter((id) => typeof id === "string" && UUID_RE.test(id)))].slice(0, BY_IDS_MAX);
}

export async function listPlaces(): Promise<Place[]> {
  const { data, error } = await anonClient()
    .from("places_public")
    .select("*")
    .in("is_sample", sampleValues())
    .order("name_ko");
  if (error) fail("가게 목록", error);
  return (data ?? []) as Place[];
}

async function getPlaceBy(column: "slug" | "code", value: string): Promise<Place | null> {
  const { data, error } = await anonClient()
    .from("places_public")
    .select("*")
    .eq(column, value)
    .in("is_sample", sampleValues())
    .maybeSingle();
  if (error) fail(`가게(${column})`, error);
  return (data as Place | null) ?? null;
}

export function getPlaceBySlug(slug: string): Promise<Place | null> {
  return getPlaceBy("slug", slug);
}

export function getPlaceByCode(code: string): Promise<Place | null> {
  return getPlaceBy("code", code);
}

export async function listMenu(placeId: string): Promise<MenuItem[]> {
  const { data, error } = await anonClient()
    .from("menu_items_public")
    .select("id,place_id,sort,name_ko,name_roman,name_en,desc_en,price,allergens,vegan,spicy")
    .eq("place_id", placeId)
    .in("is_sample", sampleValues())
    .order("sort");
  if (error) fail("메뉴", error);
  return (data ?? []) as MenuItem[];
}

export async function listActivities(): Promise<Activity[]> {
  const { data, error } = await anonClient()
    .from("activities_public")
    .select("*")
    .in("is_sample", sampleValues())
    .order("starts_on", { ascending: true, nullsFirst: false })
    .order("title_ko");
  if (error) fail("할 거리", error);
  return (data ?? []) as Activity[];
}

export async function listContributors(): Promise<Contributor[]> {
  const { data, error } = await anonClient()
    .from("contributors_public")
    .select("id,display_name,team,role_label,cohort,show")
    .in("is_sample", sampleValues())
    .order("display_name");
  if (error) fail("기여자", error);
  return (data ?? []) as Contributor[];
}

export async function listTips(targetType: PublicTip["target_type"], targetId: string): Promise<PublicTip[]> {
  // tips_public.is_sample = 대상(가게·할 거리)의 is_sample → 샘플 대상의 팁도 같은 규칙으로 숨긴다
  const { data, error } = await anonClient()
    .from("tips_public")
    .select("id,target_type,target_id,kind,body,nickname,lang,created_at,handled")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .in("is_sample", sampleValues())
    .order("created_at", { ascending: false });
  if (error) fail("팁", error);
  return (data ?? []) as PublicTip[];
}

const TIP_TARGET_VIEW: Record<PublicTip["target_type"], string> = {
  place: "places_public",
  activity: "activities_public",
  story: "stories_public",
};

/** 팁을 달 대상이 공개 화면에 보이는 가게·놀거리·이야기인지 (샘플 규칙도 화면과 같게) */
export async function tipTargetExists(targetType: PublicTip["target_type"], targetId: string): Promise<boolean> {
  const view = TIP_TARGET_VIEW[targetType];
  const { data, error } = await anonClient()
    .from(view)
    .select("id")
    .eq("id", targetId)
    .in("is_sample", sampleValues())
    .maybeSingle();
  if (error) fail("팁 대상", error);
  return data !== null;
}

// ── 이야기 ────────────────────────────────────────────────
// stories_public 은 status='published' 만 담고 status·review_note 칸이 없다.

export async function listStories(f: { type?: StoryType; tag?: StoryTag; authorId?: string } = {}): Promise<Story[]> {
  let q = anonClient().from("stories_public").select("*").in("is_sample", sampleValues());
  if (f.type) q = q.eq("type", f.type);
  if (f.tag) q = q.contains("tags", [f.tag]);
  if (f.authorId) q = q.eq("author_id", f.authorId);
  const { data, error } = await q.order("published_at", { ascending: false });
  if (error) fail("이야기 목록", error);
  return (data ?? []) as Story[];
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  const { data, error } = await anonClient()
    .from("stories_public")
    .select("*")
    .eq("slug", slug)
    .in("is_sample", sampleValues())
    .maybeSingle();
  if (error) fail("이야기(slug)", error);
  return (data as Story | null) ?? null;
}

/** 이 장소·놀거리가 「들른 곳」으로 나오는 이야기 — blocks jsonb 포함 검색(GIN 인덱스) */
export async function listStoriesMentioning(kind: "place" | "activity", id: string): Promise<Story[]> {
  if (!UUID_RE.test(id)) return [];
  const probe = kind === "place" ? { place_id: id } : { activity_id: id };
  // jsonb 는 JSON 문자열로 넘겨야 한다 — 배열을 그대로 주면 postgrest-js 가 Postgres 배열 표기({…})로 바꿔 버린다
  const { data, error } = await anonClient()
    .from("stories_public")
    .select("*")
    .contains("blocks", JSON.stringify([probe]))
    .in("is_sample", sampleValues())
    .order("published_at", { ascending: false });
  if (error) fail("이야기 역조회", error);
  return (data ?? []) as Story[];
}

/** 주제(guide_topic)별 가장 최근 가이드 한 편 */
export async function getGuide(topic: string): Promise<Story | null> {
  const { data, error } = await anonClient()
    .from("stories_public")
    .select("*")
    .eq("type", "guide")
    .eq("guide_topic", topic)
    .in("is_sample", sampleValues())
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("가이드", error);
  return (data as Story | null) ?? null;
}

// ── id 묶음 조회 (MY 저장 목록·이야기 들른 곳) ─────────────────

/** 돌려주는 순서는 넘겨준 ids 순서(MY 의 저장 순서). 안 보이는 id 는 빠진다 */
async function listByIds<T extends { id: string }>(view: string, what: string, ids: readonly string[]): Promise<T[]> {
  const clean = cleanIds(ids);
  if (clean.length === 0) return [];
  const { data, error } = await anonClient()
    .from(view)
    .select("*")
    .in("id", clean)
    .in("is_sample", sampleValues());
  if (error) fail(what, error);
  const order = new Map(clean.map((id, i) => [id, i]));
  return ((data ?? []) as T[]).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export function listPlacesByIds(ids: readonly string[]): Promise<Place[]> {
  return listByIds<Place>("places_public", "가게 묶음", ids);
}

export function listActivitiesByIds(ids: readonly string[]): Promise<Activity[]> {
  return listByIds<Activity>("activities_public", "놀거리 묶음", ids);
}

export function listStoriesByIds(ids: readonly string[]): Promise<Story[]> {
  return listByIds<Story>("stories_public", "이야기 묶음", ids);
}
