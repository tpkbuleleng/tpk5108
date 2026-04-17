(function (window) {
  'use strict';

  const STORAGE_KEY = 'app_state_vnext';
  const DEFAULT_STATE = {
    session: {
      token: '',
      id_user: '',
      role: '',
      device_id: '',
      is_authenticated: false,
      session_expired_at: '',
      last_validated_at: ''
    },
    bootstrap: {
      profile: null,
      permissions: [],
      refs: null,
      wilayah: null,
      last_loaded_at: '',
      cache_expires_at: ''
    },
    sync: {
      is_syncing: false,
      pending_count: 0,
      processing_count: 0,
      success_count: 0,
      failed_count: 0,
      conflict_count: 0,
      duplicate_count: 0,
      last_sync_at: '',
      last_error: ''
    },
    ui: {
      active_screen: 'login',
      text_size: 'normal',
      dark_mode: false,
      filters: {},
      dialogs: {},
      scroll_keys: {},
      has_pending_update: false
    }
  };

  const subscribers = new Set();
  let state = loadInitialState();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeDeep(target, source) {
    const out = Array.isArray(target) ? target.slice() : { ...target };
    Object.keys(source || {}).forEach((key) => {
      const sourceValue = source[key];
      const targetValue = out[key];
      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        out[key] = mergeDeep(targetValue && typeof targetValue === 'object' ? targetValue : {}, sourceValue);
      } else {
        out[key] = sourceValue;
      }
    });
    return out;
  }

  function loadInitialState() {
    if (!window.StorageHelper) return clone(DEFAULT_STATE);
    const stored = window.StorageHelper.get(STORAGE_KEY, null);
    if (!stored || typeof stored !== 'object') return clone(DEFAULT_STATE);
    return mergeDeep(clone(DEFAULT_STATE), stored);
  }

  function persistState() {
    if (!window.StorageHelper) return false;
    const persistable = {
      session: {
        token: state.session.token,
        id_user: state.session.id_user,
        role: state.session.role,
        device_id: state.session.device_id,
        is_authenticated: state.session.is_authenticated,
        session_expired_at: state.session.session_expired_at,
        last_validated_at: state.session.last_validated_at
      },
      bootstrap: {
        profile: state.bootstrap.profile,
        permissions: state.bootstrap.permissions,
        refs: state.bootstrap.refs,
        wilayah: state.bootstrap.wilayah,
        last_loaded_at: state.bootstrap.last_loaded_at,
        cache_expires_at: state.bootstrap.cache_expires_at
      },
      sync: {
        pending_count: state.sync.pending_count,
        processing_count: state.sync.processing_count,
        success_count: state.sync.success_count,
        failed_count: state.sync.failed_count,
        conflict_count: state.sync.conflict_count,
        duplicate_count: state.sync.duplicate_count,
        last_sync_at: state.sync.last_sync_at,
        last_error: state.sync.last_error
      },
      ui: {
        active_screen: state.ui.active_screen,
        text_size: state.ui.text_size,
        dark_mode: state.ui.dark_mode,
        filters: state.ui.filters,
        dialogs: state.ui.dialogs,
        scroll_keys: state.ui.scroll_keys,
        has_pending_update: state.ui.has_pending_update
      }
    };
    return window.StorageHelper.set(STORAGE_KEY, persistable);
  }

  function notify(domainName) {
    const snapshot = clone(state);
    subscribers.forEach((listener) => {
      try {
        listener(snapshot, domainName);
      } catch (err) {
        console.warn('[AppState] Subscriber error:', err);
      }
    });
  }

  function setDomain(domainName, patch) {
    if (!state[domainName]) {
      throw new Error(`Unknown state domain: ${domainName}`);
    }
    state[domainName] = mergeDeep(state[domainName], patch || {});
    persistState();
    notify(domainName);
    return clone(state[domainName]);
  }

  function replaceDomain(domainName, value) {
    if (!state[domainName]) {
      throw new Error(`Unknown state domain: ${domainName}`);
    }
    state[domainName] = mergeDeep(clone(DEFAULT_STATE[domainName]), value || {});
    persistState();
    notify(domainName);
    return clone(state[domainName]);
  }

  const AppState = {
    getAll() {
      return clone(state);
    },

    get(domainName) {
      return domainName ? clone(state[domainName]) : clone(state);
    },

    subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new Error('AppState.subscribe requires a function');
      }
      subscribers.add(listener);
      return function unsubscribe() {
        subscribers.delete(listener);
      };
    },

    resetAll() {
      state = clone(DEFAULT_STATE);
      persistState();
      notify('all');
      return this.getAll();
    },

    clearSession() {
      state.session = clone(DEFAULT_STATE.session);
      persistState();
      notify('session');
      return this.get('session');
    },

    setSession(sessionPatch) {
      return setDomain('session', sessionPatch);
    },

    setBootstrap(bootstrapPatch) {
      return setDomain('bootstrap', bootstrapPatch);
    },

    setSync(syncPatch) {
      return setDomain('sync', syncPatch);
    },

    setUi(uiPatch) {
      return setDomain('ui', uiPatch);
    },

    replaceBootstrap(value) {
      return replaceDomain('bootstrap', value);
    },

    setActiveScreen(screenName) {
      return setDomain('ui', { active_screen: screenName || 'login' });
    },

    setFilter(screenKey, filterPatch) {
      const current = state.ui.filters || {};
      const next = {
        ...current,
        [screenKey]: {
          ...(current[screenKey] || {}),
          ...(filterPatch || {})
        }
      };
      return setDomain('ui', { filters: next });
    },

    resetFilter(screenKey) {
      const current = { ...(state.ui.filters || {}) };
      delete current[screenKey];
      return setDomain('ui', { filters: current });
    },

    setDialogState(dialogKey, dialogState) {
      const current = state.ui.dialogs || {};
      const next = { ...current, [dialogKey]: dialogState };
      return setDomain('ui', { dialogs: next });
    },

    setTextSize(value) {
      return setDomain('ui', { text_size: value || 'normal' });
    },

    setDarkMode(value) {
      return setDomain('ui', { dark_mode: !!value });
    },

    setPendingUpdate(flag) {
      return setDomain('ui', { has_pending_update: !!flag });
    },

    hydrateFromStorage() {
      state = loadInitialState();
      notify('hydrate');
      return this.getAll();
    },

    persistNow() {
      return persistState();
    }
  };

  window.AppState = AppState;
})(window);