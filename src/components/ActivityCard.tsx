import Link from "next/link";
import { pickText, t, type Lang } from "@/i18n";
import { formatDateRange, formatWeekdays } from "@/lib/format";
import type { Activity } from "@/lib/types";
import { Badge } from "./Badge";
import { FallbackNote } from "./FallbackNote";

/** 「오늘 뭐하지」 목록 한 칸 — 제목·언제·어디서 */
export function ActivityCard({ activity, lang }: { activity: Activity; lang: Lang }) {
  const row = activity as unknown as Record<string, unknown>;
  const title = pickText(row, "title", lang);
  const location = pickText(row, "location", lang);
  const timeNote = pickText(row, "time_note", lang);
  const when =
    activity.kind === "dated"
      ? formatDateRange(activity.starts_on, activity.ends_on, lang)
      : formatWeekdays(activity.weekdays, lang);

  return (
    <Link
      href={`/${lang}/activity/${activity.id}`}
      className="block rounded-2xl border border-line bg-surface p-4 active:bg-sea-soft"
    >
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={activity.kind === "dated" ? "partner" : "open"}>
          {t(lang, activity.kind === "dated" ? "kindDated" : "kindAlways")}
        </Badge>
        {activity.rainy_ok ? <Badge tone="info">{t(lang, "rainyOk")}</Badge> : null}
      </div>
      <h3 className="mt-2 text-lg font-bold leading-snug">
        {title.text}
        <FallbackNote lang={lang} show={title.fallback} />
      </h3>
      <p className="mt-1 text-sm text-muted">
        {[when, timeNote.text].filter(Boolean).join(" · ")}
        <FallbackNote lang={lang} show={timeNote.fallback && timeNote.text !== ""} />
      </p>
      {location.text ? (
        <p className="text-sm text-muted">
          {location.text}
          <FallbackNote lang={lang} show={location.fallback} />
        </p>
      ) : null}
    </Link>
  );
}
