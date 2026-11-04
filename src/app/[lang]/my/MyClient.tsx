"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ActivityCard } from "@/components/ActivityCard";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { LangSwitch } from "@/components/LangSwitch";
import { PlaceCard } from "@/components/PlaceCard";
import { useSavedSnapshot } from "@/components/SaveButton";
import { StoryCard } from "@/components/StoryCard";
import { t, type DictKey, type Lang } from "@/i18n";
import { formatVerifiedDate } from "@/lib/format";
import { parseSaved, type SavedKind, type SavedState } from "@/lib/saved";
import type { TipKind } from "@/lib/tips";
import type { Activity, Place, Story } from "@/lib/types";
import { loadSaved, type MyTip } from "./actions";

// MY 화면(브라우저 쪽). 서버 전용 모듈(supabase·session·access-code)은 import 하지 않는다.
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

export function MyClient({ lang, tips }: { lang: Lang; tips: MyTip[] | null }) {
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

  return (
    <div className="flex flex-col gap-6 px-4 pb-10">
      <h1 className="pt-2 text-2xl font-bold">{t(lang, "myTitle")}</h1>

      <section aria-labelledby="my-saved" className="flex flex-col gap-3">
        <h2 id="my-saved" className="text-lg font-bold">
          {t(lang, "mySavedTitle")}
        </h2>
        <div role="tablist" aria-label={t(lang, "mySavedTabsLabel")} className="flex gap-2">
          {TABS.map(({ kind, label }) => {
            const active = kind === tab;
            return (
              <button
                key={kind}
                type="button"
                role="tab"
                id={`my-tab-${kind}`}
                aria-selected={active}
                aria-controls="my-panel"
                onClick={() => setTab(kind)}
                className={
                  active
                    ? "inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full bg-ink px-3 text-sm font-medium text-on-sea"
                    : "inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full border border-line bg-surface px-3 text-sm text-ink"
                }
              >
                {t(lang, label)}
                <span className={active ? "font-bold" : "text-muted"}>{count(kind)}</span>
              </button>
            );
          })}
        </div>

        <div id="my-panel" role="tabpanel" aria-labelledby={`my-tab-${tab}`} data-testid="my-saved">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted">{t(lang, "myLoading")}</p>
          ) : failed ? (
            <p className="py-8 text-center text-sm text-muted">{t(lang, "myLoadFailed")}</p>
          ) : shown[tab].length === 0 ? (
            <EmptyState
              title={t(lang, "myEmptyTitle")}
              body={t(lang, "myEmptyBody")}
              action={{ href: `/${lang}${current.path}`, label: t(lang, current.browse) }}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {tab === "place"
                ? shown.place.map((p) => (
                    <li key={p.id}>
                      <PlaceCard place={p} lang={lang} now={now} />
                    </li>
                  ))
                : tab === "activity"
                  ? shown.activity.map((a) => (
                      <li key={a.id}>
                        <ActivityCard activity={a} lang={lang} />
                      </li>
                    ))
                  : shown.story.map((s) => (
                      <li key={s.id}>
                        <StoryCard story={s} lang={lang} size="sm" />
                      </li>
                    ))}
            </ul>
          )}
        </div>
        <p className="text-sm text-muted">{t(lang, "myDeviceNote")}</p>
      </section>

      <section aria-labelledby="my-tips" className="flex flex-col gap-3 border-t border-line pt-5">
        <h2 id="my-tips" className="text-lg font-bold">
          {t(lang, "myTipsTitle")}
          {tips && tips.length > 0 ? <span className="ml-1 text-muted">{tips.length}</span> : null}
        </h2>
        {tips === null ? (
          <p className="text-sm text-muted">{t(lang, "myTipsFailed")}</p>
        ) : tips.length === 0 ? (
          <p className="text-sm text-muted">{t(lang, "myTipsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-3" data-testid="my-tips">
            {tips.map((tip) => {
              const kind = TIP_KIND[tip.kind];
              return (
                <li key={tip.id} className="rounded-2xl border border-line bg-surface px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <Badge tone={kind.tone}>{t(lang, kind.key)}</Badge>
                    {tip.handled && tip.kind === "changed" ? (
                      <Badge tone="muted">{t(lang, "tipHandled")}</Badge>
                    ) : null}
                    {tip.target_name && tip.target_path ? (
                      <Link href={tip.target_path} className="inline-flex min-h-11 items-center font-medium text-sea">
                        {tip.target_name}
                      </Link>
                    ) : (
                      <span className="text-muted">{t(lang, "myTipTargetGone")}</span>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-line">{tip.body}</p>
                  <time dateTime={tip.created_at} className="mt-1 block text-sm text-muted">
                    {formatVerifiedDate(tip.created_at, lang)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="my-lang" className="flex items-center justify-between gap-3 border-t border-line pt-5">
        <h2 id="my-lang" className="text-lg font-bold">
          {t(lang, "myLangTitle")}
        </h2>
        <LangSwitch lang={lang} />
      </section>

      <section className="rounded-2xl bg-sea-soft p-5">
        <h2 className="text-lg font-bold text-sea">{t(lang, "myJoinTitle")}</h2>
        <p className="mt-1 text-sm">{t(lang, "myJoinBody")}</p>
        <Link
          href={`/${lang}/makers`}
          className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-sea px-4 font-medium text-on-sea"
        >
          {t(lang, "myJoinAction")}
        </Link>
      </section>

      <Link
        href={`/${lang}/makers`}
        className="flex min-h-14 items-center justify-between rounded-2xl border border-line bg-surface px-4 active:bg-sea-soft"
      >
        <span>
          <span className="block font-bold">{t(lang, "myMakersLink")}</span>
          <span className="block text-sm text-muted">{t(lang, "myMakersSub")}</span>
        </span>
        <span aria-hidden="true" className="text-muted">
          ›
        </span>
      </Link>

      <p className="text-center">
        <Link href="/admin/login" className="inline-flex min-h-11 items-center px-3 text-xs text-muted underline">
          {t(lang, "myAdminLogin")}
        </Link>
      </p>
    </div>
  );
}
