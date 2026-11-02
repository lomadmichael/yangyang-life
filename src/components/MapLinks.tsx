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

/** ko 는 네이버 지도가 위(주 버튼), en 은 구글 지도가 위 */
export function MapLinks({ lat, lng, name, lang }: { lat: number; lng: number; name: string; lang: Lang }) {
  const naver = { href: naverMapUrl(lat, lng, name), label: t(lang, "mapNaver") };
  const google = { href: googleMapUrl(lat, lng), label: t(lang, "mapGoogle") };
  const [primary, secondary] = lang === "ko" ? [naver, google] : [google, naver];
  return (
    <div className="flex flex-col gap-2">
      <a
        href={primary.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-12 items-center justify-center rounded-xl bg-sea px-4 font-medium text-on-sea"
      >
        {primary.label}
      </a>
      <a
        href={secondary.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface px-4 text-sm text-sea"
      >
        {secondary.label}
      </a>
    </div>
  );
}
