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
  }
};
