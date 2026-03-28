const CACHE_NAME = 'tpk-buleleng-vfinal19'; // Kode versi, ubah angka jika ada update besar
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './assets/css/style.css',
    './assets/js/app.js',
    './assets/js/db.js',
    './assets/js/sync.js',
    './assets/img/logo.png',
    './manifest.json'
];

// 1. INSTALASI: Masukkan semua senjata utama ke dalam Gudang Cache
self.addEventListener('install', event => {
    self.skipWaiting(); // Paksa langsung aktif
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
});

// 2. AKTIVASI: Hapus gudang senjata versi lama (jika ada update)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. PENGHADANGAN (INTERCEPTOR): Logika Mode Offline
self.addEventListener('fetch', event => {
    // Abaikan lalu lintas radar ke Google Sheet agar tidak dicache paksa
    if (event.request.url.includes('script.google.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // Jika file ada di memori lokal, langsung berikan (SUPER CEPAT & BISA OFFLINE)
            if (cachedResponse) {
                return cachedResponse;
            }

            // Jika tidak ada di memori, coba sedot dari internet
            return fetch(event.request).then(networkResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    // Simpan file baru ke memori untuk offline selanjutnya (Dynamic Caching)
                    if(event.request.method === 'GET') {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            }).catch(() => {
                // 🔥 DOKTRIN UTAMA: Jika offline total dan file tidak ada, 
                // JANGAN tampilkan halaman error/offline, tapi PAKSA kembalikan ke index.html!
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
