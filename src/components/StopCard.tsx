import Link from "next/link";
import { pickText, t, type Lang } from "@/i18n";
import { photoUrl } from "@/lib/format";
import { CATEGORY_KEY, PLAY_CATEGORY_KEY } from "@/lib/labels";
import { placeFallbackPhoto, placeOwnPhoto } from "@/lib/place-photos";
import { stopView, type ResolvedStop } from "@/lib/story-blocks";
import type { PlaceCategory, PlayCategory } from "@/lib/types";
import { Badge } from "./Badge";
import { FallbackNote } from "./FallbackNote";
import { SafeImage } from "./SafeImage";
import { SaveButton } from "./SaveButton";

/** 사진이 없는 들른 곳의 색면 (분류색 토큰 — magazine CSS 의 .cat-* · .play-* 와 같은 짝) */
const PLACE_BG: Record<PlaceCategory, string> = {
  food: "bg-c-food",
  cafe: "bg-c-cafe",
  stay: "bg-c-stay",
  surf: "bg-c-surf",
  bar: "bg-c-bar",
  spot: "bg-c-spot",
  life: "bg-c-life",
};
const PLAY_BG: Record<PlayCategory, string> = {
  surf: "bg-c-surf",
  fishing: "bg-c-surf",
  festival: "bg-c-food",
  eco: "bg-c-spot",
  hike: "bg-c-spot",
  walk: "bg-c-spot",
  yoga: "bg-c-cafe",
  village: "bg-c-stay",
};

/**
 * 이야기 속 「들른 곳」 한 장 — 번호 붙은 입장권(왼쪽 번호 칸 · 점선 절취선 · 사진 또는 분류색 색면 · 이름 · 분류 · 영업 여부 · ★).
 * 이름·분류·영업 여부는 늘 지금의 장소·놀거리 값으로 그린다(R20).
 * - ok: 이름·분류·영업 배지 + ★
 * - closed: 흐리게 + 「지금은 휴업 중이에요」, 링크·★ 는 그대로
 * - missing: 링크 없는 점선 카드 「더 이상 안내하지 않는 곳이에요」
 * 사진: 장소 자체 사진(보여 줄 수 있는 곳만) → 해변·명소는 분류 대표 사진 → 가게·놀거리는 색면 (규칙 lib/place-photos.ts).
 * 흐림(opacity)은 번호·링크에만 건다 — ★ 의 알림까지 흐려지지 않게.
 * Tailwind 토큰 클래스만 쓴다(magazine CSS 가 없는 관리 미리보기에서도 그대로 보이게). 서버 전용 모듈을 쓰지 않는다.
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

  // 번호 칸(코스·사람) — 가이드는 번호 없이
  const number = numbered ? (
    <span
      className={`flex w-11 shrink-0 items-center justify-center border-r border-dashed border-rule font-display text-3xl italic leading-none lg:w-20 lg:text-5xl ${
        stop.state === "missing" ? "text-ink-2" : `text-deep ${dim}`
      }`}
    >
      {String(stop.n).padStart(2, "0")}
    </span>
  ) : null;

  const timeLine = time.text ? (
    <span className="block pr-8 text-sm font-semibold tracking-wide text-sunrise-ink lg:pr-0">
      {time.text}
      <FallbackNote lang={lang} show={time.fallback} />
    </span>
  ) : null;

  if (stop.state === "missing" || !view.href || !view.kind || !view.id) {
    return (
      <div className="flex border border-dashed border-rule bg-paper text-ink-2">
        {number}
        <div className="min-w-0 flex-1 px-4 py-4">
          {timeLine}
          <p className="text-base">{t(lang, "stopMissingNote")}</p>
        </div>
      </div>
    );
  }

  const { place, activity } = stop;
  const row = (place ?? activity) as unknown as Record<string, unknown>;
  const name = pickText(row, place ? "name" : "title", lang);
  const nameKo = place ? place.name_ko : (activity?.title_ko ?? "");
  const categoryKey = place ? CATEGORY_KEY[place.category] : activity ? PLAY_CATEGORY_KEY[activity.category] : undefined;
  const photo = place ? (placeOwnPhoto(place) ?? null) : null;
  const fallback = place ? placeFallbackPhoto(place.category) : null;
  const bg = place ? PLACE_BG[place.category] : activity ? PLAY_BG[activity.category] : undefined;

  return (
    <div className="relative flex border border-ink bg-paper-card">
      <Link href={`/${lang}${view.href}`} className={`flex min-w-0 flex-1 hover:bg-paper-2 ${dim}`}>
        {number}
        <span className={`relative m-3 size-14 shrink-0 overflow-hidden lg:size-24 ${bg ?? "bg-deep"}`}>
          <span className="absolute inset-0 flex items-center justify-center font-serif text-3xl text-on-deep lg:text-4xl" aria-hidden="true">
            {name.text.replace(/^양양\s*/, "").charAt(0)}
          </span>
          {photo || fallback ? (
            <SafeImage
              src={photo ? photoUrl(photo) : (fallback as string)}
              alt=""
              fallbackSrc={photo ? fallback : null}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
        </span>
        <span className="flex min-w-0 flex-col justify-center gap-0.5 py-3 pr-3 lg:pr-12">
          {timeLine}
          <span className="pr-8 font-serif text-xl font-semibold leading-snug tracking-tight lg:pr-0">
            {name.text}
            <FallbackNote lang={lang} show={name.fallback} />
          </span>
          {lang === "en" && !name.fallback && nameKo ? <span className="text-sm text-ink-2">{nameKo}</span> : null}
          {categoryKey ? <span className="text-sm font-semibold tracking-wide text-deep-2">{t(lang, categoryKey)}</span> : null}
          {view.notice ? <span className="text-sm font-medium text-ink">{t(lang, view.notice)}</span> : null}
          {note.text ? (
            <span className="mt-1 text-base text-ink">
              {note.text}
              <FallbackNote lang={lang} show={note.fallback} />
            </span>
          ) : null}
          {view.badge || activity?.rainy_ok ? (
            <span className="mt-1.5 flex flex-wrap gap-1.5">
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
  );
}
