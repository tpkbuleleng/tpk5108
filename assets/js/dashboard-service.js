window.DashboardService = {
  async getDashboardKaderSummary() {
    return Api.post('getDashboardKaderSummary', {});
  },

  async getRekapKader(bulan) {
    return Api.post('getRekapKader', {
      bulan: bulan || ''
    });
  },

  async getTimWilayah() {
    return Api.post('getTimWilayah', {});
  }
};
