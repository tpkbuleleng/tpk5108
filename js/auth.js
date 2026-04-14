(function (window, document) {
  'use strict';

  var isLoginSubmitting = false;
  var isLogoutInProgress = false;

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

  function getDisplayNomorTim(data) {
    data = data || {};

    var explicitNomor = data.nomor_tim || data.nomor_tim_display || data.nomor_tim_lokal || '';
    if (explicitNomor !== undefined && explicitNomor !== null && String(explicitNomor).trim() !== '') {
      return String(explicitNomor).trim();
    }

    var namaTim = String(data.nama_tim || '').trim();
    if (namaTim) {
      var match = namaTim.match(/(\d+)\s*$/);
      if (match && match[1]) {
        return match[1];
      }
      return namaTim;
    }

    return data.id_tim || '-';
  }


  function getBootstrapLiteStorageKey() {
    if (window.Storage && typeof window.Storage.getBootstrapLiteKey === 'function') {
      return window.Storage.getBootstrapLiteKey();
    }
    return 'tpk_bootstrap_lite';
  }

  function getStoredBootstrapLite() {
    var storage = getStorage();
    if (storage && typeof storage.getBootstrapLite === 'function') {
      return storage.getBootstrapLite({}) || {};
    }
    if (storage && typeof storage.get === 'function') {
      return storage.get(getBootstrapLiteStorageKey(), {}) || {};
    }
    return {};
  }

  function getStoredProfile() {
    var appState = getAppState();
    if (appState && typeof appState.getProfile === 'function') {
      var profileFromState = appState.getProfile();
      if (profileFromState && typeof profileFromState === 'object' && Object.keys(profileFromState).length) {
        return profileFromState;
      }
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    var bootstrapLite = getStoredBootstrapLite();
    var bootstrapProfile = bootstrapLite && bootstrapLite.profile ? bootstrapLite.profile : {};
    var profileFromStorage = {};

    if (storage && typeof storage.get === 'function' && keys.PROFILE) {
      profileFromStorage = storage.get(keys.PROFILE, {}) || {};
    }

    return mergeProfileData(profileFromStorage, bootstrapProfile);
  }

  function mergeProfileData(existingProfile, incomingProfile) {
    var existing = existingProfile && typeof existingProfile === 'object' ? existingProfile : {};
    var incoming = incomingProfile && typeof incomingProfile === 'object' ? incomingProfile : {};
    var merged = Object.assign({}, existing);

    Object.keys(incoming).forEach(function (key) {
      var value = incoming[key];

      if (value === undefined || value === null) return;

      if (typeof value === 'string') {
        var clean = value.trim();
        if (!clean || clean === '-') return;
      }

      merged[key] = value;
    });

    return merged;
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

  function showToast(message, type) {
    if (window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(message, type || 'info');
      return;
    }
    try {
      console.log('[TOAST]', type || 'info', message);
    } catch (err) {}
  }

  function setLoading(isLoading) {
    var btn = qs('loginSubmitBtn');
    if (!btn) return;

    btn.disabled = !!isLoading;
    btn.textContent = isLoading ? 'Memproses...' : 'Masuk';
  }

  function setLogoutLoading(isLoading) {
    var btn = qs('btn-logout');
    if (!btn) return;

    btn.disabled = !!isLoading;
    btn.textContent = isLoading ? 'Keluar...' : 'Keluar';
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

    if (storage && typeof storage.setProfile === 'function') {
      storage.setProfile(data);
    } else if (storage && typeof storage.set === 'function' && keys.PROFILE) {
      storage.set(keys.PROFILE, data);
    }

    if (appState && typeof appState.setProfile === 'function') {
      appState.setProfile(data);
    }
  }

  function saveBootstrapLite(bootstrapLite) {
    var storage = getStorage();
    var data = bootstrapLite && typeof bootstrapLite === 'object' ? bootstrapLite : {};

    if (!storage) return;

    if (typeof storage.setBootstrapLite === 'function') {
      storage.setBootstrapLite(data);
      return;
    }

    if (typeof storage.set === 'function') {
      storage.set(getBootstrapLiteStorageKey(), data);
    }
  }

  function resetProfileUi() {
    setText('profile-nama', '-');
    setText('profile-unsur', '-');
    setText('profile-id', '-');
    setText('profile-tim', '-');
    setText('profile-desa', '-');
    setText('profile-dusun', '-');
    setText('header-kecamatan', '-');
  }

  function clearLocalSession() {
    var storage = getStorage();
    var keys = getStorageKeys();
    var appState = getAppState();

    if (window.Api && typeof window.Api.clearSessionToken === 'function') {
      window.Api.clearSessionToken();
    }

    if (storage && typeof storage.clearSession === 'function') {
      storage.clearSession();
    } else if (storage && typeof storage.remove === 'function') {
      if (keys.SESSION_TOKEN) storage.remove(keys.SESSION_TOKEN);
      if (keys.PROFILE) storage.remove(keys.PROFILE);
      storage.remove(getBootstrapLiteStorageKey());
    }

    if (appState && typeof appState.setProfile === 'function') {
      appState.setProfile({});
    }
  }

  function extractBootstrapLite(loginResult) {
    var data = (loginResult && loginResult.data) || {};
    return data.bootstrap_lite && typeof data.bootstrap_lite === 'object' ? data.bootstrap_lite : {};
  }

  function extractImmediateProfile(loginResult) {
    var data = (loginResult && loginResult.data) || {};
    var bootstrapLite = extractBootstrapLite(loginResult);

    if (bootstrapLite.profile && typeof bootstrapLite.profile === 'object') return bootstrapLite.profile;
    if (data.profile && typeof data.profile === 'object') return data.profile;
    if (data.session && typeof data.session === 'object') return data.session;

    return {};
  }

  async function resolveProfileAfterLogin(loginResult) {
    var bootstrapLite = extractBootstrapLite(loginResult);

    if (bootstrapLite && bootstrapLite.profile && Object.keys(bootstrapLite.profile).length) {
      return bootstrapLite.profile;
    }

    if (window.Api && typeof window.Api.refreshBootstrapLite === 'function') {
      var refreshResult = await window.Api.refreshBootstrapLite({});
      if (refreshResult && refreshResult.ok) {
        var refreshData = refreshResult.data || {};
        var refreshedBootstrapLite = refreshData.bootstrap_lite || {};

        if (refreshedBootstrapLite && Object.keys(refreshedBootstrapLite).length) {
          saveBootstrapLite(refreshedBootstrapLite);
          if (window.AppBootstrap && typeof window.AppBootstrap.applyBootstrapLite === 'function') {
            window.AppBootstrap.applyBootstrapLite(refreshedBootstrapLite);
          }
          return refreshedBootstrapLite.profile || refreshData.profile || refreshData.session || {};
        }

        if (refreshData.profile && typeof refreshData.profile === 'object') {
          return refreshData.profile;
        }
      }
    }

    if (window.Api && typeof window.Api.getMyProfileLite === 'function') {
      var profileLiteResult = await window.Api.getMyProfileLite({});
      if (profileLiteResult && profileLiteResult.ok && profileLiteResult.data) {
        return profileLiteResult.data;
      }
    }

    return {};
  }

  function applyProfileToUi(profile) {
    var data = profile || {};

    setText('profile-nama', data.nama_kader || data.nama_user || data.nama || '-');
    setText('profile-unsur', data.unsur_tpk || data.unsur || '-');
    setText('profile-id', data.id_user || '-');
    setText('profile-tim', getDisplayNomorTim(data));
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

  function openLoginScreen() {
    if (window.Router && typeof window.Router.go === 'function') {
      window.Router.go('login');
      return;
    }

    if (window.AppBootstrap && typeof window.AppBootstrap.openScreen === 'function') {
      window.AppBootstrap.openScreen('login-screen');
      return;
    }

    var screens = document.querySelectorAll('.screen');
    screens.forEach(function (screen) {
      screen.classList.remove('active');
      screen.classList.add('hidden');
    });

    var login = qs('login-screen');
    if (login) {
      login.classList.remove('hidden');
      login.classList.add('active');
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

  function hydrateDashboardAfterLogin(loginResult) {
    Promise.resolve().then(async function () {
      try {
        var resolvedProfile = await resolveProfileAfterLogin(loginResult);

        if (resolvedProfile && Object.keys(resolvedProfile).length) {
          var mergedProfile = mergeProfileData(getStoredProfile(), resolvedProfile);
          saveProfile(mergedProfile);
          applyProfileToUi(mergedProfile);
        }

        if (window.DashboardView && typeof window.DashboardView.refresh === 'function') {
          window.DashboardView.refresh();
        }
      } catch (err) {
        console.warn('Gagal memuat profil lanjutan setelah login:', err && err.message ? err.message : err);
      }
    });
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    if (isLoginSubmitting) return;

    clearMessage();

    var idUser = normalizeIdUser(qs('loginIdUser') && qs('loginIdUser').value);
    var password = normalizePassword(qs('loginPassword') && qs('loginPassword').value);

    var validationMessage = validateLoginForm(idUser, password);
    if (validationMessage) {
      showMessage(validationMessage, 'error');
      return;
    }

    try {
      isLoginSubmitting = true;
      setLoading(true);

      var result = await submitLogin(idUser, password);

      if (!result || result.ok === false) {
  console.log('LOGIN_RESULT', result);
  console.log('LOGIN_STAGE', result && result.data ? result.data.stage : '');
  console.log('LOGIN_ERROR_DETAIL', result && result.data ? result.data.error : '');

  showMessage(
    (result && result.message
      ? result.message + (result.code ? ' [' + result.code + ']' : '')
      : 'Login gagal. Periksa kembali ID dan password.'),
    'error'
  );
  return;
}

      var wajibGantiPassword = !!(result.data && result.data.wajib_ganti_password);
      var bootstrapLite = extractBootstrapLite(result);
      var immediateProfile = extractImmediateProfile(result);
      var mergedImmediateProfile = mergeProfileData(getStoredProfile(), immediateProfile);

      if (bootstrapLite && Object.keys(bootstrapLite).length) {
        saveBootstrapLite(bootstrapLite);
        if (window.AppBootstrap && typeof window.AppBootstrap.applyBootstrapLite === 'function') {
          window.AppBootstrap.applyBootstrapLite(bootstrapLite);
        }
      }

      if (mergedImmediateProfile && Object.keys(mergedImmediateProfile).length) {
        saveProfile(mergedImmediateProfile);
        applyProfileToUi(mergedImmediateProfile);
      }

      openDashboard();

      if (window.DashboardView && typeof window.DashboardView.refresh === 'function') {
        window.DashboardView.refresh();
      }

      setTimeout(function () {
        hydrateDashboardAfterLogin(result);
      }, 0);

      if (wajibGantiPassword) {
        showToast('Login berhasil. Akun ini masih perlu ganti password.', 'warning');
      }
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
      isLoginSubmitting = false;
    }
  }

  async function logout() {
    if (isLogoutInProgress) return;

    isLogoutInProgress = true;
    setLogoutLoading(true);

    var logoutPromise = Promise.resolve();

    try {
      if (window.Api && typeof window.Api.logout === 'function') {
        logoutPromise = window.Api.logout({});
      }
    } catch (err) {
      console.warn('Logout backend gagal dipicu:', err && err.message ? err.message : err);
    }

    try {
      clearLocalSession();
      resetProfileUi();
      clearMessage();

      var passwordInput = qs('loginPassword');
      if (passwordInput) passwordInput.value = '';

      openLoginScreen();
    } finally {
      Promise.resolve(logoutPromise)
        .catch(function (err) {
          console.warn('Logout backend gagal:', err && err.message ? err.message : err);
        })
        .finally(function () {
          setLogoutLoading(false);
          isLogoutInProgress = false;
        });
    }
  }

  function bindLogoutButtons() {
    ['btn-logout'].forEach(function (id) {
      var btn = qs(id);
      if (!btn || btn.dataset.bound === '1') return;

      btn.dataset.bound = '1';
      btn.addEventListener('click', function (event) {
        event.preventDefault();
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
