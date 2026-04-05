(function (window, document) {
  'use strict';

  function syncVersionText(version) {
    var text = version || (window.AppConfig && window.AppConfig.APP_VERSION) || '-';
    ['app-version', 'footer-app-version', 'settings-app-version'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    });
  }

  function syncAppName(name) {
    var nextName = name || (window.AppConfig && window.AppConfig.APP_NAME) || document.title;
    document.title = nextName;
  }

  function renderNetworkBadge() {
    var badge = document.getElementById('network-badge');
    if (!badge) return;
    var online = navigator.onLine;
    badge.textContent = online ? 'Online' : 'Offline';
    badge.classList.toggle('topbar-dashboard__status-badge--offline', !online);
    window.AppState.patch({ isOnline: online, syncQueue: window.AppStorage.getQueue() });
  }

  function bindNetworkIndicator() {
    window.addEventListener('online', renderNetworkBadge);
    window.addEventListener('offline', renderNetworkBadge);
    renderNetworkBadge();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js').catch(function () {
      // diamkan pada tahap transisi
    });
  }

  function setSplashStatus(message) {
    var node = document.getElementById('splash-status');
    if (node) node.textContent = message || 'Menyiapkan aplikasi...';
  }

  async function loadReferenceBootstrap() {
    var keys = ((window.AppConfig || {}).STORAGE_KEYS || {});
    var action = ((window.AppConfig || {}).API_ACTIONS || {}).GET_REFERENCE_BOOTSTRAP;

    if (!action) return null;
    try {
      var result = await window.Api.post(action, {});
      if (!(result && result.ok)) return null;

      var data = window.Api.getData(result);
      window.AppStorage.set(keys.APP_BOOTSTRAP, data || {});
      window.AppState.patch({ appBootstrap: data || {} });

      if (data.app_name) syncAppName(data.app_name);
      if (data.app_version) syncVersionText(data.app_version);

      return data;
    } catch (err) {
      return null;
    }
  }

  async function init() {
    syncVersionText();
    syncAppName();
    bindNetworkIndicator();
    registerServiceWorker();
    setSplashStatus('Memuat konfigurasi dan referensi aplikasi...');
    await loadReferenceBootstrap();
  }

  window.AppBootstrap = {
    init: init,
    syncVersionText: syncVersionText,
    syncAppName: syncAppName,
    setSplashStatus: setSplashStatus,
    loadReferenceBootstrap: loadReferenceBootstrap
  };
})(window, document);
