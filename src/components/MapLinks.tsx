import { t, type Lang } from "@/i18n";

// 지도 앱 링크 — API 키 없이 주소만 만든다.
// 네이버: 가게 이름으로 검색 + 지도 중심을 가게 좌표에 (이름이 안 잡혀도 그 자리가 보인다)
// 구글: Google Maps URLs 규격(api=1) — 좌표로 핀을 정확히 찍는다 (이름은 한글이라 검색이 빗나가기 쉬움)
export function naverMapUrl(lat: number, lng: number, name: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(name)}?c=${lng},${lat},17,0,0,0,dh`;
}

export function googleMapUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`;
}

/**
 * ko 는 네이버 지도가 위(주 버튼), en 은 구글 지도가 위.
 * variant="pass" 는 장소 상세 입장권 안의 나란한 버튼(주 버튼 남색 + 선 버튼).
 */
export function MapLinks({
  lat,
  lng,
  name,
  lang,
  variant = "stack",
}: {
  lat: number;
  lng: number;
  name: string;
  lang: Lang;
  variant?: "stack" | "pass";
}) {
  const naver = { href: naverMapUrl(lat, lng, name), label: t(lang, "mapNaver") };
  const google = { href: googleMapUrl(lat, lng), label: t(lang, "mapGoogle") };
  const [primary, secondary] = lang === "ko" ? [naver, google] : [google, naver];
  if (variant === "pass") {
    return (
      <div className="map-btns">
        <a href={primary.href} target="_blank" rel="noopener noreferrer" className="btn-solid">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          {primary.label}
        </a>
        <a href={secondary.href} target="_blank" rel="noopener noreferrer" className="btn-line">
          {secondary.label}
        </a>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <a
        href={primary.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-12 items-center justify-center bg-deep px-4 font-semibold text-on-deep"
      >
        {primary.label}
      </a>
      <a
        href={secondary.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center justify-center border border-ink bg-paper-card px-4 text-base font-medium text-ink"
      >
        {secondary.label}
      </a>
    </div>
  );
}
