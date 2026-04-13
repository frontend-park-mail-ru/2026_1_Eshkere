const APP_SHELL_CACHE = 'app-shell-v2';
const STATIC_CACHE = 'static-assets-v2';
const APP_SHELL_URL = '/index.html';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/img/logo.png',
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isStaticAssetRequest(request) {
  const url = new URL(request.url);

  if (!isSameOrigin(url)) {
    return false;
  }

  return (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname === '/manifest.json'
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
      caches.open(STATIC_CACHE),
    ]),
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![APP_SHELL_CACHE, STATIC_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || !isSameOrigin(url)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response.ok) {
            return caches.match(APP_SHELL_URL);
          }

          const responseClone = response.clone();
          event.waitUntil(
            caches
              .open(APP_SHELL_CACHE)
              .then((cache) => cache.put(APP_SHELL_URL, responseClone)),
          );

          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(request)) ||
            (await caches.match(APP_SHELL_URL))
          );
        }),
    );
    return;
  }

  if (!isStaticAssetRequest(request)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response.ok) {
          return response;
        }

        const responseClone = response.clone();
        event.waitUntil(
          caches
            .open(STATIC_CACHE)
            .then((cache) => cache.put(request, responseClone)),
        );

        return response;
      });
    }),
  );
});
