(function (window, document) {
  'use strict';

  var SELECTED_KEY = 'tpk_selected_sasaran';
  var DETAIL_CACHE_KEY = 'tpk_sasaran_detail_cache_v1';
  var DETAIL_CACHE_TTL_MS = 10 * 60 * 1000;
  var RIWAYAT_CACHE_TTL_MS = 5 * 60 * 1000;

  var isInitialized = false;
  var currentRequestToken = 0;
  var currentDetail = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function getApi() {
    return window.Api || null;
  }

  function getRouter() {
    return window.Router || null;
  }

  function getUI() {
    return window.UI || null;
  }

  function getStorage() {
    return window.Storage || null;
  }

  function getState() {
    return window.AppState || null;
  }

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function getActions() {
    return getConfig().API_ACTIONS || {};
  }

  function getActionName(key, fallback) {
    var actions = getActions();
    return actions[key] || fallback;
  }

  function safeJsonParse(raw, fallback) {
    if (!raw) return fallback;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function readStorage(key, fallback) {
    var storage = getStorage();
    if (storage && typeof storage.get === 'function') {
      return storage.get(key, fallback);
    }

    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return safeJsonParse(raw, fallback);
    } catch (err) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    var storage = getStorage();
    if (storage && typeof storage.set === 'function') {
      storage.set(key, value);
      return;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {}
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

  function normalizeText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function normalizeUpperDisplay(value) {
    return normalizeText(value).toUpperCase();
  }

  function isMeaningful(value) {
    if (value === undefined || value === null) return false;
    var text = normalizeText(value);
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

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    if (!isMeaningful(value)) return '-';

    var raw = String(value).trim();
    var dt = new Date(raw);
    if (!isNaN(dt.getTime())) {
      try {
        return dt.toLocaleDateString('id-ID');
      } catch (err) {
        return raw;
      }
    }

    return raw;
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

    var text = normalizeText(value);
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

  function getProfile() {
    var state = getState();
    if (state && typeof state.getProfile === 'function') {
      var fromState = state.getProfile() || {};
      if (fromState && Object.keys(fromState).length) return fromState;
    }

    var keys = getStorageKeys();
    if (keys.PROFILE) {
      var fromStorage = readStorage(keys.PROFILE, {});
      if (fromStorage && Object.keys(fromStorage).length) return fromStorage;
    }

    var bootstrap = readStorage('tpk_bootstrap_lite', {});
    if (bootstrap && bootstrap.profile && Object.keys(bootstrap.profile).length) {
      return bootstrap.profile;
    }

    return readStorage('tpk_profile', {}) || {};
  }

  function getScopeKey() {
    var profile = getProfile() || {};
    var idUser = pickFirstMeaningful([profile.id_user, profile.username], 'anon');
    var idTim = pickFirstMeaningful([profile.id_tim], 'NO_TIM');
    var bookKey = pickFirstMeaningful([profile.kode_kecamatan, profile.book_key], 'NO_BOOK');
    return [idUser, idTim, bookKey].join('::');
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
      var fromStorage = storage.get(keys.SELECTED_SASARAN || SELECTED_KEY, {}) || {};
      if (fromStorage && Object.keys(fromStorage).length) return fromStorage;
    }

    try {
      return JSON.parse(localStorage.getItem(SELECTED_KEY) || '{}');
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
      storage.set(keys.SELECTED_SASARAN || SELECTED_KEY, safeItem);
    }

    try {
      localStorage.setItem(SELECTED_KEY, JSON.stringify(safeItem));
    } catch (err) {}
  }

  function getItemId(item) {
    return normalizeText((item && (item.id_sasaran || item.id)) || '');
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
    var parsed = safeJsonParse(
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

    return {
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
  }

  function normalizeRiwayatItem(raw) {
    raw = raw || {};

    return {
      id_pendampingan: raw.id_pendampingan || raw.id || '',
      tanggal_pendampingan: raw.tanggal_pendampingan || raw.submit_at || raw.created_at || '',
      status_kunjungan: raw.status_kunjungan || raw.status || '',
      catatan_umum: raw.catatan_umum || raw.ringkasan || raw.catatan || '',
      raw: raw
    };
  }

  function normalizeRiwayatResponse(result) {
    var data = (result && result.data) || {};

    if (Array.isArray(data)) return data.map(normalizeRiwayatItem);
    if (Array.isArray(data.items)) return data.items.map(normalizeRiwayatItem);
    if (Array.isArray(data.list)) return data.list.map(normalizeRiwayatItem);
    if (data && typeof data === 'object' && (data.id_pendampingan || data.id)) return [normalizeRiwayatItem(data)];

    return [];
  }

  function getCacheMap() {
    var scopeKey = getScopeKey();
    var raw = readStorage(DETAIL_CACHE_KEY, {});
    raw = raw && typeof raw === 'object' ? raw : {};
    raw[scopeKey] = raw[scopeKey] || {};
    return {
      scopeKey: scopeKey,
      data: raw
    };
  }

  function getCachedEntry(idSasaran) {
    var id = String(idSasaran || '').trim();
    if (!id) return null;

    var map = getCacheMap();
    var entry = map.data[map.scopeKey][id];
    if (!entry) return null;

    var cachedAt = entry.cached_at || '';
    var ageMs = cachedAt ? (Date.now() - new Date(cachedAt).getTime()) : Number.MAX_SAFE_INTEGER;

    return {
      detail: entry.detail || null,
      riwayat: Array.isArray(entry.riwayat) ? entry.riwayat : [],
      cachedAt: cachedAt,
      detailFresh: ageMs >= 0 && ageMs <= DETAIL_CACHE_TTL_MS,
      riwayatFresh: ageMs >= 0 && ageMs <= RIWAYAT_CACHE_TTL_MS
    };
  }

  function setCachedEntry(idSasaran, detail, riwayat) {
    var id = String(idSasaran || '').trim();
    if (!id) return;

    var map = getCacheMap();
    var prev = map.data[map.scopeKey][id] || {};

    map.data[map.scopeKey][id] = {
      cached_at: new Date().toISOString(),
      detail: detail || prev.detail || null,
      riwayat: Array.isArray(riwayat) ? riwayat : (prev.riwayat || [])
    };

    writeStorage(DETAIL_CACHE_KEY, map.data);
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

    Object.keys(src).sort().forEach(function (key) {
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

  function isDetailScreenActive() {
    var screen = byId('sasaran-detail-screen');
    return !!(screen && !screen.classList.contains('hidden'));
  }

  function autoOpenSelectedIfNeeded() {
    if (!isDetailScreenActive()) return;
    if (currentDetail && getItemId(currentDetail)) return;

    var selected = getSelectedSasaran() || {};
    var id = getItemId(selected);
    if (!id) return;

    if (window.SasaranDetailView && typeof window.SasaranDetailView.open === 'function') {
      window.SasaranDetailView.open(id, {
        skipRoute: true,
        selected: selected,
        silent: true
      });
    }
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
      includeAuth: true,
      timeoutMs: 8000
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
      includeAuth: true,
      timeoutMs: 6000
    });

    if (!result || result.ok === false) {
      throw new Error((result && result.message) || 'Gagal memuat riwayat pendampingan.');
    }

    return normalizeRiwayatResponse(result);
  }

  function openPendampinganFromDetail() {
    var selected = currentDetail || getSelectedSasaran() || {};
    var idSasaran = getItemId(selected);

    if (!idSasaran) {
      showToast('Data sasaran belum tersedia.', 'warning');
      return;
    }

    setSelectedSasaran(selected);

    if (window.PendampinganView && typeof window.PendampinganView.openCreate === 'function') {
      window.PendampinganView.openCreate(selected);
      return;
    }

    var router = getRouter();
    if (router && typeof router.go === 'function') {
      router.go('pendampingan', {
        onRouteReady: function () {
          if (window.PendampinganView && typeof window.PendampinganView.openCreate === 'function') {
            window.PendampinganView.openCreate(selected);
          }
        }
      });
    }
  }

  function openEditSasaranFromDetail() {
    var selected = currentDetail || getSelectedSasaran() || {};
    var idSasaran = getItemId(selected);

    if (!idSasaran) {
      showToast('Data sasaran untuk edit tidak ditemukan.', 'warning');
      return;
    }

    setSelectedSasaran(selected);

    if (window.RegistrasiView && typeof window.RegistrasiView.openEdit === 'function') {
      window.RegistrasiView.openEdit(selected);
      return;
    }

    if (window.RegistrasiForm && typeof window.RegistrasiForm.openEdit === 'function') {
      window.RegistrasiForm.openEdit(selected);
      return;
    }

    var router = getRouter();
    if (router && typeof router.go === 'function') {
      router.go('registrasi');
    }
  }

  var SasaranDetailView = {
    init: function () {
      if (isInitialized) {
        autoOpenSelectedIfNeeded();
        return;
      }

      isInitialized = true;

      var btnBack = byId('btn-back-list-from-detail');
      var btnPendampingan = byId('btn-go-to-pendampingan');
      var btnEdit = byId('btn-go-to-edit-sasaran');

      if (btnBack && btnBack.dataset.bound !== '1') {
        btnBack.dataset.bound = '1';
        btnBack.addEventListener('click', function (event) {
          event.preventDefault();
          var router = getRouter();
          if (router && typeof router.go === 'function') {
            router.go('sasaranList');
          }
        });
      }

      if (btnPendampingan && btnPendampingan.dataset.bound !== '1') {
        btnPendampingan.dataset.bound = '1';
        btnPendampingan.addEventListener('click', function (event) {
          event.preventDefault();
          openPendampinganFromDetail();
        });
      }

      if (btnEdit && btnEdit.dataset.bound !== '1') {
        btnEdit.dataset.bound = '1';
        btnEdit.addEventListener('click', function (event) {
          event.preventDefault();
          openEditSasaranFromDetail();
        });
      }

      autoOpenSelectedIfNeeded();
    },

    open: async function (idSasaran, options) {
      this.init();

      options = options || {};
      var selected = options.selected || getSelectedSasaran() || {};
      var resolvedId = String(idSasaran || selected.id_sasaran || selected.id || '').trim();

      if (!resolvedId) {
        showToast('ID sasaran tidak ditemukan.', 'warning');
        var routerToList = getRouter();
        if (routerToList && typeof routerToList.go === 'function') {
          routerToList.go('sasaranList');
        }
        return;
      }

      if (!options.skipRoute) {
        var router = getRouter();
        if (router && typeof router.go === 'function') {
          router.go('sasaranDetail', {
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
      }

      var previewSelected = Object.assign({}, selected, {
        id_sasaran: selected.id_sasaran || selected.id || resolvedId,
        id: selected.id || selected.id_sasaran || resolvedId
      });

      setSelectedSasaran(previewSelected);
      currentDetail = normalizeDetail(previewSelected);

      var cached = getCachedEntry(resolvedId);
      if (cached && cached.detail) {
        currentDetail = normalizeDetail(cached.detail);
        renderHeader(currentDetail);
        renderExtraFields(currentDetail);

        if (cached.riwayat && cached.riwayat.length) {
          renderRiwayat(cached.riwayat);
        } else {
          setHTML('detail-riwayat-ringkas', '<p class="muted-text">Riwayat pendampingan sedang dimuat...</p>');
        }

        if (cached.detailFresh && cached.riwayatFresh && !options.forceRefresh) {
          return;
        }
      } else {
        renderLoadingPreview(previewSelected);
      }

      var requestToken = ++currentRequestToken;

      var detail = currentDetail;
      var riwayat = cached && Array.isArray(cached.riwayat) ? cached.riwayat : [];

      try {
        detail = await fetchDetail(resolvedId);
        if (requestToken !== currentRequestToken) return;

        currentDetail = detail;
        setSelectedSasaran(detail);
        renderHeader(detail);
        renderExtraFields(detail);
      } catch (err) {
        if (requestToken !== currentRequestToken) return;

        if (!(cached && cached.detail)) {
          setHTML(
            'detail-extra-fields',
            '<div><span class="label">Gagal memuat</span><strong>' + escapeHtml((err && err.message) || 'Detail sasaran belum dapat dimuat.') + '</strong></div>'
          );
        }
      }

      try {
        riwayat = await fetchRiwayat(resolvedId);
        if (requestToken !== currentRequestToken) return;
        renderRiwayat(riwayat);
      } catch (err2) {
        if (requestToken !== currentRequestToken) return;

        if (!riwayat.length) {
          setHTML(
            'detail-riwayat-ringkas',
            '<p class="muted-text">Riwayat pendampingan belum dapat dimuat.</p>'
          );
        }
      }

      setCachedEntry(resolvedId, detail, riwayat);
    },

    openById: function (idSasaran, options) {
      return this.open(idSasaran, options || {});
    },

    refresh: function () {
      var selected = currentDetail || getSelectedSasaran() || {};
      var idSasaran = getItemId(selected);

      if (!idSasaran) {
        showToast('Tidak ada sasaran yang dipilih.', 'warning');
        return;
      }

      return this.open(idSasaran, {
        skipRoute: true,
        selected: selected,
        forceRefresh: true
      });
    },

    getCurrentDetail: function () {
      return currentDetail || {};
    },

    getCurrentItem: function () {
      return currentDetail || {};
    }
  };

  window.SasaranDetailView = SasaranDetailView;
  window.SasaranDetail = SasaranDetailView;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (window.SasaranDetailView && typeof window.SasaranDetailView.init === 'function') {
        window.SasaranDetailView.init();
      }
    });
  } else {
    window.SasaranDetailView.init();
  }
})(window, document);
