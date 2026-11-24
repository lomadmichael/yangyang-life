import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { LangSwitch } from "@/components/LangSwitch";
import { PwaSetup } from "@/components/PwaSetup";
import { SiteFooter } from "@/components/SiteFooter";
import { TopNav } from "@/components/TopNav";
import { LANGS, isLang, t } from "@/i18n";
import { THEME_COLOR } from "@/lib/pwa";
import "../globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// /ko, /en 만 존재한다. 그 밖의 값(/fr 등)은 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return {
    title: t(lang, "siteName"),
    description: t(lang, "siteTagline"),
    // 웹앱(PWA) — manifest 링크는 app/manifest.ts 가 자동으로 붙인다. favicon 은 app/favicon.ico
    icons: {
      icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: {
      capable: true,
      title: t(lang, "siteName"),
      statusBarStyle: "default",
    },
    // Next 16 의 appleWebApp.capable 은 mobile-web-app-capable 만 낸다 — iOS 16.3 이하는 아래 이름만 읽는다
    other: { "apple-mobile-web-app-capable": "yes" },
  };
}

// 주소창·상태 표시줄 색 = sea 토큰 (Next 16: themeColor 는 metadata 가 아니라 viewport 로)
export const viewport: Viewport = {
  themeColor: THEME_COLOR,
};

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <html lang={lang} className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col overflow-x-clip">
        <TopNav lang={lang} />
        {/* 모바일 머리말 — PC(lg 이상)는 TopNav */}
        <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-2 lg:hidden">
          <Link href={`/${lang}`} className="inline-flex min-h-11 items-center font-bold text-sea">
            {t(lang, "siteName")}
          </Link>
          <LangSwitch lang={lang} />
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-6xl">{children}</main>
        <SiteFooter lang={lang} />
        <BottomNav lang={lang} />
        <PwaSetup />
      </body>
    </html>
  );
}
