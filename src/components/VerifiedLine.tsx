import { t, tf, type DictKey, type Lang } from "@/i18n";
import { formatVerifiedDate } from "@/lib/format";
import type { VerifiedMethod } from "@/lib/types";

const METHOD_KEY: Record<VerifiedMethod, DictKey> = {
  visit: "methodVisit",
  phone: "methodPhone",
  interview: "methodInterview",
  public: "methodPublic",
};

/**
 * 「정리·확인: {by} · {YYYY. M. D.}」 / "Checked by {by} · {Mon D, YYYY}" + 확인 방법.
 * 확인자나 확인일이 없으면 아무것도 그리지 않는다.
 */
export function VerifiedLine({
  method,
  at,
  by,
  lang,
}: {
  method: VerifiedMethod;
  at: string | null;
  by: string | null;
  lang: Lang;
}) {
  const date = formatVerifiedDate(at, lang);
  const name = by?.trim();
  if (!name || !date) return null;
  return (
    <p className="text-sm text-muted">
      <span>{tf(lang, "verifiedLine", { by: name, date })}</span>
      <span className="mt-0.5 block text-xs">{t(lang, METHOD_KEY[method] ?? "methodPublic")}</span>
    </p>
  );
}
