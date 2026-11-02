// Storage 버킷 `place-photos` 만들기 (R19) — 여러 번 돌려도 안전(있으면 설정만 맞춤).
//   node scripts/setup-storage.mjs
// 공개 읽기 · 파일당 5MB(버킷 상한 — 실제 업로드는 관리 화면에서 4MB 이하로 막음) · image/jpeg|png|webp. 업로드는 관리 화면 서버 액션(service role)에서만.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(path.join(root, ".env.local"));
} catch {
  // 이미 설정된 환경변수만 쓴다
}

const BUCKET = "place-photos";
const OPTIONS = {
  public: true,
  fileSizeLimit: 5 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다 (.env.local)");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: existing, error: getErr } = await db.storage.getBucket(BUCKET);
if (existing) {
  const { error } = await db.storage.updateBucket(BUCKET, OPTIONS);
  if (error) {
    console.error(`✗ 버킷 설정 갱신 실패: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ 버킷 ${BUCKET} 이미 있음 → 설정 맞춤 (공개 읽기, 5MB, jpeg/png/webp)`);
} else {
  if (getErr && !/not found/i.test(getErr.message)) console.warn(`(조회 메시지: ${getErr.message})`);
  const { error } = await db.storage.createBucket(BUCKET, OPTIONS);
  if (error) {
    console.error(`✗ 버킷 만들기 실패: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ 버킷 ${BUCKET} 만듦 (공개 읽기, 5MB, jpeg/png/webp)`);
}

const { data: check } = await db.storage.getBucket(BUCKET);
console.log(
  `  확인: public=${check?.public} file_size_limit=${check?.file_size_limit} mime=${JSON.stringify(check?.allowed_mime_types)}`,
);
