(function (window, document) {
  'use strict';

  function initViews() {
    [
      window.LoginView,
      window.DashboardView,
      window.SasaranListView,
      window.SasaranDetailView,
      window.RegistrasiView,
      window.PendampinganView,
      window.SyncView,
      window.RekapKaderView
    ].forEach(function (view) {
      if (view && typeof view.init === 'function') view.init();
    });
  }

  function bindHeaderActions() {
    var logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async function () {
        await window.Auth.logout();
        if (window.UI && window.UI.closeAllModals) window.UI.closeAllModals();
        if (window.LoginView && window.LoginView.clearForm) window.LoginView.clearForm();
        window.AppRouter.goTo((window.AppConfig.SCREENS || {}).LOGIN || 'login-screen');
      });
    }

    var syncBtn = document.getElementById('btn-sync-now-header');
    if (syncBtn) {
      syncBtn.addEventListener('click', async function () {
        if (window.SyncView && typeof window.SyncView.syncAllNow === 'function') {
          await window.SyncView.syncAllNow();
        } else if (window.UI && window.UI.showToast) {
          window.UI.showToast('Halaman sinkronisasi belum siap.', 'warning');
        }
      });
    }
  }

  function exposeAppHooks() {
    if (!window.App) window.App = {};
    window.App.populateProfileForm = function () {
      if (window.DashboardView && typeof window.DashboardView.populateProfileModal === 'function') {
        window.DashboardView.populateProfileModal();
      }
    };
  }

  async function decideInitialScreen() {
    var screens = (window.AppConfig && window.AppConfig.SCREENS) || {};
    var keys = (window.AppConfig && window.AppConfig.STORAGE_KEYS) || {};
    var session = window.Auth.restoreSession();
    var lastScreen = window.AppStorage.get(keys.LAST_SCREEN, '');

    if (session && session.token) {
      if (window.AppBootstrap && typeof window.AppBootstrap.setSplashStatus === 'function') {
        window.AppBootstrap.setSplashStatus('Memvalidasi sesi...');
      }

      var validated = await window.Auth.resumeSession();
      if (validated && validated.ok) {
        var protectedScreens = [
          screens.DASHBOARD,
          screens.SASARAN_LIST,
          screens.SASARAN_DETAIL,
          screens.REGISTRASI,
          screens.PENDAMPINGAN,
          screens.SYNC,
          screens.REKAP
        ];

        window.AppRouter.goTo(
          protectedScreens.indexOf(lastScreen) !== -1 ? lastScreen : screens.DASHBOARD
        );
        return;
      }

      window.Auth.logoutLocal();
      if (window.UI && window.UI.showToast) {
        window.UI.showToast((validated && validated.message) || 'Sesi berakhir. Silakan login kembali.', 'warning');
      }
    }

    window.AppRouter.goTo(screens.LOGIN || 'login-screen');
  }

  async function init() {
    if (window.AppBootstrap && typeof window.AppBootstrap.init === 'function') {
      await window.AppBootstrap.init();
    }
    initViews();
    bindHeaderActions();
    exposeAppHooks();
    await decideInitialScreen();
  }

  document.addEventListener('DOMContentLoaded', init);
  window.AppMain = { init: init };
})(window, document);
