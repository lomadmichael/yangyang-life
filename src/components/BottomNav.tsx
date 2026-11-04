"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { t, type DictKey, type Lang } from "@/i18n";
import { IconBook, IconHome, IconPin, IconUser, IconWave } from "./icons";

// 하단 메뉴 5칸. 서버 전용 모듈(supabase·session·access-code)은 import 하지 않는다.

type Tab = "home" | "places" | "play" | "stories" | "my";

const TABS: { tab: Tab; path: string; label: DictKey; Icon: ComponentType<{ className?: string }> }[] = [
  { tab: "home", path: "", label: "navHome", Icon: IconHome },
  { tab: "places", path: "/places", label: "navPlaces", Icon: IconPin },
  { tab: "play", path: "/play", label: "navPlay", Icon: IconWave },
  { tab: "stories", path: "/stories", label: "navStories", Icon: IconBook },
  { tab: "my", path: "/my", label: "navMy", Icon: IconUser },
];

/** 경로 첫 마디(언어 다음) → 현재 칸. 상세 화면은 부모 칸으로 본다 */
const SECTION: Record<string, Tab> = {
  places: "places",
  place: "places",
  play: "play",
  activity: "play",
  stories: "stories",
  my: "my",
  makers: "my",
};

export function activeTab(pathname: string): Tab | null {
  const first = pathname.split("/")[2] ?? "";
  if (first === "") return "home";
  return SECTION[first] ?? null;
}

export function BottomNav({ lang }: { lang: Lang }) {
  const pathname = usePathname() ?? `/${lang}`;
  // 영어 메뉴판(QR 착지)에는 그리지 않는다
  if (pathname.split("/")[2] === "m") return null;
  const current = activeTab(pathname);

  return (
    <>
      {/* 고정 메뉴에 본문 끝(푸터)이 가리지 않도록 같은 높이만큼 비워 둔다 */}
      <div aria-hidden="true" className="safe-bottom">
        <div className="h-16" />
      </div>
      <nav
        aria-label={t(lang, "navLabel")}
        className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface"
      >
        <ul className="mx-auto flex max-w-md">
          {TABS.map(({ tab, path, label, Icon }) => {
            const active = tab === current;
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
    </>
  );
}
