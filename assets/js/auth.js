window.Auth = {
  async login(idKader, password) {
    return Api.post('login', {
      id_kader: String(idKader || '').trim(),
      password: String(password || '').trim()
    }, { skipToken: true });
  },

  handleLoginSuccess(result) {
    const data = result?.data || {};

    Session.setToken(data.session_token || data.token || '');
    Session.setProfile(data.profile || null);
  },

  logout() {
    Session.logout();
    UI.showScreen('login-screen');
  },

  guard() {
    if (Session.isLoggedIn()) {
      UI.showScreen('dashboard-screen');
      return true;
    }

    UI.showScreen('login-screen');
    return false;
  }
};
