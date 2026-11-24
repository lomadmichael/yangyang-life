import type { DictKey } from "../i18n";

// 주 메뉴 5칸 — 하단 메뉴(BottomNav, 모바일)와 상단 메뉴(TopNav, PC)가 같은 목록·같은 판정을 쓴다.
// 화면 부품 없이 순수 값·함수만 둔다(테스트에서 바로 부른다).

export type Tab = "home" | "places" | "play" | "stories" | "my";

export const NAV_TABS: { tab: Tab; path: string; label: DictKey }[] = [
  { tab: "home", path: "", label: "navHome" },
  { tab: "places", path: "/places", label: "navPlaces" },
  { tab: "play", path: "/play", label: "navPlay" },
  { tab: "stories", path: "/stories", label: "navStories" },
  { tab: "my", path: "/my", label: "navMy" },
];

/** 경로 첫 마디(언어 다음) → 현재 칸. 상세 화면은 부모 칸으로 본다 */
const SECTION: Record<string, Tab> = {
  places: "places",
  place: "places",
  play: "play",
  activity: "play",
  stories: "stories",
  my: "my",
  makers: "my",
};

export function activeTab(pathname: string): Tab | null {
  const first = pathname.split("/")[2] ?? "";
  if (first === "") return "home";
  return SECTION[first] ?? null;
}

/** 화면 가득 표지가 있는 상세 화면의 경로 첫 마디 — 장소·놀거리·이야기 상세 */
const COVER_DETAIL = new Set(["place", "activity", "stories"]);

/**
 * 화면 맨 위가 사진 표지(머리 메뉴가 투명 + 흰 글자로 겹쳐 앉는 화면)인지 — 홈 표지, 장소·놀거리·이야기 상세의 큰 표지.
 * 이런 화면에는 머리 메뉴 아래 빈칸을 두지 않는다. (이야기 목록 /stories 는 표지가 없다)
 */
export function hasCoverHero(pathname: string): boolean {
  const parts = pathname.split("/");
  const first = parts[2] ?? "";
  if (first === "") return true;
  return COVER_DETAIL.has(first) && !!parts[3];
}

/** 영어 메뉴판(QR 착지 /[lang]/m/[code]) — 주 메뉴를 그리지 않는다 */
export function isMenuBoardPath(pathname: string): boolean {
  return pathname.split("/")[2] === "m";
}
