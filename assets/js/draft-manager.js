window.DraftManager = {
  saveRegistrasiDraft(payload) {
    RegistrasiState.setDraft({
      saved_at: new Date().toISOString(),
      data: payload
    });
  },

  getRegistrasiDraft() {
    return RegistrasiState.getDraft();
  },

  clearRegistrasiDraft() {
    RegistrasiState.clearDraft();
  },

  enqueueOfflineRegistrasi(payload) {
    const queue = OfflineSync.getQueue();
    queue.push({
      id: `Q-${Date.now()}`,
      action: 'submitRegistrasiSasaran',
      payload,
      client_submit_id: `SUB-${Date.now()}`,
      created_at: new Date().toISOString(),
      retry_count: 0,
      sync_status: 'PENDING'
    });
    OfflineSync.saveQueue(queue);
    OfflineSync.renderSummary();
  }
};
