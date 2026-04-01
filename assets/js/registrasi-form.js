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
    const safeItem = item || {};

    RegistrasiState.setMode('edit');
    RegistrasiState.setEditItem(safeItem);
    Router.toRegistrasi();

    this.resetForm();
    this.applyModeUI();
    this.prefillScope();
    this.fillForm(safeItem);

    await this.loadDynamicFields(safeItem.jenis_sasaran || '');
    this.fillDynamicFields(safeItem);

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

    UI.setHTML(
      'registrasi-dynamic-fields',
      '<p class="muted-text">Pilih jenis sasaran untuk memuat pertanyaan khusus.</p>'
    );
  },

  prefillScope() {
    const profile = Session.getProfile() || {};
    const selected = SasaranState.getSelected() || {};
    const editItem = RegistrasiState.getEditItem() || {};
    const mode = RegistrasiState.getMode();

    const kecamatan =
      mode === 'edit'
        ? (editItem.nama_kecamatan || profile.nama_kecamatan || '')
        : (profile.nama_kecamatan || selected.nama_kecamatan || '');

    const desa =
      mode === 'edit'
        ? (editItem.nama_desa || profile.nama_desa || '')
        : (profile.nama_desa || selected.nama_desa || '');

    UI.setValue('reg-kecamatan', kecamatan);
    UI.setValue('reg-desa', desa);
  },

  fillForm(item) {
    const map = {
      'reg-jenis-sasaran': item.jenis_sasaran || '',
      'reg-nama-sasaran': item.nama_sasaran || item.nama || '',
      'reg-nik': item.nik || item.nik_sasaran || '',
      'reg-no-kk': item.nomor_kk || item.no_kk || '',
      'reg-jenis-kelamin': item.jenis_kelamin || '',
      'reg-tanggal-lahir': item.tanggal_lahir || item.tgl_lahir || '',
      'reg-kecamatan': item.nama_kecamatan || '',
      'reg-desa': item.nama_desa || '',
      'reg-dusun': item.nama_dusun || '',
      'reg-alamat': item.alamat || ''
    };

    Object.entries(map).forEach(([id, value]) => UI.setValue(id, value));
  },

  async loadDynamicFields(jenisSasaran) {
    if (!jenisSasaran) {
      UI.setHTML(
        'registrasi-dynamic-fields',
        '<p class="muted-text">Pilih jenis sasaran untuk memuat pertanyaan khusus.</p>'
      );
      return;
    }

    try {
      const result = await RegistrasiService.getFormDefinition(jenisSasaran);
      const fields = this.normalizeDynamicFields(result?.data, jenisSasaran);
      DynamicForm.render('registrasi-dynamic-fields', fields, {});
    } catch (err) {
      const fallback = FormMapper.getDefaultDynamicFields(jenisSasaran);
      DynamicForm.render('registrasi-dynamic-fields', fallback, {});
    }
  },

  normalizeDynamicFields(data, jenisSasaran) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.fields)) return data.fields;
    if (Array.isArray(data?.questions)) return data.questions;
    return FormMapper.getDefaultDynamicFields(jenisSasaran);
  },

  fillDynamicFields(item) {
    let extra = item.extra_fields || item.field_values || item.jawaban || {};

    if ((!extra || typeof extra !== 'object') && item.extra_fields_json) {
      try {
        extra = JSON.parse(item.extra_fields_json);
      } catch (_) {
        extra = {};
      }
    }

    if (!extra || typeof extra !== 'object') {
      extra = {};
    }

    DynamicForm.fill('registrasi-dynamic-fields', extra);
  },

  collectFormData() {
    const localDraft = DraftManager.getRegistrasiDraft()?.data || {};
    const mode = RegistrasiState.getMode();
    const editItem = RegistrasiState.getEditItem() || {};

    const stableClientSubmitId = mode === 'create'
      ? ClientId.ensure(localDraft.client_submit_id, 'SUB')
      : '';

    return {
      id_sasaran: editItem.id_sasaran || editItem.id || '',
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
      extra_fields: DynamicForm.collect('registrasi-dynamic-fields'),
      client_submit_id: stableClientSubmitId,
      sync_source: 'ONLINE'
    };
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

    if (!issues.some(item => item.type === 'error')) {
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
    const editItem = RegistrasiState.getEditItem() || {};
    const data = this.collectFormData();
    const issues = this.validate(data);
    const hasError = issues.some(item => item.type === 'error');

    this.renderValidation();

    if (hasError) {
      Notifier.show('Periksa kembali form registrasi.');
      return;
    }

    const payload = FormMapper.buildPayload(data, mode, editItem);

    UI.setLoading(
      'btn-submit-registrasi',
      true,
      mode === 'edit' ? 'Menyimpan...' : 'Mengirim...'
    );

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

      if (mode === 'edit') {
        const targetId = payload.id_sasaran || editItem.id_sasaran || editItem.id || '';
        if (targetId) {
          await SasaranDetail.openById(targetId);
        } else {
          Router.toSasaranList();
        }
      } else {
        Router.toSasaranList();
      }

      if (result?.data?.duplicate) {
        Notifier.show('Registrasi sasaran sudah pernah tersimpan sebelumnya.');
      } else {
        Notifier.show(
          mode === 'edit'
            ? 'Perubahan data sasaran berhasil disimpan.'
            : 'Registrasi sasaran berhasil disimpan.'
        );
      }
    } catch (err) {
      DraftManager.saveRegistrasiDraft(payload);
      Notifier.show(err.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      UI.setLoading('btn-submit-registrasi', false);
    }
  }
};
