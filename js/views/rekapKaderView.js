(function (window, document) {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
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

  function getActions() {
    return getConfig().API_ACTIONS || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
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

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getDraftCount() {
    var state = getState();
    if (state && typeof state.getSyncQueue === 'function') {
      var queueFromState = state.getSyncQueue();
      return Array.isArray(queueFromState) ? queueFromState.length : 0;
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.SYNC_QUEUE) {
      var queueFromStorage = storage.get(keys.SYNC_QUEUE, []);
      return Array.isArray(queueFromStorage) ? queueFromStorage.length : 0;
    }

    return 0;
  }

  function getProfile() {
    var state = getState();
    if (state && typeof state.getProfile === 'function') {
      return state.getProfile() || {};
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.PROFILE) {
      return storage.get(keys.PROFILE, {}) || {};
    }

    return {};
  }

  function monthInputToPeriodeKey(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    return raw.replace('-', '');
  }

  function normalizeResponseData(result, bulan) {
    var data = (result && result.data) || {};
    var profile = getProfile();

    var aktivitas = [];
    if (Array.isArray(data.aktivitas_terbaru)) aktivitas = data.aktivitas_terbaru;
    else if (Array.isArray(data.activities)) aktivitas = data.activities;
    else if (Array.isArray(data.list_aktivitas)) aktivitas = data.list_aktivitas;
    else if (Array.isArray(data.riwayat)) aktivitas = data.riwayat;

    return {
      nama_kader: data.nama_kader || profile.nama_kader || profile.nama || '-',
      nama_tim: data.nama_tim || profile.nama_tim || profile.id_tim || '-',
      bulan: data.bulan || bulan || '-',
      keterangan: data.keterangan || 'Rekap periode berhasil dimuat.',
      jumlah_sasaran_aktif:
        data.jumlah_sasaran_aktif ??
        data.total_sasaran_aktif ??
        data.sasaran_aktif ??
        0,
      jumlah_pendampingan:
        data.jumlah_pendampingan ??
        data.total_pendampingan ??
        data.pendampingan ??
        0,
      jumlah_perlu_tindak_lanjut:
        data.jumlah_perlu_tindak_lanjut ??
        data.total_perlu_tindak_lanjut ??
        data.followup ??
        0,
      aktivitas_terbaru: aktivitas
    };
  }

  var RekapKaderView = {
    getDefaultMonth: function () {
      var d = new Date();
      var yyyy = d.getFullYear();
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      return yyyy + '-' + mm;
    },

    ensureDefaultMonth: function () {
      var el = byId('rekap-filter-bulan');
      if (el && !el.value) {
        el.value = this.getDefaultMonth();
      }
    },

    init: function () {
      this.bindEvents();
      this.ensureDefaultMonth();
    },

    bindEvents: function () {
      var self = this;

      var btnLoad = byId('btn-load-rekap');
      if (btnLoad && btnLoad.dataset.bound !== '1') {
        btnLoad.dataset.bound = '1';
        btnLoad.addEventListener('click', function () {
          self.load();
        });
      }

      var btnBack = byId('btn-back-from-rekap');
      if (btnBack && btnBack.dataset.bound !== '1') {
        btnBack.dataset.bound = '1';
        btnBack.addEventListener('click', function () {
          if (window.Router && typeof window.Router.go === 'function') {
            window.Router.go('dashboard');
          }
        });
      }

      var monthInput = byId('rekap-filter-bulan');
      if (monthInput && monthInput.dataset.bound !== '1') {
        monthInput.dataset.bound = '1';
        monthInput.addEventListener('change', function () {
          self.load();
        });
      }
    },

    open: function () {
      this.init();

      if (window.Router && typeof window.Router.go === 'function') {
        window.Router.go('rekapKader');
      }

      this.load();
    },

    load: async function () {
      this.ensureDefaultMonth();

      var api = getApi();
      var actions = getActions();
      var bulan = (byId('rekap-filter-bulan') && byId('rekap-filter-bulan').value) || this.getDefaultMonth();

      setHTML('rekap-summary-box', '<p class="muted-text">Sedang memuat rekap...</p>');
      setHTML('rekap-activity-list', '<p class="muted-text">Sedang memuat aktivitas...</p>');

      try {
        if (!api || typeof api.post !== 'function') {
          throw new Error('Api.post belum tersedia.');
        }

        var result = await api.post(actions.GET_REKAP_BULANAN_TIM, {
          periode_key: monthInputToPeriodeKey(bulan)
        }, {
          includeAuth: true
        });

        if (!result || result.ok === false) {
          throw new Error((result && result.message) || 'Gagal memuat rekap kader.');
        }

        var data = normalizeResponseData(result, bulan);
        this.render(data);
      } catch (err) {
        setHTML('rekap-summary-box', '<p class="muted-text">' + escapeHtml((err && err.message) || 'Gagal memuat rekap.') + '</p>');
        setHTML('rekap-activity-list', '<p class="muted-text">Aktivitas tidak dapat dimuat.</p>');
        showToast((err && err.message) || 'Gagal memuat rekap kader.', 'warning');
      }
    },

    render: function (data) {
      var safeData = data || {};

      setText('rekap-stat-sasaran-aktif', String(safeData.jumlah_sasaran_aktif || 0));
      setText('rekap-stat-pendampingan', String(safeData.jumlah_pendampingan || 0));
      setText('rekap-stat-draft', String(getDraftCount() || 0));
      setText('rekap-stat-followup', String(safeData.jumlah_perlu_tindak_lanjut || 0));

      var summaryHtml = [
        '<div class="activity-item">',
          '<div><span class="label">Nama Kader</span><strong>', escapeHtml(safeData.nama_kader || '-'), '</strong></div>',
          '<div><span class="label">Tim</span><strong>', escapeHtml(safeData.nama_tim || '-'), '</strong></div>',
          '<div><span class="label">Bulan</span><strong>', escapeHtml(safeData.bulan || '-'), '</strong></div>',
        '</div>',
        '<div class="activity-item">',
          '<div><span class="label">Keterangan</span><strong>', escapeHtml(safeData.keterangan || 'Rekap periode berhasil dimuat.'), '</strong></div>',
        '</div>'
      ].join('');

      setHTML('rekap-summary-box', summaryHtml);

      var activities = Array.isArray(safeData.aktivitas_terbaru) ? safeData.aktivitas_terbaru : [];
      if (!activities.length) {
        setHTML('rekap-activity-list', '<p class="muted-text">Belum ada aktivitas terbaru.</p>');
        return;
      }

      var activityHtml = activities.map(function (item) {
        return [
          '<div class="activity-item">',
            '<div><span class="label">Tanggal</span><strong>', escapeHtml(item.tanggal || item.submit_at || item.created_at || '-'), '</strong></div>',
            '<div><span class="label">Jenis</span><strong>', escapeHtml(item.jenis || item.tipe || '-'), '</strong></div>',
            '<div><span class="label">Keterangan</span><strong>', escapeHtml(item.keterangan || item.nama_sasaran || '-'), '</strong></div>',
          '</div>'
        ].join('');
      }).join('');

      setHTML('rekap-activity-list', activityHtml);
    }
  };

  window.RekapKaderView = RekapKaderView;

  // Alias sementara agar referensi lama tidak langsung patah
  window.RekapKaderScreen = RekapKaderView;

  document.addEventListener('DOMContentLoaded', function () {
    if (window.RekapKaderView && typeof window.RekapKaderView.init === 'function') {
      window.RekapKaderView.init();
    }
  });
})(window, document);
