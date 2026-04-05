(function (window, document) {
  'use strict';

  var REGISTRASI_DRAFT_KEY = 'tpk_registrasi_draft';
  var currentMode = 'create';
  var currentEditItem = {};
  var currentDynamicFields = [];

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

  function getActions() {
    return (window.APP_CONFIG && window.APP_CONFIG.API_ACTIONS) || {};
  }

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function showToast(message, type) {
    var ui = getUI();
    if (ui && typeof ui.showToast === 'function') {
      ui.showToast(message, type || 'info');
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
    return String(value || '').trim() !== '';
  }

  function is16Digits(value) {
    return /^\d{16}$/.test(String(value || '').trim());
  }

  function isFutureDate(value) {
    if (!value) return false;
    var inputDate = new Date(value);
    if (isNaN(inputDate.getTime())) return false;

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    inputDate.setHours(0, 0, 0, 0);

    return inputDate.getTime() > today.getTime();
  }

  function todayIso() {
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
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

  function getProfile() {
    var state = getState();
    if (state && typeof state.getProfile === 'function') {
      return state.getProfile() || {};
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.PROFILE) {
      return storage.get(keys.PROFILE, {}) || {};
    }

    return {};
  }

  function getSelectedSasaran() {
    var state = getState();
    if (state && typeof state.getSelectedSasaran === 'function') {
      return state.getSelectedSasaran() || {};
    }
    return {};
  }

  function setRegistrasiMode(mode) {
    currentMode = String(mode || 'create').toLowerCase() === 'edit' ? 'edit' : 'create';

    var state = getState();
    if (state && typeof state.setRegistrasiMode === 'function') {
      state.setRegistrasiMode(currentMode);
    }
  }

  function getRegistrasiMode() {
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

  function getDraft() {
    var storage = getStorage();
    if (!storage || typeof storage.get !== 'function') return null;
    return storage.get(REGISTRASI_DRAFT_KEY, null);
  }

  function saveDraft(data) {
    var storage = getStorage();
    if (!storage || typeof storage.set !== 'function') return;
    storage.set(REGISTRASI_DRAFT_KEY, {
      saved_at: new Date().toISOString(),
      data: data || {}
    });
  }

  function clearDraft() {
    var storage = getStorage();
    if (!storage || typeof storage.remove !== 'function') return;
    storage.remove(REGISTRASI_DRAFT_KEY);
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

  function setSelectOptions(selectId, options, selectedValue) {
    var el = byId(selectId);
    if (!el) return;

    var safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];

    if (!safeOptions.length) {
      el.innerHTML = '<option value="">Pilih</option>';
      return;
    }

    el.innerHTML = safeOptions.map(function (opt) {
      var value = typeof opt === 'object'
        ? String(opt.value || opt.code || opt.id || opt.label || '')
        : String(opt);

      var label = typeof opt === 'object'
        ? String(opt.label || opt.name || opt.text || opt.value || value)
        : value;

      var selected = value === String(selectedValue || '') ? ' selected' : '';
      return '<option value="' + escapeHtml(value) + '"' + selected + '>' + escapeHtml(label) + '</option>';
    }).join('');
  }

  function parseDusunOptions(value) {
    return String(value || '')
      .split('/')
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
  }

  function normalizeField(field, index) {
    var raw = field || {};
    var id = raw.id || raw.key || raw.name || raw.field_id || raw.code || ('field_' + index);
    var type = String(raw.type || raw.input_type || raw.component || 'text').toLowerCase();

    if (type === 'string') type = 'text';
    if (type === 'dropdown') type = 'select';

    return {
      id: String(id),
      label: String(raw.label || raw.question || raw.title || id),
      type: type,
      required: raw.required === true || raw.is_required === true,
      placeholder: String(raw.placeholder || ''),
      options: Array.isArray(raw.options)
        ? raw.options
        : (typeof raw.options === 'string' ? raw.options.split(',').map(function (v) { return v.trim(); }).filter(Boolean) : []),
      rows: raw.rows || 3
    };
  }

  function getFallbackDynamicFields(jenisSasaran) {
    var jenis = String(jenisSasaran || '').toUpperCase();

    if (!jenis) return [];

    return [
      {
        id: 'catatan_tambahan',
        label: 'Catatan Tambahan',
        type: 'textarea',
        required: false,
        placeholder: 'Catatan tambahan untuk sasaran ' + jenis,
        rows: 3
      }
    ];
  }

  function renderDynamicFields(fields, values) {
    var safeFields = Array.isArray(fields) ? fields.map(normalizeField) : [];
    currentDynamicFields = safeFields;

    if (!safeFields.length) {
      setHTML(
        'registrasi-dynamic-fields',
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
          ' id="dyn-' + escapeHtml(field.id) + '"',
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
          ' id="dyn-' + escapeHtml(field.id) + '"',
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
          ' id="dyn-' + escapeHtml(field.id) + '"',
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
          ' id="dyn-' + escapeHtml(field.id) + '"',
          ' data-dynamic-field="' + escapeHtml(field.id) + '"',
          ' type="' + escapeHtml(inputType) + '"',
          field.required ? ' required' : '',
          field.placeholder ? ' placeholder="' + escapeHtml(field.placeholder) + '"' : '',
          ' value="' + escapeHtml(value || '') + '"',
          ' />'
        ].join('');
      }

      return [
        '<div class="form-group">',
        '<label for="dyn-' + escapeHtml(field.id) + '">' + escapeHtml(field.label) + requiredMark + '</label>',
        inputHtml,
        '</div>'
      ].join('');
    }).join('');

    setHTML('registrasi-dynamic-fields', '<div class="filters-grid">' + html + '</div>');
  }

  function collectDynamicFields() {
    var values = {};

    currentDynamicFields.forEach(function (field) {
      var el = byId('dyn-' + field.id);
      if (!el) return;

      if (field.type === 'checkbox') {
        values[field.id] = !!el.checked;
      } else {
        values[field.id] = String(el.value || '').trim();
      }
    });

    return values;
  }

  function fillDynamicFields(data) {
    var extra = data && typeof data === 'object' ? data : {};

    currentDynamicFields.forEach(function (field) {
      var el = byId('dyn-' + field.id);
      if (!el) return;

      var value = extra[field.id];

      if (field.type === 'checkbox') {
        el.checked = !!value;
      } else {
        el.value = value !== undefined && value !== null ? value : '';
      }
    });
  }

  function normalizeDynamicFieldsResponse(data, jenisSasaran) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data && data.fields)) return data.fields;
    if (Array.isArray(data && data.questions)) return data.questions;
    return getFallbackDynamicFields(jenisSasaran);
  }

  function buildPayload(data, mode, editItem) {
    var safeData = data || {};
    var safeMode = mode === 'edit' ? 'edit' : 'create';
    var safeEditItem = editItem || {};
    var extraFields = safeData.extra_fields || {};

    var payload = {
      jenis_sasaran: safeData.jenis_sasaran || '',
      nama_sasaran: safeData.nama_sasaran || '',
      nama_kepala_keluarga: safeData.nama_kepala_keluarga || '',
      nama_ibu_kandung: safeData.nama_ibu_kandung || '',
      nik: safeData.nik || '',
      nik_sasaran: safeData.nik || '',
      nomor_kk: safeData.nomor_kk || '',
      jenis_kelamin: safeData.jenis_kelamin || '',
      tanggal_lahir: safeData.tanggal_lahir || '',
      nama_kecamatan: safeData.nama_kecamatan || '',
      nama_desa: safeData.nama_desa || '',
      nama_dusun: safeData.nama_dusun || '',
      alamat: safeData.alamat || '',
      extra_fields: extraFields,
      extra_fields_json: JSON.stringify(extraFields || {}),
      sync_source: safeData.sync_source || 'ONLINE'
    };

    if (safeData.client_submit_id) {
      payload.client_submit_id = safeData.client_submit_id;
    }

    if (safeMode === 'edit') {
      payload.id_sasaran = safeData.id_sasaran || safeEditItem.id_sasaran || safeEditItem.id || '';
    }

    return payload;
  }

  var RegistrasiView = {
    init: function () {
      this.bindEvents();
      this.bindJenisSasaranChange();
      this.bindAutosave();
    },

    openCreate: async function () {
      setRegistrasiMode('create');
      clearEditItem();

      if (window.Router && typeof window.Router.go === 'function') {
        window.Router.go('registrasi');
      }

      this.resetForm();
      this.applyModeUI();
      this.prefillScope();
      this.applyJenisRules();
      await this.tryLoadDraft();
      this.renderValidation();
    },

    openEdit: async function (item) {
      var safeItem = item && typeof item === 'object' ? item : {};

      setRegistrasiMode('edit');
      setEditItem(safeItem);

      if (window.Router && typeof window.Router.go === 'function') {
        window.Router.go('registrasi');
      }

      this.resetForm();
      this.applyModeUI();
      this.prefillScope();
      this.fillForm(safeItem);
      await this.loadDynamicFields(safeItem.jenis_sasaran || '');
      this.fillDynamicFields(
        safeItem.extra_fields ||
        safeItem.field_values ||
        safeItem.jawaban ||
        parseJsonSafely(safeItem.extra_fields_json, {})
      );
      this.applyJenisRules();
      this.renderValidation();
    },

    applyModeUI: function () {
      var isEdit = getRegistrasiMode() === 'edit';

      setText('registrasi-screen-title', isEdit ? 'Edit Data Sasaran' : 'Registrasi Sasaran');
      setText('registrasi-screen-subtitle', isEdit ? 'Perbarui data sasaran terpilih' : 'Input data sasaran baru');
      setText('registrasi-mode-info', isEdit ? 'Mode edit sasaran aktif' : 'Mode registrasi baru');

      var submitBtn = byId('btn-submit-registrasi');
      if (submitBtn) {
        submitBtn.textContent = isEdit ? 'Simpan Perubahan' : 'Submit Registrasi';
      }

      var badge = byId('registrasi-mode-badge');
      if (badge) {
        badge.textContent = isEdit ? 'EDIT' : 'CREATE';
        badge.className = 'badge ' + (isEdit ? 'badge-warning' : 'badge-success-soft');
      }
    },

    resetForm: function () {
      var form = byId('registrasi-form');
      if (form) form.reset();

      currentDynamicFields = [];

      setHTML(
        'registrasi-dynamic-fields',
        '<p class="muted-text">Pilih jenis sasaran untuk memuat pertanyaan khusus.</p>'
      );

      setValue('reg-nama-kepala-keluarga', '');
      setValue('reg-nama-ibu-kandung', '');
    },

    prefillScope: function () {
      var profile = getProfile();
      var selected = getSelectedSasaran();
      var editItem = getEditItem();
      var mode = getRegistrasiMode();

      var kecamatan = mode === 'edit'
        ? (editItem.nama_kecamatan || profile.kecamatan || profile.nama_kecamatan || '')
        : (profile.kecamatan || profile.nama_kecamatan || selected.nama_kecamatan || '');

      var desa = mode === 'edit'
        ? (editItem.nama_desa || editItem.desa || profile.desa || profile.nama_desa || '')
        : (profile.desa || profile.nama_desa || selected.nama_desa || '');

      var dusunRaw = mode === 'edit'
        ? (editItem.nama_dusun || editItem.dusun || profile.dusun || profile.nama_dusun || '')
        : (profile.dusun || profile.nama_dusun || selected.nama_dusun || '');

      var dusunOptions = parseDusunOptions(dusunRaw);
      var selectedDusun = mode === 'edit'
        ? (editItem.nama_dusun || editItem.dusun || '')
        : '';

      setSelectOptions('reg-kecamatan', kecamatan ? [kecamatan] : [], kecamatan);
      setSelectOptions('reg-desa', desa ? [desa] : [], desa);
      setSelectOptions('reg-dusun', dusunOptions.length ? dusunOptions : (dusunRaw ? [dusunRaw] : []), selectedDusun);
    },

    fillForm: function (item) {
      var safeItem = item || {};

      var map = {
        'reg-jenis-sasaran': safeItem.jenis_sasaran || '',
        'reg-nama-sasaran': safeItem.nama_sasaran || safeItem.nama || '',
        'reg-nama-kepala-keluarga': safeItem.nama_kepala_keluarga || '',
        'reg-nama-ibu-kandung': safeItem.nama_ibu_kandung || '',
        'reg-nik': safeItem.nik || safeItem.nik_sasaran || '',
        'reg-no-kk': safeItem.nomor_kk || safeItem.no_kk || '',
        'reg-jenis-kelamin': safeItem.jenis_kelamin || '',
        'reg-tanggal-lahir': safeItem.tanggal_lahir || safeItem.tgl_lahir || '',
        'reg-dusun': safeItem.nama_dusun || safeItem.dusun || '',
        'reg-alamat': safeItem.alamat || safeItem.alamat_lengkap || ''
      };

      Object.keys(map).forEach(function (id) {
        setValue(id, map[id]);
      });
    },

    applyJenisRules: function () {
      var jenis = (byId('reg-jenis-sasaran') && byId('reg-jenis-sasaran').value) || '';
      var genderEl = byId('reg-jenis-kelamin');
      var ibuGroup = byId('group-reg-nama-ibu-kandung');
      var ibuInput = byId('reg-nama-ibu-kandung');

      if (genderEl) {
        if (jenis === 'BUMIL' || jenis === 'BUFAS') {
          genderEl.value = 'P';
          genderEl.disabled = true;
        } else {
          genderEl.disabled = false;
        }
      }

      if (ibuGroup) {
        ibuGroup.classList.toggle('hidden', jenis !== 'BADUTA');
      }

      if (ibuInput) {
        if (jenis === 'BADUTA') {
          ibuInput.required = true;
        } else {
          ibuInput.required = false;
          ibuInput.value = '';
        }
      }
    },

    bindJenisSasaranChange: function () {
      var self = this;
      var el = byId('reg-jenis-sasaran');
      if (!el || el.dataset.bound === '1') return;

      el.dataset.bound = '1';

      el.addEventListener('change', async function () {
        var jenis = el.value || '';
        self.applyJenisRules();
        await self.loadDynamicFields(jenis);
        self.renderValidation();
        self.autosaveDraft();
      });
    },

    bindAutosave: function () {
      var self = this;
      var form = byId('registrasi-form');
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
        ['btn-back-from-registrasi', function () {
          if (window.Router && typeof window.Router.go === 'function') {
            window.Router.go('dashboard');
          }
        }],
        ['btn-save-reg-draft', function () {
          self.autosaveDraft(true);
          showToast('Draft registrasi disimpan.', 'success');
        }],
        ['btn-reset-registrasi', function () {
          clearDraft();
          self.resetForm();
          self.prefillScope();
          self.applyModeUI();
          self.applyJenisRules();
          self.renderValidation();
        }]
      ].forEach(function (entry) {
        var btn = byId(entry[0]);
        if (!btn || btn.dataset.bound === '1') return;

        btn.dataset.bound = '1';
        btn.addEventListener('click', entry[1]);
      });

      var form = byId('registrasi-form');
      if (form && form.dataset.submitBound !== '1') {
        form.dataset.submitBound = '1';
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          self.submit();
        });
      }
    },

    async loadDynamicFields(jenisSasaran) {
      if (!jenisSasaran) {
        currentDynamicFields = [];
        setHTML(
          'registrasi-dynamic-fields',
          '<p class="muted-text">Pilih jenis sasaran untuk memuat pertanyaan khusus.</p>'
        );
        return;
      }

      var api = getApi();
      var actions = getActions();
      var config = getConfig();
      var formId = (config.FORM_IDS && config.FORM_IDS[jenisSasaran]) || '';

      try {
        if (!api || typeof api.post !== 'function') {
          throw new Error('Api.post belum tersedia.');
        }

        var result = await api.post(actions.GET_FORM_DEFINITION, {
          jenis_sasaran: jenisSasaran,
          form_id: formId
        }, {
          includeAuth: true
        });

        var fields = normalizeDynamicFieldsResponse(result && result.data, jenisSasaran);
        renderDynamicFields(fields, {});
      } catch (err) {
        renderDynamicFields(getFallbackDynamicFields(jenisSasaran), {});
      }
    },

    collectFormData: function () {
      var localDraft = (getDraft() && getDraft().data) || {};
      var mode = getRegistrasiMode();
      var editItem = getEditItem();

      var stableClientSubmitId = mode === 'create'
        ? (localDraft.client_submit_id || generateClientSubmitId('SUB'))
        : '';

      return {
        id_sasaran: editItem.id_sasaran || editItem.id || '',
        jenis_sasaran: (byId('reg-jenis-sasaran') && byId('reg-jenis-sasaran').value) || '',
        nama_sasaran: ((byId('reg-nama-sasaran') && byId('reg-nama-sasaran').value) || '').trim(),
        nama_kepala_keluarga: ((byId('reg-nama-kepala-keluarga') && byId('reg-nama-kepala-keluarga').value) || '').trim(),
        nama_ibu_kandung: ((byId('reg-nama-ibu-kandung') && byId('reg-nama-ibu-kandung').value) || '').trim(),
        nik: ((byId('reg-nik') && byId('reg-nik').value) || '').trim(),
        nomor_kk: ((byId('reg-no-kk') && byId('reg-no-kk').value) || '').trim(),
        jenis_kelamin: (byId('reg-jenis-kelamin') && byId('reg-jenis-kelamin').value) || '',
        tanggal_lahir: (byId('reg-tanggal-lahir') && byId('reg-tanggal-lahir').value) || '',
        nama_kecamatan: (byId('reg-kecamatan') && byId('reg-kecamatan').value) || '',
        nama_desa: (byId('reg-desa') && byId('reg-desa').value) || '',
        nama_dusun: (byId('reg-dusun') && byId('reg-dusun').value) || '',
        alamat: ((byId('reg-alamat') && byId('reg-alamat').value) || '').trim(),
        extra_fields: collectDynamicFields(),
        client_submit_id: stableClientSubmitId,
        sync_source: 'ONLINE'
      };
    },

    validate: function (data) {
      var issues = [];
      var jenis = String(data.jenis_sasaran || '').toUpperCase();

      if (!isRequired(data.jenis_sasaran)) {
        issues.push({ type: 'error', text: 'Jenis sasaran wajib dipilih.' });
      }

      if (!isRequired(data.nama_sasaran)) {
        issues.push({ type: 'error', text: 'Nama sasaran wajib diisi.' });
      }

      if (!isRequired(data.nama_kepala_keluarga)) {
        issues.push({ type: 'error', text: 'Nama kepala keluarga wajib diisi.' });
      }

      if (jenis === 'BADUTA' && !isRequired(data.nama_ibu_kandung)) {
        issues.push({ type: 'error', text: 'Nama ibu kandung wajib diisi untuk sasaran Baduta.' });
      }

      if (!is16Digits(data.nik)) {
        issues.push({ type: 'error', text: 'NIK harus 16 digit angka.' });
      }

      if (!is16Digits(data.nomor_kk)) {
        issues.push({ type: 'error', text: 'Nomor KK harus 16 digit angka.' });
      }

      if (!isRequired(data.nama_kecamatan)) {
        issues.push({ type: 'error', text: 'Kecamatan wajib dipilih.' });
      }

      if (!isRequired(data.nama_desa)) {
        issues.push({ type: 'error', text: 'Desa/Kelurahan wajib dipilih.' });
      }

      if (!isRequired(data.nama_dusun)) {
        issues.push({ type: 'error', text: 'Dusun/RW wajib dipilih.' });
      }

      if (data.tanggal_lahir && isFutureDate(data.tanggal_lahir)) {
        issues.push({ type: 'error', text: 'Tanggal lahir tidak boleh melebihi hari ini.' });
      }

      if (jenis === 'BUMIL' || jenis === 'BUFAS') {
        if (data.jenis_kelamin && data.jenis_kelamin !== 'P') {
          issues.push({ type: 'error', text: 'Jenis kelamin untuk BUMIL/BUFAS harus Perempuan.' });
        }
      }

      if (data.nik === '9999999999999999') {
        issues.push({ type: 'warn', text: 'NIK memakai placeholder 16 digit angka 9.' });
      }

      if (data.nomor_kk === '9999999999999999') {
        issues.push({ type: 'warn', text: 'Nomor KK memakai placeholder 16 digit angka 9.' });
      }

      currentDynamicFields.forEach(function (field) {
        if (field.required) {
          var value = data.extra_fields && data.extra_fields[field.id];
          var missing = field.type === 'checkbox' ? value !== true : !isRequired(value);
          if (missing) {
            issues.push({ type: 'error', text: field.label + ' wajib diisi.' });
          }
        }
      });

      if (!issues.some(function (item) { return item.type === 'error'; })) {
        issues.push({ type: 'ok', text: 'Validasi dasar lolos. Form siap dikirim.' });
      }

      return issues;
    },

    renderValidation: function () {
      var data = this.collectFormData();
      var issues = this.validate(data);

      var html = '<ul class="validation-list">' + issues.map(function (issue) {
        return '<li class="validation-item-' + escapeHtml(issue.type) + '">' + escapeHtml(issue.text) + '</li>';
      }).join('') + '</ul>';

      setHTML('registrasi-validation-box', html);
    },

    async tryLoadDraft() {
      if (getRegistrasiMode() !== 'create') return;

      var draft = getDraft();
      if (!draft || !draft.data) return;

      this.fillForm(draft.data);

      var jenis = draft.data.jenis_sasaran || '';
      if (jenis) {
        await this.loadDynamicFields(jenis);
        this.fillDynamicFields(draft.data.extra_fields || {});
      }

      this.applyJenisRules();
      this.renderValidation();
    },

    fillDynamicFields: function (extraFields) {
      var safeExtra = extraFields && typeof extraFields === 'object' ? extraFields : {};
      fillDynamicFields(safeExtra);
    },

    autosaveDraft: function () {
      if (getRegistrasiMode() !== 'create') return;
      saveDraft(this.collectFormData());
    },

    async submit() {
      var api = getApi();
      var actions = getActions();

      if (!api || typeof api.post !== 'function') {
        showToast('Api.post belum tersedia.', 'error');
        return;
      }

      var mode = getRegistrasiMode();
      var editItem = getEditItem();
      var data = this.collectFormData();
      var issues = this.validate(data);
      var hasError = issues.some(function (item) { return item.type === 'error'; });

      this.renderValidation();

      if (hasError) {
        showToast('Periksa kembali form registrasi.', 'warning');
        return;
      }

      var payload = buildPayload(data, mode, editItem);
      var action = mode === 'edit' ? actions.UPDATE_SASARAN : actions.REGISTER_SASARAN;

      if (!action) {
        showToast('Action registrasi belum tersedia di konfigurasi.', 'error');
        return;
      }

      setLoading(
        'btn-submit-registrasi',
        true,
        mode === 'edit' ? 'Menyimpan...' : 'Mengirim...'
      );

      try {
        if (!navigator.onLine) {
          enqueueOffline(action, payload);
          saveDraft(payload);

          showToast('Sedang offline. Registrasi disimpan ke draft sinkronisasi.', 'warning');

          clearDraft();
          this.resetForm();
          this.prefillScope();
          this.applyModeUI();
          this.applyJenisRules();
          this.renderValidation();

          if (window.Router && typeof window.Router.go === 'function') {
            window.Router.go('sync');
          }

          return;
        }

        var result = await api.post(action, payload, {
          includeAuth: true,
          clientSubmitId: payload.client_submit_id || ''
        });

        if (!result || result.ok === false) {
          throw new Error((result && result.message) || 'Gagal menyimpan data sasaran.');
        }

        clearDraft();
        clearEditItem();
        setRegistrasiMode('create');

        this.resetForm();
        this.prefillScope();
        this.applyModeUI();
        this.applyJenisRules();
        this.renderValidation();

        if (window.SasaranListView && typeof window.SasaranListView.loadAndRender === 'function') {
          await window.SasaranListView.loadAndRender();
        } else if (window.SasaranListView && typeof window.SasaranListView.load === 'function') {
          await window.SasaranListView.load();
        }

        if (mode === 'edit') {
          var targetId = payload.id_sasaran || editItem.id_sasaran || editItem.id || '';
          if (targetId && window.SasaranDetailView && typeof window.SasaranDetailView.open === 'function') {
            await window.SasaranDetailView.open(targetId);
          } else if (window.Router && typeof window.Router.go === 'function') {
            window.Router.go('sasaranList');
          }
        } else if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go('sasaranList');
        }

        if (result && result.data && result.data.duplicate) {
          showToast('Registrasi sasaran sudah pernah tersimpan sebelumnya.', 'warning');
        } else {
          showToast(
            mode === 'edit'
              ? 'Perubahan data sasaran berhasil disimpan.'
              : 'Registrasi sasaran berhasil disimpan.',
            'success'
          );
        }
      } catch (err) {
        saveDraft(payload);
        showToast((err && err.message) || 'Terjadi kesalahan saat menyimpan data.', 'error');
      } finally {
        setLoading('btn-submit-registrasi', false);
      }
    }
  };

  window.RegistrasiView = RegistrasiView;

  // Alias sementara agar referensi lama tidak langsung patah
  window.RegistrasiForm = RegistrasiView;

  document.addEventListener('DOMContentLoaded', function () {
    if (window.RegistrasiView && typeof window.RegistrasiView.init === 'function') {
      window.RegistrasiView.init();
    }
  });
})(window, document);
