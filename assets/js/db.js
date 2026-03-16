const DB_NAME = 'TPKBulelengDB';
const DB_VERSION = 3; // Versi 3: Adaptif terhadap perubahan nama kolom Excel

export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            
            if (!db.objectStoreNames.contains('kader_session')) db.createObjectStore('kader_session', { keyPath: 'id_kader' });
            if (!db.objectStoreNames.contains('sync_queue')) db.createObjectStore('sync_queue', { keyPath: 'id' });
            
            // Dibuat autoIncrement agar tidak terikat dengan nama kolom Header Excel
            if (!db.objectStoreNames.contains('master_user')) db.createObjectStore('master_user', { autoIncrement: true });
            if (!db.objectStoreNames.contains('master_kader')) db.createObjectStore('master_kader', { autoIncrement: true });
            if (!db.objectStoreNames.contains('master_tim')) db.createObjectStore('master_tim', { autoIncrement: true });
            if (!db.objectStoreNames.contains('master_tim_wilayah')) db.createObjectStore('master_tim_wilayah', { autoIncrement: true });
            if (!db.objectStoreNames.contains('master_pertanyaan')) db.createObjectStore('master_pertanyaan', { autoIncrement: true });
            if (!db.objectStoreNames.contains('master_wilayah_bali')) db.createObjectStore('master_wilayah_bali', { autoIncrement: true });
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
};

export const putData = async (storeName, data) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(data);
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
    });
};

export const getDataById = async (storeName, id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
    });
};

export const getAllData = async (storeName) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
    });
};

export const deleteData = async (storeName, id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
    });
};

export const clearStore = async (storeName) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
    });
};
