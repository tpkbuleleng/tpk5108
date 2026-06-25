(function (window) {
  'use strict';

  var GPS_SERVICE_VERSION = 'HARGANAS-2D-GPS-SERVICE-20260625';

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getHarganasConfig() {
    return getConfig().HARGANAS || {};
  }

  function getGoodAccuracyMeters() {
    var cfg = getHarganasConfig();
    return Number(cfg.GPS_GOOD_ACCURACY_METERS || cfg.GPS_ACCURACY_GOOD_METERS || 100) || 100;
  }

  function getTimeoutMs() {
    var cfg = getHarganasConfig();
    return Number(cfg.GPS_TIMEOUT_MS || cfg.GEOLOCATION_TIMEOUT_MS || 15000) || 15000;
  }

  function getMaximumAgeMs() {
    var cfg = getHarganasConfig();
    return Number(cfg.GPS_MAXIMUM_AGE_MS || cfg.GEOLOCATION_MAXIMUM_AGE_MS || 0) || 0;
  }

  function isSupported() {
    return !!(window.navigator && window.navigator.geolocation && typeof window.navigator.geolocation.getCurrentPosition === 'function');
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function roundCoord(value) {
    var n = Number(value);
    if (!isFinite(n)) return null;
    return Number(n.toFixed(7));
  }

  function roundAccuracy(value) {
    var n = Number(value);
    if (!isFinite(n)) return null;
    return Math.round(n);
  }

  function classifyAccuracy(accuracy) {
    var acc = Number(accuracy);
    var threshold = getGoodAccuracyMeters();

    if (!isFinite(acc) || acc <= 0) {
      return {
        status: 'UNKNOWN_ACCURACY',
        label: 'Akurasi tidak terbaca',
        is_good: false,
        is_low: true,
        threshold_meters: threshold
      };
    }

    if (acc <= threshold) {
      return {
        status: 'GOOD_ACCURACY',
        label: 'Akurasi baik',
        is_good: true,
        is_low: false,
        threshold_meters: threshold
      };
    }

    return {
      status: 'LOW_ACCURACY',
      label: 'Akurasi rendah',
      is_good: false,
      is_low: true,
      threshold_meters: threshold
    };
  }

  function normalizePosition(position) {
    var coords = position && position.coords ? position.coords : {};
    var accuracy = roundAccuracy(coords.accuracy);
    var accuracyInfo = classifyAccuracy(accuracy);

    return {
      latitude: roundCoord(coords.latitude),
      longitude: roundCoord(coords.longitude),
      accuracy: accuracy,
      altitude: coords.altitude === null || coords.altitude === undefined ? null : Number(coords.altitude),
      altitude_accuracy: coords.altitudeAccuracy === null || coords.altitudeAccuracy === undefined ? null : roundAccuracy(coords.altitudeAccuracy),
      heading: coords.heading === null || coords.heading === undefined ? null : Number(coords.heading),
      speed: coords.speed === null || coords.speed === undefined ? null : Number(coords.speed),
      captured_at_device: nowIso(),
      provider_timestamp: position && position.timestamp ? new Date(position.timestamp).toISOString() : '',
      permission_status: 'GRANTED',
      accuracy_status: accuracyInfo.status,
      accuracy_label: accuracyInfo.label,
      accuracy_threshold_meters: accuracyInfo.threshold_meters,
      gps_service_version: GPS_SERVICE_VERSION
    };
  }

  function normalizeError(error) {
    var code = error && error.code ? Number(error.code) : 0;
    var base = {
      ok: false,
      code: code,
      gps_status: 'ERROR',
      permission_status: 'UNKNOWN',
      error_message: 'GPS belum dapat diaktifkan.'
    };

    if (code === 1) {
      base.gps_status = 'PERMISSION_DENIED';
      base.permission_status = 'DENIED';
      base.error_message = 'Izin lokasi ditolak. Aktifkan izin lokasi/GPS pada browser agar dokumentasi dapat dikirim.';
    } else if (code === 2) {
      base.gps_status = 'POSITION_UNAVAILABLE';
      base.error_message = 'Lokasi belum tersedia. Pastikan GPS aktif, sinyal lokasi cukup baik, lalu coba lagi.';
    } else if (code === 3) {
      base.gps_status = 'TIMEOUT';
      base.error_message = 'Permintaan GPS terlalu lama. Coba ulang di area dengan sinyal lokasi lebih baik.';
    } else if (error && error.message) {
      base.error_message = String(error.message);
    }

    return base;
  }

  function requestPosition(options) {
    if (!isSupported()) {
      return Promise.resolve({
        ok: false,
        code: 'GEOLOCATION_NOT_SUPPORTED',
        gps_status: 'NOT_SUPPORTED',
        permission_status: 'UNSUPPORTED',
        error_message: 'Browser/perangkat ini belum mendukung fitur GPS.'
      });
    }

    var opts = Object.assign({
      enableHighAccuracy: true,
      timeout: getTimeoutMs(),
      maximumAge: getMaximumAgeMs()
    }, options || {});

    return new Promise(function (resolve) {
      window.navigator.geolocation.getCurrentPosition(function (position) {
        var location = normalizePosition(position);
        var accuracyInfo = classifyAccuracy(location.accuracy);
        resolve({
          ok: true,
          gps_status: accuracyInfo.is_good ? 'READY' : 'LOW_ACCURACY',
          permission_status: 'GRANTED',
          accuracy_status: accuracyInfo.status,
          accuracy_label: accuracyInfo.label,
          is_low_accuracy: !!accuracyInfo.is_low,
          message: accuracyInfo.is_good ? 'GPS berhasil diaktifkan.' : 'GPS berhasil diaktifkan, tetapi akurasi masih rendah.',
          location: location,
          service_version: GPS_SERVICE_VERSION
        });
      }, function (error) {
        resolve(Object.assign(normalizeError(error), {
          service_version: GPS_SERVICE_VERSION
        }));
      }, opts);
    });
  }

  function getPermissionState() {
    if (!window.navigator || !window.navigator.permissions || typeof window.navigator.permissions.query !== 'function') {
      return Promise.resolve({ ok: false, state: 'unknown', message: 'Permission API tidak tersedia.' });
    }

    return window.navigator.permissions.query({ name: 'geolocation' }).then(function (result) {
      return { ok: true, state: result && result.state ? String(result.state) : 'unknown' };
    }).catch(function () {
      return { ok: false, state: 'unknown', message: 'Status izin lokasi belum dapat dibaca.' };
    });
  }

  function buildDraftPatch(result) {
    if (!result || !result.ok || !result.location) {
      return {
        gps_status: result && result.gps_status ? result.gps_status : 'ERROR',
        gps_permission_status: result && result.permission_status ? result.permission_status : 'UNKNOWN',
        gps_error_message: result && result.error_message ? result.error_message : 'GPS belum aktif.',
        gps_checked_at: nowIso()
      };
    }

    return {
      gps_status: result.gps_status || 'READY',
      gps_permission_status: result.permission_status || 'GRANTED',
      gps_accuracy_status: result.accuracy_status || '',
      gps_accuracy_label: result.accuracy_label || '',
      gps_is_low_accuracy: !!result.is_low_accuracy,
      gps_location: result.location,
      gps_error_message: '',
      gps_checked_at: nowIso(),
      media_status: {
        gps: true
      }
    };
  }

  window.HarganasGpsService = {
    version: GPS_SERVICE_VERSION,
    isSupported: isSupported,
    getGoodAccuracyMeters: getGoodAccuracyMeters,
    classifyAccuracy: classifyAccuracy,
    requestPosition: requestPosition,
    getPermissionState: getPermissionState,
    buildDraftPatch: buildDraftPatch
  };
})(window);
