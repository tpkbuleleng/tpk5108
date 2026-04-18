(function (window, document) {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
  }

  function safeConsole(method) {
    return function () {
      try {
        if (window.console && typeof window.console[method] === 'function') {
          window.console[method].apply(window.console, arguments);
        }
      } catch (err) {}
    };
  }

  var log = safeConsole('log');
  var warn = safeConsole('warn');

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
        var next = url.pathname + (url.search || '') + (url.hash || '');
        window.history.replaceState({}, document.title, next);
      }
    } catch (err) {
      warn('cleanSensitiveUrl failed:', err && err.message ? err.message : err);
    }
  }

  function getSessionToken() {
    try {
      if (window.Api && typeof window.Api.getSessionToken === 'function') {
        return String(window.Api.getSessionToken() || '').trim();
      }
    } catch (err) {}
    return '';
  }

  function hideSplash() {
    ['app-splash', 'splash-screen', 'startup-splash', 'boot-splash'].forEach(function (id) {
      var el = byId(id);
      if (el) {
        el.classList.add('hidden');
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function showSplash() {
    ['app-splash', 'splash-screen', 'startup-splash', 'boot-splash'].forEach(function (id) {
      var el = byId(id);
      if (el) {
        el.classList.remove('hidden');
        el.style.display = '';
        el.setAttribute('aria-hidden', 'false');
      }
    });
  }

  function showLoginShell() {
    var ids = ['login-screen', 'screen-login', 'login-root'];
    ids.forEach(function (id) {
      var el = byId(id);
      if (el) {
        el.classList.remove('hidden');
        el.classList.add('active');
        el.style.display = '';
      }
    });
  }

  function openInitialRoute() {
    try {
      if (!window.Router || typeof window.Router.go !== 'function') {
        showLoginShell();
        return;
      }
      if (getSessionToken()) {
        window.Router.go('dashboard');
      } else {
        window.Router.go('login');
      }
    } catch (err) {
      warn('openInitialRoute failed:', err && err.message ? err.message : err);
      showLoginShell();
    }
  }

  function initAuth() {
    try {
      if (window.Auth && typeof window.Auth.init === 'function') {
        window.Auth.init();
      }
    } catch (err) {
      warn('Auth.init failed:', err && err.message ? err.message : err);
    }
  }

  function initRouter() {
    try {
      if (window.Router && typeof window.Router.init === 'function') {
        window.Router.init();
      }
    } catch (err) {
      warn('Router.init failed:', err && err.message ? err.message : err);
    }
  }

  function initBootstrapSoft() {
    try {
      if (window.AppBootstrap && typeof window.AppBootstrap.init === 'function') {
        var result = window.AppBootstrap.init();
        if (result && typeof result.then === 'function') {
          result.catch(function (err) {
            warn('AppBootstrap.init promise rejected:', err && err.message ? err.message : err);
          });
        }
      }
    } catch (err) {
      warn('AppBootstrap.init failed:', err && err.message ? err.message : err);
    }
  }

  function registerServiceWorkerSoft() {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(function (err) {
          warn('Service worker register gagal:', err && err.message ? err.message : err);
        });
      }
    } catch (err) {
      warn('Service worker setup gagal:', err && err.message ? err.message : err);
    }
  }

  function wireOnlineOffline() {
    function notify() {
      try {
        var badge = byId('network-status');
        if (badge) {
          badge.textContent = navigator.onLine ? 'Online' : 'Offline';
          badge.className = navigator.onLine ? 'tpk-badge online' : 'tpk-badge offline';
        }
      } catch (err) {}

      try {
        if (window.SyncManager && typeof window.SyncManager.onConnectivityChange === 'function') {
          window.SyncManager.onConnectivityChange(!!navigator.onLine);
        }
      } catch (err2) {}
    }

    window.addEventListener('online', notify);
    window.addEventListener('offline', notify);
    notify();
  }

  function boot() {
    cleanSensitiveUrl();
    showSplash();

    initAuth();
    initRouter();
    initBootstrapSoft();
    wireOnlineOffline();
    registerServiceWorkerSoft();

    window.setTimeout(function () {
      hideSplash();
      openInitialRoute();
    }, 250);

    window.setTimeout(function () {
      hideSplash();
      openInitialRoute();
    }, 1500);

    log('app.js safe boot loaded');
  }

  document.addEventListener('DOMContentLoaded', boot);
})(window, document);
