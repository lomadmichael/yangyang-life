import { Badge } from "@/components/Badge";
import { ReportButton } from "@/components/ReportButton";
import { TipForm } from "@/components/TipForm";
import { t, type DictKey, type Lang } from "@/i18n";
import { formatVerifiedDate } from "@/lib/format";
import { listTips } from "@/lib/queries";
import type { PublicTip } from "@/lib/types";

const KIND: Record<PublicTip["kind"], { key: DictKey; tone: "partner" | "info" | "open" }> = {
  changed: { key: "tipKindChanged", tone: "partner" },
  tip: { key: "tipKindTip", tone: "info" },
  directions: { key: "tipKindDirections", tone: "open" },
};

/**
 * 상세 화면 맨 아래 팁 영역 — 쓰기 버튼(폼) + 목록.
 * 팁 본문은 기계 번역하지 않는다. 화면 언어와 다르게 쓰인 글엔 「원문 영어 / Original in Korean」만 붙인다.
 */
export async function TipList({
  lang,
  targetType,
  targetId,
}: {
  lang: Lang;
  targetType: PublicTip["target_type"];
  targetId: string;
}) {
  const tips = await listTips(targetType, targetId);

  return (
    <section id="tips" data-slot="tips" className="flex flex-col gap-4 border-t border-line pt-5">
      <h2 className="font-bold">{t(lang, "tipsTitle")}</h2>
      <TipForm lang={lang} targetType={targetType} targetId={targetId} />

      {tips.length === 0 ? (
        <p className="text-sm text-muted">{t(lang, "tipsEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="tip-list">
          {tips.map((tip) => {
            const kind = KIND[tip.kind];
            return (
              <li key={tip.id} data-tip-id={tip.id} className="rounded-2xl border border-line bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <Badge tone={kind.tone}>{t(lang, kind.key)}</Badge>
                  {tip.handled && tip.kind === "changed" ? <Badge tone="muted">{t(lang, "tipHandled")}</Badge> : null}
                  <span className="font-medium">{tip.nickname?.trim() || t(lang, "tipAnonymous")}</span>
                  <time dateTime={tip.created_at} className="text-muted">
                    {formatVerifiedDate(tip.created_at, lang)}
                  </time>
                  <span className="ml-auto">
                    <ReportButton tipId={tip.id} lang={lang} />
                  </span>
                </div>
                <p lang={tip.lang} className="mt-1 whitespace-pre-line">
                  {tip.body}
                </p>
                {tip.lang !== lang ? (
                  <p className="mt-1 text-xs text-muted">{t(lang, "tipOriginalOther")}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
