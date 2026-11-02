"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LANGS, t, type Lang } from "@/i18n";

/**
 * 현재 경로의 첫 마디(/ko, /en)만 바꿔 같은 화면의 다른 언어로 보낸다.
 * 필터 같은 쿼리(?cat=food&open=1)도 그대로 들고 간다.
 */
export function LangSwitch({ lang }: { lang: Lang }) {
  // useSearchParams 는 Suspense 안에서만 — 쿼리를 못 읽는 순간(정적 화면)엔 쿼리 없이 그린다
  return (
    <Suspense fallback={<LangLinks lang={lang} query="" />}>
      <LangSwitchWithQuery lang={lang} />
    </Suspense>
  );
}

function LangSwitchWithQuery({ lang }: { lang: Lang }) {
  const query = useSearchParams()?.toString() ?? "";
  return <LangLinks lang={lang} query={query} />;
}

function LangLinks({ lang, query }: { lang: Lang; query: string }) {
  const pathname = usePathname() ?? `/${lang}`;
  const rest = pathname.split("/").slice(2).join("/");
  const qs = query ? `?${query}` : "";

  return (
    <nav aria-label={t(lang, "langSwitchLabel")} className="flex gap-1 text-sm">
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <Link
            key={l}
            href={`/${l}${rest ? `/${rest}` : ""}${qs}`}
            hrefLang={l}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "inline-flex min-h-11 items-center rounded-full bg-sea px-3 font-medium text-on-sea"
                : "inline-flex min-h-11 items-center rounded-full px-3 text-muted hover:text-ink"
            }
          >
            {t(lang, l === "ko" ? "langKo" : "langEn")}
          </Link>
        );
      })}
    </nav>
  );
}
