import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { Badge } from "@/components/Badge";
import { FallbackNote } from "@/components/FallbackNote";
import { InfoRow } from "@/components/InfoRow";
import { MapLinks } from "@/components/MapLinks";
import { TipList } from "@/components/TipList";
import { VerifiedLine } from "@/components/VerifiedLine";
import { isLang, pickText, t } from "@/i18n";
import { formatDateRange, formatWeekdays } from "@/lib/format";
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
  const placeName = place ? pickText(place as unknown as Record<string, unknown>, "name", lang) : null;

  return (
    <article className="flex flex-col gap-5 px-4 pb-10">
      <BackLink href={`/${lang}/play`} label={t(lang, "doTitle")} />

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={activity.kind === "dated" ? "partner" : "open"}>
            {t(lang, activity.kind === "dated" ? "kindDated" : "kindAlways")}
          </Badge>
          {activity.rainy_ok ? <Badge tone="info">{t(lang, "rainyOk")}</Badge> : null}
        </div>
        <h1 className="text-2xl font-bold leading-snug">
          {title.text}
          <FallbackNote lang={lang} show={title.fallback} />
        </h1>
        {desc.text ? (
          <p>
            {desc.text}
            <FallbackNote lang={lang} show={desc.fallback} />
          </p>
        ) : null}
      </header>

      <dl className="rounded-2xl border border-line bg-surface px-4">
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

      {/* 팁: 목록 + 쓰기 폼 (<section id="tips">) */}
      <TipList lang={lang} targetType="activity" targetId={activity.id} />
    </article>
  );
}
