window.PendampinganDraft = {
  saveLocal(payload) {
    const safePayload = Object.assign({}, payload || {});
    const stableClientSubmitId = ClientId.ensure(
      safePayload.client_submit_id,
      'SUB'
    );

    const selected = SasaranState.getSelected() || {};

    PendampinganState.setDraft({
      saved_at: new Date().toISOString(),
      data: Object.assign({}, safePayload, {
        id_sasaran:
          safePayload.id_sasaran ||
          selected.id_sasaran ||
          selected.id ||
          '',
        nama_sasaran:
          safePayload.nama_sasaran ||
          selected.nama_sasaran ||
          selected.nama ||
          '',
        jenis_sasaran:
          safePayload.jenis_sasaran ||
          selected.jenis_sasaran ||
          '',
        client_submit_id: stableClientSubmitId
      })
    });

    this.refreshDraftCounter();
  },

  getLocal() {
    return PendampinganState.getDraft();
  },

  clearLocal() {
    PendampinganState.clearDraft();
    this.refreshDraftCounter();
  },

  enqueueOffline(payload) {
    const mode = PendampinganState.getMode();

    if (mode === 'edit') {
      throw new Error(
        'Edit pendampingan tidak didukung dalam mode offline.'
      );
    }

    const safePayload = Object.assign({}, payload || {});
    const stableClientSubmitId = ClientId.ensure(
      safePayload.client_submit_id,
      'SUB'
    );

    const item = OfflineSync.add({
      id: ClientId.queueId(),
      action: 'submitPendampingan',
      payload: Object.assign({}, safePayload, {
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

    this.refreshDraftCounter();
    return item;
  },

  saveAndQueue(payload) {
    const queued = this.enqueueOffline(payload);
    this.saveLocal(payload);
    return queued;
  },

  refreshDraftCounter() {
    const queue = OfflineSync.getQueue();
    const total = Array.isArray(queue) ? queue.length : 0;

    if (window.UI?.setText) {
      UI.setText('stat-draft', String(total), '0');
    }
  }
};
