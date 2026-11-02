import type { DictKey } from "../i18n";
import type { Place } from "./types";

// 데이터 값 → 사전 키. 화면 여러 곳에서 같은 이름을 쓰도록 한곳에 모은다.

export const CATEGORIES: Place["category"][] = ["food", "cafe", "bar", "surf", "shop"];

export const CATEGORY_KEY: Record<Place["category"], DictKey> = {
  food: "catFood",
  cafe: "catCafe",
  bar: "catBar",
  surf: "catSurf",
  shop: "catShop",
};

export const PRICE_KEY: Record<Place["price_level"], DictKey> = { 1: "price1", 2: "price2", 3: "price3" };

/** 가격대 기호: 1 → ₩, 2 → ₩₩, 3 → ₩₩₩ */
export function priceSymbol(level: Place["price_level"]): string {
  return "₩".repeat(level);
}
