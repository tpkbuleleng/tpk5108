window.SyncScreen = {
  getFilters() {
    return {
      action: document.getElementById('sync-filter-action')?.value || '',
      status: String(document.getElementById('sync-filter-status')?.value || '').toUpperCase(),
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

    if (!queue.length) {
      UI.setText('sync-screen-meta', 'Belum ada data antrean.');
    } else if (!filtered.length) {
      UI.setText('sync-screen-meta', `Total ${queue.length} draft tersimpan lokal, tidak ada yang cocok dengan filter.`);
    } else {
      UI.setText('sync-screen-meta', `${filtered.length} dari ${queue.length} draft ditampilkan.`);
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
  }
};
