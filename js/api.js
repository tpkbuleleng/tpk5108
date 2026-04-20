
(function (window) {
  'use strict';

  var DEFAULT_TIMEOUT_MS = 45000;
  var DEFAULT_RETRY_COUNT = 0;
  var DEFAULT_READ_FALLBACK_TIMEOUT_MS = 15000;
  var DEFAULT_RETRY_DELAY_MS = 1200;

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

  function isLogClientErrorAction(action) {
    var normalized = String(action || '').trim();
    return normalized === 'logClientError' || normalized === getActionName('LOG_CLIENT_ERROR', 'logClientError');
  }

  function shouldMaskKey(key) {
    var text = String(key || '').toLowerCase();
    return text === 'password' ||
      text === 'pin' ||
      text === 'passcode' ||
      text === 'password_hash' ||
      text === 'token' ||
      text === 'session_token' ||
      text === 'signature' ||
      text === 'authorization';
  }

  function sanitizeForLog(value, depth) {
    depth = typeof depth === 'number' ? depth : 0;

    if (value === null || value === undefined) return value;
    if (depth > 3) return '[MAX_DEPTH]';

    if (typeof value === 'string') {
      return value.length > 500 ? value.slice(0, 500) : value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.slice(0, 20).map(function (item) {
        return sanitizeForLog(item, depth + 1);
      });
    }

    if (isPlainObject(value)) {
      var out = {};
      Object.keys(value).slice(0, 30).forEach(function (key) {
        if (shouldMaskKey(key)) {
          out[key] = '[MASKED]';
          return;
        }
        out[key] = sanitizeForLog(value[key], depth + 1);
      });
      return out;
    }

    try {
      return String(value);
    } catch (err) {
      return '[UNSERIALIZABLE]';
    }
  }

  async function safeReportClientError(payload, options) {
    var opts = options || {};

    if (window.__TPK_REPORTING_CLIENT_ERROR__ === true) {
      return createNetworkError('Pelaporan error sedang berjalan.', {
        skipped: true,
        reason: 'report_in_progress'
      });
    }

    var action = getActionName('LOG_CLIENT_ERROR', 'logClientError');
    var metaOptions = {
      includeAuth: opts.includeAuth !== false,
      sessionToken: opts.sessionToken || (opts.includeAuth === false ? '' : getSessionToken()),
      requestId: opts.requestId || buildRequestId('ERR'),
      deviceId: opts.deviceId || getOrCreateDeviceId(),
      meta: {
        report_source: opts.reportSource || 'client_auto'
      }
    };

    var body = buildBody(action, sanitizeForLog(payload || {}, 0), metaOptions);
    var abortState = createAbortController(typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 8000);

    window.__TPK_REPORTING_CLIENT_ERROR__ = true;

    try {
      var response = await fetch(getApiBaseUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify(body),
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        signal: abortState.controller ? abortState.controller.signal : undefined
      });

      var parsed = await parseResponse(response);
      return normalizeResponse(parsed, response);
    } catch (err) {
      return normalizeFetchError(err);
    } finally {
      if (abortState.timer) {
        clearTimeout(abortState.timer);
      }
      window.__TPK_REPORTING_CLIENT_ERROR__ = false;
    }
  }

  function shouldReportApiFailure(action, result, options) {
    var opts = options || {};
    if (opts.skipErrorReport === true) return false;
    if (isLogClientErrorAction(action)) return false;
    if (!result || result.ok === true) return false;
    if (opts.forceReportError === true) return true;
    if (result.code === 0 || result.is_timeout === true) return true;
    if (typeof result.raw_text === 'string' && result.raw_text) return true;
    if (typeof result.code === 'number' && result.code >= 500) return true;
    return false;
  }

  function reportApiFailureAsync(transport, action, payload, result, options) {
    if (!shouldReportApiFailure(action, result, options)) {
      return;
    }

    var opts = options || {};
    var requestMeta = buildMeta(opts);
    var errorPayload = {
      modul: 'api.js',
      aksi: transport + ':' + String(action || ''),
      message: result && result.message ? result.message : 'API request gagal',
      stack: result && result.error ? String(result.error) : '',
      code: result && result.code ? result.code : 0,
      occurred_at: nowIso(),
      device_id: requestMeta.device_id,
      app_version: requestMeta.app_version,
      request_id: requestMeta.request_id,
      payload_ringkas: {
        action: action,
        transport: transport,
        payload: sanitizeForLog(payload || {}, 0),
        result: sanitizeForLog({
          code: result && result.code ? result.code : 0,
          message: result && result.message ? result.message : '',
          is_timeout: !!(result && result.is_timeout),
          raw_text: result && result.raw_text ? result.raw_text : ''
        }, 0)
      }
    };

    safeReportClientError(errorPayload, {
      includeAuth: opts.includeAuth !== false && !!getSessionToken(),
      sessionToken: opts.includeAuth === false ? '' : getSessionToken(),
      requestId: requestMeta.request_id,
      deviceId: requestMeta.device_id,
      reportSource: 'api_auto'
    }).catch(function () {});
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

  function handleAuthFailureCleanup(normalized) {
    if (!normalized) return normalized;
    if (normalized.code === 401 || normalized.code === 403) {
      clearSessionToken();
    }
    return normalized;
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

  async function post(action, payload, options) {
    var config = getConfig();
    var opts = options || {};
    var timeoutMs = typeof opts.timeoutMs === 'number'
      ? opts.timeoutMs
      : (config.API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

    if (!action) {
      return createNetworkError('Action API wajib diisi.');
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

    if (result.ok && result.data && result.data.session_token) {
      setSessionToken(result.data.session_token);
    }

    reportApiFailureAsync('POST', action, payload || {}, result, opts);
    return handleAuthFailureCleanup(result);
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

    var queryParams = Object.assign({}, params || {}, { action: action });

    if (opts.includeAuth !== false) {
      var token = opts.sessionToken || getSessionToken();
      if (token) queryParams.token = token;
    }

    var queryString = buildQueryString(queryParams);
    var url = getApiBaseUrl() + (queryString ? ('?' + queryString) : '');

    var result = await executeWithRetry(function () {
      return doFetchJson('GET', url, {}, timeoutMs);
    }, {
      retryCount: typeof opts.retryCount === 'number' ? opts.retryCount : DEFAULT_RETRY_COUNT,
      retryDelayMs: typeof opts.retryDelayMs === 'number' ? opts.retryDelayMs : DEFAULT_RETRY_DELAY_MS
    });

    reportApiFailureAsync('GET', action, params || {}, result, opts);
    return handleAuthFailureCleanup(result);
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
    }

    return result;
  }

  async function logout(payload, options) {
    var opts = options || {};
    var result = await post(getActionName('LOGOUT', 'logout'), payload || {}, {
      includeAuth: true,
      timeoutMs: 10000,
      retryCount: 0
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
    return post(getActionName('REFRESH_BOOTSTRAP_LITE', 'refreshBootstrapLite'), payload || {}, {
      includeAuth: true,
      timeoutMs: 30000,
      retryCount: 1,
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

  async function reportClientError(message, extraPayload) {
    var config = getConfig();
    var payload = Object.assign({
      message: message || 'Unknown client error',
      device_id: getOrCreateDeviceId(),
      app_version: config.APP_VERSION || '',
      occurred_at: nowIso(),
      modul: 'client',
      aksi: 'reportClientError'
    }, extraPayload || {});

    return safeReportClientError(payload, {
      includeAuth: !!getSessionToken(),
      sessionToken: getSessionToken(),
      reportSource: 'manual_client_report'
    });
  }

  var Api = {
    getBaseUrl: getApiBaseUrl,
    getActionName: getActionName,
    getDeviceId: getOrCreateDeviceId,
    getSessionToken: getSessionToken,
    setSessionToken: setSessionToken,
    clearSessionToken: clearSessionToken,
    clearSensitiveClientState: clearSensitiveClientState,
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
    getAppBootstrapRef: getAppBootstrapRef,
    reportClientError: reportClientError
  };

  window.Api = Api;
  log('api.js loaded');
})(window);
