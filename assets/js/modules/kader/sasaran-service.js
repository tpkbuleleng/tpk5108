window.SasaranService = {
  async getTimWilayah() {
    return Api.post('getTimWilayah', {});
  },

  async getSasaranByTim(filters = {}) {
    return Api.post('getSasaranByTim', {
      keyword: filters.keyword || '',
      jenis_sasaran: filters.jenis_sasaran || '',
      status_sasaran: filters.status_sasaran || ''
    });
  },

  async getSasaranDetail(idSasaran) {
    return Api.post('getSasaranDetail', {
      id_sasaran: idSasaran
    });
  },

  normalizeSasaranDetailResponse(result) {
    const data = result?.data || {};
    const item = data.item || data.detail || data || {};

    const riwayatRaw = item.riwayat_pendampingan || item.riwayat || [];
    const riwayat = Array.isArray(riwayatRaw)
      ? riwayatRaw.map(entry => ({
          id_pendampingan: entry.id_pendampingan || '',
          tanggal_pendampingan: entry.tanggal_pendampingan || entry.tanggal || '',
          status_kunjungan: entry.status_kunjungan || entry.status || '',
          catatan_umum: entry.catatan_umum || entry.catatan || entry.keterangan || '',
          can_edit: entry.can_edit !== false
        }))
      : [];

    return Object.assign({}, item, {
      riwayat_pendampingan: riwayat
    });
  }
};
