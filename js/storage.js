(function (window) {
  'use strict';

  var BOOTSTRAP_LITE_KEY = 'tpk_bootstrap_lite';

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function isDebugEnabled() {
    return !!getConfig().DEBUG;
  }

  function debugWarn() {
    if (!isDebugEnabled()) return;
    try {
      console.warn.apply(console, arguments);
    } catch (err) {}
  }

  function normalizeKey(key) {
    return String(key || '').trim();
  }

  function safeParse(raw, fallback) {
    if (raw === null || raw === undefined || raw === '') {
      return fallback;
    }

    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function safeStringify(value) {
    return JSON.stringify(value);
  }

  function getBootstrapLiteKey() {
    return BOOTSTRAP_LITE_KEY;
  }

  const Storage = {
    isAvailable() {
      try {
        const testKey = '__tpk_storage_test__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        return true;
      } catch (err) {
        return false;
      }
    },

    get(key, fallback) {
      const normalizedKey = normalizeKey(key);
      const defaultValue = arguments.length >= 2 ? fallback : null;

      try {
        if (!normalizedKey || !this.isAvailable()) {
          return defaultValue;
        }

        const raw = window.localStorage.getItem(normalizedKey);
        return safeParse(raw, defaultValue);
      } catch (err) {
        debugWarn('Storage.get gagal:', normalizedKey, err && err.message ? err.message : err);
        return defaultValue;
      }
    },

    set(key, value) {
      const normalizedKey = normalizeKey(key);

      try {
        if (!normalizedKey || !this.isAvailable()) {
          return value;
        }

        window.localStorage.setItem(normalizedKey, safeStringify(value));
        return value;
      } catch (err) {
        debugWarn('Storage.set gagal:', normalizedKey, err && err.message ? err.message : err);
        return value;
      }
    },

    remove(key) {
      const normalizedKey = normalizeKey(key);

      try {
        if (!normalizedKey || !this.isAvailable()) {
          return;
        }

        window.localStorage.removeItem(normalizedKey);
      } catch (err) {
        debugWarn('Storage.remove gagal:', normalizedKey, err && err.message ? err.message : err);
      }
    },

    has(key) {
      const normalizedKey = normalizeKey(key);

      try {
        if (!normalizedKey || !this.isAvailable()) {
          return false;
        }

        return window.localStorage.getItem(normalizedKey) !== null;
      } catch (err) {
        return false;
      }
    },

    getProfile(fallback) {
      const keys = getStorageKeys();
      return this.get(keys.PROFILE || 'tpk_profile', fallback || {});
    },

    setProfile(value) {
      const keys = getStorageKeys();
      return this.set(keys.PROFILE || 'tpk_profile', value || {});
    },

    getBootstrapLite(fallback) {
      return this.get(getBootstrapLiteKey(), fallback || {});
    },

    setBootstrapLite(value) {
      return this.set(getBootstrapLiteKey(), value || {});
    },

    removeBootstrapLite() {
      this.remove(getBootstrapLiteKey());
    },

    clearSession() {
      const keys = getStorageKeys();

      [
        keys.SESSION_TOKEN,
        keys.PROFILE,
        getBootstrapLiteKey()
      ].filter(Boolean).forEach((key) => this.remove(key));
    },

    clearDrafts() {
      const keys = getStorageKeys();

      [
        keys.SYNC_QUEUE,
        keys.REGISTRASI_DRAFT,
        keys.PENDAMPINGAN_DRAFT,
        'tpk_registrasi_draft',
        'tpk_pendampingan_draft'
      ].filter(Boolean).forEach((key) => this.remove(key));
    },

    clearRuntimeCache() {
      const keys = getStorageKeys();

      [
        keys.APP_BOOTSTRAP,
        keys.SELECTED_SASARAN,
        keys.SASARAN_CACHE,
        keys.BOOTSTRAP,
        keys.DASHBOARD_CACHE,
        keys.EDIT_PENDAMPINGAN,
        getBootstrapLiteKey(),
        'tpk_dashboard_cache',
        'tpk_edit_pendampingan'
      ].filter(Boolean).forEach((key) => this.remove(key));
    },

    clearSyncData() {
      const keys = getStorageKeys();

      [
        keys.SYNC_QUEUE,
        keys.LAST_SYNC_AT
      ].filter(Boolean).forEach((key) => this.remove(key));
    },

    clearAppData() {
      this.clearSession();
      this.clearDrafts();
      this.clearRuntimeCache();
      this.clearSyncData();
    },

    getBootstrapLiteKey() {
      return getBootstrapLiteKey();
    }
  };

  window.Storage = Storage;
  window.StorageHelper = Storage;
})(window);
