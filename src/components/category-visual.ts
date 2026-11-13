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

// 사진이 없는 카드에 까는 분류별 그림·바탕색. 색은 토큰 옅은 바탕만 쓴다.

export type VisualTone = "sea" | "pine" | "salmon" | "sand";
export type Visual = { Icon: ComponentType<{ className?: string }>; tone: VisualTone };

export const PLACE_VISUAL: Record<PlaceCategory, Visual> = {
  food: { Icon: IconUtensils, tone: "salmon" },
  cafe: { Icon: IconCup, tone: "sand" },
  stay: { Icon: IconBed, tone: "sea" },
  surf: { Icon: IconWave, tone: "sea" },
  bar: { Icon: IconGlass, tone: "salmon" },
  spot: { Icon: IconMountain, tone: "pine" },
  life: { Icon: IconPin, tone: "sand" },
};

export const PLAY_VISUAL: Record<PlayCategory, Visual> = {
  surf: { Icon: IconWave, tone: "sea" },
  festival: { Icon: IconSparkle, tone: "salmon" },
  eco: { Icon: IconLeaf, tone: "pine" },
  hike: { Icon: IconMountain, tone: "pine" },
  fishing: { Icon: IconFish, tone: "sea" },
  walk: { Icon: IconPin, tone: "pine" },
  yoga: { Icon: IconSun, tone: "salmon" },
  village: { Icon: IconHome, tone: "sand" },
};

/** 이야기 갈래 — 배지 색(코스 salmon · 사람 pine · 가이드 sea)과 맞춘다 */
export const STORY_VISUAL: Record<StoryType, Visual> = {
  course: { Icon: IconPin, tone: "salmon" },
  people: { Icon: IconUser, tone: "pine" },
  guide: { Icon: IconBook, tone: "sea" },
};

/** 모르는 값(새 분류가 DB 에 먼저 생긴 경우)도 화면이 무너지지 않게 */
export const FALLBACK_VISUAL: Visual = { Icon: IconPin, tone: "sea" };
