(function (window, document) {
  'use strict';

  var DRAFT_KEY = 'syncQueue';
  var NIK_PLACEHOLDER = '9999999999999999';
  var KK_PLACEHOLDER = '9999999999999999';
  var ALLOWED_JENIS = ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'];
  var initialized = false;
  var currentMode = 'create';
  var currentContainer = null;
  var refs = {
    jenis_sasaran: ALLOWED_JENIS.slice(),
    wilayah: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function getState() {
    return window.AppState || null;
  }

  function getStorage() {
    return window.Storage || null;
  }

  function getApi() {
    return window.Api || null;
  }

  function getUI() {
    return window.UI || null;
  }

  function showToast(message, type) {
    var ui = getUI();
    if (ui && typeof ui.showToast === 'function') {
      ui.showToast(message, type || 'info');
      return;
    }
    try { window.alert(message); } catch (err) {}
  }

  function setText(id, value) {
    var el = byId(id);
    if (el) el.textContent = value == null || value === '' ? '-' : String(value);
  }

  function setValue(id, value) {
    var el = byId(id);
    if (el) el.value = value == null ? '' : String(value);
  }

  function setHidden(id, hidden) {
    var el = typeof id === 'string' ? byId(id) : id;
    if (!el) return;
    el.classList.toggle('hidden', !!hidden);
  }

  function normalizeSpaces(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function digitsOnly(value) {
    return String(value == null ? '' : value).replace(/\D+/g, '');
  }

  function getProfile() {
    var state = getState();
    if (state && typeof state.getProfile === 'function') {
      return state.getProfile() || {};
    }

    var storage = getStorage();
    if (storage && typeof storage.get === 'function') {
      return storage.get('tpk_profile', {}) || {};
    }

    try {
      return JSON.parse(localStorage.getItem('tpk_profile') || '{}');
    } catch (err) {
      return {};
    }
  }

  function getToday() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function parseDate(value) {
    var s = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var p = s.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    if (d.getFullYear() !== p[0] || d.getMonth() !== p[1] - 1 || d.getDate() !== p[2]) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function calcAge(value) {
    var dob = parseDate(value);
    if (!dob) return { valid: false, totalMonths: null, years: null, months: null, label: '-' };
    var now = getToday();
    if (dob > now) return { valid: false, totalMonths: null, years: null, months: null, label: '-' };

    var years = now.getFullYear() - dob.getFullYear();
    var months = now.getMonth() - dob.getMonth();
    var days = now.getDate() - dob.getDate();
    if (days < 0) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return {
      valid: true,
      totalMonths: years * 12 + months,
      years: years,
      months: months,
      label: years + ' tahun ' + months + ' bulan'
    };
  }

  function getValidationBox() {
    return byId('registrasi-validation-box');
  }

  function renderValidation(errors, warnings) {
    var box = getValidationBox();
    if (!box) return;

    errors = errors || [];
    warnings = warnings || [];

    if (!errors.length && !warnings.length) {
      box.innerHTML = '<p class="muted-text">Validasi akan tampil di sini sebelum submit.</p>';
      return;
    }

    var html = [];
    if (errors.length) {
      html.push('<div class="alert alert-danger"><strong>Perlu diperbaiki:</strong><ul>');
      errors.forEach(function (msg) { html.push('<li>' + escapeHtml(msg) + '</li>'); });
      html.push('</ul></div>');
    }
    if (warnings.length) {
      html.push('<div class="alert alert-warning"><strong>Perhatian:</strong><ul>');
      warnings.forEach(function (msg) { html.push('<li>' + escapeHtml(msg) + '</li>'); });
      html.push('</ul></div>');
    }

    box.innerHTML = html.join('');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function populateSelect(selectId, items, placeholder) {
    var el = byId(selectId);
    if (!el) return;
    var html = ['<option value="">' + escapeHtml(placeholder || 'Pilih') + '</option>'];
    (items || []).forEach(function (item) {
      var value = item.value != null ? item.value : item;
      var label = item.label != null ? item.label : item;
      html.push('<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + '</option>');
    });
    el.innerHTML = html.join('');
  }

  function buildWilayahRefsFromProfile() {
    var profile = getProfile();
    var kecamatan = profile.nama_kecamatan || profile.kecamatan || '';
    var desa = profile.desa_kelurahan || profile.nama_desa || '';
    var dusun = profile.dusun_rw || profile.nama_dusun || '';

    refs.wilayah = {
      kecamatan: kecamatan ? [{ value: kecamatan, label: kecamatan }] : [],
      desa: desa ? [{ value: desa, label: desa }] : [],
      dusun: dusun ? [{ value: dusun, label: dusun }] : []
    };
  }

  function hydrateWilayah() {
    buildWilayahRefsFromProfile();
    populateSelect('reg-kecamatan', refs.wilayah.kecamatan, 'Pilih kecamatan');
    populateSelect('reg-desa', refs.wilayah.desa, 'Pilih desa/kelurahan');
    populateSelect('reg-dusun', refs.wilayah.dusun, 'Pilih dusun/RW');

    if (refs.wilayah.kecamatan[0]) setValue('reg-kecamatan', refs.wilayah.kecamatan[0].value);
    if (refs.wilayah.desa[0]) setValue('reg-desa', refs.wilayah.desa[0].value);
    if (refs.wilayah.dusun[0]) setValue('reg-dusun', refs.wilayah.dusun[0].value);
  }

  function toggleMotherNameField(jenis) {
    var show = String(jenis || '').toUpperCase() === 'BADUTA';
    setHidden('group-reg-nama-ibu-kandung', !show);
    if (!show) setValue('reg-nama-ibu-kandung', '');
  }

  function renderDynamicFields(jenis) {
    var container = byId('registrasi-dynamic-fields');
    if (!container) return;

    var code = String(jenis || '').toUpperCase();
    if (!code) {
      container.innerHTML = '<p class="muted-text">Pilih jenis sasaran untuk memuat pertanyaan khusus.</p>';
      return;
    }

    var html = [];
    if (code === 'CATIN') {
      html.push('<div class="filters-grid">');
      html.push('<div class="form-group"><label for="reg-catatan-status-catin">Keterangan Tambahan</label><input id="reg-catatan-status-catin" type="text" placeholder="Contoh: Catin baru terdaftar"></div>');
      html.push('</div>');
    } else if (code === 'BUMIL') {
      html.push('<div class="filters-grid">');
      html.push('<div class="form-group"><label for="reg-usia-kehamilan">Usia Kehamilan (minggu)</label><input id="reg-usia-kehamilan" type="number" min="0" max="50" placeholder="Contoh: 24"></div>');
      html.push('</div>');
    } else if (code === 'BUFAS') {
      html.push('<div class="filters-grid">');
      html.push('<div class="form-group"><label for="reg-hari-pasca-persalinan">Hari Pasca Persalinan</label><input id="reg-hari-pasca-persalinan" type="number" min="0" max="365" placeholder="Contoh: 14"></div>');
      html.push('</div>');
    } else if (code === 'BADUTA') {
      html.push('<div class="filters-grid">');
      html.push('<div class="form-group"><label for="reg-berat-lahir">Berat Lahir (gram)</label><input id="reg-berat-lahir" type="number" min="0" max="10000" placeholder="Contoh: 3200"></div>');
      html.push('<div class="form-group"><label for="reg-panjang-lahir">Panjang Lahir (cm)</label><input id="reg-panjang-lahir" type="number" min="0" max="100" placeholder="Contoh: 49"></div>');
      html.push('</div>');
    }

    container.innerHTML = html.join('') || '<p class="muted-text">Tidak ada pertanyaan khusus.</p>';
  }

  function getDynamicAnswers() {
    return {
      catatan_status_catin: byId('reg-catatan-status-catin') ? normalizeSpaces(byId('reg-catatan-status-catin').value) : '',
      usia_kehamilan_minggu: byId('reg-usia-kehamilan') ? String(byId('reg-usia-kehamilan').value || '').trim() : '',
      hari_pasca_persalinan: byId('reg-hari-pasca-persalinan') ? String(byId('reg-hari-pasca-persalinan').value || '').trim() : '',
      berat_lahir: byId('reg-berat-lahir') ? String(byId('reg-berat-lahir').value || '').trim() : '',
      panjang_lahir: byId('reg-panjang-lahir') ? String(byId('reg-panjang-lahir').value || '').trim() : ''
    };
  }

  function collectFormData() {
    return {
      jenis_sasaran: String(byId('reg-jenis-sasaran') && byId('reg-jenis-sasaran').value || '').trim().toUpperCase(),
      nama_sasaran: normalizeSpaces(byId('reg-nama-sasaran') && byId('reg-nama-sasaran').value),
      nama_kepala_keluarga: normalizeSpaces(byId('reg-nama-kepala-keluarga') && byId('reg-nama-kepala-keluarga').value),
      nama_ibu_kandung: normalizeSpaces(byId('reg-nama-ibu-kandung') && byId('reg-nama-ibu-kandung').value),
      nik_sasaran: digitsOnly(byId('reg-nik') && byId('reg-nik').value).slice(0, 16),
      nomor_kk: digitsOnly(byId('reg-no-kk') && byId('reg-no-kk').value).slice(0, 16),
      jenis_kelamin: String(byId('reg-jenis-kelamin') && byId('reg-jenis-kelamin').value || '').trim().toUpperCase(),
      tanggal_lahir: String(byId('reg-tanggal-lahir') && byId('reg-tanggal-lahir').value || '').trim(),
      nama_kecamatan: normalizeSpaces(byId('reg-kecamatan') && byId('reg-kecamatan').value),
      nama_desa: normalizeSpaces(byId('reg-desa') && byId('reg-desa').value),
      nama_dusun: normalizeSpaces(byId('reg-dusun') && byId('reg-dusun').value),
      alamat: normalizeSpaces(byId('reg-alamat') && byId('reg-alamat').value),
      dynamic_answers: getDynamicAnswers()
    };
  }

  function validate(data) {
    var errors = [];
    var warnings = [];
    var age = calcAge(data.tanggal_lahir);

    if (!data.jenis_sasaran || ALLOWED_JENIS.indexOf(data.jenis_sasaran) === -1) errors.push('Jenis sasaran wajib dipilih.');
    if (!data.nama_sasaran || data.nama_sasaran.length < 3) errors.push('Nama sasaran wajib diisi minimal 3 karakter.');
    if (!data.nama_kepala_keluarga || data.nama_kepala_keluarga.length < 3) errors.push('Nama kepala keluarga wajib diisi.');
    if (data.jenis_sasaran === 'BADUTA' && (!data.nama_ibu_kandung || data.nama_ibu_kandung.length < 3)) errors.push('Nama ibu kandung wajib diisi untuk BADUTA.');
    if (!data.nik_sasaran || data.nik_sasaran.length !== 16) errors.push('NIK harus 16 digit.');
    if (!data.nomor_kk || data.nomor_kk.length !== 16) errors.push('Nomor KK harus 16 digit.');
    if (!data.nama_kecamatan) errors.push('Kecamatan wajib dipilih.');
    if (!data.nama_desa) errors.push('Desa/Kelurahan wajib dipilih.');
    if (!data.nama_dusun) errors.push('Dusun/RW wajib dipilih.');
    if (!data.alamat || data.alamat.length < 5) errors.push('Alamat lengkap wajib diisi.');

    if (data.nik_sasaran === NIK_PLACEHOLDER) warnings.push('NIK menggunakan angka standar 9 karena belum diketahui.');
    if (data.nomor_kk === KK_PLACEHOLDER) warnings.push('Nomor KK menggunakan angka standar 9 karena belum diketahui.');

    if (!data.jenis_kelamin) {
      warnings.push('Jenis kelamin belum dipilih.');
    }

    if (!data.tanggal_lahir) {
      warnings.push('Tanggal lahir belum diisi.');
    } else if (!age.valid) {
      errors.push('Tanggal lahir tidak valid atau melebihi hari ini.');
    } else {
      if (data.jenis_sasaran === 'BADUTA' && (age.totalMonths < 0 || age.totalMonths > 24)) {
        errors.push('Untuk BADUTA, usia harus 0 sampai 24 bulan.');
      }
      if (data.jenis_sasaran === 'BUMIL') {
        if (data.jenis_kelamin && data.jenis_kelamin !== 'P') errors.push('BUMIL wajib berjenis kelamin perempuan.');
        if (age.years < 10 || age.years > 55) errors.push('Usia BUMIL harus masuk akal dan tidak lebih dari 55 tahun.');
      }
      if (data.jenis_sasaran === 'BUFAS') {
        if (data.jenis_kelamin && data.jenis_kelamin !== 'P') errors.push('BUFAS wajib berjenis kelamin perempuan.');
        if (age.years < 10 || age.years > 55) errors.push('Usia BUFAS harus masuk akal dan tidak lebih dari 55 tahun.');
      }
      if (data.jenis_sasaran === 'CATIN' && age.totalMonths < 120) {
        errors.push('Usia CATIN tidak boleh anomali terlalu rendah.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      age: age
    };
  }

  function makeClientSubmitId() {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return 'REG-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function buildPayload(data, syncSource) {
    return {
      action: 'registerSasaran',
      client_submit_id: makeClientSubmitId(),
      sync_source: syncSource || 'ONLINE',
      device_id: localStorage.getItem('deviceId') || '',
      app_version: localStorage.getItem('appVersion') || (window.APP_CONFIG && window.APP_CONFIG.APP_VERSION) || '2.1.1',
      data: {
        jenis_sasaran: data.jenis_sasaran,
        nama_sasaran: data.nama_sasaran,
        nama_kepala_keluarga: data.nama_kepala_keluarga,
        nama_ibu_kandung: data.nama_ibu_kandung,
        nik_sasaran: data.nik_sasaran,
        nomor_kk: data.nomor_kk,
        jenis_kelamin: data.jenis_kelamin,
        tanggal_lahir: data.tanggal_lahir,
        nama_kecamatan: data.nama_kecamatan,
        nama_desa: data.nama_desa,
        nama_dusun: data.nama_dusun,
        alamat: data.alamat,
        data_laporan: JSON.stringify(data.dynamic_answers || {}),
        lokasi_gps: null
      }
    };
  }

  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
    } catch (err) {
      return [];
    }
  }

  function setQueue(queue) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(queue || []));
  }

  function saveDraft() {
    var data = collectFormData();
    var result = validate(data);
    renderValidation([], result.warnings);

    var queue = getQueue();
    queue.push({
      action: 'registerSasaran',
      payload: buildPayload(data, 'OFFLINE'),
      status: 'PENDING',
      created_at: new Date().toISOString()
    });
    setQueue(queue);
    showToast('Draft registrasi disimpan ke antrean offline.', 'success');
  }

  function resetForm() {
    ['reg-jenis-sasaran','reg-nama-sasaran','reg-nama-kepala-keluarga','reg-nama-ibu-kandung','reg-nik','reg-no-kk','reg-jenis-kelamin','reg-tanggal-lahir','reg-alamat'].forEach(function (id) {
      setValue(id, '');
    });
    hydrateWilayah();
    toggleMotherNameField('');
    renderDynamicFields('');
    renderValidation([], []);
  }

  async function submitForm(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    var btn = byId('btn-submit-registrasi');
    var oldText = btn ? btn.textContent : '';

    var data = collectFormData();
    var check = validate(data);
    renderValidation(check.errors, check.warnings);
    if (!check.isValid) return;

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Mengirim...';
    }

    try {
      var payload = buildPayload(data, navigator.onLine === false ? 'OFFLINE' : 'ONLINE');

      if (navigator.onLine === false) {
        var queue = getQueue();
        queue.push({ action: 'registerSasaran', payload: payload, status: 'PENDING', created_at: new Date().toISOString() });
        setQueue(queue);
        showToast('Perangkat offline. Registrasi disimpan ke antrean sinkronisasi.', 'warning');
        resetForm();
        return;
      }

      var api = getApi();
      if (!api || typeof api.post !== 'function') {
        throw new Error('Api.post belum tersedia.');
      }

      var result = await api.post('registerSasaran', payload, {
        clientSubmitId: payload.client_submit_id,
        syncSource: payload.sync_source
      });

      if (result && result.ok === false) {
        var messages = (result.errors || []).map(function (item) { return item.message || 'Input tidak valid'; });
        renderValidation(messages.length ? messages : [result.message || 'Registrasi gagal.'], check.warnings);
        throw new Error(result.message || 'Registrasi gagal.');
      }

      showToast((result && result.message) || 'Registrasi sasaran berhasil.', 'success');
      resetForm();
    } catch (err) {
      showToast(err && err.message ? err.message : 'Registrasi gagal.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText || 'Submit Registrasi';
      }
    }
  }

  function bindEvents() {
    var form = byId('registrasi-form');
    var backBtn = byId('btn-back-from-registrasi');
    var draftBtn = byId('btn-save-reg-draft');
    var resetBtn = byId('btn-reset-registrasi');
    var jenis = byId('reg-jenis-sasaran');
    var nik = byId('reg-nik');
    var kk = byId('reg-no-kk');

    if (form && form.dataset.bound !== '1') {
      form.dataset.bound = '1';
      form.addEventListener('submit', submitForm);
    }

    if (backBtn && backBtn.dataset.bound !== '1') {
      backBtn.dataset.bound = '1';
      backBtn.addEventListener('click', function () {
        if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go('dashboard');
        }
      });
    }

    if (draftBtn && draftBtn.dataset.bound !== '1') {
      draftBtn.dataset.bound = '1';
      draftBtn.addEventListener('click', saveDraft);
    }

    if (resetBtn && resetBtn.dataset.bound !== '1') {
      resetBtn.dataset.bound = '1';
      resetBtn.addEventListener('click', resetForm);
    }

    if (jenis && jenis.dataset.bound !== '1') {
      jenis.dataset.bound = '1';
      jenis.addEventListener('change', function () {
        toggleMotherNameField(jenis.value);
        renderDynamicFields(jenis.value);
        var snapshot = validate(collectFormData());
        renderValidation(snapshot.errors, snapshot.warnings);
      });
    }

    [nik, kk].forEach(function (el) {
      if (!el || el.dataset.bound === '1') return;
      el.dataset.bound = '1';
      el.addEventListener('input', function () {
        el.value = digitsOnly(el.value).slice(0, 16);
      });
    });
  }

  function applyMode() {
    var badge = byId('registrasi-mode-badge');
    var info = byId('registrasi-mode-info');
    var title = byId('registrasi-screen-title');
    var subtitle = byId('registrasi-screen-subtitle');

    if (currentMode === 'edit') {
      if (badge) badge.textContent = 'EDIT';
      if (info) info.textContent = 'Mode edit sasaran';
      if (title) title.textContent = 'Edit Sasaran';
      if (subtitle) subtitle.textContent = 'Perbarui data sasaran terpilih';
    } else {
      if (badge) badge.textContent = 'CREATE';
      if (info) info.textContent = 'Mode registrasi baru';
      if (title) title.textContent = 'Registrasi Sasaran';
      if (subtitle) subtitle.textContent = 'Input data sasaran baru';
    }
  }

  function openCreate() {
    currentMode = 'create';
    applyMode();
    resetForm();
    if (window.Router && typeof window.Router.go === 'function') {
      window.Router.go('registrasi');
    }
  }

  function init(container) {
    currentContainer = container || byId('registrasi-screen');
    initialized = true;
    applyMode();
    hydrateWilayah();
    bindEvents();
    toggleMotherNameField(byId('reg-jenis-sasaran') ? byId('reg-jenis-sasaran').value : '');
    renderDynamicFields(byId('reg-jenis-sasaran') ? byId('reg-jenis-sasaran').value : '');
    renderValidation([], []);
  }

  function refresh() {
    if (!initialized) return init(currentContainer);
    hydrateWilayah();
    applyMode();
  }

  window.RegistrasiView = {
    init: init,
    refresh: refresh,
    openCreate: openCreate,
    resetForm: resetForm,
    collectFormData: collectFormData,
    validate: validate,
    saveDraft: saveDraft,
    submitForm: submitForm
  };
})(window, document);
