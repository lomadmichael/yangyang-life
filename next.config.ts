import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 폴더(ClaudeCode/)에도 package-lock.json 이 있어 루트를 잘못 잡는 것을 막는다.
  // 관리 화면 사진 업로드(서버 액션) — 기본 1MB 제한을 버킷 한도(5MB)보다 조금 크게
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
