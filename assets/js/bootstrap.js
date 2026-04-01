window.Bootstrap = {
  async loadInitialRefs() {
    try {
      const result = await Api.post('getBootstrapRefs', {}, { skipToken: false });
      if (result?.ok) {
        StorageHelper.set(APP_CONFIG.STORAGE_KEYS.BOOTSTRAP, result.data || {});
      }
      return result;
    } catch (err) {
      console.warn('Bootstrap refs gagal diambil:', err.message);
      return null;
    }
  },

  getCachedBootstrap() {
    return StorageHelper.get(APP_CONFIG.STORAGE_KEYS.BOOTSTRAP, {});
  }
};
