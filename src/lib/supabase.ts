import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 서버에서만 쓰는 Supabase 클라이언트.
// anonClient: 공개 뷰(*_public) 읽기 전용 — RLS·컬럼 권한이 비공개 값을 막는다.
// serviceClient: 쓰기·관리자용(RLS 우회). 키는 절대 브라우저로 나가면 안 되므로 이 파일 전체가 server-only.

const authOpts = { auth: { persistSession: false, autoRefreshToken: false } } as const;

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`환경변수 ${name} 가 비어 있습니다 (.env.local 확인)`);
  return v;
}

export function anonClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    authOpts,
  );
}

export function serviceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 가 비어 있습니다 — Supabase 대시보드 → Project Settings → API Keys 의 secret 키를 .env.local 에 넣어 주세요",
    );
  }
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), key, authOpts);
}
