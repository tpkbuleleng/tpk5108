(function (window, document) {
  'use strict';

  function getProfile() {
    return (window.AppState && window.AppState.getState().profile) || {};
  }

  function getBootstrapRef() {
    return (window.AppState && window.AppState.getState().appBootstrap) ||
      window.AppStorage.get((window.AppConfig.STORAGE_KEYS || {}).APP_BOOTSTRAP, {});
  }

  function getSelected() {
    return (window.AppState && window.AppState.getState().selectedSasaran) ||
      window.AppStorage.get((window.AppConfig.STORAGE_KEYS || {}).SELECTED_SASARAN, null);
  }

  function populateWilayah() {
    var profile = getProfile();
    window.AppUtils.fillSelect('reg-kecamatan', [{
      value: profile.kecamatan || '',
      label: profile.kecamatan || 'Pilih kecamatan'
    }], {
      placeholder: 'Pilih kecamatan',
      value: profile.kecamatan || ''
    });

    window.AppUtils.fillSelect('reg-desa', [{
      value: profile.desa_kelurahan || '',
      label: profile.desa_kelurahan || 'Pilih desa/kelurahan'
    }], {
      placeholder: 'Pilih desa/kelurahan',
      value: profile.desa_kelurahan || ''
    });

    window.AppUtils.fillSelect('reg-dusun', [{
      value: profile.dusun_rw || '',
      label: profile.dusun_rw || 'Pilih dusun/RW'
    }], {
      placeholder: 'Pilih dusun/RW',
      value: profile.dusun_rw || ''
    });
  }

  function getFormIdByJenis(jenis) {
    var ref = getBootstrapRef();
    var list = (ref && ref.jenis_sasaran) || [];
    var found = (list || []).find(function (row) {
      return String(row.code || row.label || '').toUpperCase() === String(jenis || '').toUpperCase();
    });
    if (found && found.form_id) return found.form_id;
    var fallback = { CATIN: 'FRM0002', BUMIL: 'FRM0003', BUFAS: 'FRM0004', BADUTA: 'FRM0005' };
    return fallback[String(jenis || '').toUpperCase()] || 'FRM0001';
  }

  function renderDynamicFields(jenis, definition) {
    var dynamicBox = document.getElementById('registrasi-dynamic-fields');
    if (!dynamicBox) return;
    var fields = (definition && definition.fields) || [];
    if (!jenis) {
      dynamicBox.innerHTML = '<p class="muted-text">Pilih jenis sasaran untuk memuat pertanyaan khusus.</p>';
      return;
    }
    if (!fields.length) {
      dynamicBox.innerHTML = '<div class="dynamic-field-card"><strong>' + window.AppUtils.escapeHtml(jenis) + '</strong><p class="muted-text">Definisi form belum tersedia atau masih kosong.</p></div>';
      return;
    }
    dynamicBox.innerHTML = fields.map(function (field) {
      return '<div class="dynamic-field-card"><strong>' + window.AppUtils.escapeHtml(field.label || field.key || 'Field') + '</strong><p class="muted-text">Tipe: ' + window.AppUtils.escapeHtml(field.type || 'text') + '</p></div>';
    }).join('');
  }

  async function loadFormDefinition(jenis) {
    if (!jenis) {
      renderDynamicFields('', null);
      return null;
    }
    try {
      var action = (window.AppConfig.API_ACTIONS || {}).GET_FORM_DEFINITION || 'getFormDefinition';
      var payload = { jenis_sasaran: jenis, form_id: getFormIdByJenis(jenis) };
      var result = await window.Api.post(action, payload);
      if (!(result && result.ok)) throw new Error(window.Api.getMessage(result, 'Definisi form gagal dimuat.'));
      var data = window.Api.getData(result);
      renderDynamicFields(jenis, data);
      return data;
    } catch (err) {
      renderDynamicFields(jenis, null);
      if (window.UI) window.UI.showToast(err.message || 'Definisi form belum tersedia.', 'warning');
      return null;
    }
  }

  function renderValidation(messages, type) {
    var box = document.getElementById('registrasi-validation-box');
    if (!box) return;
    if (!messages || !messages.length) {
      box.innerHTML = '<p class="muted-text">Validasi akan tampil di sini sebelum submit.</p>';
      return;
    }

    box.innerHTML = '<ul class="validation-list">' +
      messages.map(function (message) {
        return '<li class="validation-item-' + (type || 'warn') + '">' + window.AppUtils.escapeHtml(message) + '</li>';
      }).join('') +
      '</ul>';
  }

  function validateForm(payload) {
    var errors = [];
    if (!payload.jenis_sasaran) errors.push('Jenis sasaran wajib dipilih.');
    if (!payload.nama_sasaran) errors.push('Nama sasaran wajib diisi.');
    if (!payload.nama_kepala_keluarga) errors.push('Nama kepala keluarga wajib diisi.');
    if (!payload.nomor_kk || window.AppUtils.onlyDigits(payload.nomor_kk).length !== 16) errors.push('Nomor KK harus 16 digit.');
    if (!payload.nik_sasaran || window.AppUtils.onlyDigits(payload.nik_sasaran).length !== 16) errors.push('NIK harus 16 digit.');
    if (!payload.nama_kecamatan) errors.push('Kecamatan wajib dipilih.');
    if (!payload.nama_desa) errors.push('Desa/Kelurahan wajib dipilih.');
    if (!payload.nama_dusun) errors.push('Dusun/RW wajib dipilih.');

    var date = window.AppUtils.parseDate(payload.tanggal_lahir);
    if (payload.tanggal_lahir && !date) errors.push('Tanggal lahir tidak valid.');
    if (date && date > new Date()) errors.push('Tanggal lahir tidak boleh melebihi hari ini.');

    var jenis = String(payload.jenis_sasaran || '').toUpperCase();
    if (jenis === 'BADUTA' && payload.tanggal_lahir) {
      var ageMonths = window.AppUtils.getAgeMonths(payload.tanggal_lahir);
      if (ageMonths != null && ageMonths > 24) errors.push('Sasaran BADUTA tidak boleh lebih dari 24 bulan.');
    }
    if ((jenis === 'BUMIL' || jenis === 'BUFAS') && payload.tanggal_lahir) {
      var ageYears = window.AppUtils.getAgeYears(payload.tanggal_lahir);
      if (ageYears != null && ageYears > 55) errors.push('Usia sasaran BUMIL/BUFAS tidak boleh lebih dari 55 tahun.');
    }

    return errors;
  }

  function buildPayload(mode) {
    var profile = getProfile();
    var selected = getSelected() || {};
    var jenis = (document.getElementById('reg-jenis-sasaran') || {}).value || '';
    return {
      client_submit_id: window.AppUtils.randomId('REG'),
      sync_source: navigator.onLine ? 'ONLINE' : 'OFFLINE_DRAFT',
      id_sasaran: mode === 'edit' ? (selected.id_sasaran || '') : '',
      id_user: profile.id_user || '',
      id_tim: profile.id_tim || '',
      jenis_sasaran: jenis,
      form_id: getFormIdByJenis(jenis),
      nama_sasaran: (document.getElementById('reg-nama-sasaran') || {}).value || '',
      nama_kepala_keluarga: (document.getElementById('reg-nama-kepala-keluarga') || {}).value || '',
      nama_ibu_kandung: (document.getElementById('reg-nama-ibu-kandung') || {}).value || '',
      nik_sasaran: window.AppUtils.onlyDigits((document.getElementById('reg-nik') || {}).value || ''),
      nomor_kk: window.AppUtils.onlyDigits((document.getElementById('reg-no-kk') || {}).value || ''),
      jenis_kelamin: (document.getElementById('reg-jenis-kelamin') || {}).value || '',
      tanggal_lahir: (document.getElementById('reg-tanggal-lahir') || {}).value || '',
      nama_kecamatan: (document.getElementById('reg-kecamatan') || {}).value || '',
      nama_desa: (document.getElementById('reg-desa') || {}).value || '',
      nama_dusun: (document.getElementById('reg-dusun') || {}).value || '',
      alamat: (document.getElementById('reg-alamat') || {}).value || ''
    };
  }

  function fillFormForEdit(item) {
    item = item || {};
    window.AppUtils.setValue('reg-jenis-sasaran', item.jenis_sasaran || '');
    window.AppUtils.setValue('reg-nama-sasaran', item.nama_sasaran || '');
    window.AppUtils.setValue('reg-nama-kepala-keluarga', item.nama_kepala_keluarga || '');
    window.AppUtils.setValue('reg-nama-ibu-kandung', item.nama_ibu_kandung || '');
    window.AppUtils.setValue('reg-nik', item.nik_sasaran || '');
    window.AppUtils.setValue('reg-no-kk', item.nomor_kk || '');
    window.AppUtils.setValue('reg-jenis-kelamin', item.jenis_kelamin || '');
    window.AppUtils.setValue('reg-tanggal-lahir', item.tanggal_lahir || '');
    window.AppUtils.setValue('reg-kecamatan', item.nama_kecamatan || item.kecamatan || getProfile().kecamatan || '');
    window.AppUtils.setValue('reg-desa', item.nama_desa || item.desa_kelurahan || getProfile().desa_kelurahan || '');
    window.AppUtils.setValue('reg-dusun', item.nama_dusun || item.dusun_rw || getProfile().dusun_rw || '');
    window.AppUtils.setValue('reg-alamat', item.alamat || '');
    window.AppUtils.toggle('group-reg-nama-ibu-kandung', String(item.jenis_sasaran || '').toUpperCase() === 'BADUTA');
  }

  function resetFormToDefault() {
    var form = document.getElementById('registrasi-form');
    if (form) form.reset();
    populateWilayah();
    renderValidation([]);
    window.AppUtils.toggle('group-reg-nama-ibu-kandung', false);
    renderDynamicFields('', null);
    document.getElementById('registrasi-mode-badge').textContent = 'CREATE';
    document.getElementById('registrasi-mode-info').textContent = 'Mode registrasi baru';
  }

  function bindActions() {
    var backBtn = document.getElementById('btn-back-from-registrasi');
    if (backBtn && !backBtn.dataset.bound) {
      backBtn.dataset.bound = '1';
      backBtn.addEventListener('click', function () {
        window.AppRouter.goTo((window.AppConfig.SCREENS || {}).DASHBOARD || 'dashboard-screen');
      });
    }

    var jenis = document.getElementById('reg-jenis-sasaran');
    if (jenis && !jenis.dataset.bound) {
      jenis.dataset.bound = '1';
      jenis.addEventListener('change', function () {
        var value = this.value;
        window.AppUtils.toggle('group-reg-nama-ibu-kandung', value === 'BADUTA');
        loadFormDefinition(value);
      });
    }

    var draftBtn = document.getElementById('btn-save-reg-draft');
    if (draftBtn && !draftBtn.dataset.bound) {
      draftBtn.dataset.bound = '1';
      draftBtn.addEventListener('click', function () {
        var mode = document.getElementById('registrasi-mode-badge').textContent === 'EDIT' ? 'edit' : 'create';
        var action = mode === 'edit'
          ? ((window.AppConfig.API_ACTIONS || {}).UPDATE_SASARAN || 'updateSasaran')
          : ((window.AppConfig.API_ACTIONS || {}).REGISTER_SASARAN || 'registerSasaran');
        var payload = buildPayload(mode);
        window.AppStorage.pushQueue({
          client_submit_id: payload.client_submit_id,
          action: action,
          entity: mode === 'edit' ? 'update-sasaran' : 'registrasi',
          status: 'PENDING',
          created_at: new Date().toISOString(),
          payload: payload
        });
        window.AppState.patch({ syncQueue: window.AppStorage.getQueue() });
        renderValidation(['Draft sasaran berhasil disimpan offline.'], 'ok');
        if (window.UI) window.UI.showToast('Draft sasaran tersimpan.', 'success');
      });
    }

    var resetBtn = document.getElementById('btn-reset-registrasi');
    if (resetBtn && !resetBtn.dataset.bound) {
      resetBtn.dataset.bound = '1';
      resetBtn.addEventListener('click', resetFormToDefault);
    }

    var form = document.getElementById('registrasi-form');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var mode = document.getElementById('registrasi-mode-badge').textContent === 'EDIT' ? 'edit' : 'create';
        var payload = buildPayload(mode);
        var errors = validateForm(payload);
        if (errors.length) {
          renderValidation(errors, 'error');
          if (window.UI) window.UI.showToast('Periksa validasi registrasi.', 'warning');
          return;
        }

        try {
          var action = mode === 'edit'
            ? ((window.AppConfig.API_ACTIONS || {}).UPDATE_SASARAN || 'updateSasaran')
            : ((window.AppConfig.API_ACTIONS || {}).REGISTER_SASARAN || 'registerSasaran');
          var result = await window.Api.post(action, payload, { clientSubmitId: payload.client_submit_id, syncSource: 'ONLINE' });
          if (!(result && result.ok)) {
            throw new Error((result && result.message) || 'Registrasi gagal diproses.');
          }

          renderValidation(['Data sasaran berhasil diproses.'], 'ok');
          if (window.UI) window.UI.showToast(mode === 'edit' ? 'Perubahan sasaran berhasil.' : 'Registrasi berhasil.', 'success');
          resetFormToDefault();
          if (window.SasaranListView && typeof window.SasaranListView.loadData === 'function') {
            window.SasaranListView.loadData().catch(function () {});
          }
          window.AppRouter.goTo((window.AppConfig.SCREENS || {}).SASARAN_LIST || 'sasaran-list-screen');
        } catch (err) {
          window.AppStorage.pushQueue({
            client_submit_id: payload.client_submit_id,
            action: mode === 'edit'
              ? ((window.AppConfig.API_ACTIONS || {}).UPDATE_SASARAN || 'updateSasaran')
              : ((window.AppConfig.API_ACTIONS || {}).REGISTER_SASARAN || 'registerSasaran'),
            entity: mode === 'edit' ? 'update-sasaran' : 'registrasi',
            status: 'FAILED',
            created_at: new Date().toISOString(),
            error_message: err.message,
            payload: payload
          });
          window.AppState.patch({ syncQueue: window.AppStorage.getQueue() });
          renderValidation([err.message || 'Registrasi gagal dikirim; draft disimpan untuk sinkronisasi.'], 'warn');
          if (window.UI) window.UI.showToast('Data sasaran dialihkan ke draft sinkronisasi.', 'warning');
        }
      });
    }
  }

  function init() {
    bindActions();
  }

  async function onEnter(options) {
    populateWilayah();
    renderValidation([]);

    if (options && options.mode === 'edit') {
      document.getElementById('registrasi-mode-badge').textContent = 'EDIT';
      document.getElementById('registrasi-mode-info').textContent = 'Mode edit dari detail sasaran';
      fillFormForEdit(getSelected() || {});
      await loadFormDefinition((getSelected() || {}).jenis_sasaran || (document.getElementById('reg-jenis-sasaran') || {}).value || '');
      return;
    }

    resetFormToDefault();
  }

  window.RegistrasiView = {
    init: init,
    onEnter: onEnter
  };
})(window, document);
