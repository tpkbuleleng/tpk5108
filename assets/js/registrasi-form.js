window.RegistrasiForm = {
  async openCreate() {
    RegistrasiState.setMode('create');
    RegistrasiState.clearEditItem();
    Router.toRegistrasi();
    this.resetForm();
    this.applyModeUI();
    this.prefillScope();
    this.tryLoadDraft();
    this.renderValidation();
  },

  async openEdit(item) {
    RegistrasiState.setMode('edit');
    RegistrasiState.setEditItem(item || {});
    Router.toRegistrasi();
    this.resetForm();
    this.applyModeUI();
    this.prefillScope();
    this.fillForm(item || {});
    await this.loadDynamicFields(item?.jenis_sasaran || '');
    this.fillDynamicFields(item || {});
    this.renderValidation();
  },

  applyModeUI() {
    const mode = RegistrasiState.getMode();
    const isEdit = mode === 'edit';

    UI.setText('registrasi-screen-title', isEdit ? 'Edit Data Sasaran' : 'Registrasi Sasaran');
    UI.setText('registrasi-screen-subtitle', isEdit ? 'Perbarui data sasaran terpilih' : 'Input data sasaran baru');
    UI.setText('registrasi-mode-info', isEdit ? 'Mode edit sasaran aktif' : 'Mode registrasi baru');
    UI.setText('btn-submit-registrasi', isEdit ? 'Simpan Perubahan' : 'Submit Registrasi');

    const badge = document.getElementById('registrasi-mode-badge');
    if (badge) {
      badge.textContent = isEdit ? 'EDIT' : 'CREATE';
      badge.className = `badge ${isEdit ? 'badge-warning' : 'badge-success-soft'}`;
    }
  },

  resetForm() {
    const form = document.getElementById('registrasi-form');
    if (form) form.reset();
    UI.setHTML('registrasi-dynamic-fields', '<p class="muted-text">Pilih jenis sasaran untuk memuat pertanyaan khusus.</p>');
  },

  prefillScope() {
    const profile = Session.getProfile() || {};
    const selected = SasaranState.getSelected() || {};

    const kec = profile.nama_kecamatan || selected.nama_kecamatan || '';
    const desa = profile.nama_desa || selected.nama_desa || selected.nama_wilayah || '';

    const kecEl = document.getElementById('reg-kecamatan');
    const desaEl = document.getElementById('reg-desa');

    if (kecEl) kecEl.value = kec;
    if (desaEl) desaEl.value = desa;
  },

  fillForm(item) {
    const map = {
      'reg-jenis-sasaran': item.jenis_sasaran || '',
      'reg-nama-sasaran': item.nama_sasaran || item.nama || '',
      'reg-nik': item.nik || '',
      'reg-no-kk': item.nomor_kk || item.no_kk || '',
      'reg-jenis-kelamin': item.jenis_kelamin || '',
      'reg-tanggal-lahir': item.tanggal_lahir || item.tgl_lahir || '',
      'reg-kecamatan': item.nama_kecamatan || '',
      'reg-desa': item.nama_desa || item.nama_wilayah || '',
      'reg-dusun': item.nama_dusun || '',
      'reg-alamat': item.alamat || ''
    };

    Object.entries(map).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });
  },

  async loadDynamicFields(jenisSasaran) {
    if (!jenisSasaran) {
      UI.setHTML('registrasi-dynamic-fields', '<p class="muted-text">Pilih jenis sasaran untuk memuat pertanyaan khusus.</p>');
      return;
    }

    try {
      const result = await RegistrasiService.getFormDefinition(jenisSasaran);
      const fields = this.normalizeDynamicFields(result?.data, jenisSasaran);
      this.renderDynamicFields(fields);
    } catch (err) {
      const fallback = FormMapper.getDefaultDynamicFields(jenisSasaran);
      this.renderDynamicFields(fallback);
    }
  },

  normalizeDynamicFields(data, jenisSasaran) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.fields)) return data.fields;
    if (Array.isArray(data?.questions)) return data.questions;
    return FormMapper.getDefaultDynamicFields(jenisSasaran);
  },

  renderDynamicFields(fields) {
    const container = document.getElementById('registrasi-dynamic-fields');
    if (!container) return;

    if (!fields.length) {
      container.innerHTML = '<p class="muted-text">Tidak ada field khusus untuk jenis ini.</p>';
      return;
    }

    container.innerHTML = fields.map(field => {
      const type = field.type || 'text';
      return `
        <div class="dynamic-field-card">
          <div class="form-group">
            <label for="dyn-${field.question_code}">${field.label}${field.required ? ' *' : ''}</label>
            ${this.makeInput(field, type)}
          </div>
        </div>
      `;
    }).join('');
  },

  makeInput(field, type) {
    const id = `dyn-${field.question_code}`;
    const required = field.required ? 'required' : '';
    const placeholder = field.placeholder || '';

    if (type === 'textarea') {
      return `<textarea id="${id}" data-dyn-key="${field.question_code}" rows="3" placeholder="${placeholder}" ${required}></textarea>`;
    }

    if (type === 'select' && Array.isArray(field.options)) {
      const options = field.options.map(opt => `<option value="${opt.value || opt}">${opt.label || opt}</option>`).join('');
      return `<select id="${id}" data-dyn-key="${field.question_code}" ${required}><option value="">Pilih</option>${options}</select>`;
    }

    return `<input id="${id}" data-dyn-key="${field.question_code}" type="${type}" placeholder="${placeholder}" ${required} />`;
  },

  fillDynamicFields(item) {
    const extra = item.extra_fields || item.field_values || item.jawaban || {};
    Object.entries(extra).forEach(([key, value]) => {
      const el = document.querySelector(`[data-dyn-key="${key}"]`);
      if (el) el.value = value;
    });
  },

  collectFormData() {
    const localDraft = DraftManager.getRegistrasiDraft()?.data || {};
    const mode = RegistrasiState.getMode();
    const stableClientSubmitId = mode === 'create'
      ? ClientId.ensure(localDraft.client_submit_id, 'SUB')
      : '';

    return {
      jenis_sasaran: document.getElementById('reg-jenis-sasaran')?.value || '',
      nama_sasaran: document.getElementById('reg-nama-sasaran')?.value?.trim() || '',
      nik: document.getElementById('reg-nik')?.value?.trim() || '',
      nomor_kk: document.getElementById('reg-no-kk')?.value?.trim() || '',
      jenis_kelamin: document.getElementById('reg-jenis-kelamin')?.value || '',
      tanggal_lahir: document.getElementById('reg-tanggal-lahir')?.value || '',
      nama_kecamatan: document.getElementById('reg-kecamatan')?.value || '',
      nama_desa: document.getElementById('reg-desa')?.value || '',
      nama_dusun: document.getElementById('reg-dusun')?.value?.trim() || '',
      alamat: document.getElementById('reg-alamat')?.value?.trim() || '',
      extra_fields: this.collectDynamicFields(),
      client_submit_id: stableClientSubmitId,
      sync_source: 'ONLINE'
    };
  },

  collectDynamicFields() {
    const values = {};
    document.querySelectorAll('[data-dyn-key]').forEach(el => {
      values[el.dataset.dynKey] = el.value;
    });
    return values;
  },

  validate(data) {
    const issues = [];

    if (!Validators.isRequired(data.jenis_sasaran)) {
      issues.push({ type: 'error', text: 'Jenis sasaran wajib dipilih.' });
    }

    if (!Validators.isRequired(data.nama_sasaran)) {
      issues.push({ type: 'error', text: 'Nama sasaran wajib diisi.' });
    }

    if (!Validators.isNikOrKK16(data.nik)) {
      issues.push({ type: 'error', text: 'NIK harus 16 digit angka.' });
    }

    if (!Validators.isNikOrKK16(data.nomor_kk)) {
      issues.push({ type: 'error', text: 'Nomor KK harus 16 digit angka.' });
    }

    if (data.nik === '9999999999999999') {
      issues.push({ type: 'warn', text: 'NIK memakai placeholder 16 digit angka 9.' });
    }

    if (data.nomor_kk === '9999999999999999') {
      issues.push({ type: 'warn', text: 'Nomor KK memakai placeholder 16 digit angka 9.' });
    }

    if (!data.nama_kecamatan) {
      issues.push({ type: 'warn', text: 'Nama kecamatan belum terisi.' });
    }

    if (!data.nama_desa) {
      issues.push({ type: 'warn', text: 'Nama desa belum terisi.' });
    }

    if (!issues.length) {
      issues.push({ type: 'ok', text: 'Validasi dasar lolos. Form siap dikirim.' });
    }

    return issues;
  },

  renderValidation() {
    const data = this.collectFormData();
    const issues = this.validate(data);

    const html = `<ul class="validation-list">${issues.map(issue => `
      <li class="validation-item-${issue.type}">${issue.text}</li>
    `).join('')}</ul>`;

    UI.setHTML('registrasi-validation-box', html);
  },

  tryLoadDraft() {
    if (RegistrasiState.getMode() !== 'create') return;

    const draft = DraftManager.getRegistrasiDraft();
    if (!draft?.data) return;

    this.fillForm(draft.data);
    const jenis = draft.data.jenis_sasaran || '';
    if (jenis) {
      this.loadDynamicFields(jenis).then(() => {
        this.fillDynamicFields({ extra_fields: draft.data.extra_fields || {} });
        this.renderValidation();
      });
    }
  },

  autosaveDraft() {
    if (RegistrasiState.getMode() !== 'create') return;
    const data = this.collectFormData();
    DraftManager.saveRegistrasiDraft(data);
  },

  async submit() {
    const mode = RegistrasiState.getMode();
    const editItem = RegistrasiState.getEditItem();
    const data = this.collectFormData();
    const issues = this.validate(data);
    const hasError = issues.some(item => item.type === 'error');

    this.renderValidation();

    if (hasError) {
      Notifier.show('Periksa kembali form registrasi.');
      return;
    }

    const payload = FormMapper.buildPayload(data, mode, editItem);

    UI.setLoading('btn-submit-registrasi', true, mode === 'edit' ? 'Menyimpan...' : 'Mengirim...');

    try {
      if (!navigator.onLine) {
        DraftManager.enqueueOfflineRegistrasi(payload);
        DraftManager.saveRegistrasiDraft(payload);
        Notifier.show('Sedang offline. Data disimpan ke draft sinkronisasi.');
        return;
      }

      const result = mode === 'edit'
        ? await RegistrasiService.updateSasaran(payload)
        : await RegistrasiService.submitRegistrasi(payload);

      if (!result?.ok) {
        throw new Error(result?.message || 'Gagal menyimpan data sasaran.');
      }

      DraftManager.clearRegistrasiDraft();
      RegistrasiState.clearEditItem();
      RegistrasiState.setMode('create');
      this.resetForm();
      this.prefillScope();
      this.applyModeUI();
      this.renderValidation();
      await SasaranList.loadAndRender();

      if (result?.data?.duplicate) {
        Notifier.show('Registrasi sasaran sudah pernah tersimpan sebelumnya.');
      } else {
        Notifier.show(mode === 'edit'
          ? 'Perubahan data sasaran berhasil disimpan.'
          : 'Registrasi sasaran berhasil disimpan.');
      }

      Router.toSasaranList();
    } catch (err) {
      DraftManager.saveRegistrasiDraft(payload);
      Notifier.show(err.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      UI.setLoading('btn-submit-registrasi', false);
    }
  }
};
