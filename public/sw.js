const CACHE_PREFIX = 'eshkere';
const CACHE_VERSION = 'v6';
const APP_SHELL_CACHE = `${CACHE_PREFIX}-app-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}-static-assets-${CACHE_VERSION}`;
const APP_SHELL_URL = '/index.html';
const CURRENT_CACHES = new Set([APP_SHELL_CACHE, STATIC_CACHE]);
const LEGACY_CACHES = new Set([
  'app-shell-v3',
  'static-assets-v3',
  'api-responses-v1',
]);

const APP_SHELL_PRECACHE_URLS = [
  APP_SHELL_URL,
];

const STATIC_PRECACHE_URLS = [
  '/manifest.json',
  '/img/logo.webp',
];

const APP_ROUTE_PREFIXES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/oferta',
  '/privacy',
  '/overview',
  '/ads',
  '/advertiser',
  '/balance',
  '/add-sites',
  '/partner',
  '/profile',
  '/support',
  '/moderator',
];

const STATIC_ASSET_PREFIXES = [
  '/assets/',
  '/css/',
  '/fonts/',
  '/icons/',
  '/img/',
  '/js/',
];

const STATIC_ASSET_PATHS = new Set([
  '/manifest.json',
  '/sdk.js',
]);

/**
 * Checks whether a request URL belongs to the application origin.
 * @param {URL} url Request URL.
 * @return {boolean} Same-origin status.
 */
function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

/**
 * Normalizes a route path before it is checked against app routes.
 * @param {string} pathname URL pathname.
 * @return {string} Pathname without trailing slashes.
 */
function normalizePathname(pathname) {
  return pathname === '/' ? pathname : pathname.replace(/\/+$/, '') || '/';
}

/**
 * Checks whether the pathname belongs to the SPA router.
 * @param {string} pathname URL pathname.
 * @return {boolean} SPA route status.
 */
function isAppRoutePath(pathname) {
  const normalizedPathname = normalizePathname(pathname);

  return APP_ROUTE_PREFIXES.some((prefix) => {
    if (prefix === '/') {
      return normalizedPathname === prefix;
    }

    return normalizedPathname === prefix ||
      normalizedPathname.startsWith(`${prefix}/`);
  });
}

/**
 * Checks whether a document navigation should use the app shell fallback.
 * @param {Request} request Browser request.
 * @param {URL} url Request URL.
 * @return {boolean} App navigation status.
 */
function isAppNavigationRequest(request, url) {
  return request.mode === 'navigate' && isAppRoutePath(url.pathname);
}

/**
 * Checks whether the URL points to a frontend-owned static path.
 * @param {string} pathname URL pathname.
 * @return {boolean} Static path status.
 */
function hasStaticAssetPath(pathname) {
  return STATIC_ASSET_PATHS.has(pathname) ||
    STATIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Checks whether a request is a cacheable frontend static asset request.
 * @param {Request} request Browser request.
 * @param {URL} url Request URL.
 * @return {boolean} Static asset request status.
 */
function isStaticAssetRequest(request, url) {
  if (!hasStaticAssetPath(url.pathname)) {
    return false;
  }

  return request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname === '/manifest.json';
}

/**
 * Checks whether a response contains an HTML document.
 * @param {Response} response Network response.
 * @return {boolean} HTML response status.
 */
function isHtmlResponse(response) {
  return response.headers.get('Content-Type')?.includes('text/html');
}

/**
 * Checks whether a response can be persisted in CacheStorage.
 * @param {Response} response Network response.
 * @return {boolean} Cacheable response status.
 */
function isCacheableResponse(response) {
  const cacheControl = response.headers.get('Cache-Control') || '';

  return response.ok && !/(^|,)\s*(no-store|private)\b/i.test(cacheControl);
}

/**
 * Checks whether a CacheStorage bucket is owned by this application.
 * @param {string} cacheName CacheStorage bucket name.
 * @return {boolean} Managed cache status.
 */
function isManagedCache(cacheName) {
  return cacheName.startsWith(`${CACHE_PREFIX}-`) ||
    LEGACY_CACHES.has(cacheName);
}

/**
 * Stores a response in a named CacheStorage bucket.
 * @param {string} cacheName CacheStorage bucket name.
 * @param {Request|string} request Cache key.
 * @param {Response} response Response clone.
 * @return {Promise<void>} Cache write completion.
 */
async function putInCache(cacheName, request, response) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
}

/**
 * Reads the latest cached SPA shell.
 * @return {Promise<Response|undefined>} Cached app shell.
 */
async function matchAppShell() {
  const cache = await caches.open(APP_SHELL_CACHE);
  return await cache.match(APP_SHELL_URL);
}

/**
 * Creates the final fallback when even the cached app shell is unavailable.
 * @return {Response} Minimal offline response.
 */
function createOfflineResponse() {
  return new Response(
    '<!doctype html><html lang="ru"><meta charset="utf-8">' +
      '<title>Eshkere offline</title><body>Offline. Reconnect and try again.</body></html>',
    {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
      },
    },
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .open(APP_SHELL_CACHE)
        .then((cache) => cache.addAll(APP_SHELL_PRECACHE_URLS)),
      caches
        .open(STATIC_CACHE)
        .then((cache) => cache.addAll(STATIC_PRECACHE_URLS)),
    ]),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => isManagedCache(cacheName))
            .filter((cacheName) => !CURRENT_CACHES.has(cacheName))
            .map((cacheName) => caches.delete(cacheName)),
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

  if (isAppNavigationRequest(request, url)) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(async (response) => {
          if (isCacheableResponse(response) && isHtmlResponse(response)) {
            event.waitUntil(
              putInCache(APP_SHELL_CACHE, APP_SHELL_URL, response.clone()),
            );
          }

          if (response.ok) {
            return response;
          }

          return (await matchAppShell()) || response;
        })
        .catch(async () => (await matchAppShell()) || createOfflineResponse()),
    );
    return;
  }

  if (!isStaticAssetRequest(request, url)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (isCacheableResponse(response)) {
          event.waitUntil(
            putInCache(STATIC_CACHE, request, response.clone()),
          );
        }

        return response;
      })
      .catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match(request)) || Response.error();
      }),
  );
});
