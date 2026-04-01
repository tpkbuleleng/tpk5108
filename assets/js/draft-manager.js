window.DraftManager = {
  saveRegistrasiDraft(payload) {
    const stableClientSubmitId = ClientId.ensure(payload.client_submit_id, 'SUB');

    RegistrasiState.setDraft({
      saved_at: new Date().toISOString(),
      data: Object.assign({}, payload, {
        client_submit_id: stableClientSubmitId
      })
    });
  },

  getRegistrasiDraft() {
    return RegistrasiState.getDraft();
  },

  clearRegistrasiDraft() {
    RegistrasiState.clearDraft();
  },

  enqueueOfflineRegistrasi(payload) {
    const stableClientSubmitId = ClientId.ensure(payload.client_submit_id, 'SUB');

    return OfflineSync.add({
      id: ClientId.queueId(),
      action: 'submitRegistrasiSasaran',
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
