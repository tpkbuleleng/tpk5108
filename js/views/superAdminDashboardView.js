(function (window, document) {
  'use strict';

  var ROOT_ID = 'super-admin-root';
  var DEFAULT_LOG_TYPE = 'PERFORMANCE';
  var activeTab = 'performance';
  var activeTimeWindow = 'today';
  var performanceFilter = 'ALL';
  var monitorFilter = 'ALL';
  var lastSummary = null;
  var currentRows = [];
  var currentDetailType = '';
  var selectedWorkbookKey = '';
  var DEFAULT_PAGE_SIZE = 10;
  var tablePageState = {};
  var tableRowsState = {};
  var workbookRegistryCache = [];
  var workbookCheckedMap = {};
  var workbookLastPayload = null;
  var workbookStateLoaded = false;
  var WORKBOOK_STATE_KEY = 'tpk_sa_workbook_health_checked_v1';

  var tabLoaded = {
    performance: false,
    monitor: false,
    traffic: false,
    errors: false,
    security: false,
    workbook: false,
    backend: false,
    frontend: false,
    logs: false
  };

  function byId(id) { return document.getElementById(id); }

  function loadWorkbookStateFromStorage() {
    if (workbookStateLoaded) return;
    workbookStateLoaded = true;
    try {
      var raw = window.localStorage && window.localStorage.getItem(WORKBOOK_STATE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.checked_map && typeof parsed.checked_map === 'object') {
        workbookCheckedMap = parsed.checked_map || {};
      }
      if (parsed && Array.isArray(parsed.registry_cache)) {
        workbookRegistryCache = parsed.registry_cache || [];
      }
    } catch (err) {}
  }

  function saveWorkbookStateToStorage() {
    try {
      if (!window.localStorage) return;
      var payload = {
        saved_at: new Date().toISOString(),
        checked_map: workbookCheckedMap || {},
        registry_cache: workbookRegistryCache || []
      };
      window.localStorage.setItem(WORKBOOK_STATE_KEY, JSON.stringify(payload));
    } catch (err) {}
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getApi() { return window.Api || null; }

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

  function formatWita(value) {
    if (!value) return '-';
    try {
      var d = value instanceof Date ? value : new Date(value);
      if (isNaN(d.getTime())) return String(value);
      return d.toLocaleString('id-ID', {
        timeZone: 'Asia/Makassar',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      }).replace(/\./g, ':') + ' WITA';
    } catch (err) {
      return String(value);
    }
  }

  function isTimeKey(key) {
    key = String(key || '').toLowerCase();
    return key === 'waktu' || key === 'timestamp' || key === 'latest_at' || key === 'last_seen' || key === 'last_login_at' || key === 'issued_at' || key === 'expired_at' || key.indexOf('_at') >= 0;
  }

  function humanText(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text) return '';
    var map = {
      CORE_APP_ONLY: 'Core App saja',
      CORE: 'Core',
      MONITOR: 'Monitor',
      PERFORMANCE: 'Performance',
      SECURITY: 'Security',
      ERROR: 'Error',
      LOGIN: 'Login',
      ACTIVITY: 'Aktivitas',
      SUPER_ADMIN_ACTION: 'Aksi Super Admin',
      LOG_USER_ERROR: 'Log user error',
      LOG_SECURITY_EVENT: 'Log security event',
      LOG_PERFORMANCE: 'Log performance',
      TOKEN_STORE: 'Token store',
      ACTIVE_SESSION_INDEX: 'Active session index',
      log_performance: 'log performance',
      log_user_error: 'log user error',
      log_user_login: 'log user login',
      log_security_event: 'log security event',
      super_admin_action_log: 'super admin action log',
      max_open_sheet_ms: 'Maks buka sheet',
      max_read_rows: 'Maks baca baris',
      duration_ms: 'Durasi ms',
      request_id: 'Request ID',
      id_pengguna: 'ID Pengguna',
      device_id: 'Device ID',
      app_version: 'App version',
      NOT_CHECKED: 'Belum dicek',
      REVIEW: 'Perlu review',
      INFO: 'Info',
      UNKNOWN_SHEET_REVIEW: 'Sheet perlu review',
      HEADER_EXTRA_REVIEW: 'Header tambahan review',
      OPTIONAL_SHEET_NOT_FOUND: 'Sheet opsional tidak ditemukan',
      MISSING_SHEET: 'Sheet hilang',
      HEADER_MISSING: 'Header hilang',
      WORKBOOK_CAPACITY_WARNING: 'Risiko kapasitas workbook'
    };
    if (map[text]) return map[text];
    return text.replace(/_/g, ' ');
  }

  function humanLabel(value) {
    var text = humanText(value);
    if (!text) return '';
    return text.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function displayCellValue(value, key) {
    if (value === undefined || value === null || value === '') return '-';
    var k = String(key || '').toLowerCase();
    if (isTimeKey(k)) return escapeHtml(formatWita(value));
    var text = String(value);
    if (k.indexOf('detail') >= 0 || k.indexOf('payload') >= 0 || k.indexOf('stack') >= 0 || k.indexOf('pesan') >= 0) return escapeHtml(humanText(text));
    return escapeHtml(humanText(text));
  }

  function statusClass(status) {
    var s = String(status || '').toUpperCase();
    if (s === 'GREEN' || s === 'SUCCESS') return 'sa-status-green';
    if (s === 'RED' || s === 'ERROR' || s === 'FAILED' || s === 'CRITICAL') return 'sa-status-red';
    return 'sa-status-yellow';
  }

  function badgeStatus(status) {
    return '<span class="sa-badge ' + statusClass(status) + '">' + escapeHtml(humanText(status || '-')) + '</span>';
  }

  function timePayload(extra) {
    return Object.assign({ time_window: activeTimeWindow }, extra || {});
  }

  function getTimeLabel(key) {
    var map = {
      today: 'Hari ini',
      '1h': '1 jam terakhir',
      '3h': '3 jam terakhir',
      '6h': '6 jam terakhir',
      '24h': '24 jam terakhir',
      '7d': '7 hari terakhir',
      all: 'Semua sampel'
    };
    return map[key || activeTimeWindow] || 'Periode terpilih';
  }

  function post(action, payload) {
    var api = getApi();
    if (!api || typeof api.post !== 'function') {
      return Promise.resolve({ ok: false, message: 'Api.post belum tersedia.' });
    }
    return api.post(action, payload || {});
  }


  function reportClientPerf(action, startedAt, extra) {
    try {
      var api = getApi();
      if (!api || typeof api.reportClientPerformance !== 'function') return;
      var duration = Math.max(0, Date.now() - (startedAt || Date.now()));
      api.reportClientPerformance(action, Object.assign({
        modul: 'superAdminDashboardView.js',
        category: 'super_admin_ui',
        duration_ms: duration,
        total_ms: duration,
        status: 'SUCCESS',
        time_window: activeTimeWindow,
        active_tab: activeTab
      }, extra || {}));
    } catch (err) {}
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
          '.sa-sticky-monitor{position:sticky;top:0;z-index:30;background:rgba(243,247,251,.94);backdrop-filter:blur(12px);padding-bottom:10px;border-bottom:1px solid rgba(219,230,242,.7)}',
          '.sa-topbar{display:flex;justify-content:space-between;gap:18px;align-items:center;margin-bottom:12px}',
          '.sa-title h2{margin:0;font-size:1.55rem;letter-spacing:-.02em}.sa-title p{margin:.28rem 0 0;color:var(--sa-muted);font-size:.94rem}',
          '.sa-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.sa-btn{border:1px solid #cbd5e1;background:#fff;border-radius:13px;padding:9px 13px;font-weight:800;cursor:pointer;box-shadow:0 3px 12px rgba(15,23,42,.04)}.sa-btn-primary{background:#0f172a;color:#fff;border-color:#0f172a}.sa-btn-soft{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}.sa-btn-danger{background:#fff;color:#991b1b}',
          '.sa-controls{display:flex;justify-content:space-between;gap:10px;align-items:center;margin:10px 0 0;flex-wrap:wrap}.sa-time-filter{display:flex;gap:8px;align-items:center;background:#fff;border:1px solid var(--sa-line);border-radius:16px;padding:9px 11px;box-shadow:0 6px 18px rgba(15,23,42,.04)}.sa-time-filter label{font-weight:800}.sa-time-filter select{border:1px solid #cbd5e1;border-radius:12px;padding:8px;background:#fff}',
          '.sa-hero{background:linear-gradient(135deg,#0ea5e9,#1d4ed8);border-radius:22px;padding:16px 18px;color:#fff;box-shadow:0 18px 45px rgba(29,78,216,.18);margin-bottom:14px}',
          '.sa-hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;align-items:stretch}.sa-health-pill{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:8px 12px;font-weight:900;background:rgba(255,255,255,.18);backdrop-filter:blur(8px)}',
          '.sa-health-pill.sa-status-green{background:#dcfce7;color:#166534}.sa-health-pill.sa-status-yellow{background:#fef3c7;color:#92400e}.sa-health-pill.sa-status-red{background:#fee2e2;color:#991b1b}',
          '.sa-hero h3{margin:8px 0 4px;font-size:1.2rem}.sa-hero p{margin:0;color:rgba(255,255,255,.85)}.sa-hero-side{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
          '.sa-mini{border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.13);border-radius:16px;padding:10px;text-align:left;color:#fff}.sa-mini span{display:block;font-size:.78rem;color:rgba(255,255,255,.82)}.sa-mini strong{font-size:1.25rem}.sa-clickable{cursor:pointer;transition:transform .12s ease,box-shadow .12s ease}.sa-clickable:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(15,23,42,.12)}.sa-card.is-selected{outline:3px solid rgba(29,78,216,.28);border-color:#60a5fa;background:#eff6ff}.sa-workbook-tools{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin:8px 0 12px}.sa-inline-actions{display:flex;gap:8px;flex-wrap:wrap}',
          '.sa-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:12px 0}.sa-card{background:var(--sa-card);border:1px solid var(--sa-line);border-radius:18px;padding:13px 14px;box-shadow:0 10px 24px rgba(15,23,42,.05);min-height:84px}.sa-card__label{display:block;color:var(--sa-muted);font-size:.78rem}.sa-card__value{display:block;font-size:1.55rem;margin:.16rem 0;color:#0f172a}.sa-card__hint{color:#94a3b8}.sa-card.sa-warn .sa-card__value{color:#b45309}.sa-card.sa-danger .sa-card__value{color:#b91c1c}',
          '.sa-layout{display:grid;grid-template-columns:1.1fr .72fr .88fr;gap:12px;margin:12px 0}.sa-workspace{display:block}.sa-panel{background:#fff;border:1px solid var(--sa-line);border-radius:20px;padding:14px;box-shadow:0 10px 28px rgba(15,23,42,.05)}',
          '.sa-detail-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.38);z-index:100;display:none;align-items:flex-start;justify-content:flex-end;padding:70px 24px 24px}.sa-detail-backdrop.active{display:flex}.sa-detail-modal{width:min(560px,calc(100vw - 48px));max-height:calc(100vh - 96px);overflow:auto;background:#fff;border:1px solid #cbd5e1;border-radius:22px;box-shadow:0 30px 90px rgba(15,23,42,.3);padding:16px}.sa-detail-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:8px}.sa-detail-close{border:1px solid #cbd5e1;border-radius:999px;background:#fff;font-weight:900;cursor:pointer;padding:6px 10px}',
          '.sa-panel h3{margin:0 0 10px;font-size:1.03rem}.sa-panel h4{margin:12px 0 8px}.sa-list{margin:0;padding-left:20px}.sa-list li{margin:6px 0;line-height:1.35}.sa-critical-list{display:grid;gap:8px}.sa-critical-item{border:1px solid #e2e8f0;border-left-width:5px;border-radius:14px;padding:9px 10px;background:#fff}.sa-critical-item strong{display:block}.sa-critical-red{border-left-color:#ef4444;background:#fff7f7}.sa-critical-yellow{border-left-color:#f59e0b;background:#fffbeb}.sa-critical-green{border-left-color:#22c55e;background:#f0fdf4}',
          '.sa-table-wrap{overflow:auto;max-width:100%}.sa-table{width:100%;border-collapse:collapse;font-size:.84rem;white-space:nowrap}.sa-table th,.sa-table td{padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}.sa-table th{position:sticky;top:0;color:#475569;background:#f8fafc;z-index:1}.sa-table td.sa-wrap{white-space:normal;min-width:240px}.sa-table tr[data-sa-row]{cursor:pointer}.sa-table tr[data-sa-row]:hover{background:#f8fafc}',
          '.sa-pager{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 0 0;color:#64748b}.sa-pager__buttons{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.sa-page-btn{border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:6px 9px;font-weight:800;cursor:pointer}.sa-page-btn.active{background:#0f172a;color:#fff;border-color:#0f172a}.sa-page-btn[disabled]{opacity:.45;cursor:not-allowed}',
          '.sa-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.sa-tab{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:9px 14px;font-weight:800;cursor:pointer}.sa-tab.active{background:#0f172a;color:#fff;border-color:#0f172a}',
          '.sa-filter{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.sa-filter input,.sa-filter select{border:1px solid #cbd5e1;border-radius:12px;padding:9px;min-width:160px;background:#fff}.sa-quick-filter{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.sa-chip{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:7px 10px;font-weight:800;cursor:pointer}.sa-chip.active{background:#0f172a;color:#fff;border-color:#0f172a}',
          '.sa-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;font-weight:800;font-size:.72rem}.sa-status-green{background:#dcfce7;color:#166534}.sa-status-yellow{background:#fef3c7;color:#92400e}.sa-status-red{background:#fee2e2;color:#991b1b}',
          '.sa-detail-grid{display:grid;gap:8px}.sa-detail-row{border:1px solid #e2e8f0;border-radius:12px;padding:8px;background:#f8fafc}.sa-detail-row small{display:block;color:#64748b;font-weight:800}.sa-detail-row span{overflow-wrap:anywhere}.sa-reco{border-left:4px solid #3b82f6;background:#eff6ff;border-radius:12px;padding:9px;margin-top:10px}',
          '.sa-muted{color:var(--sa-muted)}.sa-error{color:#991b1b;background:#fee2e2;border-radius:14px;padding:12px}.sa-loading{color:#475569;background:#f8fafc;border-radius:14px;padding:12px}.sa-footnote{font-size:.78rem;color:#64748b;margin-top:8px}',
          '@media(max-width:1240px){.sa-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.sa-hero-grid,.sa-layout,.sa-workspace{grid-template-columns:1fr}.sa-inspector{position:static}}',
          '@media(max-width:760px){.super-admin-page{padding:12px;width:calc(100% - 24px)}.sa-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sa-topbar{display:block}.sa-actions{margin-top:10px}.sa-hero-side{grid-template-columns:1fr}.sa-table{font-size:.78rem}}',
        '</style>',
        '<header class="sa-topbar">',
          '<div class="sa-title"><h2>Super Admin - System Monitor</h2><p>Command center ringkas untuk performa, error, security/session, log, lalu lintas pengguna, dan kesehatan aplikasi TPK.</p></div>',
          '<div class="sa-actions">',
            '<button type="button" class="sa-btn sa-btn-soft" id="sa-refresh-cache">Refresh Data</button>',
            '<button type="button" class="sa-btn sa-btn-primary" id="sa-refresh">Refresh Paksa</button>',
            '<button type="button" class="sa-btn sa-btn-danger" id="sa-logout">Keluar</button>',
          '</div>',
        '</header>',
        '<section id="sa-summary"><div class="sa-loading">Memuat ringkasan...</div></section>',
        '<nav class="sa-tabs" aria-label="Menu Super Admin">',
          '<button class="sa-tab active" data-sa-tab="performance" type="button">Core Performance</button>',
          '<button class="sa-tab" data-sa-tab="monitor" type="button">Monitor Endpoint</button>',
          '<button class="sa-tab" data-sa-tab="traffic" type="button">Lalu Lintas Pengguna</button>',
          '<button class="sa-tab" data-sa-tab="errors" type="button">Error</button>',
          '<button class="sa-tab" data-sa-tab="security" type="button">Security</button>',
          '<button class="sa-tab" data-sa-tab="workbook" type="button">Workbook Health</button>',
          '<button class="sa-tab" data-sa-tab="backend" type="button">Backend Health</button>',
          '<button class="sa-tab" data-sa-tab="frontend" type="button">Frontend/PWA Health</button>',
          '<button class="sa-tab" data-sa-tab="logs" type="button">Log Explorer</button>',
        '</nav>',
        '<div class="sa-workspace">',
          '<section id="sa-tab-content" class="sa-panel"><div class="sa-loading">Memuat data...</div></section>',
        '</div>',
        '<div id="sa-detail-backdrop" class="sa-detail-backdrop" aria-hidden="true">',
          '<aside id="sa-detail-panel" class="sa-detail-modal" role="dialog" aria-modal="true"><div class="sa-detail-head"><div><h3>Detail</h3><p class="sa-muted">Klik baris tabel untuk membuka detail.</p></div><button type="button" class="sa-detail-close" id="sa-detail-close">Tutup</button></div></aside>',
        '</div>',
      '</div>'
    ].join('');
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
    var critical = data.critical_status || {};
    var criticalItems = critical.items || [];
    var periodLabel = data.time_label || getTimeLabel();
    var periodEl = byId('sa-period-label');
    if (periodEl) periodEl.textContent = 'Periode: ' + periodLabel;

    root.innerHTML = [
      '<div class="sa-sticky-monitor"><section class="sa-hero"><div class="sa-hero-grid"><div>',
        '<span class="sa-health-pill ', statusClass(health), '">Status Core App: ', escapeHtml(health), '</span>',
        '<h3>Health Scope: ', escapeHtml(humanText(data.health_scope || 'CORE_APP_ONLY')), '</h3>',
        '<p>Periode: ', escapeHtml(periodLabel), ' · Update: ', escapeHtml(formatWita(data.generated_at)), ' · Service: ', escapeHtml(fmt(data.service_version)), ' · Ambang lambat: ', escapeHtml(fmt(data.slow_threshold_ms)), ' ms · Cache: ', escapeHtml(data.cache_hit ? 'HIT' : 'MISS'), '</p>',
      '</div><div class="sa-hero-side">',
        '<button type="button" class="sa-mini sa-clickable" data-sa-shortcut="core_all"><span>Core request</span><strong>', escapeHtml(fmtNumber(cards.core_request_today)), '</strong></button>',
        '<button type="button" class="sa-mini sa-clickable" data-sa-shortcut="monitor_all"><span>Monitor request</span><strong>', escapeHtml(fmtNumber(cards.monitor_request_today)), '</strong></button>',
        '<button type="button" class="sa-mini sa-clickable" data-sa-shortcut="core_slow"><span>Core slow</span><strong>', escapeHtml(fmtNumber(cards.slow_endpoint_today)), '</strong></button>',
        '<button type="button" class="sa-mini sa-clickable" data-sa-shortcut="monitor_slow"><span>Monitor slow</span><strong>', escapeHtml(fmtNumber(cards.monitor_slow_today)), '</strong></button>',
      '</div></div></section>',
      '<section class="sa-controls"><div class="sa-time-filter"><label for="sa-time-window">Waktu Monitoring</label><select id="sa-time-window"><option value="today">Hari ini</option><option value="1h">1 jam terakhir</option><option value="3h">3 jam terakhir</option><option value="6h">6 jam terakhir</option><option value="24h">24 jam terakhir</option><option value="7d">7 hari terakhir</option><option value="all">Semua sampel</option></select></div><p class="sa-muted" id="sa-period-label">Periode: ', escapeHtml(periodLabel), '</p></section></div>',
      '<section class="sa-grid">',
        cardHtml('Request periode ini', cards.request_today, 'Semua log performance'),
        cardHtml('Core endpoint lambat', cards.slow_endpoint_today, 'Tidak termasuk monitor', cards.slow_endpoint_today > 0 ? 'sa-warn' : ''),
        cardHtml('Error periode ini', cards.error_today, 'Dari log user error', cards.error_today > 0 ? 'sa-danger' : ''),
        cardHtml('Security deny', cards.security_deny_today, 'Dari log security event', cards.security_deny_today > 0 ? 'sa-warn' : ''),
        cardHtml('Login gagal', cards.login_failed_today, 'Dari log user login', cards.login_failed_today > 0 ? 'sa-warn' : ''),
        cardHtml('App version', cards.app_version || '-', 'Versi backend aktif'),
      '</section>',
      '<section class="sa-layout">',
        '<div class="sa-panel"><h3>Top Masalah Periode Ini</h3><ol class="sa-list">', issues.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join(''), '</ol><p class="sa-footnote">Status utama memakai Core App Endpoint. Endpoint monitor dipisahkan agar tidak mencemari health aplikasi kader.</p></div>',
        '<div class="sa-panel"><h3>Ringkasan Teknis</h3><p class="sa-muted">Core action terbaca: ', escapeHtml(fmtNumber(coreGroups.length)), '</p><p class="sa-muted">Monitor action terbaca: ', escapeHtml(fmtNumber(monitorGroups.length)), '</p><p class="sa-muted">Security group: ', escapeHtml(fmtNumber((data.security_groups || []).length)), '</p><p class="sa-muted">Recent error sample: ', escapeHtml(fmtNumber((data.recent_errors || []).length)), '</p></div>',
        '<div class="sa-panel"><h3>Status Kritis</h3><div class="sa-critical-list">',
          (criticalItems.length ? criticalItems.map(function (item) {
            var sev = String(item.severity || 'GREEN').toLowerCase();
            return '<div class="sa-critical-item sa-critical-' + escapeHtml(sev) + '"><strong>' + escapeHtml(item.title || '-') + '</strong><span class="sa-muted">' + escapeHtml(item.message || '') + '</span></div>';
          }).join('') : '<div class="sa-critical-item sa-critical-green"><strong>Normal</strong><span class="sa-muted">Tidak ada status kritis pada sampel log terbaru.</span></div>'),
        '</div><p class="sa-footnote">Early warning berbasis log periode terpilih, bukan pengganti audit manual.</p></div>',
      '</section>'
    ].join('');
    bindSummaryShortcuts();
    bindTimeSelect();
  }

  function setActiveTab(tab) {
    activeTab = tab || activeTab;
    var tabs = document.querySelectorAll('[data-sa-tab]');
    Array.prototype.forEach.call(tabs, function (b) {
      b.classList.toggle('active', b.getAttribute('data-sa-tab') === activeTab);
    });
  }

  function bindSummaryShortcuts() {
    var buttons = document.querySelectorAll('[data-sa-shortcut]');
    Array.prototype.forEach.call(buttons, function (btn) {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-sa-shortcut');
        if (key === 'core_all') { performanceFilter = 'ALL'; setActiveTab('performance'); tabLoaded.performance = true; return renderPerformanceFromSummary('CORE'); }
        if (key === 'core_slow') { performanceFilter = 'SLOW'; setActiveTab('performance'); tabLoaded.performance = true; return renderPerformanceFromSummary('CORE'); }
        if (key === 'monitor_all') { monitorFilter = 'ALL'; setActiveTab('monitor'); tabLoaded.monitor = true; return renderPerformanceFromSummary('MONITOR'); }
        if (key === 'monitor_slow') { monitorFilter = 'SLOW'; setActiveTab('monitor'); tabLoaded.monitor = true; return renderPerformanceFromSummary('MONITOR'); }
      });
    });
  }

  function getFilteredPerformanceRows(rows, category) {
    var filter = category === 'MONITOR' ? monitorFilter : performanceFilter;
    var slowMs = Number((lastSummary && lastSummary.slow_threshold_ms) || 1500) || 1500;
    return (rows || []).filter(function (row) {
      if (filter === 'SLOW') return Number(row.slow_count || 0) > 0 || Number(row.max_ms || 0) > slowMs;
      if (filter === 'RED') return String(row.status || '').toUpperCase() === 'RED';
      if (filter === 'GREEN') return String(row.status || '').toUpperCase() === 'GREEN';
      return true;
    });
  }

  function renderQuickFilters(category) {
    var current = category === 'MONITOR' ? monitorFilter : performanceFilter;
    var chips = [
      { key: 'ALL', label: 'Semua' },
      { key: 'SLOW', label: 'Lambat' },
      { key: 'RED', label: 'Merah' },
      { key: 'GREEN', label: 'Hijau' }
    ];
    return '<div class="sa-quick-filter" data-sa-filter-category="' + escapeHtml(category || 'CORE') + '">' + chips.map(function (c) {
      return '<button type="button" class="sa-chip ' + (current === c.key ? 'active' : '') + '" data-sa-perf-filter="' + c.key + '">' + escapeHtml(c.label) + '</button>';
    }).join('') + '</div>';
  }

  function bindQuickFilters(category) {
    var wrap = document.querySelector('[data-sa-filter-category="' + (category || 'CORE') + '"]');
    if (!wrap) return;
    var chips = wrap.querySelectorAll('[data-sa-perf-filter]');
    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener('click', function () {
        var filter = chip.getAttribute('data-sa-perf-filter') || 'ALL';
        if (category === 'MONITOR') monitorFilter = filter; else performanceFilter = filter;
        renderPerformanceFromSummary(category === 'MONITOR' ? 'MONITOR' : 'CORE');
      });
    });
  }

  function getTableKey(detailType) {
    return String(detailType || 'table');
  }

  function clampPage(page, totalPages) {
    var p = Number(page || 1);
    if (!p || isNaN(p) || p < 1) p = 1;
    if (totalPages && p > totalPages) p = totalPages;
    return p;
  }

  function paginationHtml(tableKey, rowsLength, page, pageSize) {
    rowsLength = Number(rowsLength || 0);
    pageSize = Number(pageSize || DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;
    if (rowsLength <= pageSize) return '';

    var totalPages = Math.ceil(rowsLength / pageSize);
    page = clampPage(page, totalPages);
    var start = ((page - 1) * pageSize) + 1;
    var end = Math.min(rowsLength, page * pageSize);
    var buttons = [];

    buttons.push('<button type="button" class="sa-page-btn" data-sa-page="prev" data-sa-table-key="' + escapeHtml(tableKey) + '" ' + (page <= 1 ? 'disabled' : '') + '>Sebelumnya</button>');

    var from = Math.max(1, page - 2);
    var to = Math.min(totalPages, page + 2);
    if (from > 1) {
      buttons.push('<button type="button" class="sa-page-btn" data-sa-page="1" data-sa-table-key="' + escapeHtml(tableKey) + '">1</button>');
      if (from > 2) buttons.push('<span class="sa-muted">…</span>');
    }
    for (var i = from; i <= to; i += 1) {
      buttons.push('<button type="button" class="sa-page-btn ' + (i === page ? 'active' : '') + '" data-sa-page="' + i + '" data-sa-table-key="' + escapeHtml(tableKey) + '">' + i + '</button>');
    }
    if (to < totalPages) {
      if (to < totalPages - 1) buttons.push('<span class="sa-muted">…</span>');
      buttons.push('<button type="button" class="sa-page-btn" data-sa-page="' + totalPages + '" data-sa-table-key="' + escapeHtml(tableKey) + '">' + totalPages + '</button>');
    }

    buttons.push('<button type="button" class="sa-page-btn" data-sa-page="next" data-sa-table-key="' + escapeHtml(tableKey) + '" ' + (page >= totalPages ? 'disabled' : '') + '>Berikutnya</button>');

    return [
      '<div class="sa-pager" data-sa-pager="' + escapeHtml(tableKey) + '">',
        '<span>Menampilkan ', escapeHtml(start), '–', escapeHtml(end), ' dari ', escapeHtml(rowsLength), ' baris</span>',
        '<div class="sa-pager__buttons">', buttons.join(''), '</div>',
      '</div>'
    ].join('');
  }

  function tableHtml(headers, rows, detailType) {
    rows = rows || [];
    currentRows = rows;
    currentDetailType = detailType || '';

    var tableKey = getTableKey(detailType);
    tableRowsState[tableKey] = rows;
    var pageSize = DEFAULT_PAGE_SIZE;
    var totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    var page = clampPage(tablePageState[tableKey] || 1, totalPages);
    tablePageState[tableKey] = page;
    var startIndex = (page - 1) * pageSize;
    var pageRows = rows.slice(startIndex, startIndex + pageSize);

    return [
      '<div class="sa-table-wrap"><table class="sa-table"><thead><tr>',
      headers.map(function (h) { return '<th>' + escapeHtml(humanLabel(h.label)) + '</th>'; }).join(''),
      '</tr></thead><tbody>',
      pageRows.length ? pageRows.map(function (row, idx) {
        var originalIdx = startIndex + idx;
        return '<tr ' + (detailType ? 'data-sa-row="' + originalIdx + '"' : '') + '>' + headers.map(function (h) {
          var cls = h.wrap ? ' class="sa-wrap"' : '';
          var value = h.formatter ? h.formatter(row[h.key], row) : displayCellValue(row[h.key], h.key);
          return '<td' + cls + '>' + value + '</td>';
        }).join('') + '</tr>';
      }).join('') : '<tr><td colspan="' + headers.length + '" class="sa-muted">Tidak ada data.</td></tr>',
      '</tbody></table></div>',
      paginationHtml(tableKey, rows.length, page, pageSize)
    ].join('');
  }

  function bindPagination(detailType, renderFn) {
    var tableKey = getTableKey(detailType);
    var pager = document.querySelector('[data-sa-pager="' + tableKey.replace(/"/g, '\"') + '"]');
    if (!pager || pager.dataset.bound === '1') return;
    pager.dataset.bound = '1';
    var buttons = pager.querySelectorAll('[data-sa-page]');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        var rowsLength = (tableRowsState[tableKey] || []).length;
        var totalPages = Math.max(1, Math.ceil(rowsLength / DEFAULT_PAGE_SIZE));
        var current = clampPage(tablePageState[tableKey] || 1, totalPages);
        var raw = btn.getAttribute('data-sa-page');
        var nextPage = raw === 'prev' ? current - 1 : (raw === 'next' ? current + 1 : Number(raw || 1));
        tablePageState[tableKey] = clampPage(nextPage, totalPages);
        if (typeof renderFn === 'function') renderFn();
      });
    });
  }

  function bindDetailRows(rows, detailType) {
    rows = rows || [];
    var trs = document.querySelectorAll('[data-sa-row]');
    Array.prototype.forEach.call(trs, function (tr) {
      tr.addEventListener('click', function () {
        var idx = Number(tr.getAttribute('data-sa-row') || -1);
        if (idx >= 0 && rows[idx]) showInspector(detailType, rows[idx]);
      });
    });
  }

  function performanceHeaders() {
    return [
      { key: 'action', label: 'Action' },
      { key: 'category', label: 'Kategori' },
      { key: 'count', label: 'Jumlah' },
      { key: 'avg_ms', label: 'Rata-rata ms' },
      { key: 'max_ms', label: 'Maks ms' },
      { key: 'max_open_sheet_ms', label: 'Maks buka sheet' },
      { key: 'max_read_rows', label: 'Maks baca baris' },
      { key: 'slow_count', label: 'Lambat' },
      { key: 'status', label: 'Status', formatter: function (v) { return badgeStatus(v); } }
    ];
  }

  function trafficHeaders() {
    return [
      { key: 'id_pengguna', label: 'User' },
      { key: 'role', label: 'Role' },
      { key: 'total_request', label: 'Request' },
      { key: 'slow_request', label: 'Lambat' },
      { key: 'login_success', label: 'Login Sukses' },
      { key: 'login_failed', label: 'Login Gagal' },
      { key: 'device_count', label: 'Device' },
      { key: 'session_status', label: 'Status Login' },
      { key: 'online_session_count', label: 'Online' },
      { key: 'offline_session_count', label: 'Offline' },
      { key: 'last_seen', label: 'Terakhir Aktif' },
      { key: 'avg_ms', label: 'Rata-rata ms' },
      { key: 'max_ms', label: 'Maks ms' },
      { key: 'last_action', label: 'Aksi terakhir' },
      { key: 'status', label: 'Status', formatter: function (v) { return badgeStatus(v); } }
    ];
  }

  function renderPerformance(data, title) {
    var target = byId('sa-tab-content');
    if (!target) return;
    var category = String(data.category || 'CORE').toUpperCase();
    var rows = getFilteredPerformanceRows(data.groups || [], category);
    target.innerHTML = [
      '<h3>', escapeHtml(title || 'Core App Performance'), '</h3>',
      '<p class="sa-muted">Periode: ', escapeHtml(data.time_label || getTimeLabel()), ' · Kategori: ', escapeHtml(humanText(category)), ' · Total baris dianalisis: ', escapeHtml(fmtNumber(data.total_rows)), ' · Sumber baris: ', escapeHtml(fmtNumber(data.source_rows)), ' · Ambang lambat: ', escapeHtml(fmt(data.slow_threshold_ms)), ' ms · Cache: ', escapeHtml(data.cache_hit ? 'HIT' : 'MISS'), ' · Filter: ', escapeHtml(humanText(category === 'MONITOR' ? monitorFilter : performanceFilter)), '</p>',
      renderQuickFilters(category),
      tableHtml(performanceHeaders(), rows, 'performance')
    ].join('');
    bindQuickFilters(category);
    bindDetailRows(rows, 'performance');
    bindPagination('performance', function () { renderPerformance(data, title); });
  }

  function renderPerformanceFromSummary(category) {
    var data = lastSummary || {};
    if (category === 'MONITOR') {
      renderPerformance({
        generated_at: data.generated_at,
        time_label: data.time_label,
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
      time_label: data.time_label,
      category: 'CORE',
      cache_hit: data.cache_hit,
      slow_threshold_ms: data.slow_threshold_ms,
      total_rows: (data.core_performance || []).reduce(function (n, g) { return n + Number(g.count || 0); }, 0),
      source_rows: 0,
      groups: data.core_performance || []
    }, 'Core App Performance');
  }

  function renderTraffic(data) {
    var target = byId('sa-tab-content');
    if (!target) return;
    var rows = data.items || [];
    target.innerHTML = [
      '<h3>Lalu Lintas Pengguna</h3>',
      '<p class="sa-muted">Periode: ', escapeHtml(data.time_label || getTimeLabel()), ' · User terbaca: ', escapeHtml(fmtNumber(data.total_users)), ' · Performance rows: ', escapeHtml(fmtNumber(data.total_perf_rows)), ' · Login rows: ', escapeHtml(fmtNumber(data.total_login_rows)), ' · Activity rows: ', escapeHtml(fmtNumber(data.total_activity_rows)), ' · Session aktif: ', escapeHtml(fmtNumber(data.active_session_users || 0)), ' · Online: ', escapeHtml(fmtNumber(data.online_users || 0)), ' · Cache: ', escapeHtml(data.cache_hit ? 'HIT' : 'MISS'), '</p>',
      tableHtml(trafficHeaders(), rows, 'traffic')
    ].join('');
    bindDetailRows(rows, 'traffic');
    bindPagination('traffic', function () { renderTraffic(data); });
  }


  function workbookHealthHeaders() {
    return [
      { key: 'sheet_name', label: 'Sheet' },
      { key: 'sheet_role', label: 'Role' },
      { key: 'status', label: 'Status', formatter: function (v) { return badgeStatus(v); } },
      { key: 'severity', label: 'Severity' },
      { key: 'issue_type', label: 'Masalah' },
      { key: 'last_row', label: 'Baris' },
      { key: 'last_column', label: 'Kolom' },
      { key: 'usage_pct', label: 'Kapasitas %' },
      { key: 'header_status', label: 'Status Header' },
      { key: 'recommendation', label: 'Rekomendasi', wrap: true }
    ];
  }

  function workbookListHeaders() {
    return [
      { key: 'workbook_key', label: 'Workbook' },
      { key: 'workbook_type', label: 'Jenis' },
      { key: 'file_name', label: 'Nama File' },
      { key: 'status', label: 'Status', formatter: function (v) { return badgeStatus(v); } },
      { key: 'issue_count', label: 'Isu' },
      { key: 'sheet_count', label: 'Sheet' },
      { key: 'expected_count', label: 'Schema' },
      { key: 'usage_pct', label: 'Kapasitas %' },
      { key: 'last_checked_at', label: 'Terakhir Dicek' },
      { key: 'recommendation', label: 'Catatan', wrap: true }
    ];
  }

  function workbookSummaryCards(data) {
    var s = (data && data.summary) || {};
    return [
      '<div class="sa-grid" style="grid-template-columns:repeat(6,minmax(0,1fr));margin-top:0">',
        cardHtml('Workbook terdaftar', s.total_workbooks || 0, 'Dari workbook_registry', ''),
        cardHtml('Sudah dicek', s.checked_workbooks || 0, 'Pada sesi/cache ini', ''),
        cardHtml('Sheet hilang', s.missing_sheet || 0, 'Sheet wajib', s.missing_sheet ? 'sa-danger' : ''),
        cardHtml('Header bermasalah', s.header_mismatch || 0, 'Header wajib/review', s.header_mismatch ? 'sa-danger' : ''),
        cardHtml('Perlu review', (s.unknown_sheet || 0) + (s.review || 0), 'Opsional/unknown', (s.unknown_sheet || s.review) ? 'sa-warn' : ''),
        cardHtml('Risiko kapasitas', s.capacity_warning || 0, 'Cell usage', s.capacity_warning ? 'sa-warn' : ''),
      '</div>'
    ].join('');
  }

  function isWorkbookCheckedCard(w) {
    if (!w) return false;
    var status = String(w.status || '').toUpperCase();
    return !!(w.last_checked_at || (status && status !== 'BELUM DICEK' && status !== 'NOT_CHECKED'));
  }

  function mergeWorkbookCards(rows) {
    loadWorkbookStateFromStorage();
    rows = rows || [];
    rows.forEach(function (w) {
      if (!w || !w.workbook_key) return;
      var key = String(w.workbook_key || '').toUpperCase();
      var existing = workbookCheckedMap[key] || {};
      var incomingChecked = isWorkbookCheckedCard(w);
      var existingChecked = isWorkbookCheckedCard(existing);
      // Jangan hapus status hasil cek yang sudah ada hanya karena Refresh daftar mengirim card registry kosong/belum dicek.
      if (existingChecked && !incomingChecked) {
        workbookCheckedMap[key] = Object.assign({}, w, existing);
      } else {
        workbookCheckedMap[key] = Object.assign({}, existing, w);
      }
    });
    if (rows.length > workbookRegistryCache.length) workbookRegistryCache = rows.slice();
    if (!workbookRegistryCache.length && rows.length) workbookRegistryCache = rows.slice();
    if (workbookRegistryCache.length) {
      var known = {};
      workbookRegistryCache.forEach(function (w) { if (w && w.workbook_key) known[String(w.workbook_key).toUpperCase()] = true; });
      rows.forEach(function (w) {
        var key = String((w && w.workbook_key) || '').toUpperCase();
        if (key && !known[key]) workbookRegistryCache.push(w);
      });
    }
    saveWorkbookStateToStorage();
  }

  function getWorkbookCardsForRender(data) {
    var rows = (data && data.workbooks) || [];
    mergeWorkbookCards(rows);
    var base = workbookRegistryCache.length ? workbookRegistryCache : rows;
    return base.map(function (w) {
      var key = String((w && w.workbook_key) || '').toUpperCase();
      return Object.assign({}, w || {}, workbookCheckedMap[key] || {});
    });
  }

  function workbookCards(data) {
    var rows = getWorkbookCardsForRender(data);
    if (!rows.length) return '<p class="sa-muted">Belum ada workbook terdaftar.</p>';
    return '<div class="sa-grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin:8px 0 0">' + rows.map(function (w) {
      var key = fmt(w.workbook_key);
      var selected = key === selectedWorkbookKey ? ' is-selected' : '';
      return [
        '<button type="button" class="sa-card sa-clickable', selected, '" style="text-align:left" data-sa-workbook-open="', escapeHtml(key), '">',
          '<span class="sa-card__label">', escapeHtml(humanText(w.workbook_type || 'Workbook')), '</span>',
          '<strong class="sa-card__value">', escapeHtml(key), '</strong>',
          '<small class="sa-card__hint">Status: ', escapeHtml(humanText(w.status || 'Belum dicek')), ' · Isu: ', escapeHtml(fmtNumber(w.issue_count || 0)), '<br>', escapeHtml(formatWita(w.last_checked_at)), '</small>',
        '</button>'
      ].join('');
    }).join('') + '</div>';
  }

  function workbookIssueList(data) {
    var items = ((data && data.summary && data.summary.top_issues) || []);
    if (!items.length) return '<p class="sa-muted">Tidak ada isu prioritas pada workbook terpilih.</p>';
    return '<ol class="sa-list">' + items.map(function (it) {
      return '<li><strong>' + escapeHtml(fmt(it.workbook_key)) + ' / ' + escapeHtml(fmt(it.sheet_name)) + '</strong> — ' + escapeHtml(humanText(it.issue_type || it.status || '-')) + '<br><span class="sa-muted">' + escapeHtml(fmt(it.recommendation)) + '</span></li>';
    }).join('') + '</ol>';
  }

  function bindWorkbookOpenButtons() {
    var buttons = document.querySelectorAll('[data-sa-workbook-open]');
    Array.prototype.forEach.call(buttons, function (btn) {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-sa-workbook-open') || 'LOG';
        var startedAt = Date.now();
        reportClientPerf('superAdminWorkbookCardClick', startedAt, {
          target_workbook_key: String(key || '').toUpperCase(),
          workbook_key: String(key || '').toUpperCase(),
          route_book_key: String(key || '').toUpperCase(),
          detail: 'Klik card workbook ' + String(key || '').toUpperCase()
        });
        loadWorkbookDetail(key, { noCache: false });
      });
    });
  }

  function renderWorkbookHealth(data) {
    data = data || {};
    workbookLastPayload = data;
    loadWorkbookStateFromStorage();
    mergeWorkbookCards(data.workbooks || []);
    var root = byId('sa-tab-content');
    if (!root) return;
    var rows = data.items || [];
    var summary = data.summary || {};
    var cardsForRender = getWorkbookCardsForRender(data);
    var selectedKey = data.selected_workbook_key || selectedWorkbookKey || '';
    if (selectedKey) selectedWorkbookKey = String(selectedKey || '').toUpperCase();
    var isDetail = String(data.mode || '').toUpperCase() === 'DETAIL';
    root.innerHTML = [
      '<h3>Workbook &amp; Log Health</h3>',
      '<p class="sa-muted">Mode: ', escapeHtml(humanText(data.mode || 'SUMMARY')), ' · Status: ', badgeStatus(summary.health_status || 'GREEN'), ' · Workbook terdaftar: ', escapeHtml(fmtNumber(summary.total_workbooks || cardsForRender.length)), ' · Terpilih: ', escapeHtml(selectedWorkbookKey || '-'), ' · Cache: ', escapeHtml(data.cache_hit ? 'HIT' : 'MISS'), '</p>',
      workbookSummaryCards(data),
      '<section class="sa-panel" style="margin-top:10px"><div class="sa-workbook-tools"><div><h3>Daftar Workbook</h3><p class="sa-muted">Klik nama workbook untuk membuka detail sheet/header secara on-demand. Tampilan awal membaca registry dan snapshot terakhir agar dashboard tetap cepat.</p></div><div class="sa-inline-actions">',
        selectedWorkbookKey ? '<button type="button" class="sa-btn sa-btn-primary" id="sa-workbook-live-check">Periksa ulang workbook terpilih: ' + escapeHtml(selectedWorkbookKey) + '</button>' : '<span class="sa-muted">Pilih workbook untuk membuka snapshot.</span>',
        '<button type="button" class="sa-btn sa-btn-soft" id="sa-workbook-refresh-list">Refresh daftar</button>',
      '</div></div>', workbookCards(data),
      selectedWorkbookKey ? '<div class="sa-panel" style="margin-top:10px;background:#eff6ff;border-color:#93c5fd"><strong>Workbook terpilih: ' + escapeHtml(selectedWorkbookKey) + '</strong><p class="sa-muted" style="margin:.35rem 0 0">Klik <strong>Periksa ulang workbook terpilih</strong> untuk audit langsung. Klik card lain untuk melihat snapshot workbook lain.</p></div>' : '',
      '</section>',
      '<div class="sa-layout" style="grid-template-columns:1fr .9fr">',
        '<section class="sa-panel"><h3>Isu Prioritas ', escapeHtml(selectedWorkbookKey ? '(' + selectedWorkbookKey + ')' : ''), '</h3>', workbookIssueList(data), '</section>',
        '<section class="sa-panel"><h3>Catatan Pemeriksaan</h3><p class="sa-muted">Konfigurasi diambil dari <strong>workbook_registry</strong> dan <strong>sheet_schema_registry</strong>. Sheet tambahan tidak dianggap masalah bila sudah didaftarkan sebagai opsional.</p><p class="sa-muted">Gunakan Refresh Paksa setelah memperbaiki header/sheet agar cache diperbarui.</p></section>',
      '</div>',
      rows.length ? '<section class="sa-panel" style="margin-top:10px"><h3>Detail Sheet ' + escapeHtml(selectedWorkbookKey || '') + '</h3><p class="sa-muted">Baris detail: ' + escapeHtml(fmtNumber(rows.length)) + '.</p>' + tableHtml(workbookHealthHeaders(), rows, 'workbook') + '</section>' : '',
      '<section class="sa-panel" style="margin-top:10px"><h3>Ringkasan Workbook Registry</h3>', tableHtml(workbookListHeaders(), cardsForRender, 'workbook_summary'), '</section>'
    ].join('');
    bindWorkbookOpenButtons();
    var liveCheck = byId('sa-workbook-live-check');
    if (liveCheck) liveCheck.addEventListener('click', function () { if (selectedWorkbookKey) loadWorkbookDetail(selectedWorkbookKey, { noCache: true, forceCheck: true }); });
    var refreshList = byId('sa-workbook-refresh-list');
    if (refreshList) refreshList.addEventListener('click', function () { loadWorkbookHealth({ noCache: false }); });
    bindDetailRows(rows, 'workbook');
    bindPagination('workbook', function () { renderWorkbookHealth(data); });
    bindDetailRows(cardsForRender, 'workbook_summary');
    bindPagination('workbook_summary', function () { renderWorkbookHealth(data); });
  }

  function renderErrors(data) {
    var target = byId('sa-tab-content');
    if (!target) return;
    var rows = data.items || data.recent_errors || [];
    target.innerHTML = [
      '<h3>Error Terbaru</h3>',
      '<p class="sa-muted">Periode: ', escapeHtml(data.time_label || getTimeLabel()), ' · Total: ', escapeHtml(fmtNumber(data.total_rows || rows.length)), ' · Cache: ', escapeHtml(data.cache_hit ? 'HIT' : 'MISS'), '</p>',
      tableHtml([
        { key: 'waktu', label: 'Waktu' },
        { key: 'request_id', label: 'Request ID' },
        { key: 'id_pengguna', label: 'User' },
        { key: 'modul', label: 'Modul' },
        { key: 'aksi', label: 'Aksi' },
        { key: 'pesan_error', label: 'Pesan', wrap: true }
      ], rows, 'error')
    ].join('');
    bindDetailRows(rows, 'error');
    bindPagination('error', function () { renderErrors(data); });
  }

  function renderSecurity(data) {
    var target = byId('sa-tab-content');
    if (!target) return;
    var latest = data.latest || [];
    target.innerHTML = [
      '<h3>Security & Session</h3>',
      '<p class="sa-muted">Periode: ', escapeHtml(data.time_label || getTimeLabel()), ' · Total: ', escapeHtml(fmtNumber(data.total_rows || latest.length)), ' · Cache: ', escapeHtml(data.cache_hit ? 'HIT' : 'MISS'), '</p>',
      '<h4>Ringkasan Reason Code</h4>',
      tableHtml([
        { key: 'event_type', label: 'Event' },
        { key: 'decision_status', label: 'Decision' },
        { key: 'reason_code', label: 'Reason' },
        { key: 'count', label: 'Jumlah' },
        { key: 'latest_at', label: 'Terakhir' }
      ], data.groups || [], 'security_group'),
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
      ], latest, 'security')
    ].join('');
    bindDetailRows(data.groups || [], 'security_group');
    bindPagination('security_group', function () { renderSecurity(data); });
    bindDetailRows(latest, 'security');
    bindPagination('security', function () { renderSecurity(data); });
  }

  function renderLogs(data) {
    var target = byId('sa-tab-content');
    if (!target) return;
    var items = data.items || [];
    var keys = [];
    if (items.length) Object.keys(items[0]).slice(0, 10).forEach(function (k) { keys.push({ key: k, label: k, wrap: k === 'detail' || k === 'payload_ringkas' || k === 'stack_trace' }); });
    target.innerHTML = [
      '<h3>Log Explorer Ringkas</h3>',
      '<p class="sa-muted">Periode: ', escapeHtml(data.time_label || getTimeLabel()), '</p>',
      '<div class="sa-filter">',
        '<select id="sa-log-type"><option value="PERFORMANCE">Performance</option><option value="ERROR">Error</option><option value="SECURITY">Security</option><option value="LOGIN">Login</option><option value="ACTIVITY">Aktivitas</option><option value="SUPER_ADMIN_ACTION">Super Admin Action</option></select>',
        '<input id="sa-log-q" type="search" placeholder="Cari teks/request/user/action" />',
        '<button type="button" class="sa-btn sa-btn-primary" id="sa-log-search">Cari</button>',
      '</div>',
      '<div id="sa-log-result">', tableHtml(keys.length ? keys : [{ key: 'info', label: 'Info' }], keys.length ? items : [{ info: 'Pilih filter lalu tekan Cari.' }], keys.length ? 'log' : ''), '</div>'
    ].join('');

    if (keys.length) {
      bindDetailRows(items, 'log');
      bindPagination('log', function () { renderLogs(data); });
    }
    var btn = byId('sa-log-search');
    if (btn) btn.addEventListener('click', function () { loadLogs(byId('sa-log-type').value, byId('sa-log-q').value); });
  }

  function setTabLoading(label) {
    var target = byId('sa-tab-content');
    if (target) target.innerHTML = '<div class="sa-loading">Memuat ' + escapeHtml(label || 'data') + '...</div>';
  }

  function setTabError(message) {
    var target = byId('sa-tab-content');
    if (target) target.innerHTML = '<div class="sa-error">' + escapeHtml(message || 'Gagal memuat data.') + '</div>';
  }

  function recommendationFor(type, row) {
    row = row || {};
    if (type === 'performance') {
      var openSheet = Number(row.max_open_sheet_ms || 0);
      var readRows = Number(row.max_read_rows || 0);
      var maxMs = Number(row.max_ms || 0);
      var avgMs = Number(row.avg_ms || 0);
      if (openSheet > 1000) return 'Indikasi bottleneck akses spreadsheet. Audit openById, route workbook, dan cache referensi.';
      if (readRows > 1000) return 'Endpoint membaca banyak baris. Pertimbangkan list lite, paging, atau read model.';
      if (maxMs > 4000 && openSheet === 0) return 'Durasi tinggi tanpa open sheet besar. Kemungkinan cold start Apps Script, logging, atau token/session write.';
      if (avgMs > 1500) return 'Rata-rata endpoint melewati ambang. Prioritaskan optimasi endpoint ini.';
      return 'Tidak ada rekomendasi kritis. Endpoint relatif stabil pada sampel ini.';
    }
    if (type === 'traffic') {
      if (Number(row.login_failed || 0) > 0) return 'Ada login gagal pada user ini. Periksa password, status akun, atau device binding.';
      if (Number(row.slow_request || 0) > 0) return 'User ini mengalami request lambat. Cocokkan dengan request_id dan device/jaringan.';
      return 'Aktivitas pengguna tampak normal pada periode ini.';
    }
    if (type === 'workbook') {
      if (row.issue_type === 'MISSING_SHEET') return 'Pulihkan sheet wajib atau sesuaikan APP_CONFIG bila sheet memang diganti nama.';
      if (row.issue_type === 'HEADER_MISSING') return 'Header wajib hilang. Pulihkan header sebelum operasi tulis dilanjutkan.';
      if (String(row.issue_type || '').indexOf('CAPACITY') >= 0) return 'Workbook mendekati batas kapasitas. Arsipkan log historis atau pecah workbook.';
      if (row.issue_type === 'UNKNOWN_SHEET') return 'Review apakah sheet ini masih dipakai. Jangan hapus sebelum dipastikan tidak direferensikan kode.';
      return row.recommendation || 'Workbook/sheet relatif sehat pada sampel ini.';
    }
    if (type === 'security' || type === 'security_group') return 'Periksa reason code dan target aksi. Jika berulang, audit scope, role, token, atau device policy.';
    if (type === 'error') return 'Gunakan request_id untuk menelusuri performa, security event, dan aktivitas terkait.';
    return 'Klik request_id terkait di Log Explorer untuk penelusuran lanjutan.';
  }

  function compactValue(value, key) {
    if (value === undefined || value === null || value === '') return '-';
    if (isTimeKey(key)) return formatWita(value);
    if (Array.isArray(value)) return value.length ? value : '-';
    if (typeof value === 'object') return value;
    return humanText(String(value));
  }

  function renderDetailRows(obj, keys) {
    obj = obj || {};
    keys = keys || Object.keys(obj);
    return keys.map(function (k) {
      var val = compactValue(obj[k], k);
      if (Array.isArray(val)) {
        val = val.map(function (item) {
          if (typeof item === 'object') {
            return '<div class="sa-detail-row"><span>' + Object.keys(item).map(function (ik) {
              return '<strong>' + escapeHtml(humanLabel(ik)) + ':</strong> ' + escapeHtml(String(compactValue(item[ik], ik))) ;
            }).join('<br>') + '</span></div>';
          }
          return '<div class="sa-detail-row"><span>' + escapeHtml(String(item)) + '</span></div>';
        }).join('');
        return '<div class="sa-detail-row"><small>' + escapeHtml(humanLabel(k)) + '</small>' + val + '</div>';
      }
      if (typeof val === 'object') val = JSON.stringify(val);
      return '<div class="sa-detail-row"><small>' + escapeHtml(humanLabel(k)) + '</small><span>' + escapeHtml(fmt(val)) + '</span></div>';
    }).join('');
  }

  function detailKeysFor(type, row) {
    if (type === 'traffic') {
      return ['id_pengguna_raw','role','session_status','online_session_count','offline_session_count','active_session_count','device_count','last_device_id','last_device_label','last_seen','last_login_at','last_action','last_request_id','total_request','slow_request','login_success','login_failed','activity_count','avg_ms','max_ms','devices','latest_events'];
    }
    if (type === 'performance' || type === 'monitor') {
      return ['action','category','status','count','slow_count','severe_count','avg_ms','max_ms','max_open_sheet_ms','max_read_rows','cache_hit','cache_miss','latest_at','sample_request_id','sample_user','sample_device_id','sample_app_version','sample_detail'];
    }
    if (type === 'workbook') {
      return ['workbook_key','workbook_type','workbook_name','sheet_name','status','severity','issue_type','check_type','header_status','missing_headers','unknown_headers','last_row','last_column','max_rows','max_columns','used_cells','allocated_cells','usage_pct','recommendation','catatan','checked_at'];
    }
    if (type === 'security' || type === 'security_group') {
      return ['waktu','latest_at','request_id','event_type','decision_status','reason_code','aksi','id_pengguna','role','device_id','app_version','target_entity','target_entity_id','detail','payload_ringkas','count'];
    }
    if (type === 'error') {
      return ['waktu','request_id','id_pengguna','perangkat','modul','aksi','pesan_error','stack_trace','payload_ringkas'];
    }
    return Object.keys(row || {}).slice(0, 28);
  }

  function showInspector(type, row) {
    var backdrop = byId('sa-detail-backdrop');
    var panel = byId('sa-detail-panel');
    if (!panel || !backdrop) return;
    row = row || {};
    var keys = detailKeysFor(type, row).filter(function (k) { return row[k] !== undefined && row[k] !== null && row[k] !== ''; });
    panel.innerHTML = [
      '<div class="sa-detail-head"><div><h3>Detail</h3><p class="sa-muted">Jenis: ', escapeHtml(humanLabel(type || 'row')), '</p></div><button type="button" class="sa-detail-close" id="sa-detail-close">Tutup</button></div>',
      '<div class="sa-detail-grid">', renderDetailRows(row, keys), '</div>',
      '<div class="sa-reco"><strong>Rekomendasi awal</strong><p class="sa-muted">', escapeHtml(recommendationFor(type, row)), '</p></div>'
    ].join('');
    backdrop.classList.add('active');
    backdrop.setAttribute('aria-hidden', 'false');
    bindDetailModal();
  }

  function bindDetailModal() {
    var backdrop = byId('sa-detail-backdrop');
    var close = byId('sa-detail-close');
    function hide() {
      if (!backdrop) return;
      backdrop.classList.remove('active');
      backdrop.setAttribute('aria-hidden', 'true');
    }
    if (close) close.onclick = hide;
    if (backdrop && backdrop.dataset.bound !== '1') {
      backdrop.dataset.bound = '1';
      backdrop.addEventListener('click', function (event) { if (event.target === backdrop) hide(); });
      document.addEventListener('keydown', function (event) { if (event.key === 'Escape') hide(); });
    }
  }

  async function loadSummary(options) {
    var opts = options || {};
    var result = await post('getSuperAdminSummary', timePayload({ no_cache: opts.noCache === true, perf_rows: 180 }));
    if (!result || result.ok === false) {
      var root = byId('sa-summary');
      if (root) root.innerHTML = '<div class="sa-error">' + escapeHtml((result && result.message) || 'Gagal memuat ringkasan.') + '</div>';
      return null;
    }
    var data = getData(result);
    renderSummary(data);
    return data;
  }

  async function loadPerformance(options) {
    var opts = options || {};
    activeTab = 'performance';
    if (!opts.force && lastSummary) { tabLoaded.performance = true; renderPerformanceFromSummary('CORE'); return; }
    setTabLoading('core performance');
    var result = await post('getSuperAdminPerformance', timePayload({ max_rows: 240, category: 'CORE', no_cache: opts.noCache === true }));
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.performance = true;
    renderPerformance(getData(result), 'Core App Performance');
  }

  async function loadMonitorPerformance(options) {
    var opts = options || {};
    activeTab = 'monitor';
    if (!opts.force && lastSummary) { tabLoaded.monitor = true; renderPerformanceFromSummary('MONITOR'); return; }
    setTabLoading('monitor endpoint');
    var result = await post('getSuperAdminPerformance', timePayload({ max_rows: 240, category: 'MONITOR', no_cache: opts.noCache === true }));
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.monitor = true;
    renderPerformance(getData(result), 'Monitor Endpoint Performance');
  }

  async function loadTraffic(options) {
    var opts = options || {};
    activeTab = 'traffic';
    setTabLoading('lalu lintas pengguna');
    var result = await post('getSuperAdminUserTraffic', timePayload({ max_rows: 220, no_cache: opts.noCache === true }));
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.traffic = true;
    renderTraffic(getData(result));
  }

  async function loadErrors(options) {
    var opts = options || {};
    activeTab = 'errors';
    setTabLoading('error');
    var result = await post('getSuperAdminRecentErrors', timePayload({ max_rows: 100, no_cache: opts.noCache === true }));
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.errors = true;
    renderErrors(getData(result));
  }

  async function loadSecurity(options) {
    var opts = options || {};
    activeTab = 'security';
    setTabLoading('security');
    var result = await post('getSuperAdminSecurity', timePayload({ max_rows: 180, no_cache: opts.noCache === true }));
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.security = true;
    renderSecurity(getData(result));
  }


  async function loadWorkbookHealth(options) {
    var opts = options || {};
    activeTab = 'workbook';
    if (opts.resetSelection === true) selectedWorkbookKey = '';
    loadWorkbookStateFromStorage();
    setTabLoading('workbook health');
    var result = await post('getSuperAdminWorkbookHealthSummary', { check_log: false, no_cache: opts.noCache === true });
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.workbook = true;
    var detailData = getData(result);
    if (detailData && detailData.workbooks) mergeWorkbookCards(detailData.workbooks || []);
    if (detailData && detailData.selected_workbook_key) selectedWorkbookKey = String(detailData.selected_workbook_key || '').toUpperCase();
    saveWorkbookStateToStorage();
    renderWorkbookHealth(detailData);
  }

  async function loadWorkbookDetail(workbookKey, options) {
    var opts = options || {};
    var startedAt = Date.now();
    activeTab = 'workbook';
    selectedWorkbookKey = String(workbookKey || 'LOG').toUpperCase();
    setTabLoading((opts.forceCheck === true ? 'periksa ulang workbook ' : 'snapshot workbook ') + selectedWorkbookKey);
    var result = await post('getSuperAdminWorkbookHealthDetail', {
      workbook_key: selectedWorkbookKey,
      include_unknown_sheets: opts.includeUnknown === true,
      force_check: opts.forceCheck === true,
      live_check: opts.forceCheck === true,
      write_history: opts.forceCheck === true,
      no_cache: opts.noCache === true
    });
    reportClientPerf(opts.forceCheck === true ? 'superAdminWorkbookLiveCheck' : 'superAdminWorkbookSnapshotOpen', startedAt, {
      target_workbook_key: selectedWorkbookKey,
      workbook_key: selectedWorkbookKey,
      route_book_key: selectedWorkbookKey,
      detail: (opts.forceCheck === true ? 'Periksa ulang workbook ' : 'Buka snapshot workbook ') + selectedWorkbookKey,
      force_check: opts.forceCheck === true,
      no_cache: opts.noCache === true,
      status: result && result.ok === false ? 'ERROR' : 'SUCCESS'
    });
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.workbook = true;
    var detailData = getData(result);
    if (detailData && detailData.workbooks) mergeWorkbookCards(detailData.workbooks || []);
    if (detailData && detailData.selected_workbook_key) selectedWorkbookKey = String(detailData.selected_workbook_key || '').toUpperCase();
    saveWorkbookStateToStorage();
    renderWorkbookHealth(detailData);
  }


  function componentHealthHeaders(kind) {
    if (kind === 'frontend') {
      return [
        { key: 'component_key', label: 'Asset' },
        { key: 'asset_path', label: 'Path' },
        { key: 'asset_type', label: 'Jenis' },
        { key: 'load_stage', label: 'Tahap' },
        { key: 'expected_global', label: 'Global' },
        { key: 'error_signal', label: 'Sinyal Error' },
        { key: 'status', label: 'Status', formatter: function (v) { return badgeStatus(v); } },
        { key: 'recommendation', label: 'Rekomendasi', wrap: true }
      ];
    }
    return [
      { key: 'component_key', label: 'Service' },
      { key: 'component_name', label: 'Nama' },
      { key: 'component_type', label: 'Jenis' },
      { key: 'health_action', label: 'Health action' },
      { key: 'request_count', label: 'Request' },
      { key: 'slow_count', label: 'Lambat' },
      { key: 'error_count', label: 'Error' },
      { key: 'avg_ms', label: 'Rata-rata ms' },
      { key: 'max_ms', label: 'Maks ms' },
      { key: 'status', label: 'Status', formatter: function (v) { return badgeStatus(v); } },
      { key: 'recommendation', label: 'Rekomendasi', wrap: true }
    ];
  }

  function renderComponentHealth(data, kind) {
    var target = byId('sa-tab-content');
    if (!target) return;
    data = data || {};
    kind = kind || 'backend';
    var rows = data.items || [];
    var summary = data.summary || {};
    var title = kind === 'frontend' ? 'Frontend/PWA Health' : 'Backend Health';
    var note = kind === 'frontend'
      ? 'Cek frontend berbasis frontend_asset_registry + sinyal client log. Asset fisik tidak discan dari Drive agar dashboard tetap ringan.'
      : 'Cek backend berbasis backend_service_registry + sinyal log_performance. Detail endpoint bisnis berat tetap on-demand.';
    var html = [
      '<h3>', escapeHtml(title), '</h3>',
      '<p class="sa-muted">Mode: ', escapeHtml(data.mode || 'SUMMARY'), ' · Status: ', badgeStatus(summary.status || 'GREEN'), ' · Komponen: ', escapeHtml(fmtNumber(summary.total || rows.length)), ' · RED: ', escapeHtml(fmtNumber(summary.red || 0)), ' · YELLOW: ', escapeHtml(fmtNumber(summary.yellow || 0)), ' · GREEN: ', escapeHtml(fmtNumber(summary.green || 0)), ' · Cache: ', escapeHtml(data.cache_hit ? 'HIT' : 'MISS'), ' · Update: ', escapeHtml(formatWita(data.generated_at)), '</p>',
      '<section class="sa-grid">',
        cardHtml('Komponen terdaftar', summary.total || rows.length, kind === 'frontend' ? 'Dari frontend_asset_registry' : 'Dari backend_service_registry', ''),
        cardHtml('Merah', summary.red || 0, 'Perlu perhatian', (summary.red || 0) > 0 ? 'sa-danger' : ''),
        cardHtml('Kuning', summary.yellow || 0, 'Pantau/periksa', (summary.yellow || 0) > 0 ? 'sa-warn' : ''),
        cardHtml('Hijau', summary.green || 0, 'Sehat', ''),
        cardHtml('Service version', data.service_version || '-', 'Health service', ''),
        cardHtml('Pola cek', kind === 'frontend' ? 'Registry' : 'Log signal', 'Ringan', ''),
      '</section>',
      '<div class="sa-panel" style="margin:10px 0"><h3>Catatan Pemeriksaan</h3><p class="sa-muted">', escapeHtml(note), '</p></div>',
      tableHtml(componentHealthHeaders(kind), rows, kind === 'frontend' ? 'frontend_health' : 'backend_health')
    ].join('');
    target.innerHTML = html;
    bindDetailRows(rows, kind === 'frontend' ? 'frontend_health' : 'backend_health');
    bindPagination(kind === 'frontend' ? 'frontend_health' : 'backend_health', function () { renderComponentHealth(data, kind); });
  }

  async function loadBackendHealth(options) {
    var opts = options || {};
    activeTab = 'backend';
    setTabLoading('backend health');
    var result = await post('getSuperAdminBackendHealthSummary', { no_cache: opts.noCache === true });
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.backend = true;
    renderComponentHealth(getData(result), 'backend');
  }

  async function loadFrontendHealth(options) {
    var opts = options || {};
    activeTab = 'frontend';
    setTabLoading('frontend/pwa health');
    var result = await post('getSuperAdminFrontendHealthSummary', { no_cache: opts.noCache === true });
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.frontend = true;
    renderComponentHealth(getData(result), 'frontend');
  }

  async function loadLogs(type, q) {
    activeTab = 'logs';
    var container = byId('sa-log-result');
    if (container) container.innerHTML = '<div class="sa-loading">Mencari log...</div>';
    var result = await post('searchSuperAdminLogs', timePayload({ log_type: type || DEFAULT_LOG_TYPE, q: q || '', max_rows: 60 }));
    if (!result || result.ok === false) {
      if (container) container.innerHTML = '<div class="sa-error">' + escapeHtml((result && result.message) || 'Gagal mencari log.') + '</div>';
      return;
    }
    var data = getData(result);
    var items = data.items || [];
    var keys = [];
    if (items.length) Object.keys(items[0]).slice(0, 10).forEach(function (k) { keys.push({ key: k, label: k, wrap: k === 'detail' || k === 'payload_ringkas' || k === 'stack_trace' }); });
    function renderSearchResult() {
      if (container) container.innerHTML = tableHtml(keys.length ? keys : [{ key: 'info', label: 'Info' }], keys.length ? items : [{ info: 'Tidak ada hasil.' }], keys.length ? 'log' : '');
      if (keys.length) {
        bindDetailRows(items, 'log');
        bindPagination('log', renderSearchResult);
      }
    }
    renderSearchResult();
  }

  function bindTabs() {
    var tabs = document.querySelectorAll('[data-sa-tab]');
    Array.prototype.forEach.call(tabs, function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-sa-tab');
        setActiveTab(tab);
        if (tab === 'performance') return loadPerformance();
        if (tab === 'monitor') return loadMonitorPerformance();
        if (tab === 'traffic') return loadTraffic();
        if (tab === 'errors') return loadErrors();
        if (tab === 'security') return loadSecurity();
        if (tab === 'workbook') return loadWorkbookHealth();
        if (tab === 'backend') return loadBackendHealth();
        if (tab === 'frontend') return loadFrontendHealth();
        if (tab === 'logs') { activeTab = 'logs'; tabLoaded.logs = true; return renderLogs({ items: [] }); }
      });
    });
  }

  async function logoutSuperAdmin() {
    var ok = true;
    try { ok = window.confirm('Keluar dari Dashboard Super Admin?'); } catch (err) {}
    if (!ok) return;
    try {
      if (window.Auth && typeof window.Auth.logout === 'function') { await window.Auth.logout(); return; }
      if (window.Api && typeof window.Api.post === 'function') await window.Api.post('logout', {});
    } catch (err2) {}
    try {
      if (window.Api && typeof window.Api.clearSensitiveClientState === 'function') window.Api.clearSensitiveClientState({ keepDeviceId: true });
    } catch (err3) {}
    try { localStorage.removeItem('tpk_session_token'); } catch (err5) {}
    try {
      if (window.Router && typeof window.Router.go === 'function') window.Router.go('login');
      else window.location.reload();
    } catch (err6) { window.location.reload(); }
  }

  function resetTabCache() {
    Object.keys(tabLoaded).forEach(function (key) { tabLoaded[key] = false; });
  }

  function bindHeader() {
    var refresh = byId('sa-refresh');
    if (refresh) refresh.addEventListener('click', function () { refreshAll({ noCache: true }); });
    var refreshCache = byId('sa-refresh-cache');
    if (refreshCache) refreshCache.addEventListener('click', function () { refreshAll({ noCache: false }); });
    var logout = byId('sa-logout');
    if (logout) logout.addEventListener('click', logoutSuperAdmin);
  }

  function bindTimeSelect() {
    var timeSelect = byId('sa-time-window');
    if (!timeSelect || timeSelect.dataset.bound === '1') return;
    timeSelect.dataset.bound = '1';
    timeSelect.value = activeTimeWindow;
    timeSelect.addEventListener('change', function () {
      activeTimeWindow = timeSelect.value || 'today';
      resetTabCache();
      refreshAll({ noCache: false, timeChanged: true });
    });
  }

  async function reloadActiveTab(options) {
    var opts = options || {};
    if (activeTab === 'performance') return loadPerformance({ force: true, noCache: opts.noCache === true });
    if (activeTab === 'monitor') return loadMonitorPerformance({ force: true, noCache: opts.noCache === true });
    if (activeTab === 'traffic') return loadTraffic({ noCache: opts.noCache === true });
    if (activeTab === 'errors') return loadErrors({ noCache: opts.noCache === true });
    if (activeTab === 'security') return loadSecurity({ noCache: opts.noCache === true });
    if (activeTab === 'workbook') {
      if (selectedWorkbookKey) return loadWorkbookDetail(selectedWorkbookKey, { noCache: opts.noCache === true, forceCheck: opts.noCache === true });
      return loadWorkbookHealth({ noCache: opts.noCache === true });
    }
    if (activeTab === 'backend') return loadBackendHealth({ noCache: opts.noCache === true });
    if (activeTab === 'frontend') return loadFrontendHealth({ noCache: opts.noCache === true });
    if (activeTab === 'logs') return renderLogs({ items: [], time_label: getTimeLabel() });
  }

  async function refreshAll(options) {
    var startedAt = Date.now();
    try {
      var opts = options || {};
      var force = opts.noCache === true;
      var summary = await loadSummary({ noCache: force });
      if (summary) {
        if (force || opts.timeChanged) await reloadActiveTab(opts);
        else if (activeTab === 'monitor') renderPerformanceFromSummary('MONITOR');
        else if (activeTab === 'performance') renderPerformanceFromSummary('CORE');
      }
      reportClientPerf(force ? 'superAdminRefreshForce' : 'superAdminRefreshData', startedAt, { status: 'SUCCESS', no_cache: force });
      showToast(force ? 'Dashboard Super Admin diperbarui paksa.' : 'Dashboard Super Admin diperbarui.', 'success');
    } catch (err) {
      reportClientPerf((options && options.noCache === true) ? 'superAdminRefreshForce' : 'superAdminRefreshData', startedAt, { status: 'ERROR', error_message: err && err.message ? err.message : String(err || '') });
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
    loadTraffic: loadTraffic,
    loadErrors: loadErrors,
    loadSecurity: loadSecurity,
    loadWorkbookHealth: loadWorkbookHealth,
    loadWorkbookDetail: loadWorkbookDetail,
    loadLogs: loadLogs
  };
})(window, document);
