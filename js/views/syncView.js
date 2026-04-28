(function (window, document) {
  'use strict';

  var isBound = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function getUI() {
    return window.UI || null;
  }

  function getState() {
    return window.AppState || null;
  }

  function getStorage() {
    return window.Storage || null;
  }

  function getQueueRepo() {
    return window.QueueRepo || null;
  }

  function getSyncManager() {
    return window.SyncManager || null;
  }

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function showToast(message, type) {
    var ui = getUI();
    if (ui && typeof ui.showToast === 'function') {
      ui.showToast(message, type || 'info');
      return;
    }
    try { window.alert(message); } catch (err) {}
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
    if (el) el.innerHTML = html || '';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeStatus(value) {
    return String(value || 'PENDING').toUpperCase();
  }

  function normalizeQueueItem(item) {
    var raw = item || {};
    return {
      id: String(raw.queue_id || raw.id || raw.client_submit_id || raw.id_local || ''),
      action: String(raw.action || ''),
      payload: raw.payload && typeof raw.payload === 'object' ? raw.payload : {},
      sync_status: normalizeStatus(raw.sync_status || raw.status || 'PENDING'),
      created_at: raw.created_at || raw.saved_at || '',
      last_error: raw.last_error || raw.error || '',
      retries: Number(raw.retry_count || raw.retries || 0),
      queue_id: String(raw.queue_id || raw.id || ''),
      is_archived: !!raw.is_archived
    };
  }

  function getFilters() {
    return {
      action: (byId('sync-filter-action') && byId('sync-filter-action').value) || '',
      status: String((byId('sync-filter-status') && byId('sync-filter-status').value) || '').toUpperCase(),
      keyword: ((byId('sync-filter-keyword') && byId('sync-filter-keyword').value) || '').trim().toLowerCase()
    };
  }

  function formatActionLabel(action) {
    var map = {
      registerSasaran: 'Registrasi Sasaran',
      submitPendampingan: 'Pendampingan',
      editPendampingan: 'Edit Pendampingan',
      updateSasaran: 'Edit Sasaran'
    };
    return map[action] || action || '-';
  }

  function renderQueueItem(item) {
    var payload = item.payload || {};
    var title = payload.nama_sasaran || payload.nama || payload.id_sasaran || payload.id_pendampingan || item.id || '-';
    var status = normalizeStatus(item.sync_status || 'PENDING');
    var badgeClass = status === 'FAILED'
      ? 'badge-danger-soft'
      : (status === 'SUCCESS' ? 'badge-success-soft' : (status === 'CONFLICT' ? 'badge-warning' : 'badge-warning'));

    return [
      '<article class="queue-card">',
        '<div class="queue-card-header">',
          '<div>',
            '<h4 class="sasaran-card-title">', escapeHtml(title), '</h4>',
            '<p class="muted-text">', escapeHtml(formatActionLabel(item.action)), '</p>',
          '</div>',
          '<span class="badge ', escapeHtml(badgeClass), '">', escapeHtml(status), '</span>',
        '</div>',
        '<div class="queue-card-meta">',
          '<div><span class="label">ID Queue</span><strong>', escapeHtml(item.id || '-'), '</strong></div>',
          '<div><span class="label">Waktu Simpan</span><strong>', escapeHtml(item.created_at || '-'), '</strong></div>',
          '<div><span class="label">ID Sasaran</span><strong>', escapeHtml(payload.id_sasaran || '-'), '</strong></div>',
          '<div><span class="label">Retry</span><strong>', escapeHtml(String(item.retries || 0)), '</strong></div>',
        '</div>',
        item.last_error ? '<p class="muted-text" style="margin-top:10px;">Error: ' + escapeHtml(item.last_error) + '</p>' : '',
        '<div class="queue-card-actions">',
          '<button class="btn btn-secondary btn-sm" data-sync-retry-id="', escapeHtml(item.id), '">Kirim Ulang</button>',
          '<button class="btn btn-danger btn-sm" data-sync-delete-id="', escapeHtml(item.id), '">Hapus</button>',
        '</div>',
      '</article>'
    ].join('');
  }

  async function getLegacyQueue() {
    var state = getState();
    if (state && typeof state.getSyncQueue === 'function') {
      var fromState = state.getSyncQueue();
      if (Array.isArray(fromState)) return fromState;
    }
    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.SYNC_QUEUE) {
      var fromStorage = storage.get(keys.SYNC_QUEUE, []);
      return Array.isArray(fromStorage) ? fromStorage : [];
    }
    return [];
  }

  async function getQueue() {
    var repo = getQueueRepo();
    if (repo && typeof repo.getAll === 'function') {
      var items = await repo.getAll({ includeArchived: false });
      return (items || [])
        .map(normalizeQueueItem)
        .filter(function (item) {
          return item.sync_status !== 'SUCCESS' && item.sync_status !== 'DUPLICATE' && !item.is_archived;
        });
    }
    var legacy = await getLegacyQueue();
    return legacy.map(normalizeQueueItem);
  }

  async function getFilteredQueue() {
    var filters = getFilters();
    var queue = await getQueue();
    return queue.filter(function (item) {
      var actionMatch = !filters.action || item.action === filters.action;
      var statusMatch = !filters.status || normalizeStatus(item.sync_status) === filters.status;
      var payload = item.payload || {};
      var keywordSource = [
        item.id || '',
        payload.client_submit_id || '',
        payload.id_sasaran || '',
        payload.nama_sasaran || '',
        payload.nama || '',
        payload.id_pendampingan || '',
        item.action || ''
      ].join(' ').toLowerCase();
      var keywordMatch = !filters.keyword || keywordSource.indexOf(filters.keyword) !== -1;
      return actionMatch && statusMatch && keywordMatch;
    });
  }

  async function removeItem(itemId) {
    var repo = getQueueRepo();
    if (repo && typeof repo.remove === 'function') {
      await repo.remove(itemId);
      if (typeof repo.syncLegacyMirror === 'function') {
        await repo.syncLegacyMirror();
      }
      return true;
    }

    var queue = (await getLegacyQueue()).map(normalizeQueueItem).filter(function (item) {
      return item.id !== itemId;
    });

    var state = getState();
    if (state && typeof state.setSyncQueue === 'function') {
      state.setSyncQueue(queue);
    }
    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.set === 'function' && keys.SYNC_QUEUE) {
      storage.set(keys.SYNC_QUEUE, queue);
    }
    return true;
  }

  var SyncView = {
    init: function () {
      this.bindEvents();
      this.render();
    },

    render: async function () {
      var queue = await getQueue();
      var filtered = await getFilteredQueue();

      var pendingCount = queue.filter(function (item) {
        return item.sync_status === 'PENDING' || item.sync_status === 'PROCESSING';
      }).length;

      var failedCount = queue.filter(function (item) {
        return item.sync_status === 'FAILED' || item.sync_status === 'CONFLICT';
      }).length;

      setText('sync-total-count', String(queue.length));
      setText('sync-pending-count', String(pendingCount));
      setText('sync-failed-count', String(failedCount));
      setText('stat-draft', String(queue.length));

      if (!queue.length) {
        setText('sync-screen-meta', 'Belum ada data antrean.');
      } else if (!filtered.length) {
        setText('sync-screen-meta', 'Total ' + queue.length + ' draft tersimpan lokal, tidak ada yang cocok dengan filter.');
      } else {
        setText('sync-screen-meta', filtered.length + ' dari ' + queue.length + ' draft ditampilkan.');
      }

      if (!queue.length) {
        setHTML('sync-list-container', '<p class="muted-text">Belum ada draft offline.</p>');
        return;
      }

      if (!filtered.length) {
        setHTML('sync-list-container', '<p class="muted-text">Tidak ada draft yang sesuai filter.</p>');
        return;
      }

      setHTML('sync-list-container', filtered.map(renderQueueItem).join(''));
    },

    handleDelete: async function (itemId) {
      await removeItem(itemId);
      await this.render();
      showToast('Draft dihapus dari antrean.', 'info');
    },

    handleRetry: async function (itemId) {
      var repo = getQueueRepo();
      var manager = getSyncManager();

      if (!repo || typeof repo.getById !== 'function') {
        showToast('Queue formal belum tersedia.', 'warning');
        return;
      }

      var item = await repo.getById(itemId);
      if (!item) {
        showToast('Draft tidak ditemukan.', 'warning');
        return;
      }

      await repo.updateStatus(itemId, 'PENDING', { last_error: '' });

      if (manager && typeof manager.syncOne === 'function' && navigator.onLine !== false) {
        await manager.syncOne(item);
      }

      if (typeof repo.syncLegacyMirror === 'function') {
        await repo.syncLegacyMirror();
      }
      await this.render();
      showToast('Proses kirim ulang selesai.', 'info');
    },

    handleSyncAll: async function () {
      var manager = getSyncManager();
      if (!manager || typeof manager.syncAll !== 'function') {
        showToast('SyncManager belum tersedia.', 'warning');
        return;
      }

      var summary = await manager.syncAll();
      await this.render();
      showToast((summary && summary.message) || 'Sinkronisasi selesai.', (summary && summary.failed > 0) || (summary && summary.conflict > 0) ? 'warning' : 'success');
    },

    bindEvents: function () {
      var self = this;
      if (isBound) return;
      isBound = true;

      ['sync-filter-action', 'sync-filter-status'].forEach(function (id) {
        var el = byId(id);
        if (!el) return;
        el.addEventListener('change', function () {
          self.render();
        });
      });

      var keywordFilter = byId('sync-filter-keyword');
      if (keywordFilter) {
        keywordFilter.addEventListener('input', function () {
          self.render();
        });
      }

      var btnSyncAll = byId('btn-sync-all-screen');
      if (btnSyncAll) {
        btnSyncAll.addEventListener('click', async function () {
          await self.handleSyncAll();
        });
      }

      var btnRefresh = byId('btn-refresh-sync-screen');
      if (btnRefresh) {
        btnRefresh.addEventListener('click', function () {
          self.render();
          showToast('Daftar draft diperbarui.', 'info');
        });
      }

      var listContainer = byId('sync-list-container');
      if (listContainer) {
        listContainer.addEventListener('click', async function (event) {
          var retryBtn = event.target.closest('[data-sync-retry-id]');
          if (retryBtn) {
            var retryId = retryBtn.getAttribute('data-sync-retry-id');
            if (retryId) await self.handleRetry(retryId);
            return;
          }

          var deleteBtn = event.target.closest('[data-sync-delete-id]');
          if (deleteBtn) {
            var deleteId = deleteBtn.getAttribute('data-sync-delete-id');
            if (deleteId) await self.handleDelete(deleteId);
          }
        });
      }

      var btnBack = byId('btn-back-from-sync');
      if (btnBack) {
        btnBack.addEventListener('click', function () {
          if (window.Router && typeof window.Router.go === 'function') {
            window.Router.go('dashboard');
          }
        });
      }
    },

    refresh: function () {
      this.bindEvents();
      this.render();
    },

    open: function () {
      if (window.Router && typeof window.Router.go === 'function') {
        window.Router.go('sync');
      }
      this.refresh();
    },

    syncAll: async function () {
      await this.handleSyncAll();
    }
  };

  window.SyncView = SyncView;
  window.SyncScreen = SyncView;
})(window, document);
