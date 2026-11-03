import type { DictKey } from "../i18n";
import type { Amenity, Place, PlaceCategory, PlayCategory, StoryTag, StoryType } from "./types";

// 데이터 값 → 사전 키. 화면 여러 곳에서 같은 이름을 쓰도록 한곳에 모은다.
// 순서는 화면 탭·칩 순서 그대로(고정).

export const CATEGORIES: PlaceCategory[] = ["food", "cafe", "stay", "surf", "bar", "spot", "life"];

export const CATEGORY_KEY: Record<PlaceCategory, DictKey> = {
  food: "catFood",
  cafe: "catCafe",
  stay: "catStay",
  surf: "catSurf",
  bar: "catBar",
  spot: "catSpot",
  life: "catLife",
};

export const PLAY_CATEGORIES: PlayCategory[] = ["surf", "festival", "eco", "hike", "fishing", "walk", "yoga", "village"];

export const PLAY_CATEGORY_KEY: Record<PlayCategory, DictKey> = {
  surf: "playSurf",
  festival: "playFestival",
  eco: "playEco",
  hike: "playHike",
  fishing: "playFishing",
  walk: "playWalk",
  yoga: "playYoga",
  village: "playVillage",
};

export const STORY_TYPES: StoryType[] = ["course", "people", "guide"];

export const STORY_TYPE_KEY: Record<StoryType, DictKey> = {
  course: "storyCourse",
  people: "storyPeople",
  guide: "storyGuide",
};

export const STORY_TAGS: StoryTag[] = ["solo", "couple", "family", "nocar", "rainy"];

export const STORY_TAG_KEY: Record<StoryTag, DictKey> = {
  solo: "tagSolo",
  couple: "tagCouple",
  family: "tagFamily",
  nocar: "tagNocar",
  rainy: "tagRainy",
};

export const AMENITIES: Amenity[] = ["toilet", "shower"];

export const AMENITY_KEY: Record<Amenity, DictKey> = {
  toilet: "amenityToilet",
  shower: "amenityShower",
};

export const PRICE_KEY: Record<Place["price_level"], DictKey> = { 1: "price1", 2: "price2", 3: "price3" };

/** 가격대 기호: 1 → ₩, 2 → ₩₩, 3 → ₩₩₩ */
export function priceSymbol(level: Place["price_level"]): string {
  return "₩".repeat(level);
}
