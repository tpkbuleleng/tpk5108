(function (window, document) {
  'use strict';

  var PATCH_FLAG = '__tpkRegistrasiStage1CPatched';
  var REG_DRAFT_KEY = 'tpk_registrasi_draft_v_final';

  function byId(id) {
    return document.getElementById(id);
  }

  function getMode() {
    var badge = byId('registrasi-mode-badge');
    var text = String((badge && badge.textContent) || '').toUpperCase();
    return text.indexOf('EDIT') >= 0 ? 'edit' : 'create';
  }

  function getApiAction(name, fallback) {
    var cfg = window.APP_CONFIG || {};
    var actions = cfg.API_ACTIONS || {};
    return String(actions[name] || fallback || '');
  }

  function showToast(message, type) {
    if (window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(message, type || 'info');
      return;
    }
    try {
      window.alert(message);
    } catch (err) {}
  }

  function clearRegistrasiDraftLocal() {
    try {
      if (window.Storage && typeof window.Storage.remove === 'function') {
        window.Storage.remove(REG_DRAFT_KEY);
      }
      window.localStorage.removeItem(REG_DRAFT_KEY);
    } catch (err) {}
  }

  function setRegistrasiModeCreate() {
    try {
      if (window.RegistrasiState && typeof window.RegistrasiState.setMode === 'function') {
        window.RegistrasiState.setMode('create');
      }
      if (window.RegistrasiState && typeof window.RegistrasiState.clearEditItem === 'function') {
        window.RegistrasiState.clearEditItem();
      }
    } catch (err) {}
  }

  async function enqueueFormal(action, payload, meta) {
    if (window.QueueRepo && typeof window.QueueRepo.enqueue === 'function') {
      return window.QueueRepo.enqueue(action, payload, Object.assign({
        entity_type: 'sasaran',
        entity_id_local: String(payload.client_submit_id || ''),
        sync_source: 'OFFLINE_QUEUE'
      }, meta || {}));
    }

    var legacyKey = 'tpk_sync_queue_v1';
    var queue = [];
    try {
      queue = JSON.parse(window.localStorage.getItem(legacyKey) || '[]');
      if (!Array.isArray(queue)) queue = [];
    } catch (err) {
      queue = [];
    }

    queue.push({
      action: action,
      created_at: new Date().toISOString(),
      sync_status: 'PENDING',
      payload: Object.assign({}, payload, { sync_source: 'OFFLINE_QUEUE' })
    });

    window.localStorage.setItem(legacyKey, JSON.stringify(queue));
    return { ok: true, legacy: true };
  }

  function patchRegistrasi() {
    var RF = window.RegistrasiForm;
    if (!RF || RF[PATCH_FLAG]) return false;

    var originalSubmit = RF.submit;

    RF.submit = async function () {
      var mode = getMode();
      var isOnline = !(typeof navigator !== 'undefined' && navigator.onLine === false);

      if (isOnline || mode !== 'create') {
        return originalSubmit.apply(this, arguments);
      }

      var data = this.collectFormData();
      var issues = this.validate(data) || [];
      var hasError = issues.some(function (item) {
        return item && item.type === 'error';
      });

      this.renderValidation();

      if (hasError) {
        showToast('Periksa kembali form registrasi.', 'warning');
        return;
      }

      var payload = this.buildPayload(data, 'create');
      payload.sync_source = 'OFFLINE_QUEUE';

      if (window.UI && typeof window.UI.setLoading === 'function') {
        window.UI.setLoading('btn-submit-registrasi', true, 'Mengantrikan...');
      } else {
        var btn = byId('btn-submit-registrasi');
        if (btn) {
          btn.disabled = true;
          btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
          btn.textContent = 'Mengantrikan...';
        }
      }

      try {
        await enqueueFormal(getApiAction('REGISTER_SASARAN', 'registerSasaran'), payload, {
          client_submit_id: String(payload.client_submit_id || ''),
          id_tim: String(data.id_tim || ''),
          id_user: String((window.AppState && window.AppState.getProfile && (window.AppState.getProfile() || {}).id_user) || '')
        });

        clearRegistrasiDraftLocal();
        setRegistrasiModeCreate();

        if (typeof this.resetForm === 'function') this.resetForm();
        if (typeof this.applyModeUI === 'function') this.applyModeUI();
        if (typeof this.prefillScope === 'function') {
          try { await this.prefillScope(); } catch (err) {}
        }
        if (typeof this.renderValidation === 'function') this.renderValidation();

        showToast('Sedang offline. Registrasi dimasukkan ke antrean sinkronisasi.', 'success');

        if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go('sync');
        }
      } catch (err) {
        showToast((err && err.message) || 'Gagal memasukkan registrasi ke antrean.', 'error');
      } finally {
        if (window.UI && typeof window.UI.setLoading === 'function') {
          window.UI.setLoading('btn-submit-registrasi', false);
        } else {
          var btn = byId('btn-submit-registrasi');
          if (btn) {
            btn.disabled = false;
            btn.textContent = btn.dataset.originalText || 'Submit Registrasi';
          }
        }
      }
    };

    RF[PATCH_FLAG] = true;
    return true;
  }

  function waitAndPatch() {
    if (patchRegistrasi()) return;
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (patchRegistrasi() || tries > 120) {
        window.clearInterval(timer);
      }
    }, 500);
  }

  waitAndPatch();
})(window, document);
