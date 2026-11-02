import { describe, expect, it } from "vitest";
import { can } from "../src/lib/permissions";

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
  it("unknown roles get nothing", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(can("guest" as any, "edit_content")).toBe(false);
  });
});
