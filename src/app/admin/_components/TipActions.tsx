"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setTipHandled, setTipHidden } from "../actions";
import { btnSmall } from "./ui";

/** 「처리 완료」는 누구나, 숨김/해제는 owner 만(버튼도 owner 에게만 — 서버도 다시 검사) */
export function TipActions({ id, handled, hidden, canHide }: { id: string; handled: boolean; hidden: boolean; canHide: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? null : r);
      if (r.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" disabled={pending} className={btnSmall} onClick={() => run(() => setTipHandled(id, !handled))}>
          {handled ? "처리 전으로" : "처리 완료"}
        </button>
        {canHide ? (
          <button type="button" disabled={pending} className={btnSmall} onClick={() => run(() => setTipHidden(id, !hidden))}>
            {hidden ? "숨김 해제" : "숨기기"}
          </button>
        ) : null}
      </div>
      {msg && !msg.ok ? (
        <p role="alert" className="text-xs text-salmon-strong">
          {msg.message}
        </p>
      ) : null}
    </div>
  );
}
