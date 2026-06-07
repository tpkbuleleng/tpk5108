(function (window, document) {
  'use strict';

  window.__SASARAN_LIST_VIEW_BUILD = '20260607-SASARAN-DISPLAY-R1';
  console.log('SasaranListView build aktif:', window.__SASARAN_LIST_VIEW_BUILD);

  var FILTER_KEYWORD_ID = 'filter-keyword-sasaran';
  var FILTER_JENIS_ID = 'filter-jenis-sasaran';
  var FILTER_STATUS_ID = 'filter-status-sasaran';
  var FILTER_PRIORITAS_ID = 'filter-prioritas-sasaran';
  var FILTER_PENDAMPINGAN_ID = 'filter-pendampingan-sasaran';
  var BTN_REFRESH_ID = 'btn-refresh-sasaran';
  var BTN_RESET_ID = 'btn-reset-filter-sasaran';
  var BTN_BACK_ID = 'btn-back-dashboard-from-list';
  var META_ID = 'sasaran-list-meta';
  var CONTAINER_ID = 'sasaran-list-container';

  var LOCAL_SELECTED_KEY = 'tpk_selected_sasaran';
  var LOCAL_CACHE_KEY = 'tpk_sasaran_cache_v1';
  var LIST_CACHE_TTL_MS = 10 * 60 * 1000;

  function byId(id) {
    return document.getElementById(id);
  }

  function getApi() {
    return window.Api || null;
  }

  function getRouter() {
    return window.Router || null;
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

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function getUI() {
    return window.UI || null;
  }

  function toast(message, type) {
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

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isPlainObject(value) {
    return !!value && Object.prototype.toString.call(value) === '[object Object]';
  }

  function collectDisplayParts(value, parts, seen, depth) {
    if (depth > 4 || value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach(function (item) {
        collectDisplayParts(item, parts, seen, depth + 1);
      });
      return;
    }

    if (isPlainObject(value)) {
      var preferred = [
        'nama_wilayah_lengkap', 'nama_wilayah_sasaran', 'nama_wilayah', 'wilayah_sasaran',
        'wilayah', 'label', 'text', 'display', 'nama', 'value',
        'dusun_rw', 'nama_dusun', 'dusun', 'desa_kelurahan', 'nama_desa', 'desa',
        'kecamatan', 'nama_kecamatan', 'alamat'
      ];

      preferred.forEach(function (key) {
        if (value[key] !== undefined && value[key] !== null) {
          collectDisplayParts(value[key], parts, seen, depth + 1);
        }
      });

      Object.keys(value).forEach(function (key) {
        if (preferred.indexOf(key) >= 0) return;
        collectDisplayParts(value[key], parts, seen, depth + 1);
      });
      return;
    }

    var text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    if (!text) return;

    var upper = text.toUpperCase();
    if (upper === '-' || upper === 'NULL' || upper === 'UNDEFINED' || upper === 'N/A' || upper === 'NA' || upper === '[OBJECT OBJECT]') {
      return;
    }

    if (!seen[upper]) {
      seen[upper] = true;
      parts.push(text);
    }
  }

  function toDisplayText(value) {
    var parts = [];
    collectDisplayParts(value, parts, {}, 0);
    return parts.join(' • ');
  }

  function normalizeSpaces(value) {
    return String(toDisplayText(value) || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeUpper(value) {
    return normalizeSpaces(value).toUpperCase();
  }

  function upperDisplay(value) {
    var text = normalizeSpaces(value);
    return text ? text.toUpperCase() : '';
  }

  function getProfile() {
    var state = getState();
    if (state && typeof state.getProfile === 'function') {
      var fromState = state.getProfile();
      if (fromState && Object.keys(fromState).length) return fromState;
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    if (storage && typeof storage.get === 'function' && keys.PROFILE) {
      return storage.get(keys.PROFILE, {}) || {};
    }

    try {
      return JSON.parse(localStorage.getItem('tpk_profile') || '{}');
    } catch (err) {
      return {};
    }
  }

  function getSession() {
    var state = getState();
    if (state && typeof state.getSession === 'function') {
      var fromState = state.getSession();
      if (fromState && Object.keys(fromState).length) return fromState;
    }

    try {
      return JSON.parse(localStorage.getItem('tpk_session') || '{}');
    } catch (err) {
      return {};
    }
  }

  function getIdTim(profile, session) {
    profile = profile || {};
    session = session || {};
    return String(
      profile.id_tim ||
      session.id_tim ||
      (session.session && session.session.id_tim) ||
      ''
    ).trim();
  }

  function getBookKey(profile, session) {
    profile = profile || {};
    session = session || {};
    return String(
      profile.kode_kecamatan ||
      profile.book_key ||
      session.kode_kecamatan ||
      session.book_key ||
      ''
    ).trim().toUpperCase();
  }

  function setMeta(text) {
    var el = byId(META_ID);
    if (el) {
      el.textContent = text || '';
      el.classList.add('sasaran-list-meta-compact');
    }
  }

  function setLoading() {
    var box = byId(CONTAINER_ID);
    if (box) {
      box.innerHTML = '<p class="muted-text">Memuat data sasaran...</p>';
    }
    setMeta('Sedang memuat data sasaran...');
  }

  function setEmpty(message) {
    var box = byId(CONTAINER_ID);
    if (box) {
      box.innerHTML = '<p class="muted-text">' + escapeHtml(message || 'Belum ada data sasaran.') + '</p>';
    }
  }

  function formatDate(value) {
    if (!value) return '-';
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    try {
      return d.toLocaleDateString('id-ID');
    } catch (err) {
      return String(value);
    }
  }

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;

    var raw = String(value || '').trim();
    if (!raw) return null;

    var d = new Date(raw);
    if (!isNaN(d.getTime())) return d;

    var m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  }

  function calcAge(item) {
    item = item || {};
    var jenis = normalizeUpper(item.jenis_sasaran);
    var tanggal = parseDate(item.tanggal_lahir || item.tgl_lahir);
    var umurBulan = Number(item.usia_bulan || item.umur_bulan || item.usia_baduta_bulan || item.umur_baduta_bulan || 0);
    var umurTahun = Number(item.usia_tahun || item.umur_tahun || 0);

    if (jenis === 'BADUTA') {
      if (!umurBulan && tanggal) {
        var now = new Date();
        umurBulan = (now.getFullYear() - tanggal.getFullYear()) * 12 + (now.getMonth() - tanggal.getMonth());
        if (now.getDate() < tanggal.getDate()) umurBulan -= 1;
      }
      return umurBulan > 0 ? (umurBulan + ' bulan') : '-';
    }

    if (!umurTahun && tanggal) {
      var today = new Date();
      umurTahun = today.getFullYear() - tanggal.getFullYear();
      var monthDiff = today.getMonth() - tanggal.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < tanggal.getDate())) {
        umurTahun -= 1;
      }
    }

    return umurTahun > 0 ? (umurTahun + ' tahun') : '-';
  }

  function getWilayahLabel(item) {
    item = item || {};

    var explicitParts = [
      item.nama_dusun || item.dusun_rw || item.dusun || '',
      item.nama_desa || item.desa_kelurahan || item.desa || '',
      item.nama_kecamatan || item.kecamatan || ''
    ].map(normalizeSpaces).filter(Boolean);

    if (explicitParts.length) {
      return explicitParts.join(' • ');
    }

    return normalizeSpaces(
      item.nama_wilayah_sasaran ||
      item.wilayah_sasaran ||
      item.nama_wilayah ||
      item.wilayah ||
      ''
    ) || '-';
  }

  function getAlamatLabel(item) {
    item = item || {};
    return normalizeSpaces(
      item.alamat_lengkap ||
      item.alamat ||
      item.alamat_sasaran ||
      getWilayahLabel(item)
    ) || '-';
  }

  function getItemId(item) {
    return String(item && (item.id_sasaran || item.id || '')).trim();
  }

  function getNamaKk(item) {
    item = item || {};
    return normalizeSpaces(item.nama_kepala_keluarga || item.nama_kk || item.nama_kepala_keluarga_sasaran || '');
  }

  function getNamaIbu(item) {
    item = item || {};
    return normalizeSpaces(item.nama_ibu_kandung || item.nama_ibu || '');
  }

  function isTruthyPriority(value) {
    var text = normalizeUpper(value);
    return value === true ||
      text === 'TRUE' ||
      text === 'YA' ||
      text === 'Y' ||
      text === 'PRIORITAS' ||
      text === 'KRS' ||
      text === 'KR' ||
      text === 'RISIKO' ||
      text === 'BERISIKO' ||
      text === 'KELUARGA RISIKO STUNTING';
  }

  function isPriority(item) {
    item = item || {};
    return isTruthyPriority(item.is_prioritas) ||
      isTruthyPriority(item.prioritas) ||
      isTruthyPriority(item.status_prioritas) ||
      isTruthyPriority(item.priority_status) ||
      isTruthyPriority(item.status_kr) ||
      isTruthyPriority(item.is_krs) ||
      isTruthyPriority(item.keluarga_risiko_stunting) ||
      isTruthyPriority(item.status_keluarga_risiko_stunting) ||
      isTruthyPriority(item.growth_priority) ||
      isTruthyPriority(item.development_priority);
  }

  function getPriorityLabel(item) {
    return isPriority(item) ? 'Prioritas' : 'Non Prioritas';
  }

  function getCurrentPeriodeKey() {
    var d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0');
  }

  function normalizePeriod(value) {
    var text = normalizeSpaces(value);
    if (!text) return '';

    var compact = text.replace(/[^\d]/g, '');
    if (compact.length === 6) return compact;
    if (compact.length === 5) {
      return compact.slice(0, 4) + '0' + compact.slice(4);
    }
    return text;
  }

  function getItemPendampinganCount(item) {
    item = item || {};
    var current = getCurrentPeriodeKey();
    var count = Number(
      item.jumlah_pendampingan_bulan_ini ||
      item.pendampingan_bulan_ini ||
      item.current_month_pendampingan_count ||
      item.monthly_pendampingan_count ||
      0
    );

    if (count > 0) return count;

    var already = item.sudah_didampingi_bulan_ini === true ||
      normalizeUpper(item.status_pendampingan_bulan_ini) === 'SUDAH_DIDAMPINGI' ||
      normalizeUpper(item.status_pendampingan) === 'SUDAH_DIDAMPINGI';

    if (already) return 1;

    var lastPeriod = normalizePeriod(
      item.periode_pendampingan_terakhir ||
      item.last_pendampingan_period ||
      item.periode_key_terakhir ||
      item.periode_key
    );

    if (lastPeriod && lastPeriod === current) return 1;

    var lastDate = parseDate(
      item.tanggal_pendampingan_terakhir ||
      item.last_pendampingan_at ||
      item.pendampingan_terakhir_at
    );

    if (lastDate) {
      var key = lastDate.getFullYear() + String(lastDate.getMonth() + 1).padStart(2, '0');
      if (key === current) return 1;
    }

    return 0;
  }

  function isDidampingiBulanIni(item) {
    return getItemPendampinganCount(item) > 0;
  }

  function normalizeItem(item) {
    var safe = item && typeof item === 'object' ? Object.assign({}, item) : {};
    var itemId = getItemId(safe);
    var wilayah = getWilayahLabel(safe);

    safe.id_sasaran = itemId || String(safe.id_sasaran || safe.id || '').trim();
    safe.id = String(safe.id || safe.id_sasaran || '').trim();
    safe.nama_sasaran = normalizeSpaces(safe.nama_sasaran || safe.nama || '');
    safe.jenis_sasaran = normalizeSpaces(safe.jenis_sasaran || '');
    safe.status_sasaran = normalizeSpaces(safe.status_sasaran || safe.status || '');
    safe.nik_sasaran = normalizeSpaces(safe.nik_sasaran || safe.nik || '');
    safe.nomor_kk = normalizeSpaces(safe.nomor_kk || safe.no_kk || '');
    safe.tanggal_lahir = normalizeSpaces(safe.tanggal_lahir || safe.tgl_lahir || '');
    safe.nama_kepala_keluarga = getNamaKk(safe);
    safe.nama_ibu_kandung = getNamaIbu(safe);
    safe.alamat_lengkap = getAlamatLabel(safe);
    safe.nama_kecamatan = normalizeSpaces(safe.nama_kecamatan || safe.kecamatan || '');
    safe.kecamatan = safe.nama_kecamatan || normalizeSpaces(safe.kecamatan || '');
    safe.nama_desa = normalizeSpaces(safe.nama_desa || safe.desa_kelurahan || safe.desa || '');
    safe.desa_kelurahan = safe.nama_desa || normalizeSpaces(safe.desa_kelurahan || '');
    safe.nama_dusun = normalizeSpaces(safe.nama_dusun || safe.dusun_rw || safe.dusun || '');
    safe.dusun_rw = safe.nama_dusun || normalizeSpaces(safe.dusun_rw || '');
    safe.nama_wilayah_sasaran = wilayah;
    safe.wilayah_sasaran = wilayah;
    safe.usia_label = calcAge(safe);
    safe.status_prioritas = normalizeSpaces(safe.status_prioritas || safe.priority_status || getPriorityLabel(safe));
    safe.status_pendampingan_bulan_ini = isDidampingiBulanIni(safe) ? 'Sudah Didampingi' : 'Belum Didampingi';
    return safe;
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
      storage.set(keys.SELECTED_SASARAN || LOCAL_SELECTED_KEY, safeItem);
    }

    try {
      localStorage.setItem(LOCAL_SELECTED_KEY, JSON.stringify(safeItem));
    } catch (err) {}
  }

  function saveLocalCache(items) {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({
        saved_at: new Date().toISOString(),
        items: Array.isArray(items) ? items.map(normalizeItem) : []
      }));
    } catch (err) {}
  }

  function readLocalCache() {
    try {
      var raw = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
      var items = Array.isArray(raw.items) ? raw.items.map(normalizeItem) : [];
      var savedAt = raw.saved_at ? new Date(raw.saved_at).getTime() : 0;
      return {
        items: items,
        saved_at: raw.saved_at || '',
        is_fresh: savedAt > 0 && (Date.now() - savedAt) <= LIST_CACHE_TTL_MS
      };
    } catch (err) {
      return { items: [], saved_at: '', is_fresh: false };
    }
  }

  function resetFilters() {
    [FILTER_KEYWORD_ID, FILTER_JENIS_ID, FILTER_STATUS_ID, FILTER_PRIORITAS_ID, FILTER_PENDAMPINGAN_ID].forEach(function (id) {
      var el = byId(id);
      if (el) el.value = '';
    });
  }

  function createElementFromHtml(html) {
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    return wrap.firstElementChild;
  }

  function findFilterGrid() {
    var keywordEl = byId(FILTER_KEYWORD_ID);
    if (!keywordEl) return null;

    var group = keywordEl.closest ? keywordEl.closest('.form-group') : null;
    if (group && group.parentElement) return group.parentElement;
    return keywordEl.parentElement || null;
  }

  function ensureActionButton(id, label, icon, fallbackClass) {
    var btn = byId(id);
    if (!btn) return null;

    btn.classList.add('sasaran-filter-icon-btn');
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.innerHTML = '<span aria-hidden="true">' + icon + '</span>';

    if (fallbackClass) btn.classList.add(fallbackClass);
    return btn;
  }

  function ensureResetButton() {
    var existing = byId(BTN_RESET_ID);
    if (existing) return existing;

    var refreshBtn = byId(BTN_REFRESH_ID);
    if (!refreshBtn || !refreshBtn.parentElement) return null;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = BTN_RESET_ID;
    btn.className = 'btn btn-secondary sasaran-filter-icon-btn';
    btn.setAttribute('aria-label', 'Reset filter');
    btn.setAttribute('title', 'Reset filter');
    btn.innerHTML = '<span aria-hidden="true">↺</span>';

    refreshBtn.parentElement.appendChild(btn);
    return btn;
  }

  function ensureSelectFilter(id, label, options) {
    var existing = byId(id);
    if (existing) return existing;

    var grid = findFilterGrid();
    if (!grid) return null;

    var html = [
      '<div class="form-group sasaran-filter-extra">',
        '<label for="', escapeHtml(id), '">', escapeHtml(label), '</label>',
        '<select id="', escapeHtml(id), '">',
          '<option value="">Semua</option>',
          options.map(function (opt) {
            return '<option value="' + escapeHtml(opt.value) + '">' + escapeHtml(opt.label) + '</option>';
          }).join(''),
        '</select>',
      '</div>'
    ].join('');

    var node = createElementFromHtml(html);
    grid.appendChild(node);
    return byId(id);
  }

  function ensureFilterUi() {
    var keywordEl = byId(FILTER_KEYWORD_ID);
    if (keywordEl) {
      var keywordGroup = keywordEl.closest ? keywordEl.closest('.form-group') : null;
      var keywordLabel = keywordGroup ? keywordGroup.querySelector('label') : null;
      if (keywordLabel) keywordLabel.textContent = 'Cari Nama Sasaran';
      keywordEl.setAttribute('placeholder', 'Ketik nama sasaran');
    }

    ensureSelectFilter(FILTER_PRIORITAS_ID, 'Status Prioritas', [
      { value: 'PRIORITAS', label: 'Prioritas' },
      { value: 'NON_PRIORITAS', label: 'Non Prioritas' }
    ]);

    ensureSelectFilter(FILTER_PENDAMPINGAN_ID, 'Status Pendampingan', [
      { value: 'SUDAH_DIDAMPINGI', label: 'Sudah Didampingi' },
      { value: 'BELUM_DIDAMPINGI', label: 'Belum Didampingi' }
    ]);

    var resetBtn = ensureResetButton();
    var refreshBtn = ensureActionButton(BTN_REFRESH_ID, 'Refresh data', '⟳', 'sasaran-refresh-icon');
    ensureActionButton(BTN_RESET_ID, 'Reset filter', '↺', 'sasaran-reset-icon');

    var header = null;
    var grid = findFilterGrid();
    var card = grid && grid.closest ? grid.closest('.card') : null;
    if (card) header = card.querySelector('.section-header');

    if (header && !header.classList.contains('sasaran-filter-header-r1')) {
      header.classList.add('sasaran-filter-header-r1');
      var title = header.querySelector('h3');
      if (title) title.textContent = 'Filter & Pencarian';

      var actions = header.querySelector('.sasaran-filter-header-actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'sasaran-filter-header-actions';
        header.appendChild(actions);
      }

      [resetBtn, refreshBtn].forEach(function (btn) {
        if (btn && btn.parentElement !== actions) actions.appendChild(btn);
      });
    }

    if (grid && !byId('sasaran-monthly-banner')) {
      var banner = document.createElement('div');
      banner.id = 'sasaran-monthly-banner';
      banner.className = 'sasaran-monthly-banner sasaran-monthly-banner-warning';
      banner.textContent = 'Anda Belum Melakukan Pendampingan Bulan Ini';
      grid.parentElement.insertBefore(banner, grid.nextSibling);
    }

    var dataCard = byId(CONTAINER_ID);
    dataCard = dataCard && dataCard.closest ? dataCard.closest('.card') : null;
    if (dataCard) {
      var dataHeader = dataCard.querySelector('.section-header');
      if (dataHeader && !dataHeader.classList.contains('sasaran-data-header-r1')) {
        dataHeader.classList.add('sasaran-data-header-r1');
        var h3 = dataHeader.querySelector('h3');
        if (h3) h3.textContent = 'Data Sasaran';

        var activeBadge = dataHeader.querySelector('#sasaran-active-count-badge');
        if (!activeBadge) {
          activeBadge = document.createElement('span');
          activeBadge.id = 'sasaran-active-count-badge';
          activeBadge.className = 'badge badge-neutral sasaran-active-count-badge';
          activeBadge.textContent = 'Sasaran Aktif: 0';
          dataHeader.appendChild(activeBadge);
        }
      }
    }

    return {
      resetBtn: resetBtn,
      refreshBtn: refreshBtn,
      prioritasEl: byId(FILTER_PRIORITAS_ID),
      pendampinganEl: byId(FILTER_PENDAMPINGAN_ID)
    };
  }

  function getSelectedFilters() {
    return {
      keyword: normalizeSpaces(byId(FILTER_KEYWORD_ID) ? byId(FILTER_KEYWORD_ID).value : ''),
      jenis_sasaran: normalizeSpaces(byId(FILTER_JENIS_ID) ? byId(FILTER_JENIS_ID).value : ''),
      status_sasaran: normalizeSpaces(byId(FILTER_STATUS_ID) ? byId(FILTER_STATUS_ID).value : ''),
      status_prioritas: normalizeSpaces(byId(FILTER_PRIORITAS_ID) ? byId(FILTER_PRIORITAS_ID).value : ''),
      status_pendampingan: normalizeSpaces(byId(FILTER_PENDAMPINGAN_ID) ? byId(FILTER_PENDAMPINGAN_ID).value : '')
    };
  }

  function applyAllFilters(items, filters) {
    var safeItems = Array.isArray(items) ? items.slice() : [];
    var keyword = normalizeSpaces(filters && filters.keyword);
    var jenis = normalizeUpper(filters && filters.jenis_sasaran);
    var status = normalizeUpper(filters && filters.status_sasaran);
    var prioritas = normalizeUpper(filters && filters.status_prioritas);
    var pendampingan = normalizeUpper(filters && filters.status_pendampingan);

    if (jenis) {
      safeItems = safeItems.filter(function (item) {
        return normalizeUpper(item.jenis_sasaran) === jenis;
      });
    }

    if (status) {
      safeItems = safeItems.filter(function (item) {
        return normalizeUpper(item.status_sasaran || item.status) === status;
      });
    }

    if (prioritas) {
      safeItems = safeItems.filter(function (item) {
        return prioritas === 'PRIORITAS' ? isPriority(item) : !isPriority(item);
      });
    }

    if (pendampingan) {
      safeItems = safeItems.filter(function (item) {
        var done = isDidampingiBulanIni(item);
        return pendampingan === 'SUDAH_DIDAMPINGI' ? done : !done;
      });
    }

    if (keyword) {
      var q = keyword.toLowerCase();
      safeItems = safeItems.filter(function (item) {
        return String(item.nama_sasaran || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    return safeItems;
  }

  function updateMonthlyBanner(items) {
    var banner = byId('sasaran-monthly-banner');
    if (!banner) return;

    var safeItems = Array.isArray(items) ? items : [];
    var count = safeItems.filter(isDidampingiBulanIni).length;

    banner.classList.remove('sasaran-monthly-banner-warning', 'sasaran-monthly-banner-success');
    if (count <= 0) {
      banner.classList.add('sasaran-monthly-banner-warning');
      banner.textContent = 'Anda Belum Melakukan Pendampingan Bulan Ini';
    } else {
      banner.classList.add('sasaran-monthly-banner-success');
      banner.textContent = 'Anda Sudah Melaksanakan Pendampingan kepada ' + count + ' Sasaran Bulan Ini';
    }
  }

  function updateActiveCount(items) {
    var badge = byId('sasaran-active-count-badge');
    if (!badge) return;

    var safeItems = Array.isArray(items) ? items : [];
    var active = safeItems.filter(function (item) {
      var st = normalizeUpper(item.status_sasaran || item.status || 'AKTIF');
      return !st || st === 'AKTIF';
    }).length;

    badge.textContent = 'Sasaran Aktif: ' + active;
  }

  function buildMetaCell(label, value, extraClass) {
    return [
      '<div class="sasaran-compact-field ', escapeHtml(extraClass || ''), '">',
        '<span class="label">', escapeHtml(label), '</span>',
        '<strong>', escapeHtml(value || '-'), '</strong>',
      '</div>'
    ].join('');
  }

  function renderList(items) {
    var box = byId(CONTAINER_ID);
    if (!box) return;

    box.classList.add('sasaran-card-grid-r1');

    if (!items || !items.length) {
      box.innerHTML = '<p class="muted-text">Tidak ada data sasaran sesuai filter.</p>';
      return;
    }

    box.innerHTML = items.map(function (raw) {
      var item = normalizeItem(raw);
      var status = item.status_sasaran || item.status || 'AKTIF';
      var jenis = item.jenis_sasaran || '-';
      var nama = upperDisplay(item.nama_sasaran) || '-';
      var id = getItemId(item) || '-';
      var nik = item.nik_sasaran || '-';
      var kk = item.nomor_kk || '-';
      var namaKk = upperDisplay(getNamaKk(item)) || '-';
      var ibu = upperDisplay(getNamaIbu(item)) || '-';
      var alamat = upperDisplay(getAlamatLabel(item)) || '-';
      var usia = calcAge(item);
      var isBaduta = normalizeUpper(jenis) === 'BADUTA';
      var prioritasLabel = getPriorityLabel(item);
      var didampingi = isDidampingiBulanIni(item);

      return [
        '<article class="list-card sasaran-item sasaran-list-card-r1" data-id-sasaran="', escapeHtml(id), '">',
          '<div class="sasaran-card-r1-top">',
            '<div class="sasaran-card-r1-title-wrap">',
              '<h4 class="sasaran-card-r1-title">', escapeHtml(nama), '</h4>',
              '<div class="sasaran-card-r1-subline">',
                '<span>', escapeHtml(jenis), '</span>',
                '<span aria-hidden="true">•</span>',
                '<span>', escapeHtml(usia), '</span>',
              '</div>',
            '</div>',
            '<div class="sasaran-card-r1-status-actions">',
              '<span class="badge badge-neutral">', escapeHtml(status), '</span>',
              '<div class="sasaran-icon-actions">',
                '<button type="button" class="sasaran-icon-btn btn-sasaran-detail" data-id-sasaran="', escapeHtml(id), '" aria-label="Detail sasaran" title="Detail sasaran">👁</button>',
                '<button type="button" class="sasaran-icon-btn sasaran-icon-btn-primary btn-sasaran-pendampingan" data-id-sasaran="', escapeHtml(id), '" aria-label="Lapor pendampingan" title="Lapor pendampingan">＋</button>',
              '</div>',
            '</div>',
          '</div>',
          '<div class="sasaran-card-r1-tags">',
            '<span class="sasaran-mini-tag ', isPriority(item) ? 'is-priority' : '', '">', escapeHtml(prioritasLabel), '</span>',
            '<span class="sasaran-mini-tag ', didampingi ? 'is-done' : 'is-pending', '">', escapeHtml(didampingi ? 'Sudah didampingi bulan ini' : 'Belum didampingi bulan ini'), '</span>',
          '</div>',
          '<div class="sasaran-card-r1-meta">',
            buildMetaCell('NIK', nik),
            buildMetaCell('Nama KK', namaKk),
            isBaduta ? buildMetaCell('Nama Ibu Kandung', ibu) : '',
            buildMetaCell('Alamat', alamat, isBaduta ? '' : 'span-2'),
          '</div>',
        '</article>'
      ].join('');
    }).join('');
  }

  var SasaranListView = {
    _initialized: false,
    _lastItems: [],
    _lastRenderedItems: [],
    _itemMap: {},

    init: function () {
      ensureFilterUi();

      if (this._initialized) {
        this.renderLocal();
        return;
      }

      this._initialized = true;

      var ui = ensureFilterUi();
      var refreshBtn = ui.refreshBtn || byId(BTN_REFRESH_ID);
      var resetBtn = ui.resetBtn || byId(BTN_RESET_ID);
      var backBtn = byId(BTN_BACK_ID);
      var keywordEl = byId(FILTER_KEYWORD_ID);
      var jenisEl = byId(FILTER_JENIS_ID);
      var statusEl = byId(FILTER_STATUS_ID);
      var prioritasEl = byId(FILTER_PRIORITAS_ID);
      var pendampinganEl = byId(FILTER_PENDAMPINGAN_ID);
      var container = byId(CONTAINER_ID);

      if (refreshBtn && refreshBtn.dataset.bound !== '1') {
        refreshBtn.dataset.bound = '1';
        refreshBtn.addEventListener('click', this.load.bind(this, true));
      }

      if (resetBtn && resetBtn.dataset.bound !== '1') {
        resetBtn.dataset.bound = '1';
        resetBtn.addEventListener('click', function () {
          resetFilters();
          SasaranListView.renderLocal();
        });
      }

      if (backBtn && backBtn.dataset.bound !== '1') {
        backBtn.dataset.bound = '1';
        backBtn.addEventListener('click', function () {
          var router = getRouter();
          if (router && typeof router.go === 'function') {
            router.go('dashboard');
          }
        });
      }

      [keywordEl, jenisEl, statusEl, prioritasEl, pendampinganEl].forEach(function (el) {
        if (!el || el.dataset.bound === '1') return;
        el.dataset.bound = '1';

        var evt = el.id === FILTER_KEYWORD_ID ? 'input' : 'change';
        el.addEventListener(evt, function () {
          SasaranListView.renderLocal();
        });
      });

      if (container && container.dataset.bound !== '1') {
        container.dataset.bound = '1';

        container.addEventListener('click', function (event) {
          var detailBtn = event.target.closest('.btn-sasaran-detail');
          var penBtn = event.target.closest('.btn-sasaran-pendampingan');
          var card = event.target.closest('.sasaran-item');

          if (detailBtn) {
            event.preventDefault();
            event.stopPropagation();
            SasaranListView.openDetail(detailBtn.getAttribute('data-id-sasaran'));
            return;
          }

          if (penBtn) {
            event.preventDefault();
            event.stopPropagation();
            SasaranListView.openPendampingan(penBtn.getAttribute('data-id-sasaran'));
            return;
          }

          if (card) {
            SasaranListView.openDetail(card.getAttribute('data-id-sasaran'));
          }
        });
      }

      var cached = readLocalCache();
      if (cached.items.length) {
        this._lastItems = cached.items.slice();
        this.rebuildItemMap();
        this.renderLocal();

        var self = this;
        window.setTimeout(function () {
          self.load(true);
        }, 100);
      } else {
        this.load(true);
      }
    },

    rebuildItemMap: function () {
      var map = {};
      this._lastItems.forEach(function (item) {
        var safeItem = normalizeItem(item);
        var id = getItemId(safeItem);
        if (id) map[id] = safeItem;
      });
      this._itemMap = map;
    },

    buildPayload: function () {
      var profile = getProfile();
      var session = getSession();

      return {
        id_tim: getIdTim(profile, session),
        book_key: getBookKey(profile, session),
        include_display_fields: true,
        include_monthly_pendampingan_status: true,
        include_priority_status: true
      };
    },

    load: async function (forceRefresh) {
      ensureFilterUi();

      var api = getApi();
      if (!api || typeof api.post !== 'function') {
        setMeta('Gagal memuat data sasaran.');
        if (this._lastItems.length) {
          this.renderLocal();
        } else {
          setEmpty('API belum tersedia.');
        }
        return;
      }

      var payload = this.buildPayload();

      if (!payload.id_tim) {
        setMeta('Gagal memuat data sasaran.');
        if (this._lastItems.length) {
          this.renderLocal();
        } else {
          setEmpty('id_tim tidak ditemukan pada profil/session.');
        }
        return;
      }

      if (!forceRefresh && this._lastItems.length) {
        this.renderLocal();
        return;
      }

      setLoading();

      try {
        var result = null;
        if (typeof api.getSasaranListLite === 'function') {
          result = await api.getSasaranListLite(payload);
        } else {
          var action = api.getActionName ? api.getActionName('GET_SASARAN_LIST_LITE', 'getSasaranListLite') : 'getSasaranListLite';
          result = await api.post(action, payload, {
            includeAuth: true,
            timeoutMs: 12000,
            retryCount: 1,
            retryDelayMs: 900,
            readOnlyFallbackGet: true
          });
        }

        if (!result || result.ok === false) {
          setMeta('Menampilkan cache lokal sasaran.');
          if (this._lastItems.length) {
            this.renderLocal();
            toast((result && result.message) || 'Daftar sasaran sedang memakai cache lokal.', 'warning');
          } else {
            setEmpty((result && result.message) || 'Gagal memuat data sasaran.');
          }
          return;
        }

        var data = result.data || {};
        var items = Array.isArray(data.items) ? data.items
          : (Array.isArray(data.list) ? data.list
          : (Array.isArray(data.records) ? data.records
          : (Array.isArray(data) ? data : [])));

        this._lastItems = items.map(normalizeItem);
        saveLocalCache(this._lastItems);
        this.rebuildItemMap();
        this.renderLocal();
      } catch (err) {
        setMeta('Menampilkan cache lokal sasaran.');
        if (this._lastItems.length) {
          this.renderLocal();
          toast(err && err.message ? err.message : 'Daftar sasaran sedang memakai cache lokal.', 'warning');
        } else {
          setEmpty(err && err.message ? err.message : 'Gagal terhubung ke server.');
        }
      }
    },

    renderLocal: function () {
      ensureFilterUi();

      var filters = getSelectedFilters();
      var allItems = this._lastItems.map(normalizeItem);
      var items = applyAllFilters(allItems, filters);

      this._lastItems = allItems;
      this._lastRenderedItems = items.slice();
      this.rebuildItemMap();

      renderList(items);
      updateMonthlyBanner(allItems);
      updateActiveCount(allItems);
      setMeta('');
    },

    findItemById: function (idSasaran) {
      var id = String(idSasaran || '').trim();
      if (!id) return null;
      return this._itemMap[id] || null;
    },

    openDetail: function (idSasaran) {
      var item = this.findItemById(idSasaran) || normalizeItem({ id_sasaran: idSasaran, id: idSasaran });
      if (!getItemId(item)) return;

      setSelectedSasaran(item);

      if (window.SasaranDetailView && typeof window.SasaranDetailView.open === 'function') {
        window.SasaranDetailView.open(idSasaran);
        return;
      }

      var router = getRouter();
      if (router && typeof router.go === 'function') {
        router.go('sasaranDetail');
      }
    },

    openPendampingan: function (idSasaran) {
      var item = this.findItemById(idSasaran) || normalizeItem({ id_sasaran: idSasaran, id: idSasaran });
      if (!getItemId(item)) {
        toast('Data sasaran tidak ditemukan.', 'warning');
        return;
      }

      setSelectedSasaran(item);

      if (window.PendampinganView && typeof window.PendampinganView.openCreate === 'function') {
        window.PendampinganView.openCreate(item);
        return;
      }

      var router = getRouter();
      if (router && typeof router.go === 'function') {
        router.go('pendampingan');
      }
    },

    refresh: function () {
      return this.load(true);
    }
  };

  SasaranListView.loadAndRender = function () {
    return this.load(true);
  };

  window.SasaranListView = SasaranListView;
  window.SasaranList = SasaranListView;
})(window, document);
