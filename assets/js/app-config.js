window.APP_CONFIG = {
  APP_NAME: 'TPK KABUPATEN BULELENG',

  APP_VERSION: '2.1.0',

  API_URL: '',

  REQUEST_TIMEOUT_MS: 30000,

  DEBUG: true,

  STORAGE_KEYS: {
    API_URL: 'apiUrl',
    SESSION_TOKEN: 'sessionToken',
    PROFILE: 'profile',
    BOOTSTRAP: 'bootstrapRef',

    SELECTED_SASARAN: 'selectedSasaran',

    SYNC_QUEUE: 'syncQueue',
    LAST_SYNC_AT: 'lastSyncAt',

    REGISTRASI_DRAFT: 'draftRegistrasi',
    PENDAMPINGAN_DRAFT: 'draftPendampingan',

    DEVICE_ID: 'stable_device_id',

    EDIT_PENDAMPINGAN: 'editPendampingan',

    DASHBOARD_CACHE: 'dashboardCache'
  },

  STATUS_SASARAN: [
    'AKTIF',
    'PERLU_REVIEW',
    'NONAKTIF',
    'SELESAI'
  ],

  STATUS_KUNJUNGAN: [
    'BERHASIL',
    'TIDAK_BERHASIL',
    'DITUNDA',
    'FOLLOW_UP'
  ]
};
