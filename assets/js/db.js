// Konfigurasi Database
const DB_NAME = 'TpkBulelengDB';
const DB_VERSION = 1;

let dbInstance = null;

/**
 * 1. Inisialisasi Database dan Pembuatan Tabel (Object Store)
 */
export const initDB = () => {
    return new Promise((resolve, reject) => {
        // Jika DB sudah terbuka, langsung gunakan
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Jika terjadi error saat membuka DB
        request.onerror = (event) => {
            console.error("Gagal membuka IndexedDB:", event.target.error);
            reject(event.target.error);
        };

        // Jika berhasil dibuka
        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        // Ini hanya berjalan saat pertama kali aplikasi dibuka atau saat DB_VERSION naik
        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Tabel 1: Data Sasaran (Keluarga/Individu)
            if (!db.objectStoreNames.contains('sasaran')) {
                db.createObjectStore('sasaran', { keyPath: 'id_sasaran' });
            }

            // Tabel 2: Data Laporan Bulanan (Menggunakan Auto Increment)
            if (!db.objectStoreNames.contains('laporan')) {
                const laporanStore = db.createObjectStore('laporan', { keyPath: 'id_laporan', autoIncrement: true });
                // Membuat indeks agar kita bisa mencari laporan berdasarkan orangnya nanti
                laporanStore.createIndex('id_sasaran', 'id_sasaran', { unique: false }); 
            }

            // Tabel 3: Antrean Sinkronisasi (Data yang belum terkirim ke server/Google Sheet)
            if (!db.objectStoreNames.contains('sync_queue')) {
                db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
            }

            // Tabel 4: Keamanan Sesi Kader (Bisa login saat offline)
            if (!db.objectStoreNames.contains('kader_session')) {
                db.createObjectStore('kader_session', { keyPath: 'id_kader' });
            }
        };
    });
};

/**
 * 2. Fungsi Simpan / Update Data (Generic)
 * Bisa digunakan untuk menyimpan sasaran baru, laporan, atau menambah antrean sinkronisasi
 */
export const putData = async (storeName, data) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * 3. Fungsi Ambil Semua Data dari Tabel Tertentu
 * Sangat berguna untuk menampilkan daftar sasaran atau laporan di layar
 */
export const getAllData = async (storeName) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * 4. Fungsi Hapus Data
 * Akan dipanggil SETELAH data berhasil disinkronkan ke server agar memori browser kembali lega
 */
export const deleteData = async (storeName, id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
};

/**
 * 5. Fungsi Ambil Satu Data (Opsional, untuk login offline)
 */
export const getDataById = async (storeName, id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};