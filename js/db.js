(function (window) {
  'use strict';

  var DB_NAME = 'TPK_LOCAL_DB';
  var DB_VERSION = 3;
  var STORE_META = 'meta';
  var STORE_QUEUE = 'sync_queue';
  var STORE_DRAFT = 'drafts';
  var STORE_AUDIT = 'audit_log_local';
  var dbPromise = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); } catch (err) { return value; }
  }

  function canUseIdb() {
    return typeof window.indexedDB !== 'undefined';
  }

  function normalizeStatus(value) {
    return String(value || 'PENDING').trim().toUpperCase() || 'PENDING';
  }

  function fallbackKey(store) {
    return 'tpk_idb_fallback_' + store;
  }

  function fallbackGetAll(store) {
    try {
      var raw = window.localStorage.getItem(fallbackKey(store));
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function fallbackSaveAll(store, rows) {
    try {
      window.localStorage.setItem(fallbackKey(store), JSON.stringify(rows || []));
    } catch (err) {}
  }

  function openDb() {
    if (!canUseIdb()) return Promise.resolve(null);
    if (dbPromise) return dbPromise;

    dbPromise = new Promise(function (resolve, reject) {
      var req = window.indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = function (event) {
        var db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          var queue = db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
          queue.createIndex('by_status', 'sync_status', { unique: false });
          queue.createIndex('by_action', 'action', { unique: false });
          queue.createIndex('by_client_submit_id', 'client_submit_id', { unique: false });
          queue.createIndex('by_created_at', 'created_at', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_DRAFT)) {
          var drafts = db.createObjectStore(STORE_DRAFT, { keyPath: 'draft_key' });
          drafts.createIndex('by_type', 'draft_type', { unique: false });
          drafts.createIndex('by_updated_at', 'updated_at', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_AUDIT)) {
          var audit = db.createObjectStore(STORE_AUDIT, { keyPath: 'id' });
          audit.createIndex('by_event_type', 'event_type', { unique: false });
          audit.createIndex('by_created_at', 'created_at', { unique: false });
        }
      };

      req.onsuccess = function (event) { resolve(event.target.result); };
      req.onerror = function () { reject(req.error || new Error('Gagal membuka IndexedDB.')); };
    }).catch(function (err) {
      try { console.warn('IndexedDB tidak tersedia, fallback localStorage:', err && err.message ? err.message : err); } catch (e) {}
      return null;
    });

    return dbPromise;
  }

  function txStore(db, storeName, mode) {
    var tx = db.transaction(storeName, mode || 'readonly');
    return tx.objectStore(storeName);
  }

  function requestToPromise(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Operasi IndexedDB gagal.')); };
    });
  }

  async function put(storeName, value) {
    var db = await openDb();
    var item = clone(value || {});

    if (!db) {
      var rows = fallbackGetAll(storeName);
      var key = storeName === STORE_DRAFT ? item.draft_key : (item.id || item.key);
      var found = false;
      rows = rows.map(function (row) {
        var rowKey = storeName === STORE_DRAFT ? row.draft_key : (row.id || row.key);
        if (rowKey === key) {
          found = true;
          return item;
        }
        return row;
      });
      if (!found) rows.push(item);
      fallbackSaveAll(storeName, rows);
      return item;
    }

    await requestToPromise(txStore(db, storeName, 'readwrite').put(item));
    return item;
  }

  async function get(storeName, key) {
    var db = await openDb();
    if (!db) {
      var rows = fallbackGetAll(storeName);
      return rows.find(function (row) {
        var rowKey = storeName === STORE_DRAFT ? row.draft_key : (row.id || row.key);
        return rowKey === key;
      }) || null;
    }
    return requestToPromise(txStore(db, storeName, 'readonly').get(key));
  }

  async function remove(storeName, key) {
    var db = await openDb();
    if (!db) {
      var rows = fallbackGetAll(storeName).filter(function (row) {
        var rowKey = storeName === STORE_DRAFT ? row.draft_key : (row.id || row.key);
        return rowKey !== key;
      });
      fallbackSaveAll(storeName, rows);
      return true;
    }
    await requestToPromise(txStore(db, storeName, 'readwrite').delete(key));
    return true;
  }

  async function getAll(storeName) {
    var db = await openDb();
    if (!db) return fallbackGetAll(storeName);
    var store = txStore(db, storeName, 'readonly');
    if (typeof store.getAll === 'function') {
      return requestToPromise(store.getAll());
    }
    return new Promise(function (resolve, reject) {
      var out = [];
      var req = store.openCursor();
      req.onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
          out.push(cursor.value);
          cursor.continue();
        } else {
          resolve(out);
        }
      };
      req.onerror = function () { reject(req.error || new Error('Gagal membaca IndexedDB.')); };
    });
  }

  async function clear(storeName) {
    var db = await openDb();
    if (!db) {
      fallbackSaveAll(storeName, []);
      return true;
    }
    await requestToPromise(txStore(db, storeName, 'readwrite').clear());
    return true;
  }

  async function setMeta(key, value) {
    return put(STORE_META, { key: key, value: value, updated_at: nowIso() });
  }

  async function getMeta(key, fallback) {
    var row = await get(STORE_META, key);
    return row && row.value !== undefined ? row.value : fallback;
  }

  async function saveDraft(draftKey, draftType, payload, meta) {
    var item = {
      draft_key: draftKey,
      draft_type: draftType || 'GENERAL',
      payload: clone(payload || {}),
      meta: clone(meta || {}),
      updated_at: nowIso(),
      created_at: (meta && meta.created_at) || nowIso()
    };
    await put(STORE_DRAFT, item);
    return item;
  }

  async function getDraft(draftKey) {
    return get(STORE_DRAFT, draftKey);
  }

  async function clearDraft(draftKey) {
    return remove(STORE_DRAFT, draftKey);
  }

  async function listDrafts(filter) {
    var rows = await getAll(STORE_DRAFT);
    var f = filter || {};
    if (f.draft_type) {
      rows = rows.filter(function (row) { return String(row.draft_type || '') === String(f.draft_type); });
    }
    rows.sort(function (a, b) { return String(b.updated_at || '').localeCompare(String(a.updated_at || '')); });
    return rows;
  }

  function makeQueueItem(action, payload, meta) {
    meta = meta || {};
    payload = Object.assign({}, payload || {});
    var clientSubmitId = meta.client_submit_id || payload.client_submit_id || ('QUEUE-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
    if (!payload.client_submit_id) payload.client_submit_id = clientSubmitId;
    if (!payload.sync_source) payload.sync_source = meta.sync_source || 'OFFLINE_QUEUE';

    return {
      id: meta.id || clientSubmitId,
      action: action || meta.action || '',
      entity_type: meta.entity_type || '',
      entity_id_ref: meta.entity_id_ref || payload.id_sasaran || '',
      client_submit_id: clientSubmitId,
      payload: payload,
      sync_source: payload.sync_source || meta.sync_source || 'OFFLINE_QUEUE',
      sync_status: normalizeStatus(meta.sync_status || 'PENDING'),
      retry_count: Number(meta.retry_count || 0),
      last_error: meta.last_error || '',
      created_at: meta.created_at || nowIso(),
      updated_at: nowIso(),
      last_synced_at: meta.last_synced_at || '',
      app_version: meta.app_version || '',
      device_id: meta.device_id || ''
    };
  }

  async function addQueue(action, payload, meta) {
    var item = makeQueueItem(action, payload, meta || {});
    await put(STORE_QUEUE, item);
    return item;
  }

  async function updateQueue(id, patch) {
    var current = await get(STORE_QUEUE, id);
    if (!current) return null;
    var updated = Object.assign({}, current, patch || {}, { updated_at: nowIso() });
    if (updated.sync_status) updated.sync_status = normalizeStatus(updated.sync_status);
    await put(STORE_QUEUE, updated);
    return updated;
  }

  async function removeQueue(id) {
    return remove(STORE_QUEUE, id);
  }

  async function listQueue(filter) {
    var rows = await getAll(STORE_QUEUE);
    var f = filter || {};
    if (f.status) {
      rows = rows.filter(function (row) { return normalizeStatus(row.sync_status || row.status) === normalizeStatus(f.status); });
    }
    if (f.action) {
      rows = rows.filter(function (row) { return String(row.action || '') === String(f.action); });
    }
    if (f.keyword) {
      var q = String(f.keyword || '').toLowerCase();
      rows = rows.filter(function (row) {
        var text = JSON.stringify(row || {}).toLowerCase();
        return text.indexOf(q) >= 0;
      });
    }
    rows.sort(function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
    return rows;
  }

  async function countQueue() {
    var rows = await listQueue();
    var out = { total: rows.length, pending: 0, failed: 0, processing: 0, conflict: 0, success: 0 };
    rows.forEach(function (row) {
      var status = normalizeStatus(row.sync_status || row.status);
      if (status === 'PENDING') out.pending += 1;
      else if (status === 'FAILED') out.failed += 1;
      else if (status === 'PROCESSING') out.processing += 1;
      else if (status === 'CONFLICT') out.conflict += 1;
      else if (status === 'SUCCESS') out.success += 1;
    });
    return out;
  }

  async function addAudit(eventType, payload) {
    var item = {
      id: 'AUD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      event_type: eventType || 'LOCAL_EVENT',
      payload: clone(payload || {}),
      created_at: nowIso()
    };
    await put(STORE_AUDIT, item);
    return item;
  }

  var TPKDb = {
    DB_NAME: DB_NAME,
    DB_VERSION: DB_VERSION,
    stores: {
      META: STORE_META,
      QUEUE: STORE_QUEUE,
      DRAFT: STORE_DRAFT,
      AUDIT: STORE_AUDIT
    },
    init: openDb,
    put: put,
    get: get,
    remove: remove,
    getAll: getAll,
    clear: clear,
    setMeta: setMeta,
    getMeta: getMeta,
    saveDraft: saveDraft,
    getDraft: getDraft,
    clearDraft: clearDraft,
    listDrafts: listDrafts,
    addQueue: addQueue,
    updateQueue: updateQueue,
    removeQueue: removeQueue,
    listQueue: listQueue,
    countQueue: countQueue,
    addAudit: addAudit
  };

  window.TPKDb = TPKDb;
  window.DB = TPKDb;
})(window);
