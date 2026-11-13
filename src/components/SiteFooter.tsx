import { t, type Lang } from "@/i18n";

export function SiteFooter({ lang }: { lang: Lang }) {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto w-full max-w-md px-4 py-6 text-center text-sm text-muted lg:flex lg:max-w-6xl lg:items-center lg:justify-between lg:gap-6 lg:px-8 lg:py-10 lg:text-left">
        <p className="hidden text-base font-bold text-sea lg:block">{t(lang, "siteName")}</p>
        <p>{t(lang, "footerSupport")}</p>
      </div>
    </footer>
  );
}
