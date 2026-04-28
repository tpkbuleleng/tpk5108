(function (window) {
  'use strict';

  var isInitialized = false;
  var isRunning = false;

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getObsGroup(name, fallbackMap) {
    var cfg = getConfig();
    var src = cfg && cfg.OBSERVABILITY && cfg.OBSERVABILITY[name] ? cfg.OBSERVABILITY[name] : null;
    return src || fallbackMap || {};
  }

  var SYNC_OBS = {
    BUSINESS_STATUS: getObsGroup('BUSINESS_STATUS', {
      SUCCESS: 'SUCCESS',
      DUPLICATE: 'DUPLICATE',
      CONFLICT: 'CONFLICT',
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      UNAUTHORIZED: 'UNAUTHORIZED',
      FORBIDDEN: 'FORBIDDEN',
      NOT_FOUND: 'NOT_FOUND',
      RATE_LIMITED: 'RATE_LIMITED',
      SERVER_ERROR: 'SERVER_ERROR',
      REJECTED: 'REJECTED'
    }),
    STATUS_SYNC: getObsGroup('STATUS_SYNC', {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      SUCCESS: 'SUCCESS',
      FAILED: 'FAILED'
    })
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function getState() {
    return window.AppState || null;
  }

  function getQueueRepo() {
    return window.QueueRepo || null;
  }

  function getApi() {
    return window.Api || null;
  }

  function getDb() {
    return window.AppDB || null;
  }

  function showToast(message, type) {
    if (window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(message, type || 'info');
      return;
    }
    try {
      console.log('[SYNC]', type || 'info', message);
    } catch (err) {}
  }

  function lower(text) {
    return String(text || '').toLowerCase();
  }

  function detectConflict(result) {
    var code = Number(result && result.code || 0);
    var message = lower(result && result.message);
    return code === 409 || message.indexOf('conflict') >= 0 || message.indexOf('versi') >= 0 || message.indexOf('bentrok') >= 0;
  }

  function detectDuplicate(result) {
    var code = Number(result && result.code || 0);
    var message = lower(result && result.message);
    return message.indexOf('duplicate') >= 0 || message.indexOf('sudah pernah') >= 0 || message.indexOf('duplikat') >= 0 || code === 208;
  }

  function getBusinessStatusFromResult(result) {
    var rawCandidates = [
      result && result.business_status,
      result && result.businessStatus,
      result && result.status_business,
      result && result.data && result.data.business_status,
      result && result.data && result.data.businessStatus,
      result && result.raw && result.raw.business_status,
      result && result.raw && result.raw.businessStatus,
      result && result.raw && result.raw.data && result.raw.data.business_status,
      result && result.raw && result.raw.data && result.raw.data.businessStatus
    ];

    for (var i = 0; i < rawCandidates.length; i += 1) {
      var value = String(rawCandidates[i] || '').trim().toUpperCase();
      if (value && SYNC_OBS.BUSINESS_STATUS[value]) {
        return SYNC_OBS.BUSINESS_STATUS[value];
      }
      if (value === 'DUPLICATE_BLOCKED') {
        return SYNC_OBS.BUSINESS_STATUS.DUPLICATE;
      }
      if (value === 'ERROR') {
        return SYNC_OBS.BUSINESS_STATUS.SERVER_ERROR;
      }
      if (value === 'FAILED') {
        return SYNC_OBS.BUSINESS_STATUS.REJECTED;
      }
    }

    if (detectDuplicate(result)) return SYNC_OBS.BUSINESS_STATUS.DUPLICATE;
    if (detectConflict(result)) return SYNC_OBS.BUSINESS_STATUS.CONFLICT;

    var code = Number(result && result.code || 0);
    if (code === 401) return SYNC_OBS.BUSINESS_STATUS.UNAUTHORIZED;
    if (code === 403) return SYNC_OBS.BUSINESS_STATUS.FORBIDDEN;
    if (code === 404) return SYNC_OBS.BUSINESS_STATUS.NOT_FOUND;
    if (code === 409) return SYNC_OBS.BUSINESS_STATUS.CONFLICT;
    if (code === 422) return SYNC_OBS.BUSINESS_STATUS.VALIDATION_ERROR;
    if (code === 429) return SYNC_OBS.BUSINESS_STATUS.RATE_LIMITED;
    if (code >= 500) return SYNC_OBS.BUSINESS_STATUS.SERVER_ERROR;
    if (result && result.ok === true) return SYNC_OBS.BUSINESS_STATUS.SUCCESS;

    var message = lower(result && result.message);
    if (message.indexOf('validasi') >= 0) return SYNC_OBS.BUSINESS_STATUS.VALIDATION_ERROR;
    if (message.indexOf('unauthorized') >= 0 || message.indexOf('session') >= 0 || message.indexOf('token') >= 0) return SYNC_OBS.BUSINESS_STATUS.UNAUTHORIZED;
    if (message.indexOf('forbidden') >= 0 || message.indexOf('tidak berhak') >= 0 || message.indexOf('scope') >= 0) return SYNC_OBS.BUSINESS_STATUS.FORBIDDEN;
    if (message.indexOf('tidak ditemukan') >= 0 || message.indexOf('not found') >= 0) return SYNC_OBS.BUSINESS_STATUS.NOT_FOUND;
    if (message.indexOf('rate') >= 0 && message.indexOf('limit') >= 0) return SYNC_OBS.BUSINESS_STATUS.RATE_LIMITED;

    return SYNC_OBS.BUSINESS_STATUS.REJECTED;
  }

  async function logResult(queueId, statusSync, businessStatus, responseCode, message, raw) {
    var db = getDb();
    if (!db || typeof db.put !== 'function') return;

    await db.put(db.STORES.SYNC_RESULT_LOG, {
      result_id: 'RES-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      queue_id: String(queueId || ''),
      status: String(statusSync || ''),
      business_status: String(businessStatus || ''),
      response_code: Number(responseCode || 0),
      message: String(message || ''),
      raw: raw || null,
      created_at: nowIso()
    });
  }

  function setSyncState(isSyncing) {
    var state = getState();
    if (state && typeof state.setSyncing === 'function') {
      state.setSyncing(!!isSyncing);
    }
  }

  async function postQueueItem(item) {
    var api = getApi();
    if (!api || typeof api.post !== 'function') {
      throw new Error('Api.post belum tersedia.');
    }

    var payload = Object.assign({}, item.payload || {});
    if (!payload.client_submit_id && item.client_submit_id) {
      payload.client_submit_id = item.client_submit_id;
    }
    if (!payload.sync_source) {
      payload.sync_source = 'OFFLINE_QUEUE';
    }
    if (!payload.queue_id && item.queue_id) {
      payload.queue_id = item.queue_id;
    }
    if (payload.retry_count === undefined || payload.retry_count === null || payload.retry_count === '') {
      payload.retry_count = Number(item.retry_count || 0);
    }

    return api.post(item.action, payload, {
      includeAuth: true,
      clientSubmitId: payload.client_submit_id || '',
      syncSource: payload.sync_source || 'OFFLINE_QUEUE',
      meta: {
        queue_id: item.queue_id || '',
        retry_count: Number(item.retry_count || 0)
      }
    });
  }

  async function syncOne(item) {
    var repo = getQueueRepo();
    if (!repo) throw new Error('QueueRepo belum tersedia.');

    await repo.markProcessing(item.queue_id);

    try {
      var result = await postQueueItem(item);
      var businessStatus = getBusinessStatusFromResult(result);
      var responseCode = Number(result && result.code || 0);
      var responseMessage = result && result.message ? result.message : 'Sinkronisasi item selesai.';

      if (businessStatus === SYNC_OBS.BUSINESS_STATUS.DUPLICATE) {
        await repo.markDuplicate(item.queue_id, {
          last_error: '',
          last_response_code: responseCode || 208
        });
        await logResult(item.queue_id, SYNC_OBS.STATUS_SYNC.SUCCESS, SYNC_OBS.BUSINESS_STATUS.DUPLICATE, responseCode || 208, responseMessage || 'Duplicate aman', result);
        return { status_sync: SYNC_OBS.STATUS_SYNC.SUCCESS, business_status: SYNC_OBS.BUSINESS_STATUS.DUPLICATE, result: result };
      }

      if (businessStatus === SYNC_OBS.BUSINESS_STATUS.CONFLICT) {
        await repo.markConflict(item.queue_id, {
          last_response_code: responseCode || 409,
          last_error: String(responseMessage || 'Conflict')
        });
        await logResult(item.queue_id, SYNC_OBS.STATUS_SYNC.FAILED, SYNC_OBS.BUSINESS_STATUS.CONFLICT, responseCode || 409, responseMessage || 'Conflict', result);
        return { status_sync: SYNC_OBS.STATUS_SYNC.FAILED, business_status: SYNC_OBS.BUSINESS_STATUS.CONFLICT, result: result };
      }

      if (result && result.ok === true || businessStatus === SYNC_OBS.BUSINESS_STATUS.SUCCESS) {
        await repo.markSuccess(item.queue_id, {
          last_error: '',
          last_response_code: responseCode || 200
        });
        await logResult(item.queue_id, SYNC_OBS.STATUS_SYNC.SUCCESS, SYNC_OBS.BUSINESS_STATUS.SUCCESS, responseCode || 200, responseMessage || 'OK', result);
        return { status_sync: SYNC_OBS.STATUS_SYNC.SUCCESS, business_status: SYNC_OBS.BUSINESS_STATUS.SUCCESS, result: result };
      }

      await repo.markFailed(item.queue_id, responseMessage || 'Sinkronisasi item gagal.');
      await logResult(item.queue_id, SYNC_OBS.STATUS_SYNC.FAILED, businessStatus, responseCode, responseMessage, result);
      return { status_sync: SYNC_OBS.STATUS_SYNC.FAILED, business_status: businessStatus, result: result };
    } catch (err) {
      await repo.markFailed(item.queue_id, err && err.message ? err.message : String(err));
      await logResult(item.queue_id, SYNC_OBS.STATUS_SYNC.FAILED, SYNC_OBS.BUSINESS_STATUS.SERVER_ERROR, 0, err && err.message ? err.message : String(err), null);
      return { status_sync: SYNC_OBS.STATUS_SYNC.FAILED, business_status: SYNC_OBS.BUSINESS_STATUS.SERVER_ERROR, error: err };
    }
  }

  async function syncAll(options) {
    var repo = getQueueRepo();
    var state = getState();
    if (!repo) throw new Error('QueueRepo belum tersedia.');
    if (isRunning) {
      return {
        ok: false,
        message: 'Sinkronisasi sedang berjalan.'
      };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        ok: false,
        message: 'Perangkat sedang offline.'
      };
    }

    isRunning = true;
    setSyncState(true);

    var limit = Number(options && options.limit || getConfig().SYNC_BATCH_SIZE || 20);
    var queue = [];
    var summary = {
      ok: true,
      total: 0,
      success: 0,
      failed: 0,
      conflict: 0,
      duplicate: 0,
      message: 'Sinkronisasi selesai.'
    };

    try {
      queue = await repo.getPending(limit);
      summary.total = queue.length;

      for (var i = 0; i < queue.length; i += 1) {
        var outcome = await syncOne(queue[i]);
        if (outcome.business_status === SYNC_OBS.BUSINESS_STATUS.SUCCESS) summary.success += 1;
        else if (outcome.business_status === SYNC_OBS.BUSINESS_STATUS.CONFLICT) summary.conflict += 1;
        else if (outcome.business_status === SYNC_OBS.BUSINESS_STATUS.DUPLICATE) summary.duplicate += 1;
        else summary.failed += 1;
      }

      if (state && typeof state.setLastSyncAt === 'function') {
        state.setLastSyncAt(nowIso());
      }
      if (repo && typeof repo.syncLegacyMirror === 'function') {
        await repo.syncLegacyMirror();
      }

      if (summary.total === 0) {
        summary.message = 'Belum ada antrean untuk disinkronkan.';
      } else if (summary.success === summary.total) {
        summary.message = 'Semua antrean berhasil disinkronkan.';
      } else if (summary.success > 0) {
        summary.message = summary.success + ' berhasil, ' + summary.failed + ' gagal, ' + summary.conflict + ' conflict.';
      } else if (summary.duplicate > 0 && summary.failed === 0 && summary.conflict === 0) {
        summary.message = 'Antrean terdeteksi duplikat aman.';
      } else {
        summary.message = 'Sinkronisasi selesai dengan catatan.';
      }

      return summary;
    } finally {
      isRunning = false;
      setSyncState(false);
    }
  }

  function bindNetworkAutoSync() {
    if (window.__tpkSyncAutoBound === true) return;
    window.__tpkSyncAutoBound = true;

    window.addEventListener('online', function () {
      window.setTimeout(function () {
        syncAll({ limit: Number(getConfig().SYNC_BATCH_SIZE || 20) })
          .then(function (summary) {
            if (summary && summary.total > 0) {
              showToast(summary.message || 'Sinkronisasi otomatis selesai.', 'info');
            }
          })
          .catch(function () {});
      }, 700);
    });
  }

  var SyncManager = {
    init: function () {
      if (isInitialized) return;
      isInitialized = true;
      bindNetworkAutoSync();
    },
    syncAll: syncAll,
    syncOne: syncOne,
    isSyncing: function () {
      return !!isRunning;
    }
  };

  window.SyncManager = SyncManager;
})(window);
