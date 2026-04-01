window.SyncUI = {
  getActionLabel(action) {
    const map = {
      submitRegistrasiSasaran: 'Registrasi Sasaran',
      submitPendampingan: 'Pendampingan'
    };
    return map[action] || action || '-';
  },

  getStatusBadgeClass(status) {
    const value = String(status || '').toUpperCase();
    if (value === 'FAILED') return 'badge badge-danger-soft';
    if (value === 'PENDING') return 'badge badge-warning';
    return 'badge badge-info-soft';
  },

  renderQueueItem(item) {
    const payload = item.payload || {};
    const primaryName = payload.nama_sasaran || payload.nama || '-';
    const targetId = payload.id_sasaran || payload.id || '-';
    const clientId = item.client_submit_id || '-';
    const status = item.sync_status || 'PENDING';

    return `
      <article class="queue-card">
        <div class="queue-card-header">
          <div>
            <h4 class="sasaran-card-title">${this.getActionLabel(item.action)}</h4>
            <p class="muted-text">${primaryName}</p>
          </div>
          <span class="${this.getStatusBadgeClass(status)}">${status}</span>
        </div>

        <div class="queue-card-meta">
          <div><span class="label">ID Sasaran</span><strong>${targetId}</strong></div>
          <div><span class="label">Client Submit ID</span><strong>${clientId}</strong></div>
          <div><span class="label">Retry</span><strong>${item.retry_count || 0}</strong></div>
          <div><span class="label">Dibuat</span><strong>${item.created_at || '-'}</strong></div>
        </div>

        ${item.last_error ? `<p class="muted-text">Error terakhir: ${item.last_error}</p>` : ''}

        <div class="queue-card-actions">
          <button class="btn btn-primary btn-sm" data-sync-retry-id="${item.id}">Kirim Ulang</button>
          <button class="btn btn-secondary btn-sm" data-sync-delete-id="${item.id}">Hapus</button>
        </div>
      </article>
    `;
  }
};
