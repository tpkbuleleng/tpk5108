window.StorageHelper = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.error('Storage get error:', err);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('Storage set error:', err);
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clearSession() {
    this.remove(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
    this.remove(APP_CONFIG.STORAGE_KEYS.PROFILE);
    this.remove(APP_CONFIG.STORAGE_KEYS.BOOTSTRAP);
    this.remove(APP_CONFIG.STORAGE_KEYS.SELECTED_SASARAN);
  }
};
