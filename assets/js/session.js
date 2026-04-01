window.Session = {
  getToken() {
    return StorageHelper.get(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN, '');
  },

  setToken(token) {
    return StorageHelper.set(
      APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN,
      String(token || '').trim()
    );
  },

  getProfile() {
    const profile = StorageHelper.get(APP_CONFIG.STORAGE_KEYS.PROFILE, null);
    return profile && typeof profile === 'object' ? profile : null;
  },

  setProfile(profile) {
    const safeProfile =
      profile && typeof profile === 'object'
        ? profile
        : null;

    return StorageHelper.set(APP_CONFIG.STORAGE_KEYS.PROFILE, safeProfile);
  },

  hasToken() {
    return !!this.getToken();
  },

  hasProfile() {
    return !!this.getProfile();
  },

  isLoggedIn() {
    return this.hasToken() && this.hasProfile();
  },

  clear() {
    StorageHelper.remove(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
    StorageHelper.remove(APP_CONFIG.STORAGE_KEYS.PROFILE);
  },

  logout() {
    this.clear();
  }
};
