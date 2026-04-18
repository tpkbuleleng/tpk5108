(function (window) {
  'use strict';

  function clone(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;

    try {
      if (typeof structuredClone === 'function') {
        return structuredClone(value);
      }
    } catch (err) {}

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return value;
    }
  }

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function getStorage() {
    return window.Storage || null;
  }

  function safeGetFromStorage(key, fallbackValue) {
    var storage = getStorage();
    if (!storage || typeof storage.get !== 'function' || !key) {
      return clone(fallbackValue);
    }
    return storage.get(key, clone(fallbackValue));
  }

  function safeSetToStorage(key, value) {
    var storage = getStorage();
    if (!storage || typeof storage.set !== 'function' || !key) return;
    storage.set(key, value);
  }

  function safeRemoveFromStorage(key) {
    var storage = getStorage();
    if (!storage || typeof storage.remove !== 'function' || !key) return;
    storage.remove(key);
  }

  function createInitialState() {
    var keys = getStorageKeys();

    return {
      profile: safeGetFromStorage(keys.PROFILE, {}),
      currentRoute: '',
      currentScreenId: '',
      bootstrap: safeGetFromStorage(keys.APP_BOOTSTRAP, {}),
      selectedSasaran: safeGetFromStorage(keys.SELECTED_SASARAN, {}),
      sasaranList: [],
      sasaranDetail: {},
      dashboardSummary: {},
      rekapData: {},
      permissions: {},
      network: {
        online: typeof navigator !== 'undefined' ? !!navigator.onLine : true,
        label: typeof navigator !== 'undefined' && navigator.onLine ? 'Online' : 'Offline'
      },
      sync: {
        queue: safeGetFromStorage(keys.SYNC_QUEUE, []),
        lastSyncAt: safeGetFromStorage(keys.LAST_SYNC_AT, ''),
        isSyncing: false
      },
      forms: {
        registrasiMode: 'create',
        pendampinganMode: 'create'
      }
    };
  }

  var state = createInitialState();
  var subscribers = [];
  var nextSubscriberId = 1;

  function notify(change) {
    subscribers.forEach(function (entry) {
      try {
        entry.handler({
          change: clone(change || {}),
          state: clone(state)
        });
      } catch (err) {
        try {
          console.warn('AppState subscriber error:', err);
        } catch (e) {}
      }
    });
  }

  function update(key, value, options) {
    state[key] = clone(value);
    notify({
      type: 'update',
      key: key,
      value: clone(value),
      options: clone(options || {})
    });
    return clone(state[key]);
  }

  function mergeObject(key, patch, options) {
    var current = state[key] && typeof state[key] === 'object' ? state[key] : {};
    var nextValue = Object.assign({}, current, patch || {});
    return update(key, nextValue, options);
  }

  var AppState = {
    init: function () {
      state = createInitialState();
      notify({ type: 'init' });
      return this.getState();
    },

    reset: function () {
      state = createInitialState();
      notify({ type: 'reset' });
      return this.getState();
    },

    getState: function () {
      return clone(state);
    },

    subscribe: function (handler) {
      if (typeof handler !== 'function') {
        return function () {};
      }

      var id = nextSubscriberId++;
      subscribers.push({ id: id, handler: handler });

      return function unsubscribe() {
        subscribers = subscribers.filter(function (entry) {
          return entry.id !== id;
        });
      };
    },

    setProfile: function (profile) {
      var keys = getStorageKeys();
      var value = profile && typeof profile === 'object' ? profile : {};
      update('profile', value, { persist: true });
      safeSetToStorage(keys.PROFILE, value);
      return clone(value);
    },

    getProfile: function () {
      return clone(state.profile || {});
    },

    clearProfile: function () {
      var keys = getStorageKeys();
      update('profile', {}, { persist: true, cleared: true });
      safeRemoveFromStorage(keys.PROFILE);
      return {};
    },

    setPermissions: function (permissions) {
      return update('permissions', permissions && typeof permissions === 'object' ? permissions : {});
    },

    getPermissions: function () {
      return clone(state.permissions || {});
    },

    setCurrentRoute: function (routeName) {
      return update('currentRoute', String(routeName || ''));
    },

    getCurrentRoute: function () {
      return String(state.currentRoute || '');
    },

    setCurrentScreenId: function (screenId) {
      return update('currentScreenId', String(screenId || ''));
    },

    getCurrentScreenId: function () {
      return String(state.currentScreenId || '');
    },

    setBootstrap: function (bootstrapData) {
      var keys = getStorageKeys();
      var value = bootstrapData && typeof bootstrapData === 'object' ? bootstrapData : {};
      update('bootstrap', value, { persist: true });
      safeSetToStorage(keys.APP_BOOTSTRAP, value);
      return clone(value);
    },

    getBootstrap: function () {
      return clone(state.bootstrap || {});
    },

    clearBootstrap: function () {
      var keys = getStorageKeys();
      update('bootstrap', {}, { persist: true, cleared: true });
      safeRemoveFromStorage(keys.APP_BOOTSTRAP);
      return {};
    },

    setSelectedSasaran: function (sasaran) {
      var keys = getStorageKeys();
      var value = sasaran && typeof sasaran === 'object' ? sasaran : {};
      update('selectedSasaran', value, { persist: true });
      safeSetToStorage(keys.SELECTED_SASARAN, value);
      return clone(value);
    },

    getSelectedSasaran: function () {
      return clone(state.selectedSasaran || {});
    },

    clearSelectedSasaran: function () {
      var keys = getStorageKeys();
      update('selectedSasaran', {}, { persist: true, cleared: true });
      safeRemoveFromStorage(keys.SELECTED_SASARAN);
      return {};
    },

    setSasaranList: function (items) {
      return update('sasaranList', Array.isArray(items) ? items : []);
    },

    getSasaranList: function () {
      return clone(state.sasaranList || []);
    },

    setSasaranDetail: function (detail) {
      return update('sasaranDetail', detail && typeof detail === 'object' ? detail : {});
    },

    getSasaranDetail: function () {
      return clone(state.sasaranDetail || {});
    },

    setDashboardSummary: function (summary) {
      return update('dashboardSummary', summary && typeof summary === 'object' ? summary : {});
    },

    getDashboardSummary: function () {
      return clone(state.dashboardSummary || {});
    },

    setRekapData: function (rekapData) {
      return update('rekapData', rekapData && typeof rekapData === 'object' ? rekapData : {});
    },

    getRekapData: function () {
      return clone(state.rekapData || {});
    },

    setNetworkStatus: function (isOnline, label) {
      var online = !!isOnline;
      return update('network', {
        online: online,
        label: label || (online ? 'Online' : 'Offline')
      });
    },

    getNetworkStatus: function () {
      return clone(state.network || { online: true, label: 'Online' });
    },

    setSyncQueue: function (queue) {
      var keys = getStorageKeys();
      var value = Array.isArray(queue) ? queue : [];
      mergeObject('sync', { queue: value }, { persist: true });
      safeSetToStorage(keys.SYNC_QUEUE, value);
      return clone(value);
    },

    getSyncQueue: function () {
      return clone((state.sync && state.sync.queue) || []);
    },

    setLastSyncAt: function (timestamp) {
      var keys = getStorageKeys();
      var value = String(timestamp || '');
      mergeObject('sync', { lastSyncAt: value }, { persist: true });
      safeSetToStorage(keys.LAST_SYNC_AT, value);
      return value;
    },

    getLastSyncAt: function () {
      return String((state.sync && state.sync.lastSyncAt) || '');
    },

    setSyncing: function (isSyncing) {
      mergeObject('sync', { isSyncing: !!isSyncing });
      return !!isSyncing;
    },

    isSyncing: function () {
      return !!(state.sync && state.sync.isSyncing);
    },

    setRegistrasiMode: function (mode) {
      var nextMode = String(mode || 'create').toLowerCase();
      mergeObject('forms', { registrasiMode: nextMode });
      return nextMode;
    },

    getRegistrasiMode: function () {
      return String((state.forms && state.forms.registrasiMode) || 'create');
    },

    setPendampinganMode: function (mode) {
      var nextMode = String(mode || 'create').toLowerCase();
      mergeObject('forms', { pendampinganMode: nextMode });
      return nextMode;
    },

    getPendampinganMode: function () {
      return String((state.forms && state.forms.pendampinganMode) || 'create');
    }
  };

  window.AppState = AppState;
})(window);
