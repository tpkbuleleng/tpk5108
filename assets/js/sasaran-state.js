window.SasaranState = {
  LIST_KEY: 'sasaranList',
  SELECTED_KEY: 'selectedSasaran',

  getList() {
    return StorageHelper.get(this.LIST_KEY, []);
  },

  setList(items) {
    return StorageHelper.set(this.LIST_KEY, Array.isArray(items) ? items : []);
  },

  clearList() {
    StorageHelper.remove(this.LIST_KEY);
  },

  getSelected() {
    return StorageHelper.get(this.SELECTED_KEY, null);
  },

  setSelected(item) {
    return StorageHelper.set(this.SELECTED_KEY, item || null);
  },

  clearSelected() {
    StorageHelper.remove(this.SELECTED_KEY);
  }
};
