(function (window) {
  'use strict';

  var UPLOAD_SERVICE_VERSION = 'HARGANAS-4A-UPLOAD-SERVICE-20260625';

  function getDraftService() { return window.HarganasDraftService || null; }
  function getVideoService() { return window.HarganasVideoService || null; }
  function getApi() { return window.Api || null; }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (err) { return value; }
  }

  function isDataUrl(value) {
    return /^data:[^;]+;base64,/i.test(String(value || ''));
  }

  function randomPart() {
    try {
      var bytes = new Uint8Array(8);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(bytes);
        return Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      }
    } catch (err) {}
    return String(Math.random()).replace(/\D/g, '').slice(0, 12);
  }

  function buildUploadClientId() {
    return 'HARGANAS_UPLOAD_' + Date.now() + '_' + randomPart();
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(reader.error || new Error('Gagal membaca file video.')); };
      reader.readAsDataURL(blob);
    });
  }

  function getMedia(draft, kind) {
    var media = draft && draft.media ? draft.media : {};
    return media[kind] || null;
  }

  function getGps(draft) {
    return (draft && draft.gps_location) || {};
  }

  function normalizeStatus(value) {
    return String(value || '').trim().toUpperCase();
  }

  function isLockedSubmission(draft) {
    var d = draft || {};
    var status = normalizeStatus(d.status_submission);
    var verification = normalizeStatus(d.status_verifikasi);
    if (status === 'REJECTED' || status === 'RESUBMIT_REQUIRED' || verification === 'REJECTED' || verification === 'RESUBMIT_REQUIRED') return false;
    return status === 'SUBMITTED' || status === 'VERIFIED' || verification === 'MENUNGGU_VERIFIKASI' || verification === 'VERIFIED' || verification === 'TERVERIFIKASI';
  }

  function validateReady(draft) {
    var d = draft || {};
    var status = d.media_status || {};
    var errors = [];
    if (isLockedSubmission(d)) errors.push('Dokumentasi HARGANAS untuk tim ini sudah terkirim dan sedang menunggu verifikasi.');
    if (!d.jenis_sasaran || !d.nama_sasaran || !d.nik_sasaran || !d.tanggal_lahir || !d.nama_kk) errors.push('Identitas sasaran belum lengkap.');
    if (String(d.jenis_sasaran || '').toUpperCase() === 'BALITA' && !d.nama_ibu_kandung) errors.push('Nama ibu kandung wajib untuk BALITA.');
    if (!status.gps || !d.gps_location) errors.push('GPS belum aktif.');
    if (!status.portrait || !getMedia(d, 'portrait')) errors.push('Foto Potrait belum lengkap.');
    if (!status.landscape || !getMedia(d, 'landscape')) errors.push('Foto Landscape belum lengkap.');
    if (!status.video || !getMedia(d, 'video')) errors.push('Video Pendek belum lengkap.');
    return { ok: errors.length === 0, errors: errors };
  }

  function stripClientOnlyDraft(draft) {
    var d = clone(draft || {}) || {};
    if (d.media) {
      d.media = clone(d.media);
      // payload media dikirim secara eksplisit; draft manifest tidak perlu membawa ulang blob besar.
      ['portrait', 'landscape', 'video'].forEach(function (kind) {
        if (d.media[kind]) {
          d.media[kind] = clone(d.media[kind]);
          delete d.media[kind].data_url;
          delete d.media[kind].thumbnail_data_url;
        }
      });
    }
    return d;
  }

  function ensureUploadClientId(draft) {
    var ds = getDraftService();
    var d = clone(draft || {}) || {};
    if (!d.upload_client_id) {
      d.upload_client_id = buildUploadClientId();
      d.upload_client_id_created_at = new Date().toISOString();
      if (ds && typeof ds.save === 'function') {
        try { d = ds.save(d) || d; } catch (err) {}
      }
    }
    return d.upload_client_id;
  }

  async function buildUploadPayload(draft) {
    var d = draft || {};
    var ready = validateReady(d);
    if (!ready.ok) {
      return { ok: false, message: ready.errors.join(' '), errors: ready.errors };
    }

    var uploadClientId = ensureUploadClientId(d);
    var ds = getDraftService();
    if (ds && typeof ds.load === 'function') {
      try { d = ds.load() || d; } catch (err) {}
    }

    var portrait = getMedia(d, 'portrait');
    var landscape = getMedia(d, 'landscape');
    var video = getMedia(d, 'video');

    if (!portrait || !isDataUrl(portrait.data_url)) return { ok: false, message: 'Data Foto Potrait belum tersedia. Silakan ambil ulang foto.' };
    if (!landscape || !isDataUrl(landscape.data_url)) return { ok: false, message: 'Data Foto Landscape belum tersedia. Silakan ambil ulang foto.' };

    var videoDataUrl = '';
    var videoRecord = null;
    if (video && video.video_blob_key && getVideoService() && typeof getVideoService().getRecord === 'function') {
      videoRecord = await getVideoService().getRecord(video.video_blob_key);
    }
    if (videoRecord && videoRecord.blob) {
      videoDataUrl = await blobToDataUrl(videoRecord.blob);
    }
    if (!isDataUrl(videoDataUrl)) return { ok: false, message: 'Data Video Pendek belum tersedia. Silakan rekam ulang video.' };

    return {
      ok: true,
      upload_service_version: UPLOAD_SERVICE_VERSION,
      upload_client_id: uploadClientId,
      submitted_at_client: new Date().toISOString(),
      draft: stripClientOnlyDraft(d),
      gps: getGps(d),
      media: {
        portrait: {
          kind: 'FOTO_POTRAIT',
          mime_type: portrait.mime_type || 'image/jpeg',
          data_url: portrait.data_url,
          width: portrait.width || 0,
          height: portrait.height || 0,
          size_bytes: portrait.size_bytes || 0,
          captured_at_device: portrait.captured_at_device || '',
          watermark_status: portrait.watermark_status || 'APPLIED',
          watermark_lines: portrait.watermark_lines || []
        },
        landscape: {
          kind: 'FOTO_LANDSCAPE',
          mime_type: landscape.mime_type || 'image/jpeg',
          data_url: landscape.data_url,
          width: landscape.width || 0,
          height: landscape.height || 0,
          size_bytes: landscape.size_bytes || 0,
          captured_at_device: landscape.captured_at_device || '',
          watermark_status: landscape.watermark_status || 'APPLIED',
          watermark_lines: landscape.watermark_lines || []
        },
        video: {
          kind: 'VIDEO',
          mime_type: video.mime_type || (videoRecord && videoRecord.mime_type) || 'video/mp4',
          data_url: videoDataUrl,
          width: video.width || 0,
          height: video.height || 0,
          duration_seconds: video.duration_seconds || 0,
          size_bytes: video.size_bytes || (videoRecord && videoRecord.size_bytes) || 0,
          captured_at_device: video.captured_at_device || '',
          thumbnail_data_url: video.thumbnail_data_url || '',
          thumbnail_watermark_status: video.thumbnail_watermark_status || '',
          watermark_lines: video.watermark_lines || []
        }
      }
    };
  }

  async function submitCurrentDraft() {
    var ds = getDraftService();
    var api = getApi();
    if (!ds || typeof ds.load !== 'function') throw new Error('Draft service belum tersedia.');
    if (!api || typeof api.harganasSubmitDocumentation !== 'function') throw new Error('API upload HARGANAS belum tersedia.');
    var draft = ds.load();
    if (isLockedSubmission(draft)) {
      return {
        ok: false,
        error_code: 'HARGANAS_LOCAL_ALREADY_SUBMITTED',
        message: 'Dokumentasi HARGANAS untuk tim ini sudah terkirim dan sedang menunggu verifikasi.',
        data: {
          submission_id: draft.submission_id || '',
          status_submission: draft.status_submission || 'SUBMITTED',
          status_verifikasi: draft.status_verifikasi || 'MENUNGGU_VERIFIKASI'
        }
      };
    }
    var payload = await buildUploadPayload(draft);
    if (!payload.ok) return payload;
    return await api.harganasSubmitDocumentation(payload, { clientSubmitId: payload.upload_client_id });
  }

  window.HarganasUploadService = {
    version: UPLOAD_SERVICE_VERSION,
    validateReady: validateReady,
    buildUploadPayload: buildUploadPayload,
    submitCurrentDraft: submitCurrentDraft,
    isLockedSubmission: isLockedSubmission
  };
})(window);
