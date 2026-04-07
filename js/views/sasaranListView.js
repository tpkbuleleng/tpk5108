
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
      keyword: (byId(FILTER_KEYWORD_ID) ? byId(FILTER_KEYWORD_ID).value : '').trim(),
      jenis_sasaran: (byId(FILTER_JENIS_ID) ? byId(FILTER_JENIS_ID).value : '').trim(),
      status_sasaran: (byId(FILTER_STATUS_ID) ? byId(FILTER_STATUS_ID).value : '').trim()
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

  function renderList(items) {
    var box = byId(CONTAINER_ID);
    if (!box) return;

    if (!items || !items.length) {
      box.innerHTML = '<p class="muted-text">Tidak ada data sasaran sesuai filter.</p>';
      return;
    }

    box.innerHTML = items.map(function (item) {
      var status = item.status_sasaran || '-';
      var jenis = item.jenis_sasaran || '-';
      var nama = item.nama_sasaran || '-';
      var id = item.id_sasaran || '-';
      var nik = item.nik_sasaran || '-';
      var kk = item.nomor_kk || '-';
      var wilayah = getWilayahLabel(item);
      var tgl = formatDate(item.tanggal_lahir);
      return [
        '<article class="list-card sasaran-item" data-id-sasaran="', escapeHtml(id), '">',
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
        '</article>'
      ].join('');
    }).join('');
  }

  function applyKeywordFilter(items, keyword) {
    var q = String(keyword || '').trim().toLowerCase();
    if (!q) return items.slice();

    return items.filter(function (item) {
      return [
        item.id_sasaran,
        item.nama_sasaran,
        item.nik_sasaran,
        item.nomor_kk,
        item.jenis_sasaran,
        item.dusun_rw,
        item.desa_kelurahan
      ].some(function (v) {
        return String(v || '').toLowerCase().indexOf(q) !== -1;
      });
    });
  }

  var SasaranListView = {
    _initialized: false,
    _lastItems: [],

    init: function () {
      if (this._initialized) return;
      this._initialized = true;

      var refreshBtn = byId(BTN_REFRESH_ID);
      var backBtn = byId(BTN_BACK_ID);
      var keywordEl = byId(FILTER_KEYWORD_ID);
      var jenisEl = byId(FILTER_JENIS_ID);
      var statusEl = byId(FILTER_STATUS_ID);

      if (refreshBtn && refreshBtn.dataset.bound !== '1') {
        refreshBtn.dataset.bound = '1';
        refreshBtn.addEventListener('click', this.load.bind(this));
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

        if (el.id === FILTER_KEYWORD_ID) {
          el.addEventListener('input', function () {
            SasaranListView.renderLocal();
          });
        } else {
          el.addEventListener('change', function () {
            SasaranListView.load();
          });
        }
      });

      this.load();
    },

    buildPayload: function () {
      var profile = getProfile();
      var session = getSession();
      var filters = getSelectedFilters();

      return {
        id_tim: getIdTim(profile, session),
        book_key: getBookKey(profile, session),
        status_sasaran: filters.status_sasaran || '',
        jenis_sasaran: filters.jenis_sasaran || ''
      };
    },

    load: async function () {
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
        this.renderLocal();

        var filters = getSelectedFilters();
        var label = 'Menampilkan ' + String(byId(CONTAINER_ID).querySelectorAll('.sasaran-item').length) + ' data';
        if (filters.jenis_sasaran) label += ' • Jenis: ' + filters.jenis_sasaran;
        if (filters.status_sasaran) label += ' • Status: ' + filters.status_sasaran;
        setMeta(label);
      } catch (err) {
        setMeta('Gagal memuat data sasaran.');
        setEmpty(err && err.message ? err.message : 'Gagal terhubung ke server.');
      }
    },

    renderLocal: function () {
      var filters = getSelectedFilters();
      var items = applyKeywordFilter(this._lastItems, filters.keyword);
      renderList(items);
    },

    refresh: function () {
      return this.load();
    }
  };

  window.SasaranListView = SasaranListView;
})(window, document);
