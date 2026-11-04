import { isRole, type Role } from "./permissions";
import type { StoryStatus } from "./types";

// 이야기 상태 전이 — 저장(save)·검토 요청(submit) 때 다음 상태를 정한다.
// 공개(publish)·돌려보내기(return)·공개 내리기(unpublish)는 publish_story 권한의 별도 액션이 맡는다.
// 핵심 규칙: member 는 어떤 경로로도 published 를 만들지 못하고, 이미 공개된 자기 글을 고치면 다시 검토 대기로 내려간다
// (공개 글을 몰래 바꾸지 못함). 남의 글은 편집·운영만 고친다.

const STATUSES: readonly StoryStatus[] = ["draft", "review", "returned", "published"];

/** 편집·운영은 모든 이야기, member 는 자기가 쓴 이야기만 */
export function canEditStory(role: Role, isAuthor: boolean): boolean {
  if (!isRole(role)) return false;
  return role === "owner" || role === "editor" || isAuthor === true;
}

/** 편집·운영은 모두 볼 수 있다(검토 권한). member 는 남의 글 중 공개(published) 글만 — 초안·검토중·돌려받은 글은 못 본다 */
function isReviewerRole(role: Role): boolean {
  return isRole(role) && (role === "owner" || role === "editor");
}

/** 관리 화면 목록·상세에서 이 이야기를 보여 줘도 되는가 (서버 페이지가 판정) */
export function canViewStory(role: Role, isAuthor: boolean, status: StoryStatus): boolean {
  if (!isRole(role)) return false;
  return isReviewerRole(role) || isAuthor === true || status === "published";
}

/** 돌려보내기 메모(review_note)는 글쓴이와 편집·운영만 본다 */
export function canSeeReviewNote(role: Role, isAuthor: boolean): boolean {
  return isReviewerRole(role) || (isRole(role) && isAuthor === true);
}

export function nextStatusOnSave(
  current: StoryStatus,
  role: Role,
  isAuthor: boolean,
  intent: "save" | "submit",
): StoryStatus | "forbidden" {
  if (!canEditStory(role, isAuthor)) return "forbidden";
  if (!STATUSES.includes(current)) return "forbidden";
  if (intent === "submit") return "review";
  if (intent !== "save") return "forbidden";
  if (current === "published") return role === "member" ? "review" : "published";
  return current;
}
