
(function (window) {
  'use strict';

  var HARGANAS_DRAFT_VERSION = 'HARGANAS-2C-DRAFT-20260625';

  function getConfig() { return window.APP_CONFIG || {}; }
  function getStorage() { return window.Storage || null; }
  function getState() { return window.AppState || null; }
  function getKeys() { return (getConfig().STORAGE_KEYS || {}); }
  function getDraftKey() { return getKeys().HARGANAS_DRAFT || 'tpk_harganas_2026_draft_v1'; }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (err) { return value; }
  }

  function normalizeText(value) {
    var text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    if (!text) return '';
    var upper = text.toUpperCase();
    if (upper === '-' || upper === 'NULL' || upper === 'UNDEFINED' || upper === 'N/A' || upper === 'NA') return '';
    return text;
  }

  function readRaw(key, fallback) {
    var storage = getStorage();
    if (storage && typeof storage.get === 'function') return storage.get(key, fallback);
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) { return fallback; }
  }

  function writeRaw(key, value) {
    var storage = getStorage();
    if (storage && typeof storage.set === 'function') return storage.set(key, value);
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (err) {}
    return value;
  }

  function removeRaw(key) {
    var storage = getStorage();
    if (storage && typeof storage.remove === 'function') return storage.remove(key);
    try { window.localStorage.removeItem(key); } catch (err) {}
  }

  function getProfile() {
    var state = getState();
    if (state && typeof state.getProfile === 'function') {
      var p = state.getProfile();
      if (p && typeof p === 'object' && Object.keys(p).length) return p;
    }
    var keys = getKeys();
    var profile = keys.PROFILE ? readRaw(keys.PROFILE, {}) : {};
    if (profile && typeof profile === 'object' && Object.keys(profile).length) return profile;
    var lite = readRaw('tpk_bootstrap_lite', {}) || {};
    if (lite && lite.profile) return lite.profile;
    return readRaw('tpk_last_good_profile', {}) || {};
  }

  function getDisplayNomorTim(profile) {
    var data = profile || {};
    return normalizeText(data.nomor_tim || data.nomor_tim_display || data.nomor_tim_lokal || data.nama_tim || data.id_tim) || '-';
  }

  function normalizeProfile(profile) {
    var p = profile || getProfile();
    return {
      id_user: normalizeText(p.id_user || p.username || ''),
      nama_user: normalizeText(p.nama_user || p.nama_kader || p.nama || ''),
      role: normalizeText(p.role_akses || p.role || 'KADER') || 'KADER',
      id_tim: normalizeText(p.id_tim || ''),
      nomor_tim: getDisplayNomorTim(p),
      nama_tim: normalizeText(p.nama_tim || ''),
      kode_kecamatan: normalizeText(p.kode_kecamatan || p.book_key || p.id_kecamatan || ''),
      kecamatan: normalizeText(p.nama_kecamatan || p.kecamatan || ''),
      desa: normalizeText(p.desa_tim || p.desa_kelurahan || p.nama_desa || p.desa || ''),
      dusun: normalizeText(p.dusun_rw || p.nama_dusun || p.dusun || '')
    };
  }

  function getEventConfig() {
    var cfg = getConfig().HARGANAS || {};
    return {
      event_code: cfg.EVENT_CODE || 'HARGANAS_2026',
      event_name: cfg.EVENT_NAME || 'Dokumentasi Pendampingan TPK HARGANAS 2026',
      event_date: cfg.EVENT_DATE || '2026-06-29',
      event_label: cfg.EVENT_LABEL || 'Hari Keluarga Nasional 2026'
    };
  }

  function buildBaseDraft(profile) {
    var eventCfg = getEventConfig();
    var p = normalizeProfile(profile);
    return Object.assign({}, eventCfg, {
      package_version: HARGANAS_DRAFT_VERSION,
      id_user: p.id_user,
      submitted_by_name: p.nama_user,
      role: p.role,
      id_tim: p.id_tim,
      nomor_tim: p.nomor_tim,
      nama_tim: p.nama_tim,
      kode_kecamatan: p.kode_kecamatan,
      desa: p.desa,
      kecamatan: p.kecamatan,
      kabupaten: 'BULELENG',
      provinsi: 'BALI',
      status_submission: 'DRAFT',
      media_status: {
        portrait: false,
        landscape: false,
        video: false,
        gps: false
      }
    });
  }

  function load() {
    var local = readRaw(getDraftKey(), {}) || {};
    var base = buildBaseDraft(getProfile());
    return Object.assign({}, base, local, {
      media_status: Object.assign({}, base.media_status, local.media_status || {})
    });
  }

  function save(draft) {
    var existing = readRaw(getDraftKey(), {}) || {};
    var base = buildBaseDraft(getProfile());
    var incoming = draft || {};
    var value = Object.assign({}, base, existing, incoming, {
      updated_at_local: new Date().toISOString(),
      status_submission: 'DRAFT',
      media_status: Object.assign({}, base.media_status || {}, existing.media_status || {}, incoming.media_status || {})
    });
    writeRaw(getDraftKey(), value);
    var state = getState();
    if (state && typeof state.setHarganasDraft === 'function') state.setHarganasDraft(value);
    return clone(value);
  }

  function clear() {
    removeRaw(getDraftKey());
    var state = getState();
    if (state && typeof state.clearHarganasDraft === 'function') state.clearHarganasDraft();
    return buildBaseDraft(getProfile());
  }

  window.HarganasDraftService = {
    version: HARGANAS_DRAFT_VERSION,
    getDraftKey: getDraftKey,
    getProfile: getProfile,
    normalizeProfile: normalizeProfile,
    getEventConfig: getEventConfig,
    buildBaseDraft: buildBaseDraft,
    load: load,
    save: save,
    clear: clear
  };
})(window);
