window.SyncScreen = {
  _isBound: false,

  getFilters() {
    return {
      action: document.getElementById('sync-filter-action')?.value || '',
      status: String(
        document.getElementById('sync-filter-status')?.value || ''
      ).toUpperCase(),
      keyword: document.getElementById('sync-filter-keyword')?.value?.trim().toLowerCase() || ''
    };
  },

  getQueue() {
    const queue = OfflineSync.getQueue();
    return Array.isArray(queue) ? queue : [];
  },

  getFilteredQueue() {
    const filters = this.getFilters();
    const queue = this.getQueue();

    return queue.filter(item => {
      const actionMatch = !filters.action || item.action === filters.action;

      const itemStatus = String(item.sync_status || 'PENDING').toUpperCase();
      const statusMatch = !filters.status || itemStatus === filters.status;

      const payload = item.payload || {};
      const keywordSource = [
        item.client_submit_id || '',
        payload.id_sasaran || '',
        payload.nama_sasaran || '',
        payload.nama || '',
        payload.id_pendampingan || '',
        item.action || ''
      ].join(' ').toLowerCase();

      const keywordMatch = !filters.keyword || keywordSource.includes(filters.keyword);

      return actionMatch && statusMatch && keywordMatch;
    });
  },

  render() {
    const queue = this.getQueue();
    const filtered = this.getFilteredQueue();

    const pendingCount = queue.filter(item =>
      String(item.sync_status || 'PENDING').toUpperCase() === 'PENDING'
    ).length;

    const failedCount = queue.filter(item =>
      String(item.sync_status || 'PENDING').toUpperCase() === 'FAILED'
    ).length;

    UI.setText('sync-total-count', String(queue.length));
    UI.setText('sync-pending-count', String(pendingCount));
    UI.setText('sync-failed-count', String(failedCount));
    UI.setText('stat-draft', String(queue.length), '0');

    if (!queue.length) {
      UI.setText('sync-screen-meta', 'Belum ada data antrean.');
    } else if (!filtered.length) {
      UI.setText(
        'sync-screen-meta',
        `Total ${queue.length} draft tersimpan lokal, tidak ada yang cocok dengan filter.`
      );
    } else {
      UI.setText(
        'sync-screen-meta',
        `${filtered.length} dari ${queue.length} draft ditampilkan.`
      );
    }

    const container = document.getElementById('sync-list-container');
    if (!container) return;

    if (!queue.length) {
      container.innerHTML = '<p class="muted-text">Belum ada draft offline.</p>';
      return;
    }

    if (!filtered.length) {
      container.innerHTML = '<p class="muted-text">Tidak ada draft yang sesuai filter.</p>';
      return;
    }

    container.innerHTML = filtered.map(item => SyncUI.renderQueueItem(item)).join('');
  },

  async handleRetry(itemId) {
    const result = await OfflineSync.retryOne(itemId);
    this.render();

    if (!result) return;

    if (result.ok) {
      Notifier.show('Draft berhasil disinkronkan.', 'success');
    } else {
      Notifier.show(result.message || 'Draft gagal dikirim ulang.', 'warn');
    }
  },

  handleDelete(itemId) {
    OfflineSync.removeById(itemId);
    this.render();
    Notifier.show('Draft dihapus dari antrean.', 'info');
  },

  async handleSyncAll() {
    await OfflineSync.syncAll();
    this.render();
  },

  bindEvents() {
    if (this._isBound) return;
    this._isBound = true;

    const actionFilter = document.getElementById('sync-filter-action');
    const statusFilter = document.getElementById('sync-filter-status');
    const keywordFilter = document.getElementById('sync-filter-keyword');

    [actionFilter, statusFilter].forEach(el => {
      if (!el) return;
      el.addEventListener('change', () => this.render());
    });

    if (keywordFilter) {
      keywordFilter.addEventListener('input', () => this.render());
    }

    const btnSyncAll = document.getElementById('btn-sync-all-screen');
    if (btnSyncAll) {
      btnSyncAll.addEventListener('click', async () => {
        await this.handleSyncAll();
      });
    }

    const btnRefresh = document.getElementById('btn-refresh-sync-screen');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        this.render();
        Notifier.show('Daftar draft diperbarui.', 'info');
      });
    }

    const listContainer = document.getElementById('sync-list-container');
    if (listContainer) {
      listContainer.addEventListener('click', async (event) => {
        const retryBtn = event.target.closest('[data-sync-retry-id]');
        if (retryBtn) {
          const itemId = retryBtn.getAttribute('data-sync-retry-id');
          if (itemId) {
            await this.handleRetry(itemId);
          }
          return;
        }

        const deleteBtn = event.target.closest('[data-sync-delete-id]');
        if (deleteBtn) {
          const itemId = deleteBtn.getAttribute('data-sync-delete-id');
          if (itemId) {
            this.handleDelete(itemId);
          }
        }
      });
    }
  },

  refresh() {
    this.bindEvents();
    this.render();
  },

  open() {
    if (window.Router && typeof window.Router.showScreen === 'function') {
      window.Router.showScreen('sync-screen');
    } else if (window.Router && typeof window.Router.toSync === 'function') {
      window.Router.toSync();
    } else {
      document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.classList.add('hidden');
      });

      const target = document.getElementById('sync-screen');
      if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
      }
    }

    this.refresh();
  }
};
