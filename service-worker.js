/* Service Worker for eTube - offline caching */
const CACHE_NAME = 'etube-cache-v1';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
  // If you host other assets (css/js) separately, add them here.
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Network-first for API/remote assets, cache-first for app shell
  const request = event.request;
  const url = new URL(request.url);

  // Always allow navigation requests to fall back to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(r => { caches.open(CACHE_NAME).then(c=>c.put(request, r.clone())); return r; }).catch(()=>caches.match('/index.html'))
    );
    return;
  }

  // For same-origin assets, do cache-first
  if (url.origin === location.origin) {
    event.respondWith(caches.match(request).then(resp => resp || fetch(request).then(r => { caches.open(CACHE_NAME).then(c=>c.put(request, r.clone())); return r; })));
    return;
  }

  // For 3rd-party (YouTube), just try network — do not cache remote video streams
  event.respondWith(fetch(request).catch(()=>caches.match(request)));
});
