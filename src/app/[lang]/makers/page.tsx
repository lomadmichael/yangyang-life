import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { EmptyState } from "@/components/EmptyState";
import { isLang, t, tf } from "@/i18n";
import { listContributors, listStories } from "@/lib/queries";
import type { Contributor } from "@/lib/types";

export default async function MakersPage({ params }: PageProps<"/[lang]/makers">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  await connection();

  // 공개 뷰가 show=false 를 이미 빼지만, 화면에서도 한 번 더 거른다
  const people = (await listContributors()).filter((c) => c.show);
  // 이야기 수: 한 번 읽어 author_id 로 센다 (실패하면 숫자만 생략)
  const counts = new Map<string, number>();
  try {
    for (const s of await listStories()) if (s.author_id) counts.set(s.author_id, (counts.get(s.author_id) ?? 0) + 1);
  } catch {
    counts.clear();
  }
  const other = t(lang, "makersOtherTeam");
  const teams = new Map<string, Contributor[]>();
  for (const c of people) {
    const team = c.team?.trim() || other;
    teams.set(team, [...(teams.get(team) ?? []), c]);
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-10">
      <BackLink href={`/${lang}`} label={t(lang, "backHome")} />
      <div>
        <h1 className="text-2xl font-bold">{t(lang, "makersTitle")}</h1>
        <p className="mt-1 text-muted">{t(lang, "makersIntro")}</p>
      </div>

      {people.length === 0 ? (
        <EmptyState title={t(lang, "emptyMakersTitle")} />
      ) : (
        [...teams].map(([team, members]) => (
          <section key={team} className="flex flex-col gap-2">
            <h2 className="font-bold text-pine">{team}</h2>
            <ul className="rounded-2xl border border-line bg-surface px-4">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-baseline justify-between gap-3 border-b border-line py-3 last:border-b-0"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="font-medium">{m.display_name}</span>
                    {counts.get(m.id) ? (
                      <Link href={`/${lang}/stories?author=${m.id}`} className="text-sm font-medium text-sea underline">
                        {tf(lang, "makersStories", { n: String(counts.get(m.id)) })}
                      </Link>
                    ) : null}
                  </span>
                  <span className="text-right text-sm text-muted">
                    {[m.role_label, m.cohort].filter((v) => v && v.trim()).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <section className="rounded-2xl bg-sea-soft p-5">
        <h2 className="text-lg font-bold text-sea">{t(lang, "makersJoinTitle")}</h2>
        <p className="mt-1 text-sm">{t(lang, "makersJoinBody")}</p>
        <Link
          href={`/${lang}/places`}
          className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-sea px-4 font-medium text-on-sea"
        >
          {t(lang, "makersJoinAction")}
        </Link>
      </section>
    </div>
  );
}
