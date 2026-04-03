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

  function validateLoginForm(idUser, password) {
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
      const isPassword = passwordInput.getAttribute('type') === 'password';

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

  function saveSession(result) {
    const data = result?.data || {};
    const profile = data.profile || {};

    if (data.session_token) {
      localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, data.session_token);
    }

    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }

  function redirectAfterLogin(result) {
    const wajibGantiPassword = !!result?.data?.wajib_ganti_password;

    if (wajibGantiPassword) {
      window.location.href = 'change-password.html';
      return;
    }

    window.location.href = 'dashboard.html';
  }

  async function submitLogin(idUser, password) {
    const payload = {
      id_user: idUser,
      password: password,
      device_id: getDeviceId(),
      app_version: CONFIG.APP_VERSION || '2.1.0'
    };

    return await window.Api.post('login', payload);
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    clearMessage();

    const idUser = normalizeIdUser(qs('loginIdUser')?.value);
    const password = String(qs('loginPassword')?.value || '').trim();

    const validationMessage = validateLoginForm(idUser, password);
    if (validationMessage) {
      showMessage(validationMessage);
      return;
    }

    try {
      setLoading(true);

      const result = await submitLogin(idUser, password);

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

    form.addEventListener('submit', handleLoginSubmit);
  }

  document.addEventListener('DOMContentLoaded', initLoginPage);
})();
