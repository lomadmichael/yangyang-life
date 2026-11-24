import Image from "next/image";
import type { ComponentType } from "react";
import { photoUrl } from "@/lib/format";
import type { VisualTone } from "./category-visual";
import { IconBook } from "./icons";
import { SafeImage } from "./SafeImage";

const TONE: Record<VisualTone, string> = {
  sea: "bg-sea-soft text-sea",
  pine: "bg-pine-soft text-pine",
  salmon: "bg-salmon-soft text-salmon-strong",
  sand: "bg-sand text-muted",
};

/**
 * 사진 틀 — 옅은 바탕에 아이콘을 깔고 그 위에 사진을 얹는다.
 * 자체 사진(src)이 없으면 분류 대표 사진(fallback, public/images)을 대신 얹는다. 대표 사진은 그 가게·행사의 실제 사진이 아니므로
 * 상세의 큰 사진 자리처럼 오해할 수 있는 곳에서는 fallbackLabel(「분류 대표 사진」)을 구석에 붙인다.
 * 자체 사진을 못 불러오면 대표 사진으로 바꿔 끼우고, 그것도 없거나 못 불러오면(SafeImage 가 사라짐) 아이콘 바탕만 남아 자리가 무너지지 않는다.
 * 기본값(sea 바탕 + 책 아이콘)은 이야기 본문 사진용(StoryBody — 관리 미리보기에서도 쓴다).
 */
export function PhotoFrame({
  src,
  fallback,
  fallbackLabel,
  alt,
  className,
  Icon = IconBook,
  tone = "sea",
  iconClassName = "h-8 w-8",
  sizes = "(min-width: 1024px) 400px, 100vw",
}: {
  src?: string | null;
  fallback?: string | null;
  fallbackLabel?: string;
  alt: string;
  className: string;
  Icon?: ComponentType<{ className?: string }>;
  tone?: VisualTone;
  iconClassName?: string;
  /** 대표 사진(next/image)이 화면에서 차지하는 폭 — 알맞은 크기로 줄여 받는다 */
  sizes?: string;
}) {
  const useFallback = !src && !!fallback;
  return (
    <div className={`relative overflow-hidden ${TONE[tone]} ${className}`}>
      <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <Icon className={`${iconClassName} opacity-60`} />
      </span>
      {src ? (
        // 자체 사진을 못 불러오면 대표 사진으로 바꿔 끼운다(SafeImage)
        <SafeImage
          src={photoUrl(src)}
          alt={alt}
          fallbackSrc={fallback}
          fallbackLabel={fallbackLabel}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {!src && fallback ? <Image src={fallback} alt="" fill sizes={sizes} className="object-cover" /> : null}
      {useFallback && fallbackLabel ? (
        <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2.5 py-0.5 text-sm font-medium text-on-sea">
          {fallbackLabel}
        </span>
      ) : null}
    </div>
  );
}
