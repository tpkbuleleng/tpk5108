(function (window, document) {
  'use strict';

  var PATCH_FLAG = '__tpkPendampinganStage1CPatched';
  var DRAFT_KEY = 'tpk_pendampingan_draft';

  function byId(id) {
    return document.getElementById(id);
  }

  function getMode() {
    var badge = byId('pendampingan-mode-badge');
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

  function clearPendampinganDraftLocal() {
    try {
      if (window.Storage && typeof window.Storage.remove === 'function') {
        window.Storage.remove(DRAFT_KEY);
      }
      window.localStorage.removeItem(DRAFT_KEY);
    } catch (err) {}
  }

  function resetPendampinganModeCreate() {
    try {
      if (window.AppState && typeof window.AppState.setPendampinganMode === 'function') {
        window.AppState.setPendampinganMode('create');
      }
    } catch (err) {}
  }

  async function enqueueFormal(action, payload, meta) {
    if (window.QueueRepo && typeof window.QueueRepo.enqueue === 'function') {
      return window.QueueRepo.enqueue(action, payload, Object.assign({
        entity_type: 'pendampingan',
        entity_id_local: String(payload.id_sasaran || payload.client_submit_id || ''),
        sync_source: 'OFFLINE_QUEUE'
      }, meta || {}));
    }

    var keys = (window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS) || {};
    var storageKey = keys.SYNC_QUEUE || 'tpk_sync_queue';
    var queue = [];
    try {
      if (window.Storage && typeof window.Storage.get === 'function') {
        queue = window.Storage.get(storageKey, []);
      } else {
        queue = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
      }
      if (!Array.isArray(queue)) queue = [];
    } catch (err) {
      queue = [];
    }

    queue.push({
      id: payload.client_submit_id || ('QUE-' + Date.now()),
      action: action,
      payload: Object.assign({}, payload, { sync_source: 'OFFLINE_QUEUE' }),
      status: 'PENDING',
      sync_status: 'PENDING',
      created_at: new Date().toISOString()
    });

    if (window.Storage && typeof window.Storage.set === 'function') {
      window.Storage.set(storageKey, queue);
    }
    window.localStorage.setItem(storageKey, JSON.stringify(queue));
    if (window.AppState && typeof window.AppState.setSyncQueue === 'function') {
      window.AppState.setSyncQueue(queue);
    }
    return { ok: true, legacy: true };
  }

  function patchPendampingan() {
    var PV = window.PendampinganView;
    if (!PV || PV[PATCH_FLAG]) return false;

    var originalSubmit = PV.submit;

    PV.submit = async function () {
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
        showToast('Periksa kembali form pendampingan.', 'warning');
        return;
      }

      var payload = {
        id_sasaran: data.id_sasaran,
        jenis_sasaran: data.jenis_sasaran,
        form_id: data.form_id,
        nama_sasaran: data.nama_sasaran,
        tanggal_pendampingan: data.tanggal_pendampingan,
        status_kunjungan: data.status_kunjungan,
        catatan_umum: data.catatan_umum,
        id_user: data.id_user,
        id_kader: data.id_kader,
        nama_kader: data.nama_kader,
        id_tim: data.id_tim,
        nama_tim: data.nama_tim,
        nama_kecamatan: data.nama_kecamatan,
        nama_desa: data.nama_desa,
        nama_dusun: data.nama_dusun,
        client_submit_id: data.client_submit_id,
        sync_source: 'OFFLINE_QUEUE',
        extra_fields: data.extra_fields,
        extra_fields_json: JSON.stringify(data.extra_fields || {})
      };

      if (window.UI && typeof window.UI.setLoading === 'function') {
        window.UI.setLoading('btn-submit-pendampingan', true, 'Mengantrikan...');
      } else {
        var btn = byId('btn-submit-pendampingan');
        if (btn) {
          btn.disabled = true;
          btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
          btn.textContent = 'Mengantrikan...';
        }
      }

      try {
        await enqueueFormal(getApiAction('SUBMIT_PENDAMPINGAN', 'submitPendampingan'), payload, {
          client_submit_id: String(payload.client_submit_id || ''),
          id_tim: String(data.id_tim || ''),
          id_user: String(data.id_user || '')
        });

        clearPendampinganDraftLocal();
        resetPendampinganModeCreate();
        if (typeof this.resetForm === 'function') this.resetForm();
        if (typeof this.applyModeUI === 'function') this.applyModeUI();
        if (typeof this.prefillIdentity === 'function') this.prefillIdentity();
        if (typeof this.renderValidation === 'function') this.renderValidation();

        showToast('Sedang offline. Pendampingan dimasukkan ke antrean sinkronisasi.', 'success');

        if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go('sync');
        }
      } catch (err) {
        showToast((err && err.message) || 'Gagal memasukkan pendampingan ke antrean.', 'error');
      } finally {
        if (window.UI && typeof window.UI.setLoading === 'function') {
          window.UI.setLoading('btn-submit-pendampingan', false);
        } else {
          var btn = byId('btn-submit-pendampingan');
          if (btn) {
            btn.disabled = false;
            btn.textContent = btn.dataset.originalText || 'Submit Pendampingan';
          }
        }
      }
    };

    PV[PATCH_FLAG] = true;
    return true;
  }

  function waitAndPatch() {
    if (patchPendampingan()) return;
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (patchPendampingan() || tries > 120) {
        window.clearInterval(timer);
      }
    }, 500);
  }

  waitAndPatch();
})(window, document);
