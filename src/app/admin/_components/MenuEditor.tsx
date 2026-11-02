"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ALLERGEN_CODES, ALLERGEN_KO } from "@/lib/admin-input";
import { draftEnglishAction, saveMenu } from "../actions";
import { Notice, btnPrimary, btnSecondary, btnSmall, inputCls } from "./ui";

export interface MenuRowValues {
  key: string; // 화면용 (React key)
  id?: string;
  name_ko: string;
  name_roman: string;
  name_en: string;
  desc_en: string;
  price: string;
  allergens: string[];
  vegan: boolean;
  spicy: number;
}

let seq = 0;
const blank = (): MenuRowValues => ({
  key: `new-${Date.now()}-${seq++}`,
  name_ko: "",
  name_roman: "",
  name_en: "",
  desc_en: "",
  price: "",
  allergens: [],
  vegan: false,
  spicy: 0,
});

const SPICY = ["안 매움", "조금 🌶", "보통 🌶🌶", "아주 🌶🌶🌶"];

export function MenuEditor({ placeId, initial, aiEnabled }: { placeId: string; initial: MenuRowValues[]; aiEnabled: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState<MenuRowValues[]>(initial);
  // 저장 후 router.refresh() 로 서버가 새 목록(새 줄의 id 포함)을 주면 그걸로 다시 맞춘다 — 안 그러면 다음 저장 때 새 줄이 두 번 들어감
  const [synced, setSynced] = useState(initial);
  if (synced !== initial) {
    setSynced(initial);
    setRows(initial);
  }
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const patch = (key: string, p: Partial<MenuRowValues>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function draft(r: MenuRowValues) {
    if (!r.name_ko.trim()) return;
    if (r.name_en.trim() && !window.confirm("영문 이름이 이미 있어요. 초안으로 바꿀까요?")) return;
    setDrafting(r.key);
    try {
      const res = await draftEnglishAction({ name: r.name_ko });
      if (res.ok && res.data?.name) patch(r.key, { name_en: res.data.name });
      else setResult(res.ok ? { ok: false, message: "초안이 비어 있어요." } : res);
    } finally {
      setDrafting(null);
    }
  }

  function save() {
    setResult(null);
    start(async () => {
      const r = await saveMenu(
        placeId,
        rows.map((r) => {
          const row: Partial<MenuRowValues> = { ...r };
          delete row.key;
          return row;
        }),
      );
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 ? <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">메뉴가 없어요. 아래 「+ 메뉴 추가」</p> : null}
      <ol className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <li key={r.key} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold">{i + 1}번</span>
              <div className="flex gap-1">
                <button type="button" className={btnSmall} onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로">
                  ↑
                </button>
                <button type="button" className={btnSmall} onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="아래로">
                  ↓
                </button>
                <button
                  type="button"
                  className={btnSmall}
                  onClick={() => {
                    if (!r.name_ko || window.confirm(`「${r.name_ko}」을(를) 뺄까요? 저장해야 반영돼요.`)) setRows((rs) => rs.filter((x) => x.key !== r.key));
                  }}
                >
                  빼기
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-muted">국문 이름 *</span>
                <input value={r.name_ko} onChange={(e) => patch(r.key, { name_ko: e.target.value })} className={inputCls} placeholder="물막국수" />
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-muted">로마자 (읽는 법)</span>
                <input value={r.name_roman} onChange={(e) => patch(r.key, { name_roman: e.target.value })} lang="en" className={inputCls} placeholder="Mul-makguksu" />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="flex items-center justify-between gap-2 text-xs text-muted">
                <span>영문 이름 English</span>
                {aiEnabled ? (
                  <button type="button" className={btnSmall} disabled={drafting === r.key || !r.name_ko.trim()} onClick={() => draft(r)}>
                    {drafting === r.key ? "번역 중…" : "Ai 번역 초안"}
                  </button>
                ) : null}
              </span>
              <input value={r.name_en} onChange={(e) => patch(r.key, { name_en: e.target.value })} lang="en" className={inputCls} placeholder="Cold buckwheat noodles in broth" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">영문 설명 (선택)</span>
              <input value={r.desc_en} onChange={(e) => patch(r.key, { desc_en: e.target.value })} lang="en" className={inputCls} placeholder="Chilled, tangy broth with radish kimchi" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">가격 (원)</span>
                <input value={r.price} onChange={(e) => patch(r.key, { price: e.target.value })} inputMode="numeric" className={inputCls} placeholder="10000" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">맵기</span>
                <select value={r.spicy} onChange={(e) => patch(r.key, { spicy: Number(e.target.value) })} className={inputCls}>
                  {SPICY.map((s, n) => (
                    <option key={n} value={n}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="inline-flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={r.vegan} onChange={(e) => patch(r.key, { vegan: e.target.checked })} className="size-5" />
              비건 (고기·생선·달걀·유제품 없음)
            </label>
            <fieldset>
              <legend className="mb-1 text-xs text-muted">알레르기 재료</legend>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGEN_CODES.map((a) => {
                  const on = r.allergens.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={on}
                      onClick={() => patch(r.key, { allergens: on ? r.allergens.filter((x) => x !== a) : [...r.allergens, a] })}
                      className={`min-h-9 rounded-full border px-3 text-sm ${on ? "border-salmon-strong bg-salmon-soft text-salmon-strong" : "border-line bg-surface"}`}
                    >
                      {ALLERGEN_KO[a]}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <button type="button" className={btnSecondary} onClick={() => setRows((rs) => [...rs, blank()])}>
        + 메뉴 추가
      </button>
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-line bg-sand/95 px-4 py-3 backdrop-blur">
        <Notice result={result} />
        <button type="button" onClick={save} disabled={pending} className={btnPrimary}>
          {pending ? "저장 중…" : `메뉴 ${rows.length}개 저장`}
        </button>
      </div>
    </div>
  );
}
