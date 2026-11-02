import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Link from "next/link";
import { logout } from "./actions";
import { adminConfigError, getAdmin, type Admin } from "./auth";
import "../globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "양양생활 관리",
  robots: { index: false, follow: false, nocache: true },
};

const NAV = [
  { href: "/admin", label: "홈" },
  { href: "/admin/places", label: "가게" },
  { href: "/admin/activities", label: "할 거리" },
  { href: "/admin/tips", label: "팁함" },
] as const;

// 관리 화면 전용 루트 레이아웃(/[lang] 과 별개). 여기서의 로그인 확인은 표시용일 뿐 —
// 각 화면(requireAdmin)과 각 서버 액션(authorize)이 따로 다시 검사한다.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const configError = adminConfigError();
  const admin: Admin | null = configError ? null : await getAdmin();

  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2">
            <Link href="/admin" className="inline-flex min-h-11 items-center font-bold text-sea">
              양양생활 관리
            </Link>
            {admin ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted">
                  {admin.display_name}
                  {admin.role === "owner" ? " · 운영" : ""}
                </span>
                <form action={logout}>
                  <button type="submit" className="min-h-11 px-2 text-sea underline-offset-2 hover:underline">
                    로그아웃
                  </button>
                </form>
              </div>
            ) : null}
          </div>
          {admin ? (
            <nav className="mx-auto flex w-full max-w-2xl gap-1 overflow-x-auto px-2 pb-1" aria-label="관리 메뉴">
              {[...NAV, ...(admin.role === "owner" ? [{ href: "/admin/contributors", label: "기여자" }] : [])].map(
                (n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium hover:bg-sea-soft"
                  >
                    {n.label}
                  </Link>
                ),
              )}
            </nav>
          ) : null}
        </header>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-5">
          {configError ? (
            <div role="alert" className="rounded-xl border border-salmon-strong bg-salmon-soft p-4 text-salmon-strong">
              <p className="font-bold">관리 화면 설정 오류</p>
              <p className="mt-1 text-sm">{configError}</p>
            </div>
          ) : (
            children
          )}
        </main>
      </body>
    </html>
  );
}
