import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { isLang, t, tf } from "@/i18n";
import { storiesQueryString } from "@/lib/list-query";
import { listContributors, listStories } from "@/lib/queries";
import type { Contributor } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");

// 만든 사람들 (v4 「바다 잡지」 05 꼭지 — 잡지의 판권·기여자 지면) —
// 꼭지 머리 · 팀별 기여자 명단(이름 · 맡은 일 · 기수 · 쓴 이야기 수 — 모두 DB 값) · 참여 안내(남색 단).
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
    <div className="mz-makers">
      <section className="sec page-head">
        <div className="wrap">
          <header className="sec-head">
            <span className="sec-no">05</span>
            <div>
              <span className="label">{t(lang, "secMakersKicker")}</span>
              <h1>{t(lang, "makersTitle")}</h1>
            </div>
            <p>{t(lang, "makersIntro")}</p>
          </header>
        </div>
      </section>

      <section className="sec page-body">
        <div className="wrap">
          {people.length === 0 ? (
            <div className="pl-empty">
              <span className="label">{t(lang, "secMakersKicker")}</span>
              <h2>{t(lang, "emptyMakersTitle")}</h2>
            </div>
          ) : (
            <>
              <p className="mk-total">
                <b>{people.length}</b>
                {t(lang, people.length === 1 ? "makersTotalUnitOne" : "makersTotalUnit")}
              </p>
              <div className="mk-teams">
                {[...teams].map(([team, members], ti) => (
                  <section key={team} className="mk-team" aria-labelledby={`team-${ti}`}>
                    <header>
                      <span className="gno">{pad(ti + 1)}</span>
                      <h2 id={`team-${ti}`}>{team}</h2>
                      <span className="gcount">{tf(lang, "unitPeople", { n: String(members.length) })}</span>
                    </header>
                    <ul>
                      {members.map((m) => {
                        const role = [m.role_label, m.cohort].filter((v) => v && v.trim()).join(" · ");
                        const n = counts.get(m.id);
                        return (
                          <li key={m.id}>
                            <b>{m.display_name}</b>
                            {role ? <span className="role">{role}</span> : null}
                            {n ? (
                              <Link href={`/${lang}/stories${storiesQueryString({ author: m.id })}`} className="more">
                                {tf(lang, "makersStories", { n: String(n) })}
                              </Link>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </>
          )}

          <section className="my-join mk-join">
            <span className="label">{t(lang, "myJoinKicker")}</span>
            <h2>{t(lang, "makersJoinTitle")}</h2>
            <p>{t(lang, "makersJoinBody")}</p>
            <Link className="btn-solid light" href={`/${lang}/places`}>
              {t(lang, "makersJoinAction")}
            </Link>
          </section>
        </div>
      </section>
    </div>
  );
}
