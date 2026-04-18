(function (window, document) {
  'use strict';

  function qs(id) {
    return document.getElementById(id);
  }

  function cleanSensitiveUrl() {
    try {
      var url = new URL(window.location.href);
      ['username', 'password', 'id_user', 'kata_sandi'].forEach(function (key) {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
        }
      });
      var cleanUrl = url.pathname + (url.search || '') + (url.hash || '');
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (err) {
      console.warn('[app] cleanSensitiveUrl failed:', err);
    }
  }

  function bindHeaderButtons() {
    var btnSyncHeader = qs('btn-sync-header');
    var btnOpenSync = qs('btn-open-sync');
    var btnUpdateApp = qs('btn-update-app');

    if (btnSyncHeader && !btnSyncHeader.dataset.bound) {
      btnSyncHeader.dataset.bound = '1';
      btnSyncHeader.addEventListener('click', function () {
        if (window.SyncManager && typeof window.SyncManager.syncNow === 'function') {
          window.SyncManager.syncNow();
        } else if (window.Router) {
          window.Router.go('sync');
        }
      });
    }

    if (btnOpenSync && !btnOpenSync.dataset.bound) {
      btnOpenSync.dataset.bound = '1';
      btnOpenSync.addEventListener('click', function () {
        if (window.Router) window.Router.go('sync');
      });
    }

    if (btnUpdateApp && !btnUpdateApp.dataset.bound) {
      btnUpdateApp.dataset.bound = '1';
      btnUpdateApp.addEventListener('click', function () {
        cleanSensitiveUrl();

        try {
          if (window.registrationWaiting && typeof window.registrationWaiting.postMessage === 'function') {
            window.registrationWaiting.postMessage({ type: 'SKIP_WAITING' });
          }
        } catch (err) {}

        window.location.reload();
      });
    }
  }

  function bindConnectivityBadge() {
    var badge = qs('network-status') || qs('network-status-class');
    if (!badge) return;

    function refreshBadge() {
      var online = navigator.onLine !== false;
      badge.textContent = online ? 'Online' : 'Offline';
      badge.classList.toggle('online', online);
      badge.classList.toggle('offline', !online);
    }

    refreshBadge();
    window.addEventListener('online', refreshBadge);
    window.addEventListener('offline', refreshBadge);
  }

  function initSyncLifecycle() {
    if (window.SyncManager && typeof window.SyncManager.init === 'function') {
      window.SyncManager.init();
    }

    window.addEventListener('online', function () {
      if (window.SyncManager && typeof window.SyncManager.syncNow === 'function') {
        window.SyncManager.syncNow();
      }
    });
  }

  function initApp() {
    cleanSensitiveUrl();

    if (window.Auth && typeof window.Auth.init === 'function') {
      window.Auth.init();
    }

    if (window.AppBootstrap && typeof window.AppBootstrap.init === 'function') {
      Promise.resolve(window.AppBootstrap.init()).catch(function (err) {
        console.warn('[app] AppBootstrap.init failed:', err);
      });
    }

    bindHeaderButtons();
    bindConnectivityBadge();
    initSyncLifecycle();

    if (window.Router && typeof window.Router.init === 'function') {
      window.Router.init();
    }
  }

  window.TPKCleanSensitiveUrl = cleanSensitiveUrl;
  window.App = { init: initApp };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})(window, document);
