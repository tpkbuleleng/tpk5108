(function () {
  console.log('app.js loaded');

  window.Api = {
    getBaseUrl() {
      return String(window.APP_CONFIG?.API_BASE_URL || '').trim();
    },

    async post(action, payload = {}) {
      const apiUrl = this.getBaseUrl();

      if (!apiUrl) {
        throw new Error('API_BASE_URL belum diatur');
      }

      const formData = new URLSearchParams();
      formData.append('action', action);

      Object.keys(payload).forEach((key) => {
        const value = payload[key];

        if (value === undefined || value === null) {
          return;
        }

        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('API_RESPONSE', result);
      return result;
    }
  };

  function qs(id) {
    return document.getElementById(id);
  }

  function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach((screen) => {
      screen.classList.remove('active');
      screen.classList.add('hidden');
    });

    const target = qs(screenId);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }
  }

  function getStorageKeys() {
    return window.APP_CONFIG?.STORAGE_KEYS || {};
  }

  function hasSessionToken() {
    const keys = getStorageKeys();
    const token = localStorage.getItem(keys.SESSION_TOKEN || 'tpk_session_token');
    return !!String(token || '').trim();
  }

  function fillAppVersion() {
    const versionNode = qs('app-version');
    if (versionNode) {
      versionNode.textContent = window.APP_CONFIG?.APP_VERSION || '-';
    }
  }

  function setSplashStatus(text) {
    const el = qs('splash-status');
    if (el) {
      el.textContent = text;
    }
  }

  async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function bootstrapApp() {
    try {
      fillAppVersion();
      setSplashStatus('Menyiapkan aplikasi...');

      await delay(1200);

      if (hasSessionToken()) {
        setSplashStatus('Membuka dashboard...');
        await delay(300);
        showScreen('dashboard-screen');
        return;
      }

      setSplashStatus('Membuka halaman login...');
      await delay(250);
      showScreen('login-screen');
    } catch (error) {
      console.error('BOOTSTRAP_ERROR', error);
      setSplashStatus('Gagal memulai aplikasi');
      await delay(800);
      showScreen('login-screen');
    }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', async function () {
      try {
        await navigator.serviceWorker.register('./sw.js');
        console.log('Service worker registered');
      } catch (err) {
        console.warn('Service worker gagal didaftarkan:', err);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    registerServiceWorker();
    bootstrapApp();
  });
})();
