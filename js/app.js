(function (window, document) {
  'use strict';

  function safe(fn) {
    try { return fn(); } catch (err) { console.warn(err); }
  }

  function hasSessionToken() {
    try {
      return !!(window.Api && typeof window.Api.getSessionToken === 'function' && window.Api.getSessionToken());
    } catch (err) { return false; }
  }

  function cleanSensitiveUrl() {
    try {
      var url = new URL(window.location.href);
      ['username','password','id_user','kata_sandi'].forEach(function (key) { url.searchParams.delete(key); });
      var clean = url.pathname + (url.search || '') + (url.hash || '');
      window.history.replaceState({}, document.title, clean);
    } catch (err) {}
  }

  function bindHeaderActions() {
    Array.prototype.slice.call(document.querySelectorAll('[data-route-link]')).forEach(function (link) {
      if (link.dataset.bound === '1') return;
      link.dataset.bound = '1';
      link.addEventListener('click', function (event) {
        event.preventDefault();
        var route = link.getAttribute('data-route-link') || '';
        if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go(route);
        }
      });
    });

    var logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn && logoutBtn.dataset.bound !== '1') {
      logoutBtn.dataset.bound = '1';
      logoutBtn.addEventListener('click', function (event) {
        event.preventDefault();
        if (window.Auth && typeof window.Auth.logout === 'function') {
          window.Auth.logout();
        }
      });
    }

    var updateBtn = document.getElementById('btn-update-app');
    if (updateBtn && updateBtn.dataset.bound !== '1') {
      updateBtn.dataset.bound = '1';
      updateBtn.addEventListener('click', function () {
        window.location.reload();
      });
    }
  }

  function registerServiceWorkerSoft() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function (err) {
        console.warn('SW register gagal:', err && err.message ? err.message : err);
      });
    });
  }

  async function init() {
    cleanSensitiveUrl();

    safe(function () { if (window.Auth && typeof window.Auth.init === 'function') window.Auth.init(); });
    safe(function () { if (window.AppBootstrap && typeof window.AppBootstrap.init === 'function') window.AppBootstrap.init(); });

    bindHeaderActions();
    registerServiceWorkerSoft();

    if (window.Router && typeof window.Router.go === 'function') {
      await window.Router.go(hasSessionToken() ? 'dashboard' : 'login');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  window.App = { init: init };
})(window, document);
