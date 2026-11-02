import Link from "next/link";
import { CATEGORY_KO } from "@/lib/admin-input";
import { requireAdmin } from "../auth";
import { contributorNames, isStale, listPlacesAdmin } from "../data";
import { VerifiedNote } from "../_components/VerifiedNote";
import { PageTitle, Pill, btnPrimary, btnSmall, inputCls } from "../_components/ui";

const STATUS_PILL = {
  participating: { tone: "ok", label: "참여" },
  listed: { tone: "info", label: "일반" },
  closed: { tone: "muted", label: "휴업" },
} as const;

export default async function AdminPlaces({ searchParams }: PageProps<"/admin/places">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const staleOnly = sp.stale === "1";
  const now = new Date();

  const [all, names] = await Promise.all([listPlacesAdmin(), contributorNames()]);
  const needle = q.toLowerCase();
  const places = all.filter((p) => {
    if (staleOnly && (p.status === "closed" || !isStale(p.verified_at, now))) return false;
    if (!needle) return true;
    return [p.name_ko, p.name_en, p.name_roman, p.address_ko, p.slug, p.code]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(needle));
  });

  return (
    <>
      <PageTitle
        aside={
          <Link href="/admin/places/new" className={btnPrimary}>
            + 가게 추가
          </Link>
        }
      >
        가게
      </PageTitle>

      <form className="flex gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="이름·주소·코드로 찾기" className={inputCls} aria-label="가게 찾기" />
        {staleOnly ? <input type="hidden" name="stale" value="1" /> : null}
        <button type="submit" className={btnSmall}>
          찾기
        </button>
      </form>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={q ? `/admin/places?q=${encodeURIComponent(q)}` : "/admin/places"}
          aria-pressed={!staleOnly}
          className={`rounded-full border px-3 py-1.5 ${!staleOnly ? "border-sea bg-sea-soft text-sea" : "border-line bg-surface"}`}
        >
          전체 {all.length}
        </Link>
        <Link
          href={`/admin/places?stale=1${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          aria-pressed={staleOnly}
          className={`rounded-full border px-3 py-1.5 ${staleOnly ? "border-sea bg-sea-soft text-sea" : "border-line bg-surface"}`}
        >
          확인 30일 지남
        </Link>
      </div>

      {places.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          {q || staleOnly ? "조건에 맞는 가게가 없어요." : "아직 가게가 없어요. 「+ 가게 추가」로 시작하세요."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {places.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/places/${p.id}`}
                className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-3 hover:border-sea"
              >
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold">{p.name_ko}</span>
                  <Pill tone={STATUS_PILL[p.status].tone}>{STATUS_PILL[p.status].label}</Pill>
                  <span className="text-xs text-muted">{CATEGORY_KO[p.category]}</span>
                  {p.is_sample ? <Pill tone="muted">샘플</Pill> : null}
                </span>
                <span className={`text-sm ${p.name_en ? "text-ink" : "text-salmon-strong"}`}>
                  {p.name_en ?? "영문 이름 없음"}
                </span>
                <VerifiedNote
                  at={p.verified_at}
                  by={p.verified_by ? (names.get(p.verified_by) ?? null) : null}
                  method={p.verified_method}
                  stale={p.status !== "closed" && isStale(p.verified_at, now)}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
