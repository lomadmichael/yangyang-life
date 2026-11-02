import QRCode from "qrcode";
import type { Lang } from "../i18n";

/** QR 에 박히는 주소는 항상 운영 도메인. 로컬에서 만들어도 바뀌지 않는다(인쇄물이 영구히 쓰임) */
const ORIGIN = "https://yangyang.life";

/** 가게의 바뀌지 않는 코드(slug 가 아님)로 만든 메뉴판 주소 */
export function menuUrl(code: string, lang: Lang = "en"): string {
  return `${ORIGIN}/${lang}/m/${encodeURIComponent(code)}`;
}

const QR_OPTS = { errorCorrectionLevel: "M", margin: 2 } as const;

export function menuQrSvg(code: string): Promise<string> {
  return QRCode.toString(menuUrl(code), { ...QR_OPTS, type: "svg" });
}

export function menuQrPng(code: string): Promise<Buffer> {
  return QRCode.toBuffer(menuUrl(code), { ...QR_OPTS, type: "png", width: 1024 });
}
