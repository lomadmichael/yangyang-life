import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 폴더(ClaudeCode/)에도 package-lock.json 이 있어 루트를 잘못 잡는 것을 막는다.
  // 관리 화면 사진 업로드(서버 액션) — 기본 1MB 제한을 Vercel 함수 요청 한도(4.5MB)까지.
  // 사진 한 장은 4MB 이하(admin/actions.ts PHOTO_MAX_BYTES) — 그보다 크면 Vercel 이 날것의 413 을 낸다
  experimental: {
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  turbopack: {
    root: path.join(__dirname),
  },
  // 서비스 워커 파일은 늘 새로 받는다 — 고친 sw.js 가 브라우저 캐시에 막히지 않게 (docs/01-app/02-guides/progressive-web-apps.md)
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
  // v2 에서 옛 주소 /eat → /places, /do → /play (308, 쿼리 ?cat=…&open=1 은 Next 가 그대로 넘긴다)
  async redirects() {
    return [
      { source: "/:lang(ko|en)/eat", destination: "/:lang/places", permanent: true },
      { source: "/:lang(ko|en)/do", destination: "/:lang/play", permanent: true },
    ];
  },
};

export default nextConfig;
