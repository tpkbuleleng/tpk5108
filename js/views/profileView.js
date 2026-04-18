(function (window, document) {
  'use strict';

  const VIEW_NAME = 'profile';
  const FALLBACK_PROFILE_KEYS = ['USER_PROFILE', 'TPK_PROFILE', 'tpk_profile'];
  const FALLBACK_SESSION_KEYS = ['SESSION_TOKEN', 'TPK_SESSION_TOKEN', 'tpk_session_token'];

  function getAppConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorageKey(name, fallback) {
    const cfg = getAppConfig();
    const keys = cfg.STORAGE_KEYS || {};
    return keys[name] || fallback;
  }

  function readLocal(key) {
    try {
      if (!key) return '';
      return window.localStorage.getItem(key) || '';
    } catch (err) {
      return '';
    }
  }

  function writeLocal(key, value) {
    try {
      if (!key) return;
      window.localStorage.setItem(key, value);
    } catch (err) {
      // no-op
    }
  }

  function readJsonLocal(candidates) {
    const keys = Array.isArray(candidates) ? candidates : [candidates];
    for (const key of keys) {
      const raw = readLocal(key);
      if (!raw) continue;
      try {
        return JSON.parse(raw);
      } catch (err) {
        // ignore malformed cache and continue
      }
    }
    return null;
  }

  function getCachedProfile() {
    const cfg = getAppConfig();
    const profileKey = getStorageKey('tpk_profile', 'tpk_profile');

    if (window.AppState && typeof window.AppState.get === 'function') {
      const stateProfile = window.AppState.get('profile')
        || window.AppState.get('userProfile')
        || window.AppState.get('bootstrap.profile');
      if (stateProfile && typeof stateProfile === 'object') return stateProfile;
    }

    if (window.State && typeof window.State.get === 'function') {
      const stateProfile = window.State.get('profile')
        || window.State.get('userProfile')
        || window.State.get('bootstrap.profile');
      if (stateProfile && typeof stateProfile === 'object') return stateProfile;
    }

    return readJsonLocal([profileKey].concat(FALLBACK_PROFILE_KEYS));
  }

  function saveProfileCache(profile) {
    if (!profile || typeof profile !== 'object') return;

    const cfg = getAppConfig();
    const profileKey = getStorageKey('tpk_profile', 'tpk_profile');
    const raw = JSON.stringify(profile);

    writeLocal(profileKey, raw);
    FALLBACK_PROFILE_KEYS.forEach((key) => writeLocal(key, raw));

    if (window.AppState && typeof window.AppState.set === 'function') {
      try { window.AppState.set('profile', profile); } catch (err) { /* no-op */ }
    }
    if (window.State && typeof window.State.set === 'function') {
      try { window.State.set('profile', profile); } catch (err) { /* no-op */ }
    }
  }

  function getSessionToken() {
    const sessionKey = getStorageKey('tpk_session_token', 'tpk_session_token');
    return readLocal(sessionKey) || FALLBACK_SESSION_KEYS.map(readLocal).find(Boolean) || '';
  }

  async function apiPost(action, payload, meta) {
    const safePayload = payload || {};
    const safeMeta = meta || {};

    if (window.Api && typeof window.Api.post === 'function') {
      return window.Api.post(action, safePayload, safeMeta);
    }
    if (typeof window.apiCall === 'function') {
      return window.apiCall(action, safePayload, safeMeta);
    }

    throw new Error('Api.post / apiCall belum tersedia di window');
  }

  function safeText(value, fallback) {
    if (value === 0) return '0';
    if (value === false) return 'Tidak';
    if (value === true) return 'Ya';
    if (value === null || value === undefined) return fallback || '-';
    const str = String(value).trim();
    return str || (fallback || '-');
  }

  function ucWords(value) {
    return safeText(value, '-').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
  }

  function normalizeRole(value) {
    const raw = safeText(value, '').toUpperCase().replace(/\s+/g, '_');
    const map = {
      KADER: 'Kader',
      KADER_KB: 'Kader KB',
      PKB: 'PKB',
      ADMIN_KECAMATAN: 'Admin Kecamatan',
      ADMIN_KABUPATEN: 'Admin Kabupaten',
      SUPER_ADMIN: 'Super Admin'
    };
    return map[raw] || safeText(value, '-');
  }

  function getDisplayNomorTim(data) {
    data = data || {};
    return safeText(
      data.nomor_tim
      || data.nomor_tim_display
      || data.nomor_tim_lokal
      || data.nama_tim
      || data.id_tim,
      '-'
    );
  }

  function pickFirst(obj, keys, fallback) {
    if (!obj || typeof obj !== 'object') return fallback || '';
    for (const key of keys) {
      const value = obj[key];
      if (value === 0 || value === false || value === true) return value;
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (value && typeof value !== 'string') return value;
    }
    return fallback || '';
  }

  function getWilayahDisplay(profile) {
    const kecamatan = pickFirst(profile, [
      'nama_kecamatan', 'kecamatan', 'wilayah_kecamatan', 'scope_kecamatan'
    ], '');
    const desa = pickFirst(profile, [
      'desa_kelurahan', 'nama_desa_kelurahan', 'nama_desa', 'desa', 'wilayah_desa_kelurahan', 'scope_desa_kelurahan'
    ], '');
    const dusun = pickFirst(profile, [
      'dusun_rw', 'nama_dusun_rw', 'dusun', 'rw', 'wilayah_dusun_rw', 'scope_dusun_rw', 'wilayah_tugas_dusun_rw'
    ], '');

    return {
      kecamatan: safeText(kecamatan, '-'),
      desa: safeText(desa, '-'),
      dusun: safeText(dusun, '-')
    };
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return safeText(value, '-');
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const mi = String(dt.getMinutes()).padStart(2, '0');
    return `${yy}-${mm}-${dd} ${hh}:${mi}`;
  }

  function getRoot(root) {
    if (root && typeof root.querySelector === 'function') return root;
    return document.getElementById('content-area')
      || document.getElementById('app-content')
      || document.querySelector('[data-route-root]')
      || document.body;
  }

  function setText(root, selector, value) {
    const el = root.querySelector(selector);
    if (el) el.textContent = safeText(value, '-');
  }

  function setStatus(root, text, type) {
    const box = root.querySelector('[data-profile-status]');
    if (!box) return;
    box.textContent = safeText(text, '');
    box.className = `profile-status profile-status-${type || 'info'}`;
  }

  function getProfileRows(profile) {
    const wilayah = getWilayahDisplay(profile);
    return [
      ['Nama Pengguna', safeText(pickFirst(profile, ['nama_pengguna', 'nama_user', 'nama_lengkap', 'nama_kader'], '-'))],
      ['ID Pengguna', safeText(pickFirst(profile, ['id_user', 'username', 'id_kader'], '-'))],
      ['Unsur TPK', normalizeRole(pickFirst(profile, ['unsur_tpk', 'role_label', 'role_akses', 'role'], '-'))],
      ['Nomor Tim', getDisplayNomorTim(profile)],
      ['Kecamatan', wilayah.kecamatan],
      ['Desa/Kelurahan', wilayah.desa],
      ['Dusun/RW', wilayah.dusun],
      ['Status Online', navigator.onLine ? 'Online' : 'Offline'],
      ['Versi Aplikasi', safeText(getAppConfig().APP_VERSION || getAppConfig().appVersion, '-')],
      ['Token Tersedia', getSessionToken() ? 'Ya' : 'Tidak'],
      ['Cache Profil Diperbarui', formatDateTime(profile.updated_at || profile.cached_at || profile.fetched_at)]
    ];
  }

  function renderRows(root, profile) {
    const tbody = root.querySelector('[data-profile-table-body]');
    if (!tbody) return;

    const rows = getProfileRows(profile);
    tbody.innerHTML = rows.map(([label, value]) => {
      return `<tr>
        <th style="text-align:left;vertical-align:top;padding:10px 12px;width:38%;">${label}</th>
        <td style="padding:10px 12px;">${safeText(value, '-')}</td>
      </tr>`;
    }).join('');
  }

  function renderPermissionList(root, permissionData) {
    const box = root.querySelector('[data-profile-permissions]');
    if (!box) return;

    const perms = [];
    if (Array.isArray(permissionData)) perms.push(...permissionData);
    if (permissionData && Array.isArray(permissionData.permissions)) perms.push(...permissionData.permissions);
    if (permissionData && Array.isArray(permissionData.data)) perms.push(...permissionData.data);

    if (!perms.length) {
      box.innerHTML = '<div class="card"><div class="card-body">Belum ada daftar hak akses tambahan.</div></div>';
      return;
    }

    box.innerHTML = `<div class="card"><div class="card-body"><ul style="margin:0;padding-left:18px;"></ul></div></div>`;
    const ul = box.querySelector('ul');
    perms.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = safeText(item.label || item.name || item.code || item, '-');
      ul.appendChild(li);
    });
  }

  async function fetchProfileBundle() {
    let profileRes = null;
    let permissionRes = null;
    let sessionRes = null;

    try {
      profileRes = await apiPost('getMyProfile', {});
    } catch (err) {
      profileRes = { ok: false, message: err && err.message ? err.message : 'Gagal memuat profil' };
    }

    try {
      permissionRes = await apiPost('getMyPermissions', {});
    } catch (err) {
      permissionRes = null;
    }

    try {
      sessionRes = await apiPost('bootstrapSession', {});
    } catch (err) {
      sessionRes = null;
    }

    return { profileRes, permissionRes, sessionRes };
  }

  function extractProfile(profileRes, sessionRes) {
    return (profileRes && (profileRes.data || profileRes.profile))
      || (sessionRes && sessionRes.data && (sessionRes.data.profile || sessionRes.data.session || sessionRes.data.user))
      || (sessionRes && (sessionRes.profile || sessionRes.session || sessionRes.user))
      || null;
  }

  async function hydrate(root, options) {
    const container = getRoot(root);
    const opts = options || {};
    const cachedProfile = getCachedProfile();

    if (cachedProfile) {
      renderRows(container, cachedProfile);
      setText(container, '[data-profile-head-name]', pickFirst(cachedProfile, ['nama_pengguna', 'nama_user', 'nama_lengkap', 'nama_kader'], '-'));
      setText(container, '[data-profile-head-role]', normalizeRole(pickFirst(cachedProfile, ['unsur_tpk', 'role_label', 'role_akses', 'role'], '-')));
      setStatus(container, 'Profil cache dimuat.', 'muted');
    } else {
      setStatus(container, 'Belum ada cache profil. Menarik data terbaru...', 'info');
    }

    if (opts.remote === false) return;

    const refreshBtn = container.querySelector('[data-profile-refresh]');
    const sessionBtn = container.querySelector('[data-profile-session-refresh]');
    if (refreshBtn) refreshBtn.disabled = true;
    if (sessionBtn) sessionBtn.disabled = true;

    const bundle = await fetchProfileBundle();
    const profile = extractProfile(bundle.profileRes, bundle.sessionRes);

    if (profile) {
      profile.fetched_at = new Date().toISOString();
      saveProfileCache(profile);
      renderRows(container, profile);
      setText(container, '[data-profile-head-name]', pickFirst(profile, ['nama_pengguna', 'nama_user', 'nama_lengkap', 'nama_kader'], '-'));
      setText(container, '[data-profile-head-role]', normalizeRole(pickFirst(profile, ['unsur_tpk', 'role_label', 'role_akses', 'role'], '-')));
      setStatus(container, 'Profil terbaru berhasil dimuat.', 'success');
    } else {
      const message = (bundle.profileRes && bundle.profileRes.message)
        || 'Profil belum bisa dimuat dari backend.';
      setStatus(container, message, 'warning');
    }

    renderPermissionList(container, bundle.permissionRes && (bundle.permissionRes.data || bundle.permissionRes));

    if (refreshBtn) refreshBtn.disabled = false;
    if (sessionBtn) sessionBtn.disabled = false;
  }

  async function handleSessionRefresh(root) {
    const container = getRoot(root);
    const btn = container.querySelector('[data-profile-session-refresh]');
    if (btn) btn.disabled = true;

    try {
      const res = await apiPost('bootstrapSession', {});
      const profile = (res && res.data && (res.data.profile || res.data.session || res.data.user))
        || res.profile || res.session || res.user || null;

      if (profile) {
        profile.fetched_at = new Date().toISOString();
        saveProfileCache(profile);
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
    const container = getRoot(root);

    const refreshBtn = container.querySelector('[data-profile-refresh]');
    if (refreshBtn && !refreshBtn.__bound) {
      refreshBtn.__bound = true;
      refreshBtn.addEventListener('click', function () {
        hydrate(container, { remote: true });
      });
    }

    const sessionBtn = container.querySelector('[data-profile-session-refresh]');
    if (sessionBtn && !sessionBtn.__bound) {
      sessionBtn.__bound = true;
      sessionBtn.addEventListener('click', function () {
        handleSessionRefresh(container);
      });
    }

    window.addEventListener('online', function () {
      const liveRoot = getRoot(container);
      setText(liveRoot, '[data-profile-online-state]', 'Online');
    });

    window.addEventListener('offline', function () {
      const liveRoot = getRoot(container);
      setText(liveRoot, '[data-profile-online-state]', 'Offline');
    });
  }

  function template() {
    return `
      <section class="screen screen-profile" data-screen="profile" style="padding:12px;">
        <div class="card" style="margin-bottom:12px;">
          <div class="card-body" style="padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="font-size:12px;opacity:.75;letter-spacing:.04em;">PROFIL PENGGUNA</div>
                <h2 style="margin:6px 0 4px;">Profil</h2>
                <div data-profile-head-name style="font-weight:700;">-</div>
                <div data-profile-head-role style="opacity:.8;">-</div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-secondary" data-profile-session-refresh>Muat Ulang Sesi</button>
                <button type="button" class="btn btn-primary" data-profile-refresh>Segarkan Profil</button>
              </div>
            </div>
            <div data-profile-status class="profile-status profile-status-info" style="margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(13,110,253,.08);">Menyiapkan profil...</div>
          </div>
        </div>

        <div class="card" style="margin-bottom:12px;overflow:hidden;">
          <div class="card-body" style="padding:0;overflow:auto;">
            <table style="width:100%;border-collapse:collapse;">
              <tbody data-profile-table-body>
                <tr><td style="padding:14px;">Memuat data profil...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card" style="margin-bottom:12px;">
          <div class="card-body" style="padding:16px;">
            <h3 style="margin:0 0 10px;">Status Ringkas</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
              <div style="padding:12px;border-radius:14px;background:rgba(13,110,253,.06);">
                <div style="font-size:12px;opacity:.7;">Jaringan</div>
                <div data-profile-online-state style="font-size:18px;font-weight:700;">${navigator.onLine ? 'Online' : 'Offline'}</div>
              </div>
              <div style="padding:12px;border-radius:14px;background:rgba(25,135,84,.08);">
                <div style="font-size:12px;opacity:.7;">Token Sesi</div>
                <div style="font-size:18px;font-weight:700;">${getSessionToken() ? 'Tersedia' : 'Tidak ada'}</div>
              </div>
              <div style="padding:12px;border-radius:14px;background:rgba(255,193,7,.12);">
                <div style="font-size:12px;opacity:.7;">Fokus Perbaikan</div>
                <div style="font-size:16px;font-weight:700;">Wilayah Tugas</div>
              </div>
            </div>
          </div>
        </div>

        <div data-profile-permissions></div>
      </section>
    `;
  }

  const View = {
    id: VIEW_NAME,
    title: 'Profil',
    render(root) {
      const html = template();
      if (root && typeof root.innerHTML !== 'undefined') {
        root.innerHTML = html;
        return root;
      }
      return html;
    },
    async afterRender(root) {
      bind(root);
      await hydrate(root, { remote: true });
    },
    async mount(root) {
      const el = getRoot(root);
      this.render(el);
      await this.afterRender(el);
      return el;
    }
  };

  window.profileView = View;
  window.ProfileView = View;
  window.appViews = window.appViews || {};
  window.appViews[VIEW_NAME] = View;
})(window, document);
