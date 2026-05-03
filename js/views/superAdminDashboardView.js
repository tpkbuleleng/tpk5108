(function (window, document) {
  'use strict';

  var ROOT_ID = 'super-admin-root';
  var DEFAULT_LOG_TYPE = 'PERFORMANCE';

  function byId(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getApi() { return window.Api || null; }
  function getRouter() { return window.Router || null; }

  function showToast(message, type) {
    if (window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(message, type || 'info');
      return;
    }
    try { window.alert(message); } catch (err) {}
  }

  function fmt(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback == null ? '-' : fallback;
    return String(value);
  }

  function statusClass(status) {
    var s = String(status || '').toUpperCase();
    if (s === 'GREEN') return 'sa-status-green';
    if (s === 'RED') return 'sa-status-red';
    return 'sa-status-yellow';
  }

  function post(action, payload) {
    var api = getApi();
    if (!api || typeof api.post !== 'function') {
      return Promise.resolve({ ok: false, message: 'Api.post belum tersedia.' });
    }
    return api.post(action, payload || {});
  }

  function getData(result) {
    if (!result) return {};
    return result.data || result || {};
  }

  function cardHtml(label, value, hint, cls) {
    return [
      '<article class="sa-card ', escapeHtml(cls || ''), '">',
        '<span class="sa-card__label">', escapeHtml(label), '</span>',
        '<strong class="sa-card__value">', escapeHtml(fmt(value, '0')), '</strong>',
        '<small class="sa-card__hint">', escapeHtml(hint || ''), '</small>',
      '</article>'
    ].join('');
  }

  function renderShell(target) {
    target.innerHTML = [
      '<div id="', ROOT_ID, '" class="super-admin-page">',
        '<style>',
          '.super-admin-page{padding:14px;max-width:1180px;margin:0 auto;color:#0f172a;font-family:system-ui,-apple-system,Segoe UI,sans-serif}',
          '.sa-header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px}',
          '.sa-title h2{margin:0;font-size:1.35rem}.sa-title p{margin:.25rem 0 0;color:#64748b;font-size:.9rem}',
          '.sa-actions{display:flex;gap:8px;flex-wrap:wrap}.sa-btn{border:1px solid #cbd5e1;background:#fff;border-radius:12px;padding:9px 12px;font-weight:700;cursor:pointer}.sa-btn-primary{background:#0f172a;color:#fff;border-color:#0f172a}',
          '.sa-health{border-radius:16px;padding:10px 12px;font-weight:800;display:inline-flex;align-items:center;gap:8px}',
          '.sa-status-green{background:#dcfce7;color:#166534}.sa-status-yellow{background:#fef3c7;color:#92400e}.sa-status-red{background:#fee2e2;color:#991b1b}',
          '.sa-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0}',
          '.sa-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px;box-shadow:0 6px 20px rgba(15,23,42,.05)}',
          '.sa-card__label{display:block;color:#64748b;font-size:.8rem}.sa-card__value{display:block;font-size:1.45rem;margin:.15rem 0}.sa-card__hint{color:#94a3b8}',
          '.sa-panel{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px;margin:12px 0;box-shadow:0 6px 20px rgba(15,23,42,.05)}',
          '.sa-panel h3{margin:0 0 10px;font-size:1rem}.sa-list{margin:0;padding-left:20px}.sa-list li{margin:5px 0}',
          '.sa-table-wrap{overflow:auto}.sa-table{width:100%;border-collapse:collapse;font-size:.85rem}.sa-table th,.sa-table td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}.sa-table th{color:#475569;background:#f8fafc}',
          '.sa-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.sa-tab{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:8px 12px;font-weight:700;cursor:pointer}.sa-tab.active{background:#0f172a;color:#fff}',
          '.sa-filter{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.sa-filter input,.sa-filter select{border:1px solid #cbd5e1;border-radius:10px;padding:8px;min-width:150px}',
          '.sa-muted{color:#64748b}.sa-error{color:#991b1b;background:#fee2e2;border-radius:12px;padding:10px}.sa-loading{color:#475569;background:#f8fafc;border-radius:12px;padding:10px}',
          '@media(max-width:820px){.sa-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sa-header{display:block}.sa-actions{margin-top:10px}}',
        '</style>',
        '<header class="sa-header">',
          '<div class="sa-title">',
            '<h2>Super Admin - System Monitor</h2>',
            '<p>Monitoring ringkas performa, error, security/session, dan log sistem TPK.</p>',
          '</div>',
          '<div class="sa-actions">',
            '<button type="button" class="sa-btn" id="sa-back-dashboard">Dashboard</button>',
            '<button type="button" class="sa-btn sa-btn-primary" id="sa-refresh">Perbarui</button>',
          '</div>',
        '</header>',
        '<section id="sa-summary" class="sa-panel"><div class="sa-loading">Memuat ringkasan...</div></section>',
        '<nav class="sa-tabs" aria-label="Menu Super Admin">',
          '<button class="sa-tab active" data-sa-tab="performance" type="button">Performa</button>',
          '<button class="sa-tab" data-sa-tab="errors" type="button">Error</button>',
          '<button class="sa-tab" data-sa-tab="security" type="button">Security</button>',
          '<button class="sa-tab" data-sa-tab="logs" type="button">Log Explorer</button>',
        '</nav>',
        '<section id="sa-tab-content" class="sa-panel"><div class="sa-loading">Memuat data...</div></section>',
      '</div>'
    ].join('');
  }

  function renderSummary(data) {
    var root = byId('sa-summary');
    if (!root) return;
    var cards = data.cards || {};
    var issues = data.top_issues || [];
    var health = data.health_status || 'YELLOW';
    root.innerHTML = [
      '<div class="sa-header">',
        '<div>',
          '<span class="sa-health ', statusClass(health), '">Status Sistem: ', escapeHtml(health), '</span>',
          '<p class="sa-muted">Update: ', escapeHtml(fmt(data.generated_at)), ' · Ambang lambat: ', escapeHtml(fmt(data.slow_threshold_ms)), ' ms</p>',
        '</div>',
      '</div>',
      '<div class="sa-grid">',
        cardHtml('Request hari ini', cards.request_today, 'Dari log_performance'),
        cardHtml('Error hari ini', cards.error_today, 'Dari log_user_error', cards.error_today > 0 ? 'sa-status-yellow' : ''),
        cardHtml('Login gagal', cards.login_failed_today, 'Dari log_user_login', cards.login_failed_today > 0 ? 'sa-status-yellow' : ''),
        cardHtml('Endpoint lambat', cards.slow_endpoint_today, 'Di atas ambang lambat', cards.slow_endpoint_today > 0 ? 'sa-status-yellow' : ''),
        cardHtml('Security deny', cards.security_deny_today, 'Dari log_security_event', cards.security_deny_today > 0 ? 'sa-status-yellow' : ''),
        cardHtml('App version', cards.app_version || '-', 'Versi backend aktif'),
      '</div>',
      '<h3>Top Masalah Hari Ini</h3>',
      '<ol class="sa-list">', issues.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join(''), '</ol>'
    ].join('');
  }

  function tableHtml(headers, rows) {
    rows = rows || [];
    return [
      '<div class="sa-table-wrap"><table class="sa-table"><thead><tr>',
      headers.map(function (h) { return '<th>' + escapeHtml(h.label) + '</th>'; }).join(''),
      '</tr></thead><tbody>',
      rows.length ? rows.map(function (row) {
        return '<tr>' + headers.map(function (h) { return '<td>' + escapeHtml(fmt(row[h.key])) + '</td>'; }).join('') + '</tr>';
      }).join('') : '<tr><td colspan="' + headers.length + '" class="sa-muted">Tidak ada data.</td></tr>',
      '</tbody></table></div>'
    ].join('');
  }

  function renderPerformance(data) {
    var target = byId('sa-tab-content');
    if (!target) return;
    target.innerHTML = [
      '<h3>Performa Endpoint</h3>',
      '<p class="sa-muted">Total baris dianalisis: ', escapeHtml(fmt(data.total_rows, 0)), ' · Ambang lambat: ', escapeHtml(fmt(data.slow_threshold_ms)), ' ms</p>',
      tableHtml([
        { key: 'action', label: 'Action' },
        { key: 'count', label: 'Jumlah' },
        { key: 'avg_ms', label: 'Avg ms' },
        { key: 'max_ms', label: 'Max ms' },
        { key: 'max_open_sheet_ms', label: 'Max open_sheet' },
        { key: 'max_read_rows', label: 'Max read_rows' },
        { key: 'slow_count', label: 'Lambat' },
        { key: 'status', label: 'Status' }
      ], data.groups || [])
    ].join('');
  }

  function renderErrors(data) {
    var target = byId('sa-tab-content');
    if (!target) return;
    target.innerHTML = [
      '<h3>Error Terbaru</h3>',
      tableHtml([
        { key: 'waktu', label: 'Waktu' },
        { key: 'request_id', label: 'Request ID' },
        { key: 'id_pengguna', label: 'User' },
        { key: 'modul', label: 'Modul' },
        { key: 'aksi', label: 'Aksi' },
        { key: 'pesan_error', label: 'Pesan' }
      ], data.items || data.recent_errors || [])
    ].join('');
  }

  function renderSecurity(data) {
    var target = byId('sa-tab-content');
    if (!target) return;
    target.innerHTML = [
      '<h3>Security & Session</h3>',
      '<h4>Ringkasan Reason Code</h4>',
      tableHtml([
        { key: 'event_type', label: 'Event' },
        { key: 'reason_code', label: 'Reason' },
        { key: 'count', label: 'Jumlah' },
        { key: 'latest_at', label: 'Terakhir' }
      ], data.groups || []),
      '<h4 style="margin-top:14px">Event Terbaru</h4>',
      tableHtml([
        { key: 'waktu', label: 'Waktu' },
        { key: 'request_id', label: 'Request ID' },
        { key: 'event_type', label: 'Event' },
        { key: 'decision_status', label: 'Decision' },
        { key: 'reason_code', label: 'Reason' },
        { key: 'aksi', label: 'Aksi' },
        { key: 'role', label: 'Role' }
      ], data.latest || [])
    ].join('');
  }

  function renderLogs(data) {
    var target = byId('sa-tab-content');
    if (!target) return;
    var items = data.items || [];
    var keys = [];
    if (items.length) {
      Object.keys(items[0]).slice(0, 8).forEach(function (k) { keys.push({ key: k, label: k }); });
    }
    target.innerHTML = [
      '<h3>Log Explorer Ringkas</h3>',
      '<div class="sa-filter">',
        '<select id="sa-log-type">',
          '<option value="PERFORMANCE">Performance</option>',
          '<option value="ERROR">Error</option>',
          '<option value="SECURITY">Security</option>',
          '<option value="LOGIN">Login</option>',
          '<option value="ACTIVITY">Aktivitas</option>',
          '<option value="SUPER_ADMIN_ACTION">Super Admin Action</option>',
        '</select>',
        '<input id="sa-log-q" type="search" placeholder="Cari teks/request/user/action" />',
        '<button type="button" class="sa-btn sa-btn-primary" id="sa-log-search">Cari</button>',
      '</div>',
      '<div id="sa-log-result">', tableHtml(keys.length ? keys : [{ key: 'info', label: 'Info' }], keys.length ? items : [{ info: 'Pilih filter lalu tekan Cari.' }]), '</div>'
    ].join('');

    var btn = byId('sa-log-search');
    if (btn) {
      btn.addEventListener('click', function () {
        loadLogs(byId('sa-log-type').value, byId('sa-log-q').value);
      });
    }
  }

  function setTabLoading(label) {
    var target = byId('sa-tab-content');
    if (target) target.innerHTML = '<div class="sa-loading">Memuat ' + escapeHtml(label || 'data') + '...</div>';
  }

  function setTabError(message) {
    var target = byId('sa-tab-content');
    if (target) target.innerHTML = '<div class="sa-error">' + escapeHtml(message || 'Gagal memuat data.') + '</div>';
  }

  async function loadSummary() {
    var result = await post('getSuperAdminSummary', { max_rows: 500 });
    if (!result || result.ok === false) {
      var root = byId('sa-summary');
      if (root) root.innerHTML = '<div class="sa-error">' + escapeHtml((result && result.message) || 'Gagal memuat ringkasan.') + '</div>';
      return;
    }
    renderSummary(getData(result));
  }

  async function loadPerformance() {
    setTabLoading('performa');
    var result = await post('getSuperAdminPerformance', { max_rows: 1000 });
    if (!result || result.ok === false) return setTabError(result && result.message);
    renderPerformance(getData(result));
  }

  async function loadErrors() {
    setTabLoading('error');
    var result = await post('getSuperAdminRecentErrors', { max_rows: 100 });
    if (!result || result.ok === false) return setTabError(result && result.message);
    renderErrors(getData(result));
  }

  async function loadSecurity() {
    setTabLoading('security');
    var result = await post('getSuperAdminSecurity', { max_rows: 500 });
    if (!result || result.ok === false) return setTabError(result && result.message);
    renderSecurity(getData(result));
  }

  async function loadLogs(type, q) {
    var container = byId('sa-log-result');
    if (container) container.innerHTML = '<div class="sa-loading">Mencari log...</div>';
    var result = await post('searchSuperAdminLogs', { log_type: type || DEFAULT_LOG_TYPE, q: q || '', max_rows: 50 });
    if (!result || result.ok === false) {
      if (container) container.innerHTML = '<div class="sa-error">' + escapeHtml((result && result.message) || 'Gagal mencari log.') + '</div>';
      return;
    }
    var data = getData(result);
    var items = data.items || [];
    var keys = [];
    if (items.length) Object.keys(items[0]).slice(0, 8).forEach(function (k) { keys.push({ key: k, label: k }); });
    if (container) container.innerHTML = tableHtml(keys.length ? keys : [{ key: 'info', label: 'Info' }], keys.length ? items : [{ info: 'Tidak ada hasil.' }]);
  }

  function bindTabs() {
    var tabs = document.querySelectorAll('[data-sa-tab]');
    Array.prototype.forEach.call(tabs, function (btn) {
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(tabs, function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var tab = btn.getAttribute('data-sa-tab');
        if (tab === 'performance') return loadPerformance();
        if (tab === 'errors') return loadErrors();
        if (tab === 'security') return loadSecurity();
        if (tab === 'logs') return renderLogs({ items: [] });
      });
    });
  }

  function bindHeader() {
    var refresh = byId('sa-refresh');
    if (refresh) refresh.addEventListener('click', function () { refreshAll(); });
    var back = byId('sa-back-dashboard');
    if (back) back.addEventListener('click', function () {
      var router = getRouter();
      if (router && typeof router.go === 'function') router.go('dashboard');
    });
  }

  async function refreshAll() {
    try {
      await loadSummary();
      await loadPerformance();
      showToast('Dashboard Super Admin diperbarui.', 'success');
    } catch (err) {
      showToast(err && err.message ? err.message : 'Gagal memperbarui dashboard.', 'error');
    }
  }

  function init(target) {
    var rootTarget = target || byId('super-admin-screen') || document.body;
    renderShell(rootTarget);
    bindHeader();
    bindTabs();
    refreshAll();
  }

  window.SuperAdminDashboardView = {
    init: init,
    refresh: refreshAll,
    loadPerformance: loadPerformance,
    loadErrors: loadErrors,
    loadSecurity: loadSecurity,
    loadLogs: loadLogs
  };
})(window, document);
