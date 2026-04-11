(function (window, document) {
  'use strict';

  const REG_DRAFT_KEY = 'tpk_registrasi_draft_v_final';
  const PLACEHOLDER_16 = '9999999999999999';

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

  function toUpper(value) {
    return String(value || '').trim().toUpperCase();
  }

  function safeTrim(value) {
    return String(value || '').trim();
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

  function notify(message) {
    if (window.Notifier && isFunction(window.Notifier.show)) {
      window.Notifier.show(message);
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

  function uiToggleHidden(id, hidden) {
    if (window.UI && isFunction(window.UI.toggleHidden)) {
      window.UI.toggleHidden(id, hidden);
      return;
    }
    const el = byId(id);
    if (!el) return;
    el.classList.toggle('hidden', !!hidden);
  }

  function goToRegistrasi() {
    if (window.Router && isFunction(window.Router.toRegistrasi)) {
      window.Router.toRegistrasi();
      return;
    }
  }

  function goToSasaranList() {
    if (window.Router && isFunction(window.Router.toSasaranList)) {
      window.Router.toSasaranList();
      return;
    }
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
      return window.ClientId.ensure(existing, 'SUB');
    }
    if (existing) return existing;
    return `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  function validators() {
    return window.Validators || {};
  }

  function isRequired(value) {
    const api = validators();
    if (isFunction(api.isRequired)) return api.isRequired(value);
    return String(value || '').trim() !== '';
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
    if (window.DraftManager) return window.DraftManager;
    return null;
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
        action: 'submitRegistrasiSasaran',
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

  function buildWilayahText(item) {
    return [
      firstNonEmpty(item.nama_dusun, item.dusun_rw, item.nama_dusun_rw),
      firstNonEmpty(item.nama_desa, item.desa_kelurahan, item.nama_desa_kelurahan),
      firstNonEmpty(item.nama_kecamatan, item.kecamatan)
    ].filter(Boolean).join(' / ');
  }

  function extractExtraFields(item) {
    if (!item || typeof item !== 'object') return {};
    return firstNonEmpty(
      item.extra_fields,
      safeJsonParse(item.extra_fields_json, {}),
      item.field_values,
      item.jawaban,
      safeJsonParse(item.data_laporan, {})
    ) || {};
  }

  function getFallbackDynamicFields(jenis) {
    const key = toUpper(jenis);
    const common = [
      {
        question_code: 'nama_kepala_keluarga',
        label: 'Nama Kepala Keluarga',
        type: 'text',
        required: true,
        placeholder: 'Masukkan nama kepala keluarga'
      },
      {
        question_code: 'sumber_air_minum_utama',
        label: 'Sumber Air Minum Utama',
        type: 'select',
        required: true,
        options: [
          { value: 'AIR_KEMASAN_ISI_ULANG', label: 'Air Kemasan / Isi Ulang' },
          { value: 'LEDENG_PAM', label: 'Ledeng / Pam' },
          { value: 'SUMUR_BOR_POMPA', label: 'Sumur Bor / Pompa' },
          { value: 'SUMUR_TERLINDUNG', label: 'Sumur Terlindung' },
          { value: 'SUMUR_TAK_TERLINDUNG', label: 'Sumur Tak Terlindung' },
          { value: 'MATA_AIR_TERLINDUNG', label: 'Mata Air Terlindung' },
          { value: 'MATA_AIR_TAK_TERLINDUNG', label: 'Mata Air Tak Terlindung' },
          { value: 'AIR_PERMUKAAN', label: 'Air Permukaan' },
          { value: 'AIR_HUJAN', label: 'Air Hujan' },
          { value: 'LAINNYA', label: 'Lainnya' }
        ]
      },
      {
        question_code: 'sumber_air_minum_utama_lainnya',
        label: 'Sumber Air Minum Utama Lainnya',
        type: 'text',
        required: false,
        placeholder: 'Jelaskan sumber air minum lainnya',
        parent_key: 'sumber_air_minum_utama',
        parent_value: 'LAINNYA'
      },
      {
        question_code: 'fasilitas_bab',
        label: 'Fasilitas BAB',
        type: 'select',
        required: true,
        options: [
          { value: 'JAMBAN_SENDIRI_LEHER_ANGSA_SEPTIK', label: 'Jamban Sendiri + Tangki Septik / IPAL' },
          { value: 'JAMBAN_MCK_KOMUNAL_LEHER_ANGSA_SEPTIK', label: 'MCK Komunal + Tangki Septik / IPAL' },
          { value: 'YA_LAINNYA', label: 'Ya Lainnya' },
          { value: 'TIDAK_ADA', label: 'Tidak Ada' }
        ]
      },
      {
        question_code: 'fasilitas_bab_lainnya',
        label: 'Fasilitas BAB Lainnya',
        type: 'text',
        required: false,
        placeholder: 'Jelaskan fasilitas BAB lainnya',
        parent_key: 'fasilitas_bab',
        parent_value: 'YA_LAINNYA'
      },
      {
        question_code: 'keterangan_tambahan_awal',
        label: 'Keterangan Tambahan',
        type: 'textarea',
        required: false,
        placeholder: 'Catatan tambahan awal'
      }
    ];

    if (key === 'BADUTA') {
      common.unshift({
        question_code: 'nama_ibu_kandung',
        label: 'Nama Ibu Kandung',
        type: 'text',
        required: true,
        placeholder: 'Masukkan nama ibu kandung'
      });
    }

    return common;
  }

  function renderDynamicFieldsNative(containerId, fields, values) {
    const container = byId(containerId);
    if (!container) return;

    const list = Array.isArray(fields) ? fields : [];
    if (!list.length) {
      container.innerHTML = '<p class="muted-text">Tidak ada field khusus untuk jenis sasaran ini.</p>';
      return;
    }

    container.innerHTML = list.map((field) => {
      const key = safeTrim(field.question_code || field.code || field.key);
      const type = safeTrim(field.type || field.field_type || 'text').toLowerCase();
      const label = safeTrim(field.label || field.question_label || key);
      const required = !!field.required || field.is_required === true || field.is_required === 'TRUE';
      const placeholder = safeTrim(field.placeholder || field.help_text || '');
      const value = firstNonEmpty(values[key], field.default_value, '');
      const parentKey = safeTrim(field.parent_key || field.trigger_field || '');
      const parentValue = safeTrim(field.parent_value || field.trigger_value || '');

      const wrapperAttrs = [
        'class="dynamic-field-card"',
        parentKey ? `data-parent-key="${parentKey}"` : '',
        parentValue ? `data-parent-value="${parentValue}"` : ''
      ].filter(Boolean).join(' ');

      let inputHtml = '';

      if (type === 'textarea') {
        inputHtml = `
          <textarea
            id="dyn-${key}"
            data-dyn-key="${key}"
            rows="3"
            placeholder="${placeholder}"
            ${required ? 'required' : ''}
          >${value || ''}</textarea>
        `;
      } else if (type === 'select') {
        const options = Array.isArray(field.options) ? field.options : [];
        inputHtml = `
          <select
            id="dyn-${key}"
            data-dyn-key="${key}"
            ${required ? 'required' : ''}
          >
            <option value="">Pilih</option>
            ${options.map((opt) => {
              const val = safeTrim(opt.value != null ? opt.value : opt);
              const lbl = safeTrim(opt.label != null ? opt.label : opt);
              const selected = String(val) === String(value) ? 'selected' : '';
              return `<option value="${val}" ${selected}>${lbl}</option>`;
            }).join('')}
          </select>
        `;
      } else {
        inputHtml = `
          <input
            id="dyn-${key}"
            data-dyn-key="${key}"
            type="${type === 'date' ? 'date' : 'text'}"
            value="${type === 'date' ? (value || '') : (value || '').replace(/"/g, '&quot;')}"
            placeholder="${placeholder}"
            ${required ? 'required' : ''}
          />
        `;
      }

      return `
        <div ${wrapperAttrs}>
          <div class="form-group">
            <label for="dyn-${key}">${label}${required ? ' *' : ''}</label>
            ${inputHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  function collectDynamicFieldsNative(containerId) {
    const container = byId(containerId);
    const result = {};
    if (!container) return result;

    container.querySelectorAll('[data-dyn-key]').forEach((el) => {
      result[el.dataset.dynKey] = el.value;
    });

    return result;
  }

  function fillDynamicFieldsNative(containerId, values) {
    const container = byId(containerId);
    if (!container || !values || typeof values !== 'object') return;

    Object.keys(values).forEach((key) => {
      const el = container.querySelector(`[data-dyn-key="${key}"]`);
      if (el) el.value = values[key] == null ? '' : values[key];
    });
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

  const RegistrasiForm = {
    _isBound: false,

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
        btnBack.addEventListener('click', (event) => {
          event.preventDefault();
          this.handleBack();
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
        } catch (_) {
          // lanjut ke method berikutnya
        }
      }

      return null;
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
      this.fillForm(safeItem);

      await this.loadDynamicFields(safeItem.jenis_sasaran || '');
      this.fillDynamicFields(safeItem);

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

      uiSetHTML(
        'registrasi-dynamic-fields',
        '<p class="muted-text">Pilih jenis sasaran untuk memuat pertanyaan khusus.</p>'
      );

      const idEl = byId('reg-id-sasaran');
      if (idEl) idEl.value = '';
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

    fillForm(item) {
      const map = {
        'reg-id-sasaran': firstNonEmpty(item.id_sasaran, item.id),
        'reg-jenis-sasaran': firstNonEmpty(item.jenis_sasaran),
        'reg-nama-sasaran': firstNonEmpty(item.nama_sasaran, item.nama),
        'reg-nik': firstNonEmpty(item.nik, item.nik_sasaran),
        'reg-no-kk': firstNonEmpty(item.nomor_kk, item.no_kk),
        'reg-jenis-kelamin': firstNonEmpty(item.jenis_kelamin),
        'reg-tanggal-lahir': firstNonEmpty(item.tanggal_lahir, item.tgl_lahir),
        'reg-kecamatan': firstNonEmpty(item.nama_kecamatan, item.kecamatan),
        'reg-desa': firstNonEmpty(item.nama_desa, item.desa_kelurahan, item.nama_desa_kelurahan, item.nama_wilayah),
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

    async loadDynamicFields(jenisSasaran) {
      if (!jenisSasaran) {
        uiSetHTML(
          'registrasi-dynamic-fields',
          '<p class="muted-text">Pilih jenis sasaran untuk memuat pertanyaan khusus.</p>'
        );
        return;
      }

      let fields = [];

      try {
        if (window.RegistrasiService && isFunction(window.RegistrasiService.getFormDefinition)) {
          const result = await window.RegistrasiService.getFormDefinition(jenisSasaran);
          fields = this.normalizeDynamicFields(result && result.data ? result.data : result, jenisSasaran);
        } else {
          fields = getFallbackDynamicFields(jenisSasaran);
        }
      } catch (_) {
        fields = getFallbackDynamicFields(jenisSasaran);
      }

      if (window.DynamicForm && isFunction(window.DynamicForm.render)) {
        window.DynamicForm.render('registrasi-dynamic-fields', fields, {});
      } else {
        renderDynamicFieldsNative('registrasi-dynamic-fields', fields, {});
      }

      this.updateConditionalDynamicFields();
    },

    normalizeDynamicFields(data, jenisSasaran) {
      if (Array.isArray(data)) return data;
      if (Array.isArray(data && data.fields)) return data.fields;
      if (Array.isArray(data && data.questions)) return data.questions;
      return getFallbackDynamicFields(jenisSasaran);
    },

    fillDynamicFields(item) {
      const extra = extractExtraFields(item);

      if (window.DynamicForm && isFunction(window.DynamicForm.fill)) {
        window.DynamicForm.fill('registrasi-dynamic-fields', extra);
      } else {
        fillDynamicFieldsNative('registrasi-dynamic-fields', extra);
      }

      this.updateConditionalDynamicFields();
    },

    collectDynamicFields() {
      if (window.DynamicForm && isFunction(window.DynamicForm.collect)) {
        return window.DynamicForm.collect('registrasi-dynamic-fields') || {};
      }
      return collectDynamicFieldsNative('registrasi-dynamic-fields');
    },

    updateConditionalDynamicFields() {
      const container = byId('registrasi-dynamic-fields');
      if (!container) return;

      container.querySelectorAll('[data-parent-key]').forEach((card) => {
        const parentKey = card.getAttribute('data-parent-key') || '';
        const parentValue = card.getAttribute('data-parent-value') || '';
        const parentEl = container.querySelector(`[data-dyn-key="${parentKey}"]`);
        const childInput = card.querySelector('[data-dyn-key]');
        const currentValue = parentEl ? String(parentEl.value || '') : '';
        const visible = !parentKey || currentValue === parentValue;

        card.classList.toggle('hidden', !visible);

        if (!visible && childInput) {
          childInput.value = '';
        }
      });
    },

    collectFormData() {
      const mode = getMode();
      const profile = getProfile();
      const profileScope = this.getScopeFromProfile();
      const editItem = getEditItem();
      const localDraft = loadDraftLocal();
      const localDraftData = localDraft && localDraft.data ? localDraft.data : {};

      return {
        id_sasaran: firstNonEmpty(
          byId('reg-id-sasaran') && byId('reg-id-sasaran').value,
          editItem.id_sasaran,
          editItem.id
        ),
        jenis_sasaran: safeTrim(byId('reg-jenis-sasaran') && byId('reg-jenis-sasaran').value),
        nama_sasaran: safeTrim(byId('reg-nama-sasaran') && byId('reg-nama-sasaran').value),
        nik: safeTrim(byId('reg-nik') && byId('reg-nik').value),
        nomor_kk: safeTrim(byId('reg-no-kk') && byId('reg-no-kk').value),
        jenis_kelamin: safeTrim(byId('reg-jenis-kelamin') && byId('reg-jenis-kelamin').value),
        tanggal_lahir: safeTrim(byId('reg-tanggal-lahir') && byId('reg-tanggal-lahir').value),
        nama_kecamatan: safeTrim(byId('reg-kecamatan') && byId('reg-kecamatan').value),
        nama_desa: safeTrim(byId('reg-desa') && byId('reg-desa').value),
        nama_dusun: safeTrim(byId('reg-dusun') && byId('reg-dusun').value),
        alamat: safeTrim(byId('reg-alamat') && byId('reg-alamat').value),
        id_tim: firstNonEmpty(profile.id_tim),
        nama_tim: firstNonEmpty(profile.nama_tim, profile.nomor_tim, profile.id_tim),
        id_wilayah: firstNonEmpty(profileScope.id_wilayah),
        extra_fields: this.collectDynamicFields(),
        client_submit_id: mode === 'create'
          ? ensureClientSubmitId(localDraftData.client_submit_id)
          : '',
        sync_source: 'ONLINE'
      };
    },

    validate(data) {
      const issues = [];
      const mode = getMode();
      const jenis = toUpper(data.jenis_sasaran);

      if (mode === 'edit' && !isRequired(data.id_sasaran)) {
        issues.push({ type: 'error', text: 'ID sasaran tidak ditemukan untuk proses edit.' });
      }

      if (!isRequired(data.jenis_sasaran)) {
        issues.push({ type: 'error', text: 'Jenis sasaran wajib dipilih.' });
      }

      if (!isRequired(data.nama_sasaran)) {
        issues.push({ type: 'error', text: 'Nama sasaran wajib diisi.' });
      }

      if (!isNikOrKK16(data.nik)) {
        issues.push({ type: 'error', text: 'NIK harus 16 digit angka.' });
      }

      if (!isNikOrKK16(data.nomor_kk)) {
        issues.push({ type: 'error', text: 'Nomor KK harus 16 digit angka.' });
      }

      if (data.nik === PLACEHOLDER_16) {
        issues.push({ type: 'warn', text: 'NIK menggunakan placeholder 16 digit angka 9.' });
      }

      if (data.nomor_kk === PLACEHOLDER_16) {
        issues.push({ type: 'warn', text: 'Nomor KK menggunakan placeholder 16 digit angka 9.' });
      }

      if (!isRequired(data.jenis_kelamin)) {
        issues.push({ type: 'warn', text: 'Jenis kelamin belum dipilih.' });
      }

      if (!isRequired(data.tanggal_lahir)) {
        issues.push({ type: 'error', text: 'Tanggal lahir wajib diisi.' });
      } else if (!isDateNotFuture(data.tanggal_lahir)) {
        issues.push({ type: 'error', text: 'Tanggal lahir tidak boleh melebihi hari ini.' });
      } else {
        const ageYears = calcAgeYears(data.tanggal_lahir);
        const ageMonths = calcAgeMonths(data.tanggal_lahir);

        if (jenis === 'BADUTA' && ageMonths != null && ageMonths > 24) {
          issues.push({ type: 'error', text: 'Usia BADUTA tidak boleh lebih dari 24 bulan.' });
        }

        if (jenis === 'BUMIL' || jenis === 'BUFAS') {
          if (data.jenis_kelamin && toUpper(data.jenis_kelamin) !== 'P') {
            issues.push({ type: 'error', text: `${jenis} wajib berjenis kelamin Perempuan.` });
          }
          if (ageYears != null && ageYears > 55) {
            issues.push({ type: 'error', text: `${jenis} tidak boleh berusia di atas 55 tahun.` });
          }
        }
      }

      if (!isRequired(data.nama_kecamatan)) {
        issues.push({ type: 'warn', text: 'Kecamatan belum terisi.' });
      }

      if (!isRequired(data.nama_desa)) {
        issues.push({ type: 'warn', text: 'Desa/Kelurahan belum terisi.' });
      }

      if (!isRequired(data.nama_dusun)) {
        issues.push({ type: 'warn', text: 'Dusun/RW belum terisi.' });
      }

      if (!isRequired(data.alamat)) {
        issues.push({ type: 'warn', text: 'Alamat lengkap belum terisi.' });
      }

      const extra = data.extra_fields || {};
      if (isRequired(extra.sumber_air_minum_utama) && extra.sumber_air_minum_utama === 'LAINNYA' && !isRequired(extra.sumber_air_minum_utama_lainnya)) {
        issues.push({ type: 'error', text: 'Sumber air minum lainnya wajib diisi.' });
      }

      if (isRequired(extra.fasilitas_bab) && extra.fasilitas_bab === 'YA_LAINNYA' && !isRequired(extra.fasilitas_bab_lainnya)) {
        issues.push({ type: 'error', text: 'Fasilitas BAB lainnya wajib diisi.' });
      }

      if (jenis === 'BADUTA' && !isRequired(extra.nama_ibu_kandung)) {
        issues.push({ type: 'error', text: 'Nama ibu kandung wajib diisi untuk BADUTA.' });
      }

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
              ${issue.text}
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

      this.fillForm(draft.data);

      const jenis = draft.data.jenis_sasaran || '';
      if (!jenis) {
        this.renderValidation();
        return;
      }

      this.loadDynamicFields(jenis)
        .then(() => {
          this.fillDynamicFields({ extra_fields: draft.data.extra_fields || {} });
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

    buildPayload(data, mode, editItem) {
      if (window.FormMapper && isFunction(window.FormMapper.buildPayload)) {
        return window.FormMapper.buildPayload(data, mode, editItem || {});
      }

      if (mode === 'edit') {
        return {
          id_sasaran: firstNonEmpty(data.id_sasaran, editItem.id_sasaran, editItem.id),
          jenis_sasaran: data.jenis_sasaran,
          nama_sasaran: data.nama_sasaran,
          nik: data.nik,
          nomor_kk: data.nomor_kk,
          jenis_kelamin: data.jenis_kelamin,
          tanggal_lahir: data.tanggal_lahir,
          nama_kecamatan: data.nama_kecamatan,
          nama_desa: data.nama_desa,
          nama_dusun: data.nama_dusun,
          alamat: data.alamat,
          extra_fields: data.extra_fields,
          sync_source: 'ONLINE'
        };
      }

      return {
        jenis_sasaran: data.jenis_sasaran,
        form_id: window.FormMapper && isFunction(window.FormMapper.getFormIdByJenis)
          ? window.FormMapper.getFormIdByJenis(data.jenis_sasaran)
          : '',
        nama_sasaran: data.nama_sasaran,
        nik: data.nik,
        nomor_kk: data.nomor_kk,
        jenis_kelamin: data.jenis_kelamin,
        tanggal_lahir: data.tanggal_lahir,
        nama_kecamatan: data.nama_kecamatan,
        nama_desa: data.nama_desa,
        nama_dusun: data.nama_dusun,
        alamat: data.alamat,
        id_tim: data.id_tim,
        nama_tim: data.nama_tim,
        id_wilayah: data.id_wilayah,
        client_submit_id: data.client_submit_id,
        sync_source: 'ONLINE',
        extra_fields: data.extra_fields
      };
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

      const payload = this.buildPayload(data, mode, editItem);
      uiSetLoading('btn-submit-registrasi', true, mode === 'edit' ? 'Menyimpan...' : 'Mengirim...');

      try {
        if (!navigator.onLine && mode === 'edit') {
          notify('Edit data sasaran hanya dapat dilakukan saat online.');
          return;
        }

        if (!navigator.onLine && mode === 'create') {
          enqueueOfflineRegistrasi(payload);
          saveDraftLocal(payload);
          notify('Sedang offline. Registrasi disimpan ke draft sinkronisasi.');
          return;
        }

        if (!window.RegistrasiService) {
          throw new Error('RegistrasiService belum tersedia.');
        }

        const action = mode === 'edit' ? 'updateSasaran' : 'submitRegistrasi';
        if (!isFunction(window.RegistrasiService[action])) {
          throw new Error(`Method RegistrasiService.${action} tidak ditemukan.`);
        }

        const result = await window.RegistrasiService[action](payload);

        if (!result || result.ok !== true) {
          throw new Error((result && result.message) || 'Gagal menyimpan data sasaran.');
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
          if (window.SasaranDetail && isFunction(window.SasaranDetail.openById) && targetId) {
            await window.SasaranDetail.openById(targetId);
          } else {
            goToSasaranList();
          }
          notify('Perubahan data sasaran berhasil disimpan.');
        } else {
          goToSasaranList();
          if (result && result.data && result.data.duplicate) {
            notify('Registrasi sasaran sudah pernah tersimpan sebelumnya.');
          } else {
            notify('Registrasi sasaran berhasil disimpan.');
          }
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

      if (mode === 'edit' && window.SasaranDetail && isFunction(window.SasaranDetail.openById) && targetId) {
        await window.SasaranDetail.openById(targetId);
        return;
      }

      goToSasaranList();
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
