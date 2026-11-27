import type { MetadataRoute } from "next";
import { BACKGROUND_COLOR, THEME_COLOR } from "../lib/pwa"; // 상대 경로 — tests/pwa.test.ts(vitest, @ 별칭 없음)가 이 파일을 직접 불러온다

// 웹앱(PWA) manifest — /manifest.webmanifest 로 나간다 (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md).
// start_url 은 `/` — 홈 화면 아이콘으로 열어도 proxy 가 기기 언어를 보고 /ko 또는 /en 으로 보낸다.
// 아이콘은 scripts/make-pwa-icons.py 로 만든다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "양양생활 YANGYANG LIFE",
    short_name: "양양생활",
    description: "양양의 장소·놀거리·이야기 — Places, things to do and stories in Yangyang",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
