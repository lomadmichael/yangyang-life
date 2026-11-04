import Link from "next/link";
import { pickText, t, type Lang } from "@/i18n";
import { photoUrl } from "@/lib/format";
import { CATEGORY_KEY, PLAY_CATEGORY_KEY } from "@/lib/labels";
import { stopView, type ResolvedStop } from "@/lib/story-blocks";
import { Badge } from "./Badge";
import { FallbackNote } from "./FallbackNote";
import { IconPin, IconWave } from "./icons";
import { SafeImage } from "./SafeImage";
import { SaveButton } from "./SaveButton";

/**
 * 이야기 속 「들른 곳」 카드 한 장. 이름·분류·영업 여부는 늘 지금의 장소·놀거리 값으로 그린다(R20).
 * - ok: 이름·분류·영업 배지 + ★
 * - closed: 흐리게 + 「지금은 휴업 중이에요」, 링크·★ 는 그대로
 * - missing: 링크 없는 회색 카드 「더 이상 안내하지 않는 곳이에요」
 * 흐림(opacity)은 번호·링크에만 건다 — ★ 의 알림까지 흐려지지 않게.
 * 서버 전용 모듈을 쓰지 않아 관리 미리보기(클라이언트)에서도 그릴 수 있다.
 */
export function StopCard({
  stop,
  lang,
  numbered,
  now = new Date(),
}: {
  stop: ResolvedStop;
  lang: Lang;
  numbered: boolean;
  /** 영업 중 판정 시각 (기본: 지금) */
  now?: Date;
}) {
  const view = stopView(stop, now);
  const b = stop.block;
  const time = pickText({ x_ko: b.time_ko, x_en: b.time_en }, "x", lang);
  const note = pickText({ x_ko: b.note_ko, x_en: b.note_en }, "x", lang);
  const dim = stop.state === "closed" ? "opacity-60" : "";

  const number = numbered ? (
    <span
      className={`mt-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        stop.state === "missing" ? "bg-line text-muted" : `bg-sea text-on-sea ${dim}`
      }`}
    >
      {stop.n}
    </span>
  ) : null;

  const timeLine = time.text ? (
    <p className="text-xs font-medium text-sea">
      {time.text}
      <FallbackNote lang={lang} show={time.fallback} />
    </p>
  ) : null;

  if (stop.state === "missing" || !view.href || !view.kind || !view.id) {
    return (
      <div className="flex items-start gap-3">
        {number}
        <div className="min-w-0 flex-1 rounded-2xl border border-dashed border-line bg-sand px-4 py-3 text-muted">
          {timeLine}
          <p className="text-sm">{t(lang, "stopMissingNote")}</p>
        </div>
      </div>
    );
  }

  const { place, activity } = stop;
  const row = (place ?? activity) as unknown as Record<string, unknown>;
  const name = pickText(row, place ? "name" : "title", lang);
  const nameKo = place ? place.name_ko : (activity?.title_ko ?? "");
  const categoryKey = place ? CATEGORY_KEY[place.category] : activity ? PLAY_CATEGORY_KEY[activity.category] : undefined;
  // 사진은 동의한 참여 가게만 (장소 상세와 같은 기준)
  const photo = place?.status === "participating" ? place.photos?.[0] : undefined;
  const Icon = place ? IconPin : IconWave;

  return (
    <div className="flex items-start gap-3">
      {number}
      <div className="relative min-w-0 flex-1 rounded-2xl border border-line bg-surface">
        <Link href={`/${lang}${view.href}`} className={`flex gap-3 rounded-2xl p-3 pr-12 active:bg-sea-soft ${dim}`}>
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-sea-soft text-sea">
            <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <Icon className="h-6 w-6" />
            </span>
            {photo ? <SafeImage src={photoUrl(photo)} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            {timeLine}
            <span className="font-bold leading-snug">
              {name.text}
              <FallbackNote lang={lang} show={name.fallback} />
            </span>
            {lang === "en" && !name.fallback && nameKo ? <span className="text-sm text-muted">{nameKo}</span> : null}
            {categoryKey ? <span className="text-sm text-muted">{t(lang, categoryKey)}</span> : null}
            {view.notice ? <span className="text-sm font-medium text-ink">{t(lang, view.notice)}</span> : null}
            {note.text ? (
              <span className="text-sm text-ink">
                {note.text}
                <FallbackNote lang={lang} show={note.fallback} />
              </span>
            ) : null}
            {view.badge || activity?.rainy_ok ? (
              <span className="mt-1 flex flex-wrap gap-1.5">
                {view.badge === "closed" ? <Badge tone="closed">{t(lang, "statusClosed")}</Badge> : null}
                {view.badge === "open" ? <Badge tone="open">{t(lang, "openNow")}</Badge> : null}
                {view.badge === "closedNow" ? <Badge tone="muted">{t(lang, "closedNow")}</Badge> : null}
                {activity?.rainy_ok ? <Badge tone="info">{t(lang, "rainyOk")}</Badge> : null}
              </span>
            ) : null}
          </span>
        </Link>
        <div className="absolute right-0.5 top-0.5">
          <SaveButton kind={view.kind} id={view.id} lang={lang} />
        </div>
      </div>
    </div>
  );
}
