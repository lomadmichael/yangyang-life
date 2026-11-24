"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { t, type Lang } from "@/i18n";
import { activeTab, hasCoverHero, isMenuBoardPath, NAV_TABS } from "@/lib/nav";
import { LangSwitch } from "./LangSwitch";
import { Logo } from "./Logo";

/**
 * 머리 메뉴 (모든 폭, 화면 위에 고정) — 로고 · 주 메뉴 5칸(PC, lg 이상) · 호수 표기 · 언어 전환.
 * 홈·장소 상세(사진 표지가 있는 화면)에서는 표지 위에서 투명 + 흰 글자, 표지를 거의 다 지나면 종이 바탕으로 바뀐다.
 * 홈이 아닌 화면은 처음부터 종이 바탕이고, 고정 메뉴에 본문이 가리지 않도록 같은 높이의 빈칸을 둔다.
 * 영어 메뉴판(QR 착지)에서는 주 메뉴만 뺀다. 모바일 주 메뉴는 하단 메뉴(BottomNav).
 * 서버 전용 모듈(supabase·session·access-code)은 import 하지 않는다.
 */
export function TopNav({ lang }: { lang: Lang }) {
  const pathname = usePathname() ?? `/${lang}`;
  const menuBoard = isMenuBoardPath(pathname);
  const current = activeTab(pathname);
  const onCover = hasCoverHero(pathname);
  const [pastCover, setPastCover] = useState(false);

  useEffect(() => {
    if (!onCover) return;
    // 표지가 실제로 없으면(예: 없는 장소의 404) 처음부터 종이 바탕
    const onScroll = () => setPastCover(!document.querySelector(".cover") || window.scrollY > window.innerHeight * 0.82);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onCover, pathname]);

  const clear = onCover && !pastCover;

  return (
    <>
      <header className={`site-top ${clear ? "is-clear" : ""}`}>
        <div className="site-top-in">
          <Link href={`/${lang}`} aria-label={t(lang, "siteName")} className="inline-flex min-h-11 items-center justify-self-start">
            <span className="hidden lg:inline-flex">
              <Logo tone={clear ? "light" : "ink"} />
            </span>
            <span className="inline-flex lg:hidden">
              <Logo tone={clear ? "light" : "ink"} size="sm" />
            </span>
          </Link>
          {menuBoard ? (
            <span className="hidden lg:block" />
          ) : (
            <nav aria-label={t(lang, "navLabel")} className="site-nav">
              {NAV_TABS.map(({ tab, path, label }) => (
                <Link key={tab} href={`/${lang}${path}`} aria-current={tab === current ? "page" : undefined}>
                  {t(lang, label)}
                </Link>
              ))}
            </nav>
          )}
          <div className="site-tools">
            <span className="issue-mini it">{t(lang, "coverIssueMini")}</span>
            <LangSwitch lang={lang} />
          </div>
        </div>
      </header>
      {onCover ? null : <div aria-hidden="true" className="site-top-space" />}
    </>
  );
}
