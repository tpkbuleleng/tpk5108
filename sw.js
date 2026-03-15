const CACHE_NAME = 'tpk-buleleng-v76';

const urlsToCache = [
  './',
  './index.html',
  './assets/css/app.css',
  './assets/js/core/00-init-state-db.js',
  './assets/js/core/10-wilayah-scope.js',
  './assets/js/core/20-catalog-source.js',
  './assets/js/core/30-backend-auth.js',
  './assets/js/admin/00-shell-dashboard.js',
  './assets/js/admin/10-rekap-management.js',
  './assets/js/shared/00-domain-utils.js',
  './assets/js/auth/00-nav-login-adminform.js',
  './assets/js/kader/10-registrasi-laporan.js',
  './assets/js/kader/20-data-rekap-sync.js',
  './logo-tpk26.png',
  './manifest.json',
  './data-wilayah.js',
  './data-kader.js',
  './data-pertanyaan.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const reqUrl = new URL(event.request.url);
  const isLocalCore = reqUrl.origin === self.location.origin && (
    reqUrl.pathname.endsWith('/index.html') ||
    reqUrl.pathname === '/' ||
    reqUrl.pathname.endsWith('/sw.js')
  );

  if (isLocalCore) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).then(networkResponse => {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return networkResponse;
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => {
      return Promise.all(keys.map(key => { if (key !== CACHE_NAME) return caches.delete(key); }));
  }));
});
























































