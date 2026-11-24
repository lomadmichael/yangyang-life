import Link from "next/link";
import { pickText, t, tf, type Lang } from "@/i18n";
import { formatDateRange, formatWeekdays, seasonLabel } from "@/lib/format";
import { PLAY_CATEGORY_KEY } from "@/lib/labels";
import type { Activity } from "@/lib/types";
import { Badge } from "./Badge";
import { FALLBACK_VISUAL, PLAY_VISUAL } from "./category-visual";
import { FallbackNote } from "./FallbackNote";
import { PhotoCard } from "./PhotoCard";
import { SaveButton } from "./SaveButton";

/**
 * 놀거리 목록 한 칸 — 배지·제목·언제(+운영 계절)·어디서.
 * PC 격자(lg 이상이면서 카드 폭 36rem 미만 — 넓게 펼친 카드는 모바일 모양 그대로)에서는 위에 분류 대표 사진 칸(없으면 아이콘 바탕)을 두고 분류·제목을 겹쳐 쓴다(놀거리는 아직 자체 사진 칸이 없다).
 * ★ 저장 버튼은 링크 밖(오른쪽 위)에 둔다 — 링크 안에 버튼을 넣을 수 없다.
 * dimmed: 「지금은 비시즌」 묶음에서 흐리게. 알림(토스트)까지 흐려지지 않게 링크에만 건다.
 */
export function ActivityCard({ activity, lang, dimmed = false }: { activity: Activity; lang: Lang; dimmed?: boolean }) {
  const row = activity as unknown as Record<string, unknown>;
  const title = pickText(row, "title", lang);
  const location = pickText(row, "location", lang);
  const timeNote = pickText(row, "time_note", lang);
  const when =
    activity.kind === "dated"
      ? formatDateRange(activity.starts_on, activity.ends_on, lang)
      : formatWeekdays(activity.weekdays, lang);
  // 0003 적용 전 DB 에는 season_months 칸이 없을 수 있다
  const season = seasonLabel(activity.season_months ?? [], lang);
  const visual = PLAY_VISUAL[activity.category] ?? FALLBACK_VISUAL;
  const categoryKey = PLAY_CATEGORY_KEY[activity.category];
  const titleNode = (
    <>
      {title.text}
      <FallbackNote lang={lang} show={title.fallback} />
    </>
  );

  return (
    <div className="@container relative h-full overflow-hidden rounded-2xl border border-line bg-surface">
      <Link
        href={`/${lang}/activity/${activity.id}`}
        className={`flex h-full flex-col rounded-2xl active:bg-sea-soft ${dimmed ? "opacity-60" : ""}`}
      >
        <div className="hidden lg:block @xl:hidden">
          <PhotoCard
            fallback={visual.photo}
            Icon={visual.Icon}
            tone={visual.tone}
            eyebrow={categoryKey ? t(lang, categoryKey) : undefined}
            title={titleNode}
            className="aspect-video"
          />
        </div>
        <div className="flex-1 p-4 pr-14 lg:pr-4 @xl:pr-14">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={activity.kind === "dated" ? "partner" : "open"}>
              {t(lang, activity.kind === "dated" ? "kindDated" : "kindAlways")}
            </Badge>
            {activity.rainy_ok ? <Badge tone="info">{t(lang, "rainyOk")}</Badge> : null}
          </div>
          <h3 className="mt-2 text-lg font-bold leading-snug lg:hidden @xl:block">{titleNode}</h3>
          <p className="mt-1 text-sm text-muted lg:mt-2 lg:text-base lg:text-ink">
            {[when, timeNote.text].filter(Boolean).join(" · ")}
            <FallbackNote lang={lang} show={timeNote.fallback && timeNote.text !== ""} />
          </p>
          {season ? <p className="text-sm text-muted">{tf(lang, "seasonLine", { months: season })}</p> : null}
          {location.text ? (
            <p className="text-sm text-muted">
              {location.text}
              <FallbackNote lang={lang} show={location.fallback} />
            </p>
          ) : null}
        </div>
      </Link>
      <div className="absolute right-1.5 top-1.5 rounded-full bg-surface/90">
        <SaveButton kind="activity" id={activity.id} lang={lang} />
      </div>
    </div>
  );
}
