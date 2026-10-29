// 네트워크 우선, 실패하면 캐시 (홈 화면 앱이 오프라인에서도 열리게)
const CACHE = 'hercules-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      try {
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await c.match(req);
        if (hit) return hit;
        throw err;
      }
    }),
  );
});
