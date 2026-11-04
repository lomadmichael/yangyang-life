"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { StoryStatus } from "@/lib/types";
import { publishStory, returnStory, unpublishStory, verifyGuide } from "../actions";
import { Notice, btnDanger, btnPrimary, btnSecondary, btnSmall, inputCls } from "./ui";

const NOTE_MAX = 500;

/**
 * 검토 버튼 (F34) — 편집·운영 화면에만 그린다. 서버 액션이 publish_story 권한을 다시 검사한다.
 * 공개(sea) · 돌려보내기(메모 필수) · 공개 내리기 · 가이드 「오늘 확인」.
 */
export function StoryReviewPanel({
  id,
  status,
  isGuide,
  title,
  author,
}: {
  id: string;
  status: StoryStatus;
  isGuide: boolean;
  title: string;
  author: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState("");
  const [noteErr, setNoteErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) {
    setResult(null);
    start(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  }

  function sendBack() {
    const memo = note.trim();
    if (!memo) {
      setNoteErr("메모를 적어야 돌려보낼 수 있어요 — 글쓴이가 무엇을 고칠지 알 수 있게.");
      return;
    }
    setNoteErr(null);
    run(
      () => returnStory(id, memo),
      () => {
        setReturning(false);
        setNote("");
        setDone(true);
      },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Notice result={result} />
      {done ? (
        <Link href="/admin/review" className={btnSecondary}>
          검토 목록으로
        </Link>
      ) : null}

      {returning ? (
        <div className="flex flex-col gap-2 rounded-xl border border-salmon bg-surface p-3">
          <p className="font-bold">돌려보내기</p>
          <p className="text-sm text-muted">
            {title}
            {author ? ` · ${author}` : ""}
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">편집 메모 (필수)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={NOTE_MAX}
              className={`${inputCls} min-h-24`}
              placeholder="예: 대표 사진이 없어요, 카페 외관 한 장 부탁해요"
              aria-invalid={noteErr ? true : undefined}
            />
            <span className="text-xs text-muted">글쓴이 화면 맨 위에 보여요 · {note.trim().length}/{NOTE_MAX}</span>
          </label>
          {noteErr ? (
            <p role="alert" className="text-sm text-salmon-strong">
              {noteErr}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btnSecondary} disabled={pending} onClick={() => setReturning(false)}>
              취소
            </button>
            <button type="button" className={btnDanger} disabled={pending} onClick={sendBack}>
              {pending ? "보내는 중…" : "돌려보내기"}
            </button>
          </div>
        </div>
      ) : (
        <div className={`grid gap-2 ${status === "published" ? "grid-cols-1" : "grid-cols-2"}`}>
          {status === "published" ? (
            <button
              type="button"
              className={btnDanger}
              disabled={pending}
              onClick={() => {
                if (window.confirm("공개를 내릴까요? 방문객 화면에서 바로 사라지고 초안으로 돌아가요.")) run(() => unpublishStory(id));
              }}
            >
              공개 내리기
            </button>
          ) : (
            <>
              <button type="button" className={btnSecondary} disabled={pending} onClick={() => setReturning(true)}>
                돌려보내기
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={pending}
                onClick={() => {
                  if (window.confirm("공개할까요? 방문객 이야기 목록에 바로 보여요.")) run(() => publishStory(id));
                }}
              >
                {pending ? "처리 중…" : "공개"}
              </button>
            </>
          )}
        </div>
      )}

      {isGuide && status === "published" ? (
        <button type="button" className={btnSmall} disabled={pending} onClick={() => run(() => verifyGuide(id))}>
          가이드 내용을 오늘 다시 확인했어요
        </button>
      ) : null}
    </div>
  );
}
