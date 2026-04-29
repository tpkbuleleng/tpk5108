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
    },

    OBSERVABILITY: {
      EVENT_TYPE: {
        AUTH_FAILURE: 'AUTH_FAILURE',
        AUTHZ_FAILURE: 'AUTHZ_FAILURE',
        DEVICE_POLICY: 'DEVICE_POLICY',
        ABUSE_PROTECTION: 'ABUSE_PROTECTION',
        SIGNATURE_SECURITY: 'SIGNATURE_SECURITY',
        SESSION_SECURITY: 'SESSION_SECURITY',
        REQUEST_GUARD: 'REQUEST_GUARD'
      },

      DECISION_STATUS: {
        ALLOW: 'ALLOW',
        DENY: 'DENY',
        FLAG: 'FLAG'
      },

      REASON_CODE: {
        TOKEN_MISSING: 'TOKEN_MISSING',
        TOKEN_EXPIRED: 'TOKEN_EXPIRED',
        TOKEN_INACTIVE: 'TOKEN_INACTIVE',
        TOKEN_INVALID: 'TOKEN_INVALID',
        SESSION_INVALID: 'SESSION_INVALID',
        SESSION_REVOKED: 'SESSION_REVOKED',
        SESSION_DEVICE_MISMATCH: 'SESSION_DEVICE_MISMATCH',
        LOGIN_INVALID_CREDENTIALS: 'LOGIN_INVALID_CREDENTIALS',
        ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
        ACCOUNT_BLOCKED: 'ACCOUNT_BLOCKED',
        ROLE_FORBIDDEN: 'ROLE_FORBIDDEN',
        SCOPE_MISMATCH: 'SCOPE_MISMATCH',
        ID_TIM_MISSING: 'ID_TIM_MISSING',
        ID_USER_MISSING: 'ID_USER_MISSING',
        BOOK_KEY_MISSING: 'BOOK_KEY_MISSING',
        TARGET_OUT_OF_SCOPE: 'TARGET_OUT_OF_SCOPE',
        DEVICE_NOT_ALLOWED: 'DEVICE_NOT_ALLOWED',
        RATE_LIMITED: 'RATE_LIMITED',
        ABUSE_SUSPECTED: 'ABUSE_SUSPECTED',
        SIGNATURE_MISSING: 'SIGNATURE_MISSING',
        SIGNATURE_INVALID: 'SIGNATURE_INVALID',
        PAYLOAD_TAMPERED: 'PAYLOAD_TAMPERED',
        ACTION_NOT_ALLOWED: 'ACTION_NOT_ALLOWED',
        METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
        REQUEST_INVALID: 'REQUEST_INVALID'
      },

      BUSINESS_STATUS: {
        SUCCESS: 'SUCCESS',
        DUPLICATE: 'DUPLICATE',
        CONFLICT: 'CONFLICT',
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        UNAUTHORIZED: 'UNAUTHORIZED',
        FORBIDDEN: 'FORBIDDEN',
        NOT_FOUND: 'NOT_FOUND',
        RATE_LIMITED: 'RATE_LIMITED',
        SERVER_ERROR: 'SERVER_ERROR',
        REJECTED: 'REJECTED'
      },

      STATUS_SYNC: {
        PENDING: 'PENDING',
        PROCESSING: 'PROCESSING',
        SUCCESS: 'SUCCESS',
        FAILED: 'FAILED'
      }
    }
  };

  window.APP_CONFIG = Object.freeze(APP_CONFIG);
})(window);
