import { t, type Lang } from "@/i18n";

/** 영문 칸이 비어 한글을 대신 보여줄 때 붙이는 작은 표시 (「English coming soon」). 글 뒤에 붙일 땐 기본 왼쪽 여백 */
export function FallbackNote({
  lang,
  show = true,
  className = "ml-1",
}: {
  lang: Lang;
  show?: boolean;
  className?: string;
}) {
  if (!show || lang === "ko") return null;
  return (
    <span
      className={`inline-block rounded border border-line px-1.5 py-0.5 align-middle text-xs font-normal text-muted ${className}`}
    >
      {t(lang, "englishComingSoon")}
    </span>
  );
}
