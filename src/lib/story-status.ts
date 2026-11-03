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
