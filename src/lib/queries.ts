import "server-only";
import { anonClient } from "./supabase";
import type { Activity, Contributor, MenuItem, Place, PublicTip } from "./types";

// 공개 읽기 함수 — 전부 anon 키로 *_public 뷰만 읽는다.
// YL_SHOW_SAMPLES === "1" 이 아니면 샘플(is_sample=true)은 빼고 돌려준다.

/** .in("is_sample", sampleValues()) 로 쓴다 — 샘플 숨김이면 [false], 표시면 [false, true] */
function sampleValues(): boolean[] {
  return process.env.YL_SHOW_SAMPLES === "1" ? [false, true] : [false];
}

function fail(what: string, error: { message: string }): never {
  throw new Error(`${what} 조회 실패: ${error.message}`);
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
