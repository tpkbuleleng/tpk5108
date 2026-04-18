(function (window, document) {
  'use strict';

  if (window.__TPK_APP_BOOT_GUARD_INSTALLED__) return;
  window.__TPK_APP_BOOT_GUARD_INSTALLED__ = true;

  var booted = false;
  var splashTimer = null;

  function safeCall(fn, args) {
    try {
      if (typeof fn === 'function') return fn.apply(null, args || []);
    } catch (err) {
      console.error(err);
    }
    return undefined;
  }

  function qs(id) {
    return document.getElementById(id);
  }

  function cleanSensitiveUrl() {
    try {
      var url = new URL(window.location.href);
      var keys = ['username', 'password', 'id_user', 'kata_sandi'];
      var changed = false;
      keys.forEach(function (k) {
        if (url.searchParams.has(k)) {
          url.searchParams.delete(k);
          changed = true;
        }
      });
      if (changed) {
        window.history.replaceState({}, document.title, url.pathname + (url.search || '') + (url.hash || ''));
      }
    } catch (err) {
      console.warn('cleanSensitiveUrl failed', err);
    }
  }

  function hasSessionToken() {
    try {
      if (window.Api && typeof window.Api.getSessionToken === 'function') {
        return !!String(window.Api.getSessionToken() || '').trim();
      }
    } catch (err) {}
    try {
      return !!String(localStorage.getItem('tpk_session_token') || '').trim();
    } catch (err2) {}
    return false;
  }

  function showLoginShell() {
    var loginScreen = qs('login-screen') || qs('screen-login') || qs('loginScreen');
    var dashboardScreen = qs('dashboard-screen') || qs('screen-dashboard') || qs('dashboardScreen');
    var shell = qs('app-shell') || qs('dashboard-shell') || qs('main-shell');
    if (loginScreen) {
      loginScreen.classList.remove('hidden');
      loginScreen.classList.add('active');
    }
    if (dashboardScreen) {
      dashboardScreen.classList.remove('active');
      dashboardScreen.classList.add('hidden');
    }
    if (shell) {
      shell.classList.add('hidden');
    }
  }

  function hideSplash() {
    var ids = ['app-splash', 'splash-screen', 'splashScreen'];
    ids.forEach(function (id) {
      var el = qs(id);
      if (!el) return;
      el.classList.add('hidden');
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('is-loading', 'app-loading', 'splash-active');
  }

  function routeNow() {
    cleanSensitiveUrl();

    safeCall(window.Auth && window.Auth.init, []);
    safeCall(window.Router && window.Router.init, []);

    var route = hasSessionToken() ? 'dashboard' : 'login';

    if (window.Router && typeof window.Router.go === 'function') {
      try {
        window.Router.go(route);
      } catch (err) {
        console.error('Router.go failed', err);
      }
    }

    if (route === 'login') {
      showLoginShell();
    }

    hideSplash();
  }

  function registerServiceWorkerSoftFail() {
    try {
      if (!('serviceWorker' in navigator)) return;
      navigator.serviceWorker.register('./sw.js').catch(function (err) {
        console.warn('SW register skipped:', err && err.message ? err.message : err);
      });
    } catch (err) {
      console.warn('SW register failed', err);
    }
  }

  function start() {
    if (booted) return;
    booted = true;

    cleanSensitiveUrl();
    registerServiceWorkerSoftFail();

    // watchdog: never let splash block the UI
    splashTimer = window.setTimeout(function () {
      routeNow();
    }, 1200);

    // also route immediately on the next tick, without waiting for full load
    window.setTimeout(function () {
      routeNow();
    }, 0);
  }

  function initWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }

  initWhenReady();

  window.addEventListener('pageshow', function () {
    window.setTimeout(routeNow, 0);
  });

})(window, document);
