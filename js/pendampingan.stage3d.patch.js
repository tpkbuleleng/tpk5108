
(function (window, document) {
  'use strict';

  function byId(id) { return document.getElementById(id); }
  function s(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function norm(v) {
    return s(v).toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[_\-]+/g, ' ')
      .trim();
  }

  function findDynamicContainer() {
    return byId('pendampingan-dynamic-fields');
  }

  function findGroups() {
    var root = findDynamicContainer();
    if (!root) return [];
    return Array.from(root.querySelectorAll('.form-group'));
  }

  function groupLabel(group) {
    var label = group ? group.querySelector('label') : null;
    return norm(label && label.textContent).replace(/\*/g, '').trim();
  }

  function groupInput(group) {
    return group ? group.querySelector('select, input, textarea') : null;
  }

  function findGroupByKeywords(keywords) {
    var wants = (keywords || []).map(norm);
    var groups = findGroups();
    for (var i = 0; i < groups.length; i += 1) {
      var text = groupLabel(groups[i]);
      for (var j = 0; j < wants.length; j += 1) {
        if (text.indexOf(wants[j]) >= 0) return groups[i];
      }
    }
    return null;
  }

  function getValue(group) {
    var input = groupInput(group);
    if (!input) return '';
    if (input.type === 'checkbox') return input.checked ? 'Ya' : '';
    return s(input.value);
  }

  function setVisible(group, visible) {
    if (!group) return;
    group.style.display = visible ? '' : 'none';
    var input = groupInput(group);
    if (!input) return;
    input.disabled = !visible;
    if (!visible) {
      if (input.tagName === 'SELECT') input.value = '';
      else if (input.type === 'checkbox') input.checked = false;
      else if (!input.readOnly) input.value = '';
    }
  }

  function setSelectOptions(group, options) {
    var input = groupInput(group);
    if (!input || input.tagName !== 'SELECT') return;
    var current = s(input.value);
    input.innerHTML = '<option value="">Pilih</option>' + (options || []).map(function (opt) {
      var value = typeof opt === 'object' ? s(opt.value || opt.label) : s(opt);
      var label = typeof opt === 'object' ? s(opt.label || opt.value) : s(opt);
      var selected = current === value ? ' selected' : '';
      return '<option value="' +
        value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') +
        '"' + selected + '>' +
        label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
        '</option>';
    }).join('');
    if (current && !options.some(function (opt) {
      var value = typeof opt === 'object' ? s(opt.value || opt.label) : s(opt);
      return value === current;
    })) {
      input.value = '';
    }
  }

  function clampNumberInput(group, cfg) {
    var input = groupInput(group);
    if (!input) return;
    input.type = 'number';
    input.inputMode = 'decimal';
    if (cfg.step != null) input.step = String(cfg.step);
    if (cfg.min != null) input.min = String(cfg.min);
    if (cfg.max != null) input.max = String(cfg.max);
    if (cfg.placeholder) input.placeholder = cfg.placeholder;

    if (input.dataset.stage3dBound !== '1') {
      input.dataset.stage3dBound = '1';
      input.addEventListener('change', function () {
        normalizeNumberValue(input, cfg);
      });
      input.addEventListener('blur', function () {
        normalizeNumberValue(input, cfg);
      });
    }
  }

  function normalizeNumberValue(input, cfg) {
    if (!input) return;
    var raw = s(input.value).replace(',', '.');
    if (!raw) return;
    var num = parseFloat(raw);
    if (isNaN(num)) {
      input.value = '';
      return;
    }
    if (cfg.min != null && num < cfg.min) num = cfg.min;
    if (cfg.max != null && num > cfg.max) num = cfg.max;

    if (cfg.step === 1) {
      input.value = String(Math.round(num));
    } else {
      var digits = cfg.step && String(cfg.step).indexOf('.') >= 0 ? String(cfg.step).split('.')[1].length : 2;
      input.value = num.toFixed(digits).replace(/\.00$/, '');
    }
  }

  function applyAdvancedRules() {
    var gJenisJkn = findGroupByKeywords(['jenis jkn']);
    var gKepesertaanJkn = findGroupByKeywords(['kepesertaan jkn']);
    var gJenisBansos = findGroupByKeywords(['jenis bansos', 'bansos yang difasilitasi']);
    var gPemberianBansos = findGroupByKeywords(['pemberian bansos', 'pemberian fasilitas bansos']);
    var gFreqMbg = findGroupByKeywords(['frekuensi mbg', 'frekuensi sasaran menerima mbg']);
    var gMenuBasah = findGroupByKeywords(['frekuensi menu basah', 'menu makanan basah']);
    var gUpf = findGroupByKeywords(['pemberian makanan upf', 'makanan upf']);
    var gDistribusi = findGroupByKeywords(['frekuensi distribusi mbg', 'distribusi mbg oleh tpk']);
    var gMbgDiterima = findGroupByKeywords(['mbg diterima', 'sasaran menerima mbg', 'terima mbg']);
    var gKadarHb = findGroupByKeywords(['kadar hb']);
    var gPeriksaHb = findGroupByKeywords(['periksa hb', 'melakukan pemeriksaan hb']);
    var gMinumTtd = findGroupByKeywords(['sudah meminum ttd', 'minum ttd']);
    var gDapatTtd = findGroupByKeywords(['sudah mendapatkan ttd', 'dapat ttd']);
    var gHasilTbjj = findGroupByKeywords(['hasil tbjj']);
    var gPeriksaTbjj = findGroupByKeywords(['melakukan pengukuran tbjj', 'periksa tbjj']);
    var gHasilTfu = findGroupByKeywords(['hasil tfu']);
    var gPeriksaTfu = findGroupByKeywords(['melakukan pengukuran tfu', 'periksa tfu']);
    var gJenisKb = findGroupByKeywords(['jenis kb']);
    var gKbPasca = findGroupByKeywords(['kb pasca persalinan']);

    setSelectOptions(gJenisJkn, ['BPJS PBI', 'BPJS Non-PBI', 'Swasta', 'Tidak tahu']);
    setSelectOptions(gJenisBansos, ['PKH', 'BPNT/Sembako', 'BLT', 'Bantuan Lokal Desa', 'Lainnya']);
    setSelectOptions(gFreqMbg, ['1 hari', '2 hari', '3 hari', '4 hari', '5 hari', '6 hari', '7 hari']);
    setSelectOptions(gMenuBasah, ['1 hari', '2 hari', '3 hari', '4 hari', '5 hari', '6 hari', '7 hari']);
    setSelectOptions(gUpf, ['Masih', 'Tidak']);
    setSelectOptions(gDistribusi, ['1 hari', '2 hari', '3 hari', '4 hari', '5 hari', '6 hari', '7 hari']);
    setSelectOptions(gJenisKb, ['Pil', 'Suntik', 'Implan', 'IUD', 'Kondom', 'MOW/MOP', 'Lainnya']);

    setVisible(gJenisJkn, getValue(gKepesertaanJkn) === 'Ya');
    setVisible(gJenisBansos, getValue(gPemberianBansos) === 'Ya, sudah mendapatkan bansos');

    var mbgYes = getValue(gMbgDiterima) === 'Ya';
    setVisible(gFreqMbg, mbgYes);
    setVisible(gMenuBasah, mbgYes);
    setVisible(gUpf, mbgYes);
    setVisible(gDistribusi, mbgYes);

    setVisible(gKadarHb, getValue(gPeriksaHb) === 'Ya');
    setVisible(gMinumTtd, getValue(gDapatTtd) === 'Ya');
    setVisible(gHasilTbjj, getValue(gPeriksaTbjj) === 'Ya');
    setVisible(gHasilTfu, getValue(gPeriksaTfu) === 'Ya');
    setVisible(gJenisKb, getValue(gKbPasca) === 'Ya');

    // numeric locks
    clampNumberInput(findGroupByKeywords(['berat badan saat kunjungan', 'berat badan']), { min: 1, max: 30, step: 0.1, placeholder: 'Masukkan kg' });
    clampNumberInput(findGroupByKeywords(['panjang/tinggi badan saat kunjungan', 'panjang/tinggi badan']), { min: 30, max: 130, step: 0.1, placeholder: 'Masukkan cm' });

    clampNumberInput(findGroupByKeywords(['usia kehamilan']), { min: 1, max: 45, step: 1, placeholder: 'Contoh: 24' });
    clampNumberInput(findGroupByKeywords(['hasil tbjj']), { min: 100, max: 6000, step: 1, placeholder: 'Contoh: 1200' });
    clampNumberInput(findGroupByKeywords(['hasil tfu']), { min: 1, max: 60, step: 0.1, placeholder: 'Contoh: 28' });

    var gBeratBumil = findGroupByKeywords(['berat badan (kg)', 'berat badan']);
    if (gBeratBumil) clampNumberInput(gBeratBumil, { min: 25, max: 200, step: 0.1, placeholder: 'Masukkan kg' });

    var gTinggiBumil = findGroupByKeywords(['tinggi badan (cm)', 'tinggi badan']);
    if (gTinggiBumil) clampNumberInput(gTinggiBumil, { min: 100, max: 220, step: 0.1, placeholder: 'Masukkan cm' });

    clampNumberInput(findGroupByKeywords(['kadar hb']), { min: 1, max: 20, step: 0.1, placeholder: 'Contoh: 11.2' });
    clampNumberInput(findGroupByKeywords(['lila']), { min: 1, max: 60, step: 0.1, placeholder: 'Contoh: 23.5' });

    var gImt = findGroupByKeywords(['imt']);
    var imtInput = groupInput(gImt);
    if (imtInput) {
      imtInput.readOnly = true;
      imtInput.disabled = false;
    }
  }

  function bindRootListeners() {
    var root = findDynamicContainer();
    if (!root || root.dataset.stage3dBound === '1') return;
    root.dataset.stage3dBound = '1';

    root.addEventListener('change', function () {
      window.setTimeout(applyAdvancedRules, 0);
    }, true);

    root.addEventListener('input', function () {
      window.setTimeout(applyAdvancedRules, 0);
    }, true);
  }

  function observeRoot() {
    var root = findDynamicContainer();
    if (!root || root.__stage3dObs) return;
    var obs = new MutationObserver(function () {
      bindRootListeners();
      applyAdvancedRules();
    });
    obs.observe(root, { childList: true, subtree: true });
    root.__stage3dObs = obs;
  }

  function patchPendampingan() {
    var PV = window.PendampinganView;
    if (!PV || PV.__stage3dPatched) return false;
    PV.__stage3dPatched = true;

    var origLoad = PV.loadDynamicFields;
    PV.loadDynamicFields = async function () {
      var out = await origLoad.apply(this, arguments);
      retryApply();
      return out;
    };

    var origOpenCreate = PV.openCreate;
    if (typeof origOpenCreate === 'function') {
      PV.openCreate = async function () {
        var out = await origOpenCreate.apply(this, arguments);
        retryApply();
        return out;
      };
    }

    var origOpenEditById = PV.openEditById;
    if (typeof origOpenEditById === 'function') {
      PV.openEditById = async function () {
        var out = await origOpenEditById.apply(this, arguments);
        retryApply();
        return out;
      };
    }

    retryApply();
    return true;
  }

  function retryApply() {
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      bindRootListeners();
      observeRoot();
      applyAdvancedRules();
      if (findGroups().length > 0 && tries >= 6) window.clearInterval(timer);
      if (tries > 20) window.clearInterval(timer);
    }, 250);
  }

  function waitPatch() {
    if (patchPendampingan()) return;
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (patchPendampingan() || tries > 120) window.clearInterval(timer);
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitPatch);
  } else {
    waitPatch();
  }
})(window, document);
