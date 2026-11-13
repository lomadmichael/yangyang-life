"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { t, type Lang } from "@/i18n";
import { activeTab, isMenuBoardPath, NAV_TABS, type Tab } from "@/lib/nav";
import { IconBook, IconHome, IconPin, IconUser, IconWave } from "./icons";

// 하단 메뉴 5칸(모바일). PC(lg 이상)는 TopNav 가 대신한다. 서버 전용 모듈(supabase·session·access-code)은 import 하지 않는다.

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
        <div className="h-16" />
      </div>
      <nav
        aria-label={t(lang, "navLabel")}
        className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface"
      >
        <ul className="mx-auto flex max-w-md">
          {NAV_TABS.map(({ tab, path, label }) => {
            const active = tab === current;
            const Icon = ICONS[tab];
            return (
              <li key={tab} className="flex-1">
                <Link
                  href={`/${lang}${path}`}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium text-sea"
                      : "flex h-16 flex-col items-center justify-center gap-0.5 text-xs text-muted hover:text-ink"
                  }
                >
                  <Icon className="h-6 w-6" />
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
