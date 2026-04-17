/*!
 * syncManager.js — Spesifikasi Implementasi Tahap 1
 * Project: TPK Kabupaten Buleleng
 *
 * TUJUAN
 * - Menjadi mesin sinkronisasi tunggal untuk queue offline.
 * - Tidak membiarkan 2 proses sync berjalan bersamaan.
 * - Menstandarkan cara membaca hasil backend:
 *   SUCCESS / DUPLICATE / CONFLICT / VALIDATION_ERROR / FAILED
 *
 * DEPENDENSI
 * - AppState
 * - QueueRepo
 * - Api (atau wrapper API aktif TPK)
 * - LocalDb (untuk audit tambahan bila diperlukan)
 *
 * ATURAN
 * - Jangan auto sync bila user belum login.
 * - Jangan sync saat offline.
 * - Batch kecil dulu, misal 3–10 item.
 * - Item gagal tidak boleh memblokir seluruh antrean.
 */

(function (window) {
  'use strict';

  const DEFAULT_BATCH_SIZE = 5;
  const MAX_RETRY = 3;

  const SyncManager = {
    _isRunning: false,
    _unbindOnlineHandler: null,

    isRunning() {
      return this._isRunning;
    },

    init() {
      const handleOnline = () => {
        this.syncNow({ reason: 'online' }).catch((err) => {
          console.warn('[SyncManager.init] sync online gagal:', err);
        });
      };

      window.addEventListener('online', handleOnline);
      this._unbindOnlineHandler = () => window.removeEventListener('online', handleOnline);
    },

    destroy() {
      if (this._unbindOnlineHandler) {
        this._unbindOnlineHandler();
        this._unbindOnlineHandler = null;
      }
    },

    canSync() {
      const session = window.AppState?.session?.getState?.() || {};
      return Boolean(session.is_authenticated) && window.navigator.onLine === true;
    },

    async syncNow(options = {}) {
      if (this._isRunning) {
        return { ok: false, skipped: true, reason: 'already_running' };
      }

      if (!this.canSync()) {
        return { ok: false, skipped: true, reason: 'not_ready' };
      }

      this._isRunning = true;
      window.AppState?.sync?.setState({
        is_syncing: true,
        last_error: null
      }, 'sync:start');

      try {
        const batchSize = Number(options.batchSize || DEFAULT_BATCH_SIZE);
        const items = await window.QueueRepo.getPendingBatch(batchSize);

        if (!items.length) {
          await this.refreshSyncSummary();
          return { ok: true, processed: 0, message: 'Tidak ada queue pending' };
        }

        const results = [];
        for (const item of items) {
          const result = await this.processOne(item);
          results.push(result);
        }

        await this.refreshSyncSummary();

        window.AppState?.sync?.setState({
          is_syncing: false,
          last_sync_at: new Date().toISOString()
        }, 'sync:done');

        return {
          ok: true,
          processed: results.length,
          results
        };
      } catch (err) {
        window.AppState?.sync?.setState({
          is_syncing: false,
          last_error: String(err?.message || err || 'Sync gagal')
        }, 'sync:error');
        throw err;
      } finally {
        this._isRunning = false;
      }
    },

    async processOne(item) {
      await window.QueueRepo.markProcessing(item.queue_id);

      try {
        const response = await this.dispatchQueueItem(item);

        // Normalisasi status bisnis dari backend TPK.
        const status = this.normalizeBusinessStatus(response);

        if (status === 'SUCCESS') {
          await window.QueueRepo.markSuccess(item.queue_id, {
            code: response?.code || 200,
            message: response?.message || 'Sukses'
          });
          return { queue_id: item.queue_id, status };
        }

        if (status === 'DUPLICATE') {
          await window.QueueRepo.markDuplicate(item.queue_id, {
            code: response?.code || 200,
            message: response?.message || 'Duplicate aman'
          });
          return { queue_id: item.queue_id, status };
        }

        if (status === 'CONFLICT') {
          await window.QueueRepo.markConflict(item.queue_id, {
            code: response?.code || 409,
            message: response?.message || 'Conflict'
          });
          return { queue_id: item.queue_id, status };
        }

        const failMessage = response?.message || 'Validasi/backend menolak data';
        await this.handleFailure(item, failMessage, response?.code || 400);
        return { queue_id: item.queue_id, status: 'FAILED' };
      } catch (err) {
        await this.handleFailure(item, String(err?.message || err || 'Sync error'), 0);
        return { queue_id: item.queue_id, status: 'FAILED' };
      }
    },

    async handleFailure(item, message, code) {
      const current = await window.QueueRepo.getById(item.queue_id);
      const retryCount = Number(current?.retry_count || 0);

      if (retryCount >= MAX_RETRY) {
        await window.QueueRepo.markFailed(item.queue_id, message, { code, message });
        return;
      }

      await window.QueueRepo.markFailed(item.queue_id, message, { code, message });
      // Tahap 1: tetap FAILED setelah percobaan gagal.
      // Tahap 2: bisa dibedakan retryable vs non-retryable.
    },

    /**
     * Mapping action queue ke endpoint backend.
     * Contoh action:
     * - submitRegistrasiSasaran
     * - submitPendampingan
     * - updateSasaran
     * - updatePendampingan
     */
    async dispatchQueueItem(item) {
      if (!window.Api || typeof window.Api.post !== 'function') {
        throw new Error('Api.post belum tersedia');
      }

      const payload = Object.assign({}, item.payload || {});
      const meta = {
        client_submit_id: item.client_submit_id || '',
        device_id: item.device_id || '',
        app_version: item.app_version || '',
        sync_source: 'OFFLINE_QUEUE'
      };

      // Integrasi dengan Api.post aktif TPK.
      // Bila signature/meta disusun otomatis oleh api.js, cukup kirim payload + overrides.
      return window.Api.post(item.action, payload, meta);
    },

    normalizeBusinessStatus(response) {
      if (!response) return 'FAILED';

      const code = Number(response.code || 0);
      const rawStatus = String(response.status || '').toUpperCase();
      const rawMessage = String(response.message || '').toUpperCase();

      if (rawStatus === 'SUCCESS' || code === 200) return 'SUCCESS';
      if (rawStatus === 'DUPLICATE' || code === 208) return 'DUPLICATE';
      if (rawStatus === 'CONFLICT' || code === 409) return 'CONFLICT';
      if (rawStatus === 'VALIDATION_ERROR' || code === 422) return 'FAILED';
      if (rawMessage.includes('DUPLICATE')) return 'DUPLICATE';
      if (rawMessage.includes('CONFLICT')) return 'CONFLICT';

      return 'FAILED';
    },

    async refreshSyncSummary() {
      const summary = await window.QueueRepo.countSummary();
      window.AppState?.sync?.setState({
        pending_count: summary.pending,
        failed_count: summary.failed,
        conflict_count: summary.conflict
      }, 'sync:summary');
      return summary;
    }
  };

  window.SyncManager = SyncManager;
})(window);
