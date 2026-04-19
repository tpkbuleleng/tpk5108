
(function (window, document) {
  'use strict';

  var listCache = null;
  var SELECTED_KEY = 'tpk_selected_sasaran';

  function byId(id) { return document.getElementById(id); }
  function s(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }

  function isBadValue(v) {
    var t = s(v);
    return !t || t === '[object Object]' || t === 'null' || t === 'undefined' || t === '-';
  }

  function getSelected() {
    if (window.AppState && typeof window.AppState.getSelectedSasaran === 'function') {
      var fromState = window.AppState.getSelectedSasaran() || {};
      if (fromState && Object.keys(fromState).length) return fromState;
    }
    if (window.Storage && typeof window.Storage.get === 'function' && window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS) {
      var key = window.APP_CONFIG.STORAGE_KEYS.SELECTED_SASARAN || SELECTED_KEY;
      var fromStorage = window.Storage.get(key, {}) || {};
      if (fromStorage && Object.keys(fromStorage).length) return fromStorage;
    }
    try { return JSON.parse(localStorage.getItem(SELECTED_KEY) || '{}'); } catch (_) { return {}; }
  }

  function setSelected(item) {
    var safe = item && typeof item === 'object' ? item : {};
    if (window.AppState && typeof window.AppState.setSelectedSasaran === 'function') {
      window.AppState.setSelectedSasaran(safe);
    }
    if (window.Storage && typeof window.Storage.set === 'function' && window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS) {
      var key = window.APP_CONFIG.STORAGE_KEYS.SELECTED_SASARAN || SELECTED_KEY;
      window.Storage.set(key, safe);
    }
    try { localStorage.setItem(SELECTED_KEY, JSON.stringify(safe)); } catch (_) {}
  }

  function getProfile() {
    if (window.AppState && typeof window.AppState.getProfile === 'function') {
      return window.AppState.getProfile() || {};
    }
    try { return JSON.parse(localStorage.getItem('tpk_profile') || '{}'); } catch (_) { return {}; }
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

  function norm(v) {
    return s(v).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  }

  function getCachedSasaranList() {
    if (window.AppState && typeof window.AppState.getSasaranList === 'function') {
      var fromState = window.AppState.getSasaranList();
      if (Array.isArray(fromState) && fromState.length) return fromState;
    }
    try {
      var raw = JSON.parse(localStorage.getItem('tpk_sasaran_cache_v1') || '{}');
      if (Array.isArray(raw.items) && raw.items.length) return raw.items;
    } catch (_) {}
    return [];
  }

  async function fetchSasaranList() {
    if (Array.isArray(listCache) && listCache.length) return listCache;

    var cached = getCachedSasaranList();
    if (cached.length) {
      listCache = cached.slice();
      return listCache;
    }

    var api = window.Api || null;
    if (!api || typeof api.post !== 'function') return [];

    var profile = getProfile();
    var payload = {
      id_tim: s(profile.id_tim),
      book_key: s(profile.kode_kecamatan || profile.book_key || '').toUpperCase()
    };
    if (!payload.id_tim) return [];

    try {
      var result = await api.post('getSasaranByTim', payload);
      var data = result && result.data;
      var items = Array.isArray(data && data.items) ? data.items : (Array.isArray(data) ? data : []);
      listCache = items.slice();
      return listCache;
    } catch (_) {
      return [];
    }
  }

  function findSelectorField() {
    var container = byId('pendampingan-dynamic-fields');
    if (!container) return null;

    var nodes = container.querySelectorAll('[data-dynamic-field], select, input');
    for (var i = 0; i < nodes.length; i += 1) {
      var el = nodes[i];
      var code = norm(el.getAttribute('data-dynamic-field') || el.name || el.id || '');
      var labelEl = el.closest('.form-group') ? el.closest('.form-group').querySelector('label') : null;
      var label = s(labelEl && labelEl.textContent).replace(/\*/g, '').trim().toLowerCase();

      if (
        code === 'pilih_sasaran' ||
        code === 'id_sasaran' ||
        code === 'id_sasaran_ref' ||
        code === 'sasaran' ||
        label === 'pilih sasaran' ||
        label === 'sasaran'
      ) return el;
    }
    return null;
  }

  function buildOptionLabel(item) {
    var nama = s(item.nama_sasaran || item.nama || '-');
    var jenis = s(item.jenis_sasaran || '-');
    var wilayah = [
      s(item.nama_dusun || item.dusun_rw),
      s(item.nama_desa || item.desa_kelurahan || item.nama_desa_kelurahan)
    ].filter(Boolean).join(' / ');
    return wilayah ? (nama + ' - ' + jenis + ' - ' + wilayah) : (nama + ' - ' + jenis);
  }

  async function patchSelectorField() {
    var selected = getSelected();
    var selectedId = s(selected.id_sasaran || selected.id);
    var selector = findSelectorField();
    if (!selector) return;

    var group = selector.closest('.form-group');
    var card = selector.closest('.dynamic-field-card');

    if (selectedId) {
      if (String(selector.tagName || '').toLowerCase() === 'select') {
        selector.innerHTML = '<option value="' + selectedId.replace(/"/g, '&quot;') + '">' +
          buildOptionLabel(selected).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') +
          '</option>';
        selector.value = selectedId;
      } else {
        selector.value = selectedId;
      }
      selector.disabled = true;
      if (card) card.classList.add('hidden');
      else if (group) group.classList.add('hidden');
      return;
    }

    var items = await fetchSasaranList();
    if (String(selector.tagName || '').toLowerCase() !== 'select') return;

    var html = '<option value="">Pilih</option>' + items.map(function (item) {
      var id = s(item.id_sasaran || item.id);
      var label = buildOptionLabel(item)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      return '<option value="' + id + '">' + label + '</option>';
    }).join('');
    selector.innerHTML = html;
    selector.disabled = false;

    if (card) card.classList.remove('hidden');
    else if (group) group.classList.remove('hidden');

    if (selector.dataset.stage2aBound !== '1') {
      selector.dataset.stage2aBound = '1';
      selector.addEventListener('change', function () {
        var id = s(selector.value);
        var found = (listCache || []).find(function (item) {
          return s(item.id_sasaran || item.id) === id;
        }) || null;
        if (found) setSelected(found);
      });
    }
  }

  function patchPendampinganDom() {
    var selected = getSelected();
    var wilayah = wilayahString(selected);
    var el = byId('pendampingan-wilayah');
    if (el) el.textContent = wilayah;
  }

  function patchPendampinganView() {
    var PV = window.PendampinganView;
    if (!PV || PV.__stage2aPatched) return false;
    PV.__stage2aPatched = true;

    var origRenderHeader = PV.renderHeader;
    PV.renderHeader = function (item) {
      var safe = item && typeof item === 'object' ? Object.assign({}, item) : {};
      safe.nama_wilayah = wilayahString(safe);
      var out = origRenderHeader.call(this, safe);
      patchPendampinganDom();
      return out;
    };

    var origLoad = PV.loadDynamicFields;
    PV.loadDynamicFields = async function () {
      var out = await origLoad.apply(this, arguments);
      await patchSelectorField();
      patchPendampinganDom();
      return out;
    };

    var origOpenCreate = PV.openCreate;
    if (typeof origOpenCreate === 'function') {
      PV.openCreate = async function () {
        var out = await origOpenCreate.apply(this, arguments);
        await patchSelectorField();
        patchPendampinganDom();
        return out;
      };
    }

    var origOpenEdit = PV.openEditById;
    if (typeof origOpenEdit === 'function') {
      PV.openEditById = async function () {
        var out = await origOpenEdit.apply(this, arguments);
        await patchSelectorField();
        patchPendampinganDom();
        return out;
      };
    }

    var origCollect = PV.collectFormData;
    PV.collectFormData = function () {
      var data = origCollect.apply(this, arguments);
      var selected = getSelected();
      var selector = findSelectorField();
      var selectedId = s(data && data.id_sasaran) || s(selector && selector.value) || s(selected.id_sasaran || selected.id);

      if (selectedId) {
        data.id_sasaran = selectedId;
        var found = (listCache || []).find(function (item) {
          return s(item.id_sasaran || item.id) === selectedId;
        }) || selected || null;

        if (found) {
          setSelected(found);
          data.nama_sasaran = data.nama_sasaran || s(found.nama_sasaran || found.nama);
          data.jenis_sasaran = data.jenis_sasaran || s(found.jenis_sasaran);
          if (!data.form_id && window.APP_CONFIG && window.APP_CONFIG.FORM_IDS) {
            data.form_id = window.APP_CONFIG.FORM_IDS[s(found.jenis_sasaran).toUpperCase()] || data.form_id;
          }
          data.id_tim = data.id_tim || s(found.id_tim);
          data.nama_kecamatan = data.nama_kecamatan || s(found.nama_kecamatan || found.kecamatan);
          data.nama_desa = data.nama_desa || s(found.nama_desa || found.desa_kelurahan || found.nama_desa_kelurahan);
          data.nama_dusun = data.nama_dusun || s(found.nama_dusun || found.dusun_rw);
        }
      }

      return data;
    };

    setTimeout(function () {
      patchSelectorField().catch(function () {});
      patchPendampinganDom();
    }, 0);

    return true;
  }

  function waitForPendampingan() {
    if (patchPendampinganView()) return;
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (patchPendampinganView() || tries > 120) {
        window.clearInterval(timer);
      }
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForPendampingan);
  } else {
    waitForPendampingan();
  }
})(window, document);
