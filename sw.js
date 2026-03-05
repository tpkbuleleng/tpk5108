const CACHE_NAME = 'tpk-buleleng-v19';

const urlsToCache = [
  './',
  './index.html',
  './TPK BLL26.png',
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
  event.respondWith(caches.match(event.request).then(response => { return response || fetch(event.request); }));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => {
      return Promise.all(keys.map(key => { if (key !== CACHE_NAME) return caches.delete(key); }));
  }));
});



