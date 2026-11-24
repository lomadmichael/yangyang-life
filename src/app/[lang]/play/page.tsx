import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { CategoryTabs } from "@/components/CategoryTabs";
import { FallbackNote } from "@/components/FallbackNote";
import { FilterChips } from "@/components/FilterChips";
import { PLAY_VISUAL } from "@/components/category-visual";
import { SaveButton } from "@/components/SaveButton";
import { isLang, pickText, t, tf, type Lang } from "@/i18n";
import { activityWhen, bigDateRange, formatToday } from "@/lib/format";
import { PLAY_CATEGORIES, PLAY_CATEGORY_KEY } from "@/lib/labels";
import { parsePlayQuery, playQueryString } from "@/lib/list-query";
import { visibleCategories } from "@/lib/places-filter";
import { groupPlay } from "@/lib/play";
import { getGuide, listActivities } from "@/lib/queries";
import { activitiesForDay } from "@/lib/today";
import type { Activity, PlayCategory, Story } from "@/lib/types";

type PlayFilter = { category?: PlayCategory; rainy?: boolean };
type Item = { a: Activity; no: string; offSeason: boolean };

const pad = (n: number) => String(n).padStart(2, "0");

const Arrow = () => (
  <svg viewBox="0 0 20 12" aria-hidden="true">
    <path d="M0 6h18M13 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

function catLabel(lang: Lang, a: Activity): string {
  return PLAY_CATEGORY_KEY[a.category] ? t(lang, PLAY_CATEGORY_KEY[a.category]) : a.category;
}

/** 기간 행사의 큰 날짜 「10.25 — 11.30」 (숫자라 언어와 무관) */
function BigDate({ a, className = "" }: { a: Activity; className?: string }) {
  const d = a.kind === "dated" ? bigDateRange(a.starts_on, a.ends_on) : null;
  if (!d) return null;
  return (
    <span className={`bigdate ${className}`} aria-hidden="true">
      {d.from ? <b>{d.from}</b> : null}
      {d.to ? (
        <>
          <i>—</i>
          <b>{d.to}</b>
        </>
      ) : d.from && !d.to && a.ends_on === null ? <i>—</i> : null}
    </span>
  );
}

// 놀거리 목록 (v4 「바다 잡지」 03 꼭지, 홈 놀거리 단락과 같은 가족) —
// 남색으로 뒤집은 꼭지 머리 · 분류 탭 + 「비 오는 날 OK」(주소 쿼리, list-query) · 고른 분류의 가이드 ·
// 큰 대표 칸(1 + 2) · 나머지는 묶음별 번호 색인(기간 행사는 날짜를 크게) · 비시즌은 접은 묶음.
// 무엇을 보여 줄지는 기존 groupPlay(오늘 서울 기준·끝난 행사 제외·계절 밖은 비시즌) 그대로.
export default async function PlayPage({ params, searchParams }: PageProps<"/[lang]/play">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  await connection(); // 「오늘」은 요청 시각 기준

  const f = parsePlayQuery(await searchParams);
  const now = new Date();
  const all = await listActivities();
  // 탭은 오늘 볼 수 있는 놀거리(비시즌 포함)가 1개 이상인 분류만
  const today = activitiesForDay(all, now, {});
  const tabs = visibleCategories(PLAY_CATEGORIES, today);
  // 탭 옆 개수 — 탭과 같은 기준(오늘 볼 수 있는 것, 비시즌 포함, 비 조건과 무관)
  const countFor = (c?: PlayCategory) => (c ? today.filter((a) => a.category === c).length : today.length);
  const { dated, always, offSeason } = groupPlay(all, now, f);
  const total = dated.length + always.length + offSeason.length;

  // 가이드는 곁들이 — 못 불러오면 카드만 숨기고 목록은 그대로 보여 준다
  let guide: Story | null = null;
  if (f.category) {
    try {
      guide = await getGuide(f.category);
    } catch {
      guide = null;
    }
  }

  const base = `/${lang}/play`;
  const href = (next: PlayFilter) => `${base}${playQueryString(next)}`;

  // 번호: 기간 행사 → 언제든 → 비시즌 순서로 01 부터 (홈 놀거리 단락과 같은 번호 매김)
  const ordered: Item[] = [
    ...dated.map((a) => ({ a, offSeason: false })),
    ...always.map((a) => ({ a, offSeason: false })),
    ...offSeason.map((a) => ({ a, offSeason: true })),
  ].map((x, i) => ({ ...x, no: pad(i + 1) }));
  // 큰 칸 1 + 작은 칸 2 — 비시즌이 아닌 것 앞에서부터. 같은 분류 대표 사진은 한 번만, 두 번째부터는 색면
  const featured = ordered.filter((x) => !x.offSeason).slice(0, 3);
  const shown = new Set(featured.map((x) => x.a.id));
  const rest = (list: Activity[]) => ordered.filter((x) => list.includes(x.a) && !shown.has(x.a.id));
  const groups = [
    { key: "dated", title: t(lang, "kindDated"), items: rest(dated) },
    { key: "always", title: t(lang, "kindAlways"), items: rest(always) },
  ].filter((g) => g.items.length > 0);
  const offItems = rest(offSeason);

  const headCount = countFor(undefined);

  return (
    <div className="mz-play">
      <section className="mast-deep">
        <div className="wrap">
          <header className="sec-head">
            <span className="sec-no">03</span>
            <div>
              <span className="label">
                {t(lang, "secPlayKicker")} · {tf(lang, "playTodayLine", { date: formatToday(now, lang) })}
              </span>
              <h1>{headCount ? tf(lang, "secPlayTitle", { n: String(headCount) }) : t(lang, "playTitle")}</h1>
            </div>
            <p>{t(lang, "playLead")}</p>
          </header>
        </div>
      </section>

      <section className="sec page-body">
        <div className="wrap">
          <CategoryTabs
            items={tabs}
            current={f.category}
            hrefFor={(c) => href({ ...f, category: c })}
            labelFor={(c) => t(lang, PLAY_CATEGORY_KEY[c])}
            allLabel={t(lang, "filterAll")}
            label={t(lang, "categoryLabel")}
            countFor={countFor}
          />
          <div className="pl-bar">
            <FilterChips
              label={t(lang, "filterLabel")}
              chips={[{ label: t(lang, "rainyToggle"), href: href({ ...f, rainy: !f.rainy }), active: !!f.rainy }]}
            />
            <p className="pl-count">
              <span>
                <b>{total}</b>
                {t(lang, total === 1 ? "playCountOne" : "playCount").replace("{n}", "")}
              </span>
              {f.rainy || f.category ? (
                <Link href={base} scroll={false}>
                  {t(lang, "filterReset")}
                </Link>
              ) : null}
            </p>
          </div>

          {guide ? <GuideStrip story={guide} lang={lang} /> : null}

          {total === 0 ? (
            <div className="pl-empty">
              <span className="label">{t(lang, "placesEmptyKicker")}</span>
              <h2>{t(lang, f.rainy ? "emptyRainyTitle" : "emptyActivitiesTitle")}</h2>
              <p>{t(lang, f.rainy ? "emptyRainyBody" : "emptyActivitiesBody")}</p>
              <div className="acts">
                {f.rainy ? (
                  <Link className="btn-line" href={href({ category: f.category })} scroll={false}>
                    {t(lang, "filterReset")}
                  </Link>
                ) : (
                  <Link className="btn-line" href={`/${lang}/places`}>
                    {t(lang, "homeWhereToEat")}
                    <Arrow />
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <Featured items={featured} lang={lang} />

              {groups.map((g, gi) => (
                <section key={g.key} className="pgrp" aria-labelledby={`pgrp-${g.key}`}>
                  <header className="grp-h">
                    <span className="gno">{pad(gi + 1)}</span>
                    <div>
                      <h2 id={`pgrp-${g.key}`}>{g.title}</h2>
                    </div>
                    <span className="gcount">{tf(lang, g.items.length === 1 ? "playCountOne" : "playCount", { n: String(g.items.length) })}</span>
                  </header>
                  <ol className="rows play-rows">
                    {g.items.map((it) => (
                      <PlayRow key={it.a.id} it={it} lang={lang} />
                    ))}
                  </ol>
                </section>
              ))}

              {offItems.length > 0 ? (
                <details className="pgrp off-grp">
                  <summary className="grp-h">
                    <span className="gno">{pad(groups.length + 1)}</span>
                    <div>
                      <h2>{t(lang, "offSeasonTitle")}</h2>
                    </div>
                    <span className="gcount">
                      {tf(lang, "offSeasonCount", { n: String(offItems.length) })}
                      <i aria-hidden="true" className="chev" />
                    </span>
                  </summary>
                  <ol className="rows play-rows">
                    {offItems.map((it) => (
                      <PlayRow key={it.a.id} it={it} lang={lang} />
                    ))}
                  </ol>
                </details>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/** 큰 칸 1 + 작은 칸 2 (홈 놀거리 단락과 같은 .pl 칸). 같은 분류 대표 사진이 두 번 나오면 두 번째부터 색면 */
function Featured({ items, lang }: { items: Item[]; lang: Lang }) {
  if (items.length === 0) return null;
  const used = new Set<string>();
  const tile = (it: Item, size: "big" | "small") => {
    const row = it.a as unknown as Record<string, unknown>;
    const title = pickText(row, "title", lang);
    const desc = pickText(row, "desc", lang);
    const photo = used.has(it.a.category) ? undefined : PLAY_VISUAL[it.a.category]?.photo;
    used.add(it.a.category);
    const label = [catLabel(lang, it.a), activityWhen(it.a, lang)].filter(Boolean).join(" · ");
    return (
      <div key={it.a.id} className={`pl-cell ${size === "big" ? "big" : ""}`}>
        <Link href={`/${lang}/activity/${it.a.id}`} className={`pl ${size === "big" ? "big" : ""}`}>
          {photo ? (
            <>
              <Image src={photo} alt="" fill sizes={size === "big" ? "(min-width: 861px) 58vw, 100vw" : "(min-width: 861px) 42vw, 100vw"} />
              <span className="rep">{t(lang, "categoryPhotoLabel")}</span>
            </>
          ) : (
            <span className={`noimg play-${it.a.category}`} aria-hidden="true">
              <span className="glyph">{title.text.slice(0, 1)}</span>
            </span>
          )}
          <span className="no">{it.no}</span>
          <span className="tx">
            <BigDate a={it.a} className="on-photo" />
            <span className="label">{label}</span>
            <h3>{title.text}</h3>
            {size === "big" && desc.text ? <p>{desc.text}</p> : null}
          </span>
        </Link>
        <span className="pl-save">
          <SaveButton kind="activity" id={it.a.id} lang={lang} />
        </span>
      </div>
    );
  };
  const [big, ...stack] = items;
  return (
    <div className={`play-grid feat n${items.length}`}>
      {tile(big, "big")}
      {stack.length ? <div className="pl-stack">{stack.map((it) => tile(it, "small"))}</div> : null}
    </div>
  );
}

/** 번호 색인 한 줄 — 번호 · 제목 · 분류와 소개 · 오른쪽에 때(기간 행사는 큰 날짜) */
function PlayRow({ it, lang }: { it: Item; lang: Lang }) {
  const row = it.a as unknown as Record<string, unknown>;
  const title = pickText(row, "title", lang);
  const desc = pickText(row, "desc", lang);
  const location = pickText(row, "location", lang);
  const timeNote = pickText(row, "time_note", lang);
  const when = it.a.kind === "dated" ? null : activityWhen(it.a, lang);
  return (
    <li className={`row has-save ${it.offSeason ? "is-off" : ""}`}>
      <Link href={`/${lang}/activity/${it.a.id}`}>
        <span className="no">{it.no}</span>
        <div className="min-w-0">
          <h3>
            {title.text}
            <FallbackNote lang={lang} show={title.fallback} />
          </h3>
          <p>
            <span className={`cat play-${it.a.category}`}>
              <i aria-hidden="true" />
              {catLabel(lang, it.a)}
            </span>
            {it.a.rainy_ok ? <span className="mk">{t(lang, "rainyOk")}</span> : null}
            {desc.text || location.text}
          </p>
          {timeNote.text ? <span className="tnote">{timeNote.text}</span> : null}
        </div>
        <span className="when">
          {it.a.kind === "dated" ? (
            <>
              <BigDate a={it.a} />
              <span className="sr-only">{activityWhen(it.a, lang)}</span>
            </>
          ) : (
            <b>{when}</b>
          )}
        </span>
      </Link>
      <span className="row-save">
        <SaveButton kind="activity" id={it.a.id} lang={lang} />
      </span>
    </li>
  );
}

/** 고른 분류의 가이드 — 이야기 화면(/stories/{slug})으로 가는 가는 선 띠 */
function GuideStrip({ story, lang }: { story: Story; lang: Lang }) {
  const row = story as unknown as Record<string, unknown>;
  const title = pickText(row, "title", lang);
  const summary = pickText(row, "summary", lang);
  return (
    <aside className="guide-strip" aria-label={t(lang, "storyGuide")}>
      <Link href={`/${lang}/stories/${story.slug}`}>
        <span className="label">{t(lang, "storyGuide")}</span>
        <span className="gs-t">
          <b>
            {title.text}
            <FallbackNote lang={lang} show={title.fallback} />
          </b>
          {summary.text ? <span className="gs-s">{summary.text}</span> : null}
        </span>
        <span className="gs-by">
          {story.author_name ? tf(lang, "guideBy", { name: story.author_name }) : null}
          <Arrow />
        </span>
      </Link>
      <span className="gs-save">
        <SaveButton kind="story" id={story.id} lang={lang} />
      </span>
    </aside>
  );
}
