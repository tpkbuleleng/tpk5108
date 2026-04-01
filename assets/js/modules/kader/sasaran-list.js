window.SasaranList = {
      keyword: document.getElementById('filter-keyword-sasaran')?.value?.trim() || '',
      jenis_sasaran: document.getElementById('filter-jenis-sasaran')?.value || '',
      status_sasaran: document.getElementById('filter-status-sasaran')?.value || ''
    };
  },

  normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.rows)) return data.rows;
    return [];
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
    const id = item.id_sasaran || item.id || '-';
    const nama = item.nama_sasaran || item.nama || '-';
    const jenis = item.jenis_sasaran || '-';
    const status = item.status_sasaran || item.status || '-';
    const wilayah = item.nama_wilayah || item.wilayah || item.nama_desa || '-';
    const nik = item.nik || '-';
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
    return 'badge-neutral';
  },

  findById(idSasaran) {
    return this.getCurrentList().find(item => (item.id_sasaran || item.id) === idSasaran) || null;
  },

  getCurrentList() {
    return SasaranState.getList();
  }
};
