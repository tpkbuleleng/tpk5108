(function (window, document) {
  'use strict';

  var screenToViewMap = {
    'login-screen': 'LoginView',
    'dashboard-screen': 'DashboardView',
    'sasaran-list-screen': 'SasaranListView',
    'sasaran-detail-screen': 'SasaranDetailView',
    'registrasi-screen': 'RegistrasiView',
    'pendampingan-screen': 'PendampinganView',
    'sync-screen': 'SyncView',
    'rekap-kader-screen': 'RekapKaderView'
  };

  function hideAllScreens() {
    var screens = document.querySelectorAll('.screen');
    screens.forEach(function (screen) {
      screen.classList.remove('active');
      screen.classList.add('hidden');
    });
  }

  function getCurrentView() {
    var currentRoute = (window.AppState && window.AppState.getState().currentRoute) || '';
    var viewName = screenToViewMap[currentRoute];
    return viewName ? window[viewName] : null;
  }

  function goTo(screenId, options) {
    var target = document.getElementById(screenId);
    if (!target) return;

    var currentView = getCurrentView();
    if (currentView && typeof currentView.onLeave === 'function') {
      currentView.onLeave();
    }

    hideAllScreens();
    target.classList.remove('hidden');
    target.classList.add('active');

    window.AppState.patch({ currentRoute: screenId });

    var keys = (window.AppConfig && window.AppConfig.STORAGE_KEYS) || {};
    if (window.AppStorage && keys.LAST_SCREEN) {
      window.AppStorage.set(keys.LAST_SCREEN, screenId);
    }

    var nextViewName = screenToViewMap[screenId];
    var nextView = nextViewName ? window[nextViewName] : null;
    if (nextView && typeof nextView.onEnter === 'function') {
      nextView.onEnter(options || {});
    }
  }

  window.AppRouter = {
    hideAllScreens: hideAllScreens,
    goTo: goTo
  };
})(window, document);
