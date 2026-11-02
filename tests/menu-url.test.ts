import jsQR from "jsqr";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { menuQrPng, menuQrSvg, menuUrl } from "../src/lib/menu-url";

describe("menuUrl", () => {
  it("기본은 운영 주소의 영어 메뉴판", () => {
    expect(menuUrl("a1b2c3")).toBe("https://yangyang.life/en/m/a1b2c3");
  });
  it("언어를 고를 수 있다", () => {
    expect(menuUrl("a1b2c3", "ko")).toBe("https://yangyang.life/ko/m/a1b2c3");
  });
  it("로컬 환경변수와 상관없이 항상 운영 주소", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    expect(menuUrl("zz9")).toBe("https://yangyang.life/en/m/zz9");
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });
});

describe("QR", () => {
  it("PNG 를 읽으면 정확히 운영 주소가 나온다", async () => {
    const buf = await menuQrPng("a1b2c3");
    const png = PNG.sync.read(buf);
    expect(png.width).toBeGreaterThanOrEqual(1000);
    const r = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(r?.data).toBe("https://yangyang.life/en/m/a1b2c3");
  });
  it("SVG 문자열", async () => {
    const svg = await menuQrSvg("a1b2c3");
    expect(svg.startsWith("<svg")).toBe(true);
  });
});
