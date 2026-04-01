window.PendampinganService = {
  async getPendampinganFormDefinition(jenisSasaran) {
    return Api.post('getPendampinganFormDefinition', {
      form_id: FormMapper.getFormIdByJenis(jenisSasaran),
      jenis_sasaran: jenisSasaran
    });
  },

  async getPendampinganDetail(idPendampingan) {
    return Api.post('getPendampinganDetail', {
      id_pendampingan: idPendampingan
    });
  },

  async submitPendampingan(payload) {
    return Api.post('submitPendampingan', payload, {
      clientSubmitId: payload.client_submit_id || '',
      syncSource: payload.sync_source || 'ONLINE'
    });
  },

  async updatePendampingan(payload) {
    return Api.post('updatePendampingan', payload, {
      syncSource: 'ONLINE'
    });
  },

  normalizePendampinganDetail(result) {
    const data = result?.data || {};
    return {
      id_pendampingan: data.id_pendampingan || '',
      id_sasaran: data.id_sasaran || '',
      nama_sasaran: data.nama_sasaran || '',
      jenis_sasaran: data.jenis_sasaran || '',
      form_id: data.form_id || '',
      tanggal_pendampingan: data.tanggal_pendampingan || '',
      status_kunjungan: data.status_kunjungan || '',
      catatan_umum: data.catatan_umum || '',
      extra_fields: data.extra_fields || {},
      revision_no: Number(data.revision_no || 1),
      edit_window_status: data.edit_window_status || '',
      can_edit: data.can_edit !== false,
      status_sasaran: data.status_sasaran || 'AKTIF',
      nama_wilayah: data.nama_wilayah || '',
      book_key: data.book_key || ''
    };
  }
};
