(function (window, document) {
  'use strict';

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function safeCall(fn, fallback) {
    try {
      return fn();
    } catch (err) {
      console.warn('[Router] Error:', err);
      return fallback;
    }
  }

  function getModuleRoot() {
    return qs('#module-root')
      || qs('#content-root')
      || qs('#view-root')
      || qs('#screen-root')
      || qs('#konten-app')
      || qs('#screen-container')
      || qs('#app-content')
      || qs('main');
  }

  function hasSessionToken() {
    try {
      if (window.Api && typeof window.Api.getSessionToken === 'function') {
        return !!String(window.Api.getSessionToken() || '').trim();
      }
    } catch (err) {}

    try {
      if (window.Storage && typeof window.Storage.getSessionToken === 'function') {
        return !!String(window.Storage.getSessionToken() || '').trim();
      }
    } catch (err) {}

    try {
      return !!String(localStorage.getItem('tpk_session_token') || '').trim();
    } catch (err) {
      return false;
    }
  }

  function normalizeRoute(route) {
    var raw = String(route || '').trim().replace(/^#/, '').toLowerCase();

    if (!raw) return hasSessionToken() ? 'dashboard' : 'login';

    var aliases = {
      home: 'dashboard',
      utama: 'dashboard',
      sync: 'sync',
      sinkronkan: 'sync',
      sinkronisasi: 'sync',
      sasaranlist: 'sasaran',
      daftar-sasaran: 'sasaran',
      daftar_sasaran: 'sasaran',
      rekap-saya: 'rekap',
      rekap_saya: 'rekap',
      pendampinganform: 'pendampingan',
      registrasiform: 'registrasi',
      profil: 'profile'
    };

    return aliases[raw] || raw;
  }

  function getRouteMap() {
    return {
      login: {
        key: 'login',
        hash: '#login',
        title: 'Login',
        viewName: 'LoginView',
        requiresAuth: false
      },
      dashboard: {
        key: 'dashboard',
        hash: '#dashboard',
        title: 'Dashboard',
        viewName: 'DashboardView',
        requiresAuth: true
      },
      rekap: {
        key: 'rekap',
        hash: '#rekap',
        title: 'Rekap Saya',
        viewName: 'RekapKaderView',
        requiresAuth: true
      },
      sasaran: {
        key: 'sasaran',
        hash: '#sasaran',
        title: 'Daftar Sasaran',
        viewName: 'SasaranListView',
        requiresAuth: true
      },
      'sasaran-detail': {
        key: 'sasaran-detail',
        hash: '#sasaran-detail',
        title: 'Detail Sasaran',
        viewName: 'SasaranDetailView',
        requiresAuth: true
      },
      registrasi: {
        key: 'registrasi',
        hash: '#registrasi',
        title: 'Registrasi',
        viewName: 'RegistrasiView',
        requiresAuth: true
      },
      pendampingan: {
        key: 'pendampingan',
        hash: '#pendampingan',
        title: 'Pendampingan',
        viewName: 'PendampinganView',
        requiresAuth: true
      },
      sync: {
        key: 'sync',
        hash: '#sync',
        title: 'Sinkronisasi',
        viewName: 'SyncView',
        requiresAuth: true
      },
      profile: {
        key: 'profile',
        hash: '#profile',
        title: 'Profil',
        viewName: 'DashboardView',
        requiresAuth: true
      }
    };
  }

  function parseHash(hashValue) {
    var raw = String(hashValue || window.location.hash || '').replace(/^#/, '');
    var parts = raw.split('?');
    var route = normalizeRoute(parts[0]);
    var params = {};

    if (parts[1]) {
      parts[1].split('&').forEach(function (pair) {
        var bits = pair.split('=');
        var key = decodeURIComponent(bits[0] || '').trim();
        if (!key) return;
        params[key] = decodeURIComponent(bits.slice(1).join('=') || '');
      });
    }

    return { route: route, params: params };
  }

  function buildHash(routeKey, params) {
    var map = getRouteMap();
    var def = map[normalizeRoute(routeKey)] || map.dashboard;
    var search = new URLSearchParams(params || {}).toString();
    return def.hash + (search ? ('?' + search) : '');
  }

  function updateTitle(routeDef) {
    try {
      if (routeDef && routeDef.title) {
        document.title = routeDef.title + ' - TPK Kabupaten Buleleng';
      }
    } catch (err) {}
  }

  function updateNav(routeKey) {
    qsa('[data-route-link]').forEach(function (el) {
      var match = normalizeRoute(el.getAttribute('data-route-link')) === normalizeRoute(routeKey);
      el.classList.toggle('is-active', !!match);
      el.setAttribute('aria-current', match ? 'page' : 'false');
    });
  }

  function toggleShell(isLoginRoute) {
    var header = qs('.tpk-header');
    var nav = qs('.tpk-nav');
    var main = qs('#main-content') || qs('.tpk-main');
    var loginSection = qs('#login-screen') || qs('#loginScreen') || qs('.tpk-login') || qs('.login-screen');

    if (header) header.style.display = isLoginRoute ? 'none' : '';
    if (nav) nav.style.display = isLoginRoute ? 'none' : '';
    if (main) main.style.display = isLoginRoute ? 'none' : '';
    if (loginSection) loginSection.style.display = isLoginRoute ? '' : 'none';
  }

  function renderPlaceholder(routeDef, note) {
    var root = getModuleRoot();
    if (!root) return;

    root.innerHTML = ''
      + '<div class="tpk-card tpk-card--placeholder" style="padding:16px;">'
      + '<strong>' + (routeDef && routeDef.title ? routeDef.title : 'Modul') + '</strong>'
      + '<div style="margin-top:8px;color:#5c708f;">'
      + (note || 'Modul belum siap dimuat.')
      + '</div>'
      + '</div>';
  }

  function tryViewMethod(view, methodName, ctx) {
    if (!view || typeof view[methodName] !== 'function') return { handled: false };
    var result = safeCall(function () {
      return view[methodName](ctx);
    });
    return { handled: true, result: result };
  }

  function renderView(routeDef, params) {
    if (!routeDef) return;

    if (routeDef.key === 'login') {
      toggleShell(true);
      updateTitle(routeDef);
      updateNav(routeDef.key);
      return;
    }

    toggleShell(false);

    var root = getModuleRoot();
    if (!root) return;

    var view = window[routeDef.viewName];
    if (!view) {
      renderPlaceholder(routeDef, 'File view dimuat tetapi objek global belum ditemukan: ' + routeDef.viewName);
      return;
    }

    var ctx = {
      route: routeDef.key,
      params: params || {},
      root: root
    };

    var methods = ['init', 'mount', 'render', 'show', 'open'];
    var handled = false;
    var result;

    for (var i = 0; i < methods.length; i += 1) {
      var out = tryViewMethod(view, methods[i], ctx);
      if (out.handled) {
        handled = true;
        result = out.result;
        if (methods[i] === 'render' || methods[i] === 'mount') break;
      }
    }

    if (!handled) {
      renderPlaceholder(routeDef, 'Objek view ditemukan, tetapi tidak memiliki method init/mount/render/show/open.');
      return;
    }

    if (typeof result === 'string') {
      root.innerHTML = result;
    } else if (result && result.nodeType === 1) {
      root.innerHTML = '';
      root.appendChild(result);
    }

    if (typeof view.afterRender === 'function') {
      safeCall(function () { view.afterRender(ctx); });
    }

    updateTitle(routeDef);
    updateNav(routeDef.key);
  }

  function resolveRoute(routeKey) {
    var map = getRouteMap();
    var key = normalizeRoute(routeKey);
    var def = map[key] || map.dashboard;

    if (def.requiresAuth && !hasSessionToken()) {
      return map.login;
    }
    return def;
  }

  function go(routeKey, params, replace) {
    var def = resolveRoute(routeKey);
    var hash = buildHash(def.key, params);

    if (replace) {
      if (window.location.hash !== hash) {
        window.history.replaceState({}, document.title, hash);
      }
      renderView(def, params || {});
      return;
    }

    if (window.location.hash === hash) {
      renderView(def, params || {});
      return;
    }

    window.location.hash = hash;
  }

  function onHashChange() {
    var parsed = parseHash(window.location.hash);
    var def = resolveRoute(parsed.route);
    renderView(def, parsed.params);
  }

  function bindLinkClicks() {
    if (document.body.dataset.routerBound === '1') return;
    document.body.dataset.routerBound = '1';

    document.addEventListener('click', function (event) {
      var el = event.target && event.target.closest
        ? event.target.closest('[data-route-link], a[href^="#"]')
        : null;
      if (!el) return;

      var route = el.getAttribute('data-route-link');
      if (!route) {
        var href = el.getAttribute('href') || '';
        if (href.indexOf('#') === 0) {
          route = href.slice(1);
        }
      }

      if (!route) return;

      event.preventDefault();
      go(route);
    });
  }

  function init() {
    bindLinkClicks();
    window.addEventListener('hashchange', onHashChange);

    var parsed = parseHash(window.location.hash);
    var def = resolveRoute(parsed.route);

    if (!window.location.hash) {
      go(def.key, parsed.params, true);
      return;
    }

    renderView(def, parsed.params);
  }

  window.Router = {
    init: init,
    go: go,
    refresh: onHashChange,
    parseHash: parseHash,
    resolveRoute: resolveRoute
  };
})(window, document);
