window.OfflineSync = {
  _isSyncing: false,

  getQueue() {
    return StorageHelper.get(APP_CONFIG.STORAGE_KEYS.SYNC_QUEUE, []);
  },

  saveQueue(queue) {
    StorageHelper.set(
      APP_CONFIG.STORAGE_KEYS.SYNC_QUEUE,
      Array.isArray(queue) ? queue : []
    );
    this.touchLastSyncAt();
    return this.getQueue();
  },

  touchLastSyncAt() {
    StorageHelper.set(
      APP_CONFIG.STORAGE_KEYS.LAST_SYNC_AT,
      new Date().toISOString()
    );
  },

  normalizeItem(item) {
    const payload = item?.payload || {};
    const stableClientSubmitId =
      item?.client_submit_id ||
      payload.client_submit_id ||
      ClientId.ensure('', 'SUB');

    return {
      id: item?.id || ClientId.queueId(),
      action: item?.action || '',
      payload: Object.assign({}, payload, {
        client_submit_id: stableClientSubmitId,
        sync_source: payload.sync_source || 'OFFLINE_DRAFT'
      }),
      client_submit_id: stableClientSubmitId,
      created_at: item?.created_at || new Date().toISOString(),
      retry_count: Number(item?.retry_count || 0),
      sync_status: String(item?.sync_status || 'PENDING').toUpperCase(),
      last_error: item?.last_error || '',
      last_synced_at: item?.last_synced_at || ''
    };
  },

  getCounts(queue) {
    const safeQueue = Array.isArray(queue) ? queue : this.getQueue();

    return {
      total: safeQueue.length,
      pending: safeQueue.filter(item =>
        String(item.sync_status || 'PENDING').toUpperCase() === 'PENDING'
      ).length,
      failed: safeQueue.filter(item =>
        String(item.sync_status || '').toUpperCase() === 'FAILED'
      ).length
    };
  },

  add(item) {
    const queue = this.getQueue();
    const normalized = this.normalizeItem(item);

    const duplicateIndex = queue.findIndex(existing => {
      return (
        String(existing.action || '') === String(normalized.action || '') &&
        String(existing.client_submit_id || '') === String(normalized.client_submit_id || '')
      );
    });

    if (duplicateIndex >= 0) {
      queue[duplicateIndex] = Object.assign({}, queue[duplicateIndex], normalized, {
        id: queue[duplicateIndex].id,
        created_at: queue[duplicateIndex].created_at || normalized.created_at,
        sync_status: 'PENDING',
        last_error: ''
      });
    } else {
      queue.push(normalized);
    }

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

  buildPayloadForSync(item) {
    const payload = Object.assign({}, item?.payload || {});
    payload.client_submit_id =
      item?.client_submit_id ||
      payload.client_submit_id ||
      '';
    payload.sync_source = payload.sync_source || 'OFFLINE_DRAFT';
    return payload;
  },

  isDuplicateResponse(response) {
    const message = String(response?.message || '').toLowerCase();
    const data = response?.data || {};

    return (
      message.includes('duplicate') ||
      message.includes('duplikat') ||
      data?.duplicate === true
    );
  },

  async retryOne(itemId) {
    if (this._isSyncing) {
      Notifier.show('Sinkronisasi sedang berjalan. Mohon tunggu.', 'warn');
      return null;
    }

    const queue = this.getQueue();
    const item = queue.find(q => q.id === itemId);

    if (!item) {
      Notifier.show('Item antrean tidak ditemukan.', 'warn');
      return null;
    }

    return this.syncItem(item);
  },

  async syncQueueNow() {
    return this.syncAll();
  },

  async syncAll() {
    if (this._isSyncing) {
      Notifier.show('Sinkronisasi sedang berjalan. Mohon tunggu.', 'warn');
      return {
        ok: false,
        message: 'Sync sedang berjalan',
        synced: 0,
        failed: 0
      };
    }

    if (!navigator.onLine) {
      Notifier.show('Masih offline. Sinkronisasi belum dapat dijalankan.', 'warn');
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
      Notifier.show('Tidak ada draft yang perlu disinkronkan.', 'info');
      return {
        ok: true,
        synced: 0,
        failed: 0
      };
    }

    this._isSyncing = true;

    let synced = 0;
    let failed = 0;

    try {
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
        Notifier.show(
          `Sinkronisasi selesai. Berhasil: ${synced}, gagal: ${failed}`,
          'warn'
        );
      } else {
        Notifier.show(
          `Sinkronisasi selesai. Berhasil: ${synced}`,
          'success'
        );
      }

      return {
        ok: failed === 0,
        synced,
        failed
      };
    } finally {
      this._isSyncing = false;
      this.renderSummary();
    }
  },

  async syncItem(item) {
    if (!item?.action) {
      return {
        ok: false,
        message: 'Action antrean kosong.'
      };
    }

    const startedAt = new Date().toISOString();

    this.update(item.id, {
      sync_status: 'PENDING',
      last_error: '',
      last_synced_at: startedAt
    });

    try {
      const payload = this.buildPayloadForSync(item);

      const response = await Api.post(item.action, payload);

      if (!response?.ok) {
        if (this.isDuplicateResponse(response)) {
          this.removeById(item.id);
          return {
            ok: true,
            duplicate: true,
            message: response?.message || 'Item duplikat dianggap selesai.'
          };
        }

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
    const counts = this.getCounts(queue);

    if (window.UI?.setText) {
      UI.setText('sync-total-count', String(counts.total));
      UI.setText('sync-pending-count', String(counts.pending));
      UI.setText('sync-failed-count', String(counts.failed));
      UI.setText(
        'stat-draft',
        String(counts.total),
        '0'
      );
    }

    if (window.SyncScreen && typeof window.SyncScreen.render === 'function') {
      window.SyncScreen.render();
      return;
    }

    const legacyContainer = document.getElementById('sync-summary');
    if (!legacyContainer) return;

    if (!counts.total) {
      legacyContainer.innerHTML =
        '<p class="muted-text">Tidak ada draft offline. Semua data sudah bersih.</p>';
      return;
    }

    legacyContainer.innerHTML = `
      <div class="profile-grid">
        <div><span class="label">Total Draft</span><strong>${counts.total}</strong></div>
        <div><span class="label">Pending</span><strong>${counts.pending}</strong></div>
        <div><span class="label">Gagal</span><strong>${counts.failed}</strong></div>
      </div>
    `;
  },

  refreshQueueView() {
    this.renderSummary();
  }
};
