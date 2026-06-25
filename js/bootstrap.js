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


  function normalizeDisplayText(value) {
    var text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    if (!text) return '';
    var upper = text.toUpperCase();
    if (upper === '-' || upper === 'NULL' || upper === 'UNDEFINED' || upper === 'N/A' || upper === 'NA') {
      return '';
    }
    return text;
  }

  function parseWilayahDisplay(profile) {
    var data = profile || {};
    var wilayah = normalizeDisplayText(data.wilayah_tugas || data.wilayah || '');
    var desa = normalizeDisplayText(data.desa_kelurahan || data.nama_desa || data.desa || '');
    var dusun = normalizeDisplayText(data.dusun_rw || data.nama_dusun || data.dusun || '');
    var kecamatan = normalizeDisplayText(data.nama_kecamatan || data.kecamatan || '');

    if (wilayah) {
      var parts = wilayah.split(/\s*,\s*/).map(function(part) {
        return String(part || '').trim();
      }).filter(Boolean);

      if (!kecamatan && parts[0]) kecamatan = parts[0];
      if (!desa && parts[1]) desa = parts[1];
      if (!dusun && parts.length > 2) dusun = parts.slice(2).join(', ');
    }

    return {
      kecamatan: kecamatan || '-',
      desa: desa || '-',
      dusun: dusun || '-'
    };
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = (value === undefined || value === null || value === '') ? '-' : String(value);
  }

  function setTextAliases(ids, value) {
    (ids || []).forEach(function(id) {
      setText(id, value);
    });
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

  function getCurrentRouteName() {
    try {
      if (window.Router && typeof window.Router.getCurrentRoute === 'function') {
        return String(window.Router.getCurrentRoute() || '').trim();
      }
      if (window.Router && window.Router.currentRoute) {
        return String(window.Router.currentRoute || '').trim();
      }
      if (window.AppState && typeof window.AppState.getCurrentRoute === 'function') {
        return String(window.AppState.getCurrentRoute() || '').trim();
      }
      if (window.AppState && window.AppState.currentRoute) {
        return String(window.AppState.currentRoute || '').trim();
      }
    } catch (err) {}
    return '';
  }

  function isSafeToForceDashboard(routeName) {
    var route = String(routeName || '').trim();
    if (!route) return true;
    return route === 'splash' || route === 'login' || route === 'dashboard' || route === 'appLanding';
  }

  function getDefaultAuthenticatedRoute() {
    var config = window.APP_CONFIG || {};
    var features = config.FEATURES || {};
    var landing = config.APP_LANDING || {};

    if (features.APP_LANDING_ENABLED === true || landing.ENABLED === true) {
      return String(features.APP_LANDING_DEFAULT_ROUTE || landing.DEFAULT_ROUTE || 'appLanding').trim() || 'appLanding';
    }

    return 'dashboard';
  }

  function getScreenIdForDefaultAuthenticatedRoute() {
    var route = getDefaultAuthenticatedRoute();
    if (route === 'appLanding') return 'app-landing-screen';
    if (route === 'harganas') return 'harganas-screen';
    return 'dashboard-screen';
  }

  function goDefaultAuthenticatedRoute(options) {
    var route = getDefaultAuthenticatedRoute();
    if (window.Router && typeof window.Router.go === 'function') {
      window.Router.go(route, options || {});
      return true;
    }
    return false;
  }

  function isAuthFailureResult(result) {
    if (!result) return false;
    var code = Number(result.code || 0);
    if (code === 401 || code === 403 || result.session_invalid === true) return true;
    var msg = String(result.message || '').toLowerCase();
    return msg.indexOf('session token') >= 0 || msg.indexOf('token tidak') >= 0 || msg.indexOf('token expired') >= 0;
  }

  function isTokenInactiveResult(result) {
    var msg = String(result && result.message || '').toLowerCase();
    return result && result.token_inactive === true || msg.indexOf('tidak aktif') >= 0 || msg.indexOf('dicabut') >= 0 || msg.indexOf('inactive') >= 0 || msg.indexOf('revoked') >= 0;
  }

  function safeToast(message, type) {
    if (window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(message, type || 'info');
      return;
    }
    try { console.log('[SESSION]', type || 'info', message); } catch (err) {}
  }


  function isBootstrapRefreshCooldownActive() {
    try {
      var until = Number(window.__TPK_SKIP_BOOTSTRAP_REFRESH_UNTIL || 0);
      return until > 0 && Date.now() < until;
    } catch (err) {
      return false;
    }
  }

  const AppBootstrap = {
    _initRunId: 0,

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

      var initRunId = Date.now();
      this._initRunId = initRunId;
      var currentRoute = getCurrentRouteName();

      if (token && ((effectiveProfile && Object.keys(effectiveProfile).length) || (cachedBootstrapLite && Object.keys(cachedBootstrapLite).length))) {
        if (isSafeToForceDashboard(currentRoute)) {
          this.openScreen(getScreenIdForDefaultAuthenticatedRoute());
          goDefaultAuthenticatedRoute();
        }
      } else {
        if (!currentRoute || currentRoute === 'splash' || currentRoute === 'login') {
          this.openScreen('login-screen');
        }
      }

      if (token) {
        this.showSplashStatus('Memulihkan sesi di latar belakang...');

        if (isSafeToForceDashboard(currentRoute)) {
          this.openScreen(getScreenIdForDefaultAuthenticatedRoute());
          goDefaultAuthenticatedRoute({ skipHeavyRefresh: true });
        }

        this.restoreSessionAndRouteBackground_({ preferCachedUi: true, initRunId: initRunId });
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
      var profile = window.Storage.get(window.APP_CONFIG.STORAGE_KEYS.PROFILE, {});
      if (profile && Object.keys(profile).length) return profile;
      if (typeof window.Storage.getLastGoodProfile === 'function') {
        return window.Storage.getLastGoodProfile({}) || {};
      }
      return {};
    },

    persistProfile(profile) {
      var incoming = profile && typeof profile === 'object' ? profile : {};
      if (!Object.keys(incoming).length) return;
      var data = mergeProfileData(this.getCachedProfile(), incoming);
      if (window.Storage && typeof window.Storage.setProfile === 'function') {
        window.Storage.setProfile(data);
      } else if (window.Storage && typeof window.Storage.set === 'function') {
        window.Storage.set(window.APP_CONFIG.STORAGE_KEYS.PROFILE, data);
        if (typeof window.Storage.setLastGoodProfile === 'function') window.Storage.setLastGoodProfile(data);
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
      } else if (window.DashboardView && typeof window.DashboardView.applyDashboardProfile === 'function' && profile && Object.keys(profile).length) {
        window.DashboardView.applyDashboardProfile(profile);
      }

      if (opts.refreshProfileRefs !== false && profile && Object.keys(profile).length) {
        this.refreshProfileFromBackendRefs_(profile).catch(function () {});
      }

      return payload;
    },

    restoreSessionAndRouteBackground_(options) {
      var self = this;
      var opts = options || {};

      function run() {
        if (isBootstrapRefreshCooldownActive() && opts.force !== true) {
          return;
        }
        self.restoreSessionAndRoute(Object.assign({}, opts, {
          background: true,
          allowHeavyFallback: false,
          keepUiOnFailure: false
        })).then(function (ok) {
          if (!ok && opts.initRunId && self._initRunId === opts.initRunId) {
            if (window.__TPK_APP_UPDATE_IN_PROGRESS === true) return;
            var cachedLite = self.getCachedBootstrapLite ? self.getCachedBootstrapLite() : {};
            var cachedProfile = self.getCachedProfile ? self.getCachedProfile() : {};
            if ((cachedLite && Object.keys(cachedLite).length) || (cachedProfile && Object.keys(cachedProfile).length)) {
              return;
            }
            self.openScreen('login-screen');
            if (window.Router && typeof window.Router.go === 'function') {
              window.Router.go('login');
            }
          }
        }).catch(function (err) {
          console.warn('Restore session background gagal:', err && err.message ? err.message : err);
        });
      }

      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(run, { timeout: 700 });
      } else {
        window.setTimeout(run, 120);
      }
    },

    async restoreSessionAndRoute(options) {
      options = options || {};
      var initRunId = options.initRunId || 0;

      try {
        if (!window.Storage || !window.Api) {
          return false;
        }

        const token = this.getSessionToken();
        if (!token) {
          return false;
        }

        var result = null;

        if (isBootstrapRefreshCooldownActive() && options.force !== true) {
          return true;
        }

        if (typeof window.Api.refreshBootstrapLite === 'function') {
          result = await window.Api.refreshBootstrapLite({ source: options.background ? 'bootstrap_background' : 'bootstrap_restore' });
        }

        if ((!result || !result.ok) && options.allowHeavyFallback === true && typeof window.Api.bootstrapSession === 'function') {
          result = await window.Api.bootstrapSession({});
        }

        if (!result || !result.ok) {
          var authFailure = isAuthFailureResult(result);
          if (authFailure) {
            if (window.Api && typeof window.Api.handleSessionInvalid === 'function') {
              window.Api.handleSessionInvalid(result || {
                ok: false,
                code: 401,
                message: 'Session tidak valid',
                reason_code: isTokenInactiveResult(result) ? 'TOKEN_INACTIVE' : 'TOKEN_INVALID'
              }, { action: 'refreshBootstrapLite', requiresAuth: true, source: 'bootstrap.js' });
            } else {
              if (window.Storage && typeof window.Storage.setSessionStatus === 'function') {
                window.Storage.setSessionStatus({
                  status: isTokenInactiveResult(result) ? 'TOKEN_INACTIVE' : 'TOKEN_INVALID',
                  message: result && result.message ? result.message : 'Session tidak valid',
                  updated_at: new Date().toISOString(),
                  source: 'bootstrap.js'
                });
              }
              safeToast(isTokenInactiveResult(result) ? 'Session tidak aktif. Silakan login ulang.' : 'Session perlu login ulang.', 'warning');
              this.openScreen('login-screen');
              if (window.Router && typeof window.Router.go === 'function') window.Router.go('login');
            }
            return false;
          }

          if (options.keepUiOnFailure === true || options.preferCachedUi === true) {
            var cachedLiteOnFailure = this.getCachedBootstrapLite ? this.getCachedBootstrapLite() : {};
            var cachedProfileOnFailure = this.getCachedProfile ? this.getCachedProfile() : {};
            if ((cachedLiteOnFailure && Object.keys(cachedLiteOnFailure).length) ||
                (cachedProfileOnFailure && Object.keys(cachedProfileOnFailure).length)) {
              if (cachedLiteOnFailure && Object.keys(cachedLiteOnFailure).length) {
                this.applyBootstrapLite(cachedLiteOnFailure, { persist: false, refreshProfileRefs: false });
              } else if (cachedProfileOnFailure && Object.keys(cachedProfileOnFailure).length) {
                this.applyProfileToUi(cachedProfileOnFailure);
              }
              return true;
            }
          }

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

        if (initRunId && this._initRunId !== initRunId) {
          return true;
        }

        var currentRoute = getCurrentRouteName();
        if (isSafeToForceDashboard(currentRoute)) {
          if (!options.preferCachedUi) {
            this.openScreen(getScreenIdForDefaultAuthenticatedRoute());
          }

          goDefaultAuthenticatedRoute();
        }

        return true;
      } catch (err) {
        console.warn('Gagal memulihkan sesi:', err && err.message ? err.message : err);
        if (options.keepUiOnFailure === true || options.preferCachedUi === true) {
          var cachedLiteOnCatch = this.getCachedBootstrapLite ? this.getCachedBootstrapLite() : {};
          var cachedProfileOnCatch = this.getCachedProfile ? this.getCachedProfile() : {};
          if ((cachedLiteOnCatch && Object.keys(cachedLiteOnCatch).length) ||
              (cachedProfileOnCatch && Object.keys(cachedProfileOnCatch).length)) {
            if (cachedLiteOnCatch && Object.keys(cachedLiteOnCatch).length) {
              this.applyBootstrapLite(cachedLiteOnCatch, { persist: false, refreshProfileRefs: false });
            } else if (cachedProfileOnCatch && Object.keys(cachedProfileOnCatch).length) {
              this.applyProfileToUi(cachedProfileOnCatch);
            }
            return true;
          }
        }
        return false;
      }
    },

    applyProfileToUi(profile) {
      const data = profile || {};
      const wilayah = parseWilayahDisplay(data);
      this.setText('profile-nama', data.nama_kader || data.nama_user || data.nama || '-');
      this.setText('profile-unsur', data.unsur_tpk || data.unsur || '-');
      this.setText('profile-id', data.id_user || '-');
      this.setText('profile-tim', getDisplayNomorTim(data));
      setTextAliases(['profile-desa', 'wilayah-desa', 'profile-desa-value'], wilayah.desa);
      setTextAliases(['profile-dusun', 'wilayah-dusun', 'profile-dusun-value'], wilayah.dusun);
      setTextAliases(['header-kecamatan', 'profile-kecamatan', 'wilayah-kecamatan'], wilayah.kecamatan);
    },



    needsProfileRecovery(profile) {
      var data = profile || {};
      return !(normalizeDisplayText(data.unsur_tpk || data.unsur) &&
        normalizeDisplayText(data.desa_kelurahan || data.nama_desa || data.desa) &&
        normalizeDisplayText(data.dusun_rw || data.nama_dusun || data.dusun) &&
        normalizeDisplayText(data.wilayah_tugas || data.wilayah));
    },

    mergeTimRefIntoProfile(profile, rows) {
      var base = profile && typeof profile === 'object' ? Object.assign({}, profile) : {};
      var list = Array.isArray(rows) ? rows : [];
      if (!list.length) return base;

      var first = list[0] || {};
      var kec = normalizeDisplayText(first.nama_kecamatan || first.kecamatan || base.nama_kecamatan || base.kecamatan || '');
      var desa = normalizeDisplayText(first.desa_kelurahan || first.nama_desa || first.desa || base.desa_kelurahan || base.nama_desa || base.desa || '');
      var dusunValues = [];
      list.forEach(function (row) {
        var d = normalizeDisplayText(row.dusun_rw || row.nama_dusun || row.dusun || '');
        if (d && dusunValues.indexOf(d) < 0) dusunValues.push(d);
      });
      var dusun = dusunValues.join(' / ') || normalizeDisplayText(base.dusun_rw || base.nama_dusun || base.dusun || '');
      var unsur = normalizeDisplayText(base.unsur_tpk || base.unsur || first.unsur_tpk || first.unsur || '');
      var wilayah = normalizeDisplayText(first.wilayah_tugas || base.wilayah_tugas || base.wilayah || '');
      if (!wilayah) {
        var parts = [];
        if (kec) parts.push(kec);
        if (desa) parts.push(desa);
        if (dusun) parts.push(dusun);
        wilayah = parts.join(', ');
      }

      base.unsur_tpk = normalizeDisplayText(base.unsur_tpk || unsur || '');
      base.unsur = normalizeDisplayText(base.unsur || base.unsur_tpk || unsur || '');
      base.id_tim = normalizeDisplayText(base.id_tim || first.id_tim || '');
      base.id_wilayah = normalizeDisplayText(base.id_wilayah || first.id_wilayah || '');
      base.nama_kecamatan = kec;
      base.kecamatan = kec;
      base.desa_kelurahan = desa;
      base.nama_desa = desa;
      base.desa = desa;
      base.dusun_rw = dusun;
      base.nama_dusun = dusun;
      base.dusun = dusun;
      base.wilayah_tugas = wilayah;
      base.wilayah = wilayah;
      base.scope_wilayah = base.scope_wilayah || {
        id_wilayah: base.id_wilayah || '',
        kecamatan: kec,
        desa_kelurahan: desa,
        dusun_rw: dusun
      };
      base.wilayah_tugas_ringkas = base.wilayah_tugas_ringkas || list;
      return base;
    },

    async refreshProfileFromBackendRefs_(profile) {
      var base = profile && typeof profile === 'object' ? Object.assign({}, profile) : this.getCachedProfile();
      if (!this.needsProfileRecovery(base)) return base;
      if (!window.Api) return base;
      if (this._profileRefreshInFlight === true) return base;

      this._profileRefreshInFlight = true;
      var updated = base;
      try {
        try {
          if (typeof window.Api.getMyProfileLite === 'function') {
            var pResult = await window.Api.getMyProfileLite({ source: 'bootstrap_profile_recovery_3b' });
            if (pResult && pResult.ok && pResult.data) {
              updated = mergeProfileData(updated, pResult.data || {});
            }
          }
        } catch (ignoreProfile) {}

        // 3B: getTimRef tidak dipanggil untuk tampilan profil biasa bila profile_lite sudah lengkap.
        // getTimRef tetap tersedia untuk registrasi/ref/admin/debug.
        if (this.needsProfileRecovery(updated)) {
          try {
            if (typeof window.Api.getTimRef === 'function') {
              var tResult = await window.Api.getTimRef({ id_tim: updated.id_tim || base.id_tim || '', source: 'bootstrap_profile_recovery_fallback_3b' });
              if (tResult && tResult.ok) {
                var rows = Array.isArray(tResult.data) ? tResult.data : (tResult.data && Array.isArray(tResult.data.items) ? tResult.data.items : []);
                updated = this.mergeTimRefIntoProfile(updated, rows);
              }
            }
          } catch (ignoreTim) {}
        }

        if (updated && Object.keys(updated).length) {
          this.persistProfile(updated);
          this.applyProfileToUi(updated);
          if (window.Storage && typeof window.Storage.setLastGoodProfile === 'function') {
            window.Storage.setLastGoodProfile(updated);
          }
          if (window.DashboardView && typeof window.DashboardView.applyDashboardProfile === 'function') {
            window.DashboardView.applyDashboardProfile(updated);
          }
        }
        return updated;
      } finally {
        this._profileRefreshInFlight = false;
      }
    },

    safeUpdateApplication() {
      window.__TPK_APP_UPDATE_IN_PROGRESS = true;
      try {
        if (window.Storage && typeof window.Storage.setLastRoute === 'function' && window.Router && typeof window.Router.getCurrentRoute === 'function') {
          window.Storage.setLastRoute(window.Router.getCurrentRoute() || 'dashboard');
        }
      } catch (err) {}

      var finishReload = function () {
        window.setTimeout(function () {
          try { window.location.reload(); } catch (e) { location.reload(); }
        }, 160);
      };

      try {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'TPK_SKIP_WAITING' });
        }
      } catch (err2) {}

      finishReload();
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
