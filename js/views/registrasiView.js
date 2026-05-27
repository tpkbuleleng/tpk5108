(function (window, document) {
  'use strict';

  const REG_DRAFT_KEY = 'tpk_registrasi_draft_v_final';
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

  function humanizeOptionLabel(value) {
    const raw = safeTrim(value);
    if (!raw) return '';

    return raw
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getOptionDisplayLabel(option) {
    const opt = option || {};
    const explicit = safeTrim(firstNonEmpty(opt.label, opt.option_label, opt.text, opt.display));
    const value = safeTrim(firstNonEmpty(opt.value, opt.option_value));
    const chosen = explicit || value;
    return humanizeOptionLabel(chosen || value);
  }

  function lockJenisSasaranForEdit() {
    const jenisEl = byId('reg-jenis-sasaran');
    if (!jenisEl) return;

    const isEdit = getMode() === 'edit';
    setReadonly(jenisEl, isEdit);
    jenisEl.classList.toggle('is-locked', isEdit);
    jenisEl.setAttribute('aria-readonly', isEdit ? 'true' : 'false');
    jenisEl.setAttribute('data-locked-edit', isEdit ? '1' : '0');

    if (isEdit) {
      const editItem = getEditItem() || {};
      const existingJenis = firstNonEmpty(editItem.jenis_sasaran, jenisEl.value);
      if (existingJenis) jenisEl.value = existingJenis;
    }
  }

  function buildCatinDataPasanganCompat(answers) {
    const src = answers || {};
    const manual = safeTrim(firstNonEmpty(src.data_pasangan));
    if (manual) return manual;

    const nama = safeTrim(src.nama_pasangan);
    const nik = safeTrim(src.nik_pasangan).replace(/\D+/g, '').slice(0, 16);
    const parts = [];

    if (nama) parts.push(`Nama: ${nama}`);
    if (nik) parts.push(`NIK: ${nik}`);

    return parts.join(' | ');
  }

  function buildCatinDomisiliCompat(answers) {
    const src = answers || {};
    const manual = safeTrim(firstNonEmpty(src.domisili_setelah_menikah));
    if (manual) return manual;

    return [
      src.kabupaten_asal_pasangan,
      src.kecamatan_asal_pasangan,
      src.desa_asal_pasangan,
      src.dusun_asal_pasangan
    ].map(safeTrim).filter(Boolean).join(' / ');
  }

  function normalizeKehamilanDiinginkanCompat(value) {
    const raw = safeTrim(value);
    if (!raw) return '';

    const key = toLowerSnake(raw);
    const map = {
      ya_ingin_hamil_segera: 'Ya, ingin hamil segera',
      tidak_ingin_hamil_nanti: 'Tidak, ingin hamil nanti',
      tidak_ingin_hamil_lagi: 'Tidak, ingin hamil lagi',
      ya_ingin_hamil_segera_: 'Ya, ingin hamil segera',
      tidak__ingin_hamil_nanti: 'Tidak, ingin hamil nanti',
      tidak__ingin_hamil_lagi: 'Tidak, ingin hamil lagi'
    };

    return map[key] || raw;
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

  async function openSasaranDetailById(idSasaran) {
    const targetId = safeTrim(idSasaran);
    if (!targetId) return false;

    if (window.SasaranDetail && isFunction(window.SasaranDetail.openById)) {
      await window.SasaranDetail.openById(targetId);
      return true;
    }

    if (window.SasaranDetailView && isFunction(window.SasaranDetailView.openById)) {
      await window.SasaranDetailView.openById(targetId);
      return true;
    }

    if (window.SasaranDetailView && isFunction(window.SasaranDetailView.open)) {
      await window.SasaranDetailView.open(targetId, { skipRoute: false });
      return true;
    }

    if (window.Router && isFunction(window.Router.go)) {
      window.Router.go('sasaranDetail');
      return true;
    }

    return false;
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

  function isNetworkLikeError(err) {
    const msg = String((err && err.message) || err || '').toLowerCase();
    return !navigator.onLine ||
      msg.indexOf('koneksi') >= 0 ||
      msg.indexOf('network') >= 0 ||
      msg.indexOf('fetch') >= 0 ||
      msg.indexOf('batas waktu') >= 0 ||
      msg.indexOf('timeout') >= 0 ||
      msg.indexOf('cors') >= 0 ||
      msg.indexOf('failed') >= 0;
  }

  async function enqueueOfflineRegistrasi(payload) {
    const safePayload = Object.assign({}, payload || {}, { sync_source: 'OFFLINE_QUEUE' });

    const manager = getDraftManager();
    if (manager && isFunction(manager.enqueueOfflineRegistrasi)) {
      await manager.enqueueOfflineRegistrasi(safePayload);
      return true;
    }

    if (window.QueueRepo && isFunction(window.QueueRepo.enqueue)) {
      await window.QueueRepo.enqueue('registerSasaran', safePayload, {
        entity_type: 'SASARAN',
        client_submit_id: safePayload.client_submit_id || '',
        sync_source: 'OFFLINE_QUEUE'
      });
      return true;
    }

    try {
      const key = 'tpk_sync_queue_v1';
      const raw = safeJsonParse(localStorage.getItem(key), []);
      const queue = Array.isArray(raw) ? raw : [];
      queue.push({
        id: safePayload.client_submit_id || ensureClientSubmitId(''),
        action: 'registerSasaran',
        created_at: new Date().toISOString(),
        sync_status: 'PENDING',
        status: 'PENDING',
        payload: safePayload
      });
      localStorage.setItem(key, JSON.stringify(queue));
      if (window.AppState && isFunction(window.AppState.setSyncQueue)) {
        window.AppState.setSyncQueue(queue);
      }
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

      lockJenisSasaranForEdit();
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
      lockJenisSasaranForEdit();
    },

    async handleJenisChange() {
      if (getMode() === 'edit') {
        lockJenisSasaranForEdit();
        this.applyGenderLockByJenis();
        this.applyJenisSpecificStaticFields();
        this.renderValidation();
        return;
      }

      const jenis = byId('reg-jenis-sasaran') ? byId('reg-jenis-sasaran').value : '';
      await this.loadDynamicFields(jenis);
      this.updateConditionalDynamicFields();
      this.handleAnyFormChange();
    },

    async getRegistrasiFormDefinition(jenisSasaran, options) {
      const jenis = toUpper(jenisSasaran);
      const formId = mapJenisToFormId(jenis);
      const cacheKey = `${formId}:${jenis}`;
      const opts = options || {};
      if (!jenis) return {};
      if (DEFINITION_CACHE[cacheKey] && opts.forceRefresh !== true) {
        try {
          Object.defineProperty(DEFINITION_CACHE[cacheKey], '__frontend_cache_hit', { value: true, configurable: true, enumerable: false });
          Object.defineProperty(DEFINITION_CACHE[cacheKey], '__frontend_api_perf', { value: { api_ms: 0, local_cache_hit: true, backend_cached: false, cache_status: 'memory_hit' }, configurable: true, enumerable: false });
        } catch (_) {}
        return DEFINITION_CACHE[cacheKey];
      }
      let result = null;
      const apiStart = (window.performance && performance.now) ? performance.now() : Date.now();
      try {
        const api = getApi();
        if (api && isFunction(api.getRegistrasiFormDefinition)) {
          result = await api.getRegistrasiFormDefinition({ jenis_sasaran: jenis, form_id: formId, module: 'REGISTRASI' }, { cacheFirst: true, cacheTtlMs: opts.cacheTtlMs, forceRefresh: opts.forceRefresh === true, prefetch: opts.prefetch === true, timeoutMs: opts.timeoutMs || 30000 });
        } else if (window.RegistrasiService && isFunction(window.RegistrasiService.getRegistrasiFormDefinition)) {
          result = await window.RegistrasiService.getRegistrasiFormDefinition(jenis);
        } else if (window.RegistrasiService && isFunction(window.RegistrasiService.getFormDefinition)) {
          result = await window.RegistrasiService.getFormDefinition(jenis);
        } else {
          result = await callApi('getRegistrasiFormDefinition', { jenis_sasaran: jenis, form_id: formId, module: 'REGISTRASI' });
        }
      } catch (_) {
        result = await callApi('getRegistrasiFormDefinition', { jenis_sasaran: jenis, form_id: formId, module: 'REGISTRASI' });
      }
      const apiEnd = (window.performance && performance.now) ? performance.now() : Date.now();
      if (result && result.ok === false) throw new Error(result.message || 'Gagal memuat definisi form registrasi.');
      const data = result && result.data ? result.data : (result || {});
      const meta = result && result.meta ? result.meta : (data && data.meta ? data.meta : {});
      if (data && typeof data === 'object') {
        try {
          Object.defineProperty(data, '__meta', { value: meta || {}, configurable: true, enumerable: false });
          Object.defineProperty(data, '__frontend_api_perf', { value: { api_ms: Math.round(apiEnd - apiStart), local_cache_hit: !!(meta && (meta.local_cache_hit || meta.offline_cache || meta.cache_source === 'local_form_definition_cache')), backend_cached: !!(meta && meta.cached), cache_put_ok: meta && Object.prototype.hasOwnProperty.call(meta, 'cache_put_ok') ? !!meta.cache_put_ok : undefined, cache_status: meta && meta.local_cache_hit ? 'local_hit' : (meta && meta.cached ? 'backend_hit' : 'network_fetch') }, configurable: true, enumerable: false });
        } catch (_) {
          data.__meta = meta || {};
          data.__frontend_api_perf = { api_ms: Math.round(apiEnd - apiStart), local_cache_hit: !!(meta && (meta.local_cache_hit || meta.offline_cache)), backend_cached: !!(meta && meta.cached) };
        }
      }
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
        min_value: firstNonEmpty(question.min_value, ''),
        max_value: firstNonEmpty(question.max_value, ''),
        options: Array.isArray(question.options) ? question.options.map((opt, idx) => {
          const value = safeTrim(firstNonEmpty(opt.value, opt.option_value));
          return {
            value: value,
            label: getOptionDisplayLabel(opt) || humanizeOptionLabel(value),
            order: Number(firstNonEmpty(opt.order, opt.option_order, idx + 1))
          };
        }) : [],
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
          .map((opt) => {
            const valueRaw = firstNonEmpty(opt.value, opt.option_value);
            const labelRaw = getOptionDisplayLabel(opt) || humanizeOptionLabel(valueRaw);
            return `
            <option value="${escapeHtml(valueRaw)}">${escapeHtml(labelRaw)}</option>
          `;
          }).join('');

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
        const minAttr = (question.min_value !== undefined && question.min_value !== null && question.min_value !== '') ? `min="${escapeHtml(question.min_value)}"` : '';
        const maxAttr = (question.max_value !== undefined && question.max_value !== null && question.max_value !== '') ? `max="${escapeHtml(question.max_value)}"` : '';
        const stepAttr = question.field_type === 'number'
          ? `step="${question.data_type === 'integer' ? '1' : 'any'}"`
          : '';
        inputHtml = `
          <input
            id="dyn-${escapeHtml(code)}"
            data-reg-question-code="${escapeHtml(code)}"
            type="${question.field_type === 'date' ? 'date' : (question.field_type === 'number' ? 'number' : 'text')}"
            value="${value}"
            placeholder="${placeholder}"
            ${minAttr}
            ${maxAttr}
            ${stepAttr}
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

      if (mode === 'edit') {
        answers.jenis_sasaran = firstNonEmpty(editItem.jenis_sasaran, answers.jenis_sasaran);
      }

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

        if (isRequired(value) && !Number.isNaN(Number(value))) {
          const numericValue = Number(value);
          if (question.code === 'berat_badan_sebelum_hamil' && (numericValue < 25 || numericValue > 200)) {
            issues.push({ type: 'error', text: 'Berat Badan Sebelum Hamil harus antara 25 sampai 200 Kg.' });
          }
          if (question.code === 'berat_badan_lahir' && (numericValue < 0.5 || numericValue > 6)) {
            issues.push({ type: 'error', text: 'Berat Badan Lahir harus antara 0,5 sampai 6 Kg.' });
          }
          if (question.code === 'panjang_badan_lahir' && (numericValue < 20 || numericValue > 70)) {
            issues.push({ type: 'error', text: 'Panjang Badan Lahir harus antara 20 sampai 70 Cm.' });
          }
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
      const lockedJenis = mode === 'edit'
        ? firstNonEmpty(getEditItem().jenis_sasaran, data.answers.jenis_sasaran)
        : data.answers.jenis_sasaran;

      const normalizedAnswers = Object.assign({}, data.answers, {
        jenis_sasaran: lockedJenis
      });

      if (safeTrim(normalizedAnswers.berat_badan_sebelum_hamil) && !safeTrim(normalizedAnswers.bb_sebelum_hamil)) {
        normalizedAnswers.bb_sebelum_hamil = safeTrim(normalizedAnswers.berat_badan_sebelum_hamil);
      }

      if (toUpper(lockedJenis) === 'CATIN') {
        if (!safeTrim(normalizedAnswers.data_pasangan)) {
          normalizedAnswers.data_pasangan = buildCatinDataPasanganCompat(normalizedAnswers);
        }
        if (!safeTrim(normalizedAnswers.domisili_setelah_menikah)) {
          normalizedAnswers.domisili_setelah_menikah = buildCatinDomisiliCompat(normalizedAnswers);
        }
      }

      if (toUpper(lockedJenis) === 'BUMIL') {
        normalizedAnswers.kehamilan_diinginkan = normalizeKehamilanDiinginkanCompat(
          normalizedAnswers.kehamilan_diinginkan
        );
      }

      const payload = {
        form_id: data.form_id || mapJenisToFormId(lockedJenis),
        jenis_sasaran: lockedJenis,
        answers: normalizedAnswers,
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
          const queued = await enqueueOfflineRegistrasi(payload);
          if (queued) {
            saveDraftLocal(payload);
            notify('Sedang offline. Registrasi disimpan ke draft sinkronisasi.');
            if (window.Router && isFunction(window.Router.go)) {
              window.Router.go('sync');
            }
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
          const opened = await openSasaranDetailById(targetId);
          if (!opened) {
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
          if (isNetworkLikeError(err)) {
            try {
              const queuedAfterFailure = await enqueueOfflineRegistrasi(payload);
              if (queuedAfterFailure) {
                notify('Koneksi tidak stabil. Registrasi disimpan ke antrean sinkronisasi.', 'warning');
                if (window.Router && isFunction(window.Router.go)) {
                  window.Router.go('sync');
                }
                return;
              }
            } catch (_) {}
          }
        }
        notify(err && err.message ? err.message : 'Terjadi kesalahan saat menyimpan data.');
      } finally {
        uiSetLoading('btn-submit-registrasi', false);
      }
    },

    async handleBack() {
      const mode = getMode();
      const editItem = getEditItem();
      const selected = getSelectedSasaran();
      const targetId = firstNonEmpty(editItem.id_sasaran, editItem.id, selected.id_sasaran, selected.id);

      if (mode === 'edit') {
        const opened = await openSasaranDetailById(targetId);
        if (opened) return;
      }

      goToSasaranList();
    }
  };


  // --- V4 hotfix start: wilayah fallback, route back, CATIN/BADUTA overrides ---
  (function applyRegistrasiV4Hotfix() {
    const REG_RETURN_ROUTE_KEY_V4 = 'tpk_registrasi_return_route';
    let SCOPE_TIM_ROWS_CACHE_V4 = null;
    let MASTER_WILAYAH_ROWS_CACHE_V4 = null;

    STATIC_CODES.add('nama_kepala_keluarga');
    STATIC_CODES.add('nama_ibu_kandung');

    function getLocalJsonV4(key) {
      try {
        return safeJsonParse(localStorage.getItem(key), null);
      } catch (_) {
        return null;
      }
    }

    function splitCombinedOptionsV4(value) {
      return uniqueStringsV4(String(value || '')
        .split('/')
        .map(function (item) { return safeTrim(item); })
        .filter(Boolean));
    }

    function uniqueStringsV4(values) {
      const seen = {};
      const out = [];
      (values || []).forEach(function (value) {
        const v = safeTrim(value);
        if (!v || seen[v]) return;
        seen[v] = true;
        out.push(v);
      });
      return out;
    }

    function toOptionHtmlV4(value) {
      const safeValue = escapeHtml(value);
      const safeLabel = escapeHtml(humanizeOptionLabel(value));
      return '<option value="' + safeValue + '">' + safeLabel + '</option>';
    }

    function fillSelectOptionsV4(selectEl, values, selectedValue) {
      if (!selectEl) return [];
      const options = uniqueStringsV4(values);
      const selected = safeTrim(selectedValue);
      if (selected && options.indexOf(selected) === -1) options.unshift(selected);
      selectEl.innerHTML = ['<option value="">Pilih</option>'].concat(options.map(toOptionHtmlV4)).join('');
      selectEl.value = selected || (options.length === 1 ? options[0] : '');
      return options;
    }

    function setSelectEditableByOptionCountV4(selectEl, optionCount) {
      if (!selectEl) return;
      setReadonly(selectEl, Number(optionCount || 0) <= 1);
    }

    function normalizeReturnRouteV4(routeName) {
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

    function getCurrentRouteNameV4() {
      if (window.Router && isFunction(window.Router.getCurrentRoute)) {
        return safeTrim(window.Router.getCurrentRoute());
      }
      return '';
    }

    function saveReturnRouteV4(routeName) {
      const normalized = normalizeReturnRouteV4(routeName);
      if (!normalized || normalized === 'registrasi') return;
      try { sessionStorage.setItem(REG_RETURN_ROUTE_KEY_V4, normalized); } catch (_) {}
    }

    function readReturnRouteV4() {
      try { return normalizeReturnRouteV4(sessionStorage.getItem(REG_RETURN_ROUTE_KEY_V4)); } catch (_) { return ''; }
    }

    function clearReturnRouteV4() {
      try { sessionStorage.removeItem(REG_RETURN_ROUTE_KEY_V4); } catch (_) {}
    }

    function captureReturnRouteV4(preferredRoute) {
      const current = normalizeReturnRouteV4(preferredRoute) || normalizeReturnRouteV4(getCurrentRouteNameV4()) || readReturnRouteV4() || 'dashboard';
      saveReturnRouteV4(current);
      return current;
    }

    function goToDashboardV4() {
      if (window.Router && isFunction(window.Router.toDashboard)) {
        window.Router.toDashboard();
      }
    }

    function splitDelimitedScopeValueV4(value) {
      return uniqueStringsV4(String(value || '')
        .split(/\s*(?:\/|,|;|\|)\s*/)
        .map(function (item) { return safeTrim(item); })
        .filter(Boolean));
    }

    function readJsonArrayV4(value) {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'object') return [value];
      try {
        const parsed = JSON.parse(String(value));
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
      } catch (_) {}
      return [];
    }

    function normalizeScopeRowV4(row, profile) {
      const src = row || {};
      const p = profile || {};
      const scope = p.scope_wilayah || p.tim_wilayah_scope || p.wilayah_scope || {};
      const kecamatan = firstNonEmpty(
        src.kecamatan, src.nama_kecamatan, src.kec,
        scope.kecamatan, scope.nama_kecamatan,
        p.nama_kecamatan, p.kecamatan, p.id_kecamatan
      );
      const desa = firstNonEmpty(
        src.desa_kelurahan, src.nama_desa, src.nama_desa_kelurahan, src.desa,
        scope.desa_kelurahan, scope.nama_desa, scope.nama_desa_kelurahan,
        p.desa_kelurahan, p.nama_desa, p.nama_desa_kelurahan, p.desa_tim, p.desa
      );
      const dusun = firstNonEmpty(
        src.dusun_rw, src.nama_dusun, src.nama_dusun_rw, src.dusun,
        scope.dusun_rw, scope.nama_dusun, scope.nama_dusun_rw,
        p.dusun_rw, p.nama_dusun, p.nama_dusun_rw, p.wilayah_tugas_dusun_rw
      );
      const idWilayah = firstNonEmpty(src.id_wilayah, src.id_wilayah_tugas, scope.id_wilayah, p.id_wilayah, p.id_wilayah_tugas);
      if (!kecamatan && !desa && !dusun && !idWilayah) return null;
      return { id_wilayah: idWilayah, kecamatan: kecamatan, desa_kelurahan: desa, dusun_rw: dusun };
    }

    function uniqueScopeRowsV4(rows) {
      const seen = {};
      const out = [];
      (rows || []).forEach(function (row) {
        if (!row) return;
        const key = [row.id_wilayah, row.kecamatan, row.desa_kelurahan, row.dusun_rw]
          .map(function (v) { return safeTrim(v).toUpperCase(); })
          .join('|');
        if (!key || seen[key]) return;
        seen[key] = true;
        out.push(row);
      });
      return out;
    }

    function buildRowsFromProfileScopeV4(profile) {
      const p = profile || {};
      const scope = p.scope_wilayah || p.tim_wilayah_scope || p.wilayah_scope || {};
      const kecamatan = firstNonEmpty(scope.kecamatan, scope.nama_kecamatan, p.kecamatan, p.nama_kecamatan, p.id_kecamatan);
      const desaRaw = firstNonEmpty(scope.desa_kelurahan, scope.nama_desa, scope.nama_desa_kelurahan, p.desa_kelurahan, p.desa_kelurahan_list, p.nama_desa, p.nama_desa_kelurahan, p.desa_tim, p.desa);
      const dusunRaw = firstNonEmpty(scope.dusun_rw, scope.nama_dusun, scope.nama_dusun_rw, p.dusun_rw, p.dusun_rw_list, p.nama_dusun, p.nama_dusun_rw, p.wilayah_tugas_dusun_rw || '');
      const desaList = splitDelimitedScopeValueV4(desaRaw);
      const dusunList = splitDelimitedScopeValueV4(dusunRaw);
      const rows = [];
      if (desaList.length && dusunList.length) {
        desaList.forEach(function (desa) {
          dusunList.forEach(function (dusun) {
            rows.push({ kecamatan: kecamatan, desa_kelurahan: desa, dusun_rw: dusun });
          });
        });
      } else if (dusunList.length) {
        dusunList.forEach(function (dusun) {
          rows.push({ kecamatan: kecamatan, desa_kelurahan: desaList[0] || safeTrim(desaRaw), dusun_rw: dusun });
        });
      } else if (kecamatan || desaRaw || dusunRaw) {
        rows.push({ kecamatan: kecamatan, desa_kelurahan: safeTrim(desaRaw), dusun_rw: safeTrim(dusunRaw) });
      }
      return uniqueScopeRowsV4(rows.map(function (row) { return normalizeScopeRowV4(row, p); }).filter(Boolean));
    }

    function buildRowsFromProfileLiteV4(profile) {
      const p = profile || {};
      let rows = [];
      [p.wilayah_tugas_list_json, p.tim_wilayah_list_json, p.scope_wilayah_list_json, p.wilayah_scope_list_json, p.id_wilayah_list_json].forEach(function (value) {
        readJsonArrayV4(value).forEach(function (row) {
          if (typeof row === 'string') rows.push(normalizeScopeRowV4({ id_wilayah: row }, p));
          else rows.push(normalizeScopeRowV4(row, p));
        });
      });
      rows = uniqueScopeRowsV4(rows.filter(Boolean));
      if (rows.length) return rows;
      return buildRowsFromProfileScopeV4(p);
    }

    function isTimRefFallbackAllowedV4() {
      try {
        const cfg = (window.APP_CONFIG && window.APP_CONFIG.REGISTRASI) || {};
        return cfg.ALLOW_GET_TIM_REF_FALLBACK === true;
      } catch (_) {
        return false;
      }
    }

    async function fetchMasterWilayahRowsV4() {
      if (Array.isArray(MASTER_WILAYAH_ROWS_CACHE_V4)) return MASTER_WILAYAH_ROWS_CACHE_V4;
      const cacheKey = 'tpk_wilayah_bali_ref_cache_v1';
      const ttlMs = 24 * 60 * 60 * 1000;
      function readLocalRows(allowStale) {
        try {
          const cached = safeJsonParse(localStorage.getItem(cacheKey), null);
          if (!cached || !Array.isArray(cached.rows)) return null;
          const savedAt = Date.parse(cached.saved_at || '');
          const fresh = savedAt && !Number.isNaN(savedAt) && (Date.now() - savedAt <= ttlMs);
          if (!fresh && allowStale !== true) return null;
          return cached.rows;
        } catch (_) { return null; }
      }
      const localRows = readLocalRows(false);
      if (localRows) { MASTER_WILAYAH_ROWS_CACHE_V4 = localRows; return MASTER_WILAYAH_ROWS_CACHE_V4; }
      try {
        const action = (window.APP_CONFIG && window.APP_CONFIG.API_ACTIONS && window.APP_CONFIG.API_ACTIONS.GET_WILAYAH_REF) || 'getWilayahRef';
        const result = await callApi(action, {});
        MASTER_WILAYAH_ROWS_CACHE_V4 = result && Array.isArray(result.data) ? result.data : [];
        try { localStorage.setItem(cacheKey, JSON.stringify({ saved_at: new Date().toISOString(), rows: MASTER_WILAYAH_ROWS_CACHE_V4 })); } catch (_) {}
        return MASTER_WILAYAH_ROWS_CACHE_V4;
      } catch (_) {
        const staleRows = readLocalRows(true);
        MASTER_WILAYAH_ROWS_CACHE_V4 = staleRows || [];
        return MASTER_WILAYAH_ROWS_CACHE_V4;
      }
    }

    async function fetchTimScopeRowsV4() {
      if (Array.isArray(SCOPE_TIM_ROWS_CACHE_V4)) return SCOPE_TIM_ROWS_CACHE_V4;
      const profile = getProfile() || {};
      const profileRows = buildRowsFromProfileLiteV4(profile);

      // 3D-R2: jalur normal registrasi memakai wilayah dari user_profile_lite.
      // getTimRef hanya fallback debug bila APP_CONFIG.REGISTRASI.ALLOW_GET_TIM_REF_FALLBACK = true
      // dan profil lite benar-benar tidak membawa data wilayah yang bisa dipakai.
      if (profileRows.length || !isTimRefFallbackAllowedV4()) {
        SCOPE_TIM_ROWS_CACHE_V4 = profileRows;
        return SCOPE_TIM_ROWS_CACHE_V4;
      }

      const idTim = safeTrim(profile.id_tim || profile.idTim || profile.scope_code);
      if (!idTim) {
        SCOPE_TIM_ROWS_CACHE_V4 = profileRows;
        return SCOPE_TIM_ROWS_CACHE_V4;
      }

      try {
        const action = (window.APP_CONFIG && window.APP_CONFIG.API_ACTIONS && window.APP_CONFIG.API_ACTIONS.GET_TIM_REF) || 'getTimRef';
        const result = await callApi(action, { id_tim: idTim, reason: 'fallback_missing_profile_lite_scope' });
        const rows = result && Array.isArray(result.data) ? result.data : [];
        SCOPE_TIM_ROWS_CACHE_V4 = uniqueScopeRowsV4(rows.map(function (row) {
          return normalizeScopeRowV4(row, profile);
        }).filter(Boolean));
        if (!SCOPE_TIM_ROWS_CACHE_V4.length) {
          SCOPE_TIM_ROWS_CACHE_V4 = profileRows;
        }
        return SCOPE_TIM_ROWS_CACHE_V4;
      } catch (_) {
        SCOPE_TIM_ROWS_CACHE_V4 = profileRows;
        return SCOPE_TIM_ROWS_CACHE_V4;
      }
    }

    const _origInitV4 = RegistrasiForm.init;
    RegistrasiForm.init = function () {
      const res = _origInitV4.apply(this, arguments);
      if (!this.__v4Bound) {
        this.__v4Bound = true;
        const jenisEl = byId('reg-jenis-sasaran');
        const kecEl = byId('reg-kecamatan');
        const desaEl = byId('reg-desa');
        const dusunEl = byId('reg-dusun');
        if (jenisEl) {
          jenisEl.addEventListener('change', () => {
            this.applyJenisSpecificStaticFields();
          });
        }
        if (kecEl) {
          kecEl.addEventListener('change', () => {
            this.handleScopeCascadeChange('kecamatan');
          });
        }
        if (desaEl) {
          desaEl.addEventListener('change', () => {
            this.handleScopeCascadeChange('desa');
          });
        }
        if (dusunEl) {
          dusunEl.addEventListener('change', () => {
            this.handleAnyFormChange();
          });
        }
      }
      if (normalizeReturnRouteV4(getCurrentRouteNameV4()) === 'registrasi') {
        Promise.resolve().then(() => this.prefillScope()).then(() => {
          this.applyJenisSpecificStaticFields();
          this.renderValidation();
        }).catch(function () {});
      }
      return res;
    };

    RegistrasiForm.applyJenisSpecificStaticFields = function () {
      const jenis = toUpper(byId('reg-jenis-sasaran') && byId('reg-jenis-sasaran').value);
      const groupIbu = byId('group-reg-nama-ibu-kandung');
      const inputIbu = byId('reg-nama-ibu-kandung');
      if (groupIbu) groupIbu.classList.toggle('hidden', jenis !== 'BADUTA');
      if (inputIbu) {
        if (jenis === 'BADUTA') inputIbu.setAttribute('required', 'required');
        else {
          inputIbu.removeAttribute('required');
          inputIbu.value = '';
        }
      }
    };

    RegistrasiForm.ensureScopeOptions = async function (preferred) {
      const rows = await fetchTimScopeRowsV4();
      const profile = getProfile() || {};
      const scope = profile.scope_wilayah || profile.tim_wilayah_scope || profile.wilayah_scope || {};
      const fallback = preferred || {};
      const kecEl = byId('reg-kecamatan');
      const desaEl = byId('reg-desa');
      const dusunEl = byId('reg-dusun');

      const fallbackKecamatan = firstNonEmpty(fallback.kecamatan, scope.kecamatan, scope.nama_kecamatan, profile.kecamatan, profile.nama_kecamatan);
      const fallbackDesa = firstNonEmpty(fallback.desa, scope.desa_kelurahan, scope.nama_desa, scope.nama_desa_kelurahan, profile.desa_kelurahan, profile.nama_desa, profile.nama_desa_kelurahan);
      const fallbackDusun = firstNonEmpty(fallback.dusun, scope.dusun_rw, scope.nama_dusun, scope.nama_dusun_rw, profile.dusun_rw, profile.nama_dusun, profile.nama_dusun_rw, profile.wilayah_tugas_dusun_rw);

      if (!rows.length) {
        const kec = fillSelectOptionsV4(kecEl, [fallbackKecamatan], fallbackKecamatan);
        const desa = fillSelectOptionsV4(desaEl, [fallbackDesa], fallbackDesa);
        const dusunParts = splitCombinedOptionsV4(fallbackDusun);
        const dusun = fillSelectOptionsV4(dusunEl, dusunParts, dusunParts[0] || fallbackDusun);
        setSelectEditableByOptionCountV4(kecEl, kec.length);
        setSelectEditableByOptionCountV4(desaEl, desa.length);
        setSelectEditableByOptionCountV4(dusunEl, dusun.length);
        return;
      }

      const selectedKecamatan = safeTrim(fallback.kecamatan || (kecEl && kecEl.value) || fallbackKecamatan);
      const selectedDesa = safeTrim(fallback.desa || (desaEl && desaEl.value) || fallbackDesa);
      const selectedDusun = safeTrim(splitCombinedOptionsV4(fallback.dusun || (dusunEl && dusunEl.value) || fallbackDusun)[0] || fallback.dusun || (dusunEl && dusunEl.value) || fallbackDusun);

      const kecamatanOptions = uniqueStringsV4(rows.map(function (row) { return row.kecamatan; }));
      const finalKecamatanOptions = fillSelectOptionsV4(kecEl, kecamatanOptions, selectedKecamatan);

      const activeKecamatan = safeTrim(kecEl && kecEl.value);
      const rowsByKecamatan = activeKecamatan ? rows.filter(function (row) { return safeTrim(row.kecamatan) === activeKecamatan; }) : rows.slice();
      const finalDesaOptions = fillSelectOptionsV4(desaEl, uniqueStringsV4(rowsByKecamatan.map(function (row) { return row.desa_kelurahan; })), selectedDesa);

      const activeDesa = safeTrim(desaEl && desaEl.value);
      const rowsByDesa = activeDesa ? rowsByKecamatan.filter(function (row) { return safeTrim(row.desa_kelurahan) === activeDesa; }) : rowsByKecamatan.slice();
      const dusunOptionValues = uniqueStringsV4([].concat.apply([], rowsByDesa.map(function (row) { return splitCombinedOptionsV4(row.dusun_rw); })));
      const finalDusunOptions = fillSelectOptionsV4(dusunEl, dusunOptionValues, selectedDusun);

      setSelectEditableByOptionCountV4(kecEl, finalKecamatanOptions.length);
      setSelectEditableByOptionCountV4(desaEl, finalDesaOptions.length);
      setSelectEditableByOptionCountV4(dusunEl, finalDusunOptions.length);
    };

    RegistrasiForm.handleScopeCascadeChange = function (level) {
      const preferred = {
        kecamatan: safeTrim(byId('reg-kecamatan') && byId('reg-kecamatan').value),
        desa: safeTrim(byId('reg-desa') && byId('reg-desa').value),
        dusun: safeTrim(byId('reg-dusun') && byId('reg-dusun').value)
      };
      if (level === 'kecamatan') {
        preferred.desa = '';
        preferred.dusun = '';
      }
      if (level === 'desa') {
        preferred.dusun = '';
      }
      this.ensureScopeOptions(preferred).then(() => this.handleAnyFormChange()).catch(function () {});
    };

    RegistrasiForm.prefillScope = async function () {
      const mode = getMode();
      const profileScope = this.getScopeFromProfile();
      const selected = getSelectedSasaran();
      const editItem = getEditItem();
      const preferred = {
        kecamatan: mode === 'edit'
          ? firstNonEmpty(editItem.nama_kecamatan, editItem.kecamatan, profileScope.nama_kecamatan)
          : firstNonEmpty(profileScope.nama_kecamatan, selected.nama_kecamatan, selected.kecamatan),
        desa: mode === 'edit'
          ? firstNonEmpty(editItem.nama_desa, editItem.desa_kelurahan, editItem.nama_desa_kelurahan, profileScope.nama_desa)
          : firstNonEmpty(profileScope.nama_desa, selected.nama_desa, selected.desa_kelurahan, selected.nama_desa_kelurahan),
        dusun: mode === 'edit'
          ? firstNonEmpty(editItem.nama_dusun, editItem.dusun_rw, editItem.nama_dusun_rw, profileScope.nama_dusun)
          : firstNonEmpty(profileScope.nama_dusun, selected.nama_dusun, selected.dusun_rw, selected.nama_dusun_rw)
      };
      await this.ensureScopeOptions(preferred);
    };

    RegistrasiForm.fillStaticForm = function (item) {
      const map = {
        'reg-id-sasaran': firstNonEmpty(item.id_sasaran, item.id),
        'reg-jenis-sasaran': firstNonEmpty(item.jenis_sasaran),
        'reg-nama-sasaran': firstNonEmpty(item.nama_sasaran, item.nama),
        'reg-nama-kepala-keluarga': firstNonEmpty(item.nama_kepala_keluarga),
        'reg-nama-ibu-kandung': firstNonEmpty(item.nama_ibu_kandung),
        'reg-nik': firstNonEmpty(item.nik_sasaran, item.nik),
        'reg-no-kk': firstNonEmpty(item.nomor_kk, item.no_kk),
        'reg-jenis-kelamin': firstNonEmpty(item.jenis_kelamin),
        'reg-tanggal-lahir': firstNonEmpty(item.tanggal_lahir, item.tgl_lahir),
        'reg-kecamatan': firstNonEmpty(item.nama_kecamatan, item.kecamatan),
        'reg-desa': firstNonEmpty(item.nama_desa, item.desa_kelurahan, item.nama_desa_kelurahan),
        'reg-dusun': firstNonEmpty(item.nama_dusun, item.dusun_rw, item.nama_dusun_rw),
        'reg-alamat': firstNonEmpty(item.alamat)
      };
      Object.keys(map).forEach(function (id) { uiSetValue(id, map[id]); });
      this.ensureScopeOptions({
        kecamatan: map['reg-kecamatan'],
        desa: map['reg-desa'],
        dusun: map['reg-dusun']
      }).catch(function () {});
      lockJenisSasaranForEdit();
      this.applyJenisSpecificStaticFields();
    };

    const _origOpenCreateV4 = RegistrasiForm.openCreate;
    RegistrasiForm.openCreate = async function () {
      captureReturnRouteV4();
      const out = await _origOpenCreateV4.apply(this, arguments);
      this.applyJenisSpecificStaticFields();
      return out;
    };

    const _origOpenEditV4 = RegistrasiForm.openEdit;
    RegistrasiForm.openEdit = async function (item) {
      captureReturnRouteV4();
      const out = await _origOpenEditV4.call(this, item);
      lockJenisSasaranForEdit();
      this.applyJenisSpecificStaticFields();
      return out;
    };

    RegistrasiForm.normalizeDefinition = function (definition, jenisSasaran, refs) {
      const data = definition || {};
      const sections = Array.isArray(data.sections) ? data.sections : [];
      const fallbackQuestions = Array.isArray(data.questions) ? data.questions : [];
      const dynamicQuestions = [];
      const sectionMap = {};

      sections.forEach((section, sectionIndex) => {
        const normalizedSection = {
          section_id: safeTrim(section.section_id || ('SEC-' + (sectionIndex + 1))),
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
        if (normalizedSection.questions.length) sectionMap[normalizedSection.section_id] = normalizedSection;
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

      const masterWilayahRows = Array.isArray(refs && refs.master_wilayah) ? refs.master_wilayah : [];
      const cleanedSections = dynamicSections.map((section) => ({
        section_id: section.section_id,
        section_label: section.section_label,
        section_order: section.section_order,
        questions: []
      }));
      const sectionById = {};
      cleanedSections.forEach((section) => { sectionById[section.section_id] = section; });
      let noteQuestions = [];

      dynamicSections.forEach((section) => {
        (section.questions || []).forEach((question) => {
          let q = Object.assign({}, question || {});
          if (jenisSasaran === 'BADUTA' && q.code === 'berat_badan_lahir') {
            q.label = 'Berat Badan Lahir (Kg)';
            q.placeholder = 'Contoh: 2.8';
            q.help_text = 'Masukkan berat badan lahir dalam Kg.';
            q.field_type = 'number';
            q.data_type = 'decimal';
            q.min_value = '0.5';
            q.max_value = '6';
            q.is_editable = true;
          }
          if (jenisSasaran === 'BADUTA' && q.code === 'panjang_badan_lahir') {
            q.label = 'Panjang Badan Lahir (Cm)';
            q.placeholder = 'Contoh: 48';
            q.help_text = 'Masukkan panjang badan lahir dalam Cm.';
            q.field_type = 'number';
            q.data_type = 'decimal';
            q.min_value = '20';
            q.max_value = '70';
            q.is_editable = true;
          }
          if (jenisSasaran === 'BUMIL' && q.code === 'kehamilan_diinginkan') {
            q.options = [
              { value: 'YA_INGIN_HAMIL_SEGERA', label: 'Ya, Ingin Hamil Segera', order: 1 },
              { value: 'TIDAK_INGIN_HAMIL_NANTI', label: 'Tidak, Ingin Hamil Nanti', order: 2 },
              { value: 'TIDAK_INGIN_HAMIL_LAGI', label: 'Tidak Ingin Hamil Lagi', order: 3 }
            ];
            q.is_editable = true;
          }
          if (jenisSasaran === 'BUMIL' && q.code === 'berat_badan_sebelum_hamil') {
            q.label = 'Berat Badan Sebelum Hamil (Kg)';
            q.placeholder = 'Contoh: 45';
            q.help_text = 'Masukkan berat badan sebelum hamil dalam Kg.';
            q.field_type = 'number';
            q.data_type = 'decimal';
            q.min_value = '25';
            q.max_value = '200';
            q.is_editable = true;
          }
          if (jenisSasaran === 'BUFAS' && q.code === 'cara_persalinan') {
            q.options = (q.options || []).filter(function (opt) {
              var label = toUpper(opt.label || opt.value);
              return label !== 'VAKUM / FORSEP' && label !== 'VAKUM/FORSEP' && label !== 'LAINNYA';
            });
            q.is_editable = true;
          }
          if (q.code === 'keterangan_tambahan_awal' || q.code === 'keterangan_tambahan') {
            noteQuestions.push(Object.assign({}, q));
            return;
          }
          if (jenisSasaran === 'CATIN' && (q.code === 'data_pasangan' || q.code === 'domisili_setelah_menikah')) {
            return;
          }
          sectionById[section.section_id].questions.push(q);
        });
      });

      if (jenisSasaran === 'CATIN') {
        const rows = masterWilayahRows || [];
        const kabupatenOptions = uniqueStringsV4(rows.map((row) => firstNonEmpty(row.kabupaten))).length
          ? uniqueStringsV4(rows.map((row) => firstNonEmpty(row.kabupaten)))
          : ['BULELENG'];
        const kecamatanOptions = uniqueStringsV4(rows.map((row) => firstNonEmpty(row.kecamatan)));
        const desaOptions = uniqueStringsV4(rows.map((row) => firstNonEmpty(row.desa_kelurahan, row.nama_desa, row.nama_desa_kelurahan)));
        const buildOptions = (items) => items.map((value, index) => ({ value: value, label: value, order: index + 1 }));
        cleanedSections.push({
          section_id: 'SEC-CATIN-PASANGAN',
          section_label: 'Data Pasangan CATIN',
          section_order: 850,
          questions: [
            {question_id:'OVR-CATIN-NAMA-PASANGAN', code:'nama_pasangan', label:'Nama Pasangan', short_label:'Nama Pasangan', help_text:'Nama lengkap pasangan CATIN.', placeholder:'Masukkan nama pasangan', field_type:'text', data_type:'string', is_required:true, is_editable:true, section_id:'SEC-CATIN-PASANGAN', section_label:'Data Pasangan CATIN', section_order:850, question_order:10, options:[], rules:[]},
            {question_id:'OVR-CATIN-NIK-PASANGAN', code:'nik_pasangan', label:'NIK Pasangan', short_label:'NIK Pasangan', help_text:'Jika tidak diketahui, gunakan 16 digit angka 9.', placeholder:'16 digit NIK pasangan', field_type:'text', data_type:'string', is_required:true, is_editable:true, section_id:'SEC-CATIN-PASANGAN', section_label:'Data Pasangan CATIN', section_order:850, question_order:20, options:[], rules:[]},
            {question_id:'OVR-CATIN-KAB-ASAL', code:'kabupaten_asal_pasangan', label:'Kabupaten Asal Pasangan', short_label:'Kabupaten Asal', help_text:'Pilih kabupaten asal pasangan.', placeholder:'', field_type:'select', data_type:'string', is_required:true, is_editable:true, section_id:'SEC-CATIN-PASANGAN', section_label:'Data Pasangan CATIN', section_order:850, question_order:30, options:buildOptions(kabupatenOptions), rules:[]},
            {question_id:'OVR-CATIN-KEC-ASAL', code:'kecamatan_asal_pasangan', label:'Kecamatan Asal Pasangan', short_label:'Kecamatan Asal', help_text:'Pilih kecamatan asal pasangan.', placeholder:'', field_type:'select', data_type:'string', is_required:true, is_editable:true, section_id:'SEC-CATIN-PASANGAN', section_label:'Data Pasangan CATIN', section_order:850, question_order:40, options:buildOptions(kecamatanOptions), rules:[]},
            {question_id:'OVR-CATIN-DESA-ASAL', code:'desa_asal_pasangan', label:'Desa Asal Pasangan', short_label:'Desa Asal', help_text:'Pilih desa/kelurahan asal pasangan.', placeholder:'', field_type:'select', data_type:'string', is_required:true, is_editable:true, section_id:'SEC-CATIN-PASANGAN', section_label:'Data Pasangan CATIN', section_order:850, question_order:50, options:buildOptions(desaOptions), rules:[]},
            {question_id:'OVR-CATIN-DUSUN-ASAL', code:'dusun_asal_pasangan', label:'Dusun Asal Pasangan', short_label:'Dusun Asal', help_text:'Isi teks dusun/banjar/lingkungan asal pasangan.', placeholder:'Masukkan dusun asal pasangan', field_type:'text', data_type:'string', is_required:true, is_editable:true, section_id:'SEC-CATIN-PASANGAN', section_label:'Data Pasangan CATIN', section_order:850, question_order:60, options:[], rules:[]}
          ]
        });
      }

      if (noteQuestions.length) {
        cleanedSections.push({
          section_id: 'SEC-CATATAN-AKHIR',
          section_label: 'Catatan Tambahan',
          section_order: 999,
          questions: noteQuestions.map((q, index) => Object.assign({}, q, {
            section_id: 'SEC-CATATAN-AKHIR',
            section_label: 'Catatan Tambahan',
            section_order: 999,
            question_order: 900 + index
          }))
        });
      }

      const finalSections = cleanedSections
        .map((section) => Object.assign({}, section, { questions: (section.questions || []).sort((a, b) => Number(a.question_order || 0) - Number(b.question_order || 0)) }))
        .filter((section) => section.questions && section.questions.length)
        .sort((a, b) => Number(a.section_order || 0) - Number(b.section_order || 0));
      const flatQuestions = [];
      finalSections.forEach((section) => { (section.questions || []).forEach((question) => flatQuestions.push(question)); });
      return {
        form_id: safeTrim(firstNonEmpty(data.form_id, data.form && data.form.form_id, mapJenisToFormId(jenisSasaran))),
        jenis_sasaran: jenisSasaran,
        sections: finalSections,
        questions: flatQuestions
      };
    };

    RegistrasiForm.loadDynamicFields = async function (jenisSasaran) {
      const jenis = toUpper(jenisSasaran);
      if (!jenis) {
        this._currentDefinition = null;
        this._dynamicQuestions = [];
        this._currentFormId = '';
        uiSetHTML('registrasi-dynamic-fields', '<p class="muted-text">Pilih jenis sasaran untuk memuat pertanyaan khusus.</p>');
        return;
      }
      let definition = {};
      try {
        definition = await this.getRegistrasiFormDefinition(jenis);
      } catch (err) {
        notify(err && err.message ? err.message : 'Gagal memuat pertanyaan registrasi.');
        definition = {};
      }
      const refs = { master_wilayah: jenis === 'CATIN' ? await fetchMasterWilayahRowsV4() : [] };
      const normalized = this.normalizeDefinition(definition, jenis, refs);
      this._currentDefinition = normalized;
      this._dynamicQuestions = normalized.questions || [];
      this._currentFormId = normalized.form_id || mapJenisToFormId(jenis);
      this.renderDynamicFields(normalized.sections || []);
      this.applyGenderLockByJenis();
      this.applyJenisSpecificStaticFields();
    };

    const _origCollectFormDataV4 = RegistrasiForm.collectFormData;
    RegistrasiForm.collectFormData = function () {
      const data = _origCollectFormDataV4.apply(this, arguments);
      data.answers = data.answers || {};
      data.answers.nama_kepala_keluarga = safeTrim(byId('reg-nama-kepala-keluarga') && byId('reg-nama-kepala-keluarga').value);
      data.answers.nama_ibu_kandung = safeTrim(byId('reg-nama-ibu-kandung') && byId('reg-nama-ibu-kandung').value);
      return data;
    };

    const _origTryLoadDraftV4 = RegistrasiForm.tryLoadDraft;
    RegistrasiForm.tryLoadDraft = function () {
      const draft = loadDraftLocal();
      if (draft && draft.data && draft.data.answers) {
        const answers = draft.data.answers;
        uiSetValue('reg-nama-kepala-keluarga', firstNonEmpty(answers.nama_kepala_keluarga, draft.data.nama_kepala_keluarga));
        uiSetValue('reg-nama-ibu-kandung', firstNonEmpty(answers.nama_ibu_kandung, draft.data.nama_ibu_kandung));
      }
      const out = _origTryLoadDraftV4.apply(this, arguments);
      this.applyJenisSpecificStaticFields();
      return out;
    };

    const _origValidateV4 = RegistrasiForm.validate;
    RegistrasiForm.validate = function (data) {
      const issues = _origValidateV4.apply(this, arguments) || [];
      const jenis = toUpper(data && data.answers && data.answers.jenis_sasaran);
      const namaKK = safeTrim(data && data.answers && data.answers.nama_kepala_keluarga);
      const namaIbu = safeTrim(data && data.answers && data.answers.nama_ibu_kandung);
      if (!namaKK && !issues.some((item) => String(item.text || '').indexOf('Nama Kepala Keluarga') >= 0)) {
        issues.unshift({ type: 'error', text: 'Nama Kepala Keluarga wajib diisi.' });
      }
      if (jenis === 'BADUTA' && !namaIbu && !issues.some((item) => String(item.text || '').indexOf('Nama Ibu Kandung') >= 0)) {
        issues.unshift({ type: 'error', text: 'Nama Ibu Kandung wajib diisi untuk BADUTA.' });
      }
      return issues;
    };

    const _origSubmitV4 = RegistrasiForm.submit;
    RegistrasiForm.submit = async function () {
      try {
        return await _origSubmitV4.apply(this, arguments);
      } finally {
        if (getMode() !== 'edit') clearReturnRouteV4();
      }
    };

    RegistrasiForm.handleBack = async function () {
      const mode = getMode();
      const editItem = getEditItem();
      const selected = getSelectedSasaran();
      const targetId = firstNonEmpty(editItem.id_sasaran, editItem.id, selected.id_sasaran, selected.id);
      const returnRoute = readReturnRouteV4();
      clearReturnRouteV4();

      if (mode === 'edit') {
        const openedEditDetail = await openSasaranDetailById(targetId);
        if (openedEditDetail) return;
      }

      if (returnRoute === 'sasaranList') {
        goToSasaranList();
        return;
      }

      if (returnRoute === 'sasaranDetail') {
        const openedReturnDetail = await openSasaranDetailById(targetId);
        if (openedReturnDetail) return;
      }

      goToDashboardV4();
    };
  })();
  // --- V4 hotfix end ---


  /* ===== HOTFIX V6: cascade wilayah pasangan CATIN + hard numeric constraints ===== */
  const NUMERIC_RULES_V6 = {
    berat_badan_sebelum_hamil: {
      min: 25,
      max: 200,
      step: '0.1',
      label: 'Berat Badan Sebelum Hamil',
      decimals: 1
    },
    berat_badan_lahir: {
      min: 0.5,
      max: 6,
      step: '0.1',
      label: 'Berat Badan Lahir',
      decimals: 1
    },
    panjang_badan_lahir: {
      min: 20,
      max: 70,
      step: '1',
      label: 'Panjang Badan Lahir',
      decimals: 0
    }
  };

  function uniqueRowsByFieldsV6(rows) {
    const seen = {};
    return (rows || []).filter((row) => {
      const key = [
        safeTrim(firstNonEmpty(row.kabupaten)),
        safeTrim(firstNonEmpty(row.kecamatan)),
        safeTrim(firstNonEmpty(row.desa_kelurahan, row.nama_desa, row.nama_desa_kelurahan))
      ].join('|');
      if (!key) return false;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function normalizeWilayahBaliRowsV6(rows) {
    return uniqueRowsByFieldsV6((rows || []).map((row) => ({
      kabupaten: firstNonEmpty(row.kabupaten),
      kecamatan: firstNonEmpty(row.kecamatan),
      desa_kelurahan: firstNonEmpty(row.desa_kelurahan, row.nama_desa, row.nama_desa_kelurahan)
    }))).sort((a, b) => {
      const ka = safeTrim(a.kabupaten);
      const kb = safeTrim(b.kabupaten);
      if (ka !== kb) return ka.localeCompare(kb, 'id');
      const ca = safeTrim(a.kecamatan);
      const cb = safeTrim(b.kecamatan);
      if (ca !== cb) return ca.localeCompare(cb, 'id');
      return safeTrim(a.desa_kelurahan).localeCompare(safeTrim(b.desa_kelurahan), 'id');
    });
  }

  function fillSelectOptionsKeepSelectionV6(selectEl, values, preferred) {
    return fillSelectOptionsV4(selectEl, values, preferred || (selectEl && selectEl.value) || '');
  }

  function ensureEditableV6(el) {
    if (!el) return;
    setReadonly(el, false);
    el.disabled = false;
  }

  function bindDigitsOnlyMaxV6(el, maxLength) {
    if (!el || el.dataset.v6DigitsBound === '1') return;
    el.dataset.v6DigitsBound = '1';
    el.setAttribute('inputmode', 'numeric');
    el.setAttribute('maxlength', String(maxLength));
    const sanitize = () => {
      const digits = String(el.value || '').replace(/\D+/g, '').slice(0, maxLength);
      if (el.value !== digits) el.value = digits;
    };
    el.addEventListener('input', sanitize);
    el.addEventListener('blur', sanitize);
  }

  function bindNumericRangeV6(el, rule) {
    if (!el || !rule) return;
    if (el.dataset.v6RangeBound === '1') return;
    el.dataset.v6RangeBound = '1';
    el.setAttribute('type', 'number');
    el.setAttribute('inputmode', 'decimal');
    el.setAttribute('step', rule.step || 'any');
    if (rule.min !== undefined) el.setAttribute('min', String(rule.min));
    if (rule.max !== undefined) el.setAttribute('max', String(rule.max));

    function normalize() {
      const raw = String(el.value || '').trim().replace(',', '.');
      if (!raw) return;
      let n = Number(raw);
      if (Number.isNaN(n)) {
        el.value = '';
        return;
      }
      if (rule.decimals === 0) n = Math.round(n);
      if (rule.decimals === 1) n = Math.round(n * 10) / 10;
      if (n < rule.min || n > rule.max) {
        el.value = '';
        notify(`${rule.label} harus antara ${rule.min} sampai ${rule.max}.`, 'warning');
        return;
      }
      el.value = String(n);
    }

    el.addEventListener('blur', normalize);
  }

  RegistrasiForm.applyInputConstraintsV6 = function () {
    bindDigitsOnlyMaxV6(this.findDynamicInput('nik_pasangan'), 16);
    Object.keys(NUMERIC_RULES_V6).forEach((code) => {
      bindNumericRangeV6(this.findDynamicInput(code), NUMERIC_RULES_V6[code]);
    });
  };

  RegistrasiForm.bindCatinPartnerCascadeV6 = async function () {
    const jenis = toUpper(byId('reg-jenis-sasaran') && byId('reg-jenis-sasaran').value);
    if (jenis !== 'CATIN') return;

    const rowsRaw = await fetchMasterWilayahRowsV4();
    const rows = normalizeWilayahBaliRowsV6(rowsRaw);
    if (!rows.length) return;

    const kabEl = this.findDynamicInput('kabupaten_asal_pasangan');
    const kecEl = this.findDynamicInput('kecamatan_asal_pasangan');
    const desaEl = this.findDynamicInput('desa_asal_pasangan');
    const dusunEl = this.findDynamicInput('dusun_asal_pasangan');
    if (!kabEl || !kecEl || !desaEl) return;

    const renderCascade = (changedLevel) => {
      const selectedKab = safeTrim(kabEl.value);
      if (changedLevel === 'kabupaten') {
        kecEl.value = '';
        desaEl.value = '';
      }
      const rowsKab = selectedKab
        ? rows.filter((row) => safeTrim(row.kabupaten) === selectedKab)
        : rows.slice();

      const kabupatenOptions = uniqueStringsV4(rows.map((row) => row.kabupaten));
      fillSelectOptionsKeepSelectionV6(kabEl, kabupatenOptions, selectedKab);

      const selectedKec = safeTrim(kecEl.value);
      const kecamatanOptions = uniqueStringsV4(rowsKab.map((row) => row.kecamatan));
      fillSelectOptionsKeepSelectionV6(kecEl, kecamatanOptions, selectedKec);

      const activeKec = safeTrim(kecEl.value);
      if (changedLevel === 'kecamatan') {
        desaEl.value = '';
      }
      const rowsKec = activeKec
        ? rowsKab.filter((row) => safeTrim(row.kecamatan) === activeKec)
        : rowsKab.slice();

      const selectedDesa = safeTrim(desaEl.value);
      const desaOptions = uniqueStringsV4(rowsKec.map((row) => row.desa_kelurahan));
      fillSelectOptionsKeepSelectionV6(desaEl, desaOptions, selectedDesa);

      ensureEditableV6(kabEl);
      ensureEditableV6(kecEl);
      ensureEditableV6(desaEl);
      ensureEditableV6(dusunEl);
    };

    if (kabEl.dataset.v6CascadeBound !== '1') {
      kabEl.dataset.v6CascadeBound = '1';
      kabEl.addEventListener('change', () => {
        renderCascade('kabupaten');
        this.handleAnyFormChange();
      });
    }

    if (kecEl.dataset.v6CascadeBound !== '1') {
      kecEl.dataset.v6CascadeBound = '1';
      kecEl.addEventListener('change', () => {
        renderCascade('kecamatan');
        this.handleAnyFormChange();
      });
    }

    renderCascade('');
  };

  const _origRenderDynamicFieldsV6 = RegistrasiForm.renderDynamicFields;
  RegistrasiForm.renderDynamicFields = function (sections) {
    const out = _origRenderDynamicFieldsV6.call(this, sections);
    Promise.resolve().then(() => this.bindCatinPartnerCascadeV6()).catch(function () {});
    this.applyInputConstraintsV6();
    return out;
  };

  const _origFillDynamicFieldsV6 = RegistrasiForm.fillDynamicFields;
  RegistrasiForm.fillDynamicFields = function (values) {
    const out = _origFillDynamicFieldsV6.call(this, values);
    Promise.resolve().then(() => this.bindCatinPartnerCascadeV6()).catch(function () {});
    this.applyInputConstraintsV6();
    return out;
  };

  const _origValidateV6 = RegistrasiForm.validate;
  RegistrasiForm.validate = function (data) {
    let issues = (_origValidateV6.call(this, data) || []).filter((item) => item && item.type !== 'ok');

    const answers = (data && data.answers) || {};
    const nikPasangan = safeTrim(answers.nik_pasangan);
    if (nikPasangan && !/^\d{16}$/.test(nikPasangan)) {
      issues.push({ type: 'error', text: 'NIK Pasangan harus 16 digit angka.' });
    }

    Object.keys(NUMERIC_RULES_V6).forEach((code) => {
      const raw = safeTrim(answers[code]);
      if (!raw) return;
      const value = Number(String(raw).replace(',', '.'));
      const rule = NUMERIC_RULES_V6[code];
      if (Number.isNaN(value) || value < rule.min || value > rule.max) {
        issues.push({ type: 'error', text: `${rule.label} harus antara ${rule.min} sampai ${rule.max}.` });
      }
    });

    if (!issues.some((item) => item.type === 'error')) {
      issues.push({
        type: 'ok',
        text: getMode() === 'edit'
          ? 'Validasi edit sasaran lolos. Perubahan siap disimpan.'
          : 'Validasi registrasi sasaran lolos. Data siap dikirim.'
      });
    }

    return issues;
  };

  RegistrasiForm.applyQuestionOverrides = function (question, jenisSasaran) {
    const q = Object.assign({}, question || {});
    if (jenisSasaran === 'BADUTA' && q.code === 'berat_badan_lahir') {
      q.label = 'Berat Badan Lahir (Kg)';
      q.placeholder = 'Contoh: 2.8';
      q.help_text = 'Masukkan berat badan lahir dalam Kg (0.5 - 6 Kg).';
      q.field_type = 'number';
      q.data_type = 'decimal';
      q.min_value = 0.5;
      q.max_value = 6;
    }
    if (jenisSasaran === 'BADUTA' && q.code === 'panjang_badan_lahir') {
      q.label = 'Panjang Badan Lahir (Cm)';
      q.placeholder = 'Contoh: 49';
      q.help_text = 'Masukkan panjang badan lahir dalam Cm (20 - 70 Cm).';
      q.field_type = 'number';
      q.data_type = 'integer';
      q.min_value = 20;
      q.max_value = 70;
    }
    if (jenisSasaran === 'BUMIL' && q.code === 'kehamilan_diinginkan') {
      q.options = [
        { value: 'YA_INGIN_HAMIL_SEGERA', label: 'Ya, Ingin Hamil Segera', order: 1 },
        { value: 'TIDAK_INGIN_HAMIL_NANTI', label: 'Tidak, Ingin Hamil Nanti', order: 2 },
        { value: 'TIDAK_INGIN_HAMIL_LAGI', label: 'Tidak Ingin Hamil Lagi', order: 3 }
      ];
      q.help_text = 'Kehamilan diinginkan atau tidak';
    }
    if (jenisSasaran === 'BUMIL' && q.code === 'berat_badan_sebelum_hamil') {
      q.label = 'Berat Badan Sebelum Hamil (Kg)';
      q.placeholder = 'Contoh: 48';
      q.help_text = 'Masukkan berat badan sebelum hamil dalam Kg (25 - 200 Kg).';
      q.field_type = 'number';
      q.data_type = 'decimal';
      q.min_value = 25;
      q.max_value = 200;
    }
    if (jenisSasaran === 'BUFAS' && q.code === 'cara_persalinan') {
      q.options = (q.options || []).filter((opt) => {
        const label = toUpper(opt && opt.label);
        return label !== 'VAKUM / FORSEP' && label !== 'LAINNYA';
      });
    }
    return q;
  };

  RegistrasiForm.applyDefinitionOverrides = function (definition, jenisSasaran, refs) {
    const jenis = toUpper(jenisSasaran);
    const masterWilayahRows = Array.isArray(refs && refs.master_wilayah) ? refs.master_wilayah : [];
    const rowsBali = normalizeWilayahBaliRowsV6(masterWilayahRows);
    const sections = (definition.sections || []).map((section) => Object.assign({}, section, {
      questions: (section.questions || []).map((question) => this.applyQuestionOverrides(question, jenis)).filter(Boolean)
    }));

    let noteQuestions = [];
    sections.forEach((section) => {
      const keep = [];
      (section.questions || []).forEach((question) => {
        if (question.code === 'keterangan_tambahan_awal' || question.code === 'keterangan_tambahan') {
          noteQuestions.push(Object.assign({}, question, { section_label: 'Catatan Tambahan' }));
          return;
        }
        keep.push(question);
      });
      section.questions = keep;
    });

    if (jenis === 'CATIN') {
      sections.forEach((section) => {
        section.questions = (section.questions || []).filter((question) => {
          return question.code !== 'data_pasangan' && question.code !== 'domisili_setelah_menikah';
        });
      });

      const kabupatenOptions = uniqueStringsV4(rowsBali.map((row) => row.kabupaten));
      const kecamatanOptions = uniqueStringsV4(rowsBali.map((row) => row.kecamatan));
      const desaOptions = uniqueStringsV4(rowsBali.map((row) => row.desa_kelurahan));
      const buildOptions = (items) => items.map((value, index) => ({ value: value, label: value, order: index + 1 }));

      sections.push({
        section_id: 'SEC-CATIN-PASANGAN',
        section_label: 'Data Pasangan CATIN',
        section_order: 850,
        questions: [
          { question_id:'OVR-CATIN-NAMA-PASANGAN', code:'nama_pasangan', label:'Nama Pasangan', short_label:'Nama Pasangan', help_text:'Nama lengkap pasangan CATIN.', placeholder:'Masukkan nama pasangan', field_type:'text', data_type:'string', is_required:true, is_editable:true, section_id:'SEC-CATIN-PASANGAN', section_label:'Data Pasangan CATIN', section_order:850, question_order:10, options:[], rules:[] },
          { question_id:'OVR-CATIN-NIK-PASANGAN', code:'nik_pasangan', label:'NIK Pasangan', short_label:'NIK Pasangan', help_text:'Jika tidak diketahui, gunakan 16 digit angka 9.', placeholder:'16 digit NIK pasangan', field_type:'text', data_type:'string', is_required:true, is_editable:true, section_id:'SEC-CATIN-PASANGAN', section_label:'Data Pasangan CATIN', section_order:850, question_order:20, options:[], rules:[] },
          { question_id:'OVR-CATIN-KAB-ASAL', code:'kabupaten_asal_pasangan', label:'Kabupaten Asal Pasangan', short_label:'Kabupaten Asal', help_text:'Pilih kabupaten asal pasangan.', placeholder:'', field_type:'select', data_type:'string', is_required:true, is_editable:true, section_id:'SEC-CATIN-PASANGAN', section_label:'Data Pasangan CATIN', section_order:850, question_order:30, options:buildOptions(kabupatenOptions), rules:[] },
          { question_id:'OVR-CATIN-KEC-ASAL', code:'kecamatan_asal_pasangan', label:'Kecamatan Asal Pasangan', short_label:'Kecamatan Asal', help_text:'Pilih kecamatan asal pasangan.', placeholder:'', field_type:'select', data_type:'string', is_required:true, is_editable:true, section_id:'SEC-CATIN-PASANGAN', section_label:'Data Pasangan CATIN', section_order:850, question_order:40, options:buildOptions(kecamatanOptions), rules:[] },
          { question_id:'OVR-CATIN-DESA-ASAL', code:'desa_asal_pasangan', label:'Desa Asal Pasangan', short_label:'Desa Asal', help_text:'Pilih desa/kelurahan asal pasangan.', placeholder:'', field_type:'select', data_type:'string', is_required:true, is_editable:true, section_id:'SEC-CATIN-PASANGAN', section_label:'Data Pasangan CATIN', section_order:850, question_order:50, options:buildOptions(desaOptions), rules:[] },
          { question_id:'OVR-CATIN-DUSUN-ASAL', code:'dusun_asal_pasangan', label:'Dusun Asal Pasangan', short_label:'Dusun Asal', help_text:'Isi teks dusun/banjar/lingkungan asal pasangan.', placeholder:'Masukkan dusun asal pasangan', field_type:'text', data_type:'string', is_required:true, is_editable:true, section_id:'SEC-CATIN-PASANGAN', section_label:'Data Pasangan CATIN', section_order:850, question_order:60, options:[], rules:[] }
        ]
      });
    }

    if (noteQuestions.length) {
      noteQuestions = noteQuestions.map((question, index) => Object.assign({}, question, {
        question_order: 900 + index,
        section_id: 'SEC-CATATAN-AKHIR',
        section_label: 'Catatan Tambahan',
        section_order: 999
      }));
      sections.push({
        section_id: 'SEC-CATATAN-AKHIR',
        section_label: 'Catatan Tambahan',
        section_order: 999,
        questions: noteQuestions
      });
    }

    const cleanedSections = sections
      .map((section) => Object.assign({}, section, {
        questions: (section.questions || []).sort((a, b) => Number(a.question_order || 0) - Number(b.question_order || 0))
      }))
      .filter((section) => section.questions && section.questions.length)
      .sort((a, b) => Number(a.section_order || 0) - Number(b.section_order || 0));

    const flatQuestions = [];
    cleanedSections.forEach((section) => {
      (section.questions || []).forEach((question) => flatQuestions.push(question));
    });

    return Object.assign({}, definition, {
      sections: cleanedSections,
      questions: flatQuestions
    });
  };


  /* ===== PATCH 2D: UI label opsi dan lock jenis sasaran edit ===== */
  (function applyRegistrasi2DMinorFix() {
    if (RegistrasiForm.__PATCH_2D_UI_MINOR_FIX === true) return;
    RegistrasiForm.__PATCH_2D_UI_MINOR_FIX = true;

    const _origApplyModeUI2D = RegistrasiForm.applyModeUI;
    RegistrasiForm.applyModeUI = function () {
      const out = _origApplyModeUI2D.apply(this, arguments);
      lockJenisSasaranForEdit();
      return out;
    };

    const _origCollectFormData2D = RegistrasiForm.collectFormData;
    RegistrasiForm.collectFormData = function () {
      const data = _origCollectFormData2D.apply(this, arguments) || {};
      if (getMode() === 'edit') {
        const editItem = getEditItem() || {};
        const lockedJenis = firstNonEmpty(editItem.jenis_sasaran, data.answers && data.answers.jenis_sasaran);
        data.answers = Object.assign({}, data.answers || {}, { jenis_sasaran: lockedJenis });
        data.form_id = this._currentFormId || mapJenisToFormId(lockedJenis);
        lockJenisSasaranForEdit();
      }
      return data;
    };
  })();

  window.RegistrasiForm = RegistrasiForm;

  RegistrasiForm.prefetchDefinitions = async function (options) {
    const opts = options || {};
    const jenisList = opts.jenisList || ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'];
    const api = getApi();
    if (api && isFunction(api.prefetchRegistrasiFormDefinitions)) {
      return api.prefetchRegistrasiFormDefinitions({ jenisList: jenisList, delayMs: typeof opts.delayMs === 'number' ? opts.delayMs : 450, timeoutMs: typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 25000, cacheTtlMs: opts.cacheTtlMs });
    }
    const results = [];
    for (let i = 0; i < jenisList.length; i += 1) {
      const jenis = toUpper(jenisList[i]);
      if (!jenis) continue;
      try { const definition = await this.getRegistrasiFormDefinition(jenis, { prefetch: true }); results.push({ jenis_sasaran: jenis, ok: !!definition }); }
      catch (err) { results.push({ jenis_sasaran: jenis, ok: false, message: err && err.message ? err.message : String(err) }); }
      if (opts.delayMs && i < jenisList.length - 1) await new Promise((resolve) => window.setTimeout(resolve, opts.delayMs));
    }
    return { ok: true, prefetched: results };
  };
  window.RegistrasiView = window.RegistrasiView || RegistrasiForm;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.RegistrasiForm.init();
    });
  } else {
    window.RegistrasiForm.init();
  }
})(window, document);


/* ===== HOTFIX V7: cascade wilayah asal pasangan CATIN + hard BUMIL weight guard ===== */
(function (window, document) {
  'use strict';
  const RF = window.RegistrasiForm;
  if (!RF) return;

  const V7_WILAYAH_CACHE = { rows: null };

  function s(v) { return String(v == null ? '' : v).trim(); }
  function up(v) { return s(v).toUpperCase(); }
  function uniq(arr) {
    const out = [];
    const seen = {};
    (arr || []).forEach((v) => {
      const t = s(v);
      if (!t || seen[t]) return;
      seen[t] = true;
      out.push(t);
    });
    return out;
  }
  function byCode(code) {
    return RF.findDynamicInput ? RF.findDynamicInput(code) : null;
  }
  function fillSelect(selectEl, values, selectedValue) {
    if (!selectEl) return [];
    const opts = uniq(values);
    const selected = s(selectedValue);
    let html = '<option value="">Pilih</option>';
    opts.forEach((value) => {
      const esc = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      html += '<option value="' + esc + '">' + esc + '</option>';
    });
    selectEl.innerHTML = html;
    if (selected && opts.indexOf(selected) >= 0) {
      selectEl.value = selected;
    } else if (opts.length === 1) {
      selectEl.value = opts[0];
    } else {
      selectEl.value = '';
    }
    selectEl.disabled = false;
    return opts;
  }
  async function fetchWilayahBaliRowsV7() {
    if (Array.isArray(V7_WILAYAH_CACHE.rows)) return V7_WILAYAH_CACHE.rows;
    try {
      const action = (window.APP_CONFIG && window.APP_CONFIG.API_ACTIONS && window.APP_CONFIG.API_ACTIONS.GET_WILAYAH_REF) || 'getWilayahRef';
      const api = window.Api;
      if (!api || typeof api.post !== 'function') throw new Error('Api.post belum tersedia');
      const result = await api.post(action, {});
      const rows = result && Array.isArray(result.data) ? result.data : [];
      V7_WILAYAH_CACHE.rows = rows.map((row) => ({
        kabupaten: s(row.kabupaten),
        kecamatan: s(row.kecamatan),
        desa_kelurahan: s(row.desa_kelurahan || row.nama_desa || row.nama_desa_kelurahan)
      })).filter((row) => row.kabupaten || row.kecamatan || row.desa_kelurahan);
    } catch (_) {
      V7_WILAYAH_CACHE.rows = [];
    }
    return V7_WILAYAH_CACHE.rows;
  }

  const _origApplyDefV7 = RF.applyDefinitionOverrides;
  RF.applyDefinitionOverrides = function (definition, jenisSasaran, refs) {
    const out = _origApplyDefV7.call(this, definition, jenisSasaran, refs);
    if (up(jenisSasaran) !== 'CATIN') return out;

    const rows = uniq((refs && Array.isArray(refs.master_wilayah) ? refs.master_wilayah : []).map((r) => s(r.kabupaten))).map((kab) => ({value: kab, label: kab}));
    (out.sections || []).forEach((section) => {
      (section.questions || []).forEach((q) => {
        if (q.code === 'kabupaten_asal_pasangan') {
          q.options = rows.map((o, i) => ({ value: o.value, label: o.label, order: i + 1 }));
        }
        if (q.code === 'kecamatan_asal_pasangan' || q.code === 'desa_asal_pasangan') {
          q.options = [];
        }
      });
    });
    (out.questions || []).forEach((q) => {
      if (q.code === 'kecamatan_asal_pasangan' || q.code === 'desa_asal_pasangan') q.options = [];
      if (q.code === 'kabupaten_asal_pasangan') q.options = rows.map((o, i) => ({ value: o.value, label: o.label, order: i + 1 }));
    });
    return out;
  };

  RF.bindCatinPartnerCascadeV7 = async function () {
    const jenisEl = document.getElementById('reg-jenis-sasaran');
    if (up(jenisEl && jenisEl.value) !== 'CATIN') return;

    const rows = await fetchWilayahBaliRowsV7();
    if (!rows.length) return;

    const kabEl = byCode('kabupaten_asal_pasangan');
    const kecEl = byCode('kecamatan_asal_pasangan');
    const desaEl = byCode('desa_asal_pasangan');
    const dusunEl = byCode('dusun_asal_pasangan');
    if (!kabEl || !kecEl || !desaEl) return;

    const render = (changed) => {
      const selectedKab = s(kabEl.value);
      if (changed === 'kabupaten') {
        kecEl.value = '';
        desaEl.value = '';
      }
      const kabupatenOptions = uniq(rows.map((r) => r.kabupaten));
      fillSelect(kabEl, kabupatenOptions, selectedKab);

      const activeKab = s(kabEl.value);
      const rowsKab = activeKab ? rows.filter((r) => s(r.kabupaten) === activeKab) : [];
      const selectedKec = changed === 'kabupaten' ? '' : s(kecEl.value);
      const kecamatanOptions = uniq(rowsKab.map((r) => r.kecamatan));
      fillSelect(kecEl, kecamatanOptions, selectedKec);

      const activeKec = s(kecEl.value);
      if (changed === 'kecamatan') {
        desaEl.value = '';
      }
      const rowsKec = activeKab && activeKec ? rowsKab.filter((r) => s(r.kecamatan) === activeKec) : [];
      const selectedDesa = changed === 'kabupaten' || changed === 'kecamatan' ? '' : s(desaEl.value);
      const desaOptions = uniq(rowsKec.map((r) => r.desa_kelurahan));
      fillSelect(desaEl, desaOptions, selectedDesa);

      kabEl.disabled = false;
      kecEl.disabled = false;
      desaEl.disabled = false;
      if (dusunEl) {
        dusunEl.readOnly = false;
        dusunEl.disabled = false;
      }
    };

    if (kabEl.dataset.v7CascadeBound !== '1') {
      kabEl.dataset.v7CascadeBound = '1';
      kabEl.addEventListener('change', () => {
        render('kabupaten');
        if (typeof RF.handleAnyFormChange === 'function') RF.handleAnyFormChange();
      });
    }
    if (kecEl.dataset.v7CascadeBound !== '1') {
      kecEl.dataset.v7CascadeBound = '1';
      kecEl.addEventListener('change', () => {
        render('kecamatan');
        if (typeof RF.handleAnyFormChange === 'function') RF.handleAnyFormChange();
      });
    }
    render('');
  };

  function bindNumericGuard(code, min, max, label, decimals) {
    const el = byCode(code);
    if (!el) return;
    if (el.dataset.v8RangeBound === '1') return;
    el.dataset.v8RangeBound = '1';
    el.setAttribute('type', 'number');
    el.setAttribute('inputmode', 'decimal');
    el.setAttribute('step', decimals ? '0.1' : '1');
    el.setAttribute('min', String(min));
    el.setAttribute('max', String(max));

    const sanitizeRaw = () => {
      let raw = s(el.value).replace(',', '.');
      raw = raw.replace(/[^0-9.\-]/g, '');
      const firstDot = raw.indexOf('.');
      if (firstDot >= 0) {
        raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '');
      }
      if (!decimals) raw = raw.replace(/\./g, '');
      return raw;
    };

    const softNormalize = () => {
      const raw = sanitizeRaw();
      if (!raw) {
        el.value = '';
        return;
      }
      let n = Number(raw);
      if (Number.isNaN(n)) {
        el.value = '';
        return;
      }
      if (!decimals) n = Math.round(n);
      else n = Math.round(n * 10) / 10;
      if (n > max) {
        el.value = String(max);
        return;
      }
      if (n < 0) {
        el.value = '';
        return;
      }
      el.value = String(n);
    };

    const hardValidate = () => {
      const raw = sanitizeRaw();
      if (!raw) {
        el.value = '';
        return;
      }
      let n = Number(raw);
      if (Number.isNaN(n)) {
        el.value = '';
        return;
      }
      if (!decimals) n = Math.round(n);
      else n = Math.round(n * 10) / 10;
      if (n < min || n > max) {
        el.value = '';
        window.alert(label + ' harus antara ' + min + ' sampai ' + max + '.');
        return;
      }
      el.value = String(n);
    };

    el.addEventListener('input', softNormalize);
    el.addEventListener('blur', hardValidate);
    el.addEventListener('change', hardValidate);
  }

  RF.applyInputConstraintsV7 = function () {
    bindNumericGuard('berat_badan_sebelum_hamil', 25, 200, 'Berat Badan Sebelum Hamil', true);
  };

  const _origRenderV7 = RF.renderDynamicFields;
  RF.renderDynamicFields = function (sections) {
    const out = _origRenderV7.call(this, sections);
    Promise.resolve().then(() => this.bindCatinPartnerCascadeV7()).catch(function () {});
    this.applyInputConstraintsV7();
    return out;
  };

  const _origFillV7 = RF.fillDynamicFields;
  RF.fillDynamicFields = function (values) {
    const out = _origFillV7.call(this, values);
    Promise.resolve().then(() => this.bindCatinPartnerCascadeV7()).catch(function () {});
    this.applyInputConstraintsV7();
    return out;
  };

  const _origValidateV7 = RF.validate;
  RF.validate = function (data) {
    const issues = _origValidateV7.call(this, data) || [];
    const answers = (data && data.answers) || {};
    const raw = s(answers.berat_badan_sebelum_hamil).replace(',', '.');
    if (raw) {
      const n = Number(raw);
      if (Number.isNaN(n) || n < 25 || n > 200) {
        if (!issues.some((it) => String(it.text||'').indexOf('Berat Badan Sebelum Hamil') >= 0)) {
          issues.push({ type: 'error', text: 'Berat Badan Sebelum Hamil harus antara 25 sampai 200 Kg.' });
        }
      }
    }
    return issues;
  };
})(window, document);
/* ===== HOTFIX V7 end ===== */


/* ===== HOTFIX V9 start ===== */
(function (window, document) {
  'use strict';
  var RF = window.RegistrasiForm;
  if (!RF) return;

  function s(v) {
    return String(v == null ? '' : v).trim();
  }

  function norm(v) {
    return s(v)
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function findQuestionByAliases(aliases, labels) {
    var list = Array.isArray(RF._dynamicQuestions) ? RF._dynamicQuestions : [];
    var aliasMap = {};
    (aliases || []).forEach(function (a) { aliasMap[norm(a)] = true; });
    var labelMap = {};
    (labels || []).forEach(function (a) { labelMap[s(a).toLowerCase()] = true; });
    for (var i = 0; i < list.length; i += 1) {
      var q = list[i] || {};
      var code = norm(q.code || q.question_code || q.store_key || q.question_id || '');
      var label = s(q.label || q.question_label || '').toLowerCase();
      if (aliasMap[code] || labelMap[label]) return q;
    }
    return null;
  }

  function findInputByQuestion(question, aliases, labels) {
    if (question && question.code && typeof RF.findDynamicInput === 'function') {
      var direct = RF.findDynamicInput(question.code);
      if (direct) return direct;
    }

    var container = document.getElementById('registrasi-dynamic-fields');
    if (!container) return null;

    var aliasMap = {};
    (aliases || []).forEach(function (a) { aliasMap[norm(a)] = true; });
    var labelMap = {};
    (labels || []).forEach(function (a) { labelMap[s(a).toLowerCase()] = true; });

    var nodes = container.querySelectorAll('[data-reg-question-code], input, select, textarea');
    for (var i = 0; i < nodes.length; i += 1) {
      var el = nodes[i];
      var code = norm(el.getAttribute('data-reg-question-code') || el.name || el.id || '');
      if (aliasMap[code]) return el;
      var card = el.closest ? el.closest('.dynamic-field-card') : null;
      if (card) {
        var labelEl = card.querySelector('label');
        var label = s(labelEl && labelEl.textContent).replace(/\*/g, '').trim().toLowerCase();
        if (labelMap[label]) return el;
      }
    }
    return null;
  }

  function bindGuard(el, cfg) {
    if (!el || el.dataset.v9Bound === '1') return;
    el.dataset.v9Bound = '1';
    try {
      el.setAttribute('type', 'number');
      el.setAttribute('inputmode', 'decimal');
      el.setAttribute('min', String(cfg.min));
      el.setAttribute('max', String(cfg.max));
      if (cfg.decimals) {
        el.setAttribute('step', '0.1');
      } else {
        el.setAttribute('step', '1');
      }
    } catch (_) {}

    var sanitize = function () {
      var raw = s(el.value).replace(',', '.');
      raw = raw.replace(/[^0-9.]/g, '');
      if (!cfg.decimals) raw = raw.replace(/\./g, '');
      else {
        var parts = raw.split('.');
        raw = parts.shift() + (parts.length ? '.' + parts.join('') : '');
      }
      return raw;
    };

    var onInput = function () {
      var raw = sanitize();
      if (!raw) {
        el.value = '';
        return;
      }
      var n = Number(raw);
      if (Number.isNaN(n)) {
        el.value = '';
        return;
      }
      if (!cfg.decimals) n = Math.round(n);
      else n = Math.round(n * 10) / 10;
      if (n > cfg.max) n = cfg.max;
      el.value = String(n);
    };

    var onValidate = function () {
      var raw = sanitize();
      if (!raw) {
        el.value = '';
        return;
      }
      var n = Number(raw);
      if (Number.isNaN(n)) {
        el.value = '';
        return;
      }
      if (!cfg.decimals) n = Math.round(n);
      else n = Math.round(n * 10) / 10;
      if (n < cfg.min || n > cfg.max) {
        el.value = '';
        window.alert(cfg.label + ' harus antara ' + cfg.min + ' sampai ' + cfg.max + (cfg.suffix || '') + '.');
        return;
      }
      el.value = String(n);
    };

    el.addEventListener('input', onInput);
    el.addEventListener('blur', onValidate);
    el.addEventListener('change', onValidate);
  }

  RF.applyInputConstraintsV9 = function () {
    var q = findQuestionByAliases(
      ['berat_badan_sebelum_hamil', 'bb_sebelum_hamil', 'bbsbh', 'berat_sebelum_hamil'],
      ['Berat Badan Sebelum Hamil', 'Berat Badan Sebelum Hamil (Kg)']
    );
    var el = findInputByQuestion(
      q,
      ['berat_badan_sebelum_hamil', 'bb_sebelum_hamil', 'bbsbh', 'berat_sebelum_hamil'],
      ['Berat Badan Sebelum Hamil', 'Berat Badan Sebelum Hamil (Kg)']
    );
    bindGuard(el, { min: 25, max: 200, decimals: true, label: 'Berat Badan Sebelum Hamil', suffix: ' Kg' });
  };

  var _render = RF.renderDynamicFields;
  RF.renderDynamicFields = function (sections) {
    var out = _render.call(this, sections);
    try { this.applyInputConstraintsV9(); } catch (_) {}
    return out;
  };

  var _fill = RF.fillDynamicFields;
  RF.fillDynamicFields = function (values) {
    var out = _fill.call(this, values);
    try { this.applyInputConstraintsV9(); } catch (_) {}
    return out;
  };

  var _validate = RF.validate;
  RF.validate = function (data) {
    var issues = _validate.call(this, data) || [];
    var answers = (data && data.answers) || {};
    var candidateKeys = ['berat_badan_sebelum_hamil', 'bb_sebelum_hamil', 'bbsbh', 'berat_sebelum_hamil'];
    var raw = '';
    for (var i = 0; i < candidateKeys.length; i += 1) {
      if (s(answers[candidateKeys[i]])) {
        raw = s(answers[candidateKeys[i]]);
        break;
      }
    }
    if (!raw) {
      var q = findQuestionByAliases(
        ['berat_badan_sebelum_hamil', 'bb_sebelum_hamil', 'bbsbh', 'berat_sebelum_hamil'],
        ['Berat Badan Sebelum Hamil', 'Berat Badan Sebelum Hamil (Kg)']
      );
      if (q && s(answers[q.code])) raw = s(answers[q.code]);
    }
    raw = s(raw).replace(',', '.');
    if (raw) {
      var n = Number(raw);
      if (Number.isNaN(n) || n < 25 || n > 200) {
        if (!issues.some(function (it) { return String(it.text || '').indexOf('Berat Badan Sebelum Hamil') >= 0; })) {
          issues.push({ type: 'error', text: 'Berat Badan Sebelum Hamil harus antara 25 sampai 200 Kg.' });
        }
      }
    }
    return issues;
  };
})(window, document);
/* ===== HOTFIX V9 end ===== */


/* ===== REGISTRASI PERFORMANCE INSTRUMENTATION FINAL 20260426 start ===== */
(function (window, document) {
  'use strict';

  var RF = window.RegistrasiForm;
  if (!RF || RF.__regPerfInstrumentation20260426 === true) return;
  RF.__regPerfInstrumentation20260426 = true;

  function nowMs() {
    try {
      if (window.performance && typeof window.performance.now === 'function') {
        return window.performance.now();
      }
    } catch (_) {}
    return Date.now();
  }

  function s(value) {
    return String(value == null ? '' : value).trim();
  }

  function upper(value) {
    return s(value).toUpperCase();
  }

  function getFormId(jenis) {
    var map = { CATIN: 'FRM1002', BUMIL: 'FRM1003', BUFAS: 'FRM1004', BADUTA: 'FRM1005' };
    return map[upper(jenis)] || 'FRM1001';
  }

  function countQuestionsFromSections(sections) {
    var total = 0;
    (Array.isArray(sections) ? sections : []).forEach(function (section) {
      total += Array.isArray(section && section.questions) ? section.questions.length : 0;
    });
    return total;
  }

  function countOptions(questions) {
    var total = 0;
    (Array.isArray(questions) ? questions : []).forEach(function (q) {
      total += Array.isArray(q && q.options) ? q.options.length : 0;
    });
    return total;
  }

  function countRules(questions) {
    var total = 0;
    (Array.isArray(questions) ? questions : []).forEach(function (q) {
      total += Array.isArray(q && q.rules) ? q.rules.length : 0;
    });
    return total;
  }

  function getPerfStore() {
    if (!window.__TPK_REGISTRASI_PERF__) {
      window.__TPK_REGISTRASI_PERF__ = [];
    }
    return window.__TPK_REGISTRASI_PERF__;
  }

  function pushPerfRecord(record) {
    var store = getPerfStore();
    store.push(record);
    while (store.length > 50) store.shift();

    try {
      console.info('[TPK_REGISTRASI_PERF]', record);
    } catch (_) {}

    if (window.Api && typeof window.Api.reportClientPerformance === 'function') {
      window.Api.reportClientPerformance('registrasi_dynamic_form_ready', record).catch(function () {});
    }
  }

  function createCtx(jenis) {
    return {
      request_id: 'REGFORM-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      jenis_sasaran: upper(jenis),
      form_id: getFormId(jenis),
      start_ms: nowMs(),
      api_ms: 0,
      api_time_ms: 0,
      REG_FORM_API_MS: 0,
      render_dynamic_fields_ms: 0,
      render_time_ms: 0,
      REG_FORM_RENDER_MS: 0,
      rules_apply_ms: 0,
      apply_rules_time_ms: 0,
      REG_FORM_RULES_MS: 0,
      bind_events_time_ms: 0,
      REG_FORM_BIND_MS: 0,
      normalize_prepare_other_ms: 0,
      backend_cached: null,
      local_cache_hit: null,
      cache_put_ok: null,
      backend_form_perf: null,
      section_count: 0,
      question_count: 0,
      field_count: 0,
      option_count: 0,
      rule_count: 0,
      status: 'STARTED'
    };
  }

  var activeCtx = null;

  var originalGetDefinition = RF.getRegistrasiFormDefinition;
  if (typeof originalGetDefinition === 'function') {
    RF.getRegistrasiFormDefinition = async function (jenisSasaran) {
      var ctx = activeCtx;
      var t0 = nowMs();
      var result = await originalGetDefinition.apply(this, arguments);
      var elapsed = Math.round(nowMs() - t0);

      if (ctx) {
        ctx.api_ms += elapsed;
        ctx.api_time_ms = ctx.api_ms;
        if (result && result.__frontend_api_perf) {
          ctx.api_ms = Number(result.__frontend_api_perf.api_ms || ctx.api_ms || elapsed);
          ctx.api_time_ms = ctx.api_ms;
          ctx.local_cache_hit = !!result.__frontend_api_perf.local_cache_hit;
          ctx.backend_cached = !!result.__frontend_api_perf.backend_cached;
          if (result.__frontend_api_perf.cache_put_ok !== undefined) {
            ctx.cache_put_ok = !!result.__frontend_api_perf.cache_put_ok;
          }
        } else if (result && result.__frontend_cache_hit === true) {
          ctx.local_cache_hit = true;
        }

        if (result && result.__meta) {
          ctx.backend_cached = result.__meta.cached === true;
          if (result.__meta.cache_put_ok !== undefined) ctx.cache_put_ok = !!result.__meta.cache_put_ok;
          if (result.__meta.form_perf) ctx.backend_form_perf = result.__meta.form_perf;
        }
      }

      return result;
    };
  }

  var originalRenderDynamicFields = RF.renderDynamicFields;
  if (typeof originalRenderDynamicFields === 'function') {
    RF.renderDynamicFields = function (sections) {
      var t0 = nowMs();
      var out = originalRenderDynamicFields.apply(this, arguments);
      if (activeCtx) {
        activeCtx.render_dynamic_fields_ms += Math.round(nowMs() - t0);
        activeCtx.render_time_ms = activeCtx.render_dynamic_fields_ms;
        activeCtx.section_count = Array.isArray(sections) ? sections.length : 0;
        activeCtx.question_count = Array.isArray(this._dynamicQuestions) ? this._dynamicQuestions.length : countQuestionsFromSections(sections);
        activeCtx.field_count = activeCtx.question_count;
        activeCtx.option_count = countOptions(this._dynamicQuestions || []);
        activeCtx.rule_count = countRules(this._dynamicQuestions || []);
      }
      return out;
    };
  }

  var originalUpdateConditional = RF.updateConditionalDynamicFields;
  if (typeof originalUpdateConditional === 'function') {
    RF.updateConditionalDynamicFields = function () {
      var t0 = nowMs();
      var out = originalUpdateConditional.apply(this, arguments);
      if (activeCtx) {
        activeCtx.rules_apply_ms += Math.round(nowMs() - t0);
        activeCtx.apply_rules_time_ms = activeCtx.rules_apply_ms;
      }
      return out;
    };
  }

  var originalLoadDynamicFields = RF.loadDynamicFields;
  if (typeof originalLoadDynamicFields === 'function') {
    RF.loadDynamicFields = async function (jenisSasaran) {
      var jenis = upper(jenisSasaran);
      if (!jenis) {
        return originalLoadDynamicFields.apply(this, arguments);
      }

      var previousCtx = activeCtx;
      var ctx = createCtx(jenis);
      activeCtx = ctx;

      try {
        var out = await originalLoadDynamicFields.apply(this, arguments);
        ctx.status = 'SUCCESS';
        return out;
      } catch (err) {
        ctx.status = 'ERROR';
        ctx.error_message = err && err.message ? err.message : String(err);
        throw err;
      } finally {
        var total = Math.round(nowMs() - ctx.start_ms);
        ctx.total_dynamic_form_ready_ms = total;
        ctx.total_until_visible_ms = total;
        ctx.normalize_prepare_other_ms = Math.max(
          total - Number(ctx.api_ms || 0) - Number(ctx.render_dynamic_fields_ms || 0) - Number(ctx.rules_apply_ms || 0) - Number(ctx.bind_events_time_ms || 0),
          0
        );
        ctx.form_id = this._currentFormId || ctx.form_id;
        ctx.finished_at = new Date().toISOString();
        ctx.REG_FORM_API_MS = Number(ctx.api_time_ms || ctx.api_ms || 0);
        ctx.REG_FORM_RENDER_MS = Number(ctx.render_time_ms || ctx.render_dynamic_fields_ms || 0);
        ctx.REG_FORM_RULES_MS = Number(ctx.apply_rules_time_ms || ctx.rules_apply_ms || 0);
        ctx.REG_FORM_BIND_MS = Number(ctx.bind_events_time_ms || 0);
        ctx.REG_FORM_TOTAL_MS = Number(ctx.total_until_visible_ms || total || 0);
        ctx.event_name = 'registrasi_dynamic_form_ready';
        pushPerfRecord(ctx);
        activeCtx = previousCtx;
      }
    };
  }
})(window, document);
/* ===== REGISTRASI PERFORMANCE INSTRUMENTATION FINAL 20260426 end ===== */
/* ===== READ MODEL BINDING R1-R1 start: registrasi wilayah task binding from user_profile_lite ===== */
(function (window, document) {
  'use strict';

  var RF = window.RegistrasiForm;
  if (!RF || RF.__READ_MODEL_SCOPE_BINDING_R1_R1 === true) return;
  RF.__READ_MODEL_SCOPE_BINDING_R1_R1 = true;

  var VERSION = 'READ-MODEL-BINDING-R1-R1-REGISTRASI-SCOPE-20260526';

  function byId(id) {
    return document.getElementById(id);
  }

  function s(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function up(value) {
    return s(value).toUpperCase();
  }

  function isObj(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  }

  function first() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = arguments[i];
      if (value !== undefined && value !== null && s(value) !== '') return value;
    }
    return '';
  }

  function safeJsonParse(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(String(value));
    } catch (_) {
      return fallback;
    }
  }

  function readLocalJson(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (raw === null || raw === undefined || raw === '') return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function writeProfile(profile) {
    var data = isObj(profile) ? profile : {};
    if (!Object.keys(data).length) return data;

    try {
      if (window.AppState && typeof window.AppState.setProfile === 'function') {
        window.AppState.setProfile(data);
      }
    } catch (_) {}

    try {
      if (window.Session && typeof window.Session.setProfile === 'function') {
        window.Session.setProfile(data);
      }
    } catch (_) {}

    try {
      if (window.Storage && typeof window.Storage.setProfile === 'function') {
        window.Storage.setProfile(data);
      } else if (window.Storage && typeof window.Storage.set === 'function') {
        var key = window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS
          ? window.APP_CONFIG.STORAGE_KEYS.PROFILE
          : 'tpk_profile';
        window.Storage.set(key || 'tpk_profile', data);
        if (typeof window.Storage.setLastGoodProfile === 'function') {
          window.Storage.setLastGoodProfile(data);
        }
      } else {
        window.localStorage.setItem('tpk_profile', JSON.stringify(data));
        window.localStorage.setItem('tpk_last_good_profile', JSON.stringify(data));
      }
    } catch (_) {}

    return data;
  }

  function meaningful(value) {
    var text = s(value);
    var upper = text.toUpperCase();
    if (!text || upper === '-' || upper === 'NULL' || upper === 'UNDEFINED' || upper === 'N/A' || upper === 'NA') {
      return '';
    }
    return text;
  }

  function mergeProfile(base, incoming) {
    var out = Object.assign({}, isObj(base) ? base : {});
    var src = isObj(incoming) ? incoming : {};
    Object.keys(src).forEach(function (key) {
      var value = src[key];
      if (value === undefined || value === null) return;
      if (typeof value === 'string' && !meaningful(value)) return;
      out[key] = value;
    });
    return out;
  }

  function extractProfileFromApiResult(result) {
    var data = result && result.data ? result.data : result;
    if (!data) return {};
    if (data.profile_lite && isObj(data.profile_lite)) return data.profile_lite;
    if (data.profile && isObj(data.profile)) return data.profile;
    if (data.user_profile_lite && isObj(data.user_profile_lite)) return data.user_profile_lite;
    if (isObj(data) && (data.id_user || data.role_akses || data.nama_kader || data.wilayah_tugas_list_json)) return data;
    return {};
  }

  function readBootstrapLiteProfile() {
    var boot = {};
    try {
      if (window.Storage && typeof window.Storage.getBootstrapLite === 'function') {
        boot = window.Storage.getBootstrapLite({}) || {};
      } else if (window.Storage && typeof window.Storage.get === 'function') {
        boot = window.Storage.get('tpk_bootstrap_lite', {}) || {};
      } else {
        boot = readLocalJson('tpk_bootstrap_lite', {}) || {};
      }
    } catch (_) {
      boot = readLocalJson('tpk_bootstrap_lite', {}) || {};
    }
    return boot && isObj(boot.profile) ? boot.profile : {};
  }

  function getBestProfileSync() {
    var profile = {};

    try {
      var lastGood = window.Storage && typeof window.Storage.getLastGoodProfile === 'function'
        ? window.Storage.getLastGoodProfile({})
        : readLocalJson('tpk_last_good_profile', {});
      profile = mergeProfile(profile, lastGood);
    } catch (_) {}

    try {
      var storageProfile = window.Storage && typeof window.Storage.getProfile === 'function'
        ? window.Storage.getProfile({})
        : (window.Storage && typeof window.Storage.get === 'function'
          ? window.Storage.get((window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS && window.APP_CONFIG.STORAGE_KEYS.PROFILE) || 'tpk_profile', {})
          : readLocalJson('tpk_profile', {}));
      profile = mergeProfile(profile, storageProfile);
    } catch (_) {}

    try {
      if (window.AppState && typeof window.AppState.getProfile === 'function') {
        profile = mergeProfile(profile, window.AppState.getProfile() || {});
      }
    } catch (_) {}

    try {
      if (window.Session && typeof window.Session.getProfile === 'function') {
        profile = mergeProfile(profile, window.Session.getProfile() || {});
      }
    } catch (_) {}

    profile = mergeProfile(profile, readBootstrapLiteProfile());

    return profile;
  }

  function splitList(value) {
    var text = s(value);
    if (!text) return [];
    return unique(text.split(/\s*(?:\||;|\/|,)\s*/).map(s).filter(Boolean));
  }

  function unique(values) {
    var seen = Object.create(null);
    var out = [];
    (values || []).forEach(function (value) {
      var text = meaningful(value);
      if (!text) return;
      var key = up(text);
      if (seen[key]) return;
      seen[key] = true;
      out.push(text);
    });
    return out;
  }

  function parseJsonRows(value) {
    var parsed = safeJsonParse(value, []);
    if (Array.isArray(parsed)) return parsed;
    if (isObj(parsed)) return [parsed];
    return [];
  }

  function normalizeScopeRow(row, profile) {
    var src = row || {};
    var p = profile || {};
    var scope = isObj(p.scope_wilayah) ? p.scope_wilayah : {};
    var idWilayah = first(src.id_wilayah, src.id_wilayah_tugas, scope.id_wilayah, p.id_wilayah, p.id_wilayah_tugas);
    var kecamatan = first(
      src.nama_kecamatan,
      src.kecamatan,
      scope.nama_kecamatan,
      scope.kecamatan,
      p.nama_kecamatan,
      p.kecamatan
    );
    var desa = first(
      src.desa_kelurahan,
      src.nama_desa,
      src.nama_desa_kelurahan,
      src.desa,
      scope.desa_kelurahan,
      scope.nama_desa,
      scope.nama_desa_kelurahan,
      p.desa_kelurahan,
      p.nama_desa,
      p.nama_desa_kelurahan,
      p.desa_tim,
      p.desa
    );
    var dusun = first(
      src.dusun_rw,
      src.nama_dusun,
      src.nama_dusun_rw,
      src.dusun,
      scope.dusun_rw,
      scope.nama_dusun,
      scope.nama_dusun_rw,
      p.dusun_rw,
      p.nama_dusun,
      p.nama_dusun_rw
    );

    if (!meaningful(kecamatan) && !meaningful(desa) && !meaningful(dusun) && !meaningful(idWilayah)) {
      return null;
    }

    return {
      id_wilayah: s(idWilayah),
      kecamatan: s(kecamatan),
      desa_kelurahan: s(desa),
      dusun_rw: s(dusun),
      urutan_wilayah: Number(first(src.urutan_wilayah, src.order, 1)) || 1
    };
  }

  function uniqueRows(rows) {
    var seen = Object.create(null);
    var out = [];
    (rows || []).forEach(function (row) {
      if (!row) return;
      var key = [row.id_wilayah, row.kecamatan, row.desa_kelurahan, row.dusun_rw].map(up).join('|');
      if (!key.replace(/\|/g, '') || seen[key]) return;
      seen[key] = true;
      out.push(row);
    });
    out.sort(function (a, b) {
      return Number(a.urutan_wilayah || 0) - Number(b.urutan_wilayah || 0);
    });
    return out;
  }

  function rowsFromProfile(profile) {
    var p = profile || {};
    var rows = [];

    if (Array.isArray(p.wilayah_tugas_ringkas)) {
      p.wilayah_tugas_ringkas.forEach(function (row) {
        rows.push(normalizeScopeRow(row, p));
      });
    }

    [
      p.wilayah_tugas_list_json,
      p.tim_wilayah_list_json,
      p.scope_wilayah_list_json,
      p.wilayah_scope_list_json
    ].forEach(function (value) {
      parseJsonRows(value).forEach(function (row) {
        rows.push(normalizeScopeRow(row, p));
      });
    });

    rows = uniqueRows(rows.filter(Boolean));
    if (rows.length) return rows;

    var scope = isObj(p.scope_wilayah) ? p.scope_wilayah : {};
    var kecamatan = first(scope.nama_kecamatan, scope.kecamatan, p.nama_kecamatan, p.kecamatan);
    var desaRaw = first(
      scope.desa_kelurahan,
      scope.nama_desa,
      scope.nama_desa_kelurahan,
      p.desa_kelurahan_list,
      p.desa_kelurahan,
      p.nama_desa,
      p.nama_desa_kelurahan,
      p.desa_tim,
      p.desa
    );
    var dusunRaw = first(
      scope.dusun_rw,
      scope.nama_dusun,
      scope.nama_dusun_rw,
      p.dusun_rw_list,
      p.dusun_rw,
      p.nama_dusun,
      p.nama_dusun_rw
    );

    var desaList = splitList(desaRaw);
    var dusunList = splitList(dusunRaw);

    if (!desaList.length && meaningful(desaRaw)) desaList = [meaningful(desaRaw)];
    if (!dusunList.length && meaningful(dusunRaw)) dusunList = [meaningful(dusunRaw)];

    if (desaList.length && dusunList.length) {
      desaList.forEach(function (desa) {
        dusunList.forEach(function (dusun) {
          rows.push(normalizeScopeRow({
            kecamatan: kecamatan,
            desa_kelurahan: desa,
            dusun_rw: dusun
          }, p));
        });
      });
    } else if (desaList.length) {
      desaList.forEach(function (desa) {
        rows.push(normalizeScopeRow({
          kecamatan: kecamatan,
          desa_kelurahan: desa,
          dusun_rw: meaningful(dusunRaw)
        }, p));
      });
    } else if (dusunList.length) {
      dusunList.forEach(function (dusun) {
        rows.push(normalizeScopeRow({
          kecamatan: kecamatan,
          desa_kelurahan: meaningful(desaRaw),
          dusun_rw: dusun
        }, p));
      });
    } else {
      rows.push(normalizeScopeRow({
        kecamatan: kecamatan,
        desa_kelurahan: meaningful(desaRaw),
        dusun_rw: meaningful(dusunRaw)
      }, p));
    }

    return uniqueRows(rows.filter(Boolean));
  }

  function hasUsableScope(profile) {
    var rows = rowsFromProfile(profile);
    if (rows.length) return true;
    return !!(meaningful(profile && (profile.nama_kecamatan || profile.kecamatan)) &&
      meaningful(profile && (profile.desa_kelurahan || profile.nama_desa || profile.desa_tim || profile.desa)) &&
      meaningful(profile && (profile.dusun_rw || profile.nama_dusun || profile.dusun_rw_list)));
  }

  async function getBestProfileForScope() {
    var cached = getBestProfileSync();
    if (hasUsableScope(cached)) return cached;

    if (window.Api && typeof window.Api.getMyProfileLite === 'function') {
      try {
        var result = await window.Api.getMyProfileLite({ source: 'registrasi_scope_binding_r1_r1' });
        if (result && result.ok !== false) {
          var fresh = extractProfileFromApiResult(result);
          if (Object.keys(fresh).length) {
            var merged = mergeProfile(cached, fresh);
            writeProfile(merged);
            return merged;
          }
        }
      } catch (_) {}
    }

    return cached;
  }

  function optionHtml(value) {
    var v = String(value == null ? '' : value);
    return '<option value="' + v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '">' +
      v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') +
      '</option>';
  }

  function fillSelect(select, values, selectedValue) {
    if (!select) return [];
    var selected = meaningful(selectedValue);
    var opts = unique(values);
    if (selected && opts.map(up).indexOf(up(selected)) < 0) opts.unshift(selected);
    select.innerHTML = ['<option value="">Pilih</option>'].concat(opts.map(optionHtml)).join('');
    if (selected) {
      select.value = selected;
    } else if (opts.length === 1) {
      select.value = opts[0];
    } else {
      select.value = '';
    }
    return opts;
  }

  function lockSelect(select, locked) {
    if (!select) return;
    select.disabled = !!locked;
    select.classList.toggle('is-locked', !!locked);
    select.setAttribute('aria-readonly', locked ? 'true' : 'false');
    select.setAttribute('data-readmodel-scope-locked', locked ? '1' : '0');
  }

  function isKader(profile) {
    var role = up(first(profile && profile.role_akses, profile && profile.role));
    return role === 'KADER';
  }

  function activeValue(id) {
    var el = byId(id);
    return meaningful(el && el.value);
  }

  function findActiveScopeRow(rows) {
    var kec = up(activeValue('reg-kecamatan'));
    var desa = up(activeValue('reg-desa'));
    var dusun = up(activeValue('reg-dusun'));

    return (rows || []).find(function (row) {
      return (!kec || up(row.kecamatan) === kec) &&
        (!desa || up(row.desa_kelurahan) === desa) &&
        (!dusun || up(row.dusun_rw) === dusun);
    }) || (rows && rows[0]) || null;
  }

  RF.getScopeFromProfile = function () {
    var profile = getBestProfileSync();
    var rows = rowsFromProfile(profile);
    var firstRow = rows[0] || {};
    return {
      id_wilayah: first(firstRow.id_wilayah, profile.id_wilayah, profile.id_wilayah_tugas),
      nama_kecamatan: first(firstRow.kecamatan, profile.nama_kecamatan, profile.kecamatan),
      nama_desa: first(firstRow.desa_kelurahan, profile.nama_desa, profile.desa_kelurahan, profile.desa_tim, profile.desa),
      nama_dusun: first(firstRow.dusun_rw, profile.nama_dusun, profile.dusun_rw, profile.dusun_rw_list)
    };
  };

  RF.ensureScopeOptions = async function (preferred) {
    var profile = await getBestProfileForScope();
    var rows = rowsFromProfile(profile);
    var fallback = preferred || {};
    var kecEl = byId('reg-kecamatan');
    var desaEl = byId('reg-desa');
    var dusunEl = byId('reg-dusun');

    var fallbackKecamatan = first(fallback.kecamatan, fallback.nama_kecamatan, profile.nama_kecamatan, profile.kecamatan);
    var fallbackDesa = first(fallback.desa, fallback.desa_kelurahan, fallback.nama_desa, profile.desa_kelurahan, profile.nama_desa, profile.desa_tim, profile.desa);
    var fallbackDusun = first(fallback.dusun, fallback.dusun_rw, fallback.nama_dusun, profile.dusun_rw, profile.nama_dusun, profile.dusun_rw_list);

    if (!rows.length) {
      var kecFallbackOptions = fillSelect(kecEl, [fallbackKecamatan], fallbackKecamatan);
      var desaFallbackOptions = fillSelect(desaEl, [fallbackDesa], fallbackDesa);
      var dusunFallbackOptions = fillSelect(dusunEl, splitList(fallbackDusun), splitList(fallbackDusun)[0] || fallbackDusun);
      var lockFallback = isKader(profile);
      lockSelect(kecEl, lockFallback && kecFallbackOptions.length <= 1);
      lockSelect(desaEl, lockFallback && desaFallbackOptions.length <= 1);
      lockSelect(dusunEl, lockFallback && dusunFallbackOptions.length <= 1);
      this.__readModelScopeRows = rows;
      this.__readModelScopeProfile = profile;
      return rows;
    }

    var selectedKecamatan = first(fallback.kecamatan, activeValue('reg-kecamatan'), fallbackKecamatan);
    var kecamatanOptions = unique(rows.map(function (row) { return row.kecamatan; }));
    var finalKecamatanOptions = fillSelect(kecEl, kecamatanOptions, selectedKecamatan);

    var currentKecamatan = activeValue('reg-kecamatan');
    var rowsByKecamatan = currentKecamatan
      ? rows.filter(function (row) { return up(row.kecamatan) === up(currentKecamatan); })
      : rows.slice();

    var selectedDesa = first(fallback.desa, activeValue('reg-desa'), fallbackDesa);
    var desaOptions = unique(rowsByKecamatan.map(function (row) { return row.desa_kelurahan; }));
    var finalDesaOptions = fillSelect(desaEl, desaOptions, selectedDesa);

    var currentDesa = activeValue('reg-desa');
    var rowsByDesa = currentDesa
      ? rowsByKecamatan.filter(function (row) { return up(row.desa_kelurahan) === up(currentDesa); })
      : rowsByKecamatan.slice();

    var selectedDusun = first(fallback.dusun, activeValue('reg-dusun'), fallbackDusun);
    var dusunOptions = unique(rowsByDesa.map(function (row) { return row.dusun_rw; }));
    var finalDusunOptions = fillSelect(dusunEl, dusunOptions, selectedDusun);

    var lockForKader = isKader(profile);
    lockSelect(kecEl, lockForKader && finalKecamatanOptions.length <= 1);
    lockSelect(desaEl, lockForKader && finalDesaOptions.length <= 1);
    lockSelect(dusunEl, lockForKader && finalDusunOptions.length <= 1);

    this.__readModelScopeRows = rows;
    this.__readModelScopeProfile = profile;
    this.__readModelScopeActiveRow = findActiveScopeRow(rows);
    return rows;
  };

  RF.handleScopeCascadeChange = function (level) {
    var preferred = {
      kecamatan: activeValue('reg-kecamatan'),
      desa: activeValue('reg-desa'),
      dusun: activeValue('reg-dusun')
    };

    if (level === 'kecamatan') {
      preferred.desa = '';
      preferred.dusun = '';
    }

    if (level === 'desa') {
      preferred.dusun = '';
    }

    return this.ensureScopeOptions(preferred)
      .then(() => {
        this.__readModelScopeActiveRow = findActiveScopeRow(this.__readModelScopeRows || []);
        if (typeof this.handleAnyFormChange === 'function') this.handleAnyFormChange();
      })
      .catch(function () {});
  };

  RF.prefillScope = async function () {
    var mode = typeof window.RegistrasiState !== 'undefined' && window.RegistrasiState && typeof window.RegistrasiState.getMode === 'function'
      ? window.RegistrasiState.getMode()
      : 'create';

    var editItem = window.RegistrasiState && typeof window.RegistrasiState.getEditItem === 'function'
      ? (window.RegistrasiState.getEditItem() || {})
      : {};

    var selected = window.SasaranState && typeof window.SasaranState.getSelected === 'function'
      ? (window.SasaranState.getSelected() || {})
      : {};

    var profileScope = this.getScopeFromProfile ? this.getScopeFromProfile() : {};

    var preferred = {
      kecamatan: mode === 'edit'
        ? first(editItem.nama_kecamatan, editItem.kecamatan, profileScope.nama_kecamatan)
        : first(profileScope.nama_kecamatan, selected.nama_kecamatan, selected.kecamatan),
      desa: mode === 'edit'
        ? first(editItem.nama_desa, editItem.desa_kelurahan, editItem.nama_desa_kelurahan, profileScope.nama_desa)
        : first(profileScope.nama_desa, selected.nama_desa, selected.desa_kelurahan, selected.nama_desa_kelurahan),
      dusun: mode === 'edit'
        ? first(editItem.nama_dusun, editItem.dusun_rw, editItem.nama_dusun_rw, profileScope.nama_dusun)
        : first(profileScope.nama_dusun, selected.nama_dusun, selected.dusun_rw, selected.nama_dusun_rw)
    };

    await this.ensureScopeOptions(preferred);
    this.__readModelScopeActiveRow = findActiveScopeRow(this.__readModelScopeRows || []);
    return preferred;
  };

  var originalOpenCreate = RF.openCreate;
  if (typeof originalOpenCreate === 'function') {
    RF.openCreate = async function () {
      var out = await originalOpenCreate.apply(this, arguments);
      await this.prefillScope();
      if (typeof this.renderValidation === 'function') this.renderValidation();
      return out;
    };
  }

  var originalOpenEdit = RF.openEdit;
  if (typeof originalOpenEdit === 'function') {
    RF.openEdit = async function (item) {
      var out = await originalOpenEdit.apply(this, arguments);
      await this.prefillScope();
      if (typeof this.renderValidation === 'function') this.renderValidation();
      return out;
    };
  }

  var originalCollectFormData = RF.collectFormData;
  if (typeof originalCollectFormData === 'function') {
    RF.collectFormData = function () {
      var data = originalCollectFormData.apply(this, arguments) || {};
      data.answers = data.answers || {};

      var activeRow = findActiveScopeRow(this.__readModelScopeRows || rowsFromProfile(getBestProfileSync()));
      var profile = this.__readModelScopeProfile || getBestProfileSync();

      data.answers.nama_kecamatan = first(data.answers.nama_kecamatan, activeValue('reg-kecamatan'), activeRow && activeRow.kecamatan, profile.nama_kecamatan, profile.kecamatan);
      data.answers.kecamatan = first(data.answers.kecamatan, data.answers.nama_kecamatan);
      data.answers.desa_kelurahan = first(data.answers.desa_kelurahan, activeValue('reg-desa'), activeRow && activeRow.desa_kelurahan, profile.desa_kelurahan, profile.nama_desa, profile.desa_tim, profile.desa);
      data.answers.nama_desa = first(data.answers.nama_desa, data.answers.desa_kelurahan);
      data.answers.dusun_rw = first(data.answers.dusun_rw, activeValue('reg-dusun'), activeRow && activeRow.dusun_rw, profile.dusun_rw, profile.nama_dusun);
      data.answers.nama_dusun = first(data.answers.nama_dusun, data.answers.dusun_rw);

      data.id_tim = first(data.id_tim, profile.id_tim);
      data.nama_tim = first(data.nama_tim, profile.nama_tim, profile.nomor_tim, profile.id_tim);
      data.id_wilayah = first(data.id_wilayah, activeRow && activeRow.id_wilayah, profile.id_wilayah, profile.id_wilayah_tugas);

      return data;
    };
  }

  var originalBuildPayload = RF.buildPayload;
  if (typeof originalBuildPayload === 'function') {
    RF.buildPayload = function (data, mode) {
      var payload = originalBuildPayload.apply(this, arguments) || {};
      var src = data || {};
      if (src.id_tim && !payload.id_tim) payload.id_tim = src.id_tim;
      if (src.id_wilayah && !payload.id_wilayah) payload.id_wilayah = src.id_wilayah;
      if (src.nama_tim && !payload.nama_tim) payload.nama_tim = src.nama_tim;
      payload.read_model_scope_binding = VERSION;
      return payload;
    };
  }

  function bindCascadeOnce() {
    var kecEl = byId('reg-kecamatan');
    var desaEl = byId('reg-desa');
    var dusunEl = byId('reg-dusun');

    if (kecEl && kecEl.dataset.readModelScopeBound !== '1') {
      kecEl.dataset.readModelScopeBound = '1';
      kecEl.addEventListener('change', function () {
        RF.handleScopeCascadeChange('kecamatan');
      });
    }

    if (desaEl && desaEl.dataset.readModelScopeBound !== '1') {
      desaEl.dataset.readModelScopeBound = '1';
      desaEl.addEventListener('change', function () {
        RF.handleScopeCascadeChange('desa');
      });
    }

    if (dusunEl && dusunEl.dataset.readModelScopeBound !== '1') {
      dusunEl.dataset.readModelScopeBound = '1';
      dusunEl.addEventListener('change', function () {
        RF.__readModelScopeActiveRow = findActiveScopeRow(RF.__readModelScopeRows || []);
        if (typeof RF.handleAnyFormChange === 'function') RF.handleAnyFormChange();
      });
    }
  }

  bindCascadeOnce();

  window.setTimeout(function () {
    bindCascadeOnce();
    if (byId('reg-kecamatan') || byId('reg-desa') || byId('reg-dusun')) {
      Promise.resolve()
        .then(function () { return RF.prefillScope(); })
        .then(function () {
          if (typeof RF.renderValidation === 'function') RF.renderValidation();
        })
        .catch(function () {});
    }
  }, 0);

  window.__TPK_REGISTRASI_SCOPE_BINDING_VERSION = VERSION;
})(window, document);
/* ===== READ MODEL BINDING R1-R1 end ===== */
/* ===== READ MODEL BINDING R1-R2 start: getWilayahRef suppression + dynamic form in-flight guard ===== */
(function (window, document) {
  'use strict';

  var RF = window.RegistrasiForm;
  if (!RF || RF.__READ_MODEL_SCOPE_BINDING_R1_R2 === true) return;
  RF.__READ_MODEL_SCOPE_BINDING_R1_R2 = true;

  var VERSION = 'READ-MODEL-BINDING-R1-R2-REGISTRASI-WILAYAH-SUPPRESSION-FORM-GUARD-20260526';
  var formDefinitionInFlight = Object.create(null);
  var formDefinitionMemory = Object.create(null);
  var loadDynamicInFlight = Object.create(null);

  function s(value) {
    return String(value == null ? '' : value).trim();
  }

  function up(value) {
    return s(value).toUpperCase();
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function getRouteName() {
    try {
      if (window.Router && typeof window.Router.getCurrentRoute === 'function') {
        return s(window.Router.getCurrentRoute());
      }
    } catch (err) {}
    return '';
  }

  function isRegistrasiContext() {
    var route = up(getRouteName());
    if (route === 'REGISTRASI' || route === 'REGISTRATION') return true;
    if (byId('reg-jenis-sasaran') || byId('registrasi-dynamic-fields')) return true;
    try {
      var title = document.querySelector('.screen.active, .app-screen.active, main, body');
      return title && /registrasi\s+sasaran/i.test(title.textContent || '');
    } catch (err) {
      return false;
    }
  }

  function readStorageJson(key) {
    try {
      if (window.Storage && typeof window.Storage.get === 'function') {
        var v = window.Storage.get(key, null);
        if (v) return v;
      }
    } catch (err) {}
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err2) {
      return null;
    }
  }

  function getProfileSync() {
    var candidates = [];
    try {
      if (window.AppState && typeof window.AppState.getProfile === 'function') candidates.push(window.AppState.getProfile());
    } catch (err) {}
    try {
      if (window.Storage && typeof window.Storage.getProfile === 'function') candidates.push(window.Storage.getProfile(null));
    } catch (err2) {}
    candidates.push(readStorageJson('tpk_profile'));
    candidates.push(readStorageJson('tpk_last_good_profile'));
    candidates.push(readStorageJson('tpk_bootstrap_lite'));
    candidates.push(readStorageJson('tpk_app_bootstrap'));

    for (var i = 0; i < candidates.length; i++) {
      var item = candidates[i];
      if (!item || typeof item !== 'object') continue;
      if (item.profile && typeof item.profile === 'object') item = item.profile;
      if (item.user_profile && typeof item.user_profile === 'object') item = item.user_profile;
      if (item.data && item.data.profile && typeof item.data.profile === 'object') item = item.data.profile;
      if (item.id_user || item.role_akses || item.id_tim || item.wilayah_tugas_list_json) return item;
    }
    return {};
  }

  function isKaderProfile(profile) {
    return up(profile && (profile.role_akses || profile.role || profile.user_role)) === 'KADER';
  }

  function getSelectedJenis() {
    var el = byId('reg-jenis-sasaran');
    if (el && el.value) return up(el.value);
    try {
      if (RF && RF._currentDefinition && RF._currentDefinition.jenis_sasaran) return up(RF._currentDefinition.jenis_sasaran);
    } catch (err) {}
    return '';
  }

  function mapJenisToFormId(jenis) {
    var key = up(jenis);
    var map = { CATIN: 'FRM1002', BUMIL: 'FRM1003', BUFAS: 'FRM1004', BADUTA: 'FRM1005' };
    return map[key] || 'FRM1001';
  }

  function getFormGuardKey(jenis) {
    var j = up(jenis);
    return mapJenisToFormId(j) + '::' + j;
  }

  function shouldSuppressGetWilayahRef(action, payload) {
    var actionName = up(action);
    if (actionName !== 'GETWILAYAHREF') return false;
    if (!isRegistrasiContext()) return false;

    var src = payload && typeof payload === 'object' ? payload : {};
    if (src.allow_backend === true || src.force_backend === true || src.forceRefresh === true) return false;

    var jenis = up(src.jenis_sasaran || src.jenis || getSelectedJenis());
    var reason = up(src.reason || src.source || src.context || '');

    // CATIN tetap boleh membaca referensi wilayah asal pasangan ketika memang dibutuhkan.
    if (jenis === 'CATIN') return false;
    if (reason.indexOf('CATIN') >= 0 || reason.indexOf('PASANGAN') >= 0 || reason.indexOf('ASAL') >= 0) return false;

    var profile = getProfileSync();
    return isKaderProfile(profile);
  }

  function createSuppressedWilayahRefResult(action, payload) {
    var profile = getProfileSync();
    var jenis = up((payload && (payload.jenis_sasaran || payload.jenis)) || getSelectedJenis());
    var stat = window.__TPK_REGISTRASI_R1R2_STATS__ || { getWilayahRef_suppressed: 0, form_definition_inflight_join: 0, load_dynamic_inflight_join: 0, load_dynamic_skip_same_form: 0 };
    stat.getWilayahRef_suppressed += 1;
    stat.last_getWilayahRef_suppressed_at = new Date().toISOString();
    stat.last_getWilayahRef_suppressed_reason = 'kader_scope_from_user_profile_lite';
    window.__TPK_REGISTRASI_R1R2_STATS__ = stat;

    try {
      console.info('[TPK_REGISTRASI_R1R2] getWilayahRef suppressed for KADER registrasi scope', {
        action: action,
        jenis_sasaran: jenis,
        id_user: profile && profile.id_user,
        id_tim: profile && profile.id_tim,
        source: VERSION
      });
    } catch (err) {}

    return Promise.resolve({
      ok: true,
      code: 200,
      message: 'getWilayahRef dilewati untuk KADER; wilayah registrasi memakai user_profile_lite.',
      data: [],
      meta: {
        source: 'frontend_scope_guard',
        read_model_scope_binding: VERSION,
        skip_getWilayahRef_for_kader: true,
        scope_source: 'user_profile_lite',
        jenis_sasaran: jenis,
        id_user: profile && profile.id_user || '',
        id_tim: profile && profile.id_tim || ''
      }
    });
  }

  function patchApiPost() {
    var api = window.Api;
    if (!api || typeof api.post !== 'function' || api.__REGISTRASI_R1R2_WILAYAH_SUPPRESS === true) return;

    var originalPost = api.post;
    api.post = function (action, payload, options) {
      if (shouldSuppressGetWilayahRef(action, payload)) {
        return createSuppressedWilayahRefResult(action, payload);
      }
      return originalPost.apply(this, arguments);
    };
    api.__REGISTRASI_R1R2_WILAYAH_SUPPRESS = true;
  }

  function markDefinitionResult(result, source) {
    if (result && typeof result === 'object') {
      try {
        Object.defineProperty(result, '__r1r2_form_guard_source', { value: source, configurable: true, enumerable: false });
      } catch (err) {
        result.__r1r2_form_guard_source = source;
      }
    }
    return result;
  }

  function patchFormDefinitionGuard() {
    if (typeof RF.getRegistrasiFormDefinition !== 'function' || RF.__REGISTRASI_R1R2_FORM_DEF_GUARD === true) return;

    var originalGetDefinition = RF.getRegistrasiFormDefinition;
    RF.getRegistrasiFormDefinition = async function (jenisSasaran, options) {
      var jenis = up(jenisSasaran);
      if (!jenis) return originalGetDefinition.apply(this, arguments);

      var opts = options || {};
      var key = getFormGuardKey(jenis);

      if (opts.forceRefresh !== true && formDefinitionMemory[key]) {
        return markDefinitionResult(formDefinitionMemory[key], 'r1r2_memory_hit');
      }

      if (opts.forceRefresh !== true && formDefinitionInFlight[key]) {
        var stat = window.__TPK_REGISTRASI_R1R2_STATS__ || { getWilayahRef_suppressed: 0, form_definition_inflight_join: 0, load_dynamic_inflight_join: 0, load_dynamic_skip_same_form: 0 };
        stat.form_definition_inflight_join += 1;
        stat.last_form_definition_inflight_join_at = new Date().toISOString();
        window.__TPK_REGISTRASI_R1R2_STATS__ = stat;
        return markDefinitionResult(await formDefinitionInFlight[key], 'r1r2_inflight_join');
      }

      formDefinitionInFlight[key] = Promise.resolve()
        .then(() => originalGetDefinition.apply(this, arguments))
        .then((result) => {
          if (result && typeof result === 'object' && opts.prefetch !== true) {
            formDefinitionMemory[key] = result;
          }
          return markDefinitionResult(result, 'r1r2_backend_or_existing_cache');
        })
        .finally(() => {
          delete formDefinitionInFlight[key];
        });

      return formDefinitionInFlight[key];
    };

    RF.__REGISTRASI_R1R2_FORM_DEF_GUARD = true;
  }

  function hasRenderedDynamicFields() {
    var box = byId('registrasi-dynamic-fields');
    if (!box) return false;
    var text = s(box.textContent).toLowerCase();
    if (!text) return false;
    if (text.indexOf('pilih jenis sasaran untuk memuat') >= 0) return false;
    if (text.indexOf('gagal memuat') >= 0) return false;
    try {
      return !!box.querySelector('input, select, textarea, [data-question-code], .dynamic-field, .form-field');
    } catch (err) {
      return text.length > 20;
    }
  }

  function patchLoadDynamicGuard() {
    if (typeof RF.loadDynamicFields !== 'function' || RF.__REGISTRASI_R1R2_LOAD_DYNAMIC_GUARD === true) return;

    var originalLoadDynamic = RF.loadDynamicFields;
    RF.loadDynamicFields = async function (jenisSasaran) {
      var jenis = up(jenisSasaran);
      if (!jenis) return originalLoadDynamic.apply(this, arguments);

      var key = getFormGuardKey(jenis);
      var currentFormId = s(this._currentFormId);
      var expectedFormId = mapJenisToFormId(jenis);
      var currentJenis = up(this._currentJenisSasaran || (this._currentDefinition && this._currentDefinition.jenis_sasaran));
      var questions = Array.isArray(this._dynamicQuestions) ? this._dynamicQuestions : [];

      if ((currentJenis === jenis || currentFormId === expectedFormId) && questions.length && hasRenderedDynamicFields()) {
        var statSkip = window.__TPK_REGISTRASI_R1R2_STATS__ || { getWilayahRef_suppressed: 0, form_definition_inflight_join: 0, load_dynamic_inflight_join: 0, load_dynamic_skip_same_form: 0 };
        statSkip.load_dynamic_skip_same_form += 1;
        statSkip.last_load_dynamic_skip_same_form_at = new Date().toISOString();
        window.__TPK_REGISTRASI_R1R2_STATS__ = statSkip;

        try { if (typeof this.applyGenderLockByJenis === 'function') this.applyGenderLockByJenis(); } catch (err) {}
        try { if (typeof this.applyJenisSpecificStaticFields === 'function') this.applyJenisSpecificStaticFields(); } catch (err2) {}
        try { if (typeof this.updateConditionalDynamicFields === 'function') this.updateConditionalDynamicFields(); } catch (err3) {}
        try { if (typeof this.handleAnyFormChange === 'function') this.handleAnyFormChange(); } catch (err4) {}
        return { ok: true, skipped: true, reason: 'same_form_already_rendered', version: VERSION };
      }

      if (loadDynamicInFlight[key]) {
        var statJoin = window.__TPK_REGISTRASI_R1R2_STATS__ || { getWilayahRef_suppressed: 0, form_definition_inflight_join: 0, load_dynamic_inflight_join: 0, load_dynamic_skip_same_form: 0 };
        statJoin.load_dynamic_inflight_join += 1;
        statJoin.last_load_dynamic_inflight_join_at = new Date().toISOString();
        window.__TPK_REGISTRASI_R1R2_STATS__ = statJoin;
        return loadDynamicInFlight[key];
      }

      loadDynamicInFlight[key] = Promise.resolve()
        .then(() => originalLoadDynamic.apply(this, arguments))
        .then((result) => {
          this._currentJenisSasaran = jenis;
          this._currentFormId = this._currentFormId || expectedFormId;
          return result;
        })
        .finally(() => {
          delete loadDynamicInFlight[key];
        });

      return loadDynamicInFlight[key];
    };

    RF.__REGISTRASI_R1R2_LOAD_DYNAMIC_GUARD = true;
  }

  function exposeDebug() {
    window.__TPK_REGISTRASI_R1R2_VERSION__ = VERSION;
    window.__TPK_REGISTRASI_R1R2_DEBUG__ = {
      version: VERSION,
      getStats: function () {
        return window.__TPK_REGISTRASI_R1R2_STATS__ || { getWilayahRef_suppressed: 0, form_definition_inflight_join: 0, load_dynamic_inflight_join: 0, load_dynamic_skip_same_form: 0 };
      },
      clearMemory: function () {
        formDefinitionInFlight = Object.create(null);
        formDefinitionMemory = Object.create(null);
        loadDynamicInFlight = Object.create(null);
        window.__TPK_REGISTRASI_R1R2_STATS__ = { getWilayahRef_suppressed: 0, form_definition_inflight_join: 0, load_dynamic_inflight_join: 0, load_dynamic_skip_same_form: 0 };
        return true;
      }
    };
  }

  patchApiPost();
  patchFormDefinitionGuard();
  patchLoadDynamicGuard();
  exposeDebug();

  // Api kadang dimuat/ditimpa setelah view; ulangi binding singkat tanpa mengganggu render.
  window.setTimeout(patchApiPost, 0);
  window.setTimeout(patchApiPost, 300);
})(window, document);
/* ===== READ MODEL BINDING R1-R2 end ===== */
/* ===== READ MODEL BINDING R1-R3 start: submit actual save CATIN/BUMIL guard ===== */
(function (window, document) {
  'use strict';

  var RF = window.RegistrasiForm;
  if (!RF || RF.__READ_MODEL_SCOPE_BINDING_R1_R3 === true) return;
  RF.__READ_MODEL_SCOPE_BINDING_R1_R3 = true;

  var VERSION = 'READ-MODEL-BINDING-R1-R3-SUBMIT-ACTUAL-SAVE-CATIN-BUMIL-GUARD-20260527';

  function s(value) {
    return String(value == null ? '' : value).trim();
  }

  function up(value) {
    return s(value).toUpperCase();
  }

  function lowerSnake(value) {
    return s(value)
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = arguments[i];
      if (value !== undefined && value !== null && s(value) !== '') return value;
    }
    return '';
  }

  function cloneObject(obj) {
    if (!obj || typeof obj !== 'object') return {};
    try { return JSON.parse(JSON.stringify(obj)); } catch (err) {}
    var out = Array.isArray(obj) ? [] : {};
    Object.keys(obj).forEach(function (key) { out[key] = obj[key]; });
    return out;
  }

  function normalizeOption(opt, index) {
    opt = opt || {};
    var value = firstNonEmpty(opt.value, opt.option_value, opt.code, opt.id);
    var label = firstNonEmpty(opt.label, opt.option_label, opt.text, value);
    return {
      option_id: s(opt.option_id || opt.id || ''),
      value: s(value),
      label: s(label),
      order: Number(firstNonEmpty(opt.order, opt.option_order, index + 1)) || (index + 1),
      parent_option_value: s(opt.parent_option_value || ''),
      reference_key: s(opt.reference_key || ''),
      is_risk_value: opt.is_risk_value === true
    };
  }

  function normalizeQuestion(q, fallbackSection, fallbackOrder) {
    q = cloneObject(q || {});
    var code = lowerSnake(firstNonEmpty(q.store_key, q.question_code, q.code, q.key, q.question_id));
    if (!code) return null;

    var section = fallbackSection || {};
    var fieldType = lowerSnake(firstNonEmpty(q.field_type, q.input_type, q.type, 'text'));
    if (fieldType === 'dropdown' || fieldType === 'radio') fieldType = 'select';
    if (fieldType !== 'select' && fieldType !== 'textarea' && fieldType !== 'date' && fieldType !== 'number') fieldType = 'text';

    q.code = code;
    q.question_id = s(firstNonEmpty(q.question_id, 'OVR-' + code.toUpperCase()));
    q.label = s(firstNonEmpty(q.label, q.question_label, q.short_label, code));
    q.short_label = s(firstNonEmpty(q.short_label, q.question_short_label, q.label));
    q.help_text = s(q.help_text || '');
    q.placeholder = s(q.placeholder || '');
    q.field_type = fieldType;
    q.data_type = lowerSnake(firstNonEmpty(q.data_type, 'string'));
    q.is_required = q.is_required === true || up(q.is_required) === 'TRUE' || up(q.required) === 'TRUE';
    q.is_editable = !(q.is_editable === false || up(q.is_editable) === 'FALSE');
    q.section_id = s(firstNonEmpty(q.section_id, section.section_id, 'SEC-CATIN-DOMISILI'));
    q.section_label = s(firstNonEmpty(q.section_label, section.section_label, 'Domisili Setelah Menikah'));
    q.section_order = Number(firstNonEmpty(q.section_order, section.section_order, 860)) || 860;
    q.question_order = Number(firstNonEmpty(q.question_order, fallbackOrder, 10)) || 10;
    q.options = Array.isArray(q.options) ? q.options.map(normalizeOption).filter(function (opt) { return opt.value !== ''; }) : [];
    q.rules = Array.isArray(q.rules) ? q.rules : [];
    return q;
  }

  function flattenQuestionsFromDefinition(definition) {
    var out = [];
    definition = definition || {};

    (Array.isArray(definition.sections) ? definition.sections : []).forEach(function (section) {
      (Array.isArray(section.questions) ? section.questions : []).forEach(function (q, idx) {
        var normalized = normalizeQuestion(q, section, idx + 1);
        if (normalized) out.push(normalized);
      });
    });

    (Array.isArray(definition.questions) ? definition.questions : []).forEach(function (q, idx) {
      var normalized = normalizeQuestion(q, null, idx + 1);
      if (normalized) out.push(normalized);
    });

    return out;
  }

  function findQuestionByCode(definition, codes) {
    var wanted = {};
    (codes || []).forEach(function (code) { wanted[lowerSnake(code)] = true; });
    var list = flattenQuestionsFromDefinition(definition);
    for (var i = 0; i < list.length; i += 1) {
      if (wanted[lowerSnake(list[i].code)]) return list[i];
    }
    return null;
  }

  function outputHasQuestion(definition, code) {
    var target = lowerSnake(code);
    var list = flattenQuestionsFromDefinition(definition || {});
    return list.some(function (q) { return lowerSnake(q.code) === target; });
  }

  function sortQuestions(questions) {
    return (questions || []).sort(function (a, b) {
      return Number(a.question_order || 0) - Number(b.question_order || 0);
    });
  }

  function sortSections(sections) {
    return (sections || []).sort(function (a, b) {
      return Number(a.section_order || 0) - Number(b.section_order || 0);
    });
  }

  function rebuildFlatQuestions(sections) {
    var flat = [];
    (sections || []).forEach(function (section) {
      (section.questions || []).forEach(function (q) { flat.push(q); });
    });
    return flat;
  }

  function addQuestionSection(definition, question) {
    if (!question) return definition;
    var out = Object.assign({}, definition || {});
    var sections = (Array.isArray(out.sections) ? out.sections : []).map(function (section) {
      return Object.assign({}, section, { questions: (section.questions || []).slice() });
    });

    var sectionId = s(question.section_id || 'SEC-CATIN-DOMISILI');
    var existing = null;
    for (var i = 0; i < sections.length; i += 1) {
      if (s(sections[i].section_id) === sectionId) {
        existing = sections[i];
        break;
      }
    }

    if (!existing) {
      existing = {
        section_id: sectionId,
        section_label: s(question.section_label || 'Domisili Setelah Menikah'),
        section_order: Number(question.section_order || 860) || 860,
        questions: []
      };
      sections.push(existing);
    }

    if (!(existing.questions || []).some(function (q) { return lowerSnake(q.code) === lowerSnake(question.code); })) {
      existing.questions.push(question);
      existing.questions = sortQuestions(existing.questions);
    }

    out.sections = sortSections(sections).filter(function (section) {
      return section.questions && section.questions.length;
    });
    out.questions = rebuildFlatQuestions(out.sections);
    return out;
  }

  function normalizeBumilKehamilanValue(value) {
    var raw = s(value);
    if (!raw) return '';
    var key = lowerSnake(raw);
    var map = {
      ya_ingin_hamil_segera: 'YA_INGIN_HAMIL_SEGERA',
      ya_ingin_hamil_segera_: 'YA_INGIN_HAMIL_SEGERA',
      ya_ingin_hamil_segera__:'YA_INGIN_HAMIL_SEGERA',
      tidak_ingin_hamil_nanti: 'TIDAK_INGIN_HAMIL_NANTI',
      tidak_ingin_hamil_lagi: 'TIDAK_INGIN_HAMIL_LAGI',
      tidak_ingin_hamil_lagi_: 'TIDAK_INGIN_HAMIL_LAGI',
      tidak_ingin_hamil_lagi__:'TIDAK_INGIN_HAMIL_LAGI'
    };
    if (map[key]) return map[key];
    return up(raw).replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  function getDynamicInputValue(code) {
    var target = lowerSnake(code);
    var el = document.querySelector('[data-reg-question-code="' + target + '"]') || document.getElementById('dyn-' + target);
    if (!el) return '';
    return s(el.value);
  }

  var oldApplyDefinitionOverrides = typeof RF.applyDefinitionOverrides === 'function' ? RF.applyDefinitionOverrides : null;
  if (oldApplyDefinitionOverrides) {
    RF.applyDefinitionOverrides = function (definition, jenisSasaran, refs) {
      var out = oldApplyDefinitionOverrides.apply(this, arguments) || definition || {};
      if (up(jenisSasaran) !== 'CATIN') return out;

      if (!outputHasQuestion(out, 'domisili_setelah_menikah')) {
        var sourceQuestion = findQuestionByCode(definition, [
          'domisili_setelah_menikah',
          'DOMISILI_SETELAH_MENIKAH',
          'domisili_menikah',
          'alamat_domisili_setelah_menikah'
        ]);

        if (sourceQuestion) {
          sourceQuestion = normalizeQuestion(Object.assign({}, sourceQuestion, {
            section_id: 'SEC-CATIN-DOMISILI',
            section_label: 'Domisili Setelah Menikah',
            section_order: 860,
            question_order: 10,
            code: 'domisili_setelah_menikah',
            store_key: 'domisili_setelah_menikah'
          }), { section_id: 'SEC-CATIN-DOMISILI', section_label: 'Domisili Setelah Menikah', section_order: 860 }, 10);
          out = addQuestionSection(out, sourceQuestion);
        }
      }

      return out;
    };
  }

  var oldBuildPayload = typeof RF.buildPayload === 'function' ? RF.buildPayload : null;
  if (oldBuildPayload) {
    RF.buildPayload = function (data, mode) {
      var payload = oldBuildPayload.apply(this, arguments) || {};
      var jenis = up(payload.jenis_sasaran || (payload.answers && payload.answers.jenis_sasaran));
      payload.answers = payload.answers || {};

      if (jenis === 'BUMIL') {
        var bumilValue = firstNonEmpty(
          getDynamicInputValue('kehamilan_diinginkan'),
          payload.answers.kehamilan_diinginkan,
          payload.answers.KEHAMILAN_DIINGINKAN
        );
        if (bumilValue) payload.answers.kehamilan_diinginkan = normalizeBumilKehamilanValue(bumilValue);
      }

      if (jenis === 'CATIN') {
        var domisiliInputValue = getDynamicInputValue('domisili_setelah_menikah');
        if (domisiliInputValue) {
          payload.answers.domisili_setelah_menikah = domisiliInputValue;
        } else if (payload.answers.domisili_setelah_menikah) {
          // Jangan kirim hasil gabungan asal pasangan sebagai jawaban select domisili setelah menikah.
          // Jika field domisili belum tampil/terisi, biarkan backend/frontend validasi sebagai kosong.
          delete payload.answers.domisili_setelah_menikah;
        }

        if (!s(payload.answers.data_pasangan)) {
          var pasanganParts = [];
          if (s(payload.answers.nama_pasangan)) pasanganParts.push('Nama: ' + s(payload.answers.nama_pasangan));
          if (s(payload.answers.nik_pasangan)) pasanganParts.push('NIK: ' + s(payload.answers.nik_pasangan).replace(/\D+/g, '').slice(0, 16));
          if (pasanganParts.length) payload.answers.data_pasangan = pasanganParts.join(' | ');
        }
      }

      payload.__frontend_submit_guard_version = VERSION;
      return payload;
    };
  }

  window.__TPK_REGISTRASI_R1R3_DEBUG__ = {
    version: VERSION,
    hasDefinitionOverride: !!oldApplyDefinitionOverrides,
    hasBuildPayloadOverride: !!oldBuildPayload
  };
  window.__TPK_REGISTRASI_SUBMIT_FIX_VERSION = VERSION;
})(window, document);
/* ===== READ MODEL BINDING R1-R3 end ===== */
/* ===== READ MODEL BINDING R1-R3-R1 start: CATIN domisili render + BUMIL option canonical + draft/reset binding ===== */
(function (window, document) {
  'use strict';

  var RF = window.RegistrasiForm;
  if (!RF || RF.__READ_MODEL_SCOPE_BINDING_R1_R3_R1 === true) return;
  RF.__READ_MODEL_SCOPE_BINDING_R1_R3_R1 = true;

  var VERSION = 'READ-MODEL-BINDING-R1-R3-R1-REGISTRASI-SUBMIT-UI-OPTION-FIX-20260527';
  var DRAFT_KEY = 'tpk_registrasi_draft_v_final';

  function s(value) {
    return String(value === null || value === undefined ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function up(value) {
    return s(value).toUpperCase();
  }

  function lowerSnake(value) {
    return s(value)
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = arguments[i];
      if (value !== undefined && value !== null && s(value) !== '') return value;
    }
    return '';
  }

  function clone(obj) {
    if (!obj || typeof obj !== 'object') return {};
    try { return JSON.parse(JSON.stringify(obj)); } catch (err) {}
    var out = Array.isArray(obj) ? [] : {};
    Object.keys(obj).forEach(function (key) { out[key] = obj[key]; });
    return out;
  }

  function isFunction(fn) {
    return typeof fn === 'function';
  }

  function notify(message, type) {
    try {
      if (window.Notifier && isFunction(window.Notifier.show)) {
        window.Notifier.show(message, type || 'info');
        return;
      }
      if (window.UI && isFunction(window.UI.showToast)) {
        window.UI.showToast(message, type || 'info');
        return;
      }
    } catch (err) {}
    try { window.alert(message); } catch (err2) {}
  }

  function normalizeOption(opt, index) {
    opt = opt || {};
    var value = firstNonEmpty(opt.value, opt.option_value, opt.code, opt.id, opt.label, opt.option_label);
    var label = firstNonEmpty(opt.label, opt.option_label, opt.text, value);
    return {
      option_id: s(firstNonEmpty(opt.option_id, opt.id)),
      value: s(value),
      label: s(label),
      order: Number(firstNonEmpty(opt.order, opt.option_order, index + 1)) || (index + 1),
      parent_option_value: s(opt.parent_option_value || ''),
      reference_key: s(opt.reference_key || ''),
      is_risk_value: opt.is_risk_value === true
    };
  }

  function normalizeQuestion(q, section, fallbackOrder) {
    q = clone(q || {});
    section = section || {};
    var code = lowerSnake(firstNonEmpty(q.store_key, q.question_code, q.code, q.key, q.question_id));
    if (!code) return null;

    var fieldType = lowerSnake(firstNonEmpty(q.field_type, q.input_type, q.type, 'text'));
    if (fieldType === 'dropdown' || fieldType === 'radio') fieldType = 'select';
    if (fieldType !== 'select' && fieldType !== 'textarea' && fieldType !== 'date' && fieldType !== 'number') fieldType = 'text';

    var options = Array.isArray(q.options) ? q.options.map(normalizeOption).filter(function (opt) { return !!opt.value; }) : [];
    if (code === 'domisili_setelah_menikah' && options.length) fieldType = 'select';

    return {
      question_id: s(firstNonEmpty(q.question_id, 'OVR-' + code.toUpperCase())),
      code: code,
      label: s(firstNonEmpty(q.label, q.question_label, q.short_label, q.question_short_label, code)),
      short_label: s(firstNonEmpty(q.short_label, q.question_short_label, q.label, q.question_label, code)),
      help_text: s(q.help_text || ''),
      placeholder: s(q.placeholder || ''),
      field_type: fieldType,
      data_type: lowerSnake(firstNonEmpty(q.data_type, 'string')),
      is_required: q.is_required === true || up(q.is_required) === 'TRUE' || up(q.required) === 'TRUE',
      validation_rule: s(q.validation_rule || ''),
      visibility_rule: s(q.visibility_rule || ''),
      requirement_rule: s(q.requirement_rule || ''),
      readonly_rule: s(q.readonly_rule || ''),
      default_value: firstNonEmpty(q.resolved_default_value, q.default_value),
      is_editable: !(q.is_editable === false || up(q.is_editable) === 'FALSE'),
      section_id: s(firstNonEmpty(q.section_id, section.section_id, 'SEC-CATIN-DOMISILI')),
      section_label: s(firstNonEmpty(q.section_label, section.section_label, 'Domisili Setelah Menikah')),
      section_order: Number(firstNonEmpty(q.section_order, section.section_order, 860)) || 860,
      question_order: Number(firstNonEmpty(q.question_order, fallbackOrder, 10)) || 10,
      min_value: firstNonEmpty(q.min_value, ''),
      max_value: firstNonEmpty(q.max_value, ''),
      options: options,
      rules: Array.isArray(q.rules) ? q.rules : []
    };
  }

  function flattenRawQuestions(definition) {
    var out = [];
    definition = definition || {};
    (Array.isArray(definition.sections) ? definition.sections : []).forEach(function (section) {
      (Array.isArray(section.questions) ? section.questions : []).forEach(function (q, idx) {
        var nq = normalizeQuestion(q, section, idx + 1);
        if (nq) out.push(nq);
      });
    });
    (Array.isArray(definition.questions) ? definition.questions : []).forEach(function (q, idx) {
      var nq = normalizeQuestion(q, null, idx + 1);
      if (nq) out.push(nq);
    });
    (Array.isArray(definition.fields) ? definition.fields : []).forEach(function (q, idx) {
      var nq = normalizeQuestion(q, null, idx + 1);
      if (nq) out.push(nq);
    });
    return out;
  }

  function findRawQuestion(definition, codes) {
    var wanted = {};
    (codes || []).forEach(function (code) { wanted[lowerSnake(code)] = true; });
    var list = flattenRawQuestions(definition);
    for (var i = 0; i < list.length; i += 1) {
      if (wanted[list[i].code]) return list[i];
    }
    return null;
  }

  function hasQuestion(definition, code) {
    var target = lowerSnake(code);
    var list = flattenRawQuestions(definition);
    return list.some(function (q) { return q.code === target; });
  }

  function addQuestionToDefinition(definition, question) {
    if (!question) return definition;
    var out = Object.assign({}, definition || {});
    var sections = (Array.isArray(out.sections) ? out.sections : []).map(function (section) {
      return Object.assign({}, section, { questions: (section.questions || []).slice() });
    });

    var sectionId = s(question.section_id || 'SEC-CATIN-DOMISILI');
    var section = null;
    for (var i = 0; i < sections.length; i += 1) {
      if (s(sections[i].section_id) === sectionId) {
        section = sections[i];
        break;
      }
    }

    if (!section) {
      section = {
        section_id: sectionId,
        section_label: s(question.section_label || 'Domisili Setelah Menikah'),
        section_order: Number(question.section_order || 860) || 860,
        questions: []
      };
      sections.push(section);
    }

    if (!(section.questions || []).some(function (q) { return lowerSnake(firstNonEmpty(q.code, q.store_key, q.question_code, q.question_id)) === lowerSnake(question.code); })) {
      section.questions.push(question);
    }

    sections.forEach(function (sec) {
      sec.questions = (sec.questions || []).sort(function (a, b) {
        return Number(a.question_order || 0) - Number(b.question_order || 0);
      });
    });
    sections.sort(function (a, b) { return Number(a.section_order || 0) - Number(b.section_order || 0); });

    out.sections = sections.filter(function (sec) { return sec.questions && sec.questions.length; });
    var flat = [];
    out.sections.forEach(function (sec) { (sec.questions || []).forEach(function (q) { flat.push(q); }); });
    out.questions = flat;
    return out;
  }

  function buildFallbackDomisiliQuestion() {
    return normalizeQuestion({
      question_id: 'OVR-CATIN-DOMISILI-SETELAH-MENIKAH',
      store_key: 'domisili_setelah_menikah',
      question_code: 'DOMISILI_SETELAH_MENIKAH',
      code: 'domisili_setelah_menikah',
      label: 'Domisili Setelah Menikah',
      short_label: 'Domisili Setelah Menikah',
      help_text: 'Isi domisili rencana setelah menikah.',
      placeholder: 'Contoh: ikut suami / ikut istri / rumah sendiri',
      field_type: 'text',
      data_type: 'string',
      is_required: false,
      section_id: 'SEC-CATIN-DOMISILI',
      section_label: 'Domisili Setelah Menikah',
      section_order: 860,
      question_order: 10,
      options: [],
      rules: []
    }, { section_id: 'SEC-CATIN-DOMISILI', section_label: 'Domisili Setelah Menikah', section_order: 860 }, 10);
  }

  var oldNormalizeDefinition = typeof RF.normalizeDefinition === 'function' ? RF.normalizeDefinition : null;
  if (oldNormalizeDefinition) {
    RF.normalizeDefinition = function (definition, jenisSasaran, refs) {
      var out = oldNormalizeDefinition.apply(this, arguments) || {};
      if (up(jenisSasaran) !== 'CATIN') return out;
      if (hasQuestion(out, 'domisili_setelah_menikah')) return out;

      var source = findRawQuestion(definition, [
        'domisili_setelah_menikah',
        'DOMISILI_SETELAH_MENIKAH',
        'domisili_menikah',
        'alamat_domisili_setelah_menikah'
      ]);

      if (source) {
        source = Object.assign({}, source, {
          code: 'domisili_setelah_menikah',
          store_key: 'domisili_setelah_menikah',
          question_code: 'DOMISILI_SETELAH_MENIKAH',
          section_id: 'SEC-CATIN-DOMISILI',
          section_label: 'Domisili Setelah Menikah',
          section_order: 860,
          question_order: 10,
          is_editable: true
        });
      } else {
        source = buildFallbackDomisiliQuestion();
      }

      return addQuestionToDefinition(out, normalizeQuestion(source, {
        section_id: 'SEC-CATIN-DOMISILI',
        section_label: 'Domisili Setelah Menikah',
        section_order: 860
      }, 10));
    };
  }

  function normalizeBumilKehamilanValue(value) {
    var raw = s(value);
    if (!raw) return '';
    var key = lowerSnake(raw);
    var map = {
      ya_ingin_hamil_segera: 'YA_INGIN_HAMIL_SEGERA',
      ingin_hamil_segera: 'YA_INGIN_HAMIL_SEGERA',
      ya_hamil_segera: 'YA_INGIN_HAMIL_SEGERA',
      tidak_ingin_hamil_nanti: 'TIDAK_INGIN_HAMIL_NANTI',
      tidak_hamil_nanti: 'TIDAK_INGIN_HAMIL_NANTI',
      ingin_hamil_nanti: 'TIDAK_INGIN_HAMIL_NANTI',
      tidak_ingin_hamil_lagi: 'TIDAK_INGIN_HAMIL_LAGI',
      tidak_hamil_lagi: 'TIDAK_INGIN_HAMIL_LAGI',
      tidak_ingin_hamil: 'TIDAK_INGIN_HAMIL_LAGI'
    };
    if (map[key]) return map[key];
    return up(raw).replace(/[^A-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  }

  function getDynamicInput(code) {
    var target = lowerSnake(code);
    return document.querySelector('[data-reg-question-code="' + target + '"]') || document.getElementById('dyn-' + target);
  }

  function getDynamicInputValue(code) {
    var el = getDynamicInput(code);
    return el ? s(el.value) : '';
  }

  var oldBuildPayload = typeof RF.buildPayload === 'function' ? RF.buildPayload : null;
  if (oldBuildPayload) {
    RF.buildPayload = function (data, mode) {
      var payload = oldBuildPayload.apply(this, arguments) || {};
      var jenis = up(payload.jenis_sasaran || (payload.answers && payload.answers.jenis_sasaran));
      payload.answers = payload.answers || {};

      if (jenis === 'BUMIL') {
        var selected = firstNonEmpty(
          getDynamicInputValue('kehamilan_diinginkan'),
          payload.answers.kehamilan_diinginkan,
          payload.answers.KEHAMILAN_DIINGINKAN
        );
        if (selected) {
          payload.answers.kehamilan_diinginkan = normalizeBumilKehamilanValue(selected);
          payload.answers.KEHAMILAN_DIINGINKAN = payload.answers.kehamilan_diinginkan;
        }
      }

      if (jenis === 'CATIN') {
        var domisili = getDynamicInputValue('domisili_setelah_menikah');
        if (domisili) {
          payload.answers.domisili_setelah_menikah = domisili;
          payload.answers.DOMISILI_SETELAH_MENIKAH = domisili;
        } else {
          delete payload.answers.domisili_setelah_menikah;
          delete payload.answers.DOMISILI_SETELAH_MENIKAH;
        }

        if (!s(payload.answers.data_pasangan)) {
          var parts = [];
          if (s(payload.answers.nama_pasangan)) parts.push('Nama: ' + s(payload.answers.nama_pasangan));
          if (s(payload.answers.nik_pasangan)) parts.push('NIK: ' + s(payload.answers.nik_pasangan).replace(/\D+/g, '').slice(0, 16));
          if (parts.length) payload.answers.data_pasangan = parts.join(' | ');
        }
      }

      payload.__frontend_submit_guard_version = VERSION;
      return payload;
    };
  }

  function saveDraftNow() {
    var data = null;
    if (isFunction(RF.collectFormData)) {
      data = RF.collectFormData();
    }
    if (!data || typeof data !== 'object') data = {};
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ saved_at: new Date().toISOString(), data: data }));
    } catch (err) {
      notify('Draft tidak dapat disimpan di perangkat ini.', 'error');
      return false;
    }
    notify('Draft registrasi berhasil disimpan di perangkat.', 'success');
    return true;
  }

  async function resetFormNow() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (err) {}
    try { if (isFunction(RF.resetForm)) RF.resetForm(); } catch (err2) {}
    try { if (isFunction(RF.applyModeUI)) RF.applyModeUI(); } catch (err3) {}
    try { if (isFunction(RF.prefillScope)) await RF.prefillScope(); } catch (err4) {}
    try { if (isFunction(RF.applyGenderLockByJenis)) RF.applyGenderLockByJenis(); } catch (err5) {}
    try { if (isFunction(RF.applyJenisSpecificStaticFields)) RF.applyJenisSpecificStaticFields(); } catch (err6) {}
    try { if (isFunction(RF.renderValidation)) RF.renderValidation(); } catch (err7) {}
    notify('Form registrasi sudah direset.', 'info');
  }

  function buttonText(el) {
    if (!el) return '';
    var value = '';
    try { value = el.value || ''; } catch (err) {}
    return up(firstNonEmpty(value, el.textContent, el.getAttribute && el.getAttribute('aria-label'), el.getAttribute && el.getAttribute('title')));
  }

  function isDraftButton(el) {
    var id = up(el && el.id);
    var action = up(el && el.getAttribute && (el.getAttribute('data-action') || el.getAttribute('name')));
    var text = buttonText(el);
    return id.indexOf('DRAFT') >= 0 || action.indexOf('DRAFT') >= 0 || text.indexOf('SIMPAN DRAFT') >= 0;
  }

  function isResetButton(el) {
    var id = up(el && el.id);
    var action = up(el && el.getAttribute && (el.getAttribute('data-action') || el.getAttribute('name')));
    var text = buttonText(el);
    var type = up(el && el.getAttribute && el.getAttribute('type'));
    return id.indexOf('RESET') >= 0 || action.indexOf('RESET') >= 0 || text === 'RESET' || type === 'RESET';
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var btn = target.closest('button, input[type="button"], input[type="reset"], a, [role="button"]');
    if (!btn) return;

    if (isDraftButton(btn)) {
      event.preventDefault();
      event.stopPropagation();
      saveDraftNow();
      return;
    }

    if (isResetButton(btn)) {
      event.preventDefault();
      event.stopPropagation();
      resetFormNow();
    }
  }, true);

  window.__TPK_REGISTRASI_R1R3R1_DEBUG__ = {
    version: VERSION,
    normalizeDefinitionPatched: !!oldNormalizeDefinition,
    buildPayloadPatched: !!oldBuildPayload,
    saveDraftNow: saveDraftNow,
    resetFormNow: resetFormNow
  };
  window.__TPK_REGISTRASI_SUBMIT_FIX_VERSION = VERSION;
})(window, document);
/* ===== READ MODEL BINDING R1-R3-R1 end ===== */


/* ===== READ MODEL BINDING R1-R3-R2 start: post-submit action UX ===== */
(function (window, document) {
  'use strict';

  var VERSION = 'READ-MODEL-BINDING-R1-R3-R2-REGISTRASI-POST-SUBMIT-UX-20260527';
  var RF = window.RegistrasiForm;
  if (!RF || RF.__REGISTRASI_POST_SUBMIT_UX_R1R3R2 === true) return;
  RF.__REGISTRASI_POST_SUBMIT_UX_R1R3R2 = true;

  var DRAFT_KEY = 'tpk_registrasi_draft_v_final';
  var lastSuccessContext = null;

  function isFunction(fn) { return typeof fn === 'function'; }
  function safeTrim(value) { return String(value == null ? '' : value).trim(); }
  function up(value) { return safeTrim(value).toUpperCase(); }
  function getMode() {
    try {
      if (window.RegistrasiState && isFunction(window.RegistrasiState.getMode)) {
        return window.RegistrasiState.getMode() || 'create';
      }
    } catch (err) {}
    return 'create';
  }
  function setMode(mode) {
    try {
      if (window.RegistrasiState && isFunction(window.RegistrasiState.setMode)) {
        window.RegistrasiState.setMode(mode || 'create');
      }
    } catch (err) {}
  }
  function clearEditItem() {
    try {
      if (window.RegistrasiState && isFunction(window.RegistrasiState.clearEditItem)) {
        window.RegistrasiState.clearEditItem();
      }
    } catch (err) {}
  }
  function getEditItem() {
    try {
      if (window.RegistrasiState && isFunction(window.RegistrasiState.getEditItem)) {
        return window.RegistrasiState.getEditItem() || {};
      }
    } catch (err) {}
    return {};
  }
  function notify(message, type) {
    try {
      if (window.Notifier && isFunction(window.Notifier.show)) {
        window.Notifier.show(message, type || 'info');
        return;
      }
      if (window.UI && isFunction(window.UI.showToast)) {
        window.UI.showToast(message, type || 'info');
        return;
      }
    } catch (err) {}
    try { window.alert(message); } catch (err2) {}
  }
  function setLoading(isLoading, label) {
    var btn = document.getElementById('btn-submit-registrasi');
    if (!btn) return;
    try {
      if (!btn.__tpkOriginalText) btn.__tpkOriginalText = btn.textContent || btn.value || 'Submit Registrasi';
      btn.disabled = !!isLoading;
      if (btn.tagName && btn.tagName.toLowerCase() === 'input') {
        btn.value = isLoading ? (label || 'Mengirim...') : btn.__tpkOriginalText;
      } else {
        btn.textContent = isLoading ? (label || 'Mengirim...') : btn.__tpkOriginalText;
      }
    } catch (err) {}
  }
  function extractErrorMessage(result, fallback) {
    if (!result) return fallback || 'Gagal menyimpan data.';
    if (typeof result === 'string') return result;
    if (result.message) return result.message;
    if (result.error) return String(result.error);
    if (result.data && result.data.message) return result.data.message;
    if (result.meta && result.meta.message) return result.meta.message;
    return fallback || 'Gagal menyimpan data.';
  }
  function callRegister(payload) {
    if (window.RegistrasiService && isFunction(window.RegistrasiService.registerSasaran)) {
      return window.RegistrasiService.registerSasaran(payload);
    }
    if (window.RegistrasiService && isFunction(window.RegistrasiService.submitRegistrasi)) {
      return window.RegistrasiService.submitRegistrasi(payload);
    }
    if (window.Api && isFunction(window.Api.post)) {
      return window.Api.post('registerSasaran', payload || {});
    }
    return Promise.reject(new Error('API registerSasaran tidak tersedia.'));
  }
  function callUpdate(payload) {
    if (window.RegistrasiService && isFunction(window.RegistrasiService.updateSasaran)) {
      return window.RegistrasiService.updateSasaran(payload);
    }
    if (window.Api && isFunction(window.Api.post)) {
      return window.Api.post('updateSasaran', payload || {});
    }
    return Promise.reject(new Error('API updateSasaran tidak tersedia.'));
  }
  function clearDrafts() {
    try { window.localStorage.removeItem(DRAFT_KEY); } catch (err) {}
  }
  function getSavedId(result, payload, editItem) {
    return safeTrim(
      (result && result.data && (result.data.id_sasaran || result.data.id)) ||
      (result && (result.id_sasaran || result.id)) ||
      (payload && payload.id_sasaran) ||
      (editItem && (editItem.id_sasaran || editItem.id)) ||
      ''
    );
  }
  function goToSasaranList() {
    try {
      if (window.Router && isFunction(window.Router.toSasaranList)) {
        window.Router.toSasaranList();
        return;
      }
      if (window.Router && isFunction(window.Router.go)) {
        window.Router.go('sasaranList');
        return;
      }
    } catch (err) {}
    try { window.location.hash = '#sasaranList'; } catch (err2) {}
  }
  async function refreshSasaranListQuietly() {
    try {
      if (window.SasaranList && isFunction(window.SasaranList.loadAndRender)) {
        await window.SasaranList.loadAndRender();
      }
    } catch (err) {}
  }
  function removeExistingModal() {
    var old = document.getElementById('registrasi-post-submit-modal-r1r3r2');
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }
  function buildButton(label, primary) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.style.border = '1px solid rgba(37,99,235,.35)';
    btn.style.borderRadius = '12px';
    btn.style.padding = '11px 14px';
    btn.style.fontWeight = '800';
    btn.style.cursor = 'pointer';
    btn.style.minHeight = '44px';
    btn.style.flex = '1 1 180px';
    if (primary) {
      btn.style.background = 'linear-gradient(135deg,#1d4ed8,#2563eb)';
      btn.style.color = '#fff';
      btn.style.boxShadow = '0 10px 20px rgba(37,99,235,.22)';
    } else {
      btn.style.background = '#fff';
      btn.style.color = '#0f172a';
    }
    return btn;
  }
  async function prepareCreateAgain() {
    removeExistingModal();
    clearDrafts();
    setMode('create');
    clearEditItem();
    try { if (isFunction(RF.resetForm)) RF.resetForm(); } catch (err1) {}
    try { if (isFunction(RF.applyModeUI)) RF.applyModeUI(); } catch (err2) {}
    try { if (isFunction(RF.prefillScope)) await RF.prefillScope(); } catch (err3) {}
    try { if (isFunction(RF.applyGenderLockByJenis)) RF.applyGenderLockByJenis(); } catch (err4) {}
    try { if (isFunction(RF.applyJenisSpecificStaticFields)) RF.applyJenisSpecificStaticFields(); } catch (err5) {}
    try { if (isFunction(RF.renderValidation)) RF.renderValidation(); } catch (err6) {}
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (err7) { try { window.scrollTo(0, 0); } catch (_) {} }
  }
  function showSuccessActions(context) {
    lastSuccessContext = context || {};
    removeExistingModal();

    var overlay = document.createElement('div');
    overlay.id = 'registrasi-post-submit-modal-r1r3r2';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '18px';
    overlay.style.background = 'rgba(15,23,42,.45)';
    overlay.style.backdropFilter = 'blur(2px)';

    var card = document.createElement('div');
    card.style.width = 'min(520px, 100%)';
    card.style.background = '#fff';
    card.style.border = '1px solid rgba(148,163,184,.35)';
    card.style.borderRadius = '18px';
    card.style.boxShadow = '0 24px 64px rgba(15,23,42,.22)';
    card.style.padding = '20px';
    card.style.fontFamily = 'inherit';
    card.style.color = '#0f172a';

    var title = document.createElement('div');
    title.textContent = 'Registrasi sasaran berhasil disimpan';
    title.style.fontSize = '18px';
    title.style.fontWeight = '900';
    title.style.marginBottom = '8px';

    var desc = document.createElement('div');
    var jenis = safeTrim(context && context.jenis_sasaran);
    var nama = safeTrim(context && context.nama_sasaran);
    desc.textContent = nama
      ? (nama + (jenis ? ' (' + jenis + ')' : '') + ' sudah tersimpan. Pilih langkah berikutnya.')
      : 'Data sasaran sudah tersimpan. Pilih langkah berikutnya.';
    desc.style.fontSize = '14px';
    desc.style.lineHeight = '1.45';
    desc.style.color = '#334155';
    desc.style.marginBottom = '16px';

    var actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.flexWrap = 'wrap';
    actions.style.gap = '10px';

    var again = buildButton('Registrasi Sasaran Lagi', true);
    var list = buildButton('Lihat Daftar Sasaran', false);

    again.addEventListener('click', function () {
      prepareCreateAgain();
    });
    list.addEventListener('click', async function () {
      removeExistingModal();
      await refreshSasaranListQuietly();
      goToSasaranList();
    });

    actions.appendChild(again);
    actions.appendChild(list);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    setTimeout(function () {
      try { again.focus(); } catch (err) {}
    }, 0);
  }

  var oldSubmit = RF.submit;
  RF.submit = async function () {
    var mode = getMode();

    if (mode === 'edit') {
      return oldSubmit.apply(this, arguments);
    }

    if (window.navigator && window.navigator.onLine === false) {
      return oldSubmit.apply(this, arguments);
    }

    var data = isFunction(this.collectFormData) ? this.collectFormData() : {};
    var issues = isFunction(this.validate) ? (this.validate(data) || []) : [];
    var hasError = issues.some(function (item) { return item && item.type === 'error'; });

    try { if (isFunction(this.renderValidation)) this.renderValidation(); } catch (err0) {}

    if (hasError) {
      notify('Periksa kembali form registrasi.', 'warning');
      return;
    }

    var payload = isFunction(this.buildPayload) ? this.buildPayload(data, 'create') : data;
    setLoading(true, 'Mengirim...');

    try {
      var result = await callRegister(payload);
      if (!result || result.ok !== true) {
        throw new Error(extractErrorMessage(result, 'Gagal menyimpan data sasaran.'));
      }

      clearDrafts();
      setMode('create');
      clearEditItem();
      await refreshSasaranListQuietly();

      var savedId = getSavedId(result, payload, getEditItem());
      var answers = (data && data.answers) || (payload && payload.answers) || {};

      try {
        if (isFunction(this.resetForm)) this.resetForm();
        if (isFunction(this.applyModeUI)) this.applyModeUI();
        if (isFunction(this.prefillScope)) await this.prefillScope();
        if (isFunction(this.applyGenderLockByJenis)) this.applyGenderLockByJenis();
        if (isFunction(this.applyJenisSpecificStaticFields)) this.applyJenisSpecificStaticFields();
        if (isFunction(this.renderValidation)) this.renderValidation();
      } catch (resetErr) {}

      showSuccessActions({
        id_sasaran: savedId,
        nama_sasaran: answers.nama_sasaran || data.nama_sasaran || '',
        jenis_sasaran: answers.jenis_sasaran || data.jenis_sasaran || '',
        result: result
      });

      return result;
    } catch (err) {
      try {
        if (window.__TPK_REGISTRASI_R1R3R1_DEBUG__ && isFunction(window.__TPK_REGISTRASI_R1R3R1_DEBUG__.saveDraftNow)) {
          window.__TPK_REGISTRASI_R1R3R1_DEBUG__.saveDraftNow();
        }
      } catch (draftErr) {}
      notify(err && err.message ? err.message : 'Terjadi kesalahan saat menyimpan data.', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  window.__TPK_REGISTRASI_POST_SUBMIT_UX_R1R3R2_DEBUG__ = {
    version: VERSION,
    lastSuccess: function () { return lastSuccessContext; },
    showSuccessActions: showSuccessActions,
    prepareCreateAgain: prepareCreateAgain
  };
  window.__TPK_REGISTRASI_POST_SUBMIT_UX_VERSION = VERSION;
})(window, document);
/* ===== READ MODEL BINDING R1-R3-R2 end ===== */


/* ===== READ MODEL BINDING R1-R3-R3 start: Registrasi Draft Queue Binding ===== */
(function (window, document) {
  'use strict';

  var VERSION = 'READ-MODEL-BINDING-R1-R3-R3-REGISTRASI-DRAFT-QUEUE-BINDING-20260527';
  var DRAFT_KEY = 'tpk_registrasi_draft_v_final';
  var RF = window.RegistrasiForm;

  if (!RF || RF.__REGISTRASI_DRAFT_QUEUE_BINDING_R1R3R3 === true) return;
  RF.__REGISTRASI_DRAFT_QUEUE_BINDING_R1R3R3 = true;

  function isFunction(fn) { return typeof fn === 'function'; }
  function safeTrim(value) { return String(value == null ? '' : value).trim(); }

  function notify(message, type) {
    try {
      if (window.Notifier && isFunction(window.Notifier.show)) {
        window.Notifier.show(message, type || 'info');
        return;
      }
      if (window.UI && isFunction(window.UI.showToast)) {
        window.UI.showToast(message, type || 'info');
        return;
      }
    } catch (err) {}
    try { window.alert(message); } catch (err2) {}
  }

  function emitQueueChanged() {
    try { window.dispatchEvent(new CustomEvent('tpk:queue-changed', { detail: { version: VERSION } })); } catch (err) {}
    try {
      if (window.SyncManager && isFunction(window.SyncManager.updateBadge)) {
        window.SyncManager.updateBadge();
      }
    } catch (err2) {}
  }

  function getCurrentDraftData() {
    var data = {};
    try {
      if (isFunction(RF.collectFormData)) {
        data = RF.collectFormData() || {};
      }
    } catch (err) {}

    data = data && typeof data === 'object' ? data : {};
    data.draft_type = 'REGISTRASI';
    data.draft_status = 'DRAFT';
    data.updated_at = new Date().toISOString();

    if (!data.client_submit_id) {
      try {
        if (window.ClientId && isFunction(window.ClientId.ensure)) {
          data.client_submit_id = window.ClientId.ensure('', 'REG');
        }
      } catch (err2) {}
    }

    if (!data.client_submit_id) {
      data.client_submit_id = 'REG-DRAFT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    }

    return data;
  }

  async function saveDraftFormal(showMessage) {
    var data = getCurrentDraftData();

    try {
      if (window.QueueRepo && isFunction(window.QueueRepo.saveRegistrationDraft)) {
        await window.QueueRepo.saveRegistrationDraft(data, {
          source: 'registrasiView.saveDraftFormal',
          version: VERSION
        });
      } else if (window.DraftManager && isFunction(window.DraftManager.saveRegistrasiDraft)) {
        await window.DraftManager.saveRegistrasiDraft(data);
      } else if (window.QueueRepo && isFunction(window.QueueRepo.saveDraft)) {
        await window.QueueRepo.saveDraft(DRAFT_KEY, 'REGISTRASI', data, {
          source: 'registrasiView.saveDraftFormal',
          version: VERSION
        });
      } else {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
          saved_at: new Date().toISOString(),
          data: data
        }));
      }

      emitQueueChanged();
      if (showMessage) notify('Draft registrasi berhasil disimpan dan masuk ke Draft Offline & Sinkronisasi.', 'success');
      return true;
    } catch (err) {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
          saved_at: new Date().toISOString(),
          data: data
        }));
        emitQueueChanged();
        if (showMessage) notify('Draft registrasi tersimpan lokal. Jika belum tampil, tekan Refresh Daftar.', 'warning');
        return true;
      } catch (err2) {
        if (showMessage) notify('Draft registrasi gagal disimpan di perangkat ini.', 'error');
        return false;
      }
    }
  }

  async function clearDraftFormal() {
    try {
      if (window.QueueRepo && isFunction(window.QueueRepo.clearRegistrationDraft)) {
        await window.QueueRepo.clearRegistrationDraft();
      } else if (window.QueueRepo && isFunction(window.QueueRepo.clearDraft)) {
        await window.QueueRepo.clearDraft(DRAFT_KEY);
      } else if (window.DraftManager && isFunction(window.DraftManager.clearRegistrasiDraft)) {
        await window.DraftManager.clearRegistrasiDraft();
      }
    } catch (err) {}

    try { window.localStorage.removeItem(DRAFT_KEY); } catch (err2) {}
    emitQueueChanged();
    return true;
  }

  function buttonText(el) {
    if (!el) return '';
    var value = '';
    try { value = el.value || ''; } catch (err) {}
    return safeTrim(value || el.textContent || (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title'))) || '').toUpperCase();
  }

  function isDraftButton(el) {
    if (!el) return false;
    var id = safeTrim(el.id).toUpperCase();
    var action = safeTrim(el.getAttribute && (el.getAttribute('data-action') || el.getAttribute('name'))).toUpperCase();
    var text = buttonText(el);
    return id.indexOf('DRAFT') >= 0 || action.indexOf('DRAFT') >= 0 || text.indexOf('SIMPAN DRAFT') >= 0;
  }

  function isResetButton(el) {
    if (!el) return false;
    var id = safeTrim(el.id).toUpperCase();
    var action = safeTrim(el.getAttribute && (el.getAttribute('data-action') || el.getAttribute('name'))).toUpperCase();
    var type = safeTrim(el.getAttribute && el.getAttribute('type')).toUpperCase();
    var text = buttonText(el);
    return id.indexOf('RESET') >= 0 || action.indexOf('RESET') >= 0 || type === 'RESET' || text === 'RESET';
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var btn = target.closest('button, input[type="button"], input[type="submit"], input[type="reset"], a, [role="button"]');
    if (!btn) return;

    if (isDraftButton(btn)) {
      window.setTimeout(function () {
        saveDraftFormal(false);
      }, 0);
      return;
    }

    if (isResetButton(btn)) {
      window.setTimeout(function () {
        clearDraftFormal();
      }, 0);
    }
  }, true);

  var previousSubmit = RF.submit;
  if (isFunction(previousSubmit)) {
    RF.submit = async function () {
      var result = await previousSubmit.apply(this, arguments);
      if (result && result.ok === true) {
        await clearDraftFormal();
      }
      return result;
    };
  }

  window.__TPK_REGISTRASI_DRAFT_QUEUE_BINDING_R1R3R3_DEBUG__ = {
    version: VERSION,
    saveDraftFormal: saveDraftFormal,
    clearDraftFormal: clearDraftFormal,
    getCurrentDraftData: getCurrentDraftData
  };
  window.__TPK_REGISTRASI_DRAFT_QUEUE_BINDING_VERSION = VERSION;
})(window, document);
/* ===== READ MODEL BINDING R1-R3-R3 end ===== */


/* ===== READ MODEL BINDING R1-R3-R4 start: Manual draft performance event guard ===== */
(function (window, document) {
  'use strict';

  var VERSION = 'READ-MODEL-BINDING-R1-R3-R4-MANUAL-DRAFT-PERF-20260527';
  if (window.__TPK_REGISTRASI_MANUAL_DRAFT_PERF_R1R3R4 === true) return;
  window.__TPK_REGISTRASI_MANUAL_DRAFT_PERF_R1R3R4 = true;

  function safeTrim(value) { return String(value == null ? '' : value).trim(); }
  function isFunction(fn) { return typeof fn === 'function'; }
  function buttonText(el) {
    if (!el) return '';
    var value = '';
    try { value = el.value || ''; } catch (err) {}
    return safeTrim(value || el.textContent || (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title'))) || '').toUpperCase();
  }
  function isDraftButton(el) {
    if (!el) return false;
    var id = safeTrim(el.id).toUpperCase();
    var action = safeTrim(el.getAttribute && (el.getAttribute('data-action') || el.getAttribute('name'))).toUpperCase();
    var text = buttonText(el);
    return id.indexOf('DRAFT') >= 0 || action.indexOf('DRAFT') >= 0 || text.indexOf('SIMPAN DRAFT') >= 0;
  }
  function getDataSafe() {
    try {
      if (window.RegistrasiForm && isFunction(window.RegistrasiForm.collectFormData)) return window.RegistrasiForm.collectFormData() || {};
    } catch (err) {}
    return {};
  }
  function reportManualDraftSaved() {
    try {
      if (!window.Api || !isFunction(window.Api.reportClientPerformance)) return;
      if (window.navigator && window.navigator.onLine === false) return;
      var data = getDataSafe();
      var answers = data.answers || {};
      window.Api.reportClientPerformance('registrasi_draft_saved', {
        action: 'registrasi_draft_saved',
        modul: 'registrasiView.js',
        source_layer: 'CLIENT',
        event_type: 'CLIENT_PERFORMANCE',
        performance_group: 'DRAFT_WORKFLOW',
        client_metric_classification: 'CLIENT_EVENT_WORKFLOW',
        observability_only: true,
        exclude_from_frontend_health: true,
        draft_type: 'REGISTRASI',
        jenis_sasaran: answers.jenis_sasaran || data.jenis_sasaran || '',
        client_submit_id: data.client_submit_id || '',
        manual_draft_event: true,
        draft_perf_version: VERSION
      }).catch(function () {});
    } catch (err) {}
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var btn = target.closest('button, input[type="button"], input[type="submit"], input[type="reset"], a, [role="button"]');
    if (!isDraftButton(btn)) return;

    // Tombol Simpan Draft bersifat lokal. Cegah submit form tidak sengaja,
    // tetapi biarkan binding R1-R3-R3 yang sudah tersimpan tetap bekerja.
    try { event.preventDefault(); } catch (err) {}
    window.setTimeout(function () {
      reportManualDraftSaved();
      try { if (window.SyncManager && isFunction(window.SyncManager.updateBadge)) window.SyncManager.updateBadge(); } catch (err2) {}
    }, 250);
  }, true);

  window.__TPK_REGISTRASI_MANUAL_DRAFT_PERF_R1R3R4_DEBUG__ = {
    version: VERSION,
    reportManualDraftSaved: reportManualDraftSaved
  };
})(window, document);
/* ===== READ MODEL BINDING R1-R3-R4 end ===== */
