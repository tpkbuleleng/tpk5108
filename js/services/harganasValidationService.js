
(function (window) {
  'use strict';

  var HARGANAS_VALIDATION_VERSION = 'HARGANAS-1-VALIDATION-20260625';

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function todayIsoLocal() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseDate(value) {
    var raw = String(value || '').trim();
    var m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
    return d;
  }

  function calculateAgeMonths(tanggalLahir, referenceDate) {
    var birth = parseDate(tanggalLahir);
    var ref = parseDate(referenceDate || getEventDate());
    if (!birth || !ref || birth.getTime() > ref.getTime()) return null;
    var months = (ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth());
    if (ref.getDate() < birth.getDate()) months -= 1;
    return Math.max(0, months);
  }

  function getEventDate() {
    var cfg = (window.APP_CONFIG && window.APP_CONFIG.HARGANAS) || {};
    return cfg.EVENT_DATE || '2026-06-29';
  }

  function normalizeJenis(value) {
    var raw = String(value || '').trim().toUpperCase();
    if (raw === 'BADUTA') return 'BALITA';
    return raw;
  }

  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function maskNik(nik) {
    var digits = onlyDigits(nik);
    if (digits.length !== 16) return '';
    return digits.slice(0, 4) + '********' + digits.slice(12);
  }

  function simpleHash(value) {
    var text = String(value || '');
    var h = 0;
    for (var i = 0; i < text.length; i += 1) {
      h = ((h << 5) - h) + text.charCodeAt(i);
      h |= 0;
    }
    return 'HSH-' + Math.abs(h).toString(36).toUpperCase();
  }

  function ageLabelFromMonths(months) {
    if (months === null || months === undefined || Number.isNaN(Number(months))) return '-';
    var m = Number(months);
    var y = Math.floor(m / 12);
    var rem = m % 12;
    if (y <= 0) return rem + ' bulan';
    if (rem <= 0) return y + ' tahun';
    return y + ' tahun ' + rem + ' bulan';
  }

  function validateDraft(input, options) {
    var data = input || {};
    var eventDate = (options && options.eventDate) || getEventDate();
    var errors = [];
    var jenis = normalizeJenis(data.jenis_sasaran);
    var nama = String(data.nama_sasaran || '').replace(/\s+/g, ' ').trim();
    var nik = onlyDigits(data.nik_sasaran || data.nik || '');
    var tanggalLahir = String(data.tanggal_lahir || '').trim();
    var namaKk = String(data.nama_kk || data.nama_kepala_keluarga || '').replace(/\s+/g, ' ').trim();
    var namaIbu = String(data.nama_ibu_kandung || '').replace(/\s+/g, ' ').trim();

    if (!jenis) errors.push('Jenis sasaran wajib dipilih.');
    if (['CATIN', 'BUMIL', 'BUFAS', 'BALITA'].indexOf(jenis) < 0) errors.push('Jenis sasaran tidak dikenali. Gunakan CATIN, BUMIL, BUFAS, atau BALITA.');
    if (!nama) errors.push('Nama sasaran wajib diisi.');
    if (nik.length !== 16) errors.push('NIK sasaran wajib 16 digit angka.');

    var birth = parseDate(tanggalLahir);
    if (!tanggalLahir || !birth) {
      errors.push('Tanggal lahir wajib diisi dengan format tanggal yang valid.');
    } else {
      var today = parseDate(todayIsoLocal());
      if (today && birth.getTime() > today.getTime()) errors.push('Tanggal lahir tidak boleh melebihi hari ini.');
    }

    if (!namaKk) errors.push('Nama kepala keluarga wajib diisi.');
    if (jenis === 'BALITA' && !namaIbu) errors.push('Nama ibu kandung wajib diisi untuk BALITA.');

    var ageMonths = birth ? calculateAgeMonths(tanggalLahir, eventDate) : null;
    if (jenis === 'BALITA') {
      if (ageMonths === null) errors.push('Usia BALITA tidak dapat dihitung dari tanggal lahir.');
      else if (ageMonths > 59) errors.push('Jenis sasaran BALITA hanya untuk usia 0–59 bulan pada tanggal kegiatan.');
    }

    var isBadutaPrioritas = jenis === 'BALITA' && ageMonths !== null && ageMonths >= 0 && ageMonths <= 23;

    return {
      ok: errors.length === 0,
      errors: errors,
      data: {
        jenis_sasaran: jenis,
        nama_sasaran: nama,
        nik_sasaran: nik,
        nik_sasaran_masked: maskNik(nik),
        nik_sasaran_hash: nik ? simpleHash(nik) : '',
        tanggal_lahir: tanggalLahir,
        nama_kk: namaKk,
        nama_ibu_kandung: namaIbu,
        age_months_at_event: ageMonths,
        age_label_at_event: ageLabelFromMonths(ageMonths),
        is_baduta_prioritas: isBadutaPrioritas
      }
    };
  }

  window.HarganasValidationService = {
    version: HARGANAS_VALIDATION_VERSION,
    getEventDate: getEventDate,
    normalizeJenis: normalizeJenis,
    onlyDigits: onlyDigits,
    maskNik: maskNik,
    calculateAgeMonths: calculateAgeMonths,
    ageLabelFromMonths: ageLabelFromMonths,
    validateDraft: validateDraft
  };
})(window);
