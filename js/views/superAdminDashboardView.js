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
  var SYSTEM_MONITOR_FRONTEND_SYNC_VERSION = '5E-R4D-A9-CORE-APP-PERFORMANCE-YELLOW-DRILLDOWN-20260514';
  var PATCH_5E_R4C_R2_R2_VERSION = SYSTEM_MONITOR_FRONTEND_SYNC_VERSION;
  var PATCH_5E_R4C_R2_R1_VERSION = SYSTEM_MONITOR_FRONTEND_SYNC_VERSION;
  var PATCH_5E_R4C_R2_VERSION = SYSTEM_MONITOR_FRONTEND_SYNC_VERSION;
  var REFRESH_FORCE_HANDLER_GLOBAL_KEY = '__TPK_SA_REFRESH_FORCE_HANDLER_VERSION';
  var REFRESH_FORCE_CLIENT_COOLDOWN_MS = 60000;
  var REFRESH_GUARD_STORAGE_KEY = 'tpk_sa_refresh_force_guard_v1';
  var refreshForceInFlight = false;
  var refreshDataInFlight = false;
  var refreshForceGuardUntil = 0;
  var refreshForceGuardTimer = null;

  var tabLoaded = {
    performance: false,
    monitor: false,
    traffic: false,
    errors: false,
    security: false,
    securityRisk: false,
    securityAction: false,
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

  function readRefreshGuardUntilFromStorage() {
    try {
      var raw = window.localStorage && window.localStorage.getItem(REFRESH_GUARD_STORAGE_KEY);
      if (!raw) return 0;
      var parsed = JSON.parse(raw);
      return Number(parsed && parsed.until || 0) || 0;
    } catch (err) {
      return 0;
    }
  }

  function writeRefreshGuardUntilToStorage(until) {
    try {
      if (!window.localStorage) return;
      if (!until || Number(until) <= Date.now()) {
        window.localStorage.removeItem(REFRESH_GUARD_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(REFRESH_GUARD_STORAGE_KEY, JSON.stringify({
        until: Number(until),
        saved_at: new Date().toISOString(),
        patch: PATCH_5E_R4C_R2_VERSION
      }));
    } catch (err) {}
  }

  function getRefreshForceRemainingMs() {
    var storedUntil = readRefreshGuardUntilFromStorage();
    var until = Math.max(Number(refreshForceGuardUntil || 0), Number(storedUntil || 0));
    if (!until || Date.now() >= until) return 0;
    refreshForceGuardUntil = until;
    return Math.max(0, until - Date.now());
  }

  function markRefreshForceCooldown() {
    refreshForceGuardUntil = Date.now() + REFRESH_FORCE_CLIENT_COOLDOWN_MS;
    writeRefreshGuardUntilToStorage(refreshForceGuardUntil);
    scheduleRefreshButtonUpdate();
  }

  function refreshGuardSecondsLeft() {
    return Math.ceil(getRefreshForceRemainingMs() / 1000);
  }

  function updateRefreshButtons(message) {
    var forceBtn = byId('sa-refresh');
    var cacheBtn = byId('sa-refresh-cache');
    var state = byId('sa-refresh-state');
    var remaining = refreshGuardSecondsLeft();

    if (forceBtn) {
      forceBtn.disabled = refreshForceInFlight || remaining > 0;
      if (refreshForceInFlight) forceBtn.textContent = 'Refresh Paksa...';
      else if (remaining > 0) forceBtn.textContent = 'Refresh Paksa (' + remaining + 'd)';
      else forceBtn.textContent = 'Refresh Paksa';
    }

    if (cacheBtn) {
      cacheBtn.disabled = refreshDataInFlight || refreshForceInFlight;
      cacheBtn.textContent = refreshDataInFlight ? 'Refresh Data...' : 'Refresh Data';
    }

    if (state) {
      var text = message || '';
      if (!text && remaining > 0) text = 'Guard aktif: Refresh Paksa dikunci ' + remaining + ' detik. Snapshot terakhir digunakan bila ditekan ulang.';
      state.innerHTML = text ? escapeHtml(text) : '';
    }

    scheduleRefreshButtonUpdate();
  }

  function scheduleRefreshButtonUpdate() {
    try { if (refreshForceGuardTimer) window.clearTimeout(refreshForceGuardTimer); } catch (err) {}
    refreshForceGuardTimer = null;
    var remaining = getRefreshForceRemainingMs();
    if (remaining > 0) {
      refreshForceGuardTimer = window.setTimeout(function () {
        updateRefreshButtons();
      }, Math.min(1000, remaining));
    }
  }

  function refreshMetricExtra(force, status, extra) {
    var isForce = force === true;
    return Object.assign({
      status: status || 'SUCCESS',
      source_layer: 'CLIENT',
      performance_group: 'CLIENT_EVENT',
      client_metric_classification: isForce ? 'CLIENT_REFRESH_FORCE_GUARD_EVENT' : 'CLIENT_REFRESH_WORKFLOW',
      event_group: 'SUPER_ADMIN_CLIENT_EVENT',
      route_book_key: 'SUPER_ADMIN_MONITOR',
      service_version: PATCH_5E_R4C_R2_R1_VERSION,
      frontend_patch_version: PATCH_5E_R4C_R2_R1_VERSION,
      no_cache: isForce,
      active_tab: activeTab,
      time_window: activeTimeWindow,
      hard_stop_client_chain: isForce,
      exclude_from_endpoint_health: isForce,
      metric_scope: isForce ? 'CLIENT_GUARD_ONLY' : 'CLIENT_REFRESH'
    }, extra || {});
  }

  function getSummaryGuardInfo(summary) {
    summary = summary || {};
    return summary.refresh_guard || summary.refreshGuard || summary.snapshot_guard || null;
  }

  function summarizeGuardInfo(summary) {
    var guard = getSummaryGuardInfo(summary);
    if (!guard) return '';
    var parts = [];
    if (guard.reason) parts.push(String(guard.reason));
    if (guard.source) parts.push('source=' + String(guard.source));
    if (guard.skipped === true) parts.push('skipped=true');
    if (guard.snapshot_hit === true || guard.snapshot_used === true) parts.push('snapshot=true');
    return parts.join(' · ');
  }

  function renderCurrentPerformanceFromSnapshot() {
    if (activeTab === 'monitor') {
      renderPerformanceFromSummary('MONITOR');
      return true;
    }
    if (activeTab === 'performance') {
      renderPerformanceFromSummary('CORE');
      return true;
    }
    return false;
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

  function maskDeviceId(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text || text === '-') return '-';
    if (text.length <= 18) return text;
    return text.slice(0, 12) + '…' + text.slice(-6);
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
      CORE_APP: 'Core App',
      SUPER_ADMIN_MONITOR: 'Super Admin Monitor',
      DIAGNOSTIC: 'Diagnostic',
      CLIENT_EVENT: 'Client Event',
      SECURITY_ACTION: 'Security Action',
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
      WORKBOOK_CAPACITY_WARNING: 'Risiko kapasitas workbook',
      SECURITY_RISK: 'Security Risk',
      SECURITY_ACTION_CENTER: 'Security Action Center',
      REVOKE_SESSION: 'Cabut session',
      BLOCK_TARGET: 'Blokir target',
      UNBLOCK_TARGET: 'Cabut blokir',
      SET_COOLDOWN: 'Atur cooldown',
      CLEAR_COOLDOWN: 'Cabut cooldown',
      SESSION_REVOKED: 'Session dicabut',
      SECURITY_COOLDOWN: 'Cooldown keamanan',
      SECURITY_UNBLOCKED: 'Blokir/cooldown dicabut',
      LOGIN_INVALID_CREDENTIALS: 'Login gagal - kredensial salah',
      ACCOUNT_INACTIVE: 'Akun nonaktif',
      ACCOUNT_BLOCKED: 'Akun diblokir',
      TOKEN_MISSING: 'Token tidak ada',
      TOKEN_EXPIRED: 'Token kedaluwarsa',
      TOKEN_INVALID: 'Token tidak valid',
      SESSION_DEVICE_MISMATCH: 'Device sesi tidak cocok',
      DEVICE_NOT_ALLOWED: 'Device tidak diizinkan',
      SCOPE_MISMATCH: 'Scope tidak cocok',
      TARGET_OUT_OF_SCOPE: 'Target di luar scope',
      ROLE_FORBIDDEN: 'Role tidak diizinkan',
      ACTION_NOT_ALLOWED: 'Action tidak diizinkan',
      PAYLOAD_TAMPERED: 'Payload terindikasi diubah',
      RATE_LIMITED: 'Rate limited',
      SENSITIVE_DATA_EXPOSURE_RISK: 'Risiko data sensitif terekspos',
      CRITICAL: 'Kritis',
      HIGH: 'Tinggi',
      MEDIUM: 'Sedang',
      LOW: 'Rendah',
      NO_VALID_SIGNAL: 'Tanpa sinyal valid',
      DIRECT_ACTIVE_FATAL_ERROR: 'Fatal aktif langsung',
      DIRECT_FATAL_ERROR: 'Fatal langsung',
      REPEATED_RUNTIME_ERROR: 'Runtime berulang',
      REPEATED_ACTIVE_RUNTIME_ERROR: 'Runtime aktif berulang',
      RUNTIME_BELOW_RED_THRESHOLD: 'Runtime di bawah ambang merah',
      WEAK_SIGNAL_ONLY: 'Indikasi lemah saja',
      HISTORICAL_FATAL_ONLY: 'Fatal historis saja',
      TRANSPORT_WARNING_ONLY: 'Warning transport saja',
      LIFECYCLE_WARNING_ONLY: 'Warning lifecycle saja',
      OBSERVABILITY_ONLY: 'Observability saja',
      ASSET_INACTIVE: 'Asset tidak aktif',
      ACTIVE_FATAL: 'Fatal aktif',
      HISTORICAL_FATAL: 'Fatal historis',
      TRANSPORT_WARNING: 'Warning transport',
      LIFECYCLE_WARNING: 'Warning lifecycle'
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


  function normalizeClientPerfAction(action, extra) {
    var raw = String(action || '').trim();
    var payload = extra || {};
    if (raw === 'superAdminRefreshForce') {
      payload.legacy_action = raw;
      payload.legacy_action_rewritten = true;
      payload.legacy_action_rewrite_version = PATCH_5E_R4C_R2_R2_VERSION;
      return 'superAdminRefreshForceClientLegacyBlocked';
    }
    return raw;
  }

  function reportClientPerf(action, startedAt, extra) {
    try {
      var api = getApi();
      if (!api || typeof api.reportClientPerformance !== 'function') return;
      extra = extra || {};
      action = normalizeClientPerfAction(action, extra);
      var rawElapsed = Math.max(0, Date.now() - (startedAt || Date.now()));
      var incomingExtra = extra || {};
      var duration = Number(incomingExtra.metric_duration_ms);
      if (!isFinite(duration) || duration < 0) duration = rawElapsed;
      var payload = Object.assign({
        modul: 'superAdminDashboardView.js',
        category: 'super_admin_ui',
        duration_ms: duration,
        total_ms: duration,
        workflow_elapsed_ms: rawElapsed,
        status: 'SUCCESS',
        time_window: activeTimeWindow,
        active_tab: activeTab,
        source_layer: 'CLIENT',
        service_version: PATCH_5E_R4C_R2_VERSION
      }, extra || {});
      if (!payload.performance_group) payload.performance_group = inferPerformanceGroup(action, payload.category);
      if (!payload.client_metric_classification) payload.client_metric_classification = payload.performance_group === 'DIAGNOSTIC' ? 'DIAGNOSTIC_CLIENT_WORKFLOW' : 'CLIENT_EVENT_WORKFLOW';
      if (!payload.event_group) payload.event_group = payload.performance_group;
      api.reportClientPerformance(action, payload);
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
          '.sa-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.sa-btn{border:1px solid #cbd5e1;background:#fff;border-radius:13px;padding:9px 13px;font-weight:800;cursor:pointer;box-shadow:0 3px 12px rgba(15,23,42,.04)}.sa-btn[disabled]{opacity:.55;cursor:not-allowed;box-shadow:none}.sa-btn-primary{background:#0f172a;color:#fff;border-color:#0f172a}.sa-btn-soft{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}.sa-btn-danger{background:#fff;color:#991b1b}.sa-refresh-state{flex-basis:100%;min-height:18px;text-align:right;color:#64748b;font-size:.78rem;font-weight:700}',
          '.sa-controls{display:flex;justify-content:space-between;gap:10px;align-items:center;margin:10px 0 0;flex-wrap:wrap}.sa-time-filter{display:flex;gap:8px;align-items:center;background:#fff;border:1px solid var(--sa-line);border-radius:16px;padding:9px 11px;box-shadow:0 6px 18px rgba(15,23,42,.04)}.sa-time-filter label{font-weight:800}.sa-time-filter select{border:1px solid #cbd5e1;border-radius:12px;padding:8px;background:#fff}',
          '.sa-hero{background:linear-gradient(135deg,#0ea5e9,#1d4ed8);border-radius:22px;padding:16px 18px;color:#fff;box-shadow:0 18px 45px rgba(29,78,216,.18);margin-bottom:14px}',
          '.sa-hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;align-items:stretch}.sa-health-pill{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:8px 12px;font-weight:900;background:rgba(255,255,255,.18);backdrop-filter:blur(8px)}',
          '.sa-health-pill.sa-status-green{background:#dcfce7;color:#166534}.sa-health-pill.sa-status-yellow{background:#fef3c7;color:#92400e}.sa-health-pill.sa-status-red{background:#fee2e2;color:#991b1b}',
          '.sa-hero h3{margin:8px 0 4px;font-size:1.2rem}.sa-hero p{margin:0;color:rgba(255,255,255,.85)}.sa-hero-side{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
          '.sa-mini{border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.13);border-radius:16px;padding:10px;text-align:left;color:#fff}.sa-mini span{display:block;font-size:.78rem;color:rgba(255,255,255,.82)}.sa-mini strong{font-size:1.25rem}.sa-clickable{cursor:pointer;transition:transform .12s ease,box-shadow .12s ease}.sa-clickable:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(15,23,42,.12)}.sa-card.is-selected{outline:3px solid rgba(29,78,216,.28);border-color:#60a5fa;background:#eff6ff}.sa-workbook-tools{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin:8px 0 12px}.sa-inline-actions{display:flex;gap:8px;flex-wrap:wrap}',
          '.sa-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:12px 0}.sa-card{background:var(--sa-card);border:1px solid var(--sa-line);border-radius:18px;padding:13px 14px;box-shadow:0 10px 24px rgba(15,23,42,.05);min-height:84px}.sa-card__label{display:block;color:var(--sa-muted);font-size:.78rem}.sa-card__value{display:block;font-size:1.55rem;margin:.16rem 0;color:#0f172a}.sa-card__hint{color:#94a3b8}.sa-card.sa-warn .sa-card__value{color:#b45309}.sa-card.sa-danger .sa-card__value{color:#b91c1c}.sa-card.sa-version-card .sa-card__value{font-size:.86rem;line-height:1.28;overflow-wrap:anywhere}.sa-version-line{display:block;margin-top:3px;color:rgba(255,255,255,.78);font-size:.78rem}.sa-version-meta{font-size:.76rem;color:#94a3b8;overflow-wrap:anywhere}',
          '.sa-layout{display:grid;grid-template-columns:1.1fr .72fr .88fr;gap:12px;margin:12px 0}.sa-workspace{display:block}.sa-panel{background:#fff;border:1px solid var(--sa-line);border-radius:20px;padding:14px;box-shadow:0 10px 28px rgba(15,23,42,.05)}',
          '.sa-detail-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.38);z-index:100;display:none;align-items:flex-start;justify-content:flex-end;padding:70px 24px 24px}.sa-detail-backdrop.active{display:flex}.sa-detail-modal{width:min(560px,calc(100vw - 48px));max-height:calc(100vh - 96px);overflow:auto;background:#fff;border:1px solid #cbd5e1;border-radius:22px;box-shadow:0 30px 90px rgba(15,23,42,.3);padding:16px}.sa-detail-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:8px}.sa-detail-close{border:1px solid #cbd5e1;border-radius:999px;background:#fff;font-weight:900;cursor:pointer;padding:6px 10px}',
          '.sa-panel h3{margin:0 0 10px;font-size:1.03rem}.sa-panel h4{margin:12px 0 8px}.sa-list{margin:0;padding-left:20px}.sa-list li{margin:6px 0;line-height:1.35}.sa-critical-list{display:grid;gap:8px}.sa-critical-item{border:1px solid #e2e8f0;border-left-width:5px;border-radius:14px;padding:9px 10px;background:#fff}.sa-critical-item strong{display:block}.sa-critical-red{border-left-color:#ef4444;background:#fff7f7}.sa-critical-yellow{border-left-color:#f59e0b;background:#fffbeb}.sa-critical-green{border-left-color:#22c55e;background:#f0fdf4}',
          '.sa-table-wrap{overflow:auto;max-width:100%}.sa-table{width:100%;border-collapse:collapse;font-size:.84rem;white-space:nowrap}.sa-table th,.sa-table td{padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}.sa-table th{position:sticky;top:0;color:#475569;background:#f8fafc;z-index:1}.sa-table td.sa-wrap{white-space:normal;min-width:240px}.sa-table tr[data-sa-row]{cursor:pointer}.sa-table tr[data-sa-row]:hover{background:#f8fafc}',
          '.sa-pager{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 0 0;color:#64748b}.sa-pager__buttons{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.sa-page-btn{border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:6px 9px;font-weight:800;cursor:pointer}.sa-page-btn.active{background:#0f172a;color:#fff;border-color:#0f172a}.sa-page-btn[disabled]{opacity:.45;cursor:not-allowed}',
          '.sa-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.sa-tab{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:9px 14px;font-weight:800;cursor:pointer}.sa-tab.active{background:#0f172a;color:#fff;border-color:#0f172a}',
          '.sa-filter{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.sa-filter input,.sa-filter select{border:1px solid #cbd5e1;border-radius:12px;padding:9px;min-width:160px;background:#fff}.sa-quick-filter{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.sa-chip{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:7px 10px;font-weight:800;cursor:pointer}.sa-chip.active{background:#0f172a;color:#fff;border-color:#0f172a}',
          '.sa-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;font-weight:800;font-size:.72rem}.sa-status-green{background:#dcfce7;color:#166534}.sa-status-yellow{background:#fef3c7;color:#92400e}.sa-status-red{background:#fee2e2;color:#991b1b}',
          '.sa-detail-grid{display:grid;gap:8px}.sa-detail-row{border:1px solid #e2e8f0;border-radius:12px;padding:8px;background:#f8fafc}.sa-detail-row small{display:block;color:#64748b;font-weight:800}.sa-detail-row span{overflow-wrap:anywhere}.sa-reco{border-left:4px solid #3b82f6;background:#eff6ff;border-radius:12px;padding:9px;margin-top:10px}',
          '.sa-bottleneck-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:10px 0}.sa-bottleneck-card{border:1px solid #e2e8f0;border-radius:16px;background:#fff;padding:10px}.sa-bottleneck-card strong{display:block;margin-bottom:4px}.sa-bottleneck-pill{display:inline-flex;align-items:center;border:1px solid #cbd5e1;border-radius:999px;padding:2px 8px;font-weight:800;font-size:.78rem;background:#f8fafc}.sa-bottleneck-pill.warn{border-color:#f59e0b;background:#fffbeb}.sa-bottleneck-pill.red{border-color:#ef4444;background:#fff7f7}.sa-bottleneck-reason{max-width:360px;white-space:normal}',
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
            '<small id="sa-refresh-state" class="sa-refresh-state" aria-live="polite"></small>',
          '</div>',
        '</header>',
        '<section id="sa-summary"><div class="sa-loading">Memuat ringkasan...</div></section>',
        '<nav class="sa-tabs" aria-label="Menu Super Admin">',
          '<button class="sa-tab active" data-sa-tab="performance" type="button">Core Performance</button>',
          '<button class="sa-tab" data-sa-tab="monitor" type="button">Monitor Endpoint</button>',
          '<button class="sa-tab" data-sa-tab="traffic" type="button">Lalu Lintas Pengguna</button>',
          '<button class="sa-tab" data-sa-tab="errors" type="button">Error</button>',
          '<button class="sa-tab" data-sa-tab="security" type="button">Security</button>',
          '<button class="sa-tab" data-sa-tab="securityRisk" type="button">Security Risk</button>',
          '<button class="sa-tab" data-sa-tab="securityAction" type="button">Security Action Center</button>',
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


  function splitVersionParts(value) {
    var text = String(value || '').trim();
    if (!text) return [];
    return text.split('+').map(function (part) { return String(part || '').trim(); }).filter(Boolean);
  }

  function pickLatestKnownVersion(value, fallback) {
    var parts = splitVersionParts(value);
    var preferred = [
      '5E-R4D-A9',
      '5E-R4D-A8-R2-R3',
      '5E-R4D-A8-R2-R2',
      '5E-R4D-A8-R2-R1',
      '5E-R4D-A8-R2',
      '5E-R4D-A8-R1',
      '5E-R4D-A8',
      '5E-R4D-A7',
      '5E-R4D-A6',
      '5E-R4D-A5',
      '5E-R4D-A3',
      '5E-R4D-A2',
      '5E-R4D-A1',
      '5F-MIN-R2-R2',
      '5F-MIN-R1'
    ];
    for (var i = 0; i < preferred.length; i++) {
      for (var j = parts.length - 1; j >= 0; j--) {
        if (parts[j].indexOf(preferred[i]) >= 0) return parts[j];
      }
    }
    return fallback || (parts.length ? parts[parts.length - 1] : '-');
  }

  function panelVersionLabel() {
    return SYSTEM_MONITOR_FRONTEND_SYNC_VERSION;
  }

  function summaryPanelLabel(data) {
    data = data || {};
    var backend = pickLatestKnownVersion(data.service_version || '', 'backend summary');
    return panelVersionLabel() + (backend && backend !== '-' ? ' · Backend: ' + backend : '');
  }

  function componentHealthVersionLabel(data, kind) {
    data = data || {};
    var raw = data.service_version || (data.summary && data.summary.service_version) || '';
    var latest = pickLatestKnownVersion(raw, '');
    if (kind === 'backend' && String(latest || '').indexOf('5E-R4D-A5') < 0) {
      return 'UI A8-R1 synced · Backend Health final A5 verified';
    }
    if (kind === 'frontend') {
      if (String(latest || '').indexOf('5E-R4D-A9') >= 0) return latest;
      if (String(latest || '').indexOf('5E-R4D-A8-R2-R3') >= 0) return latest;
      if (String(latest || '').indexOf('5E-R4D-A8-R2-R2') >= 0) return latest + ' · UI R2-R3 explanation polish active';
      if (String(latest || '').indexOf('5E-R4D-A8-R2-R1') >= 0) return latest + ' · UI R2-R2 active window ready';
      if (String(latest || '').indexOf('5E-R4D-A8-R2') >= 0) return latest + ' · UI R2-R1 guard active';
      if (String(latest || '').indexOf('5E-R4D-A8-R1') >= 0) return latest + ' · UI R2 evidence active';
      return '5E-R4D-A8-R2-FRONTEND-HEALTH-EVIDENCE-ACTIVE';
    }
    return latest || panelVersionLabel();
  }

  function componentHealthVersionHint(data, kind) {
    data = data || {};
    var raw = String(data.service_version || '').trim();
    var latest = componentHealthVersionLabel(data, kind);
    if (kind === 'frontend') {
      var noise = Number((data.summary && data.summary.noise_filtered_count) || data.frontend_noise_filtered_count || 0) || 0;
      var evidence = Number((data.summary && data.summary.evidence_count) || data.frontend_evidence_count || 0) || 0;
      var activeFatal = Number((data.summary && data.summary.active_fatal_count) || data.frontend_active_fatal_count || data.frontend_fatal_error_count || 0) || 0;
      var histFatal = Number((data.summary && data.summary.historical_fatal_count) || data.frontend_historical_fatal_count || 0) || 0;
      var lifecycle = Number((data.summary && data.summary.lifecycle_warning_count) || data.frontend_lifecycle_warning_count || 0) || 0;
      var transport = Number((data.summary && data.summary.transport_warning_count) || data.frontend_transport_warning_count || 0) || 0;
      if (activeFatal > 0) return 'Active fatal: ' + activeFatal + ' · Historical: ' + histFatal + ' · Lifecycle: ' + lifecycle + ' · Noise: ' + noise;
      if (histFatal > 0 || lifecycle > 0 || transport > 0) return 'Historical fatal: ' + histFatal + ' · Lifecycle: ' + lifecycle + ' · Transport: ' + transport + ' · Noise: ' + noise;
      if (evidence > 0) return 'Evidence drilldown: ' + evidence + ' · Noise: ' + noise;
      return noise > 0 ? ('Noise eksternal difilter: ' + noise) : 'Frontend active evidence window aktif';
    }
    if (!raw || raw === latest) return 'Backend health panel';
    return 'Versi backend mentah dipendekkan agar card stabil';
  }

  function severityRank(value) {
    var s = String(value || '').toUpperCase();
    if (s === 'RED' || s === 'CRITICAL') return 3;
    if (s === 'YELLOW' || s === 'WARNING') return 2;
    if (s === 'GREEN' || s === 'NORMAL') return 1;
    return 0;
  }

  function extractIssueAction(text) {
    text = String(text || '').trim();
    var match = text.match(/(?:aktif:|teratas:|lambat:|diagnostic\/admin lambat:)?\s*([A-Za-z0-9_.$-]+)\s+(?:max|mencapai)\s+\d+\s*ms/i);
    if (match && match[1]) return match[1];
    match = text.match(/\b(get[A-Z][A-Za-z0-9_.$-]*|refresh[A-Z][A-Za-z0-9_.$-]*|login|logout|build[A-Z][A-Za-z0-9_.$-]*|superAdmin[A-Z][A-Za-z0-9_.$-]*)\b/);
    return match && match[1] ? match[1] : '';
  }

  function criticalDedupeKey(item) {
    item = item || {};
    var type = String(item.type || item.code || item.title || '').toUpperCase();
    var message = String(item.message || '').toLowerCase().replace(/\s+/g, ' ').trim();
    var action = extractIssueAction((item.message || '') + ' ' + (item.title || ''));
    if (type.indexOf('CORE') >= 0 || String(item.title || '').toLowerCase().indexOf('core endpoint') >= 0) return 'CORE|' + (action || message);
    if (type.indexOf('HISTORICAL') >= 0 || message.indexOf('historical') >= 0) return 'HISTORICAL|' + (action || message);
    if (type.indexOf('DIAGNOSTIC') >= 0 || type.indexOf('BACKGROUND') >= 0 || String(item.title || '').toLowerCase().indexOf('diagnostic') >= 0) return 'DIAGNOSTIC|' + (action || message);
    if (type.indexOf('NORMAL') >= 0 || String(item.title || '').toLowerCase() === 'normal') return 'NORMAL';
    return [type, String(item.title || '').toLowerCase(), message].join('|');
  }

  function normalizeCriticalItems(items, limit) {
    var map = {};
    var order = [];
    (items || []).forEach(function (item) {
      item = item || {};
      var key = criticalDedupeKey(item);
      if (!key) return;
      if (!map[key]) {
        map[key] = item;
        order.push(key);
        return;
      }
      if (severityRank(item.severity) > severityRank(map[key].severity)) map[key] = item;
    });
    return order.map(function (key) { return map[key]; }).slice(0, limit || 6);
  }

  function isDiagnosticCriticalItem(item) {
    item = item || {};
    var text = [item.type, item.code, item.title, item.message].join(' ').toUpperCase();
    return text.indexOf('DIAGNOSTIC') >= 0 || text.indexOf('HISTORICAL') >= 0 || text.indexOf('BACKGROUND') >= 0 || text.indexOf('MONITOR_ENDPOINT') >= 0;
  }

  function splitCriticalItems(items) {
    var split = { core: [], diagnostic: [] };
    (items || []).forEach(function (item) {
      if (isDiagnosticCriticalItem(item)) split.diagnostic.push(item);
      else split.core.push(item);
    });
    return split;
  }

  function normalizeTopIssues(items, limit) {
    var seen = {};
    var out = [];
    (items || []).forEach(function (value) {
      var text = String(value || '').replace(/\s+/g, ' ').trim();
      text = text.replace(/^(Historical max terpisah:\s*){2,}/i, 'Historical max terpisah: ');
      text = text.replace(/^(Diagnostic\/Admin lambat:\s*){2,}/i, 'Diagnostic/Admin lambat: ');
      if (!text) return;
      var action = extractIssueAction(text);
      var bucket = text.toLowerCase().indexOf('core endpoint') >= 0 ? 'core' : (text.toLowerCase().indexOf('diagnostic') >= 0 ? 'diag' : (text.toLowerCase().indexOf('historical') >= 0 ? 'hist' : 'other'));
      var key = bucket + '|' + (action || text.toLowerCase());
      if (seen[key]) return;
      seen[key] = true;
      out.push(text);
    });
    return out.slice(0, limit || 5);
  }

  function renderSummary(data) {
    lastSummary = data || {};
    var root = byId('sa-summary');
    if (!root) return;
    var cards = data.cards || {};
    var issues = normalizeTopIssues(data.top_issues || [], 5);
    var health = data.health_status || 'YELLOW';
    var coreGroups = data.core_performance || [];
    var monitorGroups = data.monitor_performance || [];
    var critical = data.critical_status || {};
    var splitCritical = splitCriticalItems(critical.items || []);
    var criticalItems = normalizeCriticalItems(splitCritical.core || [], 4);
    var diagnosticCriticalItems = normalizeCriticalItems((splitCritical.diagnostic || []).concat(data.diagnostic_critical_items || data.diagnostic_items || []), 3);
    var periodLabel = data.time_label || getTimeLabel();
    var periodEl = byId('sa-period-label');
    if (periodEl) periodEl.textContent = 'Periode: ' + periodLabel;

    root.innerHTML = [
      '<div class="sa-sticky-monitor"><section class="sa-hero"><div class="sa-hero-grid"><div>',
        '<span class="sa-health-pill ', statusClass(health), '">Status Core App: ', escapeHtml(health), '</span>',
        '<h3>Health Scope: ', escapeHtml(humanText(data.health_scope || 'CORE_APP_ONLY')), '</h3>',
        '<p>Periode: ', escapeHtml(periodLabel), ' · Update: ', escapeHtml(formatWita(data.generated_at)), ' · Panel: ', escapeHtml(summaryPanelLabel(data)), ' · Ambang lambat: ', escapeHtml(fmt(data.slow_threshold_ms)), ' ms · Cache: ', escapeHtml(data.cache_hit ? 'HIT' : 'MISS'), '</p>',
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
          }).join('') : '<div class="sa-critical-item sa-critical-green"><strong>Normal</strong><span class="sa-muted">Tidak ada status kritis Core App pada sampel log terbaru.</span></div>'),
          (diagnosticCriticalItems.length ? '<h4 style="margin:10px 0 6px">Diagnostic/Admin lambat</h4>' + diagnosticCriticalItems.map(function (item) {
            var sev = String(item.severity || 'YELLOW').toLowerCase();
            return '<div class="sa-critical-item sa-critical-' + escapeHtml(sev) + '"><strong>' + escapeHtml(item.title || 'Diagnostic/Admin lambat') + '</strong><span class="sa-muted">' + escapeHtml(item.message || '') + '</span></div>';
          }).join('') : ''),
        '</div><p class="sa-footnote">Early warning berbasis log periode terpilih. Core App dipisahkan dari monitor, diagnostic, simulasi, dan live-check Super Admin.</p></div>',
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

  function inferPerformanceGroup(action, category) {
    var a = String(action || '').trim();
    var cat = String(category || '').toUpperCase();
    var diagnostic = {
      superAdminWorkbookLiveCheck: true, superAdminWorkbookSnapshotOpen: true,
      superAdminWorkbookDetailOpen: true, runSuperAdminSecurityRiskSimulation: true,
      superAdminSecurityRiskSimulation: true, debugUnknownActionSimulation: true, debugAuthUserLookup_3BR5: true,
      debugAuthUserLookup: true, healthCheck: true
    };
    var clientEvent = {
      superAdminRefreshData: true, superAdminRefreshDataGuarded: true,
      superAdminRefreshForce: true, superAdminRefreshForceClientLegacyBlocked: true,
      superAdminRefreshForceClientStart: true, superAdminRefreshForceClientDone: true,
      superAdminRefreshForceClientGuarded: true, superAdminRefreshForceClientError: true,
      superAdminRefreshForceGuarded: true, superAdminWorkbookCardClick: true, superAdminBackendHealthRowClick: true,
      superAdminFrontendHealthRowClick: true, superAdminSecurityActionClick: true, CLIENT_PERFORMANCE: true
    };
    var securityAction = {
      superAdminRevokeSession: true, superAdminRevokeUserSessions: true, superAdminRevokeTeamSessions: true,
      superAdminRevokeKecamatanSessions: true, superAdminCreateSecurityCooldown: true, superAdminClearSecurityCooldown: true,
      superAdminBlockDevice: true, superAdminBlockUser: true, superAdminUnblockDevice: true, superAdminUnblockUser: true,
      revokeSecuritySessions: true, blockSecurityTarget: true, setSecurityCooldown: true, unblockSecurityTarget: true, clearSecurityCooldown: true
    };
    var monitorPrefix = /^getSuperAdmin/;
    if (securityAction[a]) return 'SECURITY_ACTION';
    if (diagnostic[a]) return 'DIAGNOSTIC';
    if (clientEvent[a]) return 'CLIENT_EVENT';
    if (monitorPrefix.test(a)) return 'SUPER_ADMIN_MONITOR';
    if (cat === 'MONITOR') return 'SUPER_ADMIN_MONITOR';
    return 'CORE_APP';
  }

  function normalizePerformanceGroup(row) {
    row = Object.assign({}, row || {});
    if (!row.performance_group) row.performance_group = inferPerformanceGroup(row.action, row.category);
    return row;
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

  function bottleneckBadge(value, row) {
    var cls = String(value || '').toUpperCase();
    var severity = cls === 'NONE' ? '' : (String(row && row.status || '').toUpperCase() === 'RED' ? ' red' : ' warn');
    return '<span class="sa-bottleneck-pill' + severity + '">' + escapeHtml(humanText(cls || '-')) + '</span>';
  }

  function performanceHeaders() {
    return [
      { key: 'action', label: 'Action' },
      { key: 'performance_group', label: 'Group', formatter: function (v, row) { return escapeHtml(humanText(v || row.category || '-')); } },
      { key: 'category', label: 'Kategori' },
      { key: 'count', label: 'Jumlah' },
      { key: 'avg_ms', label: 'Rata-rata ms' },
      { key: 'max_ms', label: 'Maks ms' },
      { key: 'open_sheet_ms', label: 'Sample buka sheet' },
      { key: 'read_rows', label: 'Sample baca' },
      { key: 'write_rows', label: 'Sample tulis' },
      { key: 'slow_count', label: 'Lambat' },
      { key: 'bottleneck_class', label: 'Bottleneck', formatter: bottleneckBadge },
      { key: 'bottleneck_reason', label: 'Alasan', wrap: true, formatter: function (v) { return '<span class="sa-bottleneck-reason">' + escapeHtml(humanText(v || '-')) + '</span>'; } },
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

  function renderCoreBottleneckSummary(rows, data) {
    rows = rows || [];
    data = data || {};
    var slowMs = Number(data.slow_threshold_ms || 1500) || 1500;
    var slowRows = rows.filter(function (r) { return Number(r.slow_count || 0) > 0 || Number(r.max_ms || 0) > slowMs; });
    if (!slowRows.length) {
      return '<div class="sa-panel"><h3>Core App Performance Drilldown</h3><p class="sa-muted">Tidak ada endpoint core yang melewati ambang ' + escapeHtml(fmt(slowMs)) + ' ms pada periode ini.</p></div>';
    }
    var top = slowRows.slice(0, 4).map(function (r) {
      return [
        '<div class="sa-bottleneck-card">',
          '<strong>', escapeHtml(r.action || '-'), '</strong>',
          '<span class="sa-bottleneck-pill ', String(r.status || '').toUpperCase() === 'RED' ? 'red' : 'warn', '">', escapeHtml(humanText(r.bottleneck_class || 'UNKNOWN_NEEDS_TRACE')), '</span>',
          '<p class="sa-muted" style="margin:6px 0 0">Max ', escapeHtml(fmt(r.max_ms || 0)), ' ms · Avg ', escapeHtml(fmt(r.avg_ms || 0)), ' ms · Sample ', escapeHtml(r.sample_request_id || '-'), '</p>',
          '<p class="sa-muted" style="margin:6px 0 0">', escapeHtml(humanText(r.bottleneck_reason || 'Belum ada alasan bottleneck.')), '</p>',
        '</div>'
      ].join('');
    }).join('');
    return [
      '<div class="sa-panel">',
        '<h3>Core App Performance Drilldown</h3>',
        '<p class="sa-muted">A9 tidak melonggarkan ambang ', escapeHtml(fmt(slowMs)), ' ms. Panel ini membedah penyebab YELLOW/RED berdasarkan log_performance: action, sample request_id, waktu, user/device termask, open_sheet_ms, read_rows, write_rows, cache, dan detail JSON ringkas.</p>',
        '<div class="sa-bottleneck-grid">', top, '</div>',
        '<p class="sa-footnote">Klik baris endpoint untuk membuka detail lengkap dan rekomendasi teknis. Token, password, NIK, spreadsheet_id, dan session_data tidak ditampilkan mentah.</p>',
      '</div>'
    ].join('');
  }

  function renderPerformance(data, title) {
    var target = byId('sa-tab-content');
    if (!target) return;
    var category = String(data.category || 'CORE').toUpperCase();
    var rows = getFilteredPerformanceRows((data.groups || []).map(normalizePerformanceGroup), category);
    target.innerHTML = [
      '<h3>', escapeHtml(title || 'Core App Performance'), '</h3>',
      '<p class="sa-muted">', escapeHtml(category === 'MONITOR' ? 'Monitor/Diagnostic Super Admin tidak memengaruhi Status Core App.' : 'Core App Performance hanya endpoint yang berdampak langsung pada aplikasi kader.'), '</p>',
      '<p class="sa-muted">Periode: ', escapeHtml(data.time_label || getTimeLabel()), ' · Kategori: ', escapeHtml(humanText(category)), ' · Total baris dianalisis: ', escapeHtml(fmtNumber(data.total_rows)), ' · Sumber baris: ', escapeHtml(fmtNumber(data.source_rows)), ' · Ambang lambat: ', escapeHtml(fmt(data.slow_threshold_ms)), ' ms · Cache: ', escapeHtml(data.cache_hit ? 'HIT' : 'MISS'), ' · Filter: ', escapeHtml(humanText(category === 'MONITOR' ? monitorFilter : performanceFilter)), '</p>',
      renderQuickFilters(category),
      category === 'CORE' ? renderCoreBottleneckSummary(rows, data) : '',
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
      groups: data.core_performance_drilldown || data.core_performance || []
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
      if (row.recommendation) return row.recommendation;
      var openSheet = Number(row.open_sheet_ms || row.max_open_sheet_ms || 0);
      var readRows = Number(row.read_rows || row.max_read_rows || 0);
      var writeRows = Number(row.write_rows || row.max_write_rows || 0);
      var maxMs = Number(row.max_ms || 0);
      var avgMs = Number(row.avg_ms || 0);
      var cls = String(row.bottleneck_class || '').toUpperCase();
      if (cls === 'TOKEN_SESSION_WRITE_OVERHEAD') return 'Login lambat berkorelasi dengan tulis token/session/audit. Bedah token_store, active_session_index, dan log login sebelum optimasi.';
      if (cls === 'CACHE_MISS_OR_UNCACHED_READ') return 'Cache miss dominan. Periksa key CacheService, TTL, warm path, dan penggunaan read model.';
      if (openSheet > 1000) return 'Indikasi bottleneck akses spreadsheet. Audit openById, route workbook, dan cache referensi.';
      if (readRows > 1000) return 'Endpoint membaca banyak baris. Pertimbangkan list lite, paging, atau read model.';
      if (writeRows >= 2) return 'Ada beberapa operasi tulis pada request lambat. Audit tulis log/audit/token agar tidak membuka workbook berulang.';
      if (maxMs > 4000 && openSheet === 0) return 'Durasi tinggi tanpa open sheet besar. Kemungkinan cold start Apps Script, logging, atau token/session write.';
      if (avgMs > 1500) return 'Rata-rata endpoint melewati ambang. Prioritaskan optimasi endpoint ini. Perhatikan group performance agar Core App tidak tercampur monitor/diagnostic.';
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
    if (type === 'frontend_health') {
      var cls = String(row.classification || '').toUpperCase();
      if (cls === 'DIRECT_ACTIVE_FATAL_ERROR' || cls === 'DIRECT_FATAL_ERROR') return 'RED berarti ada fatal aktif langsung pada asset. Cocokkan request_id, action, source, dan stack sebelum mengganti file.';
      if (cls === 'HISTORICAL_FATAL_ONLY') return 'YELLOW historis: pernah ada fatal pada asset ini, tetapi tidak ada fatal aktif dalam active window. Pantau apakah jumlah aktif bertambah setelah patch terbaru.';
      if (cls === 'TRANSPORT_WARNING_ONLY') return 'YELLOW transport: biasanya network/fetch warning pada lifecycle seperti logout. Bukan bukti file api.js rusak kecuali logout gagal fungsional atau warning aktif terus bertambah.';
      if (cls === 'LIFECYCLE_WARNING_ONLY') return 'YELLOW lifecycle: service worker/register/update warning. Pantau fitur Perbarui Aplikasi/offline, tetapi app shell tidak dianggap rusak bila tidak ada fatal aktif.';
      if (cls === 'WEAK_SIGNAL_ONLY' && Number(row.observability_signal_count || 0) > 0) return 'Observability/client performance: bukan bukti asset rusak. Gunakan hanya sebagai korelasi dengan request_id/action.';
      if (cls === 'REPEATED_ACTIVE_RUNTIME_ERROR' || cls === 'REPEATED_RUNTIME_ERROR') return 'Runtime aktif berulang melewati ambang. Cek pola evidence dan browser Console.';
      if (String(row.status || '').toUpperCase() === 'YELLOW') return 'YELLOW berarti perlu pantau/periksa, bukan otomatis rusak. Buka evidence samples dan lihat Fatal Aktif sebelum menyimpulkan.';
      return 'GREEN berarti tidak ada sinyal valid aktif untuk asset ini pada sampel terbaru atau hanya noise eksternal yang difilter.';
    }
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
      return ['action','performance_group','category','status','count','sample_count','slow_count','severe_count','avg_ms','min_ms','max_ms','sample_at','latest_at','sample_request_id','sample_user','sample_role','sample_device_id','sample_app_version','open_sheet_ms','read_rows','write_rows','max_open_sheet_ms','max_read_rows','max_write_rows','cache_hit','cache_miss','bottleneck_class','bottleneck_reason','recommendation','detail_summary','sample_detail'];
    }
    if (type === 'workbook') {
      return ['workbook_key','workbook_type','workbook_name','sheet_name','status','severity','issue_type','check_type','header_status','missing_headers','unknown_headers','last_row','last_column','max_rows','max_columns','used_cells','allocated_cells','usage_pct','recommendation','catatan','checked_at'];
    }
    if (type === 'frontend_health') {
      return ['component_key','asset_path','asset_type','load_stage','expected_global','is_required','is_active','status','error_signal','signal_source','classification','evidence_count','active_evidence_count','historical_evidence_count','fatal_error_count','active_fatal_count','historical_fatal_count','total_fatal_error_count','runtime_error_count','active_runtime_count','historical_runtime_count','lifecycle_warning_count','transport_warning_count','service_worker_warning_count','weak_signal_count','observability_signal_count','direct_match_count','relevant_error_count','noise_filtered_count','last_active_error_at','last_any_error_at','last_error_at','last_request_id','last_action','last_module','last_message','active_window_minutes','active_cutoff_at','evidence_samples','runtime_check','recommendation','catatan'];
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
    var result = await post('getSuperAdminSummary', timePayload({
      no_cache: opts.noCache === true,
      perf_rows: 80,
      error_rows: 20,
      security_rows: 30,
      login_rows: 25,
      slim_mode: true
    }));
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
    var result = await post('getSuperAdminPerformance', timePayload({ max_rows: 140, category: 'CORE', no_cache: opts.noCache === true, slim_mode: true }));
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.performance = true;
    renderPerformance(getData(result), 'Core App Performance');
  }

  async function loadMonitorPerformance(options) {
    var opts = options || {};
    activeTab = 'monitor';
    if (!opts.force && lastSummary) { tabLoaded.monitor = true; renderPerformanceFromSummary('MONITOR'); return; }
    setTabLoading('monitor endpoint');
    var result = await post('getSuperAdminPerformance', timePayload({ max_rows: 120, category: 'MONITOR', no_cache: opts.noCache === true, slim_mode: true }));
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.monitor = true;
    renderPerformance(getData(result), 'Monitor Endpoint Performance');
  }

  async function loadTraffic(options) {
    var opts = options || {};
    activeTab = 'traffic';
    setTabLoading('lalu lintas pengguna');
    var result = await post('getSuperAdminUserTraffic', timePayload({ max_rows: 140, no_cache: opts.noCache === true, slim_mode: true }));
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.traffic = true;
    renderTraffic(getData(result));
  }

  async function loadErrors(options) {
    var opts = options || {};
    activeTab = 'errors';
    setTabLoading('error');
    var result = await post('getSuperAdminRecentErrors', timePayload({ max_rows: 60, no_cache: opts.noCache === true, slim_mode: true }));
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.errors = true;
    renderErrors(getData(result));
  }

  async function loadSecurity(options) {
    var opts = options || {};
    activeTab = 'security';
    setTabLoading('security');
    var result = await post('getSuperAdminSecurity', timePayload({ max_rows: 100, no_cache: opts.noCache === true, slim_mode: true }));
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



  function securityRiskHeaders(kind) {
    if (kind === 'login') {
      return [
        { key: 'waktu', label: 'Waktu' },
        { key: 'id_user', label: 'ID User' },
        { key: 'severity', label: 'Status Risiko', formatter: function (v) { return badgeStatus(v); } },
        { key: 'login_result', label: 'Hasil Login' },
        { key: 'status_login', label: 'Status Raw' },
        { key: 'reason_code', label: 'Reason' },
        { key: 'perangkat', label: 'Device', formatter: function (v) { return escapeHtml(maskDeviceId(v)); } },
        { key: 'lokasi', label: 'Lokasi/IP hint' },
        { key: 'request_id', label: 'Request ID' },
        { key: 'detail', label: 'Detail', wrap: true }
      ];
    }
    if (kind === 'top') {
      return [
        { key: 'reason_code', label: 'Reason' },
        { key: 'id_user', label: 'ID User' },
        { key: 'device_id', label: 'Device', formatter: function (v) { return escapeHtml(maskDeviceId(v)); } },
        { key: 'event_count', label: 'Jumlah' }
      ];
    }
    return [
      { key: 'waktu', label: 'Waktu' },
      { key: 'severity', label: 'Severity', formatter: function (v) { return badgeStatus(v); } },
      { key: 'event_type', label: 'Event' },
      { key: 'decision_status', label: 'Decision' },
      { key: 'reason_code', label: 'Reason' },
      { key: 'aksi', label: 'Action' },
      { key: 'id_user', label: 'ID User' },
      { key: 'device_id', label: 'Device', formatter: function (v) { return escapeHtml(maskDeviceId(v)); } },
      { key: 'request_id', label: 'Request ID' },
      { key: 'detail', label: 'Detail', wrap: true }
    ];
  }

  function renderDiagnosisList(items) {
    items = items || [];
    return '<div class="sa-critical-list">' + items.map(function (it) {
      var sev = String(it.severity || '').toUpperCase();
      var cls = sev === 'CRITICAL' || sev === 'HIGH' ? 'sa-critical-red' : (sev === 'MEDIUM' ? 'sa-critical-yellow' : 'sa-critical-green');
      return '<div class="sa-critical-item ' + cls + '"><strong>' + escapeHtml(humanText(it.title || '-')) + '</strong><small>' + escapeHtml(humanText(sev || '-')) + '</small><p class="sa-muted" style="margin:6px 0 0">' + escapeHtml(humanText(it.recommendation || '')) + '</p></div>';
    }).join('') + '</div>';
  }

  function renderSecurityRisk(data) {
    var target = byId('sa-tab-content');
    if (!target) return;
    data = data || {};
    var summary = data.summary || {};
    var diagnosis = data.diagnosis || [];
    var highRisk = data.high_risk_events || [];
    var loginAttempts = data.login_attempts || [];
    var policyRows = data.policy_violations || [];
    var topReasons = data.top_reasons || [];
    var topUsers = data.top_users || [];
    var topDevices = data.top_devices || [];
    var topFailedReasons = data.top_failed_login_reasons || [];
    var topFailedDevices = data.top_failed_login_devices || [];

    target.innerHTML = [
      '<h3>Security Risk, Login Attempt & Policy Violation</h3>',
      '<p class="sa-muted">Paket 5D-R2 membaca log_security_event, log_user_login, dan sinyal performance untuk early warning. Paket ini belum melakukan auto-block atau revoke otomatis.</p>',
      '<div class="sa-actions" style="margin:8px 0 14px; gap:8px; flex-wrap:wrap">',
        '<button class="sa-btn sa-btn-light" data-security-sim="LOGIN_FAILED" type="button">Simulasi Login Gagal</button>',
        '<button class="sa-btn sa-btn-light" data-security-sim="UNKNOWN_ACTION" type="button">Simulasi Unknown Action</button>',
        '<button class="sa-btn sa-btn-light" data-security-sim="SCOPE_MISMATCH" type="button">Simulasi Scope Mismatch</button>',
        '<button class="sa-btn sa-btn-light" data-security-sim="DEVICE_MISMATCH" type="button">Simulasi Device Mismatch</button>',
        '<button class="sa-btn sa-btn-danger" data-security-sim="SENSITIVE_LEAK" type="button">Simulasi Sensitive Leak</button>',
      '</div>',
      '<section class="sa-grid">',
        cardHtml('Status Risiko', summary.status || 'GREEN', 'Status gabungan', summary.status === 'RED' ? 'sa-danger' : (summary.status === 'YELLOW' ? 'sa-warn' : '')),
        cardHtml('Risk Score', summary.risk_score || 0, 'Skor gabungan', (summary.risk_score || 0) >= 60 ? 'sa-danger' : ((summary.risk_score || 0) >= 20 ? 'sa-warn' : '')),
        cardHtml('Login Gagal', summary.login_failed || 0, 'Periode terpilih', (summary.login_failed || 0) >= 5 ? 'sa-warn' : ''),
        cardHtml('Login Sukses', summary.login_success || 0, 'Periode terpilih', ''),
        cardHtml('Security Deny', summary.security_denied || 0, 'DENY di log security', (summary.security_denied || 0) > 0 ? 'sa-warn' : ''),
        cardHtml('Scope/Policy', (summary.scope_mismatch || 0) + (summary.target_out_of_scope || 0) + (summary.role_forbidden || 0), 'Scope/role/target', ((summary.scope_mismatch || 0) + (summary.target_out_of_scope || 0) + (summary.role_forbidden || 0)) > 0 ? 'sa-danger' : ''),
        cardHtml('Sensitive Leak', summary.sensitive_leak || 0, 'Critical signal', (summary.sensitive_leak || 0) > 0 ? 'sa-danger' : ''),
      '</section>',
      '<section class="sa-layout">',
        '<div class="sa-panel"><h3>Diagnosis Awal</h3>', renderDiagnosisList(diagnosis), '</div>',
        '<div class="sa-panel"><h3>Top Security Reason</h3>', tableHtml([{ key: 'reason_code', label: 'Reason' }, { key: 'event_count', label: 'Jumlah' }], topReasons, 'security_reason'), '</div>',
        '<div class="sa-panel"><h3>Top Login Gagal</h3>',
          '<h4>Reason</h4>', tableHtml([{ key: 'reason_code', label: 'Reason' }, { key: 'event_count', label: 'Jumlah' }], topFailedReasons, 'failed_login_reason'),
          '<h4>Device</h4>', tableHtml([{ key: 'device_id', label: 'Device', formatter: function (v) { return escapeHtml(maskDeviceId(v)); } }, { key: 'event_count', label: 'Jumlah' }], topFailedDevices, 'failed_login_device'),
        '</div>',
        '<div class="sa-panel"><h3>Top User/Device</h3>',
          '<h4>User</h4>', tableHtml([{ key: 'id_user', label: 'ID User' }, { key: 'event_count', label: 'Jumlah' }], topUsers, 'security_top_user'),
          '<h4>Device</h4>', tableHtml([{ key: 'device_id', label: 'Device', formatter: function (v) { return escapeHtml(maskDeviceId(v)); } }, { key: 'event_count', label: 'Jumlah' }], topDevices, 'security_top_device'),
        '</div>',
      '</section>',
      '<section class="sa-panel" style="margin-top:12px"><h3>High Risk Events</h3>', tableHtml(securityRiskHeaders('event'), highRisk, 'security_risk_event'), '</section>',
      '<section class="sa-panel" style="margin-top:12px"><h3>Login Attempt Monitor</h3>', tableHtml(securityRiskHeaders('login'), loginAttempts, 'login_attempt'), '</section>',
      '<section class="sa-panel" style="margin-top:12px"><h3>Policy Violation Monitor</h3>', tableHtml(securityRiskHeaders('event'), policyRows, 'policy_violation'), '</section>'
    ].join('');

    bindDetailRows(highRisk, 'security_risk_event');
    bindPagination('security_risk_event', function () { renderSecurityRisk(data); });
    bindDetailRows(loginAttempts, 'login_attempt');
    bindPagination('login_attempt', function () { renderSecurityRisk(data); });
    bindDetailRows(policyRows, 'policy_violation');
    bindPagination('policy_violation', function () { renderSecurityRisk(data); });
    bindDetailRows(topReasons, 'security_reason');
    bindPagination('security_reason', function () { renderSecurityRisk(data); });
    bindDetailRows(topUsers, 'security_top_user');
    bindPagination('security_top_user', function () { renderSecurityRisk(data); });
    bindDetailRows(topDevices, 'security_top_device');
    bindPagination('security_top_device', function () { renderSecurityRisk(data); });
    bindDetailRows(topFailedReasons, 'failed_login_reason');
    bindPagination('failed_login_reason', function () { renderSecurityRisk(data); });
    bindDetailRows(topFailedDevices, 'failed_login_device');
    bindPagination('failed_login_device', function () { renderSecurityRisk(data); });

    Array.prototype.forEach.call(document.querySelectorAll('[data-security-sim]'), function (btn) {
      btn.addEventListener('click', function () { runSecurityRiskSimulation(btn.getAttribute('data-security-sim')); });
    });
  }



  function securityActionHeaders(kind) {
    if (kind === 'session') {
      return [
        { key: 'id_user', label: 'ID User' },
        { key: 'role', label: 'Role' },
        { key: 'device_id', label: 'Device', formatter: function (v) { return escapeHtml(maskDeviceId(v)); } },
        { key: 'id_tim', label: 'Tim' },
        { key: 'id_kecamatan', label: 'Kecamatan' },
        { key: 'last_seen', label: 'Last Seen' },
        { key: 'expired_at', label: 'Expired' },
        { key: 'token_ref', label: 'Token Ref' }
      ];
    }
    if (kind === 'block') {
      return [
        { key: 'block_id', label: 'Block ID' },
        { key: 'block_type', label: 'Tipe' },
        { key: 'target_id', label: 'Target' },
        { key: 'status', label: 'Status', formatter: function (v) { return badgeStatus(v); } },
        { key: 'reason_code', label: 'Reason' },
        { key: 'expired_at', label: 'Expired' },
        { key: 'created_by', label: 'Dibuat Oleh' },
        { key: 'catatan', label: 'Catatan', wrap: true }
      ];
    }
    if (kind === 'cooldown') {
      return [
        { key: 'cooldown_id', label: 'Cooldown ID' },
        { key: 'cooldown_type', label: 'Tipe' },
        { key: 'target_id', label: 'Target' },
        { key: 'status', label: 'Status', formatter: function (v) { return badgeStatus(v); } },
        { key: 'reason_code', label: 'Reason' },
        { key: 'expired_at', label: 'Expired' },
        { key: 'created_by', label: 'Dibuat Oleh' },
        { key: 'catatan', label: 'Catatan', wrap: true }
      ];
    }
    return [
      { key: 'timestamp', label: 'Waktu' },
      { key: 'action_type', label: 'Action' },
      { key: 'target_type', label: 'Tipe Target' },
      { key: 'target_id', label: 'Target' },
      { key: 'action_status', label: 'Status', formatter: function (v) { return badgeStatus(v); } },
      { key: 'reason_code', label: 'Reason' },
      { key: 'actor_id_user', label: 'Actor' },
      { key: 'catatan', label: 'Catatan', wrap: true }
    ];
  }

  function securityActionFormHtml() {
    return [
      '<section class="sa-panel" style="margin-top:12px">',
        '<h3>Tindakan Keamanan Manual</h3>',
        '<p class="sa-muted">Gunakan tindakan ini hanya setelah membaca Security Risk. Target akan divalidasi dulu. Block/cooldown dicatat sebagai policy; pada mode DRY_RUN login tetap diizinkan tetapi match dicatat sebagai sinyal keamanan.</p>',
        '<div class="sa-filter">',
          '<select id="sa-sec-action-target-type">',
            '<option value="USER">USER</option>',
            '<option value="DEVICE">DEVICE</option>',
            '<option value="USER_DEVICE">USER_DEVICE</option>',
            '<option value="TOKEN">TOKEN</option>',
            '<option value="TEAM">TEAM</option>',
            '<option value="KECAMATAN">KECAMATAN</option>',
          '</select>',
          '<input id="sa-sec-action-target-id" placeholder="target_id: id_user / device_id / token / id_tim / kecamatan">',
          '<input id="sa-sec-action-target-scope" placeholder="target_scope opsional, mis. device untuk USER_DEVICE">',
          '<input id="sa-sec-action-minutes" type="number" min="1" value="15" placeholder="menit cooldown/block">',
          '<input id="sa-sec-action-note" placeholder="catatan/alasan tindakan">',
        '</div>',
        '<div class="sa-actions">',
          '<button type="button" class="sa-btn sa-btn-primary" data-sec-action="revoke">Revoke Session</button>',
          '<button type="button" class="sa-btn sa-btn-danger" data-sec-action="block">Block Target</button>',
          '<button type="button" class="sa-btn sa-btn-soft" data-sec-action="cooldown">Cooldown Target</button>',
        '</div>',
      '</section>'
    ].join('');
  }

  function getSecurityActionInput() {
    return {
      target_type: (byId('sa-sec-action-target-type') && byId('sa-sec-action-target-type').value) || 'USER',
      target_id: (byId('sa-sec-action-target-id') && byId('sa-sec-action-target-id').value || '').trim(),
      target_scope: (byId('sa-sec-action-target-scope') && byId('sa-sec-action-target-scope').value || '').trim(),
      minutes: Number((byId('sa-sec-action-minutes') && byId('sa-sec-action-minutes').value) || 15) || 15,
      reason_text: (byId('sa-sec-action-note') && byId('sa-sec-action-note').value || '').trim() || 'Tindakan manual melalui Security Action Center',
      confirmation_note: 'Konfirmasi dari dashboard Super Admin'
    };
  }

  async function executeSecurityAction(kind, payload) {
    payload = payload || getSecurityActionInput();
    if (!payload.target_id) {
      showToast('target_id wajib diisi.', 'warning');
      return;
    }
    var label = kind === 'revoke' ? 'Revoke session' : (kind === 'block' ? 'Block target' : 'Cooldown target');
    var ok = true;
    try {
      ok = window.confirm(label + ' untuk ' + payload.target_type + ' = ' + payload.target_id + '?\n\nTindakan ini akan dicatat sebagai audit Super Admin. Untuk aksi massal, backend akan menerapkan guard tambahan.');
    } catch (err) {}
    if (!ok) return;

    var action = kind === 'revoke' ? 'revokeSecuritySessions' : (kind === 'block' ? 'blockSecurityTarget' : 'setSecurityCooldown');
    var started = Date.now();
    var apiPayload = Object.assign({}, payload, { no_cache: true });
    if (kind === 'block') apiPayload.block_type = apiPayload.target_type;
    if (kind === 'cooldown') apiPayload.cooldown_type = apiPayload.target_type;
    var result = await post(action, timePayload(apiPayload));
    reportClientPerf('superAdminSecurityAction_' + kind, started, { target_type: payload.target_type, target_id: payload.target_id });
    if (!result || result.ok === false) {
      showToast((result && result.message) || 'Tindakan keamanan gagal.', 'error');
      return;
    }
    showToast((result && result.message) || (label + ' berhasil.'), 'success');
    await loadSecurityActionCenter({ noCache: true });
  }

  async function clearSecurityPolicy(kind, id) {
    id = String(id || '').trim();
    if (!id) return;
    var label = kind === 'block' ? 'Cabut block' : 'Cabut cooldown';
    var ok = true;
    try { ok = window.confirm(label + ' ' + id + '?'); } catch (err) {}
    if (!ok) return;
    var action = kind === 'block' ? 'unblockSecurityTarget' : 'clearSecurityCooldown';
    var payload = kind === 'block' ? { block_id: id } : { cooldown_id: id };
    var result = await post(action, timePayload(payload));
    if (!result || result.ok === false) return showToast((result && result.message) || 'Gagal mencabut policy.', 'error');
    showToast((result && result.message) || 'Policy berhasil dicabut.', 'success');
    await loadSecurityActionCenter({ noCache: true });
  }

  function policyActionButtons(rows, kind) {
    return (rows || []).map(function (r) {
      var id = kind === 'block' ? r.block_id : r.cooldown_id;
      var status = String(r.status || '').toUpperCase();
      r._action = status === 'ACTIVE'
        ? '<button type="button" class="sa-btn sa-btn-soft" style="padding:5px 8px" data-sec-clear="' + escapeHtml(kind) + '" data-sec-policy-id="' + escapeHtml(id) + '">Cabut</button>'
        : '-';
      return r;
    });
  }

  function renderSecurityActionCenter(data) {
    var target = byId('sa-tab-content');
    if (!target) return;
    data = data || {};
    var s = data.summary || {};
    var sessions = data.active_sessions || [];
    var blocks = policyActionButtons(data.blocklist || [], 'block');
    var cooldowns = policyActionButtons(data.cooldowns || [], 'cooldown');
    var actions = data.action_logs || data.actions || [];
    var resultMode = String(data.result_mode || s.result_mode || '').toUpperCase();
    var isSafeFallback = resultMode === 'SAFE_FALLBACK';
    var blockHeaders = securityActionHeaders('block').concat([{ key: '_action', label: 'Aksi', formatter: function (v) { return v || '-'; } }]);
    var cooldownHeaders = securityActionHeaders('cooldown').concat([{ key: '_action', label: 'Aksi', formatter: function (v) { return v || '-'; } }]);

    target.innerHTML = [
      '<h3>Security Action Center</h3>',
      '<p class="sa-muted">Paket 5E-R4A: target validation & safe enforcement dry-run. Update: ', escapeHtml(formatWita(data.generated_at)), ' · Service: ', escapeHtml(fmt(data.service_version)), '</p>',
      isSafeFallback ? '<div class="sa-critical-item sa-critical-yellow" style="margin:8px 0 12px"><strong>Security Action Center belum aktif penuh</strong><span class="sa-muted"> Monitoring tetap aktif; revoke/block belum dijalankan.</span></div>' : '',
      (data.enforcement && data.enforcement.message ? '<div class="sa-critical-item sa-critical-yellow" style="margin:8px 0 12px"><strong>Mode enforcement: ' + escapeHtml(data.enforcement.mode || '-') + '</strong><span class="sa-muted"> ' + escapeHtml(data.enforcement.message || '') + '</span></div>' : ''),
      '<section class="sa-grid">',
        cardHtml('Session aktif', s.active_sessions || 0, 'Dari token_store'),
        cardHtml('Block aktif', s.active_blocks || 0, 'security_blocklist', s.active_blocks ? 'sa-danger' : ''),
        cardHtml('Cooldown aktif', s.active_cooldowns || 0, 'security_cooldown', s.active_cooldowns ? 'sa-warn' : ''),
        cardHtml('Action log', s.recent_actions || 0, 'security_action_log'),
        cardHtml('Status', s.status || 'GREEN', 'Ringkasan policy aktif', s.status === 'YELLOW' ? 'sa-warn' : ''),
      '</section>',
      securityActionFormHtml(),
      '<section class="sa-panel" style="margin-top:12px"><h3>Active Sessions</h3>', tableHtml(securityActionHeaders('session'), sessions, 'security_action_session'), '</section>',
      '<section class="sa-panel" style="margin-top:12px"><h3>Security Blocklist</h3>', tableHtml(blockHeaders, blocks, 'security_action_block'), '</section>',
      '<section class="sa-panel" style="margin-top:12px"><h3>Security Cooldown</h3>', tableHtml(cooldownHeaders, cooldowns, 'security_action_cooldown'), '</section>',
      '<section class="sa-panel" style="margin-top:12px"><h3>Security Action Log</h3>', tableHtml(securityActionHeaders('action'), actions, 'security_action_log'), '</section>'
    ].join('');

    Array.prototype.forEach.call(document.querySelectorAll('[data-sec-action]'), function (btn) {
      btn.addEventListener('click', function () { executeSecurityAction(btn.getAttribute('data-sec-action')); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-sec-clear]'), function (btn) {
      btn.addEventListener('click', function () { clearSecurityPolicy(btn.getAttribute('data-sec-clear'), btn.getAttribute('data-sec-policy-id')); });
    });
    bindDetailRows(sessions, 'security_action_session');
    bindPagination('security_action_session', function () { renderSecurityActionCenter(data); });
    bindDetailRows(blocks, 'security_action_block');
    bindPagination('security_action_block', function () { renderSecurityActionCenter(data); });
    bindDetailRows(cooldowns, 'security_action_cooldown');
    bindPagination('security_action_cooldown', function () { renderSecurityActionCenter(data); });
    bindDetailRows(actions, 'security_action_log');
    bindPagination('security_action_log', function () { renderSecurityActionCenter(data); });
  }

  async function loadSecurityActionCenter(options) {
    var opts = options || {};
    activeTab = 'securityAction';
    setTabLoading('security action center');
    var result = await post('getSuperAdminSecurityActionCenter', timePayload({ no_cache: opts.noCache === true }));
    if (!result || result.ok === false) {
      var fallbackData = getData(result);
      var mode = String((fallbackData && (fallbackData.result_mode || (fallbackData.summary && fallbackData.summary.result_mode))) || '').toUpperCase();
      if (mode === 'SAFE_FALLBACK') {
        tabLoaded.securityAction = true;
        return renderSecurityActionCenter(fallbackData);
      }
      return setTabError(result && result.message);
    }
    tabLoaded.securityAction = true;
    renderSecurityActionCenter(getData(result));
  }

  async function runSecurityRiskSimulation(scenario) {
    scenario = String(scenario || 'LOGIN_FAILED').toUpperCase();
    var label = humanText(scenario);
    var ok = true;
    try {
      ok = window.confirm('Jalankan simulasi Security Risk: ' + label + '?\n\nSimulasi akan menulis log uji ke TPK_LOG_DATABASE untuk validasi dashboard.');
    } catch (err) {}
    if (!ok) return;
    var started = Date.now();
    var result = await post('runSuperAdminSecurityRiskSimulation', timePayload({ scenario: scenario, no_cache: true }));
    reportClientPerf('superAdminSecurityRiskSimulation', started, { scenario: scenario });
    if (!result || result.ok === false) {
      showToast((result && result.message) || 'Simulasi gagal.', 'error');
      return;
    }
    showToast('Simulasi ' + label + ' berhasil dicatat. Refresh data Security Risk...', 'success');
    await loadSecurityRisk({ noCache: true });
  }

  async function loadSecurityRisk(options) {
    var opts = options || {};
    activeTab = 'securityRisk';
    setTabLoading('security risk');
    var result = await post('getSuperAdminSecurityRiskSummary', timePayload({ no_cache: opts.noCache === true }));
    if (!result || result.ok === false) return setTabError(result && result.message);
    tabLoaded.securityRisk = true;
    renderSecurityRisk(getData(result));
  }


  function getFrontendMetricValue(data, summary, key, legacyKey) {
    summary = summary || {};
    data = data || {};
    var n = Number(summary[key]);
    if (isFinite(n) && !isNaN(n)) return n;
    n = Number(data[legacyKey || ('frontend_' + key)]);
    if (isFinite(n) && !isNaN(n)) return n;
    return 0;
  }

  function getFrontendPresentationMetrics(data) {
    data = data || {};
    var summary = data.summary || {};
    return {
      status: String(summary.status || 'GREEN').toUpperCase(),
      red: Number(summary.red || 0) || 0,
      yellow: Number(summary.yellow || 0) || 0,
      green: Number(summary.green || 0) || 0,
      activeEvidence: getFrontendMetricValue(data, summary, 'active_evidence_count', 'frontend_active_evidence_count'),
      activeFatal: getFrontendMetricValue(data, summary, 'active_fatal_count', 'frontend_active_fatal_count'),
      historicalFatal: getFrontendMetricValue(data, summary, 'historical_fatal_count', 'frontend_historical_fatal_count'),
      lifecycle: getFrontendMetricValue(data, summary, 'lifecycle_warning_count', 'frontend_lifecycle_warning_count'),
      transport: getFrontendMetricValue(data, summary, 'transport_warning_count', 'frontend_transport_warning_count'),
      observability: getFrontendMetricValue(data, summary, 'observability_signal_count', 'frontend_observability_signal_count'),
      weak: getFrontendMetricValue(data, summary, 'weak_signal_count', 'frontend_weak_signal_count'),
      noise: getFrontendMetricValue(data, summary, 'noise_filtered_count', 'frontend_noise_filtered_count'),
      windowMinutes: getFrontendMetricValue(data, summary, 'active_window_minutes', 'frontend_active_window_minutes')
    };
  }

  function frontendStatusExplanationText(data) {
    var m = getFrontendPresentationMetrics(data);
    if (m.activeFatal > 0 || m.red > 0) {
      return 'RED: ada fatal aktif pada active window. Prioritasnya cek request_id, action, source, dan stack pada baris merah.';
    }
    if (m.yellow > 0) {
      return 'YELLOW: tidak ada fatal aktif, tetapi masih ada catatan historis/lifecycle/transport/weak signal yang perlu dipantau.';
    }
    return 'GREEN: tidak ada sinyal valid yang perlu ditindaklanjuti pada sampel frontend terbaru.';
  }

  function frontendYellowExplanationHtml(data) {
    var m = getFrontendPresentationMetrics(data);
    var activeWindow = m.windowMinutes ? (m.windowMinutes + ' menit') : 'periode aktif';
    var headline = frontendStatusExplanationText(data);
    return [
      '<section class="sa-panel" style="margin:10px 0;background:#f8fbff">',
        '<h3>Penjelasan Status Frontend/PWA</h3>',
        '<p class="sa-muted"><strong>', escapeHtml(headline), '</strong></p>',
        '<div class="sa-critical-list" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));display:grid">',
          '<div class="sa-critical-item sa-critical-red"><strong>RED = fatal aktif</strong><span class="sa-muted">Ada error runtime/fatal yang masih muncul dalam active window. Ini perlu dibedah sebagai masalah aktif.</span></div>',
          '<div class="sa-critical-item sa-critical-yellow"><strong>YELLOW = warning / historis</strong><span class="sa-muted">Fatal lama, lifecycle service worker, transport logout/network, atau weak signal. Tidak otomatis berarti file masih rusak.</span></div>',
          '<div class="sa-critical-item sa-critical-green"><strong>GREEN = tidak ada sinyal valid</strong><span class="sa-muted">Asset terdaftar dan tidak memiliki evidence error valid pada sampel terbaru.</span></div>',
        '</div>',
        '<p class="sa-footnote">Active window: ', escapeHtml(activeWindow),
        ' · Fatal aktif: ', escapeHtml(fmtNumber(m.activeFatal)),
        ' · Fatal historis: ', escapeHtml(fmtNumber(m.historicalFatal)),
        ' · Lifecycle: ', escapeHtml(fmtNumber(m.lifecycle)),
        ' · Transport: ', escapeHtml(fmtNumber(m.transport)),
        ' · Observability: ', escapeHtml(fmtNumber(m.observability)),
        ' · Noise eksternal: ', escapeHtml(fmtNumber(m.noise)), '</p>',
      '</section>'
    ].join('');
  }

  function frontendExtraCardsHtml(data) {
    var m = getFrontendPresentationMetrics(data);
    return [
      '<section class="sa-grid" style="grid-template-columns:repeat(6,minmax(0,1fr));margin-top:0">',
        cardHtml('Fatal aktif', m.activeFatal, 'RED hanya bila > 0', m.activeFatal > 0 ? 'sa-danger' : ''),
        cardHtml('Fatal historis', m.historicalFatal, 'Catatan lama, bukan aktif', m.historicalFatal > 0 ? 'sa-warn' : ''),
        cardHtml('Lifecycle', m.lifecycle, 'Service worker/update', m.lifecycle > 0 ? 'sa-warn' : ''),
        cardHtml('Transport', m.transport, 'Logout/network/fetch', m.transport > 0 ? 'sa-warn' : ''),
        cardHtml('Observability', m.observability, 'Client performance/log', ''),
        cardHtml('Window aktif', m.windowMinutes || '-', 'Menit evidence aktif', ''),
      '</section>'
    ].join('');
  }

  function componentHealthHeaders(kind) {
    if (kind === 'frontend') {
      return [
        { key: 'component_key', label: 'Asset' },
        { key: 'asset_path', label: 'Path' },
        { key: 'asset_type', label: 'Jenis' },
        { key: 'load_stage', label: 'Tahap' },
        { key: 'error_signal', label: 'Sinyal' },
        { key: 'classification', label: 'Klasifikasi' },
        { key: 'evidence_count', label: 'Evidence' },
        { key: 'active_evidence_count', label: 'Aktif' },
        { key: 'active_fatal_count', label: 'Fatal Aktif' },
        { key: 'historical_fatal_count', label: 'Fatal Historis' },
        { key: 'lifecycle_warning_count', label: 'Lifecycle' },
        { key: 'transport_warning_count', label: 'Transport' },
        { key: 'weak_signal_count', label: 'Weak' },
        { key: 'observability_signal_count', label: 'Observability' },
        { key: 'noise_filtered_count', label: 'Noise' },
        { key: 'last_action', label: 'Action terakhir' },
        { key: 'last_request_id', label: 'Request ID' },
        { key: 'last_message', label: 'Pesan terakhir', wrap: true },
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
      ? 'Cek frontend berbasis frontend_asset_registry + active evidence window. R2-R3 merapikan arti warna: RED untuk fatal aktif, YELLOW untuk historical/lifecycle/transport/weak warning, GREEN untuk tanpa sinyal valid.'
      : 'Cek backend berbasis backend_service_registry + sinyal log_performance. Detail endpoint bisnis berat tetap on-demand.';
    var frontendNoiseInfo = kind === 'frontend'
      ? (' · Error relevan: ' + fmtNumber(summary.relevant_error_count || data.frontend_relevant_error_count || 0) + ' · Evidence: ' + fmtNumber(summary.evidence_count || data.frontend_evidence_count || 0) + ' · Active: ' + fmtNumber(summary.active_evidence_count || data.frontend_active_evidence_count || 0) + ' · Active fatal: ' + fmtNumber(summary.active_fatal_count || data.frontend_active_fatal_count || summary.fatal_error_count || data.frontend_fatal_error_count || 0) + ' · Historical fatal: ' + fmtNumber(summary.historical_fatal_count || data.frontend_historical_fatal_count || 0) + ' · Lifecycle: ' + fmtNumber(summary.lifecycle_warning_count || data.frontend_lifecycle_warning_count || 0) + ' · Transport: ' + fmtNumber(summary.transport_warning_count || data.frontend_transport_warning_count || 0) + ' · Obs: ' + fmtNumber(summary.observability_signal_count || data.frontend_observability_signal_count || 0) + ' · Noise eksternal difilter: ' + fmtNumber(summary.noise_filtered_count || data.frontend_noise_filtered_count || 0) + ' · Window: ' + fmtNumber(summary.active_window_minutes || data.frontend_active_window_minutes || 0) + ' menit')
      : '';
    var html = [
      '<h3>', escapeHtml(title), '</h3>',
      '<p class="sa-muted">Mode: ', escapeHtml(data.mode || 'SUMMARY'), ' · Status: ', badgeStatus(summary.status || 'GREEN'), ' · Komponen: ', escapeHtml(fmtNumber(summary.total || rows.length)), ' · RED: ', escapeHtml(fmtNumber(summary.red || 0)), ' · YELLOW: ', escapeHtml(fmtNumber(summary.yellow || 0)), ' · GREEN: ', escapeHtml(fmtNumber(summary.green || 0)), ' · Cache: ', escapeHtml(data.cache_hit ? 'HIT' : 'MISS'), ' · Update: ', escapeHtml(formatWita(data.generated_at)), escapeHtml(frontendNoiseInfo), '</p>',
      '<section class="sa-grid">',
        cardHtml('Komponen terdaftar', summary.total || rows.length, kind === 'frontend' ? 'Dari frontend_asset_registry' : 'Dari backend_service_registry', ''),
        cardHtml('Merah', summary.red || 0, 'Perlu perhatian', (summary.red || 0) > 0 ? 'sa-danger' : ''),
        cardHtml('Kuning', summary.yellow || 0, 'Pantau/periksa', (summary.yellow || 0) > 0 ? 'sa-warn' : ''),
        cardHtml('Hijau', summary.green || 0, 'Sehat', ''),
        cardHtml(kind === 'frontend' ? 'Versi Frontend Health' : 'Versi Backend Health', componentHealthVersionLabel(data, kind), componentHealthVersionHint(data, kind), 'sa-version-card'),
        cardHtml('Pola cek', kind === 'frontend' ? 'Active Evidence' : 'Log signal', kind === 'frontend' ? 'Registry + active window' : 'Ringan', ''),
      '</section>',
      kind === 'frontend' ? frontendExtraCardsHtml(data) : '',
      kind === 'frontend' ? frontendYellowExplanationHtml(data) : '',
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
        if (tab === 'securityRisk') return loadSecurityRisk();
        if (tab === 'securityAction') return loadSecurityActionCenter();
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

  function handleRefreshForceClick(event) {
    try {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      }
    } catch (err) {}
    refreshAll({
      noCache: true,
      source: 'force_button',
      client_handler_version: PATCH_5E_R4C_R2_R2_VERSION,
      hard_stop_capture_handler: true
    });
    return false;
  }

  function handleRefreshDataClick(event) {
    try {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
    } catch (err) {}
    refreshAll({
      noCache: false,
      source: 'cache_button',
      client_handler_version: PATCH_5E_R4C_R2_R2_VERSION
    });
    return false;
  }

  function bindHeader() {
    try { window[REFRESH_FORCE_HANDLER_GLOBAL_KEY] = PATCH_5E_R4C_R2_R2_VERSION; } catch (err) {}
    updateRefreshButtons();

    var refresh = byId('sa-refresh');
    if (refresh && refresh.dataset.forceHandlerBound !== PATCH_5E_R4C_R2_R2_VERSION) {
      refresh.dataset.forceHandlerBound = PATCH_5E_R4C_R2_R2_VERSION;
      refresh.onclick = null;
      // Capture + stopImmediatePropagation memutus handler lama bila masih ada delegasi/bubble listener.
      refresh.addEventListener('click', handleRefreshForceClick, true);
    }

    var refreshCache = byId('sa-refresh-cache');
    if (refreshCache && refreshCache.dataset.cacheHandlerBound !== PATCH_5E_R4C_R2_R2_VERSION) {
      refreshCache.dataset.cacheHandlerBound = PATCH_5E_R4C_R2_R2_VERSION;
      refreshCache.onclick = null;
      refreshCache.addEventListener('click', handleRefreshDataClick, true);
    }

    var logout = byId('sa-logout');
    if (logout && logout.dataset.logoutBound !== '1') {
      logout.dataset.logoutBound = '1';
      logout.addEventListener('click', logoutSuperAdmin);
    }
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
    var useNoCache = opts.noCache === true && opts.fromForce !== true;
    var preferSummary = opts.preferSummary === true;

    if (preferSummary && lastSummary && (activeTab === 'performance' || activeTab === 'monitor')) {
      return renderCurrentPerformanceFromSnapshot();
    }

    if (activeTab === 'performance') return loadPerformance({ force: true, noCache: useNoCache });
    if (activeTab === 'monitor') return loadMonitorPerformance({ force: true, noCache: useNoCache });
    if (activeTab === 'traffic') return loadTraffic({ noCache: useNoCache });
    if (activeTab === 'errors') return loadErrors({ noCache: useNoCache });
    if (activeTab === 'security') return loadSecurity({ noCache: useNoCache });
    if (activeTab === 'securityRisk') return loadSecurityRisk({ noCache: useNoCache });
    if (activeTab === 'securityAction') return loadSecurityActionCenter({ noCache: useNoCache });
    if (activeTab === 'workbook') {
      if (selectedWorkbookKey) return loadWorkbookDetail(selectedWorkbookKey, { noCache: useNoCache, forceCheck: false });
      return loadWorkbookHealth({ noCache: useNoCache });
    }
    if (activeTab === 'backend') return loadBackendHealth({ noCache: useNoCache });
    if (activeTab === 'frontend') return loadFrontendHealth({ noCache: useNoCache });
    if (activeTab === 'logs') return renderLogs({ items: [], time_label: getTimeLabel() });
  }

  async function refreshAll(options) {
    var startedAt = Date.now();
    var opts = options || {};
    var force = opts.noCache === true;
    var metricAction = force ? 'superAdminRefreshForceClientDone' : 'superAdminRefreshData';
    if (force && opts.source === 'force_button') {
      try { window[REFRESH_FORCE_HANDLER_GLOBAL_KEY] = PATCH_5E_R4C_R2_R2_VERSION; } catch (ignore) {}
    }

    if (force) {
      var remaining = refreshGuardSecondsLeft();
      if (refreshForceInFlight) {
        updateRefreshButtons('Refresh Paksa sedang berjalan. Mohon tunggu proses saat ini selesai.');
        reportClientPerf('superAdminRefreshForceClientGuarded', startedAt, refreshMetricExtra(true, 'SUCCESS', {
          skipped: true,
          refresh_guard: 'IN_FLIGHT_CLIENT_GUARD',
          metric_duration_ms: Math.max(0, Date.now() - startedAt),
          detail: 'Refresh Paksa dihentikan di frontend karena request sebelumnya masih berjalan. Tidak ada API tambahan dipanggil.'
        }));
        showToast('Refresh Paksa sedang berjalan. Tunggu sampai selesai.', 'info');
        return;
      }
      if (remaining > 0) {
        if (lastSummary) renderCurrentPerformanceFromSnapshot();
        updateRefreshButtons('Refresh Paksa dikunci ' + remaining + ' detik. Snapshot terakhir digunakan.');
        reportClientPerf('superAdminRefreshForceClientGuarded', startedAt, refreshMetricExtra(true, 'SUCCESS', {
          skipped: true,
          refresh_guard: 'CLIENT_COOLDOWN_HARD_STOP',
          cooldown_remaining_sec: remaining,
          snapshot_used: !!lastSummary,
          metric_duration_ms: Math.max(0, Date.now() - startedAt),
          detail: 'Refresh Paksa dihentikan total di frontend; tidak ada API dipanggil dan snapshot terakhir digunakan.'
        }));
        showToast('Refresh Paksa masih dalam cooldown. Snapshot terakhir digunakan.', 'info');
        return;
      }
    } else if (refreshDataInFlight || refreshForceInFlight) {
      updateRefreshButtons('Refresh sedang berjalan. Mohon tunggu.');
      reportClientPerf('superAdminRefreshDataGuarded', startedAt, refreshMetricExtra(false, 'SUCCESS', {
        skipped: true,
        refresh_guard: 'IN_FLIGHT_CLIENT_GUARD',
        metric_duration_ms: Math.max(0, Date.now() - startedAt),
        detail: 'Refresh Data dilewati karena refresh lain sedang berjalan.'
      }));
      return;
    }

    try {
      if (force) {
        refreshForceInFlight = true;
        markRefreshForceCooldown();
        updateRefreshButtons('Refresh Paksa berjalan. UI akan berhenti setelah summary/snapshot; tidak memanggil ulang panel berat.');
        reportClientPerf('superAdminRefreshForceClientStart', startedAt, refreshMetricExtra(true, 'SUCCESS', {
          refresh_flow: 'FORCE_CLIENT_HARD_STOP_STARTED',
          metric_duration_ms: Math.max(0, Date.now() - startedAt),
          client_handler_version: PATCH_5E_R4C_R2_R2_VERSION,
          detail: 'Refresh Paksa dimulai melalui single capture handler; frontend hard-stop aktif agar tidak memicu chain panel berat.'
        }));
      } else {
        refreshDataInFlight = true;
        updateRefreshButtons('Refresh Data berjalan.');
      }

      var beforeSummaryAt = Date.now();
      var summary = await loadSummary({ noCache: force });
      var afterSummaryAt = Date.now();
      var guardInfo = summarizeGuardInfo(summary);
      var clientRenderStartedAt = Date.now();

      if (summary) {
        if (force) {
          // Hard stop: jangan reload active tab melalui API setelah Refresh Paksa.
          // Cukup render ulang dari summary jika tab performa sedang aktif.
          renderCurrentPerformanceFromSnapshot();
        } else if (opts.timeChanged) {
          await reloadActiveTab({ noCache: false, fromTimeChanged: true });
        } else if (activeTab === 'monitor') {
          renderPerformanceFromSummary('MONITOR');
        } else if (activeTab === 'performance') {
          renderPerformanceFromSummary('CORE');
        }
      }

      var clientRenderMs = Math.max(0, Date.now() - clientRenderStartedAt);
      var backendWaitMs = Math.max(0, afterSummaryAt - beforeSummaryAt);
      var workflowElapsedMs = Math.max(0, Date.now() - startedAt);

      reportClientPerf(metricAction, startedAt, refreshMetricExtra(force, 'SUCCESS', {
        refresh_flow: force ? 'FORCE_CLIENT_CHAIN_HARD_STOPPED' : 'CACHE_REFRESH',
        active_tab_reloaded_with_no_cache: false,
        active_tab_api_chain_stopped: force === true,
        backend_guard: guardInfo,
        backend_wait_ms: backendWaitMs,
        client_render_ms: clientRenderMs,
        workflow_elapsed_ms: workflowElapsedMs,
        metric_duration_ms: force ? clientRenderMs : workflowElapsedMs,
        snapshot_or_cache_preferred: force === true,
        detail: force ? 'Refresh Paksa selesai dengan hard stop client chain; durasi metric hanya render/client guard, durasi backend dicatat terpisah.' : 'Refresh Data memakai cache/snapshot normal.'
      }));
      updateRefreshButtons(force ? 'Refresh Paksa selesai. Guard 60 detik tetap aktif; klik ulang tidak akan memanggil API.' : 'Dashboard Super Admin diperbarui.');
      showToast(force ? 'Dashboard diperbarui paksa. Klik berulang selama guard tidak akan memanggil API.' : 'Dashboard Super Admin diperbarui.', 'success');
    } catch (err) {
      reportClientPerf(force ? 'superAdminRefreshForceClientError' : metricAction, startedAt, refreshMetricExtra(force, 'ERROR', {
        error_message: err && err.message ? err.message : String(err || ''),
        detail: 'Refresh dashboard gagal di frontend flow.',
        metric_duration_ms: Math.max(0, Date.now() - startedAt)
      }));
      updateRefreshButtons('Refresh gagal. Periksa koneksi atau log error.');
      showToast(err && err.message ? err.message : 'Gagal memperbarui dashboard.', 'error');
    } finally {
      if (force) refreshForceInFlight = false;
      else refreshDataInFlight = false;
      updateRefreshButtons();
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


  function testSystemMonitorFrontendFinalSync_5E_R4D_A8() {
    var out = {
      ok: true,
      service_version: SYSTEM_MONITOR_FRONTEND_SYNC_VERSION,
      has_summary_panel_label: typeof summaryPanelLabel === 'function',
      has_component_version_label: typeof componentHealthVersionLabel === 'function',
      has_critical_dedupe: typeof normalizeCriticalItems === 'function',
      has_refresh_force_guard: typeof refreshAll === 'function' && typeof refreshMetricExtra === 'function',
      active_tab: activeTab,
      errors: []
    };
    if (String(out.service_version).indexOf('5E-R4D-A8') < 0) out.errors.push('Versi A8 belum terbaca');
    if (!out.has_summary_panel_label) out.errors.push('summaryPanelLabel belum tersedia');
    if (!out.has_component_version_label) out.errors.push('componentHealthVersionLabel belum tersedia');
    if (!out.has_critical_dedupe) out.errors.push('normalizeCriticalItems belum tersedia');
    if (!out.has_refresh_force_guard) out.errors.push('refresh force guard tidak lengkap');
    out.ok = out.errors.length === 0;
    return out;
  }

  window.SuperAdminDashboardView = {
    version: SYSTEM_MONITOR_FRONTEND_SYNC_VERSION,
    testSystemMonitorFrontendFinalSync_5E_R4D_A8: testSystemMonitorFrontendFinalSync_5E_R4D_A8,
    init: init,
    refresh: refreshAll,
    loadPerformance: loadPerformance,
    loadMonitorPerformance: loadMonitorPerformance,
    loadTraffic: loadTraffic,
    loadErrors: loadErrors,
    loadSecurity: loadSecurity,
    loadWorkbookHealth: loadWorkbookHealth,
    loadWorkbookDetail: loadWorkbookDetail,
    loadSecurityRisk: loadSecurityRisk,
    loadSecurityActionCenter: loadSecurityActionCenter,
    loadBackendHealth: loadBackendHealth,
    loadFrontendHealth: loadFrontendHealth,
    loadLogs: loadLogs
  };

  window.testSystemMonitorFrontendA8R1CriticalCleanup = function () {
    var critical = [
      { severity: 'YELLOW', title: 'Core endpoint aktif', message: 'Core endpoint aktif: getMyProfileLite max 4200 ms', type: 'CORE_ACTIVE' },
      { severity: 'YELLOW', title: 'Core endpoint aktif', message: 'Core endpoint lambat teratas: getMyProfileLite max 4200 ms', type: 'CORE_ACTIVE' },
      { severity: 'YELLOW', title: 'Diagnostic/Admin lambat', message: 'Diagnostic/Admin lambat: superAdminRefreshData max 19974 ms', type: 'BACKGROUND' },
      { severity: 'YELLOW', title: 'Diagnostic/Admin lambat', message: 'Monitor endpoint lambat: superAdminRefreshData max 19974 ms', type: 'BACKGROUND' }
    ];
    var split = splitCriticalItems(critical);
    var core = normalizeCriticalItems(split.core, 4);
    var diag = normalizeCriticalItems(split.diagnostic, 3);
    return {
      ok: core.length === 1 && diag.length === 1,
      version: SYSTEM_MONITOR_FRONTEND_SYNC_VERSION,
      core_count: core.length,
      diagnostic_count: diag.length,
      has_top_issue_normalizer: typeof normalizeTopIssues === 'function'
    };
  };


  window.testSystemMonitorFrontendA8R2R3PresentationPolish = function () {
    var sample = {
      summary: {
        status: 'YELLOW', red: 0, yellow: 3, green: 16,
        active_fatal_count: 0,
        historical_fatal_count: 4,
        lifecycle_warning_count: 1,
        transport_warning_count: 1,
        observability_signal_count: 2,
        noise_filtered_count: 0,
        active_window_minutes: 10
      }
    };
    var html = frontendYellowExplanationHtml(sample);
    return {
      ok: String(SYSTEM_MONITOR_FRONTEND_SYNC_VERSION).indexOf('5E-R4D-A8-R2-R3') >= 0 &&
        html.indexOf('YELLOW') >= 0 &&
        html.indexOf('fatal aktif') >= 0 &&
        humanText('HISTORICAL_FATAL_ONLY') === 'Fatal historis saja',
      version: SYSTEM_MONITOR_FRONTEND_SYNC_VERSION,
      explanation_has_yellow: html.indexOf('YELLOW') >= 0,
      explanation_has_active_fatal: html.indexOf('Fatal aktif') >= 0 || html.indexOf('fatal aktif') >= 0,
      classification_label: humanText('HISTORICAL_FATAL_ONLY')
    };
  };


  window.testSystemMonitorFrontendA9CorePerformanceDrilldown = function () {
    var sample = [{
      action: 'login', performance_group: 'CORE_APP', category: 'CORE', status: 'YELLOW', count: 2,
      avg_ms: 1800, max_ms: 3148, open_sheet_ms: 220, read_rows: 12, write_rows: 2,
      slow_count: 1, bottleneck_class: 'TOKEN_SESSION_WRITE_OVERHEAD', bottleneck_reason: 'Login lambat berkorelasi dengan tulis token/session/login audit.', sample_request_id: 'REQ-TEST'
    }];
    return {
      ok: String(SYSTEM_MONITOR_FRONTEND_SYNC_VERSION).indexOf('5E-R4D-A9') >= 0 &&
        typeof renderCoreBottleneckSummary === 'function' &&
        renderCoreBottleneckSummary(sample, { slow_threshold_ms: 1500 }).indexOf('Core App Performance Drilldown') >= 0,
      version: SYSTEM_MONITOR_FRONTEND_SYNC_VERSION,
      has_bottleneck_badge: typeof bottleneckBadge === 'function',
      has_drilldown_renderer: typeof renderCoreBottleneckSummary === 'function'
    };
  };

})(window, document);
