const CACHE_NAME = 'tpk-buleleng-cache-v6';

// Daftar file pondasi (App Shell) yang HARUS disimpan secara offline
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './assets/css/style.css',
    './assets/js/app.js',
    './assets/js/db.js',
    './assets/img/logo.png'
];

// 1. TAHAP INSTALL: Menyimpan semua aset ke Cache Browser
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Precaching App Shell...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(err => console.error('[Service Worker] Gagal caching:', err))
    );
    // Paksa SW baru untuk langsung aktif tanpa menunggu browser ditutup
    self.skipWaiting(); 
});

// 2. TAHAP ACTIVATE: Membersihkan sisa-sisa Cache dari versi sebelumnya
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Menghapus cache lama:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    // Ambil alih kontrol halaman secara instan
    return self.clients.claim();
});

// 3. TAHAP FETCH: Mencegat request saat aplikasi meminta file
self.addEventListener('fetch', event => {
    // Abaikan request selain GET (seperti POST untuk API)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // Jika file ada di cache, langsung kembalikan ke layar (Sangat Cepat!)
            if (cachedResponse) {
                // ...tapi diam-diam perbarui cache di latar belakang jika internet nyala (Stale-While-Revalidate)
                fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                }).catch(() => { /* Abaikan jika offline */ });

                return cachedResponse;
            }

            // Jika file TIDAK ada di cache, ambil dari internet
            return fetch(event.request).then(networkResponse => {
                // Jika berhasil diambil, simpan ke cache untuk ke depannya
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Jika gagal mengambil dari internet (karena offline), aplikasi tetap berjalan
                console.log('[Service Worker] Anda sedang offline dan file tidak ada di cache.');
            });
        })
    );
});
