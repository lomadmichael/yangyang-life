import { createHmac, randomInt } from "node:crypto";

// 기여자 개인 코드 (R17). 8자, 헷갈리는 글자(0·O·1·I·L) 없음, crypto 난수.
// DB 에는 HMAC-SHA256(코드, YL_CODE_PEPPER) hex 만 저장 → 결정적이라 로그인 때 해시로 바로 찾는다.
// scripts/issue-code.mjs 가 이 파일을 그대로 import 한다(Node 타입 제거) — TS 전용 문법(enum 등) 쓰지 말 것.

export const ACCESS_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ACCESS_CODE_LENGTH = 8;

export function generateAccessCode(): string {
  let out = "";
  for (let i = 0; i < ACCESS_CODE_LENGTH; i++) out += ACCESS_CODE_ALPHABET[randomInt(ACCESS_CODE_ALPHABET.length)];
  return out;
}

/** 사람이 친 값 → 정규 코드. 공백·하이픈 제거, 대문자. 형식이 아니면 null */
export function normalizeAccessCode(input: string): string | null {
  const c = String(input ?? "").toUpperCase().replace(/[\s-]/g, "");
  if (c.length !== ACCESS_CODE_LENGTH) return null;
  for (const ch of c) if (!ACCESS_CODE_ALPHABET.includes(ch)) return null;
  return c;
}

function pepper(): string {
  const p = process.env.YL_CODE_PEPPER?.trim();
  if (!p || p.length < 32) throw new Error("YL_CODE_PEPPER 가 없거나 너무 짧습니다(32자 이상) — .env.local 확인");
  return p;
}

/** 코드 해시 (입력은 정규화해서 계산). 형식이 틀린 코드는 throw */
export function hashAccessCode(code: string): string {
  const key = pepper();
  const c = normalizeAccessCode(code);
  if (!c) throw new Error("코드 형식이 아닙니다");
  return createHmac("sha256", key).update(c).digest("hex");
}

/** 화면 표시용: ABCD-EFGH */
export function formatAccessCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
