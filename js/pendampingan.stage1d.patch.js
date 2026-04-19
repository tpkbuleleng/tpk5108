
(function (window, document) {
  'use strict';

  var PV = window.PendampinganView;
  if (!PV) return;

  var listCache = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function s(v) {
    return String(v == null ? '' : v).trim();
  }

  function norm(v) {
    return s(v).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  }

  function notify(message, type) {
    var ui = window.UI || null;
    if (ui && typeof ui.showToast === 'function') {
      ui.showToast(message, type || 'info');
      return;
    }
    try { window.alert(message); } catch (_) {}
  }

  function getProfile() {
    if (window.AppState && typeof window.AppState.getProfile === 'function') {
      return window.AppState.getProfile() || {};
    }
    if (window.Storage && typeof window.Storage.getProfile === 'function') {
      return window.Storage.getProfile({}) || {};
    }
    try { return JSON.parse(localStorage.getItem('tpk_profile') || '{}'); } catch (_) { return {}; }
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
    } catch (err) {
      return [];
    }
  }

  function matchSelectorField() {
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
      ) {
        return el;
      }
    }
    return null;
  }

  function buildOptionLabel(item) {
    var nama = s(item.nama_sasaran || item.nama || '-');
    var jenis = s(item.jenis_sasaran || '-');
    var wilayah = [s(item.nama_dusun || item.dusun_rw), s(item.nama_desa || item.desa_kelurahan || item.nama_desa_kelurahan)]
      .filter(Boolean).join(' / ');
    return wilayah ? (nama + ' - ' + jenis + ' - ' + wilayah) : (nama + ' - ' + jenis);
  }

  function setSelectedSasaran(item) {
    var safeItem = item && typeof item === 'object' ? item : {};
    if (window.AppState && typeof window.AppState.setSelectedSasaran === 'function') {
      window.AppState.setSelectedSasaran(safeItem);
    }
    if (window.Storage && typeof window.Storage.set === 'function' && window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS) {
      var key = window.APP_CONFIG.STORAGE_KEYS.SELECTED_SASARAN || 'tpk_selected_sasaran';
      window.Storage.set(key, safeItem);
    }
    try { localStorage.setItem('tpk_selected_sasaran', JSON.stringify(safeItem)); } catch (_) {}
  }

  async function hydrateSelectorIfNeeded() {
    var selector = matchSelectorField();
    if (!selector || String(selector.tagName || '').toLowerCase() !== 'select') return;

    var items = await fetchSasaranList();
    var current = s(selector.value);

    var html = '<option value="">Pilih</option>' + items.map(function (item) {
      var id = s(item.id_sasaran || item.id);
      var label = buildOptionLabel(item)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      var selected = current && current === id ? ' selected' : '';
      return '<option value="' + id + '"' + selected + '>' + label + '</option>';
    }).join('');

    selector.innerHTML = html;

    if (selector.dataset.stage1dBound !== '1') {
      selector.dataset.stage1dBound = '1';
      selector.addEventListener('change', function () {
        var selectedId = s(selector.value);
        var found = (listCache || []).find(function (item) {
          return s(item.id_sasaran || item.id) === selectedId;
        }) || null;

        if (found) {
          setSelectedSasaran(found);
          if (PV.renderHeader) {
            PV.renderHeader({
              id_sasaran: found.id_sasaran || found.id || '',
              id: found.id || found.id_sasaran || '',
              nama_sasaran: found.nama_sasaran || found.nama || '',
              jenis_sasaran: found.jenis_sasaran || '',
              status_sasaran: found.status_sasaran || found.status || 'AKTIF',
              nama_wilayah: found.nama_wilayah || found.wilayah || '',
              nama_kecamatan: found.nama_kecamatan || found.kecamatan || '',
              nama_desa: found.nama_desa || found.desa_kelurahan || found.nama_desa_kelurahan || '',
              nama_dusun: found.nama_dusun || found.dusun_rw || ''
            });
          }
          if (PV.renderValidation) PV.renderValidation();
        }
      });
    }
  }

  var origLoad = PV.loadDynamicFields;
  PV.loadDynamicFields = async function () {
    var out = await origLoad.apply(this, arguments);
    try { await hydrateSelectorIfNeeded(); } catch (_) {}
    return out;
  };

  var origCollect = PV.collectFormData;
  PV.collectFormData = function () {
    var data = origCollect.apply(this, arguments);
    var selector = matchSelectorField();
    var selectedId = s(data && data.id_sasaran);

    if (!selectedId && selector) {
      selectedId = s(selector.value);
      if (selectedId) {
        data.id_sasaran = selectedId;
        var found = (listCache || []).find(function (item) {
          return s(item.id_sasaran || item.id) === selectedId;
        }) || null;
        if (found) {
          data.nama_sasaran = data.nama_sasaran || s(found.nama_sasaran || found.nama);
          data.jenis_sasaran = data.jenis_sasaran || s(found.jenis_sasaran);
          data.form_id = data.form_id || (window.APP_CONFIG && window.APP_CONFIG.FORM_IDS && window.APP_CONFIG.FORM_IDS[s(found.jenis_sasaran).toUpperCase()]) || data.form_id;
          data.id_tim = data.id_tim || s(found.id_tim);
          data.nama_kecamatan = data.nama_kecamatan || s(found.nama_kecamatan || found.kecamatan);
          data.nama_desa = data.nama_desa || s(found.nama_desa || found.desa_kelurahan || found.nama_desa_kelurahan);
          data.nama_dusun = data.nama_dusun || s(found.nama_dusun || found.dusun_rw);
        }
      }
    }

    return data;
  };

  if (document.readyState !== 'loading') {
    hydrateSelectorIfNeeded().catch(function () {});
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      hydrateSelectorIfNeeded().catch(function () {});
    });
  }

  // helper for manual refresh from console if needed
  window.PendampinganStage1D = {
    refreshSelector: hydrateSelectorIfNeeded
  };
})(window, document);
