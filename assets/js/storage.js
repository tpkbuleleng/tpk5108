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
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error('Storage remove error:', err);
      return false;
    }
  },

  clearSession() {
    const keys = APP_CONFIG.STORAGE_KEYS || {};

    [
      keys.SESSION_TOKEN,
      keys.PROFILE,
      keys.BOOTSTRAP,
      keys.SELECTED_SASARAN,
      'registrasiMode',
      'registrasiEditItem',
      'pendampinganMode',
      'pendampinganEditItem'
    ].forEach(key => {
      if (key) this.remove(key);
    });
  }
};
