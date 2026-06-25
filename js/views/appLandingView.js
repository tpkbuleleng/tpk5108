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

  function displayRole(role) {
    return normalizeRole(role).replace(/_/g, ' ');
  }

  function getGreeting() {
    var hour = new Date().getHours();
    if (hour < 11) return 'Selamat pagi,';
    if (hour < 15) return 'Selamat siang,';
    if (hour < 18) return 'Selamat sore,';
    return 'Selamat malam,';
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

  function getDisplayName(profile) {
    return normalizeDisplayText(profile.nama_kader || profile.nama_user || profile.nama || profile.username || profile.id_user || '') || '-';
  }

  function buildTpkWilayahText(wilayah) {
    var desa = normalizeDisplayText(wilayah.desa || '');
    var kecamatan = normalizeDisplayText(wilayah.kecamatan || '');
    if (desa && kecamatan && desa !== '-' && kecamatan !== '-') return desa + ', Kecamatan ' + kecamatan;
    if (desa && desa !== '-') return desa;
    if (kecamatan && kecamatan !== '-') return 'Kecamatan ' + kecamatan;
    return 'wilayah tugas';
  }

  function showToast(message, type) {
    if (window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(message, type || 'info');
      return;
    }
    try { console.log('[APP_LANDING]', type || 'info', message); } catch (err) {}
  }

  function createActionButton(action, isPrimary) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'portal-action-card' + (isPrimary ? ' portal-action-card--primary' : '');

    var icon = document.createElement('span');
    icon.className = 'portal-action-icon';
    icon.textContent = action.icon || '➡️';

    var body = document.createElement('span');
    body.className = 'portal-action-body';

    var meta = document.createElement('small');
    meta.textContent = action.meta || 'AKSI';

    var title = document.createElement('strong');
    title.textContent = action.title || 'Aksi';

    var desc = document.createElement('span');
    desc.textContent = action.description || '';

    body.appendChild(meta);
    body.appendChild(title);
    body.appendChild(desc);
    button.appendChild(icon);
    button.appendChild(body);

    button.addEventListener('click', function () {
      if (typeof action.run === 'function') action.run();
    });

    return button;
  }

  function getActionsForRole(role) {
    var router = getRouter();
    var cleanRole = normalizeRole(role);
    var isAdmin = cleanRole === 'ADMIN_KECAMATAN' || cleanRole === 'ADMIN_KABUPATEN' || cleanRole === 'SUPER_ADMIN' || cleanRole === 'MITRA_KECAMATAN' || cleanRole === 'MITRA_KABUPATEN';

    if (cleanRole === 'KADER') {
      return [
        {
          icon: '📸',
          meta: 'HARGANAS 2026',
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
          description: 'Periksa dokumentasi yang dikirim tim di wilayah kerja.',
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
    actions.forEach(function (action, index) {
      container.appendChild(createActionButton(action, index === 0));
    });
  }

  function applyLandingContent() {
    var config = getConfig();
    var landing = config.APP_LANDING || {};

    setText('app-landing-title', landing.TITLE || 'Portal TPK Kabupaten Buleleng');
    setText('app-landing-subtitle', landing.SUBTITLE || 'Aplikasi Tim Pendamping Keluarga Kabupaten Buleleng');
    setText('app-landing-event-title', 'HARGANAS 2026');
    setText('app-landing-event-summary', landing.ACTIVE_EVENT_SUMMARY || 'Dalam rangka Hari Keluarga Nasional, setiap Tim TPK diminta mengirim dokumentasi pendampingan berupa 1 foto potrait, 1 foto landscape, dan 1 video pendek.');
    setText('app-landing-event-reason', landing.ACTIVE_EVENT_REASON || 'Dokumentasi digunakan sebagai bahan rekap, verifikasi, dan arsip kegiatan HARGANAS 2026.');
    setText('app-landing-updated-at', landing.UPDATED_AT_LABEL || 'Update 25 Juni 2026');
  }

  function applyProfile(profile) {
    var data = profile || {};
    var wilayah = parseWilayahDisplay(data);
    var role = normalizeRole(data.role_akses || data.role || '');
    var name = getDisplayName(data);
    var nomorTim = getDisplayNomorTim(data);
    var roleLabel = displayRole(role);
    var wilayahText = buildTpkWilayahText(wilayah);

    setText('app-landing-greeting', getGreeting());
    setText('app-landing-welcome-name', name);
    var summaryRole = role === 'KADER' ? 'KADER TPK' : roleLabel;
    var summaryWilayah = wilayah.desa && wilayah.desa !== '-'
      ? 'Desa ' + wilayah.desa + (wilayah.kecamatan && wilayah.kecamatan !== '-' ? ', Kecamatan ' + wilayah.kecamatan : '')
      : wilayahText;
    setText('app-landing-role-summary', 'Anda masuk sebagai ' + summaryRole + ' • Tim ' + nomorTim + ' • ' + summaryWilayah);

    setText('app-landing-nama', name);
    setText('app-landing-id-user', data.id_user || data.username || '-');
    setText('app-landing-role', roleLabel || '-');
    setText('app-landing-nomor-tim', nomorTim);
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

  function syncNetworkBadge() {
    var badge = byId('app-landing-network-badge');
    if (!badge) return;
    var online = typeof navigator === 'undefined' ? true : !!navigator.onLine;
    badge.textContent = online ? 'Online' : 'Offline';
    badge.classList.toggle('portal-status-badge-offline', !online);
  }

  function init() {
    applyLandingContent();
    applyProfile(getStoredProfile());
    syncNetworkBadge();
    bindEvents();
  }

  window.addEventListener('online', syncNetworkBadge);
  window.addEventListener('offline', syncNetworkBadge);

  window.AppLandingView = {
    init: init,
    refresh: init,
    applyProfile: applyProfile
  };
})(window, document);
