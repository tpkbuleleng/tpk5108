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

    var appState = getAppState();
    if (appState && typeof appState.setCurrentRoute === 'function') {
      appState.setCurrentRoute(routeName || '');
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

  function afterRouteChange(routeName, screenId, options) {
    var opts = options || {};

    tryInitView(routeName, screenId);

    if (opts.scrollToTop !== false) {
      try {
        window.scrollTo({ top: 0, behavior: 'auto' });
      } catch (err) {
        window.scrollTo(0, 0);
      }
    }

    if (typeof opts.onAfterRoute === 'function') {
      opts.onAfterRoute({ route: routeName, screenId: screenId });
    }
  }

  var Router = {
    currentRoute: '',
    currentScreenId: '',
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

      updateCurrentRoute(normalizedRoute, screenId);
      afterRouteChange(normalizedRoute, screenId, options);
      return true;
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
