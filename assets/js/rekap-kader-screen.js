window.RekapKaderScreen = {
  getDefaultMonth() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  },

  ensureDefaultMonth() {
    const el = document.getElementById('rekap-filter-bulan');
    if (el && !el.value) {
      el.value = this.getDefaultMonth();
    }
  },

  async load() {
    this.ensureDefaultMonth();
    const bulan = document.getElementById('rekap-filter-bulan')?.value || this.getDefaultMonth();

    UI.setHTML('rekap-summary-box', '<p class="muted-text">Sedang memuat rekap...</p>');
    UI.setHTML('rekap-activity-list', '<p class="muted-text">Sedang memuat aktivitas...</p>');

    try {
      const result = await RekapKaderService.getRekapKader(bulan);
      if (!result?.ok) {
        throw new Error(result?.message || 'Gagal memuat rekap kader.');
      }

      const data = result.data || {};
      this.render(data);
    } catch (err) {
      UI.setHTML('rekap-summary-box', `<p class="muted-text">${err.message}</p>`);
      UI.setHTML('rekap-activity-list', '<p class="muted-text">Aktivitas tidak dapat dimuat.</p>');
    }
  },

  render(data) {
    UI.setText('rekap-stat-sasaran-aktif', String(data.jumlah_sasaran_aktif || 0));
    UI.setText('rekap-stat-pendampingan', String(data.jumlah_pendampingan || 0));
    UI.setText('rekap-stat-draft', String(OfflineSync.getQueue().length || 0));
    UI.setText('rekap-stat-followup', String(data.jumlah_perlu_tindak_lanjut || 0));

    const summaryHtml = `
      <div class="activity-item">
        <div><span class="label">Nama Kader</span><strong>${data.nama_kader || '-'}</strong></div>
        <div><span class="label">Tim</span><strong>${data.nama_tim || '-'}</strong></div>
        <div><span class="label">Bulan</span><strong>${data.bulan || '-'}</strong></div>
      </div>
      <div class="activity-item">
        <div><span class="label">Keterangan</span><strong>${data.keterangan || 'Rekap periode berhasil dimuat.'}</strong></div>
      </div>
    `;

    UI.setHTML('rekap-summary-box', summaryHtml);

    const activities = Array.isArray(data.aktivitas_terbaru) ? data.aktivitas_terbaru : [];
    if (!activities.length) {
      UI.setHTML('rekap-activity-list', '<p class="muted-text">Belum ada aktivitas terbaru.</p>');
      return;
    }

    const activityHtml = activities.map(item => `
      <div class="activity-item">
        <div><span class="label">Tanggal</span><strong>${item.tanggal || '-'}</strong></div>
        <div><span class="label">Jenis</span><strong>${item.jenis || '-'}</strong></div>
        <div><span class="label">Keterangan</span><strong>${item.keterangan || '-'}</strong></div>
      </div>
    `).join('');

    UI.setHTML('rekap-activity-list', activityHtml);
  }
};
