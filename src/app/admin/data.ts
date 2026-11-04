import "server-only";
import { isUuid } from "@/lib/admin-input";
import { sampleOptions, sampleValues, showSamples } from "@/lib/samples";
import { serviceClient } from "@/lib/supabase";
import type { Role } from "@/lib/permissions";
import type {
  Amenity,
  MenuItem,
  PlaceCategory,
  PlayCategory,
  StoryBlock,
  StoryStatus,
  StoryTag,
  StoryType,
  VerifiedMethod,
  WeeklyHours,
} from "@/lib/types";

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
  /** 0003 이후 칸. 적용 전 DB 에서는 없을 수 있다 */
  amenities?: Amenity[];
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
  /** 0003 이후 칸. 적용 전 DB 에서는 없을 수 있다 */
  category?: PlayCategory;
  season_months?: number[];
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
  role: Role;
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

/** 재확인 목록용 공개 이야기 — 원본 stories 테이블에서 status='published' 만(0003 적용 후) */
export interface AdminPublishedStory {
  id: string;
  slug: string;
  type: StoryType;
  guide_topic: string | null;
  title_ko: string;
  blocks: StoryBlock[];
  published_at: string | null;
  verified_at: string | null;
  is_sample: boolean;
}

export async function listPublishedStoriesAdmin(): Promise<AdminPublishedStory[]> {
  const rows =
    must(
      "이야기",
      await serviceClient()
        .from("stories")
        .select("id,slug,type,guide_topic,title_ko,blocks,published_at,verified_at,is_sample")
        .eq("status", "published")
        .order("published_at", { ascending: false }),
    ) ?? [];
  // blocks 는 jsonb — 배열이 아니면(망가진 행) 빈 배열로 본다
  return (rows as AdminPublishedStory[]).map((s) => ({ ...s, blocks: Array.isArray(s.blocks) ? s.blocks : [] }));
}

// ───────────────────────── 이야기 (관리) ─────────────────────────
// 원본 stories 는 초안·검토·돌려받음·메모까지 담는다 → 관리 화면에서만 service role 로 읽는다(R19).

export interface AdminStory {
  id: string;
  slug: string;
  type: StoryType;
  guide_topic: string | null;
  title_ko: string;
  title_en: string | null;
  summary_ko: string | null;
  summary_en: string | null;
  cover_photo: string | null;
  visited_on: string | null;
  tags: StoryTag[];
  blocks: StoryBlock[];
  status: StoryStatus;
  review_note: string | null;
  author_id: string | null;
  published_at: string | null;
  verified_at: string | null;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
}

/** 목록 한 줄 — 본문(blocks)은 needsCheck 판정용으로만 같이 읽는다 */
export type AdminStoryListItem = Pick<
  AdminStory,
  | "id"
  | "slug"
  | "type"
  | "title_ko"
  | "status"
  | "author_id"
  | "cover_photo"
  | "blocks"
  | "published_at"
  | "is_sample"
  | "created_at"
  | "updated_at"
>;

const STORY_LIST_COLS = "id,slug,type,title_ko,status,author_id,cover_photo,blocks,published_at,is_sample,created_at,updated_at";

function cleanBlocks<T extends { blocks: unknown }>(s: T): T & { blocks: StoryBlock[] } {
  return { ...s, blocks: Array.isArray(s.blocks) ? (s.blocks as StoryBlock[]) : [] };
}

export async function listStoriesAdmin(
  f: {
    authorId?: string;
    /** member 의 「전체」: 이 사람이 쓴 글 + 남의 글은 공개(published)만 */
    visibleToMember?: string;
    status?: StoryStatus[];
    order?: "updated" | "oldest" | "published";
    limit?: number;
  } = {},
): Promise<AdminStoryListItem[]> {
  let q = serviceClient().from("stories").select(STORY_LIST_COLS);
  if (f.authorId) q = q.eq("author_id", f.authorId);
  if (f.visibleToMember) {
    if (!isUuid(f.visibleToMember)) return [];
    q = q.or(`author_id.eq.${f.visibleToMember},status.eq.published`);
  }
  if (f.status?.length) q = q.in("status", f.status);
  if (f.order === "oldest") q = q.order("updated_at", { ascending: true });
  else if (f.order === "published") q = q.order("published_at", { ascending: false, nullsFirst: false });
  else q = q.order("updated_at", { ascending: false });
  q = q.limit(Math.min(Math.max(f.limit ?? 200, 1), 500));
  const rows = must("이야기", await q) ?? [];
  return (rows as AdminStoryListItem[]).map(cleanBlocks);
}

export async function getStoryAdmin(id: string): Promise<AdminStory | null> {
  const row = must("이야기", await serviceClient().from("stories").select("*").eq("id", id).maybeSingle());
  return row ? cleanBlocks(row as AdminStory) : null;
}

/** 운영(샘플 숨김) 기준 개수 — 관리 홈 카드용 */
export async function countStoriesAdmin(f: { status: StoryStatus; authorId?: string }): Promise<number> {
  let q = serviceClient()
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("status", f.status)
    .in("is_sample", sampleValues());
  if (f.authorId) q = q.eq("author_id", f.authorId);
  const { count, error } = await q;
  if (error) throw new Error(`이야기 개수 조회 실패: ${error.message}`);
  return count ?? 0;
}

export interface StopOption {
  id: string;
  /** 고르기 목록에 보일 이름 (샘플이면 「 (샘플)」) */
  name: string;
  /** 분류 키 (장소 7종 / 놀거리 8종) */
  category: string;
  /** 장소가 휴업이면 true */
  closed: boolean;
}

/** sampleOptions 규칙 그대로, 지금 연결된 것(keep)은 여러 개 남긴다 */
function withSampleRule<T extends { id: string; name_ko: string; is_sample: boolean }>(
  rows: T[],
  keep: ReadonlySet<string>,
): { row: T; name: string }[] {
  const show = showSamples();
  const named = new Map([
    ...sampleOptions(rows.filter((r) => keep.has(r.id)), true),
    ...sampleOptions(rows.filter((r) => !keep.has(r.id)), show),
  ].map((o) => [o.id, o.name_ko]));
  return rows.filter((r) => named.has(r.id)).map((row) => ({ row, name: named.get(row.id) as string }));
}

/**
 * 「들른 곳」 고르기용 장소·놀거리 목록. 운영에서는 샘플을 빼고(미리보기는 「 (샘플)」),
 * 이 이야기에 이미 연결된 것은 샘플이어도 남긴다 — 저장할 때 연결이 풀리지 않게(placeOptions 와 같은 규칙).
 */
export async function stopOptions(keep: { placeIds: string[]; activityIds: string[] } = { placeIds: [], activityIds: [] }): Promise<{
  places: StopOption[];
  activities: StopOption[];
}> {
  const db = serviceClient();
  const [p, a] = await Promise.all([
    db.from("places").select("id,name_ko,category,status,is_sample").order("name_ko"),
    db.from("activities").select("id,title_ko,category,is_sample").order("title_ko"),
  ]);
  const places = (must("가게", p) ?? []) as { id: string; name_ko: string; category: string; status: string; is_sample: boolean }[];
  const acts = (must("할 거리", a) ?? []) as { id: string; title_ko: string; category: string; is_sample: boolean }[];
  return {
    places: withSampleRule(places, new Set(keep.placeIds)).map(({ row, name }) => ({
      id: row.id,
      name,
      category: row.category,
      closed: row.status === "closed",
    })),
    activities: withSampleRule(
      acts.map((x) => ({ ...x, name_ko: x.title_ko })),
      new Set(keep.activityIds),
    ).map(({ row, name }) => ({ id: row.id, name, category: row.category, closed: false })),
  };
}
