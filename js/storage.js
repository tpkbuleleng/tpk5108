(function (window) {
  'use strict';

  var BOOTSTRAP_LITE_KEY = 'tpk_bootstrap_lite';
  var SCHEMA_KEY = 'tpk_local_schema_version';
  var DEFAULT_SCHEMA_VERSION = 1;
  var SYNC_MIRROR_GUARD_KEY = '__tpkStage1bSyncMirrorGuard';
  var READY_ATTEMPTS = 0;
  var READY_MAX_ATTEMPTS = 40;
  var READY_DELAY_MS = 250;

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function isDebugEnabled() {
    return !!getConfig().DEBUG;
  }

  function debugWarn() {
    if (!isDebugEnabled()) return;
    try {
      console.warn.apply(console, arguments);
    } catch (err) {}
  }

  function normalizeKey(key) {
    return String(key || '').trim();
  }

  function safeParse(raw, fallback) {
    if (raw === null || raw === undefined || raw === '') {
      return fallback;
    }

    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function safeStringify(value) {
    return JSON.stringify(value);
  }

  function clone(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;

    try {
      if (typeof structuredClone === 'function') {
        return structuredClone(value);
      }
    } catch (err) {}

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return value;
    }
  }

  function getBootstrapLiteKey() {
    return BOOTSTRAP_LITE_KEY;
  }

  function getSyncQueueKey() {
    return getStorageKeys().SYNC_QUEUE || 'tpk_sync_queue_v1';
  }

  function isMirrorGuardActive() {
    return window[SYNC_MIRROR_GUARD_KEY] === true;
  }

  async function withMirrorGuardAsync(fn) {
    window[SYNC_MIRROR_GUARD_KEY] = true;
    try {
      return await fn();
    } finally {
      window[SYNC_MIRROR_GUARD_KEY] = false;
    }
  }

  function normalizeLegacyStatus(value) {
    var raw = String(value || 'PENDING').trim().toUpperCase();
    if (!raw) return 'PENDING';
    if (
      raw === 'SUCCESS' ||
      raw === 'FAILED' ||
      raw === 'CONFLICT' ||
      raw === 'DUPLICATE' ||
      raw === 'PROCESSING'
    ) {
      return raw;
    }
    return 'PENDING';
  }

  function normalizeLegacyItem(raw) {
    var safe = raw && typeof raw === 'object' ? raw : {};
    var payload = safe.payload && typeof safe.payload === 'object' ? clone(safe.payload) : {};
    var queueId = String(safe.queue_id || safe.id || payload.client_submit_id || '').trim();

    if (!queueId) {
      queueId = 'QUE-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    }

    return {
      queue_id: queueId,
      id: queueId,
      action: String(safe.action || payload.action || '').trim(),
      payload: payload,
      status: normalizeLegacyStatus(safe.status || safe.sync_status || 'PENDING'),
      created_at: String(safe.created_at || safe.saved_at || new Date().toISOString()),
      updated_at: String(safe.updated_at || new Date().toISOString()),
      retry_count: Number(safe.retry_count || safe.retries || 0),
      last_error: String(safe.last_error || safe.error || ''),
      client_submit_id: String(payload.client_submit_id || safe.client_submit_id || queueId),
      sync_source: String(payload.sync_source || safe.sync_source || 'OFFLINE_QUEUE')
    };
  }

  async function patchQueueRepoMirror() {
    if (!window.QueueRepo || typeof window.QueueRepo.syncLegacyMirror !== 'function') return false;
    if (window.QueueRepo.__stage1bMirrorPatched === true) return true;

    var original = window.QueueRepo.syncLegacyMirror;
    window.QueueRepo.syncLegacyMirror = async function () {
      return withMirrorGuardAsync(async function () {
        return await original.apply(window.QueueRepo, arguments);
      });
    };

    window.QueueRepo.__stage1bMirrorPatched = true;
    return true;
  }

  async function importLegacyQueue(queue) {
    if (isMirrorGuardActive()) return [];
    if (!window.QueueRepo || typeof window.QueueRepo.getById !== 'function' || typeof window.QueueRepo.save !== 'function') {
      return [];
    }

    var safeQueue = Array.isArray(queue) ? queue : [];
    var imported = [];

    for (var i = 0; i < safeQueue.length; i += 1) {
      var item = normalizeLegacyItem(safeQueue[i]);
      if (!item.action) continue;

      var existing = await window.QueueRepo.getById(item.queue_id);
      if (existing) {
        var next = Object.assign({}, existing, item, {
          payload: clone(item.payload || existing.payload || {}),
          updated_at: new Date().toISOString()
        });
        await window.QueueRepo.save(next);
        imported.push(next);
      } else {
        await window.QueueRepo.save(item);
        imported.push(item);
      }
    }

    if (typeof window.QueueRepo.syncLegacyMirror === 'function') {
      await window.QueueRepo.syncLegacyMirror();
    }

    return imported;
  }

  function tryImportCurrentLegacyQueue() {
    try {
      var queue = Storage.get(getSyncQueueKey(), []);
      return importLegacyQueue(queue);
    } catch (err) {
      debugWarn('Import legacy queue gagal:', err && err.message ? err.message : err);
      return Promise.resolve([]);
    }
  }

  function bootstrapSyncMirror() {
    READY_ATTEMPTS += 1;

    if (window.QueueRepo && window.AppDB) {
      Promise.resolve()
        .then(patchQueueRepoMirror)
        .then(tryImportCurrentLegacyQueue)
        .then(function () {
          if (window.SyncManager && typeof window.SyncManager.init === 'function') {
            window.SyncManager.init();
          }
        })
        .catch(function (err) {
          debugWarn('Bootstrap sync mirror gagal:', err && err.message ? err.message : err);
        });
      return;
    }

    if (READY_ATTEMPTS < READY_MAX_ATTEMPTS) {
      window.setTimeout(bootstrapSyncMirror, READY_DELAY_MS);
    }
  }

  var Storage = {
    isAvailable: function () {
      try {
        var testKey = '__tpk_storage_test__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        return true;
      } catch (err) {
        return false;
      }
    },

    get: function (key, fallback) {
      var normalizedKey = normalizeKey(key);
      var defaultValue = arguments.length >= 2 ? fallback : null;

      try {
        if (!normalizedKey || !this.isAvailable()) {
          return defaultValue;
        }

        var raw = window.localStorage.getItem(normalizedKey);
        return safeParse(raw, defaultValue);
      } catch (err) {
        debugWarn('Storage.get gagal:', normalizedKey, err && err.message ? err.message : err);
        return defaultValue;
      }
    },

    set: function (key, value) {
      var normalizedKey = normalizeKey(key);

      try {
        if (!normalizedKey || !this.isAvailable()) {
          return value;
        }

        window.localStorage.setItem(normalizedKey, safeStringify(value));
        return value;
      } catch (err) {
        debugWarn('Storage.set gagal:', normalizedKey, err && err.message ? err.message : err);
        return value;
      }
    },

    remove: function (key) {
      var normalizedKey = normalizeKey(key);

      try {
        if (!normalizedKey || !this.isAvailable()) {
          return;
        }

        window.localStorage.removeItem(normalizedKey);
      } catch (err) {
        debugWarn('Storage.remove gagal:', normalizedKey, err && err.message ? err.message : err);
      }
    },

    has: function (key) {
      var normalizedKey = normalizeKey(key);

      try {
        if (!normalizedKey || !this.isAvailable()) {
          return false;
        }

        return window.localStorage.getItem(normalizedKey) !== null;
      } catch (err) {
        return false;
      }
    },

    getProfile: function (fallback) {
      var keys = getStorageKeys();
      return this.get(keys.PROFILE || 'tpk_profile', fallback || {});
    },

    setProfile: function (value) {
      var keys = getStorageKeys();
      return this.set(keys.PROFILE || 'tpk_profile', value || {});
    },

    getBootstrapLite: function (fallback) {
      return this.get(getBootstrapLiteKey(), fallback || {});
    },

    setBootstrapLite: function (value) {
      return this.set(getBootstrapLiteKey(), value || {});
    },

    removeBootstrapLite: function () {
      this.remove(getBootstrapLiteKey());
    },

    clearSession: function () {
      var keys = getStorageKeys();

      [
        keys.SESSION_TOKEN,
        keys.PROFILE,
        getBootstrapLiteKey()
      ].filter(Boolean).forEach(function (key) {
        Storage.remove(key);
      });
    },

    clearDrafts: function () {
      var keys = getStorageKeys();

      [
        keys.SYNC_QUEUE,
        keys.REGISTRASI_DRAFT,
        keys.PENDAMPINGAN_DRAFT,
        'tpk_registrasi_draft',
        'tpk_pendampingan_draft'
      ].filter(Boolean).forEach(function (key) {
        Storage.remove(key);
      });
    },

    clearRuntimeCache: function () {
      var keys = getStorageKeys();

      [
        keys.APP_BOOTSTRAP,
        keys.SELECTED_SASARAN,
        keys.SASARAN_CACHE,
        keys.BOOTSTRAP,
        keys.DASHBOARD_CACHE,
        keys.EDIT_PENDAMPINGAN,
        getBootstrapLiteKey(),
        'tpk_dashboard_cache',
        'tpk_edit_pendampingan'
      ].filter(Boolean).forEach(function (key) {
        Storage.remove(key);
      });
    },

    clearSyncData: function () {
      var keys = getStorageKeys();

      [
        keys.SYNC_QUEUE,
        keys.LAST_SYNC_AT
      ].filter(Boolean).forEach(function (key) {
        Storage.remove(key);
      });
    },

    clearOperationalData: function () {
      this.clearDrafts();
      this.clearSyncData();
      this.clearRuntimeCache();
    },

    clearAppData: function () {
      this.clearSession();
      this.clearDrafts();
      this.clearRuntimeCache();
      this.clearSyncData();
    },

    getBootstrapLiteKey: function () {
      return getBootstrapLiteKey();
    },

    getLocalSchemaVersion: function () {
      try {
        var raw = this.get(SCHEMA_KEY, DEFAULT_SCHEMA_VERSION);
        return Number(raw || DEFAULT_SCHEMA_VERSION);
      } catch (err) {
        return DEFAULT_SCHEMA_VERSION;
      }
    },

    setLocalSchemaVersion: function (version) {
      var safeVersion = Number(version || DEFAULT_SCHEMA_VERSION);
      this.set(SCHEMA_KEY, safeVersion);
      return safeVersion;
    },

    getSyncQueueKey: function () {
      return getSyncQueueKey();
    },

    isSyncMirrorGuardActive: function () {
      return isMirrorGuardActive();
    },

    importLegacySyncQueue: function (queue) {
      var safeQueue = Array.isArray(queue) ? queue : this.get(getSyncQueueKey(), []);
      return importLegacyQueue(safeQueue);
    },

    bootstrapSyncMirror: function () {
      READY_ATTEMPTS = 0;
      bootstrapSyncMirror();
    }
  };

  var originalSet = Storage.set;
  Storage.set = function (key, value) {
    var result = originalSet.apply(Storage, arguments);

    if (!isMirrorGuardActive() && String(key || '').trim() === getSyncQueueKey()) {
      window.setTimeout(function () {
        importLegacyQueue(Array.isArray(value) ? value : []).catch(function (err) {
          debugWarn('Mirror sync queue gagal:', err && err.message ? err.message : err);
        });
      }, 0);
    }

    return result;
  };

  window.Storage = Storage;
  window.StorageHelper = Storage;

  bootstrapSyncMirror();
})(window);
