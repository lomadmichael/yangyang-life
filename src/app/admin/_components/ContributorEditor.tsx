"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createContributor, issueContributorCode, revokeContributorCode, updateContributor } from "../actions";
import { Field, Notice, Pill, btnPrimary, btnSecondary, btnSmall, inputCls } from "./ui";

export interface ContributorValues {
  id?: string;
  display_name: string;
  team: string;
  role_label: string;
  cohort: string;
  show: boolean;
  role: "owner" | "member";
  has_code?: boolean;
  is_sample?: boolean;
}

type Result = { ok: boolean; message?: string } | null;

function Fields({ v, set }: { v: ContributorValues; set: (p: Partial<ContributorValues>) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Field label="이름 *">
          <input value={v.display_name} onChange={(e) => set({ display_name: e.target.value })} className={inputCls} required />
        </Field>
        <Field label="권한">
          <select value={v.role} onChange={(e) => set({ role: e.target.value as ContributorValues["role"] })} className={inputCls}>
            <option value="member">참여자 (입력·확인)</option>
            <option value="owner">운영 (전체)</option>
          </select>
        </Field>
        <Field label="팀">
          <input value={v.team} onChange={(e) => set({ team: e.target.value })} className={inputCls} placeholder="현장조사" />
        </Field>
        <Field label="역할 표기">
          <input value={v.role_label} onChange={(e) => set({ role_label: e.target.value })} className={inputCls} placeholder="영어 콘텐츠" />
        </Field>
        <Field label="기수">
          <input value={v.cohort} onChange={(e) => set({ cohort: e.target.value })} className={inputCls} placeholder="4기" />
        </Field>
      </div>
      <label className="inline-flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={v.show} onChange={(e) => set({ show: e.target.checked })} className="size-5" />
        「만든 사람들」에 이름 보이기
      </label>
    </>
  );
}

export function ContributorRow({ initial, isMe }: { initial: ContributorValues; isMe: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [code, setCode] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (p: Partial<ContributorValues>) => setV((x) => ({ ...x, ...p }));

  const save = () =>
    start(async () => {
      const r = await updateContributor(initial.id!, v);
      setResult(r);
      if (r.ok) router.refresh();
    });
  const issue = () => {
    if (initial.has_code && !window.confirm(`${initial.display_name} 님 코드를 새로 만들까요? 이전 코드는 바로 안 돼요.`)) return;
    start(async () => {
      const r = await issueContributorCode(initial.id!);
      setResult(r);
      setCode(r.ok && r.data ? r.data.code : null);
      if (r.ok) router.refresh();
    });
  };
  const revoke = () => {
    if (!window.confirm(`${initial.display_name} 님 코드를 회수할까요? 바로 로그인이 풀려요.`)) return;
    start(async () => {
      const r = await revokeContributorCode(initial.id!);
      setResult(r);
      setCode(null);
      if (r.ok) router.refresh();
    });
  };

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-bold">{initial.display_name}</span>
        {initial.role === "owner" ? <Pill tone="info">운영</Pill> : null}
        {initial.has_code ? <Pill tone="ok">코드 있음</Pill> : <Pill tone="warn">코드 없음</Pill>}
        {!initial.show ? <Pill tone="muted">명단 숨김</Pill> : null}
        {initial.is_sample ? <Pill tone="muted">샘플</Pill> : null}
        {isMe ? <span className="text-xs text-muted">(나)</span> : null}
      </div>
      <p className="text-sm text-muted">{[initial.team, initial.role_label, initial.cohort].filter(Boolean).join(" · ") || "팀·역할 없음"}</p>
      {code ? (
        <div role="status" className="rounded-lg border-2 border-sea bg-sea-soft p-3 text-center">
          <p className="text-xs text-sea">새 개인 코드 — 지금 한 번만 보여요. 본인에게만 전해 주세요.</p>
          <p className="mt-1 select-all font-mono text-2xl font-bold tracking-widest">{`${code.slice(0, 4)}-${code.slice(4)}`}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={btnSmall} onClick={() => setOpen((o) => !o)}>
          {open ? "닫기" : "고치기"}
        </button>
        <button type="button" className={btnSmall} disabled={pending} onClick={issue}>
          {initial.has_code ? "코드 재발급" : "코드 발급"}
        </button>
        {initial.has_code && !isMe ? (
          <button type="button" className={btnSmall} disabled={pending} onClick={revoke}>
            코드 회수
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          <Fields v={v} set={set} />
          <button type="button" className={btnSecondary} disabled={pending} onClick={save}>
            저장
          </button>
        </div>
      ) : null}
      <Notice result={result?.ok && code ? null : result} />
    </li>
  );
}

const EMPTY: ContributorValues = { display_name: "", team: "", role_label: "", cohort: "", show: true, role: "member" };

export function ContributorAdd() {
  const router = useRouter();
  const [v, setV] = useState(EMPTY);
  const [result, setResult] = useState<Result>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createContributor(v);
          setResult(r);
          if (r.ok) {
            setV(EMPTY);
            router.refresh();
          }
        });
      }}
    >
      <Fields v={v} set={(p) => setV((x) => ({ ...x, ...p }))} />
      <Notice result={result} />
      <button type="submit" className={btnPrimary} disabled={pending}>
        {pending ? "추가 중…" : "기여자 추가"}
      </button>
    </form>
  );
}
