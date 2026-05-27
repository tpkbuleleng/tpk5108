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


/* ===== READ MODEL BINDING R1-R3-R3 start: Draft Queue Binding compatibility ===== */
(function (window) {
  'use strict';

  var VERSION = 'READ-MODEL-BINDING-R1-R3-R3-DRAFT-QUEUE-BINDING-20260527';
  var REG_DRAFT_KEY = 'tpk_registrasi_draft_v_final';
  var PEN_DRAFT_KEY = 'tpk_pendampingan_draft_v_final';
  var LEGACY_QUEUE_KEY = 'tpk_sync_queue_v1';

  if (!window.QueueRepo || window.QueueRepo.__DRAFT_QUEUE_BINDING_R1R3R3 === true) return;
  var QR = window.QueueRepo;
  QR.__DRAFT_QUEUE_BINDING_R1R3R3 = true;

  function nowIso() { return new Date().toISOString(); }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (err) { return value; }
  }

  function safeJsonParse(value, fallback) {
    try { return value ? JSON.parse(value) : fallback; } catch (err) { return fallback; }
  }

  function getDb() {
    return window.TPKDb || window.DB || null;
  }

  function normalizeStatus(value) {
    if (typeof QR.normalizeStatus === 'function') return QR.normalizeStatus(value);
    return String(value || 'PENDING').trim().toUpperCase() || 'PENDING';
  }

  function emitChange() {
    try { window.dispatchEvent(new CustomEvent('tpk:queue-changed', { detail: { version: VERSION } })); } catch (err) {}
    try {
      if (window.SyncManager && typeof window.SyncManager.updateBadge === 'function') {
        window.SyncManager.updateBadge();
      }
    } catch (err2) {}
  }

  function readLegacyQueue() {
    return safeJsonParse(window.localStorage && window.localStorage.getItem(LEGACY_QUEUE_KEY), []) || [];
  }

  function writeLegacyQueue(rows) {
    try { window.localStorage.setItem(LEGACY_QUEUE_KEY, JSON.stringify(rows || [])); } catch (err) {}
  }

  async function getQueueRows(filter) {
    if (typeof QR.list === 'function') return QR.list(filter || {});
    return readLegacyQueue();
  }

  async function getById(id) {
    var key = String(id || '').trim();
    if (!key) return null;
    var rows = await getQueueRows({});
    return (rows || []).find(function (row) {
      return String(row.id || row.queue_id || row.client_submit_id || '') === key;
    }) || null;
  }

  async function saveQueueItem(item) {
    var safe = clone(item || {});
    var id = String(safe.id || safe.queue_id || safe.client_submit_id || '').trim();
    if (!id) {
      id = 'QUE-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    }

    safe.id = id;
    safe.queue_id = safe.queue_id || id;
    safe.client_submit_id = safe.client_submit_id || (safe.payload && safe.payload.client_submit_id) || id;
    safe.sync_status = normalizeStatus(safe.sync_status || safe.status || 'PENDING');
    safe.status = safe.sync_status;
    safe.updated_at = nowIso();
    safe.created_at = safe.created_at || nowIso();

    var db = getDb();
    if (db && typeof db.addQueue === 'function') {
      await db.addQueue(safe.action || (safe.payload && safe.payload.action) || 'registerSasaran', safe.payload || {}, safe);
    } else {
      var rows = readLegacyQueue().filter(function (row) {
        return String(row.id || row.queue_id || row.client_submit_id || '') !== id;
      });
      rows.push(safe);
      writeLegacyQueue(rows);
    }

    emitChange();
    return safe;
  }

  async function saveDraftItem(item) {
    var safe = clone(item || {});
    var draftKey = String(safe.draft_key || REG_DRAFT_KEY).trim();
    var draftType = String(safe.draft_type || 'REGISTRASI').trim().toUpperCase();
    var payload = safe.payload !== undefined ? safe.payload : { saved_at: nowIso(), data: safe.data || {} };
    var meta = Object.assign({}, safe.meta || {}, { source: 'QueueRepo.save', version: VERSION });

    if (typeof QR.saveDraft === 'function') {
      await QR.saveDraft(draftKey, draftType, payload && payload.data ? payload.data : payload, meta);
    } else {
      try { window.localStorage.setItem(draftKey, JSON.stringify(payload)); } catch (err) {}
      var db = getDb();
      if (db && typeof db.saveDraft === 'function') {
        await db.saveDraft(draftKey, draftType, payload, meta);
      }
      emitChange();
    }

    return {
      draft_key: draftKey,
      draft_type: draftType,
      payload: payload,
      meta: meta,
      updated_at: nowIso()
    };
  }

  if (typeof QR.getById !== 'function') {
    QR.getById = getById;
  }

  if (typeof QR.save !== 'function') {
    QR.save = async function (item) {
      if (item && (item.draft_key || item.draft_type)) {
        return saveDraftItem(item);
      }
      return saveQueueItem(item || {});
    };
  }

  if (typeof QR.stats !== 'function') {
    QR.stats = async function () {
      if (typeof QR.getSummary === 'function') return QR.getSummary();
      var rows = await getQueueRows({});
      var summary = { total: rows.length, pending: 0, failed: 0, processing: 0, conflict: 0, success: 0, drafts: 0, draft_only: 0 };
      rows.forEach(function (row) {
        var status = normalizeStatus(row.sync_status || row.status);
        if (status === 'PENDING') summary.pending += 1;
        else if (status === 'FAILED') summary.failed += 1;
        else if (status === 'PROCESSING') summary.processing += 1;
        else if (status === 'CONFLICT') summary.conflict += 1;
        else if (status === 'SUCCESS') summary.success += 1;
      });
      if (typeof QR.listDrafts === 'function') {
        try {
          var drafts = await QR.listDrafts({});
          summary.drafts = drafts.length;
          summary.draft_only = drafts.length;
        } catch (err) {}
      }
      summary.actionable = summary.pending + summary.failed + summary.conflict;
      summary.dashboard_pending = summary.actionable + summary.drafts;
      return summary;
    };
  }

  if (typeof QR.syncLegacyMirror !== 'function') {
    QR.syncLegacyMirror = async function () {
      var rows = await getQueueRows({});
      writeLegacyQueue(rows || []);
      emitChange();
      return rows || [];
    };
  }

  if (typeof QR.saveRegistrationDraft !== 'function') {
    QR.saveRegistrationDraft = async function (data, meta) {
      if (typeof QR.saveDraft === 'function') {
        return QR.saveDraft(REG_DRAFT_KEY, 'REGISTRASI', data || {}, Object.assign({ source: 'registrasiView', version: VERSION }, meta || {}));
      }
      return saveDraftItem({
        draft_key: REG_DRAFT_KEY,
        draft_type: 'REGISTRASI',
        payload: { saved_at: nowIso(), data: data || {} },
        meta: Object.assign({ source: 'registrasiView', version: VERSION }, meta || {})
      });
    };
  }

  if (typeof QR.clearRegistrationDraft !== 'function') {
    QR.clearRegistrationDraft = async function () {
      if (typeof QR.clearDraft === 'function') return QR.clearDraft(REG_DRAFT_KEY);
      try { window.localStorage.removeItem(REG_DRAFT_KEY); } catch (err) {}
      emitChange();
      return true;
    };
  }

  window.DraftManager = window.DraftManager || {};
  var DM = window.DraftManager;

  DM.getRegistrasiDraftAsync = function () {
    if (typeof QR.getDraft === 'function') return QR.getDraft(REG_DRAFT_KEY);
    return Promise.resolve(safeJsonParse(window.localStorage.getItem(REG_DRAFT_KEY), null));
  };

  DM.getRegistrasiDraft = function () {
    return safeJsonParse(window.localStorage.getItem(REG_DRAFT_KEY), null);
  };

  DM.saveRegistrasiDraft = function (data) {
    return QR.saveRegistrationDraft(data || {}, { source: 'DraftManager.saveRegistrasiDraft' });
  };

  DM.clearRegistrasiDraft = function () {
    return QR.clearRegistrationDraft();
  };

  DM.enqueueOfflineRegistrasi = function (payload) {
    if (typeof QR.enqueue === 'function') {
      return QR.enqueue('registerSasaran', Object.assign({}, payload || {}, { sync_source: 'OFFLINE_QUEUE' }), {
        entity_type: 'SASARAN',
        client_submit_id: payload && payload.client_submit_id || '',
        sync_source: 'OFFLINE_QUEUE'
      });
    }
    return saveQueueItem({
      action: 'registerSasaran',
      entity_type: 'SASARAN',
      client_submit_id: payload && payload.client_submit_id || '',
      payload: Object.assign({}, payload || {}, { sync_source: 'OFFLINE_QUEUE' }),
      sync_status: 'PENDING'
    });
  };

  DM.getPendampinganDraftAsync = function () {
    if (typeof QR.getDraft === 'function') return QR.getDraft(PEN_DRAFT_KEY);
    return Promise.resolve(safeJsonParse(window.localStorage.getItem(PEN_DRAFT_KEY), null));
  };

  DM.getPendampinganDraft = function () {
    return safeJsonParse(window.localStorage.getItem(PEN_DRAFT_KEY), null);
  };

  DM.savePendampinganDraft = function (data) {
    if (typeof QR.saveDraft === 'function') return QR.saveDraft(PEN_DRAFT_KEY, 'PENDAMPINGAN', data || {}, { source: 'DraftManager.savePendampinganDraft', version: VERSION });
    return saveDraftItem({ draft_key: PEN_DRAFT_KEY, draft_type: 'PENDAMPINGAN', payload: { saved_at: nowIso(), data: data || {} } });
  };

  DM.clearPendampinganDraft = function () {
    if (typeof QR.clearDraft === 'function') return QR.clearDraft(PEN_DRAFT_KEY);
    try { window.localStorage.removeItem(PEN_DRAFT_KEY); } catch (err) {}
    emitChange();
    return Promise.resolve(true);
  };

  try { QR.syncLegacyMirror(); } catch (err) {}
  emitChange();

  window.__TPK_DRAFT_QUEUE_BINDING_R1R3R3_VERSION = VERSION;
})(window);
/* ===== READ MODEL BINDING R1-R3-R3 end ===== */


/* ===== READ MODEL BINDING R1-R3-R4 start: Draft local audit binding ===== */
(function (window) {
  'use strict';

  var VERSION = 'READ-MODEL-BINDING-R1-R3-R4-DRAFT-LOCAL-AUDIT-20260527';
  var REG_DRAFT_KEY = 'tpk_registrasi_draft_v_final';
  var FALLBACK_AUDIT_KEY = 'tpk_local_audit_fallback_v1';
  var lastAuditSignature = '';
  var lastAuditAt = 0;

  if (!window.QueueRepo || window.QueueRepo.__DRAFT_LOCAL_AUDIT_R1R3R4 === true) return;
  var QR = window.QueueRepo;
  QR.__DRAFT_LOCAL_AUDIT_R1R3R4 = true;

  function nowIso() { return new Date().toISOString(); }
  function isFunction(fn) { return typeof fn === 'function'; }
  function safeTrim(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (err) { return value; } }
  function getDb() { return window.TPKDb || window.DB || null; }
  function getProfile() {
    try { if (window.AppState && isFunction(window.AppState.getProfile)) return window.AppState.getProfile() || {}; } catch (err) {}
    return {};
  }
  function readFallbackAudit() {
    try { var raw = window.localStorage.getItem(FALLBACK_AUDIT_KEY); return raw ? JSON.parse(raw) : []; } catch (err) { return []; }
  }
  function writeFallbackAudit(row) {
    try {
      var rows = readFallbackAudit();
      rows.push(row);
      if (rows.length > 200) rows = rows.slice(rows.length - 200);
      window.localStorage.setItem(FALLBACK_AUDIT_KEY, JSON.stringify(rows));
    } catch (err) {}
  }
  function shouldAuditManualDraft(meta) {
    var source = safeTrim(meta && meta.source).toLowerCase();
    return source.indexOf('savedraftformal') >= 0 ||
      source.indexOf('manual') >= 0 ||
      source.indexOf('draftview') >= 0;
  }
  async function writeLocalAudit(eventType, detail) {
    var safeDetail = clone(detail || {});
    var sig = eventType + '|' + safeTrim(safeDetail.draft_key) + '|' + safeTrim(safeDetail.client_submit_id) + '|' + safeTrim(safeDetail.source);
    var now = Date.now();
    if (sig === lastAuditSignature && now - lastAuditAt < 1500) return null;
    lastAuditSignature = sig;
    lastAuditAt = now;

    var profile = getProfile();
    var row = {
      event_type: eventType || 'LOCAL_EVENT',
      source_layer: 'CLIENT_LOCAL',
      module: 'queueRepo.js',
      detail: safeDetail,
      id_user: safeTrim(profile.id_user || profile.username || ''),
      id_tim: safeTrim(profile.id_tim || ''),
      app_version: (window.APP_CONFIG && window.APP_CONFIG.APP_VERSION) || '',
      created_at: nowIso(),
      local_audit_version: VERSION
    };

    try {
      var db = getDb();
      if (db && isFunction(db.addAudit)) return await db.addAudit(eventType, row);
    } catch (err) {}
    writeFallbackAudit(row);
    return row;
  }

  var oldSaveRegistrationDraft = QR.saveRegistrationDraft;
  if (isFunction(oldSaveRegistrationDraft)) {
    QR.saveRegistrationDraft = async function (data, meta) {
      var result = await oldSaveRegistrationDraft.apply(QR, arguments);
      if (shouldAuditManualDraft(meta || {})) {
        await writeLocalAudit('REGISTRASI_DRAFT_SAVED', {
          draft_key: REG_DRAFT_KEY,
          draft_type: 'REGISTRASI',
          client_submit_id: data && data.client_submit_id || '',
          jenis_sasaran: data && data.answers && data.answers.jenis_sasaran || data && data.jenis_sasaran || '',
          source: meta && meta.source || '',
          status: 'DRAFT'
        });
      }
      return result;
    };
  }

  var oldClearDraft = QR.clearDraft;
  if (isFunction(oldClearDraft)) {
    QR.clearDraft = async function (draftKey) {
      var key = safeTrim(draftKey || '');
      var result = await oldClearDraft.apply(QR, arguments);
      if (key === REG_DRAFT_KEY || key.toLowerCase().indexOf('registrasi') >= 0) {
        await writeLocalAudit('REGISTRASI_DRAFT_CLEARED', {
          draft_key: key || REG_DRAFT_KEY,
          draft_type: 'REGISTRASI',
          source: 'QueueRepo.clearDraft',
          status: 'CLEARED'
        });
      }
      return result;
    };
  }

  var oldClearRegistrationDraft = QR.clearRegistrationDraft || QR.clearRegistrasiDraft;
  QR.clearRegistrationDraft = QR.clearRegistrasiDraft = async function () {
    var result = oldClearRegistrationDraft && isFunction(oldClearRegistrationDraft)
      ? await oldClearRegistrationDraft.apply(QR, arguments)
      : (isFunction(QR.clearDraft) ? await QR.clearDraft(REG_DRAFT_KEY) : true);
    await writeLocalAudit('REGISTRASI_DRAFT_CLEARED', {
      draft_key: REG_DRAFT_KEY,
      draft_type: 'REGISTRASI',
      source: 'QueueRepo.clearRegistrationDraft',
      status: 'CLEARED'
    });
    return result;
  };

  QR.writeLocalAudit = QR.writeLocalAudit || writeLocalAudit;
  QR.getLocalAuditFallback = QR.getLocalAuditFallback || readFallbackAudit;
  window.__TPK_DRAFT_LOCAL_AUDIT_R1R3R4_VERSION = VERSION;
})(window);
/* ===== READ MODEL BINDING R1-R3-R4 end ===== */
