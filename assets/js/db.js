// Konfigurasi Database
const DB_NAME = 'TpkBulelengDB';
const DB_VERSION = 2; // Naikkan versi karena kita tambah tabel baru

let dbInstance = null;

export const initDB = () => {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Gagal membuka IndexedDB:", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // --- TABEL DATA TRANSAKSI (INPUT KADER) ---
            if (!db.objectStoreNames.contains('sasaran')) {
                db.createObjectStore('sasaran', { keyPath: 'id_sasaran' });
            }
            if (!db.objectStoreNames.contains('laporan')) {
                const laporanStore = db.createObjectStore('laporan', { keyPath: 'id_laporan', autoIncrement: true });
                laporanStore.createIndex('id_sasaran', 'id_sasaran', { unique: false }); 
            }
            if (!db.objectStoreNames.contains('sync_queue')) {
                db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('kader_session')) {
                db.createObjectStore('kader_session', { keyPath: 'id_kader' });
            }

            // --- TABEL MASTER DATA (DARI GOOGLE SHEET) ---
            if (!db.objectStoreNames.contains('master_user')) {
                db.createObjectStore('master_user', { keyPath: 'username' });
            }
            if (!db.objectStoreNames.contains('master_kader')) {
                db.createObjectStore('master_kader', { keyPath: 'id_kader' });
            }
            if (!db.objectStoreNames.contains('master_wilayah')) {
                // Gunakan id_wilayah sebagai primary key
                db.createObjectStore('master_wilayah', { keyPath: 'id_wilayah' });
            }
            if (!db.objectStoreNames.contains('master_tim_wilayah')) {
                db.createObjectStore('master_tim_wilayah', { keyPath: 'id_tim_wilayah' });
            }
            if (!db.objectStoreNames.contains('master_pertanyaan')) {
                db.createObjectStore('master_pertanyaan', { keyPath: 'id_pertanyaan' });
            }
        };
    });
};

// ... (Sisa fungsi putData, getAllData, deleteData, getDataById biarkan SAMA seperti sebelumnya) ...

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

/**
 * FUNGSI BARU: Untuk menyimpan banyak data sekaligus (Batch Insert)
 * Sangat berguna saat download Master Data dari Google Sheet
 */
export const putBulkData = async (storeName, dataArray) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        dataArray.forEach(data => store.put(data));

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
};
