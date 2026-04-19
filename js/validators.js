
(function (window) {
  'use strict';

  function safeTrim(value) {
    return String(value || '').trim();
  }

  function toUpper(value) {
    return safeTrim(value).toUpperCase();
  }

  function onlyDigits(value) {
    return String(value || '').replace(/\D+/g, '');
  }

  function isRequired(value) {
    return !(value === undefined || value === null || safeTrim(value) === '');
  }

  function isNikOrKK16(value) {
    return /^\d{16}$/.test(onlyDigits(value));
  }

  function parseDate(value) {
    if (!value) return null;
    var d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function isDateNotFuture(value) {
    var date = parseDate(value);
    if (!date) return false;

    var today = new Date();
    today.setHours(23, 59, 59, 999);
    return date.getTime() <= today.getTime();
  }

  function calcAgeYears(value) {
    var birthDate = parseDate(value);
    if (!birthDate) return null;

    var today = new Date();
    var age = today.getFullYear() - birthDate.getFullYear();
    var monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age;
  }

  function calcAgeMonths(value) {
    var birthDate = parseDate(value);
    if (!birthDate) return null;

    var today = new Date();
    var months = (today.getFullYear() - birthDate.getFullYear()) * 12;
    months += today.getMonth() - birthDate.getMonth();
    if (today.getDate() < birthDate.getDate()) months -= 1;
    return months;
  }

  function ensureClientSubmitId(existing, prefix) {
    var safePrefix = safeTrim(prefix) || 'SUB';
    if (safeTrim(existing)) return safeTrim(existing);

    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return safePrefix + '-' + window.crypto.randomUUID();
      }
    } catch (err) {}

    return safePrefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function validateRegistrasiCore(payload) {
    var data = payload || {};
    var answers = data.answers || payload || {};
    var issues = [];
    var jenis = toUpper(answers.jenis_sasaran);

    if (!isRequired(answers.jenis_sasaran)) issues.push('Jenis sasaran wajib dipilih.');
    if (!isRequired(answers.nama_sasaran)) issues.push('Nama sasaran wajib diisi.');
    if (!isNikOrKK16(answers.nik_sasaran)) issues.push('NIK harus 16 digit angka.');
    if (!isNikOrKK16(answers.nomor_kk)) issues.push('Nomor KK harus 16 digit angka.');
    if (!isRequired(answers.tanggal_lahir)) {
      issues.push('Tanggal lahir wajib diisi.');
    } else if (!isDateNotFuture(answers.tanggal_lahir)) {
      issues.push('Tanggal lahir tidak boleh melebihi hari ini.');
    } else {
      var ageYears = calcAgeYears(answers.tanggal_lahir);
      var ageMonths = calcAgeMonths(answers.tanggal_lahir);

      if (jenis === 'BADUTA' && ageMonths != null && ageMonths > 24) {
        issues.push('Usia BADUTA tidak boleh lebih dari 24 bulan.');
      }
      if ((jenis === 'BUMIL' || jenis === 'BUFAS') && toUpper(answers.jenis_kelamin) !== 'P') {
        issues.push(jenis + ' wajib berjenis kelamin Perempuan.');
      }
      if ((jenis === 'BUMIL' || jenis === 'BUFAS') && ageYears != null && ageYears > 55) {
        issues.push(jenis + ' tidak boleh berusia di atas 55 tahun.');
      }
    }

    return {
      ok: issues.length === 0,
      issues: issues
    };
  }

  function validatePendampinganCore(payload) {
    var data = payload || {};
    var issues = [];

    if (!isRequired(data.id_sasaran)) issues.push('ID sasaran wajib ada.');
    if (!isRequired(data.form_id)) issues.push('Form ID wajib ada.');

    if (isRequired(data.tanggal_pendampingan) && !isDateNotFuture(data.tanggal_pendampingan)) {
      issues.push('Tanggal pendampingan tidak boleh melebihi hari ini.');
    }

    return {
      ok: issues.length === 0,
      issues: issues
    };
  }

  window.ClientId = window.ClientId || {
    ensure: ensureClientSubmitId
  };

  window.Validators = Object.assign({}, window.Validators || {}, {
    safeTrim: safeTrim,
    toUpper: toUpper,
    onlyDigits: onlyDigits,
    isRequired: isRequired,
    isNikOrKK16: isNikOrKK16,
    parseDate: parseDate,
    isDateNotFuture: isDateNotFuture,
    calcAgeYears: calcAgeYears,
    calcAgeMonths: calcAgeMonths,
    ensureClientSubmitId: ensureClientSubmitId,
    validateRegistrasiCore: validateRegistrasiCore,
    validatePendampinganCore: validatePendampinganCore
  });
})(window);
