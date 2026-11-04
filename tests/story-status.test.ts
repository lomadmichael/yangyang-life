import { describe, expect, it } from "vitest";
import { canEditStory, canSeeReviewNote, canViewStory, nextStatusOnSave } from "../src/lib/story-status";
import type { Role } from "../src/lib/permissions";
import type { StoryStatus } from "../src/lib/types";

const STATUSES: StoryStatus[] = ["draft", "review", "returned", "published"];
const ROLES: Role[] = ["owner", "editor", "member"];

describe("nextStatusOnSave (plan)", () => {
  it("상태 전이", () => {
    expect(nextStatusOnSave("published", "member", true, "save")).toBe("review");
    expect(nextStatusOnSave("published", "editor", false, "save")).toBe("published");
    expect(nextStatusOnSave("draft", "member", false, "save")).toBe("forbidden");
    expect(nextStatusOnSave("returned", "member", true, "submit")).toBe("review");
    expect(nextStatusOnSave("draft", "member", true, "save")).toBe("draft");
  });
});

describe("nextStatusOnSave — 표 전체", () => {
  it("save 는 상태를 그대로 둔다 (member 의 공개 글만 검토로 내려감)", () => {
    for (const role of ROLES) {
      expect(nextStatusOnSave("draft", role, true, "save")).toBe("draft");
      expect(nextStatusOnSave("returned", role, true, "save")).toBe("returned");
      expect(nextStatusOnSave("review", role, true, "save")).toBe("review");
    }
    expect(nextStatusOnSave("published", "member", true, "save")).toBe("review");
    expect(nextStatusOnSave("published", "editor", true, "save")).toBe("published");
    expect(nextStatusOnSave("published", "owner", false, "save")).toBe("published");
  });

  it("submit 은 언제나 검토 대기로", () => {
    for (const role of ROLES) for (const s of STATUSES) expect(nextStatusOnSave(s, role, true, "submit")).toBe("review");
  });

  it("member 가 남의 글을 저장·검토 요청하면 어떤 상태든 거절", () => {
    for (const s of STATUSES) {
      expect(nextStatusOnSave(s, "member", false, "save")).toBe("forbidden");
      expect(nextStatusOnSave(s, "member", false, "submit")).toBe("forbidden");
    }
  });

  it("member 는 어떤 경로로도 published 를 만들 수 없다", () => {
    for (const s of STATUSES)
      for (const intent of ["save", "submit"] as const)
        for (const isAuthor of [true, false]) expect(nextStatusOnSave(s, "member", isAuthor, intent)).not.toBe("published");
  });

  it("편집·운영은 남의 글도 고칠 수 있다", () => {
    expect(nextStatusOnSave("review", "editor", false, "save")).toBe("review");
    expect(nextStatusOnSave("draft", "owner", false, "save")).toBe("draft");
  });

  it("모르는 역할·상태·의도는 거절", () => {
    expect(nextStatusOnSave("draft", "admin" as Role, true, "save")).toBe("forbidden");
    expect(nextStatusOnSave("deleted" as StoryStatus, "owner", true, "save")).toBe("forbidden");
    expect(nextStatusOnSave("draft", "owner", true, "publish" as "save")).toBe("forbidden");
  });
});

describe("canEditStory", () => {
  it("편집·운영은 모든 글, member 는 자기 글만", () => {
    expect(canEditStory("owner", false)).toBe(true);
    expect(canEditStory("editor", false)).toBe(true);
    expect(canEditStory("member", true)).toBe(true);
    expect(canEditStory("member", false)).toBe(false);
    expect(canEditStory("guest" as Role, true)).toBe(false);
  });
});

describe("관리 이야기 공개 범위 (member 는 남의 공개 글만)", () => {
  it("canViewStory 표 전체", () => {
    for (const status of STATUSES) {
      expect(canViewStory("owner", false, status), status).toBe(true);
      expect(canViewStory("editor", false, status), status).toBe(true);
      expect(canViewStory("member", true, status), status).toBe(true);
      expect(canViewStory("member", false, status), status).toBe(status === "published");
      expect(canViewStory("guest" as Role, true, status), status).toBe(false);
    }
  });
  it("돌려보내기 메모는 글쓴이·편집·운영만", () => {
    for (const role of ROLES) expect(canSeeReviewNote(role, true), role).toBe(true);
    expect(canSeeReviewNote("owner", false)).toBe(true);
    expect(canSeeReviewNote("editor", false)).toBe(true);
    expect(canSeeReviewNote("member", false)).toBe(false);
    expect(canSeeReviewNote("guest" as Role, true)).toBe(false);
  });
});
