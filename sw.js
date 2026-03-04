const CACHE_NAME = 'tpk-buleleng-v1';

// Daftar file yang wajib di-download dan disimpan ke memori HP (Cache) saat pertama kali buka
const urlsToCache = [
  './',
  './index.html',
  './TPK BLL26.png',
  './manifest.json'
];

// Saat aplikasi pertama kali diinstal
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache terbuka, menyimpan aset dasar...');
        return cache.addAll(urlsToCache);
      })
  );
});

// Saat aplikasi dibuka tanpa internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika file ada di Cache memori HP, tampilkan itu!
        if (response) {
            return response;
        }
        // Jika tidak ada di memori HP, baru ambil dari Internet
        return fetch(event.request);
      })
  );
});