window.SasaranState = {
  getList() {
    return StorageHelper.get('sasaranListCache', []);
  },

  setList(items) {
    return StorageHelper.set('sasaranListCache', Array.isArray(items) ? items : []);
  },

  getSelected() {
    return StorageHelper.get(APP_CONFIG.STORAGE_KEYS.SELECTED_SASARAN, null);
  },

  setSelected(item) {
    return StorageHelper.set(APP_CONFIG.STORAGE_KEYS.SELECTED_SASARAN, item || null);
  },

  clearSelected() {
    StorageHelper.remove(APP_CONFIG.STORAGE_KEYS.SELECTED_SASARAN);
  }
};
