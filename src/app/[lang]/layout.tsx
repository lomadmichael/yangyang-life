import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, IBM_Plex_Sans_KR, Nanum_Pen_Script, Noto_Serif_KR } from "next/font/google";
import { notFound } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { PwaSetup } from "@/components/PwaSetup";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { TopNav } from "@/components/TopNav";
import { LANGS, isLang, t } from "@/i18n";
import { THEME_COLOR } from "@/lib/pwa";
import "../globals.css";
import "../magazine.css";

// v4 글꼴 — 제목 명조(Noto Serif KR) · 영문 장식 이탤릭(Cormorant Garamond) · 본문(IBM Plex Sans KR) · 손글씨(Nanum Pen Script, 약도 지명·짧은 주석만).
// 한글 글꼴은 라틴 부분만 미리 받고(preload) 한글 글자는 쓰일 때 unicode-range 조각으로 받는다. 손글씨는 미리 받지 않는다.
const serifKr = Noto_Serif_KR({ variable: "--font-noto-serif-kr", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});
const plexKr = IBM_Plex_Sans_KR({ variable: "--font-plex-kr", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const nanumPen = Nanum_Pen_Script({ variable: "--font-nanum-pen", subsets: ["latin"], weight: "400", preload: false });

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

// 주소창·상태 표시줄 색 = sea(= deep 쪽빛 남색) 토큰 (Next 16: themeColor 는 metadata 가 아니라 viewport 로)
export const viewport: Viewport = {
  themeColor: THEME_COLOR,
};

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <html
      lang={lang}
      className={`${serifKr.variable} ${cormorant.variable} ${plexKr.variable} ${nanumPen.variable} h-full antialiased`}
    >
      <body className="mz-body flex min-h-full flex-col overflow-x-clip bg-paper">
        {/* 머리 메뉴 — 모든 폭. 홈 표지 위에서는 투명, 그 밖에서는 종이 바탕 + 아래 빈칸 */}
        <TopNav lang={lang} />
        <main className="site-main mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-6xl">{children}</main>
        <SiteFooter lang={lang} />
        <BottomNav lang={lang} />
        <PwaSetup />
        <Reveal />
      </body>
    </html>
  );
}
