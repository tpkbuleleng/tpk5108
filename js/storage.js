(function (window) {
  'use strict';

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

    clearSession() {
      const keys = getStorageKeys();

      [
        keys.SESSION_TOKEN,
        keys.PROFILE
      ].filter(Boolean).forEach((key) => this.remove(key));
    },

    clearDrafts() {
      const keys = getStorageKeys();

      [
        // skema baru
        keys.SYNC_QUEUE,

        // fallback key lama bila masih sempat tertinggal
        keys.REGISTRASI_DRAFT,
        keys.PENDAMPINGAN_DRAFT,

        // fallback literal tambahan
        'tpk_registrasi_draft',
        'tpk_pendampingan_draft'
      ].filter(Boolean).forEach((key) => this.remove(key));
    },

    clearRuntimeCache() {
      const keys = getStorageKeys();

      [
        // skema baru
        keys.APP_BOOTSTRAP,
        keys.SELECTED_SASARAN,
        keys.SASARAN_CACHE,

        // fallback skema lama
        keys.BOOTSTRAP,
        keys.DASHBOARD_CACHE,
        keys.EDIT_PENDAMPINGAN,

        // fallback literal tambahan
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
    }
  };

  window.Storage = Storage;

  // Alias sementara agar file lama yang belum selesai dimigrasikan tidak langsung patah
  window.StorageHelper = Storage;
})(window);
