(function (window, document) {
  'use strict';

  var isSyncing = false;
  var autoSyncTimer = null;
  var initialized = false;

  function getBatchSize() {
    var cfg = window.APP_CONFIG || {};
    return Number(cfg.SYNC_BATCH_SIZE || cfg.SYNC_QUEUE_BATCH_SIZE || 5);
  }

  function notify(message, type) {
    if (window.Notifier && typeof window.Notifier.show === 'function') {
      window.Notifier.show(message, type || 'info');
      return;
    }
    console.log('[SyncManager]', message);
  }

  function normalizeError(err) {
    if (!err) return 'Terjadi kesalahan sinkronisasi.';
    if (typeof err === 'string') return err;
    return err.message || 'Terjadi kesalahan sinkronisasi.';
  }

  function isUnauthorizedResponse(response) {
    var code = Number(response && response.code || 0);
    return code === 401 || code === 403;
  }

  function isConflictResponse(response) {
    var status = String(response && response.status || '').toLowerCase();
    var code = Number(response && response.code || 0);
    return status === 'conflict' || code === 409;
  }

  function isDuplicateResponse(response) {
    var status = String(response && response.status || '').toLowerCase();
    var code = Number(response && response.code || 0);
    var message = String(response && response.message || '').toLowerCase();
    return status === 'duplicate' || message.indexOf('duplicate') >= 0 || message.indexOf('duplikat') >= 0 || code === 208;
  }

  function isValidationResponse(response) {
    var status = String(response && response.status || '').toLowerCase();
    var code = Number(response && response.code || 0);
    return status === 'validation_error' || code === 400 || code === 422;
  }

  async function refreshSummary() {
    if (!window.QueueRepo) return null;
    var summary = await window.QueueRepo.getSummary();
    if (window.AppState) {
      window.AppState.setSync({
        pending_count: summary.pending,
        processing_count: summary.processing,
        success_count: summary.success,
        failed_count: summary.failed,
        conflict_count: summary.conflict,
        duplicate_count: summary.duplicate,
        is_syncing: isSyncing,
        last_sync_at: (window.StorageHelper && window.StorageHelper.getLastSyncAt()) || ''
      });
    }
    renderSummary(summary);
    return summary;
  }

  function renderSummary(summary) {
    var container = document.getElementById('sync-summary');
    if (!container) return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    var data = summary || { total: 0, pending: 0, failed: 0, conflict: 0, duplicate: 0, processing: 0, success: 0 };

    if (!data.total) {
      var empty = document.createElement('p');
      empty.className = 'muted-text';
      empty.textContent = 'Tidak ada draft offline. Semua data sudah bersih.';
      container.appendChild(empty);
      return;
    }

    var wrap = document.createElement('div');
    wrap.className = 'profile-grid';

    [
      ['Total Draft', data.total],
      ['Pending', data.pending],
      ['Gagal', data.failed],
      ['Konflik', data.conflict]
    ].forEach(function (entry) {
      var item = document.createElement('div');
      var label = document.createElement('span');
      label.className = 'label';
      label.textContent = entry[0];
      var strong = document.createElement('strong');
      strong.textContent = String(entry[1]);
      item.appendChild(label);
      item.appendChild(strong);
      wrap.appendChild(item);
    });

    container.appendChild(wrap);
  }

  function buildMeta(item) {
    return {
      clientSubmitId: item.client_submit_id || (item.payload && item.payload.client_submit_id) || '',
      syncSource: (item.payload && item.payload.sync_source) || 'OFFLINE_QUEUE',
      deviceId: item.device_id || ((window.StorageHelper && window.StorageHelper.getDeviceId()) || ''),
      appVersion: item.app_version || ((window.APP_CONFIG && window.APP_CONFIG.APP_VERSION) || '')
    };
  }

  async function afterSuccess(item, response) {
    await window.TpkDb.putAudit('SYNC_ITEM_SUCCESS', JSON.stringify({
      queue_id: item.queue_id,
      action: item.action,
      entity_type: item.entity_type,
      message: response && response.message ? response.message : ''
    }));

    if (item.entity_type === 'REGISTRASI' && item.entity_id_local) {
      await window.TpkDb.delete(window.TpkDb.STORES.DRAFT_REGISTRASI, item.entity_id_local);
    }
    if (item.entity_type === 'PENDAMPINGAN' && item.entity_id_local) {
      await window.TpkDb.delete(window.TpkDb.STORES.DRAFT_PENDAMPINGAN, item.entity_id_local);
    }
  }

  var SyncManager = {
    init: async function () {
      if (initialized) return { ok: true };
      if (!window.TpkDb || !window.QueueRepo) throw new Error('db.js dan queueRepo.js harus dimuat lebih dulu.');

      await window.QueueRepo.init();
      await refreshSummary();

      window.addEventListener('online', function () {
        notify('Koneksi kembali online. Sinkronisasi dapat dijalankan.', 'success');
        SyncManager.scheduleAutoSync(1000);
      });

      window.addEventListener('offline', function () {
        notify('Perangkat sedang offline.', 'warn');
      });

      window.addEventListener('tpk:sync-summary-refresh', function () {
        refreshSummary();
      });

      this.installCompatibilityBridge();
      initialized = true;
      return { ok: true };
    },

    isSyncing: function () {
      return isSyncing;
    },

    scheduleAutoSync: function (delayMs) {
      if (autoSyncTimer) {
        window.clearTimeout(autoSyncTimer);
      }
      autoSyncTimer = window.setTimeout(function () {
        if (navigator.onLine) {
          SyncManager.syncAll({ silent: true }).catch(function () {});
        }
      }, Number(delayMs || 400));
    },

    enqueue: async function (action, payload, options) {
      var profile = (window.StorageHelper && window.StorageHelper.getProfile()) || {};
      var item = await window.QueueRepo.add({
        action: action,
        payload: payload || {},
        entity_type: options && options.entityType,
        entity_id_local: options && options.entityIdLocal,
        client_submit_id: (options && options.clientSubmitId) || (payload && payload.client_submit_id) || '',
        id_user: profile.id_user || profile.username || '',
        id_tim: profile.id_tim || '',
        device_id: (window.StorageHelper && window.StorageHelper.getDeviceId()) || '',
        app_version: (window.APP_CONFIG && window.APP_CONFIG.APP_VERSION) || ''
      });
      await refreshSummary();
      return item;
    },

    syncAll: async function (options) {
      if (isSyncing) {
        return { ok: false, message: 'Sinkronisasi sedang berjalan.' };
      }
      if (!navigator.onLine) {
        if (!options || !options.silent) notify('Masih offline. Sinkronisasi belum dapat dijalankan.', 'warn');
        await refreshSummary();
        return { ok: false, message: 'Offline', synced: 0, failed: 0 };
      }
      if (!window.Api || typeof window.Api.post !== 'function') {
        return { ok: false, message: 'Api.post belum tersedia.' };
      }

      isSyncing = true;
      if (window.AppState) {
        window.AppState.setSync({ is_syncing: true, last_error: '' });
      }

      var synced = 0;
      var failed = 0;
      var results = [];

      try {
        var queue = await window.QueueRepo.getPending(getBatchSize());
        if (!queue.length) {
          await refreshSummary();
          if (!options || !options.silent) notify('Tidak ada draft yang perlu disinkronkan.', 'info');
          return { ok: true, synced: 0, failed: 0, results: [] };
        }

        for (var i = 0; i < queue.length; i += 1) {
          var item = queue[i];
          var result = await this.syncItem(item);
          results.push(result);
          if (result.ok) synced += 1; else failed += 1;
          if (result.stopSync) break;
        }

        await window.QueueRepo.pruneCompleted(7);
        await refreshSummary();

        if (!options || !options.silent) {
          if (failed > 0) {
            notify('Sinkronisasi selesai. Berhasil: ' + synced + ', gagal: ' + failed, 'warn');
          } else {
            notify('Sinkronisasi selesai. Berhasil: ' + synced, 'success');
          }
        }

        if (window.AppState) {
          window.AppState.setSync({
            is_syncing: false,
            last_sync_at: (window.StorageHelper && window.StorageHelper.getLastSyncAt()) || new Date().toISOString(),
            last_error: ''
          });
        }

        return { ok: failed === 0, synced: synced, failed: failed, results: results };
      } catch (err) {
        var message = normalizeError(err);
        if (window.AppState) {
          window.AppState.setSync({ is_syncing: false, last_error: message });
        }
        await window.TpkDb.putAudit('SYNC_FATAL_ERROR', message);
        throw err;
      } finally {
        isSyncing = false;
      }
    },

    retryOne: async function (queueId) {
      var item = await window.QueueRepo.getById(queueId);
      if (!item) {
        notify('Item antrean tidak ditemukan.', 'warn');
        return null;
      }
      return this.syncItem(item);
    },

    syncItem: async function (item) {
      if (!item || !item.action) {
        return { ok: false, message: 'Action antrean kosong.' };
      }

      await window.QueueRepo.markProcessing(item.queue_id);
      await refreshSummary();

      try {
        var response = await window.Api.post(item.action, item.payload || {}, buildMeta(item));

        if (response && response.ok) {
          await window.QueueRepo.markSuccess(item.queue_id, { code: response.code, message: response.message || 'Sinkronisasi berhasil.' });
          await afterSuccess(item, response);
          return { ok: true, queue_id: item.queue_id, data: response.data || {} };
        }

        if (isDuplicateResponse(response)) {
          await window.QueueRepo.markDuplicate(item.queue_id, response && response.message || 'Duplicate request.');
          return { ok: true, queue_id: item.queue_id, duplicate: true, data: response && response.data || {} };
        }

        if (isConflictResponse(response)) {
          await window.QueueRepo.markConflict(item.queue_id, response && response.message || 'Conflict', response && response.code || 409);
          return { ok: false, queue_id: item.queue_id, conflict: true, response: response };
        }

        if (isUnauthorizedResponse(response)) {
          await window.QueueRepo.markFailed(item.queue_id, response && response.message || 'Unauthorized', response && response.code || 401);
          return { ok: false, queue_id: item.queue_id, stopSync: true, response: response };
        }

        if (isValidationResponse(response)) {
          await window.QueueRepo.markFailed(item.queue_id, response && response.message || 'Validation error', response && response.code || 422);
          return { ok: false, queue_id: item.queue_id, response: response };
        }

        await window.QueueRepo.requeue(item.queue_id, response && response.message || 'Akan dicoba lagi nanti.');
        return { ok: false, queue_id: item.queue_id, response: response };
      } catch (err) {
        var message = normalizeError(err);
        if (/network|fetch|offline|internet/i.test(message)) {
          await window.QueueRepo.requeue(item.queue_id, message);
          return { ok: false, queue_id: item.queue_id, stopSync: true, message: message };
        }
        await window.QueueRepo.markFailed(item.queue_id, message, 0);
        return { ok: false, queue_id: item.queue_id, message: message };
      } finally {
        await refreshSummary();
      }
    },

    installCompatibilityBridge: function () {
      window.OfflineSync = {
        getQueue: function () {
          console.warn('OfflineSync.getQueue() sekarang async. Gunakan await OfflineSync.getQueueAsync() bila perlu.');
          return [];
        },
        getQueueAsync: function () {
          return window.QueueRepo.toLegacyItems();
        },
        saveQueue: async function (queue) {
          await window.QueueRepo.clearAll();
          var rows = Array.isArray(queue) ? queue : [];
          for (var i = 0; i < rows.length; i += 1) {
            await window.QueueRepo.add(rows[i]);
          }
          await refreshSummary();
          return window.QueueRepo.toLegacyItems();
        },
        add: function (item) {
          return SyncManager.enqueue(item.action, item.payload || {}, {
            entityType: item.entity_type,
            entityIdLocal: item.entity_id_local || item.id,
            clientSubmitId: item.client_submit_id || (item.payload && item.payload.client_submit_id)
          });
        },
        update: function (itemId, patch) {
          return window.QueueRepo.update(itemId, {
            status: patch && patch.sync_status ? patch.sync_status : undefined,
            retry_count: patch && patch.retry_count,
            last_error: patch && patch.last_error,
            last_synced_at: patch && patch.last_synced_at
          });
        },
        removeById: function (itemId) {
          return window.QueueRepo.remove(itemId);
        },
        clearAll: function () {
          return window.QueueRepo.clearAll();
        },
        retryOne: function (itemId) {
          return SyncManager.retryOne(itemId);
        },
        syncAll: function () {
          return SyncManager.syncAll();
        },
        syncItem: function (item) {
          return SyncManager.syncItem(item);
        },
        renderSummary: function () {
          return refreshSummary();
        }
      };
    }
  };

  window.SyncManager = SyncManager;

  function autoInit() {
    SyncManager.init().catch(function (err) {
      console.warn('[SyncManager] init gagal:', err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit, { once: true });
  } else {
    autoInit();
  }
})(window, document);
