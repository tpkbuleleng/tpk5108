(function (window, document) {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
  }

  function getUI() {
    return window.UI || null;
  }

  function getState() {
    return window.AppState || null;
  }

  function getApi() {
    return window.Api || null;
  }

  function getActions() {
    return (window.APP_CONFIG && window.APP_CONFIG.API_ACTIONS) || {};
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

    try {
      window.alert(message);
    } catch (err) {}
  }

  function normalizeText(value, fallback) {
    if (value === undefined || value === null || value === '') {
      return fallback !== undefined ? fallback : '-';
    }
    return String(value);
  }

  function normalizeListResponse(result) {
    var data = (result && result.data) || {};

    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.list)) return data.list;
    if (Array.isArray(data.records)) return data.records;
    if (Array.isArray(data.sasaran)) return data.sasaran;
    if (Array.isArray(data.data)) return data.data;

    return [];
  }

  function normalizeSasaranItem(item) {
    var raw = item || {};

    return {
      id_sasaran: raw.id_sasaran || raw.id || '',
      nama_sasaran: raw.nama_sasaran || raw.nama || '',
      jenis_sasaran: raw.jenis_sasaran || '',
      status_sasaran: raw.status_sasaran || raw.status || '',
      nik_sasaran: raw.nik_sasaran || raw.nik || '',
      nomor_kk: raw.nomor_kk || raw.no_kk || '',
      id_tim: raw.id_tim || '',
      nama_tim: raw.nama_tim || '',
      nama_kecamatan: raw.nama_kecamatan || raw.kecamatan || '',
      nama_desa: raw.nama_desa || raw.desa_kelurahan || raw.desa || '',
      nama_dusun: raw.nama_dusun || raw.dusun_rw || raw.dusun || '',
      tanggal_lahir: raw.tanggal_lahir || '',
      jenis_kelamin: raw.jenis_kelamin || '',
      alamat: raw.alamat || '',
      raw: raw
    };
  }

  function normalizeSasaranList(items) {
    return (Array.isArray(items) ? items : []).map(normalizeSasaranItem);
  }

  function setCachedList(items) {
    var state = getState();
    if (state && typeof state.setSasaranList === 'function') {
      state.setSasaranList(Array.isArray(items) ? items : []);
    }
  }

  function getCachedList() {
    var state = getState();
    if (state && typeof state.getSasaranList === 'function') {
      return state.getSasaranList() || [];
    }
    return [];
  }

  function setSelectedSasaran(item) {
    var state = getState();
    if (state && typeof state.setSelectedSasaran === 'function') {
      state.setSelectedSasaran(item || {});
    }
  }

  function getSelectedSasaran() {
    var state = getState();
    if (state && typeof state.getSelectedSasaran === 'function') {
      return state.getSelectedSasaran() || {};
    }
    return {};
  }

  var SasaranListView = {
    async init() {
      this.bindEvents();

      var cached = this.getCurrentList();
      if (cached.length) {
        this.renderList(cached);
        this.setMeta(cached.length + ' data sasaran dari cache lokal.');
      }
    },

    bindEvents() {
      var self = this;

      [
        ['btn-refresh-sasaran', function () { self.load(); }],
        ['btn-back-dashboard-from-list', function () {
          if (window.Router && typeof window.Router.go === 'function') {
            window.Router.go('dashboard');
          }
        }]
      ].forEach(function (entry) {
        var btn = byId(entry[0]);
        if (!btn || btn.dataset.bound === '1') return;

        btn.dataset.bound = '1';
        btn.addEventListener('click', entry[1]);
      });

      ['filter-keyword-sasaran', 'filter-jenis-sasaran', 'filter-status-sasaran'].forEach(function (id) {
        var el = byId(id);
        if (!el || el.dataset.bound === '1') return;

        el.dataset.bound = '1';

        var eventName = id === 'filter-keyword-sasaran' ? 'input' : 'change';
        el.addEventListener(eventName, function () {
          if (id === 'filter-keyword-sasaran') {
            window.clearTimeout(self._searchTimer);
            self._searchTimer = window.setTimeout(function () {
              self.load();
            }, 350);
          } else {
            self.load();
          }
        });
      });
    },

    open() {
      if (window.Router && typeof window.Router.go === 'function') {
        window.Router.go('sasaranList');
      }

      this.init();
      this.load();
    },

    async load() {
      return this.loadAndRender();
    },

    async loadAndRender() {
      var ui = getUI();
      var api = getApi();
      var actions = getActions();
      var filters = this.getFilters();

      if (ui && typeof ui.setHTML === 'function') {
        ui.setHTML('sasaran-list-container', '<p class="muted-text">Sedang memuat data sasaran...</p>');
      }

      try {
        if (!api || typeof api.post !== 'function') {
          throw new Error('Api.post belum tersedia.');
        }

        var hasFilters = !!(filters.keyword || filters.jenis_sasaran || filters.status_sasaran);
        var action = hasFilters ? actions.SEARCH_SASARAN : actions.GET_SASARAN_BY_TIM;

        if (!action) {
          throw new Error('Action daftar sasaran belum tersedia di konfigurasi.');
        }

        var payload = {};
        if (filters.keyword) payload.keyword = filters.keyword;
        if (filters.jenis_sasaran) payload.jenis_sasaran = filters.jenis_sasaran;
        if (filters.status_sasaran) payload.status_sasaran = filters.status_sasaran;

        var result = await api.post(action, payload, {
          includeAuth: true
        });

        if (!result || result.ok === false) {
          throw new Error((result && result.message) || 'Gagal memuat daftar sasaran.');
        }

        var rawItems = normalizeListResponse(result);
        var items = normalizeSasaranList(rawItems);

        setCachedList(items);
        this.renderList(items);
        this.setMeta(items.length + ' data sasaran berhasil dimuat.');
      } catch (err) {
        var cached = this.getCurrentList();

        if (cached.length) {
          this.renderList(cached);
          this.setMeta('Menampilkan ' + cached.length + ' data cache lokal.');
          showToast('Gagal refresh: ' + (err && err.message ? err.message : err), 'warning');
          return;
        }

        if (ui && typeof ui.setHTML === 'function') {
          ui.setHTML('sasaran-list-container', '<p class="muted-text">' + escapeHtml(err && err.message ? err.message : 'Gagal memuat data.') + '</p>');
        }

        this.setMeta('Gagal memuat data sasaran.');
      }
    },

    getFilters() {
      return {
        keyword: normalizeText(byId('filter-keyword-sasaran') && byId('filter-keyword-sasaran').value, '').trim(),
        jenis_sasaran: normalizeText(byId('filter-jenis-sasaran') && byId('filter-jenis-sasaran').value, '').trim(),
        status_sasaran: normalizeText(byId('filter-status-sasaran') && byId('filter-status-sasaran').value, '').trim()
      };
    },

    setMeta(text) {
      var ui = getUI();
      if (ui && typeof ui.setText === 'function') {
        ui.setText('sasaran-list-meta', text || '-');
      }
    },

    renderList(items) {
      var container = byId('sasaran-list-container');
      if (!container) return;

      if (!items || !items.length) {
        container.innerHTML = '<p class="muted-text">Belum ada data sasaran untuk ditampilkan.</p>';
        return;
      }

      container.innerHTML = items.map(this.cardTemplate.bind(this)).join('');
      this.bindListActions(container);
    },

    cardTemplate(item) {
      var id = item.id_sasaran || '-';
      var nama = item.nama_sasaran || '-';
      var jenis = item.jenis_sasaran || '-';
      var status = item.status_sasaran || '-';
      var wilayah = [item.nama_dusun, item.nama_desa, item.nama_kecamatan].filter(Boolean).join(' / ') || '-';
      var nik = item.nik_sasaran || '-';
      var tim = item.nama_tim || item.id_tim || '-';
      var badgeClass = this.getStatusBadgeClass(status);

      return [
        '<article class="sasaran-card">',
          '<div class="sasaran-card-header">',
            '<div>',
              '<h4 class="sasaran-card-title">', escapeHtml(nama), '</h4>',
              '<p class="muted-text">ID Sasaran: ', escapeHtml(id), '</p>',
            '</div>',
            '<span class="badge ', escapeHtml(badgeClass), '">', escapeHtml(status), '</span>',
          '</div>',

          '<div class="sasaran-card-meta">',
            '<div><span class="label">Jenis</span><strong>', escapeHtml(jenis), '</strong></div>',
            '<div><span class="label">NIK</span><strong>', escapeHtml(nik), '</strong></div>',
            '<div><span class="label">Tim</span><strong>', escapeHtml(tim), '</strong></div>',
            '<div><span class="label">Wilayah</span><strong>', escapeHtml(wilayah), '</strong></div>',
          '</div>',

          '<div class="sasaran-card-actions">',
            '<button class="btn btn-primary btn-sm" data-open-sasaran-detail="', escapeHtml(id), '">Lihat Detail</button>',
            '<button class="btn btn-secondary btn-sm" data-pilih-sasaran="', escapeHtml(id), '">Pilih Sasaran</button>',
          '</div>',
        '</article>'
      ].join('');
    },

    bindListActions(container) {
      var self = this;

      container.querySelectorAll('[data-open-sasaran-detail]').forEach(function (btn) {
        if (btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';

        btn.addEventListener('click', function () {
          var idSasaran = btn.getAttribute('data-open-sasaran-detail') || '';
          self.openDetail(idSasaran);
        });
      });

      container.querySelectorAll('[data-pilih-sasaran]').forEach(function (btn) {
        if (btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';

        btn.addEventListener('click', function () {
          var idSasaran = btn.getAttribute('data-pilih-sasaran') || '';
          self.selectSasaran(idSasaran);
        });
      });
    },

    getStatusBadgeClass(status) {
      var value = String(status || '').toUpperCase();
      if (value === 'AKTIF') return 'badge-success-soft';
      if (value === 'NONAKTIF') return 'badge-danger-soft';
      if (value === 'SELESAI') return 'badge-success';
      if (value === 'PERLU_REVIEW') return 'badge-warning';
      return 'badge-neutral';
    },

    findById(idSasaran) {
      return this.getCurrentList().find(function (item) {
        return item.id_sasaran === idSasaran;
      }) || null;
    },

    getCurrentList() {
      return getCachedList();
    },

    selectSasaran(idSasaran) {
      var item = this.findById(idSasaran);
      if (!item) {
        showToast('Data sasaran tidak ditemukan.', 'warning');
        return;
      }

      setSelectedSasaran(item);
      showToast('Sasaran dipilih: ' + (item.nama_sasaran || idSasaran), 'success');
    },

    openDetail(idSasaran) {
      var item = this.findById(idSasaran);
      if (item) {
        setSelectedSasaran(item);
      }

      if (window.SasaranDetailView && typeof window.SasaranDetailView.open === 'function') {
        window.SasaranDetailView.open(idSasaran);
        return;
      }

      if (window.Router && typeof window.Router.go === 'function') {
        window.Router.go('sasaranDetail');
      }
    },

    getSelectedSasaran: function () {
      return getSelectedSasaran();
    }
  };

  window.SasaranListView = SasaranListView;

  // Alias sementara agar referensi lama tidak langsung patah
  window.SasaranList = SasaranListView;

  document.addEventListener('DOMContentLoaded', function () {
    if (window.SasaranListView && typeof window.SasaranListView.init === 'function') {
      window.SasaranListView.init();
    }
  });
})(window, document);
