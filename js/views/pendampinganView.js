(function (window, document) {
  'use strict';

  function getSelected() {
    return (window.AppState && window.AppState.getState().selectedSasaran) ||
      window.AppStorage.get((window.AppConfig.STORAGE_KEYS || {}).SELECTED_SASARAN, null);
  }

  function getBootstrapRef() {
    return (window.AppState && window.AppState.getState().appBootstrap) ||
      window.AppStorage.get((window.AppConfig.STORAGE_KEYS || {}).APP_BOOTSTRAP, {});
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

  function renderSelectedInfo(item) {
    item = item || {};
    var profile = (window.AppState && window.AppState.getState().profile) || {};

    window.AppUtils.setText('pendampingan-nama-sasaran', item.nama_sasaran);
    window.AppUtils.setText('pendampingan-id-sasaran', 'ID Sasaran: ' + (item.id_sasaran || '-'), 'ID Sasaran: -');
    window.AppUtils.setText('pendampingan-status-badge', item.status_sasaran || '-');
    window.AppUtils.setText('pendampingan-jenis', item.jenis_sasaran);
    window.AppUtils.setText('pendampingan-wilayah', item.wilayah || item.alamat);
    window.AppUtils.setText('pendampingan-kader', profile.nama_user || profile.nama_kader);
    window.AppUtils.setText('pendampingan-tim', profile.nama_tim || profile.id_tim);
  }

  async function loadFormDefinition(jenis) {
    var dynamicBox = document.getElementById('pendampingan-dynamic-fields');
    if (!dynamicBox) return null;
    if (!jenis) {
      dynamicBox.innerHTML = '<p class="muted-text">Field pendampingan akan dimuat otomatis.</p>';
      return null;
    }
    try {
      var action = (window.AppConfig.API_ACTIONS || {}).GET_FORM_DEFINITION || 'getFormDefinition';
      var result = await window.Api.post(action, { jenis_sasaran: jenis, form_id: getFormIdByJenis(jenis) });
      if (!(result && result.ok)) throw new Error(window.Api.getMessage(result, 'Definisi form pendampingan gagal dimuat.'));
      var data = window.Api.getData(result);
      var fields = data.fields || [];
      if (!fields.length) {
        dynamicBox.innerHTML = '<div class="dynamic-field-card"><strong>' + window.AppUtils.escapeHtml(jenis) + '</strong><p class="muted-text">Definisi form belum tersedia atau masih kosong.</p></div>';
      } else {
        dynamicBox.innerHTML = fields.map(function (field) {
          return '<div class="dynamic-field-card"><strong>' + window.AppUtils.escapeHtml(field.label || field.key || 'Field') + '</strong><p class="muted-text">Tipe: ' + window.AppUtils.escapeHtml(field.type || 'text') + '</p></div>';
        }).join('');
      }
      return data;
    } catch (err) {
      dynamicBox.innerHTML = '<div class="dynamic-field-card"><strong>' + window.AppUtils.escapeHtml(jenis) + '</strong><p class="muted-text">Field dinamis belum tersedia.</p></div>';
      return null;
    }
  }

  function buildPayload() {
    var selected = getSelected() || {};
    var profile = (window.AppState && window.AppState.getState().profile) || {};
    var dateValue = (document.getElementById('pen-tanggal') || {}).value || '';
    var parts = dateValue ? dateValue.split('-') : [];
    return {
      client_submit_id: window.AppUtils.randomId('PEN'),
      sync_source: navigator.onLine ? 'ONLINE' : 'OFFLINE_DRAFT',
      id_sasaran: selected.id_sasaran || '',
      nama_sasaran: selected.nama_sasaran || '',
      jenis_sasaran: selected.jenis_sasaran || '',
      id_user: profile.id_user || '',
      id_tim: profile.id_tim || '',
      tanggal_pendampingan: dateValue,
      periode_tahun: parts[0] || '',
      periode_bulan: parts[1] || '',
      status_kunjungan: (document.getElementById('pen-status-kunjungan') || {}).value || '',
      catatan_umum: (document.getElementById('pen-catatan-umum') || {}).value || '',
      form_id: getFormIdByJenis(selected.jenis_sasaran || '')
    };
  }

  function renderValidation(messages, type) {
    var box = document.getElementById('pendampingan-validation-box');
    if (!box) return;
    if (!messages || !messages.length) {
      box.innerHTML = '<p class="muted-text">Validasi pendampingan akan tampil di sini.</p>';
      return;
    }
    box.innerHTML = '<ul class="validation-list">' +
      messages.map(function (message) {
        return '<li class="validation-item-' + (type || 'warn') + '">' + window.AppUtils.escapeHtml(message) + '</li>';
      }).join('') +
      '</ul>';
  }

  function validate(payload) {
    var errors = [];
    if (!payload.id_sasaran) errors.push('Pilih sasaran terlebih dahulu dari daftar sasaran.');
    if (!payload.tanggal_pendampingan) errors.push('Tanggal pendampingan wajib diisi.');
    return errors;
  }

  function resetForm() {
    var form = document.getElementById('pendampingan-form');
    if (form) form.reset();
    document.getElementById('pendampingan-mode-badge').textContent = 'CREATE';
    document.getElementById('pendampingan-mode-info').textContent = 'Mode input baru';
    renderValidation([]);
  }

  function bindActions() {
    var backBtn = document.getElementById('btn-back-from-pendampingan');
    if (backBtn && !backBtn.dataset.bound) {
      backBtn.dataset.bound = '1';
      backBtn.addEventListener('click', function () {
        window.AppRouter.goTo((window.AppConfig.SCREENS || {}).SASARAN_DETAIL || 'sasaran-detail-screen');
      });
    }

    var draftBtn = document.getElementById('btn-save-pen-draft');
    if (draftBtn && !draftBtn.dataset.bound) {
      draftBtn.dataset.bound = '1';
      draftBtn.addEventListener('click', function () {
        var payload = buildPayload();
        window.AppStorage.pushQueue({
          client_submit_id: payload.client_submit_id,
          action: (window.AppConfig.API_ACTIONS || {}).SUBMIT_PENDAMPINGAN || 'submitPendampingan',
          entity: 'pendampingan',
          status: 'PENDING',
          created_at: new Date().toISOString(),
          payload: payload
        });
        window.AppState.patch({ syncQueue: window.AppStorage.getQueue() });
        renderValidation(['Draft pendampingan berhasil disimpan offline.'], 'ok');
        if (window.UI) window.UI.showToast('Draft pendampingan tersimpan.', 'success');
      });
    }

    var resetBtn = document.getElementById('btn-reset-pendampingan');
    if (resetBtn && !resetBtn.dataset.bound) {
      resetBtn.dataset.bound = '1';
      resetBtn.addEventListener('click', resetForm);
    }

    var form = document.getElementById('pendampingan-form');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var payload = buildPayload();
        var errors = validate(payload);
        if (errors.length) {
          renderValidation(errors, 'error');
          if (window.UI) window.UI.showToast('Periksa validasi pendampingan.', 'warning');
          return;
        }

        try {
          var action = (window.AppConfig.API_ACTIONS || {}).SUBMIT_PENDAMPINGAN || 'submitPendampingan';
          var result = await window.Api.post(action, payload, { clientSubmitId: payload.client_submit_id, syncSource: 'ONLINE' });
          if (!(result && result.ok)) throw new Error((result && result.message) || 'Pendampingan gagal diproses.');

          renderValidation(['Pendampingan berhasil diproses.'], 'ok');
          if (window.UI) window.UI.showToast('Pendampingan berhasil.', 'success');
          resetForm();
          window.AppRouter.goTo((window.AppConfig.SCREENS || {}).SASARAN_DETAIL || 'sasaran-detail-screen');
        } catch (err) {
          window.AppStorage.pushQueue({
            client_submit_id: payload.client_submit_id,
            action: (window.AppConfig.API_ACTIONS || {}).SUBMIT_PENDAMPINGAN || 'submitPendampingan',
            entity: 'pendampingan',
            status: 'FAILED',
            created_at: new Date().toISOString(),
            error_message: err.message,
            payload: payload
          });
          window.AppState.patch({ syncQueue: window.AppStorage.getQueue() });
          renderValidation([err.message || 'Pendampingan gagal dikirim; draft disimpan untuk sinkronisasi.'], 'warn');
          if (window.UI) window.UI.showToast('Pendampingan dialihkan ke draft sinkronisasi.', 'warning');
        }
      });
    }
  }

  function init() {
    bindActions();
  }

  async function onEnter() {
    resetForm();
    var selected = getSelected() || {};
    renderSelectedInfo(selected);
    await loadFormDefinition(selected.jenis_sasaran || '');
  }

  window.PendampinganView = {
    init: init,
    onEnter: onEnter
  };
})(window, document);
