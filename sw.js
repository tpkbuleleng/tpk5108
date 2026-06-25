const SW_VERSION = 'tpk-sw-harganas-4a-r3-20260625-01';
const SHELL_CACHE = 'tpk-shell-' + SW_VERSION;
const ASSET_CACHE = 'tpk-assets-' + SW_VERSION;

// 3C-R4 shell diet tetap mengikuti 3C-R2/R3:
// Precache hanya aset minimum untuk menampilkan halaman login.
// Router, bootstrap, ui, view, db, queueRepo, dan syncManager tidak dipaksa precache saat cold start.
// File tersebut akan masuk runtime cache setelah benar-benar dibutuhkan.
const APP_SHELL = [
  './',
  './index.html',
  './app.css',
  './css/harganas-landing-1c.css',
  './manifest.webmanifest',
  './assets/img/logo.png',
  './assets/img/logo-192.png',
  './js/config.js',
  './js/utils.js',
  './js/storage.js',
  './js/state.js',
  './js/api.js',
  './js/auth.js',
  './js/app.js',
  './js/services/harganasWatermarkService.js',
  './js/views/appLandingView.js',
  './js/services/harganasValidationService.js',
  './js/services/harganasDraftService.js',
  './js/services/harganasGpsService.js',
  './js/services/harganasMediaService.js',
  './js/services/harganasWatermarkService.js',
  './js/services/harganasVideoService.js',
  './js/services/harganasUploadService.js',
  './js/views/harganasView.js'
];

function isPrivateRequest(requestUrl, method) {
  const href = String(requestUrl || '');
  const upperMethod = String(method || 'GET').toUpperCase();

  if (upperMethod !== 'GET') return true;
  if (/script\.google\.com/i.test(href)) return true;
  if (/script\.googleusercontent\.com/i.test(href)) return true;
  if (/\/exec(\?|$)/i.test(href)) return true;
  if (/\/api\//i.test(href)) return true;

  return false;
}

function isSameOriginAsset(url) {
  return url.origin === self.location.origin &&
    /\.(?:css|js|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|eot|json|webmanifest)$/i.test(url.pathname);
}

async function safeCacheShell() {
  const cache = await caches.open(SHELL_CACHE);

  await Promise.all(APP_SHELL.map(async (asset) => {
    try {
      await cache.add(asset);
    } catch (err) {
      // Asset opsional tidak boleh membuat SW gagal install.
    }
  }));
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach((client) => {
    try { client.postMessage(message); } catch (err) {}
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await safeCacheShell();
    await self.skipWaiting();
  })());
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
      try { await self.registration.navigationPreload.enable(); } catch (err) {}
    }

    await self.clients.claim();
    await notifyClients({ type: 'TPK_SW_ACTIVATED', version: SW_VERSION });
  })());
});

self.addEventListener('message', (event) => {
  const data = event && event.data ? event.data : {};
  if (data && data.type === 'TPK_SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // API privat dan request POST tidak pernah dicache service worker.
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
        cache.put('./index.html', network.clone());
        return network;
      } catch (err) {
        const cachedRequest = await caches.match(request);
        if (cachedRequest) return cachedRequest;
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

      if (cached) return cached;

      const network = await networkPromise;
      if (network) return network;

      return fetch(request);
    })());
  }
});
