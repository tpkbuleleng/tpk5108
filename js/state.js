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

  function isMirrorGuardActive() {
    return window.__tpkStage1bSyncMirrorGuard === true;
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

  function mirrorQueueToRepo(queue) {
    var storage = getStorage();
    if (isMirrorGuardActive()) return;
    if (!storage || typeof storage.importLegacySyncQueue !== 'function') return;

    window.setTimeout(function () {
      storage.importLegacySyncQueue(Array.isArray(queue) ? queue : []).catch(function () {});
    }, 0);
  }

  function normalizeSyncStatus(item) {
    var raw = item && typeof item === 'object' ? (item.status || item.sync_status) : '';
    return String(raw || 'PENDING').trim().toUpperCase();
  }

  function countLocalQueue(queue) {
    var safeQueue = Array.isArray(queue) ? queue : [];
    var summary = {
      total: safeQueue.length,
      pending: 0,
      processing: 0,
      success: 0,
      failed: 0,
      conflict: 0,
      duplicate: 0
    };

    safeQueue.forEach(function (item) {
      var status = normalizeSyncStatus(item);
      if (status === 'PROCESSING') summary.processing += 1;
      else if (status === 'SUCCESS') summary.success += 1;
      else if (status === 'FAILED') summary.failed += 1;
      else if (status === 'CONFLICT') summary.conflict += 1;
      else if (status === 'DUPLICATE') summary.duplicate += 1;
      else summary.pending += 1;
    });

    return summary;
  }

  function createInitialState() {
    var keys = getStorageKeys();

    return {
      profile: safeGetFromStorage(keys.PROFILE, safeGetFromStorage('tpk_last_good_profile', {})),
      sessionStatus: safeGetFromStorage('tpk_session_status', {}),
      currentRoute: '',
      currentScreenId: '',
      bootstrap: safeGetFromStorage(keys.APP_BOOTSTRAP, {}),
      selectedSasaran: safeGetFromStorage(keys.SELECTED_SASARAN, {}),
      sasaranList: [],
      sasaranDetail: {},
      dashboardSummary: {},
      rekapData: {},
      harganas: {
        draft: safeGetFromStorage(keys.HARGANAS_DRAFT || 'tpk_harganas_2026_draft_v1', {}),
        status: safeGetFromStorage(keys.HARGANAS_STATUS || 'tpk_harganas_2026_status_v1', {})
      },
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
  var isNotifying = false;
  var pendingNotifyChanges = [];
  var STATE_RUNTIME_GUARD_VERSION = '5E-R4D-A8-R2-R1-STATE-NOTIFY-REENTRANCY-GUARD-20260510';

  function notify(change) {
    if (isNotifying) {
      pendingNotifyChanges.push(clone(change || {}));
      if (pendingNotifyChanges.length > 25) {
        pendingNotifyChanges = pendingNotifyChanges.slice(-25);
      }
      return;
    }

    isNotifying = true;
    try {
      var queue = [clone(change || {})];
      var loops = 0;

      while (queue.length && loops < 25) {
        var currentChange = queue.shift();
        loops += 1;

        subscribers.forEach(function (entry) {
          try {
            entry.handler({
              change: clone(currentChange || {}),
              state: clone(state),
              guard_version: STATE_RUNTIME_GUARD_VERSION
            });
          } catch (err) {
            try {
              console.warn('AppState subscriber error:', err);
            } catch (e) {}
          }
        });

        if (pendingNotifyChanges.length) {
          queue = queue.concat(pendingNotifyChanges.splice(0, pendingNotifyChanges.length));
        }
      }

      if (queue.length || pendingNotifyChanges.length) {
        try {
          console.warn('AppState notify guard menghentikan update berulang untuk mencegah recursive loop.');
        } catch (ignore) {}
        pendingNotifyChanges = [];
      }
    } finally {
      isNotifying = false;
    }
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

    mergeProfile: function (patch) {
      var current = state.profile && typeof state.profile === 'object' ? state.profile : {};
      var incoming = patch && typeof patch === 'object' ? patch : {};
      var merged = Object.assign({}, current);
      Object.keys(incoming).forEach(function (key) {
        var value = incoming[key];
        if (value === undefined || value === null) return;
        if (typeof value === 'string' && !value.trim()) return;
        merged[key] = value;
      });
      return this.setProfile(merged);
    },

    setProfile: function (profile) {
      var keys = getStorageKeys();
      var incoming = profile && typeof profile === 'object' ? profile : {};
      var current = state.profile && typeof state.profile === 'object' ? state.profile : {};
      var value = Object.keys(incoming).length ? incoming : current;
      update('profile', value, { persist: true });
      safeSetToStorage(keys.PROFILE, value);
      if (Object.keys(value).length) safeSetToStorage('tpk_last_good_profile', value);
      return clone(value);
    },

    getProfile: function () {
      return clone(state.profile || {});
    },

    clearProfile: function () {
      var keys = getStorageKeys();
      update('profile', {}, { persist: true, cleared: true });
      safeRemoveFromStorage(keys.PROFILE);
      safeRemoveFromStorage('tpk_last_good_profile');
      return {};
    },

    setSessionStatus: function (status) {
      var value = status && typeof status === 'object' ? status : {};
      update('sessionStatus', value, { persist: true });
      safeSetToStorage('tpk_session_status', value);
      return clone(value);
    },

    getSessionStatus: function () {
      return clone(state.sessionStatus || {});
    },

    clearSessionStatus: function () {
      update('sessionStatus', {}, { persist: true, cleared: true });
      safeRemoveFromStorage('tpk_session_status');
      return {};
    },

    setPermissions: function (permissions) {
      return update('permissions', permissions && typeof permissions === 'object' ? permissions : {});
    },

    getPermissions: function () {
      return clone(state.permissions || {});
    },

    setCurrentRoute: function (routeName) {
      var route = String(routeName || '');
      safeSetToStorage('tpk_last_route', route);
      return update('currentRoute', route);
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
      mirrorQueueToRepo(value);
      return clone(value);
    },

    getSyncQueue: function () {
      return clone((state.sync && state.sync.queue) || []);
    },

    refreshSyncFromQueueRepo: async function () {
      if (!window.QueueRepo || typeof window.QueueRepo.syncLegacyMirror !== 'function') {
        return this.getSyncQueue();
      }
      return window.QueueRepo.syncLegacyMirror();
    },

    getSyncSummary: async function () {
      if (!window.QueueRepo || typeof window.QueueRepo.stats !== 'function') {
        return countLocalQueue(this.getSyncQueue());
      }
      return window.QueueRepo.stats();
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


    setHarganasDraft: function (draft) {
      var keys = getStorageKeys();
      var value = draft && typeof draft === 'object' ? draft : {};
      mergeObject('harganas', { draft: value }, { persist: true });
      safeSetToStorage(keys.HARGANAS_DRAFT || 'tpk_harganas_2026_draft_v1', value);
      return clone(value);
    },

    getHarganasDraft: function () {
      return clone((state.harganas && state.harganas.draft) || {});
    },

    clearHarganasDraft: function () {
      var keys = getStorageKeys();
      mergeObject('harganas', { draft: {} }, { persist: true, cleared: true });
      safeRemoveFromStorage(keys.HARGANAS_DRAFT || 'tpk_harganas_2026_draft_v1');
      return {};
    },

    setHarganasStatus: function (status) {
      var keys = getStorageKeys();
      var value = status && typeof status === 'object' ? status : {};
      mergeObject('harganas', { status: value }, { persist: true });
      safeSetToStorage(keys.HARGANAS_STATUS || 'tpk_harganas_2026_status_v1', value);
      return clone(value);
    },

    getHarganasStatus: function () {
      return clone((state.harganas && state.harganas.status) || {});
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
    },

    getRuntimeGuardVersion: function () {
      return STATE_RUNTIME_GUARD_VERSION;
    }
  };

  window.AppState = AppState;
})(window);
