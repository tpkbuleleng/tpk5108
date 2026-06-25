(function (window, document) {
  'use strict';

  var VIEW_VERSION = 'HARGANAS-2B-VIEW-20260625';
  var bound = false;

  function byId(id) { return document.getElementById(id); }
  function getRouter() { return window.Router || null; }
  function getDraftService() { return window.HarganasDraftService || null; }
  function getValidationService() { return window.HarganasValidationService || null; }
  function getGpsService() { return window.HarganasGpsService || null; }

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

  function toggleMediaCard(cardId, isComplete, isWarning) {
    var card = byId(cardId);
    if (!card) return;
    card.classList.toggle('is-complete', !!isComplete && !isWarning);
    card.classList.toggle('is-warning', !!isWarning);
  }

  function formatAccuracy(value) {
    var n = Number(value);
    if (!isFinite(n) || n <= 0) return '';
    return '±' + Math.round(n) + ' m';
  }

  function formatLocationLine(location) {
    var loc = location || {};
    var lat = Number(loc.latitude);
    var lng = Number(loc.longitude);
    if (!isFinite(lat) || !isFinite(lng)) return '';
    var acc = formatAccuracy(loc.accuracy);
    return lat.toFixed(6) + ', ' + lng.toFixed(6) + (acc ? ' • ' + acc : '');
  }

  function setMediaStatus(mediaStatus, draft) {
    var s = mediaStatus || {};
    var data = draft || {};
    var gpsStatus = String(data.gps_status || '').toUpperCase();
    var gpsWarning = gpsStatus === 'LOW_ACCURACY' || data.gps_is_low_accuracy === true;
    var gpsReady = !!s.gps;
    var gpsLabel = gpsReady ? (gpsWarning ? 'Akurasi Rendah' : 'Siap') : 'Belum';
    var gpsDetail = gpsReady ? (formatAccuracy(data.gps_location && data.gps_location.accuracy) || 'Lokasi tersimpan') : 'Izin lokasi';

    setText('harganas-status-portrait', s.portrait ? 'Sudah' : 'Belum');
    setText('harganas-status-landscape', s.landscape ? 'Sudah' : 'Belum');
    setText('harganas-status-video', s.video ? 'Sudah' : 'Belum');
    setText('harganas-status-gps', gpsLabel);
    setText('harganas-status-gps-detail', gpsDetail);

    toggleMediaCard('harganas-card-portrait', !!s.portrait, false);
    toggleMediaCard('harganas-card-landscape', !!s.landscape, false);
    toggleMediaCard('harganas-card-video', !!s.video, false);
    toggleMediaCard('harganas-card-gps', gpsReady, gpsWarning);
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

  function updateGpsUi(draft) {
    var data = draft || {};
    var status = String(data.gps_status || '').toUpperCase();
    var permission = String(data.gps_permission_status || '').toUpperCase();
    var loc = data.gps_location || {};
    var locationLine = formatLocationLine(loc);
    var chip = byId('harganas-gps-permission-label');
    var detail = byId('harganas-gps-detail');
    var btn = byId('btn-harganas-activate-gps');

    if (chip) {
      chip.classList.remove('is-ready', 'is-warning', 'is-error');
      if (status === 'READY') {
        chip.textContent = 'GPS siap';
        chip.classList.add('is-ready');
      } else if (status === 'LOW_ACCURACY') {
        chip.textContent = 'GPS akurasi rendah';
        chip.classList.add('is-warning');
      } else if (status === 'PERMISSION_DENIED') {
        chip.textContent = 'Izin GPS ditolak';
        chip.classList.add('is-error');
      } else if (permission === 'GRANTED') {
        chip.textContent = 'GPS tersimpan';
        chip.classList.add('is-ready');
      } else {
        chip.textContent = 'GPS belum aktif';
      }
    }

    if (detail) {
      if (locationLine) {
        detail.textContent = 'Lokasi tersimpan: ' + locationLine + '. ' + (data.gps_accuracy_label || '');
      } else if (status === 'PERMISSION_DENIED') {
        detail.textContent = data.gps_error_message || 'Izin lokasi ditolak. Buka pengaturan browser untuk mengizinkan lokasi.';
      } else if (data.gps_error_message) {
        detail.textContent = data.gps_error_message;
      } else {
        detail.textContent = 'Tekan tombol Aktifkan GPS, lalu pilih izinkan lokasi pada browser.';
      }
    }

    if (btn) {
      btn.textContent = locationLine ? 'Perbarui GPS' : 'Aktifkan GPS';
      btn.disabled = false;
    }
  }

  function hasMinimumIdentity(draft) {
    var data = draft || {};
    return !!(data.jenis_sasaran && data.nama_sasaran && data.nik_sasaran && data.tanggal_lahir && data.nama_kk);
  }

  function updateNextGate(draft) {
    var next = byId('btn-harganas-next-media');
    if (!next) return;
    var data = draft || {};
    var gpsReady = !!(data.media_status && data.media_status.gps);
    var identityReady = hasMinimumIdentity(data);

    if (!identityReady) {
      next.disabled = true;
      next.textContent = 'Lengkapi dan simpan identitas sasaran terlebih dahulu';
      return;
    }

    if (!gpsReady) {
      next.disabled = true;
      next.textContent = 'Aktifkan GPS untuk lanjut foto/video';
      return;
    }

    next.disabled = false;
    next.textContent = 'Siap Lanjut Foto/Video - Paket HARGANAS-2C';
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
    setMediaStatus(data.media_status || {}, data);
    updateGpsUi(data);
    updateNextGate(data);

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
    var existing = ds.load ? ds.load() : {};
    if (!result.ok) {
      showMessage(result.errors.join(' '), 'error');
      updateSummary(Object.assign({}, existing, result.data || {}));
      return;
    }

    var saved = ds.save(Object.assign({}, existing, result.data, {
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

  function setGpsLoading(isLoading) {
    var btn = byId('btn-harganas-activate-gps');
    if (!btn) return;
    if (isLoading) {
      if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent || 'Aktifkan GPS';
      btn.disabled = true;
      btn.textContent = 'Membaca GPS...';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || btn.textContent || 'Aktifkan GPS';
      delete btn.dataset.originalText;
    }
  }

  async function activateGps() {
    clearMessage();
    var gps = getGpsService();
    var ds = getDraftService();

    if (!gps || typeof gps.requestPosition !== 'function') {
      showMessage('Service GPS belum termuat. Perbarui aplikasi lalu coba lagi.', 'error');
      return;
    }

    if (!gps.isSupported || !gps.isSupported()) {
      showMessage('Browser/perangkat ini belum mendukung GPS.', 'error');
      return;
    }

    setGpsLoading(true);
    try {
      var result = await gps.requestPosition();
      var existing = ds && typeof ds.load === 'function' ? ds.load() : {};
      var patch = gps.buildDraftPatch ? gps.buildDraftPatch(result) : {};
      var nextMedia = Object.assign({}, existing.media_status || {}, patch.media_status || {});
      var saved = ds && typeof ds.save === 'function' ? ds.save(Object.assign({}, existing, patch, { media_status: nextMedia })) : Object.assign({}, existing, patch, { media_status: nextMedia });

      updateSummary(saved);

      if (result && result.ok) {
        if (result.is_low_accuracy) {
          showMessage('GPS berhasil terbaca, tetapi akurasi masih rendah. Kader dapat coba ulang GPS sebelum foto/video.', 'success');
          showToast('GPS terbaca, akurasi rendah.', 'info');
        } else {
          showMessage('GPS berhasil diaktifkan dan tersimpan di perangkat ini.', 'success');
          showToast('GPS siap digunakan.', 'success');
        }
        return;
      }

      showMessage((result && result.error_message) || 'GPS belum dapat diaktifkan.', 'error');
      showToast('GPS belum aktif.', 'error');
    } catch (err) {
      showMessage(err && err.message ? err.message : 'GPS gagal diaktifkan.', 'error');
    } finally {
      setGpsLoading(false);
      var latest = ds && typeof ds.load === 'function' ? ds.load() : {};
      updateGpsUi(latest);
      updateNextGate(latest);
    }
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
    var gpsBtn = byId('btn-harganas-activate-gps');

    if (form) form.addEventListener('submit', saveDraft);
    if (jenis) jenis.addEventListener('change', function () { toggleIbuKandung(); clearMessage(); });
    if (nik) nik.addEventListener('input', normalizeNikInput);
    if (reset) reset.addEventListener('click', resetDraft);
    if (back) back.addEventListener('click', backToDashboard);
    if (gpsBtn) gpsBtn.addEventListener('click', activateGps);
    if (next) next.addEventListener('click', function () {
      showToast('Identitas dan GPS sudah siap. Pengambilan foto/video akan diaktifkan pada Paket HARGANAS-2C.', 'info');
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
    resetDraft: resetDraft,
    activateGps: activateGps
  };
})(window, document);
