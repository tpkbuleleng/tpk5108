window.Auth = {
  async login(idKader, password) {
    return Api.post(
      'login',
      {
        id_kader: String(idKader || '').trim(),
        password: String(password || '').trim()
      },
      { skipToken: true }
    );
  },

  handleLoginSuccess(result) {
    const data = result?.data || {};

    const token =
      data.session_token ||
      data.token ||
      '';

    const profile =
      data.profile ||
      data.user ||
      null;

    const bootstrap =
      data.bootstrap_refs ||
      data.bootstrap ||
      null;

    Session.setToken(token);
    Session.setProfile(profile);

    if (bootstrap) {
      StorageHelper.set(APP_CONFIG.STORAGE_KEYS.BOOTSTRAP, bootstrap);
    }

    return {
      token,
      profile,
      bootstrap
    };
  },

  logout() {
    try {
      Session.logout?.();
    } catch (_) {
      try {
        Session.clear?.();
      } catch (_) {}
    }

    try {
      SasaranState?.clearSelected?.();
      SasaranState?.clearList?.();
    } catch (_) {}

    try {
      PendampinganState?.reset?.();
    } catch (_) {}

    try {
      DraftManager?.clearRegistrasiDraft?.();
    } catch (_) {}

    try {
      PendampinganDraft?.clearLocal?.();
    } catch (_) {}

    try {
      Router?.toLogin?.();
    } catch (_) {
      UI.showScreen('login-screen');
    }
  },

  guard() {
    const loggedIn = Session.isLoggedIn?.();

    if (loggedIn) {
      return true;
    }

    try {
      Router?.toLogin?.();
    } catch (_) {
      UI.showScreen('login-screen');
    }

    return false;
  }
};
