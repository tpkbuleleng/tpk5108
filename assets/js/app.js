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
    if (versionNode) versionNode.textContent = appVersion;

    const footerVersionNode = qs('footer-app-version');
    if (footerVersionNode) footerVersionNode.textContent = appVersion;

    const settingsVersionNode = qs('settings-app-version');
    if (settingsVersionNode) settingsVersionNode.textContent = appVersion;
  }

  function setSplashStatus(text) {
    const el = qs('splash-status');
    if (el) {
      el.textContent = text;
    }
  }

  function formatRupiah(value) {
    const number = Number(String(value || '0').replace(/[^\d]/g, '')) || 0;
    return 'Rp ' + number.toLocaleString('id-ID');
  }

  function normalizeYesNo(value) {
    const raw = String(value || '').trim().toUpperCase();
    if (raw === 'YA' || raw === 'Y' || raw === 'YES' || raw === 'TRUE' || raw === '1') return 'YA';
    if (raw === 'TIDAK' || raw === 'NO' || raw === 'FALSE' || raw === '0') return 'TIDAK';
    return '';
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

    setText('modal-profile-status-kader', profile.status_kader_tpk || '-');
    setText('modal-profile-nomor-wa', profile.nomor_wa || '-');
    setText('modal-profile-bpjstk', normalizeYesNo(profile.memiliki_bpjstk) || '-');
    setText('modal-profile-mbg', normalizeYesNo(profile.mengantar_mbg_3b) || '-');
    setText('modal-profile-mbg-insentif', normalizeYesNo(profile.mendapat_insentif_mbg_3b) || '-');

    const rupiahValue =
      profile.insentif_mbg_3b_per_sasaran ||
      profile.insentif_mbg_3b ||
      profile.insentif_mbg ||
      '';

    setText(
      'modal-profile-mbg-rupiah',
      rupiahValue ? formatRupiah(rupiahValue) : '-'
    );
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
          const mode = window.RegistrasiState?.getMode?.() || 'create';
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

  function toggleProfileEditRules() {
    const mengantar = normalizeYesNo(qs('profile-mengantar-mbg')?.value);
    const mendapat = normalizeYesNo(qs('profile-mendapat-insentif-mbg')?.value);

    const groupInsentif = qs('group-profile-mbg-insentif');
    const groupRupiah = qs('group-profile-insentif-rupiah');
    const insentifSelect = qs('profile-mendapat-insentif-mbg');
    const rupiahInput = qs('profile-insentif-rupiah');

    if (!groupInsentif || !groupRupiah || !insentifSelect || !rupiahInput) return;

    if (mengantar === 'YA') {
      groupInsentif.classList.remove('hidden');
      insentifSelect.required = true;
    } else {
      groupInsentif.classList.add('hidden');
      groupRupiah.classList.add('hidden');
      insentifSelect.required = false;
      insentifSelect.value = '';
      rupiahInput.required = false;
      rupiahInput.value = '';
      return;
    }

    if (mendapat === 'YA') {
      groupRupiah.classList.remove('hidden');
      rupiahInput.required = true;
    } else {
      groupRupiah.classList.add('hidden');
      rupiahInput.required = false;
      rupiahInput.value = '';
    }
  }

  function setProfileFormMode(isEdit) {
    const viewMode = qs('profile-view-mode');
    const editMode = qs('profile-edit-mode');

    if (viewMode) viewMode.classList.toggle('hidden', !!isEdit);
    if (editMode) editMode.classList.toggle('hidden', !isEdit);
  }

  function populateProfileForm() {
    const profile = getProfileFromStorage() || {};

    const statusKader = qs('profile-status-kader');
    const nomorWa = qs('profile-nomor-wa');
    const memilikiBpjstk = qs('profile-memiliki-bpjstk');
    const mengantarMbg = qs('profile-mengantar-mbg');
    const mendapatInsentif = qs('profile-mendapat-insentif-mbg');
    const insentifRupiah = qs('profile-insentif-rupiah');
    const messageBox = qs('profile-edit-message');

    if (statusKader) statusKader.value = String(profile.status_kader_tpk || '').toUpperCase();
    if (nomorWa) nomorWa.value = profile.nomor_wa || '';
    if (memilikiBpjstk) memilikiBpjstk.value = normalizeYesNo(profile.memiliki_bpjstk);
    if (mengantarMbg) mengantarMbg.value = normalizeYesNo(profile.mengantar_mbg_3b);
    if (mendapatInsentif) mendapatInsentif.value = normalizeYesNo(profile.mendapat_insentif_mbg_3b);

    const rupiahValue =
      profile.insentif_mbg_3b_per_sasaran ||
      profile.insentif_mbg_3b ||
      profile.insentif_mbg ||
      '';

    if (insentifRupiah) {
      insentifRupiah.value = rupiahValue ? formatRupiah(rupiahValue) : '';
    }

    if (messageBox) {
      messageBox.classList.add('hidden');
      messageBox.textContent = '';
      messageBox.className = 'login-message hidden';
    }

    toggleProfileEditRules();
    setProfileFormMode(false);
  }

  function bindProfileEditEvents() {
    const btnEdit = qs('btn-profile-edit');
    if (btnEdit) {
      btnEdit.addEventListener('click', function () {
        populateProfileForm();
        setProfileFormMode(true);
      });
    }

    const btnCancel = qs('btn-profile-cancel-edit');
    if (btnCancel) {
      btnCancel.addEventListener('click', function () {
        setProfileFormMode(false);
      });
    }

    const mengantarMbg = qs('profile-mengantar-mbg');
    if (mengantarMbg) {
      mengantarMbg.addEventListener('change', toggleProfileEditRules);
    }

    const mendapatInsentif = qs('profile-mendapat-insentif-mbg');
    if (mendapatInsentif) {
      mendapatInsentif.addEventListener('change', toggleProfileEditRules);
    }

    const rupiahInput = qs('profile-insentif-rupiah');
    if (rupiahInput) {
      rupiahInput.addEventListener('input', function () {
        const digits = String(rupiahInput.value || '').replace(/[^\d]/g, '');
        rupiahInput.value = digits ? formatRupiah(digits) : '';
      });
    }

    const form = qs('profile-edit-form');
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        await saveProfileEdit();
      });
    }
  }

  function showProfileEditMessage(message, type) {
    const box = qs('profile-edit-message');
    if (!box) return;

    box.textContent = message || '';
    box.className = 'login-message ' + (type || 'success');
    box.classList.remove('hidden');
  }

  function collectProfileEditPayload() {
    const statusKader = String(qs('profile-status-kader')?.value || '').trim().toUpperCase();
    const nomorWa = String(qs('profile-nomor-wa')?.value || '').replace(/[^\d]/g, '');
    const memilikiBpjstk = normalizeYesNo(qs('profile-memiliki-bpjstk')?.value);
    const mengantarMbg = normalizeYesNo(qs('profile-mengantar-mbg')?.value);
    const mendapatInsentif = normalizeYesNo(qs('profile-mendapat-insentif-mbg')?.value);
    const insentifDigits = String(qs('profile-insentif-rupiah')?.value || '').replace(/[^\d]/g, '');

    return {
      status_kader_tpk: statusKader,
      nomor_wa: nomorWa,
      memiliki_bpjstk: memilikiBpjstk,
      mengantar_mbg_3b: mengantarMbg,
      mendapat_insentif_mbg_3b: mengantarMbg === 'YA' ? mendapatInsentif : 'TIDAK',
      insentif_mbg_3b_per_sasaran:
        mengantarMbg === 'YA' && mendapatInsentif === 'YA'
          ? insentifDigits
          : ''
    };
  }

  function validateProfileEdit(payload) {
    if (!payload.status_kader_tpk) {
      throw new Error('Status Kader wajib dipilih.');
    }

    if (!payload.nomor_wa) {
      throw new Error('Nomor WA wajib diisi.');
    }

    if (payload.nomor_wa.length < 10) {
      throw new Error('Nomor WA belum valid.');
    }

    if (!payload.memiliki_bpjstk) {
      throw new Error('Pilihan Memiliki BPJSTK wajib diisi.');
    }

    if (!payload.mengantar_mbg_3b) {
      throw new Error('Pilihan Mengantar MBG 3B wajib diisi.');
    }

    if (payload.mengantar_mbg_3b === 'YA' && !payload.mendapat_insentif_mbg_3b) {
      throw new Error('Pilihan Mendapat Insentif MBG 3B wajib diisi.');
    }

    if (
      payload.mengantar_mbg_3b === 'YA' &&
      payload.mendapat_insentif_mbg_3b === 'YA' &&
      !payload.insentif_mbg_3b_per_sasaran
    ) {
      throw new Error('Insentif MBG 3B per sasaran wajib diisi.');
    }
  }

  async function saveProfileEdit() {
    const btnSave = qs('btn-profile-save');
    const payload = collectProfileEditPayload();

    try {
      validateProfileEdit(payload);

      if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = 'Menyimpan...';
      }

      const result = await Api.post('updateMyProfile', payload);

      if (!result?.ok) {
        throw new Error(result?.message || 'Gagal menyimpan profil.');
      }

      let profile = getProfileFromStorage() || {};
      const updated = Object.assign({}, profile, payload);

      if (result?.data && typeof result.data === 'object') {
        profile = Object.assign({}, updated, result.data);
      } else {
        profile = updated;
      }

      saveProfileToStorage(profile);
      renderProfile(profile);
      syncProfileModal(profile);
      populateProfileForm();
      setProfileFormMode(false);

      showProfileEditMessage('Profil berhasil diperbarui.', 'success');
      showToast('Profil berhasil diperbarui.', 'success');
    } catch (err) {
      showProfileEditMessage(err.message || 'Gagal menyimpan profil.', 'error');
      showToast(err.message || 'Gagal menyimpan profil.', 'warn');
    } finally {
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = 'Simpan Perubahan';
      }
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

  function exposeAppHooks() {
    if (!window.App) window.App = {};

    window.App.populateProfileForm = populateProfileForm;
    window.App.openProfileDialog = function () {
      syncProfileModal();
      populateProfileForm();
      const modal = qs('profile-modal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
      }
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    try {
      registerServiceWorker();
      attachGlobalUIEvents();
      bindBackButtons();
      bindProfileEditEvents();
      exposeAppHooks();
      bootstrapApp();
    } catch (err) {
      console.error('APP_INIT_ERROR', err);
      setSplashStatus('Terjadi kendala saat memulai aplikasi');
      setTimeout(function () {
        showScreen('login-screen');
      }, 500);
    }
  });
})();
