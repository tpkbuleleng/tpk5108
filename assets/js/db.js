// ==========================================
// DATABASE LOKAL INDEXEDDB (DB.JS)
// ==========================================

const DB_NAME = 'TPKOfflineDB';
const DB_VERSION = 2;
const STORE_QUEUE = 'sync_queue';

window.DB = {
    db: null,

    async init() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Buat object store sync_queue bila belum ada
                if (!db.objectStoreNames.contains(STORE_QUEUE)) {
                    const store = db.createObjectStore(STORE_QUEUE, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    store.createIndex('action', 'action', { unique: false });
                    store.createIndex('created_at', 'created_at', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB gagal dibuka:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    async ensureReady() {
        if (!this.db) {
            await this.init();
        }
        return this.db;
    },

    async saveToQueue(action, payload = {}, meta = {}) {
        const db = await this.ensureReady();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_QUEUE, 'readwrite');
            const store = tx.objectStore(STORE_QUEUE);

            const item = {
                action,
                payload,
                meta,
                created_at: new Date().toISOString()
            };

            const req = store.add(item);

            req.onsuccess = () => resolve(true);
            req.onerror = (e) => {
                console.error('Gagal simpan queue:', e.target.error);
                reject(e.target.error);
            };
        });
    },

    async getAllQueue() {
        const db = await this.ensureReady();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_QUEUE, 'readonly');
            const store = tx.objectStore(STORE_QUEUE);
            const req = store.getAll();

            req.onsuccess = () => resolve(req.result || []);
            req.onerror = (e) => {
                console.error('Gagal baca queue:', e.target.error);
                reject(e.target.error);
            };
        });
    },

    async getQueueCount() {
        try {
            const db = await this.ensureReady();

            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_QUEUE, 'readonly');
                const store = tx.objectStore(STORE_QUEUE);
                const req = store.count();

                req.onsuccess = () => resolve(req.result || 0);
                req.onerror = (e) => {
                    console.error('Gagal hitung queue:', e.target.error);
                    reject(e.target.error);
                };
            });
        } catch (err) {
            console.warn('getQueueCount fallback ke 0:', err);
            return 0;
        }
    },

    async deleteQueueItem(id) {
        const db = await this.ensureReady();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_QUEUE, 'readwrite');
            const store = tx.objectStore(STORE_QUEUE);
            const req = store.delete(id);

            req.onsuccess = () => resolve(true);
            req.onerror = (e) => {
                console.error('Gagal hapus queue:', e.target.error);
                reject(e.target.error);
            };
        });
    },

    async clearQueue() {
        const db = await this.ensureReady();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_QUEUE, 'readwrite');
            const store = tx.objectStore(STORE_QUEUE);
            const req = store.clear();

            req.onsuccess = () => resolve(true);
            req.onerror = (e) => {
                console.error('Gagal clear queue:', e.target.error);
                reject(e.target.error);
            };
        });
    }
};

// Inisialisasi awal
window.DB.init().catch(err => {
    console.error('DB init gagal:', err);
});
