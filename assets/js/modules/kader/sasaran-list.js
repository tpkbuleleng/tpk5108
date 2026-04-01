window.SasaranList = {
  async init() {
    const cached = SasaranState.getList();
    if (cached.length) {
      this.renderList(cached);
      UI.setText('sasaran-list-meta', `${cached.length} data sasaran dari cache lokal.`);
    }
  },

  async loadAndRender() {
    const filters = this.getFilters();
    UI.setHTML('sasaran-list-container', '<p class="muted-text">Sedang memuat data sasaran...</p>');

    try {
      const result = await SasaranService.getSasaranByTim(filters);
      if (!result?.ok) {
        throw new Error(result?.message || 'Gagal memuat daftar sasaran.');
      }

      const rawItems = SasaranService.normalizeListResponse(result);
      const items = SasaranService.normalizeSasaranList(rawItems);

      SasaranState.setList(items);
      this.renderList(items);
      UI.setText('sasaran-list-meta', `${items.length} data sasaran berhasil dimuat.`);
    } catch (err) {
      const cached = SasaranState.getList();
      if (cached.length) {
        this.renderList(cached);
        UI.setText('sasaran-list-meta', `Menampilkan ${cached.length} data cache lokal.`);
        Notifier.show(`Gagal refresh: ${err.message}`);
        return;
      }

      UI.setHTML('sasaran-list-container', `<p class="muted-text">${err.message}</p>`);
      UI.setText('sasaran-list-meta', 'Gagal memuat data sasaran.');
    }
  },

  getFilters() {
    return {
      keyword: document.getElementById('filter-keyword-sasaran')?.value?.trim() || '',
      jenis_sasaran: document.getElementById('filter-jenis-sasaran')?.value || '',
      status_sasaran: document.getElementById('filter-status-sasaran')?.value || ''
    };
  },

  renderList(items) {
    const container = document.getElementById('sasaran-list-container');
    if (!container) return;

    if (!items.length) {
      container.innerHTML = '<p class="muted-text">Belum ada data sasaran untuk ditampilkan.</p>';
      return;
    }

    container.innerHTML = items.map(item => this.cardTemplate(item)).join('');
  },

  cardTemplate(item) {
    const id = item.id_sasaran || '-';
    const nama = item.nama_sasaran || '-';
    const jenis = item.jenis_sasaran || '-';
    const status = item.status_sasaran || '-';
    const wilayah = [item.nama_dusun, item.nama_desa, item.nama_kecamatan].filter(Boolean).join(' / ') || '-';
    const nik = item.nik || '-';
    const tim = item.nama_tim || item.id_tim || '-';
    const badgeClass = this.getStatusBadgeClass(status);

    return `
      <article class="sasaran-card">
        <div class="sasaran-card-header">
          <div>
            <h4 class="sasaran-card-title">${nama}</h4>
            <p class="muted-text">ID Sasaran: ${id}</p>
          </div>
          <span class="badge ${badgeClass}">${status}</span>
        </div>

        <div class="sasaran-card-meta">
          <div><span class="label">Jenis</span><strong>${jenis}</strong></div>
          <div><span class="label">NIK</span><strong>${nik}</strong></div>
          <div><span class="label">Tim</span><strong>${tim}</strong></div>
          <div><span class="label">Wilayah</span><strong>${wilayah}</strong></div>
        </div>

        <div class="sasaran-card-actions">
          <button class="btn btn-primary btn-sm" data-open-sasaran-detail="${id}">Lihat Detail</button>
          <button class="btn btn-secondary btn-sm" data-pilih-sasaran="${id}">Pilih Sasaran</button>
        </div>
      </article>
    `;
  },

  getStatusBadgeClass(status) {
    const value = String(status || '').toUpperCase();
    if (value === 'AKTIF') return 'badge-success-soft';
    if (value === 'NONAKTIF') return 'badge-danger-soft';
    if (value === 'SELESAI') return 'badge-success';
    if (value === 'PERLU_REVIEW') return 'badge-warning';
    return 'badge-neutral';
  },

  findById(idSasaran) {
    return this.getCurrentList().find(item => item.id_sasaran === idSasaran) || null;
  },

  getCurrentList() {
    return SasaranState.getList();
  }
};
