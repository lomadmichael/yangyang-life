import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { FallbackNote } from "@/components/FallbackNote";
import { MenuMarks } from "@/components/MenuMarks";
import { isLang, pickText, t } from "@/i18n";
import { formatWon } from "@/lib/format";
import { getPlaceByCode, listMenu } from "@/lib/queries";

// 가게별 고정 주소(QR). 참여 가게 + 영어 메뉴판 있는 곳만 — 아니면 404.
export default async function MenuPage({ params }: PageProps<"/[lang]/m/[code]">) {
  const { lang, code } = await params;
  if (!isLang(lang)) notFound();
  await connection();

  const place = await getPlaceByCode(code);
  if (!place || place.status !== "participating" || !place.has_english_menu) notFound();
  const menu = await listMenu(place.id);
  const name = pickText(place as unknown as Record<string, unknown>, "name", lang);

  return (
    <div className="flex flex-col gap-4 px-4 pb-10 pt-2">
      <p className="rounded-2xl bg-sea px-4 py-3 text-center font-bold text-on-sea">{t(lang, "menuStaffTip")}</p>

      <header>
        <p className="text-sm text-muted">{t(lang, "menuTitle")}</p>
        <h1 className="text-2xl font-bold leading-snug">
          {name.text}
          <FallbackNote lang={lang} show={name.fallback} />
        </h1>
        {lang === "en" && !name.fallback ? <p className="text-muted">{place.name_ko}</p> : null}
      </header>

      {menu.length === 0 ? (
        <EmptyState title={t(lang, "menuEmptyTitle")} body={t(lang, "menuEmptyBody")} />
      ) : (
        <ul className="flex flex-col gap-3">
          {menu.map((m) => (
            <li key={m.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <p lang="ko" className="min-w-0 text-2xl font-bold leading-snug">
                  {m.name_ko}
                </p>
                {m.price != null ? <p className="shrink-0 pt-1 font-bold tabular-nums">{formatWon(m.price)}</p> : null}
              </div>
              {m.name_roman ? <p className="text-sm text-muted">{m.name_roman}</p> : null}
              {m.name_en?.trim() ? (
                <p lang="en" className="mt-1 font-medium">
                  {m.name_en}
                </p>
              ) : (
                <p className="mt-1">
                  <FallbackNote lang="en" className="" />
                </p>
              )}
              {m.desc_en?.trim() ? (
                <p lang="en" className="mt-0.5 text-sm text-muted">
                  {m.desc_en}
                </p>
              ) : null}
              {m.price == null ? <p className="mt-1 text-sm text-muted">{t(lang, "menuAskPrice")}</p> : null}
              <MenuMarks item={m} lang={lang} />
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/${lang}/place/${place.slug}`}
        className="inline-flex min-h-11 items-center self-center px-3 text-sea underline underline-offset-4"
      >
        {t(lang, "menuPlaceLink")}
      </Link>
    </div>
  );
}
