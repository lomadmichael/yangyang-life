// 관리 화면 권한 표. 서버 액션마다 이 함수로 다시 검사한다(레이아웃만 믿지 않음).
// R6: 팁 「처리 완료」는 edit_content(로그인한 누구나), 숨김/해제는 hide_tip(owner).

export type Role = "owner" | "member";
export type AdminAction = "edit_content" | "delete_content" | "hide_tip" | "manage_contributors";

const TABLE: Record<Role, readonly AdminAction[]> = {
  owner: ["edit_content", "delete_content", "hide_tip", "manage_contributors"],
  member: ["edit_content"],
};

export function can(role: Role, action: AdminAction): boolean {
  return Object.prototype.hasOwnProperty.call(TABLE, role) && TABLE[role].includes(action);
}

export function isRole(v: unknown): v is Role {
  return v === "owner" || v === "member";
}
