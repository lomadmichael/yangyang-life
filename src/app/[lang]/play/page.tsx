import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ActivityCard } from "@/components/ActivityCard";
import { BackLink } from "@/components/BackLink";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips } from "@/components/FilterChips";
import { isLang, t, tf } from "@/i18n";
import { formatToday } from "@/lib/format";
import { listActivities } from "@/lib/queries";
import { activitiesForDay } from "@/lib/today";

export default async function DoPage({ params, searchParams }: PageProps<"/[lang]/play">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  await connection(); // 「오늘」은 요청 시각 기준

  const sp = await searchParams;
  const rainy = (Array.isArray(sp.rain) ? sp.rain[0] : sp.rain) === "1";
  const now = new Date();
  const list = activitiesForDay(await listActivities(), now, { rainy });
  const dated = list.filter((a) => a.kind === "dated");
  const always = list.filter((a) => a.kind === "always");
  const base = `/${lang}/play`;

  return (
    <div className="flex flex-col gap-4 px-4 pb-10">
      <BackLink href={`/${lang}`} label={t(lang, "backHome")} />
      <div>
        <h1 className="text-2xl font-bold">{t(lang, "doTitle")}</h1>
        <p className="text-sm text-muted">{tf(lang, "doToday", { date: formatToday(now, lang) })}</p>
      </div>
      <FilterChips
        label={t(lang, "filterLabel")}
        chips={[{ label: t(lang, "rainyToggle"), href: rainy ? base : `${base}?rain=1`, active: rainy }]}
      />
      {list.length === 0 ? (
        rainy ? (
          <EmptyState
            title={t(lang, "emptyRainyTitle")}
            body={t(lang, "emptyRainyBody")}
            action={{ href: base, label: t(lang, "filterReset") }}
          />
        ) : (
          <EmptyState
            title={t(lang, "emptyActivitiesTitle")}
            body={t(lang, "emptyActivitiesBody")}
            action={{ href: `/${lang}/places`, label: t(lang, "homeWhereToEat") }}
          />
        )
      ) : (
        <>
          {dated.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-bold text-muted">{t(lang, "kindDated")}</h2>
              <ul className="flex flex-col gap-3">
                {dated.map((a) => (
                  <li key={a.id}>
                    <ActivityCard activity={a} lang={lang} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {always.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-bold text-muted">{t(lang, "kindAlways")}</h2>
              <ul className="flex flex-col gap-3">
                {always.map((a) => (
                  <li key={a.id}>
                    <ActivityCard activity={a} lang={lang} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
