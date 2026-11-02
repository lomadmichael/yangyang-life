import { CATEGORIES } from "./labels";
import type { PlaceFilter } from "./places-filter";
import type { Place } from "./types";

// /eat 의 필터는 주소 쿼리에 산다: ?cat=food&open=1&en=1&price=2

type Raw = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseEatQuery(raw: Raw): PlaceFilter {
  const f: PlaceFilter = {};
  const cat = one(raw.cat);
  if (cat && (CATEGORIES as string[]).includes(cat)) f.category = cat as Place["category"];
  if (one(raw.open) === "1") f.openNow = true;
  if (one(raw.en) === "1") f.englishMenu = true;
  const price = Number(one(raw.price));
  if (price === 1 || price === 2 || price === 3) f.price = price;
  return f;
}

/** 필터 → 쿼리 문자열 (키 순서 고정, 빈 값 생략). 앞에 ? 포함, 없으면 "" */
export function eatQueryString(f: PlaceFilter): string {
  const q = new URLSearchParams();
  if (f.category) q.set("cat", f.category);
  if (f.openNow) q.set("open", "1");
  if (f.englishMenu) q.set("en", "1");
  if (f.price) q.set("price", String(f.price));
  const s = q.toString();
  return s ? `?${s}` : "";
}
