import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { can, isRole, type AdminAction, type Role } from "@/lib/permissions";
import { hashAccessCode } from "@/lib/access-code";
import { ADMIN_COOKIE, readSession } from "@/lib/session";
import { serviceClient } from "@/lib/supabase";

// "use server" 파일(actions.ts)과 분리: 동기 헬퍼·타입을 export 하기 위해.

export interface Admin {
  id: string;
  display_name: string;
  role: Role;
}

/** 비밀키(YL_SESSION_SECRET·YL_CODE_PEPPER)가 없으면 그 이유. 대체 키는 없다 — 관리 화면 전체가 멈춘다 */
export function adminConfigError(): string | null {
  try {
    readSession(undefined);
    hashAccessCode("ABCDEFGH");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/** 쿠키 → 세션 → 기여자 행(코드가 살아 있는 사람만). 없으면 null. 비밀키가 없으면 null */
export async function getAdmin(): Promise<Admin | null> {
  if (adminConfigError()) return null; // 설정이 깨졌으면 아무도 로그인 상태가 아니다(레이아웃이 오류를 보여 줌)
  const jar = await cookies();
  const session = readSession(jar.get(ADMIN_COOKIE)?.value);
  if (!session) return null;
  const { data, error } = await serviceClient()
    .from("contributors")
    .select("id,display_name,role,access_code_hash")
    .eq("id", session.contributorId)
    .maybeSingle();
  if (error) throw new Error(`기여자 조회 실패: ${error.message}`);
  // 코드가 지워진(회수된) 사람은 세션이 남아 있어도 들어오지 못한다
  if (!data || !data.access_code_hash || !isRole(data.role)) return null;
  return { id: data.id as string, display_name: data.display_name as string, role: data.role };
}

/** 화면용: 로그인 안 했으면 로그인 화면으로 */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export type ActionResult<T = undefined> = { ok: true; message?: string; data?: T } | { ok: false; message: string };

export const NOT_LOGGED_IN: ActionResult = { ok: false, message: "로그인이 끊겼어요. 다시 로그인해 주세요." };
export const FORBIDDEN: ActionResult = { ok: false, message: "이 작업은 운영 담당(owner)만 할 수 있어요." };

/** 서버 액션용: 세션 + 권한을 매번 다시 검사 (R20) */
export async function authorize(
  action: AdminAction,
): Promise<{ admin: Admin; denied: null } | { admin: null; denied: { ok: false; message: string } }> {
  const admin = await getAdmin();
  if (!admin) return { admin: null, denied: NOT_LOGGED_IN as { ok: false; message: string } };
  if (!can(admin.role, action)) return { admin: null, denied: FORBIDDEN as { ok: false; message: string } };
  return { admin, denied: null };
}
