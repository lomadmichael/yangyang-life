"use client";

import { useEffect, useRef, useState } from "react";

/** 불러오지 못한 사진은 깨진 아이콘 대신 통째로 숨긴다 (사진 저장소가 아직 없어도 화면이 멀쩡하게) */
export function SafeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // 화면이 브라우저에서 이어 붙기(hydration) 전에 이미 실패한 사진은 onError 가 안 올 수 있어 한 번 더 본다
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return null;
  return (
    // 외부·Storage 주소를 그대로 쓰므로 next/image 대신 img
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt={alt} loading="lazy" className={className} onError={() => setFailed(true)} />
  );
}
