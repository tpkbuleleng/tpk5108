(function (window, document) {
  'use strict';

  function qs(id) {
    return document.getElementById(id);
  }

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function getActions() {
    return getConfig().API_ACTIONS || {};
  }

  function getStorage() {
    return window.Storage || null;
  }

  function getAppState() {
    return window.AppState || null;
  }

  function setText(id, value) {
    var el = qs(id);
    if (!el) return;
    el.textContent = (value === undefined || value === null || value === '') ? '-' : String(value);
  }

  function showMessage(message, type) {
    var box = qs('loginMessage');
    if (!box) return;

    box.textContent = message || '';
    box.classList.remove('hidden', 'error', 'success');
    box.classList.add(type === 'success' ? 'success' : 'error');
  }

  function clearMessage() {
    var box = qs('loginMessage');
    if (!box) return;

    box.textContent = '';
    box.classList.add('hidden');
    box.classList.remove('error', 'success');
  }

  function setLoading(isLoading) {
    var btn = qs('loginSubmitBtn');
    if (!btn) return;

    btn.disabled = !!isLoading;
    btn.textContent = isLoading ? 'Memproses...' : 'Masuk';
  }

  function normalizeIdUser(value) {
    return String(value || '').trim().toUpperCase();
  }

  function normalizePassword(value) {
    return String(value || '').trim();
  }

  function validateLoginForm(idUser, password) {
    if (!idUser) return 'ID Kader wajib diisi.';
    if (!password) return 'Password wajib diisi.';
    return '';
  }

  function setupLogo() {
    var logo = qs('loginLogo');
    if (!logo) return;

    var config = getConfig();
    var logoUrl = config.ASSETS && config.ASSETS.LOGO_URL
      ? config.ASSETS.LOGO_URL
      : './assets/img/logo.png';

    logo.src = logoUrl;
  }

  function setupPasswordToggle() {
    var passwordInput = qs('loginPassword');
    var toggleBtn = qs('togglePasswordBtn');

    if (!passwordInput || !toggleBtn || toggleBtn.dataset.bound === '1') return;

    toggleBtn.dataset.bound = '1';

    toggleBtn.addEventListener('click', function () {
      var isPassword = passwordInput.getAttribute('type') === 'password';

      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      toggleBtn.setAttribute(
        'aria-label',
        isPassword ? 'Sembunyikan password' : 'Lihat password'
      );
      toggleBtn.setAttribute(
        'title',
        isPassword ? 'Sembunyikan password' : 'Lihat password'
      );
    });
  }

  function saveProfile(profile) {
    var storage = getStorage();
    var appState = getAppState();
    var keys = getStorageKeys();
    var data = profile || {};

    if (storage && typeof storage.set === 'function' && keys.PROFILE) {
      storage.set(keys.PROFILE, data);
    }

    if (appState && typeof appState.setProfile === 'function') {
      appState.setProfile(data);
    }
  }

  function clearLocalSession() {
    var storage = getStorage();
    var keys = getStorageKeys();

    if (window.Api && typeof window.Api.clearSessionToken === 'function') {
      window.Api.clearSessionToken();
    }

    if (storage && typeof storage.remove === 'function') {
      if (keys.SESSION_TOKEN) storage.remove(keys.SESSION_TOKEN);
      if (keys.PROFILE) storage.remove(keys.PROFILE);
    }
  }

  async function resolveProfileAfterLogin(loginResult) {
    var data = (loginResult && loginResult.data) || {};
    var actions = getActions();

    if (data.profile && typeof data.profile === 'object') {
      return data.profile;
    }

    if (data.session && typeof data.session === 'object') {
      return data.session;
    }

    if (window.Api && actions.BOOTSTRAP_SESSION) {
      var sessionResult = await window.Api.post(actions.BOOTSTRAP_SESSION, {}, {
        includeAuth: true
      });

      if (sessionResult && sessionResult.ok) {
        var sessionData = sessionResult.data || {};
        if (sessionData.profile && typeof sessionData.profile === 'object') {
          return sessionData.profile;
        }
        if (sessionData.session && typeof sessionData.session === 'object') {
          return sessionData.session;
        }
      }
    }

    if (window.Api && actions.GET_MY_PROFILE) {
      var profileResult = await window.Api.post(actions.GET_MY_PROFILE, {}, {
        includeAuth: true
      });

      if (profileResult && profileResult.ok && profileResult.data) {
        return profileResult.data;
      }
    }

    return {};
  }

  function applyProfileToUi(profile) {
    var data = profile || {};

    setText('profile-nama', data.nama_kader || data.nama_user || data.nama || '-');
    setText('profile-unsur', data.unsur_tpk || data.unsur || '-');
    setText('profile-id', data.id_user || '-');
    setText('profile-tim', data.nama_tim || data.id_tim || '-');
    setText('profile-desa', data.desa_kelurahan || data.nama_desa || '-');
    setText('profile-dusun', data.dusun_rw || data.nama_dusun || '-');
    setText('header-kecamatan', data.nama_kecamatan || data.kecamatan || '-');

    if (window.AppBootstrap && typeof window.AppBootstrap.applyProfileToUi === 'function') {
      window.AppBootstrap.applyProfileToUi(data);
    }
  }

  function openDashboard() {
    if (window.Router && typeof window.Router.go === 'function') {
      window.Router.go('dashboard');
      return;
    }

    if (window.AppBootstrap && typeof window.AppBootstrap.openScreen === 'function') {
      window.AppBootstrap.openScreen('dashboard-screen');
      return;
    }

    var screens = document.querySelectorAll('.screen');
    screens.forEach(function (screen) {
      screen.classList.remove('active');
      screen.classList.add('hidden');
    });

    var dashboard = qs('dashboard-screen');
    if (dashboard) {
      dashboard.classList.remove('hidden');
      dashboard.classList.add('active');
    }
  }

  async function submitLogin(idUser, password) {
    if (!window.Api || typeof window.Api.login !== 'function') {
      throw new Error('Api.login belum tersedia.');
    }

    return window.Api.login({
      id_user: idUser,
      password: password
    });
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();

    clearMessage();

    var idUser = normalizeIdUser(qs('loginIdUser') && qs('loginIdUser').value);
    var password = normalizePassword(qs('loginPassword') && qs('loginPassword').value);

    var validationMessage = validateLoginForm(idUser, password);
    if (validationMessage) {
      showMessage(validationMessage, 'error');
      return;
    }

    try {
      setLoading(true);

      var result = await submitLogin(idUser, password);

      if (!result || result.ok === false) {
        showMessage(
          (result && result.message) || 'Login gagal. Periksa kembali ID dan password.',
          'error'
        );
        return;
      }

      var wajibGantiPassword = !!(result.data && result.data.wajib_ganti_password);
      var profile = await resolveProfileAfterLogin(result);

      saveProfile(profile);
      applyProfileToUi(profile);

      showMessage('Login berhasil.', 'success');

      if (wajibGantiPassword) {
        setTimeout(function () {
          showMessage(
            'Login berhasil, tetapi fitur ganti password belum dipetakan ke struktur baru.',
            'error'
          );
        }, 700);
      }

      setTimeout(function () {
        openDashboard();
      }, 450);
    } catch (error) {
      console.error('LOGIN_ERROR', error);

      showMessage(
        'Koneksi ke backend gagal atau respons tidak valid.',
        'error'
      );

      if (window.Api && typeof window.Api.reportClientError === 'function') {
        window.Api.reportClientError('LOGIN_ERROR', {
          source: 'auth.js',
          detail: error && error.message ? error.message : String(error)
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      if (window.Api && typeof window.Api.logout === 'function') {
        await window.Api.logout({});
      }
    } catch (err) {
      console.warn('Logout backend gagal:', err && err.message ? err.message : err);
    } finally {
      clearLocalSession();

      if (window.AppBootstrap && typeof window.AppBootstrap.openScreen === 'function') {
        window.AppBootstrap.openScreen('login-screen');
      } else if (window.Router && typeof window.Router.go === 'function') {
        window.Router.go('login');
      }
    }
  }

  function bindLogoutButtons() {
    ['btn-logout'].forEach(function (id) {
      var btn = qs(id);
      if (!btn || btn.dataset.bound === '1') return;

      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        logout();
      });
    });
  }

  function initLoginPage() {
    var form = qs('loginForm');
    setupLogo();
    setupPasswordToggle();
    bindLogoutButtons();

    if (!form || form.dataset.bound === '1') return;

    form.dataset.bound = '1';
    form.addEventListener('submit', handleLoginSubmit);
  }

  var Auth = {
    init: initLoginPage,
    login: submitLogin,
    logout: logout,
    clearLocalSession: clearLocalSession
  };

  window.Auth = Auth;

  document.addEventListener('DOMContentLoaded', initLoginPage);
})(window, document);
