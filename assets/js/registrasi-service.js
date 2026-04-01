window.RegistrasiService = {
  async getFormDefinition(jenisSasaran) {
    const jenis = String(jenisSasaran || '').trim().toUpperCase();

    return Api.post('getFormDefinition', {
      form_id: FormMapper.getFormIdByJenis(jenis),
      jenis_sasaran: jenis
    });
  },

  async submitRegistrasi(payload) {
    const safePayload = Object.assign({}, payload, {
      jenis_sasaran: String(payload?.jenis_sasaran || '').trim().toUpperCase(),
      form_id: FormMapper.getFormIdByJenis(payload?.jenis_sasaran || ''),
      client_submit_id: ClientId.ensure(payload?.client_submit_id, 'SUB'),
      sync_source: payload?.sync_source || 'ONLINE'
    });

    return Api.post('submitRegistrasiSasaran', safePayload, {
      clientSubmitId: safePayload.client_submit_id,
      syncSource: safePayload.sync_source || 'ONLINE'
    });
  },

  async updateSasaran(payload) {
    const safePayload = Object.assign({}, payload, {
      id_sasaran: String(payload?.id_sasaran || '').trim(),
      jenis_sasaran: String(payload?.jenis_sasaran || '').trim().toUpperCase(),
      form_id: FormMapper.getFormIdByJenis(payload?.jenis_sasaran || ''),
      sync_source: payload?.sync_source || 'ONLINE'
    });

    return Api.post('updateSasaran', safePayload, {
      syncSource: safePayload.sync_source || 'ONLINE',
      skipClientSubmitId: true
    });
  }
};
