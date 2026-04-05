(function (window, document) {
  'use strict';

  function getQueue() {
    return window.AppStorage.getQueue();
  }

  function renderSummary(queue) {
    queue = queue || [];
    var total = queue.length;
    var pending = queue.filter(function (item) { return item.status === 'PENDING'; }).length;
    var failed = queue.filter(function (item) { return item.status === 'FAILED'; }).length;

    window.AppUtils.setText('sync-total-count', total, '0');
    window.AppUtils.setText('sync-pending-count', pending, '0');
    window.AppUtils.setText('sync-failed-count', failed, '0');

    var meta = document.getElementById('sync-screen-meta');
    if (meta) meta.textContent = total ? total + ' draft antrean tersedia.' : 'Belum ada data antrean.';
  }

  function applyFilter(queue) {
    var action = ((document.getElementById('sync-filter-action') || {}).value || '').trim();
    var status = ((document.getElementById('sync-filter-status') || {}).value || '').trim();
    var keyword = (((document.getElementById('sync-filter-keyword') || {}).value || '').trim()).toLowerCase();

    return (queue || []).filter(function (item) {
      var haystack = [
        item.client_submit_id,
        item.entity,
        item.status,
        item.payload && item.payload.id_sasaran,
        item.payload && item.payload.nama_sasaran
      ].join(' ').toLowerCase();

      var matchAction = !action || String(item.action || '') === action;
      var matchStatus = !status || String(item.status || '') === status;
      var matchKeyword = !keyword || haystack.indexOf(keyword) !== -1;
      return matchAction && matchStatus && matchKeyword;
    });
  }

  function renderList() {
    var queue = getQueue();
    var list = applyFilter(queue);
    var container = document.getElementById('sync-list-container');
    renderSummary(queue);

    if (!container) return;
    if (!list.length) {
      container.innerHTML = '<p class="muted-text">Belum ada draft offline.</p>';
      return;
    }

    container.innerHTML = list.map(function (item) {
      return '' +
        '<article class="queue-card">' +
          '<div class="queue-card-header">' +
            '<div>' +
              '<h4 class="sasaran-card-title">' + window.AppUtils.escapeHtml(item.entity || '-') + '</h4>' +
              '<div class="badge badge-neutral">' + window.AppUtils.escapeHtml(item.status || '-') + '</div>' +
            '</div>' +
            '<div class="badge badge-warning">' + window.AppUtils.escapeHtml(item.client_submit_id || '-') + '</div>' +
          '</div>' +
          '<div class="queue-card-meta">' +
            '<div><span class="label">Action</span><strong>' + window.AppUtils.escapeHtml(item.action || '-') + '</strong></div>' +
            '<div><span class="label">Dibuat</span><strong>' + window.AppUtils.escapeHtml(window.AppUtils.formatDateTime(item.created_at)) + '</strong></div>' +
            '<div><span class="label">Sasaran</span><strong>' + window.AppUtils.escapeHtml((item.payload && (item.payload.nama_sasaran || item.payload.id_sasaran)) || '-') + '</strong></div>' +
            '<div><span class="label">Catatan</span><strong>' + window.AppUtils.escapeHtml(item.error_message || 'Siap diproses') + '</strong></div>' +
          '</div>' +
          '<div class="queue-card-actions">' +
            '<button type="button" class="btn btn-primary btn-sm" data-sync-one="' + window.AppUtils.escapeHtml(item.client_submit_id || '') + '">Sinkronkan</button>' +
            '<button type="button" class="btn btn-secondary btn-sm" data-remove-one="' + window.AppUtils.escapeHtml(item.client_submit_id || '') + '">Hapus</button>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  async function syncOne(clientSubmitId) {
    var queue = getQueue();
    var item = queue.find(function (row) { return row.client_submit_id === clientSubmitId; });
    if (!item) return;

    try {
      if (!navigator.onLine && !(window.AppConfig && window.AppConfig.USE_MOCK_API)) {
        throw new Error('Perangkat sedang offline.');
      }

      var result = await window.Api.post(item.action, item.payload || {}, {
        clientSubmitId: item.client_submit_id,
        syncSource: 'OFFLINE_SYNC'
      });
      if (!(result && result.ok)) {
        throw new Error((result && result.message) || 'Sinkronisasi gagal.');
      }

      window.AppStorage.removeQueueItem(item.client_submit_id);
      window.AppState.patch({ syncQueue: getQueue() });
      renderList();
      if (window.UI) window.UI.showToast('1 draft berhasil disinkronkan.', 'success');
    } catch (err) {
      window.AppStorage.updateQueueItem(item.client_submit_id, {
        status: 'FAILED',
        error_message: err.message || 'Sinkronisasi gagal.'
      });
      window.AppState.patch({ syncQueue: getQueue() });
      renderList();
      if (window.UI) window.UI.showToast(err.message || 'Sinkronisasi gagal.', 'error');
    }
  }

  async function syncAllNow() {
    var queue = getQueue();
    if (!queue.length) {
      if (window.UI) window.UI.showToast('Tidak ada draft untuk disinkronkan.', 'info');
      return;
    }

    for (var i = 0; i < queue.length; i += 1) {
      await syncOne(queue[i].client_submit_id);
    }

    renderList();
  }

  function bindActions() {
    var backBtn = document.getElementById('btn-back-from-sync');
    if (backBtn && !backBtn.dataset.bound) {
      backBtn.dataset.bound = '1';
      backBtn.addEventListener('click', function () {
        window.AppRouter.goTo((window.AppConfig.SCREENS || {}).DASHBOARD || 'dashboard-screen');
      });
    }

    var syncAllBtn = document.getElementById('btn-sync-all-screen');
    if (syncAllBtn && !syncAllBtn.dataset.bound) {
      syncAllBtn.dataset.bound = '1';
      syncAllBtn.addEventListener('click', syncAllNow);
    }

    var refreshBtn = document.getElementById('btn-refresh-sync-screen');
    if (refreshBtn && !refreshBtn.dataset.bound) {
      refreshBtn.dataset.bound = '1';
      refreshBtn.addEventListener('click', renderList);
    }

    ['sync-filter-action', 'sync-filter-status', 'sync-filter-keyword'].forEach(function (id) {
      var node = document.getElementById(id);
      if (!node || node.dataset.bound) return;
      node.dataset.bound = '1';
      node.addEventListener(id === 'sync-filter-keyword' ? 'input' : 'change', window.AppUtils.debounce(renderList, 180));
    });

    var container = document.getElementById('sync-list-container');
    if (container && !container.dataset.bound) {
      container.dataset.bound = '1';
      container.addEventListener('click', async function (event) {
        var syncBtn = event.target.closest('[data-sync-one]');
        if (syncBtn) {
          await syncOne(syncBtn.getAttribute('data-sync-one'));
          return;
        }

        var removeBtn = event.target.closest('[data-remove-one]');
        if (removeBtn) {
          window.AppStorage.removeQueueItem(removeBtn.getAttribute('data-remove-one'));
          window.AppState.patch({ syncQueue: getQueue() });
          renderList();
        }
      });
    }
  }

  function init() {
    bindActions();
  }

  function onEnter() {
    renderList();
  }

  window.SyncView = {
    init: init,
    onEnter: onEnter,
    syncAllNow: syncAllNow
  };
})(window, document);
