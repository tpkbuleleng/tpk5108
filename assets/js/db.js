const DB_NAME = 'TPK_Buleleng_DB';
const DB_VERSION = 7; // 🔥 Naikkan ke Versi 7 untuk menyuntikkan MASTER_PKB

export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            
            if (db.objectStoreNames.contains('master_user')) db.deleteObjectStore('master_user');
            if (db.objectStoreNames.contains('master_admin')) db.deleteObjectStore('master_admin');

            const stores = [
                'master_kader', 'master_tim', 'master_tim_wilayah',
                'master_pertanyaan', 'master_wilayah_bali', 'standar_antropometri', 
                'master_kembang', 'master_wilayah', 'master_menu', 'master_widget',
                'master_pkb' // 🚀 INJEKSI TABEL PKB
            ];
            stores.forEach(store => { if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { autoIncrement: true }); });
            if (!db.objectStoreNames.contains('kader_session')) db.createObjectStore('kader_session', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('sync_queue')) db.createObjectStore('sync_queue', { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const putData = async (storeName, data) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite'); const store = tx.objectStore(storeName);
        if (Array.isArray(data)) {
            if (storeName !== 'sync_queue' && storeName !== 'kader_session') store.clear(); 
            data.forEach(item => store.put(item));
        } else { store.put(data); }
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
};

export const getAllData = async (storeName) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly'); const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
};

export const getDataById = async (storeName, id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly'); const req = tx.objectStore(storeName).get(id);
        req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
};

export const deleteData = async (storeName, id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite'); const req = tx.objectStore(storeName).delete(id);
        req.onsuccess = () => resolve(); req.onerror = () => reject(req.error);
    });
};

export const clearStore = async (storeName) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite'); const req = tx.objectStore(storeName).clear();
        req.onsuccess = () => resolve(); req.onerror = () => reject(req.error);
    });
};
