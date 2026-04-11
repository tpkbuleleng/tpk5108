(function (window, document) {
  'use strict';

  var SCREEN_ID = 'sasaran-list-screen';
  var FILTER_KEYWORD_ID = 'filter-keyword-sasaran';
  var FILTER_JENIS_ID = 'filter-jenis-sasaran';
  var FILTER_STATUS_ID = 'filter-status-sasaran';
  var BTN_REFRESH_ID = 'btn-refresh-sasaran';
  var BTN_BACK_ID = 'btn-back-dashboard-from-list';
  var META_ID = 'sasaran-list-meta';
  var CONTAINER_ID = 'sasaran-list-container';

  var LOCAL_SELECTED_KEY = 'tpk_selected_sasaran';
  var LOCAL_CACHE_KEY = 'tpk_sasaran_cache_v1';

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

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeSpaces(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
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
    var parts = [
      item.dusun_rw || item.nama_dusun || '',
      item.desa_kelurahan || item.nama_desa || '',
      item.kecamatan || item.nama_kecamatan || ''
    ].filter(Boolean);
    return parts.length ? parts.join(' • ') : '-';
  }

  function getItemId(item) {
    return String(item && (item.id_sasaran || item.id || '')).trim();
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
      if (keys.SELECTED_SASARAN) {
        storage.set(keys.SELECTED_SASARAN, safeItem);
      } else {
        storage.set(LOCAL_SELECTED_KEY, safeItem);
      }
    }

    try {
      localStorage.setItem(LOCAL_SELECTED_KEY, JSON.stringify(safeItem));
    } catch (err) {}
  }

  function saveLocalCache(items) {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({
        saved_at: new Date().toISOString(),
        items: Array.isArray(items) ? items : []
      }));
    } catch (err) {}
  }

  function readLocalCache() {
    try {
      var raw = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
      return Array.isArray(raw.items) ? raw.items : [];
    } catch (err) {
      return [];
    }
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
      var backBtn = byId(BTN_BACK_ID);
      var keywordEl = byId(FILTER_KEYWORD_ID);
      var jenisEl = byId(FILTER_JENIS_ID);
      var statusEl = byId(FILTER_STATUS_ID);
      var container = byId(CONTAINER_ID);

      if (refreshBtn && refreshBtn.dataset.bound !== '1') {
        refreshBtn.dataset.bound = '1';
        refreshBtn.addEventListener('click', this.load.bind(this, true));
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
      if (cached.length) {
        this._lastItems = cached.slice();
        this.rebuildItemMap();
        this.renderLocal();
      } else {
        this.load(false);
      }
    },

    rebuildItemMap: function () {
      var map = {};
      this._lastItems.forEach(function (item) {
        var id = getItemId(item);
        if (id) map[id] = item;
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
        setEmpty('API belum tersedia.');
        return;
      }

      var payload = this.buildPayload();

      if (!payload.id_tim) {
        setMeta('Gagal memuat data sasaran.');
        setEmpty('id_tim tidak ditemukan pada profil/session.');
        return;
      }

      if (!forceRefresh && this._lastItems.length) {
        this.renderLocal();
        return;
      }

      setLoading();

      try {
        var result = await api.post('getSasaranByTim', payload);

        if (!result || result.ok === false) {
          setMeta('Gagal memuat data sasaran.');
          setEmpty((result && result.message) || 'Gagal memuat data sasaran.');
          return;
        }

        var data = result.data || {};
        var items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);

        this._lastItems = items.slice();
        saveLocalCache(this._lastItems);
        this.rebuildItemMap();
        this.renderLocal();
      } catch (err) {
        setMeta('Gagal memuat data sasaran.');
        setEmpty(err && err.message ? err.message : 'Gagal terhubung ke server.');
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
      var item = this.findItemById(idSasaran);
      if (!item) return;

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
      var item = this.findItemById(idSasaran);
      if (!item) {
        if (window.UI && typeof window.UI.showToast === 'function') {
          window.UI.showToast('Data sasaran tidak ditemukan.', 'warning');
        }
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

  window.SasaranListView = SasaranListView;
})(window, document);
