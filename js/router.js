(function (window, document) {
  'use strict';

  var loadedScripts = {};
  var routeMap = {
    login: { file: './js/views/loginView.js', globals: ['LoginView'], methods: ['render', 'show', 'init'] },
    dashboard: { file: './js/views/dashboardView.js', globals: ['DashboardView'], methods: ['render', 'show', 'init', 'refresh'] },
    rekap: { file: './js/views/rekapKaderView.js', globals: ['RekapKaderView'], methods: ['render', 'show', 'init'] },
    sasaran: { file: './js/views/sasaranListView.js', globals: ['SasaranListView'], methods: ['render', 'show', 'init'] },
    sasarandetail: { file: './js/views/sasaranDetailView.js', globals: ['SasaranDetailView'], methods: ['render', 'show', 'init'] },
    registrasi: { file: './js/views/registrasiView.js', globals: ['RegistrasiView'], methods: ['render', 'show', 'init'] },
    pendampingan: { file: './js/views/pendampinganView.js', globals: ['PendampinganView'], methods: ['render', 'show', 'init'] },
    sync: { file: './js/views/syncView.js', globals: ['SyncView'], methods: ['render', 'show', 'init'] },
    profile: { file: './js/views/profileView.js', globals: ['ProfileView'], methods: ['render', 'show', 'init'] }
  };

  function byId(id) { return document.getElementById(id); }

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
    if (root) root.innerHTML = html || '';
  }

  function normalizeRoute(route) {
    var value = String(route || '').trim().toLowerCase();
    if (!value) return '';
    return value.replace(/^#/, '');
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

  function createProfileFallback() {
    return {
      render: function () {
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
        setRootContent(
          '<div class="tpk-card"><h3>Profil Saya</h3><table style="width:100%;border-collapse:collapse;">' +
          rows.map(function (row) {
            return '<tr><td style="padding:8px 10px;font-weight:600;width:180px;">' + row[0] + '</td><td style="padding:8px 10px;">' + row[1] + '</td></tr>';
          }).join('') +
          '</table></div>'
        );
      }
    };
  }

  function callView(viewObj, methods, routeName) {
    var names = Array.isArray(methods) ? methods : [methods];
    var root = getRootContainer();

    for (var i = 0; i < names.length; i += 1) {
      var method = names[i];
      if (viewObj && typeof viewObj[method] === 'function') {
        if (method === 'init') {
          return viewObj[method](routeName, root);
        }
        if (method === 'show') {
          return viewObj[method](routeName, root);
        }
        if (method === 'render') {
          return viewObj[method](routeName, root);
        }
        return viewObj[method](routeName, root);
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

  async function go(route) {
    var routeName = normalizeRoute(route) || getDefaultRoute();
    if (!routeExists(routeName)) {
      renderPlaceholder(routeName);
      return;
    }

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
      var result = callView(viewObj, config.methods, routeName);
      await Promise.resolve(result);
    } catch (err) {
      handleError(routeName, err);
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
    current: current,
    loadScript: loadScript
  };
})(window, document);
