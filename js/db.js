(function (window) {
  'use strict';

  const DB_NAME = 'TPK_VNEXT_DB';
  const DB_VERSION = 1;
  let dbPromise = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    const part = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix || 'ID'}-${Date.now()}-${part}`;
  }

  function openDb() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = function () {
        reject(request.error || new Error('Failed to open IndexedDB'));
      };

      request.onupgradeneeded = function (event) {
        const db = event.target.result;

        createStore(db, 'meta', 'key');
        createStore(db, 'bootstrap_cache', 'cache_key', [
          ['updated_at', 'updated_at', false],
          ['expires_at', 'expires_at', false]
        ]);
        createStore(db, 'sasaran_cache', 'id_sasaran', [
          ['by_tim', 'id_tim', false],
          ['by_status', 'status_sasaran', false],
          ['updated_at', 'updated_at', false]
        ]);
        createStore(db, 'draft_registrasi', 'draft_id', [
          ['by_user', 'id_user', false],
          ['by_tim', 'id_tim', false],
          ['updated_at', 'updated_at', false]
        ]);
        createStore(db, 'draft_pendampingan', 'draft_id', [
          ['by_user', 'id_user', false],
          ['by_tim', 'id_tim', false],
          ['by_sasaran', 'id_sasaran', false],
          ['updated_at', 'updated_at', false]
        ]);
        createStore(db, 'sync_queue', 'queue_id', [
          ['by_status', 'status', false],
          ['by_action', 'action', false],
          ['by_user', 'id_user', false],
          ['by_tim', 'id_tim', false],
          ['created_at', 'created_at', false],
          ['updated_at', 'updated_at', false],
          ['by_client_submit_id', 'client_submit_id', true]
        ]);
        createStore(db, 'sync_result_log', 'result_id', [
          ['by_queue_id', 'queue_id', false],
          ['created_at', 'created_at', false]
        ]);
        createStore(db, 'audit_log_local', 'event_id', [
          ['event_type', 'event_type', false],
          ['created_at', 'created_at', false]
        ]);
      };

      request.onsuccess = function () {
        const db = request.result;
        db.onversionchange = function () {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
    });

    return dbPromise;
  }

  function createStore(db, storeName, keyPath, indexes) {
    if (db.objectStoreNames.contains(storeName)) return;
    const store = db.createObjectStore(storeName, { keyPath });
    (indexes || []).forEach(([indexName, path, unique]) => {
      store.createIndex(indexName, path, { unique: !!unique });
    });
  }

  function txComplete(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = function () { resolve(true); };
      transaction.onerror = function () { reject(transaction.error || new Error('Transaction failed')); };
      transaction.onabort = function () { reject(transaction.error || new Error('Transaction aborted')); };
    });
  }

  async function withStore(storeName, mode, runner) {
    const db = await openDb();
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = await runner(store, transaction);
    await txComplete(transaction);
    return result;
  }

  function idbRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('IndexedDB request failed')); };
    });
  }

  async function getAllByIndex(storeName, indexName, value) {
    return withStore(storeName, 'readonly', async (store) => {
      const index = store.index(indexName);
      return idbRequest(index.getAll(value));
    });
  }

  async function getAll(storeName) {
    return withStore(storeName, 'readonly', async (store) => idbRequest(store.getAll()));
  }

  const TpkDb = {
    DB_NAME,
    DB_VERSION,
    STORES: {
      META: 'meta',
      BOOTSTRAP: 'bootstrap_cache',
      SASARAN_CACHE: 'sasaran_cache',
      DRAFT_REGISTRASI: 'draft_registrasi',
      DRAFT_PENDAMPINGAN: 'draft_pendampingan',
      SYNC_QUEUE: 'sync_queue',
      SYNC_RESULT_LOG: 'sync_result_log',
      AUDIT_LOG: 'audit_log_local'
    },

    nowIso,
    makeId,

    async open() {
      return openDb();
    },

    async put(storeName, record) {
      return withStore(storeName, 'readwrite', async (store) => {
        const next = { ...(record || {}) };
        if (!next.updated_at) next.updated_at = nowIso();
        store.put(next);
        return next;
      });
    },

    async bulkPut(storeName, records) {
      return withStore(storeName, 'readwrite', async (store) => {
        const items = (records || []).map((record) => {
          const next = { ...(record || {}) };
          if (!next.updated_at) next.updated_at = nowIso();
          store.put(next);
          return next;
        });
        return items;
      });
    },

    async get(storeName, key) {
      return withStore(storeName, 'readonly', async (store) => idbRequest(store.get(key)));
    },

    async getAll(storeName) {
      return getAll(storeName);
    },

    async getAllByIndex(storeName, indexName, value) {
      return getAllByIndex(storeName, indexName, value);
    },

    async delete(storeName, key) {
      return withStore(storeName, 'readwrite', async (store) => {
        store.delete(key);
        return true;
      });
    },

    async clear(storeName) {
      return withStore(storeName, 'readwrite', async (store) => {
        store.clear();
        return true;
      });
    },

    async count(storeName) {
      return withStore(storeName, 'readonly', async (store) => idbRequest(store.count()));
    },

    async update(storeName, key, updater) {
      return withStore(storeName, 'readwrite', async (store) => {
        const current = await idbRequest(store.get(key));
        const next = typeof updater === 'function'
          ? updater(current ? { ...current } : null)
          : { ...(current || {}), ...(updater || {}) };

        if (!next) {
          return null;
        }
        if (!next.updated_at) next.updated_at = nowIso();
        store.put(next);
        return next;
      });
    },

    async findOneByIndex(storeName, indexName, value) {
      return withStore(storeName, 'readonly', async (store) => {
        const index = store.index(indexName);
        return idbRequest(index.get(value));
      });
    },

    async getPendingQueue(limit) {
      const items = await this.getAllByIndex(this.STORES.SYNC_QUEUE, 'by_status', 'PENDING');
      const ordered = items.sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
      return typeof limit === 'number' ? ordered.slice(0, limit) : ordered;
    },

    async putAudit(eventType, eventDetail) {
      return this.put(this.STORES.AUDIT_LOG, {
        event_id: makeId('AUD'),
        event_type: eventType || 'UNKNOWN',
        event_detail: eventDetail || '',
        created_at: nowIso(),
        updated_at: nowIso()
      });
    },

    async setMeta(key, value) {
      return this.put(this.STORES.META, {
        key,
        value,
        updated_at: nowIso()
      });
    },

    async getMeta(key, fallbackValue) {
      const row = await this.get(this.STORES.META, key);
      return row ? row.value : fallbackValue;
    }
  };

  window.TpkDb = TpkDb;
})(window);