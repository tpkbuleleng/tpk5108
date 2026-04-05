(function (window, document) {
  'use strict';

  function render(data) {
    data = data || {};
    window.AppUtils.setText('rekap-stat-sasaran-aktif', data.sasaran_aktif || data.jumlah_sasaran_aktif || 0, '0');
    window.AppUtils.setText('rekap-stat-pendampingan', data.pendampingan_periode || data.jumlah_pendampingan || 0, '0');
    window.AppUtils.setText('rekap-stat-draft', data.draft_pending || data.total_draft || 0, '0');
    window.AppUtils.setText('rekap-stat-followup', data.sasaran_ditindaklanjuti || data.total_followup || 0, '0');

    var summaryBox = document.getElementById('rekap-summary-box');
    if (summaryBox) {
      summaryBox.innerHTML = '' +
        '<div class="riwayat-item">' +
          '<strong>Periode ' + window.AppUtils.escapeHtml((data.bulan || '-') + '/' + (data.tahun || '-')) + '</strong>' +
          '<p class="muted-text">Rekap bulanan tim berhasil dimuat dari backend aktif.</p>' +
        '</div>';
    }

    var activityBox = document.getElementById('rekap-activity-list');
    if (activityBox) {
      var rows = window.AppUtils.pickFirstArray(data.aktivitas, data.activities, data.log_items);
      if (!rows.length) {
        activityBox.innerHTML = '<p class="muted-text">Belum ada aktivitas terbaru.</p>';
      } else {
        activityBox.innerHTML = rows.map(function (row) {
          return '<div class="riwayat-item"><p class="muted-text">' + window.AppUtils.escapeHtml(typeof row === 'string' ? row : JSON.stringify(row)) + '</p></div>';
        }).join('');
      }
    }
  }

  async function loadRekap() {
    var value = (document.getElementById('rekap-filter-bulan') || {}).value || window.AppUtils.formatMonthInputToday();
    var parts = value.split('-');
    var payload = { periode_tahun: parts[0] || '', periode_bulan: parts[1] || '' };
    var action = (window.AppConfig.API_ACTIONS || {}).GET_REKAP_SAYA || 'getRekapBulananTim';
    var result = await window.Api.post(action, payload);

    if (!(result && result.ok)) {
      throw new Error(window.Api.getMessage(result, 'Rekap gagal dimuat.'));
    }

    var data = window.AppUtils.pickFirstObject(
      window.Api.getData(result).rekap,
      window.Api.getData(result).summary,
      window.Api.getData(result),
      {}
    );

    window.AppState.patch({ rekapData: data });
    window.AppStorage.set((window.AppConfig.STORAGE_KEYS || {}).REKAP_CACHE, data);
    render(data);
  }

  function bindActions() {
    var backBtn = document.getElementById('btn-back-from-rekap');
    if (backBtn && !backBtn.dataset.bound) {
      backBtn.dataset.bound = '1';
      backBtn.addEventListener('click', function () {
        window.AppRouter.goTo((window.AppConfig.SCREENS || {}).DASHBOARD || 'dashboard-screen');
      });
    }

    var loadBtn = document.getElementById('btn-load-rekap');
    if (loadBtn && !loadBtn.dataset.bound) {
      loadBtn.dataset.bound = '1';
      loadBtn.addEventListener('click', async function () {
        try {
          await loadRekap();
          if (window.UI) window.UI.showToast('Rekap berhasil dimuat.', 'success');
        } catch (err) {
          if (window.UI) window.UI.showToast(err.message || 'Rekap gagal dimuat.', 'error');
        }
      });
    }

    var bulanInput = document.getElementById('rekap-filter-bulan');
    if (bulanInput && !bulanInput.value) bulanInput.value = window.AppUtils.formatMonthInputToday();
  }

  function init() {
    bindActions();
  }

  async function onEnter() {
    var cached = window.AppStorage.get((window.AppConfig.STORAGE_KEYS || {}).REKAP_CACHE, null);
    if (cached) render(cached);

    try {
      await loadRekap();
    } catch (err) {
      if (window.UI) window.UI.showToast(err.message || 'Rekap memakai data tersimpan.', 'warning');
    }
  }

  window.RekapKaderView = {
    init: init,
    onEnter: onEnter
  };
})(window, document);
