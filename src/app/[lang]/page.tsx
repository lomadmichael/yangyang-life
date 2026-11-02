import { notFound } from "next/navigation";
import { isLang, t } from "@/i18n";

// 임시 홈 — 실제 홈 화면은 이후 Task 에서 교체한다.
export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-center text-2xl font-bold">{t(lang, "siteName")}</h1>
      <p className="text-center text-muted">{t(lang, "siteTagline")}</p>
      <button type="button" className="rounded-2xl bg-sea px-6 py-5 text-lg font-bold text-white">
        {t(lang, "homeWhatToDo")}
      </button>
      <button type="button" className="rounded-2xl bg-salmon px-6 py-5 text-lg font-bold text-white">
        {t(lang, "homeWhereToEat")}
      </button>
    </div>
  );
}
