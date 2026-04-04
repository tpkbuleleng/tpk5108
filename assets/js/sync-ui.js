window.SyncUI = {
  escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

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
    if (value === 'SUCCESS') return 'badge badge-success-soft';
    return 'badge badge-info-soft';
  },

  renderQueueItem(item) {
    const payload = item.payload || {};
    const primaryName = payload.nama_sasaran || payload.nama || '-';
    const targetId = payload.id_sasaran || payload.id || '-';
    const pendampinganId = payload.id_pendampingan || '-';
    const clientId = item.client_submit_id || payload.client_submit_id || '-';
    const status = String(item.sync_status || 'PENDING').toUpperCase();
    const retryCount = Number(item.retry_count || 0);
    const createdAt = item.created_at || '-';
    const lastSyncedAt = item.last_synced_at || '-';
    const canRetry = navigator.onLine;

    return `
      <article class="queue-card">
        <div class="queue-card-header">
          <div>
            <h4 class="sasaran-card-title">${this.escapeHtml(this.getActionLabel(item.action))}</h4>
            <p class="muted-text">${this.escapeHtml(primaryName)}</p>
          </div>
          <span class="${this.getStatusBadgeClass(status)}">${this.escapeHtml(status)}</span>
        </div>

        <div class="queue-card-meta">
          <div><span class="label">ID Sasaran</span><strong>${this.escapeHtml(targetId)}</strong></div>
          <div><span class="label">ID Pendampingan</span><strong>${this.escapeHtml(pendampinganId)}</strong></div>
          <div><span class="label">Client Submit ID</span><strong>${this.escapeHtml(clientId)}</strong></div>
          <div><span class="label">Retry</span><strong>${this.escapeHtml(retryCount)}</strong></div>
          <div><span class="label">Dibuat</span><strong>${this.escapeHtml(createdAt)}</strong></div>
          <div><span class="label">Terakhir Sync</span><strong>${this.escapeHtml(lastSyncedAt)}</strong></div>
        </div>

        ${item.last_error ? `<p class="muted-text">Error terakhir: ${this.escapeHtml(item.last_error)}</p>` : ''}

        <div class="queue-card-actions">
          <button
            class="btn btn-primary btn-sm"
            data-sync-retry-id="${this.escapeHtml(item.id)}"
            ${canRetry ? '' : 'disabled'}
          >
            Kirim Ulang
          </button>

          <button
            class="btn btn-secondary btn-sm"
            data-sync-delete-id="${this.escapeHtml(item.id)}"
          >
            Hapus
          </button>
        </div>
      </article>
    `;
  }
};
