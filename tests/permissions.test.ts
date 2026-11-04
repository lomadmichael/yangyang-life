import { describe, expect, it } from "vitest";
import { can, isRole } from "../src/lib/permissions";

describe("can (brief)", () => {
  it("member edits content but cannot delete, hide tips or manage contributors", () => {
    expect(can("member", "edit_content")).toBe(true);
    expect(can("member", "delete_content")).toBe(false);
    expect(can("member", "hide_tip")).toBe(false);
    expect(can("member", "manage_contributors")).toBe(false);
  });
  it("owner can do everything", () => {
    expect(can("owner", "edit_content")).toBe(true);
    expect(can("owner", "delete_content")).toBe(true);
    expect(can("owner", "hide_tip")).toBe(true);
    expect(can("owner", "manage_contributors")).toBe(true);
  });
  it("editor 는 콘텐츠 수정·이야기 공개만", () => {
    expect(can("editor", "edit_content")).toBe(true);
    expect(can("editor", "publish_story")).toBe(true);
    expect(can("editor", "hide_tip")).toBe(false);
    expect(can("editor", "delete_content")).toBe(false);
    expect(can("editor", "manage_contributors")).toBe(false);
    expect(can("member", "publish_story")).toBe(false);
    expect(can("owner", "publish_story")).toBe(true);
    expect(isRole("editor")).toBe(true);
  });
  it("unknown roles get nothing", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(can("guest" as any, "edit_content")).toBe(false);
  });
});
