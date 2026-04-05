(function (window, document) {
  'use strict';

  var MENU_CONTAINER_ID = 'menu-grid';

  var BASE_MENU = {
    daftar_sasaran: {
      key: 'daftar_sasaran',
      title: 'Daftar Sasaran',
      description: 'Lihat data sasaran wilayah',
      route: 'sasaranList',
      action: 'openSasaranList',
      icon: '👥',
      meta: 'Data'
    },
    registrasi_sasaran: {
      key: 'registrasi_sasaran',
      title: 'Registrasi Sasaran',
      description: 'Tambah sasaran baru',
      route: 'registrasi',
      action: 'openRegistrasi',
      icon: '📝',
      meta: 'Input'
    },
    lapor_pendampingan: {
      key: 'lapor_pendampingan',
      title: 'Lapor Pendampingan',
      description: 'Input laporan pendampingan',
      route: 'sasaranList',
      action: 'openPendampinganEntry',
      icon: '📋',
      meta: 'Laporan'
    },
    draft_sinkronisasi: {
      key: 'draft_sinkronisasi',
      title: 'Draft & Sinkronisasi',
      description: 'Kelola draft offline',
      route: 'sync',
      action: 'openSyncScreen',
      icon: '🗂️',
      meta: 'Offline'
    },
    sinkronisasi: {
      key: 'sinkronisasi',
      title: 'Sinkronisasi',
      description: 'Sinkronkan data offline',
      route: 'sync',
      action: 'syncNow',
      icon: '🔄',
      meta: 'Sync'
    },
    rekap_saya: {
      key: 'rekap_saya',
      title: 'Rekap Saya',
      description: 'Lihat ringkasan aktivitas',
      route: 'rekapKader',
      action: 'openRekapKader',
      icon: '📊',
      meta: 'Statistik'
    },
    profil: {
      key: 'profil',
      title: 'Profil',
      description: 'Lihat akun dan ubah profil',
      route: 'dashboard',
      action: 'openProfile',
      icon: '👤',
      meta: 'Akun'
    },
    bantuan: {
      key: 'bantuan',
      title: 'Bantuan',
      description: 'Panduan penggunaan aplikasi',
      route: 'dashboard',
      action: 'openHelp',
      icon: '❓',
      meta: 'Info'
    }
  };

  var ROLE_MENU_KEYS = {
    KADER: [
      'registrasi_sasaran',
      'daftar_sasaran',
      'lapor_pendampingan',
      'draft_sinkronisasi',
      'sinkronisasi',
      'rekap_saya',
      'profil',
      'bantuan'
    ],
    PKB: [
      'daftar_sasaran',
      'draft_sinkronisasi',
      'sinkronisasi',
      'rekap_saya',
      'profil',
      'bantuan'
    ],
    ADMIN_KECAMATAN: [
      'daftar_sasaran',
      'draft_sinkronisasi',
      'sinkronisasi',
      'rekap_saya',
      'profil',
      'bantuan'
    ],
    ADMIN_KABUPATEN: [
      'daftar_sasaran',
      'draft_sinkronisasi',
      'sinkronisasi',
      'rekap_saya',
      'profil',
      'bantuan'
    ],
    SUPER_ADMIN: [
      'daftar_sasaran',
      'draft_sinkronisasi',
      'sinkronisasi',
      'rekap_saya',
      'profil',
      'bantuan'
    ],
    MITRA: [
      'daftar_sasaran',
      'rekap_saya',
      'profil',
      'bantuan'
    ]
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function getUI() {
    return window.UI || null;
  }

  function getRouter() {
    return window.Router || null;
  }

  function getState() {
    return window.AppState || null;
  }

  function getStorage() {
    return window.Storage || null;
  }

  function getStorageKeys() {
    return (window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS) || {};
  }

  function deepClone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return value;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeRole(role) {
    var raw = String(role || '').trim().toUpperCase();

    var map = {
      'SUPERADMIN': 'SUPER_ADMIN',
      'SUPER ADMIN': 'SUPER_ADMIN',
      'SUPER_ADMIN': 'SUPER_ADMIN',

      'ADMIN KECAMATAN': 'ADMIN_KECAMATAN',
      'ADMIN_KECAMATAN': 'ADMIN_KECAMATAN',

      'ADMIN KABUPATEN': 'ADMIN_KABUPATEN',
      'ADMIN_KABUPATEN': 'ADMIN_KABUPATEN',

      'PKB': 'PKB',

      'MITRA': 'MITRA',
      'MITRA DESA': 'MITRA',
      'MITRA_DESA': 'MITRA',
      'MITRA KECAMATAN': 'MITRA',
      'MITRA_KECAMATAN': 'MITRA',
      'MITRA KABUPATEN': 'MITRA',
      'MITRA_KABUPATEN': 'MITRA',

      'KADER': 'KADER'
    };

    return map[raw] || 'KADER';
  }

  function getProfile() {
    var state = getState();
    if (state && typeof state.getProfile === 'function') {
      var profileFromState = state.getProfile();
      if (profileFromState && Object.keys(profileFromState).length) {
        return profileFromState;
      }
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.PROFILE) {
      return storage.get(keys.PROFILE, {}) || {};
    }

    return {};
  }

  function getMenuForRole(role) {
    var cleanRole = normalizeRole(role);
    var keys = ROLE_MENU_KEYS[cleanRole] || ROLE_MENU_KEYS.KADER;

    return keys.map(function (key) {
      return deepClone(BASE_MENU[key]);
    }).filter(Boolean);
  }

  function getMenuAccentClass(index) {
    var classes = [
      'menu-card-accent-1',
      'menu-card-accent-2',
      'menu-card-accent-3',
      'menu-card-accent-4',
      'menu-card-accent-5',
      'menu-card-accent-6'
    ];

    return classes[index % classes.length];
  }

  function createMenuCardHtml(item, index) {
    var accentClass = getMenuAccentClass(index);

    return [
      '<button',
      ' type="button"',
      ' class="menu-card ', accentClass, '"',
      ' data-menu-key="', escapeHtml(item.key), '"',
      ' data-menu-action="', escapeHtml(item.action || ''), '"',
      ' data-menu-route="', escapeHtml(item.route || ''), '"',
      '>',
        '<span class="menu-card__head">',
          '<span class="menu-card__icon" aria-hidden="true">', escapeHtml(item.icon || '•'), '</span>',
          '<span class="menu-card__meta">', escapeHtml(item.meta || 'Menu'), '</span>',
        '</span>',
        '<h4>', escapeHtml(item.title || '-'), '</h4>',
        '<p>', escapeHtml(item.description || ''), '</p>',
        '<span class="menu-card__cta">Buka Menu →</span>',
      '</button>'
    ].join('');
  }

  function renderMenu(role) {
    var container = byId(MENU_CONTAINER_ID);
    if (!container) return;

    var items = getMenuForRole(role);
    container.innerHTML = items.map(function (item, index) {
      return createMenuCardHtml(item, index);
    }).join('');

    bindMenuActions(container);
  }

  function showToast(message, type) {
    var ui = getUI();

    if (ui && typeof ui.showToast === 'function') {
      ui.showToast(message, type || 'info');
      return;
    }

    try {
      window.alert(message);
    } catch (err) {}
  }

  function go(routeName) {
    var router = getRouter();

    if (router && typeof router.go === 'function') {
      return router.go(routeName);
    }

    if (router) {
      switch (routeName) {
        case 'dashboard': return router.toDashboard && router.toDashboard();
        case 'login': return router.toLogin && router.toLogin();
        case 'sasaranList': return router.toSasaranList && router.toSasaranList();
        case 'sasaranDetail': return router.toSasaranDetail && router.toSasaranDetail();
        case 'registrasi': return router.toRegistrasi && router.toRegistrasi();
        case 'pendampingan': return router.toPendampingan && router.toPendampingan();
        case 'sync': return router.toSyncScreen && router.toSyncScreen();
        case 'rekapKader': return router.toRekapKader && router.toRekapKader();
      }
    }

    return false;
  }

  function openRegistrasi() {
    var state = getState();

    if (state && typeof state.setRegistrasiMode === 'function') {
      state.setRegistrasiMode('create');
    }

    if (window.RegistrasiView && typeof window.RegistrasiView.openCreate === 'function') {
      window.RegistrasiView.openCreate();
      return;
    }

    go('registrasi');
  }

  function openSasaranList() {
    go('sasaranList');

    if (window.SasaranListView && typeof window.SasaranListView.load === 'function') {
      window.SasaranListView.load();
    }
  }

  function openPendampinganEntry() {
    openSasaranList();
    showToast('Pilih sasaran terlebih dahulu untuk membuat pendampingan.', 'info');
  }

  function openSyncScreen() {
    go('sync');

    if (window.SyncView && typeof window.SyncView.refresh === 'function') {
      window.SyncView.refresh();
    }
  }

  function syncNow() {
    if (window.SyncView && typeof window.SyncView.syncAll === 'function') {
      window.SyncView.syncAll();
      return;
    }

    openSyncScreen();
    showToast('Fitur sinkronisasi akan dijalankan dari halaman sinkronisasi.', 'info');
  }

  function openRekapKader() {
    go('rekapKader');

    if (window.RekapKaderView && typeof window.RekapKaderView.load === 'function') {
      window.RekapKaderView.load();
    }
  }

  function openProfile() {
    if (window.App && typeof window.App.openProfileDialog === 'function') {
      window.App.openProfileDialog();
      return;
    }

    if (window.UI && typeof window.UI.openModal === 'function') {
      window.UI.syncProfileModalBasic && window.UI.syncProfileModalBasic();
      window.UI.openModal('profile-modal');
      return;
    }

    showToast('Fitur profil belum siap.', 'warning');
  }

  function openHelp() {
    if (window.App && typeof window.App.openHelpDialog === 'function') {
      window.App.openHelpDialog();
      return;
    }

    if (window.UI && typeof window.UI.openModal === 'function') {
      window.UI.openModal('help-modal');
      return;
    }

    showToast('Panduan penggunaan belum siap.', 'warning');
  }

  function handleMenuAction(action, route) {
    switch (action) {
      case 'openRegistrasi':
        openRegistrasi();
        break;
      case 'openSasaranList':
        openSasaranList();
        break;
      case 'openPendampinganEntry':
        openPendampinganEntry();
        break;
      case 'openSyncScreen':
        openSyncScreen();
        break;
      case 'syncNow':
        syncNow();
        break;
      case 'openRekapKader':
        openRekapKader();
        break;
      case 'openProfile':
        openProfile();
        break;
      case 'openHelp':
        openHelp();
        break;
      default:
        if (!go(route)) {
          showToast('Menu belum tersedia.', 'warning');
        }
        break;
    }
  }

  function bindMenuActions(container) {
    var buttons = container.querySelectorAll('.menu-card');

    buttons.forEach(function (btn) {
      if (btn.dataset.bound === '1') return;

      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-menu-action') || '';
        var route = btn.getAttribute('data-menu-route') || '';
        handleMenuAction(action, route);
      });
    });
  }

  function applyDashboardProfile(profile) {
    var ui = getUI();
    var data = profile || {};

    if (!ui || typeof ui.setText !== 'function') return;

    ui.setText('profile-nama', data.nama_kader || data.nama_user || data.nama || '-');
    ui.setText('profile-unsur', data.unsur_tpk || data.unsur || '-');
    ui.setText('profile-id', data.id_user || '-');
    ui.setText('profile-tim', data.nama_tim || data.id_tim || '-');
    ui.setText('profile-desa', data.desa_kelurahan || data.nama_desa || '-');
    ui.setText('profile-dusun', data.dusun_rw || data.nama_dusun || '-');
    ui.setText('header-kecamatan', data.nama_kecamatan || data.kecamatan || '-');
  }

  function init() {
    var profile = getProfile();
    var role = profile.role_akses || profile.role || 'KADER';

    applyDashboardProfile(profile);
    renderMenu(role);
  }

  function refresh() {
    init();
  }

  function setRole(role) {
    renderMenu(role || 'KADER');
  }

  function getDefinitions() {
    return {
      base: deepClone(BASE_MENU),
      roleMap: deepClone(ROLE_MENU_KEYS)
    };
  }

  var DashboardView = {
    init: init,
    refresh: refresh,
    setRole: setRole,
    renderMenu: renderMenu,
    getDefinitions: getDefinitions,
    normalizeRole: normalizeRole,
    applyDashboardProfile: applyDashboardProfile,
    openRegistrasi: openRegistrasi,
    openSasaranList: openSasaranList,
    openPendampinganEntry: openPendampinganEntry,
    openSyncScreen: openSyncScreen,
    openRekapKader: openRekapKader
  };

  window.DashboardView = DashboardView;

  // Alias sementara agar referensi lama tidak langsung patah
  window.MenuModule = DashboardView;
  window.Menu = DashboardView;

  document.addEventListener('DOMContentLoaded', function () {
    if (window.DashboardView && typeof window.DashboardView.init === 'function') {
      window.DashboardView.init();
    }
  });
})(window, document);
