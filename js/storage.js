(function (window) {
  'use strict';

  var DEFAULT_KEYS = {
    SESSION_TOKEN: 'tpk_session_token',
    PROFILE: 'tpk_profile',
    BOOTSTRAP: 'tpk_bootstrap',
    PERMISSIONS: 'tpk_permissions',
    DEVICE_ID: 'tpk_device_id',
    LAST_SYNC_AT: 'tpk_last_sync_at',
    SYNC_QUEUE: 'tpk_sync_queue',
    APP_STATE: 'tpk_app_state',
    UI_PREFS: 'tpk_ui_prefs',
    CACHE_VERSION: 'tpk_cache_version',
    SW_PENDING_UPDATE: 'tpk_sw_pending_update'
  };

  function getStorageKeys() {
    var cfgKeys = window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS;
    return Object.assign({}, DEFAULT_KEYS, cfgKeys || {});
  }

  function getStorage(type) {
    try {
      if (type === 'session') return window.sessionStorage;
      return window.localStorage;
    } catch (err) {
      return null;
    }
  }

  function safeParse(raw, fallbackValue) {
    if (raw === null || raw === undefined || raw === '') return fallbackValue;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallbackValue;
    }
  }

  function safeString(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj || {}, key);
  }

  var StorageHelper = {
    getStorageKeys: getStorageKeys,

    resolveKey: function (logicalName, fallbackKey) {
      var keys = getStorageKeys();
      if (hasOwn(keys, logicalName)) return keys[logicalName];
      return fallbackKey || logicalName;
    },

    isAvailable: function (type) {
      var storage = getStorage(type);
      if (!storage) return false;
      try {
        var key = '__tpk_storage_test__';
        storage.setItem(key, '1');
        storage.removeItem(key);
        return true;
      } catch (err) {
        return false;
      }
    },

    getRawByKey: function (key, fallbackValue, type) {
      var storage = getStorage(type);
      if (!storage || !key) return fallbackValue;
      try {
        var value = storage.getItem(key);
        return value === null ? fallbackValue : value;
      } catch (err) {
        return fallbackValue;
      }
    },

    setRawByKey: function (key, value, type) {
      var storage = getStorage(type);
      if (!storage || !key) return false;
      try {
        storage.setItem(key, safeString(value));
        return true;
      } catch (err) {
        console.warn('[StorageHelper] gagal menyimpan key:', key, err);
        return false;
      }
    },

    removeByKey: function (key, type) {
      var storage = getStorage(type);
      if (!storage || !key) return false;
      try {
        storage.removeItem(key);
        return true;
      } catch (err) {
        console.warn('[StorageHelper] gagal menghapus key:', key, err);
        return false;
      }
    },

    getRaw: function (logicalName, fallbackValue, type) {
      return this.getRawByKey(this.resolveKey(logicalName), fallbackValue, type);
    },

    setRaw: function (logicalName, value, type) {
      return this.setRawByKey(this.resolveKey(logicalName), value, type);
    },

    get: function (logicalName, fallbackValue, type) {
      var raw = this.getRaw(logicalName, null, type);
      return safeParse(raw, fallbackValue);
    },

    set: function (logicalName, value, type) {
      try {
        return this.setRaw(logicalName, JSON.stringify(value), type);
      } catch (err) {
        console.warn('[StorageHelper] gagal stringify key:', logicalName, err);
        return false;
      }
    },

    remove: function (logicalName, type) {
      return this.removeByKey(this.resolveKey(logicalName), type);
    },

    getSessionToken: function () {
      return safeString(this.getRaw('SESSION_TOKEN', '')).trim();
    },

    hasSessionToken: function () {
      return !!this.getSessionToken();
    },

    rememberSessionToken: function (token) {
      return this.setRaw('SESSION_TOKEN', safeString(token || '').trim());
    },

    clearSessionToken: function () {
      return this.remove('SESSION_TOKEN');
    },

    getProfile: function () {
      return this.get('PROFILE', null);
    },

    rememberProfile: function (profile) {
      return this.set('PROFILE', profile || null);
    },

    clearProfile: function () {
      return this.remove('PROFILE');
    },

    getBootstrapCache: function () {
      return this.get('BOOTSTRAP', null);
    },

    setBootstrapCache: function (payload) {
      return this.set('BOOTSTRAP', payload || null);
    },

    getPermissionsCache: function () {
      return this.get('PERMISSIONS', []);
    },

    setPermissionsCache: function (payload) {
      return this.set('PERMISSIONS', Array.isArray(payload) ? payload : []);
    },

    getDeviceId: function () {
      return safeString(this.getRaw('DEVICE_ID', '')).trim();
    },

    rememberDeviceId: function (deviceId) {
      return this.setRaw('DEVICE_ID', safeString(deviceId || '').trim());
    },

    getLastSyncAt: function () {
      return safeString(this.getRaw('LAST_SYNC_AT', '')).trim();
    },

    touchLastSyncAt: function (isoString) {
      return this.setRaw('LAST_SYNC_AT', isoString || new Date().toISOString());
    },

    getUiPrefs: function () {
      return this.get('UI_PREFS', {});
    },

    setUiPrefs: function (prefs) {
      return this.set('UI_PREFS', prefs || {});
    },

    getLegacySyncQueue: function () {
      return this.get('SYNC_QUEUE', []);
    },

    setLegacySyncQueue: function (queue) {
      return this.set('SYNC_QUEUE', Array.isArray(queue) ? queue : []);
    },

    clearSensitiveSessionData: function () {
      var removed = 0;
      ['SESSION_TOKEN', 'PROFILE', 'BOOTSTRAP', 'PERMISSIONS', 'APP_STATE'].forEach(function (logicalName) {
        if (StorageHelper.remove(logicalName)) removed += 1;
      });
      return removed;
    },

    resetLightCache: function () {
      var removed = 0;
      ['BOOTSTRAP', 'PERMISSIONS', 'APP_STATE', 'SW_PENDING_UPDATE'].forEach(function (logicalName) {
        if (StorageHelper.remove(logicalName)) removed += 1;
      });
      return removed;
    },

    clearAllAppData: function (options) {
      var keepDeviceId = !options || options.keepDeviceId !== false;
      var keepUiPrefs = !options || options.keepUiPrefs !== false;
      var keys = getStorageKeys();
      var storage = getStorage();
      if (!storage) return 0;
      var targets = Object.keys(keys).map(function (k) { return keys[k]; });
      if (keepDeviceId) targets = targets.filter(function (k) { return k !== keys.DEVICE_ID; });
      if (keepUiPrefs) targets = targets.filter(function (k) { return k !== keys.UI_PREFS; });
      var removed = 0;
      targets.forEach(function (key) {
        if (StorageHelper.removeByKey(key)) removed += 1;
      });
      return removed;
    }
  };

  function getSessionToken() {
    return StorageHelper.getSessionToken();
  }

  function hasSessionToken() {
    return StorageHelper.hasSessionToken();
  }

  function getProfileFromStorage() {
    return StorageHelper.getProfile();
  }

  function saveProfileToStorage(profile) {
    return StorageHelper.rememberProfile(profile);
  }

  function clearSensitiveSessionData() {
    return StorageHelper.clearSensitiveSessionData();
  }

  window.StorageHelper = StorageHelper;
  window.getStorageKeys = getStorageKeys;
  window.getSessionToken = getSessionToken;
  window.hasSessionToken = hasSessionToken;
  window.getProfileFromStorage = getProfileFromStorage;
  window.saveProfileToStorage = saveProfileToStorage;
  window.clearSensitiveSessionData = clearSensitiveSessionData;
})(window);
