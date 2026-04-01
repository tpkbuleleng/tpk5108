window.RegistrasiState = {
  MODE_KEY: 'registrasiMode',
  DRAFT_KEY: 'registrasiDraftLocal',

  getMode() {
    return StorageHelper.get(this.MODE_KEY, 'create');
  },

  setMode(mode) {
    return StorageHelper.set(this.MODE_KEY, mode || 'create');
  },

  getEditItem() {
    return StorageHelper.get('registrasiEditItem', null);
  },

  setEditItem(item) {
    return StorageHelper.set('registrasiEditItem', item || null);
  },

  clearEditItem() {
    StorageHelper.remove('registrasiEditItem');
  },

  getDraft() {
    return StorageHelper.get(this.DRAFT_KEY, null);
  },

  setDraft(data) {
    return StorageHelper.set(this.DRAFT_KEY, data || null);
  },

  clearDraft() {
    StorageHelper.remove(this.DRAFT_KEY);
  },

  reset() {
    this.setMode('create');
    this.clearEditItem();
    this.clearDraft();
  }
};
