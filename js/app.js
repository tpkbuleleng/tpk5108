(function (window, document) {
  'use strict';

  var hasInitialized = false;
  var isReportingError = false;
  var recentErrorMap = Object.create(null);
  var enhancedShellPromise = null;
  var swRegistrationScheduled = false;

  var ENHANCED_SHELL_SCRIPTS = [
    { src: './js/router.js', globalName: 'Router' },
    { src: './js/bootstrap.js', globalName: 'AppBootstrap' },
    { src: './js/ui.js', globalName: 'UI' }
  ];

  function log() {
    try { console.log.apply(console, arguments); } catch (err) {}
  }

  function warn() {
    try { console.warn.apply(console, arguments); } catch (err) {}
  }

  function nowTs() {
    return Date.now();
  }

  function getMessage(errorLike) {
    if (!errorLike) return '';
    if (typeof errorLike === 'string') return errorLike;
    if (errorLike && errorLike.message) return String(errorLike.message);
    try { return String(errorLike); } catch (err) { return 'Unknown error'; }
  }

  function buildFingerprint(source, action, errorLike) {
    return [source || '', action || '', getMessage(errorLike)].join('::').slice(0, 400);
  }

  function shouldSkipRecent(source, action, errorLike) {
    var fp = buildFingerprint(source, action, errorLike);
    var ts = recentErrorMap[fp] || 0;
    var now = nowTs();

    if (now - ts < 3000) return true;
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

  function getStorage() {
    return window.Storage || null;
  }

  function getStorageKeys() {
    return (window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS) || {};
  }

  function getSessionToken() {
    try {
      var storage = getStorage();
      var keys = getStorageKeys();
      if (!storage || typeof storage.get !== 'function' || !keys.SESSION_TOKEN) return '';
      return String(storage.get(keys.SESSION_TOKEN, '') || '').trim();
    } catch (err) {
      return '';
    }
  }

  function hasSessionToken() {
    return !!getSessionToken();
  }

  function showScreen(screenId) {
    if (!screenId) return false;

    var screens = document.querySelectorAll('.screen');
    screens.forEach(function (screen) {
      screen.classList.remove('active');
      screen.classList.add('hidden');
    });

    var target = document.getElementById(screenId);
    if (!target) return false;

    target.classList.remove('hidden');
    target.classList.add('active');
    return true;
  }

  function showLoginQuick() {
    showScreen('login-screen');

    if (window.Auth && typeof window.Auth.init === 'function') {
      try { window.Auth.init(); } catch (err) {}
    }
  }

  function showDashboardShellQuick() {
    showScreen('dashboard-screen');
  }

  async function reportClientError(source, action, errorLike, extra) {
    if (isReportingError) return false;
    if (shouldSkipRecent(source, action, errorLike)) return false;
    if (!window.APP_CONFIG || !window.Api || typeof window.Api.reportClientError !== 'function') return false;

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

  function installServiceWorkerMessageHandlers() {
    if (!('serviceWorker' in navigator) || window.__TPK_SW_MESSAGE_HANDLER_INSTALLED === true) return;
    window.__TPK_SW_MESSAGE_HANDLER_INSTALLED = true;

    navigator.serviceWorker.addEventListener('message', function (event) {
      var data = event && event.data ? event.data : {};
      if (!data || !data.type) return;
      if (data.type === 'TPK_SW_ACTIVATED') {
        try { console.log('Service worker aktif:', data.version || ''); } catch (err) {}
      }
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

  function isScriptReady(globalName) {
    return !!(globalName && window[globalName]);
  }

  function scriptAlreadyInDom(src) {
    var scripts = document.querySelectorAll('script[src],script[data-tpk-dynamic-src]');
    for (var i = 0; i < scripts.length; i += 1) {
      var tagSrc = scripts[i].getAttribute('src') || scripts[i].getAttribute('data-tpk-dynamic-src') || '';
      if (tagSrc === src || tagSrc.indexOf(src.replace('./', '')) >= 0) return true;
    }
    return false;
  }

  function loadScriptOnce(src, globalName) {
    if (!src) return Promise.resolve();
    if (isScriptReady(globalName)) return Promise.resolve();

    window.__TPK_DYNAMIC_SCRIPT_PROMISES = window.__TPK_DYNAMIC_SCRIPT_PROMISES || {};
    if (window.__TPK_DYNAMIC_SCRIPT_PROMISES[src]) return window.__TPK_DYNAMIC_SCRIPT_PROMISES[src];

    if (scriptAlreadyInDom(src)) {
      window.__TPK_DYNAMIC_SCRIPT_PROMISES[src] = new Promise(function (resolve) {
        var tries = 0;
        function waitUntilReady() {
          tries += 1;
          if (isScriptReady(globalName) || tries > 60) {
            resolve();
            return;
          }
          window.setTimeout(waitUntilReady, 50);
        }
        waitUntilReady();
      });
      return window.__TPK_DYNAMIC_SCRIPT_PROMISES[src];
    }

    window.__TPK_DYNAMIC_SCRIPT_PROMISES[src] = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.defer = true;
      script.dataset.tpkDynamicSrc = src;

      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Gagal memuat script: ' + src)); };

      document.body.appendChild(script);
    });

    return window.__TPK_DYNAMIC_SCRIPT_PROMISES[src];
  }

  async function loadEnhancedShell(reason) {
    if (enhancedShellPromise) return enhancedShellPromise;

    enhancedShellPromise = Promise.resolve()
      .then(async function () {
        for (var i = 0; i < ENHANCED_SHELL_SCRIPTS.length; i += 1) {
          await loadScriptOnce(ENHANCED_SHELL_SCRIPTS[i].src, ENHANCED_SHELL_SCRIPTS[i].globalName);
        }
        window.__TPK_ENHANCED_SHELL_READY = true;
        log('Enhanced shell ready:', reason || '');
        return true;
      })
      .catch(function (err) {
        enhancedShellPromise = null;
        warn('Gagal memuat enhanced shell:', err);
        reportClientError('app.js', 'loadEnhancedShell', err, { reason: reason || '' }).catch(function () {});
        throw err;
      });

    return enhancedShellPromise;
  }

  function warmEnhancedShellSoon(reason, delayMs) {
    window.setTimeout(function () {
      loadEnhancedShell(reason || 'warmup').catch(function () {});
    }, typeof delayMs === 'number' ? delayMs : 150);
  }

  function bindLoginWarmup() {
    var form = document.getElementById('loginForm');
    if (!form || form.dataset.tpk3cWarmupBound === '1') return;
    form.dataset.tpk3cWarmupBound = '1';

    form.addEventListener('submit', function () {
      // Setelah user benar-benar mencoba login, siapkan router/bootstrap/dashboard di latar.
      warmEnhancedShellSoon('login_submit', 100);
      watchTokenAfterLoginSubmit_();
    }, true);
  }

  function watchTokenAfterLoginSubmit_() {
    var startedAt = Date.now();
    var timer = window.setInterval(function () {
      if (Date.now() - startedAt > 15000) {
        window.clearInterval(timer);
        return;
      }

      if (!hasSessionToken()) return;

      window.clearInterval(timer);
      loadEnhancedShell('session_detected_after_login')
        .then(function () {
          if (window.AppBootstrap && typeof window.AppBootstrap.init === 'function') {
            return window.AppBootstrap.init();
          }
          if (window.Router && typeof window.Router.go === 'function') {
            window.Router.go('dashboard', { skipHeavyRefresh: true });
          }
          return true;
        })
        .catch(function () {});
    }, 450);
  }

  async function startWithSession() {
    setSplashMessage('Memulihkan sesi...');
    showDashboardShellQuick();

    await loadEnhancedShell('existing_session');

    if (window.AppBootstrap && typeof window.AppBootstrap.init === 'function') {
      await window.AppBootstrap.init();
      return true;
    }

    if (window.Router && typeof window.Router.go === 'function') {
      window.Router.go('dashboard', { skipHeavyRefresh: true });
      return true;
    }

    return false;
  }

  async function startApplication() {
    try {
      log('TPK app starting 3C cold-start diet...');

      if (!window.APP_CONFIG) {
        throw new Error('APP_CONFIG belum tersedia.');
      }

      bindLoginWarmup();

      if (hasSessionToken()) {
        await startWithSession();
        return;
      }

      showLoginQuick();
      setSplashMessage('Silakan login.');
    } catch (err) {
      warn('Gagal menjalankan aplikasi:', err);
      notifyUser('Aplikasi gagal dimulai.');
      reportClientError('app.js', 'startApplication', err, {}).catch(function () {});
      showLoginQuick();
    }
  }

  function scheduleBackgroundTasks() {
    if (swRegistrationScheduled) return;
    swRegistrationScheduled = true;

    function run() {
      registerServiceWorker().catch(function () {});
    }

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 6000 });
      return;
    }

    window.setTimeout(run, 2500);
  }

  function init() {
    if (hasInitialized) return;
    hasInitialized = true;

    installGlobalErrorHandlers();
    installServiceWorkerMessageHandlers();
    log('app.js loaded 3C');

    Promise.resolve().then(function () {
      return startApplication();
    });

    scheduleBackgroundTasks();
  }

  window.TPKAppLoader = {
    loadEnhancedShell: loadEnhancedShell,
    warmEnhancedShellSoon: warmEnhancedShellSoon,
    registerServiceWorker: registerServiceWorker,
    hasSessionToken: hasSessionToken
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window, document);
