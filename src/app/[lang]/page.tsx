import Link from "next/link";
import { notFound } from "next/navigation";
import { isLang, t } from "@/i18n";

// 홈 — 호텔 로비에서 폰을 든 방문객이 바로 고를 수 있게 큰 버튼 두 개만.
export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-10 pt-6">
      <h1 className="text-2xl font-bold leading-snug">{t(lang, "siteTagline")}</h1>
      <Link
        href={`/${lang}/do`}
        className="flex min-h-28 flex-col justify-center rounded-3xl bg-sea px-6 py-5 text-on-sea active:bg-sea-strong"
      >
        <span className="text-2xl font-bold">{t(lang, "homeWhatToDo")}</span>
        <span className="mt-1 text-sm opacity-90">{t(lang, "homeWhatToDoSub")}</span>
      </Link>
      <Link
        href={`/${lang}/eat`}
        className="flex min-h-28 flex-col justify-center rounded-3xl bg-salmon-strong px-6 py-5 text-on-sea"
      >
        <span className="text-2xl font-bold">{t(lang, "homeWhereToEat")}</span>
        <span className="mt-1 text-sm opacity-90">{t(lang, "homeWhereToEatSub")}</span>
      </Link>
      <Link
        href={`/${lang}/makers`}
        className="mt-2 inline-flex min-h-11 items-center self-center px-3 text-sea underline underline-offset-4"
      >
        {t(lang, "homeMakers")}
      </Link>
    </div>
  );
}
