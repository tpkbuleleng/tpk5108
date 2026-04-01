window.Session = {
  getToken() {
    return StorageHelper.get(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN, '');
  },

  setToken(token) {
    return StorageHelper.set(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN, token || '');
  },

  getProfile() {
    return StorageHelper.get(APP_CONFIG.STORAGE_KEYS.PROFILE, null);
  },

  setProfile(profile) {
    return StorageHelper.set(APP_CONFIG.STORAGE_KEYS.PROFILE, profile || null);
  },

  isLoggedIn() {
    return !!this.getToken() && !!this.getProfile();
  },

  logout() {
    StorageHelper.clearSession();
  }
};
