(function (window, document) {
  'use strict';

  var SCREEN_ID = 'registrasi-screen';
  var FORM_ID = 'registrasi-form';
  var DRAFT_KEY = 'tpk_registrasi_draft';
  var PLACEHOLDER_16 = '9999999999999999';
  var VALIDATION_INTERVAL_MS = 800;

  var FIELD_IDS = {
    jenis_sasaran: 'reg-jenis-sasaran',
    nama_sasaran: 'reg-nama-sasaran',
    nama_kepala_keluarga: 'reg-nama-kepala-keluarga',
    nama_ibu_kandung: 'reg-nama-ibu-kandung',
    nik_sasaran: 'reg-nik',
    nomor_kk: 'reg-no-kk',
    jenis_kelamin: 'reg-jenis-kelamin',
    tanggal_lahir: 'reg-tanggal-lahir',
    nama_kecamatan: 'reg-kecamatan',
    nama_desa: 'reg-desa',
    nama_dusun: 'reg-dusun',
    alamat: 'reg-alamat'
  };

  var state = {
    screen: null,
    form: null,
    mappings: [],
    autoValidationTimer: null,
    lastValidationSignature: '',
    isBound: false,
    initCount: 0
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function getRouter() {
    return window.Router || null;
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

  function getAuth() {
    return window.Auth || null;
  }

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeSpaces(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function digitsOnly(value) {
    return String(value == null ? '' : value).replace(/\D+/g, '');
  }

  function normalizeTextUpper(value) {
    return normalizeSpaces(value).toUpperCase();
  }

  function uniqByKey(list, keyFn) {
    var seen = {};
    return (list || []).filter(function (item) {
      var key = String(keyFn(item) || '').toUpperCase();
      if (!key) return false;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function setValue(id, value) {
    var el = byId(id);
    if (!el) return;
    el.value = value == null ? '' : String(value);
  }

  function setText(id, value) {
    var el = byId(id);
    if (!el) return;
    el.textContent = value == null || value === '' ? '-' : String(value);
  }

  function setHidden(id, hidden) {
    var el = byId(id);
    if (!el) return;
    el.classList.toggle('hidden', !!hidden);
  }

  function toast(message, type) {
    var ui = getUI();
    if (ui && typeof ui.showToast === 'function') {
      ui.showToast(message, type || 'info');
      return;
    }
    if (ui && typeof ui.toast === 'function') {
      ui.toast(message, type || 'info');
      return;
    }
    try {
      window.alert(message);
    } catch (err) {}
  }

  function isScreenActive() {
    var screen = state.screen || byId(SCREEN_ID);
    return !!(screen && !screen.classList.contains('hidden'));
  }

  function getProfile() {
    var appState = getState();
    if (appState && typeof appState.getProfile === 'function') {
      var profile = appState.getProfile();
      if (profile && Object.keys(profile).length) return profile;
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.PROFILE) {
      return storage.get(keys.PROFILE, {}) || {};
    }

    try {
      return JSON.parse(localStorage.getItem('tpk_profile') || '{}');
    } catch (err) {
      return {};
    }
  }

  function getSessionToken() {
    var auth = getAuth();
    if (auth && typeof auth.getToken === 'function') return auth.getToken() || '';

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.SESSION_TOKEN) {
      return storage.get(keys.SESSION_TOKEN, '') || '';
    }

    try {
      return localStorage.getItem('session_token') || '';
    } catch (err) {
      return '';
    }
  }

  function getTodayIso() {
    var d = new Date();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  function parseIsoDate(value) {
    var s = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

    var parts = s.split('-');
    var y = Number(parts[0]);
    var m = Number(parts[1]);
    var d = Number(parts[2]);
    var date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return null;
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function calculateAge(dateStr) {
    var dob = parseIsoDate(dateStr);
    if (!dob) {
      return { valid: false, years: null, months: null, totalMonths: null, label: '-' };
    }

    var today = parseIsoDate(getTodayIso());
    if (!today || dob > today) {
      return { valid: false, years: null, months: null, totalMonths: null, label: '-' };
    }

    var years = today.getFullYear() - dob.getFullYear();
    var months = today.getMonth() - dob.getMonth();
    var days = today.getDate() - dob.getDate();

    if (days < 0) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return {
      valid: true,
      years: years,
      months: months,
      totalMonths: years * 12 + months,
      label: years + ' tahun ' + months + ' bulan'
    };
  }

  function splitFlexible(rawValue) {
    var text = normalizeSpaces(rawValue);
    if (!text) return [];

    return uniqByKey(
      text
        .split(/\s*\/\s*|\s*;\s*|\s*\|\s*|\n+/)
        .map(function (item) { return normalizeSpaces(item); })
        .filter(Boolean),
      function (item) { return item; }
    );
  }

  function makeOption(value, label) {
    var v = normalizeSpaces(value);
    var l = normalizeSpaces(label || value);
    if (!v) return null;
    return { value: v, label: l || v };
  }

  function fillSelect(selectId, items, placeholder, selectedValue) {
    var select = byId(selectId);
    if (!select) return;

    var html = ['<option value="">' + escapeHtml(placeholder || 'Pilih') + '</option>'];
    uniqByKey(items || [], function (item) {
      return item && item.value ? item.value : '';
    }).forEach(function (item) {
      if (!item || !item.value) return;
      html.push('<option value="' + escapeHtml(item.value) + '">' + escapeHtml(item.label || item.value) + '</option>');
    });

    select.innerHTML = html.join('');
    if (selectedValue) {
      select.value = String(selectedValue);
    }
  }

  function renderDynamicFields(jenis) {
    var container = byId('registrasi-dynamic-fields');
    if (!container) return;

    var currentValue = byId('reg-keterangan-tambahan') ? byId('reg-keterangan-tambahan').value : '';
    var normalizedJenis = String(jenis || '').trim().toUpperCase();
    var hints = {
      CATIN: 'Contoh: Catin baru terdaftar',
      BUMIL: 'Contoh: Bumil trimester 2',
      BUFAS: 'Contoh: Bufas minggu ke-2',
      BADUTA: 'Contoh: Baduta usia 11 bulan'
    };

    container.innerHTML = [
      '<div class="filters-grid">',
        '<div class="form-group form-group-span-2">',
          '<label for="reg-keterangan-tambahan">Keterangan Tambahan</label>',
          '<input id="reg-keterangan-tambahan" name="keterangan_tambahan" type="text" placeholder="', escapeHtml(hints[normalizedJenis] || 'Tambahkan keterangan seperlunya'), '" />',
        '</div>',
      '</div>'
    ].join('');

    setValue('reg-keterangan-tambahan', currentValue);
    bindCommonChange('reg-keterangan-tambahan');
  }

  function collectFormData() {
    return {
      jenis_sasaran: byId(FIELD_IDS.jenis_sasaran) ? byId(FIELD_IDS.jenis_sasaran).value : '',
      nama_sasaran: byId(FIELD_IDS.nama_sasaran) ? byId(FIELD_IDS.nama_sasaran).value : '',
      nama_kepala_keluarga: byId(FIELD_IDS.nama_kepala_keluarga) ? byId(FIELD_IDS.nama_kepala_keluarga).value : '',
      nama_ibu_kandung: byId(FIELD_IDS.nama_ibu_kandung) ? byId(FIELD_IDS.nama_ibu_kandung).value : '',
      nik_sasaran: byId(FIELD_IDS.nik_sasaran) ? byId(FIELD_IDS.nik_sasaran).value : '',
      nomor_kk: byId(FIELD_IDS.nomor_kk) ? byId(FIELD_IDS.nomor_kk).value : '',
      jenis_kelamin: byId(FIELD_IDS.jenis_kelamin) ? byId(FIELD_IDS.jenis_kelamin).value : '',
      tanggal_lahir: byId(FIELD_IDS.tanggal_lahir) ? byId(FIELD_IDS.tanggal_lahir).value : '',
      nama_kecamatan: byId(FIELD_IDS.nama_kecamatan) ? byId(FIELD_IDS.nama_kecamatan).value : '',
      nama_desa: byId(FIELD_IDS.nama_desa) ? byId(FIELD_IDS.nama_desa).value : '',
      nama_dusun: byId(FIELD_IDS.nama_dusun) ? byId(FIELD_IDS.nama_dusun).value : '',
      alamat: byId(FIELD_IDS.alamat) ? byId(FIELD_IDS.alamat).value : '',
      keterangan_tambahan: byId('reg-keterangan-tambahan') ? byId('reg-keterangan-tambahan').value : ''
    };
  }

  function normalizeData(raw) {
    return {
      jenis_sasaran: String(raw.jenis_sasaran || '').trim().toUpperCase(),
      nama_sasaran: normalizeSpaces(raw.nama_sasaran),
      nama_kepala_keluarga: normalizeSpaces(raw.nama_kepala_keluarga),
      nama_ibu_kandung: normalizeSpaces(raw.nama_ibu_kandung),
      nik_sasaran: digitsOnly(raw.nik_sasaran).slice(0, 16),
      nomor_kk: digitsOnly(raw.nomor_kk).slice(0, 16),
      jenis_kelamin: String(raw.jenis_kelamin || '').trim().toUpperCase(),
      tanggal_lahir: String(raw.tanggal_lahir || '').trim(),
      nama_kecamatan: normalizeSpaces(raw.nama_kecamatan),
      nama_desa: normalizeSpaces(raw.nama_desa),
      nama_dusun: normalizeSpaces(raw.nama_dusun),
      alamat: normalizeSpaces(raw.alamat),
      keterangan_tambahan: normalizeSpaces(raw.keterangan_tambahan)
    };
  }

  function validateData(data) {
    var errors = [];
    var warnings = [];
    var age = calculateAge(data.tanggal_lahir);

    if (!data.jenis_sasaran) errors.push('Jenis sasaran wajib dipilih.');
    if (!data.nama_sasaran) errors.push('Nama sasaran wajib diisi.');
    else if (data.nama_sasaran.length < 3) errors.push('Nama sasaran wajib diisi minimal 3 karakter.');

    if (!data.nama_kepala_keluarga) errors.push('Nama kepala keluarga wajib diisi.');
    if (data.jenis_sasaran === 'BADUTA' && !data.nama_ibu_kandung) errors.push('Nama ibu kandung wajib diisi untuk BADUTA.');

    if (!data.nik_sasaran) errors.push('NIK wajib diisi.');
    else if (data.nik_sasaran.length !== 16) errors.push('NIK harus 16 digit.');

    if (!data.nomor_kk) errors.push('Nomor KK wajib diisi.');
    else if (data.nomor_kk.length !== 16) errors.push('Nomor KK harus 16 digit.');

    if (!data.nama_kecamatan) errors.push('Kecamatan wajib dipilih.');
    if (!data.nama_desa) errors.push('Desa/Kelurahan wajib dipilih.');
    if (!data.nama_dusun) errors.push('Dusun/RW wajib dipilih.');
    if (!data.alamat) errors.push('Alamat lengkap wajib diisi.');

    if (!data.jenis_kelamin) warnings.push('Jenis kelamin belum dipilih.');
    if (!data.tanggal_lahir) warnings.push('Tanggal lahir belum diisi.');

    if (data.nik_sasaran === PLACEHOLDER_16) warnings.push('NIK memakai nilai standar 16 digit angka 9.');
    if (data.nomor_kk === PLACEHOLDER_16) warnings.push('Nomor KK memakai nilai standar 16 digit angka 9.');

    if (data.tanggal_lahir && !parseIsoDate(data.tanggal_lahir)) {
      errors.push('Format tanggal lahir tidak valid.');
    } else if (data.tanggal_lahir && !age.valid) {
      errors.push('Tanggal lahir tidak boleh melebihi hari ini.');
    }

    if (data.jenis_sasaran === 'BADUTA' && age.valid && age.totalMonths > 24) {
      errors.push('Untuk BADUTA, usia harus 0 sampai 24 bulan.');
    }
    if (data.jenis_sasaran === 'BUMIL' && data.jenis_kelamin && data.jenis_kelamin !== 'P') {
      errors.push('BUMIL wajib berjenis kelamin perempuan.');
    }
    if (data.jenis_sasaran === 'BUFAS' && data.jenis_kelamin && data.jenis_kelamin !== 'P') {
      errors.push('BUFAS wajib berjenis kelamin perempuan.');
    }
    if ((data.jenis_sasaran === 'BUMIL' || data.jenis_sasaran === 'BUFAS') && age.valid && (age.years < 10 || age.years > 55)) {
      errors.push('Usia untuk ' + data.jenis_sasaran + ' harus masuk akal dan tidak lebih dari 55 tahun.');
    }
    if (data.jenis_sasaran === 'CATIN' && age.valid && age.totalMonths < 120) {
      errors.push('Untuk CATIN, usia tidak boleh anomali terlalu rendah.');
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      age: age
    };
  }

  function renderValidationBox(result) {
    var box = byId('registrasi-validation-box');
    if (!box) return;

    var signature = JSON.stringify({
      errors: result.errors || [],
      warnings: result.warnings || [],
      age: result.age && result.age.valid ? result.age.label : ''
    });

    if (signature === state.lastValidationSignature) return;
    state.lastValidationSignature = signature;

    var html = [];

    if (result.errors && result.errors.length) {
      html.push('<div class="validation-block validation-block-error">');
      html.push('<h4>Perlu diperbaiki:</h4>');
      html.push('<ul>');
      result.errors.forEach(function (item) {
        html.push('<li>' + escapeHtml(item) + '</li>');
      });
      html.push('</ul>');
      html.push('</div>');
    }

    if (result.warnings && result.warnings.length) {
      html.push('<div class="validation-block validation-block-warning">');
      html.push('<h4>Perhatian:</h4>');
      html.push('<ul>');
      result.warnings.forEach(function (item) {
        html.push('<li>' + escapeHtml(item) + '</li>');
      });
      html.push('</ul>');
      html.push('</div>');
    }

    if ((!result.errors || !result.errors.length) && (!result.warnings || !result.warnings.length)) {
      html.push('<p class="muted-text">Semua input utama sudah sinkron dan siap dikirim.</p>');
    }

    if (result.age && result.age.valid) {
      html.push('<p class="muted-text" style="margin-top:10px;">Umur terhitung: <strong>' + escapeHtml(result.age.label) + '</strong></p>');
    }

    box.innerHTML = html.join('');
  }

  function refreshValidation(force) {
    var data = normalizeData(collectFormData());
    var result = validateData(data);
    if (force) state.lastValidationSignature = '';
    renderValidationBox(result);
    return result;
  }

  function getDraftPayload() {
    var data = normalizeData(collectFormData());
    return {
      saved_at: new Date().toISOString(),
      data: data
    };
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(getDraftPayload()));
      toast('Draft registrasi berhasil disimpan.', 'success');
      refreshValidation(true);
    } catch (err) {
      toast('Gagal menyimpan draft registrasi.', 'error');
    }
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) {}
  }

  function applyDraft(draft) {
    if (!draft || !draft.data) return;
    var data = draft.data;

    Object.keys(FIELD_IDS).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        setValue(FIELD_IDS[key], data[key]);
      }
    });

    syncDependentFields();
    setValue('reg-keterangan-tambahan', data.keterangan_tambahan || '');
    refreshValidation(true);
  }

  function getProfileScopeFallback() {
    var profile = getProfile();
    return [
      {
        id_tim: profile.id_tim || '',
        id_wilayah: profile.id_wilayah || '',
        kecamatan: profile.nama_kecamatan || profile.kecamatan || '',
        desa_kelurahan: profile.desa_kelurahan || profile.nama_desa || '',
        dusun_rw: profile.dusun_rw || profile.nama_dusun || ''
      }
    ];
  }

  function normalizeTimRefResponse(response) {
    if (!response) return [];

    var source = [];
    if (Array.isArray(response)) source = response;
    else if (response.data && Array.isArray(response.data.items)) source = response.data.items;
    else if (response.data && Array.isArray(response.data)) source = response.data;
    else if (Array.isArray(response.items)) source = response.items;
    else if (response.data && response.data.id_tim) source = [response.data];
    else if (response.id_tim) source = [response];

    return source.map(function (row) {
      return {
        id_tim: normalizeSpaces(row.id_tim),
        id_wilayah: normalizeSpaces(row.id_wilayah || row.id_wilayah_tugas || ''),
        kecamatan: normalizeSpaces(row.kecamatan || row.nama_kecamatan || ''),
        desa_kelurahan: normalizeSpaces(row.desa_kelurahan || row.nama_desa || row.desa || ''),
        dusun_rw: normalizeSpaces(row.dusun_rw || row.nama_dusun || row.dusun || '')
      };
    }).filter(function (row) {
      return row.kecamatan || row.desa_kelurahan || row.dusun_rw;
    });
  }

  async function fetchTimWilayahMappings() {
    var profile = getProfile();
    var idTim = normalizeSpaces(profile.id_tim);
    var api = getApi();

    if (!idTim || !api || typeof api.post !== 'function') {
      return getProfileScopeFallback();
    }

    try {
      var response = await api.post('getTimRef', { id_tim: idTim });
      var rows = normalizeTimRefResponse(response);
      if (rows.length) return rows;
    } catch (err) {}

    return getProfileScopeFallback();
  }

  function getCurrentSelections() {
    return {
      kecamatan: normalizeSpaces(byId(FIELD_IDS.nama_kecamatan) ? byId(FIELD_IDS.nama_kecamatan).value : ''),
      desa: normalizeSpaces(byId(FIELD_IDS.nama_desa) ? byId(FIELD_IDS.nama_desa).value : ''),
      dusun: normalizeSpaces(byId(FIELD_IDS.nama_dusun) ? byId(FIELD_IDS.nama_dusun).value : '')
    };
  }

  function applyScopeOptions(preferredSelections) {
    var mappings = state.mappings || [];
    var profile = getProfile();
    var current = preferredSelections || getCurrentSelections();

    if (!mappings.length) {
      var fallback = getProfileScopeFallback();
      mappings = fallback;
      state.mappings = fallback;
    }

    var kecamatanItems = uniqByKey(mappings.map(function (row) {
      return makeOption(row.kecamatan, row.kecamatan);
    }).filter(Boolean), function (item) { return item.value; });

    var selectedKecamatan = current.kecamatan || normalizeSpaces(profile.nama_kecamatan || profile.kecamatan);
    if (!selectedKecamatan && kecamatanItems.length === 1) selectedKecamatan = kecamatanItems[0].value;
    fillSelect(FIELD_IDS.nama_kecamatan, kecamatanItems, 'Pilih kecamatan', selectedKecamatan);

    var desaCandidates = mappings.filter(function (row) {
      return !selectedKecamatan || normalizeTextUpper(row.kecamatan) === normalizeTextUpper(selectedKecamatan);
    });

    var desaItems = uniqByKey(desaCandidates.map(function (row) {
      return makeOption(row.desa_kelurahan, row.desa_kelurahan);
    }).filter(Boolean), function (item) { return item.value; });

    var selectedDesa = current.desa || normalizeSpaces(profile.desa_kelurahan || profile.nama_desa);
    if (selectedDesa) {
      var desaExists = desaItems.some(function (item) {
        return normalizeTextUpper(item.value) === normalizeTextUpper(selectedDesa);
      });
      if (!desaExists) selectedDesa = '';
    }
    if (!selectedDesa && desaItems.length === 1) selectedDesa = desaItems[0].value;
    fillSelect(FIELD_IDS.nama_desa, desaItems, 'Pilih desa/kelurahan', selectedDesa);

    var dusunCandidates = desaCandidates.filter(function (row) {
      return !selectedDesa || normalizeTextUpper(row.desa_kelurahan) === normalizeTextUpper(selectedDesa);
    });

    var dusunItems = uniqByKey(dusunCandidates.map(function (row) {
      return makeOption(row.dusun_rw, row.dusun_rw);
    }).filter(Boolean), function (item) { return item.value; });

    var selectedDusun = current.dusun || normalizeSpaces(profile.dusun_rw || profile.nama_dusun);
    if (selectedDusun) {
      var dusunExists = dusunItems.some(function (item) {
        return normalizeTextUpper(item.value) === normalizeTextUpper(selectedDusun);
      });
      if (!dusunExists) selectedDusun = '';
    }
    if (!selectedDusun && dusunItems.length === 1) selectedDusun = dusunItems[0].value;
    fillSelect(FIELD_IDS.nama_dusun, dusunItems, 'Pilih dusun/RW', selectedDusun);
  }

  async function hydrateWilayahOptions() {
    var mappings = await fetchTimWilayahMappings();

    // fallback final jika tim_ref tidak tersedia atau hanya text gabungan
    if (!mappings || !mappings.length) {
      mappings = getProfileScopeFallback();
    }

    // pecah nilai gabungan bila masih tersisa dari profil lama
    var expanded = [];
    mappings.forEach(function (row) {
      var kecamatanList = splitFlexible(row.kecamatan || '');
      var desaList = splitFlexible(row.desa_kelurahan || '');
      var dusunList = splitFlexible(row.dusun_rw || '');

      if (!kecamatanList.length) kecamatanList = [''];
      if (!desaList.length) desaList = [''];
      if (!dusunList.length) dusunList = [''];

      kecamatanList.forEach(function (kec) {
        desaList.forEach(function (desa) {
          dusunList.forEach(function (dusun) {
            expanded.push({
              id_tim: row.id_tim || '',
              id_wilayah: row.id_wilayah || '',
              kecamatan: normalizeSpaces(kec),
              desa_kelurahan: normalizeSpaces(desa),
              dusun_rw: normalizeSpaces(dusun)
            });
          });
        });
      });
    });

    state.mappings = expanded.filter(function (row) {
      return row.kecamatan || row.desa_kelurahan || row.dusun_rw;
    });

    applyScopeOptions();
  }

  function syncDependentFields() {
    var jenis = byId(FIELD_IDS.jenis_sasaran) ? byId(FIELD_IDS.jenis_sasaran).value : '';
    var selectedKecamatan = byId(FIELD_IDS.nama_kecamatan) ? byId(FIELD_IDS.nama_kecamatan).value : '';
    var selectedDesa = byId(FIELD_IDS.nama_desa) ? byId(FIELD_IDS.nama_desa).value : '';
    var selectedDusun = byId(FIELD_IDS.nama_dusun) ? byId(FIELD_IDS.nama_dusun).value : '';

    setHidden('group-reg-nama-ibu-kandung', jenis !== 'BADUTA');
    if (jenis !== 'BADUTA') setValue(FIELD_IDS.nama_ibu_kandung, '');

    renderDynamicFields(jenis);
    applyScopeOptions({
      kecamatan: selectedKecamatan,
      desa: selectedDesa,
      dusun: selectedDusun
    });
  }

  function buildRequestPayload() {
    var data = normalizeData(collectFormData());
    var profile = getProfile();
    var selectedMap = (state.mappings || []).find(function (row) {
      return normalizeTextUpper(row.kecamatan) === normalizeTextUpper(data.nama_kecamatan) &&
             normalizeTextUpper(row.desa_kelurahan) === normalizeTextUpper(data.nama_desa) &&
             normalizeTextUpper(row.dusun_rw) === normalizeTextUpper(data.nama_dusun);
    }) || {};

    var resolvedIdTim = normalizeSpaces(
      selectedMap.id_tim ||
      profile.id_tim ||
      (profile.session && profile.session.id_tim) ||
      ''
    );

    var resolvedBookKey = normalizeTextUpper(
      profile.book_key ||
      profile.kode_kecamatan ||
      (profile.session && (profile.session.book_key || profile.session.kode_kecamatan)) ||
      ''
    );

    var payload = {
      action: 'registerSasaran',
      token: getSessionToken(),
      perangkat: 'PWA',
      app_version: getConfig().APP_VERSION || '',
      client_submit_id: 'REG-' + Date.now(),
      sync_source: navigator.onLine === false ? 'OFFLINE' : 'ONLINE',
      id_tim: resolvedIdTim,
      book_key: resolvedBookKey,
      jenis_sasaran: data.jenis_sasaran,
      nama_sasaran: data.nama_sasaran,
      nama_kepala_keluarga: data.nama_kepala_keluarga,
      nama_ibu_kandung: data.nama_ibu_kandung,
      nik_sasaran: data.nik_sasaran,
      nik: data.nik_sasaran,
      nomor_kk: data.nomor_kk,
      jenis_kelamin: data.jenis_kelamin,
      tanggal_lahir: data.tanggal_lahir,
      nama_kecamatan: data.nama_kecamatan,
      nama_desa: data.nama_desa,
      nama_dusun: data.nama_dusun,
      id_wilayah: selectedMap.id_wilayah || profile.id_wilayah || '',
      alamat: data.alamat,
      data_laporan: data.keterangan_tambahan || ''
    };

    return payload;
  }

  async function submitRegistrasi(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();

    var validation = refreshValidation(true);
    if (!validation.isValid) {
      toast('Periksa kembali input registrasi.', 'warning');
      return;
    }

    if (navigator.onLine === false) {
      saveDraft();
      toast('Perangkat sedang offline. Data disimpan sebagai draft.', 'warning');
      return;
    }

    var submitBtn = byId('btn-submit-registrasi');
    var originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengirim...';
    }

    try {
      var api = getApi();
      if (!api || typeof api.post !== 'function') {
        throw new Error('Api.post belum tersedia.');
      }

      var result = await api.post('registerSasaran', buildRequestPayload());
      if (result && result.ok === false) {
        throw new Error(result.message || 'Registrasi gagal disimpan.');
      }

      clearDraft();
      toast((result && result.message) || 'Registrasi sasaran berhasil disimpan.', 'success');
      resetForm();
      var router = getRouter();
      if (router && typeof router.go === 'function') {
        router.go('sasaranList');
      }
    } catch (err) {
      toast(err && err.message ? err.message : 'Registrasi sasaran gagal.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText || 'Submit Registrasi';
      }
    }
  }

  function bindDigitOnly(id) {
    var el = byId(id);
    if (!el || el.dataset.boundDigits === '1') return;
    el.dataset.boundDigits = '1';

    var handler = function () {
      el.value = digitsOnly(el.value).slice(0, 16);
      refreshValidation(true);
    };

    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
    el.addEventListener('blur', handler);
  }

  function bindCommonChange(id) {
    var el = byId(id);
    if (!el || el.dataset.boundCommon === '1') return;
    el.dataset.boundCommon = '1';

    var handler = function () {
      syncDependentFields();
      refreshValidation(true);
    };

    ['input', 'change', 'blur', 'keyup'].forEach(function (evt) {
      el.addEventListener(evt, handler);
    });
  }

  function startAutoValidation() {
    stopAutoValidation();
    state.autoValidationTimer = window.setInterval(function () {
      if (!isScreenActive()) return;
      refreshValidation(false);
    }, VALIDATION_INTERVAL_MS);
  }

  function stopAutoValidation() {
    if (state.autoValidationTimer) {
      window.clearInterval(state.autoValidationTimer);
      state.autoValidationTimer = null;
    }
  }

  function resetForm() {
    var form = state.form || byId(FORM_ID);
    if (form) form.reset();
    state.lastValidationSignature = '';
    setHidden('group-reg-nama-ibu-kandung', true);
    renderDynamicFields('');
    hydrateWilayahOptions().then(function () {
      refreshValidation(true);
    });
  }

  function bindEvents() {
    if (state.isBound) return;
    state.isBound = true;

    state.form = byId(FORM_ID);
    var form = state.form;
    var backBtn = byId('btn-back-from-registrasi');
    var draftBtn = byId('btn-save-reg-draft');
    var resetBtn = byId('btn-reset-registrasi');

    if (form) {
      form.addEventListener('submit', submitRegistrasi);
    }

    if (backBtn) {
      backBtn.addEventListener('click', function () {
        var router = getRouter();
        if (router && typeof router.go === 'function') {
          router.go('dashboard');
        }
      });
    }

    if (draftBtn) {
      draftBtn.addEventListener('click', function () {
        saveDraft();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        resetForm();
      });
    }

    Object.keys(FIELD_IDS).forEach(function (key) {
      if (key === 'nik_sasaran' || key === 'nomor_kk') return;
      bindCommonChange(FIELD_IDS[key]);
    });

    bindDigitOnly(FIELD_IDS.nik_sasaran);
    bindDigitOnly(FIELD_IDS.nomor_kk);
  }

  function scheduleInitialValidationBursts() {
    [50, 200, 600, 1200].forEach(function (delay) {
      window.setTimeout(function () {
        if (isScreenActive()) refreshValidation(true);
      }, delay);
    });
  }

  async function openCreate() {
    if (!isScreenActive()) {
      var router = getRouter();
      if (router && typeof router.go === 'function') {
        router.go('registrasi');
        return;
      }
    }

    setText('registrasi-screen-title', 'Registrasi Sasaran');
    setText('registrasi-screen-subtitle', 'Input data sasaran baru');
    setText('registrasi-mode-info', 'Mode registrasi baru');
    setText('registrasi-mode-badge', 'CREATE');

    await hydrateWilayahOptions();
    syncDependentFields();

    var draft = loadDraft();
    if (draft && draft.data) {
      applyDraft(draft);
    } else {
      renderDynamicFields('');
      refreshValidation(true);
    }

    startAutoValidation();
    scheduleInitialValidationBursts();
  }

  async function init(container) {
    state.screen = container || byId(SCREEN_ID);
    state.form = byId(FORM_ID);
    state.initCount += 1;

    bindEvents();
    await openCreate();
  }

  window.RegistrasiView = {
    init: init,
    openCreate: openCreate,
    refreshValidation: function () { return refreshValidation(true); },
    saveDraft: saveDraft,
    reset: resetForm,
    collectFormData: collectFormData,
    stopAutoValidation: stopAutoValidation
  };
})(window, document);
