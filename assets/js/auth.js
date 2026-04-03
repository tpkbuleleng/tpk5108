window.Auth = {
  async login(idKader, password) {
    return Api.post(
      'login',
      {
        id_kader: String(idKader || '').trim(),
        password: String(password || '').trim()
      },
      { skipToken: true }
    );
  },

  handleLoginSuccess(result) {
    const data = result?.data || {};

    const token =
      data.session_token ||
      data.token ||
      '';

    const profile =
      data.profile ||
      data.user ||
      null;

    const bootstrap =
      data.bootstrap_refs ||
      data.bootstrap ||
      null;

    Session.setToken(token);
    Session.setProfile(profile);

    if (bootstrap) {
      StorageHelper.set(APP_CONFIG.STORAGE_KEYS.BOOTSTRAP, bootstrap);
    }

    return {
      token,
      profile,
      bootstrap
    };
  },

  logout() {
    try {
      Session.logout?.();
    } catch (_) {
      try {
        Session.clear?.();
      } catch (_) {}
    }

    try {
      SasaranState?.clearSelected?.();
      SasaranState?.clearList?.();
    } catch (_) {}

    try {
      PendampinganState?.reset?.();
    } catch (_) {}

    try {
      DraftManager?.clearRegistrasiDraft?.();
    } catch (_) {}

    try {
      PendampinganDraft?.clearLocal?.();
    } catch (_) {}

    try {
      Router?.toLogin?.();
    } catch (_) {
      UI.showScreen('login-screen');
    }
  },

  guard() {
    const loggedIn = Session.isLoggedIn?.();

    if (loggedIn) {
      return true;
    }

    try {
      Router?.toLogin?.();
    } catch (_) {
      UI.showScreen('login-screen');
    }

    return false;
  }
};

(function () {
  const CONFIG = window.APP_CONFIG || {};
  const STORAGE_KEYS = CONFIG.STORAGE_KEYS || {};

  function qs(id) {
    return document.getElementById(id);
  }

  function getDeviceId() {
    let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);

    if (!deviceId) {
      deviceId = 'WEB-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }

    return deviceId;
  }

  function normalizeIdUser(value) {
    return String(value || '').trim().toUpperCase();
  }

  function showMessage(message, type = 'error') {
    const box = qs('loginMessage');
    if (!box) return;

    box.textContent = message;
    box.classList.remove('hidden', 'error', 'success');
    box.classList.add(type);
  }

  function clearMessage() {
    const box = qs('loginMessage');
    if (!box) return;

    box.textContent = '';
    box.classList.add('hidden');
    box.classList.remove('error', 'success');
  }

  function setLoading(isLoading) {
    const btn = qs('loginSubmitBtn');
    if (!btn) return;

    btn.disabled = isLoading;
    btn.textContent = isLoading ? 'Memproses...' : 'Masuk';
  }

  function validateLogin(idUser, password) {
    if (!idUser) {
      return 'ID Kader wajib diisi.';
    }

    if (!password) {
      return 'Password wajib diisi.';
    }

    return '';
  }

  function setupLogo() {
    const logo = qs('loginLogo');
    if (!logo) return;

    if (CONFIG.LOGIN_LOGO_URL) {
      logo.src = CONFIG.LOGIN_LOGO_URL;
    }
  }

  function setupPasswordToggle() {
    const passwordInput = qs('loginPassword');
    const toggleBtn = qs('togglePasswordBtn');

    if (!passwordInput || !toggleBtn) return;

    toggleBtn.addEventListener('click', function () {
      const isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      toggleBtn.setAttribute('aria-label', isHidden ? 'Sembunyikan password' : 'Lihat password');
    });
  }

  function setupBackendConfig() {
    const showBackendSettings = !!CONFIG.SHOW_BACKEND_SETTINGS;

    const backendSection = qs('backendConfigSection');
    const backendInput = qs('backendUrlInput');
    const saveBackendBtn = qs('saveBackendBtn');
    const openBackendBtn = qs('openBackendConfigBtn');

    if (!backendSection || !backendInput || !saveBackendBtn || !openBackendBtn) return;

    backendInput.value = window.Api.getBaseUrl();

    if (!showBackendSettings) {
      backendSection.classList.add('hidden');
      openBackendBtn.classList.add('hidden');
      return;
    }

    openBackendBtn.classList.remove('hidden');

    openBackendBtn.addEventListener('click', function () {
      backendSection.classList.toggle('hidden');
    });

    saveBackendBtn.addEventListener('click', function () {
      const url = String(backendInput.value || '').trim();

      if (!url) {
        showMessage('URL backend tidak boleh kosong.');
        return;
      }

      window.Api.setBaseUrl(url);
      showMessage('URL backend berhasil disimpan.', 'success');
    });
  }

  function saveSession(result) {
    const data = result?.data || {};
    const profile = data.profile || {};

    if (data.session_token) {
      localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, data.session_token);
    }

    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }

  function redirectAfterLogin(result) {
    const wajibGanti = !!result?.data?.wajib_ganti_password;

    if (wajibGanti) {
      window.location.href = 'change-password.html';
      return;
    }

    window.location.href = 'index.html';
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    clearMessage();

    const idUser = normalizeIdUser(qs('loginIdUser')?.value);
    const password = String(qs('loginPassword')?.value || '').trim();

    const validationError = validateLogin(idUser, password);
    if (validationError) {
      showMessage(validationError);
      return;
    }

    try {
      setLoading(true);

      const result = await window.Api.post('login', {
        id_user: idUser,
        password: password,
        device_id: getDeviceId(),
        app_version: CONFIG.APP_VERSION || '2.1.0'
      });

      if (!result || result.ok === false) {
        showMessage(result?.message || 'Login gagal. Periksa kembali ID dan password.');
        return;
      }

      saveSession(result);
      showMessage('Login berhasil.', 'success');

      setTimeout(function () {
        redirectAfterLogin(result);
      }, 400);
    } catch (error) {
      console.error('LOGIN_ERROR', error);
      showMessage('Koneksi ke backend gagal atau respons tidak valid.');
    } finally {
      setLoading(false);
    }
  }

  function initLoginPage() {
    const form = qs('loginForm');
    if (!form) return;

    setupLogo();
    setupPasswordToggle();
    setupBackendConfig();

    form.addEventListener('submit', handleLoginSubmit);
  }

  document.addEventListener('DOMContentLoaded', initLoginPage);
})();
