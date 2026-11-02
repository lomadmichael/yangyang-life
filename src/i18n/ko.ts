// 국문 문구 사전 — 키를 추가하면 en.ts 에도 같은 키를 넣어야 타입 검사를 통과한다.
export const ko = {
  siteName: "양양생활",
  siteTagline: "양양에서 오늘 뭐 할지, 뭐 먹을지",
  homeWhatToDo: "오늘 뭐하지?",
  homeWhereToEat: "오늘 뭐 먹지?",
  footerSupport: "양양군농업기술센터 지원",
  englishComingSoon: "영문 준비 중",
  langSwitchLabel: "언어 선택",
  langKo: "한국어",
  langEn: "English",
} as const;

export type DictKey = keyof typeof ko;
export type Dict = Record<DictKey, string>;
