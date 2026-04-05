(function (window) {
  'use strict';

  var AppConfig = {
    APP_NAME: 'TPK Kabupaten Buleleng',
    APP_VERSION: '2.1.1-transisi-tahap5',
    DEBUG: true,

    /*
      Tahap 5 = disetel spesifik ke backend aktif ApiRouters.gs
      - primary request JSON => { action, payload, meta }
      - fallback form => pola legacy adapter doPost(e)
    */
    USE_MOCK_API: false,
    API_BASE_URL: 'PASTE_GAS_WEB_APP_URL_HERE',
    API_TIMEOUT_MS: 30000,

    REQUEST_PAYLOAD_MODE: 'nested',
    REQUEST_PRIMARY_ENCODING: 'json',
    REQUEST_FALLBACK_ENCODING: 'form',
    SEND_SESSION_IN_BODY: true,

    STORAGE_KEYS: {
      SESSION_TOKEN: 'tpk_session_token',
      PROFILE: 'tpk_profile',
      LAST_SCREEN: 'tpk_last_screen',
      SELECTED_SASARAN: 'tpk_selected_sasaran',
      DASHBOARD_SUMMARY: 'tpk_dashboard_summary',
      SASARAN_CACHE: 'tpk_sasaran_cache',
      REKAP_CACHE: 'tpk_rekap_cache',
      APP_BOOTSTRAP: 'tpk_app_bootstrap',
      SYNC_QUEUE: 'tpk_sync_queue',
      FONT_SIZE: 'tpk_app_font_size'
    },

    SCREENS: {
      SPLASH: 'splash-screen',
      LOGIN: 'login-screen',
      DASHBOARD: 'dashboard-screen',
      SASARAN_LIST: 'sasaran-list-screen',
      SASARAN_DETAIL: 'sasaran-detail-screen',
      REGISTRASI: 'registrasi-screen',
      PENDAMPINGAN: 'pendampingan-screen',
      SYNC: 'sync-screen',
      REKAP: 'rekap-kader-screen'
    },

    API_ACTIONS: {
      HEALTH_CHECK: 'healthCheck',
      LOGIN: 'login',
      CHANGE_PASSWORD: 'changePassword',
      LOGOUT_CURRENT_SESSION: 'logoutCurrentSession',
      VALIDATE_SESSION: 'validateSession',
      BOOTSTRAP_SESSION: 'bootstrapSession',
      REFRESH_MY_SESSION: 'refreshMySession',
      GET_MY_PROFILE: 'getMyProfile',
      UPDATE_MY_PROFILE: 'updateMyProfile',
      GET_REFERENCE_BOOTSTRAP: 'getAppBootstrapRef',
      GET_FORM_DEFINITION: 'getFormDefinition',
      GET_DASHBOARD_SUMMARY: 'getDashboardSummary',
      GET_SASARAN_BY_TIM: 'getSasaranByTim',
      SEARCH_SASARAN: 'searchSasaran',
      GET_SASARAN_DETAIL: 'getSasaranDetail',
      REGISTER_SASARAN: 'registerSasaran',
      UPDATE_SASARAN: 'updateSasaran',
      CHANGE_STATUS_SASARAN: 'changeStatusSasaran',
      SUBMIT_PENDAMPINGAN: 'submitPendampingan',
      EDIT_PENDAMPINGAN: 'editPendampingan',
      GET_PENDAMPINGAN_BY_ID: 'getPendampinganById',
      GET_RIWAYAT_PENDAMPINGAN_SASARAN: 'getRiwayatPendampinganSasaran',
      GET_REKAP_SAYA: 'getRekapBulananTim',
      LOG_CLIENT_ERROR: 'logClientError'
    },

    MENU_ITEMS: [
      { id: 'menu-sasaran', title: 'Daftar Sasaran', desc: 'Lihat sasaran tim', icon: '👥', screen: 'sasaran-list-screen', accent: 1 },
      { id: 'menu-registrasi', title: 'Registrasi Sasaran', desc: 'Tambah sasaran baru', icon: '📝', screen: 'registrasi-screen', accent: 2 },
      { id: 'menu-sync', title: 'Draft & Sinkronisasi', desc: 'Kelola draft offline', icon: '🔄', screen: 'sync-screen', accent: 3 },
      { id: 'menu-rekap', title: 'Rekap Saya', desc: 'Ringkasan aktivitas', icon: '📊', screen: 'rekap-kader-screen', accent: 4 },
      { id: 'menu-profile', title: 'Profil Saya', desc: 'Lihat profil aktif', icon: '👤', action: 'openProfile', accent: 5 },
      { id: 'menu-help', title: 'Bantuan', desc: 'Panduan penggunaan', icon: '❓', action: 'openHelp', accent: 6 }
    ],

    DEFAULT_PROFILE: {
      id_user: '',
      nama_user: '',
      nama_kader: '',
      unsur_tpk: 'KADER',
      role: 'KADER',
      role_akses: 'KADER',
      id_tim: '',
      nama_tim: '',
      kecamatan: '',
      desa_kelurahan: '',
      dusun_rw: '',
      status_kader_tpk: '',
      nomor_wa: '',
      memiliki_bpjstk: '',
      mengantar_mbg_3b: '',
      mendapat_insentif_mbg_3b: '',
      insentif_mbg_3b_per_sasaran: ''
    }
  };

  window.AppConfig = AppConfig;
})(window);
