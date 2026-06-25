(function (window) {
  'use strict';

  var WATERMARK_SERVICE_VERSION = 'HARGANAS-4A-R1-WATERMARK-SERVICE-20260625';

  function getConfig() { return window.APP_CONFIG || {}; }
  function getHarganasConfig() { return getConfig().HARGANAS || {}; }

  function normalizeText(value, fallback) {
    var text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    if (!text || text === '-') return fallback || '';
    return text;
  }

  function formatEventDate(value) {
    var raw = normalizeText(value, '2026-06-29');
    var match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return raw;
    var months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return String(Number(match[3])) + ' ' + months[Number(match[2]) - 1] + ' ' + match[1];
  }

  function fixedCoord(value) {
    var n = Number(value);
    if (!isFinite(n)) return '';
    return n.toFixed(6);
  }

  function getGpsObject(draft) {
    var d = draft || {};
    return d.gps_location || d.gps || {
      latitude: d.latitude || d.lat,
      longitude: d.longitude || d.lng || d.lon,
      accuracy: d.gps_accuracy || d.accuracy
    };
  }

  function getGpsLine(draft) {
    var gps = getGpsObject(draft || {});
    var lat = fixedCoord(gps.latitude);
    var lon = fixedCoord(gps.longitude);
    if (!lat || !lon) return '';
    var acc = Number(gps.accuracy || 0);
    var accText = isFinite(acc) && acc > 0 ? ' • ±' + Math.round(acc) + ' m' : '';
    return 'GPS: ' + lat + ', ' + lon + accText;
  }

  function normalizeTimLabel(value) {
    var raw = normalizeText(value, '');
    if (!raw) return 'Tim TPK';
    var cleaned = raw.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^\d+$/.test(cleaned)) return 'Tim ' + cleaned;
    if (/^TIM\s*\d+$/i.test(cleaned)) return cleaned.replace(/^TIM/i, 'Tim');
    if (/^TIM/i.test(cleaned)) return cleaned.replace(/^TIM/i, 'Tim');
    return cleaned;
  }

  function getTeamLine(draft) {
    var d = draft || {};
    var tim = normalizeTimLabel(d.nomor_tim || d.nomor_tim_tpk || d.nama_tim || d.id_tim);
    var desa = normalizeText(d.desa, '-');
    return tim + ' • Desa ' + desa;
  }

  function getAreaLine(draft) {
    var d = draft || {};
    var kec = normalizeText(d.kecamatan || d.kode_kecamatan, '-');
    var kab = normalizeText(d.kabupaten, 'BULELENG');
    var prov = normalizeText(d.provinsi, 'BALI');
    return 'Kec. ' + kec + ' • Kab. ' + kab + ' • ' + prov;
  }

  function getMediaLabel(mediaKind) {
    var raw = String(mediaKind || '').trim().toUpperCase();
    if (raw === 'FOTO_POTRAIT' || raw === 'PORTRAIT') return 'FOTO POTRAIT';
    if (raw === 'FOTO_LANDSCAPE' || raw === 'LANDSCAPE') return 'FOTO LANDSCAPE';
    if (raw === 'VIDEO') return 'VIDEO PENDEK';
    return raw.replace(/_/g, ' ');
  }

  function buildWatermarkLines(draft, mediaKind) {
    var cfg = getHarganasConfig();
    var d = draft || {};
    var label = normalizeText(cfg.WATERMARK_EVENT_LABEL, 'HARGANAS 2026');
    var eventDate = formatEventDate(d.event_date || cfg.EVENT_DATE || '2026-06-29');
    var dateLabel = normalizeText(cfg.WATERMARK_DATE_LABEL, 'Tanggal Kegiatan: ' + eventDate);
    if (dateLabel.indexOf('2026') < 0 && eventDate) dateLabel = dateLabel + ' ' + eventDate;

    var lines = [
      label,
      dateLabel,
      getTeamLine(d),
      getAreaLine(d)
    ];

    if (cfg.WATERMARK_INCLUDE_GPS !== false) {
      var gps = getGpsLine(d);
      if (gps) lines.push(gps);
    }

    var mediaLabel = getMediaLabel(mediaKind);
    if (mediaLabel) lines.push(mediaLabel);
    return lines.filter(Boolean);
  }

  function bytesFromDataUrl(dataUrl) {
    var text = String(dataUrl || '');
    var comma = text.indexOf(',');
    var base64 = comma >= 0 ? text.slice(comma + 1) : text;
    return Math.round((base64.length * 3) / 4);
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(Number(r || 0), Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function shrinkTextToFit(ctx, text, maxWidth, startSize, weight, family, minSize) {
    var size = Number(startSize || 16);
    minSize = Number(minSize || 11);
    family = family || 'system-ui, -apple-system, Segoe UI, sans-serif';
    weight = weight || '600';
    while (size > minSize) {
      ctx.font = weight + ' ' + Math.round(size) + 'px ' + family;
      if (ctx.measureText(String(text || '')).width <= maxWidth) break;
      size -= 1;
    }
    return Math.round(size);
  }

  function drawWatermarkOnCanvas(canvas, draft, mediaKind) {
    if (!canvas || !canvas.getContext) return { ok: false, lines: [] };
    var ctx = canvas.getContext('2d');
    var w = Number(canvas.width || 0);
    var h = Number(canvas.height || 0);
    if (!w || !h) return { ok: false, lines: [] };

    var lines = buildWatermarkLines(draft || {}, mediaKind);
    if (!lines.length) return { ok: false, lines: [] };

    var scale = Math.max(0.82, Math.min(1.55, w / 1280));
    var pad = Math.round(18 * scale);
    var gap = Math.round(5 * scale);
    var titleSize = Math.round(23 * scale);
    var bodySize = Math.round(15 * scale);
    var lineHeightTitle = Math.round(29 * scale);
    var lineHeightBody = Math.round(21 * scale);
    var requiredPanelH = pad * 2 + lineHeightTitle + Math.max(0, lines.length - 1) * lineHeightBody + gap;
    var maxPanelH = Math.round(h * 0.46);
    var minPanelH = Math.round(118 * scale);
    var panelH = Math.min(maxPanelH, Math.max(requiredPanelH, minPanelH));
    if (panelH < requiredPanelH) {
      var factor = Math.max(0.72, panelH / requiredPanelH);
      bodySize = Math.max(11, Math.floor(bodySize * factor));
      titleSize = Math.max(15, Math.floor(titleSize * factor));
      lineHeightTitle = Math.max(20, Math.floor(lineHeightTitle * factor));
      lineHeightBody = Math.max(16, Math.floor(lineHeightBody * factor));
    }
    var panelW = Math.min(w - pad * 2, Math.round(w * 0.92));
    var x = pad;
    var y = h - panelH - pad;
    var maxTextW = panelW - pad * 2;

    ctx.save();
    ctx.globalAlpha = 0.91;
    roundRect(ctx, x, y, panelW, panelH, Math.round(16 * scale));
    ctx.fillStyle = 'rgba(4, 24, 58, 0.74)';
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.26)';
    ctx.lineWidth = Math.max(1, Math.round(1.2 * scale));
    ctx.stroke();

    var tx = x + pad;
    var ty = y + pad + titleSize;
    var fittedTitle = shrinkTextToFit(ctx, lines[0], maxTextW, titleSize, '700', null, 14);
    ctx.font = '700 ' + fittedTitle + 'px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lines[0], tx, ty);

    ty += lineHeightTitle;
    ctx.fillStyle = 'rgba(255,255,255,0.93)';
    for (var i = 1; i < lines.length; i += 1) {
      var fittedBody = shrinkTextToFit(ctx, lines[i], maxTextW, bodySize, '600', null, 10);
      ctx.font = '600 ' + fittedBody + 'px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(lines[i], tx, ty);
      ty += lineHeightBody;
      if (ty > y + panelH - Math.round(8 * scale)) break;
    }
    ctx.restore();

    return { ok: true, lines: lines };
  }

  function createCanvasFromImage(img, maxWidth) {
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
    return canvas;
  }

  function exportJpeg(canvas, quality) {
    var q = Number(quality || 0.82);
    var dataUrl = canvas.toDataURL('image/jpeg', q);
    return { data_url: dataUrl, width: canvas.width, height: canvas.height, size_bytes: bytesFromDataUrl(dataUrl) };
  }

  function createWatermarkedJpeg(img, options) {
    options = options || {};
    var canvas = createCanvasFromImage(img, options.maxWidth || 1600);
    var wm = drawWatermarkOnCanvas(canvas, options.draft || {}, options.mediaKind || '');
    var out = exportJpeg(canvas, options.quality || 0.82);
    out.watermark_status = wm.ok ? 'APPLIED' : 'SKIPPED';
    out.watermark_lines = wm.lines || [];
    out.watermark_service_version = WATERMARK_SERVICE_VERSION;
    return out;
  }

  function createVideoThumbnail(file, draft, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      var url = '';
      try {
        url = URL.createObjectURL(file);
        var video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        var done = false;
        function cleanup() { try { URL.revokeObjectURL(url); } catch (err) {} }
        function fail(err) { if (done) return; done = true; cleanup(); reject(err); }
        video.onerror = function () { fail(new Error('Thumbnail video tidak dapat dibuat.')); };
        video.onloadedmetadata = function () {
          var seekTo = Math.min(1, Math.max(0.05, Number(video.duration || 1) * 0.15));
          try { video.currentTime = seekTo; } catch (err) { fail(err); }
        };
        video.onseeked = function () {
          if (done) return;
          done = true;
          try {
            var sourceW = Number(video.videoWidth || 0) || 960;
            var sourceH = Number(video.videoHeight || 0) || 540;
            var maxW = Number(options.maxWidth || 960) || 960;
            var ratio = Math.min(1, maxW / Math.max(sourceW, sourceH));
            var w = Math.max(1, Math.round(sourceW * ratio));
            var h = Math.max(1, Math.round(sourceH * ratio));
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, w, h);
            var wm = drawWatermarkOnCanvas(canvas, draft || {}, 'VIDEO');
            var out = exportJpeg(canvas, options.quality || 0.78);
            cleanup();
            resolve({
              ok: true,
              thumbnail_data_url: out.data_url,
              thumbnail_width: out.width,
              thumbnail_height: out.height,
              thumbnail_size_bytes: out.size_bytes,
              thumbnail_watermark_status: wm.ok ? 'APPLIED' : 'SKIPPED',
              watermark_lines: wm.lines || [],
              watermark_service_version: WATERMARK_SERVICE_VERSION
            });
          } catch (err) {
            cleanup();
            reject(err);
          }
        };
        video.src = url;
      } catch (err) {
        if (url) { try { URL.revokeObjectURL(url); } catch (e) {} }
        reject(err);
      }
    });
  }

  window.HarganasWatermarkService = {
    version: WATERMARK_SERVICE_VERSION,
    buildWatermarkLines: buildWatermarkLines,
    drawWatermarkOnCanvas: drawWatermarkOnCanvas,
    createWatermarkedJpeg: createWatermarkedJpeg,
    createVideoThumbnail: createVideoThumbnail,
    bytesFromDataUrl: bytesFromDataUrl
  };
})(window);
