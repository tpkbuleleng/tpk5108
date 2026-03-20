const CACHE_NAME = 'tpk-buleleng-v2'; // Naikkan versi cache
const urlsToCache = [
  './',
  './index.html',
  './assets/js/app.js',
  './assets/js/admin.js',
  './assets/js/db.js',
  './assets/js/sync.js'
  // Tambahkan file CSS/Gambar lain jika ada
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Memaksa SW baru langsung aktif
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // Hapus cache versi lama
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // 🔥 KUNCI PENYELAMAT: Jika request menuju Google Script, BIARKAN LEWAT! Jangan dicegat!
  if (event.request.url.includes('script.google.com')) {
    return; // Langsung return, biarkan browser yang menangani koneksi aslinya
  }

  // Untuk file lainnya (HTML, JS, CSS), gunakan strategi Cache First
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(() => {
      // Fallback jika offline dan tidak ada di cache
      return new Response('Aplikasi sedang offline dan data tidak ditemukan di cache.');
    })
  );
});
