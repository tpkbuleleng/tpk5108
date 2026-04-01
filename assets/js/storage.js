window.StorageHelper = {
  isAvailable() {
    try {
      const testKey = '__tpk_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (err) {
      return false;
    }
  },

  get(key, fallback = null) {
    try {
      if (!this.isAvailable()) return fallback;
      const raw = localStorage.getItem(String(key || '').trim());
      if (raw === null || raw === undefined || raw === '') return fallback;
      return JSON.parse(raw);
    } catch (err) {
      if (window.APP_CONFIG?.DEBUG) {
        console.warn('Storage get gagal:', key, err.message);
      }
      return fallback;
    }
  },

  set(key, value) {
    try {
      if (!this.isAvailable()) return value;
      localStorage.setItem(String(key || '').trim(), JSON.stringify(value));
      return value;
    } catch (err) {
      if (window.APP_CONFIG?.DEBUG) {
        console.warn('Storage set gagal:', key, err.message);
      }
      return value;
    }
  },

  remove(key) {
    try {
      if (!this.isAvailable()) return;
      localStorage.removeItem(String(key || '').trim());
    } catch (err) {
      if (window.APP_CONFIG?.DEBUG) {
        console.warn('Storage remove gagal:', key, err.message);
      }
    }
  },

  has(key) {
    try {
      if (!this.isAvailable()) return false;
      return localStorage.getItem(String(key || '').trim()) !== null;
    } catch (err) {
      return false;
    }
  },

  clearSession() {
    const keys = window.APP_CONFIG?.STORAGE_KEYS || {};

    [
      keys.SESSION_TOKEN,
      keys.PROFILE
    ].filter(Boolean).forEach(key => this.remove(key));
  },

  clearDrafts() {
    const keys = window.APP_CONFIG?.STORAGE_KEYS || {};

    [
      keys.REGISTRASI_DRAFT,
      keys.PENDAMPINGAN_DRAFT
    ].filter(Boolean).forEach(key => this.remove(key));
  },

  clearRuntimeCache() {
    const keys = window.APP_CONFIG?.STORAGE_KEYS || {};

    [
      keys.BOOTSTRAP,
      keys.SELECTED_SASARAN,
      keys.DASHBOARD_CACHE,
      keys.EDIT_PENDAMPINGAN
    ].filter(Boolean).forEach(key => this.remove(key));
  },

  clearSyncData() {
    const keys = window.APP_CONFIG?.STORAGE_KEYS || {};

    [
      keys.SYNC_QUEUE,
      keys.LAST_SYNC_AT
    ].filter(Boolean).forEach(key => this.remove(key));
  },

  clearAppData() {
    this.clearSession();
    this.clearDrafts();
    this.clearRuntimeCache();
    this.clearSyncData();
  }
};
