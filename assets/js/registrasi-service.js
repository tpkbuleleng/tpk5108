window.RegistrasiService = {
  async getFormDefinition(jenisSasaran) {
    return Api.post('getFormDefinition', {
      form_id: FormMapper.getFormIdByJenis(jenisSasaran),
      jenis_sasaran: jenisSasaran
    });
  },

  async submitRegistrasi(payload) {
    return Api.post('submitRegistrasiSasaran', payload);
  },

  async updateSasaran(payload) {
    return Api.post('updateSasaran', payload);
  }
};
