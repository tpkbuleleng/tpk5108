# TPK vNext - Tahap 1 Kode Final Siap Tempel

Urutan tempel yang paling aman:
1. `storage.js`
2. `state.js`
3. `db.js`
4. `queueRepo.js`
5. `syncManager.js`
6. `sw.js`

## Catatan integrasi
- Semua file ini memakai pola global `window.*` agar cocok dengan frontend TPK sekarang.
- `syncManager.js` mengandalkan `window.Api.post(action, payload, meta)`.
- `sw.js` hanya untuk app shell dan asset. Jangan tambahkan endpoint privat ke cache.
- Jika `APP_CONFIG.APP_VERSION` sudah ada, sesuaikan `APP_VERSION` di `sw.js` saat rilis.

## Kontrak minimum yang diharapkan sudah ada
- `window.APP_CONFIG`
- `window.Api.post`
- `window.StorageHelper`
- `window.AppState`

## Langkah sesudah tempel
- Hubungkan form registrasi ke `QueueRepo.enqueue(...)`
- Hubungkan form pendampingan ke `QueueRepo.enqueue(...)`
- Panggil `SyncManager.initAutoSync()` dari `app.js` atau `bootstrap.js`
- Daftarkan `sw.js` dari `app.js`