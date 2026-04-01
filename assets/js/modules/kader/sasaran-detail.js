window.SasaranDetail = {
    UI.setText('detail-kk', item.nomor_kk || item.no_kk || '-');
    UI.setText('detail-tanggal-lahir', item.tanggal_lahir || item.tgl_lahir || '-');
    UI.setText('detail-wilayah', wilayah);
    UI.setText('detail-updated-at', item.updated_at || item.last_updated_at || '-');

    const badge = document.getElementById('detail-status-badge');
    if (badge) {
      badge.textContent = status;
      badge.className = `badge ${this.getStatusBadgeClass(status)}`;
    }

    this.renderExtraFields(item);
    this.renderRiwayatRingkas(item.riwayat_pendampingan || item.riwayat || []);
  },

  renderExtraFields(item) {
    const excludeKeys = new Set([
      'id_sasaran', 'id', 'nama_sasaran', 'nama', 'jenis_sasaran', 'nik', 'nomor_kk', 'no_kk',
      'tanggal_lahir', 'tgl_lahir', 'nama_wilayah', 'wilayah', 'nama_desa', 'nama_kecamatan',
      'status_sasaran', 'status', 'updated_at', 'last_updated_at', 'riwayat_pendampingan', 'riwayat'
    ]);

    const entries = Object.entries(item || {})
      .filter(([key, value]) => !excludeKeys.has(key) && value !== '' && value !== null && value !== undefined)
      .slice(0, 12);

    const html = entries.length
      ? entries.map(([key, value]) => `
          <div>
            <span class="label">${this.prettyLabel(key)}</span>
            <strong>${value}</strong>
          </div>
        `).join('')
      : '<div><span class="label">Informasi tambahan</span><strong>Tidak ada data tambahan.</strong></div>';

    UI.setHTML('detail-extra-fields', html);
  },

  renderRiwayatRingkas(items) {
    if (!Array.isArray(items) || !items.length) {
      UI.setHTML('detail-riwayat-ringkas', '<p class="muted-text">Belum ada riwayat pendampingan.</p>');
      return;
    }

    const html = items.slice(0, 5).map(item => `
      <div class="riwayat-item">
        <div><span class="label">Tanggal</span><strong>${item.tanggal_pendampingan || item.tanggal || '-'}</strong></div>
        <div><span class="label">Status</span><strong>${item.status || 'Tersimpan'}</strong></div>
        <div><span class="label">Catatan</span><strong>${item.catatan || item.keterangan || '-'}</strong></div>
      </div>
    `).join('');

    UI.setHTML('detail-riwayat-ringkas', html);
  },

  prettyLabel(key) {
    return String(key)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  },

  getStatusBadgeClass(status) {
    const value = String(status || '').toUpperCase();
    if (value === 'AKTIF') return 'badge-success-soft';
    if (value === 'NONAKTIF') return 'badge-danger-soft';
    if (value === 'SELESAI') return 'badge-success';
    return 'badge-neutral';
  },

    openEditSelected() {
    const item = SasaranState.getSelected();
    if (!item) {
      Notifier.show('Data sasaran belum dipilih.');
      return;
    }
    RegistrasiForm.openEdit(item);
  }
};
