
const SW_VERSION = 'tpk-sw-stage1-v1';
const SHELL_CACHE = 'tpk-shell-' + SW_VERSION;
const ASSET_CACHE = 'tpk-assets-' + SW_VERSION;
const APP_SHELL = [
  './',
  './index.html',
  './app.css',
  './manifest.webmanifest',
  './assets/img/logo.png',
  './assets/img/logo-192.png',
  './js/config.js',
  './js/storage.js',
  './js/state.js',
  './js/api.js',
  './js/auth.js',
  './js/bootstrap.js',
  './js/ui.js',
  './js/app.js'
];

function isPrivateRequest(requestUrl, method) {
  const href = String(requestUrl || '');
  const upperMethod = String(method || 'GET').toUpperCase();

  if (upperMethod !== 'GET') return true;
  if (/script\.google\.com/i.test(href)) return true;
  if (/script\.googleusercontent\.com/i.test(href)) return true;
  if (/\/exec(\?|$)/i.test(href)) return true;

  return false;
}

function isSameOriginAsset(url) {
  return url.origin === self.location.origin &&
    /\.(?:css|js|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|eot|json|webmanifest)$/i.test(url.pathname);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => {
      if (key !== SHELL_CACHE && key !== ASSET_CACHE) {
        return caches.delete(key);
      }
      return Promise.resolve();
    }));

    if ('navigationPreload' in self.registration) {
      try {
        await self.registration.navigationPreload.enable();
      } catch (err) {}
    }

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (isPrivateRequest(url.href, request.method)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;

        const network = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put(request, network.clone());
        return network;
      } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return caches.match('./index.html');
      }
    })());
    return;
  }

  if (isSameOriginAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(request);

      const networkPromise = fetch(request).then((response) => {
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => null);

      return cached || networkPromise || fetch(request);
    })());
  }
});
