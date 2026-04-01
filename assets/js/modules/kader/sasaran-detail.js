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
      Notifier.show(err.message || 'Gagal memuat detail sasaran.');
    }
  },

  renderBasic(item) {
    this.renderFull(item || {});
  },

  renderFull(item) {
    const status = item.status_sasaran || '-';
    const wilayah = item.nama_wilayah || [item.nama_dusun, item.nama_desa, item.nama_kecamatan].filter(Boolean).join(' / ') || '-';

    UI.setText('detail-nama-sasaran', item.nama_sasaran || '-');
    UI.setText('detail-id-sasaran', `ID Sasaran: ${item.id_sasaran || '-'}`);
    UI.setText('detail-jenis', item.jenis_sasaran || '-');
    UI.setText('detail-nik', item.nik || '-');
    UI.setText('detail-kk', item.nomor_kk || '-');
    UI.setText('detail-tanggal-lahir', item.tanggal_lahir || '-');
    UI.setText('detail-wilayah', wilayah);
    UI.setText('detail-updated-at', item.updated_at || item.created_at || '-');

    const badge = document.getElementById('detail-status-badge');
    if (badge) {
      badge.textContent = status;
      badge.className = `badge ${this.getStatusBadgeClass(status)}`;
    }

    this.renderExtraFields(item);
    this.renderRiwayatRingkas(item.riwayat_pendampingan || []);
  },

  renderExtraFields(item) {
    const extraFromJson = SasaranService.parseExtraFields(item.extra_fields_json || '');
    const merged = Object.assign({}, item, extraFromJson);

    const excludeKeys = new Set([
      'id_sasaran',
      'nama_sasaran',
      'jenis_sasaran',
      'nik',
      'nik_sasaran',
      'nomor_kk',
      'jenis_kelamin',
      'tanggal_lahir',
      'id_tim',
      'nama_tim',
      'nama_kecamatan',
      'nama_desa',
      'nama_dusun',
      'nama_wilayah',
      'alamat',
      'status_sasaran',
      'created_at',
      'created_by',
      'updated_at',
      'updated_by',
      'extra_fields_json',
      'riwayat_pendampingan'
    ]);

    const fixedEntries = [
      ['id_tim', item.id_tim || '-'],
      ['nama_tim', item.nama_tim || '-'],
      ['alamat', item.alamat || '-'],
      ['jenis_kelamin', item.jenis_kelamin || '-'],
      ['created_by', item.created_by || '-']
    ];

    const dynamicEntries = Object.entries(merged)
      .filter(([key, value]) => !excludeKeys.has(key) && value !== '' && value !== null && value !== undefined)
      .slice(0, 12);

    const html = [...fixedEntries, ...dynamicEntries].map(([key, value]) => `
      <div>
        <span class="label">${this.prettyLabel(key)}</span>
        <strong>${value}</strong>
      </div>
    `).join('');

    UI.setHTML(
      'detail-extra-fields',
      html || '<div><span class="label">Informasi tambahan</span><strong>Tidak ada data tambahan.</strong></div>'
    );
  },

  renderRiwayatRingkas(items) {
    if (!Array.isArray(items) || !items.length) {
      UI.setHTML('detail-riwayat-ringkas', '<p class="muted-text">Belum ada riwayat pendampingan.</p>');
      return;
    }

    const html = items.slice(0, 20).map(item => {
      const idPendampingan = item.id_pendampingan || '';
      const canEdit = item.can_edit !== false;
      const editedBadge = item.is_edited ? '<span class="badge badge-warning">EDITED</span>' : '';

      return `
        <div class="riwayat-item">
          <div><span class="label">Tanggal</span><strong>${item.tanggal_pendampingan || '-'}</strong></div>
          <div><span class="label">Status</span><strong>${item.status_kunjungan || 'Tersimpan'}</strong></div>
          <div><span class="label">Catatan</span><strong>${item.catatan_umum || '-'}</strong></div>
          <div><span class="label">Kader</span><strong>${item.nama_kader || '-'}</strong></div>
          <div><span class="label">Tim</span><strong>${item.nama_tim || item.id_tim || '-'}</strong></div>
          <div><span class="label">Revision</span><strong>${item.revision_no || 1}</strong> ${editedBadge}</div>
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
    const map = {
      id_tim: 'ID Tim',
      nama_tim: 'Nama Tim',
      created_by: 'Dibuat Oleh',
      jenis_kelamin: 'Jenis Kelamin'
    };

    if (map[key]) return map[key];

    return String(key)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  },

  getStatusBadgeClass(status) {
    const value = String(status || '').toUpperCase();
    if (value === 'AKTIF') return 'badge-success-soft';
    if (value === 'NONAKTIF') return 'badge-danger-soft';
    if (value === 'SELESAI') return 'badge-success';
    if (value === 'PERLU_REVIEW') return 'badge-warning';
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
