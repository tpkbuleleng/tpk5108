window.PendampinganDraft = {
  saveLocal(payload) {
    PendampinganState.setDraft({
      saved_at: new Date().toISOString(),
      data: payload
    });
  },

  getLocal() {
    return PendampinganState.getDraft();
  },

  clearLocal() {
    PendampinganState.clearDraft();
  },

  enqueueOffline(payload) {
    const mode = PendampinganState.getMode();
    if (mode === 'edit') {
      throw new Error('Edit pendampingan tidak didukung dalam mode offline.');
    }

    const queue = OfflineSync.getQueue();
    const clientSubmitId = `SUB-${Date.now()}`;

    queue.push({
      id: `Q-${Date.now()}`,
      action: 'submitPendampingan',
      payload,
      client_submit_id: clientSubmitId,
      created_at: new Date().toISOString(),
      retry_count: 0,
      sync_status: 'PENDING'
    });

    OfflineSync.saveQueue(queue);
    OfflineSync.renderSummary();
  }
};
