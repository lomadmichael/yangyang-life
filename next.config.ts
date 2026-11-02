import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 폴더(ClaudeCode/)에도 package-lock.json 이 있어 루트를 잘못 잡는 것을 막는다.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
