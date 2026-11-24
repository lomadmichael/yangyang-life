import type { PlayCategory, StoryType } from "@/lib/types";

// 분류 대표 사진 — public/images 의 사진(출처 public/images/CREDITS.md). 그 행사·이야기의 실제 사진이 아니다 →
// 큰 사진 자리에 쓸 때는 「분류 대표 사진」 표시를 붙인다. 한 화면에 같은 사진이 반복되면 두 번째부터 색면(.noimg)으로.
// 장소는 여기 없다 — 해변·명소만 대표 사진을 쓰고 가게는 색면이다(규칙·경로: lib/place-photos.ts placeFallbackPhoto).

/** 사진 틀(PhotoFrame) 바탕색 묶음 이름 */
export type VisualTone = "sea" | "pine" | "salmon" | "sand";
export type Visual = { photo?: string };

export const PLAY_VISUAL: Record<PlayCategory, Visual> = {
  surf: { photo: "/images/play-surf.jpg" },
  festival: { photo: "/images/play-festival.jpg" },
  eco: { photo: "/images/play-eco.jpg" },
  hike: { photo: "/images/play-hike.jpg" },
  fishing: { photo: "/images/play-fishing.jpg" },
  walk: { photo: "/images/play-walk.jpg" },
  yoga: { photo: "/images/play-yoga.jpg" },
  village: { photo: "/images/play-village.jpg" },
};

/** 이야기 갈래 대표 사진 (표지 사진이 없을 때) */
export const STORY_VISUAL: Record<StoryType, Visual> = {
  course: { photo: "/images/story-course.jpg" },
  people: { photo: "/images/story-people.jpg" },
  guide: { photo: "/images/story-guide.jpg" },
};
