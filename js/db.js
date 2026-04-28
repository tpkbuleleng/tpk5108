
(function (window) {
  'use strict';

  var CONFIG = window.APP_CONFIG || {};
  var DB_NAME = String(CONFIG.LOCAL_DB_NAME || 'tpk_local_vnext');
  var DB_VERSION = Number(CONFIG.LOCAL_DB_VERSION || 1);

  var STORES = Object.freeze({
    META: 'meta',
    BOOTSTRAP_CACHE: 'bootstrap_cache',
    SASARAN_CACHE: 'sasaran_cache',
    DRAFT_REGISTRASI: 'draft_registrasi',
    DRAFT_PENDAMPINGAN: 'draft_pendampingan',
    SYNC_QUEUE: 'sync_queue',
    SYNC_RESULT_LOG: 'sync_result_log',
    AUDIT_LOG_LOCAL: 'audit_log_local'
  });

  var dbPromise = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return value;
    }
  }

  function promisifyRequest(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('IndexedDB request gagal.')); };
    });
  }

  function createStore(db, name, options, indexes) {
    if (db.objectStoreNames.contains(name)) return;
    var store = db.createObjectStore(name, options || { keyPath: 'id' });
    (indexes || []).forEach(function (item) {
      if (!item || !item.name || !item.keyPath) return;
      store.createIndex(item.name, item.keyPath, { unique: !!item.unique });
    });
  }

  function upgradeDb(db) {
    createStore(db, STORES.META, { keyPath: 'key' }, [
      { name: 'updated_at', keyPath: 'updated_at' }
    ]);

    createStore(db, STORES.BOOTSTRAP_CACHE, { keyPath: 'cache_key' }, [
      { name: 'updated_at', keyPath: 'updated_at' },
      { name: 'expires_at', keyPath: 'expires_at' }
    ]);

    createStore(db, STORES.SASARAN_CACHE, { keyPath: 'id_sasaran' }, [
      { name: 'id_tim', keyPath: 'id_tim' },
      { name: 'updated_at', keyPath: 'updated_at' },
      { name: 'status_sasaran', keyPath: 'status_sasaran' }
    ]);

    createStore(db, STORES.DRAFT_REGISTRASI, { keyPath: 'draft_id' }, [
      { name: 'id_user', keyPath: 'id_user' },
      { name: 'id_tim', keyPath: 'id_tim' },
      { name: 'updated_at', keyPath: 'updated_at' }
    ]);

    createStore(db, STORES.DRAFT_PENDAMPINGAN, { keyPath: 'draft_id' }, [
      { name: 'id_user', keyPath: 'id_user' },
      { name: 'id_tim', keyPath: 'id_tim' },
      { name: 'id_sasaran', keyPath: 'id_sasaran' },
      { name: 'updated_at', keyPath: 'updated_at' }
    ]);

    createStore(db, STORES.SYNC_QUEUE, { keyPath: 'queue_id' }, [
      { name: 'status', keyPath: 'status' },
      { name: 'action', keyPath: 'action' },
      { name: 'client_submit_id', keyPath: 'client_submit_id' },
      { name: 'updated_at', keyPath: 'updated_at' }
    ]);

    createStore(db, STORES.SYNC_RESULT_LOG, { keyPath: 'result_id' }, [
      { name: 'queue_id', keyPath: 'queue_id' },
      { name: 'status', keyPath: 'status' },
      { name: 'created_at', keyPath: 'created_at' }
    ]);

    createStore(db, STORES.AUDIT_LOG_LOCAL, { keyPath: 'event_id' }, [
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
        upgradeDb(event.target.result);
      };

      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(request.error || new Error('Gagal membuka IndexedDB.'));
      };

      request.onblocked = function () {
        reject(new Error('IndexedDB sedang diblokir tab lain.'));
      };
    });

    return dbPromise;
  }

  async function withStore(storeName, mode, handler) {
    var db = await open();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(storeName, mode);
      var store = tx.objectStore(storeName);
      var settled = false;

      function safeResolve(value) {
        if (settled) return;
        settled = true;
        resolve(value);
      }

      function safeReject(err) {
        if (settled) return;
        settled = true;
        reject(err);
      }

      tx.oncomplete = function () {
        if (!settled) safeResolve(undefined);
      };
      tx.onabort = function () {
        safeReject(tx.error || new Error('Transaksi IndexedDB dibatalkan.'));
      };
      tx.onerror = function () {
        safeReject(tx.error || new Error('Transaksi IndexedDB gagal.'));
      };

      try {
        var result = handler(store, tx, db);
        if (result && typeof result.then === 'function') {
          result.then(safeResolve).catch(safeReject);
        } else if (result !== undefined) {
          safeResolve(result);
        }
      } catch (err) {
        safeReject(err);
      }
    });
  }

  async function get(storeName, key) {
    return withStore(storeName, 'readonly', function (store) {
      return promisifyRequest(store.get(key));
    });
  }

  async function put(storeName, value) {
    return withStore(storeName, 'readwrite', function (store) {
      return promisifyRequest(store.put(clone(value)));
    });
  }

  async function add(storeName, value) {
    return withStore(storeName, 'readwrite', function (store) {
      return promisifyRequest(store.add(clone(value)));
    });
  }

  async function remove(storeName, key) {
    return withStore(storeName, 'readwrite', function (store) {
      return promisifyRequest(store.delete(key));
    });
  }

  async function clear(storeName) {
    return withStore(storeName, 'readwrite', function (store) {
      return promisifyRequest(store.clear());
    });
  }

  async function getAll(storeName) {
    return withStore(storeName, 'readonly', function (store) {
      if (typeof store.getAll === 'function') {
        return promisifyRequest(store.getAll());
      }
      return new Promise(function (resolve, reject) {
        var out = [];
        var req = store.openCursor();
        req.onsuccess = function () {
          var cursor = req.result;
          if (!cursor) {
            resolve(out);
            return;
          }
          out.push(cursor.value);
          cursor.continue();
        };
        req.onerror = function () {
          reject(req.error || new Error('Gagal membaca seluruh data store.'));
        };
      });
    });
  }

  async function count(storeName) {
    return withStore(storeName, 'readonly', function (store) {
      return promisifyRequest(store.count());
    });
  }

  async function getMeta(key, fallbackValue) {
    var row = await get(STORES.META, key);
    return row && row.value !== undefined ? row.value : fallbackValue;
  }

  async function setMeta(key, value) {
    return put(STORES.META, {
      key: String(key || ''),
      value: clone(value),
      updated_at: nowIso()
    });
  }

  async function logAudit(eventType, eventDetail) {
    return put(STORES.AUDIT_LOG_LOCAL, {
      event_id: 'AUD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      event_type: String(eventType || 'UNKNOWN'),
      event_detail: clone(eventDetail || {}),
      created_at: nowIso()
    });
  }

  var AppDB = {
    DB_NAME: DB_NAME,
    DB_VERSION: DB_VERSION,
    STORES: STORES,
    open: open,
    get: get,
    put: put,
    add: add,
    remove: remove,
    clear: clear,
    getAll: getAll,
    count: count,
    getMeta: getMeta,
    setMeta: setMeta,
    logAudit: logAudit
  };

  window.AppDB = AppDB;
})(window);
