"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGS, t, type Lang } from "@/i18n";

/** 현재 경로의 첫 마디(/ko, /en)만 바꿔 같은 화면의 다른 언어로 보낸다. */
export function LangSwitch({ lang }: { lang: Lang }) {
  const pathname = usePathname() ?? `/${lang}`;
  const rest = pathname.split("/").slice(2).join("/");

  return (
    <nav aria-label={t(lang, "langSwitchLabel")} className="flex gap-1 text-sm">
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <Link
            key={l}
            href={`/${l}${rest ? `/${rest}` : ""}`}
            hrefLang={l}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "rounded-full bg-sea px-3 py-1 font-medium text-white"
                : "rounded-full px-3 py-1 text-muted hover:text-ink"
            }
          >
            {t(lang, l === "ko" ? "langKo" : "langEn")}
          </Link>
        );
      })}
    </nav>
  );
}
