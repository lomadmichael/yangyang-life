import type { ComponentType } from "react";
import type { PlaceCategory, PlayCategory, StoryType } from "@/lib/types";
import {
  IconBed,
  IconBook,
  IconCup,
  IconFish,
  IconGlass,
  IconHome,
  IconLeaf,
  IconMountain,
  IconPin,
  IconSparkle,
  IconSun,
  IconUser,
  IconUtensils,
  IconWave,
} from "./icons";

// 사진이 없는 카드에 까는 분류별 그림·바탕색·대표 사진. 색은 토큰 옅은 바탕만 쓴다.
// photo = public/images 의 분류 대표 사진(출처 public/images/CREDITS.md). 그 가게·행사의 실제 사진이 아니다 —
// 카드에는 그대로 쓰고, 상세의 큰 사진 자리에 쓸 때는 「분류 대표 사진」 표시를 붙인다(PhotoFrame fallbackLabel).
// 맞는 사진이 없는 분류(펍·바, 생활 편의)는 photo 없이 아이콘 바탕만.

export type VisualTone = "sea" | "pine" | "salmon" | "sand";
export type Visual = { Icon: ComponentType<{ className?: string }>; tone: VisualTone; photo?: string };

export const PLACE_VISUAL: Record<PlaceCategory, Visual> = {
  food: { photo: "/images/cat-food.jpg", Icon: IconUtensils, tone: "salmon" },
  cafe: { photo: "/images/cat-cafe.jpg", Icon: IconCup, tone: "sand" },
  stay: { photo: "/images/cat-stay.jpg", Icon: IconBed, tone: "sea" },
  surf: { photo: "/images/cat-surf.jpg", Icon: IconWave, tone: "sea" },
  bar: { Icon: IconGlass, tone: "salmon" },
  spot: { photo: "/images/cat-spot.jpg", Icon: IconMountain, tone: "pine" },
  life: { Icon: IconPin, tone: "sand" },
};

export const PLAY_VISUAL: Record<PlayCategory, Visual> = {
  surf: { photo: "/images/play-surf.jpg", Icon: IconWave, tone: "sea" },
  festival: { photo: "/images/play-festival.jpg", Icon: IconSparkle, tone: "salmon" },
  eco: { photo: "/images/play-eco.jpg", Icon: IconLeaf, tone: "pine" },
  hike: { photo: "/images/play-hike.jpg", Icon: IconMountain, tone: "pine" },
  fishing: { photo: "/images/play-fishing.jpg", Icon: IconFish, tone: "sea" },
  walk: { photo: "/images/play-walk.jpg", Icon: IconPin, tone: "pine" },
  yoga: { photo: "/images/play-yoga.jpg", Icon: IconSun, tone: "salmon" },
  village: { photo: "/images/play-village.jpg", Icon: IconHome, tone: "sand" },
};

/** 이야기 갈래 — 배지 색(코스 salmon · 사람 pine · 가이드 sea)과 맞춘다 */
export const STORY_VISUAL: Record<StoryType, Visual> = {
  course: { photo: "/images/story-course.jpg", Icon: IconPin, tone: "salmon" },
  people: { photo: "/images/story-people.jpg", Icon: IconUser, tone: "pine" },
  guide: { photo: "/images/story-guide.jpg", Icon: IconBook, tone: "sea" },
};

/** 모르는 값(새 분류가 DB 에 먼저 생긴 경우)도 화면이 무너지지 않게 */
export const FALLBACK_VISUAL: Visual = { Icon: IconPin, tone: "sea" };
