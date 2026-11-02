// 기여자 개인 코드 발급(또는 재발급) — 로그인 전 첫 owner 코드를 만드는 부트스트랩 경로 (R18).
//
//   node scripts/issue-code.mjs "김조사"                       이름이 같은 기여자에게 새 코드 (기존 코드는 무효)
//   node scripts/issue-code.mjs "이홍래" --create --role owner --team 운영 --role-label PM
//                                                              실데이터(is_sample=false) 기여자가 없으면 만들고 코드 발급
//   옵션: --id <uuid>  이름이 같은 사람이 여럿일 때 / --cohort <기수>
//
// 코드는 화면에 한 번만 출력된다. DB 에는 HMAC 해시만 저장(src/lib/access-code.ts 와 같은 함수).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// src/lib/access-code.ts 를 Node 타입 제거로 그대로 불러온다. 「package.json type 없음」 경고만 끈다
process.removeAllListeners("warning");
const { formatAccessCode, generateAccessCode, hashAccessCode } = await import("../src/lib/access-code.ts");

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(path.join(root, ".env.local"));
} catch {
  // .env.local 이 없으면 이미 설정된 환경변수만 쓴다
}

// process.exit() 는 Windows 에서 열린 소켓과 겹쳐 libuv assertion 을 내므로, 던져서 끝낸다
class Stop extends Error {}
function die(msg) {
  throw new Stop(msg);
}
process.on("uncaughtException", (e) => {
  console.error(`✗ ${e instanceof Stop ? e.message : (e?.stack ?? e)}`);
  process.exitCode = 1;
});

const args = process.argv.slice(2);
const opts = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--create") opts.create = true;
  else if (a.startsWith("--")) {
    const v = args[i + 1];
    if (v === undefined || v.startsWith("--")) die(`${a} 다음에 값이 필요합니다`);
    opts[a.slice(2)] = v;
    i++;
  } else positional.push(a);
}
const name = positional[0]?.trim();
if (!name) die('사용법: node scripts/issue-code.mjs "<display_name>" [--create --role owner|member --team 팀 --role-label 역할]');
if (opts.role && opts.role !== "owner" && opts.role !== "member") die("--role 은 owner 또는 member");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) die("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다 (.env.local)");
hashAccessCode("ABCDEFGH"); // YL_CODE_PEPPER 없으면 여기서 멈춤
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let q = db.from("contributors").select("id,display_name,role,is_sample").eq("display_name", name);
if (opts.id) q = q.eq("id", opts.id);
if (opts.create) q = q.eq("is_sample", false); // --create 는 실데이터 기여자만 찾는다(샘플 owner 와 별개)
const { data: found, error } = await q;
if (error) die(`조회 실패: ${error.message}`);

let person;
if (found.length > 1) {
  die(`「${name}」이 ${found.length}명입니다. --id 로 골라 주세요:\n${found.map((c) => `  ${c.id} ${c.role}${c.is_sample ? " (샘플)" : ""}`).join("\n")}`);
} else if (found.length === 1) {
  person = found[0];
} else if (opts.create) {
  const { data, error: insErr } = await db
    .from("contributors")
    .insert({
      display_name: name,
      role: opts.role ?? "member",
      team: opts.team ?? null,
      role_label: opts["role-label"] ?? null,
      cohort: opts.cohort ?? null,
      is_sample: false,
    })
    .select("id,display_name,role,is_sample")
    .single();
  if (insErr) die(`기여자 만들기 실패: ${insErr.message}`);
  person = data;
  console.log(`+ 기여자를 만들었습니다: ${person.display_name} (${person.role}) ${person.id}`);
} else {
  die(`「${name}」 기여자가 없습니다. 새로 만들려면 --create 를 붙이세요`);
}

// 해시 충돌(사실상 없음)까지 피해서 발급
let code;
for (let tries = 0; tries < 5 && !code; tries++) {
  const candidate = generateAccessCode();
  const { count, error: cErr } = await db
    .from("contributors")
    .select("id", { count: "exact", head: true })
    .eq("access_code_hash", hashAccessCode(candidate));
  if (cErr) die(`확인 실패: ${cErr.message}`);
  if (!count) code = candidate;
}
if (!code) die("코드를 만들지 못했습니다. 다시 실행해 주세요");

const { error: updErr } = await db
  .from("contributors")
  .update({ access_code_hash: hashAccessCode(code) })
  .eq("id", person.id);
if (updErr) die(`코드 저장 실패: ${updErr.message}`);

console.log(`✓ ${person.display_name} (${person.role}${person.is_sample ? ", 샘플" : ""}) 의 개인 코드:`);
console.log(`\n    ${formatAccessCode(code)}\n`);
console.log("  이 코드는 다시 볼 수 없습니다. 본인에게만 전해 주세요. (잃어버리면 이 명령으로 재발급 → 이전 코드는 무효)");
