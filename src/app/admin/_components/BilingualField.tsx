"use client";

import { useState } from "react";
import { draftEnglishAction } from "../actions";
import { btnSmall, inputCls } from "./ui";

/**
 * 국문 · 영문 칸을 나란히. 영문 칸 옆 「Ai 번역 초안」(키가 있을 때만) — 초안은 칸에 채울 뿐 저장은 사람이 누른다.
 */
export function BilingualField({
  label,
  ko,
  en,
  onKo,
  onEn,
  multiline,
  required,
  aiEnabled,
  koPlaceholder,
  enPlaceholder,
  hint,
}: {
  label: string;
  ko: string;
  en: string;
  onKo: (v: string) => void;
  onEn: (v: string) => void;
  multiline?: boolean;
  required?: boolean;
  aiEnabled: boolean;
  koPlaceholder?: string;
  enPlaceholder?: string;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function draft() {
    if (!ko.trim()) {
      setErr("국문 칸을 먼저 채워 주세요.");
      return;
    }
    if (en.trim() && !window.confirm("영문 칸에 이미 글이 있어요. 초안으로 바꿀까요?")) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await draftEnglishAction({ text: ko });
      if (!r.ok) setErr(r.message);
      else if (r.data?.text) onEn(r.data.text);
      else setErr("초안이 비어 있어요.");
    } finally {
      setBusy(false);
    }
  }

  const common = `${inputCls} ${multiline ? "min-h-24" : ""}`;
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">
        {label}
        {required ? <span className="text-salmon-strong"> *</span> : null}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-muted">국문</span>
          {multiline ? (
            <textarea value={ko} onChange={(e) => onKo(e.target.value)} rows={3} placeholder={koPlaceholder} className={common} required={required} />
          ) : (
            <input value={ko} onChange={(e) => onKo(e.target.value)} placeholder={koPlaceholder} className={common} required={required} />
          )}
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-muted">영문 English (외국인용)</span>
          {multiline ? (
            <textarea value={en} onChange={(e) => onEn(e.target.value)} rows={3} lang="en" placeholder={enPlaceholder} className={common} />
          ) : (
            <input value={en} onChange={(e) => onEn(e.target.value)} lang="en" placeholder={enPlaceholder} className={common} />
          )}
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {hint ? <span className="text-xs text-muted">{hint}</span> : <span />}
        {aiEnabled ? (
          <button type="button" onClick={draft} disabled={busy} className={btnSmall}>
            {busy ? "번역 중…" : "Ai 번역 초안 →"}
          </button>
        ) : null}
      </div>
      {err ? (
        <p role="alert" className="text-xs text-salmon-strong">
          {err}
        </p>
      ) : null}
    </fieldset>
  );
}
