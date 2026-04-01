window.RekapKaderService = {
  async getRekapKader(bulan) {
    return Api.post('getRekapKader', {
      bulan: bulan || ''
    });
  }
};
