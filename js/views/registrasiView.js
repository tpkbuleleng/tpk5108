(function (window, document) {
  'use strict';

  var QUEUE_KEY = 'syncQueue';
  var NIK_PLACEHOLDER = '9999999999999999';
  var KK_PLACEHOLDER = '9999999999999999';
  var ALLOWED_JENIS = ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'];

  function $(id, root) {
    return (root || document).getElementById(id);
  }

  function normalizeSpaces(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function digitsOnly(value) {
    return String(value == null ? '' : value).replace(/\D+/g, '');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getTodayLocal() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function parseIsoDate(dateStr) {
    var s = String(dateStr || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

    var parts = s.split('-').map(Number);
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    if (
      date.getFullYear() !== parts[0] ||
      date.getMonth() !== parts[1] - 1 ||
      date.getDate() !== parts[2]
    ) return null;

    date.setHours(0, 0, 0, 0);
    return date;
  }

  function calculateAge(dateStr) {
    var dob = parseIsoDate(dateStr);
    if (!dob) {
      return {
        valid: false,
        umur_tahun: null,
        umur_bulan: null,
        total_bulan: null,
        label: '-'
      };
    }

    var today = getTodayLocal();
    if (dob > today) {
      return {
        valid: false,
        umur_tahun: null,
        umur_bulan: null,
        total_bulan: null,
        label: '-'
      };
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
      umur_tahun: years,
      umur_bulan: months,
      total_bulan: (years * 12) + months,
      label: years + ' tahun ' + months + ' bulan'
    };
  }

  function nowIsoString() {
    return new Date().toISOString();
  }

  function getStorageObject(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function setStorageObject(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function getProfile() {
    try {
      if (window.Auth && typeof window.Auth.getProfile === 'function') {
        return window.Auth.getProfile() || null;
      }
    } catch (err) {}
    return getStorageObject('profile', null);
  }

  function getSession() {
    try {
      if (window.Auth && typeof window.Auth.getSession === 'function') {
        return window.Auth.getSession() || null;
      }
    } catch (err) {}
    return getStorageObject('session', null);
  }

  function ensureDeviceId() {
    var key = 'deviceId';
    var deviceId = window.localStorage.getItem(key);
    if (!deviceId) {
      deviceId = 'dev-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now();
      window.localStorage.setItem(key, deviceId);
    }
    return deviceId;
  }

  function getAppVersion() {
    return (
      window.localStorage.getItem('appVersion') ||
      window.APP_VERSION ||
      '2.1.1'
    );
  }

  function generateClientSubmitId() {
    var d = new Date();
    function pad(n) { return String(n).padStart(2, '0'); }
    var stamp = ''
      + d.getFullYear()
      + pad(d.getMonth() + 1)
      + pad(d.getDate())
      + '-'
      + pad(d.getHours())
      + pad(d.getMinutes())
      + pad(d.getSeconds());
    return 'REG-' + stamp + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function createOption(value, label) {
    var opt = document.createElement('option');
    opt.value = value == null ? '' : String(value);
    opt.textContent = label == null ? '-' : String(label);
    return opt;
  }

  function setSelectOptions(selectEl, items, selectedValue, placeholderText) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    selectEl.appendChild(createOption('', placeholderText || 'Pilih data'));
    (items || []).forEach(function (item) {
      selectEl.appendChild(createOption(item.value, item.label));
    });

    if (selectedValue) {
      selectEl.value = String(selectedValue);
      if (!selectEl.value) {
        selectEl.appendChild(createOption(selectedValue, selectedValue));
        selectEl.value = String(selectedValue);
      }
    }
  }

  function queueOfflineItem(item) {
    var queue = getStorageObject(QUEUE_KEY, []);
    queue.push(item);
    setStorageObject(QUEUE_KEY, queue);
  }

  function showToast(message, type) {
    try {
      if (window.UI && typeof window.UI.toast === 'function') {
        window.UI.toast(message, type || 'info');
        return;
      }
    } catch (err) {}
    if (type === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
  }

  function getSafeString(obj, keys, fallback) {
    var i;
    for (i = 0; i < keys.length; i += 1) {
      if (obj && obj[keys[i]] != null && String(obj[keys[i]]).trim() !== '') {
        return String(obj[keys[i]]);
      }
    }
    return fallback || '';
  }

  function getCurrentProfileScope() {
    var profile = getProfile() || {};
    var session = getSession() || {};

    return {
      nama_kecamatan: getSafeString(profile, ['nama_kecamatan', 'kecamatan'], getSafeString(session, ['nama_kecamatan', 'kecamatan'], '')),
      nama_desa: getSafeString(profile, ['desa_kelurahan', 'wilayah_tugas_desa_kelurahan', 'nama_desa'], getSafeString(session, ['desa_kelurahan', 'wilayah_tugas_desa_kelurahan', 'nama_desa'], '')),
      nama_dusun: getSafeString(profile, ['dusun_rw', 'wilayah_tugas_dusun_rw', 'nama_dusun'], getSafeString(session, ['dusun_rw', 'wilayah_tugas_dusun_rw', 'nama_dusun'], '')),
      nomor_tim: getSafeString(profile, ['nomor_tim', 'nomor_tim_display', 'nama_tim'], getSafeString(session, ['nomor_tim', 'nomor_tim_display', 'nama_tim'], '-')),
      nama_user: getSafeString(profile, ['nama_kader', 'nama_user', 'nama'], getSafeString(session, ['nama_user', 'nama', 'username'], '-'))
    };
  }

  window.RegistrasiView = {
    initialized: false,
    state: {
      container: null,
      errors: {},
      warnings: [],
      refs: {
        kecamatan: [],
        desa: [],
        dusun: []
      }
    },

    init: function (container) {
      this.state.container = container || $('registrasi-screen');
      if (!this.state.container) return;

      this.cacheElements();
      this.bindEvents();
      this.renderModeInfo();
      this.hydrateWilayahFromScope();
      this.renderDynamicFields();
      this.renderValidation([]);
      this.initialized = true;
    },

    cacheElements: function () {
      this.els = {
        title: $('registrasi-screen-title'),
        subtitle: $('registrasi-screen-subtitle'),
        modeInfo: $('registrasi-mode-info'),
        modeBadge: $('registrasi-mode-badge'),
        form: $('registrasi-form'),
        jenis: $('reg-jenis-sasaran'),
        nama: $('reg-nama-sasaran'),
        kepalaKeluarga: $('reg-nama-kepala-keluarga'),
        groupIbuKandung: $('group-reg-nama-ibu-kandung'),
        ibuKandung: $('reg-nama-ibu-kandung'),
        nik: $('reg-nik'),
        kk: $('reg-no-kk'),
        gender: $('reg-jenis-kelamin'),
        tanggalLahir: $('reg-tanggal-lahir'),
        kecamatan: $('reg-kecamatan'),
        desa: $('reg-desa'),
        dusun: $('reg-dusun'),
        alamat: $('reg-alamat'),
        dynamicFields: $('registrasi-dynamic-fields'),
        validationBox: $('registrasi-validation-box'),
        btnDraft: $('btn-save-reg-draft'),
        btnReset: $('btn-reset-registrasi'),
        btnBack: $('btn-back-from-registrasi'),
        btnSubmit: $('btn-submit-registrasi')
      };
    },

    bindEvents: function () {
      var self = this;
      if (!this.els || !this.els.form || this.els.form.dataset.bound === '1') return;

      this.els.form.addEventListener('submit', function (event) {
        event.preventDefault();
        self.submit();
      });

      this.els.jenis.addEventListener('change', function () {
        self.toggleConditionalFields();
        self.renderDynamicFields();
        self.runLiveValidation();
      });

      this.els.gender.addEventListener('change', function () {
        self.runLiveValidation();
      });

      this.els.tanggalLahir.addEventListener('change', function () {
        self.runLiveValidation();
      });

      this.els.nik.addEventListener('input', function (event) {
        event.target.value = digitsOnly(event.target.value).slice(0, 16);
      });

      this.els.kk.addEventListener('input', function (event) {
        event.target.value = digitsOnly(event.target.value).slice(0, 16);
      });

      this.els.btnReset.addEventListener('click', function () {
        self.resetForm();
      });

      this.els.btnDraft.addEventListener('click', function () {
        self.saveDraft();
      });

      this.els.btnBack.addEventListener('click', function () {
        if (window.Router && typeof window.Router.toDashboard === 'function') {
          window.Router.toDashboard();
        }
      });

      this.els.form.dataset.bound = '1';
    },

    renderModeInfo: function () {
      if (this.els.title) this.els.title.textContent = 'Registrasi Sasaran';
      if (this.els.subtitle) this.els.subtitle.textContent = 'Input data sasaran baru';
      if (this.els.modeInfo) this.els.modeInfo.textContent = 'Mode registrasi baru';
      if (this.els.modeBadge) this.els.modeBadge.textContent = 'CREATE';
    },

    hydrateWilayahFromScope: function () {
      var scope = getCurrentProfileScope();

      setSelectOptions(this.els.kecamatan, scope.nama_kecamatan ? [{ value: scope.nama_kecamatan, label: scope.nama_kecamatan }] : [], scope.nama_kecamatan, 'Pilih kecamatan');
      setSelectOptions(this.els.desa, scope.nama_desa ? [{ value: scope.nama_desa, label: scope.nama_desa }] : [], scope.nama_desa, 'Pilih desa/kelurahan');
      setSelectOptions(this.els.dusun, scope.nama_dusun ? [{ value: scope.nama_dusun, label: scope.nama_dusun }] : [], scope.nama_dusun, 'Pilih dusun/RW');

      this.els.kecamatan.disabled = !!scope.nama_kecamatan;
      this.els.desa.disabled = !!scope.nama_desa;
      this.els.dusun.disabled = !!scope.nama_dusun;
    },

    toggleConditionalFields: function () {
      var jenis = String(this.els.jenis.value || '').toUpperCase();
      var showIbu = jenis === 'BADUTA';

      if (this.els.groupIbuKandung) {
        this.els.groupIbuKandung.classList.toggle('hidden', !showIbu);
      }

      if (!showIbu && this.els.ibuKandung) {
        this.els.ibuKandung.value = '';
      }

      if (jenis === 'BUMIL' || jenis === 'BUFAS') {
        this.els.gender.value = 'P';
      }
    },

    renderDynamicFields: function () {
      if (!this.els.dynamicFields) return;

      var jenis = String(this.els.jenis.value || '').toUpperCase();
      var html = '';

      if (!jenis) {
        html = '<p class="muted-text">Pilih jenis sasaran untuk memuat pertanyaan khusus.</p>';
      } else if (jenis === 'BADUTA') {
        html = ''
          + '<div class="info-note">'
          +   '<strong>BADUTA</strong><br>'
          +   'Nama ibu kandung wajib diisi. Usia sasaran harus 0 sampai 24 bulan.'
          + '</div>';
      } else if (jenis === 'BUMIL') {
        html = ''
          + '<div class="info-note">'
          +   '<strong>BUMIL</strong><br>'
          +   'Jenis kelamin wajib perempuan. Pastikan usia tidak anomali dan tidak lebih dari 55 tahun.'
          + '</div>';
      } else if (jenis === 'BUFAS') {
        html = ''
          + '<div class="info-note">'
          +   '<strong>BUFAS</strong><br>'
          +   'Jenis kelamin wajib perempuan. Pastikan usia tidak anomali dan tidak lebih dari 55 tahun.'
          + '</div>';
      } else {
        html = ''
          + '<div class="info-note">'
          +   '<strong>CATIN</strong><br>'
          +   'Pastikan usia sasaran tidak anomali terlalu rendah.'
          + '</div>';
      }

      this.els.dynamicFields.innerHTML = html;
    },

    collectFormData: function () {
      return {
        jenis_sasaran: this.els.jenis.value,
        nama_sasaran: this.els.nama.value,
        nama_kepala_keluarga: this.els.kepalaKeluarga.value,
        nama_ibu_kandung: this.els.ibuKandung.value,
        nik_sasaran: this.els.nik.value,
        nomor_kk: this.els.kk.value,
        jenis_kelamin: this.els.gender.value,
        tanggal_lahir: this.els.tanggalLahir.value,
        nama_kecamatan: this.els.kecamatan.value,
        nama_desa: this.els.desa.value,
        nama_dusun: this.els.dusun.value,
        alamat: this.els.alamat.value
      };
    },

    normalizeFormData: function (data) {
      return {
        jenis_sasaran: String(data.jenis_sasaran || '').trim().toUpperCase(),
        nama_sasaran: normalizeSpaces(data.nama_sasaran),
        nama_kepala_keluarga: normalizeSpaces(data.nama_kepala_keluarga),
        nama_ibu_kandung: normalizeSpaces(data.nama_ibu_kandung),
        nik_sasaran: digitsOnly(data.nik_sasaran).slice(0, 16),
        nomor_kk: digitsOnly(data.nomor_kk).slice(0, 16),
        jenis_kelamin: String(data.jenis_kelamin || '').trim().toUpperCase(),
        tanggal_lahir: String(data.tanggal_lahir || '').trim(),
        nama_kecamatan: normalizeSpaces(data.nama_kecamatan),
        nama_desa: normalizeSpaces(data.nama_desa),
        nama_dusun: normalizeSpaces(data.nama_dusun),
        alamat: normalizeSpaces(data.alamat),
        lokasi_gps: null
      };
    },

    validateForm: function (data) {
      var errors = [];
      var warnings = [];
      var age = calculateAge(data.tanggal_lahir);

      function pushError(field, message) {
        errors.push({ field: field, message: message });
      }

      if (!data.jenis_sasaran) {
        pushError('jenis_sasaran', 'Jenis sasaran wajib dipilih.');
      } else if (ALLOWED_JENIS.indexOf(data.jenis_sasaran) === -1) {
        pushError('jenis_sasaran', 'Jenis sasaran tidak valid.');
      }

      if (!data.nama_sasaran) {
        pushError('nama_sasaran', 'Nama sasaran wajib diisi.');
      } else if (data.nama_sasaran.length < 3) {
        pushError('nama_sasaran', 'Nama sasaran terlalu pendek.');
      }

      if (!data.nama_kepala_keluarga) {
        pushError('nama_kepala_keluarga', 'Nama kepala keluarga wajib diisi.');
      } else if (data.nama_kepala_keluarga.length < 3) {
        pushError('nama_kepala_keluarga', 'Nama kepala keluarga terlalu pendek.');
      }

      if (data.jenis_sasaran === 'BADUTA') {
        if (!data.nama_ibu_kandung) {
          pushError('nama_ibu_kandung', 'Nama ibu kandung wajib diisi untuk BADUTA.');
        } else if (data.nama_ibu_kandung.length < 3) {
          pushError('nama_ibu_kandung', 'Nama ibu kandung terlalu pendek.');
        }
      }

      if (!data.nik_sasaran) {
        pushError('nik_sasaran', 'NIK wajib diisi.');
      } else if (data.nik_sasaran.length !== 16) {
        pushError('nik_sasaran', 'NIK harus 16 digit.');
      } else if (data.nik_sasaran === NIK_PLACEHOLDER) {
        warnings.push('NIK menggunakan 16 digit angka 9 karena belum diketahui.');
      }

      if (!data.nomor_kk) {
        pushError('nomor_kk', 'Nomor KK wajib diisi.');
      } else if (data.nomor_kk.length !== 16) {
        pushError('nomor_kk', 'Nomor KK harus 16 digit.');
      } else if (data.nomor_kk === KK_PLACEHOLDER) {
        warnings.push('Nomor KK menggunakan 16 digit angka 9 karena belum diketahui.');
      }

      if (!data.jenis_kelamin) {
        pushError('jenis_kelamin', 'Jenis kelamin wajib dipilih.');
      } else if (['L', 'P'].indexOf(data.jenis_kelamin) === -1) {
        pushError('jenis_kelamin', 'Jenis kelamin tidak valid.');
      }

      if (!data.tanggal_lahir) {
        pushError('tanggal_lahir', 'Tanggal lahir wajib diisi.');
      } else if (!parseIsoDate(data.tanggal_lahir)) {
        pushError('tanggal_lahir', 'Format tanggal lahir tidak valid.');
      } else if (!age.valid) {
        pushError('tanggal_lahir', 'Tanggal lahir tidak boleh melebihi hari ini.');
      }

      if (!data.nama_kecamatan) pushError('nama_kecamatan', 'Kecamatan wajib dipilih.');
      if (!data.nama_desa) pushError('nama_desa', 'Desa/Kelurahan wajib dipilih.');
      if (!data.nama_dusun) pushError('nama_dusun', 'Dusun/RW wajib dipilih.');

      if (!data.alamat) {
        pushError('alamat', 'Alamat wajib diisi.');
      } else if (data.alamat.length < 5) {
        pushError('alamat', 'Alamat terlalu pendek.');
      }

      if (age.valid && data.jenis_sasaran) {
        if (data.jenis_sasaran === 'BADUTA') {
          if (age.total_bulan < 0 || age.total_bulan > 24) {
            pushError('tanggal_lahir', 'Untuk BADUTA, usia harus 0 sampai 24 bulan.');
          }
        }

        if (data.jenis_sasaran === 'BUMIL') {
          if (data.jenis_kelamin !== 'P') {
            pushError('jenis_kelamin', 'BUMIL wajib berjenis kelamin perempuan.');
          }
          if (age.umur_tahun < 10 || age.umur_tahun > 55) {
            pushError('tanggal_lahir', 'Untuk BUMIL, usia harus masuk akal dan tidak lebih dari 55 tahun.');
          }
        }

        if (data.jenis_sasaran === 'BUFAS') {
          if (data.jenis_kelamin !== 'P') {
            pushError('jenis_kelamin', 'BUFAS wajib berjenis kelamin perempuan.');
          }
          if (age.umur_tahun < 10 || age.umur_tahun > 55) {
            pushError('tanggal_lahir', 'Untuk BUFAS, usia harus masuk akal dan tidak lebih dari 55 tahun.');
          }
        }

        if (data.jenis_sasaran === 'CATIN' && age.total_bulan < 120) {
          pushError('tanggal_lahir', 'Untuk CATIN, usia tidak boleh anomali terlalu rendah.');
        }
      }

      return {
        ok: errors.length === 0,
        errors: errors,
        warnings: warnings,
        age: age
      };
    },

    renderValidation: function (validation) {
      if (!this.els.validationBox) return;

      if (Array.isArray(validation)) {
        this.els.validationBox.innerHTML = '<p class="muted-text">Validasi akan tampil di sini sebelum submit.</p>';
        return;
      }

      var errors = validation.errors || [];
      var warnings = validation.warnings || [];

      if (!errors.length && !warnings.length) {
        this.els.validationBox.innerHTML = '<p class="success-text">Form siap disubmit.</p>';
        return;
      }

      var html = '';

      if (errors.length) {
        html += '<div class="alert alert-danger"><strong>Perlu diperbaiki:</strong><ul>';
        errors.forEach(function (err) {
          html += '<li>' + escapeHtml(err.message) + '</li>';
        });
        html += '</ul></div>';
      }

      if (warnings.length) {
        html += '<div class="alert alert-warning"><strong>Perhatian:</strong><ul>';
        warnings.forEach(function (msg) {
          html += '<li>' + escapeHtml(msg) + '</li>';
        });
        html += '</ul></div>';
      }

      if (validation.age && validation.age.valid) {
        html += '<p class="muted-text">Umur terhitung: <strong>' + escapeHtml(validation.age.label) + '</strong></p>';
      }

      this.els.validationBox.innerHTML = html;
    },

    runLiveValidation: function () {
      var data = this.normalizeFormData(this.collectFormData());
      var validation = this.validateForm(data);
      this.renderValidation(validation);
      return validation;
    },

    buildPayload: function (data, syncSource) {
      return {
        action: 'registerSasaran',
        client_submit_id: generateClientSubmitId(),
        sync_source: syncSource || 'ONLINE',
        device_id: ensureDeviceId(),
        app_version: getAppVersion(),
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
          lokasi_gps: null
        }
      };
    },

    saveDraft: function () {
      var data = this.normalizeFormData(this.collectFormData());
      var validation = this.validateForm(data);
      this.renderValidation(validation);

      if (!validation.ok) {
        showToast('Draft belum disimpan karena masih ada input yang tidak valid.', 'error');
        return;
      }

      var payload = this.buildPayload(data, 'OFFLINE');
      queueOfflineItem({
        action: 'registerSasaran',
        payload: payload,
        created_at: nowIsoString(),
        status: 'PENDING'
      });

      showToast('Draft registrasi disimpan ke antrean offline.', 'success');
      this.resetForm();
    },

    submit: async function () {
      var data = this.normalizeFormData(this.collectFormData());
      var validation = this.validateForm(data);
      this.renderValidation(validation);

      if (!validation.ok) {
        showToast('Registrasi belum dapat dikirim. Periksa validasi ringkas.', 'error');
        return;
      }

      var payload = this.buildPayload(data, navigator.onLine ? 'ONLINE' : 'OFFLINE');

      if (!navigator.onLine) {
        queueOfflineItem({
          action: 'registerSasaran',
          payload: payload,
          created_at: nowIsoString(),
          status: 'PENDING'
        });
        showToast('Perangkat offline. Registrasi disimpan ke antrean sinkronisasi.', 'warning');
        this.resetForm();
        return;
      }

      this.setSubmitting(true);

      try {
        var res;
        if (!window.Api || typeof window.Api.post !== 'function') {
          throw new Error('Api.post tidak tersedia.');
        }

        try {
          res = await window.Api.post('registerSasaran', payload, {
            clientSubmitId: payload.client_submit_id,
            syncSource: payload.sync_source
          });
        } catch (err) {
          res = await window.Api.post(payload);
        }

        if (res && res.ok) {
          this.renderValidation({
            errors: [],
            warnings: [],
            age: validation.age
          });
          showToast(res.message || 'Registrasi sasaran berhasil.', 'success');
          this.resetForm();
          return;
        }

        this.renderValidation({
          errors: Array.isArray(res && res.errors) ? res.errors : [],
          warnings: [res && res.message ? res.message : 'Registrasi gagal.'],
          age: validation.age
        });
        showToast(res && res.message ? res.message : 'Registrasi gagal.', 'error');
      } catch (err) {
        this.renderValidation({
          errors: [],
          warnings: [err && err.message ? err.message : 'Registrasi gagal karena koneksi ke backend bermasalah.'],
          age: validation.age
        });
        showToast(err && err.message ? err.message : 'Registrasi gagal.', 'error');
      } finally {
        this.setSubmitting(false);
      }
    },

    setSubmitting: function (isSubmitting) {
      if (!this.els.btnSubmit) return;
      this.els.btnSubmit.disabled = !!isSubmitting;
      this.els.btnSubmit.textContent = isSubmitting ? 'Mengirim...' : 'Submit Registrasi';
    },

    resetForm: function () {
      if (!this.els.form) return;

      this.els.form.reset();
      this.hydrateWilayahFromScope();
      this.toggleConditionalFields();
      this.renderDynamicFields();
      this.renderValidation([]);
    },

    destroy: function () {}
  };
})(window, document);
