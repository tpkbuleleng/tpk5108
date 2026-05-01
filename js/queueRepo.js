(function (window) {
  'use strict';

  var LS_QUEUE_KEY = 'tpk_sync_queue_v1';
  var REG_DRAFT_KEY = 'tpk_registrasi_draft_v_final';
  var PEN_DRAFT_KEY = 'tpk_pendampingan_draft_v_final';
  var listeners = [];

  function nowIso() { return new Date().toISOString(); }

  function safeJsonParse(value, fallback) {
    try { return value ? JSON.parse(value) : fallback; } catch (err) { return fallback; }
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (err) { return value; }
  }

  function normalizeStatus(value) {
    return String(value || 'PENDING').trim().toUpperCase() || 'PENDING';
  }

  function getDb() {
    return window.TPKDb || window.DB || null;
  }

  function getDeviceId() {
    try {
      if (window.Api && typeof window.Api.getDeviceId === 'function') return window.Api.getDeviceId();
    } catch (err) {}
    try {
      var key = (window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS && window.APP_CONFIG.STORAGE_KEYS.DEVICE_ID) || 'tpk_device_id';
      return localStorage.getItem(key) || '';
    } catch (err2) { return ''; }
  }

  function getAppVersion() {
    return (window.APP_CONFIG && window.APP_CONFIG.APP_VERSION) || '';
  }

  function getProfile() {
    try {
      if (window.AppState && typeof window.AppState.getProfile === 'function') return window.AppState.getProfile() || {};
      var key = (window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS && window.APP_CONFIG.STORAGE_KEYS.PROFILE) || 'tpk_profile';
      return safeJsonParse(localStorage.getItem(key), {}) || {};
    } catch (err) { return {}; }
  }

  function readLegacyQueue() {
    return safeJsonParse(localStorage.getItem(LS_QUEUE_KEY), []) || [];
  }

  function writeLegacyQueue(rows) {
    try { localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(rows || [])); } catch (err) {}
  }

  function buildId(prefix) {
    return (prefix || 'Q') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function getClientSubmitId(action, payload, meta) {
    payload = payload || {};
    meta = meta || {};
    return meta.client_submit_id || payload.client_submit_id || buildId(action === 'registerSasaran' ? 'REG' : 'SUB');
  }

  function buildQueueItem(action, payload, meta) {
    payload = Object.assign({}, payload || {});
    meta = meta || {};
    var profile = getProfile();
    var clientSubmitId = getClientSubmitId(action, payload, meta);
    payload.client_submit_id = payload.client_submit_id || clientSubmitId;
    payload.sync_source = payload.sync_source || meta.sync_source || 'OFFLINE_QUEUE';

    return {
      id: meta.id || clientSubmitId,
      queue_id: meta.queue_id || clientSubmitId,
      action: action || meta.action || '',
      entity_type: meta.entity_type || (action === 'registerSasaran' ? 'SASARAN' : ''),
      entity_id_ref: meta.entity_id_ref || payload.id_sasaran || '',
      client_submit_id: clientSubmitId,
      payload: payload,
      id_pengguna: meta.id_pengguna || profile.id_user || profile.username || '',
      id_tim: meta.id_tim || profile.id_tim || payload.id_tim || '',
      device_id: meta.device_id || getDeviceId(),
      app_version: meta.app_version || getAppVersion(),
      sync_source: payload.sync_source || meta.sync_source || 'OFFLINE_QUEUE',
      sync_status: normalizeStatus(meta.sync_status || meta.status || 'PENDING'),
      status: normalizeStatus(meta.sync_status || meta.status || 'PENDING'),
      retry_count: Number(meta.retry_count || 0),
      last_error: meta.last_error || '',
      created_at: meta.created_at || nowIso(),
      updated_at: nowIso(),
      last_synced_at: meta.last_synced_at || ''
    };
  }

  function notifyChange() {
    try { window.dispatchEvent(new CustomEvent('tpk:queue-changed')); } catch (err) {}
    listeners.forEach(function (fn) { try { fn(); } catch (err2) {} });
  }

  async function ensureDb() {
    var db = getDb();
    if (db && typeof db.init === 'function') {
      try { await db.init(); } catch (err) {}
    }
    return db;
  }

  async function migrateLegacyQueue() {
    var db = await ensureDb();
    if (!db || typeof db.addQueue !== 'function') return false;
    var legacy = readLegacyQueue();
    if (!legacy.length) return true;

    for (var i = 0; i < legacy.length; i += 1) {
      var item = legacy[i] || {};
      var payload = item.payload || {};
      await db.addQueue(item.action || payload.action || 'registerSasaran', payload, {
        id: item.id || item.client_submit_id || payload.client_submit_id,
        entity_type: item.entity_type || 'SASARAN',
        client_submit_id: item.client_submit_id || payload.client_submit_id || item.id,
        sync_status: item.sync_status || item.status || 'PENDING',
        retry_count: item.retry_count || 0,
        last_error: item.last_error || '',
        created_at: item.created_at || item.saved_at || nowIso(),
        sync_source: payload.sync_source || item.sync_source || 'OFFLINE_QUEUE'
      });
    }

    try { localStorage.removeItem(LS_QUEUE_KEY); } catch (err) {}
    notifyChange();
    return true;
  }

  async function enqueue(action, payload, meta) {
    var item = buildQueueItem(action, payload, meta || {});
    var db = await ensureDb();

    if (db && typeof db.addQueue === 'function') {
      await db.addQueue(item.action, item.payload, item);
    } else {
      var rows = readLegacyQueue();
      rows = rows.filter(function (row) { return String(row.id || row.client_submit_id) !== String(item.id); });
      rows.push(item);
      writeLegacyQueue(rows);
    }

    try {
      if (db && typeof db.addAudit === 'function') await db.addAudit('QUEUE_ENQUEUE', { id: item.id, action: item.action, entity_type: item.entity_type });
    } catch (err) {}

    notifyChange();
    return item;
  }

  async function update(id, patch) {
    var db = await ensureDb();
    var updated = null;
    if (db && typeof db.updateQueue === 'function') {
      updated = await db.updateQueue(id, patch || {});
    } else {
      var rows = readLegacyQueue();
      rows = rows.map(function (row) {
        if (String(row.id || row.client_submit_id) === String(id)) {
          updated = Object.assign({}, row, patch || {}, { updated_at: nowIso() });
          if (updated.sync_status) updated.status = updated.sync_status;
          return updated;
        }
        return row;
      });
      writeLegacyQueue(rows);
    }
    notifyChange();
    return updated;
  }

  async function removeById(id) {
    var db = await ensureDb();
    if (db && typeof db.removeQueue === 'function') {
      await db.removeQueue(id);
    } else {
      writeLegacyQueue(readLegacyQueue().filter(function (row) { return String(row.id || row.client_submit_id) !== String(id); }));
    }
    notifyChange();
    return true;
  }

  async function list(filter) {
    await migrateLegacyQueue();
    var db = await ensureDb();
    if (db && typeof db.listQueue === 'function') return db.listQueue(filter || {});

    var rows = readLegacyQueue();
    var f = filter || {};
    if (f.status) rows = rows.filter(function (row) { return normalizeStatus(row.sync_status || row.status) === normalizeStatus(f.status); });
    if (f.action) rows = rows.filter(function (row) { return String(row.action || '') === String(f.action); });
    if (f.keyword) {
      var q = String(f.keyword || '').toLowerCase();
      rows = rows.filter(function (row) { return JSON.stringify(row || {}).toLowerCase().indexOf(q) >= 0; });
    }
    rows.sort(function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
    return rows;
  }

  function unwrapDraftPayload(item) {
    if (!item) return null;
    if (item.payload && item.payload.data) return item.payload;
    if (item.data) return item;
    return item.payload || item;
  }

  function isBlankDraft(payload) {
    payload = unwrapDraftPayload(payload);
    if (!payload) return true;
    var data = payload.data || payload || {};
    try {
      var text = JSON.stringify(data || {});
      return !text || text === '{}' || text.length < 8;
    } catch (err) {
      return false;
    }
  }

  async function listDrafts(filter) {
    var db = await ensureDb();
    var rows = [];
    if (db && typeof db.listDrafts === 'function') {
      try { rows = await db.listDrafts(filter || {}); } catch (err) { rows = []; }
    }

    var localReg = safeJsonParse(localStorage.getItem(REG_DRAFT_KEY), null);
    if (localReg && !isBlankDraft(localReg)) {
      rows.push({
        draft_key: REG_DRAFT_KEY,
        draft_type: 'REGISTRASI',
        payload: localReg,
        meta: { source: 'localStorage' },
        created_at: localReg.saved_at || localReg.created_at || '',
        updated_at: localReg.saved_at || localReg.updated_at || ''
      });
    }

    var localPen = safeJsonParse(localStorage.getItem(PEN_DRAFT_KEY), null);
    if (localPen && !isBlankDraft(localPen)) {
      rows.push({
        draft_key: PEN_DRAFT_KEY,
        draft_type: 'PENDAMPINGAN',
        payload: localPen,
        meta: { source: 'localStorage' },
        created_at: localPen.saved_at || localPen.created_at || '',
        updated_at: localPen.saved_at || localPen.updated_at || ''
      });
    }

    var seen = {};
    rows = rows.filter(function (row) {
      var key = row.draft_key || (row.meta && row.meta.draft_key) || JSON.stringify(row).slice(0, 80);
      if (seen[key]) return false;
      seen[key] = true;
      return !isBlankDraft(row);
    });

    var f = filter || {};
    if (f.draft_type) rows = rows.filter(function (row) { return String(row.draft_type || '').toUpperCase() === String(f.draft_type || '').toUpperCase(); });
    rows.sort(function (a, b) { return String(b.updated_at || '').localeCompare(String(a.updated_at || '')); });
    return rows;
  }

  async function getSummary() {
    var rows = await list();
    var drafts = await listDrafts();
    var summary = { total: rows.length, pending: 0, failed: 0, processing: 0, conflict: 0, success: 0, drafts: drafts.length, draft_only: drafts.length };
    rows.forEach(function (row) {
      var status = normalizeStatus(row.sync_status || row.status);
      if (status === 'PENDING') summary.pending += 1;
      else if (status === 'FAILED') summary.failed += 1;
      else if (status === 'PROCESSING') summary.processing += 1;
      else if (status === 'CONFLICT') summary.conflict += 1;
      else if (status === 'SUCCESS') summary.success += 1;
    });
    summary.actionable = summary.pending + summary.failed + summary.conflict;
    summary.dashboard_pending = summary.actionable + summary.drafts;
    return summary;
  }

  async function clearAll() {
    var db = await ensureDb();
    if (db && typeof db.clear === 'function' && db.stores && db.stores.QUEUE) await db.clear(db.stores.QUEUE);
    writeLegacyQueue([]);
    notifyChange();
    return true;
  }

  async function saveDraft(draftKey, draftType, data, meta) {
    var db = await ensureDb();
    var wrapped = {
      saved_at: nowIso(),
      data: clone(data || {})
    };

    if (db && typeof db.saveDraft === 'function') {
      await db.saveDraft(draftKey, draftType, wrapped, meta || {});
    }

    try { localStorage.setItem(draftKey, JSON.stringify(wrapped)); } catch (err) {}
    notifyChange();
    return wrapped;
  }

  async function getDraft(draftKey) {
    var db = await ensureDb();
    if (db && typeof db.getDraft === 'function') {
      var item = await db.getDraft(draftKey);
      if (item && item.payload) return item.payload;
    }
    return safeJsonParse(localStorage.getItem(draftKey), null);
  }

  async function clearDraft(draftKey) {
    var db = await ensureDb();
    if (db && typeof db.clearDraft === 'function') await db.clearDraft(draftKey);
    try { localStorage.removeItem(draftKey); } catch (err) {}
    notifyChange();
    return true;
  }

  async function clearRegistrasiDraft() { return clearDraft(REG_DRAFT_KEY); }
  async function clearPendampinganDraft() { return clearDraft(PEN_DRAFT_KEY); }

  function onChange(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (item) { return item !== fn; });
    };
  }

  var QueueRepo = {
    migrateLegacyQueue: migrateLegacyQueue,
    enqueue: enqueue,
    add: enqueue,
    update: update,
    removeById: removeById,
    list: list,
    getQueue: list,
    getSummary: getSummary,
    listDrafts: listDrafts,
    clearAll: clearAll,
    saveDraft: saveDraft,
    getDraft: getDraft,
    clearDraft: clearDraft,
    clearRegistrasiDraft: clearRegistrasiDraft,
    clearPendampinganDraft: clearPendampinganDraft,
    onChange: onChange,
    normalizeStatus: normalizeStatus
  };

  var DraftManager = {
    getRegistrasiDraftAsync: function () { return getDraft(REG_DRAFT_KEY); },
    getRegistrasiDraft: function () {
      return safeJsonParse(localStorage.getItem(REG_DRAFT_KEY), null);
    },
    saveRegistrasiDraft: function (data) {
      return saveDraft(REG_DRAFT_KEY, 'REGISTRASI', data || {}, { source: 'registrasiView' });
    },
    clearRegistrasiDraft: function () {
      return clearDraft(REG_DRAFT_KEY);
    },
    enqueueOfflineRegistrasi: function (payload) {
      return enqueue('registerSasaran', Object.assign({}, payload || {}, { sync_source: 'OFFLINE_QUEUE' }), {
        entity_type: 'SASARAN',
        client_submit_id: payload && payload.client_submit_id || '',
        sync_source: 'OFFLINE_QUEUE'
      });
    },
    getPendampinganDraft: function () {
      return safeJsonParse(localStorage.getItem(PEN_DRAFT_KEY), null);
    },
    savePendampinganDraft: function (data) {
      return saveDraft(PEN_DRAFT_KEY, 'PENDAMPINGAN', data || {}, { source: 'pendampinganView' });
    },
    clearPendampinganDraft: function () {
      return clearDraft(PEN_DRAFT_KEY);
    }
  };

  window.QueueRepo = QueueRepo;
  window.DraftManager = DraftManager;

  migrateLegacyQueue().catch(function () {});
})(window);
