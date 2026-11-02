"use client";

import { useRef, useState, useTransition } from "react";
import { submitTip } from "@/app/[lang]/tips/actions";
import { t, type DictKey, type Lang } from "@/i18n";
import { BODY_MAX, CONTACT_MAX, NICKNAME_MAX, TIP_KINDS, type TipKind } from "@/lib/tips";

const KIND_KEY: Record<TipKind, DictKey> = {
  changed: "tipKindChanged",
  tip: "tipKindTip",
  directions: "tipKindDirections",
};

/**
 * 「팁 남기기」·「정보가 바뀌었나요?」 두 버튼이 같은 폼을 연다.
 * 바뀌었나요? 는 종류를 changed 로 맞추고 비공개 연락처 칸을 보여준다.
 */
export function TipForm({
  lang,
  targetType,
  targetId,
}: {
  lang: Lang;
  targetType: "place" | "activity";
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<TipKind>("tip");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function openWith(k: TipKind) {
    setKind(k);
    setOpen(true);
    setResult(null);
  }

  const field = "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base text-ink";

  return (
    <div className="flex flex-col gap-3">
      {!open ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openWith("tip")}
            className="inline-flex min-h-11 items-center rounded-full bg-sea px-4 text-sm font-medium text-on-sea"
          >
            {t(lang, "tipWrite")}
          </button>
          <button
            type="button"
            onClick={() => openWith("changed")}
            className="inline-flex min-h-11 items-center rounded-full border border-sea bg-surface px-4 text-sm font-medium text-sea"
          >
            {t(lang, "tipChangedButton")}
          </button>
        </div>
      ) : null}

      {result?.ok ? (
        <p role="status" className="rounded-xl bg-pine-soft px-3 py-2 text-sm text-pine">
          {result.message}
        </p>
      ) : null}

      {open ? (
        <form
          ref={formRef}
          data-testid="tip-form"
          className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4"
          // form action= 는 React 19 가 끝나면 칸을 비워 버린다 → 거절됐을 때 쓴 글이 날아가지 않게 onSubmit
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await submitTip(fd);
              setResult(res);
              if (res.ok) {
                formRef.current?.reset();
                setOpen(false);
              }
            });
          }}
        >
          <h3 className="font-bold">{t(lang, kind === "changed" ? "tipFormChangedTitle" : "tipFormTitle")}</h3>
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{t(lang, "tipKindLabel")}</legend>
            <div className="flex flex-wrap gap-2">
              {TIP_KINDS.map((k) => (
                <label
                  key={k}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-sm has-[:checked]:border-sea has-[:checked]:bg-sea-soft has-[:checked]:text-sea"
                >
                  <input
                    type="radio"
                    name="kind"
                    value={k}
                    checked={kind === k}
                    onChange={() => setKind(k)}
                    className="accent-sea"
                  />
                  {t(lang, KIND_KEY[k])}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t(lang, "tipNickname")}</span>
            <input name="nickname" required maxLength={NICKNAME_MAX} autoComplete="nickname" className={field} />
            <span className="text-xs text-muted">{t(lang, "tipNicknameHint")}</span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t(lang, "tipBody")}</span>
            <textarea name="body" required minLength={2} maxLength={BODY_MAX} rows={4} className={field} />
            <span className="text-xs text-muted">{t(lang, "tipBodyHint")}</span>
          </label>

          {kind === "changed" ? (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t(lang, "tipContact")}</span>
              <input name="contact" maxLength={CONTACT_MAX} autoComplete="off" className={field} />
              <span className="text-xs text-muted">{t(lang, "tipContactNote")}</span>
            </label>
          ) : null}

          {result && !result.ok ? (
            <p role="alert" className="rounded-xl bg-salmon-soft px-3 py-2 text-sm text-salmon-strong">
              {result.message}
            </p>
          ) : null}

          <p className="text-xs text-muted">{t(lang, "tipPublicNote")}</p>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-sea px-4 font-bold text-on-sea disabled:opacity-60"
            >
              {t(lang, pending ? "tipSubmitting" : "tipSubmit")}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setResult(null);
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line px-4 text-muted"
            >
              {t(lang, "tipCancel")}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
