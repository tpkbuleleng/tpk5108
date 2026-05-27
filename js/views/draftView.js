(function (window, document) {
  'use strict';

  var VERSION = 'READ-MODEL-BINDING-R1-R3-R4-R1-DRAFT-BACK-BUTTON-20260527';
  var REG_DRAFT_KEY = 'tpk_registrasi_draft_v_final';
  var PEN_DRAFT_KEY = 'tpk_pendampingan_draft_v_final';
  var currentRoot = null;
  var lastRows = { queue: [], drafts: [] };

  function isFunction(fn) { return typeof fn === 'function'; }
  function s(value) { return String(value == null ? '' : value).trim(); }
  function up(value) { return s(value).toUpperCase(); }
  function nowIso() { return new Date().toISOString(); }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeJsonParse(value, fallback) {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch (err) { return fallback; }
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (err) { return value; }
  }

  function notify(message, type) {
    try {
      if (window.Notifier && isFunction(window.Notifier.show)) {
        window.Notifier.show(message, type || 'info');
        return;
      }
      if (window.UI && isFunction(window.UI.showToast)) {
        window.UI.showToast(message, type || 'info');
        return;
      }
    } catch (err) {}
    try { window.alert(message); } catch (err2) {}
  }

  function getRepo() { return window.QueueRepo || null; }
  function getSyncManager() { return window.SyncManager || null; }


  function reportClientEvent(eventName, detail) {
    try {
      if (!window.Api || typeof window.Api.reportClientPerformance !== 'function') return;
      if (window.navigator && window.navigator.onLine === false) return;
      window.Api.reportClientPerformance(eventName, Object.assign({
        modul: 'draftView.js',
        view: 'Draft Offline & Sinkronisasi',
        source_layer: 'CLIENT',
        event_type: 'CLIENT_PERFORMANCE',
        performance_group: 'DRAFT_WORKFLOW',
        observability_only: true,
        exclude_from_frontend_health: true,
        draft_view_version: VERSION
      }, detail || {})).catch(function () {});
    } catch (err) {}
  }

  function normalizeStatus(value) {
    var repo = getRepo();
    if (repo && isFunction(repo.normalizeStatus)) return repo.normalizeStatus(value);
    return up(value || 'PENDING') || 'PENDING';
  }

  function unwrapDraftPayload(row) {
    if (!row) return {};
    var payload = row.payload || row.data || row;
    if (payload && payload.payload) payload = payload.payload;
    return payload && typeof payload === 'object' ? payload : {};
  }

  function unwrapDraftData(row) {
    var payload = unwrapDraftPayload(row);
    if (payload && payload.data && typeof payload.data === 'object') return payload.data;
    return payload;
  }

  function getDraftAnswers(row) {
    var data = unwrapDraftData(row);
    return (data && data.answers && typeof data.answers === 'object') ? data.answers : {};
  }

  function getQueuePayload(row) {
    return (row && row.payload && typeof row.payload === 'object') ? row.payload : {};
  }

  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i += 1) {
      var v = arguments[i];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return '';
  }

  function summarizeDraft(row) {
    var data = unwrapDraftData(row);
    var answers = getDraftAnswers(row);
    var jenis = firstNonEmpty(answers.jenis_sasaran, data.jenis_sasaran, row.draft_type);
    var nama = firstNonEmpty(answers.nama_sasaran, data.nama_sasaran, data.nama, '');
    var clientSubmitId = firstNonEmpty(data.client_submit_id, answers.client_submit_id, row.client_submit_id, '');
    var savedAt = firstNonEmpty(row.updated_at, row.created_at, row.saved_at, unwrapDraftPayload(row).saved_at, data.updated_at, '');
    return {
      title: nama ? up(nama) : up(row.draft_type || 'DRAFT'),
      subtitle: [up(row.draft_type || 'DRAFT'), up(jenis), savedAt].filter(Boolean).join(' | '),
      client_submit_id: clientSubmitId,
      jenis_sasaran: up(jenis),
      saved_at: savedAt,
      draft_key: row.draft_key || REG_DRAFT_KEY,
      raw: row
    };
  }

  function summarizeQueue(row) {
    var payload = getQueuePayload(row);
    var answers = (payload.answers && typeof payload.answers === 'object') ? payload.answers : {};
    var jenis = firstNonEmpty(payload.jenis_sasaran, answers.jenis_sasaran, row.entity_type, '');
    var nama = firstNonEmpty(answers.nama_sasaran, payload.nama_sasaran, row.entity_id_ref, '');
    var status = normalizeStatus(row.sync_status || row.status);
    return {
      id: row.id || row.queue_id || row.client_submit_id || '',
      title: nama ? up(nama) : up(row.action || 'ANTREAN'),
      subtitle: [up(row.action || ''), up(jenis), row.created_at || ''].filter(Boolean).join(' | '),
      status: status,
      last_error: row.last_error || '',
      raw: row
    };
  }

  async function loadRows(filter) {
    var repo = getRepo();
    var queueRows = [];
    var draftRows = [];

    if (repo && isFunction(repo.list)) {
      queueRows = await repo.list(filter || {});
    }

    if (repo && isFunction(repo.listDrafts)) {
      draftRows = await repo.listDrafts({});
    } else {
      var localReg = safeJsonParse(window.localStorage.getItem(REG_DRAFT_KEY), null);
      var localPen = safeJsonParse(window.localStorage.getItem(PEN_DRAFT_KEY), null);
      if (localReg) draftRows.push({ draft_key: REG_DRAFT_KEY, draft_type: 'REGISTRASI', payload: localReg, meta: { source: 'localStorage' } });
      if (localPen) draftRows.push({ draft_key: PEN_DRAFT_KEY, draft_type: 'PENDAMPINGAN', payload: localPen, meta: { source: 'localStorage' } });
    }

    lastRows = { queue: queueRows || [], drafts: draftRows || [] };
    return lastRows;
  }

  function countSummary(rows) {
    rows = rows || lastRows;
    var queue = rows.queue || [];
    var drafts = rows.drafts || [];
    var summary = {
      total: queue.length + drafts.length,
      queue_total: queue.length,
      drafts: drafts.length,
      pending: 0,
      failed: 0,
      conflict: 0,
      processing: 0,
      success: 0
    };

    queue.forEach(function (row) {
      var status = normalizeStatus(row.sync_status || row.status);
      if (status === 'PENDING') summary.pending += 1;
      else if (status === 'FAILED') summary.failed += 1;
      else if (status === 'CONFLICT') summary.conflict += 1;
      else if (status === 'PROCESSING') summary.processing += 1;
      else if (status === 'SUCCESS') summary.success += 1;
    });

    return summary;
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value == null || value === '' ? '0' : String(value);
  }

  function updateExternalBadges(summary) {
    setText('stat-draft', Number(summary.drafts || 0) + Number(summary.pending || 0) + Number(summary.failed || 0) + Number(summary.conflict || 0));
    setText('sync-total-count', summary.queue_total || 0);
    setText('sync-pending-count', summary.pending || 0);
    setText('sync-failed-count', summary.failed || 0);

    var meta = document.getElementById('sync-screen-meta');
    if (meta) {
      meta.textContent = summary.total
        ? 'Antrean: ' + summary.queue_total + ' | Draft: ' + summary.drafts + ' | Pending: ' + summary.pending + ' | Gagal: ' + summary.failed
        : 'Tidak ada draft offline.';
    }
  }

  function optionHtml(value, label, selected) {
    return '<option value="' + escapeHtml(value) + '"' + (String(value) === String(selected || '') ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
  }

  function getFilterValues(root) {
    root = root || currentRoot || document;
    var jenis = root.querySelector('[data-draft-filter-type]');
    var status = root.querySelector('[data-draft-filter-status]');
    var keyword = root.querySelector('[data-draft-filter-keyword]');
    return {
      draft_type: jenis ? jenis.value : '',
      status: status ? status.value : '',
      keyword: keyword ? keyword.value : ''
    };
  }

  function applyFilters(rows, filters) {
    var f = filters || {};
    var q = s(f.keyword).toLowerCase();

    var drafts = (rows.drafts || []).filter(function (row) {
      if (f.draft_type && up(row.draft_type) !== up(f.draft_type)) return false;
      if (!q) return true;
      return JSON.stringify(row || {}).toLowerCase().indexOf(q) >= 0;
    });

    var queue = (rows.queue || []).filter(function (row) {
      if (f.status && normalizeStatus(row.sync_status || row.status) !== up(f.status)) return false;
      if (!q) return true;
      return JSON.stringify(row || {}).toLowerCase().indexOf(q) >= 0;
    });

    return { drafts: drafts, queue: queue };
  }

  function renderDraftCard(row) {
    var item = summarizeDraft(row);
    var rawData = unwrapDraftData(row) || {};
    var answers = getDraftAnswers(row) || {};
    var key = String(item.draft_key || row.draft_key || '').toLowerCase();
    var jenis = up(firstNonEmpty(answers.jenis_sasaran, rawData.jenis_sasaran, item.jenis_sasaran));
    var isReg = up(row.draft_type) === 'REGISTRASI' ||
      up(rawData.draft_type) === 'REGISTRASI' ||
      key.indexOf('registrasi') >= 0 ||
      key === REG_DRAFT_KEY.toLowerCase() ||
      ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'].indexOf(jenis) >= 0;
    return [
      '<article class="tpk-draft-card" data-draft-key="' + escapeHtml(item.draft_key) + '">',
      '  <div class="tpk-draft-card-head">',
      '    <div>',
      '      <h3>' + escapeHtml(item.title || 'DRAFT') + '</h3>',
      '      <p>' + escapeHtml(item.subtitle || 'Draft tersimpan lokal') + '</p>',
      item.client_submit_id ? '      <p class="tpk-draft-muted">Client submit ID: ' + escapeHtml(item.client_submit_id) + '</p>' : '',
      '    </div>',
      '    <span class="tpk-draft-badge tpk-draft-badge-draft">DRAFT</span>',
      '  </div>',
      '  <p class="tpk-draft-help">Draft tersimpan lokal. Buka menu terkait untuk melanjutkan pengisian.</p>',
      '  <div class="tpk-draft-actions">',
      isReg ? '    <button type="button" data-draft-open="' + escapeHtml(item.draft_key) + '">Lanjutkan Registrasi</button>' : '',
      '    <button type="button" data-draft-delete="' + escapeHtml(item.draft_key) + '">Hapus Draft</button>',
      '  </div>',
      '</article>'
    ].join('');
  }

  function renderQueueCard(row) {
    var item = summarizeQueue(row);
    var statusClass = 'tpk-draft-badge-' + normalizeStatus(item.status).toLowerCase();
    return [
      '<article class="tpk-draft-card" data-queue-id="' + escapeHtml(item.id) + '">',
      '  <div class="tpk-draft-card-head">',
      '    <div>',
      '      <h3>' + escapeHtml(item.title || 'ANTREAN') + '</h3>',
      '      <p>' + escapeHtml(item.subtitle || 'Antrean sinkronisasi') + '</p>',
      item.last_error ? '      <p class="tpk-draft-error">' + escapeHtml(item.last_error) + '</p>' : '',
      '    </div>',
      '    <span class="tpk-draft-badge ' + escapeHtml(statusClass) + '">' + escapeHtml(item.status) + '</span>',
      '  </div>',
      '  <div class="tpk-draft-actions">',
      normalizeStatus(item.status) !== 'PROCESSING' ? '    <button type="button" data-queue-retry="' + escapeHtml(item.id) + '">Sinkronkan</button>' : '',
      '    <button type="button" data-queue-delete="' + escapeHtml(item.id) + '">Hapus Antrean</button>',
      '  </div>',
      '</article>'
    ].join('');
  }

  function renderListHtml(rows) {
    var filtered = applyFilters(rows, getFilterValues(currentRoot));
    var parts = [];

    if (filtered.drafts.length) {
      parts.push('<div class="tpk-draft-section-label">Draft Lokal</div>');
      parts = parts.concat(filtered.drafts.map(renderDraftCard));
    }

    if (filtered.queue.length) {
      parts.push('<div class="tpk-draft-section-label">Antrean Sinkronisasi</div>');
      parts = parts.concat(filtered.queue.map(renderQueueCard));
    }

    if (!parts.length) {
      parts.push(
        '<div class="tpk-draft-empty">' +
          '<strong>Tidak ada draft atau antrean.</strong>' +
          '<p>Draft registrasi akan tampil di sini setelah tombol Simpan Draft ditekan.</p>' +
        '</div>'
      );
    }

    return parts.join('');
  }

  function renderShell(summary) {
    return [
      '<style>',
      '.tpk-draft-wrap{max-width:1120px;margin:0 auto;padding:18px 14px 44px;color:#071f44;font-family:inherit}',
      '.tpk-draft-header{background:linear-gradient(135deg,#38bdf8,#1d4ed8);color:#fff;border-radius:18px;padding:14px 16px;margin-bottom:14px;box-shadow:0 12px 28px rgba(37,99,235,.14);display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.tpk-draft-header-title{min-width:0}',
      '.tpk-draft-back-btn{border:1px solid rgba(255,255,255,.65);background:rgba(255,255,255,.16);color:#fff;border-radius:12px;padding:9px 12px;font-weight:900;cursor:pointer;white-space:nowrap;box-shadow:0 8px 18px rgba(15,23,42,.12)}',
      '.tpk-draft-back-btn:active{transform:translateY(1px)}',
      '.tpk-draft-header h2{font-size:18px;margin:0 0 3px;font-weight:900}',
      '.tpk-draft-header p{margin:0;font-size:12px;opacity:.92}',
      '.tpk-draft-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}',
      '.tpk-draft-stat{background:#fff;border:1px solid #c9ddfb;border-radius:16px;padding:14px;box-shadow:0 10px 22px rgba(15,23,42,.05)}',
      '.tpk-draft-stat small{display:block;color:#58708f;font-size:12px;margin-bottom:5px}',
      '.tpk-draft-stat strong{font-size:24px;font-weight:950;color:#0f3c83}',
      '.tpk-draft-panel{background:#fff;border:1px solid #c9ddfb;border-radius:18px;padding:14px;margin-bottom:14px;box-shadow:0 12px 26px rgba(15,23,42,.05)}',
      '.tpk-draft-panel-title{background:linear-gradient(135deg,#38bdf8,#1d4ed8);color:#fff;border-radius:14px;padding:10px 12px;font-weight:900;margin-bottom:12px}',
      '.tpk-draft-filter{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}',
      '.tpk-draft-filter label{font-size:12px;font-weight:800;color:#0b2b5c;display:block;margin-bottom:5px}',
      '.tpk-draft-filter input,.tpk-draft-filter select{width:100%;box-sizing:border-box;border:1px solid #bdd2ee;border-radius:10px;padding:10px;background:#fff;color:#0f172a}',
      '.tpk-draft-actions-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}',
      '.tpk-draft-actions-row button,.tpk-draft-actions button{border:1px solid #c9ddfb;border-radius:11px;padding:10px 12px;background:#fff;color:#0f172a;font-weight:850;cursor:pointer}',
      '.tpk-draft-actions-row button:first-child,.tpk-draft-actions button:first-child{background:#145bd8;color:#fff;border-color:#145bd8}',
      '.tpk-draft-section-label{font-size:14px;font-weight:950;margin:10px 0;color:#0b2b5c}',
      '.tpk-draft-card{border:1px solid #d2e3fa;border-radius:16px;background:#fff;padding:13px;margin-bottom:10px;box-shadow:0 10px 22px rgba(15,23,42,.04)}',
      '.tpk-draft-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}',
      '.tpk-draft-card h3{font-size:17px;margin:0 0 3px;color:#061c3f;font-weight:950}',
      '.tpk-draft-card p{margin:0 0 6px;color:#425c7a;font-size:12px}',
      '.tpk-draft-help{margin-top:8px!important}',
      '.tpk-draft-muted{color:#64748b!important}',
      '.tpk-draft-error{color:#b91c1c!important;font-weight:700}',
      '.tpk-draft-badge{display:inline-flex;align-items:center;justify-content:center;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:950;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;white-space:nowrap}',
      '.tpk-draft-badge-draft{background:#eff6ff;color:#1d4ed8}',
      '.tpk-draft-badge-pending{background:#fff7ed;color:#c2410c;border-color:#fed7aa}',
      '.tpk-draft-badge-failed,.tpk-draft-badge-conflict{background:#fef2f2;color:#b91c1c;border-color:#fecaca}',
      '.tpk-draft-badge-processing{background:#eef2ff;color:#4338ca;border-color:#c7d2fe}',
      '.tpk-draft-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}',
      '.tpk-draft-empty{border:1px dashed #bdd2ee;border-radius:16px;padding:18px;text-align:center;color:#425c7a;background:#f8fbff}',
      '@media(max-width:720px){.tpk-draft-grid,.tpk-draft-filter,.tpk-draft-actions-row,.tpk-draft-actions{grid-template-columns:1fr}.tpk-draft-card-head{display:block}.tpk-draft-badge{margin-top:8px}.tpk-draft-header{align-items:flex-start}.tpk-draft-back-btn{padding:8px 10px;font-size:12px}}',
      '</style>',
      '<div class="tpk-draft-wrap">',
      '  <div class="tpk-draft-header">',
      '    <div class="tpk-draft-header-title">',
      '      <h2>Draft Offline & Sinkronisasi</h2>',
      '      <p id="sync-screen-meta">Antrean: ' + escapeHtml(summary.queue_total) + ' | Draft: ' + escapeHtml(summary.drafts) + ' | Pending: ' + escapeHtml(summary.pending) + ' | Gagal: ' + escapeHtml(summary.failed) + '</p>',
      '    </div>',
      '    <button type="button" class="tpk-draft-back-btn" data-draft-back>← Kembali</button>',
      '  </div>',
      '  <div class="tpk-draft-grid">',
      '    <div class="tpk-draft-stat"><small>Total Draft</small><strong>' + escapeHtml(summary.drafts) + '</strong></div>',
      '    <div class="tpk-draft-stat"><small>Pending</small><strong>' + escapeHtml(summary.pending) + '</strong></div>',
      '    <div class="tpk-draft-stat"><small>Gagal</small><strong>' + escapeHtml(summary.failed) + '</strong></div>',
      '  </div>',
      '  <div class="tpk-draft-panel">',
      '    <div class="tpk-draft-panel-title">Ringkasan Sinkronisasi</div>',
      '    <div class="tpk-draft-actions-row">',
      '      <button type="button" data-draft-sync-all>Sinkronkan Semua</button>',
      '      <button type="button" data-draft-refresh>Refresh Daftar</button>',
      '    </div>',
      '  </div>',
      '  <div class="tpk-draft-panel">',
      '    <div class="tpk-draft-panel-title">Filter Draft</div>',
      '    <div class="tpk-draft-filter">',
      '      <div><label>Jenis Draft</label><select data-draft-filter-type>' + optionHtml('', 'Semua', '') + optionHtml('REGISTRASI', 'Registrasi', '') + optionHtml('PENDAMPINGAN', 'Pendampingan', '') + '</select></div>',
      '      <div><label>Status</label><select data-draft-filter-status>' + optionHtml('', 'Semua', '') + optionHtml('PENDING', 'Pending', '') + optionHtml('FAILED', 'Gagal', '') + optionHtml('CONFLICT', 'Konflik', '') + '</select></div>',
      '      <div><label>Cari ID / Nama</label><input type="search" data-draft-filter-keyword placeholder="Cari client_submit_id / id_sasaran / nama"></div>',
      '    </div>',
      '  </div>',
      '  <div class="tpk-draft-panel">',
      '    <div class="tpk-draft-panel-title">Daftar Draft</div>',
      '    <div data-draft-list></div>',
      '  </div>',
      '</div>'
    ].join('');
  }

  async function refresh() {
    if (!currentRoot) return null;
    var rows = await loadRows({});
    var summary = countSummary(rows);
    updateExternalBadges(summary);
    var list = currentRoot.querySelector('[data-draft-list]');
    if (list) list.innerHTML = renderListHtml(rows);
    return rows;
  }

  async function restoreDraftToLocal(row) {
    if (!row) return false;
    var draftKey = row.draft_key || REG_DRAFT_KEY;
    var payload = unwrapDraftPayload(row);
    if (!payload || typeof payload !== 'object') {
      payload = { saved_at: nowIso(), data: unwrapDraftData(row) };
    }
    if (!payload.saved_at) payload.saved_at = nowIso();
    try { window.localStorage.setItem(draftKey, JSON.stringify(payload)); } catch (err) {}
    return true;
  }

  function goToRoute(name) {
    try {
      if (window.Router) {
        if (name === 'registrasi' && isFunction(window.Router.toRegistrasi)) {
          window.Router.toRegistrasi();
          return true;
        }
        if (name === 'dashboard' && isFunction(window.Router.toDashboard)) {
          window.Router.toDashboard();
          return true;
        }
        if (isFunction(window.Router.go)) {
          window.Router.go(name);
          return true;
        }
        if (isFunction(window.Router.navigate)) {
          window.Router.navigate(name);
          return true;
        }
      }
    } catch (err) {}

    try { window.location.hash = '#' + name; return true; } catch (err2) {}
    return false;
  }

  function goBackFromDraft() {
    try {
      if (window.AppState && typeof window.AppState.set === 'function') {
        window.AppState.set('currentView', 'dashboard');
      }
    } catch (err) {}

    if (goToRoute('dashboard')) return true;

    try {
      if (window.history && window.history.length > 1) {
        window.history.back();
        return true;
      }
    } catch (err2) {}

    try { window.location.hash = '#dashboard'; return true; } catch (err3) {}
    return false;
  }

  function findDraftByKey(key) {
    return (lastRows.drafts || []).find(function (row) {
      return String(row.draft_key || '') === String(key || '');
    }) || null;
  }

  function findQueueById(id) {
    return (lastRows.queue || []).find(function (row) {
      return String(row.id || row.queue_id || row.client_submit_id || '') === String(id || '');
    }) || null;
  }

  async function bindRoot(root) {
    root.addEventListener('click', async function (event) {
      var target = event.target;
      if (!target || !target.closest) return;

      var backBtn = target.closest('[data-draft-back]');
      if (backBtn) {
        event.preventDefault();
        goBackFromDraft();
        return;
      }

      var refreshBtn = target.closest('[data-draft-refresh]');
      if (refreshBtn) {
        event.preventDefault();
        await refresh();
        notify('Daftar draft diperbarui.', 'info');
        return;
      }

      var syncAllBtn = target.closest('[data-draft-sync-all]');
      if (syncAllBtn) {
        event.preventDefault();
        var sm = getSyncManager();
        if (!sm || !isFunction(sm.syncAll)) {
          notify('SyncManager belum siap.', 'warning');
          return;
        }
        syncAllBtn.disabled = true;
        try {
          await sm.syncAll({ force: true });
          await refresh();
        } finally {
          syncAllBtn.disabled = false;
        }
        return;
      }

      var openBtn = target.closest('[data-draft-open]');
      if (openBtn) {
        event.preventDefault();
        var key = openBtn.getAttribute('data-draft-open');
        var draft = findDraftByKey(key) || { draft_key: key || REG_DRAFT_KEY };
        await restoreDraftToLocal(draft);
        reportClientEvent('registrasi_draft_opened', {
          action: 'registrasi_draft_opened',
          draft_key: key || REG_DRAFT_KEY,
          draft_type: 'REGISTRASI'
        });
        if (window.RegistrasiForm && typeof window.RegistrasiForm.openCreate === 'function') {
          await window.RegistrasiForm.openCreate();
        } else {
          goToRoute('registrasi');
        }
        return;
      }

      var delDraftBtn = target.closest('[data-draft-delete]');
      if (delDraftBtn) {
        event.preventDefault();
        var draftKey = delDraftBtn.getAttribute('data-draft-delete') || REG_DRAFT_KEY;
        if (!window.confirm('Hapus draft ini dari perangkat?')) return;
        var repo = getRepo();
        if (repo && isFunction(repo.clearDraft)) await repo.clearDraft(draftKey);
        else {
          try { window.localStorage.removeItem(draftKey); } catch (err) {}
        }
        reportClientEvent('registrasi_draft_deleted', {
          action: 'registrasi_draft_deleted',
          draft_key: draftKey,
          draft_type: draftKey === REG_DRAFT_KEY ? 'REGISTRASI' : ''
        });
        await refresh();
        notify('Draft dihapus.', 'success');
        return;
      }

      var retryBtn = target.closest('[data-queue-retry]');
      if (retryBtn) {
        event.preventDefault();
        var queueId = retryBtn.getAttribute('data-queue-retry');
        var sm2 = getSyncManager();
        if (sm2 && isFunction(sm2.retryOne)) {
          retryBtn.disabled = true;
          try {
            await sm2.retryOne(queueId);
            await refresh();
          } finally {
            retryBtn.disabled = false;
          }
        }
        return;
      }

      var delQueueBtn = target.closest('[data-queue-delete]');
      if (delQueueBtn) {
        event.preventDefault();
        var id = delQueueBtn.getAttribute('data-queue-delete');
        if (!window.confirm('Hapus antrean sinkronisasi ini?')) return;
        var repo2 = getRepo();
        if (repo2 && isFunction(repo2.removeById)) await repo2.removeById(id);
        await refresh();
        notify('Antrean dihapus.', 'success');
      }
    });

    root.addEventListener('input', function (event) {
      if (event.target && event.target.matches('[data-draft-filter-keyword]')) {
        var list = currentRoot && currentRoot.querySelector('[data-draft-list]');
        if (list) list.innerHTML = renderListHtml(lastRows);
      }
    });

    root.addEventListener('change', function (event) {
      if (event.target && event.target.matches('[data-draft-filter-type], [data-draft-filter-status]')) {
        var list = currentRoot && currentRoot.querySelector('[data-draft-list]');
        if (list) list.innerHTML = renderListHtml(lastRows);
      }
    });
  }

  function resolveRoot(container) {
    if (container && container.nodeType === 1) return container;
    if (typeof container === 'string') {
      var bySelector = document.querySelector(container);
      if (bySelector) return bySelector;
    }

    return document.getElementById('draft-screen') ||
      document.getElementById('sync-screen') ||
      document.getElementById('draft-view') ||
      document.getElementById('app-content') ||
      document.getElementById('main-content') ||
      document.getElementById('app') ||
      document.querySelector('[data-view="draft"]') ||
      document.querySelector('[data-screen="sync"]');
  }

  async function render(container, options) {
    var root = resolveRoot(container);
    if (!root) return false;

    currentRoot = root;
    var rows = await loadRows({});
    var summary = countSummary(rows);
    root.innerHTML = renderShell(summary);
    await bindRoot(root);
    updateExternalBadges(summary);

    var list = root.querySelector('[data-draft-list]');
    if (list) list.innerHTML = renderListHtml(rows);

    return true;
  }

  async function open(container, options) {
    return render(container, options || {});
  }

  async function init(container) {
    return render(container);
  }

  window.addEventListener('tpk:queue-changed', function () {
    if (!currentRoot) return;
    refresh();
  });

  var DraftView = {
    version: VERSION,
    render: render,
    open: open,
    init: init,
    refresh: refresh,
    loadRows: loadRows,
    countSummary: countSummary,
    goBackFromDraft: goBackFromDraft
  };

  window.DraftView = DraftView;
  window.SyncView = DraftView;
  window.draftView = DraftView;
  window.syncView = DraftView;
  window.renderDraftView = render;
  window.renderSyncView = render;
  window.__TPK_DRAFT_VIEW_R1R3R4_VERSION = VERSION;
})(window, document);
