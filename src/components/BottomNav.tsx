"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { t, type Lang } from "@/i18n";
import { activeTab, isMenuBoardPath, NAV_TABS, type Tab } from "@/lib/nav";
import { IconBook, IconHome, IconPin, IconUser, IconWave } from "./icons";

// 하단 메뉴 5칸(모바일) — 종이 바탕·먹 선, 현재 칸 위에 해돋이 주황 띠(magazine.css .tabbar). PC(lg 이상)는 TopNav 가 대신한다. 서버 전용 모듈(supabase·session·access-code)은 import 하지 않는다.

const ICONS: Record<Tab, ComponentType<{ className?: string }>> = {
  home: IconHome,
  places: IconPin,
  play: IconWave,
  stories: IconBook,
  my: IconUser,
};

export { activeTab };

export function BottomNav({ lang }: { lang: Lang }) {
  const pathname = usePathname() ?? `/${lang}`;
  // 영어 메뉴판(QR 착지)에는 그리지 않는다
  if (isMenuBoardPath(pathname)) return null;
  const current = activeTab(pathname);

  return (
    <div className="lg:hidden">
      {/* 고정 메뉴에 본문 끝(푸터)이 가리지 않도록 같은 높이만큼 비워 둔다 */}
      <div aria-hidden="true" className="safe-bottom">
        <div className="tabbar-space" />
      </div>
      <nav aria-label={t(lang, "navLabel")} className="tabbar safe-bottom">
        <ul>
          {NAV_TABS.map(({ tab, path, label }) => {
            const Icon = ICONS[tab];
            return (
              <li key={tab}>
                <Link href={`/${lang}${path}`} aria-current={tab === current ? "page" : undefined}>
                  <Icon />
                  {t(lang, label)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
