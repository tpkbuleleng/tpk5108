(function (window, document) {
  'use strict';

  var loadedScripts = {};
  var viewRegistry = {
    login: {
      path: './js/views/loginView.js',
      global: 'LoginView',
      methods: ['render', 'show', 'init']
    },
    dashboard: {
      path: './js/views/dashboardView.js',
      global: 'DashboardView',
      methods: ['render', 'show', 'init', 'refresh']
    },
    rekap: {
      path: './js/views/rekapKaderView.js',
      global: 'RekapKaderView',
      methods: ['render', 'show', 'init']
    },
    sasaran: {
      path: './js/views/sasaranListView.js',
      global: 'SasaranListView',
      methods: ['render', 'show', 'init']
    },
    sasarandetail: {
      path: './js/views/sasaranDetailView.js',
      global: 'SasaranDetailView',
      methods: ['render', 'show', 'init']
    },
    registrasi: {
      path: './js/views/registrasiView.js',
      global: 'RegistrasiView',
      methods: ['render', 'show', 'init']
    },
    pendampingan: {
      path: './js/views/pendampinganView.js',
      global: 'PendampinganView',
      methods: ['render', 'show', 'init']
    },
    sync: {
      path: './js/views/syncView.js',
      global: 'SyncView',
      methods: ['render', 'show', 'init']
    },
    profile: {
      path: null,
      global: 'ProfileView',
      methods: ['render', 'show', 'init']
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

  function getDefaultRoute() {
    return getSessionToken() ? 'dashboard' : 'login';
  }

  function normalizeRoute(route) {
    var text = String(route || '').trim().toLowerCase();
    if (!text) return '';
    return text.replace(/^#/, '');
  }

  function getContainer() {
    return (
      byId('module-root') ||
      byId('content-root') ||
      byId('view-root') ||
      byId('screen-root') ||
      byId('screen-container') ||
      byId('konten-app') ||
      byId('app-content') ||
      document.body
    );
  }

  function setContainerHtml(html) {
    var container = getContainer();
    if (container) {
      container.innerHTML = html || '';
    }
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderError(routeName, error) {
    var message = error && error.message ? error.message : String(error || 'Unknown error');
    setContainerHtml(
      '<div class="tpk-card"><p>Gagal membuka halaman <b>' +
        escapeHtml(routeName) +
        '</b>.</p><pre style="white-space:pre-wrap;">' +
        escapeHtml(message) +
        '</pre></div>'
    );
  }

  function renderPlaceholder(routeName) {
    setContainerHtml(
      '<div class="tpk-card"><p>Halaman <b>' +
        escapeHtml(routeName) +
        '</b> belum tersedia.</p></div>'
    );
  }

  function loadScriptOnce(path) {
    return new Promise(function (resolve, reject) {
      if (!path) {
        resolve();
        return;
      }

      if (loadedScripts[path] === true) {
        resolve();
        return;
      }

      if (loadedScripts[path] && typeof loadedScripts[path].then === 'function') {
        loadedScripts[path].then(resolve).catch(reject);
        return;
      }

      var existing = document.querySelector('script[data-router-src="' + path + '"]');
      if (existing && existing.dataset.loaded === '1') {
        loadedScripts[path] = true;
        resolve();
        return;
      }

      var promise = new Promise(function (res, rej) {
        var script = existing || document.createElement('script');
        if (!existing) {
          script.src = path;
          script.async = true;
          script.defer = true;
          script.dataset.routerSrc = path;
          document.body.appendChild(script);
        }

        script.onload = function () {
          script.dataset.loaded = '1';
          loadedScripts[path] = true;
          res();
        };
        script.onerror = function () {
          loadedScripts[path] = false;
          rej(new Error('Gagal memuat script: ' + path));
        };
      });

      loadedScripts[path] = promise;
      promise.then(resolve).catch(reject);
    });
  }

  function getViewObject(routeName, config) {
    if (routeName === 'profile' && !window.ProfileView) {
      return window.DashboardView || null;
    }
    return window[config.global] || null;
  }

  function callView(viewObj, methods, routeName) {
    if (!viewObj) return false;

    var names = Array.isArray(methods) ? methods : [methods];
    for (var i = 0; i < names.length; i += 1) {
      var method = names[i];
      if (typeof viewObj[method] === 'function') {
        return viewObj[method](routeName);
      }
    }

    return false;
  }

  function updateNav(routeName) {
    try {
      var links = document.querySelectorAll('[data-route-link]');
      Array.prototype.forEach.call(links, function (link) {
        var active = String(link.getAttribute('data-route-link') || '').toLowerCase() === routeName;
        link.classList.toggle('is-active', active);
        link.setAttribute('aria-current', active ? 'page' : 'false');
      });
    } catch (err) {}
  }

  function pushHash(routeName) {
    try {
      if (window.location.hash !== '#' + routeName) {
        window.history.replaceState({}, document.title, '#' + routeName);
      }
    } catch (err) {}
  }

  function resolveRoute(route) {
    var name = normalizeRoute(route) || getDefaultRoute();
    return {
      name: name,
      config: viewRegistry[name] || null
    };
  }

  function go(route) {
    var resolved = resolveRoute(route);
    var routeName = resolved.name;
    var config = resolved.config;

    pushHash(routeName);
    updateNav(routeName);

    if (!config) {
      renderPlaceholder(routeName);
      return Promise.resolve(false);
    }

    return loadScriptOnce(config.path)
      .then(function () {
        var viewObj = getViewObject(routeName, config);
        if (!viewObj) {
          renderPlaceholder(routeName);
          return false;
        }
        return Promise.resolve(callView(viewObj, config.methods, routeName));
      })
      .catch(function (error) {
        console.error('Router error:', routeName, error);
        renderError(routeName, error);
        return false;
      });
  }

  function current() {
    return normalizeRoute(window.location.hash) || getDefaultRoute();
  }

  function init() {
    return go(current());
  }

  function bindLinks() {
    document.addEventListener('click', function (event) {
      var link = event.target && event.target.closest ? event.target.closest('[data-route-link]') : null;
      if (!link) return;
      event.preventDefault();
      var routeName = String(link.getAttribute('data-route-link') || '').trim();
      if (routeName) {
        go(routeName);
      }
    });

    window.addEventListener('hashchange', function () {
      go(current());
    });
  }

  window.Router = {
    init: init,
    go: go,
    current: current,
    bindLinks: bindLinks,
    loadScriptOnce: loadScriptOnce
  };
})(window, document);
