"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/Badge";
import { FallbackNote } from "@/components/FallbackNote";
import { InstallPrompt } from "@/components/InstallPrompt";
import { LangSwitch } from "@/components/LangSwitch";
import { SaveButton, useSavedSnapshot } from "@/components/SaveButton";
import { pickText, t, type DictKey, type Lang } from "@/i18n";
import { activityWhen, formatVerifiedDate } from "@/lib/format";
import { CATEGORY_KEY, PLAY_CATEGORY_KEY, STORY_TYPE_KEY } from "@/lib/labels";
import { telHref } from "@/lib/place-photos";
import { placeName, placeState } from "@/lib/place-view";
import { parseSaved, type SavedKind, type SavedState } from "@/lib/saved";
import type { TipKind } from "@/lib/tips";
import type { Activity, Place, Story } from "@/lib/types";
import { loadSaved, type MyTip } from "./actions";

// MY 화면(브라우저 쪽, v4 잡지 톤 — 작은 꼭지 머리 · 색인형 목록). 서버 전용 모듈(supabase·session·access-code)은 import 하지 않는다.
// 저장 목록은 ★ 버튼과 같은 localStorage 구독(useSavedSnapshot)을 쓴다 → 어디서 ★를 바꿔도 다시 불러온다.
// localStorage 가 없거나 막혔거나 값이 망가졌으면 parseSaved 가 빈 상태를 준다 → 빈 화면, 오류 없음.

type Loaded = { places: Place[]; activities: Activity[]; stories: Story[] };

const TABS: { kind: SavedKind; label: DictKey; browse: DictKey; path: string }[] = [
  { kind: "place", label: "navPlaces", browse: "myBrowsePlaces", path: "/places" },
  { kind: "activity", label: "navPlay", browse: "myBrowsePlay", path: "/play" },
  { kind: "story", label: "navStories", browse: "myBrowseStories", path: "/stories" },
];

const TIP_KIND: Record<TipKind, { key: DictKey; tone: "partner" | "info" | "open" }> = {
  changed: { key: "tipKindChanged", tone: "partner" },
  tip: { key: "tipKindTip", tone: "info" },
  directions: { key: "tipKindDirections", tone: "open" },
};

const pad = (n: number) => String(n).padStart(2, "0");

function isEmpty(s: SavedState): boolean {
  return s.place.length === 0 && s.activity.length === 0 && s.story.length === 0;
}

/** 불러온 항목 중 지금도 저장돼 있는 것만, 저장 순서대로 — ★를 빼면 다시 불러오기 전에 바로 사라진다 */
function inSavedOrder<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const byId = new Map(items.map((x) => [x.id, x]));
  return ids.map((id) => byId.get(id)).filter((x): x is T => x !== undefined);
}

const noopSubscribe = () => () => {};

/** 하이드레이션이 끝났는지 — 서버·첫 그림에서는 false(이 기기 값을 아직 모른다) */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** 저장 색인 한 줄 (장소·놀거리·이야기 공통 모양 — 번호 · 이름 · 분류와 소개 · 오른쪽 상태 · ★) */
function SavedRow({
  no,
  href,
  title,
  sub,
  cat,
  catClass,
  text,
  right,
  kind,
  id,
  lang,
  dim,
}: {
  no: string;
  href: string;
  title: { text: string; fallback: boolean };
  sub?: string | null;
  cat: string;
  catClass: string;
  text?: string;
  right?: React.ReactNode;
  kind: SavedKind;
  id: string;
  lang: Lang;
  dim?: boolean;
}) {
  return (
    <li className={`row has-save ${dim ? "is-shut" : ""}`}>
      <Link href={href}>
        <span className="no">{no}</span>
        <div className="min-w-0">
          <h3>
            {title.text}
            {sub ? <small>{sub}</small> : null}
            <FallbackNote lang={lang} show={title.fallback} />
          </h3>
          <p>
            <span className={`cat ${catClass}`}>
              <i aria-hidden="true" />
              {cat}
            </span>
            {text}
          </p>
        </div>
        {right ?? <span />}
      </Link>
      <span className="row-save">
        <SaveButton kind={kind} id={id} lang={lang} />
      </span>
    </li>
  );
}

export function MyClient({
  lang,
  tips,
  contactPhone,
}: {
  lang: Lang;
  tips: MyTip[] | null;
  /** 참여 문의 번호(NEXT_PUBLIC_YL_CONTACT_PHONE). null 이면 줄을 숨긴다 */
  contactPhone: string | null;
}) {
  const hydrated = useHydrated();
  const raw = useSavedSnapshot();
  const saved = useMemo(() => parseSaved(raw), [raw]);
  const [result, setResult] = useState<{ data: Loaded | null; failed: boolean } | null>(null);
  const [tab, setTab] = useState<SavedKind>("place");
  const [now] = useState(() => new Date());

  useEffect(() => {
    if (isEmpty(saved)) return;
    let alive = true;
    loadSaved(saved).then(
      (data) => {
        if (alive) setResult({ data, failed: false });
      },
      () => {
        if (alive) setResult((prev) => ({ data: prev?.data ?? null, failed: true }));
      },
    );
    return () => {
      alive = false;
    };
  }, [saved]);

  const empty = isEmpty(saved);
  const data = result?.data ?? null;
  const shown = {
    place: data ? inSavedOrder(data.places, saved.place) : [],
    activity: data ? inSavedOrder(data.activities, saved.activity) : [],
    story: data ? inSavedOrder(data.stories, saved.story) : [],
  };
  // 아직 이 기기 값을 모르거나(서버·첫 그림), 저장은 있는데 첫 결과를 기다리는 중
  const loading = !hydrated || (!empty && !data && !result?.failed);
  const failed = !empty && !data && result?.failed === true;
  const count = (k: SavedKind) => (loading || empty ? 0 : shown[k].length);
  const current = TABS.find((x) => x.kind === tab) ?? TABS[0];

  const stateLabel = (p: Place) => {
    const s = placeState(p, now);
    return s === "shut" ? t(lang, "statusClosed") : s === "open" ? t(lang, "openNow") : s === "later" ? t(lang, "closedNow") : "";
  };

  return (
    <div className="mz-my">
      <section className="sec page-head">
        <div className="wrap">
          <header className="sec-head">
            <span className="sec-no">My</span>
            <div>
              <span className="label">{t(lang, "myKicker")}</span>
              <h1>{t(lang, "myHeadTitle")}</h1>
            </div>
            <p>{t(lang, "myDeviceNote")}</p>
          </header>
        </div>
      </section>

      <section className="sec page-body">
        <div className="wrap my-grid">
          <div className="my-main">
            <section aria-labelledby="my-saved" className="my-sec">
              <header className="grp-h">
                <span className="gno">01</span>
                <div>
                  <h2 id="my-saved">{t(lang, "mySavedTitle")}</h2>
                </div>
                <span className="gcount" />
              </header>
              <div role="tablist" aria-label={t(lang, "mySavedTabsLabel")} className="tabs my-tabs">
                {TABS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    role="tab"
                    id={`my-tab-${kind}`}
                    aria-selected={kind === tab}
                    aria-controls="my-panel"
                    onClick={() => setTab(kind)}
                  >
                    {t(lang, label)}
                    <sup>{count(kind)}</sup>
                  </button>
                ))}
              </div>

              <div id="my-panel" role="tabpanel" aria-labelledby={`my-tab-${tab}`} data-testid="my-saved">
                {loading ? (
                  <p className="my-note">{t(lang, "myLoading")}</p>
                ) : failed ? (
                  <p className="my-note">{t(lang, "myLoadFailed")}</p>
                ) : shown[tab].length === 0 ? (
                  <div className="my-empty">
                    <span className="star" aria-hidden="true">
                      ★
                    </span>
                    <div>
                      <b>{t(lang, "myEmptyTitle")}</b>
                      <p>{t(lang, "myEmptyBody")}</p>
                      <Link className="btn-line" href={`/${lang}${current.path}`}>
                        {t(lang, current.browse)}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <ol className="rows">
                    {tab === "place"
                      ? shown.place.map((p, i) => {
                          const name = placeName(p, lang);
                          const sm = pickText(p as unknown as Record<string, unknown>, "summary", lang);
                          const s = placeState(p, now);
                          return (
                            <SavedRow
                              key={p.id}
                              no={pad(i + 1)}
                              href={`/${lang}/place/${p.slug}`}
                              title={name}
                              sub={name.sub}
                              cat={CATEGORY_KEY[p.category] ? t(lang, CATEGORY_KEY[p.category]) : p.category}
                              catClass={`cat-${p.category}`}
                              text={sm.text}
                              right={
                                s === "none" ? undefined : (
                                  <span className={`st ${s}`}>
                                    <i aria-hidden="true" />
                                    {stateLabel(p)}
                                  </span>
                                )
                              }
                              kind="place"
                              id={p.id}
                              lang={lang}
                              dim={s === "shut"}
                            />
                          );
                        })
                      : tab === "activity"
                        ? shown.activity.map((a, i) => {
                            const r = a as unknown as Record<string, unknown>;
                            const when = activityWhen(a, lang);
                            return (
                              <SavedRow
                                key={a.id}
                                no={pad(i + 1)}
                                href={`/${lang}/activity/${a.id}`}
                                title={pickText(r, "title", lang)}
                                cat={PLAY_CATEGORY_KEY[a.category] ? t(lang, PLAY_CATEGORY_KEY[a.category]) : a.category}
                                catClass={`play-${a.category}`}
                                text={pickText(r, "desc", lang).text}
                                right={when ? <span className="when"><b>{when}</b></span> : undefined}
                                kind="activity"
                                id={a.id}
                                lang={lang}
                              />
                            );
                          })
                        : shown.story.map((s, i) => {
                            const r = s as unknown as Record<string, unknown>;
                            return (
                              <SavedRow
                                key={s.id}
                                no={pad(i + 1)}
                                href={`/${lang}/stories/${s.slug}`}
                                title={pickText(r, "title", lang)}
                                cat={STORY_TYPE_KEY[s.type] ? t(lang, STORY_TYPE_KEY[s.type]) : s.type}
                                catClass={`story-${s.type}`}
                                text={pickText(r, "summary", lang).text}
                                kind="story"
                                id={s.id}
                                lang={lang}
                              />
                            );
                          })}
                  </ol>
                )}
              </div>
            </section>

            <section aria-labelledby="my-tips" className="my-sec">
              <header className="grp-h">
                <span className="gno">02</span>
                <div>
                  <h2 id="my-tips">{t(lang, "myTipsTitle")}</h2>
                </div>
                <span className="gcount">{tips && tips.length > 0 ? tips.length : null}</span>
              </header>
              {tips === null ? (
                <p className="my-note">{t(lang, "myTipsFailed")}</p>
              ) : tips.length === 0 ? (
                <p className="my-note">{t(lang, "myTipsEmpty")}</p>
              ) : (
                <ul className="my-tips" data-testid="my-tips">
                  {tips.map((tip) => {
                    const kind = TIP_KIND[tip.kind];
                    return (
                      <li key={tip.id}>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Badge tone={kind.tone}>{t(lang, kind.key)}</Badge>
                          {tip.handled && tip.kind === "changed" ? <Badge tone="muted">{t(lang, "tipHandled")}</Badge> : null}
                          {tip.target_name && tip.target_path ? (
                            <Link href={tip.target_path} className="tg">
                              {tip.target_name}
                            </Link>
                          ) : (
                            <span className="text-ink-2">{t(lang, "myTipTargetGone")}</span>
                          )}
                          <time dateTime={tip.created_at} className="ml-auto text-sm text-ink-2">
                            {formatVerifiedDate(tip.created_at, lang)}
                          </time>
                        </div>
                        <p className="whitespace-pre-line">{tip.body}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <aside className="my-side">
            <section aria-labelledby="my-lang" className="my-box">
              <h2 id="my-lang" className="label">
                {t(lang, "myLangTitle")}
              </h2>
              <LangSwitch lang={lang} />
            </section>

            <InstallPrompt lang={lang} />

            <section className="my-join">
              <span className="label">{t(lang, "myJoinKicker")}</span>
              <h2>{t(lang, "myJoinTitle")}</h2>
              <p>{t(lang, "myJoinBody")}</p>
              <Link className="btn-solid light" href={`/${lang}/makers`}>
                {t(lang, "myJoinAction")}
              </Link>
              {contactPhone ? (
                <p className="tel-line">
                  <span>{t(lang, "myContactLabel")}</span>
                  <a href={telHref(contactPhone)}>{contactPhone}</a>
                </p>
              ) : null}
            </section>

            <p className="my-admin">
              <Link href="/admin/login">{t(lang, "myAdminLogin")}</Link>
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
