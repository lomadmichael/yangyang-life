// 양양생활 서비스 워커 — 최소판.
// 하는 일은 하나: 페이지 이동(GET navigate)이 네트워크 실패로 끝나면 /offline.html 안내를 보여 준다.
// 페이지·데이터는 캐시하지 않는다(영업시간 등이 낡으면 안 된다). 캐시에는 offline.html 한 장만 둔다.
// 관리 화면(/admin)·인쇄용 메뉴판(/print)·서버 액션(POST)·데이터 요청(RSC fetch)은 가로채지 않는다.
// 등록은 운영(production)에서만 — src/components/PwaSetup.tsx

const CACHE = "yl-offline-v1";
const OFFLINE_URL = "/offline.html";
const BYPASS = ["/admin", "/print"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      // 가로채는 동안 페이지 요청이 늦게 출발하지 않도록 — 지원하는 브라우저에서만
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

function shouldHandle(request) {
  if (request.method !== "GET" || request.mode !== "navigate") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return !BYPASS.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"));
}

self.addEventListener("fetch", (event) => {
  if (!shouldHandle(event.request)) return; // 브라우저 기본 동작 그대로

  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(event.request);
      } catch {
        const offline = await caches.match(OFFLINE_URL);
        return offline || Response.error();
      }
    })(),
  );
});
