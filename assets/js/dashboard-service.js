window.DashboardService = {
  async getDashboardKaderSummary() {
    return Api.post('getDashboardKaderSummary', {});
  }
};
