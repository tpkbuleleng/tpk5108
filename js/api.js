(function (window) {
  'use strict';

  var DEFAULT_TIMEOUT_MS = 45000;
  var DEFAULT_RETRY_COUNT = 0;
  var DEFAULT_READ_FALLBACK_TIMEOUT_MS = 15000;
  var DEFAULT_RETRY_DELAY_MS = 1200;
  var isReportingClientError = false;
  var recentReportMap = Object.create(null);
  var sessionInvalidRedirectScheduled = false;
  var CLIENT_PERF_REFRESH_FORCE_REWRITE_VERSION = '5E-R4C-R2-R2-API-CLIENT-METRIC-REWRITE-20260507';
  var API_RUNTIME_GUARD_VERSION = '5E-R4D-A8-R2-R1-API-CLIENT-PERFORMANCE-FRONTEND-HEALTH-GUARD-20260510';

  function isLogoutInProgress() {
    return window.__TPK_LOGOUT_IN_PROGRESS === true;
  }

  function isAppUpdateInProgress() {
    return window.__TPK_APP_UPDATE_IN_PROGRESS === true;
  }


  function isBootstrapRefreshCooldownActive() {
    try {
      var until = Number(window.__TPK_SKIP_BOOTSTRAP_REFRESH_UNTIL || 0);
      return until > 0 && Date.now() < until;
    } catch (err) {
      return false;
    }
  }

  function getSessionStatusKey() {
    return 'tpk_session_status';
  }

  function setSessionStatus(status, detail) {
    try {
      var storage = getStorage();
      var payload = Object.assign({
        status: String(status || ''),
        updated_at: nowIso()
      }, detail || {});
      if (storage && typeof storage.setSessionStatus === 'function') {
        storage.setSessionStatus(payload);
      } else {
        setStorageValue(getSessionStatusKey(), payload);
      }
      if (window.AppState && typeof window.AppState.setSessionStatus === 'function') {
        window.AppState.setSessionStatus(payload);
      }
    } catch (err) {}
  }

  function clearSessionStatus() {
    try {
      var storage = getStorage();
      if (storage && typeof storage.clearSessionStatus === 'function') {
        storage.clearSessionStatus();
      } else {
        removeStorageValue(getSessionStatusKey());
      }
      if (window.AppState && typeof window.AppState.clearSessionStatus === 'function') {
        window.AppState.clearSessionStatus();
      }
    } catch (err) {}
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function safeConsole(method, args) {
    try {
      if (window.console && typeof window.console[method] === 'function') {
        window.console[method].apply(window.console, args);
      }
    } catch (err) {}
  }

  function log() {
    safeConsole('log', arguments);
  }

  function warn() {
    safeConsole('warn', arguments);
  }

  function getConfig() {
    if (!window.APP_CONFIG) {
      throw new Error('APP_CONFIG belum tersedia.');
    }
    return window.APP_CONFIG;
  }

  function getActions() {
    return getConfig().API_ACTIONS || {};
  }

  function getActionName(actionKey, fallbackAction) {
    var actions = getActions();
    return actions[actionKey] || fallbackAction || actionKey || '';
  }

  function getStorage() {
    return window.Storage || null;
  }

  function getStorageValue(key, fallbackValue) {
    var storage = getStorage();

    if (storage && typeof storage.get === 'function') {
      return storage.get(key, fallbackValue);
    }

    try {
      var raw = window.localStorage.getItem(key);
      if (raw === null || raw === undefined || raw === '') {
        return fallbackValue;
      }
      return JSON.parse(raw);
    } catch (err) {
      return fallbackValue;
    }
  }

  function setStorageValue(key, value) {
    var storage = getStorage();

    if (storage && typeof storage.set === 'function') {
      storage.set(key, value);
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {}
  }

  function removeStorageValue(key) {
    var storage = getStorage();

    if (storage && typeof storage.remove === 'function') {
      storage.remove(key);
      return;
    }

    try {
      window.localStorage.removeItem(key);
    } catch (err) {}
  }

  function generateRandomToken() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (err) {}
    return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12);
  }

  function uniqueStrings(values) {
    var seen = {};
    var out = [];

    (values || []).forEach(function (value) {
      var text = String(value || '').trim();
      if (!text || seen[text]) return;
      seen[text] = true;
      out.push(text);
    });

    return out;
  }

  function getOrCreateDeviceId() {
    var config = getConfig();
    var key = config.STORAGE_KEYS.DEVICE_ID;
    var existing = getStorageValue(key, '');

    if (existing && String(existing).trim()) {
      return String(existing).trim();
    }

    var userAgent = '';
    try {
      userAgent = navigator.userAgent || '';
    } catch (err) {}

    var uaPart = '';
    try {
      uaPart = btoa(userAgent).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
    } catch (err) {
      uaPart = 'UA';
    }

    var newId = 'DEV-' + generateRandomToken() + '-' + uaPart;
    setStorageValue(key, newId);
    return newId;
  }

  function getSessionToken() {
    var config = getConfig();
    return getStorageValue(config.STORAGE_KEYS.SESSION_TOKEN, '') || '';
  }

  function setSessionToken(token) {
    var config = getConfig();
    if (!token) {
      removeStorageValue(config.STORAGE_KEYS.SESSION_TOKEN);
      return;
    }
    setStorageValue(config.STORAGE_KEYS.SESSION_TOKEN, String(token));
  }

  function clearSessionToken() {
    var config = getConfig();
    removeStorageValue(config.STORAGE_KEYS.SESSION_TOKEN);
  }

  function getApiBaseUrl() {
    var config = getConfig();
    var url = config.API_BASE_URL || '';
    if (!url) {
      throw new Error('API_BASE_URL belum diatur.');
    }
    return url;
  }

  function buildRequestId(prefix) {
    return (prefix || 'REQ') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function buildMeta(options) {
    var config = getConfig();
    var opts = options || {};
    var token = opts.sessionToken;

    if (token === undefined) {
      token = opts.includeAuth === false ? '' : getSessionToken();
    }

    var meta = {
      request_id: opts.requestId || buildRequestId('WEB'),
      device_id: opts.deviceId || getOrCreateDeviceId(),
      app_version: config.APP_VERSION || '',
      session_token: token || ''
    };

    if (opts.clientSubmitId) {
      meta.client_submit_id = String(opts.clientSubmitId);
    }

    if (opts.syncSource) {
      meta.sync_source = String(opts.syncSource);
    }

    if (opts.meta && typeof opts.meta === 'object') {
      Object.keys(opts.meta).forEach(function (key) {
        if (opts.meta[key] !== undefined) {
          meta[key] = opts.meta[key];
        }
      });
    }

    return meta;
  }

  function buildBody(action, payload, options) {
    return {
      action: String(action || '').trim(),
      payload: payload && typeof payload === 'object' ? payload : {},
      meta: buildMeta(options)
    };
  }

  function buildQueryString(params) {
    var search = new URLSearchParams();
    var obj = params || {};

    Object.keys(obj).forEach(function (key) {
      var value = obj[key];
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });

    return search.toString();
  }

  function isPlainObject(value) {
    return !!value && Object.prototype.toString.call(value) === '[object Object]';
  }

  function canUseQueryValue(value) {
    return value !== undefined && value !== null && (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  }

  function buildReadableQueryPayload(payload) {
    var source = payload && typeof payload === 'object' ? payload : {};
    var out = {};

    Object.keys(source).forEach(function (key) {
      var value = source[key];

      if (canUseQueryValue(value)) {
        out[key] = value;
        return;
      }

      if (Array.isArray(value)) {
        var arr = value.filter(function (item) {
          return canUseQueryValue(item);
        });
        if (arr.length) {
          out[key] = arr.join(',');
        }
        return;
      }

      if (isPlainObject(value)) {
        try {
          out[key] = JSON.stringify(value);
        } catch (err) {}
      }
    });

    return out;
  }

  function isSafeReadFallbackAllowed() {
    try {
      var apiUrl = new URL(getApiBaseUrl(), window.location.href);
      var currentUrl = new URL(window.location.href);
      var isSameOrigin = apiUrl.origin === currentUrl.origin;
      var host = String(apiUrl.hostname || '').toLowerCase();

      if (isSameOrigin) return true;

      if (
        host.indexOf('script.google.com') >= 0 ||
        host.indexOf('script.googleusercontent.com') >= 0
      ) {
        return false;
      }

      return false;
    } catch (err) {
      return false;
    }
  }

  async function tryReadOnlyGetFallback(action, payload, options) {
    if (!isSafeReadFallbackAllowed()) {
      return createNetworkError('Fallback GET dinonaktifkan untuk endpoint API ini.', {
        transport_fallback_skipped: true,
        reason: 'unsafe_cross_origin_get'
      });
    }

    var opts = options || {};
    var params = Object.assign({}, buildReadableQueryPayload(payload || {}), opts.fallbackGetParams || {});

    return get(action, params, {
      includeAuth: opts.includeAuth !== false,
      sessionToken: opts.sessionToken,
      timeoutMs: typeof opts.fallbackTimeoutMs === 'number'
        ? opts.fallbackTimeoutMs
        : DEFAULT_READ_FALLBACK_TIMEOUT_MS,
      retryCount: 0
    });
  }

  function createAbortController(timeoutMs) {
    if (typeof AbortController === 'undefined') {
      return { controller: null, timer: null };
    }

    var controller = new AbortController();
    var timer = null;

    if (timeoutMs > 0) {
      timer = window.setTimeout(function () {
        try {
          controller.abort();
        } catch (err) {}
      }, timeoutMs);
    }

    return { controller: controller, timer: timer };
  }

  async function parseResponse(response) {
    var text = '';

    try {
      text = await response.text();
    } catch (err) {
      text = '';
    }

    if (!text) {
      return {
        ok: false,
        code: response.status || 0,
        message: 'Respons kosong dari server.',
        data: null,
        raw_text: ''
      };
    }

    try {
      return JSON.parse(text);
    } catch (err) {
      return {
        ok: false,
        code: response.status || 0,
        message: 'Respons server bukan JSON yang valid.',
        data: null,
        raw_text: text
      };
    }
  }

  function normalizeResponse(data, response) {
    var res = data || {};
    var httpStatus = response && typeof response.status === 'number' ? response.status : 0;

    if (typeof res.ok === 'boolean') {
      return res;
    }

    var derivedOk = false;
    if (res.status === 'success') derivedOk = true;
    if (res.success === true) derivedOk = true;
    if (typeof res.code === 'number' && res.code >= 200 && res.code < 300) derivedOk = true;
    if (httpStatus >= 200 && httpStatus < 300 && !res.error) derivedOk = true;

    return {
      ok: derivedOk,
      code: res.code || httpStatus || 0,
      message: res.message || (derivedOk ? 'OK' : 'Permintaan gagal'),
      data: res.data !== undefined ? res.data : null,
      meta: res.meta || {},
      error: res.error || null,
      raw: res
    };
  }

  function createNetworkError(message, extra) {
    return Object.assign({
      ok: false,
      code: 0,
      message: message || 'Koneksi ke backend gagal.',
      data: null
    }, extra || {});
  }

  function normalizeFetchError(err) {
    if (err && err.name === 'AbortError') {
      return createNetworkError('Permintaan ke server melewati batas waktu.', {
        error: String(err),
        is_timeout: true
      });
    }

    return createNetworkError(
      err && err.message ? err.message : 'Koneksi ke backend gagal.',
      { error: String(err) }
    );
  }

  function isRetriableFailure(result) {
    if (!result) return true;
    if (result.ok === true) return false;
    if (result.code === 0) return true;

    var message = String(result.message || '').toLowerCase();
    if (message.indexOf('batas waktu') >= 0) return true;
    if (message.indexOf('koneksi') >= 0) return true;
    if (message.indexOf('network') >= 0) return true;
    if (message.indexOf('failed to fetch') >= 0) return true;
    if (message.indexOf('cors') >= 0) return true;
    return false;
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms || 0);
    });
  }

  function getSensitiveStorageKeys(options) {
    var config = getConfig();
    var keys = config.STORAGE_KEYS || {};
    var opts = options || {};

    var list = [
      keys.SESSION_TOKEN,
      keys.PROFILE,
      keys.BOOTSTRAP,
      keys.BOOTSTRAP_LITE,
      keys.SYNC_QUEUE,
      keys.SELECTED_SASARAN,
      'tpk_profile',
      'tpk_bootstrap_lite',
      'tpk_app_bootstrap',
      'tpk_selected_sasaran',
      'tpk_sasaran_cache_v1',
      'tpk_sasaran_cache_v2',
      'tpk_sasaran_detail_cache_v1',
      'tpk_pendampingan_form_cache_v1',
      'tpk_registrasi_draft_v_final',
      'tpk_pendampingan_draft',
      'tpk_sync_queue_v1'
    ];

    if (opts.keepDeviceId !== true) {
      list.push(keys.DEVICE_ID);
    }

    return uniqueStrings(list);
  }

  function removeFromBrowserStorage(storageObj, key) {
    try {
      if (storageObj && typeof storageObj.removeItem === 'function') {
        storageObj.removeItem(key);
      }
    } catch (err) {}
  }

  function clearSensitiveClientState(options) {
    var opts = options || {};
    var keys = getSensitiveStorageKeys({
      keepDeviceId: opts.keepDeviceId !== false
    });

    keys.forEach(function (key) {
      if (!key) return;
      removeStorageValue(key);
      removeFromBrowserStorage(window.localStorage, key);
      removeFromBrowserStorage(window.sessionStorage, key);
    });

    try {
      if (window.AppState && typeof window.AppState.clearSelectedSasaran === 'function') {
        window.AppState.clearSelectedSasaran();
      }
    } catch (err) {}

    try {
      if (window.AppState && typeof window.AppState.setSyncQueue === 'function') {
        window.AppState.setSyncQueue([]);
      }
    } catch (err2) {}

    try {
      if (window.AppState && typeof window.AppState.setCurrentRoute === 'function') {
        window.AppState.setCurrentRoute('login');
      }
    } catch (err3) {}

    clearSessionToken();
  }


  function getCachedBootstrapLiteSafe() {
    try {
      var storage = getStorage();
      if (storage && typeof storage.getBootstrapLite === 'function') {
        return storage.getBootstrapLite({}) || {};
      }
      if (storage && typeof storage.get === 'function') {
        return storage.get('tpk_bootstrap_lite', {}) || {};
      }
      return getStorageValue('tpk_bootstrap_lite', {}) || {};
    } catch (err) {
      return {};
    }
  }

  function clearSessionIdentityState(options) {
    var opts = options || {};
    var config = getConfig();
    var keys = config.STORAGE_KEYS || {};
    var list = uniqueStrings([
      keys.SESSION_TOKEN,
      keys.PROFILE,
      keys.BOOTSTRAP,
      keys.BOOTSTRAP_LITE,
      keys.SELECTED_SASARAN,
      'tpk_profile',
      'tpk_bootstrap_lite',
      'tpk_app_bootstrap',
      'tpk_selected_sasaran',
      'tpk_sasaran_cache_v1',
      'tpk_sasaran_cache_v2',
      'tpk_sasaran_detail_cache_v1'
    ]);

    list.forEach(function (key) {
      if (!key) return;
      removeStorageValue(key);
      removeFromBrowserStorage(window.localStorage, key);
      removeFromBrowserStorage(window.sessionStorage, key);
    });

    if (opts.keepDeviceId !== false) {
      // device_id dipertahankan agar kebijakan perangkat dan log tetap stabil.
    }

    try {
      if (window.AppState && typeof window.AppState.setProfile === 'function') window.AppState.setProfile({});
      if (window.AppState && typeof window.AppState.clearSelectedSasaran === 'function') window.AppState.clearSelectedSasaran();
      if (window.AppState && typeof window.AppState.setCurrentRoute === 'function') window.AppState.setCurrentRoute('login');
    } catch (err) {}

    clearSessionToken();
  }

  function extractReasonCode(normalized) {
    normalized = normalized || {};
    var data = normalized.data && typeof normalized.data === 'object' ? normalized.data : {};
    var meta = normalized.meta && typeof normalized.meta === 'object' ? normalized.meta : {};
    var raw = normalized.raw && typeof normalized.raw === 'object' ? normalized.raw : {};
    return String(
      normalized.reason_code || data.reason_code || meta.reason_code || raw.reason_code ||
      raw.reason || data.reason || meta.reason || ''
    ).trim().toUpperCase();
  }

  function buildSessionInvalidMessage(normalized) {
    var reason = extractReasonCode(normalized);
    var msg = String((normalized && normalized.message) || '').toLowerCase();

    if (reason === 'TOKEN_REPLACED_BY_NEW_LOGIN' || reason === 'ACTIVE_SESSION_MISMATCH' || reason === 'TOKEN_NOT_CURRENT') {
      return 'Akun Anda sudah digunakan di perangkat lain. Untuk keamanan, sesi di perangkat ini dihentikan. Silakan login kembali.';
    }
    if (reason === 'TOKEN_EXPIRED' || msg.indexOf('expired') >= 0 || msg.indexOf('kedaluwarsa') >= 0) {
      return 'Sesi login sudah kedaluwarsa. Silakan login kembali.';
    }
    if (reason === 'TOKEN_INACTIVE' || msg.indexOf('tidak aktif') >= 0 || msg.indexOf('dicabut') >= 0 || msg.indexOf('revoked') >= 0) {
      return 'Sesi login sudah tidak aktif. Silakan login kembali.';
    }
    if (msg.indexOf('perangkat lain') >= 0) {
      return 'Akun Anda sudah digunakan di perangkat lain. Untuk keamanan, sesi di perangkat ini dihentikan. Silakan login kembali.';
    }
    return 'Sesi login sudah tidak valid. Silakan login kembali.';
  }

  function showSessionInvalidNotice(message) {
    var text = String(message || 'Sesi login sudah tidak valid. Silakan login kembali.');

    try {
      if (window.UI && typeof window.UI.showToast === 'function') {
        window.UI.showToast(text, 'warning');
      }
    } catch (err) {}

    try {
      var box = document.getElementById('loginMessage');
      if (box) {
        box.textContent = text;
        box.classList.remove('hidden', 'success');
        box.classList.add('error');
      }
    } catch (err2) {}

    try {
      var existing = document.getElementById('tpk-session-invalid-notice');
      if (!existing) {
        existing = document.createElement('div');
        existing.id = 'tpk-session-invalid-notice';
        existing.setAttribute('role', 'alert');
        existing.style.cssText = 'position:fixed;left:12px;right:12px;top:12px;z-index:99999;background:#fff7ed;color:#7c2d12;border:1px solid #fed7aa;border-radius:14px;padding:12px 14px;font:600 14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 10px 30px rgba(15,23,42,.18);';
        document.body.appendChild(existing);
      }
      existing.textContent = text;
      window.setTimeout(function () {
        try { if (existing && existing.parentNode) existing.parentNode.removeChild(existing); } catch (ignore) {}
      }, 6500);
    } catch (err3) {}
  }

  function openLoginScreenFromApi() {
    try {
      if (window.Router && typeof window.Router.go === 'function') {
        window.Router.go('login', { reason: 'session_invalid' });
        return;
      }
    } catch (err) {}

    try {
      if (window.AppBootstrap && typeof window.AppBootstrap.openScreen === 'function') {
        window.AppBootstrap.openScreen('login-screen');
        return;
      }
    } catch (err2) {}

    try {
      var screens = document.querySelectorAll('.screen');
      screens.forEach(function (screen) {
        screen.classList.remove('active');
        screen.classList.add('hidden');
      });
      var login = document.getElementById('login-screen');
      if (login) {
        login.classList.remove('hidden');
        login.classList.add('active');
      }
    } catch (err3) {}
  }

  function triggerSessionInvalidRedirect(normalized, context) {
    if (sessionInvalidRedirectScheduled) return;
    if (isLogoutInProgress() || isAppUpdateInProgress()) return;

    sessionInvalidRedirectScheduled = true;
    var message = buildSessionInvalidMessage(normalized);
    var reason = extractReasonCode(normalized) || (isTokenInactiveMessage(normalized) ? 'TOKEN_INACTIVE' : 'TOKEN_INVALID');

    clearSessionIdentityState({ keepDeviceId: true });
    setSessionStatus(reason, {
      code: normalized && normalized.code || 0,
      message: message,
      source: 'api.js',
      action: context && context.action || '',
      reason_code: reason
    });

    try {
      window.dispatchEvent(new CustomEvent('tpk:session-invalid', {
        detail: {
          message: message,
          reason_code: reason,
          action: context && context.action || '',
          response: normalized || {}
        }
      }));
    } catch (err) {}

    showSessionInvalidNotice(message);
    window.setTimeout(function () {
      openLoginScreenFromApi();
      sessionInvalidRedirectScheduled = false;
    }, 80);
  }

  function isAuthFailureResult(normalized) {
    if (!normalized) return false;
    var code = Number(normalized.code || 0);
    if (code === 401 || code === 403) return true;
    var msg = String(normalized.message || '').toLowerCase();
    return msg.indexOf('session token') >= 0 ||
      msg.indexOf('token tidak') >= 0 ||
      msg.indexOf('token expired') >= 0 ||
      msg.indexOf('unauthorized') >= 0 ||
      msg.indexOf('forbidden') >= 0;
  }

  function isTokenInactiveMessage(normalized) {
    var msg = String(normalized && normalized.message || '').toLowerCase();
    return msg.indexOf('tidak aktif') >= 0 || msg.indexOf('dicabut') >= 0 || msg.indexOf('inactive') >= 0 || msg.indexOf('revoked') >= 0;
  }

  function handleAuthFailureCleanup(normalized, context) {
    context = context || {};
    if (!normalized) return normalized;
    if (!isAuthFailureResult(normalized)) return normalized;

    var actionName = String(context.action || normalized.action || '').trim();
    var lowerAction = actionName.toLowerCase();
    var shouldHandleGlobally = context.requiresAuth !== false &&
      lowerAction !== 'login' &&
      lowerAction !== 'logclienterror' &&
      lowerAction !== 'logclientperformance';

    var reason = extractReasonCode(normalized) || (isTokenInactiveMessage(normalized) ? 'TOKEN_INACTIVE' : 'TOKEN_INVALID');
    var message = buildSessionInvalidMessage(normalized);

    if (shouldHandleGlobally) {
      triggerSessionInvalidRedirect(normalized, Object.assign({}, context, { action: actionName }));
    } else {
      clearSessionToken();
      setSessionStatus(reason, {
        code: normalized.code || 0,
        message: message,
        source: 'api.js',
        action: actionName,
        reason_code: reason
      });
    }

    return Object.assign({}, normalized, {
      session_invalid: true,
      token_inactive: isTokenInactiveMessage(normalized),
      reason_code: reason,
      session_message: message,
      keep_cached_profile: false
    });
  }

  function createLocalAuthRequiredResult(action) {
    return handleAuthFailureCleanup({
      ok: false,
      code: 401,
      message: 'Session token tidak ditemukan di perangkat. Silakan login ulang.',
      data: null,
      action: action || '',
      local_guard: true,
      reason_code: 'TOKEN_MISSING'
    }, { action: action || '', requiresAuth: true, source: 'local_guard' });
  }

  async function doFetchJson(method, url, fetchOptions, timeoutMs) {
    var abortState = createAbortController(timeoutMs);

    try {
      var options = Object.assign({}, fetchOptions, {
        method: method,
        signal: abortState.controller ? abortState.controller.signal : undefined,
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
      });

      var response = await fetch(url, options);
      var parsed = await parseResponse(response);
      return normalizeResponse(parsed, response);
    } catch (err) {
      return normalizeFetchError(err);
    } finally {
      if (abortState.timer) {
        clearTimeout(abortState.timer);
      }
    }
  }

  async function executeWithRetry(executor, options) {
    var opts = options || {};
    var retryCount = typeof opts.retryCount === 'number' ? opts.retryCount : DEFAULT_RETRY_COUNT;
    var retryDelayMs = typeof opts.retryDelayMs === 'number' ? opts.retryDelayMs : DEFAULT_RETRY_DELAY_MS;

    var attempt = 0;
    var result = null;

    while (attempt <= retryCount) {
      result = await executor(attempt);

      if (!isRetriableFailure(result) || attempt >= retryCount) {
        return result;
      }

      warn('API retry attempt:', attempt + 1, result && result.message ? result.message : result);
      await sleep(retryDelayMs);
      attempt += 1;
    }

    return result;
  }

  function normalizeActionName(value) {
    return String(value || '').trim();
  }

  function isSasaranListAction(action) {
    var name = normalizeActionName(action);
    return name === getActionName('GET_SASARAN_BY_TIM', 'getSasaranByTim') ||
      name === getActionName('GET_SASARAN_LIST_LITE', 'getSasaranListLite') ||
      name === 'getSasaranByTim' ||
      name === 'getSasaranListLite';
  }

  function isRegistrasiFormDefinitionAction(action) {
    var name = normalizeActionName(action);
    return name === getActionName('GET_REGISTRASI_FORM_DEFINITION', 'getRegistrasiFormDefinition') ||
      name === 'getRegistrasiFormDefinition';
  }

  function getFormIdFromPayload(payload) {
    var src = payload || {};
    var jenis = String(src.jenis_sasaran || src.jenis || '').trim().toUpperCase();
    var formId = String(src.form_id || '').trim().toUpperCase();
    if (formId) return formId;
    var map = {
      CATIN: 'FRM1002',
      BUMIL: 'FRM1003',
      BUFAS: 'FRM1004',
      BADUTA: 'FRM1005'
    };
    return map[jenis] || 'FRM1001';
  }

  function getJenisFromPayload(payload) {
    return String((payload && (payload.jenis_sasaran || payload.jenis)) || '').trim().toUpperCase();
  }

  function getStorageApi() {
    try { return getStorage(); } catch (err) { return null; }
  }

  function setOfflineCache(action, payload, result) {
    if (!result || result.ok !== true) return;
    var storage = getStorageApi();
    var data = result.data !== undefined ? result.data : null;

    try {
      if (isSasaranListAction(action)) {
        var items = [];
        if (data && Array.isArray(data.items)) items = data.items;
        else if (data && Array.isArray(data.list)) items = data.list;
        else if (Array.isArray(data)) items = data;

        if (storage && typeof storage.setSasaranListCache === 'function') {
          storage.setSasaranListCache(items, {
            action: normalizeActionName(action),
            payload: payload || {},
            source: 'api_success'
          });
        } else {
          setStorageValue('tpk_sasaran_cache_v1', {
            saved_at: nowIso(),
            items: items,
            meta: { action: normalizeActionName(action), source: 'api_success' }
          });
        }
        return;
      }

      if (isRegistrasiFormDefinitionAction(action)) {
        var formId = getFormIdFromPayload(payload);
        var jenis = getJenisFromPayload(payload);
        if (storage && typeof storage.setFormDefinitionCache === 'function') {
          storage.setFormDefinitionCache(formId, jenis, data || {}, {
            action: normalizeActionName(action),
            source: 'api_success'
          });
        } else {
          setStorageValue('tpk_form_definition_cache::REGISTRASI::' + formId + '::' + jenis, {
            saved_at: nowIso(),
            form_id: formId,
            jenis_sasaran: jenis,
            definition: data || {},
            meta: { action: normalizeActionName(action), source: 'api_success' }
          });
        }
      }
    } catch (err) {}
  }

  function getOfflineCacheResult(action, payload, failedResult) {
    var storage = getStorageApi();

    try {
      if (isSasaranListAction(action)) {
        var cache = storage && typeof storage.getSasaranListCache === 'function'
          ? storage.getSasaranListCache(null)
          : getStorageValue('tpk_sasaran_cache_v1', null);
        if (cache && Array.isArray(cache.items) && cache.items.length) {
          return {
            ok: true,
            code: 200,
            message: 'Menampilkan cache lokal daftar sasaran.',
            data: {
              items: cache.items,
              total: cache.items.length,
              offline_cache: true,
              saved_at: cache.saved_at || ''
            },
            meta: Object.assign({}, cache.meta || {}, {
              offline_cache: true,
              original_error: failedResult && failedResult.message ? failedResult.message : ''
            })
          };
        }
      }

      if (isRegistrasiFormDefinitionAction(action)) {
        var formId = getFormIdFromPayload(payload);
        var jenis = getJenisFromPayload(payload);
        var formCache = storage && typeof storage.getFormDefinitionCache === 'function'
          ? storage.getFormDefinitionCache(formId, jenis, null)
          : getStorageValue('tpk_form_definition_cache::REGISTRASI::' + formId + '::' + jenis, null);
        if (formCache && formCache.definition && typeof formCache.definition === 'object') {
          return {
            ok: true,
            code: 200,
            message: 'Menampilkan cache lokal form registrasi.',
            data: formCache.definition,
            meta: Object.assign({}, formCache.meta || {}, {
              offline_cache: true,
              form_id: formId,
              jenis_sasaran: jenis,
              original_error: failedResult && failedResult.message ? failedResult.message : ''
            })
          };
        }
      }
    } catch (err) {}

    return null;
  }


  // ==========================================
  // PAKET 3D - Registrasi Dynamic Form Cache API
  // Single fetch + local cache + idle prefetch helper.
  // ==========================================
  var REGISTRASI_FORM_PREFETCH_IN_FLIGHT = Object.create(null);

  function mapRegistrasiJenisToFormId(jenis) {
    var key = String(jenis || '').trim().toUpperCase();
    var map = { CATIN: 'FRM1002', BUMIL: 'FRM1003', BUFAS: 'FRM1004', BADUTA: 'FRM1005' };
    return map[key] || 'FRM1001';
  }

  function normalizeRegistrasiFormPayload(input) {
    var src = typeof input === 'string' ? { jenis_sasaran: input } : (input || {});
    var jenis = String(src.jenis_sasaran || src.jenis || '').trim().toUpperCase();
    var formId = String(src.form_id || '').trim().toUpperCase() || mapRegistrasiJenisToFormId(jenis);
    if (!jenis) {
      var reverse = { FRM1002: 'CATIN', FRM1003: 'BUMIL', FRM1004: 'BUFAS', FRM1005: 'BADUTA' };
      jenis = reverse[formId] || '';
    }
    return Object.assign({}, src, { form_id: formId, jenis_sasaran: jenis, module: 'REGISTRASI' });
  }

  function getRegistrasiFormCacheKey(formId, jenis) {
    return 'tpk_form_definition_cache::REGISTRASI::' + String(formId || '').trim().toUpperCase() + '::' + String(jenis || '').trim().toUpperCase();
  }

  function getDefaultFormCacheTtlMs(options) {
    var opts = options || {};
    if (typeof opts.cacheTtlMs === 'number') return opts.cacheTtlMs;
    try {
      var cfg = getConfig();
      if (cfg && cfg.CACHE && typeof cfg.CACHE.FORM_DEFINITION_CLIENT_TTL_MS === 'number') return cfg.CACHE.FORM_DEFINITION_CLIENT_TTL_MS;
    } catch (err) {}
    return 24 * 60 * 60 * 1000;
  }

  function isFreshSavedAt(savedAt, ttlMs) {
    if (!savedAt) return false;
    var t = Date.parse(savedAt);
    if (!t || Number.isNaN(t)) return false;
    return (Date.now() - t) <= Number(ttlMs || 0);
  }

  function readRegistrasiFormDefinitionCache(formId, jenis, options) {
    var opts = options || {};
    var ttlMs = getDefaultFormCacheTtlMs(opts);
    var key = getRegistrasiFormCacheKey(formId, jenis);
    var storage = getStorageApi();
    var cache = null;
    try { if (storage && typeof storage.getFormDefinitionCache === 'function') cache = storage.getFormDefinitionCache(formId, jenis, null); } catch (err) {}
    if (!cache) cache = getStorageValue(key, null);
    if (!cache || typeof cache !== 'object') return null;
    var definition = cache.definition || cache.data || cache;
    if (!definition || typeof definition !== 'object') return null;
    var savedAt = cache.saved_at || cache.cached_at || cache.updated_at || '';
    if (opts.allowStale !== true && !isFreshSavedAt(savedAt, ttlMs)) return null;
    return {
      ok: true,
      code: 200,
      message: 'Menampilkan cache lokal form registrasi.',
      data: definition,
      meta: Object.assign({}, cache.meta || {}, {
        local_cache_hit: true,
        offline_cache: true,
        cache_source: 'local_form_definition_cache',
        saved_at: savedAt,
        form_id: formId,
        jenis_sasaran: jenis
      })
    };
  }

  async function getRegistrasiFormDefinition(input, options) {
    var opts = options || {};
    var payload = normalizeRegistrasiFormPayload(input || {});
    var formId = payload.form_id;
    var jenis = payload.jenis_sasaran;
    var cacheKey = formId + '::' + jenis;
    if (opts.forceRefresh !== true && opts.noCache !== true) {
      var cached = readRegistrasiFormDefinitionCache(formId, jenis, { cacheTtlMs: opts.cacheTtlMs, allowStale: opts.allowStale === true });
      if (cached) return cached;
    }
    if (REGISTRASI_FORM_PREFETCH_IN_FLIGHT[cacheKey]) return REGISTRASI_FORM_PREFETCH_IN_FLIGHT[cacheKey];
    var action = getActionName('GET_REGISTRASI_FORM_DEFINITION', 'getRegistrasiFormDefinition');
    var requestPromise = post(action, payload, {
      timeoutMs: typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 30000,
      retryCount: typeof opts.retryCount === 'number' ? opts.retryCount : 0,
      readOnlyFallbackGet: opts.readOnlyFallbackGet === true,
      meta: Object.assign({ single_fetch: true, prefetch: opts.prefetch === true, form_id: formId, jenis_sasaran: jenis }, opts.meta || {})
    });
    REGISTRASI_FORM_PREFETCH_IN_FLIGHT[cacheKey] = requestPromise;
    try { return await requestPromise; } finally { delete REGISTRASI_FORM_PREFETCH_IN_FLIGHT[cacheKey]; }
  }

  async function prefetchRegistrasiFormDefinitions(options) {
    var opts = options || {};
    var jenisList = opts.jenisList || ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'];
    var delayMs = typeof opts.delayMs === 'number' ? opts.delayMs : 450;
    var results = [];
    try { if (!getSessionToken()) return { ok: false, skipped: true, message: 'Prefetch form registrasi dilewati karena token belum tersedia.' }; }
    catch (err) { return { ok: false, skipped: true, message: 'Prefetch form registrasi dilewati karena token belum tersedia.' }; }
    for (var i = 0; i < jenisList.length; i += 1) {
      var jenis = String(jenisList[i] || '').trim().toUpperCase();
      if (!jenis) continue;
      try {
        var formId = mapRegistrasiJenisToFormId(jenis);
        var cached = readRegistrasiFormDefinitionCache(formId, jenis, { cacheTtlMs: opts.cacheTtlMs });
        if (cached) results.push({ jenis_sasaran: jenis, form_id: formId, skipped: true, reason: 'local_cache_fresh' });
        else {
          var result = await getRegistrasiFormDefinition({ jenis_sasaran: jenis, form_id: formId }, { prefetch: true, cacheTtlMs: opts.cacheTtlMs, timeoutMs: typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 25000, retryCount: 0 });
          results.push({ jenis_sasaran: jenis, form_id: formId, ok: !!(result && result.ok), code: result && result.code });
        }
      } catch (err2) { results.push({ jenis_sasaran: jenis, ok: false, message: err2 && err2.message ? err2.message : String(err2) }); }
      if (delayMs > 0 && i < jenisList.length - 1) await sleep(delayMs);
    }
    return { ok: true, prefetched: results };
  }

  function shouldUseOfflineCache(result) {
    if (!result) return true;
    if (isAuthFailureResult(result)) return false;
    if (result.ok === false) return true;
    if (result.code === 0) return true;
    return false;
  }

  async function post(action, payload, options) {
    var config = getConfig();
    var opts = options || {};
    var timeoutMs = typeof opts.timeoutMs === 'number'
      ? opts.timeoutMs
      : (config.API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

    if (!action) {
      return createNetworkError('Action API wajib diisi.');
    }

    if (isLogoutInProgress() && opts.allowDuringLogout !== true) {
      return createNetworkError('Request dibatalkan karena logout sedang berlangsung.', { cancelled: true, reason: 'logout_in_progress' });
    }

    var requiresAuth = opts.includeAuth !== false;
    var effectiveToken = opts.sessionToken === undefined ? getSessionToken() : opts.sessionToken;
    if (requiresAuth && !effectiveToken) {
      return createLocalAuthRequiredResult(action);
    }

    var body = buildBody(action, payload || {}, opts);

    var result = await executeWithRetry(function () {
      return doFetchJson('POST', getApiBaseUrl(), {
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify(body)
      }, timeoutMs);
    }, {
      retryCount: typeof opts.retryCount === 'number' ? opts.retryCount : DEFAULT_RETRY_COUNT,
      retryDelayMs: typeof opts.retryDelayMs === 'number' ? opts.retryDelayMs : DEFAULT_RETRY_DELAY_MS
    });

    if ((!result || result.ok === false) && opts.readOnlyFallbackGet === true && isRetriableFailure(result)) {
      var fallbackResult = await tryReadOnlyGetFallback(action, payload || {}, Object.assign({}, opts, {
        sessionToken: body && body.meta ? body.meta.session_token : ''
      }));

      if (fallbackResult && fallbackResult.ok) {
        fallbackResult.meta = Object.assign({}, fallbackResult.meta || {}, {
          transport_fallback: 'GET_AFTER_POST_FAIL'
        });
        result = fallbackResult;
      }
    }

    if (result && result.ok === true) {
      setOfflineCache(action, payload || {}, result);
    } else if (shouldUseOfflineCache(result)) {
      var offlineCacheResult = getOfflineCacheResult(action, payload || {}, result);
      if (offlineCacheResult) {
        result = offlineCacheResult;
      }
    }

    if (result.ok && result.data && result.data.session_token) {
      setSessionToken(result.data.session_token);
    }

    return handleAuthFailureCleanup(result, { action: action, requiresAuth: requiresAuth, source: 'post' });
  }

  async function get(action, params, options) {
    var config = getConfig();
    var opts = options || {};
    var timeoutMs = typeof opts.timeoutMs === 'number'
      ? opts.timeoutMs
      : (config.API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

    if (!action) {
      return createNetworkError('Action API wajib diisi.');
    }

    if (isLogoutInProgress() && opts.allowDuringLogout !== true) {
      return createNetworkError('Request dibatalkan karena logout sedang berlangsung.', { cancelled: true, reason: 'logout_in_progress' });
    }

    var queryParams = Object.assign({}, params || {}, { action: action });

    if (opts.includeAuth !== false) {
      var token = opts.sessionToken || getSessionToken();
      if (!token) return createLocalAuthRequiredResult(action);
      queryParams.token = token;
    }

    var queryString = buildQueryString(queryParams);
    var url = getApiBaseUrl() + (queryString ? ('?' + queryString) : '');

    var result = await executeWithRetry(function () {
      return doFetchJson('GET', url, {}, timeoutMs);
    }, {
      retryCount: typeof opts.retryCount === 'number' ? opts.retryCount : DEFAULT_RETRY_COUNT,
      retryDelayMs: typeof opts.retryDelayMs === 'number' ? opts.retryDelayMs : DEFAULT_RETRY_DELAY_MS
    });

    return handleAuthFailureCleanup(result, { action: action, requiresAuth: opts.includeAuth !== false, source: 'get' });
  }

  function shouldSkipClientErrorReport(extraPayload) {
    if (!extraPayload || typeof extraPayload !== 'object') return false;
    if (extraPayload.__skipClientErrorReport === true) return true;
    if (extraPayload.__fromClientPerformanceReporter === true) return true;
    if (String(extraPayload.action || '').trim() === 'logClientError') return true;
    if (String(extraPayload.action || '').trim() === 'logClientPerformance') return true;
    return false;
  }

  function buildErrorFingerprint(message, extraPayload) {
    return [
      String(message || '').trim(),
      String(extraPayload && extraPayload.modul || ''),
      String(extraPayload && extraPayload.action || '')
    ].join('::').slice(0, 500);
  }

  function wasRecentlyReported(message, extraPayload) {
    var fp = buildErrorFingerprint(message, extraPayload);
    var now = Date.now();
    var prev = recentReportMap[fp] || 0;

    if (now - prev < 3000) {
      return true;
    }

    recentReportMap[fp] = now;
    return false;
  }

  async function healthCheck() {
    return get(getActionName('HEALTH_CHECK', 'healthCheck'), {}, {
      includeAuth: false,
      timeoutMs: 10000,
      retryCount: 0
    });
  }

  async function login(payload) {
    var config = getConfig();
    var data = Object.assign({}, payload || {});

    if (!data.device_id) {
      data.device_id = getOrCreateDeviceId();
    }

    if (!data.app_version) {
      data.app_version = config.APP_VERSION || '';
    }

    var result = await post(getActionName('LOGIN', 'login'), data, {
      includeAuth: false,
      timeoutMs: 60000,
      retryCount: 1,
      retryDelayMs: 1500
    });

    if (result.ok && result.data && result.data.session_token) {
      setSessionToken(result.data.session_token);
      clearSessionStatus();
    }

    return result;
  }

  async function logout(payload, options) {
    var opts = options || {};
    var result = await post(getActionName('LOGOUT', 'logout'), payload || {}, {
      includeAuth: true,
      timeoutMs: 10000,
      retryCount: 0,
      allowDuringLogout: true
    });

    clearSensitiveClientState({
      keepDeviceId: opts.keepDeviceId !== false
    });

    return result;
  }

  async function validateSession(payload) {
    return post(getActionName('VALIDATE_SESSION', 'validateSession'), payload || {}, {
      includeAuth: true,
      timeoutMs: 25000,
      retryCount: 1,
      retryDelayMs: 1000
    });
  }

  async function bootstrapSession(payload) {
    return post(getActionName('BOOTSTRAP_SESSION', 'bootstrapSession'), payload || {}, {
      includeAuth: true,
      timeoutMs: 45000,
      retryCount: 1,
      retryDelayMs: 1500
    });
  }

  async function refreshBootstrapLite(payload) {
    var data = payload || {};
    if (isBootstrapRefreshCooldownActive() && data.force !== true) {
      return {
        ok: true,
        code: 200,
        message: 'refreshBootstrapLite dilewati sementara setelah fresh login.',
        data: {
          bootstrap_lite: getCachedBootstrapLiteSafe(),
          skipped: true,
          reason: 'fresh_login_cooldown'
        },
        meta: {
          skipped: true,
          reason: 'fresh_login_cooldown',
          source: 'api.js'
        }
      };
    }
    return post(getActionName('REFRESH_BOOTSTRAP_LITE', 'refreshBootstrapLite'), data, {
      includeAuth: true,
      timeoutMs: 30000,
      retryCount: 0,
      retryDelayMs: 1200
    });
  }

  async function getMyProfileLite(payload) {
    return post(getActionName('GET_MY_PROFILE_LITE', 'getMyProfileLite'), payload || {}, {
      includeAuth: true,
      timeoutMs: 25000,
      retryCount: 1,
      retryDelayMs: 1000
    });
  }

  async function getDashboardSummaryLite(payload) {
    return post(getActionName('GET_DASHBOARD_SUMMARY_LITE', 'getDashboardSummaryLite'), payload || {}, {
      includeAuth: true,
      timeoutMs: 30000,
      retryCount: 1,
      retryDelayMs: 1200
    });
  }

  async function getAppBootstrapRef(payload) {
    return post(getActionName('GET_APP_BOOTSTRAP_REF', 'getAppBootstrapRef'), payload || {}, {
      includeAuth: false,
      timeoutMs: 30000,
      retryCount: 1,
      retryDelayMs: 1000
    });
  }

  function normalizeRoleForApi(value) {
    var raw = String(value || '').trim().toUpperCase();
    var map = {
      'SUPERADMIN': 'SUPER_ADMIN',
      'SUPER ADMIN': 'SUPER_ADMIN',
      'SUPER_ADMIN': 'SUPER_ADMIN'
    };
    return map[raw] || raw;
  }

  function getCachedProfileForApi() {
    try {
      var config = getConfig();
      var keys = config.STORAGE_KEYS || {};
      var profile = keys.PROFILE ? getStorageValue(keys.PROFILE, null) : null;
      if (profile && typeof profile === 'object') return profile;
      profile = getStorageValue('tpk_profile', null);
      if (profile && typeof profile === 'object') return profile;
      var bootstrap = getStorageValue('tpk_bootstrap_lite', null) || getStorageValue('tpk_app_bootstrap', null);
      if (bootstrap && bootstrap.profile) return bootstrap.profile;
    } catch (err) {}
    return {};
  }

  function isSuperAdminCachedProfile() {
    var profile = getCachedProfileForApi() || {};
    var role = normalizeRoleForApi(profile.role_akses || profile.role || '');
    return role === 'SUPER_ADMIN';
  }

  async function getTimRef(payload) {
    if (isSuperAdminCachedProfile()) {
      return {
        ok: true,
        code: 200,
        message: 'Tim ref dilewati untuk Super Admin.',
        data: {
          items: [],
          scope_level: 'GLOBAL',
          skipped: true,
          local_skip: true
        },
        meta: { local_skip: true }
      };
    }
    return post(getActionName('GET_TIM_REF', 'getTimRef'), payload || {}, {
      includeAuth: true,
      timeoutMs: 15000,
      retryCount: 1,
      retryDelayMs: 800
    });
  }

  async function getDashboardLite(payload) {
    return post(getActionName('GET_DASHBOARD_LITE', 'getDashboardLite'), payload || {}, {
      includeAuth: true,
      timeoutMs: 20000,
      retryCount: 1,
      retryDelayMs: 800
    });
  }

  async function getSasaranListLite(payload) {
    return post(getActionName('GET_SASARAN_LIST_LITE', 'getSasaranListLite'), payload || {}, {
      includeAuth: true,
      timeoutMs: 15000,
      retryCount: 1,
      retryDelayMs: 900,
      readOnlyFallbackGet: true
    });
  }

  function normalizeClientPerformanceEventName(eventName, data) {
    var name = String(eventName || '').trim();
    var src = data || {};
    if (name === 'superAdminRefreshForce') {
      src.legacy_action = name;
      src.legacy_action_rewritten = true;
      src.legacy_action_rewrite_version = CLIENT_PERF_REFRESH_FORCE_REWRITE_VERSION;
      return 'superAdminRefreshForceClientLegacyBlocked';
    }
    return name;
  }

  function inferClientPerformanceGroup(eventName, data) {
    var src = data || {};
    if (src.performance_group) return String(src.performance_group).toUpperCase();
    var action = String(eventName || src.action || '').trim();
    var diagnosticActions = {
      superAdminWorkbookLiveCheck: true,
      superAdminWorkbookSnapshotOpen: true,
      runSuperAdminSecurityRiskSimulation: true,
      superAdminSecurityRiskSimulation: true,
      debugUnknownActionSimulation: true,
      healthCheck: true
    };
    var clientEventActions = {
      superAdminRefreshData: true,
      superAdminRefreshDataGuarded: true,
      superAdminRefreshForce: true,
      superAdminRefreshForceGuarded: true,
      superAdminRefreshForceClientStart: true,
      superAdminRefreshForceClientDone: true,
      superAdminRefreshForceClientGuarded: true,
      superAdminRefreshForceClientError: true,
      superAdminRefreshForceClientLegacyBlocked: true,
      superAdminWorkbookCardClick: true,
      superAdminBackendHealthRowClick: true,
      superAdminFrontendHealthRowClick: true,
      superAdminSecurityActionClick: true
    };
    if (diagnosticActions[action]) return 'DIAGNOSTIC';
    if (clientEventActions[action]) return 'CLIENT_EVENT';
    if (action.indexOf('superAdmin') === 0) return 'CLIENT_EVENT';
    return 'CLIENT_EVENT';
  }

  function categoryFromPerformanceGroup(group, fallback) {
    var g = String(group || '').toUpperCase();
    if (g === 'DIAGNOSTIC') return 'diagnostic';
    if (g === 'SECURITY_ACTION') return 'security_action';
    if (g === 'SUPER_ADMIN_MONITOR') return 'monitor';
    if (g === 'CORE_APP') return 'core';
    return fallback || 'client_event';
  }

  async function reportClientPerformance(eventName, data) {
    var config = null;
    try {
      config = getConfig();
    } catch (err) {
      return { ok: false, skipped: true, message: 'APP_CONFIG belum siap untuk report performance.' };
    }

    var perfCfg = config.PERFORMANCE || {};
    if (perfCfg.ENABLE_CLIENT_PERFORMANCE_LOG === false) {
      return { ok: false, skipped: true, message: 'Client performance log dinonaktifkan.' };
    }

    var sessionToken = '';
    try {
      sessionToken = getSessionToken();
    } catch (err2) {
      sessionToken = '';
    }

    var incoming = data || {};
    var normalizedEventName = normalizeClientPerformanceEventName(eventName, incoming);
    var inferredGroup = inferClientPerformanceGroup(normalizedEventName, incoming);
    var payload = Object.assign({
      message: 'CLIENT_PERFORMANCE',
      modul: 'registrasiView.js',
      action: normalizedEventName || 'client_performance',
      event_type: 'CLIENT_PERFORMANCE',
      type: 'CLIENT_PERFORMANCE',
      source_layer: 'CLIENT',
      performance_group: inferredGroup,
      client_metric_classification: inferredGroup === 'DIAGNOSTIC' ? 'DIAGNOSTIC_CLIENT_WORKFLOW' : 'CLIENT_EVENT_WORKFLOW',
      category: categoryFromPerformanceGroup(inferredGroup, 'client_event'),
      device_id: getOrCreateDeviceId(),
      app_version: config.APP_VERSION || '',
      occurred_at: nowIso(),
      __fromClientPerformanceReporter: true,
      exclude_from_frontend_health: true,
      observability_only: true,
      reporter_version: API_RUNTIME_GUARD_VERSION
    }, incoming);

    if (!payload.performance_group) payload.performance_group = inferredGroup;
    if (!payload.source_layer) payload.source_layer = 'CLIENT';
    if (!payload.client_metric_classification) payload.client_metric_classification = payload.performance_group === 'DIAGNOSTIC' ? 'DIAGNOSTIC_CLIENT_WORKFLOW' : 'CLIENT_EVENT_WORKFLOW';
    if (!payload.category) payload.category = categoryFromPerformanceGroup(payload.performance_group, 'client_event');

    try {
      return await post(getActionName('LOG_CLIENT_ERROR', 'logClientError'), payload, {
        includeAuth: !!sessionToken,
        sessionToken: sessionToken || '',
        timeoutMs: 6000,
        retryCount: 0,
        meta: {
          reporter_guard: 'CLIENT_PERF_V2',
          exclude_from_frontend_health: true,
          observability_only: true,
          reporter_version: API_RUNTIME_GUARD_VERSION
        }
      });
    } catch (err3) {
      return createNetworkError(err3 && err3.message ? err3.message : 'Gagal mengirim client performance report.');
    }
  }

  async function reportClientError(message, extraPayload) {
    if (isReportingClientError) {
      return { ok: false, skipped: true, message: 'Client error reporter sedang aktif.' };
    }

    if (shouldSkipClientErrorReport(extraPayload)) {
      return { ok: false, skipped: true, message: 'Client error report dilewati.' };
    }

    if (wasRecentlyReported(message, extraPayload)) {
      return { ok: false, skipped: true, message: 'Client error report duplikat dilewati.' };
    }

    var config = null;
    try {
      config = getConfig();
    } catch (err) {
      return { ok: false, skipped: true, message: 'APP_CONFIG belum siap untuk report error.' };
    }

    var sessionToken = '';
    try {
      sessionToken = getSessionToken();
    } catch (err2) {
      sessionToken = '';
    }

    var payload = Object.assign({
      message: message || 'Unknown client error',
      device_id: getOrCreateDeviceId(),
      app_version: config.APP_VERSION || '',
      occurred_at: nowIso(),
      __fromClientErrorReporter: true,
      reporter_version: API_RUNTIME_GUARD_VERSION
    }, extraPayload || {});

    isReportingClientError = true;
    try {
      return await post(getActionName('LOG_CLIENT_ERROR', 'logClientError'), payload, {
        includeAuth: !!sessionToken,
        sessionToken: sessionToken || '',
        timeoutMs: 8000,
        retryCount: 0,
        meta: {
          reporter_guard: 'CLIENT_ERROR_V1'
        }
      });
    } catch (err3) {
      return createNetworkError(err3 && err3.message ? err3.message : 'Gagal mengirim client error report.');
    } finally {
      isReportingClientError = false;
    }
  }

  var Api = {
    getBaseUrl: getApiBaseUrl,
    getActionName: getActionName,
    getDeviceId: getOrCreateDeviceId,
    getSessionToken: getSessionToken,
    setSessionToken: setSessionToken,
    clearSessionToken: clearSessionToken,
    clearSensitiveClientState: clearSensitiveClientState,
    clearSessionIdentityState: clearSessionIdentityState,
    handleSessionInvalid: function (result, context) { return handleAuthFailureCleanup(result || {}, context || { requiresAuth: true }); },
    setSessionStatus: setSessionStatus,
    clearSessionStatus: clearSessionStatus,
    buildMeta: buildMeta,
    buildBody: buildBody,
    get: get,
    post: post,
    healthCheck: healthCheck,
    login: login,
    logout: logout,
    validateSession: validateSession,
    bootstrapSession: bootstrapSession,
    refreshBootstrapLite: refreshBootstrapLite,
    getMyProfileLite: getMyProfileLite,
    getDashboardSummaryLite: getDashboardSummaryLite,
    getDashboardLite: getDashboardLite,
    getAppBootstrapRef: getAppBootstrapRef,
    getTimRef: getTimRef,
    getSasaranListLite: getSasaranListLite,
    getRegistrasiFormDefinition: getRegistrasiFormDefinition,
    prefetchRegistrasiFormDefinitions: prefetchRegistrasiFormDefinitions,
    readRegistrasiFormDefinitionCache: readRegistrasiFormDefinitionCache,
    reportClientError: reportClientError,
    reportClientPerformance: reportClientPerformance
  };

  window.Api = Api;
  log('api.js loaded');
})(window);
