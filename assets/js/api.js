window.Api = {
  getBaseUrl() {
    return (window.APP_CONFIG?.API_BASE_URL || '').trim();
  },

  async post(action, payload = {}) {
    const apiUrl = this.getBaseUrl();

    if (!apiUrl) {
      throw new Error('API_BASE_URL belum diatur');
    }

    const form = new URLSearchParams();
    form.append('action', action);

    Object.keys(payload).forEach((key) => {
      const value = payload[key];
      if (value === undefined || value === null) return;

      if (typeof value === 'object') {
        form.append(key, JSON.stringify(value));
      } else {
        form.append(key, String(value));
      }
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: form
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  }
};
