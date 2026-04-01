window.PendampinganState = {
  MODE_KEY: 'pendampinganMode',
  DRAFT_KEY: 'pendampinganDraftLocal',
  EDIT_ITEM_KEY: 'pendampinganEditItem',

  getMode() {
    return StorageHelper.get(this.MODE_KEY, 'create');
  },

  setMode(mode) {
    return StorageHelper.set(this.MODE_KEY, mode || 'create');
  },

  getEditItem() {
    return StorageHelper.get(this.EDIT_ITEM_KEY, null);
  },

  setEditItem(item) {
    return StorageHelper.set(this.EDIT_ITEM_KEY, item || null);
  },

  clearEditItem() {
    StorageHelper.remove(this.EDIT_ITEM_KEY);
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
