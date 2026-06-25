
(function (window, document) {
  'use strict';

  var VIEW_VERSION = 'HARGANAS-1-VIEW-20260625';
  var bound = false;

  function byId(id) { return document.getElementById(id); }
  function getRouter() { return window.Router || null; }
  function getDraftService() { return window.HarganasDraftService || null; }
  function getValidationService() { return window.HarganasValidationService || null; }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setText(id, value, fallback) {
    var el = byId(id);
    if (!el) return;
    el.textContent = value === undefined || value === null || value === '' ? (fallback !== undefined ? fallback : '-') : String(value);
  }

  function setValue(id, value) {
    var el = byId(id);
    if (!el) return;
    el.value = value === undefined || value === null ? '' : String(value);
  }

  function showMessage(message, type) {
    var box = byId('harganas-validation-message');
    if (!box) return;
    box.textContent = message || '';
    box.classList.remove('hidden', 'error', 'success');
    box.classList.add(type === 'success' ? 'success' : 'error');
  }

  function clearMessage() {
    var box = byId('harganas-validation-message');
    if (!box) return;
    box.textContent = '';
    box.classList.add('hidden');
    box.classList.remove('error', 'success');
  }

  function showToast(message, type) {
    if (window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(message, type || 'info');
      return;
    }
    try { window.alert(message); } catch (err) {}
  }

  function setBadge(status) {
    var badge = byId('harganas-status-badge');
    if (!badge) return;
    var text = String(status || 'DRAFT').toUpperCase();
    badge.textContent = text;
    badge.classList.remove('badge-success', 'badge-warning', 'badge-error', 'badge-success-soft');
    if (text === 'DRAFT') badge.classList.add('badge-warning');
    else if (text === 'READY_TO_SUBMIT') badge.classList.add('badge-success-soft');
    else badge.classList.add('badge-warning');
  }

  function setMediaStatus(mediaStatus) {
    var s = mediaStatus || {};
    setText('harganas-status-portrait', s.portrait ? 'Sudah' : 'Belum');
    setText('harganas-status-landscape', s.landscape ? 'Sudah' : 'Belum');
    setText('harganas-status-video', s.video ? 'Sudah' : 'Belum');
    setText('harganas-status-gps', s.gps ? 'Sudah' : 'Belum');
  }

  function formatEventDate(value) {
    var raw = String(value || '2026-06-29');
    var parts = raw.split('-');
    if (parts.length === 3 && parts[0] === '2026' && parts[1] === '06' && parts[2] === '29') {
      return '29 Juni 2026';
    }
    return raw;
  }

  function collectForm() {
    return {
      jenis_sasaran: (byId('harganas-jenis-sasaran') || {}).value || '',
      nama_sasaran: (byId('harganas-nama-sasaran') || {}).value || '',
      nik_sasaran: (byId('harganas-nik-sasaran') || {}).value || '',
      tanggal_lahir: (byId('harganas-tanggal-lahir') || {}).value || '',
      nama_kk: (byId('harganas-nama-kk') || {}).value || '',
      nama_ibu_kandung: (byId('harganas-nama-ibu-kandung') || {}).value || ''
    };
  }

  function fillForm(draft) {
    var data = draft || {};
    setValue('harganas-jenis-sasaran', data.jenis_sasaran || '');
    setValue('harganas-nama-sasaran', data.nama_sasaran || '');
    setValue('harganas-nik-sasaran', data.nik_sasaran || data.nik || '');
    setValue('harganas-tanggal-lahir', data.tanggal_lahir || '');
    setValue('harganas-nama-kk', data.nama_kk || data.nama_kepala_keluarga || '');
    setValue('harganas-nama-ibu-kandung', data.nama_ibu_kandung || '');
    toggleIbuKandung();
  }

  function updateSummary(draft) {
    var data = draft || {};
    var ds = getDraftService();
    var profile = ds && typeof ds.normalizeProfile === 'function' ? ds.normalizeProfile() : {};
    var eventDate = data.event_date || (ds && ds.getEventConfig ? ds.getEventConfig().event_date : '2026-06-29');

    setText('harganas-profile-tim', profile.nomor_tim || data.nomor_tim || '-');
    setText('harganas-profile-desa', profile.desa || data.desa || '-');
    setText('harganas-profile-kecamatan', profile.kecamatan || data.kecamatan || '-');
    setText('harganas-event-date-label', formatEventDate(eventDate));
    setBadge(data.status_submission || 'DRAFT');
    setMediaStatus(data.media_status || {});

    setText('harganas-baduta-priority', data.is_baduta_prioritas === true ? 'YA' : (data.jenis_sasaran === 'BALITA' ? 'TIDAK' : '-'));
    setText('harganas-age-label', data.age_label_at_event || '-');
    setText('harganas-draft-status', data.nama_sasaran ? 'Tersimpan lokal' : 'Belum tersimpan');
    setText('harganas-updated-at', data.updated_at_local ? new Date(data.updated_at_local).toLocaleString('id-ID') : '-');

    var summary = byId('harganas-draft-summary');
    if (summary) {
      if (data.nama_sasaran) {
        summary.innerHTML = 'Draft tersimpan untuk <strong>' + escapeHtml(data.nama_sasaran) + '</strong> (' + escapeHtml(data.jenis_sasaran || '-') + ').';
      } else {
        summary.textContent = 'Belum ada draft tersimpan.';
      }
    }
  }

  function toggleIbuKandung() {
    var select = byId('harganas-jenis-sasaran');
    var group = byId('harganas-group-ibu-kandung');
    var input = byId('harganas-nama-ibu-kandung');
    var isBalita = String(select && select.value || '').toUpperCase() === 'BALITA';
    if (group) group.classList.toggle('hidden', !isBalita);
    if (input) input.required = isBalita;
  }

  function saveDraft(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    clearMessage();

    var validator = getValidationService();
    var ds = getDraftService();
    if (!validator || !ds) {
      showMessage('Service HARGANAS belum termuat. Perbarui aplikasi lalu coba lagi.', 'error');
      return;
    }

    var eventCfg = ds.getEventConfig ? ds.getEventConfig() : { event_date: '2026-06-29' };
    var result = validator.validateDraft(collectForm(), { eventDate: eventCfg.event_date });
    if (!result.ok) {
      showMessage(result.errors.join(' '), 'error');
      updateSummary(Object.assign({}, ds.load(), result.data || {}));
      return;
    }

    var saved = ds.save(Object.assign({}, result.data, {
      status_submission: 'DRAFT',
      validation_version: validator.version || '',
      view_version: VIEW_VERSION
    }));

    fillForm(saved);
    updateSummary(saved);
    showMessage('Draft identitas sasaran berhasil disimpan di perangkat ini.', 'success');
    showToast('Draft HARGANAS tersimpan lokal.', 'success');
  }

  function resetDraft() {
    var ds = getDraftService();
    if (!ds) return;
    if (!window.confirm('Hapus draft HARGANAS di perangkat ini?')) return;
    var base = ds.clear();
    fillForm({});
    updateSummary(base);
    clearMessage();
    showToast('Draft HARGANAS dihapus.', 'success');
  }

  function normalizeNikInput() {
    var input = byId('harganas-nik-sasaran');
    if (!input) return;
    input.value = String(input.value || '').replace(/\D/g, '').slice(0, 16);
  }

  function backToDashboard() {
    var router = getRouter();
    if (router && typeof router.go === 'function') {
      router.go('appLanding');
      return;
    }
  }

  function bindEvents() {
    if (bound) return;
    bound = true;

    var form = byId('harganas-form');
    var jenis = byId('harganas-jenis-sasaran');
    var nik = byId('harganas-nik-sasaran');
    var reset = byId('btn-harganas-reset-draft');
    var back = byId('btn-back-dashboard-from-harganas');
    var next = byId('btn-harganas-next-media');

    if (form) form.addEventListener('submit', saveDraft);
    if (jenis) jenis.addEventListener('change', function () { toggleIbuKandung(); clearMessage(); });
    if (nik) nik.addEventListener('input', normalizeNikInput);
    if (reset) reset.addEventListener('click', resetDraft);
    if (back) back.addEventListener('click', backToDashboard);
    if (next) next.addEventListener('click', function () {
      showToast('Pengambilan foto/video akan diaktifkan pada Paket HARGANAS-2.', 'info');
    });
  }

  function init() {
    var ds = getDraftService();
    bindEvents();
    toggleIbuKandung();
    var draft = ds && typeof ds.load === 'function' ? ds.load() : {};
    fillForm(draft);
    updateSummary(draft);
    clearMessage();
  }

  window.HarganasView = {
    version: VIEW_VERSION,
    init: init,
    refresh: init,
    saveDraft: saveDraft,
    resetDraft: resetDraft
  };
})(window, document);
