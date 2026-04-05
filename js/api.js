(function (window) {
  'use strict';

  function getConfig() {
    return window.AppConfig || {};
  }

  function resolveBaseUrl() {
    var url = (getConfig().API_BASE_URL || '').trim();
    if (!url || url === 'PASTE_GAS_WEB_APP_URL_HERE') return '';
    return url;
  }

  function getTimeoutMs() {
    return getConfig().API_TIMEOUT_MS || 30000;
  }

  function getState() {
    return (window.AppState && window.AppState.getState && window.AppState.getState()) || {};
  }

  function buildDeviceId() {
    var ua = String(navigator.userAgent || 'WEB').replace(/\s+/g, ' ').trim();
    return 'WEB-' + ua.slice(0, 40);
  }

  function buildMockStore() {
    var profile = Object.assign({}, (getConfig().DEFAULT_PROFILE || {}), {
      nama_user: 'Ni Made Demo',
      nama_kader: 'Ni Made Demo',
      unsur_tpk: 'KADER',
      role: 'KADER',
      role_akses: 'KADER',
      id_user: 'TPK10001',
      id_tim: 'TIM0001',
      nama_tim: 'Tim 1',
      kecamatan: 'TEJAKULA',
      desa_kelurahan: 'Les',
      dusun_rw: 'Banjar Dinas Kanginan'
    });

    var sasaran = [
      {
        id_sasaran: 'SAS0001',
        nama_sasaran: 'Ni Luh Sari',
        nik_sasaran: '9999999999999999',
        nomor_kk: '9999999999999999',
        jenis_sasaran: 'BUMIL',
        tanggal_lahir: '1998-04-14',
        jenis_kelamin: 'P',
        status_sasaran: 'AKTIF',
        wilayah: 'Les - Banjar Dinas Kanginan',
        alamat: 'Les, Tejakula',
        updated_at: '2026-04-04T10:30:00+08:00',
        data_laporan: { usia_kehamilan_minggu: 26, risiko: 'RENDAH' }
      },
      {
        id_sasaran: 'SAS0002',
        nama_sasaran: 'Komang Adi',
        nik_sasaran: '9999999999999999',
        nomor_kk: '9999999999999999',
        jenis_sasaran: 'BADUTA',
        tanggal_lahir: '2025-10-07',
        jenis_kelamin: 'L',
        status_sasaran: 'AKTIF',
        wilayah: 'Les - Banjar Dinas Kanginan',
        alamat: 'Les, Tejakula',
        updated_at: '2026-04-03T09:15:00+08:00',
        data_laporan: { usia_bulan: 6, status_asi: 'ASI EKSKLUSIF' }
      }
    ];

    var riwayat = [
      {
        id_pendampingan: 'PEN0001',
        submit_at: '2026-04-01T09:15:00+08:00',
        periode_bulan: '04',
        periode_tahun: '2026',
        status_kunjungan: 'HADIR',
        catatan_umum: 'Kondisi baik'
      },
      {
        id_pendampingan: 'PEN0002',
        submit_at: '2026-03-05T11:10:00+08:00',
        periode_bulan: '03',
        periode_tahun: '2026',
        status_kunjungan: 'HADIR',
        catatan_umum: 'Perlu pemantauan makanan tambahan'
      }
    ];

    return { profile: profile, sasaran: sasaran, riwayat: riwayat };
  }

  function buildMockResponse(action, payload) {
    var store = buildMockStore();
    var items = store.sasaran.slice();
    var profile = store.profile;
    var summary = {
      jumlah_sasaran: items.length,
      pendampingan_bulan_ini: 5,
      draft_pending: (window.AppStorage && window.AppStorage.getQueue().length) || 0,
      sasaran_ditindaklanjuti: 2,
      aktivitas_terbaru: [
        'Pendampingan BUMIL Ni Luh Sari berhasil disimpan.',
        'Draft registrasi BADUTA tersimpan offline.',
        'Rekap tim bulan berjalan dimuat.'
      ]
    };

    switch (action) {
      case getConfig().API_ACTIONS.LOGIN:
        if (!payload.id_user && !payload.username_login) {
          return { ok: false, message: 'ID kader dan password wajib diisi.' };
        }
        return {
          ok: true,
          message: 'Login berhasil.',
          data: {
            session_token: 'mock-session-token-' + Date.now(),
            profile: profile
          }
        };

      case getConfig().API_ACTIONS.BOOTSTRAP_SESSION:
      case getConfig().API_ACTIONS.VALIDATE_SESSION:
      case getConfig().API_ACTIONS.GET_MY_PROFILE:
      case getConfig().API_ACTIONS.UPDATE_MY_PROFILE:
        return {
          ok: true,
          message: 'Sesi aktif.',
          data: {
            session_token: (getState().sessionToken || ('mock-session-token-' + Date.now())),
            profile: Object.assign({}, profile, payload || {})
          }
        };

      case getConfig().API_ACTIONS.GET_REFERENCE_BOOTSTRAP:
        return {
          ok: true,
          message: 'Bootstrap referensi berhasil diambil.',
          data: {
            app_name: getConfig().APP_NAME,
            app_version: getConfig().APP_VERSION,
            jenis_sasaran: [
              { code: 'CATIN', label: 'CATIN', description: 'Calon Pengantin', is_active: true, form_id: 'FRM0002' },
              { code: 'BUMIL', label: 'BUMIL', description: 'Ibu Hamil', is_active: true, form_id: 'FRM0003' },
              { code: 'BUFAS', label: 'BUFAS', description: 'Ibu Pasca Persalinan', is_active: true, form_id: 'FRM0004' },
              { code: 'BADUTA', label: 'BADUTA', description: 'Bayi/Balita Dua Tahun', is_active: true, form_id: 'FRM0005' }
            ]
          }
        };

      case getConfig().API_ACTIONS.GET_FORM_DEFINITION:
        return {
          ok: true,
          message: 'Definisi form berhasil diambil.',
          data: {
            form_id: payload.form_id || 'FRM0001',
            jenis_sasaran: payload.jenis_sasaran || '',
            fields: [
              { key: 'catatan_khusus', label: 'Catatan Khusus', type: 'textarea' }
            ]
          }
        };

      case getConfig().API_ACTIONS.GET_DASHBOARD_SUMMARY:
        return { ok: true, message: 'Ringkasan dashboard berhasil diambil.', data: summary };

      case getConfig().API_ACTIONS.GET_SASARAN_BY_TIM:
      case getConfig().API_ACTIONS.SEARCH_SASARAN:
        return { ok: true, message: 'Data sasaran berhasil diambil.', data: { items: items } };

      case getConfig().API_ACTIONS.GET_SASARAN_DETAIL:
        return { ok: true, message: 'Detail sasaran berhasil diambil.', data: items[0] };

      case getConfig().API_ACTIONS.GET_RIWAYAT_PENDAMPINGAN_SASARAN:
        return { ok: true, message: 'Riwayat berhasil diambil.', data: { items: store.riwayat } };

      case getConfig().API_ACTIONS.GET_REKAP_SAYA:
        return {
          ok: true,
          message: 'Rekap berhasil diambil.',
          data: {
            bulan: payload.periode_bulan || '04',
            tahun: payload.periode_tahun || '2026',
            sasaran_aktif: items.filter(function (item) { return item.status_sasaran === 'AKTIF'; }).length,
            pendampingan_periode: 5,
            draft_pending: (window.AppStorage && window.AppStorage.getQueue().length) || 0,
            sasaran_ditindaklanjuti: 2,
            aktivitas: [
              'Pendampingan pada 5 sasaran tercatat.',
              '2 sasaran memerlukan tindak lanjut.',
              '1 data sasaran menunggu review.'
            ]
          }
        };

      case getConfig().API_ACTIONS.REGISTER_SASARAN:
      case getConfig().API_ACTIONS.UPDATE_SASARAN:
        return {
          ok: true,
          message: 'Sasaran berhasil diproses.',
          data: { id_sasaran: payload.id_sasaran || ('SAS' + String(Date.now()).slice(-6)) }
        };

      case getConfig().API_ACTIONS.SUBMIT_PENDAMPINGAN:
      case getConfig().API_ACTIONS.EDIT_PENDAMPINGAN:
        return {
          ok: true,
          message: 'Pendampingan berhasil diproses.',
          data: { id_pendampingan: 'PEN' + String(Date.now()).slice(-6) }
        };

      default:
        return { ok: true, message: 'Mock action dijalankan: ' + action, data: {} };
    }
  }

  function mockRequest(action, payload) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(buildMockResponse(action, payload || {}));
      }, 250);
    });
  }

  function buildMeta(meta) {
    var state = getState();
    var token = state.sessionToken || '';
    var out = {
      app_version: getConfig().APP_VERSION || '',
      device_id: buildDeviceId(),
      request_id: (window.AppUtils && window.AppUtils.randomId ? window.AppUtils.randomId('REQ') : ('REQ-' + Date.now()))
    };

    if (meta && meta.clientSubmitId) out.client_submit_id = meta.clientSubmitId;
    if (meta && meta.syncSource) out.sync_source = meta.syncSource;
    if ((getConfig().SEND_SESSION_IN_BODY !== false) && token) {
      out.session_token = token;
      out.token = token;
    }

    return out;
  }

  function buildJsonBody(action, payload, meta) {
    return {
      action: action,
      payload: payload || {},
      meta: buildMeta(meta)
    };
  }

  function buildLegacyFormBody(action, payload, meta) {
    var builtMeta = buildMeta(meta);
    return {
      action: action,
      data: payload || {},
      token: builtMeta.token || '',
      session_token: builtMeta.session_token || '',
      perangkat: builtMeta.device_id || '',
      app_version: builtMeta.app_version || '',
      client_submit_id: builtMeta.client_submit_id || '',
      sync_source: builtMeta.sync_source || ''
    };
  }

  function toFormBody(data) {
    var params = new URLSearchParams();
    Object.keys(data || {}).forEach(function (key) {
      var value = data[key];
      if (value == null || value === '') return;
      if (Array.isArray(value) || window.AppUtils.isPlainObject(value)) {
        params.append(key, JSON.stringify(value));
      } else {
        params.append(key, String(value));
      }
    });
    return params.toString();
  }

  function parseResponseText(text) {
    var raw = String(text == null ? '' : text).trim();
    if (!raw) return { ok: false, message: 'Respons backend kosong.' };

    try {
      return JSON.parse(raw);
    } catch (e) {
      var match = raw.match(/\{[\s\S]*\}$/);
      if (match) {
        try { return JSON.parse(match[0]); } catch (e2) {}
      }

      if (/<!doctype html/i.test(raw) || /<html/i.test(raw)) {
        return {
          ok: false,
          message: 'Backend mengembalikan HTML, bukan JSON. Periksa URL Web App, izin deploy, atau mode request.'
        };
      }

      return {
        ok: false,
        message: 'Respons backend bukan JSON yang valid.',
        raw: raw
      };
    }
  }

  async function request(url, options) {
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, getTimeoutMs());

    try {
      var response = await fetch(url, Object.assign({}, options || {}, { signal: controller.signal }));
      var text = await response.text();
      var data = parseResponseText(text);

      if (!response.ok) {
        var message = (data && data.message) || ('Permintaan ke backend gagal. HTTP ' + response.status);
        throw new Error(message);
      }

      return data;
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new Error('Permintaan ke backend melewati batas waktu.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function postEncoded(action, payload, meta, encoding) {
    var url = resolveBaseUrl();
    if (!url) {
      throw new Error('API_BASE_URL belum diisi di js/config.js');
    }

    var options = { method: 'POST', headers: { 'Accept': 'application/json, text/plain, */*' } };
    if (encoding === 'form') {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
      options.body = toFormBody(buildLegacyFormBody(action, payload, meta));
    } else {
      options.headers['Content-Type'] = 'application/json;charset=UTF-8';
      options.body = JSON.stringify(buildJsonBody(action, payload, meta));
    }

    return request(url, options);
  }

  async function post(action, payload, meta) {
    if (getConfig().USE_MOCK_API) {
      return mockRequest(action, payload || {});
    }

    var primary = getConfig().REQUEST_PRIMARY_ENCODING || 'json';
    var fallback = getConfig().REQUEST_FALLBACK_ENCODING || '';

    try {
      return await postEncoded(action, payload || {}, meta, primary);
    } catch (err) {
      if (!fallback || fallback === primary) throw err;
      return postEncoded(action, payload || {}, meta, fallback);
    }
  }

  function getData(result) {
    if (result == null) return {};
    if (result.data != null) return result.data;
    if (result.result != null) return result.result;
    return {};
  }

  function getMessage(result, fallback) {
    return (result && result.message) || fallback || '';
  }

  function getToken(result) {
    var data = getData(result);
    return (
      (result && result.token) ||
      data.session_token ||
      data.token ||
      (data.session && data.session.token) ||
      ''
    );
  }

  function getProfile(result) {
    var data = getData(result);
    return window.AppUtils.pickFirstObject(
      data.profile,
      data.user,
      data.kader,
      data.session && data.session.profile,
      data.session && data.session.user,
      data.session,
      data
    );
  }

  function getList(result, candidateKeys) {
    var data = getData(result);
    if (Array.isArray(data)) return data;
    var keys = candidateKeys || ['items', 'rows', 'list', 'sasaran', 'records', 'result'];
    for (var i = 0; i < keys.length; i += 1) {
      if (Array.isArray(data[keys[i]])) return data[keys[i]];
    }
    return [];
  }

  window.Api = {
    request: request,
    post: post,
    getData: getData,
    getMessage: getMessage,
    getToken: getToken,
    getProfile: getProfile,
    getList: getList,
    buildDeviceId: buildDeviceId
  };
})(window);
