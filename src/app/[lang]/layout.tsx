import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { notFound } from "next/navigation";
import { LangSwitch } from "@/components/LangSwitch";
import { SiteFooter } from "@/components/SiteFooter";
import { LANGS, isLang, t } from "@/i18n";
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
  };
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <html lang={lang} className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="flex items-center justify-between px-4 py-3">
          <span className="font-bold text-sea">{t(lang, "siteName")}</span>
          <LangSwitch lang={lang} />
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter lang={lang} />
      </body>
    </html>
  );
}
