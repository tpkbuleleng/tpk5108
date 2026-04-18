(function (window, document) {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
  }

  function getRoot(root) {
    if (root && typeof root.querySelector === 'function') return root;
    return byId('module-root')
      || byId('content-root')
      || byId('view-root')
      || byId('screen-root')
      || byId('konten-app')
      || byId('screen-container')
      || byId('app-content')
      || byId('content-area')
      || document.body;
  }

  function getUI() {
    return window.UI || null;
  }

  function getApi() {
    return window.Api || null;
  }

  function getState() {
    return window.AppState || null;
  }

  function getStorage() {
    return window.Storage || null;
  }

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeText(value, fallback) {
    if (value === 0) return '0';
    if (value === false) return 'Tidak';
    if (value === true) return 'Ya';
    if (value === undefined || value === null) return fallback || '-';
    var text = String(value).replace(/\s+/g, ' ').trim();
    return text || (fallback || '-');
  }

  function setText(root, selector, value) {
    var el = root.querySelector(selector);
    if (el) el.textContent = safeText(value, '-');
  }

  function setHTML(root, selector, html) {
    var el = root.querySelector(selector);
    if (el) el.innerHTML = html || '';
  }

  function setStatus(root, message, type) {
    var box = root.querySelector('[data-profile-status]');
    if (!box) return;
    box.textContent = safeText(message, '');
    box.className = 'profile-status profile-status-' + (type || 'info');
  }

  function readJsonLocal(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (err) {
      return null;
    }
  }

  function getProfileFromState() {
    var state = getState();
    if (state && typeof state.getProfile === 'function') {
      var profile = state.getProfile() || {};
      if (profile && Object.keys(profile).length) return profile;
    }
    return {};
  }

  function getProfileFromStorage() {
    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.PROFILE) {
      var profile = storage.get(keys.PROFILE, {}) || {};
      if (profile && Object.keys(profile).length) return profile;
    }

    return readJsonLocal('tpk_profile')
      || (readJsonLocal('tpk_bootstrap_lite') || {}).profile
      || {};
  }

  function getCachedProfile() {
    var fromState = getProfileFromState();
    if (fromState && Object.keys(fromState).length) return fromState;
    return getProfileFromStorage();
  }

  function persistProfile(profile) {
    var safeProfile = profile && typeof profile === 'object' ? profile : {};
    var state = getState();
    var storage = getStorage();
    var keys = getStorageKeys();

    if (state && typeof state.setProfile === 'function') {
      try { state.setProfile(safeProfile); } catch (err) {}
    }

    if (storage && typeof storage.set === 'function' && keys.PROFILE) {
      try { storage.set(keys.PROFILE, safeProfile); } catch (err2) {}
    }

    try {
      localStorage.setItem('tpk_profile', JSON.stringify(safeProfile));
    } catch (err3) {}
  }

  function pickFirst(obj, keys, fallback) {
    obj = obj || {};
    for (var i = 0; i < keys.length; i += 1) {
      var value = obj[keys[i]];
      if (value === 0 || value === false || value === true) return value;
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (value && typeof value !== 'string') return value;
    }
    return fallback || '';
  }

  function normalizeRole(value) {
    var raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
    var map = {
      KADER: 'Kader',
      PKB: 'PKB',
      ADMIN_KECAMATAN: 'Admin Kecamatan',
      ADMIN_KABUPATEN: 'Admin Kabupaten',
      SUPER_ADMIN: 'Super Admin'
    };
    return map[raw] || safeText(value, '-');
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
      if (match && match[1]) return match[1];
      return namaTim;
    }

    return safeText(data.id_tim, '-');
  }

  function normalizeDisplayText(value) {
    var text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    if (!text) return '';
    var upper = text.toUpperCase();
    if (upper === '-' || upper === 'NULL' || upper === 'UNDEFINED' || upper === 'N/A' || upper === 'NA') {
      return '';
    }
    return text;
  }

  function parseWilayahDisplay(profile) {
    var data = profile || {};
    var wilayah = normalizeDisplayText(data.wilayah_tugas || data.wilayah || '');
    var desa = normalizeDisplayText(data.desa_kelurahan || data.nama_desa || data.desa || '');
    var dusun = normalizeDisplayText(data.dusun_rw || data.nama_dusun || data.dusun || '');
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

  function formatDateTime(value) {
    if (!value) return '-';
    var dt = new Date(value);
    if (isNaN(dt.getTime())) return safeText(value, '-');
    try {
      return dt.toLocaleString('id-ID');
    } catch (err) {
      return safeText(value, '-');
    }
  }

  function renderProfileRows(root, profile) {
    var wilayah = parseWilayahDisplay(profile || {});
    var rows = [
      ['Nama Kader', pickFirst(profile, ['nama_kader', 'nama_user', 'nama_lengkap', 'nama'], '-')],
      ['ID User', pickFirst(profile, ['id_user', 'username', 'id_kader'], '-')],
      ['Unsur TPK', normalizeRole(pickFirst(profile, ['unsur_tpk', 'role_label', 'role_akses', 'role'], '-'))],
      ['Nomor Tim', getDisplayNomorTim(profile)],
      ['Kecamatan', wilayah.kecamatan],
      ['Desa/Kelurahan', wilayah.desa],
      ['Dusun/RW', wilayah.dusun],
      ['Status Jaringan', navigator.onLine ? 'Online' : 'Offline'],
      ['Versi Aplikasi', safeText(getConfig().APP_VERSION || getConfig().appVersion, '-')],
      ['Cache Profil', formatDateTime(profile.updated_at || profile.cached_at || profile.fetched_at)]
    ];

    setHTML(root, '[data-profile-table-body]', rows.map(function (row) {
      return '<tr>' +
        '<th style="text-align:left;vertical-align:top;padding:10px 12px;width:38%;">' + escapeHtml(row[0]) + '</th>' +
        '<td style="padding:10px 12px;">' + escapeHtml(safeText(row[1], '-')) + '</td>' +
      '</tr>';
    }).join(''));

    setText(root, '[data-profile-head-name]', pickFirst(profile, ['nama_kader', 'nama_user', 'nama_lengkap', 'nama'], '-'));
    setText(root, '[data-profile-head-role]', normalizeRole(pickFirst(profile, ['unsur_tpk', 'role_label', 'role_akses', 'role'], '-')));
    setText(root, '[data-profile-online-state]', navigator.onLine ? 'Online' : 'Offline');
  }

  function renderPermissions(root, permissionData) {
    var perms = [];
    if (Array.isArray(permissionData)) perms = permissionData.slice();
    else if (permissionData && Array.isArray(permissionData.permissions)) perms = permissionData.permissions.slice();
    else if (permissionData && Array.isArray(permissionData.data)) perms = permissionData.data.slice();

    if (!perms.length) {
      setHTML(root, '[data-profile-permissions]', '<div class="card"><div class="card-body">Belum ada daftar hak akses tambahan.</div></div>');
      return;
    }

    setHTML(root, '[data-profile-permissions]', '<div class="card"><div class="card-body"><ul style="margin:0;padding-left:18px;">' + perms.map(function (item) {
      return '<li>' + escapeHtml(safeText(item.label || item.name || item.code || item, '-')) + '</li>';
    }).join('') + '</ul></div></div>');
  }

  async function apiPost(action, payload, meta) {
    var api = getApi();
    if (!api || typeof api.post !== 'function') {
      throw new Error('Api.post belum tersedia.');
    }
    return api.post(action, payload || {}, meta || {});
  }

  async function fetchProfileBundle() {
    var profileRes = null;
    var permissionRes = null;
    var sessionRes = null;

    try {
      profileRes = await apiPost('getMyProfile', {}, { includeAuth: true });
    } catch (err) {
      profileRes = { ok: false, message: err && err.message ? err.message : 'Gagal memuat profil.' };
    }

    try {
      permissionRes = await apiPost('getMyPermissions', {}, { includeAuth: true });
    } catch (err2) {
      permissionRes = null;
    }

    try {
      sessionRes = await apiPost('bootstrapSession', {}, { includeAuth: true });
    } catch (err3) {
      sessionRes = null;
    }

    return { profileRes: profileRes, permissionRes: permissionRes, sessionRes: sessionRes };
  }

  function extractProfile(bundle) {
    bundle = bundle || {};
    return (bundle.profileRes && (bundle.profileRes.data || bundle.profileRes.profile))
      || (bundle.sessionRes && bundle.sessionRes.data && (bundle.sessionRes.data.profile || bundle.sessionRes.data.session || bundle.sessionRes.data.user))
      || (bundle.sessionRes && (bundle.sessionRes.profile || bundle.sessionRes.session || bundle.sessionRes.user))
      || null;
  }

  async function hydrate(root, options) {
    var container = getRoot(root);
    var opts = options || {};
    var cachedProfile = getCachedProfile();

    if (cachedProfile && Object.keys(cachedProfile).length) {
      renderProfileRows(container, cachedProfile);
      setStatus(container, 'Profil cache dimuat.', 'muted');
    } else {
      setStatus(container, 'Belum ada cache profil. Menarik data terbaru...', 'info');
    }

    if (opts.remote === false) return;

    var refreshBtn = container.querySelector('[data-profile-refresh]');
    var sessionBtn = container.querySelector('[data-profile-session-refresh]');
    if (refreshBtn) refreshBtn.disabled = true;
    if (sessionBtn) sessionBtn.disabled = true;

    var bundle = await fetchProfileBundle();
    var profile = extractProfile(bundle);

    if (profile) {
      profile.fetched_at = new Date().toISOString();
      persistProfile(profile);
      renderProfileRows(container, profile);
      setStatus(container, 'Profil terbaru berhasil dimuat.', 'success');
    } else {
      setStatus(container, (bundle.profileRes && bundle.profileRes.message) || 'Profil belum bisa dimuat dari backend.', 'warning');
    }

    renderPermissions(container, bundle.permissionRes && (bundle.permissionRes.data || bundle.permissionRes));

    if (refreshBtn) refreshBtn.disabled = false;
    if (sessionBtn) sessionBtn.disabled = false;
  }

  async function handleSessionRefresh(root) {
    var container = getRoot(root);
    var btn = container.querySelector('[data-profile-session-refresh]');
    if (btn) btn.disabled = true;

    try {
      var res = await apiPost('bootstrapSession', {}, { includeAuth: true });
      var profile = (res && res.data && (res.data.profile || res.data.session || res.data.user))
        || res.profile || res.session || res.user || null;

      if (profile) {
        profile.fetched_at = new Date().toISOString();
        persistProfile(profile);
      }

      await hydrate(container, { remote: true });
      setStatus(container, 'Sesi berhasil dimuat ulang.', 'success');
    } catch (err) {
      setStatus(container, err && err.message ? err.message : 'Gagal memuat ulang sesi.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function bind(root) {
    var container = getRoot(root);

    var refreshBtn = container.querySelector('[data-profile-refresh]');
    if (refreshBtn && !refreshBtn.__bound) {
      refreshBtn.__bound = true;
      refreshBtn.addEventListener('click', function () {
        hydrate(container, { remote: true });
      });
    }

    var sessionBtn = container.querySelector('[data-profile-session-refresh]');
    if (sessionBtn && !sessionBtn.__bound) {
      sessionBtn.__bound = true;
      sessionBtn.addEventListener('click', function () {
        handleSessionRefresh(container);
      });
    }

    if (!window.__profileOnlineBound) {
      window.__profileOnlineBound = true;
      window.addEventListener('online', function () {
        var liveRoot = getRoot(container);
        setText(liveRoot, '[data-profile-online-state]', 'Online');
      });
      window.addEventListener('offline', function () {
        var liveRoot = getRoot(container);
        setText(liveRoot, '[data-profile-online-state]', 'Offline');
      });
    }
  }

  function template() {
    return '' +
      '<section class="screen screen-profile" data-screen="profile" style="padding:12px;">' +
        '<div class="card" style="margin-bottom:12px;">' +
          '<div class="card-body" style="padding:16px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">' +
              '<div>' +
                '<div style="font-size:12px;opacity:.75;letter-spacing:.04em;">PROFIL PENGGUNA</div>' +
                '<h2 style="margin:6px 0 4px;">Profil</h2>' +
                '<div data-profile-head-name style="font-weight:700;">-</div>' +
                '<div data-profile-head-role style="opacity:.8;">-</div>' +
              '</div>' +
              '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                '<button type="button" class="btn btn-secondary" data-profile-session-refresh>Muat Ulang Sesi</button>' +
                '<button type="button" class="btn btn-primary" data-profile-refresh>Segarkan Profil</button>' +
              '</div>' +
            '</div>' +
            '<div data-profile-status class="profile-status profile-status-info" style="margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(13,110,253,.08);">Menyiapkan profil...</div>' +
          '</div>' +
        '</div>' +

        '<div class="card" style="margin-bottom:12px;overflow:hidden;">' +
          '<div class="card-body" style="padding:0;overflow:auto;">' +
            '<table style="width:100%;border-collapse:collapse;">' +
              '<tbody data-profile-table-body>' +
                '<tr><td style="padding:14px;">Memuat data profil...</td></tr>' +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>' +

        '<div class="card" style="margin-bottom:12px;">' +
          '<div class="card-body" style="padding:16px;">' +
            '<h3 style="margin:0 0 10px;">Status Ringkas</h3>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">' +
              '<div style="padding:12px;border-radius:14px;background:rgba(13,110,253,.06);">' +
                '<div style="font-size:12px;opacity:.7;">Jaringan</div>' +
                '<div data-profile-online-state style="font-size:18px;font-weight:700;">' + (navigator.onLine ? 'Online' : 'Offline') + '</div>' +
              '</div>' +
              '<div style="padding:12px;border-radius:14px;background:rgba(25,135,84,.08);">' +
                '<div style="font-size:12px;opacity:.7;">Fokus Perbaikan</div>' +
                '<div style="font-size:16px;font-weight:700;">Wilayah Tugas</div>' +
              '</div>' +
              '<div style="padding:12px;border-radius:14px;background:rgba(255,193,7,.12);">' +
                '<div style="font-size:12px;opacity:.7;">Status Tampilan</div>' +
                '<div style="font-size:16px;font-weight:700;">Lazy-load aktif</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div data-profile-permissions></div>' +
      '</section>';
  }

  var ProfileView = {
    render: function (root) {
      var container = getRoot(root);
      container.innerHTML = template();
      return container;
    },

    async afterRender(root) {
      var container = getRoot(root);
      bind(container);
      await hydrate(container, { remote: true });
    },

    async mount(root) {
      var container = this.render(root);
      await this.afterRender(container);
      return container;
    },

    async init(routeName, root) {
      return this.mount(root);
    },

    async show(routeName, root) {
      return this.mount(root);
    },

    async refresh(root) {
      return hydrate(root || getRoot(), { remote: true });
    }
  };

  window.ProfileView = ProfileView;
  window.profileView = ProfileView;
})(window, document);
