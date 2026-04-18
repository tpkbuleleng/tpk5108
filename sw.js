const APP_SHELL_CACHE = 'tpk-shell-v2-1-2';
const STATIC_CACHE = 'tpk-static-v2-1-2';
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './app.css',
  './manifest.webmanifest',
  './js/config.js',
  './js/utils.js',
  './js/storage.js',
  './js/state.js',
  './js/api.js',
  './js/auth.js',
  './js/router.js',
  './js/bootstrap.js',
  './js/ui.js',
  './js/app.js',
  './assets/img/logo.png',
  './assets/img/logo-192.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(function(cache) {
        return cache.addAll(APP_SHELL_ASSETS);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) {
            return key !== APP_SHELL_CACHE && key !== STATIC_CACHE;
          })
          .map(function(key) {
            return caches.delete(key);
          })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.indexOf('/exec') !== -1 || url.hostname.indexOf('script.google') !== -1 || url.hostname.indexOf('googleusercontent.com') !== -1) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(function() {
        return caches.match('./index.html');
      })
    );
    return;
  }

  if (/\.(png|jpg|jpeg|webp|svg|gif|css|js|html|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(function(cached) {
        var networkFetch = fetch(request).then(function(response) {
          if (response && response.ok) {
            var clone = response.clone();
            caches.open(STATIC_CACHE).then(function(cache) {
              cache.put(request, clone);
            });
          }
          return response;
        }).catch(function() {
          return cached;
        });

        return cached || networkFetch;
      })
    );
  }
});
