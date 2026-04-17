/*!
 * db.js — Spesifikasi Implementasi Tahap 1
 * Project: TPK Kabupaten Buleleng
 *
 * TUJUAN
 * - Menjadi wrapper IndexedDB untuk data operasional offline.
 * - Menyimpan draft, queue, cache bootstrap besar, audit lokal, dan cache sasaran ringan.
 * - Menyediakan upgrade schema yang aman.
 *
 * STORE FINAL TAHAP 1
 * - meta
 * - bootstrap_cache
 * - sasaran_cache
 * - draft_registrasi
 * - draft_pendampingan
 * - sync_queue
 * - sync_result_log
 * - audit_log_local
 *
 * CATATAN
 * - Semua operasi async berbasis Promise.
 * - Semua key yang mungkin dicari cepat harus punya index.
 * - Storage persisten browser sebaiknya diminta di bootstrap tahap berikutnya.
 */

(function (window) {
  'use strict';

  const DB_NAME = 'TPK_VNEXT_DB';
  const DB_VERSION = 1;

  const STORES = {
    META: 'meta',
    BOOTSTRAP_CACHE: 'bootstrap_cache',
    SASARAN_CACHE: 'sasaran_cache',
    DRAFT_REGISTRASI: 'draft_registrasi',
    DRAFT_PENDAMPINGAN: 'draft_pendampingan',
    SYNC_QUEUE: 'sync_queue',
    SYNC_RESULT_LOG: 'sync_result_log',
    AUDIT_LOG_LOCAL: 'audit_log_local'
  };

  let dbPromise = null;

  function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    });
  }

  function openDb() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORES.META)) {
          db.createObjectStore(STORES.META, { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains(STORES.BOOTSTRAP_CACHE)) {
          const store = db.createObjectStore(STORES.BOOTSTRAP_CACHE, { keyPath: 'cache_key' });
          store.createIndex('updated_at', 'updated_at', { unique: false });
          store.createIndex('expires_at', 'expires_at', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SASARAN_CACHE)) {
          const store = db.createObjectStore(STORES.SASARAN_CACHE, { keyPath: 'id_sasaran' });
          store.createIndex('id_tim', 'id_tim', { unique: false });
          store.createIndex('updated_at', 'updated_at', { unique: false });
          store.createIndex('sync_state', 'sync_state', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.DRAFT_REGISTRASI)) {
          const store = db.createObjectStore(STORES.DRAFT_REGISTRASI, { keyPath: 'draft_id' });
          store.createIndex('id_user', 'id_user', { unique: false });
          store.createIndex('id_tim', 'id_tim', { unique: false });
          store.createIndex('updated_at', 'updated_at', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.DRAFT_PENDAMPINGAN)) {
          const store = db.createObjectStore(STORES.DRAFT_PENDAMPINGAN, { keyPath: 'draft_id' });
          store.createIndex('id_user', 'id_user', { unique: false });
          store.createIndex('id_tim', 'id_tim', { unique: false });
          store.createIndex('id_sasaran', 'id_sasaran', { unique: false });
          store.createIndex('updated_at', 'updated_at', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'queue_id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('action', 'action', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('updated_at', 'updated_at', { unique: false });
          store.createIndex('client_submit_id', 'client_submit_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_RESULT_LOG)) {
          const store = db.createObjectStore(STORES.SYNC_RESULT_LOG, { keyPath: 'result_id' });
          store.createIndex('queue_id', 'queue_id', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.AUDIT_LOG_LOCAL)) {
          const store = db.createObjectStore(STORES.AUDIT_LOG_LOCAL, { keyPath: 'event_id' });
          store.createIndex('event_type', 'event_type', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Gagal membuka IndexedDB'));
    });

    return dbPromise;
  }

  async function tx(storeName, mode = 'readonly') {
    const db = await openDb();
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  const LocalDb = {
    DB_NAME,
    DB_VERSION,
    STORES,

    async open() {
      return openDb();
    },

    async get(storeName, key) {
      const store = await tx(storeName, 'readonly');
      return promisifyRequest(store.get(key));
    },

    async put(storeName, value) {
      const store = await tx(storeName, 'readwrite');
      return promisifyRequest(store.put(value));
    },

    async add(storeName, value) {
      const store = await tx(storeName, 'readwrite');
      return promisifyRequest(store.add(value));
    },

    async delete(storeName, key) {
      const store = await tx(storeName, 'readwrite');
      return promisifyRequest(store.delete(key));
    },

    async getAll(storeName) {
      const store = await tx(storeName, 'readonly');
      return promisifyRequest(store.getAll());
    },

    async clear(storeName) {
      const store = await tx(storeName, 'readwrite');
      return promisifyRequest(store.clear());
    },

    /**
     * Ambil data dari index tertentu.
     * Untuk batch besar, idealnya nanti pakai cursor.
     */
    async getAllByIndex(storeName, indexName, query) {
      const db = await openDb();
      const store = db.transaction(storeName, 'readonly').objectStore(storeName);
      const index = store.index(indexName);
      return promisifyRequest(index.getAll(query));
    },

    /**
     * TODO tahap 2:
     * - countByIndex
     * - cursor pagination
     * - requestPersistentStorage()
     * - cleanup expired bootstrap cache
     */
  };

  window.LocalDb = LocalDb;
})(window);
