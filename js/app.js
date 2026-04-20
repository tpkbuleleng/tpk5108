(function (window, document) {
  'use strict';

  var hasInitialized = false;
  var hasInstalledGlobalErrorHandlers = false;

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

  function safeSerialize(value) {
    if (value === null || value === undefined) return '';
    try {
      if (typeof value === 'string') return value;
      return JSON.stringify(value);
    } catch (err) {
      try {
        return String(value);
      } catch (stringErr) {
        return '[UNSERIALIZABLE]';
      }
    }
  }

  function describeError(err) {
    if (!err) {
      return {
        message: 'Unknown error',
        stack: ''
      };
    }

    if (typeof err === 'string') {
      return {
        message: err,
        stack: ''
      };
    }

    return {
      message: err.message || safeSerialize(err),
      stack: err.stack || ''
    };
  }

  function reportClientError(action, err, extra) {
    try {
      if (!window.Api || typeof window.Api.reportClientError !== 'function') {
        return;
      }

      var details = describeError(err);
      var payload = Object.assign({
        modul: 'app.js',
        aksi: action || 'app_error',
        message: details.message,
        stack: details.stack,
        href: window.location && window.location.href ? window.location.href : '',
        user_agent: navigator && navigator.userAgent ? navigator.userAgent : ''
      }, extra || {});

      Promise.resolve(window.Api.reportClientError(details.message, payload)).catch(function () {});
    } catch (reportErr) {}
  }

  function installGlobalErrorHandlers() {
    if (hasInstalledGlobalErrorHandlers) return;
    hasInstalledGlobalErrorHandlers = true;

    window.addEventListener('error', function (event) {
      reportClientError('window.error', event && event.error ? event.error : (event && event.message ? event.message : 'Window error'), {
        filename: event && event.filename ? event.filename : '',
        lineno: event && event.lineno ? event.lineno : 0,
        colno: event && event.colno ? event.colno : 0
      });
    });

    window.addEventListener('unhandledrejection', function (event) {
      reportClientError('window.unhandledrejection', event && event.reason ? event.reason : 'Unhandled promise rejection', {
        reason_type: event && event.reason ? Object.prototype.toString.call(event.reason) : ''
      });
    });
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
      reportClientError('serviceWorker.register', err, {
        scope: './sw.js'
      });
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
      reportClientError('startApplication.bootstrap_missing', 'Bootstrap aplikasi belum tersedia.');
    } catch (err) {
      warn('Gagal menjalankan aplikasi:', err);
      reportClientError('startApplication', err);

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

    installGlobalErrorHandlers();
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
