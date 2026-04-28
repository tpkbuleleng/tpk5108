
(function (window) {
  'use strict';

  var STATUS = Object.freeze({
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    CONFLICT: 'CONFLICT',
    DUPLICATE: 'DUPLICATE'
  });

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

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function getStorage() {
    return window.Storage || null;
  }

  function getState() {
    return window.AppState || null;
  }

  function getApi() {
    return window.Api || null;
  }

  function getSessionToken() {
    if (window.Api && typeof window.Api.getSessionToken === 'function') {
      return String(window.Api.getSessionToken() || '');
    }
    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function') {
      return String(storage.get(keys.SESSION_TOKEN, '') || '');
    }
    return '';
  }

  function getDeviceId() {
    if (window.Api && typeof window.Api.getOrCreateDeviceId === 'function') {
      return String(window.Api.getOrCreateDeviceId() || '');
    }
    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function') {
      return String(storage.get(keys.DEVICE_ID, '') || '');
    }
    return '';
  }

  function getProfile() {
    var state = getState();
    if (state && typeof state.getProfile === 'function') {
      return state.getProfile() || {};
    }
    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function') {
      return storage.get(keys.PROFILE, {}) || {};
    }
    return {};
  }

  function ensureQueueId(existing) {
    if (existing) return String(existing);
    return 'QUE-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function ensureClientSubmitId(payload, queueId) {
    if (payload && payload.client_submit_id) return String(payload.client_submit_id);
    if (window.ClientId && typeof window.ClientId.ensure === 'function') {
      return window.ClientId.ensure('', 'SUB');
    }
    return 'SUB-' + (queueId || ensureQueueId(''));
  }

  function normalizeStatus(value) {
    var raw = String(value || STATUS.PENDING).trim().toUpperCase();
    return STATUS[raw] || raw || STATUS.PENDING;
  }

  function normalizeItem(item) {
    var profile = getProfile();
    var payload = item && typeof item.payload === 'object' ? clone(item.payload) : {};
    var queueId = ensureQueueId(item && (item.queue_id || item.id));

    return {
      queue_id: queueId,
      id: queueId,
      action: String(item && item.action || payload.action || '').trim(),
      entity_type: String(item && item.entity_type || '').trim(),
      entity_id_local: String(item && item.entity_id_local || '').trim(),
      client_submit_id: ensureClientSubmitId(payload, queueId),
      payload: payload,
      status: normalizeStatus(item && (item.status || item.sync_status)),
      retry_count: Number(item && (item.retry_count || item.retries) || 0),
      last_error: String(item && item.last_error || ''),
      last_response_code: Number(item && item.last_response_code || 0),
      created_at: String(item && item.created_at || nowIso()),
      updated_at: String(item && item.updated_at || nowIso()),
      id_user: String(item && item.id_user || profile.id_user || ''),
      id_tim: String(item && item.id_tim || profile.id_tim || ''),
      device_id: String(item && item.device_id || getDeviceId() || ''),
      app_version: String(item && item.app_version || (getConfig().APP_VERSION || '')),
      sync_source: String(item && item.sync_source || payload.sync_source || 'OFFLINE_QUEUE'),
      is_archived: !!(item && item.is_archived)
    };
  }

  async function ensureDb() {
    if (!window.AppDB || typeof window.AppDB.getAll !== 'function') {
      throw new Error('AppDB belum tersedia.');
    }
    return window.AppDB;
  }

  function toLegacyMirror(items) {
    return (items || []).filter(function (item) {
      return !item.is_archived && item.status !== STATUS.SUCCESS && item.status !== STATUS.DUPLICATE;
    }).map(function (item) {
      return {
        id: item.queue_id,
        action: item.action,
        payload: clone(item.payload || {}),
        sync_status: item.status,
        status: item.status,
        created_at: item.created_at,
        last_error: item.last_error || '',
        retries: Number(item.retry_count || 0)
      };
    });
  }

  async function syncLegacyMirror() {
    var db = await ensureDb();
    var all = await db.getAll(db.STORES.SYNC_QUEUE);
    var mirrored = toLegacyMirror(all);

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.set === 'function' && keys.SYNC_QUEUE) {
      storage.set(keys.SYNC_QUEUE, mirrored);
    }

    var state = getState();
    if (state && typeof state.setSyncQueue === 'function') {
      state.setSyncQueue(mirrored);
    }

    return mirrored;
  }

  async function save(item) {
    var db = await ensureDb();
    var normalized = normalizeItem(item);
    normalized.updated_at = nowIso();
    await db.put(db.STORES.SYNC_QUEUE, normalized);
    await syncLegacyMirror();
    return normalized;
  }

  async function getAll(options) {
    var db = await ensureDb();
    var items = await db.getAll(db.STORES.SYNC_QUEUE);
    var opts = options || {};
    var out = (items || []).map(normalizeItem).filter(function (item) {
      if (opts.includeArchived === true) return true;
      return !item.is_archived;
    });

    out.sort(function (a, b) {
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    });

    return out;
  }

  async function getById(queueId) {
    var db = await ensureDb();
    var item = await db.get(db.STORES.SYNC_QUEUE, queueId);
    return item ? normalizeItem(item) : null;
  }

  async function enqueue(action, payload, meta) {
    var next = normalizeItem(Object.assign({}, meta || {}, {
      action: action,
      payload: clone(payload || {}),
      status: STATUS.PENDING,
      created_at: nowIso(),
      updated_at: nowIso()
    }));

    await save(next);
    try {
      await window.AppDB.logAudit('QUEUE_ENQUEUE', {
        queue_id: next.queue_id,
        action: next.action,
        client_submit_id: next.client_submit_id
      });
    } catch (err) {}
    return next;
  }

  async function getByStatuses(statusList) {
    var targets = (statusList || []).map(normalizeStatus);
    var items = await getAll();
    return items.filter(function (item) {
      return targets.indexOf(item.status) >= 0;
    });
  }

  async function getPending(limit) {
    var items = await getByStatuses([STATUS.PENDING, STATUS.FAILED]);
    if (limit && limit > 0) return items.slice(0, limit);
    return items;
  }

  async function updateStatus(queueId, status, patch) {
    var item = await getById(queueId);
    if (!item) return null;

    var next = Object.assign({}, item, clone(patch || {}), {
      status: normalizeStatus(status),
      updated_at: nowIso()
    });

    await save(next);
    return next;
  }

  async function markProcessing(queueId) {
    return updateStatus(queueId, STATUS.PROCESSING);
  }

  async function markSuccess(queueId, patch) {
    return updateStatus(queueId, STATUS.SUCCESS, patch || {});
  }

  async function markDuplicate(queueId, patch) {
    return updateStatus(queueId, STATUS.DUPLICATE, patch || {});
  }

  async function markConflict(queueId, patch) {
    return updateStatus(queueId, STATUS.CONFLICT, patch || {});
  }

  async function markFailed(queueId, errorMessage, patch) {
    var current = await getById(queueId);
    var nextRetry = Number((current && current.retry_count) || 0) + 1;
    return updateStatus(queueId, STATUS.FAILED, Object.assign({}, patch || {}, {
      retry_count: nextRetry,
      last_error: String(errorMessage || '')
    }));
  }

  async function remove(queueId) {
    var db = await ensureDb();
    await db.remove(db.STORES.SYNC_QUEUE, queueId);
    await syncLegacyMirror();
    return true;
  }

  async function archive(queueId) {
    var item = await getById(queueId);
    if (!item) return false;
    item.is_archived = true;
    item.updated_at = nowIso();
    await save(item);
    return true;
  }

  async function clearCompleted() {
    var items = await getByStatuses([STATUS.SUCCESS, STATUS.DUPLICATE]);
    for (var i = 0; i < items.length; i += 1) {
      await archive(items[i].queue_id);
    }
    await syncLegacyMirror();
    return true;
  }

  async function stats() {
    var items = await getAll();
    var out = {
      total: items.length,
      pending: 0,
      processing: 0,
      success: 0,
      failed: 0,
      conflict: 0,
      duplicate: 0
    };

    items.forEach(function (item) {
      var status = normalizeStatus(item.status);
      if (status === STATUS.PENDING) out.pending += 1;
      else if (status === STATUS.PROCESSING) out.processing += 1;
      else if (status === STATUS.SUCCESS) out.success += 1;
      else if (status === STATUS.FAILED) out.failed += 1;
      else if (status === STATUS.CONFLICT) out.conflict += 1;
      else if (status === STATUS.DUPLICATE) out.duplicate += 1;
    });

    return out;
  }

  var QueueRepo = {
    STATUS: STATUS,
    normalizeItem: normalizeItem,
    enqueue: enqueue,
    save: save,
    getAll: getAll,
    getById: getById,
    getPending: getPending,
    getByStatuses: getByStatuses,
    updateStatus: updateStatus,
    markProcessing: markProcessing,
    markSuccess: markSuccess,
    markDuplicate: markDuplicate,
    markConflict: markConflict,
    markFailed: markFailed,
    remove: remove,
    archive: archive,
    clearCompleted: clearCompleted,
    stats: stats,
    syncLegacyMirror: syncLegacyMirror
  };

  window.QueueRepo = QueueRepo;
})(window);
