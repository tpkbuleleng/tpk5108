/* eslint-disable no-restricted-globals */
/*!
 * sw.js — Spesifikasi Implementasi Tahap 1
 * Project: TPK Kabupaten Buleleng
 *
 * TUJUAN
 * - Menjadikan service worker disiplin:
 *   1) cache app shell
 *   2) cache asset statis
 *   3) network-first untuk navigasi
 *   4) bypass total untuk endpoint privat / POST / login / submit
 *
 * BUKAN TUJUAN
 * - menyimpan response API privat
 * - menyimpan token / session
 * - cache data sasaran / detail / pendampingan
 *
 * CATATAN
 * - Versi cache sebaiknya ikut APP_VERSION frontend.
 * - Jangan auto refresh tab saat user sedang isi form.
 */

const APP_VERSION = 'TPK-VNEXT-STAGE1';
const APP_SHELL_CACHE = `tpk-app-shell-${APP_VERSION}`;
const STATIC_CACHE = `tpk-static-${APP_VERSION}`;
// const RUNTIME_SAFE_CACHE = `tpk-runtime-safe-${APP_VERSION}`; // disiapkan bila kelak perlu ref publik.

const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/app.css',
  '/manifest.webmanifest',
  // Tambahkan icon/logo inti yang benar-benar ada:
  // '/assets/logo.png',
  // Tambahkan file JS inti bila path statis final sudah pasti:
  // '/js/app.js',
  // '/js/config.js',
  // '/js/router.js'
];

const PRIVATE_PATH_PATTERNS = [
  '/exec',                 // umum untuk GAS web app route
  '/api/',                 // kalau ada proxy / future endpoint
  'action=login',
  'action=submit',
  'action=update',
  'action=getMySession',
  'action=getMyProfile',
  'action=submitPendampingan',
  'action=submitRegistrasiSasaran'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW install] gagal precache:', err);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (![APP_SHELL_CACHE, STATIC_CACHE].includes(key)) {
          return caches.delete(key);
        }
        return Promise.resolve(false);
      })
    );

    if (self.registration.navigationPreload) {
      try {
        await self.registration.navigationPreload.enable();
      } catch (err) {
        console.warn('[SW activate] navigation preload gagal:', err);
      }
    }

    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * Rule 1:
 * - Semua POST dibypass ke network.
 */
function isBypassRequest(request) {
  if (!request || request.method !== 'GET') return true;

  const url = new URL(request.url);

  // Hanya cache same-origin asset statis.
  // GAS beda origin dan endpoint privat sebaiknya dilewatkan langsung.
  if (PRIVATE_PATH_PATTERNS.some((token) => url.href.includes(token))) return true;

  return false;
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return ['style', 'script', 'image', 'font'].includes(request.destination)
    || url.pathname.endsWith('.css')
    || url.pathname.endsWith('.js')
    || url.pathname.endsWith('.png')
    || url.pathname.endsWith('.jpg')
    || url.pathname.endsWith('.jpeg')
    || url.pathname.endsWith('.svg')
    || url.pathname.endsWith('.webp')
    || url.pathname.endsWith('.woff2');
}

async function networkFirstNavigation(event) {
  try {
    const preload = await event.preloadResponse;
    if (preload) return preload;

    const fresh = await fetch(event.request);
    const cache = await caches.open(APP_SHELL_CACHE);
    cache.put('/index.html', fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await caches.match('/index.html');
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (isBypassRequest(request)) {
    return; // biarkan network biasa
  }

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(event));
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStatic(request));
  }
});
