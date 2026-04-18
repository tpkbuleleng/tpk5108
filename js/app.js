(function (window, document) {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
  }

  function safeCall(fn) {
    try {
      return fn();
    } catch (err) {
      console.warn(err);
      return null;
    }
  }

  function cleanSensitiveUrl() {
    try {
      var url = new URL(window.location.href);
      var keys = ['username', 'password', 'id_user', 'kata_sandi'];
      var changed = false;

      keys.forEach(function (key) {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      });

      if (changed) {
        var cleanUrl = url.pathname + (url.search || '') + (url.hash || '');
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (err) {
      console.warn('Gagal membersihkan URL sensitif:', err);
    }
  }

  function hasSessionToken() {
    try {
      if (window.Api && typeof window.Api.getSessionToken === 'function') {
        return !!String(window.Api.getSessionToken() || '').trim();
      }
    } catch (err) {}
    return false;
  }

  function getInitialRoute() {
    var hash = String(window.location.hash || '').replace(/^#/, '').trim();
    if (hash) return hash;
    return hasSessionToken() ? 'dashboard' : 'login';
  }

  function showLoginShell() {
    var login = byId('login-screen');
    var app = byId('app-shell');
    var root = byId('module-root');

    if (app) app.classList.add('hidden');
    if (login) login.classList.remove('hidden');
    if (root) root.innerHTML = '';
  }

  function showAppShell() {
    var login = byId('login-screen');
    var app = byId('app-shell');

    if (login) login.classList.add('hidden');
    if (app) app.classList.remove('hidden');
  }

  function hideSplash() {
    var splash = byId('app-splash');
    if (!splash) return;
    splash.classList.add('hidden');
  }

  function updateNetworkBadge() {
    var badge = byId('network-status');
    if (!badge) return;
    var online = navigator.onLine !== false;
    badge.textContent = online ? 'Online' : 'Offline';
    badge.classList.toggle('online', online);
    badge.classList.toggle('offline', !online);
    badge.style.background = online ? '#198754' : '#6c757d';
  }

  function bindHeaderActions() {
    var syncHeader = byId('btn-sync-header');
    var openSync = byId('btn-open-sync');
    var updateApp = byId('btn-update-app');

    if (syncHeader && syncHeader.dataset.bound !== '1') {
      syncHeader.dataset.bound = '1';
      syncHeader.addEventListener('click', function () {
        if (window.SyncManager && typeof window.SyncManager.syncNow === 'function') {
          window.SyncManager.syncNow();
        } else if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go('sync');
        }
      });
    }

    if (openSync && openSync.dataset.bound !== '1') {
      openSync.dataset.bound = '1';
      openSync.addEventListener('click', function (event) {
        event.preventDefault();
        if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go('sync');
        }
      });
    }

    if (updateApp && updateApp.dataset.bound !== '1') {
      updateApp.dataset.bound = '1';
      updateApp.addEventListener('click', function () {
        cleanSensitiveUrl();
        try {
          if (window.caches && typeof window.caches.keys === 'function') {
            window.caches.keys().then(function (keys) {
              return Promise.all(keys.map(function (key) { return window.caches.delete(key); }));
            }).finally(function () {
              window.location.reload();
            });
            return;
          }
        } catch (err) {}
        window.location.reload();
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-route-link]'), function (el) {
      if (el.dataset.bound === '1') return;
      el.dataset.bound = '1';
      el.addEventListener('click', function (event) {
        var route = el.getAttribute('data-route-link');
        if (!route || !window.Router || typeof window.Router.go !== 'function') return;
        event.preventDefault();
        window.Router.go(route);
      });
    });
  }

  function registerServiceWorkerSoft() {
    try {
      if (!('serviceWorker' in navigator)) return;
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function (err) {
          console.warn('SW register gagal:', err && err.message ? err.message : err);
        });
      }, { once: true });
    } catch (err) {
      console.warn('SW register error:', err && err.message ? err.message : err);
    }
  }

  function initAuth() {
    safeCall(function () {
      if (window.Auth && typeof window.Auth.init === 'function') {
        window.Auth.init();
      }
    });
  }

  function initBootstrapSoft() {
    safeCall(function () {
      if (window.AppBootstrap && typeof window.AppBootstrap.init === 'function') {
        var result = window.AppBootstrap.init();
        if (result && typeof result.catch === 'function') {
          result.catch(function (err) {
            console.warn('AppBootstrap init gagal:', err && err.message ? err.message : err);
          });
        }
      }
    });
  }

  function startRouter() {
    if (!window.Router || typeof window.Router.go !== 'function') {
      showLoginShell();
      hideSplash();
      return;
    }

    var initialRoute = getInitialRoute();
    window.Router.go(initialRoute).finally(function () {
      if (initialRoute === 'login') {
        showLoginShell();
      } else {
        showAppShell();
      }
      hideSplash();
    });
  }

  function handleRouteChanged(event) {
    var route = event && event.detail ? String(event.detail.route || '') : '';
    if (route === 'login') {
      showLoginShell();
    } else {
      showAppShell();
    }
  }

  function init() {
    cleanSensitiveUrl();
    updateNetworkBadge();
    bindHeaderActions();
    initAuth();
    initBootstrapSoft();
    registerServiceWorkerSoft();

    document.addEventListener('tpk:route-changed', handleRouteChanged);
    window.addEventListener('online', updateNetworkBadge);
    window.addEventListener('offline', updateNetworkBadge);

    startRouter();
  }

  window.TPKCleanSensitiveUrl = cleanSensitiveUrl;
  window.TPKApp = {
    init: init,
    showLoginShell: showLoginShell,
    showAppShell: showAppShell,
    hideSplash: hideSplash
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window, document);
