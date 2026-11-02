import { createHmac, timingSafeEqual } from "node:crypto";

// 관리 화면 세션 토큰: "{contributorId}.{만료 epoch 초}.{HMAC-SHA256 hex}"
// (lomad-homepage ecology/admin/auth.ts 방식 + 기여자 id 를 서명에 포함)
// 비밀키 YL_SESSION_SECRET 이 없으면 대체 키 없이 바로 멈춘다.
// "server-only" 를 import 하지 않는 이유: scripts/*.mjs 와 테스트에서도 같은 코드를 쓰기 위해. 비밀키는 env 에만 있다.

export const SESSION_TTL_S = 60 * 60 * 12; // 12시간
export const ADMIN_COOKIE = "yl_admin";
export const ADMIN_COOKIE_PATH = "/admin";

function secret(): string {
  const s = process.env.YL_SESSION_SECRET?.trim();
  if (!s || s.length < 32) {
    throw new Error("YL_SESSION_SECRET 가 없거나 너무 짧습니다(32자 이상) — .env.local 확인. 관리 화면을 열 수 없습니다");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(`yl-admin.${payload}`).digest("hex");
}

export function makeSession(contributorId: string): string {
  if (!contributorId || contributorId.includes(".")) throw new Error("잘못된 기여자 id");
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_S;
  const payload = `${contributorId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function readSession(token?: string): { contributorId: string } | null {
  const key = secret(); // 비밀키 없으면 토큰 유무와 상관없이 멈춘다
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [contributorId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!contributorId || !/^\d+$/.test(expStr) || !Number.isFinite(exp)) return null;
  if (exp <= Math.floor(Date.now() / 1000)) return null;
  const expected = createHmac("sha256", key).update(`yl-admin.${contributorId}.${expStr}`).digest("hex");
  const a = Buffer.from(sig ?? "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { contributorId };
}
