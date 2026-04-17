/*!
 * queueRepo.js — Spesifikasi Implementasi Tahap 1
 * Project: TPK Kabupaten Buleleng
 *
 * TUJUAN
 * - Menjadi satu-satunya pintu mutasi sync_queue.
 * - Menstandarkan schema item queue.
 * - Menyediakan operasi add / get pending / mark processing / success / fail / conflict.
 *
 * STATUS FINAL
 * - PENDING
 * - PROCESSING
 * - SUCCESS
 * - FAILED
 * - CONFLICT
 * - DUPLICATE
 *
 * CATATAN
 * - Registrasi dan pendampingan jangan menulis langsung ke IndexedDB.
 * - Semuanya lewat QueueRepo agar format seragam.
 */

(function (window) {
  'use strict';

  const STATUS = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    CONFLICT: 'CONFLICT',
    DUPLICATE: 'DUPLICATE'
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  const QueueRepo = {
    STATUS,

    /**
     * Schema item queue final tahap 1.
     */
    createItem(input) {
      return {
        queue_id: input.queue_id || createId('Q'),
        action: input.action || '',
        entity_type: input.entity_type || '',
        entity_id_local: input.entity_id_local || null,
        client_submit_id: input.client_submit_id || null,
        payload: input.payload || {},
        status: input.status || STATUS.PENDING,
        retry_count: Number(input.retry_count || 0),
        last_error: input.last_error || null,
        created_at: input.created_at || nowIso(),
        updated_at: input.updated_at || nowIso(),
        id_user: input.id_user || null,
        id_tim: input.id_tim || null,
        device_id: input.device_id || null,
        app_version: input.app_version || null
      };
    },

    async add(input) {
      const item = this.createItem(input);
      await window.LocalDb.put(window.LocalDb.STORES.SYNC_QUEUE, item);
      return item;
    },

    async getById(queueId) {
      return window.LocalDb.get(window.LocalDb.STORES.SYNC_QUEUE, queueId);
    },

    async getAll() {
      return window.LocalDb.getAll(window.LocalDb.STORES.SYNC_QUEUE);
    },

    async getByStatus(status) {
      return window.LocalDb.getAllByIndex(window.LocalDb.STORES.SYNC_QUEUE, 'status', status);
    },

    /**
     * Ambil batch PENDING tertua.
     * Tahap 1 cukup sort in-memory.
     * Tahap 2 bisa ditingkatkan dengan cursor/pagination.
     */
    async getPendingBatch(limit = 10) {
      const rows = await this.getByStatus(STATUS.PENDING);
      return (rows || [])
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .slice(0, limit);
    },

    async markProcessing(queueId) {
      const item = await this.getById(queueId);
      if (!item) return null;

      item.status = STATUS.PROCESSING;
      item.updated_at = nowIso();

      await window.LocalDb.put(window.LocalDb.STORES.SYNC_QUEUE, item);
      return item;
    },

    async markSuccess(queueId, resultMeta = {}) {
      const item = await this.getById(queueId);
      if (!item) return null;

      item.status = STATUS.SUCCESS;
      item.last_error = null;
      item.updated_at = nowIso();

      await window.LocalDb.put(window.LocalDb.STORES.SYNC_QUEUE, item);
      await this.logResult(queueId, STATUS.SUCCESS, resultMeta);
      return item;
    },

    async markDuplicate(queueId, resultMeta = {}) {
      const item = await this.getById(queueId);
      if (!item) return null;

      item.status = STATUS.DUPLICATE;
      item.last_error = null;
      item.updated_at = nowIso();

      await window.LocalDb.put(window.LocalDb.STORES.SYNC_QUEUE, item);
      await this.logResult(queueId, STATUS.DUPLICATE, resultMeta);
      return item;
    },

    async markConflict(queueId, resultMeta = {}) {
      const item = await this.getById(queueId);
      if (!item) return null;

      item.status = STATUS.CONFLICT;
      item.updated_at = nowIso();
      item.last_error = resultMeta?.message || 'Conflict detected';

      await window.LocalDb.put(window.LocalDb.STORES.SYNC_QUEUE, item);
      await this.logResult(queueId, STATUS.CONFLICT, resultMeta);
      return item;
    },

    async markFailed(queueId, errorMessage, resultMeta = {}) {
      const item = await this.getById(queueId);
      if (!item) return null;

      item.status = STATUS.FAILED;
      item.retry_count = Number(item.retry_count || 0) + 1;
      item.last_error = errorMessage || 'Unknown sync error';
      item.updated_at = nowIso();

      await window.LocalDb.put(window.LocalDb.STORES.SYNC_QUEUE, item);
      await this.logResult(queueId, STATUS.FAILED, Object.assign({}, resultMeta, {
        message: item.last_error
      }));
      return item;
    },

    async retry(queueId) {
      const item = await this.getById(queueId);
      if (!item) return null;

      item.status = STATUS.PENDING;
      item.updated_at = nowIso();
      await window.LocalDb.put(window.LocalDb.STORES.SYNC_QUEUE, item);
      return item;
    },

    async remove(queueId) {
      return window.LocalDb.delete(window.LocalDb.STORES.SYNC_QUEUE, queueId);
    },

    async countSummary() {
      const rows = await this.getAll();
      const out = {
        total: 0,
        pending: 0,
        processing: 0,
        success: 0,
        failed: 0,
        conflict: 0,
        duplicate: 0
      };

      (rows || []).forEach((row) => {
        out.total += 1;
        switch (row.status) {
          case STATUS.PENDING: out.pending += 1; break;
          case STATUS.PROCESSING: out.processing += 1; break;
          case STATUS.SUCCESS: out.success += 1; break;
          case STATUS.FAILED: out.failed += 1; break;
          case STATUS.CONFLICT: out.conflict += 1; break;
          case STATUS.DUPLICATE: out.duplicate += 1; break;
          default: break;
        }
      });

      return out;
    },

    async logResult(queueId, status, resultMeta = {}) {
      const record = {
        result_id: createId('R'),
        queue_id: queueId,
        status,
        response_code: resultMeta.code || null,
        message: resultMeta.message || null,
        created_at: nowIso()
      };
      await window.LocalDb.put(window.LocalDb.STORES.SYNC_RESULT_LOG, record);
      return record;
    }
  };

  window.QueueRepo = QueueRepo;
})(window);
