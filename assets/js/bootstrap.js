window.Bootstrap = {
  async loadInitialRefs(forceRefresh = false) {
    try {
      if (!forceRefresh) {
        const cached = this.getCachedBootstrap();
        if (cached && Object.keys(cached).length) {
          return {
            ok: true,
            data: cached,
            source: 'cache'
          };
        }
      }

      const result = await Api.post('getBootstrapRefs', {});

      if (result?.ok) {
        const normalized = this.normalizeBootstrapData(result.data || {});
        StorageHelper.set(APP_CONFIG.STORAGE_KEYS.BOOTSTRAP, normalized);

        return {
          ok: true,
          data: normalized,
          source: 'api'
        };
      }

      const cached = this.getCachedBootstrap();
      if (cached && Object.keys(cached).length) {
        return {
          ok: true,
          data: cached,
          source: 'cache_fallback'
        };
      }

      return result;
    } catch (err) {
      const cached = this.getCachedBootstrap();
      if (cached && Object.keys(cached).length) {
        console.warn('Bootstrap refs gagal diambil dari API, memakai cache lokal:', err.message);

        return {
          ok: true,
          data: cached,
          source: 'cache_fallback'
        };
      }

      console.warn('Bootstrap refs gagal diambil:', err.message);

      return {
        ok: false,
        message: err.message || 'Bootstrap refs gagal diambil.',
        data: {}
      };
    }
  },

  normalizeBootstrapData(data) {
    const refs = data || {};

    return {
      app_name: refs.app_name || APP_CONFIG.APP_NAME || 'TPK KABUPATEN BULELENG',
      app_version: refs.app_version || APP_CONFIG.APP_VERSION || '1.0.0',
      jenis_sasaran: Array.isArray(refs.jenis_sasaran) ? refs.jenis_sasaran : [],
      form_refs: Array.isArray(refs.form_refs) ? refs.form_refs : [],
      status_sasaran: Array.isArray(refs.status_sasaran)
        ? refs.status_sasaran
        : (APP_CONFIG.STATUS_SASARAN || []),
      status_kunjungan: Array.isArray(refs.status_kunjungan)
        ? refs.status_kunjungan
        : (APP_CONFIG.STATUS_KUNJUNGAN || []),
      wilayah_tim: refs.wilayah_tim || {},
      raw: refs
    };
  },

  getCachedBootstrap() {
    return StorageHelper.get(APP_CONFIG.STORAGE_KEYS.BOOTSTRAP, {});
  },

  clearCachedBootstrap() {
    StorageHelper.remove(APP_CONFIG.STORAGE_KEYS.BOOTSTRAP);
  },

  getJenisSasaranOptions() {
    const data = this.getCachedBootstrap();
    return Array.isArray(data.jenis_sasaran) ? data.jenis_sasaran : [];
  },

  getStatusSasaranOptions() {
    const data = this.getCachedBootstrap();
    return Array.isArray(data.status_sasaran) ? data.status_sasaran : (APP_CONFIG.STATUS_SASARAN || []);
  },

  getStatusKunjunganOptions() {
    const data = this.getCachedBootstrap();
    return Array.isArray(data.status_kunjungan) ? data.status_kunjungan : (APP_CONFIG.STATUS_KUNJUNGAN || []);
  },

  getAppInfo() {
    const data = this.getCachedBootstrap();
    return {
      app_name: data.app_name || APP_CONFIG.APP_NAME || 'TPK KABUPATEN BULELENG',
      app_version: data.app_version || APP_CONFIG.APP_VERSION || '1.0.0'
    };
  }
};
