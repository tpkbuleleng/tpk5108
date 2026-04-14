(function (window, document) {
  'use strict';

  const REG_DRAFT_KEY = 'tpk_registrasi_draft_v_final';
  const REG_RETURN_ROUTE_KEY = 'tpk_registrasi_return_route';
  const PLACEHOLDER_16 = '9999999999999999';
  const DEFINITION_CACHE = {};
  const STATIC_CODES = new Set([
    'jenis_sasaran',
    'nama_sasaran',
    'nik_sasaran',
    'nik',
    'nomor_kk',
    'jenis_kelamin',
    'tanggal_lahir',
    'nama_kecamatan',
    'kecamatan',
    'desa_kelurahan',
    'nama_desa',
    'dusun_rw',
    'nama_dusun',
    'alamat',
    'id_sasaran',
    'id_tim',
    'nama_tim',
    'id_wilayah',
    'client_submit_id',
    'sync_source'
  ]);

  function byId(id) {
    return document.getElementById(id);
  }

  function firstNonEmpty() {
    for (let i = 0; i < arguments.length; i += 1) {
      const v = arguments[i];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return '';
  }

  function safeTrim(value) {
    return String(value || '').trim();
  }

  function toUpper(value) {
    return safeTrim(value).toUpperCase();
  }

  function toLowerSnake(value) {
    return safeTrim(value)
      .replace(/\s+/g, '_')
      .replace(/[^\w]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  function safeJsonParse(value, fallback) {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function isFunction(fn) {
    return typeof fn === 'function';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function notify(message, type) {
    if (window.Notifier && isFunction(window.Notifier.show)) {
      window.Notifier.show(message, type);
      return;
    }
    window.alert(message);
  }

  function uiSetText(id, value) {
    if (window.UI && isFunction(window.UI.setText)) {
      window.UI.setText(id, value);
      return;
    }
    const el = byId(id);
    if (el) el.textContent = value;
  }

  function uiSetHTML(id, value) {
    if (window.UI && isFunction(window.UI.setHTML)) {
      window.UI.setHTML(id, value);
      return;
    }
    const el = byId(id);
    if (el) el.innerHTML = value;
  }

  function uiSetValue(id, value) {
    if (window.UI && isFunction(window.UI.setValue)) {
      window.UI.setValue(id, value);
      return;
    }
    const el = byId(id);
    if (el) el.value = value == null ? '' : value;
  }

  function uiSetLoading(id, isLoading, text) {
    if (window.UI && isFunction(window.UI.setLoading)) {
      window.UI.setLoading(id, isLoading, text);
      return;
    }
    const el = byId(id);
    if (!el) return;
    if (!el.dataset.originalText) {
      el.dataset.originalText = el.textContent || '';
    }
    el.disabled = !!isLoading;
    el.textContent = isLoading ? (text || 'Memproses...') : (el.dataset.originalText || el.textContent);
  }

  function setReadonly(el, locked) {
    if (!el) return;
    const tag = String(el.tagName || '').toLowerCase();
    if (tag === 'select') {
      el.disabled = !!locked;
    } else {
      el.readOnly = !!locked;
    }
  }

  function goToRegistrasi() {
    if (window.Router && isFunction(window.Router.toRegistrasi)) {
      window.Router.toRegistrasi();
    }
  }

  function goToSasaranList() {
    if (window.Router && isFunction(window.Router.toSasaranList)) {
      window.Router.toSasaranList();
    }
  }

  function goToDashboard() {
    if (window.Router && isFunction(window.Router.toDashboard)) {
      window.Router.toDashboard();
    }
  }

  function getCurrentRouteName() {
    if (window.Router && isFunction(window.Router.getCurrentRoute)) {
      return safeTrim(window.Router.getCurrentRoute());
    }
    return '';
  }

  function normalizeReturnRoute(routeName) {
    const raw = safeTrim(routeName);
    if (!raw) return '';

    const aliases = {
      dashboard: 'dashboard',
      sasaranList: 'sasaranList',
      'sasaran-list': 'sasaranList',
      sasaran_list: 'sasaranList',
      sasaranDetail: 'sasaranDetail',
      'sasaran-detail': 'sasaranDetail',
      sasaran_detail: 'sasaranDetail',
      registrasi: 'registrasi'
    };

    return aliases[raw] || '';
  }

  function saveReturnRoute(routeName) {
    const normalized = normalizeReturnRoute(routeName);
    if (!normalized || normalized === 'registrasi') return;
    try {
      sessionStorage.setItem(REG_RETURN_ROUTE_KEY, normalized);
    } catch (_) {}
  }

  function readReturnRoute() {
    try {
      return normalizeReturnRoute(sessionStorage.getItem(REG_RETURN_ROUTE_KEY));
    } catch (_) {
      return '';
    }
  }

  function clearReturnRoute() {
    try {
      sessionStorage.removeItem(REG_RETURN_ROUTE_KEY);
    } catch (_) {}
  }

  function captureReturnRoute(preferredRoute) {
    const current = normalizeReturnRoute(preferredRoute) || normalizeReturnRoute(getCurrentRouteName()) || readReturnRoute() || 'dashboard';
    saveReturnRoute(current);
    return current;
  }

  function getProfile() {
    if (window.Session && isFunction(window.Session.getProfile)) {
      return window.Session.getProfile() || {};
    }
    return {};
  }

  function getSelectedSasaran() {
    if (window.SasaranState && isFunction(window.SasaranState.getSelected)) {
      return window.SasaranState.getSelected() || {};
    }
    return {};
  }

  function getEditItem() {
    if (window.RegistrasiState && isFunction(window.RegistrasiState.getEditItem)) {
      return window.RegistrasiState.getEditItem() || {};
    }
    return {};
  }

  function setMode(mode) {
    if (window.RegistrasiState && isFunction(window.RegistrasiState.setMode)) {
      window.RegistrasiState.setMode(mode);
    }
  }

  function getMode() {
    if (window.RegistrasiState && isFunction(window.RegistrasiState.getMode)) {
      return window.RegistrasiState.getMode() || 'create';
    }
    return 'create';
  }

  function setEditItem(item) {
    if (window.RegistrasiState && isFunction(window.RegistrasiState.setEditItem)) {
      window.RegistrasiState.setEditItem(item || {});
    }
  }

  function clearEditItem() {
    if (window.RegistrasiState && isFunction(window.RegistrasiState.clearEditItem)) {
      window.RegistrasiState.clearEditItem();
    }
  }

  function resetStateCreate() {
    clearEditItem();
    setMode('create');
  }

  function ensureClientSubmitId(existing) {
    if (window.ClientId && isFunction(window.ClientId.ensure)) {
      return window.ClientId.ensure(existing, 'REG');
    }
    if (existing) return existing;
    return `REG-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  function validators() {
    return window.Validators || {};
  }

  function isRequired(value) {
    const api = validators();
    if (isFunction(api.isRequired)) return api.isRequired(value);
    return !(value === undefined || value === null || String(value).trim() === '');
  }

  function isNikOrKK16(value) {
    const api = validators();
    if (isFunction(api.isNikOrKK16)) return api.isNikOrKK16(value);
    return /^\d{16}$/.test(String(value || ''));
  }

  function isDateNotFuture(value) {
    if (!value) return false;
    const input = new Date(value);
    if (Number.isNaN(input.getTime())) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return input.getTime() <= today.getTime();
  }

  function calcAgeYears(value) {
    if (!value) return null;
    const dob = new Date(value);
    if (Number.isNaN(dob.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years -= 1;
    return years;
  }

  function calcAgeMonths(value) {
    if (!value) return null;
    const dob = new Date(value);
    if (Number.isNaN(dob.getTime())) return null;
    const now = new Date();
    let months = (now.getFullYear() - dob.getFullYear()) * 12;
    months += now.getMonth() - dob.getMonth();
    if (now.getDate() < dob.getDate()) months -= 1;
    return months;
  }

  function getDraftManager() {
    return window.DraftManager || null;
  }

  function loadDraftLocal() {
    const manager = getDraftManager();
    if (manager && isFunction(manager.getRegistrasiDraft)) {
      return manager.getRegistrasiDraft() || null;
    }
    try {
      return safeJsonParse(localStorage.getItem(REG_DRAFT_KEY), null);
    } catch (_) {
      return null;
    }
  }

  function saveDraftLocal(data) {
    const manager = getDraftManager();
    if (manager && isFunction(manager.saveRegistrasiDraft)) {
      manager.saveRegistrasiDraft(data);
      return;
    }
    try {
      localStorage.setItem(
        REG_DRAFT_KEY,
        JSON.stringify({
          saved_at: new Date().toISOString(),
          data: data || {}
        })
      );
    } catch (_) {}
  }

  function clearDraftLocal() {
    const manager = getDraftManager();
    if (manager && isFunction(manager.clearRegistrasiDraft)) {
      manager.clearRegistrasiDraft();
      return;
    }
    try {
      localStorage.removeItem(REG_DRAFT_KEY);
    } catch (_) {}
  }

  function enqueueOfflineRegistrasi(payload) {
    const manager = getDraftManager();
    if (manager && isFunction(manager.enqueueOfflineRegistrasi)) {
      manager.enqueueOfflineRegistrasi(payload);
      return true;
    }
    try {
      const key = 'tpk_sync_queue_v1';
      const raw = safeJsonParse(localStorage.getItem(key), []);
      const queue = Array.isArray(raw) ? raw : [];
      queue.push({
        action: 'registerSasaran',
        created_at: new Date().toISOString(),
        sync_status: 'PENDING',
        payload: payload || {}
      });
      localStorage.setItem(key, JSON.stringify(queue));
      return true;
    } catch (_) {
      return false;
    }
  }

  function parseStoredAnswers(item) {
    const out = {};

    const dataLaporan = safeJsonParse(item && item.data_laporan, {});
    const payloadJson = safeJsonParse(item && item.payload_json, {});
    const extraFieldsJson = safeJsonParse(item && item.extra_fields_json, {});

    [
      dataLaporan.answers,
      payloadJson.answers,
      item && item.answers,
      item && item.dynamic_fields,
      item && item.extra_fields,
      extraFieldsJson
    ].forEach((obj) => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
      Object.keys(obj).forEach((key) => {
        out[toLowerSnake(key)] = obj[key];
      });
    });

    return out;
  }

  function getApi() {
    return window.Api || null;
  }

  async function callApi(action, payload) {
    const api = getApi();
    if (api && isFunction(api.post)) {
      return api.post(action, payload || {});
    }
    throw new Error('Api.post belum tersedia.');
  }

  function extractErrorMessage(result, fallback) {
    if (!result) return fallback;
    if (result.message) {
      if (result.data && Array.isArray(result.data.fields) && result.data.fields.length) {
        const first = result.data.fields[0];
        return first && first.message ? first.message : result.message;
      }
      return result.message;
    }
    return fallback;
  }

  function mapJenisToFormId(jenis) {
    const key = toUpper(jenis);
    const map = {
      CATIN: 'FRM1002',
      BUMIL: 'FRM1003',
      BUFAS: 'FRM1004',
      BADUTA: 'FRM1005'
    };
    return map[key] || 'FRM1001';
  }

  function deepMergeObject(target, source) {
    const out = Object.assign({}, target || {});
    const src = source || {};
    Object.keys(src).forEach((key) => {
      if (src[key] !== undefined && src[key] !== null && src[key] !== '') {
        out[key] = src[key];
      }
    });
    return out;
  }

  const RegistrasiForm = {
    _isBound: false,
    _currentDefinition: null,
    _dynamicQuestions: [],
    _currentFormId: '',

    init() {
      if (this._isBound) return;
      this._isBound = true;
      this.bindEvents();
      this.applyModeUI();
      this.renderValidation();
    },

    bindEvents() {
      const form = byId('registrasi-form');
      const btnBack = byId('btn-back-from-registrasi');
      const btnSubmit = byId('btn-submit-registrasi');
      const btnEditFromDetail = byId('btn-go-to-edit-sasaran');
      const jenisEl = byId('reg-jenis-sasaran');

      if (btnBack) {
        btnBack.addEventListener('click', async (event) => {
          event.preventDefault();
          await this.handleBack();
        });
      }

      if (btnSubmit) {
        btnSubmit.addEventListener('click', (event) => {
          const insideForm = btnSubmit.closest('form');
          if (!insideForm) {
            event.preventDefault();
            this.submit();
          }
        });
      }

      if (form) {
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          this.submit();
        });

        form.addEventListener('input', () => {
          this.handleAnyFormChange();
        });

        form.addEventListener('change', (event) => {
          const target = event.target;
          if (target && target.id === 'reg-jenis-sasaran') return;
          this.handleAnyFormChange();
          this.updateConditionalDynamicFields();
        });
      }

      if (jenisEl) {
        jenisEl.addEventListener('change', async () => {
          this.applyGenderLockByJenis();
          await this.handleJenisChange();
        });
      }

      if (btnEditFromDetail) {
        btnEditFromDetail.addEventListener('click', async (event) => {
          event.preventDefault();
          await this.handleOpenEditFromDetail();
        });
      }
    },

    async handleOpenEditFromDetail() {
      try {
        const item = await this.resolveCurrentSasaranForEdit();
        if (!item || !(item.id_sasaran || item.id)) {
          notify('Data sasaran untuk edit tidak ditemukan.');
          return;
        }
        await this.openEdit(item);
      } catch (err) {
        notify(err && err.message ? err.message : 'Gagal membuka mode edit sasaran.');
      }
    },

    async resolveCurrentSasaranForEdit() {
      const editItem = getEditItem();
      if (editItem && (editItem.id_sasaran || editItem.id)) return editItem;

      const selected = getSelectedSasaran();
      if (selected && (selected.id_sasaran || selected.id)) {
        const hydrated = await this.tryFetchSasaranById(selected.id_sasaran || selected.id);
        return hydrated || selected;
      }

      if (window.SasaranDetail) {
        if (isFunction(window.SasaranDetail.getCurrentItem)) {
          const current = window.SasaranDetail.getCurrentItem() || {};
          if (current.id_sasaran || current.id) return current;
        }
        if (window.SasaranDetail.currentItem && (window.SasaranDetail.currentItem.id_sasaran || window.SasaranDetail.currentItem.id)) {
          return window.SasaranDetail.currentItem;
        }
      }

      return null;
    },

    async tryFetchSasaranById(idSasaran) {
      if (!idSasaran || !window.SasaranService) return null;

      const service = window.SasaranService;
      const candidateMethods = [
        'getSasaranDetail',
        'getSasaranById',
        'fetchById',
        'getDetailSasaran'
      ];

      for (let i = 0; i < candidateMethods.length; i += 1) {
        const methodName = candidateMethods[i];
        if (!isFunction(service[methodName])) continue;

        try {
          const result = await service[methodName](idSasaran);
          const data = result && result.data ? result.data : result;
          if (data && (data.id_sasaran || data.id)) {
            return data;
          }
        } catch (_) {}
      }

      try {
        const result = await callApi('getSasaranDetail', { id_sasaran: idSasaran });
        return result && result.data ? result.data : null;
      } catch (_) {
        return null;
      }
    },

    async openCreate() {
      captureReturnRoute();
      resetStateCreate();
      goToRegistrasi();
      this.resetForm();
      this.applyModeUI();
      await this.prefillScope();
      this.tryLoadDraft();
      this.renderValidation();
    },

    async openEdit(item) {
      const safeItem = await this.resolveEditItem(item);
      if (!safeItem || !(safeItem.id_sasaran || safeItem.id)) {
        notify('Data sasaran untuk edit tidak valid.');
        return;
      }

      captureReturnRoute();
      setMode('edit');
      setEditItem(safeItem);
      goToRegistrasi();

      this.resetForm();
      this.applyModeUI();
      await this.prefillScope();
      this.fillStaticForm(safeItem);

      const jenis = firstNonEmpty(safeItem.jenis_sasaran);
      await this.loadDynamicFields(jenis);

      const storedAnswers = parseStoredAnswers(safeItem);
      this.fillDynamicFields(storedAnswers);
      this.applyGenderLockByJenis();
      this.updateConditionalDynamicFields();
      this.renderValidation();
    },

    async resolveEditItem(item) {
      const direct = item || {};
      if (direct.id_sasaran || direct.id) {
        const maybeHydrated = await this.tryFetchSasaranById(direct.id_sasaran || direct.id);
        return maybeHydrated || direct;
      }
      return null;
    },

    applyModeUI() {
      const mode = getMode();
      const isEdit = mode === 'edit';

      uiSetText('registrasi-screen-title', isEdit ? 'Edit Data Sasaran' : 'Registrasi Sasaran');
      uiSetText('registrasi-screen-subtitle', isEdit ? 'Perbarui data sasaran terpilih' : 'Input data sasaran baru');
      uiSetText('registrasi-mode-info', isEdit ? 'Mode edit sasaran aktif' : 'Mode registrasi baru');
      uiSetText('btn-submit-registrasi', isEdit ? 'Simpan Perubahan' : 'Submit Registrasi');

      const badge = byId('registrasi-mode-badge');
      if (badge) {
        badge.textContent = isEdit ? 'EDIT' : 'CREATE';
        badge.className = `badge ${isEdit ? 'badge-warning' : 'badge-success-soft'}`;
      }

      const idLabel = byId('reg-id-sasaran');
      const editItem = getEditItem();
      if (idLabel) {
        idLabel.value = isEdit ? firstNonEmpty(editItem.id_sasaran, editItem.id) : '';
      }
    },

    resetForm() {
      const form = byId('registrasi-form');
      if (form) form.reset();

      this._currentDefinition = null;
      this._dynamicQuestions = [];
      this._currentFormId = '';

      uiSetHTML(
        'registrasi-dynamic-fields',
        '<p class="muted-text">Pilih jenis sasaran untuk memuat pertanyaan khusus.</p>'
      );

      const idEl = byId('reg-id-sasaran');
      if (idEl) idEl.value = '';
      this.unlockGenderField();
    },

    getScopeFromProfile() {
      const profile = getProfile();
      const scope = profile.scope_wilayah || profile.tim_wilayah_scope || profile.wilayah_scope || {};

      return {
        id_wilayah: firstNonEmpty(scope.id_wilayah, profile.id_wilayah, profile.id_wilayah_tugas),
        nama_kecamatan: firstNonEmpty(
          scope.kecamatan,
          scope.nama_kecamatan,
          profile.nama_kecamatan,
          profile.kecamatan
        ),
        nama_desa: firstNonEmpty(
          scope.desa_kelurahan,
          scope.nama_desa,
          scope.nama_desa_kelurahan,
          profile.nama_desa,
          profile.desa_kelurahan,
          profile.nama_desa_kelurahan
        ),
        nama_dusun: firstNonEmpty(
          scope.dusun_rw,
          scope.nama_dusun,
          scope.nama_dusun_rw,
          profile.nama_dusun,
          profile.dusun_rw,
          profile.nama_dusun_rw
        )
      };
    },

    async prefillScope() {
      const mode = getMode();
      const profileScope = this.getScopeFromProfile();
      const selected = getSelectedSasaran();
      const editItem = getEditItem();

      const kecamatan = mode === 'edit'
        ? firstNonEmpty(editItem.nama_kecamatan, editItem.kecamatan, profileScope.nama_kecamatan)
        : firstNonEmpty(profileScope.nama_kecamatan, selected.nama_kecamatan, selected.kecamatan);

      const desa = mode === 'edit'
        ? firstNonEmpty(editItem.nama_desa, editItem.desa_kelurahan, editItem.nama_desa_kelurahan, profileScope.nama_desa)
        : firstNonEmpty(profileScope.nama_desa, selected.nama_desa, selected.desa_kelurahan, selected.nama_desa_kelurahan);

      const dusun = mode === 'edit'
        ? firstNonEmpty(editItem.nama_dusun, editItem.dusun_rw, editItem.nama_dusun_rw, profileScope.nama_dusun)
        : firstNonEmpty(profileScope.nama_dusun, selected.nama_dusun, selected.dusun_rw, selected.nama_dusun_rw);

      uiSetValue('reg-kecamatan', kecamatan);
      uiSetValue('reg-desa', desa);
      uiSetValue('reg-dusun', dusun);

      this.lockScopeFields();
    },

    lockScopeFields() {
      setReadonly(byId('reg-kecamatan'), true);
      setReadonly(byId('reg-desa'), true);
      setReadonly(byId('reg-dusun'), true);
    },

    fillStaticForm(item) {
      const map = {
        'reg-id-sasaran': firstNonEmpty(item.id_sasaran, item.id),
        'reg-jenis-sasaran': firstNonEmpty(item.jenis_sasaran),
        'reg-nama-sasaran': firstNonEmpty(item.nama_sasaran, item.nama),
        'reg-nik': firstNonEmpty(item.nik_sasaran, item.nik),
        'reg-no-kk': firstNonEmpty(item.nomor_kk, item.no_kk),
        'reg-jenis-kelamin': firstNonEmpty(item.jenis_kelamin),
        'reg-tanggal-lahir': firstNonEmpty(item.tanggal_lahir, item.tgl_lahir),
        'reg-kecamatan': firstNonEmpty(item.nama_kecamatan, item.kecamatan),
        'reg-desa': firstNonEmpty(item.nama_desa, item.desa_kelurahan, item.nama_desa_kelurahan),
        'reg-dusun': firstNonEmpty(item.nama_dusun, item.dusun_rw, item.nama_dusun_rw),
        'reg-alamat': firstNonEmpty(item.alamat)
      };

      Object.keys(map).forEach((id) => {
        uiSetValue(id, map[id]);
      });
    },

    async handleJenisChange() {
      const jenis = byId('reg-jenis-sasaran') ? byId('reg-jenis-sasaran').value : '';
      await this.loadDynamicFields(jenis);
      this.updateConditionalDynamicFields();
      this.handleAnyFormChange();
    },

    async getRegistrasiFormDefinition(jenisSasaran) {
      const jenis = toUpper(jenisSasaran);
      const formId = mapJenisToFormId(jenis);
      const cacheKey = `${formId}:${jenis}`;

      if (DEFINITION_CACHE[cacheKey]) {
        return DEFINITION_CACHE[cacheKey];
      }

      let result = null;

      try {
        if (window.RegistrasiService && isFunction(window.RegistrasiService.getRegistrasiFormDefinition)) {
          result = await window.RegistrasiService.getRegistrasiFormDefinition(jenis);
        } else if (window.RegistrasiService && isFunction(window.RegistrasiService.getFormDefinition)) {
          result = await window.RegistrasiService.getFormDefinition(jenis);
        } else {
          result = await callApi('getRegistrasiFormDefinition', {
            jenis_sasaran: jenis,
            form_id: formId
          });
        }
      } catch (_) {
        result = await callApi('getRegistrasiFormDefinition', {
          jenis_sasaran: jenis,
          form_id: formId
        });
      }

      const data = result && result.data ? result.data : result;
      DEFINITION_CACHE[cacheKey] = data || {};
      return DEFINITION_CACHE[cacheKey];
    },

    async loadDynamicFields(jenisSasaran) {
      const jenis = toUpper(jenisSasaran);
      if (!jenis) {
        this._currentDefinition = null;
        this._dynamicQuestions = [];
        this._currentFormId = '';
        uiSetHTML(
          'registrasi-dynamic-fields',
          '<p class="muted-text">Pilih jenis sasaran untuk memuat pertanyaan khusus.</p>'
        );
        return;
      }

      let definition = {};
      try {
        definition = await this.getRegistrasiFormDefinition(jenis);
      } catch (err) {
        notify(err && err.message ? err.message : 'Gagal memuat pertanyaan registrasi.');
        definition = {};
      }

      const normalized = this.normalizeDefinition(definition, jenis);
      this._currentDefinition = normalized;
      this._dynamicQuestions = normalized.questions || [];
      this._currentFormId = normalized.form_id || mapJenisToFormId(jenis);

      this.renderDynamicFields(normalized.sections || []);
      this.applyGenderLockByJenis();
    },

    normalizeDefinition(definition, jenisSasaran) {
      const data = definition || {};
      const sections = Array.isArray(data.sections) ? data.sections : [];
      const fallbackQuestions = Array.isArray(data.questions) ? data.questions : [];
      const dynamicQuestions = [];
      const sectionMap = {};

      sections.forEach((section, sectionIndex) => {
        const normalizedSection = {
          section_id: safeTrim(section.section_id || `SEC-${sectionIndex + 1}`),
          section_label: safeTrim(section.section_label || section.label || ''),
          section_order: Number(section.section_order || (sectionIndex + 1)),
          questions: []
        };

        const sourceQuestions = Array.isArray(section.questions) ? section.questions : [];
        sourceQuestions.forEach((question, qIndex) => {
          const normalizedQuestion = this.normalizeQuestion(question, normalizedSection, qIndex);
          if (!normalizedQuestion) return;
          normalizedSection.questions.push(normalizedQuestion);
          dynamicQuestions.push(normalizedQuestion);
        });

        if (normalizedSection.questions.length) {
          sectionMap[normalizedSection.section_id] = normalizedSection;
        }
      });

      fallbackQuestions.forEach((question, qIndex) => {
        const normalizedQuestion = this.normalizeQuestion(question, null, qIndex);
        if (!normalizedQuestion) return;

        const sectionId = normalizedQuestion.section_id || 'SEC-DYNAMIC';
        if (!sectionMap[sectionId]) {
          sectionMap[sectionId] = {
            section_id: sectionId,
            section_label: safeTrim(normalizedQuestion.section_label || 'Data Khusus'),
            section_order: Number(normalizedQuestion.section_order || 999),
            questions: []
          };
        }

        const exists = sectionMap[sectionId].questions.some((q) => q.code === normalizedQuestion.code);
        if (!exists) {
          sectionMap[sectionId].questions.push(normalizedQuestion);
          dynamicQuestions.push(normalizedQuestion);
        }
      });

      const dynamicSections = Object.values(sectionMap)
        .map((section) => {
          section.questions.sort((a, b) => Number(a.question_order || 0) - Number(b.question_order || 0));
          return section;
        })
        .sort((a, b) => Number(a.section_order || 0) - Number(b.section_order || 0));

      return {
        form_id: safeTrim(firstNonEmpty(
          data.form_id,
          data.form && data.form.form_id,
          mapJenisToFormId(jenisSasaran)
        )),
        jenis_sasaran: jenisSasaran,
        sections: dynamicSections,
        questions: dynamicQuestions
      };
    },

    normalizeQuestion(question, section, qIndex) {
      const rawCode = firstNonEmpty(
        question.store_key,
        question.question_code,
        question.code,
        question.key,
        question.question_id
      );
      const code = toLowerSnake(rawCode);
      if (!code) return null;
      if (STATIC_CODES.has(code)) return null;

      const fieldTypeRaw = toLowerSnake(firstNonEmpty(question.field_type, question.type, 'text'));
      const fieldType = fieldTypeRaw === 'number' || fieldTypeRaw === 'integer' || fieldTypeRaw === 'decimal'
        ? 'number'
        : (fieldTypeRaw === 'textarea' ? 'textarea' : (fieldTypeRaw === 'date' ? 'date' : (fieldTypeRaw === 'select' ? 'select' : 'text')));

      return {
        question_id: safeTrim(question.question_id),
        code: code,
        label: safeTrim(firstNonEmpty(question.question_label, question.label, rawCode)),
        short_label: safeTrim(firstNonEmpty(question.question_short_label, question.short_label)),
        help_text: safeTrim(question.help_text),
        placeholder: safeTrim(question.placeholder),
        field_type: fieldType,
        data_type: toLowerSnake(question.data_type || ''),
        is_required: question.is_required === true || String(question.is_required).toUpperCase() === 'TRUE',
        validation_rule: safeTrim(question.validation_rule),
        visibility_rule: safeTrim(question.visibility_rule),
        requirement_rule: safeTrim(question.requirement_rule),
        readonly_rule: safeTrim(question.readonly_rule),
        default_value: firstNonEmpty(question.resolved_default_value, question.default_value),
        is_editable: question.is_editable_resolved !== undefined
          ? !!question.is_editable_resolved
          : !(question.is_editable === false || String(question.is_editable).toUpperCase() === 'FALSE'),
        section_id: safeTrim(firstNonEmpty(question.section_id, section && section.section_id)),
        section_label: safeTrim(firstNonEmpty(question.section_label, section && section.section_label)),
        section_order: Number(firstNonEmpty(question.section_order, section && section.section_order, 999)),
        question_order: Number(firstNonEmpty(question.question_order, qIndex + 1)),
        options: Array.isArray(question.options) ? question.options.map((opt, idx) => ({
          value: safeTrim(firstNonEmpty(opt.value, opt.option_value)),
          label: safeTrim(firstNonEmpty(opt.label, opt.option_label, opt.value, opt.option_value)),
          order: Number(firstNonEmpty(opt.order, opt.option_order, idx + 1))
        })) : [],
        rules: Array.isArray(question.rules) ? question.rules : []
      };
    },

    renderDynamicFields(sections) {
      const container = byId('registrasi-dynamic-fields');
      if (!container) return;

      if (!Array.isArray(sections) || !sections.length) {
        uiSetHTML(
          'registrasi-dynamic-fields',
          '<p class="muted-text">Tidak ada pertanyaan khusus untuk jenis sasaran ini.</p>'
        );
        return;
      }

      const html = sections.map((section) => {
        const items = (section.questions || []).map((question) => this.renderDynamicQuestion(question)).join('');
        return `
          <section class="dynamic-section" data-section-id="${escapeHtml(section.section_id)}">
            <div class="dynamic-section-header">${escapeHtml(section.section_label || 'Data Khusus')}</div>
            <div class="dynamic-section-body">
              ${items}
            </div>
          </section>
        `;
      }).join('');

      uiSetHTML('registrasi-dynamic-fields', html);

      this._dynamicQuestions.forEach((question) => {
        const el = this.findDynamicInput(question.code);
        if (!el) return;

        if (question.default_value && !el.value) {
          el.value = question.default_value;
        }

        if (!question.is_editable) {
          setReadonly(el, true);
        }

        const listener = () => {
          this.updateConditionalDynamicFields();
          this.handleAnyFormChange();
        };

        el.addEventListener('change', listener);
        el.addEventListener('input', listener);
      });

      this.updateConditionalDynamicFields();
    },

    renderDynamicQuestion(question) {
      const code = question.code;
      const value = escapeHtml(firstNonEmpty(question.default_value, ''));
      const label = escapeHtml(question.label || code);
      const placeholder = escapeHtml(question.placeholder || question.help_text || '');
      const requiredMark = question.is_required ? ' *' : '';
      const help = question.help_text ? `<div class="form-help-text">${escapeHtml(question.help_text)}</div>` : '';

      let inputHtml = '';

      if (question.field_type === 'textarea') {
        inputHtml = `
          <textarea
            id="dyn-${escapeHtml(code)}"
            data-reg-question-code="${escapeHtml(code)}"
            rows="3"
            placeholder="${placeholder}"
          >${value}</textarea>
        `;
      } else if (question.field_type === 'select') {
        const options = (question.options || [])
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
          .map((opt) => `
            <option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>
          `).join('');

        inputHtml = `
          <select
            id="dyn-${escapeHtml(code)}"
            data-reg-question-code="${escapeHtml(code)}"
          >
            <option value="">Pilih</option>
            ${options}
          </select>
        `;
      } else {
        inputHtml = `
          <input
            id="dyn-${escapeHtml(code)}"
            data-reg-question-code="${escapeHtml(code)}"
            type="${question.field_type === 'date' ? 'date' : (question.field_type === 'number' ? 'number' : 'text')}"
            value="${value}"
            placeholder="${placeholder}"
            ${question.field_type === 'number' ? 'step="any"' : ''}
          />
        `;
      }

      return `
        <div class="dynamic-field-card" data-question-code="${escapeHtml(code)}">
          <div class="form-group">
            <label for="dyn-${escapeHtml(code)}">${label}${requiredMark}</label>
            ${inputHtml}
            ${help}
          </div>
        </div>
      `;
    },

    findDynamicInput(code) {
      const container = byId('registrasi-dynamic-fields');
      if (!container || !code) return null;
      return container.querySelector(`[data-reg-question-code="${code}"]`);
    },

    fillDynamicFields(values) {
      const data = values || {};
      this._dynamicQuestions.forEach((question) => {
        const el = this.findDynamicInput(question.code);
        if (!el) return;
        const val = firstNonEmpty(
          data[question.code],
          data[question.code.toUpperCase()],
          question.default_value
        );
        if (val !== '') {
          el.value = val;
        }
      });
      this.updateConditionalDynamicFields();
    },

    collectDynamicFields() {
      const out = {};
      this._dynamicQuestions.forEach((question) => {
        const el = this.findDynamicInput(question.code);
        if (!el) return;
        out[question.code] = el.value == null ? '' : el.value;
      });
      return out;
    },

    getCurrentAnswersMap() {
      const dynamic = this.collectDynamicFields();
      const map = deepMergeObject(dynamic, {
        jenis_sasaran: safeTrim(byId('reg-jenis-sasaran') && byId('reg-jenis-sasaran').value),
        nama_sasaran: safeTrim(byId('reg-nama-sasaran') && byId('reg-nama-sasaran').value),
        nik_sasaran: safeTrim(byId('reg-nik') && byId('reg-nik').value),
        nomor_kk: safeTrim(byId('reg-no-kk') && byId('reg-no-kk').value),
        jenis_kelamin: safeTrim(byId('reg-jenis-kelamin') && byId('reg-jenis-kelamin').value),
        tanggal_lahir: safeTrim(byId('reg-tanggal-lahir') && byId('reg-tanggal-lahir').value),
        nama_kecamatan: safeTrim(byId('reg-kecamatan') && byId('reg-kecamatan').value),
        kecamatan: safeTrim(byId('reg-kecamatan') && byId('reg-kecamatan').value),
        desa_kelurahan: safeTrim(byId('reg-desa') && byId('reg-desa').value),
        dusun_rw: safeTrim(byId('reg-dusun') && byId('reg-dusun').value),
        alamat: safeTrim(byId('reg-alamat') && byId('reg-alamat').value)
      });

      return map;
    },

    updateConditionalDynamicFields() {
      const container = byId('registrasi-dynamic-fields');
      if (!container) return;

      const answers = this.getCurrentAnswersMap();

      this._dynamicQuestions.forEach((question) => {
        const card = container.querySelector(`[data-question-code="${question.code}"]`);
        const input = this.findDynamicInput(question.code);
        if (!card || !input) return;

        const visible = this.isQuestionVisible(question, answers);
        const required = visible && this.isQuestionRequired(question, answers);

        card.classList.toggle('hidden', !visible);

        if (!visible) {
          input.value = '';
        }

        if (required) {
          input.setAttribute('required', 'required');
        } else {
          input.removeAttribute('required');
        }

        if (!question.is_editable) {
          setReadonly(input, true);
        }
      });
    },

    isQuestionVisible(question, answers) {
      if (!question) return true;

      const rules = Array.isArray(question.rules) ? question.rules : [];
      const showRules = rules.filter((r) => toUpper(r.rule_type) === 'VISIBILITY' && toUpper(r.action) === 'SHOW');

      if (showRules.length) {
        return showRules.some((rule) => this.evaluateRule(rule, answers));
      }

      if (question.visibility_rule) {
        return this.evaluateNamedRule(question.visibility_rule, answers);
      }

      return true;
    },

    isQuestionRequired(question, answers) {
      let required = !!question.is_required;
      const rules = Array.isArray(question.rules) ? question.rules : [];
      const reqRules = rules.filter((r) => toUpper(r.rule_type) === 'REQUIREMENT');

      if (reqRules.length) {
        required = required || reqRules.some((rule) => this.evaluateRule(rule, answers));
      }

      if (question.requirement_rule) {
        required = required || this.evaluateNamedRule(question.requirement_rule, answers);
      }

      return required;
    },

    evaluateRule(rule, answers) {
      const triggerField = toLowerSnake(firstNonEmpty(rule.trigger_field));
      const operator = toUpper(rule.operator);
      const triggerValue = safeTrim(rule.trigger_value);
      const actual = safeTrim(firstNonEmpty(
        answers[triggerField],
        answers[toUpper(triggerField)]
      ));

      if (operator === 'EQ' || operator === 'EQ_ANY') {
        return actual === triggerValue;
      }

      if (operator === 'NE') {
        return actual !== triggerValue;
      }

      if (operator === 'IN') {
        return triggerValue.split('|').map((v) => safeTrim(v)).includes(actual);
      }

      if (operator === 'NOT_EMPTY') {
        return isRequired(actual);
      }

      return false;
    },

    evaluateNamedRule(ruleName, answers) {
      const name = toUpper(ruleName);

      if (name === 'VIS_IF_SUMBER_AIR_LAINNYA' || name === 'REQ_IF_SUMBER_AIR_LAINNYA') {
        return toUpper(answers.sumber_air_minum_utama) === 'LAINNYA';
      }

      if (name === 'VIS_IF_BAB_YA_LAINNYA' || name === 'REQ_IF_BAB_YA_LAINNYA') {
        return toUpper(answers.fasilitas_bab) === 'YA_LAINNYA';
      }

      return false;
    },

    applyGenderLockByJenis() {
      const jenis = toUpper(byId('reg-jenis-sasaran') && byId('reg-jenis-sasaran').value);
      const el = byId('reg-jenis-kelamin');
      if (!el) return;

      if (jenis === 'BUMIL' || jenis === 'BUFAS') {
        el.value = 'P';
        setReadonly(el, true);
      } else {
        this.unlockGenderField();
      }
    },

    unlockGenderField() {
      const el = byId('reg-jenis-kelamin');
      if (!el) return;
      setReadonly(el, false);
    },

    collectFormData() {
      const mode = getMode();
      const profile = getProfile();
      const profileScope = this.getScopeFromProfile();
      const editItem = getEditItem();
      const localDraft = loadDraftLocal();
      const localDraftData = localDraft && localDraft.data ? localDraft.data : {};

      const answers = {
        jenis_sasaran: safeTrim(byId('reg-jenis-sasaran') && byId('reg-jenis-sasaran').value),
        nama_sasaran: safeTrim(byId('reg-nama-sasaran') && byId('reg-nama-sasaran').value),
        nik_sasaran: safeTrim(byId('reg-nik') && byId('reg-nik').value),
        nomor_kk: safeTrim(byId('reg-no-kk') && byId('reg-no-kk').value),
        jenis_kelamin: safeTrim(byId('reg-jenis-kelamin') && byId('reg-jenis-kelamin').value),
        tanggal_lahir: safeTrim(byId('reg-tanggal-lahir') && byId('reg-tanggal-lahir').value),
        nama_kecamatan: safeTrim(byId('reg-kecamatan') && byId('reg-kecamatan').value),
        desa_kelurahan: safeTrim(byId('reg-desa') && byId('reg-desa').value),
        dusun_rw: safeTrim(byId('reg-dusun') && byId('reg-dusun').value),
        alamat: safeTrim(byId('reg-alamat') && byId('reg-alamat').value)
      };

      Object.assign(answers, this.collectDynamicFields());

      return {
        id_sasaran: firstNonEmpty(
          byId('reg-id-sasaran') && byId('reg-id-sasaran').value,
          editItem.id_sasaran,
          editItem.id
        ),
        form_id: this._currentFormId || mapJenisToFormId(answers.jenis_sasaran),
        answers: answers,
        id_tim: firstNonEmpty(profile.id_tim),
        nama_tim: firstNonEmpty(profile.nama_tim, profile.nomor_tim, profile.id_tim),
        id_wilayah: firstNonEmpty(profileScope.id_wilayah),
        client_submit_id: mode === 'create'
          ? ensureClientSubmitId(localDraftData.client_submit_id)
          : '',
        sync_source: 'ONLINE'
      };
    },

    validate(data) {
      const issues = [];
      const mode = getMode();
      const jenis = toUpper(data.answers.jenis_sasaran);
      const answers = this.getCurrentAnswersMap();

      if (mode === 'edit' && !isRequired(data.id_sasaran)) {
        issues.push({ type: 'error', text: 'ID sasaran tidak ditemukan untuk proses edit.' });
      }

      if (!isRequired(data.answers.jenis_sasaran)) {
        issues.push({ type: 'error', text: 'Jenis sasaran wajib dipilih.' });
      }

      if (!isRequired(data.answers.nama_sasaran)) {
        issues.push({ type: 'error', text: 'Nama sasaran wajib diisi.' });
      }

      if (!isNikOrKK16(data.answers.nik_sasaran)) {
        issues.push({ type: 'error', text: 'NIK harus 16 digit angka.' });
      }

      if (!isNikOrKK16(data.answers.nomor_kk)) {
        issues.push({ type: 'error', text: 'Nomor KK harus 16 digit angka.' });
      }

      if (data.answers.nik_sasaran === PLACEHOLDER_16) {
        issues.push({ type: 'warn', text: 'NIK menggunakan placeholder 16 digit angka 9.' });
      }

      if (data.answers.nomor_kk === PLACEHOLDER_16) {
        issues.push({ type: 'warn', text: 'Nomor KK menggunakan placeholder 16 digit angka 9.' });
      }

      if (!isRequired(data.answers.jenis_kelamin)) {
        issues.push({ type: 'warn', text: 'Jenis kelamin belum dipilih.' });
      }

      if (!isRequired(data.answers.tanggal_lahir)) {
        issues.push({ type: 'error', text: 'Tanggal lahir wajib diisi.' });
      } else if (!isDateNotFuture(data.answers.tanggal_lahir)) {
        issues.push({ type: 'error', text: 'Tanggal lahir tidak boleh melebihi hari ini.' });
      } else {
        const ageYears = calcAgeYears(data.answers.tanggal_lahir);
        const ageMonths = calcAgeMonths(data.answers.tanggal_lahir);

        if (jenis === 'BADUTA' && ageMonths != null && ageMonths > 24) {
          issues.push({ type: 'error', text: 'Usia BADUTA tidak boleh lebih dari 24 bulan.' });
        }

        if (jenis === 'BUMIL' || jenis === 'BUFAS') {
          if (toUpper(data.answers.jenis_kelamin) !== 'P') {
            issues.push({ type: 'error', text: `${jenis} wajib berjenis kelamin Perempuan.` });
          }
          if (ageYears != null && ageYears > 55) {
            issues.push({ type: 'error', text: `${jenis} tidak boleh berusia di atas 55 tahun.` });
          }
        }
      }

      if (!isRequired(data.answers.nama_kecamatan)) {
        issues.push({ type: 'warn', text: 'Kecamatan belum terisi.' });
      }

      if (!isRequired(data.answers.desa_kelurahan)) {
        issues.push({ type: 'warn', text: 'Desa/Kelurahan belum terisi.' });
      }

      if (!isRequired(data.answers.dusun_rw)) {
        issues.push({ type: 'warn', text: 'Dusun/RW belum terisi.' });
      }

      if (!isRequired(data.answers.alamat)) {
        issues.push({ type: 'warn', text: 'Alamat lengkap belum terisi.' });
      }

      this._dynamicQuestions.forEach((question) => {
        const visible = this.isQuestionVisible(question, answers);
        const required = visible && this.isQuestionRequired(question, answers);
        const value = firstNonEmpty(answers[question.code]);

        if (required && !isRequired(value)) {
          issues.push({
            type: 'error',
            text: `${question.label} wajib diisi.`
          });
        }

        if (!visible) return;

        if (question.code === 'sumber_air_minum_utama_lainnya' && toUpper(answers.sumber_air_minum_utama) === 'LAINNYA' && !isRequired(value)) {
          issues.push({ type: 'error', text: 'Sumber air minum lainnya wajib diisi.' });
        }

        if (question.code === 'fasilitas_bab_lainnya' && toUpper(answers.fasilitas_bab) === 'YA_LAINNYA' && !isRequired(value)) {
          issues.push({ type: 'error', text: 'Fasilitas BAB lainnya wajib diisi.' });
        }

        if (question.code === 'nama_ibu_kandung' && jenis === 'BADUTA' && !isRequired(value)) {
          issues.push({ type: 'error', text: 'Nama ibu kandung wajib diisi untuk BADUTA.' });
        }

        if ((question.field_type === 'number' || question.data_type === 'integer' || question.data_type === 'decimal') && isRequired(value) && Number.isNaN(Number(value))) {
          issues.push({ type: 'error', text: `${question.label} harus berupa angka.` });
        }

        if ((question.field_type === 'date' || question.data_type === 'date') && isRequired(value) && !isDateNotFuture(value)) {
          issues.push({ type: 'error', text: `${question.label} tidak boleh melebihi hari ini.` });
        }
      });

      if (!issues.some((item) => item.type === 'error')) {
        issues.push({
          type: 'ok',
          text: mode === 'edit'
            ? 'Validasi edit sasaran lolos. Perubahan siap disimpan.'
            : 'Validasi registrasi sasaran lolos. Data siap dikirim.'
        });
      }

      return issues;
    },

    renderValidation() {
      const box = byId('registrasi-validation-box');
      if (!box) return;

      const data = this.collectFormData();
      const issues = this.validate(data);

      const html = `
        <ul class="validation-list">
          ${issues.map((issue) => `
            <li class="validation-item-${issue.type}">
              ${escapeHtml(issue.text)}
            </li>
          `).join('')}
        </ul>
      `;

      uiSetHTML('registrasi-validation-box', html);
    },

    tryLoadDraft() {
      if (getMode() !== 'create') return;

      const draft = loadDraftLocal();
      if (!draft || !draft.data) return;

      const draftData = draft.data;
      const answers = draftData.answers || {};

      uiSetValue('reg-jenis-sasaran', firstNonEmpty(answers.jenis_sasaran, draftData.jenis_sasaran));
      uiSetValue('reg-nama-sasaran', firstNonEmpty(answers.nama_sasaran, draftData.nama_sasaran));
      uiSetValue('reg-nik', firstNonEmpty(answers.nik_sasaran, draftData.nik_sasaran, draftData.nik));
      uiSetValue('reg-no-kk', firstNonEmpty(answers.nomor_kk, draftData.nomor_kk));
      uiSetValue('reg-jenis-kelamin', firstNonEmpty(answers.jenis_kelamin, draftData.jenis_kelamin));
      uiSetValue('reg-tanggal-lahir', firstNonEmpty(answers.tanggal_lahir, draftData.tanggal_lahir));
      uiSetValue('reg-kecamatan', firstNonEmpty(answers.nama_kecamatan, answers.kecamatan, draftData.nama_kecamatan));
      uiSetValue('reg-desa', firstNonEmpty(answers.desa_kelurahan, draftData.nama_desa, draftData.desa_kelurahan));
      uiSetValue('reg-dusun', firstNonEmpty(answers.dusun_rw, draftData.nama_dusun, draftData.dusun_rw));
      uiSetValue('reg-alamat', firstNonEmpty(answers.alamat, draftData.alamat));

      const jenis = firstNonEmpty(answers.jenis_sasaran, draftData.jenis_sasaran);
      if (!jenis) {
        this.renderValidation();
        return;
      }

      this.loadDynamicFields(jenis)
        .then(() => {
          this.fillDynamicFields(answers);
          this.applyGenderLockByJenis();
          this.renderValidation();
        })
        .catch(() => {
          this.renderValidation();
        });
    },

    autosaveDraft() {
      if (getMode() !== 'create') return;
      const data = this.collectFormData();
      saveDraftLocal(data);
    },

    handleAnyFormChange() {
      this.autosaveDraft();
      this.renderValidation();
    },

    buildPayload(data, mode) {
      const payload = {
        form_id: data.form_id || mapJenisToFormId(data.answers.jenis_sasaran),
        jenis_sasaran: data.answers.jenis_sasaran,
        answers: Object.assign({}, data.answers),
        sync_source: 'ONLINE'
      };

      if (mode === 'edit') {
        payload.id_sasaran = data.id_sasaran;
      } else {
        payload.client_submit_id = data.client_submit_id;
      }

      return payload;
    },

    async submit() {
      const mode = getMode();
      const editItem = getEditItem();
      const data = this.collectFormData();
      const issues = this.validate(data);
      const hasError = issues.some((item) => item.type === 'error');

      this.renderValidation();

      if (hasError) {
        notify('Periksa kembali form registrasi.');
        return;
      }

      const payload = this.buildPayload(data, mode);
      uiSetLoading('btn-submit-registrasi', true, mode === 'edit' ? 'Menyimpan...' : 'Mengirim...');

      try {
        if (!navigator.onLine && mode === 'edit') {
          notify('Edit data sasaran hanya dapat dilakukan saat online.');
          return;
        }

        if (!navigator.onLine && mode === 'create') {
          const queued = enqueueOfflineRegistrasi(payload);
          if (queued) {
            saveDraftLocal(payload);
            notify('Sedang offline. Registrasi disimpan ke draft sinkronisasi.');
          } else {
            notify('Gagal menyimpan draft registrasi offline.');
          }
          return;
        }

        let result = null;

        if (mode === 'edit') {
          if (window.RegistrasiService && isFunction(window.RegistrasiService.updateSasaran)) {
            result = await window.RegistrasiService.updateSasaran(payload);
          } else {
            result = await callApi('updateSasaran', payload);
          }
        } else {
          if (window.RegistrasiService && isFunction(window.RegistrasiService.registerSasaran)) {
            result = await window.RegistrasiService.registerSasaran(payload);
          } else if (window.RegistrasiService && isFunction(window.RegistrasiService.submitRegistrasi)) {
            result = await window.RegistrasiService.submitRegistrasi(payload);
          } else {
            result = await callApi('registerSasaran', payload);
          }
        }

        if (!result || result.ok !== true) {
          throw new Error(extractErrorMessage(result, 'Gagal menyimpan data sasaran.'));
        }

        clearDraftLocal();
        clearEditItem();
        clearReturnRoute();
        setMode('create');

        this.resetForm();
        this.applyModeUI();
        await this.prefillScope();
        this.renderValidation();

        if (window.SasaranList && isFunction(window.SasaranList.loadAndRender)) {
          await window.SasaranList.loadAndRender();
        }

        const targetId = firstNonEmpty(
          payload.id_sasaran,
          editItem.id_sasaran,
          editItem.id,
          result && result.data && result.data.id_sasaran
        );

        if (mode === 'edit') {
          if (window.SasaranDetail && isFunction(window.SasaranDetail.openById) && targetId) {
            await window.SasaranDetail.openById(targetId);
          } else {
            goToSasaranList();
          }
          notify('Perubahan data sasaran berhasil disimpan.', 'success');
        } else {
          goToSasaranList();
          notify('Registrasi sasaran berhasil disimpan.', 'success');
        }
      } catch (err) {
        if (mode === 'create') {
          saveDraftLocal(payload);
        }
        notify(err && err.message ? err.message : 'Terjadi kesalahan saat menyimpan data.');
      } finally {
        uiSetLoading('btn-submit-registrasi', false);
      }
    },

    async handleBack() {
      const mode = getMode();
      const editItem = getEditItem();
      const targetId = firstNonEmpty(editItem.id_sasaran, editItem.id);
      const returnRoute = readReturnRoute();

      clearReturnRoute();

      if (mode === 'edit' && window.SasaranDetail && isFunction(window.SasaranDetail.openById) && targetId) {
        await window.SasaranDetail.openById(targetId);
        return;
      }

      if (returnRoute === 'sasaranList') {
        goToSasaranList();
        return;
      }

      if (returnRoute === 'sasaranDetail' && window.SasaranDetail && isFunction(window.SasaranDetail.openById) && targetId) {
        await window.SasaranDetail.openById(targetId);
        return;
      }

      goToDashboard();
    }
  };

  window.RegistrasiForm = RegistrasiForm;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.RegistrasiForm.init();
    });
  } else {
    window.RegistrasiForm.init();
  }
})(window, document);
