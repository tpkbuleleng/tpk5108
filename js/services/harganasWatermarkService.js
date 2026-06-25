(function (window) {
  'use strict';

  var WATERMARK_SERVICE_VERSION = 'HARGANAS-4A-R3-WATERMARK-SERVICE-20260625';

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

  function normalizeEventTitle(value) {
    var raw = normalizeText(value, 'HARGANAS 2026');
    // Permintaan 4A-R3: ringkas menjadi "HARGANAS - 29 Juni 2026".
    return raw.replace(/\s*2026\s*$/i, '').trim() || 'HARGANAS';
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

  function getGpsText(draft) {
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

  function getTeamAreaLine(draft) {
    var d = draft || {};
    var tim = normalizeTimLabel(d.nomor_tim || d.nomor_tim_tpk || d.nama_tim || d.id_tim);
    var desa = normalizeText(d.desa, '-');
    var kec = normalizeText(d.kecamatan || d.kode_kecamatan, '-');
    var kab = normalizeText(d.kabupaten, 'BULELENG');
    var prov = normalizeText(d.provinsi, 'BALI');
    return tim + ' • Desa ' + desa + ' • Kec. ' + kec + ' • Kab. ' + kab + ' • ' + prov;
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
    var eventDate = formatEventDate(d.event_date || cfg.EVENT_DATE || '2026-06-29');
    var title = normalizeEventTitle(cfg.WATERMARK_EVENT_LABEL || 'HARGANAS 2026') + ' - ' + eventDate;
    var team = getTeamAreaLine(d);
    var mediaLabel = getMediaLabel(mediaKind);
    var gps = cfg.WATERMARK_INCLUDE_GPS !== false ? getGpsText(d) : '';
    var gpsMedia = gps && mediaLabel ? gps + ' - ' + mediaLabel : (gps || mediaLabel || '');

    return [title, team, gpsMedia].filter(Boolean);
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
    minSize = Number(minSize || 10);
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

    var scale = Math.max(0.78, Math.min(1.38, w / 1280));
    var padX = Math.round(18 * scale);
    var padY = Math.round(13 * scale);
    var lineGap = Math.round(5 * scale);
    var titleSize = Math.round(21 * scale);
    var bodySize = Math.round(15 * scale);
    var lineHeightTitle = Math.round(27 * scale);
    var lineHeightBody = Math.round(20 * scale);

    var maxPanelW = Math.min(w - padX * 2, Math.round(w * 0.84));
    var minPanelW = Math.min(maxPanelW, Math.round(w * 0.34));
    var maxTextW = maxPanelW - padX * 2;

    ctx.save();
    ctx.font = '700 ' + titleSize + 'px system-ui, -apple-system, Segoe UI, sans-serif';
    var longest = ctx.measureText(lines[0]).width;
    ctx.font = '600 ' + bodySize + 'px system-ui, -apple-system, Segoe UI, sans-serif';
    for (var measureIndex = 1; measureIndex < lines.length; measureIndex += 1) {
      longest = Math.max(longest, ctx.measureText(lines[measureIndex]).width);
    }
    ctx.restore();

    var panelW = Math.ceil(longest + padX * 2 + Math.round(16 * scale));
    panelW = Math.min(maxPanelW, Math.max(minPanelW, panelW));
    maxTextW = panelW - padX * 2;

    // Ketinggian dipaku untuk 3 baris agar watermark tidak mengambil ruang foto terlalu besar.
    var panelH = padY * 2 + lineHeightTitle + lineGap + (Math.max(0, lines.length - 1) * lineHeightBody);
    var x = Math.round((w - panelW) / 2);
    var bottomMargin = Math.max(Math.round(14 * scale), Math.round(h * 0.025));
    var y = Math.round(h - panelH - bottomMargin);

    ctx.save();
    ctx.globalAlpha = 0.92;
    roundRect(ctx, x, y, panelW, panelH, Math.round(14 * scale));
    ctx.fillStyle = 'rgba(4, 24, 58, 0.74)';
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(1, Math.round(1.1 * scale));
    ctx.stroke();

    var centerX = x + panelW / 2;
    var ty = y + padY + titleSize;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    var fittedTitle = shrinkTextToFit(ctx, lines[0], maxTextW, titleSize, '700', null, 13);
    ctx.font = '700 ' + fittedTitle + 'px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lines[0], centerX, ty);

    ty += lineHeightTitle + lineGap;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    for (var i = 1; i < lines.length; i += 1) {
      var fittedBody = shrinkTextToFit(ctx, lines[i], maxTextW, bodySize, '600', null, 9);
      ctx.font = '600 ' + fittedBody + 'px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(lines[i], centerX, ty);
      ty += lineHeightBody;
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
