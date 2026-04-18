(function (window, document) {
  'use strict';

  var loadedScripts = {};
  var currentRoute = '';
  var routeLinksBound = false;

  var routeMap = {
    login: { file: './js/views/loginView.js', globals: ['LoginView'], methods: ['mount', 'render', 'show', 'init'] },
    dashboard: { file: './js/views/dashboardView.js', globals: ['DashboardView'], methods: ['mount', 'render', 'show', 'init', 'refresh'] },
    rekap: { file: './js/views/rekapKaderView.js', globals: ['RekapKaderView'], methods: ['mount', 'render', 'show', 'init'] },
    sasaran: { file: './js/views/sasaranListView.js', globals: ['SasaranListView'], methods: ['mount', 'render', 'show', 'init'] },
    sasarandetail: { file: './js/views/sasaranDetailView.js', globals: ['SasaranDetailView'], methods: ['mount', 'render', 'show', 'init'] },
    registrasi: { file: './js/views/registrasiView.js', globals: ['RegistrasiView', 'RegistrasiForm'], methods: ['mount', 'render', 'show', 'init'] },
    pendampingan: { file: './js/views/pendampinganView.js', globals: ['PendampinganView'], methods: ['mount', 'render', 'show', 'init'] },
    sync: { file: './js/views/syncView.js', globals: ['SyncView'], methods: ['mount', 'render', 'show', 'init'] },
    profile: { file: './js/views/profileView.js', globals: ['ProfileView'], methods: ['mount', 'render', 'show', 'init'] }
  };

  var routeAliases = {
    '': '',
    login: 'login',
    dashboard: 'dashboard',
    home: 'dashboard',

    rekap: 'rekap',
    rekapkader: 'rekap',
    rekapsaya: 'rekap',

    sasaran: 'sasaran',
    sasaranlist: 'sasaran',
    daftarsasaran: 'sasaran',

    sasarandetail: 'sasarandetail',
    detailsasaran: 'sasarandetail',

    registrasi: 'registrasi',

    pendampingan: 'pendampingan',

    sync: 'sync',
    sinkronisasi: 'sync',
    sinkronkan: 'sync',

    profile: 'profile',
    profil: 'profile'
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

    try {
      if (window.Storage && typeof window.Storage.get === 'function' && window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS) {
        return String(window.Storage.get(window.APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN, '') || '').trim();
      }
    } catch (err2) {}

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
      byId('content-area') ||
      document.body
    );
  }

  function setRootContent(html) {
    var root = getRootContainer();
    if (root) root.innerHTML = html || '';
  }

  function normalizeRoute(route) {
    var value = String(route || '').trim().toLowerCase();
    if (!value) return '';
    value = value.replace(/^#/, '').replace(/[^a-z0-9]+/g, '');
    return routeAliases[value] || value;
  }

  function getDefaultRoute() {
    return getSessionToken() ? 'dashboard' : 'login';
  }

  function routeExists(name) {
    return !!routeMap[name];
  }

  function loadScript(url) {
    if (!url) return Promise.resolve();
    if (loadedScripts[url] === true) return Promise.resolve();
    if (loadedScripts[url] && typeof loadedScripts[url].then === 'function') return loadedScripts[url];

    loadedScripts[url] = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = function () {
        loadedScripts[url] = true;
        resolve();
      };
      script.onerror = function () {
        loadedScripts[url] = false;
        reject(new Error('Gagal memuat script: ' + url));
      };
      document.body.appendChild(script);
    });

    return loadedScripts[url];
  }

  function createProfileFallback() {
    return {
      render: function (root) {
        var appState = window.AppState;
        var profile = {};
        try {
          if (appState && typeof appState.getProfile === 'function') {
            profile = appState.getProfile() || {};
          }
        } catch (err) {}

        var rows = [
          ['Nama', profile.nama_kader || profile.nama_user || profile.nama || '-'],
          ['ID User', profile.id_user || '-'],
          ['Unsur TPK', profile.unsur_tpk || profile.unsur || '-'],
          ['Nomor Tim', profile.nomor_tim || profile.nomor_tim_display || profile.id_tim || '-'],
          ['Kecamatan', profile.nama_kecamatan || profile.kecamatan || '-'],
          ['Desa/Kelurahan', profile.desa_kelurahan || profile.nama_desa || '-'],
          ['Dusun/RW', profile.dusun_rw || profile.nama_dusun || '-']
        ];

        var html = '<div class="tpk-card"><h3>Profil Saya</h3><table style="width:100%;border-collapse:collapse;">' +
          rows.map(function (row) {
            return '<tr><td style="padding:8px 10px;font-weight:600;width:180px;">' + row[0] + '</td><td style="padding:8px 10px;">' + row[1] + '</td></tr>';
          }).join('') +
          '</table></div>';

        if (root && typeof root.innerHTML !== 'undefined') {
          root.innerHTML = html;
          return root;
        }
        return html;
      }
    };
  }

  function getViewObject(config) {
    var names = (config && config.globals) || [];
    for (var i = 0; i < names.length; i += 1) {
      if (window[names[i]]) return window[names[i]];
    }

    if (config === routeMap.profile) {
      return window.ProfileView || createProfileFallback();
    }

    return null;
  }

  function invokeViewMethod(viewObj, method, routeName, root, config) {
    var fn = viewObj && viewObj[method];
    if (typeof fn !== 'function') return undefined;

    var ctx = { route: routeName, root: root, config: config };

    if (method === 'mount') {
      return fn.call(viewObj, root, ctx);
    }

    if (method === 'render') {
      var result = fn.call(viewObj, root, ctx, routeName);
      if (typeof result === 'string') {
        setRootContent(result);
      }
      if (typeof viewObj.afterRender === 'function') {
        return Promise.resolve(result).then(function () {
          return viewObj.afterRender(root, ctx);
        });
      }
      return result;
    }

    if (method === 'show') {
      return fn.call(viewObj, routeName, root, ctx);
    }

    if (method === 'init') {
      return fn.call(viewObj, routeName, root, ctx);
    }

    return fn.call(viewObj, routeName, root, ctx);
  }

  function callView(viewObj, methods, routeName, config) {
    var names = Array.isArray(methods) ? methods : [methods];
    var root = getRootContainer();

    for (var i = 0; i < names.length; i += 1) {
      var method = names[i];
      if (viewObj && typeof viewObj[method] === 'function') {
        return invokeViewMethod(viewObj, method, routeName, root, config);
      }
    }

    return undefined;
  }

  function renderPlaceholder(routeName, message) {
    setRootContent('<div class="tpk-card"><p>' + (message || ('Halaman ' + routeName + ' belum tersedia.')) + '</p></div>');
  }

  function updateActiveLinks(routeName) {
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-route-link]'));
    links.forEach(function (link) {
      var name = normalizeRoute(link.getAttribute('data-route-link'));
      if (name === routeName) link.classList.add('is-active');
      else link.classList.remove('is-active');
    });
  }

  function handleError(routeName, err) {
    console.error('Router error:', routeName, err);
    renderPlaceholder(routeName, 'Gagal membuka halaman <b>' + routeName + '</b>.');
  }

  function setCurrentRoute(routeName) {
    currentRoute = routeName || '';
    try {
      if (window.AppState && typeof window.AppState.setCurrentRoute === 'function') {
        window.AppState.setCurrentRoute(currentRoute);
      } else if (window.AppState) {
        window.AppState.currentRoute = currentRoute;
      }
    } catch (err) {}
  }

  async function go(route) {
    var routeName = normalizeRoute(route) || getDefaultRoute();
    if (!routeExists(routeName)) {
      renderPlaceholder(routeName);
      return;
    }

    setCurrentRoute(routeName);

    try {
      if (window.location.hash !== '#' + routeName) {
        window.history.replaceState({}, document.title, '#' + routeName);
      }
    } catch (err) {}

    updateActiveLinks(routeName);

    var config = routeMap[routeName];
    try {
      await loadScript(config.file);
      var viewObj = getViewObject(config);
      if (!viewObj) {
        renderPlaceholder(routeName, 'Halaman ' + routeName + ' belum tersedia.');
        return;
      }
      var result = callView(viewObj, config.methods, routeName, config);
      await Promise.resolve(result);
    } catch (err2) {
      handleError(routeName, err2);
    }
  }

  function current() {
    return currentRoute || normalizeRoute(window.location.hash) || getDefaultRoute();
  }

  function bindRouteLinks() {
    if (routeLinksBound) return;
    routeLinksBound = true;

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-route-link]');
      if (!trigger) return;

      var targetRoute = trigger.getAttribute('data-route-link');
      if (!targetRoute) return;

      event.preventDefault();
      go(targetRoute);
    });
  }

  function init() {
    bindRouteLinks();
    go(normalizeRoute(window.location.hash) || getDefaultRoute());
  }

  window.Router = {
    init: init,
    go: go,
    current: current,
    getCurrentRoute: current,
    loadScript: loadScript,
    bindRouteLinks: bindRouteLinks,

    toLogin: function () { return go('login'); },
    toDashboard: function () { return go('dashboard'); },
    toRekapKader: function () { return go('rekap'); },
    toSasaranList: function () { return go('sasaran'); },
    toSasaranDetail: function () { return go('sasarandetail'); },
    toRegistrasi: function () { return go('registrasi'); },
    toPendampingan: function () { return go('pendampingan'); },
    toSync: function () { return go('sync'); },
    toProfile: function () { return go('profile'); }
  };

  Object.defineProperty(window.Router, 'currentRoute', {
    get: function () {
      return current();
    }
  });
})(window, document);
