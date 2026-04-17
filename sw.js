/* eslint-disable no-restricted-globals */
'use strict';

const APP_VERSION = '2.1.0-vnext-stage1';
const SHELL_CACHE = `tpk-shell-${APP_VERSION}`;
const RUNTIME_CACHE = `tpk-runtime-${APP_VERSION}`;
const OFFLINE_URL = '/index.html';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/app.css',
  '/manifest.webmanifest',
  '/js/app.js',
  '/js/config.js',
  '/js/router.js',
  '/js/state.js',
  '/js/storage.js',
  '/js/db.js',
  '/js/queueRepo.js',
  '/js/syncManager.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/bootstrap.js',
  '/js/ui.js',
  '/js/ui-helpers.js',
  '/js/utils.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key))
    );

    if ('navigationPreload' in self.registration) {
      try {
        await self.registration.navigationPreload.enable();
      } catch (err) {
        // Ignore unsupported or failed preload enable.
      }
    }

    await self.clients.claim();
    await notifyClients({ type: 'SW_ACTIVATED', version: APP_VERSION });
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (data && data.type === 'CLEAR_RUNTIME_CACHE') {
    event.waitUntil(caches.delete(RUNTIME_CACHE));
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (isApiRequest(url) || isPrivateDataRequest(url)) {
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
    const preloadResponse = await event.preloadResponse;
    if (preloadResponse) {
      return preloadResponse;
    }

    const networkResponse = await fetch(event.request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(event.request, networkResponse.clone());
    return networkResponse;
  } catch (err) {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    const shellFallback = await caches.match(OFFLINE_URL);
    return shellFallback || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  const cache = await caches.open(RUNTIME_CACHE);
  cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || Response.error();
  }
}

function isApiRequest(url) {
  return /googleapis\.com|script\.google\.com|script\.googleusercontent\.com/i.test(url.hostname)
    || url.pathname.indexOf('/api/') === 0;
}

function isPrivateDataRequest(url) {
  const blockedPatterns = [
    '/login',
    '/logout',
    '/session',
    '/bootstrap',
    '/profile',
    '/sasaran',
    '/pendampingan',
    '/submit',
    '/update'
  ];
  return blockedPatterns.some((pattern) => url.pathname.toLowerCase().indexOf(pattern) >= 0);
}

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.jpeg') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.ico')
    )
  );
}

async function notifyClients(payload) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(payload));
}
