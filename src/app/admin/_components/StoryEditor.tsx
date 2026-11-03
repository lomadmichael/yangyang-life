"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { FallbackNote } from "@/components/FallbackNote";
import { StoryBody } from "@/components/StoryBody";
import { PhotoFrame, StoryTypeBadge } from "@/components/StoryCard";
import { pickText, t, type Lang } from "@/i18n";
import {
  CATEGORY_KO,
  GUIDE_TOPICS,
  PLAY_CATEGORY_KO,
  STORY_TAG_KO,
  STORY_TYPE_KO,
  guideTopicKo,
  suggestSlug,
} from "@/lib/admin-input";
import { STORY_TAG_KEY, STORY_TAGS, STORY_TYPES } from "@/lib/labels";
import type { Role } from "@/lib/permissions";
import { resolveStops } from "@/lib/story-blocks";
import type { Activity, Place, StoryStatus } from "@/lib/types";
import { saveStory, uploadStoryPhoto } from "../actions";
import type { StopOption } from "../data";
import { BilingualField } from "./BilingualField";
import { MAX_BYTES, TOO_BIG, shrink } from "./PhotoManager";
import { emptyBlock, valuesToPreviewBlocks, type BlockValue, type StoryFormValues } from "./story-values";
import { Card, Field, Notice, Pill, btnPrimary, btnSecondary, btnSmall, inputCls } from "./ui";

type Result = { ok: boolean; message?: string } | null;

const BLOCK_KO: Record<BlockValue["t"], string> = { text: "문단", heading: "소제목", photo: "사진", stop: "들른 곳" };

function optionCategoryKo(kind: "place" | "activity", category: string): string {
  return kind === "place"
    ? ((CATEGORY_KO as Record<string, string>)[category] ?? category)
    : ((PLAY_CATEGORY_KO as Record<string, string>)[category] ?? category);
}

/**
 * 이야기 쓰기 (F33). 기본 카드 → 본문 블록 쌓기 → 아래 고정 「초안 저장」「검토 요청」.
 * 미리보기는 공개 화면의 StoryBody 를 그대로 쓴다(들른 곳은 공개 뷰에서 읽은 지금 값으로).
 * 권한·상태는 서버(saveStory)가 다시 정한다 — 여기의 status·role 은 버튼 문구를 고르는 데만 쓴다.
 */
export function StoryEditor({
  storyId,
  initial,
  status,
  role,
  places,
  activities,
  previewPlaces,
  previewActivities,
  aiEnabled,
  authorLine,
  startInPreview = false,
}: {
  storyId: string | null;
  initial: StoryFormValues;
  status: StoryStatus;
  role: Role;
  places: StopOption[];
  activities: StopOption[];
  previewPlaces: Place[];
  previewActivities: Activity[];
  aiEnabled: boolean;
  authorLine?: string;
  startInPreview?: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState<StoryFormValues>(initial);
  const [mode, setMode] = useState<"edit" | "preview">(startInPreview ? "preview" : "edit");
  const [previewLang, setPreviewLang] = useState<Lang>("ko");
  const [result, setResult] = useState<Result>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof StoryFormValues>(k: K, x: StoryFormValues[K]) => setV((p) => ({ ...p, [k]: x }));
  const setBlock = (key: string, patch: Partial<BlockValue>) =>
    setV((p) => ({ ...p, blocks: p.blocks.map((b) => (b.key === key ? ({ ...b, ...patch } as BlockValue) : b)) }));

  function move(i: number, d: -1 | 1) {
    setV((p) => {
      const j = i + d;
      if (j < 0 || j >= p.blocks.length) return p;
      const blocks = [...p.blocks];
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...p, blocks };
    });
  }
  function remove(key: string) {
    if (!window.confirm("이 블록을 뺄까요?")) return;
    setV((p) => ({ ...p, blocks: p.blocks.filter((b) => b.key !== key) }));
  }
  function add(t: BlockValue["t"]) {
    setV((p) => ({ ...p, blocks: [...p.blocks, emptyBlock(t)] }));
  }

  function save(intent: "save" | "submit") {
    if (role === "member" && status === "published") {
      const ok = window.confirm(
        "공개된 글을 고치면 다시 「검토 대기」가 되고, 편집이 공개할 때까지 방문객 화면에서 내려가요. 저장할까요?",
      );
      if (!ok) return;
    }
    setResult(null);
    setSubmitted(false);
    start(async () => {
      const r = await saveStory(storyId, v, intent);
      setResult(r);
      if (!r.ok) return;
      if (r.data?.status === "review" && status !== "review") setSubmitted(true);
      if (!storyId && r.data?.id) router.push(`/admin/stories/${r.data.id}`);
      else router.refresh();
    });
  }

  const counts = useMemo(() => {
    const c = { text: 0, heading: 0, photo: 0, stop: 0 };
    for (const b of v.blocks) c[b.t] += 1;
    return c;
  }, [v.blocks]);

  const stopNumbers = useMemo(() => {
    const m = new Map<string, number>();
    let n = 0;
    for (const b of v.blocks) if (b.t === "stop") m.set(b.key, ++n);
    return m;
  }, [v.blocks]);

  const submitLabel = status === "returned" ? "다시 검토 요청" : "검토 요청";
  const showSubmit = status === "draft" || status === "returned";
  const saveLabel =
    status === "draft" || status === "returned"
      ? "초안 저장"
      : status === "review"
        ? "저장 (검토 대기 유지)"
        : role === "member"
          ? "저장 (다시 검토 요청)"
          : "저장 (공개 화면에 바로 반영)";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1" role="group" aria-label="보기 전환">
        {(
          [
            ["edit", "편집"],
            ["preview", "미리보기"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={mode === k}
            onClick={() => setMode(k)}
            className={`min-h-11 rounded-lg text-sm font-medium ${mode === k ? "bg-sea text-on-sea" : "text-ink hover:bg-sea-soft"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "preview" ? (
        <StoryPreview
          v={v}
          lang={previewLang}
          onLang={setPreviewLang}
          places={previewPlaces}
          activities={previewActivities}
          authorLine={authorLine}
        />
      ) : (
        <>
          <Card title="기본">
            <Field label="갈래">
              <div className="grid grid-cols-3 gap-2">
                {STORY_TYPES.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={v.type === k}
                    onClick={() => setV((p) => ({ ...p, type: k, guide_topic: k === "guide" ? p.guide_topic : "" }))}
                    className={`min-h-11 rounded-lg border px-2 text-sm ${v.type === k ? "border-sea bg-sea-soft font-medium text-sea" : "border-line bg-surface"}`}
                  >
                    {STORY_TYPE_KO[k]}
                  </button>
                ))}
              </div>
            </Field>
            {v.type === "guide" ? (
              <Field label="가이드 주제 *" hint="놀거리·장소 분류 중 하나. 그 분류 화면 맨 위에 이 가이드가 걸려요.">
                <select value={v.guide_topic} onChange={(e) => set("guide_topic", e.target.value)} className={inputCls} required>
                  <option value="">— 골라 주세요 —</option>
                  {GUIDE_TOPICS.map((k) => (
                    <option key={k} value={k}>
                      {guideTopicKo(k)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <BilingualField
              name="title"
              label="제목 (80자까지)"
              required
              ko={v.title_ko}
              en={v.title_en}
              onKo={(x) => set("title_ko", x)}
              onEn={(x) => set("title_en", x)}
              aiEnabled={aiEnabled}
            />
            <BilingualField
              name="summary"
              label="한 줄 요약 (140자까지)"
              ko={v.summary_ko}
              en={v.summary_en}
              onKo={(x) => set("summary_ko", x)}
              onEn={(x) => set("summary_en", x)}
              aiEnabled={aiEnabled}
            />
            <Field
              label="주소 이름 (slug)"
              hint="공개 주소 /ko/stories/이름. 영문 소문자·숫자·하이픈. 비우면 영문 제목으로 정해요(영문 제목도 없으면 임의 이름)."
            >
              <input
                value={v.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder={suggestSlug(v.title_en) || "rainy-day-hyeonnam"}
                inputMode="url"
                autoCapitalize="none"
                className={inputCls}
              />
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">대표 사진</legend>
              {v.cover_photo ? (
                <div className="flex flex-col gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.cover_photo} alt="대표 사진" className="aspect-video w-full rounded-lg border border-line object-cover" />
                  <button type="button" className={btnSmall} onClick={() => set("cover_photo", "")}>
                    대표 사진 빼기
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted">대표 사진이 있어야 검토를 요청할 수 있어요.</p>
              )}
              <PhotoUpload storyId={storyId} label={v.cover_photo ? "대표 사진 바꾸기" : "+ 대표 사진"} onUrl={(url) => set("cover_photo", url)} />
            </fieldset>
            <Field label={v.type === "guide" ? "다녀온 날 (선택)" : "다녀온 날"}>
              <input type="date" value={v.visited_on} onChange={(e) => set("visited_on", e.target.value)} className={inputCls} />
            </Field>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">추천 태그</legend>
              <div className="flex flex-wrap gap-1.5">
                {STORY_TAGS.map((k) => {
                  const on = v.tags.includes(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("tags", on ? v.tags.filter((x) => x !== k) : [...v.tags, k])}
                      className={`min-h-11 rounded-full border px-3 text-sm ${on ? "border-sea bg-sea text-on-sea" : "border-line bg-surface"}`}
                    >
                      {STORY_TAG_KO[k]}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </Card>

          <Card
            title="본문"
            aside={
              <span className="text-xs text-muted">
                문단 {counts.text}
                {counts.heading ? ` · 소제목 ${counts.heading}` : ""} · 사진 {counts.photo} · 들른 곳 {counts.stop}
              </span>
            }
          >
            <p className="text-xs text-muted">
              가게 정보(영업시간·주소)는 글로 베끼지 말고 「들른 곳」으로 연결해 주세요 — 공개 화면엔 늘 지금 값이 보여요.
            </p>
            {v.blocks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-muted">
                아래 「+ 문단」「+ 사진」「+ 들른 곳」으로 본문을 쌓아 주세요.
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {v.blocks.map((b, i) => (
                  <li key={b.key} className="flex flex-col gap-3 rounded-lg border border-line p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">
                        {BLOCK_KO[b.t]}
                        {b.t === "stop" ? ` ${stopNumbers.get(b.key)}` : ""}
                      </span>
                      <span className="flex gap-1">
                        <button type="button" className={btnSmall} onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로">
                          ↑
                        </button>
                        <button
                          type="button"
                          className={btnSmall}
                          onClick={() => move(i, 1)}
                          disabled={i === v.blocks.length - 1}
                          aria-label="아래로"
                        >
                          ↓
                        </button>
                        <button type="button" className={btnSmall} onClick={() => remove(b.key)}>
                          빼기
                        </button>
                      </span>
                    </div>
                    <BlockFields
                      b={b}
                      storyId={storyId}
                      aiEnabled={aiEnabled}
                      places={places}
                      activities={activities}
                      onChange={(patch) => setBlock(b.key, patch)}
                    />
                  </li>
                ))}
              </ol>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={btnSecondary} onClick={() => add("text")}>
                + 문단
              </button>
              <button type="button" className={btnSecondary} onClick={() => add("heading")}>
                + 소제목
              </button>
              <button type="button" className={btnSecondary} onClick={() => add("photo")}>
                + 사진
              </button>
              <button type="button" className={btnSecondary} onClick={() => add("stop")}>
                + 들른 곳
              </button>
            </div>
          </Card>
        </>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-line bg-sand/95 px-4 py-3 backdrop-blur">
        <Notice result={result} />
        {submitted ? (
          <Link href="/admin/stories" className={btnSecondary}>
            내 글 목록으로
          </Link>
        ) : null}
        <div className={`grid gap-2 ${showSubmit ? "grid-cols-2" : "grid-cols-1"}`}>
          <button type="button" disabled={pending} onClick={() => save("save")} className={showSubmit ? btnSecondary : btnPrimary}>
            {pending ? "저장 중…" : saveLabel}
          </button>
          {showSubmit ? (
            <button type="button" disabled={pending} onClick={() => save("submit")} className={btnPrimary}>
              {submitLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** 사진 한 장 올리기 → 공개 주소를 돌려준다. 새 글(storyId 없음)은 초안 저장 뒤에 */
function PhotoUpload({ storyId, label, onUrl }: { storyId: string | null; label: string; onUrl: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<Result>(null);
  const [pending, start] = useTransition();

  if (!storyId) {
    return <p className="text-xs text-muted">사진은 먼저 아래 「초안 저장」을 누른 뒤에 올릴 수 있어요.</p>;
  }

  function upload() {
    const f = input.current?.files?.[0];
    if (!f) {
      setResult({ ok: false, message: "사진을 먼저 골라 주세요." });
      return;
    }
    start(async () => {
      const small = await shrink(f);
      if (small.size > MAX_BYTES) {
        setResult({ ok: false, message: TOO_BIG });
        return;
      }
      const fd = new FormData();
      fd.set("story_id", storyId as string);
      fd.set("file", small);
      const r = await uploadStoryPhoto(fd);
      setResult(r);
      if (r.ok && r.data?.url) onUrl(r.data.url);
      if (input.current) input.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept="image/*"
          aria-label={label}
          className="min-w-0 flex-1 text-sm file:mr-2 file:min-h-11 file:rounded-lg file:border file:border-line file:bg-surface file:px-3"
        />
        <button type="button" onClick={upload} disabled={pending} className={btnSmall}>
          {pending ? "올리는 중…" : label}
        </button>
      </div>
      <span className="text-xs text-muted">4MB 이하 · 자동으로 줄여서 올려요. 사람 얼굴은 동의받은 사진만.</span>
      <Notice result={result} />
    </div>
  );
}

function BlockFields({
  b,
  storyId,
  aiEnabled,
  places,
  activities,
  onChange,
}: {
  b: BlockValue;
  storyId: string | null;
  aiEnabled: boolean;
  places: StopOption[];
  activities: StopOption[];
  onChange: (patch: Partial<BlockValue>) => void;
}) {
  if (b.t === "text" || b.t === "heading") {
    return (
      <BilingualField
        name={`${b.key}`}
        label={b.t === "heading" ? "소제목" : "문단"}
        multiline={b.t === "text"}
        required
        ko={b.ko}
        en={b.en}
        onKo={(x) => onChange({ ko: x })}
        onEn={(x) => onChange({ en: x })}
        aiEnabled={aiEnabled}
      />
    );
  }
  if (b.t === "photo") {
    return (
      <>
        {b.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.url} alt="본문 사진" className="aspect-4/3 w-full rounded-lg border border-line object-cover" />
        ) : null}
        <PhotoUpload storyId={storyId} label={b.url ? "사진 바꾸기" : "사진 올리기"} onUrl={(url) => onChange({ url })} />
        <BilingualField
          name={`${b.key}_caption`}
          label="사진 설명"
          ko={b.caption_ko}
          en={b.caption_en}
          onKo={(x) => onChange({ caption_ko: x })}
          onEn={(x) => onChange({ caption_en: x })}
          aiEnabled={aiEnabled}
        />
      </>
    );
  }
  if (b.t !== "stop") return null;
  return (
    <>
      <StopPicker
        placeId={b.place_id}
        activityId={b.activity_id}
        places={places}
        activities={activities}
        onPick={(kind, id) => onChange(kind === "place" ? { place_id: id, activity_id: "" } : { place_id: "", activity_id: id })}
      />
      <BilingualField
        name={`${b.key}_time`}
        label="시간 메모"
        ko={b.time_ko}
        en={b.time_en}
        onKo={(x) => onChange({ time_ko: x })}
        onEn={(x) => onChange({ time_en: x })}
        koPlaceholder="오전 10:00 · 점심"
        aiEnabled={aiEnabled}
      />
      <BilingualField
        name={`${b.key}_note`}
        label="한 줄 메모 (200자까지)"
        ko={b.note_ko}
        en={b.note_en}
        onKo={(x) => onChange({ note_ko: x })}
        onEn={(x) => onChange({ note_en: x })}
        aiEnabled={aiEnabled}
      />
    </>
  );
}

/** 들른 곳 고르기 — 장소·놀거리 이름 부분 일치 검색 */
function StopPicker({
  placeId,
  activityId,
  places,
  activities,
  onPick,
}: {
  placeId: string;
  activityId: string;
  places: StopOption[];
  activities: StopOption[];
  onPick: (kind: "place" | "activity", id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(!placeId && !activityId);
  const chosen = placeId
    ? { kind: "place" as const, o: places.find((p) => p.id === placeId) }
    : activityId
      ? { kind: "activity" as const, o: activities.find((a) => a.id === activityId) }
      : null;

  const query = q.trim().toLowerCase();
  const matches = query
    ? [
        ...places.filter((p) => p.name.toLowerCase().includes(query)).map((o) => ({ kind: "place" as const, o })),
        ...activities.filter((a) => a.name.toLowerCase().includes(query)).map((o) => ({ kind: "activity" as const, o })),
      ].slice(0, 8)
    : [];

  return (
    <div className="flex flex-col gap-2">
      {chosen ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-sea-soft px-3 py-2">
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            {chosen.o ? (
              <>
                <span className="font-bold">{chosen.o.name}</span>
                <span className="text-xs text-muted">
                  {chosen.kind === "place" ? "장소" : "놀거리"} · {optionCategoryKo(chosen.kind, chosen.o.category)}
                </span>
                {chosen.o.closed ? <Pill tone="warn">휴업</Pill> : null}
              </>
            ) : (
              <span className="text-sm text-salmon-strong">지워졌거나 숨겨진 곳이에요 — 공개 화면엔 「더 이상 안내하지 않는 곳」으로 보여요</span>
            )}
          </span>
          {!open ? (
            <button type="button" className={btnSmall} onClick={() => setOpen(true)}>
              바꾸기
            </button>
          ) : null}
        </div>
      ) : null}
      {open ? (
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">장소·놀거리 찾기</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="이름 일부 (예: 막국수)"
              className={inputCls}
              type="search"
            />
          </label>
          {query && matches.length === 0 ? <p className="text-xs text-muted">맞는 곳이 없어요. 장소·할 거리 화면에서 먼저 넣어 주세요.</p> : null}
          {matches.length ? (
            <ul className="flex flex-col gap-1">
              {matches.map(({ kind, o }) => (
                <li key={`${kind}-${o.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(kind, o.id);
                      setQ("");
                      setOpen(false);
                    }}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 text-left text-sm hover:border-sea"
                  >
                    <span className="font-medium">{o.name}</span>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                      {kind === "place" ? "장소" : "놀거리"} · {optionCategoryKo(kind, o.category)}
                      {o.closed ? <Pill tone="warn">휴업</Pill> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {chosen ? (
            <button type="button" className={btnSmall} onClick={() => setOpen(false)}>
              그대로 두기
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** 미리보기 — 공개 이야기 상세의 머리(갈래·제목·요약·태그) + StoryBody. 들른 곳은 공개 화면이 보는 지금 값 */
function StoryPreview({
  v,
  lang,
  onLang,
  places,
  activities,
  authorLine,
}: {
  v: StoryFormValues;
  lang: Lang;
  onLang: (l: Lang) => void;
  places: Place[];
  activities: Activity[];
  authorLine?: string;
}) {
  const blocks = useMemo(() => valuesToPreviewBlocks(v.blocks), [v.blocks]);
  const resolved = useMemo(
    () =>
      resolveStops(
        blocks,
        new Map(places.map((p) => [p.id, p])),
        new Map(activities.map((a) => [a.id, a])),
      ),
    [blocks, places, activities],
  );
  const row = {
    title_ko: v.title_ko.trim() || "(제목 없음)",
    title_en: v.title_en.trim() || null,
    summary_ko: v.summary_ko.trim() || null,
    summary_en: v.summary_en.trim() || null,
  };
  const title = pickText(row, "title", lang);
  const summary = pickText(row, "summary", lang);
  const tags = v.tags.filter((k) => STORY_TAG_KEY[k]).map((k) => t(lang, STORY_TAG_KEY[k]));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">방문객에게 이렇게 보여요 (저장 전 내용 포함)</p>
        <div className="flex gap-1" role="group" aria-label="미리보기 언어">
          {(["ko", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => onLang(l)}
              className={`${btnSmall} ${lang === l ? "border-sea text-sea" : ""}`}
            >
              {l === "ko" ? "한국어" : "English"}
            </button>
          ))}
        </div>
      </div>
      <article lang={lang} className="flex flex-col gap-5 rounded-2xl border border-line bg-sand p-4">
        {v.cover_photo ? <PhotoFrame src={v.cover_photo} alt={title.text} className="-mx-4 -mt-4 aspect-video" /> : null}
        <header className="flex flex-col gap-2">
          <span>
            <StoryTypeBadge type={v.type} lang={lang} />
          </span>
          <h2 className="text-2xl font-bold leading-snug">
            {title.text}
            <FallbackNote lang={lang} show={title.fallback} />
          </h2>
          {summary.text ? (
            <p>
              {summary.text}
              <FallbackNote lang={lang} show={summary.fallback} />
            </p>
          ) : null}
          {authorLine ? <p className="text-sm text-muted">{authorLine}</p> : null}
          {tags.length ? <p className="text-sm text-muted">{tags.join(" · ")}</p> : null}
        </header>
        {blocks.length ? (
          <StoryBody blocks={blocks} resolved={resolved} lang={lang} numbered={v.type !== "guide"} />
        ) : (
          <p className="text-sm text-muted">본문이 아직 없어요.</p>
        )}
      </article>
    </div>
  );
}
