"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 불러오지 못한 사진은 깨진 아이콘 대신 통째로 숨긴다 (사진 저장소가 아직 없어도 화면이 멀쩡하게).
 * fallbackSrc(분류 대표 사진, public/images)를 주면 숨기기 전에 그 사진으로 한 번 바꿔 끼운다.
 * 바꿔 낀 사진은 그 가게·행사의 실제 사진이 아니므로, fallbackLabel 을 주면 구석에 표시를 붙인다(PhotoFrame 과 같은 모양).
 */
export function SafeImage({
  src,
  alt,
  className,
  fallbackSrc,
  fallbackLabel,
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string | null;
  fallbackLabel?: string;
}) {
  const [stage, setStage] = useState<"src" | "fallback" | "failed">("src");
  const ref = useRef<HTMLImageElement>(null);

  const fail = () => setStage((s) => (s === "src" && fallbackSrc ? "fallback" : "failed"));

  // 화면이 브라우저에서 이어 붙기(hydration) 전에 이미 실패한 사진은 onError 가 안 올 수 있어 한 번 더 본다
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) fail();
    // 처음 한 번만 — fail 은 매 렌더 새로 만들어지지만 같은 일을 한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stage === "failed") return null;
  const usingFallback = stage === "fallback" && !!fallbackSrc;
  return (
    <>
      {/* 외부·Storage 주소를 그대로 쓰므로 next/image 대신 img */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={stage}
        ref={ref}
        src={usingFallback ? fallbackSrc : src}
        alt={usingFallback ? "" : alt}
        loading="lazy"
        className={className}
        onError={fail}
      />
      {usingFallback && fallbackLabel ? (
        <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2.5 py-0.5 text-sm font-medium text-on-sea">
          {fallbackLabel}
        </span>
      ) : null}
    </>
  );
}
