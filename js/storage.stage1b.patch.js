(function (window) {
  'use strict';

  if (!window.Storage) return;

  var Storage = window.Storage;
  var READY_ATTEMPTS = 0;
  var READY_MAX_ATTEMPTS = 40;
  var READY_DELAY_MS = 250;
  var SYNC_MIRROR_GUARD_KEY = '__tpkStage1bSyncMirrorGuard';

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
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

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return value;
    }
  }

  function normalizeLegacyStatus(value) {
    var raw = String(value || 'PENDING').trim().toUpperCase();
    if (!raw) return 'PENDING';
    if (raw === 'SUCCESS' || raw === 'FAILED' || raw === 'CONFLICT' || raw === 'DUPLICATE' || raw === 'PROCESSING') return raw;
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
      return Promise.resolve([]);
    }
  }

  function bootstrapWhenReady() {
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
        .catch(function () {});
      return;
    }

    if (READY_ATTEMPTS < READY_MAX_ATTEMPTS) {
      window.setTimeout(bootstrapWhenReady, READY_DELAY_MS);
    }
  }

  var originalSet = Storage.set;
  Storage.set = function (key, value) {
    var result = originalSet.apply(Storage, arguments);
    if (!isMirrorGuardActive() && String(key || '').trim() === getSyncQueueKey()) {
      window.setTimeout(function () {
        importLegacyQueue(Array.isArray(value) ? value : []).catch(function () {});
      }, 0);
    }
    return result;
  };

  Storage.importLegacySyncQueue = function (queue) {
    var safeQueue = Array.isArray(queue) ? queue : Storage.get(getSyncQueueKey(), []);
    return importLegacyQueue(safeQueue);
  };

  Storage.getSyncQueueKey = getSyncQueueKey;
  Storage.isSyncMirrorGuardActive = isMirrorGuardActive;

  bootstrapWhenReady();
})(window);
