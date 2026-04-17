/* eslint-disable no-restricted-globals */
'use strict';

var APP_VERSION = 'tpk-vnext-stage1-plug-20260417-01';
var SHELL_CACHE = 'tpk-shell-' + APP_VERSION;
var RUNTIME_CACHE = 'tpk-runtime-' + APP_VERSION;
var OFFLINE_FALLBACKS = ['/', '/index.html'];

var PRECACHE_CANDIDATES = [
  '/',
  '/index.html',
  '/app.css',
  '/manifest.webmanifest',
  '/manifest.json',
  '/js/app.js',
  '/js/app-config.js',
  '/js/config.js',
  '/js/storage.js',
  '/js/session.js',
  '/js/notifier.js',
  '/js/ui-helpers.js',
  '/js/client-id.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/bootstrap.js',
  '/js/router.js',
  '/js/state.js',
  '/js/db.js',
  '/js/queueRepo.js',
  '/js/syncManager.js',
  '/assets/js/app.js',
  '/assets/js/app-config.js',
  '/assets/js/storage.js',
  '/assets/js/session.js',
  '/assets/js/notifier.js',
  '/assets/js/ui-helpers.js',
  '/assets/js/client-id.js',
  '/assets/js/api.js',
  '/assets/js/auth.js',
  '/assets/js/bootstrap.js',
  '/assets/js/router.js',
  '/assets/js/state.js',
  '/assets/js/db.js',
  '/assets/js/queueRepo.js',
  '/assets/js/syncManager.js',
  '/assets/css/style.css',
  '/logo.png',
  '/assets/img/logo.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil((async function () {
    var cache = await caches.open(SHELL_CACHE);
    for (var i = 0; i < PRECACHE_CANDIDATES.length; i += 1) {
      try {
        await cache.add(new Request(PRECACHE_CANDIDATES[i], { cache: 'reload' }));
      } catch (err) {
        // Abaikan file yang memang tidak ada pada struktur aktif.
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.filter(function (key) {
      return key !== SHELL_CACHE && key !== RUNTIME_CACHE;
    }).map(function (key) {
      return caches.delete(key);
    }));

    if (self.registration && self.registration.navigationPreload) {
      try {
        await self.registration.navigationPreload.enable();
      } catch (err) {
        // no-op
      }
    }

    await self.clients.claim();
    await notifyClients({ type: 'SW_ACTIVATED', version: APP_VERSION });
  })());
});

self.addEventListener('message', function (event) {
  var data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'CLEAR_RUNTIME_CACHE') {
    event.waitUntil(caches.delete(RUNTIME_CACHE));
  }
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);

  if (isApiRequest(url) || isPrivateDataRequest(url) || !isCacheableOrigin(url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function handleNavigationRequest(event) {
  try {
    var preloadResponse = await event.preloadResponse;
    if (preloadResponse) return preloadResponse;

    var networkResponse = await fetch(event.request);
    var runtime = await caches.open(RUNTIME_CACHE);
    runtime.put(event.request, networkResponse.clone());
    return networkResponse;
  } catch (err) {
    var cachedPage = await caches.match(event.request);
    if (cachedPage) return cachedPage;

    for (var i = 0; i < OFFLINE_FALLBACKS.length; i += 1) {
      var fallback = await caches.match(OFFLINE_FALLBACKS[i]);
      if (fallback) return fallback;
    }

    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirst(request) {
  var cached = await caches.match(request);
  if (cached) return cached;

  var response = await fetch(request);
  if (response && response.ok) {
    var runtime = await caches.open(RUNTIME_CACHE);
    runtime.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    var response = await fetch(request);
    if (response && response.ok) {
      var runtime = await caches.open(RUNTIME_CACHE);
      runtime.put(request, response.clone());
    }
    return response;
  } catch (err) {
    var cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

function isApiRequest(url) {
  return /script\.google\.com|script\.googleusercontent\.com|googleapis\.com/i.test(url.hostname) ||
    url.pathname.indexOf('/api/') === 0;
}

function isPrivateDataRequest(url) {
  var lower = url.pathname.toLowerCase();
  var blocked = [
    '/login',
    '/logout',
    '/session',
    '/bootstrap',
    '/profile',
    '/sasaran',
    '/pendampingan',
    '/submit',
    '/update',
    '/sync'
  ];
  return blocked.some(function (pattern) { return lower.indexOf(pattern) >= 0; });
}

function isCacheableOrigin(url) {
  return url.origin === self.location.origin;
}

function isStaticAsset(url) {
  return /\.(?:css|js|png|jpg|jpeg|svg|webp|woff2|ico|json)$/i.test(url.pathname);
}

async function notifyClients(payload) {
  var clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(function (client) {
    client.postMessage(payload);
  });
}
