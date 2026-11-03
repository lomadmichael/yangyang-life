"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { t, type Lang } from "@/i18n";
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
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const saved = isSaved(parseSaved(raw), kind, id);
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
      {/* 알림 자리는 늘 두고 내용만 바꾼다 — 화면 낭독기가 바뀐 글을 읽어 준다 */}
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
    </>
  );
}
