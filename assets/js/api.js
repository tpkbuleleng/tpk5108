window.Api = {
  getBaseUrl() {
    const storedUrl = StorageHelper.get(APP_CONFIG.STORAGE_KEYS.API_URL, '');
    return storedUrl || APP_CONFIG.API_URL || '';
  },

  async post(action, payload = {}, options = {}) {
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      throw new Error('URL backend belum diatur');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.REQUEST_TIMEOUT_MS);

    const resolvedClientSubmitId = ClientId.ensure(
      options.clientSubmitId || payload.client_submit_id || '',
      'SUB'
    );

    const requestBody = {
      action,
      payload: Object.assign({}, payload),
      token: options.skipToken ? '' : Session.getToken(),
      app_version: APP_CONFIG.APP_VERSION,
      sync_source: options.syncSource || payload.sync_source || 'ONLINE',
      client_submit_id: resolvedClientSubmitId,
      device_id: options.deviceId || payload.device_id || this.makeDeviceId()
    };

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      const result = await response.json();
      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Permintaan timeout. Silakan coba lagi.');
      }
      throw new Error('Koneksi ke backend gagal.');
    } finally {
      clearTimeout(timeoutId);
    }
  },

  makeDeviceId() {
    return `ANDROID-${navigator.userAgent.replace(/\s+/g, '').slice(0, 20)}`;
  }
};
