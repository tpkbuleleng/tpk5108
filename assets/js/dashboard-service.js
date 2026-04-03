window.DashboardService = {
  async getDashboardSummary(periodeKey = '') {
    return Api.post('getDashboardSummary', {
      periode_key: periodeKey || ''
    });
  },

  async getRekapBulananTim(periodeKey = '') {
    return Api.post('getRekapBulananTim', {
      periode_key: periodeKey || ''
    });
  },

  async getMyProfile() {
    return Api.post('getMyProfile', {});
  },

  async getMyPermissions() {
    return Api.post('getMyPermissions', {});
  }
};
