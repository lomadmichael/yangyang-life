import { t, type Lang } from "@/i18n";

export function SiteFooter({ lang }: { lang: Lang }) {
  return (
    <footer className="mt-auto border-t border-line px-4 py-6 text-center text-sm text-muted">
      {t(lang, "footerSupport")}
    </footer>
  );
}
