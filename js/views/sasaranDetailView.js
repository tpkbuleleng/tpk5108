(function (window, document) {
  'use strict';

  function getSelected() {
    return (window.AppState && window.AppState.getState().selectedSasaran) ||
      window.AppStorage.get((window.AppConfig.STORAGE_KEYS || {}).SELECTED_SASARAN, null);
  }

  function mergeSelected(item) {
    var merged = Object.assign({}, getSelected() || {}, item || {});
    window.Auth.saveSelectedSasaran(merged);
    return merged;
  }

  function renderDetail(item) {
    item = item || {};

    window.AppUtils.setText('detail-nama-sasaran', item.nama_sasaran);
    window.AppUtils.setText('detail-id-sasaran', 'ID Sasaran: ' + (item.id_sasaran || '-'), 'ID Sasaran: -');
    window.AppUtils.setText('detail-status-badge', item.status_sasaran);
    window.AppUtils.setText('detail-jenis', item.jenis_sasaran);
    window.AppUtils.setText('detail-nik', item.nik_sasaran);
    window.AppUtils.setText('detail-kk', item.nomor_kk);
    window.AppUtils.setText('detail-tanggal-lahir', window.AppUtils.formatDate(item.tanggal_lahir));
    window.AppUtils.setText('detail-wilayah', item.wilayah || item.alamat);
    window.AppUtils.setText('detail-updated-at', window.AppUtils.formatDateTime(item.updated_at || item.tanggal_register));

    var extra = document.getElementById('detail-extra-fields');
    if (!extra) return;

    var lap = item.data_laporan || {};
    var keys = Object.keys(lap);
    if (!keys.length) {
      extra.innerHTML = '<div><span class="label">Belum ada</span><strong>-</strong></div>';
    } else {
      extra.innerHTML = keys.map(function (key) {
        return '<div><span class="label">' + window.AppUtils.escapeHtml(key.replace(/_/g, ' ')) + '</span><strong>' + window.AppUtils.escapeHtml(lap[key]) + '</strong></div>';
      }).join('');
    }
  }

  function renderRiwayat(items) {
    var box = document.getElementById('detail-riwayat-ringkas');
    if (!box) return;
    items = items || [];
    if (!items.length) {
      box.innerHTML = '<p class="muted-text">Belum ada riwayat pendampingan.</p>';
      return;
    }

    box.innerHTML = items.slice(0, 5).map(function (row) {
      return '' +
        '<div class="riwayat-item">' +
          '<strong>' + window.AppUtils.escapeHtml(window.AppUtils.formatDateTime(row.submit_at || row.created_at || row.updated_at)) + '</strong>' +
          '<p class="muted-text">' + window.AppUtils.escapeHtml((row.status_kunjungan || '-') + ' • ' + (row.catatan_umum || row.note || 'Tanpa catatan')) + '</p>' +
        '</div>';
    }).join('');
  }

  async function loadDetailAndRiwayat() {
    var selected = getSelected() || {};
    if (!selected.id_sasaran) return;

    try {
      var detailAction = (window.AppConfig.API_ACTIONS || {}).GET_SASARAN_DETAIL || 'getSasaranDetail';
      var detailResult = await window.Api.post(detailAction, { id_sasaran: selected.id_sasaran });
      if (detailResult && detailResult.ok) {
        selected = mergeSelected(window.Api.getData(detailResult));
        renderDetail(selected);
      }
    } catch (err) {
      // diamkan, tetap tampilkan selected cache
    }

    try {
      var riwayatAction = (window.AppConfig.API_ACTIONS || {}).GET_RIWAYAT_PENDAMPINGAN_SASARAN || 'getRiwayatPendampinganSasaran';
      var riwayatResult = await window.Api.post(riwayatAction, { id_sasaran: selected.id_sasaran });
      if (riwayatResult && riwayatResult.ok) {
        renderRiwayat(window.Api.getList(riwayatResult, ['items', 'rows', 'list', 'riwayat', 'records']));
      } else {
        renderRiwayat([]);
      }
    } catch (err2) {
      renderRiwayat([]);
    }
  }

  function bindActions() {
    var backBtn = document.getElementById('btn-back-list-from-detail');
    if (backBtn && !backBtn.dataset.bound) {
      backBtn.dataset.bound = '1';
      backBtn.addEventListener('click', function () {
        window.AppRouter.goTo((window.AppConfig.SCREENS || {}).SASARAN_LIST || 'sasaran-list-screen');
      });
    }

    var penBtn = document.getElementById('btn-go-to-pendampingan');
    if (penBtn && !penBtn.dataset.bound) {
      penBtn.dataset.bound = '1';
      penBtn.addEventListener('click', function () {
        window.AppRouter.goTo((window.AppConfig.SCREENS || {}).PENDAMPINGAN || 'pendampingan-screen');
      });
    }

    var editBtn = document.getElementById('btn-go-to-edit-sasaran');
    if (editBtn && !editBtn.dataset.bound) {
      editBtn.dataset.bound = '1';
      editBtn.addEventListener('click', function () {
        var badge = document.getElementById('registrasi-mode-badge');
        var info = document.getElementById('registrasi-mode-info');
        if (badge) badge.textContent = 'EDIT';
        if (info) info.textContent = 'Mode edit dari detail sasaran';
        window.AppRouter.goTo((window.AppConfig.SCREENS || {}).REGISTRASI || 'registrasi-screen', { mode: 'edit' });
      });
    }
  }

  function init() {
    bindActions();
  }

  async function onEnter() {
    renderDetail(getSelected() || {});
    renderRiwayat([]);
    await loadDetailAndRiwayat();
  }

  window.SasaranDetailView = {
    init: init,
    onEnter: onEnter
  };
})(window, document);
