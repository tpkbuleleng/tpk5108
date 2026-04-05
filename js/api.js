(function (window) {
  'use strict';

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

    var newId = 'DEV-' + generateRandomToken() + '-' + btoa(userAgent).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
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
    return Object.assign(
      {
        ok: false,
        code: 0,
        message: message || 'Koneksi ke backend gagal.',
        data: null
      },
      extra || {}
    );
  }

  async function post(action, payload, options) {
    var config = getConfig();
    var opts = options || {};
    var timeoutMs = typeof opts.timeoutMs === 'number'
      ? opts.timeoutMs
      : (config.API_TIMEOUT_MS || 30000);

    if (!action) {
      return createNetworkError('Action API wajib diisi.');
    }

    var body = buildBody(action, payload || {}, opts);
    var abortState = createAbortController(timeoutMs);

    try {
      var response = await fetch(getApiBaseUrl(), {
        method: 'POST',
        headers: {
  'Content-Type': 'text/plain;charset=utf-8'
},
body: JSON.stringify(body),
        signal: abortState.controller ? abortState.controller.signal : undefined,
        credentials: 'omit',
        redirect: 'follow'
      });

      var parsed = await parseResponse(response);
      var normalized = normalizeResponse(parsed, response);

      if (normalized.ok && normalized.data && normalized.data.session_token) {
        setSessionToken(normalized.data.session_token);
      }

      return normalized;
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return createNetworkError('Permintaan ke server melewati batas waktu.', {
          error: String(err)
        });
      }

      return createNetworkError(err && err.message ? err.message : 'Koneksi ke backend gagal.', {
        error: String(err)
      });
    } finally {
      if (abortState.timer) {
        clearTimeout(abortState.timer);
      }
    }
  }

  async function get(action, params, options) {
    var config = getConfig();
    var opts = options || {};
    var timeoutMs = typeof opts.timeoutMs === 'number'
      ? opts.timeoutMs
      : (config.API_TIMEOUT_MS || 30000);

    if (!action) {
      return createNetworkError('Action API wajib diisi.');
    }

    var queryParams = Object.assign({}, params || {}, {
      action: action
    });

    if (opts.includeAuth !== false) {
      var token = opts.sessionToken || getSessionToken();
      if (token) {
        queryParams.token = token;
      }
    }

    var queryString = buildQueryString(queryParams);
    var url = getApiBaseUrl() + (queryString ? ('?' + queryString) : '');
    var abortState = createAbortController(timeoutMs);

    try {
      var response = await fetch(url, {
        method: 'GET',
        signal: abortState.controller ? abortState.controller.signal : undefined,
        credentials: 'omit',
        redirect: 'follow'
      });

      var parsed = await parseResponse(response);
      return normalizeResponse(parsed, response);
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return createNetworkError('Permintaan ke server melewati batas waktu.', {
          error: String(err)
        });
      }

      return createNetworkError(err && err.message ? err.message : 'Koneksi ke backend gagal.', {
        error: String(err)
      });
    } finally {
      if (abortState.timer) {
        clearTimeout(abortState.timer);
      }
    }
  }

  async function healthCheck() {
    var config = getConfig();
    return get(config.API_ACTIONS.HEALTH_CHECK, {}, { includeAuth: false });
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

    var result = await post(config.API_ACTIONS.LOGIN, data, {
      includeAuth: false
    });

    if (result.ok && result.data && result.data.session_token) {
      setSessionToken(result.data.session_token);
    }

    return result;
  }

  async function logout(payload) {
    var config = getConfig();
    var result = await post(config.API_ACTIONS.LOGOUT, payload || {}, {
      includeAuth: true
    });

    removeStorageValue(config.STORAGE_KEYS.SESSION_TOKEN);
    return result;
  }

  async function reportClientError(message, extraPayload) {
    var config = getConfig();

    var payload = Object.assign({
      message: message || 'Unknown client error',
      device_id: getOrCreateDeviceId(),
      app_version: config.APP_VERSION || '',
      occurred_at: nowIso()
    }, extraPayload || {});

    return post(config.API_ACTIONS.LOG_CLIENT_ERROR, payload, {
      includeAuth: true,
      timeoutMs: 12000
    });
  }

  function clearSessionToken() {
    var config = getConfig();
    removeStorageValue(config.STORAGE_KEYS.SESSION_TOKEN);
  }

  const Api = {
    getBaseUrl: getApiBaseUrl,
    getDeviceId: getOrCreateDeviceId,
    getSessionToken: getSessionToken,
    setSessionToken: setSessionToken,
    clearSessionToken: clearSessionToken,
    buildMeta: buildMeta,
    buildBody: buildBody,
    get: get,
    post: post,
    healthCheck: healthCheck,
    login: login,
    logout: logout,
    reportClientError: reportClientError
  };

  window.Api = Api;

  log('api.js loaded');
})(window);
