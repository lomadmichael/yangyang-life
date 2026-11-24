import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { Badge } from "@/components/Badge";
import { FallbackNote } from "@/components/FallbackNote";
import { FALLBACK_VISUAL, PLAY_VISUAL } from "@/components/category-visual";
import { InfoRow } from "@/components/InfoRow";
import { MapLinks } from "@/components/MapLinks";
import { PhotoFrame } from "@/components/PhotoCard";
import { SaveButton } from "@/components/SaveButton";
import { TipList } from "@/components/TipList";
import { VerifiedLine } from "@/components/VerifiedLine";
import { isLang, pickText, t, tf } from "@/i18n";
import { formatDateRange, formatWeekdays, seasonLabel } from "@/lib/format";
import { listActivities, listPlaces } from "@/lib/queries";

export default async function ActivityPage({ params }: PageProps<"/[lang]/activity/[id]">) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  await connection();

  const activity = (await listActivities()).find((a) => a.id === id);
  if (!activity) notFound();
  const place = activity.place_id ? ((await listPlaces()).find((p) => p.id === activity.place_id) ?? null) : null;

  const row = activity as unknown as Record<string, unknown>;
  const title = pickText(row, "title", lang);
  const desc = pickText(row, "desc", lang);
  const location = pickText(row, "location", lang);
  const timeNote = pickText(row, "time_note", lang);
  const when =
    activity.kind === "dated"
      ? formatDateRange(activity.starts_on, activity.ends_on, lang)
      : formatWeekdays(activity.weekdays, lang);
  // 0003 적용 전 DB 에는 season_months 칸이 없을 수 있다. 비면(사계절) 줄을 그리지 않는다
  const season = seasonLabel(activity.season_months ?? [], lang);
  const placeName = place ? pickText(place as unknown as Record<string, unknown>, "name", lang) : null;

  // 놀거리는 자체 사진 칸이 없다 — 분류 대표 사진(이 행사의 사진이 아님 → 구석 표시)
  const visual = PLAY_VISUAL[activity.category] ?? FALLBACK_VISUAL;

  return (
    <article className="flex flex-col gap-5 px-4 pb-10 lg:gap-8 lg:px-8 lg:pb-16 lg:pt-6">
      <div className="flex items-center justify-between gap-3">
        <BackLink href={`/${lang}/play`} label={t(lang, "playTitle")} />
        <SaveButton kind="activity" id={activity.id} lang={lang} size="md" />
      </div>

      {visual.photo ? (
        <PhotoFrame
          fallback={visual.photo}
          fallbackLabel={t(lang, "categoryPhotoLabel")}
          alt=""
          Icon={visual.Icon}
          tone={visual.tone}
          sizes="(min-width: 1024px) 1152px, 100vw"
          className="aspect-video rounded-2xl lg:aspect-[5/2]"
        />
      ) : null}

      {/* 모바일은 한 줄로 차례대로, PC(lg)는 왼쪽 2칸 본문 + 오른쪽 1칸 이용 정보 카드. 글 순서(DOM)는 모바일 순서 그대로 */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-10 lg:gap-y-8">
        <header className="flex flex-col gap-2 lg:col-span-2 lg:gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={activity.kind === "dated" ? "partner" : "open"}>
              {t(lang, activity.kind === "dated" ? "kindDated" : "kindAlways")}
            </Badge>
            {activity.rainy_ok ? <Badge tone="info">{t(lang, "rainyOk")}</Badge> : null}
          </div>
          <h1 className="text-2xl font-bold leading-snug lg:text-4xl">
            {title.text}
            <FallbackNote lang={lang} show={title.fallback} />
          </h1>
          {desc.text ? (
            <p className="lg:text-lg">
              {desc.text}
              <FallbackNote lang={lang} show={desc.fallback} />
            </p>
          ) : null}
          {season ? <p className="text-sm font-medium text-ink lg:text-base">{tf(lang, "seasonLine", { months: season })}</p> : null}
        </header>

        <aside
          aria-label={t(lang, "detailInfoTitle")}
          className="flex flex-col gap-5 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-6"
        >
          <h2 className="hidden text-lg font-bold lg:block">{t(lang, "detailInfoTitle")}</h2>

          <dl className="rounded-2xl border border-line bg-surface px-4 empty:hidden lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-0">
            {when || timeNote.text ? (
              <InfoRow label={t(lang, "when")}>
                {[when, timeNote.text].filter(Boolean).join(" · ")}
                <FallbackNote lang={lang} show={timeNote.fallback && timeNote.text !== ""} />
              </InfoRow>
            ) : null}
            {location.text ? (
              <InfoRow label={t(lang, "where")}>
                {location.text}
                <FallbackNote lang={lang} show={location.fallback} />
              </InfoRow>
            ) : null}
          </dl>

          {place && placeName ? (
            <section className="flex flex-col gap-3">
              <Link
                href={`/${lang}/place/${place.slug}`}
                className="inline-flex min-h-11 items-center text-sea underline underline-offset-4"
              >
                {placeName.text}
                <FallbackNote lang={lang} show={placeName.fallback} />
              </Link>
              <MapLinks lat={place.lat} lng={place.lng} name={place.name_ko} lang={lang} />
            </section>
          ) : null}

          {activity.link ? (
            <a
              href={activity.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center rounded-xl bg-sea px-4 font-bold text-on-sea"
            >
              {t(lang, "moreLink")}
            </a>
          ) : null}

          <VerifiedLine
            method={activity.verified_method}
            at={activity.verified_at}
            by={activity.verified_by_name}
            lang={lang}
          />
        </aside>

        {/* 팁: 목록 + 쓰기 폼 (<section id="tips">) */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <TipList lang={lang} targetType="activity" targetId={activity.id} />
        </div>
      </div>
    </article>
  );
}
