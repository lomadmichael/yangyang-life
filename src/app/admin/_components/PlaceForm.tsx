"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CATEGORY_KO, STATUS_KO, suggestSlug } from "@/lib/admin-input";
import { savePlace } from "../actions";
import { BilingualField } from "./BilingualField";
import { HoursEditor } from "./HoursEditor";
import type { PlaceFormValues } from "./place-values";
import { Card, Field, Notice, btnPrimary, inputCls } from "./ui";

type Result = { ok: boolean; message?: string } | null;

export function PlaceForm({
  placeId,
  code,
  initial,
  aiEnabled,
}: {
  placeId: string | null;
  code?: string;
  initial: PlaceFormValues;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState<PlaceFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(placeId));
  const [result, setResult] = useState<Result>(null);
  const [pending, start] = useTransition();

  function set<K extends keyof PlaceFormValues>(key: K, value: PlaceFormValues[K]) {
    setV((prev) => {
      const next = { ...prev, [key]: value };
      if (!slugTouched && (key === "name_roman" || key === "name_en")) {
        next.slug = suggestSlug(String(next.name_roman || next.name_en || ""));
      }
      return next;
    });
  }

  /** "37.97, 128.76" 처럼 좌표를 한 번에 붙여 넣으면 위도·경도로 나눈다 */
  function setLat(raw: string) {
    const m = raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) setV((prev) => ({ ...prev, lat: m[1], lng: m[2] }));
    else set("lat", raw);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    start(async () => {
      const r = await savePlace(placeId, v);
      setResult(r);
      if (r.ok && !placeId && r.data?.id) router.push(`/admin/places/${r.data.id}`);
      else if (r.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Card title="기본 정보">
        <BilingualField
          label="가게 이름"
          required
          ko={v.name_ko}
          en={v.name_en}
          onKo={(x) => set("name_ko", x)}
          onEn={(x) => set("name_en", x)}
          koPlaceholder="현남 막국수"
          enPlaceholder="Hyeonnam Makguksu"
          aiEnabled={aiEnabled}
        />
        <Field label="로마자 이름 (간판 읽는 법)" hint="예: Hyeonnam Makguksu — 외국인이 간판을 찾을 때 씀">
          <input value={v.name_roman} onChange={(e) => set("name_roman", e.target.value)} lang="en" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="종류">
            <select value={v.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
              {Object.entries(CATEGORY_KO).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="가격대">
            <select value={v.price_level} onChange={(e) => set("price_level", e.target.value)} className={inputCls}>
              <option value="1">₩ 저렴</option>
              <option value="2">₩₩ 보통</option>
              <option value="3">₩₩₩ 비쌈</option>
            </select>
          </Field>
        </div>
        <Field label="상태" hint="참여 가게 = 사장님이 동의한 곳. 사진·영어 메뉴판은 참여 가게만 공개돼요.">
          <select value={v.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
            {Object.entries(STATUS_KO).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <BilingualField
          label="한 줄 소개"
          multiline
          ko={v.summary_ko}
          en={v.summary_en}
          onKo={(x) => set("summary_ko", x)}
          onEn={(x) => set("summary_en", x)}
          aiEnabled={aiEnabled}
        />
      </Card>

      <Card title="위치">
        <Field label="주소 (국문)">
          <input value={v.address_ko} onChange={(e) => set("address_ko", e.target.value)} className={inputCls} required />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="위도">
            <input value={v.lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" placeholder="37.97" className={inputCls} required />
          </Field>
          <Field label="경도">
            <input value={v.lng} onChange={(e) => set("lng", e.target.value)} inputMode="decimal" placeholder="128.76" className={inputCls} required />
          </Field>
        </div>
        <p className="-mt-2 text-xs text-muted">지도 앱에서 복사한 「37.97, 128.76」을 위도 칸에 붙여 넣으면 둘로 나눠 들어가요.</p>
        <BilingualField
          label="찾아가는 길"
          multiline
          ko={v.how_to_get_ko}
          en={v.how_to_get_en}
          onKo={(x) => set("how_to_get_ko", x)}
          onEn={(x) => set("how_to_get_en", x)}
          koPlaceholder="남애항 버스 정류장에서 걸어서 5분"
          aiEnabled={aiEnabled}
        />
      </Card>

      <Card title="영업·편의">
        <HoursEditor value={v.hours} onChange={(h) => set("hours", h)} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="주차">
            <select value={v.parking} onChange={(e) => set("parking", e.target.value)} className={inputCls}>
              <option value="unknown">모름</option>
              <option value="yes">있음</option>
              <option value="no">없음</option>
            </select>
          </Field>
          <Field label="해외 카드">
            <select value={v.foreign_card} onChange={(e) => set("foreign_card", e.target.value)} className={inputCls}>
              <option value="unknown">모름</option>
              <option value="yes">됨</option>
              <option value="no">안 됨</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card title="주소 이름">
        {code ? (
          <Field label="QR 코드 (바꿀 수 없음)" hint="인쇄한 QR 은 이 코드를 가리켜요. 그래서 아래 주소 이름을 바꿔도 QR 은 그대로 돼요.">
            <input value={code} readOnly className={`${inputCls} bg-sand font-mono`} />
          </Field>
        ) : (
          <p className="text-sm text-muted">QR 코드(6자리)는 저장하면 자동으로 만들어져요.</p>
        )}
        <Field label="주소 이름 slug" hint={`영문 소문자·숫자·하이픈. 공개 주소: yangyang.life/en/place/${v.slug || "…"}`}>
          <input
            value={v.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value.toLowerCase());
            }}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={`${inputCls} font-mono`}
            required
          />
        </Field>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-line bg-sand/95 px-4 py-3 backdrop-blur">
        <Notice result={result} />
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "저장 중…" : placeId ? "저장" : "가게 저장"}
        </button>
      </div>
    </form>
  );
}
