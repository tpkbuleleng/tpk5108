(function (window) {
  'use strict';

  var MEDIA_SERVICE_VERSION = 'HARGANAS-2D-MEDIA-20260625';

  function getConfig() { return window.APP_CONFIG || {}; }

  function getHarganasConfig() { return getConfig().HARGANAS || {}; }

  function nowIso() { return new Date().toISOString(); }

  function bytesFromDataUrl(dataUrl) {
    var text = String(dataUrl || '');
    var comma = text.indexOf(',');
    var base64 = comma >= 0 ? text.slice(comma + 1) : text;
    return Math.round((base64.length * 3) / 4);
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('File foto gagal dibaca.')); };
      reader.readAsDataURL(file);
    });
  }

  function loadImage(dataUrl) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('File foto tidak dapat dimuat sebagai gambar.')); };
      img.src = dataUrl;
    });
  }

  function normalizeKind(kind) {
    var raw = String(kind || '').trim().toUpperCase();
    if (raw === 'PORTRAIT' || raw === 'FOTO_POTRAIT' || raw === 'POTRAIT') return 'portrait';
    if (raw === 'LANDSCAPE' || raw === 'FOTO_LANDSCAPE') return 'landscape';
    return raw.toLowerCase();
  }

  function getKindLabel(kind) {
    var normalized = normalizeKind(kind);
    return normalized === 'portrait' ? 'Foto Potrait' : 'Foto Landscape';
  }

  function getRequiredOrientation(kind) {
    return normalizeKind(kind) === 'portrait' ? 'POTRAIT' : 'LANDSCAPE';
  }

  function detectOrientation(width, height) {
    var w = Number(width || 0);
    var h = Number(height || 0);
    if (!w || !h) return 'UNKNOWN';
    if (h > w) return 'POTRAIT';
    if (w > h) return 'LANDSCAPE';
    return 'SQUARE';
  }

  function validateOrientation(kind, width, height) {
    var required = getRequiredOrientation(kind);
    var actual = detectOrientation(width, height);
    if (required === 'POTRAIT' && actual !== 'POTRAIT') {
      return {
        ok: false,
        code: 'PORTRAIT_REQUIRED',
        message: 'Foto Potrait harus tegak. Silakan ambil ulang foto dengan posisi HP tegak.'
      };
    }
    if (required === 'LANDSCAPE' && actual !== 'LANDSCAPE') {
      return {
        ok: false,
        code: 'LANDSCAPE_REQUIRED',
        message: 'Foto Landscape harus mendatar. Silakan ambil ulang foto dengan posisi HP mendatar.'
      };
    }
    return { ok: true, orientation: actual };
  }

  function drawToJpeg(img, maxWidth, quality) {
    var sourceW = Number(img.naturalWidth || img.width || 0);
    var sourceH = Number(img.naturalHeight || img.height || 0);
    var maxW = Number(maxWidth || 1600) || 1600;
    var ratio = Math.min(1, maxW / Math.max(sourceW, sourceH));
    var targetW = Math.max(1, Math.round(sourceW * ratio));
    var targetH = Math.max(1, Math.round(sourceH * ratio));
    var canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, targetW, targetH);
    var dataUrl = canvas.toDataURL('image/jpeg', Number(quality || 0.82));
    return {
      data_url: dataUrl,
      width: targetW,
      height: targetH,
      size_bytes: bytesFromDataUrl(dataUrl)
    };
  }

  async function processPhoto(kind, file) {
    var normalizedKind = normalizeKind(kind);
    if (!file) {
      return { ok: false, message: 'File foto belum dipilih.' };
    }
    if (!/^image\//i.test(String(file.type || ''))) {
      return { ok: false, message: 'File yang dipilih bukan gambar.' };
    }

    var cfg = getHarganasConfig();
    var dataUrl = await readFileAsDataUrl(file);
    var img = await loadImage(dataUrl);
    var originalW = Number(img.naturalWidth || img.width || 0);
    var originalH = Number(img.naturalHeight || img.height || 0);
    var originalOrientation = validateOrientation(normalizedKind, originalW, originalH);
    if (!originalOrientation.ok) return originalOrientation;

    var maxWidth = Number(cfg.PHOTO_MAX_WIDTH || 1600) || 1600;
    var quality = Number(cfg.PHOTO_JPEG_QUALITY || 0.82) || 0.82;
    var maxChars = Number(cfg.PHOTO_MAX_DATA_URL_CHARS || 650000) || 650000;
    var output = drawToJpeg(img, maxWidth, quality);

    var tries = 0;
    while (String(output.data_url || '').length > maxChars && tries < 4) {
      tries += 1;
      maxWidth = Math.max(720, Math.round(maxWidth * 0.78));
      quality = Math.max(0.62, quality - 0.07);
      output = drawToJpeg(img, maxWidth, quality);
    }

    if (String(output.data_url || '').length > maxChars) {
      return {
        ok: false,
        code: 'PHOTO_TOO_LARGE',
        message: 'Foto masih terlalu besar untuk disimpan sebagai draft lokal. Silakan ambil ulang dengan resolusi lebih rendah.'
      };
    }

    var orientation = detectOrientation(output.width, output.height);
    return {
      ok: true,
      kind: normalizedKind,
      kind_label: getKindLabel(normalizedKind),
      media_kind: normalizedKind === 'portrait' ? 'FOTO_POTRAIT' : 'FOTO_LANDSCAPE',
      mime_type: 'image/jpeg',
      file_name_original: String(file.name || ''),
      width: output.width,
      height: output.height,
      original_width: originalW,
      original_height: originalH,
      orientation: orientation,
      required_orientation: getRequiredOrientation(normalizedKind),
      size_bytes: output.size_bytes,
      data_url: output.data_url,
      captured_at_device: nowIso(),
      media_service_version: MEDIA_SERVICE_VERSION
    };
  }

  function buildDraftPatch(result) {
    if (!result || !result.ok) return {};
    var media = {};
    var status = {};
    media[result.kind] = {
      kind: result.media_kind,
      kind_label: result.kind_label,
      mime_type: result.mime_type,
      data_url: result.data_url,
      width: result.width,
      height: result.height,
      original_width: result.original_width,
      original_height: result.original_height,
      orientation: result.orientation,
      required_orientation: result.required_orientation,
      size_bytes: result.size_bytes,
      captured_at_device: result.captured_at_device,
      file_name_original: result.file_name_original,
      media_service_version: result.media_service_version
    };
    status[result.kind] = true;
    return {
      media: media,
      media_status: status,
      last_photo_capture_at: result.captured_at_device
    };
  }

  function humanFileSize(bytes) {
    var n = Number(bytes || 0);
    if (!isFinite(n) || n <= 0) return '';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  window.HarganasMediaService = {
    version: MEDIA_SERVICE_VERSION,
    processPhoto: processPhoto,
    buildDraftPatch: buildDraftPatch,
    validateOrientation: validateOrientation,
    detectOrientation: detectOrientation,
    humanFileSize: humanFileSize
  };
})(window);
