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
    return Api.post('submitPendampingan', payload);
  },

  async updatePendampingan(payload) {
    return Api.post('updatePendampingan', payload);
  }
};
