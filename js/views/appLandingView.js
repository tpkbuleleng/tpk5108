(function (window, document) {
  'use strict';

  var bound = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorage() {
    return window.Storage || null;
  }

  function getState() {
    return window.AppState || null;
  }

  function getRouter() {
    return window.Router || null;
  }

  function setText(id, value, fallback) {
    var el = byId(id);
    if (!el) return;
    var next = value === undefined || value === null || value === '' ? (fallback !== undefined ? fallback : '-') : value;
    el.textContent = String(next);
  }

  function normalizeDisplayText(value) {
    var text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    if (!text) return '';
    var upper = text.toUpperCase();
    if (upper === '-' || upper === 'NULL' || upper === 'UNDEFINED' || upper === 'N/A' || upper === 'NA') return '';
    return text;
  }

  function normalizeRole(role) {
    var raw = String(role || '').trim().toUpperCase();
    var map = {
      SUPERADMIN: 'SUPER_ADMIN',
      'SUPER ADMIN': 'SUPER_ADMIN',
      SUPER_ADMIN: 'SUPER_ADMIN',
      'ADMIN KECAMATAN': 'ADMIN_KECAMATAN',
      ADMIN_KECAMATAN: 'ADMIN_KECAMATAN',
      'ADMIN KABUPATEN': 'ADMIN_KABUPATEN',
      ADMIN_KABUPATEN: 'ADMIN_KABUPATEN',
      PKB: 'PKB',
      KADER: 'KADER',
      MITRA: 'MITRA',
      MITRA_DESA: 'MITRA_DESA',
      'MITRA DESA': 'MITRA_DESA',
      MITRA_KECAMATAN: 'MITRA_KECAMATAN',
      'MITRA KECAMATAN': 'MITRA_KECAMATAN',
      MITRA_KABUPATEN: 'MITRA_KABUPATEN',
      'MITRA KABUPATEN': 'MITRA_KABUPATEN'
    };
    return map[raw] || raw || 'KADER';
  }

  function parseWilayahDisplay(profile) {
    var data = profile || {};
    var wilayah = normalizeDisplayText(data.wilayah_tugas || data.wilayah || '');
    var desa = normalizeDisplayText(data.desa_kelurahan || data.nama_desa || data.desa || data.desa_tim || '');
    var dusun = normalizeDisplayText(data.dusun_rw || data.nama_dusun || data.dusun || data.dusun_rw_list || '');
    var kecamatan = normalizeDisplayText(data.nama_kecamatan || data.kecamatan || '');

    if (wilayah) {
      var parts = wilayah.split(/\s*,\s*/).map(function (part) {
        return String(part || '').trim();
      }).filter(Boolean);
      if (!kecamatan && parts[0]) kecamatan = parts[0];
      if (!desa && parts[1]) desa = parts[1];
      if (!dusun && parts.length > 2) dusun = parts.slice(2).join(', ');
    }

    return {
      kecamatan: kecamatan || '-',
      desa: desa || '-',
      dusun: dusun || '-'
    };
  }

  function mergeProfileData(existingProfile, incomingProfile) {
    var existing = existingProfile && typeof existingProfile === 'object' ? existingProfile : {};
    var incoming = incomingProfile && typeof incomingProfile === 'object' ? incomingProfile : {};
    var merged = Object.assign({}, existing);

    Object.keys(incoming).forEach(function (key) {
      var value = incoming[key];
      if (value === undefined || value === null) return;
      if (typeof value === 'string' && !normalizeDisplayText(value)) return;
      merged[key] = value;
    });

    return merged;
  }

  function getStoredBootstrapLite() {
    var storage = getStorage();
    if (storage && typeof storage.getBootstrapLite === 'function') {
      return storage.getBootstrapLite({}) || {};
    }
    if (storage && typeof storage.get === 'function') {
      return storage.get('tpk_bootstrap_lite', {}) || {};
    }
    return {};
  }

  function getStoredProfile() {
    var appState = getState();
    if (appState && typeof appState.getProfile === 'function') {
      var stateProfile = appState.getProfile();
      if (stateProfile && typeof stateProfile === 'object' && Object.keys(stateProfile).length) {
        return stateProfile;
      }
    }

    var storage = getStorage();
    var config = getConfig();
    var keys = config.STORAGE_KEYS || {};
    var bootstrapLite = getStoredBootstrapLite();
    var bootstrapProfile = bootstrapLite && bootstrapLite.profile ? bootstrapLite.profile : {};
    var storedProfile = {};

    if (storage && typeof storage.get === 'function' && keys.PROFILE) {
      storedProfile = storage.get(keys.PROFILE, {}) || {};
    }

    return mergeProfileData(storedProfile, bootstrapProfile);
  }

  function getDisplayNomorTim(data) {
    data = data || {};
    var explicitNomor = data.nomor_tim || data.nomor_tim_display || data.nomor_tim_lokal || '';
    if (normalizeDisplayText(explicitNomor)) return normalizeDisplayText(explicitNomor);

    var namaTim = normalizeDisplayText(data.nama_tim || '');
    if (namaTim) {
      var match = namaTim.match(/(\d+)\s*$/);
      return match && match[1] ? match[1] : namaTim;
    }

    return normalizeDisplayText(data.id_tim || '') || '-';
  }

  function showToast(message, type) {
    if (window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(message, type || 'info');
      return;
    }
    try { console.log('[APP_LANDING]', type || 'info', message); } catch (err) {}
  }

  function createActionButton(action) {
    var article = document.createElement('article');
    article.className = 'menu-card';

    var icon = document.createElement('span');
    icon.className = 'menu-icon';
    icon.textContent = action.icon || '➡️';

    var meta = document.createElement('span');
    meta.className = 'menu-meta';
    meta.textContent = action.meta || 'Aksi';

    var title = document.createElement('strong');
    title.textContent = action.title || 'Aksi';

    var desc = document.createElement('p');
    desc.textContent = action.description || '';

    article.appendChild(icon);
    article.appendChild(meta);
    article.appendChild(title);
    article.appendChild(desc);
    article.setAttribute('role', 'button');
    article.setAttribute('tabindex', '0');

    function run() {
      if (typeof action.run === 'function') action.run();
    }

    article.addEventListener('click', run);
    article.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        run();
      }
    });

    return article;
  }

  function getActionsForRole(role) {
    var router = getRouter();
    var cleanRole = normalizeRole(role);
    var isAdmin = cleanRole === 'ADMIN_KECAMATAN' || cleanRole === 'ADMIN_KABUPATEN' || cleanRole === 'SUPER_ADMIN' || cleanRole === 'MITRA_KECAMATAN' || cleanRole === 'MITRA_KABUPATEN';

    if (cleanRole === 'KADER') {
      return [
        {
          icon: '📸',
          meta: 'HARGANAS',
          title: 'Kirim Dokumentasi HARGANAS',
          description: 'Isi identitas sasaran dan lanjutkan pengiriman foto/video dokumentasi pendampingan.',
          run: function () {
            if (router && typeof router.go === 'function') router.go('harganas');
          }
        }
      ];
    }

    if (isAdmin) {
      return [
        {
          icon: '✅',
          meta: 'VERIFIKASI',
          title: 'Verifikasi Dokumen HARGANAS',
          description: 'Periksa dokumentasi yang dikirim tim di wilayah kerja. Fitur verifikasi penuh disiapkan pada paket berikutnya.',
          run: function () {
            showToast('Verifikasi Dokumen HARGANAS akan diaktifkan pada paket admin/verifikasi.', 'info');
          }
        },
        {
          icon: '📊',
          meta: 'REKAP',
          title: 'Rekap Pengiriman HARGANAS',
          description: 'Pantau status tim yang sudah mengirim, belum mengirim, dan perlu perbaikan.',
          run: function () {
            showToast('Rekap pengiriman HARGANAS akan diaktifkan pada paket dashboard verifikasi.', 'info');
          }
        }
      ];
    }

    if (cleanRole === 'PKB') {
      return [
        {
          icon: '👀',
          meta: 'MONITORING',
          title: 'Pantau Dokumentasi Tim Binaan',
          description: 'Pantau progres pengiriman dokumentasi HARGANAS di wilayah binaan.',
          run: function () {
            showToast('Monitoring tim binaan akan diaktifkan pada paket lanjutan.', 'info');
          }
        }
      ];
    }

    return [
      {
        icon: 'ℹ️',
        meta: 'INFO',
        title: 'Informasi HARGANAS',
        description: 'Akses layanan akan menyesuaikan hak akses akun setelah konfigurasi role lengkap.',
        run: function () {
          showToast('Belum ada layanan HARGANAS aktif untuk role ini.', 'info');
        }
      }
    ];
  }

  function renderActions(profile) {
    var container = byId('app-landing-action-grid');
    if (!container) return;
    container.innerHTML = '';

    var actions = getActionsForRole(profile.role_akses || profile.role || '');
    actions.forEach(function (action) {
      container.appendChild(createActionButton(action));
    });
  }

  function applyLandingContent() {
    var config = getConfig();
    var landing = config.APP_LANDING || {};

    setText('app-landing-title', landing.TITLE || 'Informasi Aplikasi TPK');
    setText('app-landing-subtitle', landing.SUBTITLE || 'Media informasi awal sebelum pengguna melakukan kegiatan di aplikasi.');
    setText('app-landing-event-title', landing.ACTIVE_EVENT_TITLE || 'Dokumentasi HARGANAS 2026');
    setText('app-landing-event-summary', landing.ACTIVE_EVENT_SUMMARY || 'Setiap Tim TPK diminta mengirim dokumentasi pendampingan dalam rangka Hari Keluarga Nasional.');
    setText('app-landing-event-reason', landing.ACTIVE_EVENT_REASON || 'Dokumentasi digunakan sebagai bukti dukung kegiatan pendampingan TPK.');
    setText('app-landing-updated-at', landing.UPDATED_AT_LABEL ? 'Update ' + landing.UPDATED_AT_LABEL : '-');
  }

  function applyProfile(profile) {
    var data = profile || {};
    var wilayah = parseWilayahDisplay(data);
    var role = normalizeRole(data.role_akses || data.role || '');

    setText('app-landing-nama', data.nama_kader || data.nama_user || data.nama || '-');
    setText('app-landing-id-user', data.id_user || data.username || '-');
    setText('app-landing-role', role || '-');
    setText('app-landing-role-badge', role || '-');
    setText('app-landing-nomor-tim', getDisplayNomorTim(data));
    setText('app-landing-desa', wilayah.desa);
    setText('app-landing-dusun', wilayah.dusun);
    setText('app-landing-kecamatan', wilayah.kecamatan);

    renderActions(Object.assign({}, data, { role: role, role_akses: role }));
  }

  function openDashboard() {
    var router = getRouter();
    if (router && typeof router.go === 'function') {
      router.go('dashboard');
      return;
    }
    if (window.UI && typeof window.UI.showScreen === 'function') {
      window.UI.showScreen('dashboard-screen');
    }
  }

  function logout() {
    if (window.Auth && typeof window.Auth.logout === 'function') {
      window.Auth.logout();
      return;
    }
    var router = getRouter();
    if (router && typeof router.go === 'function') router.go('login');
  }

  function bindEvents() {
    if (bound) return;
    bound = true;

    var dashboardBtn = byId('btn-app-landing-dashboard');
    var logoutBtn = byId('btn-app-landing-logout');

    if (dashboardBtn) dashboardBtn.addEventListener('click', openDashboard);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
  }

  function init() {
    applyLandingContent();
    applyProfile(getStoredProfile());
    bindEvents();
  }

  window.AppLandingView = {
    init: init,
    refresh: init,
    applyProfile: applyProfile
  };
})(window, document);
