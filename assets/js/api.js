window.Api = {
  getBaseUrl() {
    const storedUrl = StorageHelper.get(APP_CONFIG.STORAGE_KEYS.API_URL, '');
    const resolved = String(storedUrl || APP_CONFIG.API_URL || '').trim();

    if (!resolved) return '';
    return resolved.replace(/\/+$/, '');
  },

  getStableDeviceId() {
    const storageKey = APP_CONFIG.STORAGE_KEYS.DEVICE_ID;
    let deviceId = StorageHelper.get(storageKey, '');

    if (deviceId) return deviceId;

    const raw = navigator.userAgent || 'UNKNOWN_DEVICE';
    const cleaned = String(raw).replace(/\s+/g, '').replace(/[^a-zA-Z0-9_-]/g, '');
    deviceId = `ANDROID-${cleaned.slice(0, 24) || 'UNKNOWN'}`;

    StorageHelper.set(storageKey, deviceId);
    return deviceId;
  },

  async post(action, payload = {}, options = {}) {
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      throw new Error('URL backend belum diatur.');
    }

    if (!action || typeof action !== 'string') {
      throw new Error('Action API tidak valid.');
    }

    const controller = new AbortController();
    const timeoutMs = Number(APP_CONFIG.REQUEST_TIMEOUT_MS || 20000);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const resolvedClientSubmitId = (options.skipClientSubmitId === true)
      ? ''
      : ClientId.ensure(
          options.clientSubmitId || payload.client_submit_id || '',
          'SUB'
        );

    const resolvedDeviceId =
      options.deviceId ||
      payload.device_id ||
      this.getStableDeviceId();

    const requestBody = {
      action: String(action).trim(),
      payload: Object.assign({}, payload),
      token: options.skipToken ? '' : (Session.getToken() || ''),
      app_version: APP_CONFIG.APP_VERSION || '1.0.0',
      sync_source: options.syncSource || payload.sync_source || 'ONLINE',
      client_submit_id: resolvedClientSubmitId,
      device_id: resolvedDeviceId
    };

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      let result;
      const responseText = await response.text();

      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseErr) {
        throw new Error('Respons backend tidak valid (bukan JSON).');
      }

      if (!response.ok) {
        const message =
          result?.message ||
          `HTTP ${response.status} ${response.statusText || 'Error'}`;

        if (response.status === 401) {
          this.handleUnauthorized(message);
        }

        throw new Error(message);
      }

      if (result?.code === 401 || result?.status_code === 401) {
        this.handleUnauthorized(result?.message || 'Sesi login berakhir.');
      }

      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Permintaan timeout. Silakan coba lagi.');
      }

      if (err.message) {
        throw err;
      }

      throw new Error('Koneksi ke backend gagal.');
    } finally {
      clearTimeout(timeoutId);
    }
  },

  handleUnauthorized(message) {
    try {
      if (typeof Auth !== 'undefined' && Auth?.logout) {
        Auth.logout();
      } else if (typeof Session !== 'undefined' && Session?.clear) {
        Session.clear();
      }
    } catch (_) {}

    throw new Error(message || 'Sesi login berakhir. Silakan login ulang.');
  }
};
