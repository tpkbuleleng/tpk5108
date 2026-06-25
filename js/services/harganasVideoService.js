(function (window) {
  'use strict';

  var VIDEO_SERVICE_VERSION = 'HARGANAS-2D-VIDEO-SERVICE-20260625';
  var DB_NAME = 'tpk_harganas_2026_media_db';
  var DB_VERSION = 1;
  var STORE_NAME = 'video_blobs';

  function getConfig() { return window.APP_CONFIG || {}; }

  function getHarganasConfig() {
    var cfg = getConfig().HARGANAS || {};
    return {
      max_size_mb: Number(cfg.VIDEO_MAX_SIZE_MB || cfg.MAX_VIDEO_SIZE_MB || 25) || 25,
      max_duration_seconds: Number(cfg.VIDEO_MAX_DURATION_SECONDS || cfg.MAX_VIDEO_DURATION_SECONDS || 30) || 30
    };
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeKeyPart(value) {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]+/g, '_')
      .slice(0, 80) || 'NA';
  }

  function buildVideoBlobKey(draft) {
    var d = draft || {};
    return [
      'HARGANAS_VIDEO',
      normalizeKeyPart(d.event_code || 'HARGANAS_2026'),
      normalizeKeyPart(d.id_user || d.submitted_by || 'USER'),
      normalizeKeyPart(d.id_tim || d.nomor_tim || 'TIM')
    ].join('__');
  }

  function humanFileSize(bytes) {
    var n = Number(bytes || 0);
    if (!isFinite(n) || n <= 0) return '';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatDuration(seconds) {
    var n = Number(seconds || 0);
    if (!isFinite(n) || n <= 0) return '';
    if (n < 60) return Math.round(n) + ' detik';
    var m = Math.floor(n / 60);
    var s = Math.round(n % 60);
    return m + ' menit ' + s + ' detik';
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB tidak tersedia pada browser ini.'));
        return;
      }
      var req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Gagal membuka penyimpanan video.')); };
    });
  }

  async function putRecord(record) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);
      store.put(record);
      tx.oncomplete = function () { try { db.close(); } catch (err) {} resolve(record); };
      tx.onerror = function () { try { db.close(); } catch (err) {} reject(tx.error || new Error('Gagal menyimpan video.')); };
    });
  }

  async function getRecord(key) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, 'readonly');
      var store = tx.objectStore(STORE_NAME);
      var req = store.get(String(key || ''));
      req.onsuccess = function () { try { db.close(); } catch (err) {} resolve(req.result || null); };
      req.onerror = function () { try { db.close(); } catch (err) {} reject(req.error || new Error('Gagal membaca video.')); };
    });
  }

  function readVideoMetadata(file) {
    return new Promise(function (resolve, reject) {
      var url = '';
      try {
        url = URL.createObjectURL(file);
        var video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        video.onloadedmetadata = function () {
          var duration = Number(video.duration || 0);
          var width = Number(video.videoWidth || 0);
          var height = Number(video.videoHeight || 0);
          URL.revokeObjectURL(url);
          resolve({ duration_seconds: duration, width: width, height: height });
        };
        video.onerror = function () {
          URL.revokeObjectURL(url);
          reject(new Error('Metadata video tidak dapat dibaca.'));
        };
        video.src = url;
      } catch (err) {
        if (url) URL.revokeObjectURL(url);
        reject(err);
      }
    });
  }

  function isLikelyVideo(file) {
    var type = String(file && file.type || '').toLowerCase();
    var name = String(file && file.name || '').toLowerCase();
    return /^video\//.test(type) || /\.(mp4|mov|m4v|webm|3gp|3gpp)$/i.test(name);
  }

  async function processVideo(file, draft) {
    if (!file) return { ok: false, message: 'File video belum dipilih.' };
    if (!isLikelyVideo(file)) return { ok: false, message: 'File yang dipilih bukan video.' };

    var cfg = getHarganasConfig();
    var maxBytes = cfg.max_size_mb * 1024 * 1024;
    if (Number(file.size || 0) > maxBytes) {
      return {
        ok: false,
        code: 'VIDEO_TOO_LARGE',
        message: 'Ukuran video maksimal ' + cfg.max_size_mb + ' MB. Silakan rekam ulang dengan durasi lebih pendek.'
      };
    }

    var meta = await readVideoMetadata(file);
    if (meta.duration_seconds && meta.duration_seconds > cfg.max_duration_seconds + 1) {
      return {
        ok: false,
        code: 'VIDEO_DURATION_TOO_LONG',
        message: 'Durasi video maksimal ' + cfg.max_duration_seconds + ' detik. Durasi video terpilih sekitar ' + formatDuration(meta.duration_seconds) + '.'
      };
    }

    var capturedAt = nowIso();
    var key = buildVideoBlobKey(draft || {});
    var mime = String(file.type || 'video/mp4') || 'video/mp4';
    var record = {
      key: key,
      blob: file,
      mime_type: mime,
      file_name_original: String(file.name || ''),
      size_bytes: Number(file.size || 0),
      duration_seconds: meta.duration_seconds || 0,
      width: meta.width || 0,
      height: meta.height || 0,
      captured_at_device: capturedAt,
      updated_at: capturedAt,
      video_service_version: VIDEO_SERVICE_VERSION
    };

    await putRecord(record);

    return {
      ok: true,
      kind: 'video',
      media_kind: 'VIDEO',
      kind_label: 'Video Pendek',
      video_blob_key: key,
      mime_type: mime,
      file_name_original: record.file_name_original,
      duration_seconds: record.duration_seconds,
      width: record.width,
      height: record.height,
      size_bytes: record.size_bytes,
      captured_at_device: capturedAt,
      video_service_version: VIDEO_SERVICE_VERSION
    };
  }

  function buildDraftPatch(result) {
    if (!result || !result.ok) return {};
    return {
      media: {
        video: {
          kind: result.media_kind,
          kind_label: result.kind_label,
          video_blob_key: result.video_blob_key,
          mime_type: result.mime_type,
          file_name_original: result.file_name_original,
          duration_seconds: result.duration_seconds,
          width: result.width,
          height: result.height,
          size_bytes: result.size_bytes,
          captured_at_device: result.captured_at_device,
          video_service_version: result.video_service_version
        }
      },
      media_status: { video: true },
      last_video_capture_at: result.captured_at_device
    };
  }

  window.HarganasVideoService = {
    version: VIDEO_SERVICE_VERSION,
    processVideo: processVideo,
    buildDraftPatch: buildDraftPatch,
    getRecord: getRecord,
    buildVideoBlobKey: buildVideoBlobKey,
    humanFileSize: humanFileSize,
    formatDuration: formatDuration
  };
})(window);
