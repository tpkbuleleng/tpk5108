window.PendampinganForm = {
  async openCreate() {
    const selected = SasaranState.getSelected();
    if (!selected) {
      Notifier.show('Pilih sasaran terlebih dahulu.');
      Router.toSasaranList();
      return;
    }

    PendampinganState.setMode('create');
    PendampinganState.clearEditItem();
    Router.toPendampingan();
    this.resetForm();
    this.applyModeUI();
    this.renderHeader(selected);
    this.prefillIdentity();
    await this.loadDynamicFields(selected.jenis_sasaran || '');
    this.tryLoadDraftForSelected();
    this.renderValidation();
  },

  async openEdit(idPendampingan) {
    if (!idPendampingan) {
      Notifier.show('ID pendampingan tidak ditemukan.');
      return;
    }

    try {
      const result = await PendampinganService.getPendampinganDetail(idPendampingan);
      if (!result?.ok) {
        throw new Error(result?.message || 'Gagal memuat detail pendampingan.');
      }

      const item = result?.data || {};
      if (!item?.id_pendampingan) {
        throw new Error('Data detail pendampingan tidak valid.');
      }

      PendampinganState.setMode('edit');
      PendampinganState.setEditItem(item);

      Router.toPendampingan();
      this.resetForm();
      this.applyModeUI();

      this.renderHeader({
        id_sasaran: item.id_sasaran || '',
        id: item.id_sasaran || '',
        nama_sasaran: item.nama_sasaran || '',
        jenis_sasaran: item.jenis_sasaran || '',
        status_sasaran: item.status_sasaran || 'AKTIF',
        nama_wilayah: item.nama_wilayah || item.nama_desa || item.nama_kecamatan || ''
      });

      await this.loadDynamicFields(item.jenis_sasaran || '');
      this.fillForm(item);
      this.fillDynamicFields(item.extra_fields || {});
      this.renderValidation();
    } catch (err) {
      Notifier.show(err.message || 'Gagal membuka mode edit pendampingan.');
    }
  },

  applyModeUI() {
    const mode = PendampinganState.getMode();
    const isEdit = mode === 'edit';

    UI.setText('pendampingan-mode-info', isEdit ? 'Mode edit laporan pendampingan' : 'Mode input baru');
    UI.setText('btn-submit-pendampingan', isEdit ? 'Simpan Perubahan' : 'Submit Pendampingan');

    const badge = document.getElementById('pendampingan-mode-badge');
    if (badge) {
      badge.textContent = isEdit ? 'EDIT' : 'CREATE';
      badge.className = `badge ${isEdit ? 'badge-warning' : 'badge-success-soft'}`;
    }

    const reasonGroup = document.getElementById('edit-reason-group');
    if (reasonGroup) {
      reasonGroup.classList.toggle('hidden', !isEdit);
    }
  },

  renderHeader(item) {
    const profile = Session.getProfile() || {};
    const status = item.status_sasaran || item.status || '-';
    const wilayah = item.nama_wilayah || item.wilayah || item.nama_desa || item.nama_kecamatan || '-';

    UI.setText('pendampingan-nama-sasaran', item.nama_sasaran || item.nama || '-');
    UI.setText('pendampingan-id-sasaran', `ID Sasaran: ${item.id_sasaran || item.id || '-'}`);
    UI.setText('pendampingan-jenis', item.jenis_sasaran || '-');
    UI.setText('pendampingan-wilayah', wilayah);
    UI.setText('pendampingan-kader', profile.nama_kader || profile.nama || '-');
    UI.setText('pendampingan-tim', profile.nama_tim || '-');

    const badge = document.getElementById('pendampingan-status-badge');
    if (badge) {
      badge.textContent = status;
      badge.className = `badge ${this.getStatusBadgeClass(status)}`;
    }
  },

  prefillIdentity() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const el = document.getElementById('pen-tanggal');
    if (el && !el.value) {
      el.value = `${yyyy}-${mm}-${dd}`;
    }
  },

  async loadDynamicFields(jenisSasaran) {
    if (!jenisSasaran) {
      UI.setHTML('pendampingan-dynamic-fields', '<p class="muted-text">Jenis sasaran tidak tersedia.</p>');
      return;
    }

    try {
      const result = await PendampinganService.getPendampinganFormDefinition(jenisSasaran);
      const fields = this.normalizeDynamicFields(result?.data, jenisSasaran);
      this.renderDynamicFields(fields);
    } catch (err) {
      const fallback = this.getFallbackFields(jenisSasaran);
      this.renderDynamicFields(fallback);
    }
  },

  normalizeDynamicFields(data, jenisSasaran) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.fields)) return data.fields;
    if (Array.isArray(data?.questions)) return data.questions;
    return this.getFallbackFields(jenisSasaran);
  },

  getFallbackFields(jenisSasaran) {
    const key = String(jenisSasaran || '').toUpperCase();
    const map = {
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
        { question_code: 'berat_badan', label: 'Berat Badan', type: 'text', required: false },
        { question_code: 'asi_eksklusif', label: 'ASI Eksklusif', type: 'select', required: false, options: ['YA', 'TIDAK'] },
        { question_code: 'catatan_baduta', label: 'Catatan BADUTA', type: 'textarea', required: false }
      ]
    };

    return map[key] || [];
  },

  renderDynamicFields(fields) {
    const container = document.getElementById('pendampingan-dynamic-fields');
    if (!container) return;

    if (!fields.length) {
      container.innerHTML = '<p class="muted-text">Tidak ada field pendampingan untuk jenis ini.</p>';
      return;
    }

    container.innerHTML = fields.map(field => `
      <div class="dynamic-field-card">
        <div class="form-group">
          <label for="pen-dyn-${field.question_code}">${field.label}${field.required ? ' *' : ''}</label>
          ${this.makeInput(field)}
        </div>
      </div>
    `).join('');
  },

  makeInput(field) {
    const id = `pen-dyn-${field.question_code}`;
    const required = field.required ? 'required' : '';
    const placeholder = field.placeholder || '';
    const type = field.type || 'text';

    if (type === 'textarea') {
      return `<textarea id="${id}" data-pen-key="${field.question_code}" rows="3" placeholder="${placeholder}" ${required}></textarea>`;
    }

    if (type === 'select') {
      const options = Array.isArray(field.options)
        ? field.options.map(opt => `<option value="${opt.value || opt}">${opt.label || opt}</option>`).join('')
        : '';

      return `<select id="${id}" data-pen-key="${field.question_code}" ${required}><option value="">Pilih</option>${options}</select>`;
    }

    return `<input id="${id}" data-pen-key="${field.question_code}" type="${type}" placeholder="${placeholder}" ${required} />`;
  },

  fillForm(item) {
    const map = {
      'pen-tanggal': item.tanggal_pendampingan || '',
      'pen-status-kunjungan': item.status_kunjungan || '',
      'pen-catatan-umum': item.catatan_umum || '',
      'pen-edit-reason': ''
    };

    Object.entries(map).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });
  },

  fillDynamicFields(extraFields = {}) {
    Object.entries(extraFields).forEach(([key, value]) => {
      const el = document.querySelector(`[data-pen-key="${key}"]`);
      if (el) el.value = value;
    });
  },

  collectDynamicFields() {
    const values = {};
    document.querySelectorAll('[data-pen-key]').forEach(el => {
      values[el.dataset.penKey] = el.value;
    });
    return values;
  },

  collectFormData() {
    const selected = SasaranState.getSelected() || {};
    const profile = Session.getProfile() || {};
    const editItem = PendampinganState.getEditItem() || {};
    const mode = PendampinganState.getMode();
    const localDraft = PendampinganDraft.getLocal()?.data || {};

    const stableClientSubmitId = mode === 'create'
      ? ClientId.ensure(localDraft.client_submit_id, 'SUB')
      : '';

    return {
      mode,
      id_pendampingan: mode === 'edit' ? (editItem.id_pendampingan || '') : '',
      id_sasaran: selected.id_sasaran || selected.id || editItem.id_sasaran || '',
      jenis_sasaran: selected.jenis_sasaran || editItem.jenis_sasaran || '',
      form_id: FormMapper.getFormIdByJenis(selected.jenis_sasaran || editItem.jenis_sasaran || ''),
      nama_sasaran: selected.nama_sasaran || selected.nama || editItem.nama_sasaran || '',
      tanggal_pendampingan: document.getElementById('pen-tanggal')?.value || '',
      status_kunjungan: document.getElementById('pen-status-kunjungan')?.value || '',
      catatan_umum: document.getElementById('pen-catatan-umum')?.value?.trim() || '',
      edit_reason: document.getElementById('pen-edit-reason')?.value?.trim() || '',
      id_kader: profile.id_kader || '',
      nama_kader: profile.nama_kader || profile.nama || '',
      id_tim: profile.id_tim || '',
      nama_tim: profile.nama_tim || '',
      client_submit_id: stableClientSubmitId,
      sync_source: mode === 'create' ? 'ONLINE' : 'ONLINE',
      extra_fields: this.collectDynamicFields()
    };
  },

  validate(data) {
    const issues = [];
    const mode = PendampinganState.getMode();

    if (!Validators.isRequired(data.id_sasaran)) {
      issues.push({ type: 'error', text: 'ID sasaran tidak ditemukan. Pilih sasaran kembali.' });
    }

    if (!Validators.isRequired(data.jenis_sasaran)) {
      issues.push({ type: 'error', text: 'Jenis sasaran tidak tersedia.' });
    }

    if (!Validators.isRequired(data.tanggal_pendampingan)) {
      issues.push({ type: 'error', text: 'Tanggal pendampingan wajib diisi.' });
    }

    if (!Validators.isRequired(data.id_kader) && mode === 'create') {
      issues.push({ type: 'error', text: 'ID kader tidak tersedia pada sesi login.' });
    }

    if (!data.status_kunjungan) {
      issues.push({ type: 'warn', text: 'Status kunjungan belum dipilih.' });
    }

    if (mode === 'edit') {
      if (!Validators.isRequired(data.id_pendampingan)) {
        issues.push({ type: 'error', text: 'ID pendampingan tidak ditemukan.' });
      }

      if (!Validators.isRequired(data.edit_reason)) {
        issues.push({ type: 'error', text: 'Alasan edit wajib diisi.' });
      }
    }

    if (!issues.some(item => item.type === 'error')) {
      issues.push({ type: 'ok', text: 'Validasi dasar pendampingan lolos.' });
    }

    return issues;
  },

  renderValidation() {
    const data = this.collectFormData();
    const issues = this.validate(data);

    const html = `<ul class="validation-list">${issues.map(issue => `
      <li class="validation-item-${issue.type}">${issue.text}</li>
    `).join('')}</ul>`;

    UI.setHTML('pendampingan-validation-box', html);
  },

  resetForm() {
    const form = document.getElementById('pendampingan-form');
    if (form) form.reset();

    UI.setHTML('pendampingan-dynamic-fields', '<p class="muted-text">Field pendampingan akan dimuat otomatis.</p>');

    const editReason = document.getElementById('pen-edit-reason');
    if (editReason) editReason.value = '';
  },

  tryLoadDraftForSelected() {
    const mode = PendampinganState.getMode();
    if (mode !== 'create') return;

    const draft = PendampinganDraft.getLocal();
    const selected = SasaranState.getSelected() || {};
    if (!draft?.data) return;

    const sameTarget = (draft.data.id_sasaran || '') === (selected.id_sasaran || selected.id || '');
    if (!sameTarget) return;

    const elTanggal = document.getElementById('pen-tanggal');
    const elStatus = document.getElementById('pen-status-kunjungan');
    const elCatatan = document.getElementById('pen-catatan-umum');

    if (elTanggal) elTanggal.value = draft.data.tanggal_pendampingan || '';
    if (elStatus) elStatus.value = draft.data.status_kunjungan || '';
    if (elCatatan) elCatatan.value = draft.data.catatan_umum || '';

    const extra = draft.data.extra_fields || {};
    Object.entries(extra).forEach(([key, value]) => {
      const el = document.querySelector(`[data-pen-key="${key}"]`);
      if (el) el.value = value;
    });
  },

  autosaveDraft() {
    if (PendampinganState.getMode() !== 'create') return;
    const data = this.collectFormData();
    PendampinganDraft.saveLocal(data);
  },

  async submit() {
    const mode = PendampinganState.getMode();
    const editItem = PendampinganState.getEditItem() || {};
    const data = this.collectFormData();
    const issues = this.validate(data);
    const hasError = issues.some(item => item.type === 'error');

    this.renderValidation();

    if (hasError) {
      Notifier.show('Periksa kembali form pendampingan.');
      return;
    }

    UI.setLoading('btn-submit-pendampingan', true, mode === 'edit' ? 'Menyimpan...' : 'Mengirim...');

    try {
      let payload;

      if (mode === 'edit') {
        payload = {
          id_pendampingan: editItem.id_pendampingan || data.id_pendampingan,
          tanggal_pendampingan: data.tanggal_pendampingan,
          status_kunjungan: data.status_kunjungan,
          catatan_umum: data.catatan_umum,
          extra_fields: data.extra_fields,
          edit_reason: data.edit_reason,
          sync_source: 'ONLINE'
        };
      } else {
        payload = {
          id_sasaran: data.id_sasaran,
          jenis_sasaran: data.jenis_sasaran,
          form_id: data.form_id,
          nama_sasaran: data.nama_sasaran,
          tanggal_pendampingan: data.tanggal_pendampingan,
          status_kunjungan: data.status_kunjungan,
          catatan_umum: data.catatan_umum,
          id_kader: data.id_kader,
          nama_kader: data.nama_kader,
          id_tim: data.id_tim,
          nama_tim: data.nama_tim,
          client_submit_id: data.client_submit_id,
          sync_source: 'ONLINE',
          extra_fields: data.extra_fields
        };
      }

      if (!navigator.onLine && mode === 'create') {
        PendampinganDraft.enqueueOffline(payload);
        PendampinganDraft.saveLocal(payload);
        Notifier.show('Sedang offline. Pendampingan disimpan ke antrean sinkronisasi.');
        return;
      }

      if (!navigator.onLine && mode === 'edit') {
        Notifier.show('Edit pendampingan hanya dapat dilakukan saat online.');
        return;
      }

      const result = mode === 'edit'
        ? await PendampinganService.updatePendampingan(payload)
        : await PendampinganService.submitPendampingan(payload);

      if (!result?.ok) {
        throw new Error(result?.message || 'Gagal menyimpan pendampingan.');
      }

      PendampinganDraft.clearLocal();
      PendampinganState.reset();

      const currentSelected = SasaranState.getSelected() || {};
      const selectedId = currentSelected.id_sasaran || currentSelected.id || data.id_sasaran;
      await SasaranDetail.openById(selectedId);

      if (result?.data?.duplicate) {
        Notifier.show('Pendampingan sudah pernah tersimpan sebelumnya.');
      } else {
        Notifier.show(mode === 'edit' ? 'Pendampingan berhasil diperbarui.' : 'Pendampingan berhasil dikirim.');
      }
    } catch (err) {
      if (mode === 'create') {
        PendampinganDraft.saveLocal(data);
      }
      Notifier.show(err.message || 'Terjadi kesalahan saat menyimpan pendampingan.');
    } finally {
      UI.setLoading('btn-submit-pendampingan', false);
    }
  },

  getStatusBadgeClass(status) {
    const value = String(status || '').toUpperCase();
    if (value === 'AKTIF') return 'badge-success-soft';
    if (value === 'NONAKTIF') return 'badge-danger-soft';
    if (value === 'SELESAI') return 'badge-success';
    return 'badge-neutral';
  }
};
