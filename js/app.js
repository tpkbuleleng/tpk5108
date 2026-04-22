(function (window, document) {
  'use strict';

  var hasInitialized = false;
  var isReportingError = false;
  var recentErrorMap = Object.create(null);

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

  function nowTs() {
    return Date.now();
  }

  function getMessage(errorLike) {
    if (!errorLike) return '';
    if (typeof errorLike === 'string') return errorLike;
    if (errorLike && errorLike.message) return String(errorLike.message);
    try {
      return String(errorLike);
    } catch (err) {
      return 'Unknown error';
    }
  }

  function buildFingerprint(source, action, errorLike) {
    return [source || '', action || '', getMessage(errorLike)].join('::').slice(0, 400);
  }

  function shouldSkipRecent(source, action, errorLike) {
    var fp = buildFingerprint(source, action, errorLike);
    var ts = recentErrorMap[fp] || 0;
    var now = nowTs();

    if (now - ts < 3000) {
      return true;
    }

    recentErrorMap[fp] = now;
    return false;
  }

  function setSplashMessage(message) {
    var text = String(message || '').trim();
    if (!text) return;

    var selectors = [
      '#splash-status',
      '#splash-message',
      '#loading-message',
      '#splash-text',
      '[data-splash-message]'
    ];

    for (var i = 0; i < selectors.length; i += 1) {
      try {
        var el = document.querySelector(selectors[i]);
        if (el) {
          el.textContent = text;
          return;
        }
      } catch (err) {}
    }
  }

  function notifyUser(message) {
    if (window.Notifier && typeof window.Notifier.show === 'function') {
      window.Notifier.show(message, 'error');
      return;
    }
    setSplashMessage(message);
  }

  async function reportClientError(source, action, errorLike, extra) {
    if (isReportingError) return false;
    if (shouldSkipRecent(source, action, errorLike)) return false;
    if (!window.APP_CONFIG || !window.Api || typeof window.Api.reportClientError !== 'function') {
      return false;
    }

    var message = getMessage(errorLike) || 'Unknown client error';

    isReportingError = true;
    try {
      await window.Api.reportClientError(message, Object.assign({
        modul: source || 'app.js',
        action: action || 'runtime',
        stack_trace: errorLike && errorLike.stack ? String(errorLike.stack) : '',
        __fromClientErrorReporter: true
      }, extra || {}));
      return true;
    } catch (err) {
      return false;
    } finally {
      isReportingError = false;
    }
  }

  function installGlobalErrorHandlers() {
    if (window.__tpkGlobalErrorHandlersInstalled === true) return;
    window.__tpkGlobalErrorHandlersInstalled = true;

    window.addEventListener('error', function (event) {
      var err = event && (event.error || event.message || 'window.error');
      reportClientError('app.js', 'window.error', err, {
        filename: event && event.filename ? String(event.filename) : '',
        lineno: event && event.lineno ? Number(event.lineno) : 0,
        colno: event && event.colno ? Number(event.colno) : 0
      }).catch(function () {});
    });

    window.addEventListener('unhandledrejection', function (event) {
      var reason = event && event.reason ? event.reason : 'Promise rejected';
      reportClientError('app.js', 'window.unhandledrejection', reason, {}).catch(function () {});
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
      reportClientError('app.js', 'serviceWorker.register', err, {}).catch(function () {});
      return null;
    }
  }

  async function startApplication() {
    try {
      log('TPK app starting...');

      if (!window.APP_CONFIG) {
        throw new Error('APP_CONFIG belum tersedia.');
      }

      if (window.AppBootstrap && typeof window.AppBootstrap.init === 'function') {
        await window.AppBootstrap.init();
        return;
      }

      if (window.App && typeof window.App.init === 'function') {
        await window.App.init();
        return;
      }

      warn('Bootstrap aplikasi belum tersedia.');
      notifyUser('Bootstrap aplikasi belum tersedia.');
    } catch (err) {
      warn('Gagal menjalankan aplikasi:', err);
      notifyUser('Aplikasi gagal dimulai.');
      reportClientError('app.js', 'startApplication', err, {}).catch(function () {});
    }
  }

  function scheduleBackgroundTasks() {
    function run() {
      registerServiceWorker().catch(function () {});
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
