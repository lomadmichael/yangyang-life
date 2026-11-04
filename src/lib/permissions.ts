// 관리 화면 권한 표. 서버 액션마다 이 함수로 다시 검사한다(레이아웃만 믿지 않음).
// R6: 팁 「처리 완료」는 edit_content(로그인한 누구나), 숨김/해제는 hide_tip(owner).
// editor(편집): 콘텐츠 수정 + 이야기 검토·공개(publish_story). 삭제·팁 숨김·기여자 관리는 owner 만.

export type Role = "owner" | "editor" | "member";
export type AdminAction = "edit_content" | "delete_content" | "hide_tip" | "manage_contributors" | "publish_story";

const TABLE: Record<Role, readonly AdminAction[]> = {
  owner: ["edit_content", "delete_content", "hide_tip", "manage_contributors", "publish_story"],
  editor: ["edit_content", "publish_story"],
  member: ["edit_content"],
};

export function can(role: Role, action: AdminAction): boolean {
  return Object.prototype.hasOwnProperty.call(TABLE, role) && TABLE[role].includes(action);
}

export function isRole(v: unknown): v is Role {
  return v === "owner" || v === "editor" || v === "member";
}
