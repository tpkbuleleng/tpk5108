(function (window, document) {
  'use strict';

  window.__PENDAMPINGAN_VIEW_BUILD = '20260604-QBR2-R4B-BUFAS-KB-ALIAS-CLEANUP';
  console.log('PendampinganView build aktif:', window.__PENDAMPINGAN_VIEW_BUILD);

  var PENDAMPINGAN_DRAFT_KEY = 'tpk_pendampingan_draft';
  var LOCAL_SELECTED_SASARAN_KEY = 'tpk_selected_sasaran';

  var currentMode = 'create';
  var currentEditItem = {};
  var currentDynamicFields = [];
  var currentJenisSasaran = '';
  var currentOpenToken = 0;
  var currentFormDefinition = null;
  var pendampinganFormCache = Object.create(null);
  var isInitialized = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function getUI() {
    return window.UI || null;
  }

  function getApi() {
    return window.Api || null;
  }

  function getRouter() {
    return window.Router || null;
  }

  function getState() {
    return window.AppState || null;
  }

  function getStorage() {
    return window.Storage || null;
  }

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getActions() {
    return getConfig().API_ACTIONS || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function getActionName(key, fallback) {
    var actions = getActions();
    return actions[key] || fallback;
  }

  function showToast(message, type) {
    var ui = getUI();
    if (ui && typeof ui.showToast === 'function') {
      ui.showToast(message, type || 'info');
      return;
    }
    if (ui && typeof ui.toast === 'function') {
      ui.toast(message, type || 'info');
      return;
    }
    try {
      window.alert(message);
    } catch (err) {}
  }

  function setText(id, value) {
    var ui = getUI();
    if (ui && typeof ui.setText === 'function') {
      ui.setText(id, value);
      return;
    }
    var el = byId(id);
    if (el) {
      el.textContent = (value === undefined || value === null || value === '') ? '-' : String(value);
    }
  }

  function setHTML(id, html) {
    var ui = getUI();
    if (ui && typeof ui.setHTML === 'function') {
      ui.setHTML(id, html);
      return;
    }
    var el = byId(id);
    if (el) el.innerHTML = html || '';
  }

  function setValue(id, value) {
    var ui = getUI();
    if (ui && typeof ui.setValue === 'function') {
      ui.setValue(id, value);
      return;
    }
    var el = byId(id);
    if (el) el.value = value !== undefined && value !== null ? value : '';
  }

  function toggleHidden(id, shouldHide) {
    var ui = getUI();
    if (ui && typeof ui.toggleHidden === 'function') {
      ui.toggleHidden(id, shouldHide);
      return;
    }
    var el = byId(id);
    if (el) el.classList.toggle('hidden', !!shouldHide);
  }

  function setLoading(buttonId, isLoading, loadingText) {
    var ui = getUI();
    if (ui && typeof ui.setLoading === 'function') {
      ui.setLoading(buttonId, isLoading, loadingText || 'Memproses...');
      return;
    }

    var btn = byId(buttonId);
    if (!btn) return;

    if (isLoading) {
      if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = loadingText || 'Memproses...';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || btn.textContent;
      delete btn.dataset.originalText;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeSpaces(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function normalizeUpper(value) {
    return normalizeSpaces(value).toUpperCase();
  }

  function isRequired(value) {
    return normalizeSpaces(value) !== '';
  }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function parseJsonSafely(raw, fallback) {
    if (!raw) return fallback;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function generateClientSubmitId(prefix) {
    var safePrefix = prefix || 'SUB';
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return safePrefix + '-' + window.crypto.randomUUID();
      }
    } catch (err) {}
    return safePrefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function readStorage(key, fallback) {
    var storage = getStorage();
    if (storage && typeof storage.get === 'function') {
      return storage.get(key, fallback);
    }
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') || fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    var storage = getStorage();
    if (storage && typeof storage.set === 'function') {
      storage.set(key, value);
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {}
  }

  function removeStorage(key) {
    var storage = getStorage();
    if (storage && typeof storage.remove === 'function') {
      storage.remove(key);
    }
    try {
      localStorage.removeItem(key);
    } catch (err) {}
  }

  function getProfile() {
    var state = getState();
    if (state && typeof state.getProfile === 'function') {
      var p1 = state.getProfile() || {};
      if (p1 && Object.keys(p1).length) return p1;
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.PROFILE) {
      var p2 = storage.get(keys.PROFILE, {}) || {};
      if (p2 && Object.keys(p2).length) return p2;
    }

    try {
      return JSON.parse(localStorage.getItem('tpk_profile') || '{}');
    } catch (err) {
      return {};
    }
  }

  function wilayahToString(item) {
    if (!item || typeof item !== 'object') return '-';

    var raw = item.nama_wilayah || item.wilayah || '';
    if (raw && typeof raw === 'object') {
      var fromObj = [
        normalizeSpaces(raw.nama_dusun || raw.dusun_rw || raw.nama_dusun_rw || raw.dusun),
        normalizeSpaces(raw.nama_desa || raw.desa_kelurahan || raw.nama_desa_kelurahan || raw.desa),
        normalizeSpaces(raw.nama_kecamatan || raw.kecamatan)
      ].filter(Boolean).join(' • ');
      if (fromObj) return fromObj;
    }

    var plain = normalizeSpaces(raw);
    if (plain && plain !== '[object Object]') return plain;

    var fallback = [
      normalizeSpaces(item.nama_dusun || item.dusun_rw || item.nama_dusun_rw || item.dusun),
      normalizeSpaces(item.nama_desa || item.desa_kelurahan || item.nama_desa_kelurahan || item.desa),
      normalizeSpaces(item.nama_kecamatan || item.kecamatan)
    ].filter(Boolean).join(' • ');

    return fallback || '-';
  }

  function getSelectedSasaran() {
    var state = getState();
    if (state && typeof state.getSelectedSasaran === 'function') {
      var s1 = state.getSelectedSasaran() || {};
      if (s1 && Object.keys(s1).length) return s1;
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function') {
      var s2 = storage.get(keys.SELECTED_SASARAN || LOCAL_SELECTED_SASARAN_KEY, {}) || {};
      if (s2 && Object.keys(s2).length) return s2;
    }

    try {
      return JSON.parse(localStorage.getItem(LOCAL_SELECTED_SASARAN_KEY) || '{}');
    } catch (err) {
      return {};
    }
  }

  function setSelectedSasaran(item) {
    var safeItem = item && typeof item === 'object' ? item : {};
    safeItem.nama_wilayah = wilayahToString(safeItem);

    var state = getState();
    var storage = getStorage();
    var keys = getStorageKeys();

    if (state && typeof state.setSelectedSasaran === 'function') {
      state.setSelectedSasaran(safeItem);
    }

    if (storage && typeof storage.set === 'function') {
      storage.set(keys.SELECTED_SASARAN || LOCAL_SELECTED_SASARAN_KEY, safeItem);
    }

    try {
      localStorage.setItem(LOCAL_SELECTED_SASARAN_KEY, JSON.stringify(safeItem));
    } catch (err) {}
  }

  function setMode(mode) {
    currentMode = String(mode || 'create').toLowerCase() === 'edit' ? 'edit' : 'create';
    var state = getState();
    if (state && typeof state.setPendampinganMode === 'function') {
      state.setPendampinganMode(currentMode);
    }
  }

  function getMode() {
    return currentMode || 'create';
  }

  function setEditItem(item) {
    currentEditItem = item && typeof item === 'object' ? item : {};
  }

  function getEditItem() {
    return currentEditItem || {};
  }

  function clearEditItem() {
    currentEditItem = {};
  }

  function getLocalDraft() {
    return readStorage(PENDAMPINGAN_DRAFT_KEY, null);
  }

  function saveLocalDraft(data) {
    writeStorage(PENDAMPINGAN_DRAFT_KEY, {
      saved_at: new Date().toISOString(),
      data: data || {}
    });
  }

  function clearLocalDraft() {
    removeStorage(PENDAMPINGAN_DRAFT_KEY);
  }

  function getSyncQueue() {
    var storage = getStorage();
    var keys = getStorageKeys();
    if (!storage || typeof storage.get !== 'function' || !keys.SYNC_QUEUE) return [];
    var queue = storage.get(keys.SYNC_QUEUE, []);
    return Array.isArray(queue) ? queue : [];
  }

  function saveSyncQueue(queue) {
    var storage = getStorage();
    var keys = getStorageKeys();
    var state = getState();
    if (!storage || typeof storage.set !== 'function' || !keys.SYNC_QUEUE) return;

    var safeQueue = Array.isArray(queue) ? queue : [];
    storage.set(keys.SYNC_QUEUE, safeQueue);
    if (state && typeof state.setSyncQueue === 'function') {
      state.setSyncQueue(safeQueue);
    }
  }

  function isNetworkLikeError(err) {
    var msg = String((err && err.message) || err || '').toLowerCase();
    return !navigator.onLine ||
      msg.indexOf('koneksi') >= 0 ||
      msg.indexOf('network') >= 0 ||
      msg.indexOf('fetch') >= 0 ||
      msg.indexOf('batas waktu') >= 0 ||
      msg.indexOf('timeout') >= 0 ||
      msg.indexOf('cors') >= 0 ||
      msg.indexOf('failed') >= 0;
  }

  async function enqueueOffline(action, payload) {
    var safePayload = Object.assign({}, payload || {}, { sync_source: 'OFFLINE_QUEUE' });

    if (window.QueueRepo && typeof window.QueueRepo.enqueue === 'function') {
      return await window.QueueRepo.enqueue(action, safePayload, {
        entity_type: 'PENDAMPINGAN',
        entity_id_local: safePayload.id_pendampingan || safePayload.id_sasaran || '',
        client_submit_id: safePayload.client_submit_id || '',
        sync_source: 'OFFLINE_QUEUE'
      });
    }

    var queue = getSyncQueue();
    var item = {
      id: safePayload.client_submit_id || generateClientSubmitId('QUEUE'),
      action: action,
      payload: safePayload,
      status: 'PENDING',
      sync_status: 'PENDING',
      created_at: new Date().toISOString()
    };
    queue.push(item);
    saveSyncQueue(queue);
    return item;
  }


  function getStatusBadgeClass(status) {
    var value = normalizeUpper(status);
    if (value === 'AKTIF') return 'badge-success-soft';
    if (value === 'NONAKTIF') return 'badge-danger-soft';
    if (value === 'SELESAI') return 'badge-success';
    if (value === 'PERLU_REVIEW') return 'badge-warning';
    return 'badge-neutral';
  }

  function normalizePendampinganDetailResponse(result) {
    var data = (result && result.data) || {};
    if (data.item && typeof data.item === 'object') return data.item;
    if (data.detail && typeof data.detail === 'object') return data.detail;
    if (typeof data === 'object' && !Array.isArray(data)) return data;
    return {};
  }

  function normalizePendampinganDetail(item) {
    var raw = item || {};
    var extra = raw.extra_fields || parseJsonSafely(raw.extra_fields_json, {});
    return {
      id_pendampingan: raw.id_pendampingan || raw.id || '',
      id_sasaran: raw.id_sasaran || '',
      nama_sasaran: raw.nama_sasaran || '',
      jenis_sasaran: raw.jenis_sasaran || '',
      status_sasaran: raw.status_sasaran || raw.status || 'AKTIF',
      nama_wilayah: wilayahToString(raw),
      nama_kecamatan: raw.nama_kecamatan || raw.kecamatan || '',
      nama_desa: raw.nama_desa || raw.desa_kelurahan || raw.desa || '',
      nama_dusun: raw.nama_dusun || raw.dusun_rw || raw.dusun || '',
      tanggal_pendampingan: raw.tanggal_pendampingan || raw.submit_at || '',
      status_kunjungan: raw.status_kunjungan || '',
      catatan_umum: raw.catatan_umum || '',
      extra_fields: extra,
      extra_fields_json: raw.extra_fields_json || '',
      revision_no: raw.revision_no || 1,
      raw: raw
    };
  }

  function isPendampinganScreenActive() {
    var router = getRouter();
    if (router && typeof router.getCurrentRoute === 'function') {
      return router.getCurrentRoute() === 'pendampingan';
    }
    var screen = byId('pendampingan-screen');
    return !!(screen && !screen.classList.contains('hidden'));
  }

  function goToPendampinganRoute(onReady) {
    if (isPendampinganScreenActive()) {
      if (typeof onReady === 'function') onReady();
      return;
    }

    var router = getRouter();
    if (!router || typeof router.go !== 'function') {
      if (typeof onReady === 'function') onReady();
      return;
    }

    router.go('pendampingan', {
      onRouteReady: function () {
        if (typeof onReady === 'function') onReady();
      }
    });
  }

  function buildOpenSignature(mode, targetId, jenis) {
    return [mode || 'create', targetId || '', jenis || ''].join('::');
  }

  function normalizeHeaderItem(baseItem) {
    var selected = baseItem || {};
    var profile = getProfile() || {};
    return {
      id_sasaran: selected.id_sasaran || selected.id || '',
      id: selected.id || selected.id_sasaran || '',
      nama_sasaran: selected.nama_sasaran || selected.nama || '',
      jenis_sasaran: selected.jenis_sasaran || '',
      status_sasaran: selected.status_sasaran || selected.status || 'AKTIF',
      nama_wilayah: wilayahToString(selected),
      nama_kecamatan: selected.nama_kecamatan || '',
      nama_desa: selected.nama_desa || '',
      nama_dusun: selected.nama_dusun || '',
      nama_kader: profile.nama_kader || profile.nama || '',
      nama_tim: profile.nama_tim || profile.id_tim || ''
    };
  }

  function getAgeMonths(dateStr) {
    var raw = normalizeSpaces(dateStr);
    if (!raw) return null;
    var dt = new Date(raw);
    if (isNaN(dt.getTime())) return null;
    var now = new Date();
    var months = (now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth());
    if (now.getDate() < dt.getDate()) months -= 1;
    if (months < 0) months = 0;
    return months;
  }

  function parseDateLoose(value) {
    var raw = normalizeSpaces(value);
    if (!raw) return null;

    var m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      var y1 = Number(m[1]);
      var mo1 = Number(m[2]);
      var d1 = Number(m[3]);
      var dt1 = new Date(y1, mo1 - 1, d1);
      if (dt1.getFullYear() === y1 && dt1.getMonth() === mo1 - 1 && dt1.getDate() === d1) return dt1;
    }

    m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      var d2 = Number(m[1]);
      var mo2 = Number(m[2]);
      var y2 = Number(m[3]);
      var dt2 = new Date(y2, mo2 - 1, d2);
      if (dt2.getFullYear() === y2 && dt2.getMonth() === mo2 - 1 && dt2.getDate() === d2) return dt2;
    }

    var dt = new Date(raw);
    return isNaN(dt.getTime()) ? null : dt;
  }

  function getAgeMonthsAt(dateStr, referenceDateStr) {
    var dob = parseDateLoose(dateStr);
    if (!dob) return null;
    var ref = parseDateLoose(referenceDateStr) || new Date();
    var months = (ref.getFullYear() - dob.getFullYear()) * 12 + (ref.getMonth() - dob.getMonth());
    if (ref.getDate() < dob.getDate()) months -= 1;
    if (months < 0) months = 0;
    return months;
  }

  function pickDeepValue(source, keys) {
    source = source || {};
    keys = keys || [];

    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (!key) continue;
      if (source[key] !== undefined && source[key] !== null && source[key] !== '') return source[key];
    }

    var jsonKeys = ['data_laporan', 'payload_json', 'extra_fields_json'];
    for (var j = 0; j < jsonKeys.length; j += 1) {
      var raw = source[jsonKeys[j]];
      var parsed = parseJsonSafely(raw, null);
      if (!parsed || typeof parsed !== 'object') continue;

      var nestedSources = [parsed, parsed.answers, parsed.baseline_snapshot, parsed.baseline_snapshot && parsed.baseline_snapshot.data_laporan];
      for (var n = 0; n < nestedSources.length; n += 1) {
        var obj = nestedSources[n];
        if (!obj || typeof obj !== 'object') continue;
        for (var k = 0; k < keys.length; k += 1) {
          var nestedKey = keys[k];
          if (obj[nestedKey] !== undefined && obj[nestedKey] !== null && obj[nestedKey] !== '') return obj[nestedKey];
        }
      }
    }

    return '';
  }

  function resolvePendampinganKe(selected) {
    selected = selected || getSelectedSasaran() || {};

    var direct = pickDeepValue(selected, ['pendampingan_ke', 'PENDAMPINGAN_KE', 'kunjungan_ke', 'KUNJUNGAN_KE']);
    if (direct !== '') {
      var d = Number(direct);
      if (!isNaN(d) && d > 0) return Math.max(1, Math.round(d));
    }

    var count = pickDeepValue(selected, [
      'jumlah_pendampingan', 'total_pendampingan', 'pendampingan_count',
      'jumlah_pendampingan_sasaran', 'TOTAL_PENDAMPINGAN'
    ]);
    if (count !== '') {
      var c = Number(count);
      if (!isNaN(c) && c >= 0) return Math.max(1, Math.round(c) + 1);
    }

    return 1;
  }

  function resolveBadutaAgeMonths(values) {
    var selected = getSelectedSasaran() || {};
    var direct = pickDeepValue(selected, [
      'usia_baduta_bulan', 'USIA_BADUTA_BULAN', 'usia_bulan', 'umur_bulan',
      'umur_bulan_saat_ini', 'umur_bulan_saat_register', 'usia_sasaran_bulan'
    ]);
    if (direct !== '') {
      var n = Number(direct);
      if (!isNaN(n) && n >= 0) return Math.floor(n);
    }

    var tgl = pickDeepValue(selected, [
      'tanggal_lahir', 'tgl_lahir', 'tanggal_lahir_sasaran', 'TANGGAL_LAHIR',
      'tgl_lahir_sasaran', 'dob'
    ]);
    var refDate = (values && (values.tanggal_pendampingan || values.TANGGAL_PENDAMPINGAN)) ||
      ((byId('pen-tanggal') && byId('pen-tanggal').value) || todayIso());
    var age = getAgeMonthsAt(tgl, refDate);
    if (age !== null && age !== undefined && !isNaN(age)) return age;

    // Fallback aman: jika tanggal lahir tidak ada di object sasaran, jangan menyembunyikan imunisasi.
    return 24;
  }

  function getDynamicContextValues(values) {
    var ctx = {};
    var selected = getSelectedSasaran() || {};
    var pendKe = resolvePendampinganKe(selected);
    var ageMonths = resolveBadutaAgeMonths(values || {});

    ctx.pendampingan_ke = pendKe;
    ctx.PENDAMPINGAN_KE = pendKe;
    ctx.usia_baduta_bulan = ageMonths;
    ctx.USIA_BADUTA_BULAN = ageMonths;

    return ctx;
  }

  function normalizeTriggerKey(token, lookup) {
    var raw = normalizeSpaces(token);
    var upper = normalizeUpper(raw);
    lookup = lookup || {};
    var target = (lookup.byCode && lookup.byCode[upper]) ||
      (lookup.byId && lookup.byId[upper]) ||
      (lookup.byKey && lookup.byKey[upper]) || null;
    if (target && target.id) return target.id;
    return raw.toLowerCase();
  }

  function splitMultiValue(value) {
    if (Array.isArray(value)) {
      return value.map(function (v) { return normalizeSpaces(v); }).filter(Boolean);
    }
    var raw = normalizeSpaces(value);
    if (!raw) return [];
    return raw.split(/[|;,]/).map(function (v) { return normalizeSpaces(v); }).filter(Boolean);
  }


  function boolValue(value, defaultValue) {
    if (value === true || value === false) return value;
    var raw = String(value === undefined || value === null ? '' : value).trim().toUpperCase();
    if (!raw) return !!defaultValue;
    if (raw === 'TRUE' || raw === '1' || raw === 'YA' || raw === 'YES' || raw === 'Y') return true;
    if (raw === 'FALSE' || raw === '0' || raw === 'TIDAK' || raw === 'NO' || raw === 'N') return false;
    return !!defaultValue;
  }

  function isYesValue(value) {
    var raw = normalizeUpper(value);
    return raw === 'YA' || raw === 'YES' || raw === 'Y' || raw === 'TRUE' || raw === '1' || raw.indexOf('YA,') === 0;
  }

  function field(id, label, type, required, options) {
    options = options || {};
    return {
      id: id,
      code: options.code || id,
      question_id: options.question_id || '',
      store_key: options.store_key || id,
      question_code: options.question_code || String(id || '').toUpperCase(),
      label: label,
      type: type,
      data_type: options.data_type || '',
      required: !!required,
      base_required: !!required,
      options: options.options || [],
      placeholder: options.placeholder || '',
      helpText: options.helpText || '',
      section: options.section || 'Lainnya',
      section_order: Number(options.section_order || 999),
      question_order: Number(options.question_order || 999),
      showIf: options.showIf || null,
      requiredIf: options.requiredIf || null,
      min: options.min,
      max: options.max,
      maxLength: options.maxLength,
      step: options.step,
      readonly: !!options.readonly,
      hidden: !!options.hidden,
      raw: options.raw || null
    };
  }

  function getFallbackOptions(referenceKey) {
    var key = normalizeUpper(referenceKey);
    if (key === 'OPT_YA_TIDAK') return [{ value: 'YA', label: 'Ya' }, { value: 'TIDAK', label: 'Tidak' }];
    if (key === 'OPT_JKN_TYPE') return [
      { value: 'BPJS_PBI', label: 'BPJS PBI' },
      { value: 'BPJS_NON_PBI', label: 'BPJS Non-PBI / Mandiri' },
      { value: 'JAMKESDA', label: 'Jamkesda' },
      { value: 'LAINNYA', label: 'Lainnya' }
    ];
    if (key === 'OPT_BANSOS_TYPE') return [
      { value: 'PKH', label: 'PKH' },
      { value: 'BPNT_SEMBAKO', label: 'BPNT / Sembako' },
      { value: 'BLT_DESA', label: 'BLT Desa' },
      { value: 'BANTUAN_PANGAN', label: 'Bantuan Pangan' },
      { value: 'PMT', label: 'PMT' },
      { value: 'LAINNYA', label: 'Lainnya' }
    ];
    if (key === 'OPT_MBG_FREQ') return [
      { value: 'SETIAP_HARI', label: 'Setiap Hari' },
      { value: 'LIMA_HARI_PER_MINGGU', label: '5 Hari Per Minggu' },
      { value: 'TIGA_EMPAT_HARI_PER_MINGGU', label: '3–4 Hari per Minggu' },
      { value: 'SATU_DUA_HARI_PER_MINGGU', label: '1–2 Hari per Minggu' },
      { value: 'TIDAK_TERATUR', label: 'Tidak Teratur' }
    ];
    if (key === 'OPT_JENIS_KB') return [
      { value: 'PIL', label: 'Pil' },
      { value: 'SUNTIK', label: 'Suntik' },
      { value: 'IMPLAN', label: 'Implan' },
      { value: 'IUD', label: 'IUD' },
      { value: 'KONDOM', label: 'Kondom' },
      { value: 'MOW', label: 'MOW' },
      { value: 'MOP', label: 'MOP' },
      { value: 'MAL', label: 'MAL' },
      { value: 'LAINNYA', label: 'Lainnya' }
    ];
    if (key === 'OPT_IMUNISASI_RELEVAN') return [
      { value: 'SESUAI_UMUR_LENGKAP', label: 'Sesuai Umur / Lengkap' },
      { value: 'BELUM_LENGKAP', label: 'Belum Lengkap' },
      { value: 'BELUM_PERNAH', label: 'Belum Pernah Imunisasi' },
      { value: 'TIDAK_TAHU', label: 'Tidak Tahu' }
    ];
    return [];
  }

  function getFallbackQuestionBank(jenisSasaran) {
    var jenis = normalizeUpper(jenisSasaran);
    var yesNo = getFallbackOptions('OPT_YA_TIDAK');
    var common = [
      field('memberikan_kie', 'Memberikan KIE/Penyuluhan', 'select', true, { options: yesNo, section: 'Pendampingan Umum' }),
      field('memfasilitasi_rujukan', 'Memfasilitasi Rujukan', 'select', true, { options: yesNo, section: 'Pendampingan Umum' }),
      field('kepesertaan_jkn', 'Kepesertaan JKN', 'select', true, { options: yesNo, section: 'JKN' }),
      field('jenis_jkn', 'Jenis JKN', 'select', false, { options: getFallbackOptions('OPT_JKN_TYPE'), section: 'JKN', showIf: { field: 'kepesertaan_jkn', equals: 'YA' }, requiredIf: { field: 'kepesertaan_jkn', equals: 'YA' } }),
      field('pemberian_bansos', 'Pemberian Bansos', 'select', true, { options: yesNo, section: 'Bansos' }),
      field('jenis_bansos', 'Jenis Bansos', 'select', false, { options: getFallbackOptions('OPT_BANSOS_TYPE'), section: 'Bansos', showIf: { field: 'pemberian_bansos', equals: 'YA' }, requiredIf: { field: 'pemberian_bansos', equals: 'YA' } }),
      field('mbg_diterima', 'MBG Diterima', 'select', true, { options: yesNo, section: 'MBG 3B' }),
      field('frekuensi_mbg', 'Frekuensi MBG', 'select', false, { options: getFallbackOptions('OPT_MBG_FREQ'), section: 'MBG 3B', showIf: { field: 'mbg_diterima', equals: 'YA' }, requiredIf: { field: 'mbg_diterima', equals: 'YA' } })
    ];

    if (jenis === 'BADUTA') {
      return [
        field('bb', 'Berat Badan', 'number', false, { min: 0.5, max: 30, step: 0.1, section: 'Evaluasi Pertumbuhan' }),
        field('pb_tb', 'Panjang/Tinggi Badan', 'number', false, { min: 20, max: 150, step: 0.1, section: 'Evaluasi Pertumbuhan' }),
        field('imunisasi_relevan', 'Imunisasi Relevan', 'select', false, { options: getFallbackOptions('OPT_IMUNISASI_RELEVAN'), section: 'KIE / Edukasi' })
      ].concat(common);
    }

    if (jenis === 'BUMIL') {
      return [
        field('bb', 'Berat Badan', 'number', false, { min: 20, max: 200, step: 0.1, section: 'Evaluasi Gizi dan HB' }),
        field('tb', 'Tinggi Badan', 'number', false, { min: 80, max: 220, step: 0.1, section: 'Evaluasi Gizi dan HB' }),
        field('lila', 'LILA', 'number', false, { min: 5, max: 60, step: 0.1, section: 'Evaluasi Gizi dan HB' }),
        field('periksa_hb', 'Periksa HB', 'select', true, { options: yesNo, section: 'Evaluasi Gizi dan HB' }),
        field('kadar_hb', 'Kadar HB', 'number', false, { min: 1, max: 25, step: 0.1, section: 'Evaluasi Gizi dan HB', showIf: { field: 'periksa_hb', equals: 'YA' }, requiredIf: { field: 'periksa_hb', equals: 'YA' } })
      ].concat(common);
    }

    if (jenis === 'BUFAS') {
      return [
        field('kb_pasca', 'KB Pasca Persalinan', 'select', true, { options: yesNo, section: 'Evaluasi KB Pasca Persalinan' }),
        field('jenis_kb', 'Jenis KB', 'select', false, { options: getFallbackOptions('OPT_JENIS_KB'), section: 'Evaluasi KB Pasca Persalinan', showIf: { field: 'kb_pasca', equals: 'YA' }, requiredIf: { field: 'kb_pasca', equals: 'YA' } })
      ].concat(common);
    }

    return [
      field('ctn_periksa', 'CATIN Sudah Diperiksa', 'select', true, { options: yesNo, section: 'Evaluasi Skrining' }),
      field('ctn_tgl_periksa', 'Tanggal Pemeriksaan CATIN', 'date', false, { section: 'Evaluasi Skrining', showIf: { field: 'ctn_periksa', equals: 'YA' }, requiredIf: { field: 'ctn_periksa', equals: 'YA' } })
    ].concat(common);
  }

  function getFormIdByJenis(jenisSasaran) {
    var config = getConfig();
    var jenis = normalizeUpper(jenisSasaran);
    var pendMap = (config.FORM && config.FORM.PENDAMPINGAN_JENIS_TO_FORM) || config.PENDAMPINGAN_FORM_IDS || {};
    var candidate = pendMap[jenis] || pendMap.DEFAULT || '';
    if (candidate && String(candidate).toUpperCase().indexOf('FRM000') === 0) return String(candidate).toUpperCase();

    var legacyMap = config.FORM_IDS || {};
    candidate = legacyMap[jenis] || legacyMap.UMUM || '';
    if (candidate && String(candidate).toUpperCase().indexOf('FRM000') === 0) return String(candidate).toUpperCase();

    var fallback = { CATIN: 'FRM0002', BUMIL: 'FRM0003', BUFAS: 'FRM0004', BADUTA: 'FRM0005' };
    return fallback[jenis] || 'FRM0001';
  }

  function buildPendampinganFormCacheKey(formId, jenis) {
    var version = normalizeUpper(window.__PENDAMPINGAN_VIEW_BUILD || 'QBR2');
    return 'tpk_form_definition_cache::PENDAMPINGAN::' + version + '::' + normalizeUpper(formId) + '::' + normalizeUpper(jenis);
  }

  function readPendampinganFormCache(formId, jenis) {
    var key = buildPendampinganFormCacheKey(formId, jenis);
    try {
      var raw = JSON.parse(localStorage.getItem(key) || 'null');
      if (raw && raw.definition && typeof raw.definition === 'object') return raw.definition;
      if (raw && raw.data && typeof raw.data === 'object') return raw.data;
    } catch (err) {}
    return null;
  }

  function writePendampinganFormCache(formId, jenis, definition) {
    var key = buildPendampinganFormCacheKey(formId, jenis);
    try {
      localStorage.setItem(key, JSON.stringify({
        saved_at: new Date().toISOString(),
        form_id: formId,
        jenis_sasaran: jenis,
        definition: definition || {}
      }));
    } catch (err) {}
  }

  async function fetchPendampinganFormDefinition(jenisSasaran, options) {
    var opts = options || {};
    var jenis = normalizeUpper(jenisSasaran);
    var formId = getFormIdByJenis(jenis);
    var cacheKey = formId + '::' + jenis;

    if (opts.forceRefresh !== true && pendampinganFormCache[cacheKey]) {
      return pendampinganFormCache[cacheKey];
    }

    var cached = readPendampinganFormCache(formId, jenis);
    if (cached && opts.forceRefresh !== true) {
      pendampinganFormCache[cacheKey] = cached;
      return cached;
    }

    var api = getApi();
    if (!api || typeof api.post !== 'function') {
      if (cached) return cached;
      throw new Error('Api.post belum tersedia untuk memuat form pendampingan.');
    }

    var result = await api.post(getActionName('GET_PENDAMPINGAN_FORM_DEFINITION', 'getPendampinganFormDefinition'), {
      module: 'PENDAMPINGAN',
      jenis_sasaran: jenis,
      form_id: formId,
      include_questions: true
    }, {
      includeAuth: true,
      timeoutMs: typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 30000,
      retryCount: 0,
      meta: {
        source: 'pendampingan_dynamic_form_binding',
        form_id: formId,
        jenis_sasaran: jenis
      }
    });

    if (!result || result.ok === false) {
      if (cached) return cached;
      throw new Error((result && result.message) || 'Definisi form pendampingan gagal dimuat.');
    }

    var definition = result.data || {};
    pendampinganFormCache[cacheKey] = definition;
    writePendampinganFormCache(formId, jenis, definition);
    return definition;
  }

  function getDefinitionQuestions(definition) {
    var def = definition || {};
    var questions = [];

    if (Array.isArray(def.questions) && def.questions.length) {
      questions = def.questions.slice();
    }

    if (!questions.length && Array.isArray(def.fields) && def.fields.length) {
      questions = def.fields.slice();
    }

    if (!questions.length && Array.isArray(def.sections)) {
      def.sections.forEach(function (section) {
        (section.questions || section.fields || []).forEach(function (q) {
          questions.push(Object.assign({}, q, {
            section_id: q.section_id || section.section_id || '',
            section_label: q.section_label || section.section_label || section.section_name || '',
            section_order: q.section_order || section.section_order || 999
          }));
        });
      });
    }

    return questions;
  }

  function normalizeOption(opt, index) {
    if (opt === undefined || opt === null) return null;
    if (typeof opt !== 'object') {
      var text = String(opt);
      return { value: text, label: text, order: index + 1 };
    }
    var value = String(opt.value || opt.option_value || opt.id || opt.code || opt.label || opt.option_label || '').trim();
    var label = String(opt.label || opt.option_label || opt.text || opt.name || value).trim();
    if (!value && !label) return null;
    return {
      value: value || label,
      label: label || value,
      order: Number(opt.order || opt.option_order || index + 1) || (index + 1),
      parent_option_value: opt.parent_option_value || opt.parent_value || ''
    };
  }

  function normalizeFieldType(q) {
    var raw = normalizeUpper(q.field_type || q.input_type || q.type || q.control_type || q.component_type);

    if (raw === 'SELECT' || raw === 'DROPDOWN' || raw === 'RADIO' || raw === 'SEARCH_SELECT' || raw === 'COMBOBOX') return 'select';
    if (raw === 'CHECKBOX_GROUP' || raw === 'MULTI_CHECKBOX' || raw === 'CHECKBOX_LIST' || raw === 'MULTISELECT') return 'checkbox_group';
    if (raw === 'CHECKBOX') return 'checkbox';
    if (raw === 'TEXTAREA' || raw === 'LONG_TEXT' || raw === 'MULTILINE') return 'textarea';
    if (raw === 'DATE' || raw === 'DATE_PICKER') return 'date';
    if (raw === 'NUMBER' || raw === 'NUMBER_DECIMAL' || raw === 'DECIMAL' || raw === 'INTEGER' || raw === 'NUMERIC') return 'number';
    if (raw === 'TEXT_NUMERIC' || raw === 'NUMERIC_TEXT') return 'text_numeric';
    if (raw === 'HIDDEN') return 'hidden';
    return 'text';
  }

  function isNumericField(field) {
    if (!field) return false;
    var type = normalizeUpper(field.type);
    var dataType = normalizeUpper(field.data_type);
    return type === 'NUMBER' || dataType === 'INTEGER' || dataType === 'DECIMAL' || dataType === 'NUMBER';
  }

  function resolveStep(q, type) {
    var dataType = normalizeUpper(q.data_type);
    if (type !== 'number') return undefined;
    if (dataType === 'INTEGER') return 1;
    return 0.1;
  }

  function normalizeQuestionToField(q, sectionFallback) {
    q = q || {};
    var storeKey = normalizeSpaces(q.store_key || q.save_key || q.column_target || '');
    var code = normalizeSpaces(q.question_code || q.code || '');
    var questionId = normalizeSpaces(q.question_id || q.id || '');
    var id = storeKey || (code ? code.toLowerCase() : '') || questionId;
    var type = normalizeFieldType(q);
    var options = (Array.isArray(q.options) ? q.options : [])
      .map(normalizeOption)
      .filter(Boolean)
      .sort(function (a, b) { return Number(a.order || 0) - Number(b.order || 0); });

    if (!options.length && q.reference_key) options = getFallbackOptions(q.reference_key);
    if (type === 'checkbox' && options.length) type = 'checkbox_group';

    var min = q.min_value !== undefined && q.min_value !== null && String(q.min_value).trim() !== '' ? Number(q.min_value) : undefined;
    var max = q.max_value !== undefined && q.max_value !== null && String(q.max_value).trim() !== '' ? Number(q.max_value) : undefined;

    return field(id, q.question_label || q.label || q.question_short_label || code || id, type, boolValue(q.is_required, false), {
      question_id: questionId,
      store_key: storeKey || id,
      question_code: code,
      code: code || id,
      data_type: q.data_type || '',
      options: options,
      placeholder: q.placeholder || '',
      helpText: q.help_text || q.description || '',
      section: q.section_label || q.section_name || (sectionFallback && sectionFallback.section_label) || 'Pendampingan',
      section_order: q.section_order || (sectionFallback && sectionFallback.section_order) || 999,
      question_order: q.question_order || 999,
      min: isNaN(min) ? undefined : min,
      max: isNaN(max) ? undefined : max,
      maxLength: q.max_length ? Number(q.max_length) : undefined,
      step: resolveStep(q, type),
      readonly: boolValue(q.readonly, false) || boolValue(q.is_editable, true) === false || boolValue(q.is_editable_resolved, true) === false,
      hidden: type === 'hidden',
      raw: q
    });
  }

  function isSkippedSystemQuestion(field) {
    var key = normalizeUpper(field && (field.store_key || field.id));
    return key === 'ID_SASARAN' ||
      key === 'TANGGAL_PENDAMPINGAN' ||
      key === 'CATATAN_PENDAMPINGAN' ||
      key === 'FORM_ID' ||
      key === 'JENIS_SASARAN';
  }

  function applyBackendRulesToFields(fields) {
    var byCode = {};
    var byId = {};
    var byKey = {};

    fields.forEach(function (field) {
      if (field.question_code) byCode[normalizeUpper(field.question_code)] = field;
      if (field.question_id) byId[normalizeUpper(field.question_id)] = field;
      if (field.id) byKey[normalizeUpper(field.id)] = field;
      if (field.store_key) byKey[normalizeUpper(field.store_key)] = field;
    });

    var lookup = { byCode: byCode, byId: byId, byKey: byKey };

    fields.forEach(function (field) {
      var rules = (field.raw && Array.isArray(field.raw.rules)) ? field.raw.rules : [];
      rules.forEach(function (rule) {
        var action = normalizeUpper(rule.action || '');
        var triggerRaw = normalizeSpaces(rule.trigger_field || rule.field || '');
        if (!triggerRaw) return;

        var triggerFields = triggerRaw.split('|').map(function (part) {
          return normalizeTriggerKey(part, lookup);
        }).filter(Boolean);

        if (!triggerFields.length) return;

        var cond = {
          field: triggerFields[0],
          fields: triggerFields,
          operator: normalizeUpper(rule.operator || 'EQ'),
          equals: normalizeSpaces(rule.trigger_value),
          values: normalizeSpaces(rule.trigger_value).split('|').map(function (x) { return normalizeSpaces(x); }),
          raw: rule
        };

        if (action === 'SHOW') field.showIf = cond;
        if (action === 'REQUIRE') field.requiredIf = cond;
      });
    });

    return fields;
  }

  function buildFieldsFromDefinition(definition, jenisSasaran) {
    var questions = getDefinitionQuestions(definition);
    if (!questions.length) return getFallbackQuestionBank(jenisSasaran);

    var fields = questions
      .map(function (q) { return normalizeQuestionToField(q, null); })
      .filter(function (field) { return field && !field.hidden && !isSkippedSystemQuestion(field); });

    fields = applyBackendRulesToFields(fields);
    return fields.sort(function (a, b) {
      if (Number(a.section_order || 0) !== Number(b.section_order || 0)) return Number(a.section_order || 0) - Number(b.section_order || 0);
      return Number(a.question_order || 0) - Number(b.question_order || 0);
    });
  }

  function getQuestionBank(jenisSasaran, selected) {
    var def = currentFormDefinition || null;
    if (def) return buildFieldsFromDefinition(def, jenisSasaran);
    return getFallbackQuestionBank(jenisSasaran, selected);
  }

  function getFieldById(fieldId) {
    for (var i = 0; i < currentDynamicFields.length; i += 1) {
      if (currentDynamicFields[i].id === fieldId) return currentDynamicFields[i];
    }
    return null;
  }

  function groupBySection(fields) {
    var sections = [];
    (fields || []).forEach(function (field) {
      var sectionName = field.section || 'Lainnya';
      var found = null;
      for (var i = 0; i < sections.length; i += 1) {
        if (sections[i].name === sectionName) {
          found = sections[i];
          break;
        }
      }
      if (!found) {
        found = { name: sectionName, items: [] };
        sections.push(found);
      }
      found.items.push(field);
    });
    return sections;
  }

  function readDynamicValue(field) {
    var el = byId('dyn-pen-' + field.id);
    if (!el) return '';

    if (field.type === 'checkbox_group') {
      applyCheckboxExclusiveRules(field.id, null);
      var checked = Array.prototype.slice.call(el.querySelectorAll('input[type="checkbox"]:checked'))
        .map(function (input) { return normalizeSpaces(input.value); })
        .filter(Boolean);
      return checked.join('|');
    }

    if (field.type === 'checkbox') return !!el.checked;
    return normalizeSpaces(el.value);
  }

  function clampNumber(value, field) {
    var raw = String(value == null ? '' : value).replace(',', '.').trim();
    if (!raw) return '';
    var num = parseFloat(raw);
    if (isNaN(num)) return '';

    if (typeof field.min === 'number' && num < field.min) num = field.min;
    if (typeof field.max === 'number' && num > field.max) num = field.max;

    if (field.step === 1) {
      return String(Math.round(num));
    }

    var digits = 2;
    if (typeof field.step === 'number' && String(field.step).indexOf('.') >= 0) {
      digits = String(field.step).split('.')[1].length;
    }
    return num.toFixed(digits).replace(/\.00$/, '');
  }

  function setDynamicValue(field, value) {
    var el = byId('dyn-pen-' + field.id);
    if (!el) return;

    if (field.type === 'checkbox_group') {
      var values = splitMultiValue(value).map(function (v) { return normalizeUpper(v); });
      Array.prototype.slice.call(el.querySelectorAll('input[type="checkbox"]')).forEach(function (input) {
        var optionLabel = '';
        var label = input.closest ? input.closest('label') : null;
        if (label) optionLabel = normalizeSpaces(label.textContent || '');
        input.checked =
          values.indexOf(normalizeUpper(input.value)) >= 0 ||
          values.indexOf(normalizeUpper(optionLabel)) >= 0;
      });
      applyCheckboxExclusiveRules(field.id, null);
      return;
    }

    if (field.type === 'checkbox') {
      el.checked = !!value;
      return;
    }

    if (field.type === 'number') {
      el.value = clampNumber(value, field);
      return;
    }

    el.value = value !== undefined && value !== null ? value : '';
  }


  function normalizeCheckboxChoice(value) {
    return normalizeUpper(value)
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getCheckboxOptionText(input) {
    if (!input) return '';
    var label = input.closest ? input.closest('label') : null;
    var labelText = label ? normalizeSpaces(label.textContent || '') : '';
    return normalizeCheckboxChoice([input.value || '', labelText].join(' '));
  }

  function isExclusiveCheckboxOption(input) {
    var text = getCheckboxOptionText(input);
    if (!text) return false;

    return text === 'TIDAK ADA' ||
      text.indexOf('TIDAK ADA ') === 0 ||
      text.indexOf(' TIDAK ADA') >= 0 ||
      text === 'TIDAK MEMILIKI' ||
      text.indexOf('TIDAK MEMILIKI ') === 0 ||
      text === 'TIDAK TERDAPAT';
  }

  function applyCheckboxExclusiveRules(fieldId, changedInput) {
    var group = byId('dyn-pen-' + fieldId);
    if (!group) return;

    var inputs = Array.prototype.slice.call(group.querySelectorAll('input[type="checkbox"]'));
    if (!inputs.length) return;

    var exclusiveInputs = inputs.filter(isExclusiveCheckboxOption);
    if (!exclusiveInputs.length) return;

    if (changedInput && changedInput.checked && isExclusiveCheckboxOption(changedInput)) {
      inputs.forEach(function (input) {
        if (input !== changedInput) input.checked = false;
      });
      return;
    }

    var hasNonExclusiveChecked = inputs.some(function (input) {
      return input.checked && !isExclusiveCheckboxOption(input);
    });

    if (hasNonExclusiveChecked) {
      exclusiveInputs.forEach(function (input) {
        input.checked = false;
      });
    }
  }

  function ensureR2R2QuestionBankStyle() {
    var oldStyle = document.getElementById('pendampingan-qbr2-r1-style');
    if (oldStyle && oldStyle.parentNode) oldStyle.parentNode.removeChild(oldStyle);

    var style = document.getElementById('pendampingan-qbr2-r2-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'pendampingan-qbr2-r2-style';
      document.head.appendChild(style);
    }

    style.textContent = [
      '#pendampingan-dynamic-fields .form-group.form-group-checkbox-group{grid-column:1/-1!important;margin-bottom:8px!important;}',
      '#pendampingan-dynamic-fields .form-group.form-group-checkbox-group>label{margin-bottom:7px!important;}',
      '#pendampingan-dynamic-fields .checkbox-group,#pendampingan-dynamic-fields .pendampingan-checkbox-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))!important;gap:6px 18px!important;align-items:start!important;width:100%!important;padding:2px 0!important;}',
      '#pendampingan-dynamic-fields .checkbox-group .compact-checkbox-row,#pendampingan-dynamic-fields .pendampingan-checkbox-option{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;min-height:28px!important;margin:0!important;padding:2px 0!important;font-weight:700!important;line-height:1.22!important;text-align:left!important;cursor:pointer!important;}',
      '#pendampingan-dynamic-fields .checkbox-group .compact-checkbox-row span,#pendampingan-dynamic-fields .pendampingan-checkbox-label{display:inline!important;margin:0!important;padding:0!important;line-height:1.22!important;}',
      '#pendampingan-dynamic-fields .checkbox-group input[type="checkbox"],#pendampingan-dynamic-fields .pendampingan-checkbox-input{appearance:auto!important;-webkit-appearance:checkbox!important;width:16px!important;min-width:16px!important;max-width:16px!important;height:16px!important;min-height:16px!important;max-height:16px!important;margin:0!important;padding:0!important;flex:0 0 16px!important;border-radius:3px!important;box-shadow:none!important;accent-color:var(--primary,#0b57d0)!important;}',
      '#pendampingan-dynamic-fields .pendampingan-checkbox-help{grid-column:1/-1!important;margin-top:4px!important;}',
      '#pendampingan-dynamic-fields .pendampingan-section-card.is-empty-dynamic-section{display:none!important;}',
      '@media(max-width:720px){#pendampingan-dynamic-fields .checkbox-group,#pendampingan-dynamic-fields .pendampingan-checkbox-grid{grid-template-columns:1fr!important;gap:5px 0!important;}}'
    ].join('\n');
  }

  function polishCheckboxGroups() {
    ensureR2R2QuestionBankStyle();

    currentDynamicFields.forEach(function (field) {
      if (!field || field.type !== 'checkbox_group') return;

      var wrap = byId('qwrap-' + field.id);
      if (wrap) {
        wrap.classList.add('form-group-checkbox-group');
        wrap.dataset.multiValueField = '1';
      }

      var group = byId('dyn-pen-' + field.id);
      if (!group) return;
      group.classList.add('checkbox-group-r2r2', 'pendampingan-checkbox-grid');
      group.dataset.multiValueSeparator = '|';

      Array.prototype.slice.call(group.querySelectorAll('label')).forEach(function (label) {
        label.classList.add('compact-checkbox-option-r2r2', 'pendampingan-checkbox-option');
      });

      Array.prototype.slice.call(group.querySelectorAll('input[type="checkbox"]')).forEach(function (input) {
        input.classList.add('pendampingan-checkbox-input');
      });

      Array.prototype.slice.call(group.querySelectorAll('span')).forEach(function (span) {
        span.classList.add('pendampingan-checkbox-label');
      });
    });
  }

  function syncEmptySectionVisibility() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('#pendampingan-dynamic-fields .pendampingan-section-card'));
    cards.forEach(function (card) {
      var groups = Array.prototype.slice.call(card.querySelectorAll('.form-group[id^="qwrap-"]'));
      if (!groups.length) {
        card.classList.remove('is-empty-dynamic-section');
        return;
      }

      var hasVisible = groups.some(function (wrap) {
        return wrap && wrap.style.display !== 'none';
      });

      card.classList.toggle('is-empty-dynamic-section', !hasVisible);
    });
  }

  function applyPostRenderPolish() {
    polishCheckboxGroups();
    syncEmptySectionVisibility();
  }


  function collectDynamicFields(options) {
    options = options || {};
    var includeAliases = options.includeAliases !== false;
    var includeContext = options.includeContext !== false;
    var values = {};

    currentDynamicFields.forEach(function (field) {
      if (!field) return;

      var answerKey = normalizeSpaces(field.store_key || field.id || '');
      if (!answerKey) return;

      var value = readDynamicValue(field);

      // Canonical utama selalu store_key. Untuk fallback lokal, field.id biasanya sudah canonical.
      values[answerKey] = value;

      // Alias hanya untuk evaluasi rule/visibility di UI, bukan untuk payload submit.
      if (includeAliases) {
        if (field.id) values[field.id] = value;
        if (field.question_code) values[field.question_code] = value;
        if (field.question_id) values[field.question_id] = value;
      }
    });

    if (includeContext) {
      return Object.assign(values, getDynamicContextValues(values));
    }

    return values;
  }

  function cleanPendampinganAnswerAliases_(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

    function hasOwn(key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    }

    function isFilled(value) {
      return value !== undefined && value !== null && String(value).trim() !== '';
    }

    function moveAlias(canonical, aliases) {
      aliases = aliases || [];

      if (!isFilled(obj[canonical])) {
        for (var i = 0; i < aliases.length; i += 1) {
          var alias = aliases[i];
          if (hasOwn(alias) && isFilled(obj[alias])) {
            obj[canonical] = obj[alias];
            break;
          }
        }
      }

      aliases.forEach(function (alias) {
        if (alias !== canonical) delete obj[alias];
      });
    }

    moveAlias('kb_pasca', [
      'KB_PASCA',
      'kb_pasca_persalinan',
      'KB_PASCA_PERSALINAN',
      'menggunakan_kontrasepsi_pascapersalinan',
      'MENGGUNAKAN_KONTRASEPSI_PASCAPERSALINAN',
      'kontrasepsi_pascapersalinan',
      'KONTRASEPSI_PASCAPERSALINAN'
    ]);

    moveAlias('bb', [
      'BB',
      'berat_badan',
      'BERAT_BADAN'
    ]);

    moveAlias('tb', [
      'TB',
      'tinggi_badan',
      'TINGGI_BADAN'
    ]);

    moveAlias('pb_tb', [
      'PB_TB',
      'panjang_tinggi_badan',
      'PANJANG_TINGGI_BADAN'
    ]);

    return obj;
  }

  function cleanPendampinganSubmitPayload_(payload) {
    if (!payload || typeof payload !== 'object') return payload;

    cleanPendampinganAnswerAliases_(payload);
    cleanPendampinganAnswerAliases_(payload.answers);
    cleanPendampinganAnswerAliases_(payload.dynamic_fields);
    cleanPendampinganAnswerAliases_(payload.extra_fields);
    cleanPendampinganAnswerAliases_(payload.data_laporan);

    if (payload.extra_fields && typeof payload.extra_fields === 'object') {
      payload.answers = payload.extra_fields;
      payload.dynamic_fields = payload.extra_fields;
      payload.extra_fields_json = JSON.stringify(payload.extra_fields || {});
    }

    return payload;
  }


  function evaluateDynamicCondition(condition, values) {
    if (!condition || (!condition.field && !condition.fields)) return true;
    values = Object.assign({}, values || {}, getDynamicContextValues(values || {}));

    var fields = condition.fields && condition.fields.length ? condition.fields : [condition.field];
    var expectedList = condition.values && condition.values.length ? condition.values : [condition.equals];
    var op = normalizeUpper(condition.operator || 'EQ');

    function actualFor(fieldName) {
      if (!fieldName) return '';
      if (Object.prototype.hasOwnProperty.call(values, fieldName)) return values[fieldName];
      if (Object.prototype.hasOwnProperty.call(values, normalizeUpper(fieldName))) return values[normalizeUpper(fieldName)];
      if (Object.prototype.hasOwnProperty.call(values, String(fieldName).toLowerCase())) return values[String(fieldName).toLowerCase()];
      return '';
    }

    function eq(a, b) {
      return normalizeUpper(a) === normalizeUpper(b);
    }

    function num(v) {
      var n = Number(String(v == null ? '' : v).replace(',', '.'));
      return isNaN(n) ? null : n;
    }

    var actual = actualFor(fields[0]);
    var expected = expectedList[0] || '';

    if (op === 'AND_EQ') {
      for (var i = 0; i < fields.length; i += 1) {
        if (!eq(actualFor(fields[i]), expectedList[i] || '')) return false;
      }
      return true;
    }

    if (op === 'ANY_EQ') {
      for (var a = 0; a < fields.length; a += 1) {
        if (eq(actualFor(fields[a]), expected)) return true;
      }
      return false;
    }

    if (op === 'EQ') return eq(actual, expected);
    if (op === 'NE' || op === 'NOT_EQ') return !eq(actual, expected);
    if (op === 'IN') {
      return expectedList.map(function (x) { return normalizeUpper(x); }).indexOf(normalizeUpper(actual)) >= 0;
    }
    if (op === 'NOT_EMPTY') return normalizeSpaces(actual) !== '';

    var left = num(actual);
    var right = num(expected);
    if (left === null || right === null) return false;
    if (op === 'GTE' || op === 'GE' || op === '>=') return left >= right;
    if (op === 'GT' || op === '>') return left > right;
    if (op === 'LTE' || op === 'LE' || op === '<=') return left <= right;
    if (op === 'LT' || op === '<') return left < right;

    return eq(actual, expected);
  }

  function isFieldRequiredNow(field, values) {
    if (!field) return false;
    if (field.required) return true;
    if (field.requiredIf) return evaluateDynamicCondition(field.requiredIf, values || {});
    return false;
  }

  function getVisibleDynamicFields(values) {
    return currentDynamicFields.filter(function (field) {
      if (!field.showIf) return true;
      return evaluateDynamicCondition(field.showIf, values || {});
    });
  }

  function computeDerived(values) {
    values = values || {};
    var bb = parseFloat(String(values.bb || values.berat_badan || '').replace(',', '.'));
    var tb = parseFloat(String(values.tb || values.panjang_tinggi_badan || values.pb_tb || '').replace(',', '.'));
    if (!isNaN(bb) && !isNaN(tb) && tb > 0) {
      values.imt = (bb / Math.pow(tb / 100, 2)).toFixed(2);
      var field = getFieldById('imt');
      if (field) setDynamicValue(field, values.imt);
    } else if (getFieldById('imt')) {
      values.imt = '';
      setDynamicValue(getFieldById('imt'), '');
    }
  }

  function applyDynamicRules() {
    var values = collectDynamicFields();
    computeDerived(values);

    currentDynamicFields.forEach(function (field) {
      var wrap = byId('qwrap-' + field.id);
      if (!wrap) return;

      var isVisible = true;
      if (field.showIf) {
        isVisible = evaluateDynamicCondition(field.showIf, values);
      }

      wrap.style.display = isVisible ? '' : 'none';

      var input = byId('dyn-pen-' + field.id);
      if (input) {
        if (field.type === 'checkbox_group') {
          Array.prototype.slice.call(input.querySelectorAll('input[type="checkbox"]')).forEach(function (cb) {
            cb.disabled = !isVisible || field.readonly;
            if (!isVisible) cb.checked = false;
          });
          if (isVisible) applyCheckboxExclusiveRules(field.id, null);
        } else {
          input.disabled = !isVisible;
          if (!isVisible) {
            if (field.type === 'checkbox') input.checked = false;
            else if (!field.readonly) input.value = '';
          }
        }
        if (!isVisible) values[field.id] = '';
      }
    });

    syncEmptySectionVisibility();
  }

  function renderDynamicField(field, value) {
    var requiredMark = isFieldRequiredNow(field, collectDynamicFields()) ? ' *' : '';
    var inputHtml = '';
    var safeValue = value !== undefined && value !== null ? value : (field.raw && field.raw.resolved_default_value ? field.raw.resolved_default_value : '');

    if (field.type === 'textarea') {
      inputHtml = [
        '<textarea',
        ' id="dyn-pen-' + escapeHtml(field.id) + '"',
        ' data-dynamic-field="' + escapeHtml(field.id) + '"',
        ' rows="3"',
        field.placeholder ? ' placeholder="' + escapeHtml(field.placeholder) + '"' : '',
        field.readonly ? ' readonly' : '',
        '>',
        escapeHtml(safeValue || ''),
        '</textarea>'
      ].join('');
    } else if (field.type === 'select') {
      inputHtml = [
        '<select',
        ' id="dyn-pen-' + escapeHtml(field.id) + '"',
        ' data-dynamic-field="' + escapeHtml(field.id) + '"',
        field.readonly ? ' disabled' : '',
        '>',
        '<option value="">Pilih</option>',
        (field.options || []).map(function (opt) {
          var optionValue = typeof opt === 'object' ? String(opt.value || opt.label || '') : String(opt);
          var optionLabel = typeof opt === 'object' ? String(opt.label || opt.value || '') : optionValue;
          var selected = String(safeValue || '') === optionValue || String(safeValue || '') === optionLabel ? ' selected' : '';
          return '<option value="' + escapeHtml(optionValue) + '"' + selected + '>' + escapeHtml(optionLabel) + '</option>';
        }).join(''),
        '</select>'
      ].join('');
    } else if (field.type === 'checkbox_group') {
      var selectedValues = splitMultiValue(safeValue).map(function (x) { return normalizeUpper(x); });
      inputHtml = [
        '<div class="checkbox-group pendampingan-checkbox-grid" id="dyn-pen-' + escapeHtml(field.id) + '" data-dynamic-field="' + escapeHtml(field.id) + '" data-multivalue-separator="|" role="group">',
        (field.options || []).map(function (opt, index) {
          var optionValue = typeof opt === 'object' ? String(opt.value || opt.label || '') : String(opt);
          var optionLabel = typeof opt === 'object' ? String(opt.label || opt.value || '') : optionValue;
          var checked = selectedValues.indexOf(normalizeUpper(optionValue)) >= 0 || selectedValues.indexOf(normalizeUpper(optionLabel)) >= 0 ? ' checked' : '';
          return [
            '<label class="compact-checkbox-row compact-checkbox-option pendampingan-checkbox-option">',
            '<input type="checkbox" class="pendampingan-checkbox-input"',
            ' id="dyn-pen-' + escapeHtml(field.id) + '-' + index + '"',
            ' name="dyn-pen-' + escapeHtml(field.id) + '"',
            ' data-dynamic-field="' + escapeHtml(field.id) + '"',
            ' value="' + escapeHtml(optionValue) + '"',
            checked,
            field.readonly ? ' disabled' : '',
            ' />',
            '<span class="pendampingan-checkbox-label">' + escapeHtml(optionLabel) + '</span>',
            '</label>'
          ].join('');
        }).join(''),
        '</div>'
      ].join('');
    } else if (field.type === 'checkbox') {
      inputHtml = [
        '<label class="compact-checkbox-row">',
        '<input type="checkbox" id="dyn-pen-' + escapeHtml(field.id) + '" data-dynamic-field="' + escapeHtml(field.id) + '"',
        safeValue ? ' checked' : '',
        field.readonly ? ' disabled' : '',
        ' />',
        '<span>Pilih</span>',
        '</label>'
      ].join('');
    } else {
      var inputType = 'text';
      if (field.type === 'date') inputType = 'date';
      else if (field.type === 'number') inputType = 'number';
      else if (field.type === 'text_numeric') inputType = 'text';

      var attrs = [];
      attrs.push(' id="dyn-pen-' + escapeHtml(field.id) + '"');
      attrs.push(' data-dynamic-field="' + escapeHtml(field.id) + '"');
      attrs.push(' type="' + escapeHtml(inputType) + '"');
      if (field.type === 'text_numeric') attrs.push(' inputmode="numeric" pattern="[0-9]*"');
      if (field.placeholder) attrs.push(' placeholder="' + escapeHtml(field.placeholder) + '"');
      if (typeof field.min === 'number' && field.type === 'number') attrs.push(' min="' + escapeHtml(field.min) + '"');
      if (typeof field.max === 'number' && field.type === 'number') attrs.push(' max="' + escapeHtml(field.max) + '"');
      if (typeof field.step === 'number' && field.type === 'number') attrs.push(' step="' + escapeHtml(field.step) + '"');
      if (field.maxLength && field.type !== 'number') attrs.push(' maxlength="' + escapeHtml(field.maxLength) + '"');
      if (field.readonly) attrs.push(' readonly');
      attrs.push(' value="' + escapeHtml(field.type === 'number' ? clampNumber(safeValue || '', field) : (safeValue || '')) + '"');
      inputHtml = '<input' + attrs.join('') + ' />';
    }

    return [
      '<div class="form-group" id="qwrap-' + escapeHtml(field.id) + '">',
      '<label for="dyn-pen-' + escapeHtml(field.id) + '">' + escapeHtml(field.label) + requiredMark + '</label>',
      inputHtml,
      field.helpText ? '<small class="muted-text' + (field.type === 'checkbox_group' ? ' pendampingan-checkbox-help' : '') + '">' + escapeHtml(field.helpText) + '</small>' : '',
      '</div>'
    ].join('');
  }

  function renderQuestionBank(jenisSasaran, values) {
    var selected = getSelectedSasaran();
    currentJenisSasaran = normalizeUpper(jenisSasaran || selected.jenis_sasaran || '');
    currentDynamicFields = getQuestionBank(currentJenisSasaran, selected);

    var sections = groupBySection(currentDynamicFields);
    var safeValues = values && typeof values === 'object' ? values : {};

    var html = sections.map(function (section) {
      return [
        '<div class="card card-compact pendampingan-section-card">',
        '<div class="section-header"><h3>' + escapeHtml(section.name) + '</h3></div>',
        '<div class="filters-grid">',
        section.items.map(function (field) {
          return renderDynamicField(field, safeValues[field.id]);
        }).join(''),
        '</div>',
        '</div>'
      ].join('');
    }).join('');

    setHTML('pendampingan-dynamic-fields', html);
    bindDynamicEvents();
    applyDynamicRules();
    applyPostRenderPolish();
  }

  function bindDynamicEvents() {
    currentDynamicFields.forEach(function (field) {
      var el = byId('dyn-pen-' + field.id);
      if (!el || el.dataset.bound === '1') return;

      el.dataset.bound = '1';

      if (field.type === 'checkbox_group') {
        el.addEventListener('change', function (event) {
          applyCheckboxExclusiveRules(field.id, event && event.target);
          applyDynamicRules();
          applyPostRenderPolish();
          PendampinganView.renderValidation();
          PendampinganView.autosaveDraft();
        });
        return;
      }

      if (field.type === 'number') {
        el.addEventListener('change', function () {
          el.value = clampNumber(el.value, field);
          applyDynamicRules();
          applyPostRenderPolish();
          PendampinganView.renderValidation();
          PendampinganView.autosaveDraft();
        });
        el.addEventListener('blur', function () {
          el.value = clampNumber(el.value, field);
          applyDynamicRules();
          applyPostRenderPolish();
          PendampinganView.renderValidation();
          PendampinganView.autosaveDraft();
        });
      } else {
        el.addEventListener('change', function () {
          applyDynamicRules();
          applyPostRenderPolish();
          PendampinganView.renderValidation();
          PendampinganView.autosaveDraft();
        });
      }

      if (field.type === 'textarea' || field.type === 'number') {
        el.addEventListener('input', function () {
          if (field.type !== 'number') applyDynamicRules();
          PendampinganView.renderValidation();
          PendampinganView.autosaveDraft();
        });
      }
    });
  }

  var PendampinganView = {
    _isOpening: false,
    _lastOpenSignature: '',

    init: function () {
      if (isInitialized) return;
      isInitialized = true;
      this.bindEvents();
      this.bindAutosave();

      var self = this;
      setTimeout(function () {
        try {
          var selected = getSelectedSasaran() || {};
          if (isPendampinganScreenActive() && (selected.id_sasaran || selected.id)) {
            self.openCreate(selected, { skipRoute: true, force: true });
          }
        } catch (err) {}
      }, 0);
    },

    openCreate: async function (selectedItem, options) {
      this.init();

      var opts = options || {};
      var selected = selectedItem || getSelectedSasaran();

      if (!selected || !(selected.id_sasaran || selected.id)) {
        showToast('Pilih sasaran terlebih dahulu.', 'warning');
        if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go('sasaranList');
        }
        return;
      }

      var selectedId = selected.id_sasaran || selected.id || '';
      var jenis = selected.jenis_sasaran || '';
      var signature = buildOpenSignature('create', selectedId, jenis);

      if (!opts.skipRoute && !isPendampinganScreenActive()) {
        goToPendampinganRoute(function () {
          if (window.PendampinganView && typeof window.PendampinganView.openCreate === 'function') {
            window.PendampinganView.openCreate(selected, {
              skipRoute: true,
              force: opts.force === true
            });
          }
        });
        return;
      }

      if (this._isOpening && this._lastOpenSignature === signature && !opts.force) {
        return;
      }

      this._isOpening = true;
      this._lastOpenSignature = signature;
      var openToken = ++currentOpenToken;

      try {
        setSelectedSasaran(selected);
        setMode('create');
        clearEditItem();

        this.resetForm();
        this.applyModeUI();
        this.renderHeader(normalizeHeaderItem(selected));
        this.prefillIdentity();
        await this.loadDynamicFields(jenis, {});

        if (openToken !== currentOpenToken) return;
        this.tryLoadDraftForSelected();
        this.renderValidation();
      } finally {
        if (openToken === currentOpenToken) {
          this._isOpening = false;
        }
      }
    },

    openEditById: async function (idPendampingan, options) {
      this.init();

      var opts = options || {};
      if (!idPendampingan) {
        showToast('ID pendampingan tidak ditemukan.', 'warning');
        return;
      }

      var signature = buildOpenSignature('edit', idPendampingan, '');
      if (!opts.skipRoute && !isPendampinganScreenActive()) {
        goToPendampinganRoute(function () {
          if (window.PendampinganView && typeof window.PendampinganView.openEditById === 'function') {
            window.PendampinganView.openEditById(idPendampingan, {
              skipRoute: true,
              force: opts.force === true
            });
          }
        });
        return;
      }

      if (this._isOpening && this._lastOpenSignature === signature && !opts.force) {
        return;
      }

      this._isOpening = true;
      this._lastOpenSignature = signature;
      var openToken = ++currentOpenToken;
      var api = getApi();
      var action = getActionName('GET_PENDAMPINGAN_BY_ID', 'getPendampinganById');

      try {
        if (!api || typeof api.post !== 'function') {
          throw new Error('Api.post belum tersedia.');
        }

        var result = await api.post(action, {
          id_pendampingan: idPendampingan
        }, {
          includeAuth: true,
          timeoutMs: 12000
        });

        if (openToken !== currentOpenToken) return;

        if (!result || result.ok === false) {
          throw new Error((result && result.message) || 'Gagal memuat detail pendampingan.');
        }

        var item = normalizePendampinganDetail(normalizePendampinganDetailResponse(result));
        if (!item.id_pendampingan) {
          throw new Error('Data detail pendampingan tidak valid.');
        }

        setMode('edit');
        setEditItem(item);

        var selected = getSelectedSasaran() || {};
        var headerItem = normalizeHeaderItem({
          id_sasaran: item.id_sasaran || '',
          id: item.id_sasaran || '',
          nama_sasaran: item.nama_sasaran || '',
          jenis_sasaran: item.jenis_sasaran || '',
          status_sasaran: item.status_sasaran || 'AKTIF',
          nama_wilayah: item.nama_wilayah || selected.nama_wilayah || '',
          nama_kecamatan: item.nama_kecamatan || selected.nama_kecamatan || '',
          nama_desa: item.nama_desa || selected.nama_desa || '',
          nama_dusun: item.nama_dusun || selected.nama_dusun || ''
        });

        setSelectedSasaran(headerItem);

        this.resetForm();
        this.applyModeUI();
        this.renderHeader(headerItem);
        await this.loadDynamicFields(item.jenis_sasaran || '', { values: item.extra_fields || {} });
        this.fillForm(item);
        this.renderValidation();
      } catch (err) {
        showToast((err && err.message) || 'Gagal membuka mode edit pendampingan.', 'error');
      } finally {
        if (openToken === currentOpenToken) {
          this._isOpening = false;
        }
      }
    },

    openEdit: function (idPendampingan, options) {
      return this.openEditById(idPendampingan, options || {});
    },

    open: function (options) {
      this.init();
      var selected = getSelectedSasaran() || {};
      if (selected && (selected.id_sasaran || selected.id)) {
        return this.openCreate(selected, Object.assign({ skipRoute: true, force: true }, options || {}));
      }
      this.applyModeUI();
      this.prefillIdentity();
      this.renderHeader({});
      setHTML('pendampingan-dynamic-fields', '<p class="muted-text">Pilih sasaran dari Daftar Sasaran untuk mulai lapor pendampingan.</p>');
      this.renderValidation();
      return null;
    },

    loadAndRender: function () {
      return this.open({ force: true });
    },

    applyModeUI: function () {
      var isEdit = getMode() === 'edit';

      setText('pendampingan-mode-info', isEdit ? 'Mode edit laporan pendampingan' : 'Mode input baru');

      var submitBtn = byId('btn-submit-pendampingan');
      if (submitBtn) {
        submitBtn.textContent = isEdit ? 'Simpan Perubahan' : 'Submit Pendampingan';
      }

      var badge = byId('pendampingan-mode-badge');
      if (badge) {
        badge.textContent = isEdit ? 'EDIT' : 'CREATE';
        badge.className = 'badge ' + (isEdit ? 'badge-warning' : 'badge-success-soft');
      }

      toggleHidden('edit-reason-group', !isEdit);
    },

    renderHeader: function (item) {
      var profile = getProfile();
      var safeItem = item || {};
      var status = safeItem.status_sasaran || safeItem.status || '-';
      var wilayah = wilayahToString(safeItem);

      setText('pendampingan-nama-sasaran', normalizeSpaces(safeItem.nama_sasaran || safeItem.nama || '-'));
      setText('pendampingan-id-sasaran', 'ID Sasaran: ' + (safeItem.id_sasaran || safeItem.id || '-'));
      setText('pendampingan-jenis', safeItem.jenis_sasaran || '-');
      setText('pendampingan-wilayah', wilayah);
      setText('pendampingan-kader', profile.nama_kader || profile.nama || '-');
      setText('pendampingan-tim', profile.nama_tim || profile.id_tim || '-');

      var badge = byId('pendampingan-status-badge');
      if (badge) {
        badge.textContent = status;
        badge.className = 'badge ' + getStatusBadgeClass(status);
      }
    },

    prefillIdentity: function () {
      var el = byId('pen-tanggal');
      if (el && !el.value) el.value = todayIso();

      var statusEl = byId('pen-status-kunjungan');
      if (statusEl) {
        var current = normalizeSpaces(statusEl.value);
        var options = [
          { value: '', label: 'Pilih status' },
          { value: 'Kunjungan Rumah', label: 'Kunjungan Rumah' },
          { value: 'BKB/Posyandu', label: 'BKB/Posyandu' }
        ];

        statusEl.innerHTML = options.map(function (opt) {
          var selected = current === opt.value ? ' selected' : '';
          return '<option value="' + escapeHtml(opt.value) + '"' + selected + '>' + escapeHtml(opt.label) + '</option>';
        }).join('');

        if (current && current !== 'Kunjungan Rumah' && current !== 'BKB/Posyandu') {
          statusEl.value = '';
        }
      }
    },

    loadDynamicFields: async function (jenisSasaran, options) {
      var opts = options || {};
      var values = opts.values || {};
      var jenis = normalizeUpper(jenisSasaran || (getSelectedSasaran() || {}).jenis_sasaran || '');

      setHTML('pendampingan-dynamic-fields', '<p class="muted-text">Memuat definisi form pendampingan...</p>');
      currentFormDefinition = null;

      try {
        currentFormDefinition = await fetchPendampinganFormDefinition(jenis, opts);
      } catch (err) {
        currentFormDefinition = null;
        showToast((err && err.message) || 'Definisi form backend tidak tersedia. Memakai fallback lokal.', 'warning');
      }

      renderQuestionBank(jenis, values);
      this.renderValidation();
    },

    fillForm: function (item) {
      var safeItem = item || {};
      setValue('pen-tanggal', safeItem.tanggal_pendampingan || '');
      setValue('pen-status-kunjungan', safeItem.status_kunjungan || '');
      setValue('pen-catatan-umum', safeItem.catatan_umum || '');
      setValue('pen-edit-reason', '');
      if (safeItem.extra_fields && typeof safeItem.extra_fields === 'object') {
        this.fillDynamicFields(safeItem.extra_fields);
      }
    },

    fillDynamicFields: function (extra) {
      var safeExtra = extra && typeof extra === 'object' ? extra : {};
      var aliases = {
        bb: ['bb', 'BB', 'berat_badan'],
        tb: ['tb', 'TB', 'tinggi_badan'],
        pb_tb: ['pb_tb', 'PB_TB', 'panjang_tinggi_badan'],
        periksa_hb: ['periksa_hb', 'PERIKSA_HB'],
        kadar_hb: ['kadar_hb', 'KADAR_HB'],
        ctn_periksa: ['ctn_periksa', 'CTN_PERIKSA', 'pemeriksaan_kesehatan'],
        ctn_tgl_periksa: ['ctn_tgl_periksa', 'CTN_TGL_PERIKSA'],
        kb_pasca: ['kb_pasca', 'KB_PASCA', 'kb_pasca_persalinan']
      };

      function pickValue(field) {
        var keys = [field.id, field.store_key, field.question_code, field.question_id]
          .concat(aliases[field.id] || []);
        for (var i = 0; i < keys.length; i += 1) {
          var key = keys[i];
          if (!key) continue;
          if (safeExtra[key] !== undefined && safeExtra[key] !== null) return safeExtra[key];
        }
        return '';
      }

      currentDynamicFields.forEach(function (field) {
        setDynamicValue(field, pickValue(field));
      });
      applyDynamicRules();
    },

    collectFormData: function () {
      var selected = getSelectedSasaran() || {};
      var profile = getProfile() || {};
      var editItem = getEditItem() || {};
      var mode = getMode();
      var localDraft = (getLocalDraft() && getLocalDraft().data) || {};
      var stableClientSubmitId = mode === 'create'
        ? (localDraft.client_submit_id || generateClientSubmitId('SUB'))
        : '';

      var extraFields = collectDynamicFields({ includeAliases: false, includeContext: false });
      computeDerived(extraFields);
      cleanPendampinganAnswerAliases_(extraFields);

      return {
        mode: mode,
        id_pendampingan: mode === 'edit' ? (editItem.id_pendampingan || '') : '',
        id_sasaran: selected.id_sasaran || selected.id || editItem.id_sasaran || '',
        jenis_sasaran: selected.jenis_sasaran || editItem.jenis_sasaran || '',
        form_id: getFormIdByJenis(selected.jenis_sasaran || editItem.jenis_sasaran || ''),
        nama_sasaran: selected.nama_sasaran || selected.nama || editItem.nama_sasaran || '',
        tanggal_pendampingan: (byId('pen-tanggal') && byId('pen-tanggal').value) || '',
        status_kunjungan: (byId('pen-status-kunjungan') && byId('pen-status-kunjungan').value) || '',
        catatan_umum: normalizeSpaces((byId('pen-catatan-umum') && byId('pen-catatan-umum').value) || ''),
        edit_reason: normalizeSpaces((byId('pen-edit-reason') && byId('pen-edit-reason').value) || ''),
        id_user: profile.id_user || '',
        id_kader: profile.id_kader || '',
        nama_kader: profile.nama_kader || profile.nama || '',
        id_tim: profile.id_tim || selected.id_tim || '',
        nama_tim: profile.nama_tim || selected.nama_tim || '',
        nama_kecamatan: selected.nama_kecamatan || '',
        nama_desa: selected.nama_desa || '',
        nama_dusun: selected.nama_dusun || '',
        client_submit_id: stableClientSubmitId,
        sync_source: 'ONLINE',
        extra_fields: extraFields
      };
    },

    validate: function (data) {
      var issues = [];
      var mode = getMode();
      var extra = data.extra_fields || {};
      var visibleFields = getVisibleDynamicFields(extra);

      if (!isRequired(data.id_sasaran)) {
        issues.push({ type: 'error', text: 'ID sasaran tidak ditemukan. Pilih sasaran kembali.' });
      }
      if (!isRequired(data.jenis_sasaran)) {
        issues.push({ type: 'error', text: 'Jenis sasaran tidak tersedia.' });
      }
      if (!isRequired(data.tanggal_pendampingan)) {
        issues.push({ type: 'error', text: 'Tanggal pendampingan wajib diisi.' });
      }
      if (!isRequired(data.id_tim)) {
        issues.push({ type: 'error', text: 'ID tim tidak tersedia pada sesi login/data sasaran.' });
      }
      if (!isRequired(data.id_user) && !isRequired(data.id_kader) && mode === 'create') {
        issues.push({ type: 'error', text: 'ID pengguna login tidak tersedia.' });
      }
      if (!data.status_kunjungan) {
        issues.push({ type: 'error', text: 'Status kunjungan wajib dipilih.' });
      }

      if (mode === 'edit') {
        if (!isRequired(data.id_pendampingan)) {
          issues.push({ type: 'error', text: 'ID pendampingan tidak ditemukan.' });
        }
        if (!isRequired(data.edit_reason)) {
          issues.push({ type: 'error', text: 'Alasan edit wajib diisi.' });
        }
      }

      visibleFields.forEach(function (field) {
        var value = extra[field.id];
        var missing = field.type === 'checkbox' ? value !== true : !isRequired(value);
        if (isFieldRequiredNow(field, extra) && missing) {
          issues.push({ type: 'error', text: field.label + ' wajib diisi.' });
          return;
        }

        if (isRequired(value) && isNumericField(field)) {
          var num = parseFloat(String(value).replace(',', '.'));
          if (isNaN(num)) {
            issues.push({ type: 'error', text: field.label + ' harus berupa angka.' });
            return;
          }
          if (typeof field.min === 'number' && num < field.min) {
            issues.push({ type: 'error', text: field.label + ' minimal ' + field.min + '.' });
            return;
          }
          if (typeof field.max === 'number' && num > field.max) {
            issues.push({ type: 'error', text: field.label + ' maksimal ' + field.max + '.' });
          }
        }
      });

      function numericError(fieldId, message) {
        var field = getFieldById(fieldId);
        if (!field) return;
        var val = extra[fieldId];
        if (!isRequired(val)) return;
        var num = parseFloat(String(val).replace(',', '.'));
        if (isNaN(num)) {
          issues.push({ type: 'error', text: message });
          return;
        }
        if (typeof field.min === 'number' && num < field.min) {
          issues.push({ type: 'error', text: message });
          return;
        }
        if (typeof field.max === 'number' && num > field.max) {
          issues.push({ type: 'error', text: message });
        }
      }

      if (normalizeUpper(data.jenis_sasaran) === 'BADUTA') {
        numericError('berat_badan', 'Berat badan BADUTA harus antara 1 sampai 30.');
        numericError('panjang_tinggi_badan', 'Panjang/Tinggi badan BADUTA harus antara 30 sampai 130.');
      }

      if (normalizeUpper(data.jenis_sasaran) === 'BUMIL') {
        numericError('usia_hamil_minggu', 'Usia kehamilan harus antara 1 sampai 45 minggu.');
        numericError('hasil_tbjj', 'Hasil TBJJ harus antara 100 sampai 6000 gram.');
        numericError('hasil_tfu', 'Hasil TFU harus antara 1 sampai 60.');
        numericError('berat_badan', 'Berat badan BUMIL harus antara 25 sampai 200.');
        numericError('tinggi_badan', 'Tinggi badan BUMIL harus antara 100 sampai 220.');
        numericError('kadar_hb', 'Kadar HB harus antara 1 sampai 20.');
        numericError('lila', 'LILA harus antara 1 sampai 60.');
      }

      if (isYesValue(extra.periksa_hb) && !isRequired(extra.kadar_hb)) {
        issues.push({ type: 'error', text: 'Kadar HB wajib diisi jika pemeriksaan HB dilakukan.' });
      }
      if (isYesValue(extra.periksa_tbjj) && !isRequired(extra.hasil_tbjj)) {
        issues.push({ type: 'error', text: 'Hasil TBJJ wajib diisi jika pengukuran TBJJ dilakukan.' });
      }
      if (isYesValue(extra.periksa_tfu) && !isRequired(extra.hasil_tfu)) {
        issues.push({ type: 'error', text: 'Hasil TFU wajib diisi jika pengukuran TFU dilakukan.' });
      }
      if (isYesValue(extra.dapat_ttd) && !isRequired(extra.minum_ttd)) {
        issues.push({ type: 'error', text: 'Status minum TTD wajib diisi jika TTD sudah didapat.' });
      }
      if (isYesValue(extra.kepesertaan_jkn) && !isRequired(extra.jenis_jkn)) {
        issues.push({ type: 'error', text: 'Jenis JKN wajib diisi jika sasaran memiliki JKN.' });
      }
      if (isYesValue(extra.pemberian_bansos) && !isRequired(extra.jenis_bansos)) {
        issues.push({ type: 'error', text: 'Jenis bansos wajib diisi jika bansos sudah didapat.' });
      }
      if (isYesValue(extra.mbg_diterima) && !isRequired(extra.frekuensi_mbg)) {
        issues.push({ type: 'error', text: 'Frekuensi MBG wajib diisi jika sasaran menerima MBG.' });
      }

      if (!issues.some(function (item) { return item.type === 'error'; })) {
        issues.push({ type: 'ok', text: 'Validasi dasar pendampingan lolos.' });
      }
      return issues;
    },

    renderValidation: function () {
      var data = this.collectFormData();
      var issues = this.validate(data);
      var html = '<ul class="validation-list">' + issues.map(function (issue) {
        return '<li class="validation-item-' + escapeHtml(issue.type) + '">' + escapeHtml(issue.text) + '</li>';
      }).join('') + '</ul>';
      setHTML('pendampingan-validation-box', html);
    },

    resetForm: function () {
      var form = byId('pendampingan-form');
      if (form) form.reset();

      currentDynamicFields = [];
      currentJenisSasaran = '';
      setHTML('pendampingan-dynamic-fields', '<p class="muted-text">Field pendampingan akan dimuat otomatis.</p>');
      setValue('pen-edit-reason', '');
    },

    tryLoadDraftForSelected: function () {
      if (getMode() !== 'create') return;

      var draft = getLocalDraft();
      var selected = getSelectedSasaran() || {};
      if (!draft || !draft.data) return;

      var sameTarget = String(draft.data.id_sasaran || '') === String(selected.id_sasaran || selected.id || '');
      if (!sameTarget) return;

      setValue('pen-tanggal', draft.data.tanggal_pendampingan || '');
      setValue('pen-status-kunjungan', draft.data.status_kunjungan || '');
      setValue('pen-catatan-umum', draft.data.catatan_umum || '');
      this.fillDynamicFields(draft.data.extra_fields || {});
    },

    autosaveDraft: function () {
      if (getMode() !== 'create') return;
      saveLocalDraft(this.collectFormData());
    },

    bindAutosave: function () {
      var self = this;
      var form = byId('pendampingan-form');
      if (!form || form.dataset.autosaveBound === '1') return;

      form.dataset.autosaveBound = '1';
      form.addEventListener('input', function () {
        self.renderValidation();
        self.autosaveDraft();
      });
      form.addEventListener('change', function () {
        self.renderValidation();
        self.autosaveDraft();
      });
    },

    bindEvents: function () {
      var self = this;

      [
        ['btn-back-from-pendampingan', function () {
          var selected = getSelectedSasaran();
          if (selected && (selected.id_sasaran || selected.id) && window.SasaranDetailView && typeof window.SasaranDetailView.open === 'function') {
            window.SasaranDetailView.open(selected.id_sasaran || selected.id, { skipRoute: false });
            return;
          }
          if (window.Router && typeof window.Router.go === 'function') {
            window.Router.go('sasaranList');
          }
        }],
        ['btn-save-pen-draft', function () {
          self.autosaveDraft();
          showToast('Draft pendampingan disimpan.', 'success');
        }],
        ['btn-reset-pendampingan', async function () {
          clearLocalDraft();
          var selected = getSelectedSasaran() || {};
          self.resetForm();
          self.applyModeUI();
          self.prefillIdentity();
          await self.loadDynamicFields(selected.jenis_sasaran || '', { forceRefresh: false });
          self.renderValidation();
        }]
      ].forEach(function (entry) {
        var btn = byId(entry[0]);
        if (!btn || btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function (event) {
          event.preventDefault();
          entry[1]();
        });
      });

      var form = byId('pendampingan-form');
      if (form && form.dataset.submitBound !== '1') {
        form.dataset.submitBound = '1';
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          self.submit();
        });
      }
    },

    submit: async function () {
      var api = getApi();
      if (!api || typeof api.post !== 'function') {
        showToast('Api.post belum tersedia.', 'error');
        return;
      }

      var mode = getMode();
      var editItem = getEditItem() || {};
      var data = this.collectFormData();
      var issues = this.validate(data);
      var hasError = issues.some(function (item) { return item.type === 'error'; });

      this.renderValidation();

      if (hasError) {
        showToast('Periksa kembali form pendampingan.', 'warning');
        return;
      }

      setLoading('btn-submit-pendampingan', true, mode === 'edit' ? 'Menyimpan...' : 'Mengirim...');

      try {
        var payload;
        var action;

        if (mode === 'edit') {
          action = getActionName('EDIT_PENDAMPINGAN', 'editPendampingan');
          payload = {
            id_pendampingan: editItem.id_pendampingan || data.id_pendampingan,
            tanggal_pendampingan: data.tanggal_pendampingan,
            status_kunjungan: data.status_kunjungan,
            catatan_umum: data.catatan_umum,
            module: 'PENDAMPINGAN',
            jenis_sasaran: data.jenis_sasaran,
            form_id: data.form_id,
            answers: data.extra_fields,
            dynamic_fields: data.extra_fields,
            extra_fields: data.extra_fields,
            extra_fields_json: JSON.stringify(data.extra_fields || {}),
            edit_reason: data.edit_reason,
            sync_source: 'ONLINE'
          };
        } else {
          action = getActionName('SUBMIT_PENDAMPINGAN', 'submitPendampingan');
          payload = {
            id_sasaran: data.id_sasaran,
            jenis_sasaran: data.jenis_sasaran,
            form_id: data.form_id,
            nama_sasaran: data.nama_sasaran,
            tanggal_pendampingan: data.tanggal_pendampingan,
            status_kunjungan: data.status_kunjungan,
            catatan_umum: data.catatan_umum,
            id_user: data.id_user,
            id_kader: data.id_kader,
            nama_kader: data.nama_kader,
            id_tim: data.id_tim,
            nama_tim: data.nama_tim,
            nama_kecamatan: data.nama_kecamatan,
            nama_desa: data.nama_desa,
            nama_dusun: data.nama_dusun,
            client_submit_id: data.client_submit_id,
            sync_source: 'ONLINE',
            module: 'PENDAMPINGAN',
            answers: data.extra_fields,
            dynamic_fields: data.extra_fields,
            extra_fields: data.extra_fields,
            extra_fields_json: JSON.stringify(data.extra_fields || {})
          };
        }

        cleanPendampinganSubmitPayload_(payload);

        if (!navigator.onLine && mode === 'create') {
          await enqueueOffline(action, payload);
          saveLocalDraft(payload);
          showToast('Sedang offline. Pendampingan disimpan ke antrean sinkronisasi.', 'warning');

          clearLocalDraft();
          clearEditItem();
          setMode('create');

          if (window.Router && typeof window.Router.go === 'function') {
            window.Router.go('sync');
          }
          return;
        }

        if (!navigator.onLine && mode === 'edit') {
          showToast('Edit pendampingan hanya dapat dilakukan saat online.', 'warning');
          return;
        }

        var result = await api.post(action, payload, {
          includeAuth: true,
          clientSubmitId: payload.client_submit_id || '',
          syncSource: 'ONLINE',
          timeoutMs: 15000
        });

        if (!result || result.ok === false) {
          throw new Error((result && result.message) || 'Gagal menyimpan pendampingan.');
        }

        clearLocalDraft();
        clearEditItem();
        setMode('create');

        var currentSelected = getSelectedSasaran() || {};
        var selectedId = currentSelected.id_sasaran || currentSelected.id || data.id_sasaran;

        if (selectedId && window.SasaranDetailView && typeof window.SasaranDetailView.open === 'function') {
          await window.SasaranDetailView.open(selectedId, { forceRefresh: true });
        } else if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go('sasaranList');
        }

        if (result && result.data && result.data.duplicate) {
          showToast('Pendampingan sudah pernah tersimpan sebelumnya.', 'warning');
        } else {
          showToast(mode === 'edit' ? 'Pendampingan berhasil diperbarui.' : 'Pendampingan berhasil dikirim.', 'success');
        }
      } catch (err) {
        if (mode === 'create') {
          saveLocalDraft(data);
          if (isNetworkLikeError(err)) {
            try {
              await enqueueOffline(action, payload);
              showToast('Koneksi tidak stabil. Pendampingan disimpan ke antrean sinkronisasi.', 'warning');
              if (window.Router && typeof window.Router.go === 'function') {
                window.Router.go('sync');
              }
              return;
            } catch (queueErr) {}
          }
        }
        showToast((err && err.message) || 'Terjadi kesalahan saat menyimpan pendampingan.', 'error');
      } finally {
        setLoading('btn-submit-pendampingan', false);
      }
    }
  };

  window.PendampinganView = PendampinganView;
  window.PendampinganForm = PendampinganView;

  document.addEventListener('DOMContentLoaded', function () {
    if (window.PendampinganView && typeof window.PendampinganView.init === 'function') {
      window.PendampinganView.init();
    }
  });
})(window, document);
