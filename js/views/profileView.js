(function (window, document) {
  'use strict';

  window.__PROFILE_VIEW_BUILD = '20260418-01';
  console.log('ProfileView build aktif:', window.__PROFILE_VIEW_BUILD);

  var PROFILE_REMOTE_CACHE_KEY = 'tpk_profile_remote_cache_v1';
  var AUTO_CONTAINER_ID = 'profile-auto-container';
  var isBound = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function getUI() {
    return window.UI || null;
  }

  function getApi() {
    return window.Api || null;
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

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getActions() {
    return getConfig().API_ACTIONS || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = arguments[i];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }
    return '';
  }

  function normalizeSpaces(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function normalizeUpper(value) {
    return normalizeSpaces(value).toUpperCase();
  }

  function safeJsonParse(raw, fallback) {
    if (!raw) return fallback;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
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

  function showToast(message, type) {
    var ui = getUI();
    if (ui && typeof ui.showToast === 'function') {
      ui.showToast(message, type || 'info');
      return;
    }
    if (ui && typeof ui.toast === 'function') {
      ui.toast(message, type || 'info');
      return;
    }
    try {
      window.alert(message);
    } catch (err) {}
  }

  function setText(id, value) {
    var ui = getUI();
    if (ui && typeof ui.setText === 'function') {
      ui.setText(id, value);
      return;
    }
    var el = byId(id);
    if (el) {
      el.textContent = (value === undefined || value === null || value === '') ? '-' : String(value);
    }
  }

  function setHTML(id, html) {
    var ui = getUI();
    if (ui && typeof ui.setHTML === 'function') {
      ui.setHTML(id, html);
      return;
    }
    var el = byId(id);
    if (el) {
      el.innerHTML = html || '';
    }
  }

  function setLoading(buttonId, isLoading, loadingText) {
    var ui = getUI();
    if (ui && typeof ui.setLoading === 'function') {
      ui.setLoading(buttonId, isLoading, loadingText || 'Memuat...');
      return;
    }

    var btn = byId(buttonId);
    if (!btn) return;

    if (isLoading) {
      if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent || '';
      btn.disabled = true;
      btn.textContent = loadingText || 'Memuat...';
      return;
    }

    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || btn.textContent;
    delete btn.dataset.originalText;
  }

  function toggleHidden(id, shouldHide) {
    var ui = getUI();
    if (ui && typeof ui.toggleHidden === 'function') {
      ui.toggleHidden(id, shouldHide);
      return;
    }
    var el = byId(id);
    if (!el) return;
    el.classList.toggle('hidden', !!shouldHide);
  }

  function getStateProfile() {
    var state = getState();
    if (state && typeof state.getProfile === 'function') {
      var profile = state.getProfile() || {};
      if (profile && Object.keys(profile).length) return profile;
    }
    return {};
  }

  function getStorageProfile() {
    var storage = getStorage();
    var keys = getStorageKeys();

    if (storage && typeof storage.get === 'function' && keys.PROFILE) {
      var fromStorage = storage.get(keys.PROFILE, {}) || {};
      if (fromStorage && Object.keys(fromStorage).length) return fromStorage;
    }

    return {};
  }

  function getSessionProfile() {
    try {
      if (window.Session && typeof window.Session.getProfile === 'function') {
        var profile = window.Session.getProfile() || {};
        if (profile && Object.keys(profile).length) return profile;
      }
    } catch (err) {}
    return {};
  }

  function getBootstrapProfile() {
    try {
      if (window.AppBootstrap && typeof window.AppBootstrap.getCachedProfile === 'function') {
        var cached = window.AppBootstrap.getCachedProfile() || {};
        if (cached && Object.keys(cached).length) return cached;
      }
    } catch (err) {}

    var lite = safeJsonParse(localStorage.getItem('tpk_bootstrap_lite'), {}) || {};
    if (lite.profile && typeof lite.profile === 'object' && Object.keys(lite.profile).length) {
      return lite.profile;
    }

    var appBootstrap = safeJsonParse(localStorage.getItem('tpk_app_bootstrap'), {}) || {};
    if (appBootstrap.profile && typeof appBootstrap.profile === 'object' && Object.keys(appBootstrap.profile).length) {
      return appBootstrap.profile;
    }

    return {};
  }

  function getLocalProfile() {
    try {
      var local = safeJsonParse(localStorage.getItem('tpk_profile'), {}) || {};
      if (local && Object.keys(local).length) return local;
    } catch (err) {}
    return {};
  }

  function getCachedRemoteProfile() {
    try {
      var cached = safeJsonParse(localStorage.getItem(PROFILE_REMOTE_CACHE_KEY), {}) || {};
      if (cached && cached.profile && typeof cached.profile === 'object') {
        return cached.profile;
      }
    } catch (err) {}
    return {};
  }

  function getProfile() {
    var sources = [
      getSessionProfile(),
      getStateProfile(),
      getStorageProfile(),
      getBootstrapProfile(),
      getLocalProfile(),
      getCachedRemoteProfile()
    ];

    for (var i = 0; i < sources.length; i += 1) {
      if (sources[i] && Object.keys(sources[i]).length) return sources[i];
    }

    return {};
  }

  function getQueueCount() {
    var state = getState();
    if (state && typeof state.getSyncQueue === 'function') {
      var queueFromState = state.getSyncQueue();
      if (Array.isArray(queueFromState)) return queueFromState.length;
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.SYNC_QUEUE) {
      var queueFromStorage = storage.get(keys.SYNC_QUEUE, []);
      if (Array.isArray(queueFromStorage)) return queueFromStorage.length;
    }

    try {
      var localQueue = safeJsonParse(localStorage.getItem('tpk_sync_queue_v1'), []);
      return Array.isArray(localQueue) ? localQueue.length : 0;
    } catch (err) {
      return 0;
    }
  }

  function getLastSyncAt() {
    var state = getState();
    if (state && typeof state.getLastSyncAt === 'function') {
      var fromState = state.getLastSyncAt();
      if (fromState) return fromState;
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.LAST_SYNC_AT) {
      return storage.get(keys.LAST_SYNC_AT, '') || '';
    }

    try {
      return localStorage.getItem('tpk_last_sync_at') || '';
    } catch (err) {
      return '';
    }
  }

  function formatDateTime(value) {
    if (!value) return '-';
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    try {
      return d.toLocaleString('id-ID');
    } catch (err) {
      return String(value);
    }
  }

  function buildWilayahParts(profile) {
    var scope = profile.scope_wilayah || profile.tim_wilayah_scope || profile.wilayah_scope || {};

    var kecamatan = firstNonEmpty(
      scope.kecamatan,
      scope.nama_kecamatan,
      profile.nama_kecamatan,
      profile.kecamatan
    );

    var desa = firstNonEmpty(
      scope.desa_kelurahan,
      scope.nama_desa,
      scope.nama_desa_kelurahan,
      profile.nama_desa,
      profile.desa_kelurahan,
      profile.nama_desa_kelurahan
    );

    var dusun = firstNonEmpty(
      scope.dusun_rw,
      scope.nama_dusun,
      scope.nama_dusun_rw,
      profile.nama_dusun,
      profile.dusun_rw,
      profile.nama_dusun_rw,
      profile.wilayah_tugas_dusun_rw
    );

    return {
      kecamatan: normalizeSpaces(kecamatan),
      desa: normalizeSpaces(desa),
      dusun: normalizeSpaces(dusun)
    };
  }

  function normalizeBooleanText(value) {
    if (value === true) return 'YA';
    if (value === false) return 'TIDAK';

    var raw = normalizeUpper(value);
    if (!raw) return '-';

    if (['YA', 'Y', 'TRUE', '1', 'SUDAH'].indexOf(raw) >= 0) return 'YA';
    if (['TIDAK', 'N', 'FALSE', '0', 'BELUM'].indexOf(raw) >= 0) return 'TIDAK';

    return normalizeSpaces(value);
  }

  function normalizeCurrencyText(value) {
    if (value === undefined || value === null || value === '') return '-';

    var num = Number(String(value).replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return normalizeSpaces(value);

    try {
      return num.toLocaleString('id-ID');
    } catch (err) {
      return String(num);
    }
  }

  function normalizeProfile(raw) {
    var profile = raw && typeof raw === 'object' ? raw : {};
    var wilayah = buildWilayahParts(profile);

    var wilayahTugas = firstNonEmpty(
      profile.wilayah_tugas_lengkap,
      profile.wilayah_tugas,
      profile.nama_wilayah_tugas,
      [wilayah.dusun, wilayah.desa, wilayah.kecamatan].filter(Boolean).join(' / '),
      wilayah.kecamatan
    );

    return {
      nama_kader: normalizeUpper(firstNonEmpty(profile.nama_kader, profile.nama, profile.full_name, '-')),
      id_user: normalizeSpaces(firstNonEmpty(profile.id_user, profile.username, profile.id_kader, '-')),
      unsur_tpk: normalizeUpper(firstNonEmpty(profile.unsur_tpk, profile.role_label, profile.role_akses, profile.role, '-')),
      nomor_tim: normalizeSpaces(firstNonEmpty(
        profile.nomor_tim,
        profile.nomor_tim_display,
        profile.nomor_tim_lokal,
        profile.nama_tim,
        profile.id_tim,
        '-'
      )),
      id_tim: normalizeSpaces(firstNonEmpty(profile.id_tim, '-')),
      nama_tim: normalizeSpaces(firstNonEmpty(profile.nama_tim, profile.id_tim, '-')),
      id_wilayah: normalizeSpaces(firstNonEmpty(profile.id_wilayah, profile.id_wilayah_tugas, '-')),
      wilayah_tugas: normalizeUpper(firstNonEmpty(wilayahTugas, '-')),
      nama_kecamatan: normalizeUpper(firstNonEmpty(wilayah.kecamatan, '-')),
      nama_desa: normalizeUpper(firstNonEmpty(wilayah.desa, '-')),
      nama_dusun: normalizeUpper(firstNonEmpty(wilayah.dusun, '-')),
      nomor_wa: normalizeSpaces(firstNonEmpty(profile.nomor_wa, profile.no_wa, profile.phone, '-')),
      status_kader_tpk: normalizeUpper(firstNonEmpty(profile.status_kader_tpk, profile.status_kader, '-')),
      memiliki_bpjstk: normalizeBooleanText(firstNonEmpty(profile.memiliki_bpjstk, profile.has_bpjstk, '')),
      status_bpjstk: normalizeUpper(firstNonEmpty(profile.status_bpjstk, '-')),
      mengantar_mbg_3b: normalizeBooleanText(firstNonEmpty(profile.mengantar_mbg_3b, profile.antar_mbg_3b, '')),
      status_mbg: normalizeUpper(firstNonEmpty(profile.status_mbg, '-')),
      mendapat_insentif_mbg_3b: normalizeBooleanText(firstNonEmpty(profile.mendapat_insentif_mbg_3b, profile.mendapat_insentif_mbg, '')),
      insentif_mbg_3b_per_sasaran: normalizeCurrencyText(firstNonEmpty(profile.insentif_mbg_3b_per_sasaran, '')),
      insentif_mbg_3b: normalizeCurrencyText(firstNonEmpty(profile.insentif_mbg_3b, '')),
      insentif_mbg: normalizeCurrencyText(firstNonEmpty(profile.insentif_mbg, '')),
      updated_at: firstNonEmpty(profile.updated_at, profile.last_seen, profile.last_sync_at, ''),
      raw: profile
    };
  }

  function persistProfile(profile) {
    var safeProfile = profile && typeof profile === 'object' ? profile : {};
    var state = getState();
    var storage = getStorage();
    var keys = getStorageKeys();

    if (state && typeof state.setProfile === 'function') {
      state.setProfile(safeProfile);
    }

    if (storage && typeof storage.set === 'function' && keys.PROFILE) {
      storage.set(keys.PROFILE, safeProfile);
    }

    try {
      localStorage.setItem('tpk_profile', JSON.stringify(safeProfile));
      localStorage.setItem(PROFILE_REMOTE_CACHE_KEY, JSON.stringify({
        saved_at: new Date().toISOString(),
        profile: safeProfile
      }));
    } catch (err) {}
  }

  function extractProfilePayload(result) {
    if (!result) return {};
    var data = result.data || {};

    if (data.profile && typeof data.profile === 'object') return data.profile;
    if (data.user && typeof data.user === 'object') return data.user;
    if (data.item && typeof data.item === 'object') return data.item;
    if (typeof data === 'object' && !Array.isArray(data)) return data;

    return {};
  }

  function getActionName() {
    var actions = getActions();
    return actions.GET_MY_PROFILE || actions.GET_PROFILE || 'getMyProfile';
  }

  function setMeta(text) {
    setText('profile-screen-meta', text || '');
  }

  function ensureAutoContainer() {
    var existing = byId(AUTO_CONTAINER_ID);
    if (existing) return existing;

    var screen = byId('profile-screen');
    if (!screen) return null;

    var container = document.createElement('div');
    container.id = AUTO_CONTAINER_ID;
    container.style.marginTop = '16px';
    screen.appendChild(container);
    return container;
  }

  function renderAutoLayout(data) {
    var container = ensureAutoContainer();
    if (!container) return;

    var html = [
      '<section class="summary-grid">',
        '<article class="stat-card">',
          '<span class="label">Nama Pengguna</span>',
          '<strong>' + escapeHtml(data.nama_kader) + '</strong>',
        '</article>',
        '<article class="stat-card">',
          '<span class="label">Unsur TPK</span>',
          '<strong>' + escapeHtml(data.unsur_tpk) + '</strong>',
        '</article>',
        '<article class="stat-card">',
          '<span class="label">ID Pengguna</span>',
          '<strong>' + escapeHtml(data.id_user) + '</strong>',
        '</article>',
        '<article class="stat-card">',
          '<span class="label">Nomor Tim</span>',
          '<strong>' + escapeHtml(data.nomor_tim) + '</strong>',
        '</article>',
      '</section>',
      '<section class="activity-item" style="margin-top:12px;">',
        '<div><span class="label">Wilayah Tugas</span><strong>' + escapeHtml(data.wilayah_tugas) + '</strong></div>',
        '<div><span class="label">Kecamatan</span><strong>' + escapeHtml(data.nama_kecamatan) + '</strong></div>',
        '<div><span class="label">Desa/Kelurahan</span><strong>' + escapeHtml(data.nama_desa) + '</strong></div>',
        '<div><span class="label">Dusun/RW</span><strong>' + escapeHtml(data.nama_dusun) + '</strong></div>',
        '<div><span class="label">No. WA</span><strong>' + escapeHtml(data.nomor_wa) + '</strong></div>',
        '<div><span class="label">Status Kader</span><strong>' + escapeHtml(data.status_kader_tpk) + '</strong></div>',
      '</section>',
      '<section class="activity-item" style="margin-top:12px;">',
        '<div><span class="label">BPJSTK</span><strong>' + escapeHtml(data.memiliki_bpjstk) + '</strong></div>',
        '<div><span class="label">Status BPJSTK</span><strong>' + escapeHtml(data.status_bpjstk) + '</strong></div>',
        '<div><span class="label">Mengantar MBG 3B</span><strong>' + escapeHtml(data.mengantar_mbg_3b) + '</strong></div>',
        '<div><span class="label">Status MBG</span><strong>' + escapeHtml(data.status_mbg) + '</strong></div>',
        '<div><span class="label">Insentif MBG per Sasaran</span><strong>' + escapeHtml(data.insentif_mbg_3b_per_sasaran) + '</strong></div>',
        '<div><span class="label">Insentif MBG 3B</span><strong>' + escapeHtml(data.insentif_mbg_3b) + '</strong></div>',
        '<div><span class="label">Insentif MBG</span><strong>' + escapeHtml(data.insentif_mbg) + '</strong></div>',
        '<div><span class="label">Draft Pending</span><strong>' + escapeHtml(String(getQueueCount())) + '</strong></div>',
        '<div><span class="label">Sinkronisasi Terakhir</span><strong>' + escapeHtml(formatDateTime(getLastSyncAt())) + '</strong></div>',
        '<div><span class="label">Status Jaringan</span><strong>' + escapeHtml(window.navigator && window.navigator.onLine ? 'ONLINE' : 'OFFLINE') + '</strong></div>',
      '</section>'
    ].join('');

    container.innerHTML = html;
  }

  function renderToKnownIds(data) {
    setText('profile-nama-pengguna', data.nama_kader);
    setText('profile-unsur-tpk', data.unsur_tpk);
    setText('profile-id-pengguna', data.id_user);
    setText('profile-nomor-tim', data.nomor_tim);
    setText('profile-id-tim', data.id_tim);
    setText('profile-nama-tim', data.nama_tim);
    setText('profile-id-wilayah', data.id_wilayah);
    setText('profile-wilayah-tugas', data.wilayah_tugas);
    setText('profile-kecamatan', data.nama_kecamatan);
    setText('profile-desa', data.nama_desa);
    setText('profile-dusun', data.nama_dusun);
    setText('profile-nomor-wa', data.nomor_wa);
    setText('profile-status-kader', data.status_kader_tpk);
    setText('profile-bpjstk', data.memiliki_bpjstk);
    setText('profile-status-bpjstk', data.status_bpjstk);
    setText('profile-mbg', data.mengantar_mbg_3b);
    setText('profile-status-mbg', data.status_mbg);
    setText('profile-insentif-mbg-per-sasaran', data.insentif_mbg_3b_per_sasaran);
    setText('profile-insentif-mbg-3b', data.insentif_mbg_3b);
    setText('profile-insentif-mbg', data.insentif_mbg);
    setText('profile-last-sync', formatDateTime(getLastSyncAt()));
    setText('profile-network-status', window.navigator && window.navigator.onLine ? 'ONLINE' : 'OFFLINE');

    setText('profile-stat-draft', String(getQueueCount()));
    setText('profile-stat-sync', formatDateTime(getLastSyncAt()));
    setText('profile-stat-network', window.navigator && window.navigator.onLine ? 'ONLINE' : 'OFFLINE');
  }

  function renderSummaryBlocks(data) {
    var summaryHtml = [
      '<div class="activity-item">',
        '<div><span class="label">Nama Pengguna</span><strong>' + escapeHtml(data.nama_kader) + '</strong></div>',
        '<div><span class="label">Unsur TPK</span><strong>' + escapeHtml(data.unsur_tpk) + '</strong></div>',
        '<div><span class="label">ID Pengguna</span><strong>' + escapeHtml(data.id_user) + '</strong></div>',
        '<div><span class="label">Nomor Tim</span><strong>' + escapeHtml(data.nomor_tim) + '</strong></div>',
      '</div>'
    ].join('');

    var detailHtml = [
      '<div class="activity-item">',
        '<div><span class="label">Wilayah Tugas</span><strong>' + escapeHtml(data.wilayah_tugas) + '</strong></div>',
        '<div><span class="label">Kecamatan</span><strong>' + escapeHtml(data.nama_kecamatan) + '</strong></div>',
        '<div><span class="label">Desa/Kelurahan</span><strong>' + escapeHtml(data.nama_desa) + '</strong></div>',
        '<div><span class="label">Dusun/RW</span><strong>' + escapeHtml(data.nama_dusun) + '</strong></div>',
        '<div><span class="label">No. WA</span><strong>' + escapeHtml(data.nomor_wa) + '</strong></div>',
        '<div><span class="label">Status Kader</span><strong>' + escapeHtml(data.status_kader_tpk) + '</strong></div>',
      '</div>'
    ].join('');

    var programHtml = [
      '<div class="activity-item">',
        '<div><span class="label">BPJSTK</span><strong>' + escapeHtml(data.memiliki_bpjstk) + '</strong></div>',
        '<div><span class="label">Status BPJSTK</span><strong>' + escapeHtml(data.status_bpjstk) + '</strong></div>',
        '<div><span class="label">Mengantar MBG 3B</span><strong>' + escapeHtml(data.mengantar_mbg_3b) + '</strong></div>',
        '<div><span class="label">Status MBG</span><strong>' + escapeHtml(data.status_mbg) + '</strong></div>',
        '<div><span class="label">Insentif MBG per Sasaran</span><strong>' + escapeHtml(data.insentif_mbg_3b_per_sasaran) + '</strong></div>',
        '<div><span class="label">Insentif MBG 3B</span><strong>' + escapeHtml(data.insentif_mbg_3b) + '</strong></div>',
        '<div><span class="label">Insentif MBG</span><strong>' + escapeHtml(data.insentif_mbg) + '</strong></div>',
        '<div><span class="label">Draft Pending</span><strong>' + escapeHtml(String(getQueueCount())) + '</strong></div>',
        '<div><span class="label">Sinkronisasi Terakhir</span><strong>' + escapeHtml(formatDateTime(getLastSyncAt())) + '</strong></div>',
      '</div>'
    ].join('');

    setHTML('profile-summary-box', summaryHtml);
    setHTML('profile-detail-box', detailHtml);
    setHTML('profile-program-box', programHtml);
  }

  function render(data) {
    renderToKnownIds(data);
    renderSummaryBlocks(data);
    renderAutoLayout(data);
    setText('profile-screen-title', 'Profil');
    setText('profile-screen-subtitle', 'Informasi akun dan wilayah tugas aktif');
  }

  async function fetchRemoteProfile() {
    var api = getApi();
    if (!api || typeof api.post !== 'function') {
      throw new Error('Api.post belum tersedia.');
    }

    var action = getActionName();
    var result = await api.post(action, {}, { includeAuth: true, timeoutMs: 12000 });
    if (!result || result.ok === false) {
      throw new Error((result && result.message) || 'Gagal memuat profil.');
    }

    return extractProfilePayload(result);
  }

  var ProfileView = {
    _lastProfile: {},

    init: function () {
      if (isBound) return;
      isBound = true;
      this.bindEvents();
    },

    bindEvents: function () {
      var self = this;

      var backBtn = byId('btn-back-from-profile');
      if (backBtn && backBtn.dataset.bound !== '1') {
        backBtn.dataset.bound = '1';
        backBtn.addEventListener('click', function () {
          var router = getRouter();
          if (router && typeof router.go === 'function') {
            router.go('dashboard');
          }
        });
      }

      ['btn-refresh-profile-screen', 'btn-refresh-profile'].forEach(function (id) {
        var btn = byId(id);
        if (!btn || btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function () {
          self.load(true);
        });
      });

      window.addEventListener('online', function () {
        setText('profile-network-status', 'ONLINE');
        setText('profile-stat-network', 'ONLINE');
      });

      window.addEventListener('offline', function () {
        setText('profile-network-status', 'OFFLINE');
        setText('profile-stat-network', 'OFFLINE');
      });
    },

    open: function () {
      this.init();
      var router = getRouter();
      if (router && typeof router.go === 'function') {
        router.go('profile');
      }
      this.load(false);
    },

    refresh: function () {
      this.init();
      this.load(true);
    },

    load: async function (forceRemote) {
      this.init();

      var cachedProfile = getProfile();
      var normalizedCached = normalizeProfile(cachedProfile);
      var hasCached = normalizedCached.raw && Object.keys(normalizedCached.raw).length;

      setMeta('Sedang memuat profil...');
      setLoading('btn-refresh-profile-screen', true, 'Memuat...');
      setLoading('btn-refresh-profile', true, 'Memuat...');

      if (hasCached) {
        this._lastProfile = normalizedCached;
        render(normalizedCached);
      }

      if ((window.navigator && window.navigator.onLine === false) && !forceRemote) {
        if (hasCached) {
          setMeta('Profil ditampilkan dari cache lokal karena perangkat sedang offline.');
        } else {
          setMeta('Perangkat sedang offline dan cache profil belum tersedia.');
          render(normalizeProfile({}));
        }

        setLoading('btn-refresh-profile-screen', false);
        setLoading('btn-refresh-profile', false);
        return;
      }

      try {
        var remoteProfile = await fetchRemoteProfile();
        if (remoteProfile && Object.keys(remoteProfile).length) {
          persistProfile(remoteProfile);
          this._lastProfile = normalizeProfile(remoteProfile);
          render(this._lastProfile);
          setMeta('Profil aktif berhasil dimuat dari server.');
          return;
        }

        throw new Error('Data profil dari server kosong.');
      } catch (err) {
        if (hasCached) {
          render(normalizedCached);
          setMeta('Profil server gagal dimuat. Menampilkan cache terakhir yang tersedia.');
          showToast((err && err.message) || 'Gagal memuat profil aktif.', 'warning');
        } else {
          render(normalizeProfile({}));
          setMeta((err && err.message) || 'Gagal memuat profil aktif.');
          showToast((err && err.message) || 'Gagal memuat profil aktif.', 'warning');
        }
      } finally {
        setLoading('btn-refresh-profile-screen', false);
        setLoading('btn-refresh-profile', false);
      }
    },

    getCurrentProfile: function () {
      return this._lastProfile || normalizeProfile(getProfile());
    }
  };

  window.ProfileView = ProfileView;
  window.ProfileScreen = ProfileView;

  document.addEventListener('DOMContentLoaded', function () {
    if (window.ProfileView && typeof window.ProfileView.init === 'function') {
      window.ProfileView.init();
    }
  });
})(window, document);
