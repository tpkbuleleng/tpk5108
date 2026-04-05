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

  function parseJsonSafely(raw, fallback) {
    if (!raw) return fallback;
    if (typeof raw === 'object') return raw;

    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function normalizeDetailResponse(result) {
    var data = (result && result.data) || {};

    if (data.item && typeof data.item === 'object') return data.item;
    if (data.detail && typeof data.detail === 'object') return data.detail;
    if (data.sasaran && typeof data.sasaran === 'object') return data.sasaran;
    if (typeof data === 'object' && !Array.isArray(data)) return data;

    return {};
  }

  function normalizeRiwayatResponse(result) {
    var data = (result && result.data) || {};

    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.list)) return data.list;
    if (Array.isArray(data.riwayat)) return data.riwayat;
    if (Array.isArray(data.records)) return data.records;

    return [];
  }

  function normalizeDetailItem(item) {
    var raw = item || {};

    return {
      id_sasaran: raw.id_sasaran || raw.id || '',
      nama_sasaran: raw.nama_sasaran || raw.nama || '',
      jenis_sasaran: raw.jenis_sasaran || '',
      status_sasaran: raw.status_sasaran || raw.status || '',
      nik_sasaran: raw.nik_sasaran || raw.nik || '',
      nomor_kk: raw.nomor_kk || raw.no_kk || '',
      jenis_kelamin: raw.jenis_kelamin || '',
      tanggal_lahir: raw.tanggal_lahir || '',
      id_tim: raw.id_tim || '',
      nama_tim: raw.nama_tim || '',
      nama_kecamatan: raw.nama_kecamatan || raw.kecamatan || '',
      nama_desa: raw.nama_desa || raw.desa_kelurahan || raw.desa || '',
      nama_dusun: raw.nama_dusun || raw.dusun_rw || raw.dusun || '',
      nama_wilayah: raw.nama_wilayah || '',
      alamat: raw.alamat || '',
      created_at: raw.created_at || '',
      created_by: raw.created_by || '',
      updated_at: raw.updated_at || '',
      updated_by: raw.updated_by || '',
      extra_fields_json: raw.extra_fields_json || raw.data_laporan || '',
      riwayat_pendampingan: Array.isArray(raw.riwayat_pendampingan) ? raw.riwayat_pendampingan : [],
      raw: raw
    };
  }

  function normalizeRiwayatItem(item) {
    var raw = item || {};

    return {
      id_pendampingan: raw.id_pendampingan || raw.id || '',
      tanggal_pendampingan: raw.tanggal_pendampingan || raw.submit_at || raw.created_at || '',
      status_kunjungan: raw.status_kunjungan || raw.status || 'Tersimpan',
      catatan_umum: raw.catatan_umum || '',
      nama_kader: raw.nama_kader || raw.id_user || '',
      nama_tim: raw.nama_tim || '',
      id_tim: raw.id_tim || '',
      revision_no: raw.revision_no || raw.revisi_ke || 1,
      is_edited: raw.is_edited === true || raw.edited === true,
      can_edit: raw.can_edit !== false,
      raw: raw
    };
  }

  function getCurrentSelected() {
    var state = getState();
    if (state && typeof state.getSelectedSasaran === 'function') {
      return state.getSelectedSasaran() || {};
    }
    return {};
  }

  function setCurrentSelected(item) {
    var state = getState();
    if (state && typeof state.setSelectedSasaran === 'function') {
      state.setSelectedSasaran(item || {});
    }
    if (state && typeof state.setSasaranDetail === 'function') {
      state.setSasaranDetail(item || {});
    }
  }

  function getCurrentList() {
    var state = getState();
    if (state && typeof state.getSasaranList === 'function') {
      return state.getSasaranList() || [];
    }
    return [];
  }

  function findFromList(idSasaran) {
    return getCurrentList().find(function (item) {
      return item && item.id_sasaran === idSasaran;
    }) || null;
  }

  var SasaranDetailView = {
    init: function () {
      this.bindEvents();
    },

    bindEvents: function () {
      var self = this;

      [
        ['btn-back-list-from-detail', function () {
          if (window.Router && typeof window.Router.go === 'function') {
            window.Router.go('sasaranList');
          }
        }],
        ['btn-go-to-pendampingan', function () {
          self.openPendampinganForSelected();
        }],
        ['btn-go-to-edit-sasaran', function () {
          self.openEditSelected();
        }]
      ].forEach(function (entry) {
        var btn = byId(entry[0]);
        if (!btn || btn.dataset.bound === '1') return;

        btn.dataset.bound = '1';
        btn.addEventListener('click', entry[1]);
      });
    },

    open: async function (idSasaran) {
      this.init();

      if (window.Router && typeof window.Router.go === 'function') {
        window.Router.go('sasaranDetail');
      }

      var targetId = String(idSasaran || '').trim();
      var fallbackItem = targetId ? findFromList(targetId) : getCurrentSelected();

      if (fallbackItem && Object.keys(fallbackItem).length) {
        setCurrentSelected(fallbackItem);
        this.renderBasic(fallbackItem);
      } else {
        this.renderBasic({});
      }

      if (!targetId) {
        targetId = (fallbackItem && fallbackItem.id_sasaran) || '';
      }

      if (!targetId) {
        showToast('ID sasaran belum tersedia.', 'warning');
        return;
      }

      await this.loadFull(targetId);
    },

    openById: async function (idSasaran) {
      return this.open(idSasaran);
    },

    loadFull: async function (idSasaran) {
      var api = getApi();
      var actions = getActions();

      if (!api || typeof api.post !== 'function') {
        showToast('Api.post belum tersedia.', 'error');
        return;
      }

      try {
        var detailResult = await api.post(actions.GET_SASARAN_DETAIL, {
          id_sasaran: idSasaran
        }, {
          includeAuth: true
        });

        if (!detailResult || detailResult.ok === false) {
          throw new Error((detailResult && detailResult.message) || 'Gagal memuat detail sasaran.');
        }

        var detail = normalizeDetailItem(normalizeDetailResponse(detailResult));

        try {
          if (actions.GET_RIWAYAT_PENDAMPINGAN_SASARAN) {
            var riwayatResult = await api.post(actions.GET_RIWAYAT_PENDAMPINGAN_SASARAN, {
              id_sasaran: idSasaran
            }, {
              includeAuth: true
            });

            if (riwayatResult && riwayatResult.ok) {
              detail.riwayat_pendampingan = normalizeRiwayatResponse(riwayatResult).map(normalizeRiwayatItem);
            }
          }
        } catch (riwayatErr) {
          console.warn('Riwayat pendampingan gagal dimuat:', riwayatErr && riwayatErr.message ? riwayatErr.message : riwayatErr);
        }

        setCurrentSelected(detail);
        this.renderFull(detail);
      } catch (err) {
        showToast((err && err.message) || 'Gagal memuat detail sasaran.', 'warning');
      }
    },

    renderBasic: function (item) {
      this.renderFull(item || {});
    },

    renderFull: function (item) {
      var ui = getUI();
      var data = normalizeDetailItem(item || {});
      var status = data.status_sasaran || '-';
      var wilayah = data.nama_wilayah || [data.nama_dusun, data.nama_desa, data.nama_kecamatan].filter(Boolean).join(' / ') || '-';

      if (!ui || typeof ui.setText !== 'function') return;

      ui.setText('detail-nama-sasaran', data.nama_sasaran || '-');
      ui.setText('detail-id-sasaran', 'ID Sasaran: ' + (data.id_sasaran || '-'));
      ui.setText('detail-jenis', data.jenis_sasaran || '-');
      ui.setText('detail-nik', data.nik_sasaran || '-');
      ui.setText('detail-kk', data.nomor_kk || '-');
      ui.setText('detail-tanggal-lahir', data.tanggal_lahir || '-');
      ui.setText('detail-wilayah', wilayah);
      ui.setText('detail-updated-at', data.updated_at || data.created_at || '-');

      var badge = byId('detail-status-badge');
      if (badge) {
        badge.textContent = status;
        badge.className = 'badge ' + this.getStatusBadgeClass(status);
      }

      this.renderExtraFields(data);
      this.renderRiwayatRingkas(data.riwayat_pendampingan || []);
    },

    renderExtraFields: function (item) {
      var ui = getUI();
      if (!ui || typeof ui.setHTML !== 'function') return;

      var extraFromJson = parseJsonSafely(item.extra_fields_json || '', {});
      var merged = Object.assign({}, item, extraFromJson);

      var excludeKeys = new Set([
        'id_sasaran',
        'nama_sasaran',
        'jenis_sasaran',
        'nik',
        'nik_sasaran',
        'nomor_kk',
        'jenis_kelamin',
        'tanggal_lahir',
        'id_tim',
        'nama_tim',
        'nama_kecamatan',
        'nama_desa',
        'nama_dusun',
        'nama_wilayah',
        'alamat',
        'status_sasaran',
        'created_at',
        'created_by',
        'updated_at',
        'updated_by',
        'extra_fields_json',
        'riwayat_pendampingan',
        'raw'
      ]);

      var fixedEntries = [
        ['id_tim', item.id_tim || '-'],
        ['nama_tim', item.nama_tim || '-'],
        ['alamat', item.alamat || '-'],
        ['jenis_kelamin', item.jenis_kelamin || '-'],
        ['created_by', item.created_by || '-']
      ];

      var dynamicEntries = Object.keys(merged)
        .filter(function (key) {
          return !excludeKeys.has(key) &&
            merged[key] !== '' &&
            merged[key] !== null &&
            merged[key] !== undefined;
        })
        .slice(0, 12)
        .map(function (key) {
          return [key, merged[key]];
        });

      var html = fixedEntries.concat(dynamicEntries).map(function (entry) {
        return [
          '<div>',
            '<span class="label">', escapeHtml(SasaranDetailView.prettyLabel(entry[0])), '</span>',
            '<strong>', escapeHtml(entry[1]), '</strong>',
          '</div>'
        ].join('');
      }).join('');

      ui.setHTML(
        'detail-extra-fields',
        html || '<div><span class="label">Informasi tambahan</span><strong>Tidak ada data tambahan.</strong></div>'
      );
    },

    renderRiwayatRingkas: function (items) {
      var ui = getUI();
      if (!ui || typeof ui.setHTML !== 'function') return;

      if (!Array.isArray(items) || !items.length) {
        ui.setHTML('detail-riwayat-ringkas', '<p class="muted-text">Belum ada riwayat pendampingan.</p>');
        return;
      }

      var html = items.slice(0, 20).map(function (item) {
        var normalized = normalizeRiwayatItem(item);
        var idPendampingan = normalized.id_pendampingan || '';
        var canEdit = normalized.can_edit !== false;
        var editedBadge = normalized.is_edited ? '<span class="badge badge-warning">EDITED</span>' : '';

        return [
          '<div class="riwayat-item">',
            '<div><span class="label">Tanggal</span><strong>', escapeHtml(normalized.tanggal_pendampingan || '-'), '</strong></div>',
            '<div><span class="label">Status</span><strong>', escapeHtml(normalized.status_kunjungan || 'Tersimpan'), '</strong></div>',
            '<div><span class="label">Catatan</span><strong>', escapeHtml(normalized.catatan_umum || '-'), '</strong></div>',
            '<div><span class="label">Kader</span><strong>', escapeHtml(normalized.nama_kader || '-'), '</strong></div>',
            '<div><span class="label">Tim</span><strong>', escapeHtml(normalized.nama_tim || normalized.id_tim || '-'), '</strong></div>',
            '<div><span class="label">Revision</span><strong>', escapeHtml(normalized.revision_no || 1), '</strong> ', editedBadge, '</div>',
            '<div class="sasaran-card-actions">',
              idPendampingan ? [
                '<button',
                ' class="btn btn-secondary btn-sm"',
                ' data-edit-pendampingan="', escapeHtml(idPendampingan), '"',
                canEdit ? '' : ' disabled',
                '>',
                'Edit Pendampingan',
                '</button>'
              ].join('') : '',
            '</div>',
          '</div>'
        ].join('');
      }).join('');

      ui.setHTML('detail-riwayat-ringkas', html);
      this.bindRiwayatActions();
    },

    bindRiwayatActions: function () {
      var self = this;

      document.querySelectorAll('[data-edit-pendampingan]').forEach(function (btn) {
        if (btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';

        btn.addEventListener('click', function () {
          var idPendampingan = btn.getAttribute('data-edit-pendampingan') || '';
          self.openEditPendampingan(idPendampingan);
        });
      });
    },

    prettyLabel: function (key) {
      var map = {
        id_tim: 'ID Tim',
        nama_tim: 'Nama Tim',
        created_by: 'Dibuat Oleh',
        jenis_kelamin: 'Jenis Kelamin'
      };

      if (map[key]) return map[key];

      return String(key)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, function (char) {
          return char.toUpperCase();
        });
    },

    getStatusBadgeClass: function (status) {
      var value = String(status || '').toUpperCase();
      if (value === 'AKTIF') return 'badge-success-soft';
      if (value === 'NONAKTIF') return 'badge-danger-soft';
      if (value === 'SELESAI') return 'badge-success';
      if (value === 'PERLU_REVIEW') return 'badge-warning';
      return 'badge-neutral';
    },

    openEditSelected: function () {
      var item = getCurrentSelected();
      if (!item || !item.id_sasaran) {
        showToast('Data sasaran belum dipilih.', 'warning');
        return;
      }

      if (window.RegistrasiView && typeof window.RegistrasiView.openEdit === 'function') {
        window.RegistrasiView.openEdit(item);
        return;
      }

      showToast('Modul edit sasaran belum siap.', 'info');
    },

    openPendampinganForSelected: function () {
      var item = getCurrentSelected();
      if (!item || !item.id_sasaran) {
        showToast('Pilih sasaran terlebih dahulu.', 'warning');
        return;
      }

      if (window.PendampinganView && typeof window.PendampinganView.openCreate === 'function') {
        window.PendampinganView.openCreate(item);
        return;
      }

      if (window.Router && typeof window.Router.go === 'function') {
        window.Router.go('pendampingan');
        return;
      }

      showToast('Modul pendampingan belum siap.', 'info');
    },

    openEditPendampingan: function (idPendampingan) {
      if (!idPendampingan) {
        showToast('ID pendampingan tidak tersedia.', 'warning');
        return;
      }

      if (window.PendampinganView && typeof window.PendampinganView.openEditById === 'function') {
        window.PendampinganView.openEditById(idPendampingan);
        return;
      }

      showToast('Modul edit pendampingan belum siap.', 'info');
    }
  };

  window.SasaranDetailView = SasaranDetailView;

  // Alias sementara agar referensi lama tidak langsung patah
  window.SasaranDetail = SasaranDetailView;

  document.addEventListener('DOMContentLoaded', function () {
    if (window.SasaranDetailView && typeof window.SasaranDetailView.init === 'function') {
      window.SasaranDetailView.init();
    }
  });
})(window, document);
