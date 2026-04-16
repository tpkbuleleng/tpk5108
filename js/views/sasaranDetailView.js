(function (window, document) {
  'use strict';

  window.__SASARAN_DETAIL_VIEW_BUILD = '20260416-01';
  console.log('SasaranDetailView build aktif:', window.__SASARAN_DETAIL_VIEW_BUILD);

  var LOCAL_SELECTED_SASARAN_KEY = 'tpk_selected_sasaran';

  var isInitialized = false;
  var currentRequestToken = 0;
  var currentDetail = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function getUI() {
    return window.UI || null;
  }

  function getApi() {
    return window.Api || null;
  }

  function getState() {
    return window.AppState || null;
  }

  function getStorage() {
    return window.Storage || null;
  }

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getActions() {
    return getConfig().API_ACTIONS || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function getActionName(key, fallback) {
    var actions = getActions();
    return actions[key] || fallback;
  }

  function showToast(message, type) {
    var ui = getUI();
    if (ui && typeof ui.showToast === 'function') {
      ui.showToast(message, type || 'info');
      return;
    }

    if (ui && typeof ui.toast === 'function') {
      ui.toast(message, type || 'info');
      return;
    }

    try {
      window.alert(message);
    } catch (err) {}
  }

  function setText(id, value) {
    var ui = getUI();
    if (ui && typeof ui.setText === 'function') {
      ui.setText(id, value);
      return;
    }

    var el = byId(id);
    if (el) {
      el.textContent = isMeaningful(value) ? String(value) : '-';
    }
  }

  function setHTML(id, html) {
    var ui = getUI();
    if (ui && typeof ui.setHTML === 'function') {
      ui.setHTML(id, html);
      return;
    }

    var el = byId(id);
    if (el) {
      el.innerHTML = html || '';
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeSpaces(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function normalizeUpperDisplay(value) {
    return normalizeSpaces(value).toUpperCase();
  }

  function isMeaningful(value) {
    if (value === undefined || value === null) return false;
    var text = normalizeSpaces(value);
    if (!text) return false;

    var upper = text.toUpperCase();
    return upper !== '-' &&
      upper !== 'NULL' &&
      upper !== 'UNDEFINED' &&
      upper !== 'N/A' &&
      upper !== 'NA';
  }

  function pickFirstMeaningful(values, fallback) {
    var list = Array.isArray(values) ? values : [values];

    for (var i = 0; i < list.length; i += 1) {
      if (isMeaningful(list[i])) return String(list[i]);
    }

    return fallback || '';
  }

  function parseJsonSafely(raw, fallback) {
    if (!raw) return fallback;
    if (typeof raw === 'object') return raw;

    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function formatDate(value) {
    if (!isMeaningful(value)) return '-';

    if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
      try {
        return value.toLocaleDateString('id-ID');
      } catch (err) {
        return String(value);
      }
    }

    var text = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      var parts = text.split('-');
      var dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(dt.getTime())) {
        try {
          return dt.toLocaleDateString('id-ID');
        } catch (err2) {
          return text;
        }
      }
    }

    var parsed = new Date(text);
    if (!isNaN(parsed.getTime())) {
      try {
        return parsed.toLocaleDateString('id-ID');
      } catch (err3) {
        return text;
      }
    }

    return text;
  }

  function formatDateTime(value) {
    if (!isMeaningful(value)) return '-';

    var parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
      return String(value);
    }

    try {
      return parsed.toLocaleString('id-ID');
    } catch (err) {
      return String(value);
    }
  }

  function formatValue(value, keyHint) {
    if (value === undefined || value === null || value === '') return '-';

    if (typeof value === 'boolean') {
      return value ? 'YA' : 'TIDAK';
    }

    if (Array.isArray(value)) {
      if (!value.length) return '-';
      return value.map(function (item) {
        return formatValue(item);
      }).join(', ');
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (err) {
        return '[object]';
      }
    }

    var text = normalizeSpaces(value);
    if (!text) return '-';

    var key = String(keyHint || '').toLowerCase();
    if (
      key.indexOf('tanggal') >= 0 ||
      key === 'updated_at' ||
      key === 'tanggal_lahir' ||
      key === 'tanggal_register' ||
      key === 'submit_at'
    ) {
      return key === 'updated_at' || key === 'submit_at'
        ? formatDateTime(text)
        : formatDate(text);
    }

    if (
      key === 'nama_sasaran' ||
      key === 'nama_kepala_keluarga' ||
      key === 'nama_ibu_kandung'
    ) {
      return normalizeUpperDisplay(text);
    }

    return text;
  }

  function humanizeKey(key) {
    var map = {
      nama_kepala_keluarga: 'Nama Kepala Keluarga',
      nama_ibu_kandung: 'Nama Ibu Kandung',
      alamat: 'Alamat Lengkap',
      data_pasangan: 'Data Pasangan',
      domisili_setelah_menikah: 'Domisili Setelah Menikah',
      kehamilan_ke: 'Kehamilan Ke',
      kehamilan_diinginkan: 'Kehamilan Diinginkan',
      bb_sebelum_hamil: 'Berat Badan Sebelum Hamil',
      tanggal_persalinan: 'Tanggal Persalinan',
      jumlah_anak_kandung: 'Jumlah Anak Kandung',
      tempat_persalinan: 'Tempat Persalinan',
      penolong_persalinan: 'Penolong Persalinan',
      cara_persalinan: 'Cara Persalinan',
      anak_ke: 'Anak Ke',
      berat_badan_lahir: 'Berat Badan Lahir',
      panjang_badan_lahir: 'Panjang Badan Lahir',
      sumber_air_minum_utama: 'Sumber Air Minum Utama',
      sumber_air_minum_utama_lainnya: 'Sumber Air Minum Utama Lainnya',
      fasilitas_bab: 'Fasilitas BAB',
      fasilitas_bab_lainnya: 'Fasilitas BAB Lainnya',
      keterangan_tambahan_awal: 'Keterangan Tambahan',
      registered_by: 'Diregistrasi Oleh',
      updated_by: 'Diperbarui Oleh'
    };

    if (map[key]) return map[key];

    return String(key || '')
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, function (ch) { return ch.toUpperCase(); });
  }

  function getSelectedSasaran() {
    var state = getState();
    if (state && typeof state.getSelectedSasaran === 'function') {
      var fromState = state.getSelectedSasaran() || {};
      if (fromState && Object.keys(fromState).length) return fromState;
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function') {
      var fromStorage = storage.get(keys.SELECTED_SASARAN || LOCAL_SELECTED_SASARAN_KEY, {}) || {};
      if (fromStorage && Object.keys(fromStorage).length) return fromStorage;
    }

    try {
      return JSON.parse(localStorage.getItem(LOCAL_SELECTED_SASARAN_KEY) || '{}');
    } catch (err) {
      return {};
    }
  }

  function setSelectedSasaran(item) {
    var safeItem = item && typeof item === 'object' ? item : {};
    var state = getState();
    var storage = getStorage();
    var keys = getStorageKeys();

    if (state && typeof state.setSelectedSasaran === 'function') {
      state.setSelectedSasaran(safeItem);
    }

    if (storage && typeof storage.set === 'function') {
      storage.set(keys.SELECTED_SASARAN || LOCAL_SELECTED_SASARAN_KEY, safeItem);
    }

    try {
      localStorage.setItem(LOCAL_SELECTED_SASARAN_KEY, JSON.stringify(safeItem));
    } catch (err) {}
  }

  function getActiveIdFromSelected(selected) {
    return String(
      (selected && (selected.id_sasaran || selected.id)) || ''
    ).trim();
  }

  function isDetailScreenActive() {
    var router = window.Router;
    if (router && typeof router.getCurrentRoute === 'function') {
      return router.getCurrentRoute() === 'sasaranDetail';
    }

    var screen = byId('sasaran-detail-screen');
    return !!(screen && screen.classList.contains('active'));
  }

  function getStatusBadgeClass(status) {
    var value = String(status || '').trim().toUpperCase();

    if (value === 'AKTIF') return 'badge-success-soft';
    if (value === 'NONAKTIF') return 'badge-danger-soft';
    if (value === 'SELESAI') return 'badge-success';
    if (value === 'PERLU_REVIEW') return 'badge-warning';
    if (value === 'RUJUK') return 'badge-warning';
    return 'badge-neutral';
  }

  function extractPayloadMap(raw) {
    var parsed = parseJsonSafely(
      (raw && (raw.payload_json || raw.data_laporan)) || {},
      {}
    );

    var merged = {};

    function mergeObject(obj) {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
      Object.keys(obj).forEach(function (key) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
          merged[key] = obj[key];
        }
      });
    }

    mergeObject(parsed.baseline_snapshot);
    mergeObject(parsed.answers);
    mergeObject(parsed.dynamic_fields);
    mergeObject(parsed.extra_payload);
    mergeObject(parsed);

    return merged;
  }

  function normalizeDetail(raw) {
    raw = raw || {};

    var extra = extractPayloadMap(raw);

    var kecamatan = pickFirstMeaningful([
      raw.nama_kecamatan,
      raw.kecamatan,
      extra.nama_kecamatan,
      extra.kecamatan
    ], '');

    var desa = pickFirstMeaningful([
      raw.desa_kelurahan,
      raw.nama_desa,
      raw.desa,
      extra.desa_kelurahan,
      extra.nama_desa,
      extra.desa
    ], '');

    var dusun = pickFirstMeaningful([
      raw.dusun_rw,
      raw.nama_dusun,
      raw.dusun,
      extra.dusun_rw,
      extra.nama_dusun,
      extra.dusun
    ], '');

    var wilayah = pickFirstMeaningful([
      raw.nama_wilayah,
      raw.wilayah,
      extra.nama_wilayah,
      extra.wilayah,
      [dusun, desa, kecamatan].filter(Boolean).join(' • ')
    ], '-');

    var normalized = {
      id_sasaran: pickFirstMeaningful([raw.id_sasaran, raw.id, extra.id_sasaran], ''),
      nama_sasaran: pickFirstMeaningful([raw.nama_sasaran, extra.nama_sasaran], ''),
      status_sasaran: pickFirstMeaningful([raw.status_sasaran, raw.status, extra.status_sasaran], 'AKTIF'),
      jenis_sasaran: pickFirstMeaningful([raw.jenis_sasaran, extra.jenis_sasaran], ''),
      nik_sasaran: pickFirstMeaningful([raw.nik_sasaran, raw.nik, extra.nik_sasaran, extra.nik], ''),
      nomor_kk: pickFirstMeaningful([raw.nomor_kk, extra.nomor_kk], ''),
      tanggal_lahir: pickFirstMeaningful([raw.tanggal_lahir, extra.tanggal_lahir], ''),
      updated_at: pickFirstMeaningful([raw.updated_at, raw.tanggal_register, extra.updated_at], ''),
      nama_wilayah: wilayah,
      nama_kecamatan: kecamatan,
      nama_desa: desa,
      nama_dusun: dusun,
      alamat: pickFirstMeaningful([raw.alamat, extra.alamat], ''),
      nama_kepala_keluarga: pickFirstMeaningful([raw.nama_kepala_keluarga, extra.nama_kepala_keluarga], ''),
      nama_ibu_kandung: pickFirstMeaningful([raw.nama_ibu_kandung, extra.nama_ibu_kandung], ''),
      data_pasangan: pickFirstMeaningful([raw.data_pasangan, extra.data_pasangan], ''),
      domisili_setelah_menikah: pickFirstMeaningful([raw.domisili_setelah_menikah, extra.domisili_setelah_menikah], ''),
      kehamilan_ke: pickFirstMeaningful([raw.kehamilan_ke, extra.kehamilan_ke], ''),
      kehamilan_diinginkan: pickFirstMeaningful([raw.kehamilan_diinginkan, extra.kehamilan_diinginkan], ''),
      bb_sebelum_hamil: pickFirstMeaningful([raw.bb_sebelum_hamil, extra.bb_sebelum_hamil], ''),
      tanggal_persalinan: pickFirstMeaningful([raw.tanggal_persalinan, extra.tanggal_persalinan], ''),
      jumlah_anak_kandung: pickFirstMeaningful([raw.jumlah_anak_kandung, extra.jumlah_anak_kandung], ''),
      tempat_persalinan: pickFirstMeaningful([raw.tempat_persalinan, extra.tempat_persalinan], ''),
      penolong_persalinan: pickFirstMeaningful([raw.penolong_persalinan, extra.penolong_persalinan], ''),
      cara_persalinan: pickFirstMeaningful([raw.cara_persalinan, extra.cara_persalinan], ''),
      anak_ke: pickFirstMeaningful([raw.anak_ke, extra.anak_ke], ''),
      berat_badan_lahir: pickFirstMeaningful([raw.berat_badan_lahir, extra.berat_badan_lahir], ''),
      panjang_badan_lahir: pickFirstMeaningful([raw.panjang_badan_lahir, extra.panjang_badan_lahir], ''),
      sumber_air_minum_utama: pickFirstMeaningful([raw.sumber_air_minum_utama, extra.sumber_air_minum_utama], ''),
      sumber_air_minum_utama_lainnya: pickFirstMeaningful([raw.sumber_air_minum_utama_lainnya, extra.sumber_air_minum_utama_lainnya], ''),
      fasilitas_bab: pickFirstMeaningful([raw.fasilitas_bab, extra.fasilitas_bab], ''),
      fasilitas_bab_lainnya: pickFirstMeaningful([raw.fasilitas_bab_lainnya, extra.fasilitas_bab_lainnya], ''),
      keterangan_tambahan_awal: pickFirstMeaningful([raw.keterangan_tambahan_awal, extra.keterangan_tambahan_awal], ''),
      registered_by: pickFirstMeaningful([raw.registered_by, extra.registered_by], ''),
      updated_by: pickFirstMeaningful([raw.updated_by, extra.updated_by], ''),
      id_tim: pickFirstMeaningful([raw.id_tim, extra.id_tim], ''),
      nama_tim: pickFirstMeaningful([raw.nama_tim, extra.nama_tim], ''),
      raw: raw,
      extra_source: Object.assign({}, extra, raw)
    };

    return normalized;
  }

  function normalizeRiwayatItem(raw) {
    raw = raw || {};

    return {
      id_pendampingan: raw.id_pendampingan || raw.id || '',
      tanggal_pendampingan: raw.tanggal_pendampingan || raw.submit_at || raw.created_at || '',
      status_kunjungan: raw.status_kunjungan || raw.status || '',
      catatan_umum: raw.catatan_umum || raw.ringkasan || raw.catatan || '',
      extra_fields: raw.extra_fields || parseJsonSafely(raw.extra_fields_json, {}),
      raw: raw
    };
  }

  function normalizeRiwayatResponse(result) {
    var data = (result && result.data) || {};

    if (Array.isArray(data)) {
      return data.map(normalizeRiwayatItem);
    }

    if (Array.isArray(data.items)) {
      return data.items.map(normalizeRiwayatItem);
    }

    if (Array.isArray(data.list)) {
      return data.list.map(normalizeRiwayatItem);
    }

    if (data && typeof data === 'object' && (data.id_pendampingan || data.id)) {
      return [normalizeRiwayatItem(data)];
    }

    return [];
  }

  function renderHeader(detail) {
    var safe = detail || {};
    var status = safe.status_sasaran || 'AKTIF';

    setText('detail-nama-sasaran', formatValue(safe.nama_sasaran, 'nama_sasaran'));
    setText('detail-id-sasaran', 'ID Sasaran: ' + (safe.id_sasaran || '-'));
    setText('detail-jenis', formatValue(safe.jenis_sasaran, 'jenis_sasaran'));
    setText('detail-nik', formatValue(safe.nik_sasaran, 'nik_sasaran'));
    setText('detail-kk', formatValue(safe.nomor_kk, 'nomor_kk'));
    setText('detail-tanggal-lahir', formatValue(safe.tanggal_lahir, 'tanggal_lahir'));
    setText('detail-wilayah', formatValue(safe.nama_wilayah, 'wilayah'));
    setText('detail-updated-at', formatValue(safe.updated_at, 'updated_at'));

    var badge = byId('detail-status-badge');
    if (badge) {
      badge.textContent = formatValue(status, 'status_sasaran');
      badge.className = 'badge ' + getStatusBadgeClass(status);
    }
  }

  function collectExtraEntries(detail) {
    var safe = detail || {};
    var src = safe.extra_source || {};
    var entries = [];

    var used = {};

    function pushEntry(key, explicitValue) {
      var value = explicitValue !== undefined ? explicitValue : src[key];
      if (!isMeaningful(value)) return;

      var uniqueKey = String(key).toUpperCase();
      if (used[uniqueKey]) return;
      used[uniqueKey] = true;

      entries.push({
        key: key,
        label: humanizeKey(key),
        value: formatValue(value, key)
      });
    }

    [
      'nama_kepala_keluarga',
      'nama_ibu_kandung',
      'alamat',
      'data_pasangan',
      'domisili_setelah_menikah',
      'kehamilan_ke',
      'kehamilan_diinginkan',
      'bb_sebelum_hamil',
      'tanggal_persalinan',
      'jumlah_anak_kandung',
      'tempat_persalinan',
      'penolong_persalinan',
      'cara_persalinan',
      'anak_ke',
      'berat_badan_lahir',
      'panjang_badan_lahir',
      'sumber_air_minum_utama',
      'sumber_air_minum_utama_lainnya',
      'fasilitas_bab',
      'fasilitas_bab_lainnya',
      'keterangan_tambahan_awal',
      'registered_by',
      'updated_by'
    ].forEach(function (key) {
      pushEntry(key, safe[key]);
    });

    var skipKeys = {
      id: true,
      id_sasaran: true,
      nama_sasaran: true,
      status_sasaran: true,
      status: true,
      jenis_sasaran: true,
      nik: true,
      nik_sasaran: true,
      nomor_kk: true,
      tanggal_lahir: true,
      updated_at: true,
      tanggal_register: true,
      nama_wilayah: true,
      wilayah: true,
      kecamatan: true,
      nama_kecamatan: true,
      desa: true,
      nama_desa: true,
      desa_kelurahan: true,
      dusun: true,
      dusun_rw: true,
      nama_dusun: true,
      data_laporan: true,
      payload_json: true,
      raw: true,
      extra_source: true,
      answers: true,
      dynamic_fields: true,
      extra_payload: true,
      baseline_snapshot: true,
      is_duplicate_flag: true,
      duplicate_level: true,
      duplicate_note: true,
      unique_key: true,
      lokasi_gps: true,
      client_submit_id: true,
      sync_source: true,
      umur_tahun_saat_register: true,
      umur_bulan_saat_register: true,
      nama_tim: true,
      id_tim: true
    };

    Object.keys(src)
      .sort()
      .forEach(function (key) {
        if (skipKeys[key]) return;
        pushEntry(key);
      });

    return entries;
  }

  function renderExtraFields(detail) {
    var entries = collectExtraEntries(detail);

    if (!entries.length) {
      setHTML(
        'detail-extra-fields',
        '<div><span class="label">Belum ada</span><strong>-</strong></div>'
      );
      return;
    }

    var html = entries.map(function (entry) {
      return [
        '<div>',
          '<span class="label">', escapeHtml(entry.label), '</span>',
          '<strong>', escapeHtml(entry.value), '</strong>',
        '</div>'
      ].join('');
    }).join('');

    setHTML('detail-extra-fields', html);
  }

  function renderRiwayat(items) {
    var safeItems = Array.isArray(items) ? items : [];

    if (!safeItems.length) {
      setHTML(
        'detail-riwayat-ringkas',
        '<p class="muted-text">Belum ada riwayat pendampingan untuk sasaran ini.</p>'
      );
      return;
    }

    var html = safeItems.slice(0, 5).map(function (item) {
      var tanggal = formatValue(item.tanggal_pendampingan, 'tanggal_pendampingan');
      var status = formatValue(item.status_kunjungan || '-', 'status_kunjungan');
      var catatan = formatValue(item.catatan_umum || '-', 'catatan_umum');

      return [
        '<article class="list-card">',
          '<div class="list-card-header row-between">',
            '<div>',
              '<h4 style="margin:0 0 4px;">', escapeHtml(tanggal), '</h4>',
              '<p class="muted-text" style="margin:0;">ID Pendampingan: ', escapeHtml(item.id_pendampingan || '-'), '</p>',
            '</div>',
            '<span class="badge badge-neutral">', escapeHtml(status), '</span>',
          '</div>',
          '<div style="margin-top:10px;">',
            '<span class="label">Catatan Umum</span>',
            '<strong>', escapeHtml(catatan), '</strong>',
          '</div>',
        '</article>'
      ].join('');
    }).join('');

    setHTML('detail-riwayat-ringkas', html);
  }

  function renderLoadingPreview(selected) {
    var safe = normalizeDetail(selected || {});
    renderHeader(safe);

    setHTML(
      'detail-extra-fields',
      '<div><span class="label">Memuat</span><strong>Data tambahan sedang dimuat...</strong></div>'
    );

    setHTML(
      'detail-riwayat-ringkas',
      '<p class="muted-text">Riwayat pendampingan sedang dimuat...</p>'
    );
  }

  function renderErrorState(selected, message) {
    var safe = normalizeDetail(selected || {});
    renderHeader(safe);

    setHTML(
      'detail-extra-fields',
      '<div><span class="label">Gagal memuat</span><strong>' + escapeHtml(message || 'Detail sasaran gagal dimuat.') + '</strong></div>'
    );

    setHTML(
      'detail-riwayat-ringkas',
      '<p class="muted-text">Riwayat belum dapat dimuat.</p>'
    );
  }

  async function fetchDetail(idSasaran) {
    var api = getApi();
    if (!api || typeof api.post !== 'function') {
      throw new Error('Api.post belum tersedia.');
    }

    var action = getActionName('GET_SASARAN_DETAIL', 'getSasaranDetail');
    var result = await api.post(action, {
      id_sasaran: idSasaran
    }, {
      includeAuth: true
    });

    if (!result || result.ok === false) {
      throw new Error((result && result.message) || 'Gagal memuat detail sasaran.');
    }

    return normalizeDetail(result.data || {});
  }

  async function fetchRiwayat(idSasaran) {
    var api = getApi();
    if (!api || typeof api.post !== 'function') {
      throw new Error('Api.post belum tersedia.');
    }

    var action = getActionName('GET_RIWAYAT_PENDAMPINGAN_SASARAN', 'getRiwayatPendampinganSasaran');
    var result = await api.post(action, {
      id_sasaran: idSasaran,
      limit: 5
    }, {
      includeAuth: true
    });

    if (!result || result.ok === false) {
      throw new Error((result && result.message) || 'Gagal memuat riwayat pendampingan.');
    }

    return normalizeRiwayatResponse(result);
  }

  function openPendampinganFromDetail() {
    var selected = currentDetail || getSelectedSasaran() || {};
    var idSasaran = getActiveIdFromSelected(selected);

    if (!idSasaran) {
      showToast('Data sasaran belum tersedia.', 'warning');
      return;
    }

    setSelectedSasaran(selected);

    if (window.PendampinganView && typeof window.PendampinganView.openCreate === 'function') {
      window.PendampinganView.openCreate(selected);
      return;
    }

    if (window.Router && typeof window.Router.go === 'function') {
      window.Router.go('pendampingan', {
        onRouteReady: function () {
          if (window.PendampinganView && typeof window.PendampinganView.openCreate === 'function') {
            window.PendampinganView.openCreate(selected);
          }
        }
      });
      return;
    }

    showToast('Halaman pendampingan belum tersedia.', 'warning');
  }

  function openEditSasaranFromDetail() {
    var selected = currentDetail || getSelectedSasaran() || {};
    var idSasaran = getActiveIdFromSelected(selected);

    if (!idSasaran) {
      showToast('Data sasaran belum tersedia.', 'warning');
      return;
    }

    setSelectedSasaran(selected);

    if (window.RegistrasiView && typeof window.RegistrasiView.openEdit === 'function') {
      window.RegistrasiView.openEdit(selected);
      return;
    }

    if (window.Router && typeof window.Router.go === 'function') {
      window.Router.go('registrasi', {
        onRouteReady: function () {
          if (window.RegistrasiView && typeof window.RegistrasiView.openEdit === 'function') {
            window.RegistrasiView.openEdit(selected);
            return;
          }

          showToast('Mode edit data sasaran belum aktif pada frontend ini.', 'warning');
        }
      });
      return;
    }

    showToast('Mode edit data sasaran belum aktif.', 'warning');
  }

  var SasaranDetailView = {
    init: function () {
      if (isInitialized) {
        this.autoOpenSelectedIfNeeded();
        return;
      }

      isInitialized = true;
      this.bindEvents();
      this.autoOpenSelectedIfNeeded();
    },

    bindEvents: function () {
      var self = this;

      [
        ['btn-back-list-from-detail', function () {
          if (window.Router && typeof window.Router.go === 'function') {
            window.Router.go('sasaranList');
          }
        }],
        ['btn-go-to-pendampingan', function () {
          openPendampinganFromDetail();
        }],
        ['btn-go-to-edit-sasaran', function () {
          openEditSasaranFromDetail();
        }]
      ].forEach(function (entry) {
        var btn = byId(entry[0]);
        if (!btn || btn.dataset.bound === '1') return;

        btn.dataset.bound = '1';
        btn.addEventListener('click', entry[1]);
      });
    },

    autoOpenSelectedIfNeeded: function () {
      if (!isDetailScreenActive()) return;

      var selected = getSelectedSasaran() || {};
      var idSasaran = getActiveIdFromSelected(selected);
      if (!idSasaran) return;

      if (currentDetail && String(currentDetail.id_sasaran || '') === String(idSasaran)) {
        return;
      }

      this.open(idSasaran, {
        skipRoute: true,
        selected: selected,
        silent: true
      });
    },

    open: async function (idSasaran, options) {
      this.init();

      options = options || {};
      var selected = options.selected || getSelectedSasaran() || {};
      var resolvedId = String(idSasaran || selected.id_sasaran || selected.id || '').trim();

      if (!resolvedId) {
        showToast('ID sasaran tidak ditemukan.', 'warning');

        if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go('sasaranList');
        }
        return;
      }

      if (!options.skipRoute && window.Router && typeof window.Router.go === 'function') {
        window.Router.go('sasaranDetail', {
          onRouteReady: function () {
            if (window.SasaranDetailView && typeof window.SasaranDetailView.open === 'function') {
              window.SasaranDetailView.open(resolvedId, {
                skipRoute: true,
                selected: selected,
                silent: true
              });
            }
          }
        });
        return;
      }

      var previewSelected = Object.assign({}, selected, {
        id_sasaran: selected.id_sasaran || selected.id || resolvedId,
        id: selected.id || selected.id_sasaran || resolvedId
      });

      setSelectedSasaran(previewSelected);
      currentDetail = normalizeDetail(previewSelected);
      renderLoadingPreview(previewSelected);

      var requestToken = ++currentRequestToken;
      var detailError = null;
      var riwayatError = null;

      try {
        var detail = await fetchDetail(resolvedId);
        if (requestToken !== currentRequestToken) return;

        currentDetail = detail;
        setSelectedSasaran(detail);
        renderHeader(detail);
        renderExtraFields(detail);
      } catch (err) {
        if (requestToken !== currentRequestToken) return;

        detailError = err;
        currentDetail = normalizeDetail(previewSelected);
        renderErrorState(previewSelected, (err && err.message) || 'Detail sasaran gagal dimuat.');
      }

      try {
        var items = await fetchRiwayat(resolvedId);
        if (requestToken !== currentRequestToken) return;
        renderRiwayat(items);
      } catch (err2) {
        if (requestToken !== currentRequestToken) return;
        riwayatError = err2;
        setHTML(
          'detail-riwayat-ringkas',
          '<p class="muted-text">Riwayat pendampingan belum dapat dimuat.</p>'
        );
      }

      if (!options.silent && detailError) {
        showToast((detailError && detailError.message) || 'Detail sasaran gagal dimuat.', 'warning');
      }

      if (!options.silent && !detailError && riwayatError) {
        showToast('Detail sasaran tampil, tetapi riwayat pendampingan belum dapat dimuat.', 'warning');
      }
    },

    refresh: function () {
      var selected = currentDetail || getSelectedSasaran() || {};
      var idSasaran = getActiveIdFromSelected(selected);

      if (!idSasaran) {
        showToast('Tidak ada sasaran yang dipilih.', 'warning');
        return;
      }

      return this.open(idSasaran, {
        skipRoute: true,
        selected: selected,
        silent: false
      });
    },

    getCurrentDetail: function () {
      return currentDetail || {};
    }
  };

  window.SasaranDetailView = SasaranDetailView;

  document.addEventListener('DOMContentLoaded', function () {
    if (window.SasaranDetailView && typeof window.SasaranDetailView.init === 'function') {
      window.SasaranDetailView.init();
    }
  });
})(window, document);
