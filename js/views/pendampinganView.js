(function (window, document) {
  'use strict';

  window.__PENDAMPINGAN_VIEW_BUILD = '20260417-01';
  console.log('PendampinganView build aktif:', window.__PENDAMPINGAN_VIEW_BUILD);

  var PENDAMPINGAN_DRAFT_KEY = 'tpk_pendampingan_draft';
  var LOCAL_SELECTED_SASARAN_KEY = 'tpk_selected_sasaran';
  var PENDAMPINGAN_FORM_CACHE_KEY = 'tpk_pendampingan_form_cache_v1';
  var PENDAMPINGAN_FORM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  var PENDAMPINGAN_FORM_CACHE = {};
  var currentMode = 'create';
  var currentEditItem = {};
  var currentDynamicFields = [];
  var currentJenisSasaran = '';
  var isInitialized = false;
  var currentOpenToken = 0;
  var currentFormLoadToken = 0;

  function byId(id) {
    return document.getElementById(id);
  }

  function getUI() {
    return window.UI || null;
  }

  function getApi() {
    return window.Api || null;
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
    if (el) {
      el.innerHTML = html || '';
    }
  }

  function setValue(id, value) {
    var ui = getUI();
    if (ui && typeof ui.setValue === 'function') {
      ui.setValue(id, value);
      return;
    }

    var el = byId(id);
    if (el) {
      el.value = value !== undefined && value !== null ? value : '';
    }
  }

  function toggleHidden(id, shouldHide) {
    var ui = getUI();
    if (ui && typeof ui.toggleHidden === 'function') {
      ui.toggleHidden(id, shouldHide);
      return;
    }

    var el = byId(id);
    if (!el) return;
    el.classList.toggle('hidden', !!shouldHide);
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
      if (!btn.dataset.originalText) {
        btn.dataset.originalText = btn.textContent;
      }
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

  function parseJsonSafely(raw, fallback) {
    if (!raw) return fallback;
    if (typeof raw === 'object') return raw;

    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function isRequired(value) {
    return normalizeSpaces(value) !== '';
  }

  function todayIso() {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
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

  function getProfile() {
    var state = getState();
    if (state && typeof state.getProfile === 'function') {
      var fromState = state.getProfile() || {};
      if (fromState && Object.keys(fromState).length) return fromState;
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.PROFILE) {
      var fromStorage = storage.get(keys.PROFILE, {}) || {};
      if (fromStorage && Object.keys(fromStorage).length) return fromStorage;
    }

    try {
      return JSON.parse(localStorage.getItem('tpk_profile') || '{}');
    } catch (err) {
      return {};
    }
  }

  function getSelectedSasaran() {
    var state = getState();
    if (state && typeof state.getSelectedSasaran === 'function') {
      var fromState = state.getSelectedSasaran() || {};
      if (fromState && Object.keys(fromState).length) return fromState;
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function') {
      var fromStorage = storage.get(keys.SELECTED_SASARAN || LOCAL_SELECTED_SASARAN_KEY, {}) || {};
      if (fromStorage && Object.keys(fromStorage).length) return fromStorage;
    }

    try {
      return JSON.parse(localStorage.getItem(LOCAL_SELECTED_SASARAN_KEY) || '{}');
    } catch (err) {
      return {};
    }
  }

  function setSelectedSasaran(item) {
    var safeItem = item && typeof item === 'object' ? item : {};
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
    var storage = getStorage();
    if (storage && typeof storage.get === 'function') {
      return storage.get(PENDAMPINGAN_DRAFT_KEY, null);
    }

    try {
      return JSON.parse(localStorage.getItem(PENDAMPINGAN_DRAFT_KEY) || 'null');
    } catch (err) {
      return null;
    }
  }

  function saveLocalDraft(data) {
    var payload = {
      saved_at: new Date().toISOString(),
      data: data || {}
    };

    var storage = getStorage();
    if (storage && typeof storage.set === 'function') {
      storage.set(PENDAMPINGAN_DRAFT_KEY, payload);
    }

    try {
      localStorage.setItem(PENDAMPINGAN_DRAFT_KEY, JSON.stringify(payload));
    } catch (err) {}
  }

  function clearLocalDraft() {
    var storage = getStorage();
    if (storage && typeof storage.remove === 'function') {
      storage.remove(PENDAMPINGAN_DRAFT_KEY);
    }

    try {
      localStorage.removeItem(PENDAMPINGAN_DRAFT_KEY);
    } catch (err) {}
  }

  function getSyncQueue() {
    var storage = getStorage();
    var keys = getStorageKeys();

    if (!storage || typeof storage.get !== 'function' || !keys.SYNC_QUEUE) {
      return [];
    }

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

  function enqueueOffline(action, payload) {
    var queue = getSyncQueue();

    var item = {
      id: payload.client_submit_id || generateClientSubmitId('QUEUE'),
      action: action,
      payload: Object.assign({}, payload, {
        sync_source: 'OFFLINE'
      }),
      status: 'PENDING',
      created_at: new Date().toISOString()
    };

    queue.push(item);
    saveSyncQueue(queue);
    return item;
  }

  function getFormIdByJenis(jenisSasaran) {
    var config = getConfig();
    var formIds = config.FORM_IDS || {};
    var key = String(jenisSasaran || '').toUpperCase();

    return formIds[key] || formIds.UMUM || 'FRM0001';
  }

  function getFormCacheLocal(formKey) {
    try {
      var raw = JSON.parse(localStorage.getItem(PENDAMPINGAN_FORM_CACHE_KEY) || '{}');
      var entry = raw[formKey];
      if (!entry || !entry.cached_at) return null;

      var age = Date.now() - new Date(entry.cached_at).getTime();
      if (age < 0 || age > PENDAMPINGAN_FORM_CACHE_TTL_MS) return null;

      return Array.isArray(entry.fields) ? entry.fields : null;
    } catch (err) {
      return null;
    }
  }

  function setFormCacheLocal(formKey, fields) {
    try {
      var raw = JSON.parse(localStorage.getItem(PENDAMPINGAN_FORM_CACHE_KEY) || '{}');
      raw[formKey] = {
        cached_at: new Date().toISOString(),
        fields: Array.isArray(fields) ? fields : []
      };
      localStorage.setItem(PENDAMPINGAN_FORM_CACHE_KEY, JSON.stringify(raw));
    } catch (err) {}
  }

  function normalizeDynamicField(field, index) {
    var raw = field || {};
    var id = raw.id || raw.question_code || raw.key || raw.name || raw.field_id || raw.store_key || ('field_' + index);
    var type = String(raw.type || raw.input_type || raw.component || raw.field_type || 'text').toLowerCase();

    if (type === 'string') type = 'text';
    if (type === 'dropdown') type = 'select';
    if (type === 'integer' || type === 'decimal') type = 'number';

    return {
      id: String(id),
      label: String(raw.label || raw.question || raw.title || raw.question_label || id),
      type: type,
      required:
        raw.required === true ||
        raw.is_required === true ||
        String(raw.required_runtime || '').toUpperCase() === 'TRUE',
      placeholder: String(raw.placeholder || ''),
      help_text: String(raw.help_text || ''),
      options: Array.isArray(raw.options)
        ? raw.options
        : (typeof raw.options === 'string'
            ? raw.options.split(',').map(function (v) { return v.trim(); }).filter(Boolean)
            : []),
      rows: raw.rows || 3
    };
  }

  function normalizeDynamicFieldsResponse(data, jenisSasaran) {
    if (Array.isArray(data)) return data;

    if (Array.isArray(data && data.fields)) return data.fields;

    if (Array.isArray(data && data.questions)) {
      return data.questions.filter(function (q) {
        var code = String(q.question_code || q.store_key || '').toUpperCase();
        return [
          'INFORMASI_KUNJUNGAN',
          'TANGGAL_KUNJUNGAN',
          'METODE_KUNJUNGAN',
          'LOKASI_GPS'
        ].indexOf(code) === -1;
      });
    }

    if (Array.isArray(data && data.items)) return data.items;

    if (Array.isArray(data && data.sections)) {
      var out = [];
      data.sections.forEach(function (section) {
        (section.questions || []).forEach(function (q) {
          out.push(q);
        });
      });
      return out;
    }

    return getFallbackFields(jenisSasaran);
  }

  function getFallbackFields(jenisSasaran) {
    var key = String(jenisSasaran || '').toUpperCase();

    var map = {
      CATIN: [
        { question_code: 'kunjungan_persiapan_nikah', label: 'Kunjungan Persiapan Nikah', type: 'select', required: false, options: ['SUDAH', 'BELUM'] },
        { question_code: 'edukasi_gizi', label: 'Edukasi Gizi', type: 'select', required: false, options: ['YA', 'TIDAK'] },
        { question_code: 'catatan_catin', label: 'Catatan CATIN', type: 'textarea', required: false }
      ],
      BUMIL: [
        { question_code: 'kontrol_kehamilan', label: 'Kontrol Kehamilan', type: 'select', required: false, options: ['RUTIN', 'TIDAK_RUTIN'] },
        { question_code: 'tablet_tambah_darah', label: 'Tablet Tambah Darah', type: 'select', required: false, options: ['YA', 'TIDAK'] },
        { question_code: 'catatan_bumil', label: 'Catatan BUMIL', type: 'textarea', required: false }
      ],
      BUFAS: [
        { question_code: 'kunjungan_nifas', label: 'Kunjungan Nifas', type: 'select', required: false, options: ['YA', 'TIDAK'] },
        { question_code: 'kondisi_ibu', label: 'Kondisi Ibu', type: 'text', required: false },
        { question_code: 'catatan_bufas', label: 'Catatan BUFAS', type: 'textarea', required: false }
      ],
      BADUTA: [
        { question_code: 'berat_badan', label: 'Berat Badan', type: 'number', required: false },
        { question_code: 'asi_eksklusif', label: 'ASI Eksklusif', type: 'select', required: false, options: ['YA', 'TIDAK'] },
        { question_code: 'catatan_baduta', label: 'Catatan BADUTA', type: 'textarea', required: false }
      ]
    };

    return map[key] || [];
  }

  function renderDynamicFieldInputs(fields, values) {
    var safeFields = Array.isArray(fields) ? fields.map(normalizeDynamicField) : [];
    currentDynamicFields = safeFields;

    if (!safeFields.length) {
      setHTML(
        'pendampingan-dynamic-fields',
        '<p class="muted-text">Tidak ada pertanyaan khusus untuk jenis sasaran ini.</p>'
      );
      return;
    }

    var safeValues = values && typeof values === 'object' ? values : {};

    var html = safeFields.map(function (field) {
      var value = safeValues[field.id];
      var requiredMark = field.required ? ' *' : '';
      var inputHtml = '';

      if (field.type === 'textarea') {
        inputHtml = [
          '<textarea',
          ' id="dyn-pen-' + escapeHtml(field.id) + '"',
          ' data-dynamic-field="' + escapeHtml(field.id) + '"',
          ' rows="' + escapeHtml(field.rows) + '"',
          field.required ? ' required' : '',
          field.placeholder ? ' placeholder="' + escapeHtml(field.placeholder) + '"' : '',
          '>',
          escapeHtml(value || ''),
          '</textarea>'
        ].join('');
      } else if (field.type === 'select') {
        inputHtml = [
          '<select',
          ' id="dyn-pen-' + escapeHtml(field.id) + '"',
          ' data-dynamic-field="' + escapeHtml(field.id) + '"',
          field.required ? ' required' : '',
          '>',
          '<option value="">Pilih</option>',
          (field.options || []).map(function (opt) {
            var optionValue = typeof opt === 'object'
              ? String(opt.value || opt.code || opt.id || opt.label || '')
              : String(opt);
            var optionLabel = typeof opt === 'object'
              ? String(opt.label || opt.name || opt.text || optionValue)
              : optionValue;
            var selected = String(value || '') === optionValue ? ' selected' : '';
            return '<option value="' + escapeHtml(optionValue) + '"' + selected + '>' + escapeHtml(optionLabel) + '</option>';
          }).join(''),
          '</select>'
        ].join('');
      } else if (field.type === 'checkbox') {
        inputHtml = [
          '<label style="display:flex;align-items:center;gap:8px;min-height:46px;">',
          '<input',
          ' type="checkbox"',
          ' id="dyn-pen-' + escapeHtml(field.id) + '"',
          ' data-dynamic-field="' + escapeHtml(field.id) + '"',
          value ? ' checked' : '',
          ' />',
          '<span>Pilih</span>',
          '</label>'
        ].join('');
      } else {
        var inputType = 'text';
        if (field.type === 'number') inputType = 'number';
        if (field.type === 'date') inputType = 'date';

        inputHtml = [
          '<input',
          ' id="dyn-pen-' + escapeHtml(field.id) + '"',
          ' data-dynamic-field="' + escapeHtml(field.id) + '"',
          ' type="' + escapeHtml(inputType) + '"',
          field.required ? ' required' : '',
          field.placeholder ? ' placeholder="' + escapeHtml(field.placeholder) + '"' : '',
          ' value="' + escapeHtml(value || '') + '"',
          ' />'
        ].join('');
      }

      var help = field.help_text
        ? '<small class="muted-text">' + escapeHtml(field.help_text) + '</small>'
        : '';

      return [
        '<div class="form-group">',
        '<label for="dyn-pen-' + escapeHtml(field.id) + '">' + escapeHtml(field.label) + requiredMark + '</label>',
        inputHtml,
        help,
        '</div>'
      ].join('');
    }).join('');

    setHTML('pendampingan-dynamic-fields', '<div class="filters-grid">' + html + '</div>');
  }

  function collectDynamicFields() {
    var values = {};

    currentDynamicFields.forEach(function (field) {
      var el = byId('dyn-pen-' + field.id);
      if (!el) return;

      if (field.type === 'checkbox') {
        values[field.id] = !!el.checked;
      } else {
        values[field.id] = String(el.value || '').trim();
      }
    });

    return values;
  }

  function applyDynamicFieldValues(extra) {
    var safeExtra = extra && typeof extra === 'object' ? extra : {};

    currentDynamicFields.forEach(function (field) {
      var el = byId('dyn-pen-' + field.id);
      if (!el) return;

      var value = safeExtra[field.id];

      if (field.type === 'checkbox') {
        el.checked = !!value;
      } else {
        el.value = value !== undefined && value !== null ? value : '';
      }
    });
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

    return {
      id_pendampingan: raw.id_pendampingan || raw.id || '',
      id_sasaran: raw.id_sasaran || '',
      nama_sasaran: raw.nama_sasaran || '',
      jenis_sasaran: raw.jenis_sasaran || '',
      status_sasaran: raw.status_sasaran || raw.status || 'AKTIF',
      nama_wilayah: raw.nama_wilayah || '',
      nama_kecamatan: raw.nama_kecamatan || raw.kecamatan || '',
      nama_desa: raw.nama_desa || raw.desa_kelurahan || raw.desa || '',
      nama_dusun: raw.nama_dusun || raw.dusun_rw || raw.dusun || '',
      tanggal_pendampingan: raw.tanggal_pendampingan || raw.submit_at || '',
      status_kunjungan: raw.status_kunjungan || '',
      catatan_umum: raw.catatan_umum || '',
      extra_fields: raw.extra_fields || parseJsonSafely(raw.extra_fields_json, {}),
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
      nama_wilayah:
        selected.nama_wilayah ||
        selected.wilayah ||
        [selected.nama_dusun, selected.nama_desa, selected.nama_kecamatan].filter(Boolean).join(' / ') ||
        '-',
      nama_kecamatan: selected.nama_kecamatan || '',
      nama_desa: selected.nama_desa || '',
      nama_dusun: selected.nama_dusun || '',
      nama_kader: profile.nama_kader || profile.nama || '',
      nama_tim: profile.nama_tim || profile.id_tim || ''
    };
  }

  var PendampinganView = {
    _isOpening: false,
    _lastOpenSignature: '',

    init: function () {
      if (isInitialized) return;
      isInitialized = true;
      this.bindEvents();
      this.bindAutosave();
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

        await this.loadDynamicFields(jenis, {
          openToken: openToken
        });

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
          nama_wilayah:
            item.nama_wilayah ||
            selected.nama_wilayah ||
            [selected.nama_dusun, selected.nama_desa, selected.nama_kecamatan].filter(Boolean).join(' / '),
          nama_kecamatan: item.nama_kecamatan || selected.nama_kecamatan || '',
          nama_desa: item.nama_desa || selected.nama_desa || '',
          nama_dusun: item.nama_dusun || selected.nama_dusun || ''
        });

        setSelectedSasaran(headerItem);

        this.resetForm();
        this.applyModeUI();
        this.renderHeader(headerItem);

        await this.loadDynamicFields(item.jenis_sasaran || '', {
          openToken: openToken,
          force: false
        });

        if (openToken !== currentOpenToken) return;

        this.fillForm(item);
        this.fillDynamicFields(item.extra_fields || parseJsonSafely(item.extra_fields_json, {}));
        this.renderValidation();
      } catch (err) {
        showToast((err && err.message) || 'Gagal membuka mode edit pendampingan.', 'error');
      } finally {
        if (openToken === currentOpenToken) {
          this._isOpening = false;
        }
      }
    },

    openEdit: async function (idPendampingan, options) {
      return this.openEditById(idPendampingan, options || {});
    },

    applyModeUI: function () {
      var isEdit = getMode() === 'edit';

      setText(
        'pendampingan-mode-info',
        isEdit ? 'Mode edit laporan pendampingan' : 'Mode input baru'
      );

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

      var wilayah =
        safeItem.nama_wilayah ||
        safeItem.wilayah ||
        [safeItem.nama_dusun, safeItem.nama_desa, safeItem.nama_kecamatan].filter(Boolean).join(' / ') ||
        '-';

      setText('pendampingan-nama-sasaran', safeItem.nama_sasaran || safeItem.nama || '-');
      setText('pendampingan-id-sasaran', 'ID Sasaran: ' + (safeItem.id_sasaran || safeItem.id || '-'));
      setText('pendampingan-jenis', safeItem.jenis_sasaran || '-');
      setText('pendampingan-wilayah', wilayah);
      setText('pendampingan-kader', profile.nama_kader || profile.nama || '-');
      setText('pendampingan-tim', profile.nama_tim || profile.id_tim || '-');

      var badge = byId('pendampingan-status-badge');
      if (badge) {
        badge.textContent = status;
        badge.className = 'badge ' + this.getStatusBadgeClass(status);
      }
    },

    prefillIdentity: function () {
      var el = byId('pen-tanggal');
      if (el && !el.value) {
        el.value = todayIso();
      }
    },

    loadDynamicFields: async function (jenisSasaran, options) {
      var opts = options || {};
      var key = String(jenisSasaran || '').toUpperCase();
      var formId = getFormIdByJenis(key);
      var formKey = formId + ':' + key;

      if (!key) {
        currentJenisSasaran = '';
        currentDynamicFields = [];
        setHTML(
          'pendampingan-dynamic-fields',
          '<p class="muted-text">Jenis sasaran tidak tersedia.</p>'
        );
        return;
      }

      if (!opts.force && currentJenisSasaran === key && currentDynamicFields.length) {
        return;
      }

      currentJenisSasaran = key;
      var formLoadToken = ++currentFormLoadToken;

      if (!opts.force && PENDAMPINGAN_FORM_CACHE[formKey]) {
        renderDynamicFieldInputs(PENDAMPINGAN_FORM_CACHE[formKey], {});
        return;
      }

      var cachedLocal = !opts.force ? getFormCacheLocal(formKey) : null;
      if (cachedLocal && cachedLocal.length) {
        PENDAMPINGAN_FORM_CACHE[formKey] = cachedLocal;
        renderDynamicFieldInputs(cachedLocal, {});
        return;
      }

      setHTML(
        'pendampingan-dynamic-fields',
        '<p class="muted-text">Field pendampingan sedang dimuat...</p>'
      );

      var api = getApi();
      if (!api || typeof api.post !== 'function') {
        var fallbackNoApi = getFallbackFields(key);
        PENDAMPINGAN_FORM_CACHE[formKey] = fallbackNoApi;
        setFormCacheLocal(formKey, fallbackNoApi);
        renderDynamicFieldInputs(fallbackNoApi, {});
        return;
      }

      var fields = null;
      var specificAction = getActionName('GET_PENDAMPINGAN_FORM_DEFINITION', 'getPendampinganFormDefinition');
      var generalAction = getActionName('GET_FORM_DEFINITION', 'getFormDefinition');

      try {
        var result = await api.post(specificAction, {
          jenis_sasaran: key,
          form_id: formId
        }, {
          includeAuth: true,
          timeoutMs: 12000
        });

        if (formLoadToken !== currentFormLoadToken) return;

        if (result && result.ok !== false) {
          fields = normalizeDynamicFieldsResponse(result && result.data, key);
        }
      } catch (err) {}

      if (!fields || !fields.length) {
        try {
          var result2 = await api.post(generalAction, {
            jenis_sasaran: key,
            form_id: formId,
            form_type: 'PENDAMPINGAN'
          }, {
            includeAuth: true,
            timeoutMs: 12000
          });

          if (formLoadToken !== currentFormLoadToken) return;

          if (result2 && result2.ok !== false) {
            fields = normalizeDynamicFieldsResponse(result2 && result2.data, key);
          }
        } catch (err2) {}
      }

      if (!fields || !fields.length) {
        fields = getFallbackFields(key);
      }

      PENDAMPINGAN_FORM_CACHE[formKey] = fields;
      setFormCacheLocal(formKey, fields);

      if (formLoadToken !== currentFormLoadToken) return;
      renderDynamicFieldInputs(fields, {});
    },

    fillForm: function (item) {
      var safeItem = item || {};

      var map = {
        'pen-tanggal': safeItem.tanggal_pendampingan || '',
        'pen-status-kunjungan': safeItem.status_kunjungan || '',
        'pen-catatan-umum': safeItem.catatan_umum || '',
        'pen-edit-reason': ''
      };

      Object.keys(map).forEach(function (id) {
        setValue(id, map[id]);
      });
    },

    fillDynamicFields: function (itemOrExtra) {
      var extra = itemOrExtra && itemOrExtra.extra_fields ? itemOrExtra.extra_fields : itemOrExtra;
      if ((!extra || typeof extra !== 'object') && itemOrExtra && itemOrExtra.extra_fields_json) {
        extra = parseJsonSafely(itemOrExtra.extra_fields_json, {});
      }
      applyDynamicFieldValues(extra || {});
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

      return {
        mode: mode,
        id_pendampingan: mode === 'edit' ? (editItem.id_pendampingan || '') : '',
        id_sasaran: selected.id_sasaran || selected.id || editItem.id_sasaran || '',
        jenis_sasaran: selected.jenis_sasaran || editItem.jenis_sasaran || '',
        form_id: getFormIdByJenis(selected.jenis_sasaran || editItem.jenis_sasaran || ''),
        nama_sasaran: selected.nama_sasaran || selected.nama || editItem.nama_sasaran || '',
        tanggal_pendampingan: (byId('pen-tanggal') && byId('pen-tanggal').value) || '',
        status_kunjungan: (byId('pen-status-kunjungan') && byId('pen-status-kunjungan').value) || '',
        catatan_umum: ((byId('pen-catatan-umum') && byId('pen-catatan-umum').value) || '').trim(),
        edit_reason: ((byId('pen-edit-reason') && byId('pen-edit-reason').value) || '').trim(),
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
        extra_fields: collectDynamicFields()
      };
    },

    validate: function (data) {
      var issues = [];
      var mode = getMode();

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
        issues.push({ type: 'warn', text: 'Status kunjungan belum dipilih.' });
      }

      if (mode === 'edit') {
        if (!isRequired(data.id_pendampingan)) {
          issues.push({ type: 'error', text: 'ID pendampingan tidak ditemukan.' });
        }

        if (!isRequired(data.edit_reason)) {
          issues.push({ type: 'error', text: 'Alasan edit wajib diisi.' });
        }
      }

      currentDynamicFields.forEach(function (field) {
        if (!field.required) return;
        var value = data.extra_fields && data.extra_fields[field.id];
        var missing = field.type === 'checkbox' ? value !== true : !isRequired(value);
        if (missing) {
          issues.push({ type: 'error', text: field.label + ' wajib diisi.' });
        }
      });

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

      setHTML(
        'pendampingan-dynamic-fields',
        '<p class="muted-text">Field pendampingan akan dimuat otomatis.</p>'
      );

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

      applyDynamicFieldValues(draft.data.extra_fields || {});
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
            window.SasaranDetailView.open(selected.id_sasaran || selected.id, {
              skipRoute: false
            });
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
        ['btn-reset-pendampingan', function () {
          clearLocalDraft();
          self.resetForm();
          self.applyModeUI();
          self.prefillIdentity();
          self.renderValidation();
        }]
      ].forEach(function (entry) {
        var btn = byId(entry[0]);
        if (!btn || btn.dataset.bound === '1') return;

        btn.dataset.bound = '1';
        btn.addEventListener('click', entry[1]);
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

      setLoading(
        'btn-submit-pendampingan',
        true,
        mode === 'edit' ? 'Menyimpan...' : 'Mengirim...'
      );

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
            extra_fields: data.extra_fields,
            extra_fields_json: JSON.stringify(data.extra_fields || {})
          };
        }

        if (!navigator.onLine && mode === 'create') {
          enqueueOffline(action, payload);
          saveLocalDraft(payload);

          showToast(
            'Sedang offline. Pendampingan disimpan ke antrean sinkronisasi.',
            'warning'
          );

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
          await window.SasaranDetailView.open(selectedId, {
            forceRefresh: true
          });
        } else if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go('sasaranList');
        }

        if (result && result.data && result.data.duplicate) {
          showToast('Pendampingan sudah pernah tersimpan sebelumnya.', 'warning');
        } else {
          showToast(
            mode === 'edit'
              ? 'Pendampingan berhasil diperbarui.'
              : 'Pendampingan berhasil dikirim.',
            'success'
          );
        }
      } catch (err) {
        if (mode === 'create') {
          saveLocalDraft(data);
        }
        showToast((err && err.message) || 'Terjadi kesalahan saat menyimpan pendampingan.', 'error');
      } finally {
        setLoading('btn-submit-pendampingan', false);
      }
    },

    getStatusBadgeClass: function (status) {
      var value = String(status || '').toUpperCase();
      if (value === 'AKTIF') return 'badge-success-soft';
      if (value === 'NONAKTIF') return 'badge-danger-soft';
      if (value === 'SELESAI') return 'badge-success';
      if (value === 'PERLU_REVIEW') return 'badge-warning';
      return 'badge-neutral';
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
