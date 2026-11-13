"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type Lang } from "@/i18n";
import { activeTab, isMenuBoardPath, NAV_TABS } from "@/lib/nav";
import { LangSwitch } from "./LangSwitch";

/**
 * PC(lg 이상) 상단 메뉴 — 로고 · 주 메뉴 5칸 · 언어 전환. 모바일에서는 숨고 하단 메뉴(BottomNav)가 대신한다.
 * 영어 메뉴판(QR 착지)에서는 주 메뉴만 빼고 로고·언어 전환은 남긴다(모바일 머리말과 같은 구성).
 * 서버 전용 모듈(supabase·session·access-code)은 import 하지 않는다.
 */
export function TopNav({ lang }: { lang: Lang }) {
  const pathname = usePathname() ?? `/${lang}`;
  const menuBoard = isMenuBoardPath(pathname);
  const current = activeTab(pathname);

  return (
    <header className="sticky top-0 z-10 hidden border-b border-line bg-surface lg:block">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-8 px-8">
        <Link href={`/${lang}`} className="inline-flex min-h-11 shrink-0 items-center text-xl font-bold text-sea">
          {t(lang, "siteName")}
        </Link>
        {menuBoard ? (
          <div className="flex-1" />
        ) : (
          <nav aria-label={t(lang, "navLabel")} className="flex-1">
            <ul className="flex items-center gap-1">
              {NAV_TABS.map(({ tab, path, label }) => {
                const active = tab === current;
                return (
                  <li key={tab}>
                    <Link
                      href={`/${lang}${path}`}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? "inline-flex h-16 items-center border-b-2 border-sea px-4 font-bold text-sea"
                          : "inline-flex h-16 items-center border-b-2 border-transparent px-4 text-ink hover:text-sea"
                      }
                    >
                      {t(lang, label)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        <LangSwitch lang={lang} />
      </div>
    </header>
  );
}
