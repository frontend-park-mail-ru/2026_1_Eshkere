const APP_SHELL_CACHE = 'app-shell-v1';
const APP_SHELL_URL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.add(APP_SHELL_URL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode !== 'navigate' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          event.waitUntil(
            caches
              .open(APP_SHELL_CACHE)
              .then((cache) => cache.put(APP_SHELL_URL, responseClone)),
          );
          return response;
        }

        return caches.match(APP_SHELL_URL);
      })
      .catch(async () => {
        return await caches.match(APP_SHELL_URL);
      }),
  );
});
