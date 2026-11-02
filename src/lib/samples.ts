// 샘플 행(is_sample=true) 처리 — 공개 읽기(queries.ts)와 관리 화면(admin/)이 같은 규칙을 쓴다.
// YL_SHOW_SAMPLES === "1" (로컬·Vercel Preview 만) 이면 샘플도 보이고, 아니면(운영) 숨긴다.

export function showSamples(): boolean {
  return process.env.YL_SHOW_SAMPLES === "1";
}

/** .in("is_sample", sampleValues()) 로 쓴다 — 샘플 숨김이면 [false], 표시면 [false, true] */
export function sampleValues(): boolean[] {
  return showSamples() ? [false, true] : [false];
}

/**
 * 관리 화면 고르기(select)용 목록: 샘플 숨김이면 샘플을 빼고, 표시면 이름 뒤에 「 (샘플)」.
 * keepId(지금 연결된 항목)는 샘플이어도 「 (샘플)」을 붙여 남긴다 — 저장할 때 연결이 풀리지 않게.
 */
export function sampleOptions(
  rows: { id: string; name_ko: string; is_sample: boolean }[],
  show: boolean,
  keepId?: string | null,
): { id: string; name_ko: string }[] {
  return rows
    .filter((r) => !r.is_sample || show || r.id === keepId)
    .map((r) => ({ id: r.id, name_ko: r.is_sample ? `${r.name_ko} (샘플)` : r.name_ko }));
}
