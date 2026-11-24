import Link from "next/link";
import { t, type Lang } from "@/i18n";

/**
 * 공통 푸터 (v4) — 먹 바탕에 큰 「양양생활」 워드마크 + 네 칸(소개 · 읽기 · 함께하기 · 안내).
 * 날씨·파도 출처(Open-Meteo, CC BY 4.0 — 출처 표기 필요)는 홈 「지금 양양」 띠가 쓰는 자료라 여기 작게 적는다.
 */
export function SiteFooter({ lang }: { lang: Lang }) {
  const href = (path: string) => `/${lang}${path}`;
  return (
    <footer className="foot mt-auto">
      <div className="wrap">
        <p className="foot-wm" aria-hidden="true">
          {t(lang, "coverTitle")}
          <span>{t(lang, "footIssue")}</span>
        </p>
        <div className="foot-grid">
          <div>
            <h2>YANGYANG LIFE</h2>
            <p>{t(lang, "footAbout")}</p>
          </div>
          <div>
            <h2>{t(lang, "footRead")}</h2>
            <Link href={href("/places")}>{t(lang, "navPlaces")}</Link>
            <Link href={href("/play")}>{t(lang, "navPlay")}</Link>
            <Link href={href("/stories")}>{t(lang, "navStories")}</Link>
          </div>
          <div>
            <h2>{t(lang, "footJoin")}</h2>
            <Link href={href("/places")}>{t(lang, "makersJoinAction")}</Link>
            <Link href={href("/makers")}>{t(lang, "makersTitle")}</Link>
            <Link href={href("/my")}>{t(lang, "navMy")}</Link>
          </div>
          <div>
            <h2>{t(lang, "footInfo")}</h2>
            <p>{t(lang, "footerSupport")}</p>
            <p>
              <a href="https://open-meteo.com/" rel="noopener noreferrer" target="_blank" className="inline">
                {t(lang, "nowSource")}
              </a>
            </p>
            <p>{t(lang, "footCopy")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
