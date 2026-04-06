(function (window, document) {
  'use strict';

  const QUEUE_KEY = 'syncQueue';
  const DEVICE_KEY = 'deviceId';
  const APP_VERSION_KEY = 'appVersion';
  const NIK_PLACEHOLDER = '9999999999999999';
  const KK_PLACEHOLDER = '9999999999999999';
  const ALLOWED_JENIS = ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'];
  const FIELD_TO_DOM = {
    jenis_sasaran: 'rsv-jenis-sasaran',
    nama_sasaran: 'rsv-nama-sasaran',
    jenis_kelamin: 'rsv-jenis-kelamin',
    tanggal_lahir: 'rsv-tanggal-lahir',
    nik_sasaran: 'rsv-nik-sasaran',
    nomor_kk: 'rsv-nomor-kk',
    alamat: 'rsv-alamat'
  };

  function $(id, root) {
    return (root || document).getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeSpaces(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function digitsOnly(value) {
    return String(value == null ? '' : value).replace(/\D+/g, '');
  }

  function getTodayLocal() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function parseIsoDate(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return null;
    const parts = String(dateStr).split('-').map(Number);
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    const date = new Date(y, m - 1, d);
    if (
      date.getFullYear() !== y ||
      date.getMonth() !== m - 1 ||
      date.getDate() !== d
    ) {
      return null;
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function calculateAge(dateStr) {
    const dob = parseIsoDate(dateStr);
    if (!dob) {
      return {
        valid: false,
        umur_tahun: null,
        umur_bulan: null,
        total_bulan: null,
        label: '-'
      };
    }

    const today = getTodayLocal();
    if (dob > today) {
      return {
        valid: false,
        umur_tahun: null,
        umur_bulan: null,
        total_bulan: null,
        label: '-'
      };
    }

    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    const days = today.getDate() - dob.getDate();

    if (days < 0) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const totalMonths = (years * 12) + months;
    const label = `${years} tahun ${months} bulan`;

    return {
      valid: true,
      umur_tahun: years,
      umur_bulan: months,
      total_bulan: totalMonths,
      label
    };
  }

  function nowIsoString() {
    return new Date().toISOString();
  }

  function getStorageObject(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function setStorageObject(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureDeviceId() {
    let deviceId = window.localStorage.getItem(DEVICE_KEY);
    if (!deviceId) {
      deviceId = 'dev-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now();
      window.localStorage.setItem(DEVICE_KEY, deviceId);
    }
    return deviceId;
  }

  function getAppVersion() {
    return (
      window.localStorage.getItem(APP_VERSION_KEY) ||
      window.APP_VERSION ||
      '2.1.1'
    );
  }

  function generateClientSubmitId() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = [
      d.getFullYear(),
      pad(d.getMonth() + 1),
      pad(d.getDate())
    ].join('') + '-' + [
      pad(d.getHours()),
      pad(d.getMinutes()),
      pad(d.getSeconds())
    ].join('');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `REG-${stamp}-${rand}`;
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

  function getScope(profile, session) {
    const p = profile || {};
    const s = session || {};

    return {
      id_tim: p.id_tim || s.id_tim || '',
      nomor_tim:
        p.nomor_tim ||
        p.nomor_tim_display ||
        p.nomor_tim_lokal ||
        s.nomor_tim ||
        s.nomor_tim_display ||
        p.nama_tim ||
        s.nama_tim ||
        '-',
      nama_tim: p.nama_tim || s.nama_tim || '',
      unsur_tpk: p.unsur_tpk || s.unsur_tpk || p.role || s.role || '-',
      id_wilayah: p.id_wilayah || s.id_wilayah || '',
      desa_kelurahan:
        p.desa_kelurahan ||
        p.wilayah_tugas_desa_kelurahan ||
        s.desa_kelurahan ||
        s.wilayah_tugas_desa_kelurahan ||
        '-',
      dusun_rw:
        p.dusun_rw ||
        p.wilayah_tugas_dusun_rw ||
        s.dusun_rw ||
        s.wilayah_tugas_dusun_rw ||
        '-',
      nama_user:
        p.nama_kader ||
        p.nama_user ||
        p.nama ||
        s.nama_user ||
        s.nama ||
        s.username ||
        '-'
    };
  }

  async function loadJenisSasaranRefs() {
    try {
      if (window.ReferenceService && typeof window.ReferenceService.getJenisSasaranRef === 'function') {
        const res = await window.ReferenceService.getJenisSasaranRef();
        if (res && res.ok && Array.isArray(res.data) && res.data.length) {
          return res.data
            .filter(item => item && item.is_active !== false)
            .map(item => ({
              code: String(item.code || '').toUpperCase(),
              label: item.label || item.code || ''
            }))
            .filter(item => ALLOWED_JENIS.includes(item.code));
        }
      }
    } catch (err) {}

    return [
      { code: 'CATIN', label: 'CATIN' },
      { code: 'BUMIL', label: 'BUMIL' },
      { code: 'BUFAS', label: 'BUFAS' },
      { code: 'BADUTA', label: 'BADUTA' }
    ];
  }

  function queueOfflineItem(item) {
    const queue = getStorageObject(QUEUE_KEY, []);
    queue.push(item);
    setStorageObject(QUEUE_KEY, queue);
  }

  function fieldErrorHtml(fieldName) {
    return `<div class="form-error" id="${FIELD_TO_DOM[fieldName]}-error"></div>`;
  }

  function collectFieldErrors(errors) {
    const lines = [];
    Object.keys(errors || {}).forEach((key) => {
      if (errors[key]) lines.push(errors[key]);
    });
    return lines;
  }

  const RegistrasiSasaranView = {
    state: {
      container: null,
      isSubmitting: false,
      refs: {
        jenis_sasaran: []
      },
      profile: null,
      session: null,
      scope: null,
      errors: {},
      warnings: [],
      derived: {
        umur_tahun: null,
        umur_bulan: null,
        total_bulan: null,
        label: '-',
        nik_is_placeholder: false,
        kk_is_placeholder: false
      }
    },

    async init(container) {
      this.state.container =
        typeof container === 'string'
          ? document.querySelector(container)
          : container;

      if (!this.state.container) {
        throw new Error('Container RegistrasiSasaranView tidak ditemukan.');
      }

      this.state.profile = getProfile();
      this.state.session = getSession();
      this.state.scope = getScope(this.state.profile, this.state.session);
      this.state.refs.jenis_sasaran = await loadJenisSasaranRefs();

      this.render();
      this.bindEvents();
      this.updateAgePreview();
      this.renderScope();
      this.renderStatusBanner();
    },

    render() {
      const jenisOptions = this.state.refs.jenis_sasaran
        .map(item => `<option value="${escapeHtml(item.code)}">${escapeHtml(item.label)}</option>`)
        .join('');

      this.state.container.innerHTML = `
        <section id="registrasi-sasaran-view" class="screen registrasi-sasaran-view">
          <div class="card">
            <div class="card-body">
              <h2 style="margin:0 0 6px;">Registrasi Sasaran</h2>
              <p style="margin:0; opacity:.8;">Pendaftaran sasaran baru dalam tim Anda.</p>
            </div>
          </div>

          <div class="card" id="rsv-status-card" style="display:none;">
            <div class="card-body">
              <div id="rsv-status-banner"></div>
            </div>
          </div>

          <form id="rsv-form" class="card">
            <div class="card-body">
              <h3 style="margin-top:0;">Tim & Wilayah Tugas</h3>
              <div class="form-group">
                <label>Nomor Tim</label>
                <div id="rsv-nomor-tim" class="readonly-value">-</div>
              </div>
              <div class="form-group">
                <label>Unsur TPK</label>
                <div id="rsv-unsur-tpk" class="readonly-value">-</div>
              </div>
              <div class="form-group">
                <label>Desa/Kelurahan Tugas</label>
                <div id="rsv-desa" class="readonly-value">-</div>
              </div>
              <div class="form-group">
                <label>Dusun/RW Tugas</label>
                <div id="rsv-dusun" class="readonly-value">-</div>
              </div>
              <div class="form-group">
                <label>Nama Kader</label>
                <div id="rsv-nama-user" class="readonly-value">-</div>
              </div>
            </div>

            <div class="card-body">
              <h3 style="margin-top:0;">Identitas Sasaran</h3>

              <div class="form-group">
                <label for="rsv-jenis-sasaran">Jenis Sasaran</label>
                <select id="rsv-jenis-sasaran">
                  <option value="">Pilih jenis sasaran</option>
                  ${jenisOptions}
                </select>
                ${fieldErrorHtml('jenis_sasaran')}
              </div>

              <div class="form-group">
                <label for="rsv-nama-sasaran">Nama Sasaran</label>
                <input id="rsv-nama-sasaran" type="text" maxlength="120" placeholder="Masukkan nama sasaran">
                ${fieldErrorHtml('nama_sasaran')}
              </div>

              <div class="form-group">
                <label for="rsv-jenis-kelamin">Jenis Kelamin</label>
                <select id="rsv-jenis-kelamin">
                  <option value="">Pilih jenis kelamin</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
                ${fieldErrorHtml('jenis_kelamin')}
              </div>

              <div class="form-group">
                <label for="rsv-tanggal-lahir">Tanggal Lahir</label>
                <input id="rsv-tanggal-lahir" type="date">
                <div class="field-hint">Umur: <strong id="rsv-umur-preview">-</strong></div>
                ${fieldErrorHtml('tanggal_lahir')}
              </div>
            </div>

            <div class="card-body">
              <h3 style="margin-top:0;">Identitas Kependudukan</h3>

              <div class="form-group">
                <label for="rsv-nik-sasaran">NIK Sasaran</label>
                <input id="rsv-nik-sasaran" type="text" inputmode="numeric" maxlength="16" placeholder="16 digit NIK">
                <div class="field-hint">Gunakan 16 digit. Jika belum diketahui, boleh pakai standar 9999999999999999 sesuai kebijakan.</div>
                ${fieldErrorHtml('nik_sasaran')}
              </div>

              <div class="form-group">
                <label for="rsv-nomor-kk">Nomor KK</label>
                <input id="rsv-nomor-kk" type="text" inputmode="numeric" maxlength="16" placeholder="16 digit nomor KK">
                <div class="field-hint">Gunakan 16 digit. Jika belum diketahui, boleh pakai standar 9999999999999999 sesuai kebijakan.</div>
                ${fieldErrorHtml('nomor_kk')}
              </div>

              <div class="form-group">
                <label for="rsv-alamat">Alamat</label>
                <textarea id="rsv-alamat" rows="3" maxlength="255" placeholder="Masukkan alamat sasaran"></textarea>
                ${fieldErrorHtml('alamat')}
              </div>
            </div>

            <div class="card-body">
              <h3 style="margin-top:0;">Pemeriksaan</h3>
              <div id="rsv-error-summary" class="alert alert-danger" style="display:none;"></div>
              <div id="rsv-warning-box" class="alert alert-warning" style="display:none;"></div>

              <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:14px;">
                <button type="submit" id="rsv-submit-btn" class="btn btn-primary">Simpan Registrasi</button>
                <button type="button" id="rsv-reset-btn" class="btn btn-secondary">Bersihkan Form</button>
              </div>
            </div>
          </form>
        </section>
      `;
    },

    bindEvents() {
      const form = $('rsv-form', this.state.container);
      const dobEl = $('rsv-tanggal-lahir', this.state.container);
      const jenisEl = $('rsv-jenis-sasaran', this.state.container);
      const genderEl = $('rsv-jenis-kelamin', this.state.container);
      const nikEl = $('rsv-nik-sasaran', this.state.container);
      const kkEl = $('rsv-nomor-kk', this.state.container);
      const resetBtn = $('rsv-reset-btn', this.state.container);

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submit();
      });

      dobEl.addEventListener('change', () => {
        this.updateAgePreview();
        this.runLiveValidation();
      });

      jenisEl.addEventListener('change', () => {
        this.runLiveValidation();
      });

      genderEl.addEventListener('change', () => {
        this.runLiveValidation();
      });

      nikEl.addEventListener('input', (e) => {
        e.target.value = digitsOnly(e.target.value).slice(0, 16);
      });

      kkEl.addEventListener('input', (e) => {
        e.target.value = digitsOnly(e.target.value).slice(0, 16);
      });

      resetBtn.addEventListener('click', () => {
        this.resetForm();
      });

      window.addEventListener('online', () => this.renderStatusBanner());
      window.addEventListener('offline', () => this.renderStatusBanner());
    },

    renderScope() {
      const scope = this.state.scope || {};
      $('rsv-nomor-tim', this.state.container).textContent = scope.nomor_tim || '-';
      $('rsv-unsur-tpk', this.state.container).textContent = scope.unsur_tpk || '-';
      $('rsv-desa', this.state.container).textContent = scope.desa_kelurahan || '-';
      $('rsv-dusun', this.state.container).textContent = scope.dusun_rw || '-';
      $('rsv-nama-user', this.state.container).textContent = scope.nama_user || '-';
    },

    renderStatusBanner() {
      const card = $('rsv-status-card', this.state.container);
      const banner = $('rsv-status-banner', this.state.container);
      const online = navigator.onLine;

      card.style.display = '';
      if (online) {
        banner.innerHTML = '<div class="alert alert-success">Perangkat online. Registrasi akan langsung dikirim ke server.</div>';
      } else {
        banner.innerHTML = '<div class="alert alert-warning">Perangkat sedang offline. Registrasi akan disimpan ke antrean sinkronisasi.</div>';
      }
    },

    updateAgePreview() {
      const dob = $('rsv-tanggal-lahir', this.state.container).value;
      const age = calculateAge(dob);
      this.state.derived.umur_tahun = age.umur_tahun;
      this.state.derived.umur_bulan = age.umur_bulan;
      this.state.derived.total_bulan = age.total_bulan;
      this.state.derived.label = age.label;
      $('rsv-umur-preview', this.state.container).textContent = age.label;
    },

    collectFormData() {
      return {
        jenis_sasaran: $('rsv-jenis-sasaran', this.state.container).value,
        nama_sasaran: $('rsv-nama-sasaran', this.state.container).value,
        jenis_kelamin: $('rsv-jenis-kelamin', this.state.container).value,
        tanggal_lahir: $('rsv-tanggal-lahir', this.state.container).value,
        nik_sasaran: $('rsv-nik-sasaran', this.state.container).value,
        nomor_kk: $('rsv-nomor-kk', this.state.container).value,
        alamat: $('rsv-alamat', this.state.container).value
      };
    },

    normalizeFormData(data) {
      const normalized = {
        jenis_sasaran: String(data.jenis_sasaran || '').trim().toUpperCase(),
        nama_sasaran: normalizeSpaces(data.nama_sasaran),
        jenis_kelamin: String(data.jenis_kelamin || '').trim().toUpperCase(),
        tanggal_lahir: String(data.tanggal_lahir || '').trim(),
        nik_sasaran: digitsOnly(data.nik_sasaran).slice(0, 16),
        nomor_kk: digitsOnly(data.nomor_kk).slice(0, 16),
        alamat: normalizeSpaces(data.alamat),
        lokasi_gps: null
      };

      return normalized;
    },

    validateForm(data) {
      const errors = {};
      const warnings = [];
      const age = calculateAge(data.tanggal_lahir);

      const hasLetter = /\p{L}/u.test(data.nama_sasaran || '');

      if (!data.jenis_sasaran) {
        errors.jenis_sasaran = 'Jenis sasaran wajib dipilih.';
      } else if (!ALLOWED_JENIS.includes(data.jenis_sasaran)) {
        errors.jenis_sasaran = 'Jenis sasaran tidak valid.';
      }

      if (!data.nama_sasaran) {
        errors.nama_sasaran = 'Nama sasaran wajib diisi.';
      } else if (data.nama_sasaran.length < 3) {
        errors.nama_sasaran = 'Nama sasaran terlalu pendek.';
      } else if (!hasLetter) {
        errors.nama_sasaran = 'Nama sasaran tidak valid.';
      }

      if (!data.jenis_kelamin) {
        errors.jenis_kelamin = 'Jenis kelamin wajib dipilih.';
      } else if (!['L', 'P'].includes(data.jenis_kelamin)) {
        errors.jenis_kelamin = 'Jenis kelamin tidak valid.';
      }

      if (!data.tanggal_lahir) {
        errors.tanggal_lahir = 'Tanggal lahir wajib diisi.';
      } else if (!parseIsoDate(data.tanggal_lahir)) {
        errors.tanggal_lahir = 'Format tanggal lahir tidak valid.';
      } else if (!age.valid) {
        errors.tanggal_lahir = 'Tanggal lahir tidak boleh melebihi hari ini.';
      }

      if (!data.nik_sasaran) {
        errors.nik_sasaran = 'NIK sasaran wajib diisi.';
      } else if (data.nik_sasaran.length !== 16) {
        errors.nik_sasaran = 'NIK harus 16 digit.';
      } else if (data.nik_sasaran === NIK_PLACEHOLDER) {
        warnings.push('NIK menggunakan nilai standar 9 karena belum diketahui.');
        this.state.derived.nik_is_placeholder = true;
      } else {
        this.state.derived.nik_is_placeholder = false;
      }

      if (!data.nomor_kk) {
        errors.nomor_kk = 'Nomor KK wajib diisi.';
      } else if (data.nomor_kk.length !== 16) {
        errors.nomor_kk = 'Nomor KK harus 16 digit.';
      } else if (data.nomor_kk === KK_PLACEHOLDER) {
        warnings.push('Nomor KK menggunakan nilai standar 9 karena belum diketahui.');
        this.state.derived.kk_is_placeholder = true;
      } else {
        this.state.derived.kk_is_placeholder = false;
      }

      if (!data.alamat) {
        errors.alamat = 'Alamat wajib diisi.';
      } else if (data.alamat.length < 5) {
        errors.alamat = 'Alamat terlalu pendek.';
      }

      if (age.valid && data.jenis_sasaran) {
        const totalMonths = age.total_bulan;
        const years = age.umur_tahun;

        if (data.jenis_sasaran === 'BADUTA') {
          if (totalMonths < 0 || totalMonths > 24) {
            errors.tanggal_lahir = 'Untuk BADUTA, usia harus 0 sampai 24 bulan.';
          }
        }

        if (data.jenis_sasaran === 'BUMIL') {
          if (data.jenis_kelamin && data.jenis_kelamin !== 'P') {
            errors.jenis_kelamin = 'BUMIL wajib berjenis kelamin perempuan.';
          }
          if (years < 10 || years > 55) {
            errors.tanggal_lahir = 'Untuk BUMIL, usia harus masuk akal dan tidak lebih dari 55 tahun.';
          }
        }

        if (data.jenis_sasaran === 'BUFAS') {
          if (data.jenis_kelamin && data.jenis_kelamin !== 'P') {
            errors.jenis_kelamin = 'BUFAS wajib berjenis kelamin perempuan.';
          }
          if (years < 10 || years > 55) {
            errors.tanggal_lahir = 'Untuk BUFAS, usia harus masuk akal dan tidak lebih dari 55 tahun.';
          }
        }

        if (data.jenis_sasaran === 'CATIN') {
          if (totalMonths < 120) {
            errors.tanggal_lahir = 'Untuk CATIN, usia tidak boleh anomali terlalu rendah.';
          }
        }
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        warnings,
        derived: {
          umur_tahun: age.umur_tahun,
          umur_bulan: age.umur_bulan,
          total_bulan: age.total_bulan,
          label: age.label,
          nik_is_placeholder: data.nik_sasaran === NIK_PLACEHOLDER,
          kk_is_placeholder: data.nomor_kk === KK_PLACEHOLDER
        }
      };
    },

    renderValidation(validation) {
      this.state.errors = validation.errors || {};
      this.state.warnings = validation.warnings || [];
      this.state.derived = Object.assign({}, this.state.derived, validation.derived || {});

      Object.keys(FIELD_TO_DOM).forEach((field) => {
        const errEl = $(`${FIELD_TO_DOM[field]}-error`, this.state.container);
        const fieldEl = $(FIELD_TO_DOM[field], this.state.container);
        const message = this.state.errors[field] || '';

        if (errEl) errEl.textContent = message;
        if (fieldEl) {
          if (message) fieldEl.classList.add('is-invalid');
          else fieldEl.classList.remove('is-invalid');
        }
      });

      const errorSummary = $('rsv-error-summary', this.state.container);
      const warningBox = $('rsv-warning-box', this.state.container);

      const errorLines = collectFieldErrors(this.state.errors);
      if (errorLines.length) {
        errorSummary.style.display = '';
        errorSummary.innerHTML = `<ul style="margin:0; padding-left:18px;">${errorLines.map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>`;
      } else {
        errorSummary.style.display = 'none';
        errorSummary.innerHTML = '';
      }

      if (this.state.warnings.length) {
        warningBox.style.display = '';
        warningBox.innerHTML = `<ul style="margin:0; padding-left:18px;">${this.state.warnings.map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>`;
      } else {
        warningBox.style.display = 'none';
        warningBox.innerHTML = '';
      }
    },

    runLiveValidation() {
      const data = this.normalizeFormData(this.collectFormData());
      const validation = this.validateForm(data);
      this.renderValidation(validation);
      this.updateAgePreview();
    },

    buildPayload(data, syncSource) {
      return {
        action: 'registerSasaran',
        client_submit_id: generateClientSubmitId(),
        sync_source: syncSource || 'ONLINE',
        data: {
          jenis_sasaran: data.jenis_sasaran,
          nama_sasaran: data.nama_sasaran,
          jenis_kelamin: data.jenis_kelamin,
          tanggal_lahir: data.tanggal_lahir,
          nik_sasaran: data.nik_sasaran,
          nomor_kk: data.nomor_kk,
          alamat: data.alamat,
          lokasi_gps: null
        },
        device_id: ensureDeviceId(),
        app_version: getAppVersion()
      };
    },

    async submit() {
      if (this.state.isSubmitting) return;

      const data = this.normalizeFormData(this.collectFormData());
      const validation = this.validateForm(data);
      this.renderValidation(validation);

      if (!validation.isValid) return;

      const payload = this.buildPayload(data, navigator.onLine ? 'ONLINE' : 'OFFLINE');

      if (!navigator.onLine) {
        this.saveOffline(payload);
        return;
      }

      await this.submitOnline(payload);
    },

    async submitOnline(payload) {
      this.state.isSubmitting = true;
      const submitBtn = $('rsv-submit-btn', this.state.container);
      submitBtn.disabled = true;
      submitBtn.textContent = 'Menyimpan...';

      try {
        if (!window.Api || typeof window.Api.post !== 'function') {
          throw new Error('Api.post tidak tersedia.');
        }

        const res = await window.Api.post('registerSasaran', payload, {
          clientSubmitId: payload.client_submit_id,
          syncSource: payload.sync_source
        });

        if (res && res.ok) {
          this.handleSubmitSuccess(res);
          return;
        }

        this.handleSubmitFailure(res || { message: 'Registrasi gagal.' });
      } catch (err) {
        this.handleSubmitFailure({
          message: err && err.message ? err.message : 'Registrasi gagal karena koneksi ke backend bermasalah.'
        });
      } finally {
        this.state.isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Simpan Registrasi';
      }
    },

    saveOffline(payload) {
      queueOfflineItem({
        action: 'registerSasaran',
        payload: payload,
        created_at: nowIsoString(),
        status: 'PENDING_SYNC'
      });

      this.renderValidation({
        isValid: true,
        errors: {},
        warnings: ['Perangkat sedang offline. Registrasi disimpan ke antrean sinkronisasi.'],
        derived: this.state.derived
      });

      if (window.UI && typeof window.UI.toast === 'function') {
        window.UI.toast('Registrasi disimpan ke antrean sinkronisasi.', 'warning');
      }

      this.resetForm(false);
    },

    handleSubmitSuccess(res) {
      this.renderValidation({
        isValid: true,
        errors: {},
        warnings: [],
        derived: {
          umur_tahun: null,
          umur_bulan: null,
          total_bulan: null,
          label: '-',
          nik_is_placeholder: false,
          kk_is_placeholder: false
        }
      });

      if (window.UI && typeof window.UI.toast === 'function') {
        window.UI.toast(res.message || 'Registrasi sasaran berhasil.', 'success');
      } else {
        alert(res.message || 'Registrasi sasaran berhasil.');
      }

      this.resetForm(false);
    },

    handleSubmitFailure(res) {
      const serverErrors = {};
      const warnings = [];

      if (Array.isArray(res.errors)) {
        res.errors.forEach((item) => {
          if (item && item.field) {
            serverErrors[item.field] = item.message || 'Input tidak valid.';
          } else if (item && item.message) {
            warnings.push(item.message);
          }
        });
      }

      if (res.data && res.data.duplicate_level) {
        warnings.push(`Data terindikasi duplikat (${res.data.duplicate_level}).`);
      }

      if (!Object.keys(serverErrors).length && res.message) {
        warnings.unshift(res.message);
      }

      this.renderValidation({
        isValid: false,
        errors: serverErrors,
        warnings: warnings,
        derived: this.state.derived
      });

      if (window.UI && typeof window.UI.toast === 'function') {
        window.UI.toast(res.message || 'Registrasi sasaran gagal.', 'error');
      }
    },

    resetForm(keepMessages) {
      $('rsv-jenis-sasaran', this.state.container).value = '';
      $('rsv-nama-sasaran', this.state.container).value = '';
      $('rsv-jenis-kelamin', this.state.container).value = '';
      $('rsv-tanggal-lahir', this.state.container).value = '';
      $('rsv-nik-sasaran', this.state.container).value = '';
      $('rsv-nomor-kk', this.state.container).value = '';
      $('rsv-alamat', this.state.container).value = '';

      this.updateAgePreview();

      if (keepMessages !== false) {
        this.renderValidation({
          isValid: true,
          errors: {},
          warnings: [],
          derived: {
            umur_tahun: null,
            umur_bulan: null,
            total_bulan: null,
            label: '-',
            nik_is_placeholder: false,
            kk_is_placeholder: false
          }
        });
      }
    },

    destroy() {
      if (this.state.container) {
        this.state.container.innerHTML = '';
      }
    }
  };

  window.RegistrasiSasaranView = RegistrasiSasaranView;
})(window, document);
