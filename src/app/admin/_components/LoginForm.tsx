"use client";

import { useActionState } from "react";
import { login } from "../actions";
import { Notice, btnPrimary, inputCls } from "./ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">개인 코드</span>
        <input
          name="code"
          required
          autoComplete="one-time-code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          maxLength={12}
          placeholder="ABCD-EFGH"
          className={`${inputCls} text-center font-mono text-lg tracking-widest uppercase`}
        />
      </label>
      <Notice result={state} />
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "확인 중…" : "들어가기"}
      </button>
    </form>
  );
}
