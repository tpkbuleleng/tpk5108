(function (window, document) {
  'use strict';

  var SCRIPT_CACHE = {};
  var ROUTE_MAP = {
    login: {
      script: './js/views/loginView.js',
      global: 'LoginView',
      methods: ['mount', 'render', 'show', 'init']
    },
    dashboard: {
      script: './js/views/dashboardView.js',
      global: 'DashboardView',
      methods: ['mount', 'render', 'show', 'init', 'refresh']
    },
    rekap: {
      script: './js/views/rekapKaderView.js',
      global: 'RekapKaderView',
      methods: ['mount', 'render', 'show', 'init']
    },
    sasaran: {
      script: './js/views/sasaranListView.js',
      global: 'SasaranListView',
      methods: ['mount', 'render', 'show', 'init']
    },
    sasarandetail: {
      script: './js/views/sasaranDetailView.js',
      global: 'SasaranDetailView',
      methods: ['mount', 'render', 'show', 'init']
    },
    registrasi: {
      script: './js/views/registrasiView.js',
      global: 'RegistrasiView',
      methods: ['mount', 'render', 'show', 'init']
    },
    pendampingan: {
      script: './js/views/pendampinganView.js',
      global: 'PendampinganView',
      methods: ['mount', 'render', 'show', 'init']
    },
    sync: {
      script: './js/views/syncView.js',
      global: 'SyncView',
      methods: ['mount', 'render', 'show', 'init']
    },
    profile: {
      script: './js/views/dashboardView.js',
      global: 'DashboardView',
      methods: ['mount', 'render', 'show', 'init', 'refresh']
    }
  };

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

  function getPreferredRoot() {
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

  function setRootMessage(html) {
    var root = getPreferredRoot();
    if (root) {
      root.innerHTML = html;
    }
  }

  function normalizeRoute(route) {
    var value = String(route || '').trim().toLowerCase();
    value = value.replace(/^#/, '');
    if (!value) return '';
    if (value.indexOf('?') >= 0) value = value.split('?')[0];
    return value;
  }

  function getDefaultRoute() {
    return getSessionToken() ? 'dashboard' : 'login';
  }

  function current() {
    return normalizeRoute(window.location.hash) || getDefaultRoute();
  }

  function resolveRoute(route) {
    var name = normalizeRoute(route) || getDefaultRoute();
    if (ROUTE_MAP[name]) {
      return { name: name, config: ROUTE_MAP[name] };
    }
    return { name: name, config: null };
  }

  function loadScriptOnce(src) {
    if (!src) return Promise.resolve();
    if (SCRIPT_CACHE[src]) return SCRIPT_CACHE[src];

    SCRIPT_CACHE[src] = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-lazy-src="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === '1') {
          resolve();
          return;
        }
        existing.addEventListener('load', function () { resolve(); }, { once: true });
        existing.addEventListener('error', function () { reject(new Error('Gagal memuat ' + src)); }, { once: true });
        return;
      }

      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.lazySrc = src;
      script.onload = function () {
        script.dataset.loaded = '1';
        resolve();
      };
      script.onerror = function () {
        reject(new Error('Gagal memuat ' + src));
      };
      document.body.appendChild(script);
    });

    return SCRIPT_CACHE[src];
  }

  function callView(viewObj, methods, context) {
    if (!viewObj) return false;
    var list = Array.isArray(methods) ? methods : [methods];

    for (var i = 0; i < list.length; i += 1) {
      var methodName = list[i];
      if (typeof viewObj[methodName] === 'function') {
        try {
          var result;
          if (viewObj[methodName].length >= 1) {
            result = viewObj[methodName](context);
          } else {
            result = viewObj[methodName]();
          }
          return Promise.resolve(result).then(function () { return true; });
        } catch (err) {
          return Promise.reject(err);
        }
      }
    }

    return Promise.resolve(false);
  }

  function emitRouteEvent(routeName) {
    try {
      document.dispatchEvent(new CustomEvent('tpk:route-changed', {
        detail: { route: routeName }
      }));
    } catch (err) {}
  }

  function go(route, extra) {
    var resolved = resolveRoute(route);
    var routeName = resolved.name;
    var config = resolved.config;
    var context = {
      route: routeName,
      root: getPreferredRoot(),
      extra: extra || {}
    };

    try {
      window.history.replaceState({}, document.title, '#' + routeName);
    } catch (err) {}

    if (!config) {
      setRootMessage('<div class="tpk-card"><p>Halaman <b>' + routeName + '</b> belum tersedia.</p></div>');
      emitRouteEvent(routeName);
      return Promise.resolve(false);
    }

    return loadScriptOnce(config.script)
      .then(function () {
        var viewObj = window[config.global];
        return callView(viewObj, config.methods, context).then(function (handled) {
          if (!handled && routeName !== 'login') {
            setRootMessage('<div class="tpk-card"><p>View <b>' + config.global + '</b> belum siap.</p></div>');
          }
          emitRouteEvent(routeName);
          return handled;
        });
      })
      .catch(function (err) {
        console.error('Router error:', routeName, err);
        setRootMessage(
          '<div class="tpk-card"><p>Gagal membuka halaman <b>' +
            routeName +
            '</b>.</p><pre style="white-space:pre-wrap;">' +
            String(err && err.message ? err.message : err) +
            '</pre></div>'
        );
        emitRouteEvent(routeName);
        return false;
      });
  }

  function init() {
    return go(current());
  }

  window.Router = {
    init: init,
    go: go,
    current: current,
    resolveRoute: resolveRoute,
    loadScriptOnce: loadScriptOnce
  };
})(window, document);
