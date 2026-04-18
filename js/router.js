(function (window, document) {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
  }

  function getSessionToken() {
    try {
      if (window.Api && typeof window.Api.getSessionToken === 'function') {
        return String(window.Api.getSessionToken() || '').trim();
      }
    } catch (err) {}
    return '';
  }

  function getRootContainer() {
    return (
      byId('module-root') ||
      byId('content-root') ||
      byId('view-root') ||
      byId('screen-root') ||
      byId('konten-app') ||
      byId('screen-container') ||
      byId('app-content') ||
      document.body
    );
  }

  function setRootContent(html) {
    var root = getRootContainer();
    if (!root) return;
    root.innerHTML = html || '';
  }

  function callView(viewObj, methodNames, routeName) {
    if (!viewObj) return false;

    var names = Array.isArray(methodNames) ? methodNames : [methodNames];
    for (var i = 0; i < names.length; i += 1) {
      var method = names[i];
      if (typeof viewObj[method] === 'function') {
        try {
          viewObj[method](routeName);
          return true;
        } catch (err) {
          console.error('Router view error:', routeName, err);
          setRootContent(
            '<div class="tpk-card"><p>Terjadi kesalahan saat membuka halaman <b>' +
              routeName +
              '</b>.</p><pre style="white-space:pre-wrap;">' +
              String(err && err.message ? err.message : err) +
              '</pre></div>'
          );
          return true;
        }
      }
    }

    return false;
  }

  function renderPlaceholder(routeName) {
    setRootContent(
      '<div class="tpk-card"><p>Halaman <b>' +
        routeName +
        '</b> belum tersedia.</p></div>'
    );
  }

  function normalizeRoute(route) {
    var value = String(route || '').trim().toLowerCase();
    if (!value) return '';
    return value.replace(/^#/, '');
  }

  function getDefaultRoute() {
    return getSessionToken() ? 'dashboard' : 'login';
  }

  function resolveRoute(route) {
    var name = normalizeRoute(route) || getDefaultRoute();

    var map = {
      login: {
        view: window.LoginView,
        methods: ['render', 'show', 'init']
      },
      dashboard: {
        view: window.DashboardView,
        methods: ['render', 'show', 'init', 'refresh']
      },
      rekap: {
        view: window.RekapKaderView,
        methods: ['render', 'show', 'init']
      },
      sasaran: {
        view: window.SasaranListView,
        methods: ['render', 'show', 'init']
      },
      sasarandetail: {
        view: window.SasaranDetailView,
        methods: ['render', 'show', 'init']
      },
      registrasi: {
        view: window.RegistrasiView,
        methods: ['render', 'show', 'init']
      },
      pendampingan: {
        view: window.PendampinganView,
        methods: ['render', 'show', 'init']
      },
      sync: {
        view: window.SyncView,
        methods: ['render', 'show', 'init']
      },
      profile: {
        view: window.ProfileView || window.DashboardView,
        methods: ['render', 'show', 'init', 'refresh']
      }
    };

    return map[name] ? { name: name, config: map[name] } : { name: name, config: null };
  }

  function go(route) {
    var resolved = resolveRoute(route);
    var routeName = resolved.name;
    var config = resolved.config;

    try {
      window.history.replaceState({}, document.title, '#' + routeName);
    } catch (err) {}

    if (!config) {
      renderPlaceholder(routeName);
      return;
    }

    var ok = callView(config.view, config.methods, routeName);
    if (!ok) {
      renderPlaceholder(routeName);
    }
  }

  function current() {
    return normalizeRoute(window.location.hash) || getDefaultRoute();
  }

  function init() {
    go(current());
  }

  window.Router = {
    init: init,
    go: go,
    current: current
  };
})(window, document);
