(function (window) {
  'use strict';

  var STATE_KEY = 'APP_STATE';
  var subscribers = [];

  var DEFAULT_STATE = {
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
      active_screen: 'login-screen',
      text_size: 'normal',
      dark_mode: false,
      filters: {},
      dialogs: {},
      scroll_keys: {},
      has_pending_update: false
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeDeep(target, source) {
    var out = Array.isArray(target) ? target.slice() : Object.assign({}, target || {});
    Object.keys(source || {}).forEach(function (key) {
      var sv = source[key];
      var tv = out[key];
      if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
        out[key] = mergeDeep(tv && typeof tv === 'object' ? tv : {}, sv);
      } else {
        out[key] = sv;
      }
    });
    return out;
  }

  function buildInitialState() {
    var stored = window.StorageHelper ? window.StorageHelper.get(STATE_KEY, null) : null;
    var base = mergeDeep(clone(DEFAULT_STATE), stored && typeof stored === 'object' ? stored : {});

    if (window.StorageHelper) {
      var token = window.StorageHelper.getSessionToken();
      var deviceId = window.StorageHelper.getDeviceId();
      var profile = window.StorageHelper.getProfile();
      var bootstrap = window.StorageHelper.getBootstrapCache();
      var uiPrefs = window.StorageHelper.getUiPrefs();

      if (token) {
        base.session.token = token;
        base.session.is_authenticated = true;
      }
      if (deviceId) {
        base.session.device_id = deviceId;
      }
      if (profile) {
        base.bootstrap.profile = profile;
        base.session.id_user = base.session.id_user || profile.id_user || profile.username || '';
        base.session.role = base.session.role || profile.role_akses || profile.role || '';
      }
      if (bootstrap && typeof bootstrap === 'object') {
        base.bootstrap = mergeDeep(base.bootstrap, bootstrap);
      }
      if (uiPrefs && typeof uiPrefs === 'object') {
        base.ui = mergeDeep(base.ui, uiPrefs);
      }
    }

    return base;
  }

  var state = buildInitialState();

  function persistState() {
    if (!window.StorageHelper) return false;

    var persistable = {
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

    window.StorageHelper.set(STATE_KEY, persistable);
    window.StorageHelper.rememberSessionToken(state.session.token || '');
    window.StorageHelper.rememberDeviceId(state.session.device_id || '');
    window.StorageHelper.rememberProfile(state.bootstrap.profile || null);
    window.StorageHelper.setBootstrapCache({
      profile: state.bootstrap.profile,
      permissions: state.bootstrap.permissions,
      refs: state.bootstrap.refs,
      wilayah: state.bootstrap.wilayah,
      last_loaded_at: state.bootstrap.last_loaded_at,
      cache_expires_at: state.bootstrap.cache_expires_at
    });
    window.StorageHelper.setUiPrefs({
      text_size: state.ui.text_size,
      dark_mode: state.ui.dark_mode,
      active_screen: state.ui.active_screen,
      filters: state.ui.filters,
      dialogs: state.ui.dialogs,
      scroll_keys: state.ui.scroll_keys,
      has_pending_update: state.ui.has_pending_update
    });
    return true;
  }

  function notify(domain) {
    var snapshot = clone(state);
    subscribers.slice().forEach(function (cb) {
      try {
        cb(snapshot, domain);
      } catch (err) {
        console.warn('[AppState] subscriber error:', err);
      }
    });
    window.dispatchEvent(new CustomEvent('tpk:state-changed', { detail: { domain: domain, state: snapshot } }));
  }

  function patchDomain(domain, patch) {
    if (!domain || !state[domain]) return clone(state);
    state[domain] = mergeDeep(state[domain], patch || {});
    persistState();
    notify(domain);
    return clone(state);
  }

  var AppState = {
    get: function () {
      return clone(state);
    },

    getDomain: function (domain) {
      return clone(state[domain] || {});
    },

    setSession: function (patch) {
      return patchDomain('session', patch);
    },

    setBootstrap: function (patch) {
      return patchDomain('bootstrap', patch);
    },

    setSync: function (patch) {
      return patchDomain('sync', patch);
    },

    setUi: function (patch) {
      return patchDomain('ui', patch);
    },

    rememberAuth: function (sessionToken, profile, extra) {
      var mergedProfile = profile || state.bootstrap.profile || null;
      this.setSession({
        token: sessionToken || '',
        id_user: (mergedProfile && (mergedProfile.id_user || mergedProfile.username)) || '',
        role: (mergedProfile && (mergedProfile.role_akses || mergedProfile.role)) || '',
        is_authenticated: !!sessionToken,
        device_id: (window.StorageHelper && window.StorageHelper.getDeviceId()) || state.session.device_id || ''
      });
      this.setBootstrap(Object.assign({
        profile: mergedProfile,
        last_loaded_at: new Date().toISOString()
      }, extra || {}));
      return this.get();
    },

    clearSession: function () {
      state.session = clone(DEFAULT_STATE.session);
      state.bootstrap.profile = null;
      state.bootstrap.permissions = [];
      state.bootstrap.refs = null;
      state.bootstrap.wilayah = null;
      persistState();
      notify('session');
      return this.get();
    },

    reset: function (options) {
      var keepUi = !options || options.keepUi !== false;
      var nextState = clone(DEFAULT_STATE);
      if (keepUi) {
        nextState.ui = mergeDeep(nextState.ui, state.ui);
      }
      state = nextState;
      persistState();
      notify('reset');
      return this.get();
    },

    subscribe: function (callback) {
      if (typeof callback !== 'function') return function () {};
      subscribers.push(callback);
      return function unsubscribe() {
        subscribers = subscribers.filter(function (fn) { return fn !== callback; });
      };
    }
  };

  window.AppState = AppState;
  persistState();
})(window);
