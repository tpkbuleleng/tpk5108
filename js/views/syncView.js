(function (window, document) {
  'use strict';

  var isBound = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function getRoot(root) {
    if (root && typeof root.querySelector === 'function') return root;
    return byId('module-root')
      || byId('content-root')
      || byId('view-root')
      || byId('screen-root')
      || byId('konten-app')
      || byId('screen-container')
      || byId('app-content')
      || byId('content-area')
      || document.body;
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

  function setText(root, selector, value) {
    var el = root.querySelector(selector);
    if (el) {
      el.textContent = (value === undefined || value === null || value === '') ? '-' : String(value);
    }
  }

  function setHTML(root, selector, html) {
    var el = root.querySelector(selector);
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

  function getQueueRepo() {
    return window.QueueRepo || null;
  }

  function getSyncManager() {
    return window.SyncManager || null;
  }

  function getQueue() {
    var repo = getQueueRepo();
    if (repo) {
      try {
        if (typeof repo.getAll === 'function') {
          var list = repo.getAll();
          if (Array.isArray(list)) return list;
        }
      } catch (err) {}
      try {
        if (typeof repo.list === 'function') {
          var list2 = repo.list();
          if (Array.isArray(list2)) return list2;
        }
      } catch (err2) {}
    }

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

    try {
      var raw = JSON.parse(localStorage.getItem('tpk_sync_queue_v1') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (err3) {
      return [];
    }
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

    try {
      localStorage.setItem('tpk_sync_queue_v1', JSON.stringify(safeQueue));
    } catch (err) {}
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

  function getLastSyncAt() {
    var state = getState();
    if (state && typeof state.getLastSyncAt === 'function') {
      return String(state.getLastSyncAt() || '').trim();
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.LAST_SYNC_AT) {
      return String(storage.get(keys.LAST_SYNC_AT, '') || '').trim();
    }

    return '';
  }

  function normalizeStatus(value) {
    return String(value || 'PENDING').toUpperCase();
  }

  function normalizeQueueItem(item) {
    var raw = item || {};
    return {
      id: raw.id || raw.queue_id || raw.client_submit_id || raw.id_local || '',
      action: raw.action || '',
      payload: raw.payload && typeof raw.payload === 'object' ? raw.payload : {},
      sync_status: normalizeStatus(raw.sync_status || raw.status || 'PENDING'),
      created_at: raw.created_at || raw.saved_at || '',
      last_error: raw.last_error || raw.error || '',
      retries: Number(raw.retries || raw.retry_count || 0)
    };
  }

  function getFilters(root) {
    return {
      action: (root.querySelector('[data-sync-filter-action]') && root.querySelector('[data-sync-filter-action]').value) || '',
      status: String((root.querySelector('[data-sync-filter-status]') && root.querySelector('[data-sync-filter-status]').value) || '').toUpperCase(),
      keyword: ((root.querySelector('[data-sync-filter-keyword]') && root.querySelector('[data-sync-filter-keyword]').value) || '').trim().toLowerCase()
    };
  }

  function getFilteredQueue(root) {
    var filters = getFilters(root);
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
      : (status === 'SUCCESS' ? 'badge-success-soft' : (status === 'CONFLICT' ? 'badge-warning' : 'badge-neutral'));

    return [
      '<article class="queue-card" style="padding:12px;border-radius:14px;background:#fff;border:1px solid rgba(0,0,0,.08);margin-bottom:12px;">',
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">',
          '<div>',
            '<h4 style="margin:0 0 4px;">', escapeHtml(title), '</h4>',
            '<p class="muted-text" style="margin:0;">', escapeHtml(formatActionLabel(item.action)), '</p>',
          '</div>',
          '<span class="badge ', escapeHtml(badgeClass), '">', escapeHtml(status), '</span>',
        '</div>',
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-top:12px;">',
          '<div><span class="label">ID Queue</span><strong style="display:block;">', escapeHtml(item.id || '-'), '</strong></div>',
          '<div><span class="label">Waktu Simpan</span><strong style="display:block;">', escapeHtml(item.created_at || '-'), '</strong></div>',
          '<div><span class="label">ID Sasaran</span><strong style="display:block;">', escapeHtml(payload.id_sasaran || '-'), '</strong></div>',
          '<div><span class="label">Retry</span><strong style="display:block;">', escapeHtml(String(item.retries || 0)), '</strong></div>',
        '</div>',
        item.last_error ? '<p class="muted-text" style="margin-top:10px;">Error: ' + escapeHtml(item.last_error) + '</p>' : '',
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">',
          '<button type="button" class="btn btn-secondary" data-sync-retry-id="', escapeHtml(item.id), '">Kirim Ulang</button>',
          '<button type="button" class="btn btn-danger" data-sync-delete-id="', escapeHtml(item.id), '">Hapus</button>',
        '</div>',
      '</article>'
    ].join('');
  }

  async function postQueueItem(item) {
    var manager = getSyncManager();
    if (manager && typeof manager.syncItem === 'function') {
      return manager.syncItem(item);
    }

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

  function renderSummary(root) {
    var queue = getQueue().map(normalizeQueueItem);
    var filtered = getFilteredQueue(root);

    var pendingCount = queue.filter(function (item) {
      return normalizeStatus(item.sync_status) === 'PENDING';
    }).length;
    var processingCount = queue.filter(function (item) {
      return normalizeStatus(item.sync_status) === 'PROCESSING';
    }).length;
    var failedCount = queue.filter(function (item) {
      return normalizeStatus(item.sync_status) === 'FAILED';
    }).length;
    var conflictCount = queue.filter(function (item) {
      return normalizeStatus(item.sync_status) === 'CONFLICT';
    }).length;

    setText(root, '[data-sync-total-count]', String(queue.length));
    setText(root, '[data-sync-pending-count]', String(pendingCount));
    setText(root, '[data-sync-processing-count]', String(processingCount));
    setText(root, '[data-sync-failed-count]', String(failedCount));
    setText(root, '[data-sync-conflict-count]', String(conflictCount));
    setText(root, '[data-sync-last-at]', getLastSyncAt() || '-');

    if (!queue.length) {
      setText(root, '[data-sync-meta]', 'Belum ada data antrean.');
      setHTML(root, '[data-sync-list-container]', '<p class="muted-text">Belum ada draft offline.</p>');
      return;
    }

    if (!filtered.length) {
      setText(root, '[data-sync-meta]', 'Total ' + queue.length + ' draft tersimpan lokal, tidak ada yang cocok dengan filter.');
      setHTML(root, '[data-sync-list-container]', '<p class="muted-text">Tidak ada draft yang sesuai filter.</p>');
      return;
    }

    setText(root, '[data-sync-meta]', filtered.length + ' dari ' + queue.length + ' draft ditampilkan.');
    setHTML(root, '[data-sync-list-container]', filtered.map(renderQueueItem).join(''));
  }

  function template() {
    return '' +
      '<section class="screen screen-sync" data-screen="sync" style="padding:12px;">' +
        '<div class="card" style="margin-bottom:12px;">' +
          '<div class="card-body" style="padding:16px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">' +
              '<div>' +
                '<div style="font-size:12px;opacity:.75;letter-spacing:.04em;">SINKRONISASI</div>' +
                '<h2 style="margin:6px 0 4px;">Sinkronisasi</h2>' +
                '<div class="muted-text" data-sync-meta>Menyiapkan status antrean...</div>' +
              '</div>' +
              '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                '<button type="button" class="btn btn-secondary" data-sync-refresh>Segarkan</button>' +
                '<button type="button" class="btn btn-primary" data-sync-all>Sinkronkan Sekarang</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card" style="margin-bottom:12px;">' +
          '<div class="card-body" style="padding:16px;">' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">' +
              '<div style="padding:12px;border-radius:14px;background:rgba(13,110,253,.06);"><div class="label">Total Queue</div><strong data-sync-total-count>0</strong></div>' +
              '<div style="padding:12px;border-radius:14px;background:rgba(255,193,7,.12);"><div class="label">Pending</div><strong data-sync-pending-count>0</strong></div>' +
              '<div style="padding:12px;border-radius:14px;background:rgba(13,202,240,.12);"><div class="label">Processing</div><strong data-sync-processing-count>0</strong></div>' +
              '<div style="padding:12px;border-radius:14px;background:rgba(220,53,69,.08);"><div class="label">Gagal</div><strong data-sync-failed-count>0</strong></div>' +
              '<div style="padding:12px;border-radius:14px;background:rgba(255,193,7,.18);"><div class="label">Conflict</div><strong data-sync-conflict-count>0</strong></div>' +
              '<div style="padding:12px;border-radius:14px;background:rgba(25,135,84,.08);"><div class="label">Sinkron terakhir</div><strong data-sync-last-at>-</strong></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card" style="margin-bottom:12px;">' +
          '<div class="card-body" style="padding:16px;">' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">' +
              '<div class="form-group" style="margin:0;"><label>Filter Aksi</label><select data-sync-filter-action><option value="">Semua</option><option value="registerSasaran">Registrasi Sasaran</option><option value="updateSasaran">Edit Sasaran</option><option value="submitPendampingan">Pendampingan</option><option value="editPendampingan">Edit Pendampingan</option></select></div>' +
              '<div class="form-group" style="margin:0;"><label>Filter Status</label><select data-sync-filter-status><option value="">Semua</option><option value="PENDING">Pending</option><option value="PROCESSING">Processing</option><option value="FAILED">Failed</option><option value="CONFLICT">Conflict</option></select></div>' +
              '<div class="form-group" style="margin:0;"><label>Kata Kunci</label><input type="text" data-sync-filter-keyword placeholder="Nama sasaran / ID" /></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div data-sync-list-container></div>' +
      '</section>';
  }

  var SyncView = {
    render: function (root) {
      var container = getRoot(root);
      container.innerHTML = template();
      return container;
    },

    init: function (routeName, root) {
      var container = root && typeof root.querySelector === 'function' ? root : getRoot(root);
      this.bindEvents(container);
      this.refresh(container);
      return container;
    },

    show: function (routeName, root) {
      return this.mount(root);
    },

    mount: function (root) {
      var container = this.render(root);
      this.bindEvents(container);
      this.refresh(container);
      return container;
    },

    refresh: function (root) {
      renderSummary(root || getRoot());
    },

    handleDelete: function (root, itemId) {
      var queue = getQueue().map(normalizeQueueItem).filter(function (item) {
        return item.id !== itemId;
      });
      saveQueue(queue);
      this.refresh(root);
      showToast('Draft dihapus dari antrean.', 'info');
    },

    handleRetry: async function (root, itemId) {
      var queue = getQueue().map(normalizeQueueItem);
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
        this.refresh(root);
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
        this.refresh(root);
        showToast((err && err.message) || 'Draft gagal dikirim ulang.', 'warning');
      }
    },

    handleSyncAll: async function (root) {
      var manager = getSyncManager();
      if (manager && typeof manager.syncNow === 'function') {
        try {
          await manager.syncNow();
          setLastSyncAt(new Date().toISOString());
          this.refresh(root);
          showToast('Sinkronisasi selesai dijalankan.', 'success');
          return;
        } catch (err) {
          this.refresh(root);
          showToast((err && err.message) || 'Sinkronisasi gagal.', 'warning');
          return;
        }
      }

      var queue = getQueue().map(normalizeQueueItem);
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
        } catch (err2) {
          failedCount += 1;
          remaining.push(Object.assign({}, item, {
            sync_status: 'FAILED',
            retries: Number(item.retries || 0) + 1,
            last_error: err2 && err2.message ? err2.message : String(err2)
          }));
        }
      }

      saveQueue(remaining);
      setLastSyncAt(new Date().toISOString());
      this.refresh(root);

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

    bindEvents: function (root) {
      var self = this;
      var container = getRoot(root);
      if (!container || isBound) return;
      isBound = true;

      container.addEventListener('change', function (event) {
        if (event.target.matches('[data-sync-filter-action], [data-sync-filter-status]')) {
          self.refresh(container);
        }
      });

      container.addEventListener('input', function (event) {
        if (event.target.matches('[data-sync-filter-keyword]')) {
          self.refresh(container);
        }
      });

      container.addEventListener('click', async function (event) {
        var syncAllBtn = event.target.closest('[data-sync-all]');
        if (syncAllBtn) {
          await self.handleSyncAll(container);
          return;
        }

        var refreshBtn = event.target.closest('[data-sync-refresh]');
        if (refreshBtn) {
          self.refresh(container);
          showToast('Daftar draft diperbarui.', 'info');
          return;
        }

        var retryBtn = event.target.closest('[data-sync-retry-id]');
        if (retryBtn) {
          await self.handleRetry(container, retryBtn.getAttribute('data-sync-retry-id'));
          return;
        }

        var deleteBtn = event.target.closest('[data-sync-delete-id]');
        if (deleteBtn) {
          self.handleDelete(container, deleteBtn.getAttribute('data-sync-delete-id'));
        }
      });
    }
  };

  window.SyncView = SyncView;
  window.SyncScreen = SyncView;
})(window, document);
