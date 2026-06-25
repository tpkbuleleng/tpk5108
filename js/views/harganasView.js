(function (window, document) {
  'use strict';

  var VIEW_VERSION = 'HARGANAS-4-VIEW-20260625';
  var bound = false;

  function byId(id) { return document.getElementById(id); }
  function getRouter() { return window.Router || null; }
  function getDraftService() { return window.HarganasDraftService || null; }
  function getValidationService() { return window.HarganasValidationService || null; }
  function getGpsService() { return window.HarganasGpsService || null; }
  function getMediaService() { return window.HarganasMediaService || null; }
  function getVideoService() { return window.HarganasVideoService || null; }
  function getUploadService() { return window.HarganasUploadService || null; }

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

  function getMediaItem(draft, kind) {
    var data = draft || {};
    var media = data.media || {};
    return media[kind] || null;
  }

  function formatPhotoDetail(item, fallback) {
    if (!item) return fallback || '';
    var parts = [];
    if (item.width && item.height) parts.push(String(item.width) + '×' + String(item.height));
    if (item.watermark_status === 'APPLIED') parts.push('Watermark OK');
    if (window.HarganasMediaService && typeof window.HarganasMediaService.humanFileSize === 'function') {
      var size = window.HarganasMediaService.humanFileSize(item.size_bytes || 0);
      if (size) parts.push(size);
    }
    return parts.length ? parts.join(' • ') : (fallback || 'Foto tersimpan');
  }

  function formatVideoDetail(item, fallback) {
    if (!item) return fallback || '';
    var parts = [];
    if (item.duration_seconds && window.HarganasVideoService && typeof window.HarganasVideoService.formatDuration === 'function') {
      parts.push(window.HarganasVideoService.formatDuration(item.duration_seconds));
    }
    if (item.width && item.height) parts.push(String(item.width) + '×' + String(item.height));
    if (item.thumbnail_watermark_status === 'APPLIED') parts.push('Thumbnail OK');
    if (window.HarganasVideoService && typeof window.HarganasVideoService.humanFileSize === 'function') {
      var size = window.HarganasVideoService.humanFileSize(item.size_bytes || 0);
      if (size) parts.push(size);
    }
    return parts.length ? parts.join(' • ') : (fallback || 'Video tersimpan');
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
    var portraitItem = getMediaItem(data, 'portrait');
    var landscapeItem = getMediaItem(data, 'landscape');
    var videoItem = getMediaItem(data, 'video');

    setText('harganas-status-portrait', s.portrait ? 'Sudah' : 'Belum');
    setText('harganas-status-landscape', s.landscape ? 'Sudah' : 'Belum');
    setText('harganas-status-video', s.video ? 'Sudah' : 'Belum');
    setText('harganas-status-video-detail', s.video ? formatVideoDetail(videoItem, 'Video tersimpan') : 'Maks. 30 detik');
    setText('harganas-status-gps', gpsLabel);
    setText('harganas-status-gps-detail', gpsDetail);
    setText('harganas-status-portrait-detail', s.portrait ? formatPhotoDetail(portraitItem, 'Foto tersimpan') : 'Foto tegak');
    setText('harganas-status-landscape-detail', s.landscape ? formatPhotoDetail(landscapeItem, 'Foto tersimpan') : 'Foto mendatar');

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
    var status = data.media_status || {};
    var gpsReady = !!status.gps;
    var identityReady = hasMinimumIdentity(data);
    var portraitReady = !!status.portrait;
    var landscapeReady = !!status.landscape;

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

    if (!portraitReady || !landscapeReady) {
      next.disabled = true;
      next.textContent = 'Ambil Foto Potrait dan Foto Landscape terlebih dahulu';
      return;
    }

    if (!status.video) {
      next.disabled = true;
      next.textContent = 'Rekam Video Pendek terlebih dahulu';
      return;
    }

    next.disabled = false;
    next.textContent = 'Kirim Dokumentasi ke Drive';
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

  function requireIdentityAndGpsBeforeMedia() {
    var ds = getDraftService();
    var data = ds && typeof ds.load === 'function' ? ds.load() : {};
    if (!hasMinimumIdentity(data)) {
      showMessage('Simpan identitas sasaran terlebih dahulu sebelum mengambil dokumentasi.', 'error');
      showToast('Identitas sasaran belum lengkap.', 'error');
      return false;
    }
    if (!(data.media_status && data.media_status.gps)) {
      showMessage('Aktifkan GPS terlebih dahulu sebelum mengambil dokumentasi.', 'error');
      showToast('GPS belum aktif.', 'error');
      return false;
    }
    return true;
  }

  function triggerPhotoInput(kind) {
    clearMessage();
    if (!requireIdentityAndGpsBeforeMedia()) return;
    var input = byId(kind === 'portrait' ? 'harganas-input-portrait' : 'harganas-input-landscape');
    if (!input) {
      showMessage('Input kamera belum tersedia. Perbarui aplikasi lalu coba lagi.', 'error');
      return;
    }
    input.value = '';
    try { input.click(); } catch (err) {
      showMessage('Kamera/galeri tidak dapat dibuka dari browser ini.', 'error');
    }
  }

  function setPhotoLoading(kind, isLoading) {
    var btn = byId(kind === 'portrait' ? 'btn-harganas-capture-portrait' : 'btn-harganas-capture-landscape');
    if (!btn) return;
    if (isLoading) {
      if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent || 'Ambil Foto';
      btn.disabled = true;
      btn.textContent = 'Memproses...';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || btn.textContent || 'Ambil Foto';
      delete btn.dataset.originalText;
    }
  }

  async function handlePhotoSelected(kind, file) {
    clearMessage();
    var media = getMediaService();
    var ds = getDraftService();

    if (!media || typeof media.processPhoto !== 'function' || !ds) {
      showMessage('Service foto belum termuat. Perbarui aplikasi lalu coba lagi.', 'error');
      return;
    }

    if (!file) return;

    setPhotoLoading(kind, true);
    try {
      var draftBeforePhoto = ds.load ? ds.load() : {};
      var result = await media.processPhoto(kind, file, draftBeforePhoto);
      if (!result || !result.ok) {
        showMessage((result && result.message) || 'Foto belum valid.', 'error');
        showToast('Foto belum valid.', 'error');
        return;
      }

      var existing = ds.load ? ds.load() : {};
      var patch = media.buildDraftPatch ? media.buildDraftPatch(result) : {};
      var nextMedia = Object.assign({}, existing.media || {}, patch.media || {});
      var nextStatus = Object.assign({}, existing.media_status || {}, patch.media_status || {});
      var saved = ds.save(Object.assign({}, existing, patch, { media: nextMedia, media_status: nextStatus }));
      updateSummary(saved);
      showMessage(result.kind_label + ' berhasil disimpan sebagai draft lokal.', 'success');
      showToast(result.kind_label + ' tersimpan.', 'success');
    } catch (err) {
      showMessage(err && err.message ? err.message : 'Foto gagal diproses.', 'error');
    } finally {
      setPhotoLoading(kind, false);
      var latest = ds && typeof ds.load === 'function' ? ds.load() : {};
      updateSummary(latest);
    }
  }


  function triggerVideoInput() {
    clearMessage();
    if (!requireIdentityAndGpsBeforeMedia()) return;
    var ds = getDraftService();
    var data = ds && typeof ds.load === 'function' ? ds.load() : {};
    var status = data.media_status || {};
    if (!status.portrait || !status.landscape) {
      showMessage('Ambil Foto Potrait dan Foto Landscape terlebih dahulu sebelum merekam video.', 'error');
      showToast('Foto belum lengkap.', 'error');
      return;
    }
    var input = byId('harganas-input-video');
    if (!input) {
      showMessage('Input video belum tersedia. Perbarui aplikasi lalu coba lagi.', 'error');
      return;
    }
    input.value = '';
    try { input.click(); } catch (err) {
      showMessage('Kamera video/galeri tidak dapat dibuka dari browser ini.', 'error');
    }
  }

  function setVideoLoading(isLoading) {
    var btn = byId('btn-harganas-capture-video');
    if (!btn) return;
    if (isLoading) {
      if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent || 'Rekam Video';
      btn.disabled = true;
      btn.textContent = 'Memproses...';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || btn.textContent || 'Rekam Video';
      delete btn.dataset.originalText;
    }
  }

  async function handleVideoSelected(file) {
    clearMessage();
    var video = getVideoService();
    var ds = getDraftService();

    if (!video || typeof video.processVideo !== 'function' || !ds) {
      showMessage('Service video belum termuat. Perbarui aplikasi lalu coba lagi.', 'error');
      return;
    }

    if (!file) return;

    setVideoLoading(true);
    try {
      var existing = ds.load ? ds.load() : {};
      var result = await video.processVideo(file, existing);
      if (!result || !result.ok) {
        showMessage((result && result.message) || 'Video belum valid.', 'error');
        showToast('Video belum valid.', 'error');
        return;
      }

      var patch = video.buildDraftPatch ? video.buildDraftPatch(result) : {};
      var nextMedia = Object.assign({}, existing.media || {}, patch.media || {});
      var nextStatus = Object.assign({}, existing.media_status || {}, patch.media_status || {});
      var saved = ds.save(Object.assign({}, existing, patch, { media: nextMedia, media_status: nextStatus }));
      updateSummary(saved);
      showMessage('Video pendek berhasil disimpan di perangkat ini.', 'success');
      showToast('Video pendek tersimpan.', 'success');
    } catch (err) {
      showMessage(err && err.message ? err.message : 'Video gagal diproses.', 'error');
    } finally {
      setVideoLoading(false);
      var latest = ds && typeof ds.load === 'function' ? ds.load() : {};
      updateSummary(latest);
    }
  }


  function setUploadLoading(isLoading) {
    var btn = byId('btn-harganas-next-media');
    if (!btn) return;
    if (isLoading) {
      if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent || 'Kirim Dokumentasi ke Drive';
      btn.disabled = true;
      btn.textContent = 'Mengirim dokumentasi...';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || 'Kirim Dokumentasi ke Drive';
      delete btn.dataset.originalText;
    }
  }

  function setDraftSubmitted(result) {
    var ds = getDraftService();
    if (!ds || typeof ds.load !== 'function' || typeof ds.save !== 'function') return null;
    var existing = ds.load();
    var data = result && result.data ? result.data : {};
    var saved = ds.save(Object.assign({}, existing, {
      status_submission: 'SUBMITTED',
      status_verifikasi: data.status_verifikasi || 'MENUNGGU_VERIFIKASI',
      submitted_at_server: data.submitted_at_server || new Date().toISOString(),
      submission_id: data.submission_id || '',
      drive_folder_url: data.folder_url || '',
      drive_files: data.files || {},
      upload_result: data,
      upload_service_version: (window.HarganasUploadService && window.HarganasUploadService.version) || ''
    }));
    return saved;
  }

  async function submitDocumentation() {
    clearMessage();
    var upload = getUploadService();
    if (!upload || typeof upload.submitCurrentDraft !== 'function') {
      showMessage('Service upload belum termuat. Perbarui aplikasi lalu coba lagi.', 'error');
      return;
    }

    setUploadLoading(true);
    try {
      var result = await upload.submitCurrentDraft();
      if (!result || !result.ok) {
        showMessage((result && result.message) || 'Dokumentasi belum berhasil dikirim.', 'error');
        showToast('Upload HARGANAS gagal.', 'error');
        var latestFail = getDraftService() && getDraftService().load ? getDraftService().load() : {};
        updateSummary(latestFail);
        return;
      }

      var saved = setDraftSubmitted(result) || (getDraftService() && getDraftService().load ? getDraftService().load() : {});
      updateSummary(saved);
      showMessage('Dokumentasi HARGANAS berhasil dikirim ke Drive dan tercatat di manifest.', 'success');
      showToast('Dokumentasi HARGANAS terkirim.', 'success');
    } catch (err) {
      showMessage(err && err.message ? err.message : 'Upload dokumentasi gagal.', 'error');
      showToast('Upload HARGANAS gagal.', 'error');
    } finally {
      setUploadLoading(false);
      var latest = getDraftService() && getDraftService().load ? getDraftService().load() : {};
      updateSummary(latest);
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
    var portraitBtn = byId('btn-harganas-capture-portrait');
    var landscapeBtn = byId('btn-harganas-capture-landscape');
    var portraitInput = byId('harganas-input-portrait');
    var landscapeInput = byId('harganas-input-landscape');
    var videoBtn = byId('btn-harganas-capture-video');
    var videoInput = byId('harganas-input-video');

    if (form) form.addEventListener('submit', saveDraft);
    if (jenis) jenis.addEventListener('change', function () { toggleIbuKandung(); clearMessage(); });
    if (nik) nik.addEventListener('input', normalizeNikInput);
    if (reset) reset.addEventListener('click', resetDraft);
    if (back) back.addEventListener('click', backToDashboard);
    if (gpsBtn) gpsBtn.addEventListener('click', activateGps);
    if (portraitBtn) portraitBtn.addEventListener('click', function () { triggerPhotoInput('portrait'); });
    if (landscapeBtn) landscapeBtn.addEventListener('click', function () { triggerPhotoInput('landscape'); });
    if (videoBtn) videoBtn.addEventListener('click', triggerVideoInput);
    if (portraitInput) portraitInput.addEventListener('change', function () { handlePhotoSelected('portrait', portraitInput.files && portraitInput.files[0]); });
    if (landscapeInput) landscapeInput.addEventListener('change', function () { handlePhotoSelected('landscape', landscapeInput.files && landscapeInput.files[0]); });
    if (videoInput) videoInput.addEventListener('change', function () { handleVideoSelected(videoInput.files && videoInput.files[0]); });
    if (next) next.addEventListener('click', submitDocumentation);
  }

  function init() {
    try {
      if (window.AppState && typeof window.AppState.setCurrentRoute === 'function') window.AppState.setCurrentRoute('harganas');
      if (window.Storage && typeof window.Storage.set === 'function') window.Storage.set(((window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS && window.APP_CONFIG.STORAGE_KEYS.LAST_ROUTE) || 'tpk_last_route'), 'harganas');
    } catch (err) {}
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
    activateGps: activateGps,
    triggerPhotoInput: triggerPhotoInput,
    triggerVideoInput: triggerVideoInput,
    submitDocumentation: submitDocumentation
  };
})(window, document);
