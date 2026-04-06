(function (window, document) {
  'use strict';

  var MENU_CONTAINER_ID = 'menu-grid';
  var FONT_SIZE_KEY = 'tpk_app_font_size';
  var THEME_KEY = 'tpk_app_theme';
  var LIGHT_CACHE_KEYS = [
    FONT_SIZE_KEY,
    THEME_KEY,
    'tpk_last_screen',
    'tpk_last_filter_sasaran',
    'tpk_last_filter_sync',
    'tpk_last_filter_rekap'
  ];

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

  function getApi() {
    return window.Api || null;
  }

  function getAuth() {
    return window.Auth || null;
  }

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
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

  function setHidden(id, hidden) {
    var el = typeof id === 'string' ? byId(id) : id;
    if (!el) return;
    el.classList.toggle('hidden', !!hidden);
  }

  function setText(id, value) {
    var el = byId(id);
    if (!el) return;
    el.textContent = value == null || value === '' ? '-' : String(value);
  }

  function setValue(id, value) {
    var el = byId(id);
    if (!el) return;
    el.value = value == null ? '' : String(value);
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

  function normalizeYesNo(value) {
    var raw = String(value || '').trim().toUpperCase();
    if (raw === 'YA' || raw === 'Y' || raw === 'TRUE' || raw === '1') return 'YA';
    if (raw === 'TIDAK' || raw === 'T' || raw === 'FALSE' || raw === '0') return 'TIDAK';
    return raw || '';
  }

  function formatFlag(value) {
    var normalized = normalizeYesNo(value);
    return normalized || '-';
  }

  function formatRupiah(value) {
    if (value == null || value === '') return '-';
    var digits = String(value).replace(/[^0-9]/g, '');
    if (!digits) return String(value);
    try {
      return 'Rp ' + Number(digits).toLocaleString('id-ID');
    } catch (err) {
      return 'Rp ' + digits;
    }
  }

  function formatPhone(value) {
    return value ? String(value) : '-';
  }

  function getDisplayNomorTim(data) {
    data = data || {};

    var explicitNomor = data.nomor_tim || data.nomor_tim_display || data.nomor_tim_lokal || '';
    if (explicitNomor !== undefined && explicitNomor !== null && String(explicitNomor).trim() !== '') {
      return String(explicitNomor).trim();
    }

    var namaTim = String(data.nama_tim || '').trim();
    if (namaTim) {
      var match = namaTim.match(/(\d+)\s*$/);
      if (match && match[1]) {
        return match[1];
      }
      return namaTim;
    }

    return data.id_tim || '-';
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

  function persistProfile(profile) {
    var data = profile || {};
    var state = getState();
    var storage = getStorage();
    var keys = getStorageKeys();

    if (state && typeof state.setProfile === 'function') {
      state.setProfile(data);
    } else if (state) {
      state.profile = data;
    }

    if (storage && typeof storage.set === 'function' && keys.PROFILE) {
      storage.set(keys.PROFILE, data);
      return;
    }

    try {
      localStorage.setItem('tpk_profile', JSON.stringify(data));
    } catch (err) {}
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
    applyFontSize(getFontSizeValue());
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

  function openModal(modalId) {
    var modal = byId(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modalId) {
    var modal = byId(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');

    if (!document.querySelector('.modal-overlay.active')) {
      document.body.style.overflow = '';
    }
  }

  function bindOverlayClose(modalId) {
    var modal = byId(modalId);
    if (!modal || modal.dataset.overlayBound === '1') return;

    modal.dataset.overlayBound = '1';
    modal.addEventListener('click', function (event) {
      if (event.target === modal) {
        closeModal(modalId);
      }
    });
  }

  function applyDashboardProfile(profile) {
    var data = profile || {};

    setText('profile-nama', data.nama_kader || data.nama_user || data.nama || '-');
    setText('profile-unsur', data.unsur_tpk || data.unsur || '-');
    setText('profile-id', data.id_user || '-');
    setText('profile-tim', getDisplayNomorTim(data));
    setText('profile-desa', data.desa_kelurahan || data.nama_desa || '-');
    setText('profile-dusun', data.dusun_rw || data.nama_dusun || '-');
    setText('header-kecamatan', data.nama_kecamatan || data.kecamatan || '-');

    setText('modal-profile-nama', data.nama_kader || data.nama_user || data.nama || '-');
    setText('modal-profile-id', data.id_user || '-');
    setText('modal-profile-unsur', data.unsur_tpk || data.unsur || '-');
    setText('modal-profile-tim', getDisplayNomorTim(data));
    setText('modal-profile-kecamatan', data.nama_kecamatan || data.kecamatan || '-');
    setText('modal-profile-desa', data.desa_kelurahan || data.nama_desa || '-');
    setText('modal-profile-dusun', data.dusun_rw || data.nama_dusun || '-');
    setText('modal-profile-status-kader', data.status_kader_tpk || '-');
    setText('modal-profile-nomor-wa', formatPhone(data.nomor_wa));
    setText('modal-profile-bpjstk', formatFlag(data.memiliki_bpjstk || data.status_bpjstk));
    setText('modal-profile-mbg', formatFlag(data.mengantar_mbg_3b || data.status_mbg));
    setText('modal-profile-mbg-insentif', formatFlag(data.mendapat_insentif_mbg_3b || data.insentif_mbg_3b));
    setText('modal-profile-mbg-rupiah', formatRupiah(data.insentif_mbg_3b_per_sasaran || data.insentif_mbg));
  }

  function fillProfileForm(profile) {
    var data = profile || {};
    setValue('profile-status-kader', data.status_kader_tpk || '');
    setValue('profile-nomor-wa', data.nomor_wa || '');
    setValue('profile-memiliki-bpjstk', normalizeYesNo(data.memiliki_bpjstk || data.status_bpjstk));
    setValue('profile-mengantar-mbg', normalizeYesNo(data.mengantar_mbg_3b || data.status_mbg));
    setValue('profile-mendapat-insentif-mbg', normalizeYesNo(data.mendapat_insentif_mbg_3b || data.insentif_mbg_3b));
    setValue('profile-insentif-rupiah', data.insentif_mbg_3b_per_sasaran || data.insentif_mbg || '');
    toggleProfileDependentFields();
  }

  function enterProfileEditMode() {
    setHidden('profile-view-mode', true);
    setHidden('profile-edit-mode', false);
    fillProfileForm(getProfile());
  }

  function exitProfileEditMode() {
    setHidden('profile-edit-mode', true);
    setHidden('profile-view-mode', false);
    clearProfileEditMessage();
  }

  function showProfileEditMessage(message, type) {
    var box = byId('profile-edit-message');
    if (!box) return;
    box.className = 'login-message ' + (type || 'success');
    box.textContent = message;
    box.classList.remove('hidden');
  }

  function clearProfileEditMessage() {
    var box = byId('profile-edit-message');
    if (!box) return;
    box.textContent = '';
    box.className = 'login-message hidden';
  }

  function toggleProfileDependentFields() {
    var mengantar = normalizeYesNo(byId('profile-mengantar-mbg') && byId('profile-mengantar-mbg').value);
    var mendapat = normalizeYesNo(byId('profile-mendapat-insentif-mbg') && byId('profile-mendapat-insentif-mbg').value);

    var showInsentifToggle = mengantar === 'YA';
    var showRupiah = showInsentifToggle && mendapat === 'YA';

    setHidden('group-profile-mbg-insentif', !showInsentifToggle);
    setHidden('group-profile-insentif-rupiah', !showRupiah);

    if (!showInsentifToggle) {
      setValue('profile-mendapat-insentif-mbg', '');
      setValue('profile-insentif-rupiah', '');
    } else if (!showRupiah) {
      setValue('profile-insentif-rupiah', '');
    }
  }

  function getProfilePayload() {
    var mengantar = normalizeYesNo(byId('profile-mengantar-mbg') && byId('profile-mengantar-mbg').value);
    var mendapat = normalizeYesNo(byId('profile-mendapat-insentif-mbg') && byId('profile-mendapat-insentif-mbg').value);
    var rupiahRaw = byId('profile-insentif-rupiah') ? byId('profile-insentif-rupiah').value : '';
    var rupiahDigits = String(rupiahRaw || '').replace(/[^0-9]/g, '');

    return {
      status_kader_tpk: byId('profile-status-kader') ? byId('profile-status-kader').value.trim() : '',
      nomor_wa: byId('profile-nomor-wa') ? byId('profile-nomor-wa').value.trim() : '',
      memiliki_bpjstk: normalizeYesNo(byId('profile-memiliki-bpjstk') && byId('profile-memiliki-bpjstk').value),
      mengantar_mbg_3b: mengantar,
      mendapat_insentif_mbg_3b: mengantar === 'YA' ? mendapat : 'TIDAK',
      insentif_mbg_3b_per_sasaran: mengantar === 'YA' && mendapat === 'YA' ? (rupiahDigits || '') : ''
    };
  }

  function validateProfilePayload(payload) {
    if (!payload.status_kader_tpk) {
      return 'Status kader wajib dipilih.';
    }
    if (!payload.nomor_wa) {
      return 'Nomor WA wajib diisi.';
    }
    if (!/^[0-9+]{8,20}$/.test(payload.nomor_wa.replace(/\s+/g, ''))) {
      return 'Nomor WA belum valid.';
    }
    if (!payload.memiliki_bpjstk) {
      return 'Status BPJSTK wajib dipilih.';
    }
    if (!payload.mengantar_mbg_3b) {
      return 'Status mengantar MBG 3B wajib dipilih.';
    }
    if (payload.mengantar_mbg_3b === 'YA' && !payload.mendapat_insentif_mbg_3b) {
      return 'Status insentif MBG 3B wajib dipilih.';
    }
    if (payload.mengantar_mbg_3b === 'YA' && payload.mendapat_insentif_mbg_3b === 'YA' && !payload.insentif_mbg_3b_per_sasaran) {
      return 'Nominal insentif per sasaran wajib diisi.';
    }
    return '';
  }

  function mergeProfilePayload(current, payload, responseData) {
    var merged = Object.assign({}, current || {}, payload || {});
    if (responseData && typeof responseData === 'object') {
      merged = Object.assign(merged, responseData.profile || responseData.user || responseData.data || responseData);
    }
    return merged;
  }

  async function saveProfileUpdate(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    clearProfileEditMessage();

    var payload = getProfilePayload();
    var validationMessage = validateProfilePayload(payload);
    if (validationMessage) {
      showProfileEditMessage(validationMessage, 'error');
      return;
    }

    var saveButton = byId('btn-profile-save');
    var originalText = saveButton ? saveButton.textContent : '';
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'Menyimpan...';
    }

    try {
      var result = null;

      if (window.ProfileService && typeof window.ProfileService.updateMyProfile === 'function') {
        result = await window.ProfileService.updateMyProfile(payload);
      } else if (getApi() && typeof getApi().post === 'function') {
        result = await getApi().post('updateMyProfile', payload);
      } else if (window.App && typeof window.App.updateMyProfile === 'function') {
        result = await window.App.updateMyProfile(payload);
      } else {
        throw new Error('API update profil belum tersedia.');
      }

      if (result && result.ok === false) {
        throw new Error(result.message || 'Gagal menyimpan perubahan profil.');
      }

      var updated = mergeProfilePayload(getProfile(), payload, result && (result.data || result));
      persistProfile(updated);
      applyDashboardProfile(updated);
      fillProfileForm(updated);
      exitProfileEditMode();
      showToast((result && result.message) || 'Profil berhasil diperbarui.', 'success');
      openProfile();
    } catch (err) {
      showProfileEditMessage(err && err.message ? err.message : 'Gagal menyimpan perubahan profil.', 'error');
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = originalText || 'Simpan Perubahan';
      }
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

  function updateNetworkBadge() {
    var badge = byId('network-badge');
    if (!badge) return;

    var isOnline = navigator.onLine !== false;
    badge.textContent = isOnline ? 'Online' : 'Offline';
    badge.classList.toggle('badge-danger-soft', !isOnline);
  }

  function bindNetworkStatus() {
    if (window.__dashboardNetworkBound) return;
    window.__dashboardNetworkBound = true;

    updateNetworkBadge();
    window.addEventListener('online', updateNetworkBadge);
    window.addEventListener('offline', updateNetworkBadge);
  }

  function getFontSizeValue() {
    try {
      return localStorage.getItem(FONT_SIZE_KEY) || 'standard';
    } catch (err) {
      return 'standard';
    }
  }

  function getThemeValue() {
    try {
      return localStorage.getItem(THEME_KEY) || 'light';
    } catch (err) {
      return 'light';
    }
  }

  function getFontScaleMultiplier(value) {
    if (value === 'large') return 1.08;
    if (value === 'xlarge') return 1.16;
    return 1;
  }

  function applyGlobalFontScale(multiplier) {
    var nodes = document.querySelectorAll(
      '#app-shell h1, #app-shell h2, #app-shell h3, #app-shell h4, #app-shell p, #app-shell span, #app-shell strong, #app-shell label, #app-shell small, #app-shell li, #app-shell a, #app-shell button, #app-shell input, #app-shell select, #app-shell textarea, #toast-container .toast'
    );

    Array.prototype.forEach.call(nodes, function (node) {
      if (!node) return;
      var tag = (node.tagName || '').toUpperCase();
      if (tag === 'OPTION') return;

      if (!node.dataset.baseFontSize) {
        var computed = window.getComputedStyle(node).fontSize || '';
        var parsed = parseFloat(computed);
        if (!parsed || Number.isNaN(parsed)) return;
        node.dataset.baseFontSize = String(parsed);
      }

      var base = parseFloat(node.dataset.baseFontSize || '0');
      if (!base || Number.isNaN(base)) return;
      node.style.fontSize = (base * multiplier).toFixed(2) + 'px';
    });
  }

  function ensureFontSizeControl() {
    var fontSelect = byId('setting-font-size');
    if (!fontSelect || !fontSelect.parentElement) return;

    var wrapper = fontSelect.parentElement;
    if (!byId('theme-toggle-row')) {
      wrapper.insertAdjacentHTML('afterbegin', [
        '<div id="theme-toggle-row" class="setting-inline-row">',
          '<div class="setting-inline-label">',
            '<strong>Mode Gelap</strong>',
            '<span>Aktifkan tampilan malam yang lebih nyaman di mata.</span>',
          '</div>',
          '<input type="checkbox" id="setting-dark-mode" class="darkmode-toggle" aria-label="Mode gelap" />',
        '</div>'
      ].join(''));
    }

    if (!byId('font-scale-control')) {
      wrapper.insertAdjacentHTML('beforeend', [
        '<div id="font-scale-control" class="font-scale-control" role="group" aria-label="Pilihan ukuran teks">',
          '<button type="button" class="font-scale-btn" data-font-size="standard" aria-pressed="false">A-</button>',
          '<button type="button" class="font-scale-btn" data-font-size="large" aria-pressed="false">A0</button>',
          '<button type="button" class="font-scale-btn" data-font-size="xlarge" aria-pressed="false">A+</button>',
        '</div>',
        '<div id="font-scale-preview" class="font-scale-preview" data-size="standard" aria-live="polite">',
          '<p class="font-scale-preview__sample">Contoh tampilan teks aplikasi kader TPK Kabupaten Buleleng.</p>',
        '</div>'
      ].join(''));
    }

    fontSelect.classList.add('hidden');
    fontSelect.setAttribute('aria-hidden', 'true');
  }

  function updateFontSizeButtons(value) {
    var buttons = document.querySelectorAll('.font-scale-btn');
    Array.prototype.forEach.call(buttons, function (btn) {
      var isActive = (btn.getAttribute('data-font-size') || '') === value;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    var preview = byId('font-scale-preview');
    if (preview) {
      preview.setAttribute('data-size', value || 'standard');
    }
  }

  function applyFontSize(value) {
    var allowed = ['standard', 'large', 'xlarge'];
    var safeValue = allowed.indexOf(value) >= 0 ? value : 'standard';
    var multiplier = getFontScaleMultiplier(safeValue);

    document.body.classList.remove('app-size-standard', 'app-size-large', 'app-size-xlarge');
    document.body.classList.add('app-size-' + safeValue);
    setValue('setting-font-size', safeValue);
    updateFontSizeButtons(safeValue);
    applyGlobalFontScale(multiplier);

    try {
      localStorage.setItem(FONT_SIZE_KEY, safeValue);
    } catch (err) {}
  }

  function applyTheme(value) {
    var safeValue = value === 'dark' ? 'dark' : 'light';

    document.body.classList.toggle('app-theme-dark', safeValue === 'dark');
    document.body.classList.toggle('app-theme-light', safeValue !== 'dark');

    var toggle = byId('setting-dark-mode');
    if (toggle) {
      toggle.checked = safeValue === 'dark';
    }

    try {
      localStorage.setItem(THEME_KEY, safeValue);
    } catch (err) {}
  }

  function refreshApplication() {
    showToast('Memuat ulang aplikasi...', 'info');
    window.setTimeout(function () {
      window.location.reload();
    }, 120);
  }

  function rehydrateProfileAfterLightReset(profileSnapshot) {
    var profile = profileSnapshot && Object.keys(profileSnapshot).length
      ? profileSnapshot
      : getProfile();

    if (profile && Object.keys(profile).length) {
      persistProfile(profile);
      applyDashboardProfile(profile);
      fillProfileForm(profile);

      var role = profile.role_akses || profile.role || 'KADER';
      renderMenu(role);
    } else {
      applyDashboardProfile({});
      fillProfileForm({});
    }
  }

  function resetLightCache() {
    var storage = getStorage();
    var profileSnapshot = deepClone(getProfile());

    LIGHT_CACHE_KEYS.forEach(function (key) {
      try {
        localStorage.removeItem(key);
      } catch (err) {}
    });

    if (storage && typeof storage.clearRuntimeCache === 'function') {
      storage.clearRuntimeCache();
    }

    applyFontSize('standard');
    applyTheme('light');
    rehydrateProfileAfterLightReset(profileSnapshot);
    showToast('Cache ringan berhasil dibersihkan.', 'success');
  }

  function setVersionText() {
    var version = getConfig().APP_VERSION || getConfig().VERSION || '-';
    setText('settings-app-version', version);
    setText('footer-app-version', version);
  }

  function cleanupDashboardText() {
    var texts = document.querySelectorAll('#dashboard-screen .section-header .muted-text');
    Array.prototype.forEach.call(texts, function (node) {
      var content = String(node.textContent || '').toLowerCase();
      if (content.indexOf('menyesuaikan hak akses pengguna') >= 0) {
        node.remove();
      }
    });
  }

  function openSettings() {
    setVersionText();
    ensureFontSizeControl();
    applyTheme(getThemeValue());
    applyFontSize(getFontSizeValue());
    openModal('settings-modal');
  }

  function openProfile() {
    var profile = getProfile();
    applyDashboardProfile(profile);
    fillProfileForm(profile);
    exitProfileEditMode();
    openModal('profile-modal');
  }

  function openHelp() {
    openModal('help-modal');
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

  function openRekapKader() {
    go('rekapKader');

    if (window.RekapKaderView && typeof window.RekapKaderView.load === 'function') {
      window.RekapKaderView.load();
    }
  }

  async function logoutCurrentUser() {
    var logoutBtn = byId('btn-logout');
    var originalText = logoutBtn ? logoutBtn.textContent : '';

    if (logoutBtn) {
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Keluar...';
    }

    try {
      if (window.App && typeof window.App.logout === 'function') {
        await window.App.logout();
        return;
      }

      var auth = getAuth();
      if (auth && typeof auth.logout === 'function') {
        await auth.logout();
      }

      var storage = getStorage();
      var keys = getStorageKeys();
      if (storage && typeof storage.remove === 'function') {
        Object.keys(keys).forEach(function (name) {
          if (keys[name]) storage.remove(keys[name]);
        });
      }

      go('login');
      showToast('Anda telah keluar.', 'success');
    } catch (err) {
      showToast((err && err.message) || 'Gagal keluar dari aplikasi.', 'error');
    } finally {
      if (logoutBtn) {
        logoutBtn.disabled = false;
        logoutBtn.textContent = originalText || 'Keluar';
      }
    }
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

    Array.prototype.forEach.call(buttons, function (btn) {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-menu-action') || '';
        var route = btn.getAttribute('data-menu-route') || '';
        handleMenuAction(action, route);
      });
    });
  }

  function bindHeaderActions() {
    var syncBtn = byId('btn-sync-now-header');
    var settingsBtn = byId('btn-settings');
    var logoutBtn = byId('btn-logout');

    if (syncBtn && syncBtn.dataset.bound !== '1') {
      syncBtn.dataset.bound = '1';
      syncBtn.addEventListener('click', syncNow);
    }

    if (settingsBtn && settingsBtn.dataset.bound !== '1') {
      settingsBtn.dataset.bound = '1';
      settingsBtn.addEventListener('click', openSettings);
    }

    if (logoutBtn && logoutBtn.dataset.bound !== '1') {
      logoutBtn.dataset.bound = '1';
      logoutBtn.addEventListener('click', logoutCurrentUser);
    }
  }

  function bindSettingsModal() {
    var closeBtn = byId('btn-close-settings');
    var refreshBtn = byId('btn-refresh-app');
    var resetBtn = byId('btn-reset-light-cache');

    ensureFontSizeControl();
    bindOverlayClose('settings-modal');

    var fontSelect = byId('setting-font-size');
    var darkModeToggle = byId('setting-dark-mode');
    var fontButtons = document.querySelectorAll('.font-scale-btn');

    if (closeBtn && closeBtn.dataset.bound !== '1') {
      closeBtn.dataset.bound = '1';
      closeBtn.addEventListener('click', function () {
        closeModal('settings-modal');
      });
    }

    if (refreshBtn && refreshBtn.dataset.bound !== '1') {
      refreshBtn.dataset.bound = '1';
      refreshBtn.addEventListener('click', refreshApplication);
    }

    if (resetBtn && resetBtn.dataset.bound !== '1') {
      resetBtn.dataset.bound = '1';
      resetBtn.addEventListener('click', resetLightCache);
    }

    if (fontSelect && fontSelect.dataset.bound !== '1') {
      fontSelect.dataset.bound = '1';
      fontSelect.addEventListener('change', function () {
        applyFontSize(fontSelect.value || 'standard');
      });
    }

    if (darkModeToggle) {
      darkModeToggle.checked = getThemeValue() === 'dark';
      if (darkModeToggle.dataset.bound !== '1') {
        darkModeToggle.dataset.bound = '1';
        darkModeToggle.addEventListener('change', function () {
          applyTheme(darkModeToggle.checked ? 'dark' : 'light');
        });
      }
    }

    Array.prototype.forEach.call(fontButtons, function (btn) {
      if (!btn || btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        applyFontSize(btn.getAttribute('data-font-size') || 'standard');
      });
    });
  }

  function bindHelpModal() {
    var modal = byId('help-modal');
    var closeBtnTop = byId('btn-close-help');
    var closeBtnBottom = byId('btn-close-help-bottom');
    if (!modal) return;

    bindOverlayClose('help-modal');

    [closeBtnTop, closeBtnBottom].forEach(function (btn) {
      if (!btn || btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        closeModal('help-modal');
      });
    });
  }

  function bindProfileModal() {
    var closeTop = byId('btn-close-profile');
    var closeBottom = byId('btn-close-profile-bottom');
    var editBtn = byId('btn-profile-edit');
    var cancelBtn = byId('btn-profile-cancel-edit');
    var form = byId('profile-edit-form');
    var mengantarSelect = byId('profile-mengantar-mbg');
    var insentifSelect = byId('profile-mendapat-insentif-mbg');

    bindOverlayClose('profile-modal');

    [closeTop, closeBottom].forEach(function (btn) {
      if (!btn || btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        closeModal('profile-modal');
        exitProfileEditMode();
      });
    });

    if (editBtn && editBtn.dataset.bound !== '1') {
      editBtn.dataset.bound = '1';
      editBtn.addEventListener('click', enterProfileEditMode);
    }

    if (cancelBtn && cancelBtn.dataset.bound !== '1') {
      cancelBtn.dataset.bound = '1';
      cancelBtn.addEventListener('click', function () {
        exitProfileEditMode();
        fillProfileForm(getProfile());
      });
    }

    if (form && form.dataset.bound !== '1') {
      form.dataset.bound = '1';
      form.addEventListener('submit', saveProfileUpdate);
    }

    [mengantarSelect, insentifSelect].forEach(function (el) {
      if (!el || el.dataset.bound === '1') return;
      el.dataset.bound = '1';
      el.addEventListener('change', toggleProfileDependentFields);
    });
  }

  function bindEscapeKey() {
    if (window.__dashboardEscapeBound) return;
    window.__dashboardEscapeBound = true;

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      ['settings-modal', 'profile-modal', 'help-modal'].forEach(function (id) {
        var modal = byId(id);
        if (modal && modal.classList.contains('active')) {
          closeModal(id);
        }
      });
    });
  }

  function init() {
    var profile = getProfile();
    var role = profile.role_akses || profile.role || 'KADER';

    applyTheme(getThemeValue());
    cleanupDashboardText();
    applyDashboardProfile(profile);
    renderMenu(role);
    setVersionText();
    applyFontSize(getFontSizeValue());
    bindHeaderActions();
    bindSettingsModal();
    bindProfileModal();
    bindHelpModal();
    bindNetworkStatus();
    bindEscapeKey();
  }

  function refresh() {
    init();
  }

  function setRole(role) {
    renderMenu(role || 'KADER');
    applyFontSize(getFontSizeValue());
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
    openRekapKader: openRekapKader,
    openSettings: openSettings,
    openProfile: openProfile,
    openHelp: openHelp,
    syncNow: syncNow,
    logoutCurrentUser: logoutCurrentUser,
    fillProfileForm: fillProfileForm,
    saveProfileUpdate: saveProfileUpdate,
    applyFontSize: applyFontSize,
    applyTheme: applyTheme
  };

  window.DashboardView = DashboardView;
  window.MenuModule = DashboardView;
  window.Menu = DashboardView;

  document.addEventListener('DOMContentLoaded', function () {
    if (window.DashboardView && typeof window.DashboardView.init === 'function') {
      window.DashboardView.init();
    }
  });
})(window, document);
