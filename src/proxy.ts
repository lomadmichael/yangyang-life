import { NextResponse, type NextRequest } from "next/server";
import { resolveLang } from "./i18n";

// Next 16: middleware 가 proxy 로 이름이 바뀌었다 (node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md).
// `/` 로 들어오면 브라우저 언어(Accept-Language)를 보고 /ko 또는 /en 으로 보낸다.
export function proxy(request: NextRequest) {
  const lang = resolveLang(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${lang}`;
  const res = NextResponse.redirect(url);
  res.headers.set("Vary", "Accept-Language");
  return res;
}

export const config = {
  matcher: "/",
};
