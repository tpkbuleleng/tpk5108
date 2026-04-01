window.PendampinganDraft = {
  saveLocal(payload) {
    const stableClientSubmitId = ClientId.ensure(payload.client_submit_id, 'SUB');

    PendampinganState.setDraft({
      saved_at: new Date().toISOString(),
      data: Object.assign({}, payload, {
        client_submit_id: stableClientSubmitId
      })
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

    const stableClientSubmitId = ClientId.ensure(payload.client_submit_id, 'SUB');

    return OfflineSync.add({
      id: ClientId.queueId(),
      action: 'submitPendampingan',
      payload: Object.assign({}, payload, {
        client_submit_id: stableClientSubmitId,
        sync_source: 'OFFLINE_DRAFT'
      }),
      client_submit_id: stableClientSubmitId,
      created_at: new Date().toISOString(),
      retry_count: 0,
      sync_status: 'PENDING',
      last_error: '',
      last_synced_at: ''
    });
  }
};
