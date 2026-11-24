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
    // 네모 칸 두 개(v4) — 테두리·글자는 부모 글자색(currentColor)을 따른다. 표지 위에서는 흰색(magazine.css .lang-sw)
    <nav aria-label={t(lang, "langSwitchLabel")} className="lang-sw">
      {LANGS.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest ? `/${rest}` : ""}${qs}`}
          hrefLang={l}
          aria-current={l === lang ? "true" : undefined}
        >
          {t(lang, l === "ko" ? "langKo" : "langEn")}
        </Link>
      ))}
    </nav>
  );
}
