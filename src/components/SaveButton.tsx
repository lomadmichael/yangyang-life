"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { t, tf, type Lang } from "@/i18n";
import { isSaved, parseSaved, readSaved, SAVED_KEY, toggleSaved, writeSaved, type SavedKind } from "@/lib/saved";
import { IconStar, IconStarFilled } from "./icons";

// ★ 저장 — 이 기기의 localStorage 에만 둔다. 서버 전용 모듈(supabase·session·access-code)은 import 하지 않는다.
// 서버 렌더와 하이드레이션 첫 그림은 항상 빈 별(getServerSnapshot = null) → 그다음 이 기기 값으로 다시 그린다.

/** 같은 화면의 다른 ★ 버튼에도 바뀐 값을 알리는 이벤트 (storage 이벤트는 다른 탭에만 온다) */
const CHANGE_EVENT = "yl-saved-change";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** 문자열 그대로 돌려줘야 매번 같은 값으로 비교된다(객체를 새로 만들면 무한 렌더) */
function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(SAVED_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

type Toast = "saved" | "failed" | null;

/** 저장 알림(2초) — ★ 하나와 「모두 저장」이 같은 모양·같은 방식으로 쓴다 */
function useToast() {
  const [toast, setToast] = useState<Toast>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function show(next: Toast) {
    if (timer.current) clearTimeout(timer.current);
    setToast(next);
    if (next) timer.current = setTimeout(() => setToast(null), 2000);
  }

  return { toast, show };
}

function SaveToast({ toast, lang }: { toast: Toast; lang: Lang }) {
  return (
    // 알림 자리는 늘 두고 내용만 바꾼다 — 화면 낭독기가 바뀐 글을 읽어 준다
    <div role="status" className="pointer-events-none fixed inset-x-4 bottom-20 z-20 mx-auto max-w-md">
      {toast ? (
        <div className="pointer-events-auto flex min-h-12 items-center justify-between gap-3 rounded-xl bg-ink px-4 text-sm font-medium text-on-sea">
          {toast === "saved" ? (
            <>
              <span>{t(lang, "savedToast")}</span>
              <Link
                href={`/${lang}/my`}
                className="inline-flex min-h-11 items-center font-bold underline decoration-salmon underline-offset-4"
              >
                {t(lang, "savedToastLink")}
              </Link>
            </>
          ) : (
            <span className="py-3">{t(lang, "saveFailed")}</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 이 기기 저장값의 원문 문자열(없거나 막혔으면 null) — ★ 버튼과 MY 목록이 같은 구독을 쓴다.
 * 문자열이라 값이 같으면 같게 비교된다(effect 의존값으로 써도 된다). 서버 렌더에서는 늘 null.
 */
export function useSavedSnapshot(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function useSavedState() {
  return parseSaved(useSavedSnapshot());
}

const SIZES = {
  sm: { button: "h-11 w-11", icon: "h-6 w-6" },
  md: { button: "h-12 w-12", icon: "h-7 w-7" },
} as const;

export function SaveButton({
  kind,
  id,
  lang,
  size = "sm",
}: {
  kind: SavedKind;
  id: string;
  lang: Lang;
  size?: "sm" | "md";
}) {
  const saved = isSaved(useSavedState(), kind, id);
  const { toast, show } = useToast();

  function onClick() {
    const s = storage();
    const next = toggleSaved(readSaved(s), kind, id);
    const ok = writeSaved(s, next);
    if (!ok) {
      show("failed");
      return;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    show(isSaved(next, kind, id) ? "saved" : null);
  }

  const Icon = saved ? IconStarFilled : IconStar;
  const sz = SIZES[size];

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={t(lang, "saveLabel")}
        className={`inline-flex shrink-0 items-center justify-center rounded-full ${sz.button} ${saved ? "text-sea" : "text-muted hover:text-ink"}`}
      >
        <Icon className={sz.icon} />
      </button>
      <SaveToast toast={toast} lang={lang} />
    </>
  );
}

/**
 * 「이 코스의 장소 모두 저장」 — 넘겨받은 장소 id 중 아직 안 저장한 것만 넣는다(이미 저장한 것을 빼지 않는다).
 * 모두 저장돼 있으면 「장소 N곳을 저장했어요」로 바뀌고 더 누를 수 없다. 서버 렌더에서는 늘 누를 수 있는 모양.
 */
export function SaveAllButton({ placeIds, lang, label }: { placeIds: string[]; lang: Lang; label: string }) {
  const state = useSavedState();
  const { toast, show } = useToast();
  if (placeIds.length === 0) return null;
  const allSaved = placeIds.every((id) => isSaved(state, "place", id));

  function onClick() {
    const s = storage();
    let next = readSaved(s);
    // 뒤에서부터 넣어야 맨 앞 들른 곳이 MY 맨 위에 온다(toggleSaved 는 새 항목을 앞에 넣는다)
    for (const id of [...placeIds].reverse()) {
      if (!isSaved(next, "place", id)) next = toggleSaved(next, "place", id);
    }
    if (!writeSaved(s, next)) {
      show("failed");
      return;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    show("saved");
  }

  const n = String(placeIds.length);
  return (
    <>
      {allSaved ? (
        <p className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 font-medium text-sea">
          <IconStarFilled className="h-5 w-5" />
          {tf(lang, placeIds.length === 1 ? "saveAllDoneOne" : "saveAllDone", { n })}
        </p>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-sea bg-surface px-4 font-bold text-sea active:bg-sea-soft"
        >
          <IconStar className="h-5 w-5" />
          {label}
        </button>
      )}
      <SaveToast toast={toast} lang={lang} />
    </>
  );
}
