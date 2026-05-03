(function (window, document) {
  'use strict';

  var ROOT_ID = 'super-admin-root';
  var DEFAULT_LOG_TYPE = 'PERFORMANCE';
  var activeTab = 'performance';
  var lastSummary = null;
  var tabLoaded = {
    performance: false,
    monitor: false,
    errors: false,
    security: false,
    logs: false
  };

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

  function fmtNumber(value) {
    var n = Number(value || 0);
    if (isNaN(n)) return fmt(value, '0');
    try { return n.toLocaleString('id-ID'); } catch (err) { return String(n); }
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
        '<strong class="sa-card__value">', escapeHtml(fmtNumber(value)), '</strong>',
        '<small class="sa-card__hint">', escapeHtml(hint || ''), '</small>',
      '</article>'
    ].join('');
  }

  function renderShell(target) {
    target.innerHTML = [
      '<div id="', ROOT_ID, '" class="super-admin-page">',
        '<style>',
          ':root{--sa-bg:#f3f7fb;--sa-text:#0f172a;--sa-muted:#64748b;--sa-line:#dbe6f2;--sa-card:#fff;--sa-blue:#1d4ed8;--sa-dark:#0f172a}',
          '.super-admin-page{min-height:100vh;padding:18px 24px 28px;width:calc(100% - 48px);max-width:1560px;margin:0 auto;color:var(--sa-text);font-family:system-ui,-apple-system,Segoe UI,sans-serif}',
          '.sa-topbar{display:flex;justify-content:space-between;gap:18px;align-items:center;margin-bottom:16px}',
          '.sa-title h2{margin:0;font-size:1.55rem;letter-spacing:-.02em}.sa-title p{margin:.28rem 0 0;color:var(--sa-muted);font-size:.94rem}',
          '.sa-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.sa-btn{border:1px solid #cbd5e1;background:#fff;border-radius:13px;padding:9px 13px;font-weight:800;cursor:pointer;box-shadow:0 3px 12px rgba(15,23,42,.04)}.sa-btn-primary{background:#0f172a;color:#fff;border-color:#0f172a}.sa-btn-soft{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}',
          '.sa-hero{background:linear-gradient(135deg,#0ea5e9,#1d4ed8);border-radius:22px;padding:16px 18px;color:#fff;box-shadow:0 18px 45px rgba(29,78,216,.18);margin-bottom:14px}',
          '.sa-hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;align-items:stretch}',
          '.sa-health-pill{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:8px 12px;font-weight:900;background:rgba(255,255,255,.18);backdrop-filter:blur(8px)}',
          '.sa-health-pill.sa-status-green{background:#dcfce7;color:#166534}.sa-health-pill.sa-status-yellow{background:#fef3c7;color:#92400e}.sa-health-pill.sa-status-red{background:#fee2e2;color:#991b1b}',
          '.sa-hero h3{margin:8px 0 4px;font-size:1.2rem}.sa-hero p{margin:0;color:rgba(255,255,255,.85)}',
          '.sa-hero-side{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sa-mini{border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.13);border-radius:16px;padding:10px}.sa-mini span{display:block;font-size:.78rem;color:rgba(255,255,255,.82)}.sa-mini strong{font-size:1.25rem}',
          '.sa-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:12px 0}',
          '.sa-card{background:var(--sa-card);border:1px solid var(--sa-line);border-radius:18px;padding:13px 14px;box-shadow:0 10px 24px rgba(15,23,42,.05);min-height:84px}.sa-card__label{display:block;color:var(--sa-muted);font-size:.78rem}.sa-card__value{display:block;font-size:1.55rem;margin:.16rem 0;color:#0f172a}.sa-card__hint{color:#94a3b8}.sa-card.sa-warn .sa-card__value{color:#b45309}.sa-card.sa-danger .sa-card__value{color:#b91c1c}',
          '.sa-layout{display:grid;grid-template-columns:1.15fr .85fr;gap:12px;margin:12px 0}',
          '.sa-panel{background:#fff;border:1px solid var(--sa-line);border-radius:20px;padding:14px;box-shadow:0 10px 28px rgba(15,23,42,.05)}',
          '.sa-panel h3{margin:0 0 10px;font-size:1.03rem}.sa-panel h4{margin:12px 0 8px}.sa-list{margin:0;padding-left:20px}.sa-list li{margin:6px 0;line-height:1.35}',
          '.sa-table-wrap{overflow:auto;max-width:100%}.sa-table{width:100%;border-collapse:collapse;font-size:.84rem;white-space:nowrap}.sa-table th,.sa-table td{padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}.sa-table th{position:sticky;top:0;color:#475569;background:#f8fafc;z-index:1}.sa-table td.sa-wrap{white-space:normal;min-width:240px}',
          '.sa-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.sa-tab{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:9px 14px;font-weight:800;cursor:pointer}.sa-tab.active{background:#0f172a;color:#fff;border-color:#0f172a}',
          '.sa-filter{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.sa-filter input,.sa-filter select{border:1px solid #cbd5e1;border-radius:12px;padding:9px;min-width:160px;background:#fff}',
          '.sa-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;font-weight:800;font-size:.72rem}.sa-status-green{background:#dcfce7;color:#166534}.sa-status-yellow{background:#fef3c7;color:#92400e}.sa-status-red{background:#fee2e2;color:#991b1b}',
          '.sa-muted{color:var(--sa-muted)}.sa-error{color:#991b1b;background:#fee2e2;border-radius:14px;padding:12px}.sa-loading{color:#475569;background:#f8fafc;border-radius:14px;padding:12px}.sa-footnote{font-size:.78rem;color:#64748b;margin-top:8px}',
          '@media(max-width:1240px){.sa-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.sa-hero-grid,.sa-layout{grid-template-columns:1fr}}',
          '@media(max-width:760px){.super-admin-page{padding:12px;width:calc(100% - 24px)}.sa-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sa-topbar{display:block}.sa-actions{margin-top:10px}.sa-hero-side{grid-template-columns:1fr}.sa-table{font-size:.78rem}}',
        '</style>',
        '<header class="sa-topbar">',
          '<div class="sa-title">',
            '<h2>Super Admin - System Monitor</h2>',
            '<p>Command center ringkas untuk performa, error, security/session, log, dan kesehatan aplikasi TPK.</p>',
          '</div>',
          '<div class="sa-actions">',
            '<button type="button" class="sa-btn" id="sa-back-dashboard">Dashboard</button>',
            '<button type="button" class="sa-btn sa-btn-soft" id="sa-refresh-cache">Perbarui Cache</button>',
            '<button type="button" class="sa-btn sa-btn-primary" id="sa-refresh">Perbarui Paksa</button>',
            '<button type="button" class="sa-btn sa-btn-danger" id="sa-logout">Keluar</button>',
          '</div>',
        '</header>',
        '<section id="sa-summary"><div class="sa-loading">Memuat ringkasan...</div></section>',
        '<nav class="sa-tabs" aria-label="Menu Super Admin">',
          '<button class="sa-tab active" data-sa-tab="performance" type="button">Core Performance</button>',
          '<button class="sa-tab" data-sa-tab="monitor" type="button">Monitor Endpoint</button>',
          '<button class="sa-tab" data-sa-tab="errors" type="button">Error</button>',
          '<button class="sa-tab" data-sa-tab="security" type="button">Security</button>',
          '<button class="sa-tab" data-sa-tab="logs" type="button">Log Explorer</button>',
        '</nav>',
        '<section id="sa-tab-content" class="sa-panel"><div class="sa-loading">Memuat data...</div></section>',
      '</div>'
    ].join('');
  }

  function badgeStatus(status) {
    return '<span class="sa-badge ' + statusClass(status) + '">' + escapeHtml(status || '-') + '</span>';
  }

  function renderSummary(data) {
    lastSummary = data || {};
    var root = byId('sa-summary');
    if (!root) return;
    var cards = data.cards || {};
    var issues = data.top_issues || [];
    var health = data.health_status || 'YELLOW';
    var coreGroups = data.core_performance || [];
    var monitorGroups = data.monitor_performance || [];

    root.innerHTML = [
      '<section class="sa-hero">',
        '<div class="sa-hero-grid">',
          '<div>',
            '<span class="sa-health-pill ', statusClass(health), '">Status Core App: ', escapeHtml(health), '</span>',
            '<h3>Health Scope: ', escapeHtml(data.health_scope || 'CORE_APP_ONLY'), '</h3>',
            '<p>Update: ', escapeHtml(fmt(data.generated_at)), ' · Service: ', escapeHtml(fmt(data.service_version)), ' · Ambang lambat: ', escapeHtml(fmt(data.slow_threshold_ms)), ' ms · Cache: ', escapeHtml(data.cache_hit ? 'HIT' : 'MISS'), '</p>',
          '</div>',
          '<div class="sa-hero-side">',
            '<div class="sa-mini"><span>Core request</span><strong>', escapeHtml(fmtNumber(cards.core_request_today)), '</strong></div>',
            '<div class="sa-mini"><span>Monitor request</span><strong>', escapeHtml(fmtNumber(cards.monitor_request_today)), '</strong></div>',
            '<div class="sa-mini"><span>Core slow</span><strong>', escapeHtml(fmtNumber(cards.slow_endpoint_today)), '</strong></div>',
            '<div class="sa-mini"><span>Monitor slow</span><strong>', escapeHtml(fmtNumber(cards.monitor_slow_today)), '</strong></div>',
          '</div>',
        '</div>',
      '</section>',
      '<section class="sa-grid">',
        cardHtml('Request hari ini', cards.request_today, 'Semua log_performance'),
        cardHtml('Core endpoint lambat', cards.slow_endpoint_today, 'Tidak termasuk monitor', cards.slow_endpoint_today > 0 ? 'sa-warn' : ''),
        cardHtml('Error hari ini', cards.error_today, 'Dari log_user_error', cards.error_today > 0 ? 'sa-danger' : ''),
        cardHtml('Security deny', cards.security_deny_today, 'Dari log_security_event', cards.security_deny_today > 0 ? 'sa-warn' : ''),
        cardHtml('Login gagal', cards.login_failed_today, 'Dari log_user_login', cards.login_failed_today > 0 ? 'sa-warn' : ''),
        cardHtml('App version', cards.app_version || '-', 'Versi backend aktif'),
      '</section>',
      '<section class="sa-layout">',
        '<div class="sa-panel">',
          '<h3>Top Masalah Hari Ini</h3>',
          '<ol class="sa-list">', issues.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join(''), '</ol>',
          '<p class="sa-footnote">Catatan: status utama memakai Core App Endpoint. Endpoint monitor Super Admin dipisahkan agar tidak mencemari health aplikasi kader.</p>',
        '</div>',
        '<div class="sa-panel">',
          '<h3>Ringkasan Teknis</h3>',
          '<p class="sa-muted">Core action terbaca: ', escapeHtml(fmtNumber(coreGroups.length)), '</p>',
          '<p class="sa-muted">Monitor action terbaca: ', escapeHtml(fmtNumber(monitorGroups.length)), '</p>',
          '<p class="sa-muted">Security group: ', escapeHtml(fmtNumber((data.security_groups || []).length)), '</p>',
          '<p class="sa-muted">Recent error sample: ', escapeHtml(fmtNumber((data.recent_errors || []).length)), '</p>',
        '</div>',
      '</section>'
    ].join('');
  }

  function tableHtml(headers, rows) {
    rows = rows || [];
    return [
      '<div class="sa-table-wrap"><table class="sa-table"><thead><tr>',
      headers.map(function (h) { return '<th>' + escapeHtml(h.label) + '</th>'; }).join(''),
      '</tr></thead><tbody>',
      rows.length ? rows.map(function (row) {
        return '<tr>' + headers.map(function (h) {
          var cls = h.wrap ? ' class="sa-wrap"' : '';
          var value = h.formatter ? h.formatter(row[h.key], row) : fmt(row[h.key]);
          return '<td' + cls + '>' + value + '</td>';
        }).join('') + '</tr>';
      }).join('') : '<tr><td colspan="' + headers.length + '" class="sa-muted">Tidak ada data.</td></tr>',
      '</tbody></table></div>'
    ].join('');
  }

  function performanceHeaders() {
    return [
      { key: 'action', label: 'Action' },
      { key: 'category', label: 'Kategori' },
      { key: 'count', label: 'Jumlah' },
      { key: 'avg_ms', label: 'Avg ms' },
      { key: 'max_ms', label: 'Max ms' },
      { key: 'max_open_sheet_ms', label: 'Max open_sheet' },
      { key: 'max_read_rows', label: 'Max read_rows' },
      { key: 'slow_count', label: 'Lambat' },
      { key: 'status', label: 'Status', formatter: function (v) { return badgeStatus(v); } }
    ];
  }

  function renderPerformance(data, title) {
    var target = byId('sa-tab-content');
    if (!target) return;
    target.innerHTML = [
      '<h3>', escapeHtml(title || 'Core App Performance'), '</h3>',
      '<p class="sa-muted">Kategori: ', escapeHtml(data.category || 'CORE'), ' · Total baris dianalisis: ', escapeHtml(fmtNumber(data.total_rows)), ' · Source rows: ', escapeHtml(fmtNumber(data.source_rows)), ' · Ambang lambat: ', escapeHtml(fmt(data.slow_threshold_ms)), ' ms · Cache: ', escapeHtml(data.cache_hit ? 'HIT' : 'MISS'), '</p>',
      tableHtml(performanceHeaders(), data.groups || [])
    ].join('');
  }

  function renderPerformanceFromSummary(category) {
    var data = lastSummary || {};
    if (category === 'MONITOR') {
      renderPerformance({
        generated_at: data.generated_at,
        category: 'MONITOR',
        cache_hit: data.cache_hit,
        slow_threshold_ms: data.slow_threshold_ms,
        total_rows: (data.monitor_performance || []).reduce(function (n, g) { return n + Number(g.count || 0); }, 0),
        source_rows: 0,
        groups: data.monitor_performance || []
      }, 'Monitor Endpoint Performance');
      return;
    }

    renderPerformance({
      generated_at: data.generated_at,
      category: 'CORE',
      cache_hit: data.cache_hit,
      slow_threshold_ms: data.slow_threshold_ms,
      total_rows: (data.core_performance || []).reduce(function (n, g) { return n + Number(g.count || 0); }, 0),
      source_rows: 0,
      groups: data.core_performance || []
    }, 'Core App Performance');
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
        { key: 'pesan_error', label: 'Pesan', wrap: true }
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
        { key: 'decision_status', label: 'Decision' },
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
        { key: 'role', label: 'Role' },
        { key: 'detail', label: 'Detail', wrap: true }
      ], data.latest || [])
    ].join('');
  }

  function renderLogs(data) {
    var target = byId('sa-tab-content');
    if (!target) return;
    var items = data.items || [];
    var keys = [];
    if (items.length) Object.keys(items[0]).slice(0, 10).forEach(function (k) { keys.push({ key: k, label: k, wrap: k === 'detail' || k === 'payload_ringkas' || k === 'stack_trace' }); });
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

  async function loadSummary(options) {
    var opts = options || {};
    var result = await post('getSuperAdminSummary', { no_cache: opts.noCache === true, perf_rows: 260 });
    if (!result || result.ok === false) {
      var root = byId('sa-summary');
      if (root) root.innerHTML = '<div class="sa-error">' + escapeHtml((result && result.message) || 'Gagal memuat ringkasan.') + '</div>';
      return null;
    }
    var data = getData(result);
    renderSummary(data);
    if (activeTab === 'performance' && !tabLoaded.performance) {
      renderPerformanceFromSummary('CORE');
    }
    if (activeTab === 'monitor' && !tabLoaded.monitor) {
      renderPerformanceFromSummary('MONITOR');
    }
    return data;
  }

  async function loadPerformance(options) {
    var opts = options || {};
    activeTab = 'performance';
    if (!opts.force && lastSummary && !tabLoaded.performance) {
      tabLoaded.performance = true;
      renderPerformanceFromSummary('CORE');
      return;
    }
    setTabLoading('core performance');
    var result = await post('getSuperAdminPerformance', { max_rows: 420, category: 'CORE', no_cache: opts.noCache === true });
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.performance = true;
    renderPerformance(getData(result), 'Core App Performance');
  }

  async function loadMonitorPerformance(options) {
    var opts = options || {};
    activeTab = 'monitor';
    if (!opts.force && lastSummary && !tabLoaded.monitor) {
      tabLoaded.monitor = true;
      renderPerformanceFromSummary('MONITOR');
      return;
    }
    setTabLoading('monitor endpoint');
    var result = await post('getSuperAdminPerformance', { max_rows: 420, category: 'MONITOR', no_cache: opts.noCache === true });
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.monitor = true;
    renderPerformance(getData(result), 'Monitor Endpoint Performance');
  }

  async function loadErrors() {
    activeTab = 'errors';
    setTabLoading('error');
    var result = await post('getSuperAdminRecentErrors', { max_rows: 100 });
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.errors = true;
    renderErrors(getData(result));
  }

  async function loadSecurity() {
    activeTab = 'security';
    setTabLoading('security');
    var result = await post('getSuperAdminSecurity', { max_rows: 180 });
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.security = true;
    renderSecurity(getData(result));
  }

  async function loadLogs(type, q) {
    activeTab = 'logs';
    var container = byId('sa-log-result');
    if (container) container.innerHTML = '<div class="sa-loading">Mencari log...</div>';
    var result = await post('searchSuperAdminLogs', { log_type: type || DEFAULT_LOG_TYPE, q: q || '', max_rows: 60 });
    if (!result || result.ok === false) {
      if (container) container.innerHTML = '<div class="sa-error">' + escapeHtml((result && result.message) || 'Gagal mencari log.') + '</div>';
      return;
    }
    var data = getData(result);
    var items = data.items || [];
    var keys = [];
    if (items.length) Object.keys(items[0]).slice(0, 10).forEach(function (k) { keys.push({ key: k, label: k, wrap: k === 'detail' || k === 'payload_ringkas' || k === 'stack_trace' }); });
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
        if (tab === 'monitor') return loadMonitorPerformance();
        if (tab === 'errors') return loadErrors();
        if (tab === 'security') return loadSecurity();
        if (tab === 'logs') {
          activeTab = 'logs';
          tabLoaded.logs = true;
          return renderLogs({ items: [] });
        }
      });
    });
  }

  async function logoutSuperAdmin() {
    var ok = true;
    try { ok = window.confirm('Keluar dari Dashboard Super Admin?'); } catch (err) {}
    if (!ok) return;

    try {
      if (window.Auth && typeof window.Auth.logout === 'function') {
        await window.Auth.logout();
        return;
      }
      if (window.Api && typeof window.Api.post === 'function') {
        await window.Api.post('logout', {});
      }
    } catch (err2) {
      // logout lokal tetap dilakukan walau backend gagal merespons
    }

    try {
      if (window.Api && typeof window.Api.clearSensitiveClientState === 'function') {
        window.Api.clearSensitiveClientState({ keepDeviceId: true });
      }
    } catch (err3) {}

    try {
      if (window.Storage && window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS) {
        if (typeof window.Storage.remove === 'function') {
          window.Storage.remove(window.APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
          window.Storage.remove(window.APP_CONFIG.STORAGE_KEYS.PROFILE);
          window.Storage.remove(window.APP_CONFIG.STORAGE_KEYS.BOOTSTRAP_LITE);
        }
      }
    } catch (err4) {}

    try { localStorage.removeItem('tpk_session_token'); } catch (err5) {}
    try {
      if (window.Router && typeof window.Router.go === 'function') window.Router.go('login');
      else window.location.reload();
    } catch (err6) {
      window.location.reload();
    }
  }

  function bindHeader() {
    var refresh = byId('sa-refresh');
    if (refresh) refresh.addEventListener('click', function () { refreshAll({ noCache: true }); });
    var refreshCache = byId('sa-refresh-cache');
    if (refreshCache) refreshCache.addEventListener('click', function () { refreshAll({ noCache: false }); });

    var logout = byId('sa-logout');
    if (logout) logout.addEventListener('click', logoutSuperAdmin);
    var back = byId('sa-back-dashboard');
    if (back) back.addEventListener('click', function () {
      var router = getRouter();
      if (router && typeof router.go === 'function') router.go('dashboard');
    });
  }

  async function reloadActiveTab(options) {
    var opts = options || {};
    if (activeTab === 'performance') return loadPerformance({ force: true, noCache: opts.noCache === true });
    if (activeTab === 'monitor') return loadMonitorPerformance({ force: true, noCache: opts.noCache === true });
    if (activeTab === 'errors') return loadErrors();
    if (activeTab === 'security') return loadSecurity();
    if (activeTab === 'logs') return renderLogs({ items: [] });
  }

  async function refreshAll(options) {
    try {
      var opts = options || {};
      var summary = await loadSummary({ noCache: opts.noCache === true });
      if (summary) await reloadActiveTab(opts);
      showToast(opts.noCache ? 'Dashboard Super Admin diperbarui paksa.' : 'Dashboard Super Admin diperbarui dari cache/server.', 'success');
    } catch (err) {
      showToast(err && err.message ? err.message : 'Gagal memperbarui dashboard.', 'error');
    }
  }

  function init(target) {
    var rootTarget = target || byId('super-admin-screen') || document.body;
    renderShell(rootTarget);
    bindHeader();
    bindTabs();
    loadSummary({ noCache: false }).then(function () {
      renderPerformanceFromSummary('CORE');
      tabLoaded.performance = true;
    }).catch(function (err) {
      showToast(err && err.message ? err.message : 'Gagal memuat dashboard Super Admin.', 'error');
    });
  }

  window.SuperAdminDashboardView = {
    init: init,
    refresh: refreshAll,
    loadPerformance: loadPerformance,
    loadMonitorPerformance: loadMonitorPerformance,
    loadErrors: loadErrors,
    loadSecurity: loadSecurity,
    loadLogs: loadLogs
  };
})(window, document);
