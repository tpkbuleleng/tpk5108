const CACHE_NAME = 'tpk-buleleng-v2-1-0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/theme.css',
  './assets/css/app.css',
  './js/app-config.js',
  './js/storage.js',
  './js/session.js',
  './js/notifier.js',
  './js/validators.js',
  './js/ui-helpers.js',
  './js/api.js',
  './js/auth.js',
  './js/bootstrap.js',
  './js/router.js',
  './js/offline-sync.js',
  './js/menu.js',
  './js/dynamic-form.js',
  './js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
    ))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
