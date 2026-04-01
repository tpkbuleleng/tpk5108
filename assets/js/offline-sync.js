window.OfflineSync = {
  getQueue() {
    return StorageHelper.get(APP_CONFIG.STORAGE_KEYS.SYNC_QUEUE, []);
  },

  saveQueue(queue) {
    StorageHelper.set(APP_CONFIG.STORAGE_KEYS.SYNC_QUEUE, Array.isArray(queue) ? queue : []);
  },

  normalizeQueueItem(item) {
    const normalized = Object.assign({}, item);

    normalized.id = String(normalized.id || ClientId.queueId()).trim();
    normalized.action = String(normalized.action || '').trim();
    normalized.payload = normalized.payload || {};
    normalized.client_submit_id = ClientId.ensure(
      normalized.client_submit_id || normalized.payload.client_submit_id || '',
      'SUB'
    );
    normalized.created_at = normalized.created_at || new Date().toISOString();
    normalized.retry_count = Number(normalized.retry_count || 0);
    normalized.sync_status = String(normalized.sync_status || 'PENDING').toUpperCase();
    normalized.last_error = normalized.last_error || '';
    normalized.last_synced_at = normalized.last_synced_at || '';

    normalized.payload = Object.assign({}, normalized.payload, {
      client_submit_id: normalized.client_submit_id
    });

    return normalized;
  },

  add(item) {
    const queue = this.getQueue();
    const normalized = this.normalizeQueueItem(item);
    queue.push(normalized);
    this.saveQueue(queue);
    this.renderSummary();
    return normalized;
  },

  removeById(queueId) {
    const queue = this.getQueue().filter(item => item.id !== queueId);
    this.saveQueue(queue);
    this.renderSummary();
  },

  clearAll() {
    this.saveQueue([]);
    this.renderSummary();
  },

  async syncAll() {
    const queue = this.getQueue().map(item => this.normalizeQueueItem(item));
    if (!queue.length) {
      Notifier.show('Tidak ada draft yang perlu disinkronkan.');
      return;
    }

    const stillPending = [];
    let successCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;

    for (const item of queue) {
      try {
        const result = await Api.post(item.action, item.payload, {
          clientSubmitId: item.client_submit_id,
          syncSource: item.payload.sync_source || 'OFFLINE_DRAFT'
        });

        const isOk = !!result?.ok;
        const isDuplicate = !!result?.data?.duplicate;

        if (isOk) {
          if (isDuplicate) {
            duplicateCount += 1;
          } else {
            successCount += 1;
          }
          continue;
        }

        item.retry_count = Number(item.retry_count || 0) + 1;
        item.sync_status = 'FAILED';
        item.last_error = result?.message || 'Sinkronisasi gagal.';
        item.last_synced_at = new Date().toISOString();
        stillPending.push(item);
        failedCount += 1;
      } catch (err) {
        item.retry_count = Number(item.retry_count || 0) + 1;
        item.sync_status = 'FAILED';
        item.last_error = err.message || 'Sinkronisasi gagal.';
        item.last_synced_at = new Date().toISOString();
        stillPending.push(item);
        failedCount += 1;
      }
    }

    this.saveQueue(stillPending);
    StorageHelper.set(APP_CONFIG.STORAGE_KEYS.LAST_SYNC_AT, new Date().toISOString());
    this.renderSummary();

    const messages = [];
    if (successCount) messages.push(`${successCount} berhasil`);
    if (duplicateCount) messages.push(`${duplicateCount} duplikat terdeteksi aman`);
    if (failedCount) messages.push(`${failedCount} gagal`);

    Notifier.show(
      messages.length
        ? `Sinkronisasi selesai: ${messages.join(', ')}.`
        : 'Sinkronisasi selesai.'
    );
  },

  async retryOne(queueId) {
    const queue = this.getQueue().map(item => this.normalizeQueueItem(item));
    const index = queue.findIndex(item => item.id === queueId);

    if (index === -1) {
      Notifier.show('Item antrean tidak ditemukan.');
      return;
    }

    const item = queue[index];

    try {
      const result = await Api.post(item.action, item.payload, {
        clientSubmitId: item.client_submit_id,
        syncSource: item.payload.sync_source || 'OFFLINE_DRAFT'
      });

      if (result?.ok) {
        queue.splice(index, 1);
        this.saveQueue(queue);
        this.renderSummary();

        if (result?.data?.duplicate) {
          Notifier.show('Item sinkronisasi terdeteksi sudah pernah tersimpan.');
        } else {
          Notifier.show('Item berhasil disinkronkan.');
        }
        return;
      }

      item.retry_count = Number(item.retry_count || 0) + 1;
      item.sync_status = 'FAILED';
      item.last_error = result?.message || 'Sinkronisasi gagal.';
      item.last_synced_at = new Date().toISOString();

      queue[index] = item;
      this.saveQueue(queue);
      this.renderSummary();
      Notifier.show(item.last_error);
    } catch (err) {
      item.retry_count = Number(item.retry_count || 0) + 1;
      item.sync_status = 'FAILED';
      item.last_error = err.message || 'Sinkronisasi gagal.';
      item.last_synced_at = new Date().toISOString();

      queue[index] = item;
      this.saveQueue(queue);
      this.renderSummary();
      Notifier.show(item.last_error);
    }
  },

  renderSummary() {
    const queue = this.getQueue();
    UI.setText('stat-draft', String(queue.length));

    if (!queue.length) {
      UI.setHTML('sync-summary', '<p class="muted-text">Semua draft sudah sinkron.</p>');
      return;
    }

    const failedCount = queue.filter(item => String(item.sync_status).toUpperCase() === 'FAILED').length;
    const pendingCount = queue.length - failedCount;

    UI.setHTML('sync-summary', `
      <p><strong>${queue.length}</strong> draft masih menunggu sinkronisasi.</p>
      <p class="muted-text">Pending: ${pendingCount} | Gagal: ${failedCount}</p>
      <p class="muted-text">Pastikan koneksi internet stabil sebelum sinkronisasi.</p>
    `);
  }
};
