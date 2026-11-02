"use client";

import { useState, useTransition } from "react";
import { deleteActivity, deletePlace } from "../actions";
import { btnDanger } from "./ui";

/** owner 전용 삭제. 서버 액션도 delete_content 권한을 다시 검사한다 */
export function DeleteButton({ kind, id, name }: { kind: "place" | "activity"; id: string; name: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function run() {
    const what = kind === "place" ? "가게(메뉴·사진·팁 포함)" : "할 거리(팁 포함)";
    if (!window.confirm(`「${name}」 ${what}를 지울까요? 되돌릴 수 없어요.`)) return;
    start(async () => {
      const r = kind === "place" ? await deletePlace(id) : await deleteActivity(id);
      if (r && !r.ok) setErr(r.message);
    });
  }
  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={run} disabled={pending} className={btnDanger}>
        {pending ? "지우는 중…" : "지우기"}
      </button>
      {err ? (
        <p role="alert" className="text-sm text-salmon-strong">
          {err}
        </p>
      ) : null}
    </div>
  );
}
