(function (window, document) {
  'use strict';

  window.__SASARAN_LIST_VIEW_BUILD = '20260421-01';
  console.log('SasaranListView build aktif:', window.__SASARAN_LIST_VIEW_BUILD);

  var SCREEN_ID = 'sasaran-list-screen';
  var FILTER_KEYWORD_ID = 'filter-keyword-sasaran';
  var FILTER_JENIS_ID = 'filter-jenis-sasaran';
  var FILTER_STATUS_ID = 'filter-status-sasaran';
  var BTN_REFRESH_ID = 'btn-refresh-sasaran';
  var BTN_RESET_ID = 'btn-reset-filter-sasaran';
  var BTN_BACK_ID = 'btn-back-dashboard-from-list';
  var META_ID = 'sasaran-list-meta';
  var CONTAINER_ID = 'sasaran-list-container';

  var LOCAL_SELECTED_KEY = 'tpk_selected_sasaran';
  var LOCAL_CACHE_KEY = 'tpk_sasaran_cache_v1';
  var LIST_CACHE_TTL_MS = 10 * 60 * 1000;

  function byId(id) {
    return document.getElementById(id);
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

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function getUI() {
    return window.UI || null;
  }

  function toast(message, type) {
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

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isPlainObject(value) {
    return !!value && Object.prototype.toString.call(value) === '[object Object]';
  }

  function collectDisplayParts(value, parts, seen, depth) {
    if (depth > 4 || value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach(function (item) {
        collectDisplayParts(item, parts, seen, depth + 1);
      });
      return;
    }

    if (isPlainObject(value)) {
      var preferred = [
        'nama_wilayah_lengkap', 'nama_wilayah_sasaran', 'nama_wilayah', 'wilayah_sasaran', 'wilayah', 'label', 'text', 'display',
        'dusun_rw', 'nama_dusun', 'dusun', 'desa_kelurahan', 'nama_desa', 'desa', 'kecamatan', 'nama_kecamatan'
      ];

      preferred.forEach(function (key) {
        if (value[key] !== undefined && value[key] !== null) {
          collectDisplayParts(value[key], parts, seen, depth + 1);
        }
      });

      Object.keys(value).forEach(function (key) {
        if (preferred.indexOf(key) >= 0) return;
        collectDisplayParts(value[key], parts, seen, depth + 1);
      });
      return;
    }

    var text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    if (!text) return;

    var upper = text.toUpperCase();
    if (upper === '-' || upper === 'NULL' || upper === 'UNDEFINED' || upper === 'N/A' || upper === 'NA' || upper === '[OBJECT OBJECT]') {
      return;
    }

    if (!seen[upper]) {
      seen[upper] = true;
      parts.push(text);
    }
  }

  function toDisplayText(value) {
    var parts = [];
    collectDisplayParts(value, parts, {}, 0);
    return parts.join(' • ');
  }

  function normalizeSpaces(value) {
    return String(toDisplayText(value) || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeUpper(value) {
    return normalizeSpaces(value).toUpperCase();
  }

  function getProfile() {
    var state = getState();
    if (state && typeof state.getProfile === 'function') {
      var fromState = state.getProfile();
      if (fromState && Object.keys(fromState).length) return fromState;
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.PROFILE) {
      return storage.get(keys.PROFILE, {}) || {};
    }

    try {
      return JSON.parse(localStorage.getItem('tpk_profile') || '{}');
    } catch (err) {
      return {};
    }
  }

  function getSession() {
    var state = getState();
    if (state && typeof state.getSession === 'function') {
      var fromState = state.getSession();
      if (fromState && Object.keys(fromState).length) return fromState;
    }

    try {
      return JSON.parse(localStorage.getItem('tpk_session') || '{}');
    } catch (err) {
      return {};
    }
  }

  function getIdTim(profile, session) {
    profile = profile || {};
    session = session || {};
    return String(
      profile.id_tim ||
      session.id_tim ||
      (session.session && session.session.id_tim) ||
      ''
    ).trim();
  }

  function getBookKey(profile, session) {
    profile = profile || {};
    session = session || {};
    return String(
      profile.kode_kecamatan ||
      profile.book_key ||
      session.kode_kecamatan ||
      session.book_key ||
      ''
    ).trim().toUpperCase();
  }

  function getSelectedFilters() {
    return {
      keyword: normalizeSpaces(byId(FILTER_KEYWORD_ID) ? byId(FILTER_KEYWORD_ID).value : ''),
      jenis_sasaran: normalizeSpaces(byId(FILTER_JENIS_ID) ? byId(FILTER_JENIS_ID).value : ''),
      status_sasaran: normalizeSpaces(byId(FILTER_STATUS_ID) ? byId(FILTER_STATUS_ID).value : '')
    };
  }

  function setMeta(text) {
    var el = byId(META_ID);
    if (el) el.textContent = text || '';
  }

  function setLoading() {
    var box = byId(CONTAINER_ID);
    if (box) {
      box.innerHTML = '<p class="muted-text">Memuat data sasaran...</p>';
    }
    setMeta('Sedang memuat data sasaran...');
  }

  function setEmpty(message) {
    var box = byId(CONTAINER_ID);
    if (box) {
      box.innerHTML = '<p class="muted-text">' + escapeHtml(message || 'Belum ada data sasaran.') + '</p>';
    }
  }

  function formatDate(value) {
    if (!value) return '-';
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    try {
      return d.toLocaleDateString('id-ID');
    } catch (err) {
      return String(value);
    }
  }

  function getWilayahLabel(item) {
    item = item || {};

    var wilayahAsalEksplisit = [
      item.nama_dusun || item.dusun_rw || item.dusun || '',
      item.nama_desa || item.desa_kelurahan || item.desa || '',
      item.nama_kecamatan || item.kecamatan || ''
    ].map(normalizeSpaces).filter(Boolean);

    if (wilayahAsalEksplisit.length) {
      return wilayahAsalEksplisit.join(' • ');
    }

    return normalizeSpaces(
      item.nama_wilayah_sasaran ||
      item.wilayah_sasaran ||
      item.nama_wilayah ||
      item.wilayah ||
      '-'
    ) || '-';
  }

  function getItemId(item) {
    return String(item && (item.id_sasaran || item.id || '')).trim();
  }

  function normalizeItem(item) {
    var safe = item && typeof item === 'object' ? Object.assign({}, item) : {};
    var itemId = getItemId(safe);
    var wilayah = getWilayahLabel(safe);

    safe.id_sasaran = itemId || String(safe.id_sasaran || safe.id || '').trim();
    safe.id = String(safe.id || safe.id_sasaran || '').trim();
    safe.nama_sasaran = normalizeSpaces(safe.nama_sasaran || safe.nama || '');
    safe.jenis_sasaran = normalizeSpaces(safe.jenis_sasaran || '');
    safe.status_sasaran = normalizeSpaces(safe.status_sasaran || safe.status || '');
    safe.nik_sasaran = normalizeSpaces(safe.nik_sasaran || safe.nik || '');
    safe.nomor_kk = normalizeSpaces(safe.nomor_kk || '');
    safe.nama_wilayah_sasaran = wilayah;
    safe.wilayah_sasaran = wilayah;
    return safe;
  }

  function setSelectedSasaran(item) {
    var safeItem = item && typeof item === 'object' ? item : {};
    var state = getState();
    var storage = getStorage();
    var keys = getStorageKeys();

    if (state && typeof state.setSelectedSasaran === 'function') {
      state.setSelectedSasaran(safeItem);
    }

    if (storage && typeof storage.set === 'function') {
      storage.set(keys.SELECTED_SASARAN || LOCAL_SELECTED_KEY, safeItem);
    }

    try {
      localStorage.setItem(LOCAL_SELECTED_KEY, JSON.stringify(safeItem));
    } catch (err) {}
  }

  function saveLocalCache(items) {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({
        saved_at: new Date().toISOString(),
        items: Array.isArray(items) ? items.map(normalizeItem) : []
      }));
    } catch (err) {}
  }

  function readLocalCache() {
    try {
      var raw = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
      var items = Array.isArray(raw.items) ? raw.items.map(normalizeItem) : [];
      var savedAt = raw.saved_at ? new Date(raw.saved_at).getTime() : 0;
      return {
        items: items,
        saved_at: raw.saved_at || '',
        is_fresh: savedAt > 0 && (Date.now() - savedAt) <= LIST_CACHE_TTL_MS
      };
    } catch (err) {
      return { items: [], saved_at: '', is_fresh: false };
    }
  }

  function resetFilters() {
    var keywordEl = byId(FILTER_KEYWORD_ID);
    var jenisEl = byId(FILTER_JENIS_ID);
    var statusEl = byId(FILTER_STATUS_ID);

    if (keywordEl) keywordEl.value = '';
    if (jenisEl) jenisEl.value = '';
    if (statusEl) statusEl.value = '';
  }

  function ensureResetButton() {
    var existing = byId(BTN_RESET_ID);
    if (existing) return existing;

    var refreshBtn = byId(BTN_REFRESH_ID);
    if (!refreshBtn || !refreshBtn.parentElement) return null;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = BTN_RESET_ID;
    btn.className = 'btn btn-secondary';
    btn.textContent = 'Reset Filter';
    btn.style.marginTop = '12px';

    refreshBtn.parentElement.appendChild(btn);
    return btn;
  }

  function applyAllFilters(items, filters) {
    var safeItems = Array.isArray(items) ? items.slice() : [];
    var keyword = normalizeSpaces(filters && filters.keyword);
    var jenis = normalizeUpper(filters && filters.jenis_sasaran);
    var status = normalizeUpper(filters && filters.status_sasaran);

    if (jenis) {
      safeItems = safeItems.filter(function (item) {
        return normalizeUpper(item.jenis_sasaran) === jenis;
      });
    }

    if (status) {
      safeItems = safeItems.filter(function (item) {
        return normalizeUpper(item.status_sasaran || item.status) === status;
      });
    }

    if (keyword) {
      var q = keyword.toLowerCase();
      safeItems = safeItems.filter(function (item) {
        return [
          item.id_sasaran,
          item.nama_sasaran,
          item.nik_sasaran,
          item.nomor_kk,
          item.jenis_sasaran,
          item.dusun_rw,
          item.desa_kelurahan,
          item.kecamatan
        ].some(function (v) {
          return String(v || '').toLowerCase().indexOf(q) !== -1;
        });
      });
    }

    return safeItems;
  }

  function renderList(items) {
    var box = byId(CONTAINER_ID);
    if (!box) return;

    if (!items || !items.length) {
      box.innerHTML = '<p class="muted-text">Tidak ada data sasaran sesuai filter.</p>';
      return;
    }

    box.innerHTML = items.map(function (item) {
      var status = item.status_sasaran || item.status || '-';
      var jenis = item.jenis_sasaran || '-';
      var nama = item.nama_sasaran || '-';
      var id = getItemId(item) || '-';
      var nik = item.nik_sasaran || '-';
      var kk = item.nomor_kk || '-';
      var wilayah = getWilayahLabel(item);
      var tgl = formatDate(item.tanggal_lahir);

      return [
        '<article class="list-card sasaran-item" data-id-sasaran="', escapeHtml(id), '" style="cursor:pointer;">',
          '<div class="list-card-header row-between">',
            '<div>',
              '<h4 style="margin:0 0 4px;">', escapeHtml(nama), '</h4>',
              '<p class="muted-text" style="margin:0;">ID Sasaran: ', escapeHtml(id), '</p>',
            '</div>',
            '<span class="badge badge-neutral">', escapeHtml(status), '</span>',
          '</div>',
          '<div class="profile-grid" style="margin-top:12px;">',
            '<div><span class="label">Jenis Sasaran</span><strong>', escapeHtml(jenis), '</strong></div>',
            '<div><span class="label">Tanggal Lahir</span><strong>', escapeHtml(tgl), '</strong></div>',
            '<div><span class="label">NIK</span><strong>', escapeHtml(nik), '</strong></div>',
            '<div><span class="label">No. KK</span><strong>', escapeHtml(kk), '</strong></div>',
            '<div style="grid-column:1 / -1;"><span class="label">Wilayah</span><strong>', escapeHtml(wilayah), '</strong></div>',
          '</div>',
          '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">',
            '<button type="button" class="btn btn-secondary btn-sasaran-detail" data-id-sasaran="', escapeHtml(id), '">Detail</button>',
            '<button type="button" class="btn btn-primary btn-sasaran-pendampingan" data-id-sasaran="', escapeHtml(id), '">Lapor Pendampingan</button>',
          '</div>',
        '</article>'
      ].join('');
    }).join('');
  }

  var SasaranListView = {
    _initialized: false,
    _lastItems: [],
    _lastRenderedItems: [],
    _itemMap: {},

    init: function () {
      if (this._initialized) {
        this.renderLocal();
        return;
      }

      this._initialized = true;

      var refreshBtn = byId(BTN_REFRESH_ID);
      var resetBtn = ensureResetButton();
      var backBtn = byId(BTN_BACK_ID);
      var keywordEl = byId(FILTER_KEYWORD_ID);
      var jenisEl = byId(FILTER_JENIS_ID);
      var statusEl = byId(FILTER_STATUS_ID);
      var container = byId(CONTAINER_ID);

      if (refreshBtn && refreshBtn.dataset.bound !== '1') {
        refreshBtn.dataset.bound = '1';
        refreshBtn.addEventListener('click', this.load.bind(this, true));
      }

      if (resetBtn && resetBtn.dataset.bound !== '1') {
        resetBtn.dataset.bound = '1';
        resetBtn.addEventListener('click', function () {
          resetFilters();
          SasaranListView.renderLocal();
        });
      }

      if (backBtn && backBtn.dataset.bound !== '1') {
        backBtn.dataset.bound = '1';
        backBtn.addEventListener('click', function () {
          var router = getRouter();
          if (router && typeof router.go === 'function') {
            router.go('dashboard');
          }
        });
      }

      [keywordEl, jenisEl, statusEl].forEach(function (el) {
        if (!el || el.dataset.bound === '1') return;
        el.dataset.bound = '1';

        var evt = el.id === FILTER_KEYWORD_ID ? 'input' : 'change';
        el.addEventListener(evt, function () {
          SasaranListView.renderLocal();
        });
      });

      if (container && container.dataset.bound !== '1') {
        container.dataset.bound = '1';

        container.addEventListener('click', function (event) {
          var detailBtn = event.target.closest('.btn-sasaran-detail');
          var penBtn = event.target.closest('.btn-sasaran-pendampingan');
          var card = event.target.closest('.sasaran-item');

          if (detailBtn) {
            event.preventDefault();
            event.stopPropagation();
            SasaranListView.openDetail(detailBtn.getAttribute('data-id-sasaran'));
            return;
          }

          if (penBtn) {
            event.preventDefault();
            event.stopPropagation();
            SasaranListView.openPendampingan(penBtn.getAttribute('data-id-sasaran'));
            return;
          }

          if (card) {
            SasaranListView.openDetail(card.getAttribute('data-id-sasaran'));
          }
        });
      }

      var cached = readLocalCache();
      if (cached.items.length) {
        this._lastItems = cached.items.slice();
        this.rebuildItemMap();
        this.renderLocal();

        var self = this;
        window.setTimeout(function () {
          self.load(true);
        }, 100);
      } else {
        this.load(true);
      }
    },

    rebuildItemMap: function () {
      var map = {};
      this._lastItems.forEach(function (item) {
        var safeItem = normalizeItem(item);
        var id = getItemId(safeItem);
        if (id) map[id] = safeItem;
      });
      this._itemMap = map;
    },

    buildPayload: function () {
      var profile = getProfile();
      var session = getSession();

      return {
        id_tim: getIdTim(profile, session),
        book_key: getBookKey(profile, session)
      };
    },

    load: async function (forceRefresh) {
      var api = getApi();
      if (!api || typeof api.post !== 'function') {
        setMeta('Gagal memuat data sasaran.');
        if (this._lastItems.length) {
          this.renderLocal();
        } else {
          setEmpty('API belum tersedia.');
        }
        return;
      }

      var payload = this.buildPayload();

      if (!payload.id_tim) {
        setMeta('Gagal memuat data sasaran.');
        if (this._lastItems.length) {
          this.renderLocal();
        } else {
          setEmpty('id_tim tidak ditemukan pada profil/session.');
        }
        return;
      }

      if (!forceRefresh && this._lastItems.length) {
        this.renderLocal();
        return;
      }

      setLoading();

      try {
        var action = api.getActionName ? api.getActionName('GET_SASARAN_BY_TIM', 'getSasaranByTim') : 'getSasaranByTim';
        var result = await api.post(action, payload, {
          includeAuth: true,
          timeoutMs: 12000,
          retryCount: 1,
          retryDelayMs: 900,
          readOnlyFallbackGet: true
        });

        if (!result || result.ok === false) {
          setMeta('Menampilkan cache lokal sasaran.');
          if (this._lastItems.length) {
            this.renderLocal();
            toast((result && result.message) || 'Daftar sasaran sedang memakai cache lokal.', 'warning');
          } else {
            setEmpty((result && result.message) || 'Gagal memuat data sasaran.');
          }
          return;
        }

        var data = result.data || {};
        var items = Array.isArray(data.items) ? data.items
          : (Array.isArray(data.list) ? data.list
          : (Array.isArray(data.records) ? data.records
          : (Array.isArray(data) ? data : [])));

        this._lastItems = items.map(normalizeItem);
        saveLocalCache(this._lastItems);
        this.rebuildItemMap();
        this.renderLocal();
      } catch (err) {
        setMeta('Menampilkan cache lokal sasaran.');
        if (this._lastItems.length) {
          this.renderLocal();
          toast(err && err.message ? err.message : 'Daftar sasaran sedang memakai cache lokal.', 'warning');
        } else {
          setEmpty(err && err.message ? err.message : 'Gagal terhubung ke server.');
        }
      }
    },

    renderLocal: function () {
      var filters = getSelectedFilters();
      var items = applyAllFilters(this._lastItems, filters);
      this._lastRenderedItems = items.slice();
      renderList(items);

      var label = 'Menampilkan ' + String(items.length) + ' data';
      if (filters.jenis_sasaran) label += ' • Jenis: ' + filters.jenis_sasaran;
      if (filters.status_sasaran) label += ' • Status: ' + filters.status_sasaran;
      if (filters.keyword) label += ' • Kata kunci: ' + filters.keyword;
      setMeta(label);
    },

    findItemById: function (idSasaran) {
      var id = String(idSasaran || '').trim();
      if (!id) return null;
      return this._itemMap[id] || null;
    },

    openDetail: function (idSasaran) {
      var item = this.findItemById(idSasaran) || normalizeItem({ id_sasaran: idSasaran, id: idSasaran });
      if (!getItemId(item)) return;

      setSelectedSasaran(item);

      if (window.SasaranDetailView && typeof window.SasaranDetailView.open === 'function') {
        window.SasaranDetailView.open(idSasaran);
        return;
      }

      var router = getRouter();
      if (router && typeof router.go === 'function') {
        router.go('sasaranDetail');
      }
    },

    openPendampingan: function (idSasaran) {
      var item = this.findItemById(idSasaran) || normalizeItem({ id_sasaran: idSasaran, id: idSasaran });
      if (!getItemId(item)) {
        toast('Data sasaran tidak ditemukan.', 'warning');
        return;
      }

      setSelectedSasaran(item);

      if (window.PendampinganView && typeof window.PendampinganView.openCreate === 'function') {
        window.PendampinganView.openCreate(item);
        return;
      }

      var router = getRouter();
      if (router && typeof router.go === 'function') {
        router.go('pendampingan');
      }
    },

    refresh: function () {
      return this.load(true);
    }
  };

  SasaranListView.loadAndRender = function () {
    return this.load(true);
  };

  window.SasaranListView = SasaranListView;
  window.SasaranList = SasaranListView;
})(window, document);
