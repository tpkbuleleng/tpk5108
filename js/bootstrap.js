(function (window, document) {
  'use strict';

  var BOOTSTRAP_LITE_KEY = 'tpk_bootstrap_lite';

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

  function mergeProfileData(existingProfile, incomingProfile) {
    var existing = existingProfile && typeof existingProfile === 'object' ? existingProfile : {};
    var incoming = incomingProfile && typeof incomingProfile === 'object' ? incomingProfile : {};
    var merged = Object.assign({}, existing);

    Object.keys(incoming).forEach(function (key) {
      var value = incoming[key];

      if (value === undefined || value === null) return;

      if (typeof value === 'string') {
        var clean = value.trim();
        if (!clean || clean === '-') return;
      }

      merged[key] = value;
    });

    return merged;
  }

  const AppBootstrap = {
    async init() {
      this.showSplashStatus('Menyiapkan aplikasi...');
      this.applyStaticBranding();

      var cachedBootstrapLite = this.getCachedBootstrapLite();
      var cachedProfile = this.getCachedProfile();
      var token = this.getSessionToken();
      var effectiveProfile = mergeProfileData(cachedProfile, (cachedBootstrapLite && cachedBootstrapLite.profile) || {});

      if (cachedBootstrapLite && Object.keys(cachedBootstrapLite).length) {
        this.applyBootstrapLite(cachedBootstrapLite, { persist: false });
      } else if (effectiveProfile && Object.keys(effectiveProfile).length) {
        this.persistProfile(effectiveProfile);
        this.applyProfileToUi(effectiveProfile);
      }

      if (token && (effectiveProfile && Object.keys(effectiveProfile).length || cachedBootstrapLite && Object.keys(cachedBootstrapLite).length)) {
        this.openScreen('dashboard-screen');
        if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go('dashboard');
        }
      } else {
        this.openScreen('login-screen');
      }

      if (token) {
        this.showSplashStatus('Memeriksa sesi pengguna...');
        var sessionOk = await this.restoreSessionAndRoute({ preferCachedUi: true });
        if (!sessionOk) {
          this.openScreen('login-screen');
        }
      }
    },

    async loadInitialRefs(forceRefresh) {
      forceRefresh = !!forceRefresh;

      try {
        if (!forceRefresh) {
          const cached = this.getCachedBootstrap();
          if (cached && Object.keys(cached).length) {
            return { ok: true, data: cached, source: 'cache' };
          }
        }

        if (!window.Api || typeof window.Api.getAppBootstrapRef !== 'function') {
          throw new Error('Api.getAppBootstrapRef belum tersedia');
        }

        const result = await window.Api.getAppBootstrapRef({});
        if (result && result.ok) {
          const normalized = this.normalizeBootstrapData(result.data || {});
          this.setCachedBootstrap(normalized);
          return { ok: true, data: normalized, source: 'api' };
        }

        const cached = this.getCachedBootstrap();
        if (cached && Object.keys(cached).length) {
          return { ok: true, data: cached, source: 'cache_fallback' };
        }

        return { ok: false, message: (result && result.message) || 'Bootstrap refs gagal diambil.', data: {} };
      } catch (err) {
        const cached = this.getCachedBootstrap();
        if (cached && Object.keys(cached).length) {
          console.warn('Bootstrap refs gagal diambil dari API, memakai cache lokal:', err && err.message ? err.message : err);
          return { ok: true, data: cached, source: 'cache_fallback' };
        }

        console.warn('Bootstrap refs gagal diambil:', err && err.message ? err.message : err);
        return { ok: false, message: err && err.message ? err.message : 'Bootstrap refs gagal diambil.', data: {} };
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

    persistProfile(profile) {
      var data = profile || {};
      if (window.Storage && typeof window.Storage.set === 'function') {
        window.Storage.set(window.APP_CONFIG.STORAGE_KEYS.PROFILE, data);
      }
      if (window.AppState && typeof window.AppState.setProfile === 'function') {
        window.AppState.setProfile(data);
      }
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

    getBootstrapLiteKey() {
      if (window.Storage && typeof window.Storage.getBootstrapLiteKey === 'function') {
        return window.Storage.getBootstrapLiteKey();
      }
      return BOOTSTRAP_LITE_KEY;
    },

    getCachedBootstrapLite() {
      if (window.Storage && typeof window.Storage.getBootstrapLite === 'function') {
        return window.Storage.getBootstrapLite({}) || {};
      }
      if (!window.Storage || typeof window.Storage.get !== 'function') {
        return {};
      }
      return window.Storage.get(this.getBootstrapLiteKey(), {});
    },

    setCachedBootstrapLite(data) {
      if (window.Storage && typeof window.Storage.setBootstrapLite === 'function') {
        window.Storage.setBootstrapLite(data || {});
        return;
      }
      if (window.Storage && typeof window.Storage.set === 'function') {
        window.Storage.set(this.getBootstrapLiteKey(), data || {});
      }
    },

    clearCachedBootstrapLite() {
      if (window.Storage && typeof window.Storage.removeBootstrapLite === 'function') {
        window.Storage.removeBootstrapLite();
        return;
      }
      if (window.Storage && typeof window.Storage.remove === 'function') {
        window.Storage.remove(this.getBootstrapLiteKey());
      }
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
      var lite = this.getCachedBootstrapLite();
      var refs = this.getCachedBootstrap();
      return {
        app_name: lite.app_name || refs.app_name || window.APP_CONFIG.APP_NAME || 'TPK KABUPATEN BULELENG',
        app_version: lite.app_version || refs.app_version || window.APP_CONFIG.APP_VERSION || '1.0.0'
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

    applyBootstrapLite(bootstrapLite, options) {
      var payload = bootstrapLite && typeof bootstrapLite === 'object' ? bootstrapLite : {};
      var opts = options || {};
      var profile = mergeProfileData(this.getCachedProfile(), payload.profile || {});

      if (opts.persist !== false) {
        this.setCachedBootstrapLite(payload);
        if (profile && Object.keys(profile).length) {
          this.persistProfile(profile);
        }
      }

      this.applyBootstrapToUi({
        app_name: payload.app_name || window.APP_CONFIG.APP_NAME,
        app_version: payload.app_version || window.APP_CONFIG.APP_VERSION
      });

      if (profile && Object.keys(profile).length) {
        this.applyProfileToUi(profile);
      }

      if (window.DashboardView && typeof window.DashboardView.applyBootstrapLite === 'function') {
        window.DashboardView.applyBootstrapLite(payload);
      } else if (window.DashboardView && typeof window.DashboardView.refresh === 'function') {
        window.DashboardView.refresh();
      }

      return payload;
    },

    async restoreSessionAndRoute(options) {
      options = options || {};

      try {
        if (!window.Storage || !window.Api) {
          return false;
        }

        const token = this.getSessionToken();
        if (!token) {
          return false;
        }

        var result = null;

        if (typeof window.Api.refreshBootstrapLite === 'function') {
          result = await window.Api.refreshBootstrapLite({});
        }

        if ((!result || !result.ok) && typeof window.Api.bootstrapSession === 'function') {
          result = await window.Api.bootstrapSession({});
        }

        if (!result || !result.ok) {
          this.clearSession();
          return false;
        }

        var responseData = result.data || {};
        var bootstrapLite = responseData.bootstrap_lite || {};
        var sessionProfile = responseData.profile || responseData.session || {};

        if (!bootstrapLite.profile && sessionProfile && Object.keys(sessionProfile).length) {
          bootstrapLite.profile = sessionProfile;
        }
        if (!bootstrapLite.session && responseData.session) {
          bootstrapLite.session = responseData.session;
        }
        if (!bootstrapLite.permissions && responseData.permissions) {
          bootstrapLite.permissions = responseData.permissions;
        }
        if (!bootstrapLite.expired_at && responseData.expired_at) {
          bootstrapLite.expired_at = responseData.expired_at;
        }

        this.applyBootstrapLite(bootstrapLite);

        if (!options.preferCachedUi) {
          this.openScreen('dashboard-screen');
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
      if (window.Storage && typeof window.Storage.clearSession === 'function') {
        window.Storage.clearSession();
      } else if (window.Storage && typeof window.Storage.remove === 'function') {
        window.Storage.remove(window.APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
        window.Storage.remove(window.APP_CONFIG.STORAGE_KEYS.PROFILE);
        window.Storage.remove(this.getBootstrapLiteKey());
      }

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
