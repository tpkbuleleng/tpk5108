
(function (window, document) {
  'use strict';

  var RF = window.RegistrasiForm;
  if (!RF) return;

  var DRAFT_KEY = 'tpk_registrasi_draft_v_final';
  var bound = false;

  function byId(id) {
    return document.getElementById(id);
  }

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

  function ensureButtonsBound() {
    if (bound) return;
    bound = true;

    var btnSave = byId('btn-save-reg-draft');
    if (btnSave && btnSave.dataset.stage1dBound !== '1') {
      btnSave.dataset.stage1dBound = '1';
      btnSave.addEventListener('click', function (event) {
        event.preventDefault();
        try {
          var data = RF.collectFormData ? RF.collectFormData() : {};
          if (writeDraft(data)) {
            notify('Draft registrasi disimpan.', 'success');
          } else {
            notify('Draft registrasi gagal disimpan.', 'warning');
          }
        } catch (err) {
          notify((err && err.message) || 'Draft registrasi gagal disimpan.', 'warning');
        }
      });
    }

    var btnReset = byId('btn-reset-registrasi');
    if (btnReset && btnReset.dataset.stage1dBound !== '1') {
      btnReset.dataset.stage1dBound = '1';
      btnReset.addEventListener('click', async function (event) {
        event.preventDefault();
        try {
          clearDraft();
          if (RF.resetForm) RF.resetForm();
          if (RF.applyModeUI) RF.applyModeUI();
          if (RF.prefillScope) {
            await RF.prefillScope();
          }
          if (RF.renderValidation) RF.renderValidation();
          notify('Form registrasi direset.', 'info');
        } catch (err) {
          notify((err && err.message) || 'Gagal mereset form registrasi.', 'warning');
        }
      });
    }
  }

  var origInit = RF.init;
  RF.init = function () {
    var out = origInit ? origInit.apply(this, arguments) : undefined;
    ensureButtonsBound();
    return out;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureButtonsBound);
  } else {
    ensureButtonsBound();
  }
})(window, document);
