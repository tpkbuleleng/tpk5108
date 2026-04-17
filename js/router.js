(function (window, document) {
  'use strict';

  var ROUTE_MAP = {
    splash: 'splash-screen',
    login: 'login-screen',
    dashboard: 'dashboard-screen',
    sasaranList: 'sasaran-list-screen',
    sasaranDetail: 'sasaran-detail-screen',
    registrasi: 'registrasi-screen',
    pendampingan: 'pendampingan-screen',
    sync: 'sync-screen',
    rekapKader: 'rekap-kader-screen'
  };

  var ROUTE_ASSET_MAP = {
    dashboard: [
      { src: './js/views/dashboardView.js', globalName: 'DashboardView' }
    ],
    sasaranList: [
      { src: './js/views/sasaranListView.js?v=20260412-01', globalName: 'SasaranListView' }
    ],
    sasaranDetail: [
      { src: './js/views/sasaranDetailView.js?v=20260416-03', globalName: 'SasaranDetailView' }
    ],
    registrasi: [
      { src: './js/views/registrasiView.js?v=20260411-03', globalName: 'RegistrasiView' }
    ],
    pendampingan: [
      { src: './js/views/pendampinganView.js?v=20260417-02', globalName: 'PendampinganView' }
    ],
    sync: [
      { src: './js/views/syncView.js', globalName: 'SyncView' }
    ],
    rekapKader: [
      { src: './js/views/rekapKaderView.js', globalName: 'RekapKaderView' }
    ]
  };

  var scriptPromises = {};

  function getAppState() {
    return window.AppState || null;
  }

  function normalizeRouteName(routeName) {
    var raw = String(routeName || '').trim();

    var aliases = {
      splash: 'splash',
      login: 'login',
      dashboard: 'dashboard',

      'sasaran-list': 'sasaranList',
      sasaranList: 'sasaranList',
      sasaran_list: 'sasaranList',

      'sasaran-detail': 'sasaranDetail',
      sasaranDetail: 'sasaranDetail',
      sasaran_detail: 'sasaranDetail',

      registrasi: 'registrasi',
      'registrasi-sasaran': 'registrasi',
      registrasiSasaran: 'registrasi',
      registrasi_sasaran: 'registrasi',

      pendampingan: 'pendampingan',

      sync: 'sync',
      syncScreen: 'sync',
      'sync-screen': 'sync',

      rekap: 'rekapKader',
      rekapKader: 'rekapKader',
      'rekap-kader': 'rekapKader',
      rekap_kader: 'rekapKader'
    };

    return aliases[raw] || raw;
  }

  function showScreen(screenId) {
    if (!screenId) return false;

    if (window.UI && typeof window.UI.showScreen === 'function') {
      window.UI.showScreen(screenId);
      return true;
    }

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

  function updateCurrentRoute(routeName, screenId) {
    Router.currentRoute = routeName || '';
    Router.currentScreenId = screenId || '';
    Router.routeToken += 1;

    var appState = getAppState();
    if (appState && typeof appState.setCurrentRoute === 'function') {
      appState.setCurrentRoute(routeName || '');
    }

    return Router.routeToken;
  }

  function getRouteAssets(routeName) {
    return ROUTE_ASSET_MAP[routeName] || [];
  }

  function isGlobalReady(globalName) {
    return !!(globalName && window[globalName]);
  }

  function hasScriptTag(src) {
    return !!document.querySelector('script[data-lazy-src="' + src.replace(/"/g, '\\"') + '"]');
  }

  function loadScriptOnce(src, globalName) {
    if (!src) return Promise.resolve();

    if (isGlobalReady(globalName)) {
      return Promise.resolve();
    }

    if (scriptPromises[src]) {
      return scriptPromises[src];
    }

    if (hasScriptTag(src) && !scriptPromises[src]) {
      scriptPromises[src] = new Promise(function (resolve) {
        var tries = 0;
        function waitUntilReady() {
          tries += 1;
          if (isGlobalReady(globalName) || tries > 40) {
            resolve();
            return;
          }
          window.setTimeout(waitUntilReady, 100);
        }
        waitUntilReady();
      });
      return scriptPromises[src];
    }

    scriptPromises[src] = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.dataset.lazySrc = src;

      script.onload = function () {
        resolve();
      };

      script.onerror = function () {
        reject(new Error('Gagal memuat script: ' + src));
      };

      document.body.appendChild(script);
    });

    return scriptPromises[src];
  }

  function ensureRouteAssets(routeName) {
    var assets = getRouteAssets(routeName);
    if (!assets.length) {
      return Promise.resolve();
    }

    return Promise.all(assets.map(function (asset) {
      return loadScriptOnce(asset.src, asset.globalName);
    }));
  }

  function invokeDefaultRouteReady(routeName) {
    try {
      if (routeName === 'sasaranList' && window.SasaranListView && typeof window.SasaranListView.load === 'function') {
        window.SasaranListView.load();
        return;
      }

      if (routeName === 'sync' && window.SyncView && typeof window.SyncView.refresh === 'function') {
        window.SyncView.refresh();
        return;
      }

      if (routeName === 'rekapKader' && window.RekapKaderView && typeof window.RekapKaderView.load === 'function') {
        window.RekapKaderView.load();
      }
    } catch (err) {
      console.error('Gagal menjalankan route ready hook:', routeName, err);
    }
  }

  function tryInitView(routeName, screenId) {
    try {
      var target = document.getElementById(screenId);
      if (!target) return;

      if (routeName === 'login' && window.LoginView && typeof window.LoginView.init === 'function') {
        window.LoginView.init(target, { route: routeName, screenId: screenId });
        return;
      }

      if (routeName === 'dashboard' && window.DashboardView && typeof window.DashboardView.init === 'function') {
        window.DashboardView.init(target, { route: routeName, screenId: screenId });
        return;
      }

      if (routeName === 'sasaranList' && window.SasaranListView && typeof window.SasaranListView.init === 'function') {
        window.SasaranListView.init(target, { route: routeName, screenId: screenId });
        return;
      }

      if (routeName === 'sasaranDetail' && window.SasaranDetailView && typeof window.SasaranDetailView.init === 'function') {
        window.SasaranDetailView.init(target, { route: routeName, screenId: screenId });
        return;
      }

      if (routeName === 'registrasi' && window.RegistrasiView && typeof window.RegistrasiView.init === 'function') {
        window.RegistrasiView.init(target, { route: routeName, screenId: screenId });
        return;
      }

      if (routeName === 'pendampingan' && window.PendampinganView && typeof window.PendampinganView.init === 'function') {
        window.PendampinganView.init(target, { route: routeName, screenId: screenId });
        return;
      }

      if (routeName === 'sync' && window.SyncView && typeof window.SyncView.init === 'function') {
        window.SyncView.init(target, { route: routeName, screenId: screenId });
        return;
      }

      if (routeName === 'rekapKader' && window.RekapKaderView && typeof window.RekapKaderView.init === 'function') {
        window.RekapKaderView.init(target, { route: routeName, screenId: screenId });
      }
    } catch (err) {
      console.error('Gagal init view untuk route:', routeName, err);
    }
  }

  function afterRouteChange(routeName, screenId, token, options) {
    var opts = options || {};

    if (opts.scrollToTop !== false) {
      try {
        window.scrollTo({ top: 0, behavior: 'auto' });
      } catch (err) {
        window.scrollTo(0, 0);
      }
    }

    Promise.resolve()
      .then(function () {
        return ensureRouteAssets(routeName);
      })
      .then(function () {
        if (token !== Router.routeToken) return;

        tryInitView(routeName, screenId);
        invokeDefaultRouteReady(routeName);

        if (typeof opts.onRouteReady === 'function') {
          opts.onRouteReady({ route: routeName, screenId: screenId });
        }
      })
      .catch(function (err) {
        console.error('Gagal memuat asset route:', routeName, err);
      });
  }

  var Router = {
    currentRoute: '',
    currentScreenId: '',
    routeToken: 0,
    routes: Object.freeze(Object.assign({}, ROUTE_MAP)),

    go: function (routeName, options) {
      var normalizedRoute = normalizeRouteName(routeName);
      var screenId = ROUTE_MAP[normalizedRoute];

      if (!screenId) {
        console.warn('Route tidak dikenali:', routeName);
        return false;
      }

      var rendered = showScreen(screenId);
      if (!rendered) {
        console.warn('Screen tidak ditemukan:', screenId);
        return false;
      }

      var token = updateCurrentRoute(normalizedRoute, screenId);
      afterRouteChange(normalizedRoute, screenId, token, options);
      return true;
    },

    ensureRouteAssets: function (routeName) {
      return ensureRouteAssets(normalizeRouteName(routeName));
    },

    preloadRoutes: function (routeNames) {
      var routes = Array.isArray(routeNames) ? routeNames : [];
      routes.forEach(function (routeName) {
        ensureRouteAssets(normalizeRouteName(routeName)).catch(function (err) {
          console.warn('Preload route gagal:', routeName, err && err.message ? err.message : err);
        });
      });
    },

    getCurrentRoute: function () {
      return this.currentRoute || '';
    },

    getCurrentScreenId: function () {
      return this.currentScreenId || '';
    },

    toSplash: function (options) { return this.go('splash', options); },
    toLogin: function (options) { return this.go('login', options); },
    toDashboard: function (options) { return this.go('dashboard', options); },
    toSasaranList: function (options) { return this.go('sasaranList', options); },
    toSasaranDetail: function (options) { return this.go('sasaranDetail', options); },
    toRegistrasi: function (options) { return this.go('registrasi', options); },
    toPendampingan: function (options) { return this.go('pendampingan', options); },
    toSyncScreen: function (options) { return this.go('sync', options); },
    toRekapKader: function (options) { return this.go('rekapKader', options); }
  };

  window.Router = Router;
})(window, document);
