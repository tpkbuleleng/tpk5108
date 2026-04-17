# Paket Implementasi Tahap 1 — TPK vNext

Paket ini berisi **spesifikasi implementasi + skeleton kontrak** untuk 6 file fondasi Tahap 1:

- `db.js`
- `queueRepo.js`
- `syncManager.js`
- `storage.js`
- `state.js`
- `sw.js`

## Tujuan Tahap 1
Membentuk fondasi yang aman dan stabil untuk:
- local data layer berbasis IndexedDB
- queue sinkronisasi formal
- state management terpisah
- localStorage yang dibatasi untuk data ringan
- service worker yang disiplin hanya untuk app shell dan asset statis

## Bukan target Tahap 1
Belum masuk ke:
- rewrite view besar-besaran
- conflict UI detail
- versioning backend penuh
- migrasi seluruh modul registrasi / pendampingan

## Urutan integrasi yang disarankan
1. `storage.js`
2. `state.js`
3. `db.js`
4. `queueRepo.js`
5. `syncManager.js`
6. `sw.js`

## Prinsip integrasi
- `storage.js` hanya untuk data kecil
- `db.js` untuk data operasional offline
- `queueRepo.js` adalah satu-satunya pintu mutasi queue
- `syncManager.js` adalah satu-satunya mesin sinkronisasi
- `sw.js` tidak boleh cache endpoint privat

## Catatan penting
Semua file di paket ini adalah **spec-first skeleton**:
- siap dijadikan dasar coding
- fungsi inti sudah dipetakan
- kontrak data sudah ditentukan
- masih perlu dihubungkan dengan file aktif TPK seperti `config.js`, `api.js`, `bootstrap.js`, `auth.js`, dan view terkait

## Mapping ke struktur TPK aktif
- `storage.js` → menggantikan wrapper localStorage lama yang terlalu generik
- `state.js` → memisahkan session/bootstrap/sync/ui
- `db.js` → menambah IndexedDB untuk draft, queue, audit, cache
- `queueRepo.js` → dipakai oleh registrasi, pendampingan, sync screen
- `syncManager.js` → dipanggil saat online, reconnect, atau sinkronisasi manual
- `sw.js` → memperkuat app shell, update lifecycle, dan kebijakan cache aman
