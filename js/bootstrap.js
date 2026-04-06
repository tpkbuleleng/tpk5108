(function (window, document) {
  'use strict';

  function getDisplayNomorTim(data) {
    data = data || {};

    var explicitNomor = data.nomor_tim || data.nomor_tim_display || data.nomor_tim_lokal || '';
    if (explicitNomor !== undefined && explicitNomor !== null && String(explicitNomor).trim() !== '') {
      return String(explicitNomor).trim();
    }

    var namaTim = String(data.nama_tim || '').trim();
    if (namaTim) {
      var match = namaTim.match(/(\d+)\s*$/);
      if (match && match[1]) {
        return match[1];
      }
      return namaTim;
    }

    return data.id_tim || '-';
  }

  const AppBootstrap = {
    async init() {
      this.showSplashStatus('Menyiapkan aplikasi...');
      this.applyStaticBranding();

      const cachedBootstrap = this.getCachedBootstrap();
      if (cachedBootstrap && Object.keys(cachedBootstrap).length) {
        this.applyBootstrapToUi(cachedBootstrap);
      }

      const cachedProfile = this.getCachedProfile();
      const token = this.getSessionToken();

      if (cachedProfile && Object.keys(cachedProfile).length) {
        if (window.AppState && typeof window.AppState.setProfile === 'function') {
          window.AppState.setProfile(cachedProfile);
        }
        this.applyProfileToUi(cachedProfile);
      }

      if (token && cachedProfile && Object.keys(cachedProfile).length) {
        this.openScreen('dashboard-screen');

        if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go('dashboard');
        }
      } else {
        this.openScreen('login-screen');
      }

      Promise.resolve().then(async () => {
        const bootstrapResult = await this.loadInitialRefs(false);
        if (bootstrapResult && bootstrapResult.ok) {
          this.applyBootstrapToUi(bootstrapResult.data || {});
        }
      });

      if (token) {
        this.showSplashStatus('Memeriksa sesi pengguna...');

        const sessionOk = await this.restoreSessionAndRoute({
          preferCachedUi: true
        });

        if (!sessionOk) {
          this.openScreen('login-screen');
        }
      }
    },

    async loadInitialRefs(forceRefresh = false) {
      try {
        if (!forceRefresh) {
          const cached = this.getCachedBootstrap();
          if (cached && Object.keys(cached).length) {
            return {
              ok: true,
              data: cached,
              source: 'cache'
            };
          }
        }

        if (!window.Api || typeof window.Api.post !== 'function') {
          throw new Error('Api.post belum tersedia');
        }

        const action = window.APP_CONFIG.API_ACTIONS.GET_APP_BOOTSTRAP_REF;
        const result = await window.Api.post(action, {}, {
          includeAuth: false
        });

        if (result && result.ok) {
          const normalized = this.normalizeBootstrapData(result.data || {});
          this.setCachedBootstrap(normalized);

          return {
            ok: true,
            data: normalized,
            source: 'api'
          };
        }

        const cached = this.getCachedBootstrap();
        if (cached && Object.keys(cached).length) {
          return {
            ok: true,
            data: cached,
            source: 'cache_fallback'
          };
        }

        return {
          ok: false,
          message: (result && result.message) || 'Bootstrap refs gagal diambil.',
          data: {}
        };
      } catch (err) {
        const cached = this.getCachedBootstrap();
        if (cached && Object.keys(cached).length) {
          console.warn('Bootstrap refs gagal diambil dari API, memakai cache lokal:', err && err.message ? err.message : err);
          return {
            ok: true,
            data: cached,
            source: 'cache_fallback'
          };
        }

        console.warn('Bootstrap refs gagal diambil:', err && err.message ? err.message : err);

        return {
          ok: false,
          message: err && err.message ? err.message : 'Bootstrap refs gagal diambil.',
          data: {}
        };
      }
    },

    normalizeBootstrapData(data) {
      const refs = data || {};

      return {
        app_name: refs.app_name || window.APP_CONFIG.APP_NAME || 'TPK KABUPATEN BULELENG',
        app_version: refs.app_version || window.APP_CONFIG.APP_VERSION || '1.0.0',
        jenis_sasaran: Array.isArray(refs.jenis_sasaran) ? refs.jenis_sasaran : [],
        form_refs: Array.isArray(refs.form_refs) ? refs.form_refs : [],
        status_sasaran: Array.isArray(refs.status_sasaran) ? refs.status_sasaran : [],
        status_kunjungan: Array.isArray(refs.status_kunjungan) ? refs.status_kunjungan : [],
        wilayah_tim: refs.wilayah_tim && typeof refs.wilayah_tim === 'object' ? refs.wilayah_tim : {},
        raw: refs
      };
    },

    getSessionToken() {
      if (!window.Storage || typeof window.Storage.get !== 'function') {
        return '';
      }

      return window.Storage.get(window.APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN, '');
    },

    getCachedProfile() {
      if (!window.Storage || typeof window.Storage.get !== 'function') {
        return {};
      }

      return window.Storage.get(window.APP_CONFIG.STORAGE_KEYS.PROFILE, {});
    },

    getCachedBootstrap() {
      if (!window.Storage || typeof window.Storage.get !== 'function') {
        return {};
      }

      return window.Storage.get(window.APP_CONFIG.STORAGE_KEYS.APP_BOOTSTRAP, {});
    },

    setCachedBootstrap(data) {
      if (!window.Storage || typeof window.Storage.set !== 'function') {
        return;
      }

      window.Storage.set(window.APP_CONFIG.STORAGE_KEYS.APP_BOOTSTRAP, data || {});
    },

    clearCachedBootstrap() {
      if (!window.Storage || typeof window.Storage.remove !== 'function') {
        return;
      }

      window.Storage.remove(window.APP_CONFIG.STORAGE_KEYS.APP_BOOTSTRAP);
    },

    getJenisSasaranOptions() {
      const data = this.getCachedBootstrap();
      return Array.isArray(data.jenis_sasaran) ? data.jenis_sasaran : [];
    },

    getStatusSasaranOptions() {
      const data = this.getCachedBootstrap();
      return Array.isArray(data.status_sasaran) ? data.status_sasaran : [];
    },

    getStatusKunjunganOptions() {
      const data = this.getCachedBootstrap();
      return Array.isArray(data.status_kunjungan) ? data.status_kunjungan : [];
    },

    getAppInfo() {
      const data = this.getCachedBootstrap();
      return {
        app_name: data.app_name || window.APP_CONFIG.APP_NAME || 'TPK KABUPATEN BULELENG',
        app_version: data.app_version || window.APP_CONFIG.APP_VERSION || '1.0.0'
      };
    },

    applyStaticBranding() {
      const logoUrl = window.APP_CONFIG.ASSETS.LOGO_URL;

      const loginLogo = document.getElementById('loginLogo');
      const splashLogo = document.querySelector('.splash-logo');
      const topbarLogo = document.querySelector('.topbar-logo');

      if (loginLogo) loginLogo.src = logoUrl;
      if (splashLogo) splashLogo.src = logoUrl;
      if (topbarLogo) topbarLogo.src = logoUrl;

      const appName = window.APP_CONFIG.APP_NAME || 'TPK KABUPATEN BULELENG';
      const appVersion = window.APP_CONFIG.APP_VERSION || '1.0.0';

      const appVersionEl = document.getElementById('app-version');
      const footerVersionEl = document.getElementById('footer-app-version');
      const settingsVersionEl = document.getElementById('settings-app-version');

      if (document.title !== appName) {
        document.title = appName;
      }

      if (appVersionEl) appVersionEl.textContent = appVersion;
      if (footerVersionEl) footerVersionEl.textContent = appVersion;
      if (settingsVersionEl) settingsVersionEl.textContent = appVersion;
    },

    applyBootstrapToUi(data) {
      const info = data || {};
      const appName = info.app_name || window.APP_CONFIG.APP_NAME || 'TPK KABUPATEN BULELENG';
      const appVersion = info.app_version || window.APP_CONFIG.APP_VERSION || '1.0.0';

      document.title = appName;

      const splashVersion = document.getElementById('app-version');
      const footerVersion = document.getElementById('footer-app-version');
      const settingsVersion = document.getElementById('settings-app-version');

      if (splashVersion) splashVersion.textContent = appVersion;
      if (footerVersion) footerVersion.textContent = appVersion;
      if (settingsVersion) settingsVersion.textContent = appVersion;
    },

    async restoreSessionAndRoute(options = {}) {
      try {
        if (!window.Storage || !window.Api) {
          return false;
        }

        const token = this.getSessionToken();
        if (!token) {
          return false;
        }

        const validateAction = window.APP_CONFIG.API_ACTIONS.VALIDATE_SESSION;
        const validateResult = await window.Api.post(validateAction, {}, {
          includeAuth: true
        });

        if (!validateResult || !validateResult.ok) {
          this.clearSession();
          return false;
        }

        const bootstrapSessionAction = window.APP_CONFIG.API_ACTIONS.BOOTSTRAP_SESSION;
        const sessionResult = await window.Api.post(bootstrapSessionAction, {}, {
          includeAuth: true
        });

        if (!sessionResult || !sessionResult.ok) {
          this.clearSession();
          return false;
        }

        const sessionData = sessionResult.data || {};
        const profile = sessionData.profile || sessionData.session || {};

        if (window.Storage && typeof window.Storage.set === 'function') {
          window.Storage.set(window.APP_CONFIG.STORAGE_KEYS.PROFILE, profile || {});
        }

        if (window.AppState && typeof window.AppState.setProfile === 'function') {
          window.AppState.setProfile(profile || {});
        }

        this.applyProfileToUi(profile || {});

        if (!options.preferCachedUi) {
          this.openScreen('dashboard-screen');
        }

        if (window.DashboardView && typeof window.DashboardView.refresh === 'function') {
          window.DashboardView.refresh();
        }

        if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go('dashboard');
        }

        return true;
      } catch (err) {
        console.warn('Gagal memulihkan sesi:', err && err.message ? err.message : err);
        this.clearSession();
        return false;
      }
    },

    applyProfileToUi(profile) {
      const data = profile || {};

      this.setText('profile-nama', data.nama_kader || data.nama_user || data.nama || '-');
      this.setText('profile-unsur', data.unsur_tpk || data.unsur || '-');
      this.setText('profile-id', data.id_user || '-');
      this.setText('profile-tim', getDisplayNomorTim(data));
      this.setText('profile-desa', data.desa_kelurahan || data.nama_desa || '-');
      this.setText('profile-dusun', data.dusun_rw || data.nama_dusun || '-');
      this.setText('header-kecamatan', data.nama_kecamatan || data.kecamatan || '-');
    },

    clearSession() {
      if (!window.Storage || typeof window.Storage.remove !== 'function') {
        return;
      }

      window.Storage.remove(window.APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
      window.Storage.remove(window.APP_CONFIG.STORAGE_KEYS.PROFILE);

      if (window.AppState && typeof window.AppState.setProfile === 'function') {
        window.AppState.setProfile({});
      }
    },

    showSplashStatus(message) {
      const el = document.getElementById('splash-status');
      if (el) {
        el.textContent = message || 'Menyiapkan aplikasi...';
      }
    },

    setText(id, value) {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = (value === undefined || value === null || value === '') ? '-' : String(value);
      }
    },

    openScreen(screenId) {
      const screens = document.querySelectorAll('.screen');
      screens.forEach(function (screen) {
        screen.classList.remove('active');
        screen.classList.add('hidden');
      });

      const target = document.getElementById(screenId);
      if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
      }
    }
  };

  window.AppBootstrap = AppBootstrap;
})(window, document);
