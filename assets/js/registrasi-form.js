window.RegistrasiForm = {
    const html = `<ul class="validation-list">${issues.map(issue => `
      <li class="validation-item-${issue.type}">${issue.text}</li>
    `).join('')}</ul>`;

    UI.setHTML('registrasi-validation-box', html);
  },

  tryLoadDraft() {
    if (RegistrasiState.getMode() !== 'create') return;

    const draft = DraftManager.getRegistrasiDraft();
    if (!draft?.data) return;

    const shouldLoad = true;
    if (!shouldLoad) return;

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
        DraftManager.saveRegistrasiDraft(data);
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
      Notifier.show(mode === 'edit' ? 'Perubahan data sasaran berhasil disimpan.' : 'Registrasi sasaran berhasil disimpan.');
      Router.toSasaranList();
    } catch (err) {
      DraftManager.saveRegistrasiDraft(data);
      Notifier.show(err.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      UI.setLoading('btn-submit-registrasi', false);
    }
  }
};
