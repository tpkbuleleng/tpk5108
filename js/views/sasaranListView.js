(function (window, document) {
  'use strict';

  function getCacheKeys() {
    return (window.AppConfig && window.AppConfig.STORAGE_KEYS) || {};
  }

  function getCachedList() {
    return window.AppStorage.get(getCacheKeys().SASARAN_CACHE, []);
  }

  function normalizeItem(item) {
    item = item || {};
    return Object.assign({}, item, {
      id_sasaran: item.id_sasaran || item.id || '',
      nama_sasaran: item.nama_sasaran || item.nama || '',
      status_sasaran: item.status_sasaran || item.status || '',
      jenis_sasaran: item.jenis_sasaran || item.jenis || '',
      wilayah: item.wilayah || item.nama_wilayah_lengkap || item.alamat || '',
      updated_at: item.updated_at || item.tanggal_register || item.submit_at || ''
    });
  }

  function getFilters() {
    return {
      keyword: ((document.getElementById('filter-keyword-sasaran') || {}).value || '').trim().toLowerCase(),
      jenis: ((document.getElementById('filter-jenis-sasaran') || {}).value || '').trim().toUpperCase(),
      status: ((document.getElementById('filter-status-sasaran') || {}).value || '').trim().toUpperCase()
    };
  }

  function filterItems(items) {
    var filters = getFilters();
    return (items || []).filter(function (rawItem) {
      var item = normalizeItem(rawItem);
      var nameId = ((item.nama_sasaran || '') + ' ' + (item.id_sasaran || '')).toLowerCase();
      var matchKeyword = !filters.keyword || nameId.indexOf(filters.keyword) !== -1;
      var matchJenis = !filters.jenis || String(item.jenis_sasaran || '').toUpperCase() === filters.jenis;
      var matchStatus = !filters.status || String(item.status_sasaran || '').toUpperCase() === filters.status;
      return matchKeyword && matchJenis && matchStatus;
    }).map(normalizeItem);
  }

  function renderList(items) {
    var container = document.getElementById('sasaran-list-container');
    var meta = document.getElementById('sasaran-list-meta');
    if (!container) return;

    var filtered = filterItems(items || []);
    if (meta) meta.textContent = filtered.length + ' sasaran ditampilkan.';

    if (!filtered.length) {
      container.innerHTML = '<p class="muted-text">Belum ada data sasaran yang cocok.</p>';
      return;
    }

    container.innerHTML = filtered.map(function (item) {
      return '' +
        '<article class="sasaran-card" data-sasaran-id="' + window.AppUtils.escapeHtml(item.id_sasaran || '') + '">' +
          '<div class="sasaran-card-header">' +
            '<div>' +
              '<h4 class="sasaran-card-title">' + window.AppUtils.escapeHtml(item.nama_sasaran || '-') + '</h4>' +
              '<div class="badge badge-neutral">' + window.AppUtils.escapeHtml(item.jenis_sasaran || '-') + '</div>' +
            '</div>' +
            '<div class="badge badge-warning">' + window.AppUtils.escapeHtml(item.status_sasaran || '-') + '</div>' +
          '</div>' +
          '<div class="sasaran-card-meta">' +
            '<div><span class="label">ID Sasaran</span><strong>' + window.AppUtils.escapeHtml(item.id_sasaran || '-') + '</strong></div>' +
            '<div><span class="label">Wilayah</span><strong>' + window.AppUtils.escapeHtml(item.wilayah || item.alamat || '-') + '</strong></div>' +
            '<div><span class="label">Tanggal Lahir</span><strong>' + window.AppUtils.escapeHtml(window.AppUtils.formatDate(item.tanggal_lahir)) + '</strong></div>' +
            '<div><span class="label">Terakhir Update</span><strong>' + window.AppUtils.escapeHtml(window.AppUtils.formatDateTime(item.updated_at || item.tanggal_register)) + '</strong></div>' +
          '</div>' +
          '<div class="sasaran-card-actions">' +
            '<button type="button" class="btn btn-primary btn-sm" data-open-detail="' + window.AppUtils.escapeHtml(item.id_sasaran || '') + '">Lihat Detail</button>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  async function loadData() {
    var action = (window.AppConfig.API_ACTIONS || {}).GET_SASARAN_BY_TIM || 'getSasaranByTim';
    var result = await window.Api.post(action, {});
    if (!(result && result.ok)) {
      throw new Error(window.Api.getMessage(result, 'Data sasaran gagal dimuat.'));
    }

    var items = window.Api.getList(result, ['items', 'rows', 'sasaran', 'list', 'records']).map(normalizeItem);
    window.AppStorage.set(getCacheKeys().SASARAN_CACHE, items);
    window.AppState.patch({ sasaranList: items });
    renderList(items);
    return items;
  }

  function bindActions() {
    var backBtn = document.getElementById('btn-back-dashboard-from-list');
    if (backBtn && !backBtn.dataset.bound) {
      backBtn.dataset.bound = '1';
      backBtn.addEventListener('click', function () {
        window.AppRouter.goTo((window.AppConfig.SCREENS || {}).DASHBOARD || 'dashboard-screen');
      });
    }

    var refreshBtn = document.getElementById('btn-refresh-sasaran');
    if (refreshBtn && !refreshBtn.dataset.bound) {
      refreshBtn.dataset.bound = '1';
      refreshBtn.addEventListener('click', async function () {
        try {
          await loadData();
          if (window.UI) window.UI.showToast('Data sasaran berhasil dimuat.', 'success');
        } catch (err) {
          if (window.UI) window.UI.showToast(err.message || 'Data sasaran gagal dimuat.', 'error');
        }
      });
    }

    ['filter-keyword-sasaran', 'filter-jenis-sasaran', 'filter-status-sasaran'].forEach(function (id) {
      var node = document.getElementById(id);
      if (!node || node.dataset.bound) return;
      node.dataset.bound = '1';
      node.addEventListener(id === 'filter-keyword-sasaran' ? 'input' : 'change', window.AppUtils.debounce(function () {
        renderList(window.AppStorage.get(getCacheKeys().SASARAN_CACHE, []));
      }, 150));
    });

    var container = document.getElementById('sasaran-list-container');
    if (container && !container.dataset.bound) {
      container.dataset.bound = '1';
      container.addEventListener('click', function (event) {
        var button = event.target.closest('[data-open-detail]');
        if (!button) return;
        var id = button.getAttribute('data-open-detail');
        var items = window.AppStorage.get(getCacheKeys().SASARAN_CACHE, []);
        var found = items.find(function (item) { return String(item.id_sasaran) === String(id); }) || null;
        window.Auth.saveSelectedSasaran(found);
        window.AppRouter.goTo((window.AppConfig.SCREENS || {}).SASARAN_DETAIL || 'sasaran-detail-screen');
      });
    }
  }

  function init() {
    bindActions();
  }

  async function onEnter() {
    var cached = getCachedList();
    if (cached.length) renderList(cached);
    try {
      await loadData();
    } catch (err) {
      if (window.UI) window.UI.showToast(err.message || 'Data sasaran memakai cache terakhir.', 'warning');
    }
  }

  window.SasaranListView = {
    init: init,
    onEnter: onEnter,
    loadData: loadData
  };
})(window, document);
