(function (window, document) {
  'use strict';

  var VIEW_VERSION = 'HARGANAS-5-ADMIN-VERIFICATION-VIEW-20260625';
  var initialized = false;
  var currentItems = [];
  var selectedSubmissionId = '';
  var lastFilters = { status_verifikasi: '', kode_kecamatan: '', desa: '', q: '' };

  function byId(id) { return document.getElementById(id); }
  function getApi() { return window.Api || null; }
  function getRouter() { return window.Router || null; }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalize(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function upper(value) {
    return normalize(value).toUpperCase();
  }

  function showToast(message, type) {
    if (window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(message, type || 'info');
      return;
    }
    try { window.alert(message); } catch (err) {}
  }

  function setText(id, value, fallback) {
    var el = byId(id);
    if (!el) return;
    el.textContent = value === undefined || value === null || value === '' ? (fallback !== undefined ? fallback : '-') : String(value);
  }

  function setHtml(id, html) {
    var el = byId(id);
    if (!el) return;
    el.innerHTML = html || '';
  }

  function formatDateTime(value) {
    var text = normalize(value);
    if (!text) return '-';
    var date = new Date(text);
    if (isNaN(date.getTime())) return text;
    try {
      return date.toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (err) {
      return text;
    }
  }

  function statusClass(status) {
    var s = upper(status);
    if (s === 'VERIFIED' || s === 'TERVERIFIKASI') return 'is-verified';
    if (s === 'RESUBMIT_REQUIRED') return 'is-resubmit';
    if (s === 'REJECTED') return 'is-rejected';
    return 'is-waiting';
  }

  function statusLabel(status) {
    var s = upper(status || 'MENUNGGU_VERIFIKASI');
    if (s === 'VERIFIED') return 'TERVERIFIKASI';
    if (s === 'RESUBMIT_REQUIRED') return 'PERLU PERBAIKAN';
    if (s === 'REJECTED') return 'DITOLAK';
    return 'MENUNGGU VERIFIKASI';
  }

  function humanSize(bytes) {
    var n = Number(bytes || 0);
    if (!isFinite(n) || n <= 0) return '-';
    if (n < 1024) return Math.round(n) + ' B';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  function createShell() {
    return '' +
      '<header class="harganas-admin-topbar">' +
        '<div>' +
          '<p class="harganas-admin-kicker">Verifikasi Dokumen</p>' +
          '<h2>Dashboard Verifikasi HARGANAS 2026</h2>' +
          '<p class="harganas-admin-subtitle">Periksa foto, video, GPS, dan snapshot sasaran yang dikirim Tim TPK.</p>' +
        '</div>' +
        '<div class="harganas-admin-topbar__actions">' +
          '<button id="btn-harganas-admin-refresh" type="button" class="btn btn-secondary btn-sm">Refresh</button>' +
          '<button id="btn-harganas-admin-back" type="button" class="btn btn-secondary btn-sm">Kembali</button>' +
        '</div>' +
      '</header>' +
      '<main class="harganas-admin-content">' +
        '<section class="harganas-admin-summary" aria-label="Ringkasan verifikasi HARGANAS">' +
          '<article><span>Total Submission</span><strong id="harganas-admin-total">0</strong></article>' +
          '<article><span>Menunggu</span><strong id="harganas-admin-waiting">0</strong></article>' +
          '<article><span>Terverifikasi</span><strong id="harganas-admin-verified">0</strong></article>' +
          '<article><span>Perlu Perbaikan</span><strong id="harganas-admin-resubmit">0</strong></article>' +
          '<article><span>Ditolak</span><strong id="harganas-admin-rejected">0</strong></article>' +
        '</section>' +
        '<section class="card harganas-admin-filter-card">' +
          '<div class="section-header row-between">' +
            '<div><p class="harganas-section-eyebrow">Filter</p><h3>Daftar Submission</h3></div>' +
            '<span id="harganas-admin-scope-label" class="badge badge-info">-</span>' +
          '</div>' +
          '<div id="harganas-admin-message" class="login-message hidden" role="alert" aria-live="polite"></div>' +
          '<div class="harganas-admin-filters">' +
            '<label>Status Verifikasi<select id="harganas-admin-filter-status"><option value="">Semua Status</option><option value="MENUNGGU_VERIFIKASI">Menunggu Verifikasi</option><option value="VERIFIED">Terverifikasi</option><option value="RESUBMIT_REQUIRED">Perlu Perbaikan</option><option value="REJECTED">Ditolak</option></select></label>' +
            '<label>Kecamatan<input id="harganas-admin-filter-kecamatan" type="text" placeholder="Kode/nama kecamatan" /></label>' +
            '<label>Desa<input id="harganas-admin-filter-desa" type="text" placeholder="Nama desa" /></label>' +
            '<label>Cari<input id="harganas-admin-filter-q" type="search" placeholder="Tim / user / submission ID" /></label>' +
            '<button id="btn-harganas-admin-apply-filter" type="button" class="btn btn-primary">Terapkan</button>' +
          '</div>' +
        '</section>' +
        '<div class="harganas-admin-layout">' +
          '<section class="harganas-admin-list-card card">' +
            '<div class="section-header row-between"><h3>Submission</h3><small id="harganas-admin-list-count">0 data</small></div>' +
            '<div id="harganas-admin-list" class="harganas-admin-list"><div class="harganas-admin-empty">Belum ada data.</div></div>' +
          '</section>' +
          '<section class="harganas-admin-detail-card card">' +
            '<div class="section-header row-between"><h3>Detail Verifikasi</h3><span id="harganas-admin-detail-status" class="harganas-admin-status is-waiting">-</span></div>' +
            '<div id="harganas-admin-detail" class="harganas-admin-detail"><div class="harganas-admin-empty">Pilih salah satu submission untuk melihat detail.</div></div>' +
          '</section>' +
        '</div>' +
      '</main>';
  }

  function showMessage(message, type) {
    var box = byId('harganas-admin-message');
    if (!box) return;
    if (!message) {
      box.classList.add('hidden');
      box.textContent = '';
      return;
    }
    box.textContent = message;
    box.classList.remove('hidden', 'error', 'success');
    box.classList.add(type === 'success' ? 'success' : 'error');
  }

  function setBusy(isBusy) {
    var btn = byId('btn-harganas-admin-refresh');
    if (btn) {
      btn.disabled = !!isBusy;
      btn.textContent = isBusy ? 'Memuat...' : 'Refresh';
    }
  }

  function collectFilters() {
    lastFilters = {
      status_verifikasi: (byId('harganas-admin-filter-status') || {}).value || '',
      kode_kecamatan: (byId('harganas-admin-filter-kecamatan') || {}).value || '',
      desa: (byId('harganas-admin-filter-desa') || {}).value || '',
      q: (byId('harganas-admin-filter-q') || {}).value || ''
    };
    return lastFilters;
  }

  function applySummary(summary) {
    summary = summary || {};
    setText('harganas-admin-total', summary.total || 0);
    setText('harganas-admin-waiting', summary.menunggu_verifikasi || 0);
    setText('harganas-admin-verified', summary.verified || 0);
    setText('harganas-admin-resubmit', summary.resubmit_required || 0);
    setText('harganas-admin-rejected', summary.rejected || 0);
  }

  function renderList(items) {
    currentItems = Array.isArray(items) ? items : [];
    setText('harganas-admin-list-count', currentItems.length + ' data');
    if (!currentItems.length) {
      setHtml('harganas-admin-list', '<div class="harganas-admin-empty">Tidak ada submission sesuai filter.</div>');
      return;
    }

    var html = currentItems.map(function (item) {
      var sid = normalize(item.submission_id);
      var status = item.status_verifikasi || 'MENUNGGU_VERIFIKASI';
      var active = sid && sid === selectedSubmissionId ? ' is-active' : '';
      return '' +
        '<button type="button" class="harganas-admin-item' + active + '" data-submission-id="' + escapeHtml(sid) + '">' +
          '<span class="harganas-admin-item__head">' +
            '<strong>Tim ' + escapeHtml(item.nomor_tim_tpk || item.nomor_tim || item.id_tim || '-') + '</strong>' +
            '<em class="harganas-admin-status ' + statusClass(status) + '">' + escapeHtml(statusLabel(status)) + '</em>' +
          '</span>' +
          '<span class="harganas-admin-item__meta">' + escapeHtml(item.desa || '-') + ' • Kec. ' + escapeHtml(item.kecamatan || item.kode_kecamatan || '-') + '</span>' +
          '<span class="harganas-admin-item__meta">Dikirim oleh ' + escapeHtml(item.submitted_by || '-') + ' • ' + escapeHtml(formatDateTime(item.submitted_at)) + '</span>' +
          '<span class="harganas-admin-item__foot">' + escapeHtml(sid || '-') + '</span>' +
        '</button>';
    }).join('');
    setHtml('harganas-admin-list', html);
  }

  function mediaLabel(kind) {
    var k = upper(kind);
    if (k === 'FOTO_POTRAIT') return 'Foto Potrait';
    if (k === 'FOTO_LANDSCAPE') return 'Foto Landscape';
    if (k === 'VIDEO') return 'Video Pendek';
    return normalize(kind) || 'Media';
  }

  function renderMedia(media) {
    var rows = Array.isArray(media) ? media : [];
    if (!rows.length) return '<div class="harganas-admin-empty">Manifest media belum tersedia.</div>';
    return '<div class="harganas-admin-media-grid">' + rows.map(function (m) {
      var url = normalize(m.drive_url);
      return '' +
        '<article class="harganas-admin-media-card">' +
          '<strong>' + escapeHtml(mediaLabel(m.jenis_media)) + '</strong>' +
          '<small>' + escapeHtml(m.mime_type || '-') + ' • ' + escapeHtml(humanSize(m.file_size)) + '</small>' +
          '<small>GPS: ' + escapeHtml(m.latitude || '-') + ', ' + escapeHtml(m.longitude || '-') + ' • ±' + escapeHtml(m.gps_accuracy || '-') + ' m</small>' +
          '<small>Watermark: ' + escapeHtml(m.watermark_status || '-') + '</small>' +
          (url ? '<a class="btn btn-secondary btn-sm" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">Buka Drive</a>' : '<span class="muted-text">Link Drive tidak tersedia</span>') +
        '</article>';
    }).join('') + '</div>';
  }

  function renderDetail(data) {
    data = data || {};
    var submission = data.submission || {};
    var snapshot = data.sasaran_snapshot || {};
    var media = data.media_manifest || [];
    var status = submission.status_verifikasi || 'MENUNGGU_VERIFIKASI';
    setText('harganas-admin-detail-status', statusLabel(status));
    var statusEl = byId('harganas-admin-detail-status');
    if (statusEl) statusEl.className = 'harganas-admin-status ' + statusClass(status);

    var html = '' +
      '<div class="harganas-admin-detail-section">' +
        '<h4>Identitas Tim</h4>' +
        '<dl class="harganas-admin-dl">' +
          '<div><dt>Submission ID</dt><dd>' + escapeHtml(submission.submission_id || '-') + '</dd></div>' +
          '<div><dt>Tim</dt><dd>' + escapeHtml(submission.nomor_tim_tpk || submission.nomor_tim || submission.id_tim || '-') + '</dd></div>' +
          '<div><dt>Desa/Kecamatan</dt><dd>' + escapeHtml(submission.desa || '-') + ' / ' + escapeHtml(submission.kecamatan || submission.kode_kecamatan || '-') + '</dd></div>' +
          '<div><dt>Pengirim</dt><dd>' + escapeHtml(submission.submitted_by || '-') + '</dd></div>' +
          '<div><dt>Waktu Kirim</dt><dd>' + escapeHtml(formatDateTime(submission.submitted_at)) + '</dd></div>' +
        '</dl>' +
      '</div>' +
      '<div class="harganas-admin-detail-section">' +
        '<h4>Snapshot Sasaran</h4>' +
        '<dl class="harganas-admin-dl">' +
          '<div><dt>Jenis Sasaran</dt><dd>' + escapeHtml(snapshot.jenis_sasaran || '-') + '</dd></div>' +
          '<div><dt>Nama Sasaran</dt><dd>' + escapeHtml(snapshot.nama_sasaran || '-') + '</dd></div>' +
          '<div><dt>NIK</dt><dd>' + escapeHtml(snapshot.nik_sasaran_masked || '-') + '</dd></div>' +
          '<div><dt>Tanggal Lahir</dt><dd>' + escapeHtml(snapshot.tanggal_lahir || '-') + '</dd></div>' +
          '<div><dt>Baduta Prioritas</dt><dd>' + escapeHtml(snapshot.is_baduta_prioritas || '-') + '</dd></div>' +
          '<div><dt>Usia Event</dt><dd>' + escapeHtml(snapshot.age_label_at_event || '-') + '</dd></div>' +
        '</dl>' +
      '</div>' +
      '<div class="harganas-admin-detail-section">' +
        '<h4>Media Drive</h4>' + renderMedia(media) +
      '</div>' +
      '<div class="harganas-admin-detail-section harganas-admin-verification-box">' +
        '<h4>Aksi Verifikasi</h4>' +
        '<label>Catatan Verifikator<textarea id="harganas-admin-catatan" rows="3" placeholder="Wajib diisi jika perlu perbaikan atau ditolak.">' + escapeHtml(submission.catatan_verifikator || '') + '</textarea></label>' +
        '<div class="harganas-admin-action-row">' +
          '<button type="button" class="btn btn-primary" data-verify-status="VERIFIED">Setujui / VERIFIED</button>' +
          '<button type="button" class="btn btn-secondary" data-verify-status="RESUBMIT_REQUIRED">Minta Perbaikan</button>' +
          '<button type="button" class="btn btn-danger" data-verify-status="REJECTED">Tolak</button>' +
        '</div>' +
      '</div>';

    setHtml('harganas-admin-detail', html);
  }

  async function loadList() {
    var api = getApi();
    if (!api || typeof api.harganasAdminListSubmissions !== 'function') {
      showMessage('API admin HARGANAS belum tersedia. Pastikan frontend sudah versi Paket 5.', 'error');
      return;
    }
    setBusy(true);
    showMessage('', 'success');
    try {
      var res = await api.harganasAdminListSubmissions({ filters: collectFilters(), limit: 200 });
      if (!res || res.ok !== true) throw new Error(res && res.message ? res.message : 'Gagal memuat daftar submission.');
      var data = res.data || {};
      applySummary(data.summary || {});
      setText('harganas-admin-scope-label', data.scope_label || '-');
      renderList(data.items || []);
      if ((data.items || []).length && !selectedSubmissionId) {
        await loadDetail((data.items || [])[0].submission_id);
      }
    } catch (err) {
      showMessage(err && err.message ? err.message : 'Gagal memuat data.', 'error');
      renderList([]);
    } finally {
      setBusy(false);
    }
  }

  async function loadDetail(submissionId) {
    var sid = normalize(submissionId);
    if (!sid) return;
    selectedSubmissionId = sid;
    renderList(currentItems);
    setHtml('harganas-admin-detail', '<div class="harganas-admin-empty">Memuat detail...</div>');
    var api = getApi();
    try {
      var res = await api.harganasAdminGetSubmissionDetail({ submission_id: sid });
      if (!res || res.ok !== true) throw new Error(res && res.message ? res.message : 'Gagal memuat detail submission.');
      renderDetail(res.data || {});
    } catch (err) {
      setHtml('harganas-admin-detail', '<div class="harganas-admin-empty is-error">' + escapeHtml(err && err.message ? err.message : 'Gagal memuat detail.') + '</div>');
    }
  }

  async function updateVerification(status) {
    var sid = selectedSubmissionId;
    if (!sid) {
      showToast('Pilih submission terlebih dahulu.', 'error');
      return;
    }
    var nextStatus = upper(status);
    var catatan = (byId('harganas-admin-catatan') || {}).value || '';
    if ((nextStatus === 'RESUBMIT_REQUIRED' || nextStatus === 'REJECTED') && !normalize(catatan)) {
      showToast('Catatan verifikator wajib diisi untuk status ini.', 'error');
      return;
    }
    var label = statusLabel(nextStatus);
    var ok = true;
    try { ok = window.confirm('Ubah status submission menjadi ' + label + '?'); } catch (err) {}
    if (!ok) return;

    var api = getApi();
    try {
      showMessage('Menyimpan status verifikasi...', 'success');
      var res = await api.harganasAdminUpdateVerification({
        submission_id: sid,
        status_verifikasi: nextStatus,
        catatan_verifikator: catatan
      });
      if (!res || res.ok !== true) throw new Error(res && res.message ? res.message : 'Gagal menyimpan verifikasi.');
      showToast('Status verifikasi berhasil disimpan.', 'success');
      await loadList();
      await loadDetail(sid);
    } catch (err2) {
      showMessage(err2 && err2.message ? err2.message : 'Gagal menyimpan verifikasi.', 'error');
    }
  }

  function bindEvents() {
    if (initialized) return;
    initialized = true;
    var root = byId('harganas-admin-root');
    if (!root) return;

    root.addEventListener('click', function (event) {
      var target = event.target;
      var back = target.closest && target.closest('#btn-harganas-admin-back');
      if (back) {
        var router = getRouter();
        if (router && typeof router.go === 'function') router.go('appLanding');
        return;
      }
      var refresh = target.closest && target.closest('#btn-harganas-admin-refresh');
      if (refresh) {
        loadList();
        return;
      }
      var apply = target.closest && target.closest('#btn-harganas-admin-apply-filter');
      if (apply) {
        selectedSubmissionId = '';
        loadList();
        return;
      }
      var item = target.closest && target.closest('.harganas-admin-item');
      if (item) {
        loadDetail(item.getAttribute('data-submission-id'));
        return;
      }
      var verify = target.closest && target.closest('[data-verify-status]');
      if (verify) {
        updateVerification(verify.getAttribute('data-verify-status'));
      }
    });

    root.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      var id = event.target && event.target.id;
      if (id === 'harganas-admin-filter-q' || id === 'harganas-admin-filter-desa' || id === 'harganas-admin-filter-kecamatan') {
        selectedSubmissionId = '';
        loadList();
      }
    });
  }

  function init(target) {
    var host = target || byId('harganas-admin-screen');
    if (!host) return;
    var root = byId('harganas-admin-root');
    if (!root) {
      host.innerHTML = '<div id="harganas-admin-root" class="harganas-admin-shell"></div>';
      root = byId('harganas-admin-root');
    }
    root.innerHTML = createShell();
    initialized = false;
    bindEvents();
    loadList();
  }

  window.HarganasAdminView = {
    version: VIEW_VERSION,
    init: init,
    refresh: loadList,
    loadList: loadList
  };
})(window, document);
