(function (window, document) {
  'use strict';

  var isSyncing = false;
  var lastSyncAt = '';
  var lastSummary = { total: 0, pending: 0, failed: 0, processing: 0, conflict: 0, success: 0, drafts: 0, dashboard_pending: 0 };

  function nowIso() { return new Date().toISOString(); }
  function getRepo() { return window.QueueRepo || null; }
  function getApi() { return window.Api || null; }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value == null || value === '' ? '0' : String(value);
  }

  function showToast(message, type) {
    if (window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(message, type || 'info');
      return;
    }
    if (window.Notifier && typeof window.Notifier.show === 'function') {
      window.Notifier.show(message, type || 'info');
      return;
    }
    try { console.log('[TPK Sync]', message); } catch (err) {}
  }

  function normalizeStatus(value) {
    return String(value || 'PENDING').trim().toUpperCase() || 'PENDING';
  }

  function shouldAutoSyncOnOnline() {
    var cfg = window.APP_CONFIG || {};
    var syncCfg = cfg.SYNC || cfg.OFFLINE || {};
    return syncCfg.AUTO_SYNC_ON_ONLINE === true;
  }

  async function getSummary() {
    var repo = getRepo();
    if (!repo || typeof repo.getSummary !== 'function') return lastSummary;
    lastSummary = await repo.getSummary();
    return lastSummary;
  }

  async function updateBadge() {
    var summary = await getSummary();
    var dashboardPending = Number(summary.dashboard_pending || 0);
    if (!dashboardPending) {
      dashboardPending = Number(summary.pending || 0) + Number(summary.failed || 0) + Number(summary.conflict || 0) + Number(summary.drafts || 0);
    }

    setText('stat-draft', dashboardPending);
    setText('sync-total-count', summary.total || 0);
    setText('sync-pending-count', summary.pending || 0);
    setText('sync-failed-count', summary.failed || 0);

    var meta = document.getElementById('sync-screen-meta');
    if (meta) {
      if (!summary.total && !summary.drafts) {
        meta.textContent = 'Tidak ada draft offline.';
      } else {
        meta.textContent = 'Antrean: ' + (summary.total || 0) +
          ' | Draft: ' + (summary.drafts || 0) +
          ' | Pending: ' + (summary.pending || 0) +
          ' | Gagal: ' + (summary.failed || 0) +
          (lastSyncAt ? ' | Sync terakhir: ' + lastSyncAt : '');
      }
    }

    if (window.AppState && typeof window.AppState.setSyncSummary === 'function') {
      window.AppState.setSyncSummary(summary);
    }

    return summary;
  }

  function extractErrorMessage(result, fallback) {
    if (!result) return fallback || 'Sinkronisasi gagal.';
    return result.message || (result.error && result.error.message) || fallback || 'Sinkronisasi gagal.';
  }

  function isConflictResult(result) {
    var code = Number(result && result.code || 0);
    var status = String(result && (result.status || result.business_status || '') || '').toUpperCase();
    var msg = String(result && result.message || '').toLowerCase();
    return code === 409 || status === 'CONFLICT' || msg.indexOf('conflict') >= 0 || msg.indexOf('bentrok') >= 0;
  }

  function isDuplicateSafeResult(result) {
    var data = result && result.data || {};
    var msg = String(result && result.message || '').toLowerCase();
    return data.duplicate === true || data.is_duplicate === true || msg.indexOf('duplicate') >= 0 || msg.indexOf('sudah pernah') >= 0;
  }

  async function syncItem(item) {
    var repo = getRepo();
    var api = getApi();
    if (!repo || !api || typeof api.post !== 'function') {
      return { ok: false, message: 'QueueRepo/API belum siap.' };
    }

    if (!item || !item.action) {
      return { ok: false, message: 'Item antrean tidak valid.' };
    }

    var id = item.id || item.client_submit_id;
    await repo.update(id, { sync_status: 'PROCESSING', status: 'PROCESSING', last_error: '', last_synced_at: nowIso() });

    try {
      var payload = Object.assign({}, item.payload || {}, {
        sync_source: (item.payload && item.payload.sync_source) || item.sync_source || 'OFFLINE_QUEUE'
      });

      var result = await api.post(item.action, payload, {
        clientSubmitId: item.client_submit_id || payload.client_submit_id || '',
        syncSource: payload.sync_source || 'OFFLINE_QUEUE',
        timeoutMs: 45000,
        retryCount: 0,
        meta: {
          queue_id: id,
          sync_source: payload.sync_source || 'OFFLINE_QUEUE'
        }
      });

      if (result && result.ok) {
        await repo.removeById(id);
        await updateBadge();
        return { ok: true, data: result.data || {}, duplicate_safe: isDuplicateSafeResult(result) };
      }

      var message = extractErrorMessage(result, 'Sinkronisasi gagal.');
      var status = isConflictResult(result) ? 'CONFLICT' : 'FAILED';
      await repo.update(id, {
        sync_status: status,
        status: status,
        retry_count: Number(item.retry_count || 0) + 1,
        last_error: message,
        last_synced_at: nowIso()
      });
      await updateBadge();
      return { ok: false, status: status, message: message };
    } catch (err) {
      var errMsg = err && err.message ? err.message : 'Sinkronisasi gagal karena koneksi.';
      await repo.update(id, {
        sync_status: 'FAILED',
        status: 'FAILED',
        retry_count: Number(item.retry_count || 0) + 1,
        last_error: errMsg,
        last_synced_at: nowIso()
      });
      await updateBadge();
      return { ok: false, status: 'FAILED', message: errMsg };
    }
  }

  async function syncAll(options) {
    var opts = options || {};
    if (isSyncing && opts.force !== true) {
      return { ok: false, message: 'Sinkronisasi sedang berjalan.', synced: 0, failed: 0 };
    }

    if (navigator.onLine === false) {
      showToast('Masih offline. Sinkronisasi belum dapat dijalankan.', 'warning');
      return { ok: false, message: 'Offline', synced: 0, failed: 0 };
    }

    var repo = getRepo();
    if (!repo || typeof repo.list !== 'function') {
      return { ok: false, message: 'QueueRepo belum siap.', synced: 0, failed: 0 };
    }

    isSyncing = true;
    try {
      var queue = await repo.list();
      queue = queue.filter(function (item) {
        var status = normalizeStatus(item.sync_status || item.status);
        return status === 'PENDING' || status === 'FAILED';
      });

      if (!queue.length) {
        await updateBadge();
        showToast('Tidak ada antrean yang perlu disinkronkan.', 'info');
        return { ok: true, synced: 0, failed: 0 };
      }

      var synced = 0;
      var failed = 0;
      for (var i = 0; i < queue.length; i += 1) {
        var result = await syncItem(queue[i]);
        if (result && result.ok) synced += 1;
        else failed += 1;
      }

      lastSyncAt = nowIso();
      await updateBadge();
      if (failed) showToast('Sinkronisasi selesai. Berhasil: ' + synced + ', gagal: ' + failed, 'warning');
      else showToast('Sinkronisasi selesai. Berhasil: ' + synced, 'success');
      return { ok: failed === 0, synced: synced, failed: failed };
    } finally {
      isSyncing = false;
    }
  }

  async function retryOne(itemId) {
    var repo = getRepo();
    if (!repo || typeof repo.list !== 'function') return { ok: false, message: 'QueueRepo belum siap.' };
    var rows = await repo.list();
    var item = rows.find(function (row) { return String(row.id || row.client_submit_id) === String(itemId); });
    if (!item) return { ok: false, message: 'Item antrean tidak ditemukan.' };
    return syncItem(item);
  }

  function bindAutoSync() {
    if (window.__tpkSyncAutoBound) return;
    window.__tpkSyncAutoBound = true;

    window.addEventListener('online', function () {
      updateBadge();
      if (shouldAutoSyncOnOnline()) {
        window.setTimeout(function () { syncAll({ force: false }); }, 1500);
      }
    });
    window.addEventListener('offline', function () { updateBadge(); });
    window.addEventListener('tpk:queue-changed', function () { updateBadge(); });

    var repo = getRepo();
    if (repo && typeof repo.onChange === 'function') repo.onChange(updateBadge);
  }

  function init() {
    bindAutoSync();
    updateBadge();
  }

  var SyncManager = {
    init: init,
    bindAutoSync: bindAutoSync,
    updateBadge: updateBadge,
    getSummary: getSummary,
    syncItem: syncItem,
    syncAll: syncAll,
    retryOne: retryOne,
    isSyncing: function () { return isSyncing; }
  };

  window.SyncManager = SyncManager;
  init();
})(window, document);
