
(function (window, document) {
  'use strict';

  var SELECTED_KEY = 'tpk_selected_sasaran';

  function byId(id) { return document.getElementById(id); }
  function s(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }

  function isBadValue(v) {
    var t = s(v);
    return !t || t === '[object Object]' || t === 'null' || t === 'undefined' || t === '-';
  }

  function wilayahString(item) {
    if (!item || typeof item !== 'object') return '-';

    var raw = item.nama_wilayah;
    if (raw && typeof raw === 'object') {
      var fromObj = [
        s(raw.nama_dusun || raw.dusun_rw || raw.nama_dusun_rw || raw.dusun),
        s(raw.nama_desa || raw.desa_kelurahan || raw.nama_desa_kelurahan || raw.desa),
        s(raw.nama_kecamatan || raw.kecamatan)
      ].filter(Boolean).join(' / ');
      if (fromObj) return fromObj;
    }

    var plain = s(raw || item.wilayah);
    if (!isBadValue(plain)) return plain;

    var fallback = [
      s(item.nama_dusun || item.dusun_rw || item.nama_dusun_rw || item.dusun),
      s(item.nama_desa || item.desa_kelurahan || item.nama_desa_kelurahan || item.desa),
      s(item.nama_kecamatan || item.kecamatan)
    ].filter(Boolean).join(' / ');

    return fallback || '-';
  }

  function persistSelected(detail) {
    var safe = detail && typeof detail === 'object' ? detail : {};
    try {
      localStorage.setItem(SELECTED_KEY, JSON.stringify(safe));
    } catch (_) {}

    if (window.AppState && typeof window.AppState.setSelectedSasaran === 'function') {
      window.AppState.setSelectedSasaran(safe);
    }

    if (window.Storage && typeof window.Storage.set === 'function' && window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS) {
      var key = window.APP_CONFIG.STORAGE_KEYS.SELECTED_SASARAN || SELECTED_KEY;
      window.Storage.set(key, safe);
    }
  }

  function patchDetailDom(detailView) {
    var current = detailView && typeof detailView.getCurrentDetail === 'function'
      ? (detailView.getCurrentDetail() || {})
      : {};

    if (!current || typeof current !== 'object') return;

    current.nama_wilayah = wilayahString(current);
    var el = byId('detail-wilayah');
    if (el) el.textContent = current.nama_wilayah;

    persistSelected(current);
  }

  function patchSasaranDetail() {
    var SD = window.SasaranDetailView;
    if (!SD || SD.__stage2aPatched) return false;
    SD.__stage2aPatched = true;

    var origOpen = SD.open;
    SD.open = async function () {
      var out = await origOpen.apply(this, arguments);
      patchDetailDom(SD);
      return out;
    };

    var origRefresh = SD.refresh;
    if (typeof origRefresh === 'function') {
      SD.refresh = async function () {
        var out = await origRefresh.apply(this, arguments);
        patchDetailDom(SD);
        return out;
      };
    }

    setTimeout(function () { patchDetailDom(SD); }, 0);
    return true;
  }

  function waitForDetail() {
    if (patchSasaranDetail()) return;
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (patchSasaranDetail() || tries > 120) {
        window.clearInterval(timer);
      }
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForDetail);
  } else {
    waitForDetail();
  }
})(window, document);
