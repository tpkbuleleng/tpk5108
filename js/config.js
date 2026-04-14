(function (window) {
  'use strict';

  const APP_CONFIG = {
    APP_NAME: 'TPK KABUPATEN BULELENG',
    APP_VERSION: '2.1.2',

    API_BASE_URL: 'https://script.google.com/macros/s/AKfycbwZiCcv7MCL21R1VqlOFsx1x_Ax_8yoxVwjIumG3kVYwDSQTfXX9VjQnz2GsAW2ItzAAQ/exec',
    API_TIMEOUT_MS: 30000,

    ASSETS: {
      LOGO_URL: './assets/img/logo.png',
      LOGO_192_URL: './assets/img/logo-192.png'
    },

    STORAGE_KEYS: {
      SESSION_TOKEN: 'tpk_session_token',
      PROFILE: 'tpk_profile',
      DEVICE_ID: 'tpk_device_id',
      APP_BOOTSTRAP: 'tpk_app_bootstrap',
      SASARAN_CACHE: 'tpk_sasaran_cache',
      SELECTED_SASARAN: 'tpk_selected_sasaran',
      SYNC_QUEUE: 'tpk_sync_queue',
      LAST_SYNC_AT: 'tpk_last_sync_at',
      FONT_SIZE: 'tpk_app_font_size'
    },

    API_ACTIONS: {
      HEALTH_CHECK: 'healthCheck',

      LOGIN: 'login',
      LOGOUT: 'logout',
      CHANGE_PASSWORD: 'changePassword',
      REFRESH_TOKEN: 'refreshToken',

      GET_MY_SESSION: 'getMySession',
      VALIDATE_SESSION: 'validateSession',
      REFRESH_MY_SESSION: 'refreshMySession',
      LOGOUT_CURRENT_SESSION: 'logoutCurrentSession',
      BOOTSTRAP_SESSION: 'bootstrapSession',

      GET_MY_PROFILE: 'getMyProfile',
      GET_MY_PERMISSIONS: 'getMyPermissions',
      UPDATE_MY_PROFILE: 'updateMyProfile',

      GET_FORM_DEFINITION: 'getFormDefinition',
      GET_FORM_LIST: 'getFormList',

      GET_JENIS_SASARAN_REF: 'getJenisSasaranRef',
      GET_STATUS_SASARAN_REF: 'getStatusSasaranRef',
      GET_ROLE_REF: 'getRoleRef',
      GET_KECAMATAN_REF: 'getKecamatanRef',
      GET_WILAYAH_REF: 'getWilayahRef',
      GET_TIM_REF: 'getTimRef',
      GET_APP_BOOTSTRAP_REF: 'getAppBootstrapRef',

      GET_SASARAN_BY_TIM: 'getSasaranByTim',
      SEARCH_SASARAN: 'searchSasaran',
      REGISTER_SASARAN: 'registerSasaran',
      UPDATE_SASARAN: 'updateSasaran',
      CHANGE_STATUS_SASARAN: 'changeStatusSasaran',
      GET_SASARAN_DETAIL: 'getSasaranDetail',

      SUBMIT_PENDAMPINGAN: 'submitPendampingan',
      EDIT_PENDAMPINGAN: 'editPendampingan',
      GET_PENDAMPINGAN_BY_ID: 'getPendampinganById',
      GET_PENDAMPINGAN_BULANAN_BY_TIM: 'getPendampinganBulananByTim',
      GET_PENDAMPINGAN_LIST: 'getPendampinganList',
      GET_RIWAYAT_PENDAMPINGAN_SASARAN: 'getRiwayatPendampinganSasaran',

      GET_DASHBOARD_SUMMARY: 'getDashboardSummary',
      GET_REKAP_BULANAN_TIM: 'getRekapBulananTim',

      LOG_CLIENT_ERROR: 'logClientError'
    },

    FORM_IDS: {
      UMUM: 'FRM0001',
      CATIN: 'FRM0002',
      BUMIL: 'FRM0003',
      BUFAS: 'FRM0004',
      BADUTA: 'FRM0005'
    },

    DEFAULTS: {
      SYNC_SOURCE_ONLINE: 'ONLINE',
      SYNC_SOURCE_OFFLINE: 'OFFLINE',
      NETWORK_ONLINE_LABEL: 'Online',
      NETWORK_OFFLINE_LABEL: 'Offline'
    }
  };

  window.APP_CONFIG = Object.freeze(APP_CONFIG);
})(window);
