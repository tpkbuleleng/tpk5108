# TPK vNext Tahap 1 — Plug-and-Play

Paket ini sudah disesuaikan ke pola frontend TPK aktif:
- tetap membaca `window.APP_CONFIG.STORAGE_KEYS`
- tetap mendukung helper lama seperti `getStorageKeys()`, `getSessionToken()`, `hasSessionToken()`, `getProfileFromStorage()`
- tetap kompatibel dengan pola antrean lama `OfflineSync`, tetapi sumber data utamanya dipindah ke IndexedDB
- service worker hanya cache app shell dan asset statis, bukan data privat API

## Urutan muat yang disarankan
Tambahkan file baru ini sebelum `app.js`:
1. `storage.js` (replace)
2. `state.js` (baru)
3. `db.js` (baru)
4. `queueRepo.js` (baru)
5. `syncManager.js` (baru)
6. `sw.js` (replace di root frontend)

## Catatan integrasi
- `syncManager.js` otomatis memasang bridge `window.OfflineSync` agar modul lama tetap bisa memanggil `syncAll`, `retryOne`, dan `add`.
- `queueRepo.js` otomatis migrasi antrean lama dari localStorage key `APP_CONFIG.STORAGE_KEYS.SYNC_QUEUE` ke IndexedDB satu kali.
- `state.js` otomatis membaca token, profile, bootstrap cache, dan UI prefs yang sudah ada.
