window.SyncScreen = {
  getFilters() {
    return {
      action: document.getElementById('sync-filter-action')?.value || '',
      status: document.getElementById('sync-filter-status')?.value || '',
      keyword: document.getElementById('sync-filter-keyword')?.value?.trim().toLowerCase() || ''
    };
  },

  getFilteredQueue() {
    const filters = this.getFilters();
    const queue = OfflineSync.getQueue();

    return queue.filter(item => {
      const actionMatch = !filters.action || item.action === filters.action;
      const statusMatch = !filters.status || String(item.sync_status || 'PENDING').toUpperCase() === filters.status;

      const payload = item.payload || {};
      const keywordSource = [
        item.client_submit_id,
        payload.id_sasaran,
        payload.nama_sasaran,
        payload.nama
      ].join(' ').toLowerCase();

      const keywordMatch = !filters.keyword || keywordSource.includes(filters.keyword);
      return actionMatch && statusMatch && keywordMatch;
    });
  },

  render() {
    const queue = OfflineSync.getQueue();
    const filtered = this.getFilteredQueue();

    UI.setText('sync-total-count', String(queue.length));
    UI.setText('sync-pending-count', String(queue.filter(item => String(item.sync_status || 'PENDING').toUpperCase() === 'PENDING').length));
    UI.setText('sync-failed-count', String(queue.filter(item => String(item.sync_status || 'PENDING').toUpperCase() === 'FAILED').length));

    UI.setText('sync-screen-meta', queue.length
      ? `${queue.length} draft tersimpan lokal.`
      : 'Belum ada data antrean.');

    const container = document.getElementById('sync-list-container');
    if (!container) return;

    if (!filtered.length) {
      container.innerHTML = '<p class="muted-text">Tidak ada draft yang sesuai filter.</p>';
      return;
    }

    container.innerHTML = filtered.map(item => SyncUI.renderQueueItem(item)).join('');
  }
};
