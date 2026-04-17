(function (window) {
  'use strict';

  if (!window.QueueRepo || !window.TpkDb) {
    throw new Error('syncManager.js requires db.js and queueRepo.js to be loaded first.');
  }

  const DEFAULT_BATCH_SIZE = 5;
  let isSyncing = false;
  let autoSyncBound = false;

  function getBatchSize() {
    const configValue = window.APP_CONFIG && window.APP_CONFIG.SYNC_BATCH_SIZE;
    const value = Number(configValue || DEFAULT_BATCH_SIZE);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_BATCH_SIZE;
  }

  function isOnline() {
    return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  }

  function normalizeError(err) {
    if (!err) return 'Unknown sync error';
    if (typeof err === 'string') return err;
    return err.message || 'Unknown sync error';
  }

  async function updateCountsState() {
    if (!window.AppState) return;
    const counts = await window.QueueRepo.getCounts();
    window.AppState.setSync({
      pending_count: counts.PENDING || 0,
      processing_count: counts.PROCESSING || 0,
      success_count: counts.SUCCESS || 0,
      failed_count: counts.FAILED || 0,
      conflict_count: counts.CONFLICT || 0,
      duplicate_count: counts.DUPLICATE || 0
    });
  }

  const SyncManager = {
    async initAutoSync() {
      if (autoSyncBound) return;
      autoSyncBound = true;

      window.addEventListener('online', () => {
        this.start({ reason: 'online' }).catch((err) => {
          console.warn('[SyncManager] Auto sync failed:', err);
        });
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isOnline()) {
          this.start({ reason: 'visibility' }).catch((err) => {
            console.warn('[SyncManager] Visibility sync failed:', err);
          });
        }
      });

      await updateCountsState();
    },

    isSyncing() {
      return isSyncing;
    },

    async start(options) {
      if (isSyncing) {
        return { ok: false, message: 'Sync already running' };
      }
      if (!isOnline()) {
        await updateCountsState();
        return { ok: false, message: 'Device is offline' };
      }
      if (!window.Api || typeof window.Api.post !== 'function') {
        return { ok: false, message: 'Api.post is not available' };
      }

      isSyncing = true;
      if (window.AppState) {
        window.AppState.setSync({
          is_syncing: true,
          last_error: ''
        });
      }

      const results = [];
      try {
        const limit = Number((options && options.batchSize) || getBatchSize());
        const queueItems = await window.QueueRepo.getPending(limit);

        for (const item of queueItems) {
          const result = await this.processItem(item);
          results.push(result);

          if (result && result.stopSync === true) {
            break;
          }
        }

        await window.QueueRepo.pruneCompleted(7);
        await updateCountsState();

        if (window.AppState) {
          window.AppState.setSync({
            is_syncing: false,
            last_sync_at: window.TpkDb.nowIso(),
            last_error: ''
          });
        }

        return {
          ok: true,
          processed: results.length,
          results
        };
      } catch (err) {
        const message = normalizeError(err);
        if (window.AppState) {
          window.AppState.setSync({
            is_syncing: false,
            last_error: message
          });
        }
        await window.TpkDb.putAudit('SYNC_FATAL_ERROR', message);
        throw err;
      } finally {
        isSyncing = false;
      }
    },

    async processItem(item) {
      await window.QueueRepo.markProcessing(item.queue_id);

      const meta = {
        client_submit_id: item.client_submit_id,
        device_id: item.device_id || (window.StorageHelper && window.StorageHelper.getDeviceId ? window.StorageHelper.getDeviceId() : ''),
        app_version: item.app_version || (window.APP_CONFIG && window.APP_CONFIG.APP_VERSION) || '',
        sync_source: 'OFFLINE_QUEUE',
        request_time: window.TpkDb.nowIso()
      };

      try {
        const response = await window.Api.post(item.action, item.payload, meta);
        const status = String((response && response.status) || '').toLowerCase();
        const code = Number((response && response.code) || 0);

        if (status === 'success' || code === 200) {
          await window.QueueRepo.markSuccess(item.queue_id, {
            code: response.code,
            message: response.message || 'Sync success'
          });
          await this.afterSuccess(item, response);
          return { ok: true, queue_id: item.queue_id, status: 'SUCCESS', response };
        }

        if (status === 'duplicate') {
          await window.QueueRepo.markDuplicate(item.queue_id, response.message || 'Duplicate request');
          return { ok: true, queue_id: item.queue_id, status: 'DUPLICATE', response };
        }

        if (status === 'conflict' || code === 409) {
          await window.QueueRepo.markConflict(item.queue_id, response.message || 'Conflict');
          return { ok: false, queue_id: item.queue_id, status: 'CONFLICT', response };
        }

        if (status === 'validation_error' || code === 422 || code === 400) {
          await window.QueueRepo.markFailed(item.queue_id, response.message || 'Validation error');
          return { ok: false, queue_id: item.queue_id, status: 'FAILED', response };
        }

        if (code === 401 || code === 403) {
          await window.QueueRepo.markFailed(item.queue_id, response.message || 'Unauthorized');
          if (window.AppState) {
            window.AppState.setSync({ last_error: response.message || 'Unauthorized sync request' });
          }
          return { ok: false, queue_id: item.queue_id, status: 'FAILED', stopSync: true, response };
        }

        await window.QueueRepo.requeue(item.queue_id, response.message || 'Retry later');
        return { ok: false, queue_id: item.queue_id, status: 'REQUEUED', response };
      } catch (err) {
        const message = normalizeError(err);

        if (/network|failed to fetch|offline/i.test(message)) {
          await window.QueueRepo.requeue(item.queue_id, message);
          return { ok: false, queue_id: item.queue_id, status: 'REQUEUED', stopSync: true, error: message };
        }

        await window.QueueRepo.markFailed(item.queue_id, message);
        return { ok: false, queue_id: item.queue_id, status: 'FAILED', error: message };
      } finally {
        await updateCountsState();
      }
    },

    async afterSuccess(item, response) {
      await window.TpkDb.putAudit('SYNC_ITEM_SUCCESS', JSON.stringify({
        queue_id: item.queue_id,
        action: item.action,
        entity_type: item.entity_type,
        message: response && response.message ? response.message : ''
      }));

      if (!item.entity_type) return;

      if (item.entity_type === 'REGISTRASI' && item.entity_id_local) {
        await window.TpkDb.delete(window.TpkDb.STORES.DRAFT_REGISTRASI, item.entity_id_local);
      }

      if (item.entity_type === 'PENDAMPINGAN' && item.entity_id_local) {
        await window.TpkDb.delete(window.TpkDb.STORES.DRAFT_PENDAMPINGAN, item.entity_id_local);
      }
    }
  };

  window.SyncManager = SyncManager;
})(window);