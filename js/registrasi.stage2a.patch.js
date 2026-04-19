
(function (window, document) {
  'use strict';

  var DRAFT_KEY = 'tpk_registrasi_draft_v_final';

  function byId(id) { return document.getElementById(id); }
  function s(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }

  function notify(message, type) {
    var ui = window.UI || null;
    if (ui && typeof ui.showToast === 'function') {
      ui.showToast(message, type || 'info');
      return;
    }
    try { window.alert(message); } catch (_) {}
  }

  function writeDraft(data) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        saved_at: new Date().toISOString(),
        data: data || {}
      }));
      return true;
    } catch (err) {
      return false;
    }
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
  }

  function isButtonText(btn, target) {
    return s(btn && btn.textContent).toLowerCase() === String(target || '').toLowerCase();
  }

  function findSaveButton() {
    return byId('btn-save-reg-draft') ||
      Array.from(document.querySelectorAll('button')).find(function (btn) { return isButtonText(btn, 'Simpan Draft'); }) ||
      null;
  }

  function findResetButton() {
    return byId('btn-reset-registrasi') ||
      Array.from(document.querySelectorAll('button')).find(function (btn) { return isButtonText(btn, 'Reset'); }) ||
      null;
  }

  function bindButtons(RF) {
    var btnSave = findSaveButton();
    if (btnSave && btnSave.dataset.stage2aBound !== '1') {
      btnSave.dataset.stage2aBound = '1';
      btnSave.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        try {
          var data = RF && typeof RF.collectFormData === 'function' ? RF.collectFormData() : {};
          if (writeDraft(data)) {
            notify('Draft registrasi disimpan.', 'success');
          } else {
            notify('Draft registrasi gagal disimpan.', 'warning');
          }
        } catch (err) {
          notify((err && err.message) || 'Draft registrasi gagal disimpan.', 'warning');
        }
      }, true);
    }

    var btnReset = findResetButton();
    if (btnReset && btnReset.dataset.stage2aBound !== '1') {
      btnReset.dataset.stage2aBound = '1';
      btnReset.addEventListener('click', async function (event) {
        event.preventDefault();
        event.stopPropagation();
        try {
          clearDraft();
          if (RF && typeof RF.resetForm === 'function') RF.resetForm();
          if (RF && typeof RF.applyModeUI === 'function') RF.applyModeUI();
          if (RF && typeof RF.prefillScope === 'function') await RF.prefillScope();
          if (RF && typeof RF.renderValidation === 'function') RF.renderValidation();
          notify('Form registrasi direset.', 'info');
        } catch (err) {
          notify((err && err.message) || 'Gagal mereset form registrasi.', 'warning');
        }
      }, true);
    }
  }

  function patchRegistrasiForm() {
    var RF = window.RegistrasiForm;
    if (!RF || RF.__stage2aPatched) return false;
    RF.__stage2aPatched = true;

    var origInit = RF.init;
    RF.init = function () {
      var out = origInit ? origInit.apply(this, arguments) : undefined;
      bindButtons(RF);
      return out;
    };

    var origOpenCreate = RF.openCreate;
    if (typeof origOpenCreate === 'function') {
      RF.openCreate = async function () {
        var out = await origOpenCreate.apply(this, arguments);
        bindButtons(RF);
        return out;
      };
    }

    var origOpenEdit = RF.openEdit;
    if (typeof origOpenEdit === 'function') {
      RF.openEdit = async function () {
        var out = await origOpenEdit.apply(this, arguments);
        bindButtons(RF);
        return out;
      };
    }

    bindButtons(RF);
    return true;
  }

  function waitForRegistrasi() {
    if (patchRegistrasiForm()) return;
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (patchRegistrasiForm() || tries > 120) {
        window.clearInterval(timer);
      }
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForRegistrasi);
  } else {
    waitForRegistrasi();
  }
})(window, document);
