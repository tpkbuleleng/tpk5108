(function (window) {
  'use strict';

  var STATUS = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    CONFLICT: 'CONFLICT',
    DUPLICATE: 'DUPLICATE'
  };

  function nowIso() {
    return window.TpkDb.nowIso();
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getProfile() {
    return (window.StorageHelper && window.StorageHelper.getProfile()) || {};
  }

  function getLegacyQueue() {
    return window.StorageHelper ? window.StorageHelper.getLegacySyncQueue() : [];
  }

  function removeLegacyQueue() {
    if (window.StorageHelper) {
      window.StorageHelper.setLegacySyncQueue([]);
    }
  }

  function normalizeQueueItem(item) {
    var profile = getProfile();
    var payload = item && item.payload ? item.payload : {};
    var queueId = item.queue_id || item.id || (window.ClientId && typeof window.ClientId.queueId === 'function' ? window.ClientId.queueId() : window.TpkDb.randomId('Q'));
    var syncStatus = item.status || item.sync_status || STATUS.PENDING;

    return {
      queue_id: queueId,
      action: String(item.action || '').trim(),
      entity_type: String(item.entity_type || inferEntityType(item.action, payload)).trim(),
      entity_id_local: String(item.entity_id_local || item.local_id || payload.draft_id || payload.id_draft || '').trim(),
      client_submit_id: String(item.client_submit_id || payload.client_submit_id || '').trim(),
      payload: payload,
      status: syncStatus,
      retry_count: Number(item.retry_count || 0),
      last_error: String(item.last_error || '').trim(),
      created_at: item.created_at || nowIso(),
      updated_at: item.updated_at || nowIso(),
      id_user: String(item.id_user || profile.id_user || profile.username || '').trim(),
      id_tim: String(item.id_tim || profile.id_tim || '').trim(),
      device_id: String(item.device_id || (window.StorageHelper && window.StorageHelper.getDeviceId()) || '').trim(),
      app_version: String(item.app_version || (window.APP_CONFIG && window.APP_CONFIG.APP_VERSION) || '').trim(),
      last_synced_at: item.last_synced_at || '',
      last_result_code: Number(item.last_result_code || 0)
    };
  }

  function inferEntityType(action, payload) {
    var act = String(action || '').toLowerCase();
    var jenis = String((payload && payload.jenis_sasaran) || '').toLowerCase();
    if (act.indexOf('pendampingan') >= 0) return 'PENDAMPINGAN';
    if (act.indexOf('registrasi') >= 0 || act.indexOf('sasaran') >= 0 || jenis) return 'REGISTRASI';
    return 'GENERAL';
  }

  async function recordResult(queueId, status, code, message) {
    await window.TpkDb.put(window.TpkDb.STORES.SYNC_RESULT_LOG, {
      result_id: window.TpkDb.randomId('RES'),
      queue_id: queueId,
      status: status,
      response_code: Number(code || 0),
      message: String(message || ''),
      created_at: nowIso()
    });
  }

  async function updateSummaryState() {
    if (!window.AppState) return;
    var summary = await QueueRepo.getSummary();
    window.AppState.setSync({
      pending_count: summary.pending,
      processing_count: summary.processing,
      failed_count: summary.failed,
      conflict_count: summary.conflict,
      duplicate_count: summary.duplicate,
      success_count: summary.success,
      last_sync_at: (window.StorageHelper && window.StorageHelper.getLastSyncAt()) || ''
    });
  }

  var QueueRepo = {
    STATUS: STATUS,

    init: async function () {
      var migrated = await this.migrateLegacyQueue();
      await updateSummaryState();
      return { ok: true, migrated: migrated };
    },

    migrateLegacyQueue: async function () {
      var already = await window.TpkDb.getMeta('legacy_sync_queue_migrated', false);
      if (already) return 0;

      var legacyItems = toArray(getLegacyQueue());
      if (!legacyItems.length) {
        await window.TpkDb.setMeta('legacy_sync_queue_migrated', true);
        return 0;
      }

      var migrated = 0;
      for (var i = 0; i < legacyItems.length; i += 1) {
        var row = normalizeQueueItem(legacyItems[i]);
        if (!row.action) continue;
        await window.TpkDb.put(window.TpkDb.STORES.SYNC_QUEUE, row);
        migrated += 1;
      }

      removeLegacyQueue();
      await window.TpkDb.setMeta('legacy_sync_queue_migrated', true);
      await window.TpkDb.putAudit('LEGACY_QUEUE_MIGRATED', 'Migrated items: ' + migrated);
      return migrated;
    },

    add: async function (item) {
      var row = normalizeQueueItem(item || {});
      if (!row.action) throw new Error('Action antrean kosong.');
      await window.TpkDb.put(window.TpkDb.STORES.SYNC_QUEUE, row);
      await window.TpkDb.putAudit('QUEUE_ADD', JSON.stringify({ queue_id: row.queue_id, action: row.action }));
      await updateSummaryState();
      return row;
    },

    getById: function (queueId) {
      return window.TpkDb.get(window.TpkDb.STORES.SYNC_QUEUE, queueId);
    },

    getAll: async function () {
      var rows = await window.TpkDb.getAll(window.TpkDb.STORES.SYNC_QUEUE);
      return rows.sort(function (a, b) {
        return String(a.created_at || '').localeCompare(String(b.created_at || ''));
      });
    },

    getPending: async function (limit) {
      var rows = await window.TpkDb.listQueueByStatus(STATUS.PENDING);
      if (!limit || limit < 1) return rows;
      return rows.slice(0, limit);
    },

    update: async function (queueId, patch) {
      var current = await this.getById(queueId);
      if (!current) return null;
      var next = Object.assign({}, current, patch || {}, { updated_at: nowIso() });
      await window.TpkDb.put(window.TpkDb.STORES.SYNC_QUEUE, next);
      await updateSummaryState();
      return next;
    },

    remove: async function (queueId) {
      await window.TpkDb.delete(window.TpkDb.STORES.SYNC_QUEUE, queueId);
      await updateSummaryState();
      return true;
    },

    clearAll: async function () {
      await window.TpkDb.clear(window.TpkDb.STORES.SYNC_QUEUE);
      await updateSummaryState();
      return true;
    },

    markProcessing: function (queueId) {
      return this.update(queueId, { status: STATUS.PROCESSING, last_error: '' });
    },

    markSuccess: async function (queueId, info) {
      var updated = await this.update(queueId, {
        status: STATUS.SUCCESS,
        last_error: '',
        last_result_code: Number(info && info.code || 200),
        last_synced_at: nowIso()
      });
      await recordResult(queueId, STATUS.SUCCESS, info && info.code, info && info.message);
      window.StorageHelper && window.StorageHelper.touchLastSyncAt(updated && updated.last_synced_at);
      return updated;
    },

    markDuplicate: async function (queueId, message) {
      var updated = await this.update(queueId, {
        status: STATUS.DUPLICATE,
        last_error: String(message || ''),
        last_synced_at: nowIso(),
        last_result_code: 200
      });
      await recordResult(queueId, STATUS.DUPLICATE, 200, message);
      window.StorageHelper && window.StorageHelper.touchLastSyncAt(updated && updated.last_synced_at);
      return updated;
    },

    markConflict: async function (queueId, message, code) {
      var updated = await this.update(queueId, {
        status: STATUS.CONFLICT,
        last_error: String(message || 'Conflict'),
        last_synced_at: nowIso(),
        last_result_code: Number(code || 409)
      });
      await recordResult(queueId, STATUS.CONFLICT, code || 409, message);
      return updated;
    },

    markFailed: async function (queueId, message, code) {
      var current = await this.getById(queueId);
      var retryCount = Number(current && current.retry_count || 0) + 1;
      var updated = await this.update(queueId, {
        status: STATUS.FAILED,
        last_error: String(message || 'Sinkronisasi gagal'),
        retry_count: retryCount,
        last_synced_at: nowIso(),
        last_result_code: Number(code || 0)
      });
      await recordResult(queueId, STATUS.FAILED, code || 0, message);
      return updated;
    },

    requeue: async function (queueId, message) {
      var current = await this.getById(queueId);
      var retryCount = Number(current && current.retry_count || 0) + 1;
      return this.update(queueId, {
        status: STATUS.PENDING,
        last_error: String(message || ''),
        retry_count: retryCount,
        last_synced_at: nowIso()
      });
    },

    pruneCompleted: async function (olderThanDays) {
      var days = Number(olderThanDays || 7);
      var rows = await this.getAll();
      var now = Date.now();
      var removed = 0;
      for (var i = 0; i < rows.length; i += 1) {
        var row = rows[i];
        if ([STATUS.SUCCESS, STATUS.DUPLICATE].indexOf(row.status) === -1) continue;
        var ts = row.last_synced_at ? new Date(row.last_synced_at).getTime() : 0;
        if (!ts || (now - ts) < days * 86400000) continue;
        await this.remove(row.queue_id);
        removed += 1;
      }
      return removed;
    },

    getSummary: async function () {
      var rows = await this.getAll();
      return rows.reduce(function (acc, row) {
        acc.total += 1;
        var status = row.status || STATUS.PENDING;
        if (status === STATUS.PENDING) acc.pending += 1;
        if (status === STATUS.PROCESSING) acc.processing += 1;
        if (status === STATUS.SUCCESS) acc.success += 1;
        if (status === STATUS.FAILED) acc.failed += 1;
        if (status === STATUS.CONFLICT) acc.conflict += 1;
        if (status === STATUS.DUPLICATE) acc.duplicate += 1;
        return acc;
      }, {
        total: 0,
        pending: 0,
        processing: 0,
        success: 0,
        failed: 0,
        conflict: 0,
        duplicate: 0
      });
    },

    toLegacyItems: async function () {
      var rows = await this.getAll();
      return rows.map(function (item) {
        return {
          id: item.queue_id,
          action: item.action,
          payload: item.payload || {},
          client_submit_id: item.client_submit_id || '',
          created_at: item.created_at || '',
          retry_count: Number(item.retry_count || 0),
          sync_status: item.status || STATUS.PENDING,
          last_error: item.last_error || '',
          last_synced_at: item.last_synced_at || ''
        };
      });
    }
  };

  window.QueueRepo = QueueRepo;
})(window);
