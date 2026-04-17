(function (window) {
  'use strict';

  const DEFAULT_NAMESPACE = 'tpk';
  const DEFAULT_STORAGE_TYPE = 'localStorage';

  function resolveNamespace() {
    return (window.APP_CONFIG && window.APP_CONFIG.APP_NAME)
      ? String(window.APP_CONFIG.APP_NAME).toLowerCase().replace(/\s+/g, '_')
      : DEFAULT_NAMESPACE;
  }

  function resolveStorage(type) {
    try {
      const storageName = type || DEFAULT_STORAGE_TYPE;
      return window[storageName] || window.localStorage;
    } catch (err) {
      return null;
    }
  }

  function isQuotaError(err) {
    if (!err) return false;
    const names = ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'];
    return names.includes(err.name) || err.code === 22 || err.code === 1014;
  }

  const StorageHelper = {
    prefix(key, namespace) {
      const ns = namespace || resolveNamespace();
      return `${ns}:${key}`;
    },

    isAvailable(type) {
      const storage = resolveStorage(type);
      if (!storage) return false;
      const testKey = '__tpk_storage_test__';
      try {
        storage.setItem(testKey, '1');
        storage.removeItem(testKey);
        return true;
      } catch (err) {
        return false;
      }
    },

    getRaw(key, fallbackValue, options) {
      const storage = resolveStorage(options && options.type);
      if (!storage) return fallbackValue;
      const storageKey = (options && options.rawKey) ? key : this.prefix(key, options && options.namespace);
      try {
        const value = storage.getItem(storageKey);
        return value === null ? fallbackValue : value;
      } catch (err) {
        return fallbackValue;
      }
    },

    setRaw(key, value, options) {
      const storage = resolveStorage(options && options.type);
      if (!storage) return false;
      const storageKey = (options && options.rawKey) ? key : this.prefix(key, options && options.namespace);
      try {
        storage.setItem(storageKey, String(value));
        return true;
      } catch (err) {
        if (isQuotaError(err)) {
          console.warn('[StorageHelper] Quota exceeded while saving raw key:', storageKey);
        } else {
          console.warn('[StorageHelper] Failed to save raw key:', storageKey, err);
        }
        return false;
      }
    },

    get(key, fallbackValue, options) {
      const raw = this.getRaw(key, null, options);
      if (raw === null || raw === undefined || raw === '') {
        return fallbackValue;
      }
      try {
        return JSON.parse(raw);
      } catch (err) {
        return fallbackValue;
      }
    },

    set(key, value, options) {
      try {
        return this.setRaw(key, JSON.stringify(value), options);
      } catch (err) {
        console.warn('[StorageHelper] Failed to stringify value for key:', key, err);
        return false;
      }
    },

    remove(key, options) {
      const storage = resolveStorage(options && options.type);
      if (!storage) return false;
      const storageKey = (options && options.rawKey) ? key : this.prefix(key, options && options.namespace);
      try {
        storage.removeItem(storageKey);
        return true;
      } catch (err) {
        console.warn('[StorageHelper] Failed to remove key:', storageKey, err);
        return false;
      }
    },

    clearNamespace(namespace, options) {
      const storage = resolveStorage(options && options.type);
      if (!storage) return 0;
      const ns = `${namespace || resolveNamespace()}:`;
      const keysToDelete = [];
      try {
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i);
          if (key && key.indexOf(ns) === 0) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach((key) => storage.removeItem(key));
        return keysToDelete.length;
      } catch (err) {
        console.warn('[StorageHelper] Failed to clear namespace:', ns, err);
        return 0;
      }
    },

    getAllByNamespace(namespace, options) {
      const storage = resolveStorage(options && options.type);
      if (!storage) return {};
      const ns = `${namespace || resolveNamespace()}:`;
      const out = {};
      try {
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i);
          if (key && key.indexOf(ns) === 0) {
            const shortKey = key.slice(ns.length);
            out[shortKey] = this.get(shortKey, null, { ...options, namespace });
          }
        }
      } catch (err) {
        console.warn('[StorageHelper] Failed to read namespace:', ns, err);
      }
      return out;
    },

    rememberSessionToken(token) {
      const keys = window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS;
      const key = (keys && keys.SESSION_TOKEN) || 'session_token';
      return this.setRaw(key, token || '');
    },

    getSessionToken() {
      const keys = window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS;
      const key = (keys && keys.SESSION_TOKEN) || 'session_token';
      return this.getRaw(key, '');
    },

    clearSessionToken() {
      const keys = window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS;
      const key = (keys && keys.SESSION_TOKEN) || 'session_token';
      return this.remove(key);
    },

    rememberDeviceId(deviceId) {
      const keys = window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS;
      const key = (keys && keys.DEVICE_ID) || 'device_id';
      return this.setRaw(key, deviceId || '');
    },

    getDeviceId() {
      const keys = window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS;
      const key = (keys && keys.DEVICE_ID) || 'device_id';
      return this.getRaw(key, '');
    },

    rememberProfile(profile) {
      const keys = window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS;
      const key = (keys && keys.PROFILE) || 'profile';
      return this.set(key, profile || null);
    },

    getProfile() {
      const keys = window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS;
      const key = (keys && keys.PROFILE) || 'profile';
      return this.get(key, null);
    },

    clearSensitiveSessionData() {
      const keys = (window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS) || {};
      const targets = [
        keys.SESSION_TOKEN || 'session_token',
        keys.PROFILE || 'profile',
        keys.BOOTSTRAP || 'bootstrap',
        keys.PERMISSIONS || 'permissions'
      ];
      let removed = 0;
      targets.forEach((key) => {
        if (this.remove(key)) removed += 1;
      });
      return removed;
    }
  };

  window.StorageHelper = StorageHelper;
})(window);