// ==========================================
// DATABASE LOKAL (INDEXED DB - DB.JS)
// ==========================================

const DB_CONFIG = {
    NAME: 'TPK_Buleleng_Offline_DB',
    VERSION: 1,
    STORE_QUEUE: 'sync_queue'
};

const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.VERSION);

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Buat tabel antrean jika belum ada
        if (!db.objectStoreNames.contains(DB_CONFIG.STORE_QUEUE)) {
            db.createObjectStore(DB_CONFIG.STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
        }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

window.DB = {
    async saveToQueue(action, payload, meta) {
        const db = await dbPromise;
        const tx = db.transaction(DB_CONFIG.STORE_QUEUE, 'readwrite');
        const store = tx.objectStore(DB_CONFIG.STORE_QUEUE);
        
        const item = { 
            action: action, 
            payload: payload, 
            meta: meta, 
            timestamp: new Date().toISOString() 
        };
        
        store.add(item);
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    },

    async getQueue() {
        const db = await dbPromise;
        const tx = db.transaction(DB_CONFIG.STORE_QUEUE, 'readonly');
        const store = tx.objectStore(DB_CONFIG.STORE_QUEUE);
        const request = store.getAll();

        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve([]);
        });
    },

    async deleteFromQueue(id) {
        const db = await dbPromise;
        const tx = db.transaction(DB_CONFIG.STORE_QUEUE, 'readwrite');
        tx.objectStore(DB_CONFIG.STORE_QUEUE).delete(id);
        return new Promise(resolve => tx.oncomplete = () => resolve(true));
    },

    async clearStore(storeName) {
        const db = await dbPromise;
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        return new Promise(resolve => tx.oncomplete = () => resolve(true));
    }
};
