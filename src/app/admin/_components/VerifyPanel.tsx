"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { METHOD_KO, VERIFIED_METHODS } from "@/lib/admin-input";
import type { VerifiedMethod } from "@/lib/types";
import { verifyActivity, verifyPlace } from "../actions";
import { Notice, btnPrimary, inputCls } from "./ui";

/** 「확인 완료」: verified_at = 지금, verified_by = 나, verified_method = 고른 방법 */
export function VerifyPanel({
  kind,
  id,
  current,
}: {
  kind: "place" | "activity";
  id: string;
  current: VerifiedMethod;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<VerifiedMethod>(current === "public" ? "visit" : current);
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, start] = useTransition();

  function verify() {
    start(async () => {
      const r = kind === "place" ? await verifyPlace(id, method) : await verifyActivity(id, method);
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">어떻게 확인했나요?</span>
        <select value={method} onChange={(e) => setMethod(e.target.value as VerifiedMethod)} className={inputCls}>
          {VERIFIED_METHODS.map((m) => (
            <option key={m} value={m}>
              {METHOD_KO[m]}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={verify} disabled={pending} className={btnPrimary}>
        {pending ? "기록 중…" : "확인 완료 (오늘 · 내 이름으로)"}
      </button>
      <Notice result={result} />
    </div>
  );
}
