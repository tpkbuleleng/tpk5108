(function (window, document) {
  'use strict';

  var hasInitialized = false;

  function log() {
    try {
      console.log.apply(console, arguments);
    } catch (err) {}
  }

  function warn() {
    try {
      console.warn.apply(console, arguments);
    } catch (err) {}
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      log('Service worker tidak didukung browser ini.');
      return null;
    }

    try {
      var registration = await navigator.serviceWorker.register('./sw.js');
      log('Service worker registered:', registration.scope || './sw.js');
      return registration;
    } catch (err) {
      warn('Service worker gagal didaftarkan:', err);
      return null;
    }
  }

  async function startApplication() {
    try {
      log('TPK app starting...');

      if (window.AppBootstrap && typeof window.AppBootstrap.init === 'function') {
        await window.AppBootstrap.init();
        return;
      }

      if (window.App && typeof window.App.init === 'function') {
        await window.App.init();
        return;
      }

      warn('Bootstrap aplikasi belum tersedia.');
    } catch (err) {
      warn('Gagal menjalankan aplikasi:', err);

      if (window.Notifier && typeof window.Notifier.show === 'function') {
        window.Notifier.show('Aplikasi gagal dimulai.', 'error');
      }
    }
  }

  function scheduleBackgroundTasks() {
    function run() {
      registerServiceWorker();
    }

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 4000 });
      return;
    }

    window.setTimeout(run, 1200);
  }

  function init() {
    if (hasInitialized) return;
    hasInitialized = true;

    log('app.js loaded');

    Promise.resolve().then(function () {
      return startApplication();
    });

    scheduleBackgroundTasks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window, document);
