// MY 저장 — 이 기기의 localStorage 에 id 목록만 둔다.
// 순수 모듈("use client" 아님): window 를 직접 만지지 않고 storage 를 인자로 받는다.
// 사생활 보호 모드·막힌 storage·망가진 JSON 이면 빈 상태로 보고, 예외는 밖으로 내보내지 않는다.

export type SavedKind = "place" | "activity" | "story";
export type SavedState = Record<SavedKind, string[]>;

export const SAVED_KEY = "yl_saved_v1";
/** 종류별 최대 개수 */
export const SAVED_MAX = 100;

const KINDS: SavedKind[] = ["place", "activity", "story"];

function emptyState(): SavedState {
  return { place: [], activity: [], story: [] };
}

function cleanIds(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const ids = v.filter((x): x is string => typeof x === "string" && x.length > 0);
  return [...new Set(ids)].slice(0, SAVED_MAX);
}

export function parseSaved(raw: string | null): SavedState {
  const s = emptyState();
  if (!raw) return s;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return s;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return s;
  const rec = data as Record<string, unknown>;
  for (const k of KINDS) s[k] = cleanIds(rec[k]);
  return s;
}

export function isSaved(s: SavedState, kind: SavedKind, id: string): boolean {
  return s[kind].includes(id);
}

/** 있으면 빼고, 없으면 맨 앞에 넣는다. 상한을 넘으면 뒤(가장 오래된 것)부터 자른다. 원본은 바꾸지 않는다 */
export function toggleSaved(s: SavedState, kind: SavedKind, id: string): SavedState {
  const list = s[kind];
  const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list].slice(0, SAVED_MAX);
  return { ...s, [kind]: next };
}

export function readSaved(storage: Pick<Storage, "getItem"> | null): SavedState {
  if (!storage) return emptyState();
  try {
    return parseSaved(storage.getItem(SAVED_KEY));
  } catch {
    return emptyState();
  }
}

/** 저장 성공 여부만 돌려준다(막힌 storage·용량 초과는 false) */
export function writeSaved(storage: Pick<Storage, "setItem"> | null, s: SavedState): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVED_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
