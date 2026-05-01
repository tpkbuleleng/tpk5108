(function (window, document) {
  'use strict';

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(message, type) {
    if (window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(message, type || 'info');
      return;
    }
    if (window.Notifier && typeof window.Notifier.show === 'function') {
      window.Notifier.show(message, type || 'info');
      return;
    }
    try { window.alert(message); } catch (err) {}
  }

  function scriptVersion() {
    var cfg = window.APP_CONFIG || {};
    return encodeURIComponent(cfg.APP_VERSION || cfg.VERSION || '3E-R1');
  }

  function loadScriptOnce(src, globalName) {
    if (globalName && window[globalName]) return Promise.resolve(true);
    var normalized = String(src || '');
    var exists = Array.prototype.slice.call(document.scripts || []).some(function (s) {
      return s.src && s.src.indexOf(normalized.replace(/^\.\//, '')) >= 0;
    });
    if (exists) {
      return new Promise(function (resolve) { window.setTimeout(function () { resolve(true); }, 50); });
    }
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = normalized + (normalized.indexOf('?') >= 0 ? '&' : '?') + 'v=' + scriptVersion();
      s.async = false;
      s.onload = function () { resolve(true); };
      s.onerror = function () { reject(new Error('Gagal memuat ' + src)); };
      document.head.appendChild(s);
    });
  }

  async function ensureQueueEngine() {
    if (!window.TPKDb && !window.DB) await loadScriptOnce('./js/db.js', 'TPKDb');
    if (!window.QueueRepo) await loadScriptOnce('./js/queueRepo.js', 'QueueRepo');
    if (!window.SyncManager) await loadScriptOnce('./js/syncManager.js', 'SyncManager');
    if (window.SyncManager && typeof window.SyncManager.init === 'function') window.SyncManager.init();
    return !!window.QueueRepo;
  }

  function getRepo() { return window.QueueRepo || null; }
  function getManager() { return window.SyncManager || null; }

  function getFilters() {
    return {
      action: byId('sync-filter-action') ? byId('sync-filter-action').value : '',
      status: byId('sync-filter-status') ? byId('sync-filter-status').value : '',
      keyword: byId('sync-filter-keyword') ? byId('sync-filter-keyword').value : ''
    };
  }

  function normalizeStatus(value) {
    return String(value || 'PENDING').trim().toUpperCase() || 'PENDING';
  }

  function unwrapDraftPayload(item) {
    if (!item) return {};
    if (item.payload && item.payload.data) return item.payload.data || {};
    if (item.payload) return item.payload || {};
    if (item.data) return item.data || {};
    return item || {};
  }

  function extractTitle(item) {
    var payload = item && item.payload || {};
    var answers = payload.answers || payload.data || {};
    return answers.nama_sasaran || payload.nama_sasaran || item.entity_id_ref || item.client_submit_id || item.id || '-';
  }

  function extractSubTitle(item) {
    var payload = item && item.payload || {};
    return [
      item.action || '',
      payload.jenis_sasaran || '',
      item.client_submit_id || ''
    ].filter(Boolean).join(' | ');
  }

  function renderQueueItem(item) {
    var status = normalizeStatus(item.sync_status || item.status);
    var id = item.id || item.client_submit_id || '';
    var error = item.last_error || '';
    var canRetry = status === 'FAILED' || status === 'PENDING' || status === 'CONFLICT';

    return [
      '<article class="list-item sync-queue-item" data-queue-id="', escapeHtml(id), '">',
        '<div class="list-item-main">',
          '<div class="row-between">',
            '<strong>', escapeHtml(extractTitle(item)), '</strong>',
            '<span class="badge ', status === 'FAILED' || status === 'CONFLICT' ? 'badge-danger-soft' : 'badge-neutral', '">', escapeHtml(status), '</span>',
          '</div>',
          '<p class="muted-text">', escapeHtml(extractSubTitle(item)), '</p>',
          error ? '<p class="text-danger">' + escapeHtml(error) + '</p>' : '',
          '<p class="muted-text">Dibuat: ', escapeHtml(item.created_at || '-'), ' | Retry: ', escapeHtml(item.retry_count || 0), '</p>',
        '</div>',
        '<div class="list-item-actions">',
          canRetry ? '<button type="button" class="btn btn-primary btn-sm" data-sync-one="' + escapeHtml(id) + '">Sinkronkan</button>' : '',
          '<button type="button" class="btn btn-secondary btn-sm" data-remove-one="' + escapeHtml(id) + '">Hapus</button>',
        '</div>',
      '</article>'
    ].join('');
  }

  function renderDraftItem(item) {
    var draftKey = item.draft_key || '';
    var data = unwrapDraftPayload(item);
    var answers = data.answers || data || {};
    var title = answers.nama_sasaran || data.nama_sasaran || item.draft_type || 'Draft';
    var sub = [item.draft_type || 'DRAFT', answers.jenis_sasaran || data.jenis_sasaran || '', item.updated_at || ''].filter(Boolean).join(' | ');
    return [
      '<article class="list-item sync-queue-item" data-draft-key="', escapeHtml(draftKey), '">',
        '<div class="list-item-main">',
          '<div class="row-between">',
            '<strong>', escapeHtml(title), '</strong>',
            '<span class="badge badge-neutral">DRAFT</span>',
          '</div>',
          '<p class="muted-text">', escapeHtml(sub), '</p>',
          '<p class="muted-text">Draft tersimpan lokal. Buka menu terkait untuk melanjutkan pengisian.</p>',
        '</div>',
        '<div class="list-item-actions">',
          '<button type="button" class="btn btn-secondary btn-sm" data-remove-draft="' + escapeHtml(draftKey) + '">Hapus Draft</button>',
        '</div>',
      '</article>'
    ].join('');
  }

  async function renderSummary() {
    await ensureQueueEngine();
    var manager = getManager();
    var repo = getRepo();
    var summary = { total: 0, pending: 0, failed: 0, drafts: 0, dashboard_pending: 0 };

    if (manager && typeof manager.updateBadge === 'function') {
      summary = await manager.updateBadge();
    } else if (repo && typeof repo.getSummary === 'function') {
      summary = await repo.getSummary();
    }

    var dashboardPending = Number(summary.dashboard_pending || 0);
    if (!dashboardPending) dashboardPending = Number(summary.pending || 0) + Number(summary.failed || 0) + Number(summary.conflict || 0) + Number(summary.drafts || 0);

    var totalEl = byId('sync-total-count');
    var pendingEl = byId('sync-pending-count');
    var failedEl = byId('sync-failed-count');
    var draftEl = byId('stat-draft');

    if (totalEl) totalEl.textContent = summary.total || 0;
    if (pendingEl) pendingEl.textContent = summary.pending || 0;
    if (failedEl) failedEl.textContent = summary.failed || 0;
    if (draftEl) draftEl.textContent = dashboardPending;

    var meta = byId('sync-screen-meta');
    if (meta) {
      meta.textContent = (summary.total || summary.drafts)
        ? 'Antrean: ' + (summary.total || 0) + ' | Draft: ' + (summary.drafts || 0) + ' | Pending: ' + (summary.pending || 0) + ' | Gagal: ' + (summary.failed || 0)
        : 'Belum ada data antrean.';
    }
    return summary;
  }

  async function refresh() {
    await ensureQueueEngine();
    var repo = getRepo();
    var box = byId('sync-list-container');
    if (!box) return;

    await renderSummary();

    if (!repo || typeof repo.list !== 'function') {
      box.innerHTML = '<p class="muted-text">Queue engine belum siap.</p>';
      return;
    }

    var rows = await repo.list(getFilters());
    var drafts = repo.listDrafts ? await repo.listDrafts() : [];
    var html = [];
    if (rows.length) html.push(rows.map(renderQueueItem).join(''));
    if (drafts.length) html.push(drafts.map(renderDraftItem).join(''));

    if (!html.length) {
      box.innerHTML = '<p class="muted-text">Belum ada draft offline.</p>';
      return;
    }

    box.innerHTML = html.join('');
  }

  async function syncAll() {
    await ensureQueueEngine();
    var manager = getManager();
    if (!manager || typeof manager.syncAll !== 'function') {
      showToast('SyncManager belum siap.', 'warning');
      return;
    }
    await manager.syncAll({ force: true });
    await refresh();
  }

  async function retryOne(id) {
    await ensureQueueEngine();
    var manager = getManager();
    if (!manager || typeof manager.retryOne !== 'function') {
      showToast('SyncManager belum siap.', 'warning');
      return;
    }
    await manager.retryOne(id);
    await refresh();
  }

  async function removeOne(id) {
    await ensureQueueEngine();
    var repo = getRepo();
    if (!repo || typeof repo.removeById !== 'function') return;
    if (!window.confirm('Hapus antrean ini dari data lokal?')) return;
    await repo.removeById(id);
    await refresh();
  }

  async function removeDraft(draftKey) {
    await ensureQueueEngine();
    var repo = getRepo();
    if (!repo || typeof repo.clearDraft !== 'function') return;
    if (!window.confirm('Hapus draft lokal ini?')) return;
    await repo.clearDraft(draftKey);
    await refresh();
  }

  function bindEvents() {
    if (window.__syncViewBound) return;
    window.__syncViewBound = true;

    var back = byId('btn-back-from-sync');
    if (back) {
      back.addEventListener('click', function () {
        if (window.Router && typeof window.Router.go === 'function') window.Router.go('dashboard');
      });
    }

    var syncAllBtn = byId('btn-sync-all-screen');
    if (syncAllBtn) syncAllBtn.addEventListener('click', syncAll);

    var refreshBtn = byId('btn-refresh-sync-screen');
    if (refreshBtn) refreshBtn.addEventListener('click', refresh);

    ['sync-filter-action', 'sync-filter-status', 'sync-filter-keyword'].forEach(function (id) {
      var el = byId(id);
      if (!el) return;
      el.addEventListener(id === 'sync-filter-keyword' ? 'input' : 'change', function () {
        refresh();
      });
    });

    var container = byId('sync-list-container');
    if (container) {
      container.addEventListener('click', function (event) {
        var syncBtn = event.target && event.target.closest ? event.target.closest('[data-sync-one]') : null;
        var removeBtn = event.target && event.target.closest ? event.target.closest('[data-remove-one]') : null;
        var removeDraftBtn = event.target && event.target.closest ? event.target.closest('[data-remove-draft]') : null;
        if (syncBtn) retryOne(syncBtn.getAttribute('data-sync-one'));
        if (removeBtn) removeOne(removeBtn.getAttribute('data-remove-one'));
        if (removeDraftBtn) removeDraft(removeDraftBtn.getAttribute('data-remove-draft'));
      });
    }

    window.addEventListener('tpk:queue-changed', refresh);
  }

  function init() {
    bindEvents();
    refresh();
  }

  var SyncView = {
    init: init,
    refresh: refresh,
    renderSummary: renderSummary,
    syncAll: syncAll,
    retryOne: retryOne,
    ensureQueueEngine: ensureQueueEngine
  };

  window.SyncView = SyncView;
})(window, document);
