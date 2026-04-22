
(function (window) {
  'use strict';

  var isInitialized = false;
  var isRunning = false;

  function nowIso() {
    return new Date().toISOString();
  }

  function getConfig() {
    return window.APP_CONFIG || {};
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

  async function logResult(queueId, status, responseCode, message, raw) {
    var db = getDb();
    if (!db || typeof db.put !== 'function') return;

    await db.put(db.STORES.SYNC_RESULT_LOG, {
      result_id: 'RES-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      queue_id: String(queueId || ''),
      status: String(status || ''),
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

      if (result && result.ok === true) {
        await repo.markSuccess(item.queue_id, {
          last_error: '',
          last_response_code: Number(result.code || 200)
        });
        await logResult(item.queue_id, 'SUCCESS', result.code || 200, result.message || 'OK', result);
        return { status: 'SUCCESS', result: result };
      }

      if (detectDuplicate(result)) {
        await repo.markDuplicate(item.queue_id, {
          last_error: '',
          last_response_code: Number(result && result.code || 208)
        });
        await logResult(item.queue_id, 'DUPLICATE', result && result.code || 208, result && result.message || 'Duplicate aman', result);
        return { status: 'DUPLICATE', result: result };
      }

      if (detectConflict(result)) {
        await repo.markConflict(item.queue_id, {
          last_response_code: Number(result && result.code || 409),
          last_error: String(result && result.message || 'Conflict')
        });
        await logResult(item.queue_id, 'CONFLICT', result && result.code || 409, result && result.message || 'Conflict', result);
        return { status: 'CONFLICT', result: result };
      }

      throw new Error((result && result.message) || 'Sinkronisasi item gagal.');
    } catch (err) {
      await repo.markFailed(item.queue_id, err && err.message ? err.message : String(err));
      await logResult(item.queue_id, 'FAILED', 0, err && err.message ? err.message : String(err), null);
      return { status: 'FAILED', error: err };
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
        if (outcome.status === 'SUCCESS') summary.success += 1;
        else if (outcome.status === 'FAILED') summary.failed += 1;
        else if (outcome.status === 'CONFLICT') summary.conflict += 1;
        else if (outcome.status === 'DUPLICATE') summary.duplicate += 1;
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
