
(function (window, document) {
  'use strict';

  var SELECTED_KEY = 'tpk_selected_sasaran';

  function byId(id) { return document.getElementById(id); }
  function s(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function norm(v) {
    return s(v).toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
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

  function hideSelectorBlock(el) {
    if (!el) return;

    var group = el.closest('.form-group');
    if (group) {
      group.style.display = 'none';
      return;
    }

    el.style.display = 'none';
    if (el.previousElementSibling && String(el.previousElementSibling.tagName || '').toLowerCase() === 'label') {
      el.previousElementSibling.style.display = 'none';
    }
    if (el.nextElementSibling && String(el.nextElementSibling.tagName || '').toLowerCase() === 'small') {
      el.nextElementSibling.style.display = 'none';
    }
  }

  function showSelectorBlock(el) {
    if (!el) return;

    var group = el.closest('.form-group');
    if (group) {
      group.style.display = '';
      return;
    }

    el.style.display = '';
    if (el.previousElementSibling && String(el.previousElementSibling.tagName || '').toLowerCase() === 'label') {
      el.previousElementSibling.style.display = '';
    }
    if (el.nextElementSibling && String(el.nextElementSibling.tagName || '').toLowerCase() === 'small') {
      el.nextElementSibling.style.display = '';
    }
  }

  function applySelectorVisibility() {
    var selected = getSelected();
    var selectedId = s(selected.id_sasaran || selected.id);
    var selector = findSelectorField();
    if (!selector) return false;

    if (selectedId) {
      if (String(selector.tagName || '').toLowerCase() === 'select') {
        selector.innerHTML = '<option value="' + selectedId.replace(/"/g, '&quot;') + '">' +
          buildOptionLabel(selected)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;') +
          '</option>';
      }
      selector.value = selectedId;
      selector.disabled = true;
      selector.removeAttribute('required');
      hideSelectorBlock(selector);
    } else {
      selector.disabled = false;
      showSelectorBlock(selector);
    }

    return true;
  }

  function retryApplyVisibility() {
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      var ok = applySelectorVisibility();
      if (ok || tries > 15) {
        window.clearInterval(timer);
      }
    }, 250);
  }

  function patchPendampingan() {
    var PV = window.PendampinganView;
    if (!PV || PV.__stage2bPatched) return false;
    PV.__stage2bPatched = true;

    var origLoad = PV.loadDynamicFields;
    PV.loadDynamicFields = async function () {
      var out = await origLoad.apply(this, arguments);
      retryApplyVisibility();
      return out;
    };

    var origOpenCreate = PV.openCreate;
    if (typeof origOpenCreate === 'function') {
      PV.openCreate = async function () {
        var out = await origOpenCreate.apply(this, arguments);
        retryApplyVisibility();
        return out;
      };
    }

    var origOpenEditById = PV.openEditById;
    if (typeof origOpenEditById === 'function') {
      PV.openEditById = async function () {
        var out = await origOpenEditById.apply(this, arguments);
        retryApplyVisibility();
        return out;
      };
    }

    setTimeout(retryApplyVisibility, 0);
    return true;
  }

  function waitForPendampingan() {
    if (patchPendampingan()) return;
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (patchPendampingan() || tries > 120) {
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
