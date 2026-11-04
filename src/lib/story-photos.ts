// 이야기 사진 주소 규칙 — 저장 입력(대표 사진·사진 블록)은 우리 Supabase Storage 공개 주소만 받는다.
// 순수 함수: 환경변수를 직접 읽지 않고 Supabase 주소를 인자로 받는다(서버 액션이 NEXT_PUBLIC_SUPABASE_URL 을 넘긴다).
// 표시(공개 화면·미리보기)는 이 규칙을 쓰지 않는다 — 예전 샘플(example.com) 사진도 그대로 그려진다.

/** 가게·이야기 사진을 같이 쓰는 공개 버킷 */
export const PHOTO_BUCKET = "place-photos";

/** 「{supabase}/storage/v1/object/public/」. Supabase 주소가 https 가 아니거나 비면 null(= 아무 사진도 못 받음) */
export function storagePublicPrefix(supabaseUrl: string | null | undefined): string | null {
  const base = (supabaseUrl ?? "").trim().replace(/\/+$/, "");
  if (!/^https:\/\/[^/?#@\s\\]+$/.test(base)) return null;
  return `${base}/storage/v1/object/public/`;
}

/** 저장해도 되는 사진 주소인가 — Supabase Storage 공개 주소로 시작하고, 정규화해도(.. 등) 그 안에 머무는 것만 */
export function isAllowedPhotoUrl(url: unknown, supabaseUrl: string | null | undefined): url is string {
  if (typeof url !== "string" || url.length > 2000) return false;
  const prefix = storagePublicPrefix(supabaseUrl);
  if (!prefix || !url.startsWith(prefix) || url.length === prefix.length) return false;
  if (/[\s\\]/.test(url)) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  return u.href.startsWith(prefix);
}

/** 우리 버킷 공개 주소 → 버킷 안 경로(stories/{id}/x.jpg). 다른 주소면 null */
export function photoPathFromUrl(url: string, supabaseUrl: string | null | undefined): string | null {
  const prefix = storagePublicPrefix(supabaseUrl);
  if (!prefix) return null;
  const head = `${prefix}${PHOTO_BUCKET}/`;
  if (!url.startsWith(head)) return null;
  const rest = url.slice(head.length).split(/[?#]/)[0];
  try {
    return decodeURIComponent(rest) || null;
  } catch {
    return null;
  }
}

/** 이야기 한 편의 사진 폴더(버킷 안) — 끝에 / 없음 */
export function storyPhotoFolder(storyId: string): string {
  return `stories/${storyId}`;
}

/** Storage list() 한 줄 중 쓰는 칸. 폴더는 id 가 null */
export interface StorageObject {
  name: string;
  id: string | null;
  created_at: string | null;
}

/** 폴더 목록에서 진짜 파일만 (하위 폴더·.emptyFolderPlaceholder 같은 숨김 파일 제외) */
export function realPhotoObjects<T extends StorageObject>(objects: T[]): T[] {
  return objects.filter((o) => o.id !== null && !o.name.startsWith("."));
}

/** 이야기가 지금 쓰는 사진 주소: 대표 사진 + 사진 블록 */
export function storyPhotoUrls(row: { cover_photo: string | null; blocks: { t: string; url?: string }[] }): string[] {
  const urls = row.cover_photo ? [row.cover_photo] : [];
  for (const b of row.blocks) if (b.t === "photo" && typeof b.url === "string" && b.url) urls.push(b.url);
  return urls;
}

/** 방금 올려 아직 「저장」 전인 사진을 지우지 않도록, 이보다 최근에 올라온 파일은 정리에서 뺀다 */
export const ORPHAN_GRACE_MS = 10 * 60 * 1000;

/**
 * 저장 뒤 정리할 사진 — 이야기 폴더의 파일 중 저장된 대표 사진·사진 블록에 없는 것(버킷 안 전체 경로).
 * 안전 장치: Supabase 주소가 없으면 아무것도 안 지운다 · 올린 시각을 모르거나 ORPHAN_GRACE_MS 안이면 남긴다.
 */
export function orphanStoryPhotos(args: {
  storyId: string;
  objects: StorageObject[];
  keptUrls: string[];
  supabaseUrl: string | null | undefined;
  now: Date;
  graceMs?: number;
}): string[] {
  const { storyId, objects, keptUrls, supabaseUrl, now, graceMs = ORPHAN_GRACE_MS } = args;
  if (!storagePublicPrefix(supabaseUrl)) return [];
  const folder = `${storyPhotoFolder(storyId)}/`;
  const kept = new Set(
    keptUrls.map((u) => photoPathFromUrl(u, supabaseUrl)).filter((p): p is string => p !== null),
  );
  const out: string[] = [];
  for (const o of realPhotoObjects(objects)) {
    if (o.name.includes("/")) continue;
    const path = `${folder}${o.name}`;
    if (kept.has(path)) continue;
    const at = o.created_at ? new Date(o.created_at).getTime() : Number.NaN;
    if (!Number.isFinite(at) || now.getTime() - at < graceMs) continue;
    out.push(path);
  }
  return out;
}

/**
 * 다른 이야기 폴더의 사진을 쓰는가 — 저장 뒤 정리가 남의 폴더 파일을 지우면 그 이야기 사진이 깨지므로 막는다.
 * 새 글(storyId null)은 아직 폴더가 없으니 이야기 폴더 사진은 전부 남의 것. 가게 사진 등 stories/ 밖은 상관없다.
 */
export function usesOtherStoryPhoto(
  urls: string[],
  storyId: string | null,
  supabaseUrl: string | null | undefined,
): boolean {
  const own = storyId ? `${storyPhotoFolder(storyId)}/` : null;
  return urls.some((u) => {
    const path = photoPathFromUrl(u, supabaseUrl);
    return path !== null && path.startsWith("stories/") && (own === null || !path.startsWith(own));
  });
}
