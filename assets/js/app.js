(function () {
  'use strict';

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

      Object.keys(payload || {}).forEach((key) => {
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

    const safeValue =
      value === undefined || value === null || String(value).trim() === ''
        ? fallback
        : String(value);

    el.textContent = safeValue;
  }

  function setInputValue(id, value) {
    const el = qs(id);
    if (!el) return;
    el.value = value == null ? '' : String(value);
  }

  function showMessage(id, message, type) {
    const el = qs(id);
    if (!el) return;

    if (!message) {
      el.className = 'login-message hidden';
      el.textContent = '';
      return;
    }

    el.className = `login-message ${type || 'success'}`;
    el.textContent = message;
    el.classList.remove('hidden');
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const raw =
      localStorage.getItem(keys.PROFILE || 'tpk_profile') ||
      localStorage.getItem('profile');

    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (err) {
      console.warn('PROFILE_PARSE_FAILED', err);
      return null;
    }
  }

  function saveProfileToStorage(profile) {
    try {
      const keys = getStorageKeys();
      localStorage.setItem(keys.PROFILE || 'tpk_profile', JSON.stringify(profile || {}));
      localStorage.setItem('profile', JSON.stringify(profile || {}));
    } catch (err) {
      console.warn('SAVE_PROFILE_FAILED', err);
    }
  }

  function fillAppVersion() {
    const appVersion = window.APP_CONFIG?.APP_VERSION || '-';

    const versionNode = qs('app-version');
    if (versionNode) {
      versionNode.textContent = appVersion;
    }

    const footerVersionNode = qs('footer-app-version');
    if (footerVersionNode) {
      footerVersionNode.textContent = appVersion;
    }

    const settingsVersionNode = qs('settings-app-version');
    if (settingsVersionNode) {
      settingsVersionNode.textContent = appVersion;
    }
  }

  function setSplashStatus(text) {
    const el = qs('splash-status');
    if (el) {
      el.textContent = text;
    }
  }

  function syncProfileModal(profile) {
    profile = profile || getProfileFromStorage() || {};

    setText('modal-profile-nama', profile.nama || profile.nama_user);
    setText('modal-profile-id', profile.id_user || profile.username);
    setText('modal-profile-unsur', profile.unsur_tpk || '-');
    setText('modal-profile-tim', profile.nomor_tim || profile.id_tim || '-');
    setText('modal-profile-kecamatan', profile.kecamatan || profile.nama_kecamatan || '-');
    setText('modal-profile-desa', profile.desa_kelurahan || profile.desa || profile.nama_desa || '-');
    setText('modal-profile-dusun', profile.dusun_rw || profile.dusun || profile.nama_dusun || '-');

    setInputValue('profile-status-kader', profile.status_kader_tpk || '');
    setInputValue('profile-nomor-wa', profile.nomor_wa || '');
    setInputValue('profile-memiliki-bpjstk', profile.memiliki_bpjstk || '');
    setInputValue('profile-mengantar-mbg', profile.mengantar_mbg_3b || '');
    setInputValue('profile-mendapat-insentif', profile.mendapat_insentif_mbg_3b || '');
    setInputValue(
      'profile-insentif-per-sasaran',
      profile.insentif_mbg_3b_per_sasaran != null
        ? profile.insentif_mbg_3b_per_sasaran
        : ''
    );

    showMessage('profile-edit-message', '', '');
  }

  function renderProfile(profile) {
    profile = profile || {};

    setText('profile-nama', profile.nama || profile.nama_user);
    setText('profile-unsur', profile.unsur_tpk || '-');
    setText('profile-id', profile.id_user || profile.username);
    setText('profile-tim', profile.nomor_tim || profile.id_tim);

    setText('profile-desa', profile.desa_kelurahan || profile.desa || profile.nama_desa || '-');
    setText('profile-dusun', profile.dusun_rw || profile.dusun || profile.nama_dusun || '-');

    setText('header-kecamatan', profile.kecamatan || profile.nama_kecamatan || '-');

    syncProfileModal(profile);
  }

  function renderMenu(profile) {
    const role = profile?.role_akses || profile?.role || 'KADER';

    if (window.Menu && typeof window.Menu.renderMenu === 'function') {
      window.Menu.renderMenu(role);
      return;
    }

    if (window.Menu && typeof window.Menu.setRole === 'function') {
      window.Menu.setRole(role);
      return;
    }

    if (window.Menu && typeof window.Menu.init === 'function') {
      window.Menu.init();
    }
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

  function runHeaderSync() {
    if (window.OfflineSync && typeof window.OfflineSync.syncQueueNow === 'function') {
      window.OfflineSync.syncQueueNow();
      return;
    }

    if (window.SyncUI && typeof window.SyncUI.syncAll === 'function') {
      window.SyncUI.syncAll();
      return;
    }

    showScreen('sync-screen');
    showToast('Membuka halaman sinkronisasi.', 'info');
  }

  function openSettingsModal() {
    if (window.App && typeof window.App.openSettingsDialog === 'function') {
      window.App.openSettingsDialog();
      return;
    }

    showToast('Menu pengaturan belum tersedia.', 'warning');
  }

  function logoutNow() {
    const keys = getStorageKeys();
    localStorage.removeItem(keys.SESSION_TOKEN || 'tpk_session_token');
    localStorage.removeItem(keys.PROFILE || 'tpk_profile');
    localStorage.removeItem('profile');
    window.location.href = 'index.html';
  }

  function bindBackButtons() {
    const directMap = [
      ['btn-back-dashboard-from-list', 'dashboard-screen'],
      ['btn-back-list-from-detail', 'sasaran-list-screen'],
      ['btn-back-from-sync', 'dashboard-screen'],
      ['btn-back-from-rekap', 'dashboard-screen']
    ];

    directMap.forEach(([btnId, targetScreen]) => {
      const btn = qs(btnId);
      if (!btn) return;

      btn.addEventListener('click', function () {
        showScreen(targetScreen);
      });
    });

    const btnBackRegistrasi = qs('btn-back-from-registrasi');
    if (btnBackRegistrasi) {
      btnBackRegistrasi.addEventListener('click', function () {
        try {
          const mode =
            window.RegistrasiState?.getMode?.() || 'create';

          if (mode === 'edit') {
            showScreen('sasaran-detail-screen');
          } else {
            showScreen('dashboard-screen');
          }
        } catch (err) {
          showScreen('dashboard-screen');
        }
      });
    }

    const btnBackPendampingan = qs('btn-back-from-pendampingan');
    if (btnBackPendampingan) {
      btnBackPendampingan.addEventListener('click', function () {
        showScreen('sasaran-detail-screen');
      });
    }
  }

  function attachGlobalUIEvents() {
    window.addEventListener('online', setNetworkBadge);
    window.addEventListener('offline', setNetworkBadge);

    const logoutBtn = qs('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logoutNow);
    }

    const syncHeaderBtn = qs('btn-sync-now-header');
    if (syncHeaderBtn) {
      syncHeaderBtn.addEventListener('click', function () {
        runHeaderSync();
      });
    }

    const settingsBtn = qs('btn-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function () {
        openSettingsModal();
      });
    }
  }

  function normalizeYesNo(value) {
    const v = String(value || '').trim().toUpperCase();
    if (v === 'YA' || v === 'Y' || v === 'TRUE' || v === '1') return 'YA';
    if (v === 'TIDAK' || v === 'N' || v === 'FALSE' || v === '0') return 'TIDAK';
    return '';
  }

  function getProfileEditPayload() {
    const statusKader = String(qs('profile-status-kader')?.value || '').trim().toUpperCase();
    const nomorWa = String(qs('profile-nomor-wa')?.value || '').replace(/[^\d]/g, '');
    const memilikiBpjstk = normalizeYesNo(qs('profile-memiliki-bpjstk')?.value || '');
    const mengantarMbg = normalizeYesNo(qs('profile-mengantar-mbg')?.value || '');
    const mendapatInsentif =
      mengantarMbg === 'YA'
        ? normalizeYesNo(qs('profile-mendapat-insentif')?.value || '')
        : 'TIDAK';

    const insentifRaw = String(qs('profile-insentif-per-sasaran')?.value || '').replace(/[^\d]/g, '');

    return {
      status_kader_tpk: statusKader,
      nomor_wa: nomorWa,
      memiliki_bpjstk: memilikiBpjstk,
      mengantar_mbg_3b: mengantarMbg,
      mendapat_insentif_mbg_3b: mendapatInsentif,
      insentif_mbg_3b_per_sasaran:
        mengantarMbg === 'YA' && mendapatInsentif === 'YA'
          ? Number(insentifRaw || 0)
          : 0
    };
  }

  function validateProfileEditPayload(payload) {
    const errors = [];

    if (!payload.status_kader_tpk) {
      errors.push('Status Kader wajib dipilih.');
    }

    if (!payload.nomor_wa) {
      errors.push('Nomor WA wajib diisi.');
    }

    if (!payload.memiliki_bpjstk) {
      errors.push('Pilihan Memiliki BPJSTK wajib diisi.');
    }

    if (!payload.mengantar_mbg_3b) {
      errors.push('Pilihan Mengantar MBG 3B wajib diisi.');
    }

    if (payload.mengantar_mbg_3b === 'YA' && !payload.mendapat_insentif_mbg_3b) {
      errors.push('Pilihan Mendapat Insentif MBG 3B wajib diisi.');
    }

    if (
      payload.mengantar_mbg_3b === 'YA' &&
      payload.mendapat_insentif_mbg_3b === 'YA' &&
      Number(payload.insentif_mbg_3b_per_sasaran || 0) <= 0
    ) {
      errors.push('Insentif MBG 3B per sasaran wajib diisi.');
    }

    return errors;
  }

  async function saveProfileEdit() {
    const payload = getProfileEditPayload();
    const errors = validateProfileEditPayload(payload);

    if (errors.length) {
      showMessage('profile-edit-message', errors[0], 'error');
      return;
    }

    const saveBtn = qs('btn-profile-save');
    if (saveBtn && window.UI?.setLoading) {
      UI.setLoading('btn-profile-save', true, 'Menyimpan...');
    }

    showMessage('profile-edit-message', '', '');

    try {
      let result = null;

      if (window.DashboardService && typeof window.DashboardService.updateMyProfile === 'function') {
        result = await window.DashboardService.updateMyProfile(payload);
      } else {
        result = await Api.post('updateMyProfile', payload);
      }

      if (!result?.ok) {
        throw new Error(result?.message || 'Gagal menyimpan profil.');
      }

      const currentProfile = getProfileFromStorage() || {};
      const updatedProfile = Object.assign({}, currentProfile, payload);

      saveProfileToStorage(updatedProfile);
      renderProfile(updatedProfile);

      if (window.ProfileModalUI && typeof window.ProfileModalUI.closeEdit === 'function') {
        window.ProfileModalUI.closeEdit();
      }

      showToast('Profil berhasil diperbarui.', 'success');
    } catch (err) {
      showMessage('profile-edit-message', err.message || 'Gagal menyimpan profil.', 'error');
    } finally {
      if (saveBtn && window.UI?.setLoading) {
        UI.setLoading('btn-profile-save', false);
      }
    }
  }

  function bindProfileSaveHandler() {
    const profileForm = qs('profile-edit-form');
    if (profileForm && !profileForm.dataset.bound) {
      profileForm.dataset.bound = '1';
      profileForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        await saveProfileEdit();
      });
    }
  }

  async function loadDashboardData() {
    let profile = getProfileFromStorage() || {};

    if (window.DashboardService?.getMyProfile) {
      try {
        const profileResult = await window.DashboardService.getMyProfile();
        if (profileResult?.ok && profileResult?.data) {
          profile = profileResult.data.profile || profileResult.data || profile;
          saveProfileToStorage(profile);
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
        } else {
          console.warn('GET_DASHBOARD_SUMMARY_FAILED', summaryResult);
        }
      } catch (err) {
        console.warn('GET_DASHBOARD_SUMMARY_FAILED', err);
      }
    }

    if (window.OfflineSync && typeof window.OfflineSync.renderSummary === 'function') {
      window.OfflineSync.renderSummary();
    }
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function bootstrapApp() {
    try {
      fillAppVersion();
      setSplashStatus('Menyiapkan aplikasi...');

      await delay(1200);

      if (hasSession
