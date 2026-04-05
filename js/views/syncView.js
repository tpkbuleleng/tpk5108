(function (window, document) {
  'use strict';

  var isBound = false;

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

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
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

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getQueue() {
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

  function saveQueue(queue) {
    var safeQueue = Array.isArray(queue) ? queue : [];

    var state = getState();
    if (state && typeof state.setSyncQueue === 'function') {
      state.setSyncQueue(safeQueue);
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.set === 'function' && keys.SYNC_QUEUE) {
      storage.set(keys.SYNC_QUEUE, safeQueue);
    }
  }

  function setLastSyncAt(timestamp) {
    var value = String(timestamp || '');

    var state = getState();
    if (state && typeof state.setLastSyncAt === 'function') {
      state.setLastSyncAt(value);
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.set === 'function' && keys.LAST_SYNC_AT) {
      storage.set(keys.LAST_SYNC_AT, value);
    }
  }

  function normalizeStatus(value) {
    return String(value || 'PENDING').toUpperCase();
  }

  function normalizeQueueItem(item) {
    var raw = item || {};
    return {
      id: raw.id || raw.client_submit_id || raw.id_local || '',
      action: raw.action || '',
      payload: raw.payload && typeof raw.payload === 'object' ? raw.payload : {},
      sync_status: normalizeStatus(raw.sync_status || raw.status || 'PENDING'),
      created_at: raw.created_at || raw.saved_at || '',
      last_error: raw.last_error || raw.error || '',
      retries: Number(raw.retries || 0)
    };
  }

  function getFilters() {
    return {
      action: (byId('sync-filter-action') && byId('sync-filter-action').value) || '',
      status: String((byId('sync-filter-status') && byId('sync-filter-status').value) || '').toUpperCase(),
      keyword: ((byId('sync-filter-keyword') && byId('sync-filter-keyword').value) || '').trim().toLowerCase()
    };
  }

  function getFilteredQueue() {
    var filters = getFilters();
    var queue = getQueue().map(normalizeQueueItem);

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
      : (status === 'SUCCESS' ? 'badge-success-soft' : 'badge-warning');

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

        item.last_error
          ? '<p class="muted-text" style="margin-top:10px;">Error: ' + escapeHtml(item.last_error) + '</p>'
          : '',

        '<div class="queue-card-actions">',
          '<button class="btn btn-secondary btn-sm" data-sync-retry-id="', escapeHtml(item.id), '">Kirim Ulang</button>',
          '<button class="btn btn-danger btn-sm" data-sync-delete-id="', escapeHtml(item.id), '">Hapus</button>',
        '</div>',
      '</article>'
    ].join('');
  }

  async function postQueueItem(item) {
    var api = getApi();
    if (!api || typeof api.post !== 'function') {
      throw new Error('Api.post belum tersedia.');
    }

    if (!item || !item.action) {
      throw new Error('Item antrean tidak valid.');
    }

    var payload = Object.assign({}, item.payload || {});

    return api.post(item.action, payload, {
      includeAuth: true,
      clientSubmitId: payload.client_submit_id || '',
      syncSource: payload.sync_source || 'OFFLINE'
    });
  }

  var SyncView = {
    init: function () {
      this.bindEvents();
      this.render();
    },

    getFilters: getFilters,

    getQueue: function () {
      return getQueue().map(normalizeQueueItem);
    },

    getFilteredQueue: function () {
      return getFilteredQueue();
    },

    render: function () {
      var queue = this.getQueue();
      var filtered = this.getFilteredQueue();

      var pendingCount = queue.filter(function (item) {
        return normalizeStatus(item.sync_status) === 'PENDING';
      }).length;

      var failedCount = queue.filter(function (item) {
        return normalizeStatus(item.sync_status) === 'FAILED';
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

    handleDelete: function (itemId) {
      var queue = this.getQueue().filter(function (item) {
        return item.id !== itemId;
      });

      saveQueue(queue);
      this.render();
      showToast('Draft dihapus dari antrean.', 'info');
    },

    handleRetry: async function (itemId) {
      var queue = this.getQueue();
      var target = queue.find(function (item) {
        return item.id === itemId;
      });

      if (!target) {
        showToast('Draft tidak ditemukan.', 'warning');
        return;
      }

      try {
        var result = await postQueueItem(target);

        if (!result || result.ok === false) {
          throw new Error((result && result.message) || 'Draft gagal dikirim ulang.');
        }

        var nextQueue = queue.filter(function (item) {
          return item.id !== itemId;
        });

        saveQueue(nextQueue);
        setLastSyncAt(new Date().toISOString());
        this.render();
        showToast('Draft berhasil disinkronkan.', 'success');
      } catch (err) {
        var updatedQueue = queue.map(function (item) {
          if (item.id !== itemId) return item;

          return Object.assign({}, item, {
            sync_status: 'FAILED',
            retries: Number(item.retries || 0) + 1,
            last_error: err && err.message ? err.message : String(err)
          });
        });

        saveQueue(updatedQueue);
        this.render();
        showToast((err && err.message) || 'Draft gagal dikirim ulang.', 'warning');
      }
    },

    handleSyncAll: async function () {
      var queue = this.getQueue();
      if (!queue.length) {
        showToast('Belum ada antrean untuk disinkronkan.', 'info');
        return;
      }

      var remaining = [];
      var successCount = 0;
      var failedCount = 0;

      for (var i = 0; i < queue.length; i += 1) {
        var item = queue[i];

        try {
          var result = await postQueueItem(item);

          if (!result || result.ok === false) {
            throw new Error((result && result.message) || 'Sinkronisasi item gagal.');
          }

          successCount += 1;
        } catch (err) {
          failedCount += 1;

          remaining.push(Object.assign({}, item, {
            sync_status: 'FAILED',
            retries: Number(item.retries || 0) + 1,
            last_error: err && err.message ? err.message : String(err)
          }));
        }
      }

      saveQueue(remaining);
      setLastSyncAt(new Date().toISOString());
      this.render();

      if (successCount && !failedCount) {
        showToast('Semua draft berhasil disinkronkan.', 'success');
        return;
      }

      if (successCount && failedCount) {
        showToast(successCount + ' draft berhasil, ' + failedCount + ' draft gagal.', 'warning');
        return;
      }

      showToast('Semua draft gagal disinkronkan.', 'warning');
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
            if (retryId) {
              await self.handleRetry(retryId);
            }
            return;
          }

          var deleteBtn = event.target.closest('[data-sync-delete-id]');
          if (deleteBtn) {
            var deleteId = deleteBtn.getAttribute('data-sync-delete-id');
            if (deleteId) {
              self.handleDelete(deleteId);
            }
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

  // Alias sementara agar referensi lama tidak langsung patah
  window.SyncScreen = SyncView;

  document.addEventListener('DOMContentLoaded', function () {
    if (window.SyncView && typeof window.SyncView.init === 'function') {
      window.SyncView.init();
    }
  });
})(window, document);
