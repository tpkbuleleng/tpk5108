(function (window) {
  'use strict';

  function getKeys() {
    return (window.AppConfig && window.AppConfig.STORAGE_KEYS) || {};
  }

  function normalizeProfile(profile) {
    var source = profile || {};
    if (!window.AppUtils.isPlainObject(source)) {
      return Object.assign({}, (window.AppConfig && window.AppConfig.DEFAULT_PROFILE) || {});
    }

    return Object.assign({}, (window.AppConfig && window.AppConfig.DEFAULT_PROFILE) || {}, source, {
      id_user: source.id_user || source.username_login || source.username || '',
      nama_user: source.nama_user || source.nama_kader || source.name || '',
      nama_kader: source.nama_kader || source.nama_user || source.name || '',
      role: source.role || source.role_akses || source.role_user || source.role_name || source.unsur_tpk || '',
      role_akses: source.role_akses || source.role || source.unsur_tpk || '',
      unsur_tpk: source.unsur_tpk || source.role_akses || source.role || source.role_user || '',
      id_tim: source.id_tim || source.tim_id || '',
      nama_tim: source.nama_tim || source.tim || source.tim_label || source.id_tim || '',
      kecamatan: source.kecamatan || source.nama_kecamatan || '',
      desa_kelurahan: source.desa_kelurahan || source.nama_desa || source.desa || '',
      dusun_rw: source.dusun_rw || source.nama_dusun || source.dusun || ''
    });
  }

  function persistSession(token, profile) {
    var keys = getKeys();
    var safeProfile = normalizeProfile(profile);

    if (token) window.AppStorage.set(keys.SESSION_TOKEN, token);
    if (safeProfile) window.AppStorage.set(keys.PROFILE, safeProfile);

    window.AppState.patch({
      sessionToken: token || '',
      profile: safeProfile || null
    });

    return safeProfile;
  }

  async function login(payload) {
    if (!window.Api) throw new Error('Api belum siap.');

    var rawId = window.AppUtils.normalizeUpper((payload || {}).id_user || (payload || {}).username_login || '');
    var cleaned = {
      id_user: rawId,
      username_login: rawId,
      username: rawId,
      password: (payload || {}).password || '',
      device_id: window.Api.buildDeviceId ? window.Api.buildDeviceId() : ('WEB-' + navigator.userAgent.slice(0, 24)),
      perangkat: window.Api.buildDeviceId ? window.Api.buildDeviceId() : ('WEB-' + navigator.userAgent.slice(0, 24)),
      app_version: (window.AppConfig && window.AppConfig.APP_VERSION) || ''
    };

    var result = await window.Api.post((window.AppConfig.API_ACTIONS || {}).LOGIN || 'login', cleaned);
    if (result && result.ok) {
      return {
        ok: true,
        message: window.Api.getMessage(result, 'Login berhasil.'),
        token: window.Api.getToken(result),
        data: normalizeProfile(window.Api.getProfile(result))
      };
    }

    return {
      ok: false,
      message: window.Api.getMessage(result, 'Login gagal.')
    };
  }

  function restoreSession() {
    var keys = getKeys();
    var token = window.AppStorage.get(keys.SESSION_TOKEN, '');
    var profile = window.AppStorage.get(keys.PROFILE, null);
    var selectedSasaran = window.AppStorage.get(keys.SELECTED_SASARAN, null);
    var dashboardSummary = window.AppStorage.get(keys.DASHBOARD_SUMMARY, null);
    var bootstrapData = window.AppStorage.get(keys.APP_BOOTSTRAP, null);

    window.AppState.patch({
      sessionToken: token,
      profile: profile,
      selectedSasaran: selectedSasaran,
      dashboardSummary: dashboardSummary,
      appBootstrap: bootstrapData,
      syncQueue: window.AppStorage.getQueue()
    });

    return { token: token, profile: profile };
  }

  async function resumeSession() {
    var state = (window.AppState && window.AppState.getState()) || {};
    var token = state.sessionToken || '';
    if (!token) {
      return { ok: false, message: 'Sesi belum tersedia.' };
    }

    var actions = (window.AppConfig && window.AppConfig.API_ACTIONS) || {};
    var attempts = [
      actions.VALIDATE_SESSION,
      actions.BOOTSTRAP_SESSION,
      actions.GET_MY_PROFILE
    ].filter(Boolean);

    for (var i = 0; i < attempts.length; i += 1) {
      try {
        var result = await window.Api.post(attempts[i], {});
        if (result && result.ok) {
          var nextToken = window.Api.getToken(result) || token;
          var nextProfile = normalizeProfile(window.Api.getProfile(result));
          persistSession(nextToken, nextProfile);
          return {
            ok: true,
            token: nextToken,
            data: nextProfile,
            message: window.Api.getMessage(result, 'Sesi dipulihkan.')
          };
        }
      } catch (err) {
        if (i === attempts.length - 1) {
          return { ok: false, message: err.message || 'Validasi sesi gagal.' };
        }
      }
    }

    return { ok: false, message: 'Validasi sesi gagal.' };
  }

  async function enrichSessionAfterLogin(token, profile) {
    persistSession(token, profile);
    return resumeSession();
  }

  function saveSelectedSasaran(item) {
    var keys = getKeys();
    window.AppStorage.set(keys.SELECTED_SASARAN, item || null);
    window.AppState.patch({ selectedSasaran: item || null });
  }

  async function logoutRemote() {
    var action = ((window.AppConfig || {}).API_ACTIONS || {}).LOGOUT_CURRENT_SESSION;
    if (!action) return;
    try {
      await window.Api.post(action, {});
    } catch (err) {
      // logout lokal tetap harus jalan
    }
  }

  function logoutLocal() {
    var keys = getKeys();
    window.AppStorage.clearKeys([
      keys.SESSION_TOKEN,
      keys.PROFILE,
      keys.LAST_SCREEN,
      keys.SELECTED_SASARAN,
      keys.DASHBOARD_SUMMARY,
      keys.SASARAN_CACHE,
      keys.REKAP_CACHE,
      keys.APP_BOOTSTRAP
    ]);

    window.AppState.patch({
      sessionToken: '',
      profile: null,
      selectedSasaran: null,
      dashboardSummary: null,
      sasaranList: [],
      rekapData: null,
      appBootstrap: null
    });
  }

  async function logout() {
    await logoutRemote();
    logoutLocal();
  }

  window.Auth = {
    login: login,
    persistSession: persistSession,
    restoreSession: restoreSession,
    resumeSession: resumeSession,
    enrichSessionAfterLogin: enrichSessionAfterLogin,
    saveSelectedSasaran: saveSelectedSasaran,
    logout: logout,
    logoutLocal: logoutLocal,
    normalizeProfile: normalizeProfile
  };
})(window);
