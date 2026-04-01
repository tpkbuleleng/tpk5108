window.OfflineSync = {
  getQueue() {
    return StorageHelper.get(APP_CONFIG.STORAGE_KEYS.SYNC_QUEUE, []);
  },

  saveQueue(queue) {
    StorageHelper.set(APP_CONFIG.STORAGE_KEYS.SYNC_QUEUE, Array.isArray(queue) ? queue : []);
    this.touchLastSyncAt();
    return this.getQueue();
  },

  touchLastSyncAt() {
    StorageHelper.set(APP_CONFIG.STORAGE_KEYS.LAST_SYNC_AT, new Date().toISOString());
  },

  add(item) {
    const queue = this.getQueue();

    const normalized = {
      id: item.id || ClientId.queueId(),
      action: item.action || '',
      payload: item.payload || {},
      client_submit_id: item.client_submit_id || item.payload?.client_submit_id || '',
      created_at: item.created_at || new Date().toISOString(),
      retry_count: Number(item.retry_count || 0),
      sync_status: item.sync_status || 'PENDING',
      last_error: item.last_error || '',
      last_synced_at: item.last_synced_at || ''
    };

    queue.push(normalized);
    this.saveQueue(queue);
    this.renderSummary();

    return normalized;
  },

  update(itemId, patch = {}) {
    const queue = this.getQueue().map(item => {
      if (item.id !== itemId) return item;
      return Object.assign({}, item, patch);
    });

    this.saveQueue(queue);
    this.renderSummary();
    return queue.find(item => item.id === itemId) || null;
  },

  removeById(itemId) {
    const queue = this.getQueue().filter(item => item.id !== itemId);
    this.saveQueue(queue);
    this.renderSummary();
    return queue;
  },

  clearAll() {
    this.saveQueue([]);
    this.renderSummary();
  },

  async retryOne(itemId) {
    const queue = this.getQueue();
    const item = queue.find(q => q.id === itemId);

    if (!item) {
      Notifier.show('Item antrean tidak ditemukan.');
      return null;
    }

    return this.syncItem(item);
  },

  async syncAll() {
    if (!navigator.onLine) {
      Notifier.show('Masih offline. Sinkronisasi belum dapat dijalankan.');
      return {
        ok: false,
        message: 'Offline',
        synced: 0,
        failed: 0
      };
    }

    const queue = this.getQueue();
    if (!queue.length) {
      this.renderSummary();
      Notifier.show('Tidak ada draft yang perlu disinkronkan.');
      return {
        ok: true,
        synced: 0,
        failed: 0
      };
    }

    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      const result = await this.syncItem(item);
      if (result?.ok) {
        synced++;
      } else {
        failed++;
      }
    }

    this.renderSummary();

    if (failed > 0) {
      Notifier.show(`Sinkronisasi selesai. Berhasil: ${synced}, gagal: ${failed}`, 'warn');
    } else {
      Notifier.show(`Sinkronisasi selesai. Berhasil: ${synced}`, 'success');
    }

    return {
      ok: failed === 0,
      synced,
      failed
    };
  },

  async syncItem(item) {
    if (!item?.action) {
      return {
        ok: false,
        message: 'Action antrean kosong.'
      };
    }

    try {
      const response = await Api.post(
        item.action,
        item.payload || {},
        {
          clientSubmitId: item.client_submit_id || item.payload?.client_submit_id || '',
          syncSource: item.payload?.sync_source || 'OFFLINE_DRAFT'
        }
      );

      if (!response?.ok) {
        const message = response?.message || 'Sinkronisasi gagal.';
        this.update(item.id, {
          sync_status: 'FAILED',
          retry_count: Number(item.retry_count || 0) + 1,
          last_error: message,
          last_synced_at: new Date().toISOString()
        });

        return {
          ok: false,
          message
        };
      }

      // Jika backend mendeteksi duplicate via client_submit_id,
      // antrean tetap dianggap selesai agar tidak terus mengulang.
      this.removeById(item.id);

      return {
        ok: true,
        data: response?.data || {}
      };
    } catch (err) {
      this.update(item.id, {
        sync_status: 'FAILED',
        retry_count: Number(item.retry_count || 0) + 1,
        last_error: err.message || 'Terjadi kesalahan sinkronisasi.',
        last_synced_at: new Date().toISOString()
      });

      return {
        ok: false,
        message: err.message || 'Terjadi kesalahan sinkronisasi.'
      };
    }
  },

  renderSummary() {
    const queue = this.getQueue();
    const total = queue.length;
    const pending = queue.filter(item => (item.sync_status || 'PENDING') === 'PENDING').length;
    const failed = queue.filter(item => (item.sync_status || '') === 'FAILED').length;

    const summaryId = 'sync-summary';
    const container = document.getElementById(summaryId);
    if (!container) return;

    if (!total) {
      container.innerHTML = `
        <p class="muted-text">Tidak ada draft offline. Semua data sudah bersih.</p>
      `;
      return;
    }

    container.innerHTML = `
      <div class="profile-grid">
        <div><span class="label">Total Draft</span><strong>${total}</strong></div>
        <div><span class="label">Pending</span><strong>${pending}</strong></div>
        <div><span class="label">Gagal</span><strong>${failed}</strong></div>
      </div>
    `;
  }
};
