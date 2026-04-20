
(function (window, document) {
  'use strict';

  function byId(id) { return document.getElementById(id); }
  function s(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }

  function findDynamicGroups() {
    var container = byId('pendampingan-dynamic-fields');
    if (!container) return [];
    return Array.from(container.querySelectorAll('.form-group'));
  }

  function getLabelText(group) {
    var label = group ? group.querySelector('label') : null;
    return s(label && label.textContent).replace(/\*/g, '');
  }

  function findGroupByLabels(labels) {
    var wanted = (labels || []).map(function (x) { return s(x).toLowerCase(); });
    return findDynamicGroups().find(function (group) {
      var text = getLabelText(group).toLowerCase();
      return wanted.indexOf(text) >= 0;
    }) || null;
  }

  function setGroupVisible(group, visible) {
    if (!group) return;
    group.style.display = visible ? '' : 'none';
    var input = group.querySelector('select, input, textarea');
    if (!input) return;
    if (!visible) {
      if (input.tagName === 'SELECT') input.value = '';
      else if (input.type === 'checkbox') input.checked = false;
      else if (!input.readOnly) input.value = '';
    }
  }

  function getSelectedValue(group) {
    if (!group) return '';
    var input = group.querySelector('select, input, textarea');
    if (!input) return '';
    if (input.type === 'checkbox') return input.checked ? 'Ya' : '';
    return s(input.value);
  }

  function setStatusKunjunganOptions() {
    var select = byId('pen-status-kunjungan');
    if (!select) return;

    var current = s(select.value);
    var options = [
      { value: '', label: 'Pilih status' },
      { value: 'Kunjungan Rumah', label: 'Kunjungan Rumah' },
      { value: 'BKB/Posyandu', label: 'BKB/Posyandu' }
    ];

    select.innerHTML = options.map(function (opt) {
      var selected = current === opt.value ? ' selected' : '';
      return '<option value="' +
        String(opt.value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') +
        '"' + selected + '>' +
        String(opt.label).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
        '</option>';
    }).join('');

    if (current && !options.some(function (opt) { return opt.value === current; })) {
      select.value = '';
    }
  }

  function hideLegacyDuplicateFields() {
    setGroupVisible(findGroupByLabels(['Pilih Sasaran']), false);
    setGroupVisible(findGroupByLabels(['Tanggal Pendampingan']), false);
  }

  function applyConditionalRules() {
    var gJkn = findGroupByLabels(['Kepesertaan JKN']);
    var gJenisJkn = findGroupByLabels(['Jenis JKN']);
    var gBansos = findGroupByLabels(['Pemberian Bansos', 'Pemberian fasilitas bansos oleh TPK']);
    var gJenisBansos = findGroupByLabels(['Jenis Bansos', 'Bansos yang difasilitasi']);
    var gMbg = findGroupByLabels(['MBG Diterima', 'Sasaran menerima MBG 3B', 'Terima MBG']);
    var gFreqMbg = findGroupByLabels(['Frekuensi MBG', 'Frekuensi sasaran menerima MBG 3B']);
    var gMenuBasah = findGroupByLabels(['Frekuensi Menu Basah', 'Frekuensi menu makanan basah diterima sasaran']);
    var gUpf = findGroupByLabels(['Pemberian Makanan UPF']);
    var gDistribusi = findGroupByLabels(['Frekuensi Distribusi MBG oleh TPK']);
    var gPeriksaHb = findGroupByLabels(['Periksa HB', 'Melakukan Pemeriksaan HB']);
    var gKadarHb = findGroupByLabels(['Kadar HB']);
    var gDapatTtd = findGroupByLabels(['Sudah Mendapatkan TTD', 'Dapat TTD']);
    var gMinumTtd = findGroupByLabels(['Sudah Meminum TTD', 'Minum TTD']);

    var jknValue = getSelectedValue(gJkn);
    setGroupVisible(gJenisJkn, jknValue === 'Ya');

    var bansosValue = getSelectedValue(gBansos);
    setGroupVisible(gJenisBansos, bansosValue === 'Ya, sudah mendapatkan bansos');

    var mbgValue = getSelectedValue(gMbg);
    var mbgShow = mbgValue === 'Ya';
    setGroupVisible(gFreqMbg, mbgShow);
    setGroupVisible(gMenuBasah, mbgShow);
    setGroupVisible(gUpf, mbgShow);
    setGroupVisible(gDistribusi, mbgShow);

    var hbValue = getSelectedValue(gPeriksaHb);
    setGroupVisible(gKadarHb, hbValue === 'Ya');

    var ttdValue = getSelectedValue(gDapatTtd);
    setGroupVisible(gMinumTtd, ttdValue === 'Ya');
  }

  function bindDynamicRuleListeners() {
    findDynamicGroups().forEach(function (group) {
      var input = group.querySelector('select, input, textarea');
      if (!input || input.dataset.stage3bBound === '1') return;
      input.dataset.stage3bBound = '1';
      input.addEventListener('change', function () {
        applyConditionalRules();
      });
      input.addEventListener('input', function () {
        applyConditionalRules();
      });
    });
  }

  function normalizePendampinganDom() {
    setStatusKunjunganOptions();
    hideLegacyDuplicateFields();
    applyConditionalRules();
    bindDynamicRuleListeners();
  }

  function patchPendampingan() {
    var PV = window.PendampinganView;
    if (!PV || PV.__stage3bPatched) return false;
    PV.__stage3bPatched = true;

    var origLoad = PV.loadDynamicFields;
    PV.loadDynamicFields = async function () {
      var out = await origLoad.apply(this, arguments);
      retryNormalize();
      return out;
    };

    var origOpenCreate = PV.openCreate;
    if (typeof origOpenCreate === 'function') {
      PV.openCreate = async function () {
        var out = await origOpenCreate.apply(this, arguments);
        retryNormalize();
        return out;
      };
    }

    var origOpenEditById = PV.openEditById;
    if (typeof origOpenEditById === 'function') {
      PV.openEditById = async function () {
        var out = await origOpenEditById.apply(this, arguments);
        retryNormalize();
        return out;
      };
    }

    setTimeout(retryNormalize, 0);
    return true;
  }

  function retryNormalize() {
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      normalizePendampinganDom();
      if (findDynamicGroups().length || tries > 20) {
        if (tries > 3) {
          window.clearInterval(timer);
        }
      }
    }, 250);
  }

  function waitPatch() {
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
    document.addEventListener('DOMContentLoaded', waitPatch);
  } else {
    waitPatch();
  }
})(window, document);
