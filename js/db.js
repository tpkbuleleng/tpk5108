(function (window) {
  'use strict';

  var DB_NAME = 'TPK_VNEXT_DB';
  var DB_VERSION = 1;
  var dbPromise = null;

  var STORES = {
    META: 'meta',
    BOOTSTRAP_CACHE: 'bootstrap_cache',
    SASARAN_CACHE: 'sasaran_cache',
    DRAFT_REGISTRASI: 'draft_registrasi',
    DRAFT_PENDAMPINGAN: 'draft_pendampingan',
    SYNC_QUEUE: 'sync_queue',
    SYNC_RESULT_LOG: 'sync_result_log',
    AUDIT_LOG_LOCAL: 'audit_log_local'
  };

  var KEY_FIELDS = {};
  KEY_FIELDS[STORES.META] = 'key';
  KEY_FIELDS[STORES.BOOTSTRAP_CACHE] = 'cache_key';
  KEY_FIELDS[STORES.SASARAN_CACHE] = 'id_sasaran';
  KEY_FIELDS[STORES.DRAFT_REGISTRASI] = 'draft_id';
  KEY_FIELDS[STORES.DRAFT_PENDAMPINGAN] = 'draft_id';
  KEY_FIELDS[STORES.SYNC_QUEUE] = 'queue_id';
  KEY_FIELDS[STORES.SYNC_RESULT_LOG] = 'result_id';
  KEY_FIELDS[STORES.AUDIT_LOG_LOCAL] = 'event_id';

  function nowIso() {
    return new Date().toISOString();
  }

  function randomId(prefix) {
    var value = '';
    if (window.crypto && window.crypto.randomUUID) {
      value = window.crypto.randomUUID();
    } else {
      value = 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    }
    return (prefix || 'ID') + '-' + value;
  }

  function createStore(db, storeName, keyPath) {
    if (db.objectStoreNames.contains(storeName)) return db.transaction(storeName, 'readwrite').objectStore(storeName);
    return db.createObjectStore(storeName, { keyPath: keyPath });
  }

  function ensureIndexes(store, indexes) {
    (indexes || []).forEach(function (index) {
      if (!store.indexNames.contains(index.name)) {
        store.createIndex(index.name, index.keyPath, index.options || {});
      }
    });
  }

  function upgrade(db) {
    var meta = createStore(db, STORES.META, 'key');
    ensureIndexes(meta, []);

    var bootstrap = createStore(db, STORES.BOOTSTRAP_CACHE, 'cache_key');
    ensureIndexes(bootstrap, [{ name: 'expires_at', keyPath: 'expires_at' }]);

    var sasaran = createStore(db, STORES.SASARAN_CACHE, 'id_sasaran');
    ensureIndexes(sasaran, [
      { name: 'id_tim', keyPath: 'id_tim' },
      { name: 'updated_at', keyPath: 'updated_at' },
      { name: 'sync_state', keyPath: 'sync_state' }
    ]);

    var draftReg = createStore(db, STORES.DRAFT_REGISTRASI, 'draft_id');
    ensureIndexes(draftReg, [
      { name: 'id_user', keyPath: 'id_user' },
      { name: 'id_tim', keyPath: 'id_tim' },
      { name: 'updated_at', keyPath: 'updated_at' }
    ]);

    var draftPend = createStore(db, STORES.DRAFT_PENDAMPINGAN, 'draft_id');
    ensureIndexes(draftPend, [
      { name: 'id_user', keyPath: 'id_user' },
      { name: 'id_tim', keyPath: 'id_tim' },
      { name: 'id_sasaran', keyPath: 'id_sasaran' },
      { name: 'updated_at', keyPath: 'updated_at' }
    ]);

    var queue = createStore(db, STORES.SYNC_QUEUE, 'queue_id');
    ensureIndexes(queue, [
      { name: 'status', keyPath: 'status' },
      { name: 'created_at', keyPath: 'created_at' },
      { name: 'action', keyPath: 'action' },
      { name: 'client_submit_id', keyPath: 'client_submit_id' }
    ]);

    var resultLog = createStore(db, STORES.SYNC_RESULT_LOG, 'result_id');
    ensureIndexes(resultLog, [
      { name: 'queue_id', keyPath: 'queue_id' },
      { name: 'created_at', keyPath: 'created_at' }
    ]);

    var audit = createStore(db, STORES.AUDIT_LOG_LOCAL, 'event_id');
    ensureIndexes(audit, [
      { name: 'event_type', keyPath: 'event_type' },
      { name: 'created_at', keyPath: 'created_at' }
    ]);
  }

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB tidak didukung browser ini.'));
        return;
      }
      var request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function (event) {
        upgrade(event.target.result);
      };
      request.onsuccess = function (event) {
        resolve(event.target.result);
      };
      request.onerror = function () {
        reject(request.error || new Error('Gagal membuka IndexedDB.'));
      };
    });
    return dbPromise;
  }

  function withStore(storeName, mode, executor) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, mode || 'readonly');
        var store = tx.objectStore(storeName);
        var result;
        try {
          result = executor(store, tx, resolve, reject);
        } catch (err) {
          reject(err);
          return;
        }
        tx.onabort = function () {
          reject(tx.error || new Error('Transaction aborted: ' + storeName));
        };
        tx.onerror = function () {
          reject(tx.error || new Error('Transaction error: ' + storeName));
        };
        if (result && typeof result.onsuccess === 'function') {
          result.onsuccess = function (event) { resolve(event.target.result); };
          result.onerror = function () { reject(result.error || new Error('IndexedDB request failed.')); };
        }
      });
    });
  }

  function getKeyField(storeName) {
    return KEY_FIELDS[storeName] || 'id';
  }

  function sortByCreatedAtAsc(items) {
    return (items || []).slice().sort(function (a, b) {
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    });
  }

  var TpkDb = {
    STORES: STORES,
    open: open,
    nowIso: nowIso,
    randomId: randomId,

    requestPersistentStorage: async function () {
      if (!navigator.storage || typeof navigator.storage.persist !== 'function') return false;
      try {
        return await navigator.storage.persist();
      } catch (err) {
        return false;
      }
    },

    get: function (storeName, key) {
      return withStore(storeName, 'readonly', function (store) {
        return store.get(key);
      });
    },

    getAll: function (storeName) {
      return withStore(storeName, 'readonly', function (store) {
        return store.getAll();
      });
    },

    getAllByIndex: function (storeName, indexName, value) {
      return withStore(storeName, 'readonly', function (store) {
        var index = store.index(indexName);
        return index.getAll(value);
      });
    },

    put: function (storeName, value) {
      return withStore(storeName, 'readwrite', function (store) {
        return store.put(value);
      });
    },

    delete: function (storeName, key) {
      return withStore(storeName, 'readwrite', function (store) {
        return store.delete(key);
      });
    },

    clear: function (storeName) {
      return withStore(storeName, 'readwrite', function (store) {
        return store.clear();
      });
    },

    count: function (storeName) {
      return withStore(storeName, 'readonly', function (store) {
        return store.count();
      });
    },

    setMeta: function (key, value) {
      return this.put(STORES.META, {
        key: key,
        value: value,
        updated_at: nowIso()
      });
    },

    getMeta: async function (key, fallbackValue) {
      var row = await this.get(STORES.META, key);
      return row && Object.prototype.hasOwnProperty.call(row, 'value') ? row.value : fallbackValue;
    },

    putAudit: function (eventType, eventDetail) {
      return this.put(STORES.AUDIT_LOG_LOCAL, {
        event_id: randomId('AUD'),
        event_type: eventType || 'UNKNOWN',
        event_detail: eventDetail || '',
        created_at: nowIso()
      });
    },

    buildRecord: function (storeName, data) {
      var keyField = getKeyField(storeName);
      var record = Object.assign({}, data || {});
      if (!record[keyField]) {
        record[keyField] = randomId(keyField.toUpperCase());
      }
      if (!record.updated_at) {
        record.updated_at = nowIso();
      }
      return record;
    },

    listQueueByStatus: async function (status) {
      var rows = await this.getAllByIndex(STORES.SYNC_QUEUE, 'status', status);
      return sortByCreatedAtAsc(rows);
    }
  };

  window.TpkDb = TpkDb;
  TpkDb.requestPersistentStorage().catch(function () {});
})(window);
