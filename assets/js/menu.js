window.MenuModule = (function () {
  'use strict';

  var MENU_CONTAINER_ID = 'menu-grid';

  /**
   * Definisi menu utama final
   * Urutan kader:
   * 1 Registrasi Sasaran
   * 2 Daftar Sasaran
   * 3 Lapor Pendampingan
   * 4 Draft & Sinkronisasi
   * 5 Sinkronisasi
   * 6 Rekap Saya
   * 7 Profil
   * 8 Bantuan
   */
  var MENU_DEFINITIONS = {
    KADER: [
      {
        key: 'registrasi_sasaran',
        title: 'Registrasi Sasaran',
        description: 'Tambah sasaran baru',
        screenId: 'registrasi-screen',
        action: 'openRegistrasi'
      },
      {
        key: 'daftar_sasaran',
        title: 'Daftar Sasaran',
        description: 'Lihat data sasaran tim',
        screenId: 'sasaran-list-screen',
        action: 'openSasaranList'
      },
      {
        key: 'lapor_pendampingan',
        title: 'Lapor Pendampingan',
        description: 'Input laporan pendampingan',
        screenId: 'sasaran-list-screen',
        action: 'openPendampinganEntry'
      },
      {
        key: 'draft_sinkronisasi',
        title: 'Draft & Sinkronisasi',
        description: 'Kelola draft offline',
        screenId: 'sync-screen',
        action: 'openSyncScreen'
      },
      {
        key: 'sinkronisasi',
        title: 'Sinkronisasi',
        description: 'Sinkronkan data offline',
        screenId: 'sync-screen',
        action: 'syncNow'
      },
      {
        key: 'rekap_saya',
        title: 'Rekap Saya',
        description: 'Lihat statistik kader',
        screenId: 'rekap-kader-screen',
        action: 'openRekapKader'
      },
      {
        key: 'profil',
        title: 'Profil',
        description: 'Lihat akun dan ganti password',
        screenId: 'dashboard-screen',
        action: 'openProfile'
      },
      {
        key: 'bantuan',
        title: 'Bantuan',
        description: 'Panduan penggunaan aplikasi',
        screenId: 'dashboard-screen',
        action: 'openHelp'
      }
    ],

    PKB: [
      {
        key: 'daftar_sasaran',
        title: 'Daftar Sasaran',
        description: 'Lihat data sasaran wilayah',
        screenId: 'sasaran-list-screen',
        action: 'openSasaranList'
      },
      {
        key: 'draft_sinkronisasi',
        title: 'Draft & Sinkronisasi',
        description: 'Kelola draft offline',
        screenId: 'sync-screen',
        action: 'openSyncScreen'
      },
      {
        key: 'sinkronisasi',
        title: 'Sinkronisasi',
        description: 'Sinkronkan data offline',
        screenId: 'sync-screen',
        action: 'syncNow'
      },
      {
        key: 'rekap_saya',
        title: 'Rekap Saya',
        description: 'Lihat ringkasan aktivitas',
        screenId: 'rekap-kader-screen',
        action: 'openRekapKader'
      },
      {
        key: 'profil',
        title: 'Profil',
        description: 'Lihat akun dan ganti password',
        screenId: 'dashboard-screen',
        action: 'openProfile'
      },
      {
        key: 'bantuan',
        title: 'Bantuan',
        description: 'Panduan penggunaan aplikasi',
        screenId: 'dashboard-screen',
        action: 'openHelp'
      }
    ],

    ADMIN_KECAMATAN: [
      {
        key: 'daftar_sasaran',
        title: 'Daftar Sasaran',
        description: 'Lihat data sasaran wilayah',
        screenId: 'sasaran-list-screen',
        action: 'openSasaranList'
      },
      {
        key: 'draft_sinkronisasi',
        title: 'Draft & Sinkronisasi',
        description: 'Kelola draft offline',
        screenId: 'sync-screen',
        action: 'openSyncScreen'
      },
      {
        key: 'sinkronisasi',
        title: 'Sinkronisasi',
        description: 'Sinkronkan data offline',
        screenId: 'sync-screen',
        action: 'syncNow'
      },
      {
        key: 'rekap_saya',
        title: 'Rekap Saya',
        description: 'Lihat ringkasan aktivitas',
        screenId: 'rekap-kader-screen',
        action: 'openRekapKader'
      },
      {
        key: 'profil',
        title: 'Profil',
        description: 'Lihat akun dan ganti password',
        screenId: 'dashboard-screen',
        action: 'openProfile'
      },
      {
        key: 'bantuan',
        title: 'Bantuan',
        description: 'Panduan penggunaan aplikasi',
        screenId: 'dashboard-screen',
        action: 'openHelp'
      }
    ],

    ADMIN_KABUPATEN: [
      {
        key: 'daftar_sasaran',
        title: 'Daftar Sasaran',
        description: 'Lihat data sasaran wilayah',
        screenId: 'sasaran-list-screen',
        action: 'openSasaranList'
      },
      {
        key: 'draft_sinkronisasi',
        title: 'Draft & Sinkronisasi',
        description: 'Kelola draft offline',
        screenId: 'sync-screen',
        action: 'openSyncScreen'
      },
      {
        key: 'sinkronisasi',
        title: 'Sinkronisasi',
        description: 'Sinkronkan data offline',
        screenId: 'sync-screen',
        action: 'syncNow'
      },
      {
        key: 'rekap_saya',
        title: 'Rekap Saya',
        description: 'Lihat ringkasan aktivitas',
        screenId: 'rekap-kader-screen',
        action: 'openRekapKader'
      },
      {
        key: 'profil',
        title: 'Profil',
        description: 'Lihat akun dan ganti password',
        screenId: 'dashboard-screen',
        action: 'openProfile'
      },
      {
        key: 'bantuan',
        title: 'Bantuan',
        description: 'Panduan penggunaan aplikasi',
        screenId: 'dashboard-screen',
        action: 'openHelp'
      }
    ],

    MITRA: [
      {
        key: 'daftar_sasaran',
        title: 'Daftar Sasaran',
        description: 'Lihat data sasaran wilayah',
        screenId: 'sasaran-list-screen',
        action: 'openSasaranList'
      },
      {
        key: 'rekap_saya',
        title: 'Rekap Saya',
        description: 'Lihat ringkasan aktivitas',
        screenId: 'rekap-kader-screen',
        action: 'openRekapKader'
      },
      {
        key: 'profil',
        title: 'Profil',
        description: 'Lihat akun',
        screenId: 'dashboard-screen',
        action: 'openProfile'
      },
      {
        key: 'bantuan',
        title: 'Bantuan',
        description: 'Panduan penggunaan aplikasi',
        screenId: 'dashboard-screen',
        action: 'openHelp'
      }
    ]
  };

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

  function getSessionProfile() {
    try {
      if (window.Session && typeof window.Session.getProfile === 'function') {
        return window.Session.getProfile() || {};
      }

      if (window.SessionManager && typeof window.SessionManager.getProfile === 'function') {
        return window.SessionManager.getProfile() || {};
      }

      var rawProfile = localStorage.getItem('profile');
      if (rawProfile) return JSON.parse(rawProfile);

      var rawSession = localStorage.getItem('session');
      if (rawSession) return JSON.parse(rawSession);

      return {};
    } catch (e) {
      return {};
    }
  }

  function getMenuForRole(role) {
    var cleanRole = normalizeRole(role);

    if (MENU_DEFINITIONS[cleanRole]) {
      return MENU_DEFINITIONS[cleanRole];
    }

    return MENU_DEFINITIONS.KADER;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function createMenuCardHtml(item) {
    return [
      '<button',
      ' type="button"',
      ' class="menu-card"',
      ' data-menu-key="', escapeHtml(item.key), '"',
      ' data-menu-action="', escapeHtml(item.action || ''), '"',
      ' data-screen-id="', escapeHtml(item.screenId || ''), '"',
      '>',
      '<h4>', escapeHtml(item.title || '-'), '</h4>',
      '<p>', escapeHtml(item.description || ''), '</p>',
      '</button>'
    ].join('');
  }

  function renderMenu(role) {
    var container = document.getElementById(MENU_CONTAINER_ID);
    if (!container) return;

    var items = getMenuForRole(role);
    container.innerHTML = items.map(createMenuCardHtml).join('');

    bindMenuActions(container, items);
  }

  function bindMenuActions(container, items) {
    var buttons = container.querySelectorAll('.menu-card');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-menu-action') || '';
        var screenId = btn.getAttribute('data-screen-id') || '';
        handleMenuAction(action, screenId, btn);
      });
    });
  }

  function showScreen(screenId) {
    if (!screenId) return false;

    if (window.Router && typeof window.Router.showScreen === 'function') {
      window.Router.showScreen(screenId);
      return true;
    }

    if (window.AppRouter && typeof window.AppRouter.showScreen === 'function') {
      window.AppRouter.showScreen(screenId);
      return true;
    }

    var screens = document.querySelectorAll('.screen');
    if (!screens.length) return false;

    screens.forEach(function (screen) {
      screen.classList.remove('active');
      screen.classList.add('hidden');
    });

    var target = document.getElementById(screenId);
    if (!target) return false;

    target.classList.remove('hidden');
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }

  function callIfExists(obj, fnName, args) {
    if (obj && typeof obj[fnName] === 'function') {
      return obj[fnName].apply(obj, args || []);
    }
    return undefined;
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

  function openRegistrasi() {
    if (window.RegistrasiForm && typeof window.RegistrasiForm.openCreate === 'function') {
      window.RegistrasiForm.openCreate();
      return;
    }

    if (window.RegistrasiModule && typeof window.RegistrasiModule.openCreate === 'function') {
      window.RegistrasiModule.openCreate();
      return;
    }

    showScreen('registrasi-screen');
  }

  function openSasaranList() {
    if (window.SasaranList && typeof window.SasaranList.open === 'function') {
      window.SasaranList.open();
      return;
    }

    if (window.SasaranListScreen && typeof window.SasaranListScreen.open === 'function') {
      window.SasaranListScreen.open();
      return;
    }

    showScreen('sasaran-list-screen');

    if (window.SasaranList && typeof window.SasaranList.load === 'function') {
      window.SasaranList.load();
    }
  }

  function openPendampinganEntry() {
    /**
     * Pendampingan idealnya dipilih dari sasaran dulu.
     * Jadi menu ini diarahkan ke daftar sasaran.
     */
    openSasaranList();
    showToast('Pilih sasaran terlebih dahulu untuk membuat pendampingan.', 'info');
  }

  function openSyncScreen() {
    showScreen('sync-screen');

    if (window.SyncUI && typeof window.SyncUI.refreshScreen === 'function') {
      window.SyncUI.refreshScreen();
      return;
    }

    if (window.SyncScreen && typeof window.SyncScreen.refresh === 'function') {
      window.SyncScreen.refresh();
      return;
    }

    if (window.OfflineSync && typeof window.OfflineSync.refreshQueueView === 'function') {
      window.OfflineSync.refreshQueueView();
    }
  }

  function syncNow() {
    if (window.OfflineSync && typeof window.OfflineSync.syncQueueNow === 'function') {
      window.OfflineSync.syncQueueNow();
      return;
    }

    if (window.SyncUI && typeof window.SyncUI.syncAll === 'function') {
      window.SyncUI.syncAll();
      return;
    }

    if (window.App && typeof window.App.syncQueueNow === 'function') {
      window.App.syncQueueNow();
      return;
    }

    openSyncScreen();
    showToast('Fitur sinkronisasi belum terhubung penuh. Membuka halaman sinkronisasi.', 'warning');
  }

  function openRekapKader() {
    showScreen('rekap-kader-screen');

    if (window.RekapKaderScreen && typeof window.RekapKaderScreen.load === 'function') {
      window.RekapKaderScreen.load();
      return;
    }

    if (window.RekapKader && typeof window.RekapKader.load === 'function') {
      window.RekapKader.load();
    }
  }

  function openProfile() {
    if (window.App && typeof window.App.openProfileDialog === 'function') {
      window.App.openProfileDialog();
      return;
    }

    if (window.ProfileUI && typeof window.ProfileUI.open === 'function') {
      window.ProfileUI.open();
      return;
    }

    showToast('Fitur profil akan ditampilkan pada modul pengaturan/profil.', 'info');
  }

  function openHelp() {
    if (window.App && typeof window.App.openHelpDialog === 'function') {
      window.App.openHelpDialog();
      return;
    }

    if (window.HelpUI && typeof window.HelpUI.open === 'function') {
      window.HelpUI.open();
      return;
    }

    showToast('Panduan penggunaan aplikasi akan ditambahkan pada modul bantuan.', 'info');
  }

  function handleMenuAction(action, screenId) {
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
        if (!showScreen(screenId)) {
          showToast('Menu belum tersedia.', 'warning');
        }
        break;
    }
  }

  function init() {
    var profile = getSessionProfile();
    var role = profile.role_akses || profile.role || 'KADER';
    renderMenu(role);
  }

  function refresh() {
    init();
  }

  function setRole(role) {
    renderMenu(role || 'KADER');
  }

  function getDefinitions() {
    return JSON.parse(JSON.stringify(MENU_DEFINITIONS));
  }

  return {
    init: init,
    refresh: refresh,
    setRole: setRole,
    renderMenu: renderMenu,
    getDefinitions: getDefinitions,
    normalizeRole: normalizeRole
  };
})();

window.Menu = window.MenuModule;

/**
 * Auto init
 */
document.addEventListener('DOMContentLoaded', function () {
  if (window.MenuModule && typeof window.MenuModule.init === 'function') {
    window.MenuModule.init();
  }
});
