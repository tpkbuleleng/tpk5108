window.PendampinganService = {
  async getPendampinganFormDefinition(jenisSasaran) {
    const jenis = String(jenisSasaran || '').trim().toUpperCase();

    return Api.post('getPendampinganFormDefinition', {
      form_id: FormMapper.getFormIdByJenis(jenis),
      jenis_sasaran: jenis
    });
  },

  async getPendampinganDetail(idPendampingan) {
    return Api.post('getPendampinganDetail', {
      id_pendampingan: String(idPendampingan || '').trim()
    });
  },

  async submitPendampingan(payload) {
    const safePayload = Object.assign({}, payload, {
      jenis_sasaran: String(payload?.jenis_sasaran || '').trim().toUpperCase(),
      form_id: FormMapper.getFormIdByJenis(payload?.jenis_sasaran || ''),
      client_submit_id: ClientId.ensure(payload?.client_submit_id, 'SUB'),
      sync_source: payload?.sync_source || 'ONLINE'
    });

    return Api.post('submitPendampingan', safePayload, {
      clientSubmitId: safePayload.client_submit_id,
      syncSource: safePayload.sync_source || 'ONLINE'
    });
  },

  async updatePendampingan(payload) {
    const safePayload = Object.assign({}, payload, {
      id_pendampingan: String(payload?.id_pendampingan || '').trim(),
      sync_source: payload?.sync_source || 'ONLINE'
    });

    return Api.post('updatePendampingan', safePayload, {
      syncSource: safePayload.sync_source || 'ONLINE',
      skipClientSubmitId: true
    });
  },

  normalizePendampinganDetail(result) {
    const data = result?.data || {};

    let extraFields = data.extra_fields || {};
    if ((!extraFields || typeof extraFields !== 'object') && data.extra_fields_json) {
      try {
        extraFields = JSON.parse(data.extra_fields_json);
      } catch (_) {
        extraFields = {};
      }
    }

    if (!extraFields || typeof extraFields !== 'object') {
      extraFields = {};
    }

    return {
      id_pendampingan: data.id_pendampingan || '',
      id_sasaran: data.id_sasaran || '',
      nama_sasaran: data.nama_sasaran || '',
      jenis_sasaran: String(data.jenis_sasaran || '').trim().toUpperCase(),
      form_id: data.form_id || '',
      tanggal_pendampingan: data.tanggal_pendampingan || '',
      status_kunjungan: data.status_kunjungan || '',
      catatan_umum: data.catatan_umum || '',
      extra_fields: extraFields,
      extra_fields_json: data.extra_fields_json || '',
      revision_no: Number(data.revision_no || 1),
      edit_window_status: data.edit_window_status || '',
      can_edit: data.can_edit !== false,
      status_sasaran: data.status_sasaran || 'AKTIF',
      nama_wilayah:
        data.nama_wilayah ||
        [data.nama_dusun, data.nama_desa, data.nama_kecamatan].filter(Boolean).join(' / '),
      nama_kecamatan: data.nama_kecamatan || '',
      nama_desa: data.nama_desa || '',
      nama_dusun: data.nama_dusun || '',
      id_tim: data.id_tim || '',
      nama_tim: data.nama_tim || '',
      book_key: data.book_key || ''
    };
  }
};
