import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
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
 * 기본값(sea 바탕 + 책 아이콘)은 이야기 사진용 — 기존 화면이 그대로 쓴다.
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

/**
 * 사진 위 글자 카드 — 사진(없으면 분류 아이콘 바탕) 아래쪽에 분류·이름을 겹쳐 쓴다(헤이설악식 격자 카드).
 * 자체 사진이 없으면 분류 대표 사진(fallback)을 쓴다. 사진(자체·대표)이 떠 있으면 아래를 어둡게 덮고 흰 글자,
 * 둘 다 없거나 못 불러오면 옅은 바탕 위 진한 글자.
 * href 를 주면 통째로 링크, 안 주면 다른 카드(PlaceCard 등)의 링크 안에 넣어 쓰는 그림 칸.
 */
export function PhotoCard({
  href,
  photo,
  fallback,
  Icon,
  tone = "sea",
  eyebrow,
  title,
  subtitle,
  heading: Heading = "h3",
  className = "aspect-4/3",
  sizes,
}: {
  href?: string;
  photo?: string | null;
  fallback?: string | null;
  Icon: ComponentType<{ className?: string }>;
  tone?: VisualTone;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  heading?: "h2" | "h3" | "p";
  className?: string;
  sizes?: string;
}) {
  // 덮개·흰 글자는 사진이 실제로 떠 있을 때만(:has(img)). 사진을 못 불러오면 SafeImage 가 img 를 빼므로 옅은 바탕 + 진한 글자로 돌아간다
  const body = (
    <div className={`group/photo relative ${className}`}>
      <PhotoFrame src={photo} fallback={fallback} sizes={sizes} alt="" Icon={Icon} tone={tone} iconClassName="h-14 w-14" className="h-full w-full" />
      <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-12 text-ink group-has-[img]/photo:bg-linear-to-t group-has-[img]/photo:from-ink/85 group-has-[img]/photo:via-ink/50 group-has-[img]/photo:to-transparent group-has-[img]/photo:text-on-sea">
        {eyebrow ? <p className="text-sm font-medium">{eyebrow}</p> : null}
        <Heading className="text-lg font-bold leading-snug">{title}</Heading>
        {subtitle ? <p className="text-sm">{subtitle}</p> : null}
      </div>
    </div>
  );
  if (!href) return body;
  return (
    <Link href={href} className="block overflow-hidden rounded-2xl">
      {body}
    </Link>
  );
}
