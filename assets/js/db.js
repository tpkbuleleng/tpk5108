const DB_NAME = 'TpkBulelengDB';
const DB_VERSION = 3; // Naikkan versi ke 3

let dbInstance = null;

export const initDB = () => {
    return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Hapus store lama jika ada untuk pembersihan struktur
            const stores = [
                { name: 'master_user', key: 'username' },
                { name: 'master_kader', key: 'id_kader' },
                { name: 'master_wilayah', key: 'id_wilayah' },
                { name: 'master_tim_wilayah', key: 'id_tim_wilayah' },
                { name: 'master_pertanyaan', key: 'id_pertanyaan' },
                { name: 'kader_session', key: 'id_kader' },
                { name: 'sync_queue', key: 'id' }
            ];

            stores.forEach(s => {
                if (!db.objectStoreNames.contains(s.name)) {
                    db.createObjectStore(s.name, { keyPath: s.key });
                }
            });
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => reject(event.target.error);
    });
};

// Fungsi Helper Standar
export const putData = async (storeName, data) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(data);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const putBulkData = async (storeName, dataArray) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        dataArray.forEach(item => store.put(item));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getDataById = async (storeName, id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getAllData = async (storeName) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const deleteData = async (storeName, id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => resolve();
    });
};
