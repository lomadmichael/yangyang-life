"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MONTHS, PLAY_CATEGORY_KO, WEEKDAY_NUM_KO } from "@/lib/admin-input";
import { PLAY_CATEGORIES } from "@/lib/labels";
import type { PlayCategory } from "@/lib/types";
import { saveActivity } from "../actions";
import { BilingualField } from "./BilingualField";
import type { ActivityFormValues } from "./activity-values";
import { Card, Field, Notice, btnPrimary, inputCls } from "./ui";

const WEEK_MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

export function ActivityForm({
  activityId,
  initial,
  places,
  aiEnabled,
}: {
  activityId: string | null;
  initial: ActivityFormValues;
  places: { id: string; name_ko: string }[];
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState<ActivityFormValues>(initial);
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ActivityFormValues>(k: K, x: ActivityFormValues[K]) => setV((p) => ({ ...p, [k]: x }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    start(async () => {
      const r = await saveActivity(activityId, v);
      setResult(r);
      if (r.ok && !activityId && r.data?.id) router.push(`/admin/activities/${r.data.id}`);
      else if (r.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Card title="내용">
        <Field label="종류">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["dated", "기간 행사 (날짜 있음)"],
                ["always", "상시 (요일마다)"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={v.kind === k}
                onClick={() => set("kind", k)}
                className={`min-h-11 rounded-lg border px-2 text-sm ${v.kind === k ? "border-sea bg-sea-soft font-medium text-sea" : "border-line bg-surface"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="분류 *">
          <select
            name="category"
            value={v.category}
            onChange={(e) => set("category", e.target.value as PlayCategory | "")}
            className={inputCls}
            required
          >
            <option value="">— 골라 주세요 —</option>
            {PLAY_CATEGORIES.map((k) => (
              <option key={k} value={k}>
                {PLAY_CATEGORY_KO[k]}
              </option>
            ))}
          </select>
        </Field>
        <BilingualField name="title" label="제목" required ko={v.title_ko} en={v.title_en} onKo={(x) => set("title_ko", x)} onEn={(x) => set("title_en", x)} aiEnabled={aiEnabled} />
        <BilingualField name="desc" label="설명" multiline ko={v.desc_ko} en={v.desc_en} onKo={(x) => set("desc_ko", x)} onEn={(x) => set("desc_en", x)} aiEnabled={aiEnabled} />
      </Card>

      <Card title="언제">
        {v.kind === "dated" ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label="시작일 *">
              <input type="date" value={v.starts_on} onChange={(e) => set("starts_on", e.target.value)} className={inputCls} required />
            </Field>
            <Field label="끝나는 날">
              <input type="date" value={v.ends_on} min={v.starts_on || undefined} onChange={(e) => set("ends_on", e.target.value)} className={inputCls} />
            </Field>
          </div>
        ) : (
          <>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">요일</legend>
              <div className="flex flex-wrap gap-1.5">
                {WEEK_MON_FIRST.map((d) => {
                  const on = v.weekdays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("weekdays", on ? v.weekdays.filter((x) => x !== d) : [...v.weekdays, d])}
                      className={`size-11 rounded-full border text-sm ${on ? "border-sea bg-sea text-on-sea" : "border-line bg-surface"}`}
                    >
                      {WEEKDAY_NUM_KO[d]}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-muted">아무것도 안 고르면 「매일」로 보여요. 시작일·끝나는 날을 넣으면 그 기간에만 보여요.</p>
            </fieldset>
            <div className="grid grid-cols-2 gap-2">
              <Field label="시작일 (선택)">
                <input type="date" value={v.starts_on} onChange={(e) => set("starts_on", e.target.value)} className={inputCls} />
              </Field>
              <Field label="끝나는 날 (선택)">
                <input type="date" value={v.ends_on} onChange={(e) => set("ends_on", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </>
        )}
        <fieldset>
          <legend className="mb-1 text-sm font-medium">운영 계절</legend>
          <div className="grid grid-cols-6 gap-1.5">
            {MONTHS.map((m) => {
              const on = v.season_months.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    set("season_months", on ? v.season_months.filter((x) => x !== m) : [...v.season_months, m])
                  }
                  className={`min-h-11 rounded-lg border text-sm ${on ? "border-sea bg-sea text-on-sea" : "border-line bg-surface"}`}
                >
                  {m}월
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-muted">
            {v.season_months.length === 0
              ? "아무것도 안 고르면 「사계절」이에요. 철이 있는 체험만 운영하는 달을 골라 주세요."
              : "고른 달에만 「지금 시즌」으로 보이고, 나머지 달엔 「비시즌」으로 따로 보여요."}
          </p>
        </fieldset>
        <BilingualField name="time_note" label="시간 안내" ko={v.time_note_ko} en={v.time_note_en} onKo={(x) => set("time_note_ko", x)} onEn={(x) => set("time_note_en", x)} koPlaceholder="매일 오전 7시" aiEnabled={aiEnabled} />
        <label className="inline-flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={v.rainy_ok} onChange={(e) => set("rainy_ok", e.target.checked)} className="size-5" />
          비 오는 날에도 할 수 있어요
        </label>
      </Card>

      <Card title="어디서">
        <Field label="연결할 가게 (선택)">
          <select value={v.place_id} onChange={(e) => set("place_id", e.target.value)} className={inputCls}>
            <option value="">— 없음 —</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name_ko}
              </option>
            ))}
          </select>
        </Field>
        <BilingualField name="location" label="장소" ko={v.location_ko} en={v.location_en} onKo={(x) => set("location_ko", x)} onEn={(x) => set("location_en", x)} koPlaceholder="죽도해변" aiEnabled={aiEnabled} />
        <Field label="링크 (선택)" hint="예약·안내 페이지. https:// 로 시작">
          <input type="url" value={v.link} onChange={(e) => set("link", e.target.value)} inputMode="url" className={inputCls} placeholder="https://" />
        </Field>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-line bg-sand/95 px-4 py-3 backdrop-blur">
        <Notice result={result} />
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "저장 중…" : activityId ? "저장" : "할 거리 저장"}
        </button>
      </div>
    </form>
  );
}
