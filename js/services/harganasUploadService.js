(function (window) {
  'use strict';

  var UPLOAD_SERVICE_VERSION = 'HARGANAS-4-R1-UPLOAD-SERVICE-20260625';

  function getDraftService() { return window.HarganasDraftService || null; }
  function getVideoService() { return window.HarganasVideoService || null; }
  function getApi() { return window.Api || null; }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (err) { return value; }
  }

  function isDataUrl(value) {
    return /^data:[^;]+;base64,/i.test(String(value || ''));
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

  function validateReady(draft) {
    var d = draft || {};
    var status = d.media_status || {};
    var errors = [];
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

  async function buildUploadPayload(draft) {
    var d = draft || {};
    var ready = validateReady(d);
    if (!ready.ok) {
      return { ok: false, message: ready.errors.join(' '), errors: ready.errors };
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
          watermark_status: portrait.watermark_status || '',
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
          watermark_status: landscape.watermark_status || '',
          watermark_lines: landscape.watermark_lines || []
        },
        video: {
          kind: 'VIDEO',
          mime_type: video.mime_type || (videoRecord && videoRecord.mime_type) || 'video/mp4',
          data_url: videoDataUrl,
          width: video.width || 0,
          height: video.height || 0,
          duration_seconds: video.duration_seconds || 0,
          size_bytes: video.size_bytes || 0,
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
    var payload = await buildUploadPayload(draft);
    if (!payload.ok) return payload;
    return await api.harganasSubmitDocumentation(payload);
  }

  window.HarganasUploadService = {
    version: UPLOAD_SERVICE_VERSION,
    validateReady: validateReady,
    buildUploadPayload: buildUploadPayload,
    submitCurrentDraft: submitCurrentDraft
  };
})(window);
