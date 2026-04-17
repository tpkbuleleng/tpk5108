(function (window, document) {
  'use strict';

  var initialized = false;

  function notify(message, type) {
    if (window.Notifier && typeof window.Notifier.show === 'function') {
      window.Notifier.show(message, type || 'info');
      return;
    }
    if (typeof window.showToast === 'function') {
      window.showToast(message, type || 'info');
      return;
    }
    console.log('[APP]', type || 'info', message);
  }

  function hasToken() {
    if (window.StorageHelper && typeof window.StorageHelper.hasSessionToken === 'function') {
      return window.StorageHelper.hasSessionToken();
    }
    try {
      return !!(window.localStorage.getItem('SESSION_TOKEN') || window.localStorage.getItem('tpk_session_token'));
    } catch (err) {
      return false;
    }
  }

  function getProfile() {
    if (window.StorageHelper && typeof window.StorageHelper.getProfile === 'function') {
      return window.StorageHelper.getProfile();
    }
    try {
      var raw = window.localStorage.getItem('USER_PROFILE') || window.localStorage.getItem('tpk_profile');
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function safeCall(fn, fallbackValue) {
    try {
      var result = fn();
      return result === undefined ? fallbackValue : result;
    } catch (err) {
      console.warn('[App] safeCall gagal:', err);
      return fallbackValue;
    }
  }

  function updateConnectionBadge(isOnline) {
    var badge = document.getElementById('network-status') || document.getElementById('online-status');
    if (!badge) return;
    badge.textContent = isOnline ? 'Online' : 'Offline';
    badge.classList.remove('online', 'offline', 'is-online', 'is-offline');
    badge.classList.add(isOnline ? 'online' : 'offline');
    badge.classList.add(isOnline ? 'is-online' : 'is-offline');
  }

  function bindSyncButtons() {
    var ids = ['btn-sync-now', 'btn-sync-header', 'btn-open-sync', 'btn-manual-sync'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el.__tpkSyncBound) return;
      el.__tpkSyncBound = true;
      el.addEventListener('click', function (event) {
        event.preventDefault();
        if (!window.SyncManager) {
          notify('SyncManager belum siap.', 'warn');
          return;
        }
        window.SyncManager.syncAll().catch(function (err) {
          notify((err && err.message) || 'Sinkronisasi gagal dijalankan.', 'error');
        });
      });
    });
  }

  function bindUpdateButton() {
    var ids = ['btn-update-app', 'btn-refresh-app', 'btn-perbarui-aplikasi'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el.__tpkUpdateBound) return;
      el.__tpkUpdateBound = true;
      el.addEventListener('click', function (event) {
        event.preventDefault();
        if (window.StorageHelper && typeof window.StorageHelper.resetLightCache === 'function') {
          window.StorageHelper.resetLightCache();
        }
        if (window.AppState && typeof window.AppState.setUi === 'function') {
          window.AppState.setUi({ has_pending_update: false });
        }
        window.location.reload();
      });
    });
  }

  async function initPersistentStorage() {
    if (window.TpkDb && typeof window.TpkDb.requestPersistentStorage === 'function') {
      try {
        await window.TpkDb.requestPersistentStorage();
      } catch (err) {
        console.warn('[App] requestPersistentStorage gagal:', err);
      }
    }
  }

  async function initBootstrap() {
    if (window.AppBootstrap && typeof window.AppBootstrap.init === 'function') {
      try {
        await window.AppBootstrap.init();
      } catch (err) {
        console.warn('[App] AppBootstrap.init gagal:', err);
      }
    }
  }

  async function initSyncManager() {
    if (!window.SyncManager || typeof window.SyncManager.init !== 'function') return;
    await window.SyncManager.init();
    bindSyncButtons();
  }

  async function initRouter() {
    if (!window.AppRouter || typeof window.AppRouter.init !== 'function') return;
    await window.AppRouter.init();
  }

  function installConnectivityHooks() {
    updateConnectionBadge(window.navigator.onLine);

    window.addEventListener('online', function () {
      updateConnectionBadge(true);
      notify('Koneksi kembali online.', 'success');
      if (window.SyncManager && typeof window.SyncManager.scheduleAutoSync === 'function') {
        window.SyncManager.scheduleAutoSync(1000);
      }
    });

    window.addEventListener('offline', function () {
      updateConnectionBadge(false);
      notify('Perangkat sedang offline.', 'warn');
    });
  }

  function markSessionState() {
    var profile = getProfile();
    var sessionPatch = {
      token: safeCall(function () { return window.StorageHelper.getSessionToken(); }, ''),
      is_authenticated: hasToken(),
      id_user: profile && (profile.id_user || profile.username || '') || '',
      role: profile && (profile.role_akses || profile.role || '') || '',
      device_id: safeCall(function () { return window.StorageHelper.getDeviceId(); }, '')
    };

    if (window.AppState && typeof window.AppState.setSession === 'function') {
      window.AppState.setSession(sessionPatch);
    }
    if (window.AppState && typeof window.AppState.setBootstrap === 'function' && profile) {
      window.AppState.setBootstrap({ profile: profile });
    }
  }

  function showInitialShell() {
    var splash = document.getElementById('view-splash') || document.getElementById('screen-splash');
    var login = document.getElementById('view-login') || document.getElementById('screen-login');
    var app = document.getElementById('view-app') || document.getElementById('screen-app') || document.getElementById('app-shell');

    if (splash) {
      splash.classList.add('hidden');
      splash.classList.remove('active');
      splash.style.display = 'none';
    }

    if (hasToken()) {
      if (login) {
        login.classList.add('hidden');
        login.classList.remove('active');
        login.style.display = 'none';
      }
      if (app) {
        app.classList.remove('hidden');
        app.classList.add('active');
        app.style.display = '';
      }
    } else {
      if (app) {
        app.classList.add('hidden');
        app.classList.remove('active');
        app.style.display = 'none';
      }
      if (login) {
        login.classList.remove('hidden');
        login.classList.add('active');
        login.style.display = '';
      }
    }
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    var swUrl = './sw.js';
    if (window.APP_CONFIG && window.APP_CONFIG.SW_URL) {
      swUrl = window.APP_CONFIG.SW_URL;
    }

    try {
      var registration = await navigator.serviceWorker.register(swUrl);
      console.log('[App] SW registered:', registration && registration.scope);

      navigator.serviceWorker.addEventListener('message', function (event) {
        var data = event && event.data || {};
        if (data && data.type === 'TPK_SW_UPDATE_AVAILABLE') {
          if (window.StorageHelper) {
            window.StorageHelper.setRaw('SW_PENDING_UPDATE', '1');
          }
          if (window.AppState && typeof window.AppState.setUi === 'function') {
            window.AppState.setUi({ has_pending_update: true });
          }
          notify('Versi aplikasi baru tersedia. Tekan Perbarui Aplikasi.', 'info');
        }
      });
    } catch (err) {
      console.warn('[App] registerServiceWorker gagal:', err);
    }
  }

  async function initApp() {
    if (initialized) return { ok: true };

    showInitialShell();
    markSessionState();
    installConnectivityHooks();
    bindUpdateButton();

    await initPersistentStorage();
    await initSyncManager();
    await initBootstrap();
    await initRouter();
    await registerServiceWorker();

    if (hasToken() && window.SyncManager && typeof window.SyncManager.scheduleAutoSync === 'function') {
      window.SyncManager.scheduleAutoSync(1200);
    }

    initialized = true;
    return { ok: true };
  }

  window.TpkApp = {
    init: initApp,
    refreshRoute: function () {
      if (window.AppRouter && typeof window.AppRouter.refresh === 'function') {
        return window.AppRouter.refresh();
      }
      return Promise.resolve();
    },
    forceSyncNow: function () {
      if (window.SyncManager && typeof window.SyncManager.syncAll === 'function') {
        return window.SyncManager.syncAll();
      }
      return Promise.resolve({ ok: false, message: 'SyncManager belum tersedia.' });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initApp().catch(function (err) {
        console.error('[App] init gagal:', err);
      });
    }, { once: true });
  } else {
    initApp().catch(function (err) {
      console.error('[App] init gagal:', err);
    });
  }
})(window, document);
