window.OfflineSync = {
  getQueue() {
    return StorageHelper.get(APP_CONFIG.STORAGE_KEYS.SYNC_QUEUE, []);
  },

  saveQueue(queue) {
    StorageHelper.set(APP_CONFIG.STORAGE_KEYS.SYNC_QUEUE, queue);
  },

  add(item) {
    const queue = this.getQueue();
    queue.push(item);
    this.saveQueue(queue);
    this.renderSummary();
  },

  async syncAll() {
    const queue = this.getQueue();
    if (!queue.length) {
      Notifier.show('Tidak ada draft yang perlu disinkronkan.');
      return;
    }

    const pending = [];

    for (const item of queue) {
      try {
        const result = await Api.post(item.action, item.payload, {
          clientSubmitId: item.client_submit_id,
          syncSource: 'OFFLINE_DRAFT'
        });

        if (!result?.ok) {
          item.retry_count = (item.retry_count || 0) + 1;
          pending.push(item);
        }
      } catch (err) {
        item.retry_count = (item.retry_count || 0) + 1;
        pending.push(item);
      }
    }

    this.saveQueue(pending);
    StorageHelper.set(APP_CONFIG.STORAGE_KEYS.LAST_SYNC_AT, new Date().toISOString());
    this.renderSummary();

    Notifier.show('Sinkronisasi selesai.');
  },

  renderSummary() {
    const queue = this.getQueue();
    UI.setText('stat-draft', String(queue.length));

    if (!queue.length) {
      UI.setHTML('sync-summary', '<p class="muted-text">Semua draft sudah sinkron.</p>');
      return;
    }

    UI.setHTML('sync-summary', `
      <p><strong>${queue.length}</strong> draft masih menunggu sinkronisasi.</p>
      <p class="muted-text">Pastikan koneksi internet stabil sebelum sinkronisasi.</p>
    `);
  }
};
