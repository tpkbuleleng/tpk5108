(function (window, document) {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
  }

  function normalizeText(value, fallback) {
    if (value === undefined || value === null || value === '') {
      return fallback !== undefined ? fallback : '-';
    }
    return String(value);
  }

  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(function (el) {
      el.classList.add('hidden');
      el.classList.remove('active');
    });

    var target = byId(screenId);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
      return true;
    }

    return false;
  }

  function setText(id, value, fallback) {
    var el = byId(id);
    if (!el) return;
    el.textContent = normalizeText(value, fallback);
  }

  function setHTML(id, html) {
    var el = byId(id);
    if (!el) return;
    el.innerHTML = html || '';
  }

  function setValue(id, value) {
    var el = byId(id);
    if (!el) return;
    el.value = value !== undefined && value !== null ? value : '';
  }

  function toggleHidden(id, shouldHide) {
    var el = byId(id);
    if (!el) return;
    el.classList.toggle('hidden', shouldHide !== false);
  }

  function setLoading(buttonId, isLoading, loadingText) {
    var btn = byId(buttonId);
    if (!btn) return;

    var nextLoadingText = loadingText || 'Memproses...';

    if (isLoading) {
      if (!btn.dataset.originalText) {
        btn.dataset.originalText = btn.textContent;
      }
      btn.disabled = true;
      btn.textContent = nextLoadingText;
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || btn.textContent;
      delete btn.dataset.originalText;
    }
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function openModal(modalId) {
    var modal = byId(modalId);
    if (!modal) return false;

    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    return true;
  }

  function closeModal(modalId) {
    var modal = byId(modalId);
    if (!modal) return false;

    modal.classList.remove('active');
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    return true;
  }

  function closeAllModals() {
    ['settings-modal', 'profile-modal', 'help-modal'].forEach(closeModal);
  }

  function getText(id, fallback) {
    var el = byId(id);
    if (!el) return fallback !== undefined ? fallback : '-';
    return normalizeText((el.textContent || '').trim(), fallback !== undefined ? fallback : '-');
  }

  function showToast(message, type) {
    var toastContainer = byId('toast-container');
    var toastType = type || 'info';

    if (!toastContainer) {
      try {
        window.alert(message);
      } catch (err) {}
      return;
    }

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + toastType;
    toast.textContent = normalizeText(message, '');

    toastContainer.appendChild(toast);

    window.setTimeout(function () {
      toast.classList.add('hidden');
      window.setTimeout(function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 220);
    }, 2600);
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
      setText(pair[0], getText(pair[1], '-'));
    });
  }

  function getAppVersionText() {
    var footer = byId('footer-app-version');
    var splash = byId('app-version');

    if (footer && footer.textContent && footer.textContent.trim() !== '-') {
      return footer.textContent.trim();
    }

    if (splash && splash.textContent && splash.textContent.trim() !== '-') {
      return splash.textContent.trim();
    }

    if (window.APP_CONFIG && window.APP_CONFIG.APP_VERSION) {
      return String(window.APP_CONFIG.APP_VERSION);
    }

    return '-';
  }

  function syncSettingsVersion() {
    setText('settings-app-version', getAppVersionText(), '-');
  }

  function bindModalButtons() {
    var btnSettings = byId('btn-settings');
    if (btnSettings && btnSettings.dataset.bound !== '1') {
      btnSettings.dataset.bound = '1';
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
      var btn = byId(pair[0]);
      if (!btn || btn.dataset.bound === '1') return;

      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        closeModal(pair[1]);
      });
    });

    ['settings-modal', 'profile-modal', 'help-modal'].forEach(function (id) {
      var modal = byId(id);
      if (!modal || modal.dataset.bound === '1') return;

      modal.dataset.bound = '1';
      modal.addEventListener('click', function (e) {
        if (e.target === modal) {
          closeModal(id);
        }
      });
    });
  }

  function bindEscapeClose() {
    if (document.body.dataset.uiEscapeBound === '1') return;
    document.body.dataset.uiEscapeBound = '1';

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeAllModals();
      }
    });
  }

  function init() {
    syncSettingsVersion();
    syncProfileModalBasic();
    bindModalButtons();
    bindEscapeClose();
  }

  var UI = {
    init: init,
    byId: byId,
    qs: qs,
    qsa: qsa,
    showScreen: showScreen,
    setText: setText,
    setHTML: setHTML,
    setValue: setValue,
    getText: getText,
    toggleHidden: toggleHidden,
    setLoading: setLoading,
    showToast: showToast,
    openModal: openModal,
    closeModal: closeModal,
    closeAllModals: closeAllModals,
    syncProfileModalBasic: syncProfileModalBasic,
    syncSettingsVersion: syncSettingsVersion
  };

  window.UI = UI;

  document.addEventListener('DOMContentLoaded', init);
})(window, document);
