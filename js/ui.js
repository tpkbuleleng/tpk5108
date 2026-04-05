(function () {
  'use strict';

  var STORAGE_FONT_KEY = 'tpk_app_font_size';

  function $(id) {
    return document.getElementById(id);
  }

  function showToast(message, type) {
    if (window.Notifier && typeof window.Notifier.show === 'function') {
      window.Notifier.show(message, type || 'info');
      return;
    }
    if (window.UIHelpers && typeof window.UIHelpers.showToast === 'function') {
      window.UIHelpers.showToast(message, type || 'info');
      return;
    }
    alert(message);
  }

  function openModal(modalId) {
    var modal = $(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modalId) {
    var modal = $(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  function closeAllModals() {
    ['settings-modal', 'profile-modal', 'help-modal'].forEach(closeModal);
  }

  function getText(id) {
    var el = $(id);
    return el ? (el.textContent || '-').trim() : '-';
  }

  function syncProfileModalBasic() {
    var mappings = [
      ['modal-profile-nama', 'profile-nama'],
      ['modal-profile-id', 'profile-id'],
      ['modal-profile-unsur', 'profile-unsur'],
      ['modal-profile-tim', 'profile-tim'],
      ['modal-profile-desa', 'profile-desa'],
      ['modal-profile-dusun', 'profile-dusun'],
      ['modal-profile-kecamatan', 'header-kecamatan']
    ];

    mappings.forEach(function (pair) {
      var target = $(pair[0]);
      var sourceValue = getText(pair[1]);
      if (target) target.textContent = sourceValue;
    });
  }

  function getAppVersionText() {
    var footer = $('footer-app-version');
    var splash = $('app-version');

    if (footer && footer.textContent && footer.textContent.trim() !== '-') {
      return footer.textContent.trim();
    }

    if (splash && splash.textContent && splash.textContent.trim() !== '-') {
      return splash.textContent.trim();
    }

    if (window.AppConfig && window.AppConfig.APP_VERSION) {
      return String(window.AppConfig.APP_VERSION);
    }

    return '-';
  }

  function syncSettingsVersion() {
    var versionEl = $('settings-app-version');
    if (versionEl) versionEl.textContent = getAppVersionText();
  }

  function applyFontSize(size) {
    var body = document.body;
    body.classList.remove('app-size-standard', 'app-size-large', 'app-size-xlarge');

    if (size === 'large') {
      body.classList.add('app-size-large');
    } else if (size === 'xlarge') {
      body.classList.add('app-size-xlarge');
    } else {
      body.classList.add('app-size-standard');
      size = 'standard';
    }

    try {
      localStorage.setItem(STORAGE_FONT_KEY, size);
    } catch (e) {}
  }

  function loadSavedFontSize() {
    try {
      return localStorage.getItem(STORAGE_FONT_KEY) || 'standard';
    } catch (e) {
      return 'standard';
    }
  }

  function bindFontSizeSetting() {
    var select = $('setting-font-size');
    if (!select) return;

    var saved = loadSavedFontSize();
    select.value = saved;
    applyFontSize(saved);

    select.addEventListener('change', function () {
      applyFontSize(select.value);
      showToast('Ukuran tampilan diperbarui.', 'success');
    });
  }

  function bindModalButtons() {
    var btnSettings = $('btn-settings');
    if (btnSettings) {
      btnSettings.addEventListener('click', function () {
        syncSettingsVersion();
        openModal('settings-modal');
      });
    }

    [
      ['btn-close-settings', 'settings-modal'],
      ['btn-close-profile', 'profile-modal'],
      ['btn-close-profile-bottom', 'profile-modal'],
      ['btn-close-help', 'help-modal'],
      ['btn-close-help-bottom', 'help-modal']
    ].forEach(function (pair) {
      var btn = $(pair[0]);
      if (btn) {
        btn.addEventListener('click', function () {
          closeModal(pair[1]);
        });
      }
    });

    ['settings-modal', 'profile-modal', 'help-modal'].forEach(function (id) {
      var modal = $(id);
      if (!modal) return;
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal(id);
      });
    });
  }

  function bindSettingsActions() {
    var btnRefresh = $('btn-refresh-app');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', function () {
        showToast('Memuat ulang aplikasi...', 'info');
        setTimeout(function () {
          window.location.reload();
        }, 250);
      });
    }

    var btnResetCache = $('btn-reset-light-cache');
    if (btnResetCache) {
      btnResetCache.addEventListener('click', async function () {
        try {
          if ('caches' in window) {
            var keys = await caches.keys();
            await Promise.all(
              keys.map(function (key) {
                if (
                  key.indexOf('workbox') !== -1 ||
                  key.indexOf('app-shell') !== -1 ||
                  key.indexOf('static') !== -1 ||
                  key.indexOf('runtime') !== -1
                ) {
                  return caches.delete(key);
                }
                return Promise.resolve(false);
              })
            );
          }

          showToast('Cache ringan berhasil dibersihkan.', 'success');
        } catch (err) {
          showToast('Reset cache ringan tidak berhasil dijalankan.', 'warning');
        }
      });
    }
  }

  function bindKeyboardClose() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllModals();
    });
  }

  function exposeGlobalHooks() {
    if (!window.App) window.App = {};

    window.App.openProfileDialog = function () {
      syncProfileModalBasic();
      if (window.App.populateProfileForm) {
        window.App.populateProfileForm();
      }
      openModal('profile-modal');
    };

    window.App.openHelpDialog = function () {
      openModal('help-modal');
    };

    window.App.openSettingsDialog = function () {
      syncSettingsVersion();
      openModal('settings-modal');
    };

    window.App.closeAllModals = closeAllModals;
  }

  function initUi() {
    syncSettingsVersion();
    syncProfileModalBasic();
    bindFontSizeSetting();
    bindModalButtons();
    bindSettingsActions();
    bindKeyboardClose();
    exposeGlobalHooks();
  }

  document.addEventListener('DOMContentLoaded', initUi);

  window.UI = {
    init: initUi,
    openModal: openModal,
    closeModal: closeModal,
    closeAllModals: closeAllModals,
    syncSettingsVersion: syncSettingsVersion,
    syncProfileModalBasic: syncProfileModalBasic,
    showToast: showToast
  };
})();
