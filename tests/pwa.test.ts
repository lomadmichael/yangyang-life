import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
import manifest from "../src/app/manifest";
import { BACKGROUND_COLOR, THEME_COLOR, installMode, isIOSDevice, type InstallEnv } from "../src/lib/pwa";

const ROOT = path.resolve(__dirname, "..");
const css = readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");

function tokenHex(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m) throw new Error(`--${name} 없음`);
  return m[1].toLowerCase();
}

/** PNG 머리(IHDR)에서 가로·세로 */
function pngSize(file: string): [number, number] {
  const buf = readFileSync(file);
  expect(buf.subarray(1, 4).toString("latin1")).toBe("PNG");
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

describe("PWA 색", () => {
  it("theme·background 는 globals.css 토큰(sea·sand)과 같은 값", () => {
    expect(THEME_COLOR).toBe(tokenHex("sea"));
    expect(BACKGROUND_COLOR).toBe(tokenHex("sand"));
  });

  it("offline.html 은 토큰 값에 있는 색만 쓴다", () => {
    const tokens = new Set([...css.matchAll(/--[\w-]+:\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => m[1].toLowerCase()));
    const html = readFileSync(path.join(ROOT, "public/offline.html"), "utf8");
    const used = [...html.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase());
    expect(used.length).toBeGreaterThan(0);
    for (const c of used) expect(tokens.has(c), c).toBe(true);
  });

  it("offline.html 은 ko·en 문구와 다시 시도 버튼을 한 화면에 둔다", () => {
    const html = readFileSync(path.join(ROOT, "public/offline.html"), "utf8");
    expect(html).toContain('lang="ko"');
    expect(html).toContain('lang="en"');
    expect(html).toContain('id="retry"');
    expect(html).not.toMatch(/<link[^>]+href="https?:/); // 밖에서 불러오는 것 없음
  });
});

describe("manifest", () => {
  const m = manifest();

  it("언어 분기가 살아 있게 시작 주소는 / , 독립 실행", () => {
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.short_name).toBe("양양생활");
    expect(m.theme_color).toBe(THEME_COLOR);
  });

  it("아이콘 192·512·maskable 512 가 실제 파일·크기와 맞다", () => {
    const icons = m.icons ?? [];
    const want = [
      ["192x192", "any"],
      ["512x512", "any"],
      ["512x512", "maskable"],
    ];
    for (const [sizes, purpose] of want) {
      const icon = icons.find((i) => i.sizes === sizes && i.purpose === purpose);
      expect(icon, `${sizes} ${purpose}`).toBeDefined();
      const file = path.join(ROOT, "public", icon!.src);
      expect(existsSync(file)).toBe(true);
      const [w, h] = pngSize(file);
      expect(`${w}x${h}`).toBe(sizes);
    }
  });

  it("apple-touch-icon 180×180, favicon 있음", () => {
    expect(pngSize(path.join(ROOT, "public/icons/apple-touch-icon.png"))).toEqual([180, 180]);
    expect(existsSync(path.join(ROOT, "src/app/favicon.ico"))).toBe(true);
  });
});

describe("installMode", () => {
  const base: InstallEnv = { hydrated: true, standalone: false, installed: false, isIOS: false, canPrompt: false };

  it("하이드레이션 전·홈 화면 앱으로 실행 중·방금 설치함 → 숨김", () => {
    expect(installMode({ ...base, hydrated: false, canPrompt: true })).toBe("hidden");
    expect(installMode({ ...base, standalone: true, canPrompt: true })).toBe("hidden");
    expect(installMode({ ...base, standalone: true, isIOS: true })).toBe("hidden");
    expect(installMode({ ...base, installed: true })).toBe("hidden");
  });

  it("설치 창을 띄울 수 있으면 버튼", () => {
    expect(installMode({ ...base, canPrompt: true })).toBe("button");
  });

  it("iOS 는 공유 메뉴 안내, 그 밖은 브라우저 메뉴 안내", () => {
    expect(installMode({ ...base, isIOS: true })).toBe("ios");
    expect(installMode(base)).toBe("manual");
  });
});

describe("isIOSDevice", () => {
  it("iPhone·iPad UA", () => {
    expect(isIOSDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15", 5)).toBe(true);
    expect(isIOSDevice("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)", 5)).toBe(true);
  });

  it("데스크톱 UA 를 보내는 iPadOS 는 터치 지점으로 구분", () => {
    const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15";
    expect(isIOSDevice(mac, 5)).toBe(true);
    expect(isIOSDevice(mac, 0)).toBe(false);
  });

  it("안드로이드·윈도우는 아님", () => {
    expect(isIOSDevice("Mozilla/5.0 (Linux; Android 14; SM-S918N) Chrome/130.0 Mobile Safari/537.36", 5)).toBe(false);
    expect(isIOSDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0", 0)).toBe(false);
  });
});

// public/sw.js 를 그대로 불러와 가짜 서비스 워커 환경에서 돌려 본다
describe("sw.js", () => {
  const ORIGIN = "https://yangyang.example";
  type Handler = (e: unknown) => void;

  function loadSw(fetchImpl: () => Promise<unknown>) {
    const handlers: Record<string, Handler> = {};
    const offline = { offline: true };
    const caches = { match: vi.fn(async () => offline), open: vi.fn(), keys: vi.fn(async () => []), delete: vi.fn() };
    const self = {
      addEventListener: (type: string, h: Handler) => {
        handlers[type] = h;
      },
      location: { origin: ORIGIN },
      registration: {},
      clients: { claim: vi.fn() },
      skipWaiting: vi.fn(),
    };
    const code = readFileSync(path.join(ROOT, "public/sw.js"), "utf8");
    vm.runInNewContext(code, { self, caches, fetch: fetchImpl, URL, Request, Response, Promise });
    return { handlers, offline };
  }

  function navigate(handlers: Record<string, Handler>, req: { method?: string; mode?: string; url: string }) {
    const respondWith = vi.fn();
    handlers.fetch({
      request: { method: req.method ?? "GET", mode: req.mode ?? "navigate", url: req.url },
      preloadResponse: Promise.resolve(undefined),
      respondWith,
    });
    return respondWith;
  }

  it("공개 화면 페이지 이동만 가로챈다", () => {
    const { handlers } = loadSw(async () => ({ ok: true }));
    expect(navigate(handlers, { url: `${ORIGIN}/ko/places` })).toHaveBeenCalledOnce();
    expect(navigate(handlers, { url: `${ORIGIN}/` })).toHaveBeenCalledOnce();
  });

  it("관리 화면·인쇄·POST(서버 액션)·데이터 요청·다른 사이트는 손대지 않는다", () => {
    const { handlers } = loadSw(async () => ({ ok: true }));
    expect(navigate(handlers, { url: `${ORIGIN}/admin` })).not.toHaveBeenCalled();
    expect(navigate(handlers, { url: `${ORIGIN}/admin/places` })).not.toHaveBeenCalled();
    expect(navigate(handlers, { url: `${ORIGIN}/print/menu/ABC123` })).not.toHaveBeenCalled();
    expect(navigate(handlers, { method: "POST", url: `${ORIGIN}/ko/place/x` })).not.toHaveBeenCalled();
    expect(navigate(handlers, { mode: "cors", url: `${ORIGIN}/ko/places?_rsc=1` })).not.toHaveBeenCalled();
    expect(navigate(handlers, { url: "https://other.example/ko" })).not.toHaveBeenCalled();
  });

  it("네트워크가 되면 받은 응답 그대로, 실패하면 오프라인 안내", async () => {
    const live = { ok: true };
    const ok = loadSw(async () => live);
    const r1 = navigate(ok.handlers, { url: `${ORIGIN}/ko` });
    await expect(r1.mock.calls[0][0]).resolves.toBe(live);

    const down = loadSw(async () => {
      throw new TypeError("Failed to fetch");
    });
    const r2 = navigate(down.handlers, { url: `${ORIGIN}/en/play` });
    await expect(r2.mock.calls[0][0]).resolves.toBe(down.offline);
  });
});
