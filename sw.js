// Cubit 서비스워커
// 목적: (1) Android 설치(홈 화면 추가) 배너를 띄우는 데 필요한 최소 조건 충족
//       (2) 오프라인일 때만 캐시로 대체 — 온라인일 땐 항상 최신 배포본을 우선 사용(캐시로 인한 "수정 안 됨" 문제 방지)
//
// 배포 시 주의: 앱 코드를 크게 바꿀 때마다 아래 CACHE_NAME 버전을 올려주세요.
// (버전을 올리면 이전 캐시가 자동 삭제되고, 새 서비스워커가 즉시 활성화됩니다.)
const CACHE_NAME = 'cubit-cache-v1';
const PRECACHE_URLS = [
  './index',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => console.error('[sw] precache 실패', err))
  );
  self.skipWaiting(); // 새 서비스워커를 즉시 활성화 (구버전에 고착되는 문제 방지)
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// network-first, cache는 오프라인 폴백 용도로만 사용
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Supabase API 등 외부 요청은 캐시하지 않음(같은 오리진만 캐시)
          if (new URL(event.request.url).origin === self.location.origin) {
            cache.put(event.request, copy);
          }
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
