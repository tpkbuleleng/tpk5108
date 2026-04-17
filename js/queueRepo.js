(function (window) {
  'use strict';

  if (!window.TpkDb) {
    throw new Error('queueRepo.js requires db.js to be loaded first.');
  }

  const QUEUE_STATUS = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    CONFLICT: 'CONFLICT',
    DUPLICATE: 'DUPLICATE'
  };

  const QueueRepo = {
    STATUS: QUEUE_STATUS,

    async enqueue(item) {
      const now = window.TpkDb.nowIso();
      const payload = item && item.payload ? item.payload : {};
      const queueItem = {
        queue_id: (item && item.queue_id) || window.TpkDb.makeId('QUE'),
        action: (item && item.action) || '',
        entity_type: (item && item.entity_type) || '',
        entity_id_local: (item && item.entity_id_local) || '',
        client_submit_id: (item && item.client_submit_id) || window.TpkDb.makeId('SUB'),
        payload,
        status: QUEUE_STATUS.PENDING,
        retry_count: Number((item && item.retry_count) || 0),
        last_error: '',
        created_at: (item && item.created_at) || now,
        updated_at: now,
        id_user: (item && item.id_user) || '',
        id_tim: (item && item.id_tim) || '',
        device_id: (item && item.device_id) || '',
        app_version: (item && item.app_version) || ''
      };

      const existing = await window.TpkDb.findOneByIndex(
        window.TpkDb.STORES.SYNC_QUEUE,
        'by_client_submit_id',
        queueItem.client_submit_id
      );
      if (existing) return existing;

      const saved = await window.TpkDb.put(window.TpkDb.STORES.SYNC_QUEUE, queueItem);
      await window.TpkDb.putAudit('QUEUE_ENQUEUED', JSON.stringify({
        queue_id: saved.queue_id,
        action: saved.action,
        client_submit_id: saved.client_submit_id
      }));
      return saved;
    },

    async getById(queueId) {
      return window.TpkDb.get(window.TpkDb.STORES.SYNC_QUEUE, queueId);
    },

    async listByStatus(status) {
      return window.TpkDb.getAllByIndex(window.TpkDb.STORES.SYNC_QUEUE, 'by_status', status);
    },

    async getPending(limit) {
      return window.TpkDb.getPendingQueue(limit);
    },

    async markProcessing(queueId) {
      return this.updateStatus(queueId, QUEUE_STATUS.PROCESSING, { last_error: '' });
    },

    async markSuccess(queueId, responseSummary) {
      const updated = await this.updateStatus(queueId, QUEUE_STATUS.SUCCESS, { last_error: '' });
      await this.appendResultLog(queueId, QUEUE_STATUS.SUCCESS, responseSummary);
      return updated;
    },

    async markFailed(queueId, errorMessage) {
      const current = await this.getById(queueId);
      const retryCount = Number((current && current.retry_count) || 0) + 1;
      const updated = await this.updateStatus(queueId, QUEUE_STATUS.FAILED, {
        retry_count: retryCount,
        last_error: String(errorMessage || 'Unknown error')
      });
      await this.appendResultLog(queueId, QUEUE_STATUS.FAILED, errorMessage);
      return updated;
    },

    async markConflict(queueId, message) {
      const updated = await this.updateStatus(queueId, QUEUE_STATUS.CONFLICT, {
        last_error: String(message || 'Conflict detected')
      });
      await this.appendResultLog(queueId, QUEUE_STATUS.CONFLICT, message);
      return updated;
    },

    async markDuplicate(queueId, message) {
      const updated = await this.updateStatus(queueId, QUEUE_STATUS.DUPLICATE, {
        last_error: String(message || 'Duplicate request')
      });
      await this.appendResultLog(queueId, QUEUE_STATUS.DUPLICATE, message);
      return updated;
    },

    async requeue(queueId, message) {
      const current = await this.getById(queueId);
      const retryCount = Number((current && current.retry_count) || 0) + 1;
      return this.updateStatus(queueId, QUEUE_STATUS.PENDING, {
        retry_count: retryCount,
        last_error: String(message || '')
      });
    },

    async updateStatus(queueId, status, patch) {
      const updated = await window.TpkDb.update(window.TpkDb.STORES.SYNC_QUEUE, queueId, (current) => {
        if (!current) return null;
        return {
          ...current,
          ...(patch || {}),
          status,
          updated_at: window.TpkDb.nowIso()
        };
      });
      if (updated) {
        await window.TpkDb.putAudit('QUEUE_STATUS_UPDATED', JSON.stringify({
          queue_id: queueId,
          status: updated.status,
          last_error: updated.last_error || ''
        }));
      }
      return updated;
    },

    async appendResultLog(queueId, status, summary) {
      return window.TpkDb.put(window.TpkDb.STORES.SYNC_RESULT_LOG, {
        result_id: window.TpkDb.makeId('QLOG'),
        queue_id: queueId,
        status,
        response_code: status,
        message: typeof summary === 'string' ? summary : JSON.stringify(summary || {}),
        created_at: window.TpkDb.nowIso(),
        updated_at: window.TpkDb.nowIso()
      });
    },

    async getCounts() {
      const items = await window.TpkDb.getAll(window.TpkDb.STORES.SYNC_QUEUE);
      return items.reduce((acc, item) => {
        const key = String(item.status || '').toUpperCase();
        if (!acc[key]) acc[key] = 0;
        acc[key] += 1;
        return acc;
      }, {
        PENDING: 0,
        PROCESSING: 0,
        SUCCESS: 0,
        FAILED: 0,
        CONFLICT: 0,
        DUPLICATE: 0
      });
    },

    async remove(queueId) {
      return window.TpkDb.delete(window.TpkDb.STORES.SYNC_QUEUE, queueId);
    },

    async pruneCompleted(maxAgeDays) {
      const days = Number(maxAgeDays || 7);
      const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
      const items = await window.TpkDb.getAll(window.TpkDb.STORES.SYNC_QUEUE);
      const completed = items.filter((item) => {
        const status = String(item.status || '').toUpperCase();
        const stamp = new Date(item.updated_at || item.created_at || 0).getTime();
        return ['SUCCESS', 'DUPLICATE'].includes(status) && stamp > 0 && stamp < cutoffMs;
      });

      for (const item of completed) {
        await this.remove(item.queue_id);
      }
      return completed.length;
    }
  };

  window.QueueRepo = QueueRepo;
})(window);