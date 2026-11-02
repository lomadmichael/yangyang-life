"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { reportTip } from "@/app/[lang]/tips/actions";
import { t, type Lang } from "@/i18n";

const STORE_KEY = "yl_reported";

function readReported(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function remember(id: string) {
  try {
    const list = readReported().filter((x) => x !== id);
    list.push(id);
    localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(-200)));
  } catch {
    // 저장소가 막혀 있어도 이번 화면에서는 버튼이 꺼진 채로 남는다
  }
}

function noSubscribe(): () => void {
  return () => {};
}

/** 신고 — 기기당 한 번(서버도 같은 기기 두 번째 신고는 무시한다) */
export function ReportButton({ tipId, lang }: { tipId: string; lang: Lang }) {
  const [justReported, setReported] = useState(false);
  const [pending, start] = useTransition();
  // 예전에 이 기기에서 신고한 글인지 — 서버 화면에선 모름(false), 브라우저에서 localStorage 로 확인
  const reportedBefore = useSyncExternalStore(
    noSubscribe,
    () => readReported().includes(tipId),
    () => false,
  );
  const reported = justReported || reportedBefore;

  if (reported) {
    return <span className="text-xs text-muted">{t(lang, "tipReported")}</span>;
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t(lang, "tipReportConfirm"))) return;
        start(async () => {
          const res = await reportTip(tipId);
          if (res.ok) {
            remember(tipId);
            setReported(true);
          }
        });
      }}
      className="inline-flex min-h-11 items-center px-2 text-xs text-muted underline underline-offset-2 disabled:opacity-50"
    >
      {t(lang, "tipReport")}
    </button>
  );
}
