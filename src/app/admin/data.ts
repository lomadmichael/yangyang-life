import "server-only";
import { sampleOptions, showSamples } from "@/lib/samples";
import { serviceClient } from "@/lib/supabase";
import type { MenuItem, PlaceCategory, VerifiedMethod, WeeklyHours } from "@/lib/types";

// 관리 화면 읽기 — 원본 테이블을 service role 로 읽는다(anon 은 원본 권한 0).

export interface AdminPlace {
  id: string;
  code: string;
  slug: string;
  category: PlaceCategory;
  status: "participating" | "listed" | "closed";
  name_ko: string;
  name_en: string | null;
  name_roman: string | null;
  summary_ko: string | null;
  summary_en: string | null;
  address_ko: string;
  lat: number;
  lng: number;
  hours: WeeklyHours;
  price_level: 1 | 2 | 3;
  parking: boolean | null;
  foreign_card: boolean | null;
  how_to_get_ko: string | null;
  how_to_get_en: string | null;
  photos: string[];
  verified_method: VerifiedMethod;
  verified_at: string | null;
  verified_by: string | null;
  created_by: string | null;
  is_sample: boolean;
  updated_at: string;
}

export interface AdminActivity {
  id: string;
  kind: "dated" | "always";
  title_ko: string;
  title_en: string | null;
  desc_ko: string | null;
  desc_en: string | null;
  place_id: string | null;
  location_ko: string | null;
  location_en: string | null;
  starts_on: string | null;
  ends_on: string | null;
  weekdays: number[];
  time_note_ko: string | null;
  time_note_en: string | null;
  rainy_ok: boolean;
  link: string | null;
  verified_method: VerifiedMethod;
  verified_at: string | null;
  verified_by: string | null;
  created_by: string | null;
  is_sample: boolean;
}

export interface AdminContributor {
  id: string;
  display_name: string;
  team: string | null;
  role_label: string | null;
  cohort: string | null;
  show: boolean;
  role: "owner" | "member";
  has_code: boolean;
  is_sample: boolean;
  created_at: string;
}

function must<T>(what: string, r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(`${what} 조회 실패: ${r.error.message}`);
  return r.data as T;
}

export async function listPlacesAdmin(): Promise<AdminPlace[]> {
  return must("가게", await serviceClient().from("places").select("*").order("name_ko")) ?? [];
}

export async function getPlaceAdmin(id: string): Promise<AdminPlace | null> {
  return must("가게", await serviceClient().from("places").select("*").eq("id", id).maybeSingle());
}

export async function listMenuAdmin(placeId: string): Promise<MenuItem[]> {
  return (
    must(
      "메뉴",
      await serviceClient()
        .from("menu_items")
        .select("id,place_id,sort,name_ko,name_roman,name_en,desc_en,price,allergens,vegan,spicy")
        .eq("place_id", placeId)
        .order("sort"),
    ) ?? []
  );
}

export async function listActivitiesAdmin(): Promise<AdminActivity[]> {
  return (
    must(
      "할 거리",
      await serviceClient()
        .from("activities")
        .select("*")
        .order("starts_on", { ascending: false, nullsFirst: true })
        .order("title_ko"),
    ) ?? []
  );
}

export async function getActivityAdmin(id: string): Promise<AdminActivity | null> {
  return must("할 거리", await serviceClient().from("activities").select("*").eq("id", id).maybeSingle());
}

export async function listContributorsAdmin(): Promise<AdminContributor[]> {
  const rows =
    must(
      "기여자",
      await serviceClient()
        .from("contributors")
        .select("id,display_name,team,role_label,cohort,show,role,access_code_hash,is_sample,created_at")
        .order("is_sample")
        .order("created_at"),
    ) ?? [];
  // 해시 값 자체는 화면으로 보내지 않는다
  return (rows as (AdminContributor & { access_code_hash: string | null })[]).map(
    ({ access_code_hash, ...c }) => ({ ...c, has_code: Boolean(access_code_hash) }),
  );
}

/** id → 표시 이름 (확인자·등록자 표기용) */
export async function contributorNames(): Promise<Map<string, string>> {
  const rows = must("기여자", await serviceClient().from("contributors").select("id,display_name")) ?? [];
  return new Map((rows as { id: string; display_name: string }[]).map((r) => [r.id, r.display_name]));
}

/**
 * 「연결할 가게」 고르기용. 운영(샘플 숨김)에서는 샘플 가게를 빼고,
 * 미리보기에서는 이름 뒤에 「 (샘플)」을 붙인다. keepId(지금 연결된 가게)는 샘플이어도 남긴다.
 */
export async function placeOptions(keepId?: string | null): Promise<{ id: string; name_ko: string }[]> {
  const rows: { id: string; name_ko: string; is_sample: boolean }[] =
    must("가게", await serviceClient().from("places").select("id,name_ko,is_sample").order("name_ko")) ?? [];
  return sampleOptions(rows, showSamples(), keepId);
}

// 재확인 기준(90일)·판정은 공개 화면과 같이 쓰도록 lib 로 옮겼다
export { isStale } from "@/lib/stale";
