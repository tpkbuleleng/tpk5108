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

  normalizeListResponse(result) {
    const data = result?.data || {};
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.rows)) return data.rows;
    return [];
  },

  normalizeSasaranList(items = []) {
    return (items || []).map(item => ({
      id_sasaran: item.id_sasaran || item.id || '',
      nama_sasaran: item.nama_sasaran || item.nama || '',
      jenis_sasaran: item.jenis_sasaran || '',
      nik: item.nik || item.nik_sasaran || '',
      nomor_kk: item.nomor_kk || '',
      jenis_kelamin: item.jenis_kelamin || '',
      tanggal_lahir: item.tanggal_lahir || '',
      id_tim: item.id_tim || '',
      nama_tim: item.nama_tim || '',
      nama_kecamatan: item.nama_kecamatan || '',
      nama_desa: item.nama_desa || '',
      nama_dusun: item.nama_dusun || '',
      alamat: item.alamat || '',
      status_sasaran: item.status_sasaran || 'AKTIF',
      created_at: item.created_at || item.tanggal_register || '',
      created_by: item.created_by || item.registered_by || '',
      updated_at: item.updated_at || '',
      updated_by: item.updated_by || '',
      extra_fields_json: item.extra_fields_json || item.data_laporan || ''
    }));
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
          id_kader: entry.id_kader || '',
          nama_kader: entry.nama_kader || '',
          id_tim: entry.id_tim || '',
          nama_tim: entry.nama_tim || '',
          revision_no: Number(entry.revision_no || 1),
          is_edited: entry.is_edited === true || String(entry.is_edited || '').toUpperCase() === 'TRUE',
          edit_window_status: entry.edit_window_status || '',
          can_edit: entry.can_edit !== false
        }))
      : [];

    return {
      id_sasaran: item.id_sasaran || item.id || '',
      nama_sasaran: item.nama_sasaran || item.nama || '',
      jenis_sasaran: item.jenis_sasaran || '',
      nik: item.nik || item.nik_sasaran || '',
      nomor_kk: item.nomor_kk || '',
      jenis_kelamin: item.jenis_kelamin || '',
      tanggal_lahir: item.tanggal_lahir || '',
      id_tim: item.id_tim || '',
      nama_tim: item.nama_tim || '',
      nama_kecamatan: item.nama_kecamatan || '',
      nama_desa: item.nama_desa || '',
      nama_dusun: item.nama_dusun || '',
      nama_wilayah: item.nama_wilayah || [item.nama_dusun, item.nama_desa, item.nama_kecamatan].filter(Boolean).join(' / '),
      alamat: item.alamat || '',
      status_sasaran: item.status_sasaran || 'AKTIF',
      created_at: item.created_at || '',
      created_by: item.created_by || '',
      updated_at: item.updated_at || '',
      updated_by: item.updated_by || '',
      extra_fields_json: item.extra_fields_json || '',
      riwayat_pendampingan: riwayat
    };
  },

  parseExtraFields(value) {
    try {
      if (!value) return {};
      if (typeof value === 'object') return value;
      return JSON.parse(value);
    } catch (err) {
      return {};
    }
  }
};
