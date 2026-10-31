// 네트워크 우선, 실패하면 캐시 (홈 화면 앱이 오프라인에서도 열리게)
const CACHE = 'hercules-v2';
// 빌드할 때마다 이름이 바뀌는 파일 (assets/이름-해시.js 등). 새것을 받으면 같은 이름의 옛것을 지워 캐시가 쌓이지 않게 한다
const HASHED = /\/assets\/([^/]+)-[A-Za-z0-9_-]{8}\.(js|css|woff2?)$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 이름이 바뀐 옛 캐시 통째로 지우기
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function prune(c, url) {
  const m = HASHED.exec(new URL(url).pathname);
  if (!m) return;
  for (const req of await c.keys()) {
    if (req.url === url) continue;
    const k = HASHED.exec(new URL(req.url).pathname);
    if (k && k[1] === m[1] && k[2] === m[2]) await c.delete(req);
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      try {
        const res = await fetch(req);
        if (res.ok) {
          await c.put(req, res.clone());
          e.waitUntil(prune(c, req.url));
        }
        return res;
      } catch (err) {
        const hit = await c.match(req);
        if (hit) return hit;
        throw err;
      }
    }),
  );
});
