(function (window, document) {
  'use strict';

  function showMessage(text, type) {
    var node = document.getElementById('loginMessage');
    if (!node) return;
    node.className = 'login-message ' + (type || 'error');
    node.textContent = text || '';
    node.classList.remove('hidden');
  }

  function clearMessage() {
    var node = document.getElementById('loginMessage');
    if (!node) return;
    node.textContent = '';
    node.className = 'login-message hidden';
  }

  function clearForm() {
    var form = document.getElementById('loginForm');
    if (form) form.reset();
    clearMessage();
  }

  function bindLoginForm() {
    var form = document.getElementById('loginForm');
    var submitBtn = document.getElementById('loginSubmitBtn');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      clearMessage();

      var payload = {
        id_user: (document.getElementById('loginIdUser') || {}).value || '',
        password: (document.getElementById('loginPassword') || {}).value || ''
      };

      if (!payload.id_user || !payload.password) {
        showMessage('ID kader dan password wajib diisi.', 'error');
        return;
      }

      try {
        if (submitBtn) submitBtn.disabled = true;
        var result = await window.Auth.login(payload);

        if (result && result.ok) {
          await window.Auth.enrichSessionAfterLogin(result.token || '', result.data || null);
          if (window.AppBootstrap && typeof window.AppBootstrap.loadReferenceBootstrap === 'function') {
            await window.AppBootstrap.loadReferenceBootstrap();
          }
          if (window.UI && window.UI.showToast) {
            window.UI.showToast(result.message || 'Login berhasil.', 'success');
          }
          window.AppRouter.goTo((window.AppConfig.SCREENS || {}).DASHBOARD || 'dashboard-screen');
          return;
        }

        showMessage((result && result.message) || 'Login gagal.', 'error');
      } catch (err) {
        showMessage(err.message || 'Koneksi ke backend gagal.', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  function bindTogglePassword() {
    var btn = document.getElementById('togglePasswordBtn');
    var input = document.getElementById('loginPassword');
    if (!btn || !input || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  }

  function init() {
    bindLoginForm();
    bindTogglePassword();
  }

  function onEnter() {
    clearMessage();
  }

  window.LoginView = {
    init: init,
    onEnter: onEnter,
    showMessage: showMessage,
    clearForm: clearForm
  };
})(window, document);
