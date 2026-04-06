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
      const registration = await navigator.serviceWorker.register('./sw.js');
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

  async function init() {
    if (hasInitialized) return;
    hasInitialized = true;

    log('app.js loaded');

    // Jalankan aplikasi dulu agar splash/login tidak menunggu SW
    startApplication();

    // Service worker didaftarkan di belakang layar
    Promise.resolve().then(function () {
      return registerServiceWorker();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window, document);
