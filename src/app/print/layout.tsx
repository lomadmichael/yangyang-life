import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "../globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "YANGYANG LIFE",
  robots: { index: false, follow: false, nocache: true },
};

// 인쇄 전용 루트 레이아웃: 사이트 머리글·언어 전환 없음 (/[lang] 과 별개)
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${notoSansKr.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
