import { en } from "./en";
import { ko, type Dict, type DictKey } from "./ko";

export type { Dict, DictKey };

export const LANGS = ["ko", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";

const dictionaries: Record<Lang, Dict> = { ko, en };

export function isLang(v: string): v is Lang {
  return (LANGS as readonly string[]).includes(v);
}

/** Accept-Language 에 한국어(q>0)가 하나라도 있으면 ko, 그 외(없음 포함)는 en. */
export function resolveLang(acceptLanguage: string | null): Lang {
  if (!acceptLanguage) return DEFAULT_LANG;
  const hasKorean = acceptLanguage.split(",").some((part) => {
    const [tag, ...params] = part.trim().toLowerCase().split(";");
    if (tag !== "ko" && !tag.startsWith("ko-")) return false;
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    return q === undefined || Number(q.slice(2)) > 0;
  });
  return hasKorean ? "ko" : DEFAULT_LANG;
}

export function getDict(lang: Lang): Dict {
  return dictionaries[lang];
}

export function t(lang: Lang, key: DictKey): string {
  return dictionaries[lang][key];
}

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

/**
 * DB 행에서 `${base}_${lang}` 값을 고른다. 영문 칸이 비어 있으면
 * `${base}_ko` 를 주고 fallback: true 로 표시한다 (화면에 「영문 준비 중」 표기용).
 */
export function pickText(
  row: Record<string, unknown>,
  base: string,
  lang: Lang,
): { text: string; fallback: boolean } {
  const wanted = row[`${base}_${lang}`];
  if (nonEmpty(wanted)) return { text: wanted, fallback: false };
  const koValue = row[`${base}_ko`];
  return { text: nonEmpty(koValue) ? koValue : "", fallback: lang !== "ko" };
}
