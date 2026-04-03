(function () {
  console.log('app.js loaded');

  window.Api = {
    getBaseUrl() {
      return String(window.APP_CONFIG?.API_BASE_URL || '').trim();
    },

    getSessionToken() {
      const key = window.APP_CONFIG?.STORAGE_KEYS?.SESSION_TOKEN || 'tpk_session_token';
      return String(localStorage.getItem(key) || '').trim();
    },

    async post(action, payload = {}) {
      const apiUrl = this.getBaseUrl();

      if (!apiUrl) {
        throw new Error('API_BASE_URL belum diatur');
      }

      const formData = new URLSearchParams();
      formData.append('action', action);

      const token = this.getSessionToken();
      if (token) {
        formData.append('token', token);
      }

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
      console.log('API_RESPONSE', action, result);
      return result;
    }
  };

  function qs(id) {
    return document.getElementById(id);
  }

  function setText(id, value, fallback = '-') {
    const el = qs(id);
    if (!el) return;
    const safeValue = value === undefined || value === null || String(value).trim() === ''
      ? fallback
      : String(value);
    el.textContent = safeValue;
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

  function getSessionToken() {
    const keys = getStorageKeys();
    return String(localStorage.getItem(keys.SESSION_TOKEN || 'tpk_session_token') || '').trim();
  }

  function hasSessionToken() {
    return !!getSessionToken();
  }

  function getProfileFromStorage() {
    const keys = getStorageKeys();
    const raw = localStorage.getItem(keys.PROFILE || 'tpk_profile');
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
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

  function renderProfile(profile) {
    profile = profile || {};

    setText('profile-nama', profile.nama || profile.nama_user);
    setText('profile-role', profile.role_akses || profile.role);
    setText('profile-id', profile.id_user || profile.username);
    setText('profile-tim', profile.id_tim || profile.nomor_tim);
    setText(
      'profile-wilayah',
      profile.dusun || profile.desa || profile.kecamatan || profile.id_kecamatan
    );
  }

  function renderMenu(profile) {
    if (!window.Menu || typeof window.Menu.render !== 'function') return;

    const role = profile?.role_akses || profile?.role || 'KADER';
    window.Menu.render(role);
  }

  function renderDashboardSummary(data) {
    data = data || {};

    setText('stat-sasaran', data.jumlah_sasaran || data.total_sasaran || 0, '0');
    setText('stat-pendampingan', data.jumlah_pendampingan || data.total_pendampingan || 0, '0');
    setText('stat-draft', data.jumlah_draft || data.total_draft || 0, '0');
  }

  function setNetworkBadge() {
    const badge = qs('network-badge');
    if (!badge) return;

    if (navigator.onLine) {
      badge.textContent = 'Online';
      badge.className = 'badge badge-success-soft';
    } else {
      badge.textContent = 'Offline';
      badge.className = 'badge badge-warning';
    }
  }

  function attachGlobalUIEvents() {
    window.addEventListener('online', setNetworkBadge);
    window.addEventListener('offline', setNetworkBadge);

    const logoutBtn = qs('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        const keys = getStorageKeys();
        localStorage.removeItem(keys.SESSION_TOKEN || 'tpk_session_token');
        localStorage.removeItem(keys.PROFILE || 'tpk_profile');
        window.location.href = 'index.html';
      });
    }
  }

  async function loadDashboardData() {
    let profile = getProfileFromStorage();

    if ((!profile || !profile.id_user) && window.DashboardService?.getMyProfile) {
      try {
        const profileResult = await window.DashboardService.getMyProfile();
        if (profileResult?.ok && profileResult?.data) {
          profile = profileResult.data.profile || profileResult.data || profile;
          const keys = getStorageKeys();
          localStorage.setItem(
            keys.PROFILE || 'tpk_profile',
            JSON.stringify(profile)
          );
        }
      } catch (err) {
        console.warn('GET_PROFILE_FAILED', err);
      }
    }

    renderProfile(profile || {});
    renderMenu(profile || {});
    setNetworkBadge();

    if (window.DashboardService?.getDashboardSummary) {
      try {
        const summaryResult = await window.DashboardService.getDashboardSummary('');
        if (summaryResult?.ok) {
          renderDashboardSummary(summaryResult.data || {});
        }
      } catch (err) {
        console.warn('GET_DASHBOARD_SUMMARY_FAILED', err);
      }
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
        await loadDashboardData();
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
    attachGlobalUIEvents();
    bootstrapApp();
  });
})();
