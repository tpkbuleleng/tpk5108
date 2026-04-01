window.SasaranDetail = {
  async openById(idSasaran) {
    const fallbackItem = SasaranList.findById(idSasaran);
    if (fallbackItem) {
      SasaranState.setSelected(fallbackItem);
      this.renderBasic(fallbackItem);
    }

    Router.toSasaranDetail();

    try {
      const result = await SasaranService.getSasaranDetail(idSasaran);
      if (!result?.ok) {
        throw new Error(result?.message || 'Gagal memuat detail sasaran.');
      }

      const detail = SasaranService.normalizeSasaranDetailResponse(result);
      SasaranState.setSelected(detail);
      this.renderFull(detail);
    } catch (err) {
      Notifier.show(err.message);
    }
  },

  renderBasic(item) {
    this.renderFull(item || {});
  },

  renderFull(item) {
    const status = item.status_sasaran || item.status || '-';
    const wilayah = item.nama_wilayah || item.wilayah || item.nama_desa || item.nama_kecamatan || '-';

    UI.setText('detail-nama-sasaran', item.nama_sasaran || item.nama || '-');
    UI.setText('detail-id-sasaran', `ID Sasaran: ${item.id_sasaran || item.id || '-'}`);
    UI.setText('detail-jenis', item.jenis_sasaran || '-');
    UI.setText('detail-nik', item.nik || '-');
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
    this.renderRiwayatRingkas(item.riwayat_pendampingan || []);
  },

  renderExtraFields(item) {
    const excludeKeys = new Set([
      'id_sasaran',
      'id',
      'nama_sasaran',
      'nama',
      'jenis_sasaran',
      'nik',
      'nomor_kk',
      'no_kk',
      'tanggal_lahir',
      'tgl_lahir',
      'nama_wilayah',
      'wilayah',
      'nama_desa',
      'nama_kecamatan',
      'status_sasaran',
      'status',
      'updated_at',
      'last_updated_at',
      'riwayat_pendampingan',
      'riwayat'
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

    const html = items.slice(0, 10).map(item => {
      const idPendampingan = item.id_pendampingan || '';
      const canEdit = item.can_edit !== false;

      return `
        <div class="riwayat-item">
          <div><span class="label">Tanggal</span><strong>${item.tanggal_pendampingan || '-'}</strong></div>
          <div><span class="label">Status</span><strong>${item.status_kunjungan || 'Tersimpan'}</strong></div>
          <div><span class="label">Catatan</span><strong>${item.catatan_umum || '-'}</strong></div>
          <div><span class="label">ID Pendampingan</span><strong>${idPendampingan || '-'}</strong></div>
          <div class="sasaran-card-actions">
            ${idPendampingan ? `
              <button
                class="btn btn-secondary btn-sm"
                data-edit-pendampingan="${idPendampingan}"
                ${canEdit ? '' : 'disabled'}
              >
                Edit Pendampingan
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

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
