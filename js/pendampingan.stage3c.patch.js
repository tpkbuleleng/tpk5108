
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
    if (!input || visible) return;

    if (input.tagName === 'SELECT') {
      input.value = '';
    } else if (input.type === 'checkbox') {
      input.checked = false;
    } else if (!input.readOnly) {
      input.value = '';
    }
  }

  function applyRulesNow() {
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
  }

  function bindDelegatedListeners() {
    var root = findDynamicContainer();
    if (!root || root.dataset.stage3cBound === '1') return;
    root.dataset.stage3cBound = '1';

    root.addEventListener('change', function () {
      window.setTimeout(applyRulesNow, 0);
    }, true);

    root.addEventListener('input', function () {
      window.setTimeout(applyRulesNow, 0);
    }, true);
  }

  function observeDomChanges() {
    var root = findDynamicContainer();
    if (!root || root.__stage3cObserver) return;
    var obs = new MutationObserver(function () {
      bindDelegatedListeners();
      applyRulesNow();
    });
    obs.observe(root, { childList: true, subtree: true });
    root.__stage3cObserver = obs;
  }

  function patchPendampinganStage3c() {
    var PV = window.PendampinganView;
    if (!PV || PV.__stage3cPatched) return false;
    PV.__stage3cPatched = true;

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
      bindDelegatedListeners();
      observeDomChanges();
      applyRulesNow();
      if (findGroups().length > 0 && tries >= 6) {
        window.clearInterval(timer);
      }
      if (tries > 20) {
        window.clearInterval(timer);
      }
    }, 250);
  }

  function waitPatch() {
    if (patchPendampinganStage3c()) return;
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (patchPendampinganStage3c() || tries > 120) {
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
