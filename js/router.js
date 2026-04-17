(function (window, document) {
  'use strict';

  var DEFAULT_ROUTE = 'rekap';
  var routeHandlers = {};
  var initialized = false;

  function hasToken() {
    if (window.StorageHelper && typeof window.StorageHelper.hasSessionToken === 'function') {
      return window.StorageHelper.hasSessionToken();
    }
    try {
      return !!(window.localStorage.getItem('SESSION_TOKEN') || window.localStorage.getItem('tpk_session_token'));
    } catch (err) {
      return false;
    }
  }

  function getProfile() {
    if (window.StorageHelper && typeof window.StorageHelper.getProfile === 'function') {
      return window.StorageHelper.getProfile();
    }
    try {
      var raw = window.localStorage.getItem('USER_PROFILE') || window.localStorage.getItem('tpk_profile');
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function normalizeRoute(routeName) {
    var value = String(routeName || '').replace(/^#/, '').trim().toLowerCase();
    if (!value) return DEFAULT_ROUTE;

    var aliases = {
      dashboard: 'rekap',
      home: 'rekap',
      beranda: 'rekap',
      daftar: 'sasaran',
      'daftar-sasaran': 'sasaran',
      'sasaran-list': 'sasaran',
      'sinkronisasi': 'sync',
      draft: 'sync'
    };

    return aliases[value] || value;
  }

  function getHashRoute() {
    return normalizeRoute(window.location.hash || DEFAULT_ROUTE);
  }

  function setHash(routeName, replaceState) {
    var nextHash = '#' + normalizeRoute(routeName);
    if (replaceState) {
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, '', nextHash);
      }
    } else if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }

  function hideEl(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('active');
    el.style.display = 'none';
  }

  function showEl(el, displayValue) {
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('active');
    el.style.display = displayValue || '';
  }

  function getShellElements() {
    return {
      splash: document.getElementById('view-splash') || document.getElementById('screen-splash'),
      login: document.getElementById('view-login') || document.getElementById('screen-login'),
      app: document.getElementById('view-app') || document.getElementById('screen-app') || document.getElementById('app-shell')
    };
  }

  function showShell(mode) {
    var shell = getShellElements();
    hideEl(shell.splash);
    if (mode === 'login') {
      showEl(shell.login, '');
      hideEl(shell.app);
      return;
    }
    if (mode === 'app') {
      hideEl(shell.login);
      showEl(shell.app, '');
      return;
    }
    showEl(shell.splash, '');
    hideEl(shell.login);
    hideEl(shell.app);
  }

  function callLegacyRenderer(routeName, profile) {
    if (typeof window.renderKonten === 'function') {
      var legacyMap = {
        rekap: 'rekap',
        registrasi: 'registrasi',
        pendampingan: 'pendampingan',
        sasaran: 'daftar-sasaran',
        sync: 'sinkronisasi',
        profile: 'profil'
      };
      var legacyRoute = legacyMap[routeName] || 'rekap';
      window.renderKonten(legacyRoute, profile || getProfile() || null);
      return true;
    }

    var candidates = {
      rekap: [window.RekapView, window.RekapKaderScreen],
      registrasi: [window.RegistrasiView, window.RegistrasiForm],
      pendampingan: [window.PendampinganView, window.PendampinganForm],
      sasaran: [window.SasaranListView, window.SasaranList],
      sync: [window.SyncScreen, window.SyncView],
      profile: [window.ProfileView]
    }[routeName] || [];

    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = candidates[i];
      if (candidate && typeof candidate.render === 'function') {
        candidate.render(profile || getProfile() || null);
        return true;
      }
      if (candidate && typeof candidate.show === 'function') {
        candidate.show(profile || getProfile() || null);
        return true;
      }
      if (candidate && typeof candidate.init === 'function') {
        candidate.init(profile || getProfile() || null);
        return true;
      }
    }

    return false;
  }

  function updateUiRouteState(routeName) {
    if (window.AppState && typeof window.AppState.setUi === 'function') {
      window.AppState.setUi({ active_screen: routeName });
    }

    var elements = document.querySelectorAll('[data-route-link]');
    for (var i = 0; i < elements.length; i += 1) {
      var el = elements[i];
      var isActive = normalizeRoute(el.getAttribute('data-route-link')) === routeName;
      el.classList.toggle('active', isActive);
      if (isActive) {
        el.setAttribute('aria-current', 'page');
      } else {
        el.removeAttribute('aria-current');
      }
    }
  }

  async function resolveRoute(routeName, options) {
    var route = normalizeRoute(routeName);
    var opts = options || {};
    var authed = hasToken();
    var profile = getProfile();

    if (!authed && route !== 'login') {
      route = 'login';
      setHash(route, true);
    }

    if (authed && route === 'login') {
      route = DEFAULT_ROUTE;
      setHash(route, true);
    }

    if (route === 'login') {
      showShell('login');
      updateUiRouteState('login');
      if (routeHandlers.login) {
        await Promise.resolve(routeHandlers.login({ route: route, profile: profile, authed: authed, options: opts }));
      }
      return route;
    }

    showShell('app');
    updateUiRouteState(route);

    if (routeHandlers[route]) {
      await Promise.resolve(routeHandlers[route]({ route: route, profile: profile, authed: authed, options: opts }));
      return route;
    }

    if (!callLegacyRenderer(route, profile)) {
      callLegacyRenderer(DEFAULT_ROUTE, profile);
      route = DEFAULT_ROUTE;
      setHash(route, true);
      updateUiRouteState(route);
    }

    return route;
  }

  var AppRouter = {
    init: function () {
      if (initialized) return Promise.resolve({ ok: true });

      this.register('login', function () {
        if (window.AuthView && typeof window.AuthView.showLogin === 'function') {
          window.AuthView.showLogin();
        }
      });

      this.register('rekap', function (ctx) { callLegacyRenderer('rekap', ctx.profile); });
      this.register('registrasi', function (ctx) { callLegacyRenderer('registrasi', ctx.profile); });
      this.register('pendampingan', function (ctx) { callLegacyRenderer('pendampingan', ctx.profile); });
      this.register('sasaran', function (ctx) { callLegacyRenderer('sasaran', ctx.profile); });
      this.register('sync', function (ctx) { callLegacyRenderer('sync', ctx.profile); });
      this.register('profile', function (ctx) { callLegacyRenderer('profile', ctx.profile); });

      window.addEventListener('hashchange', function () {
        AppRouter.go(getHashRoute(), { fromHashChange: true, replaceState: true }).catch(function (err) {
          console.warn('[AppRouter] hashchange gagal:', err);
        });
      });

      document.addEventListener('click', function (event) {
        var target = event.target.closest('[data-route-link]');
        if (!target) return;
        event.preventDefault();
        AppRouter.go(target.getAttribute('data-route-link'));
      });

      initialized = true;
      return this.go(getHashRoute(), { replaceState: true });
    },

    register: function (routeName, handler) {
      routeHandlers[normalizeRoute(routeName)] = handler;
      return this;
    },

    go: function (routeName, options) {
      var opts = options || {};
      var route = normalizeRoute(routeName);
      if (!opts.fromHashChange) {
        setHash(route, !!opts.replaceState);
      }
      return resolveRoute(route, opts);
    },

    refresh: function () {
      return resolveRoute(getHashRoute(), { replaceState: true, refreshOnly: true });
    },

    current: function () {
      return getHashRoute();
    },

    goLogin: function () {
      return this.go('login');
    },

    goHome: function () {
      return this.go(DEFAULT_ROUTE);
    }
  };

  window.AppRouter = AppRouter;
})(window, document);
