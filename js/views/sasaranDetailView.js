(function (window, document) {
  'use strict';

  var CACHE_KEY = 'tpk_sasaran_cache_v2';
  var SELECTED_KEY = 'tpk_selected_sasaran';
  var DETAIL_CACHE_KEY = 'tpk_sasaran_detail_cache_v1';
  var CACHE_TTL_MS = 5 * 60 * 1000;

  var SCREEN_ID = 'sasaran-list-screen';
  var FILTER_KEYWORD_ID = 'filter-keyword-sasaran';
  var FILTER_JENIS_ID = 'filter-jenis-sasaran';
  var FILTER_STATUS_ID = 'filter-status-sasaran';
  var BTN_REFRESH_ID = 'btn-refresh-sasaran';
  var BTN_BACK_ID = 'btn-back-dashboard-from-list';
  var CONTAINER_ID = 'sasaran-list-container';
  var META_ID = 'sasaran-list-meta';

  function byId(id) {
    return document.getElementById(id);
  }

  function getApi() {
    return window.Api || null;
  }

  function getRouter() {
    return window.Router || null;
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

  function getAppState() {
    return window.AppState || null;
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

  function readStorage(key, fallback) {
    var storage = getStorage();
    if (storage && typeof storage.get === 'function') {
      return storage.get(key, fallback);
    }

    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return safeJsonParse(raw, fallback);
    } catch (err) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    var storage = getStorage();
    if (storage && typeof storage.set === 'function') {
      storage.set(key, value);
      return;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {}
  }

  function normalizeText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function normalizeUpper(value) {
    return normalizeText(value).toUpperCase();
  }

  function isMeaningful(value) {
    var text = normalizeText(value);
    if (!text) return false;
    var upper = text.toUpperCase();
    return upper !== '-' && upper !== 'NULL' && upper !== 'UNDEFINED' && upper !== 'N/A';
  }

  function pickFirstFilled(values, fallback) {
    var list = Array.isArray(values) ? values : [values];

    for (var i = 0; i < list.length; i += 1) {
      if (isMeaningful(list[i])) return String(list[i]);
    }

    return fallback || '';
  }

  function getProfile() {
    var appState = getAppState();
    if (appState && typeof appState.getProfile === 'function') {
      var stateProfile = appState.getProfile() || {};
      if (stateProfile && Object.keys(stateProfile).length) return stateProfile;
    }

    var keys = getStorageKeys();
    if (keys.PROFILE) {
      var storedProfile = readStorage(keys.PROFILE, {});
      if (storedProfile && Object.keys(storedProfile).length) return storedProfile;
    }

    var bootstrap = readStorage('tpk_bootstrap_lite', {});
    if (bootstrap && bootstrap.profile && Object.keys(bootstrap.profile).length) {
      return bootstrap.profile;
    }

    return readStorage('tpk_profile', {}) || {};
  }

  function getSession() {
    var appState = getAppState();
    if (appState && typeof appState.getSession === 'function') {
      var stateSession = appState.getSession() || {};
      if (stateSession && Object.keys(stateSession).length) return stateSession;
    }

    var bootstrap = readStorage('tpk_bootstrap_lite', {});
    if (bootstrap && bootstrap.session && Object.keys(bootstrap.session).length) {
      return bootstrap.session;
    }

    return {};
  }

  function getIdTim(profile, session) {
    return pickFirstFilled([
      profile && profile.id_tim,
      session && session.id_tim
    ], '');
  }

  function getBookKey(profile, session) {
    return pickFirstFilled([
      profile && profile.kode_kecamatan,
      profile && profile.book_key,
      session && session.kode_kecamatan,
      session && session.book_key
    ], '');
  }

  function getScopeCacheKey() {
    var profile = getProfile();
    var session = getSession();

    var idUser = pickFirstFilled([
      profile.id_user,
      profile.username,
      session.id_user,
      session.username
    ], 'anon');

    var idTim = getIdTim(profile, session) || 'NO_TIM';
    var bookKey = getBookKey(profile, session) || 'NO_BOOK';

    return [idUser, idTim, bookKey].join('::');
  }

  function getItemId(item) {
    return normalizeText(
      (item && (item.id_sasaran || item.id)) || ''
    );
  }

  function normalizeItem(item) {
    var raw = item || {};

    var nama = pickFirstFilled([raw.nama_sasaran, raw.nama], '');
    var wilayah = pickFirstFilled([
      raw.nama_wilayah,
      raw.wilayah,
      [raw.nama_dusun || raw.dusun_rw || raw.dusun || '', raw.nama_desa || raw.desa_kelurahan || raw.desa || '', raw.nama_kecamatan || raw.kecamatan || ''].filter(Boolean).join(' • ')
    ], '-');

    return Object.assign({}, raw, {
      id_sasaran: pickFirstFilled([raw.id_sasaran, raw.id], ''),
      nama_sasaran: nama,
      jenis_sasaran: pickFirstFilled([raw.jenis_sasaran], ''),
      status_sasaran: pickFirstFilled([raw.status_sasaran, raw.status], 'AKTIF'),
      nik_sasaran: pickFirstFilled([raw.nik_sasaran, raw.nik], ''),
      nomor_kk: pickFirstFilled([raw.nomor_kk], ''),
      tanggal_lahir: pickFirstFilled([raw.tanggal_lahir], ''),
      nama_wilayah: wilayah,
      nama_kecamatan: pickFirstFilled([raw.nama_kecamatan, raw.kecamatan], ''),
      nama_desa: pickFirstFilled([raw.nama_desa, raw.desa_kelurahan, raw.desa], ''),
      nama_dusun: pickFirstFilled([raw.nama_dusun, raw.dusun_rw, raw.dusun], '')
    });
  }

  function readCacheEnvelope() {
    return readStorage(CACHE_KEY, null);
  }

  function readLocalCache() {
    var envelope = readCacheEnvelope();
    var scopeKey = getScopeCacheKey();

    if (!envelope || envelope.scope_key !== scopeKey) {
      return {
        items: [],
        isFresh: false,
        cachedAt: '',
        ageMs: 0
      };
    }

    var items = Array.isArray(envelope.items) ? envelope.items.map(normalizeItem) : [];
    var cachedAt = envelope.cached_at || '';
    var ageMs = cachedAt ? (Date.now() - new Date(cachedAt).getTime()) : Number.MAX_SAFE_INTEGER;
    var isFresh = ageMs >= 0 && ageMs <= CACHE_TTL_MS;

    return {
      items: items,
      isFresh: isFresh,
      cachedAt: cachedAt,
      ageMs: ageMs
    };
  }

  function saveLocalCache(items) {
    writeStorage(CACHE_KEY, {
      scope_key: getScopeCacheKey(),
      cached_at: new Date().toISOString(),
      items: Array.isArray(items) ? items.map(normalizeItem) : []
    });
  }

  function setSelectedSasaran(item) {
    var safeItem = normalizeItem(item || {});
    var storage = getStorage();
    var keys = getStorageKeys();
    var appState = getAppState();

    if (appState && typeof appState.setSelectedSasaran === 'function') {
      appState.setSelectedSasaran(safeItem);
    }

    if (storage && typeof storage.set === 'function') {
      storage.set(keys.SELECTED_SASARAN || SELECTED_KEY, safeItem);
    }

    try {
      localStorage.setItem(SELECTED_KEY, JSON.stringify(safeItem));
    } catch (err) {}
  }

  function saveDetailPreview(item) {
    var safeItem = normalizeItem(item || {});
    var id = getItemId(safeItem);
    if (!id) return;

    var scopeKey = getScopeCacheKey();
    var map = readStorage(DETAIL_CACHE_KEY, {});
    map = map && typeof map === 'object' ? map : {};
    map[scopeKey] = map[scopeKey] || {};
    map[scopeKey][id] = {
      cached_at: new Date().toISOString(),
      detail: safeItem
    };

    writeStorage(DETAIL_CACHE_KEY, map);
  }

  function getSelectedFilters() {
    return {
      keyword: normalizeText(byId(FILTER_KEYWORD_ID) && byId(FILTER_KEYWORD_ID).value),
      jenis_sasaran: normalizeUpper(byId(FILTER_JENIS_ID) && byId(FILTER_JENIS_ID).value),
      status_sasaran: normalizeUpper(byId(FILTER_STATUS_ID) && byId(FILTER_STATUS_ID).value)
    };
  }

  function applyAllFilters(items, filters) {
    var list = Array.isArray(items) ? items.slice() : [];
    var f = filters || {};

    return list.filter(function (item) {
      var safe = normalizeItem(item);

      if (f.jenis_sasaran && normalizeUpper(safe.jenis_sasaran) !== f.jenis_sasaran) {
        return false;
      }

      if (f.status_sasaran && normalizeUpper(safe.status_sasaran) !== f.status_sasaran) {
        return false;
      }

      if (f.keyword) {
        var haystack = [
          safe.id_sasaran,
          safe.nama_sasaran,
          safe.nik_sasaran,
          safe.nomor_kk,
          safe.jenis_sasaran,
          safe.nama_wilayah
        ].join(' ').toLowerCase();

        if (haystack.indexOf(f.keyword.toLowerCase()) === -1) {
          return false;
        }
      }

      return true;
    });
  }

  function formatDate(value) {
    if (!isMeaningful(value)) return '-';

    var raw = String(value).trim();
    var dt = new Date(raw);
    if (!isNaN(dt.getTime())) {
      try {
        return dt.toLocaleDateString('id-ID');
      } catch (err) {
        return raw;
      }
    }

    return raw;
  }

  function getStatusBadgeClass(status) {
    var value = normalizeUpper(status);
    if (value === 'AKTIF') return 'badge-success-soft';
    if (value === 'SELESAI') return 'badge-success';
    if (value === 'PERLU_REVIEW') return 'badge-warning';
    if (value === 'NONAKTIF') return 'badge-danger-soft';
    if (value === 'RUJUK') return 'badge-warning';
    return 'badge-neutral';
  }

  function setMeta(text) {
    var el = byId(META_ID);
    if (el) {
      el.textContent = text || '';
    }
  }

  function setEmpty(message) {
    var container = byId(CONTAINER_ID);
    if (!container) return;

    container.innerHTML = '<p class="muted-text">' + String(message || 'Belum ada data sasaran.') + '</p>';
  }

  function setLoading(message) {
    var container = byId(CONTAINER_ID);
    if (!container) return;

    container.innerHTML = '<p class="muted-text">' + String(message || 'Memuat data sasaran...') + '</p>';
  }

  function renderList(items) {
    var container = byId(CONTAINER_ID);
    if (!container) return;

    var list = Array.isArray(items) ? items.map(normalizeItem) : [];

    if (!list.length) {
      setEmpty('Belum ada data sasaran.');
      return;
    }

    container.innerHTML = list.map(function (item) {
      var id = getItemId(item);
      return [
        '<article class="card sasaran-item" data-id-sasaran="', id, '">',
          '<div class="section-header row-between">',
            '<div>',
              '<h3 style="margin:0 0 6px;">', normalizeUpper(item.nama_sasaran || '-'), '</h3>',
              '<p class="muted-text" style="margin:0;">ID Sasaran: ', item.id_sasaran || '-', '</p>',
            '</div>',
            '<span class="badge ', getStatusBadgeClass(item.status_sasaran), '">', item.status_sasaran || '-', '</span>',
          '</div>',

          '<div class="profile-grid">',
            '<div><span class="label">Jenis Sasaran</span><strong>', item.jenis_sasaran || '-', '</strong></div>',
            '<div><span class="label">Tanggal Lahir</span><strong>', formatDate(item.tanggal_lahir), '</strong></div>',
            '<div><span class="label">NIK</span><strong>', item.nik_sasaran || '-', '</strong></div>',
            '<div><span class="label">No. KK</span><strong>', item.nomor_kk || '-', '</strong></div>',
            '<div style="grid-column:1 / -1;"><span class="label">Wilayah</span><strong>', item.nama_wilayah || '-', '</strong></div>',
          '</div>',

          '<div class="section-actions action-grid-2">',
            '<button class="btn btn-secondary btn-sasaran-detail" data-id-sasaran="', id, '">Detail</button>',
            '<button class="btn btn-primary btn-sasaran-pendampingan" data-id-sasaran="', id, '">Lapor Pendampingan</button>',
          '</div>',
        '</article>'
      ].join('');
    }).join('');
  }

  function toast(message, type) {
    if (window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(message, type || 'info');
      return;
    }

    try {
      window.alert(message);
    } catch (err) {}
  }

  var SasaranListView = {
    _initialized: false,
    _loading: false,
    _lastItems: [],
    _lastRenderedItems: [],
    _itemMap: {},

    init: function () {
      if (this._initialized) return;
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
      if (cached.items.length) {
        this._lastItems = cached.items.slice();
        this.rebuildItemMap();
        this.renderLocal();

        if (cached.isFresh) {
          setMeta('Menampilkan ' + cached.items.length + ' data dari cache lokal.');
        } else {
          setMeta('Menampilkan ' + cached.items.length + ' data cache lama • menyegarkan data...');
          this.load(false);
        }
      } else {
        this.load(true);
      }
    },

    rebuildItemMap: function () {
      var map = {};
      this._lastItems.forEach(function (item) {
        var normalized = normalizeItem(item);
        var id = getItemId(normalized);
        if (id) map[id] = normalized;
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

      var cached = readLocalCache();
      var hasMemory = this._lastItems.length > 0;
      var hasFreshCache = cached.items.length > 0 && cached.isFresh;

      if (!forceRefresh && hasFreshCache) {
        this._lastItems = cached.items.slice();
        this.rebuildItemMap();
        this.renderLocal();
        setMeta('Menampilkan ' + this._lastRenderedItems.length + ' data dari cache lokal.');
        return;
      }

      if (!forceRefresh && hasMemory) {
        this.renderLocal();
      } else if (!forceRefresh && cached.items.length) {
        this._lastItems = cached.items.slice();
        this.rebuildItemMap();
        this.renderLocal();
      } else {
        setLoading('Memuat data sasaran...');
      }

      if (this._loading) return;
      this._loading = true;

      try {
        var result = await api.post('getSasaranByTim', payload, {
          includeAuth: true,
          timeoutMs: 10000
        });

        if (!result || result.ok === false) {
          if (this._lastItems.length) {
            setMeta('Menampilkan cache lokal • ' + ((result && result.message) || 'Gagal menyegarkan data.'));
            return;
          }

          setMeta('Gagal memuat data sasaran.');
          setEmpty((result && result.message) || 'Gagal memuat data sasaran.');
          return;
        }

        var data = result.data || {};
        var items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);

        this._lastItems = items.map(normalizeItem);
        saveLocalCache(this._lastItems);
        this.rebuildItemMap();
        this.renderLocal();
      } catch (err) {
        if (this._lastItems.length) {
          setMeta('Menampilkan cache lokal • ' + (err && err.message ? err.message : 'Gagal terhubung ke server.'));
          return;
        }

        setMeta('Gagal memuat data sasaran.');
        setEmpty(err && err.message ? err.message : 'Gagal terhubung ke server.');
      } finally {
        this._loading = false;
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
      saveDetailPreview(item);

      if (window.SasaranDetailView && typeof window.SasaranDetailView.open === 'function') {
        window.SasaranDetailView.open(idSasaran, {
          selected: item
        });
        return;
      }

      var router = getRouter();
      if (router && typeof router.go === 'function') {
        router.go('sasaranDetail', {
          onRouteReady: function () {
            if (window.SasaranDetailView && typeof window.SasaranDetailView.open === 'function') {
              window.SasaranDetailView.open(idSasaran, {
                skipRoute: true,
                selected: item
              });
            }
          }
        });
      }
    },

    openPendampingan: function (idSasaran) {
      var item = this.findItemById(idSasaran);
      if (!item) {
        toast('Data sasaran tidak ditemukan.', 'warning');
        return;
      }

      setSelectedSasaran(item);
      saveDetailPreview(item);

      if (window.PendampinganView && typeof window.PendampinganView.openCreate === 'function') {
        window.PendampinganView.openCreate(item);
        return;
      }

      var router = getRouter();
      if (router && typeof router.go === 'function') {
        router.go('pendampingan', {
          onRouteReady: function () {
            if (window.PendampinganView && typeof window.PendampinganView.openCreate === 'function') {
              window.PendampinganView.openCreate(item);
            }
          }
        });
      }
    },

    refresh: function () {
      return this.load(true);
    }
  };

  window.SasaranListView = SasaranListView;
})(window, document);
