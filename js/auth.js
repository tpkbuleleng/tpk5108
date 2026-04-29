(function (window, document) {
  'use strict';

  var isLoginSubmitting = false;
  var isLogoutInProgress = false;

  function qs(id) {
    return document.getElementById(id);
  }

  function getConfig() {
    return window.APP_CONFIG || {};
  }

  function getStorageKeys() {
    return getConfig().STORAGE_KEYS || {};
  }

  function getActions() {
    return getConfig().API_ACTIONS || {};
  }

  function getStorage() {
    return window.Storage || null;
  }

  function getAppState() {
    return window.AppState || null;
  }

  function setText(id, value) {
    var el = qs(id);
    if (!el) return;
    el.textContent = (value === undefined || value === null || value === '') ? '-' : String(value);
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

  function firstDisplayValue() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = normalizeDisplayText(arguments[i]);
      if (value) return value;
    }
    return '';
  }

  function normalizeDelimitedList(value) {
    var text = normalizeDisplayText(value);
    if (!text) return '';

    // JSON array dari read model tetap ditampilkan sebagai daftar ringkas jika tidak ada label biasa.
    if ((text.charAt(0) === '[' || text.charAt(0) === '{') && window.JSON) {
      try {
        var parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return parsed.map(function (item) {
            if (item && typeof item === 'object') {
              return normalizeDisplayText(item.dusun_rw || item.nama_dusun || item.desa_kelurahan || item.nama_desa || item.id_wilayah || '');
            }
            return normalizeDisplayText(item);
          }).filter(Boolean).join(' / ');
        }
      } catch (ignoreJson) {}
    }

    return text;
  }

  function normalizeProfileForDashboard(profile) {
    var data = profile && typeof profile === 'object' ? Object.assign({}, profile) : {};

    var wilayahLabel = firstDisplayValue(data.wilayah_tugas, data.wilayah_tugas_label, data.wilayah);
    var desaList = normalizeDelimitedList(data.desa_kelurahan || data.desa_kelurahan_list || data.nama_desa || data.desa);
    var dusunList = normalizeDelimitedList(data.dusun_rw || data.dusun_rw_list || data.nama_dusun || data.dusun);
    var kecamatan = firstDisplayValue(data.nama_kecamatan, data.kecamatan, data.id_kecamatan);
    var unsur = firstDisplayValue(data.unsur, data.unsur_tpk);

    data.unsur_tpk = firstDisplayValue(data.unsur_tpk, unsur);
    data.unsur = firstDisplayValue(data.unsur, data.unsur_tpk);

    data.wilayah_tugas = firstDisplayValue(data.wilayah_tugas, wilayahLabel);
    data.wilayah_tugas_label = firstDisplayValue(data.wilayah_tugas_label, data.wilayah_tugas);
    data.wilayah = firstDisplayValue(data.wilayah, data.wilayah_tugas);

    data.desa_kelurahan = firstDisplayValue(data.desa_kelurahan, desaList);
    data.nama_desa = firstDisplayValue(data.nama_desa, data.desa_kelurahan);
    data.desa = firstDisplayValue(data.desa, data.desa_kelurahan);

    data.dusun_rw = firstDisplayValue(data.dusun_rw, dusunList);
    data.nama_dusun = firstDisplayValue(data.nama_dusun, data.dusun_rw);
    data.dusun = firstDisplayValue(data.dusun, data.dusun_rw);

    data.nama_kecamatan = firstDisplayValue(data.nama_kecamatan, kecamatan);
    data.kecamatan = firstDisplayValue(data.kecamatan, data.nama_kecamatan);

    return data;
  }

  function parseWilayahDisplay(profile) {
    var data = normalizeProfileForDashboard(profile || {});
    var wilayah = normalizeDisplayText(data.wilayah_tugas || data.wilayah_tugas_label || data.wilayah || '');
    var desa = normalizeDisplayText(data.desa_kelurahan || data.nama_desa || data.desa || '');
    var dusun = normalizeDisplayText(data.dusun_rw || data.nama_dusun || data.dusun || '');
    var kecamatan = normalizeDisplayText(data.nama_kecamatan || data.kecamatan || data.id_kecamatan || '');

    if (wilayah && (!desa || !dusun)) {
      var dashParts = wilayah.split(/\s+-\s+/).map(function(part) {
        return String(part || '').trim();
      }).filter(Boolean);

      if (!desa && dashParts[0]) desa = dashParts[0];
      if (!dusun && dashParts.length > 1) dusun = dashParts.slice(1).join(' - ');
    }

    if (wilayah && (!kecamatan || !desa || !dusun)) {
      var commaParts = wilayah.split(/\s*,\s*/).map(function(part) {
        return String(part || '').trim();
      }).filter(Boolean);

      if (!kecamatan && commaParts[0]) kecamatan = commaParts[0];
      if (!desa && commaParts[1]) desa = commaParts[1];
      if (!dusun && commaParts.length > 2) dusun = commaParts.slice(2).join(', ');
    }

    return {
      kecamatan: kecamatan || '-',
      desa: desa || '-',
      dusun: dusun || '-'
    };
  }

  function setTextAliases(ids, value) {
    (ids || []).forEach(function(id) {
      setText(id, value);
    });
  }

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


  function getBootstrapLiteStorageKey() {
    if (window.Storage && typeof window.Storage.getBootstrapLiteKey === 'function') {
      return window.Storage.getBootstrapLiteKey();
    }
    return 'tpk_bootstrap_lite';
  }

  function getStoredBootstrapLite() {
    var storage = getStorage();
    if (storage && typeof storage.getBootstrapLite === 'function') {
      return storage.getBootstrapLite({}) || {};
    }
    if (storage && typeof storage.get === 'function') {
      return storage.get(getBootstrapLiteStorageKey(), {}) || {};
    }
    return {};
  }

  function getStoredProfile() {
    var appState = getAppState();
    if (appState && typeof appState.getProfile === 'function') {
      var profileFromState = appState.getProfile();
      if (profileFromState && typeof profileFromState === 'object' && Object.keys(profileFromState).length) {
        return profileFromState;
      }
    }

    var storage = getStorage();
    var keys = getStorageKeys();
    var bootstrapLite = getStoredBootstrapLite();
    var bootstrapProfile = bootstrapLite && bootstrapLite.profile ? bootstrapLite.profile : {};
    var profileFromStorage = {};

    if (storage && typeof storage.get === 'function' && keys.PROFILE) {
      profileFromStorage = storage.get(keys.PROFILE, {}) || {};
    }

    return mergeProfileData(profileFromStorage, bootstrapProfile);
  }

  function mergeProfileData(existingProfile, incomingProfile) {
    var existing = normalizeProfileForDashboard(existingProfile && typeof existingProfile === 'object' ? existingProfile : {});
    var incoming = normalizeProfileForDashboard(incomingProfile && typeof incomingProfile === 'object' ? incomingProfile : {});
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

    return normalizeProfileForDashboard(merged);
  }

  function isUsefulProfile(profile) {
    var data = profile && typeof profile === 'object' ? profile : {};
    return !!(
      normalizeDisplayText(data.id_user || data.username || '') ||
      normalizeDisplayText(data.nama_kader || data.nama_user || data.nama || '') ||
      normalizeDisplayText(data.id_tim || data.nomor_tim || data.nama_tim || '')
    );
  }

  function isProfileCompleteForDashboard(profile) {
    var data = normalizeProfileForDashboard(profile || {});
    var nama = normalizeDisplayText(data.nama_kader || data.nama_user || data.nama || '');
    var unsur = normalizeDisplayText(data.unsur_tpk || data.unsur || '');
    var tim = normalizeDisplayText(data.nomor_tim || data.nama_tim || data.id_tim || '');
    var wilayah = normalizeDisplayText(
      data.wilayah_tugas_label ||
      data.wilayah_tugas ||
      data.wilayah ||
      data.desa_kelurahan ||
      data.desa_kelurahan_list ||
      data.nama_desa ||
      data.desa ||
      data.dusun_rw ||
      data.dusun_rw_list ||
      data.nama_dusun ||
      data.dusun ||
      ''
    );

    return !!(nama && unsur && tim && wilayah);
  }

  function setLoginHydrationFlag(isActive, stage) {
    window.__TPK_LOGIN_HYDRATION_IN_PROGRESS = !!isActive;
    window.__TPK_LOGIN_HYDRATION_STAGE = stage || '';
    window.__TPK_LOGIN_HYDRATION_AT = Date.now();
  }

  function waitNextPaint() {
    return new Promise(function (resolve) {
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(function () { resolve(); });
        return;
      }
      window.setTimeout(resolve, 0);
    });
  }

  function loadEnhancedShell(reason) {
    if (window.TPKAppLoader && typeof window.TPKAppLoader.loadEnhancedShell === 'function') {
      return window.TPKAppLoader.loadEnhancedShell(reason || 'auth_hydration');
    }
    return Promise.resolve(false);
  }

  function showDashboardShellFast() {
    if (window.TPKAppLoader && typeof window.TPKAppLoader.showDashboardShellQuick === 'function') {
      window.TPKAppLoader.showDashboardShellQuick();
      return;
    }
    openDashboard();
  }

  async function ensureDashboardRouteReady(profile) {
    try {
      await loadEnhancedShell('post_login_dashboard_route_3c_r4');
    } catch (err) {}

    if (window.Router && typeof window.Router.go === 'function') {
      window.Router.go('dashboard', {
        skipHeavyRefresh: true,
        skipBootstrapRefresh: true,
        source: 'auth_post_login_3c_r4'
      });
    }

    if (profile && Object.keys(profile).length) {
      if (window.AppBootstrap && typeof window.AppBootstrap.applyProfileToUi === 'function') {
        window.AppBootstrap.applyProfileToUi(profile);
      }
      if (window.DashboardView && typeof window.DashboardView.applyDashboardProfile === 'function') {
        window.DashboardView.applyDashboardProfile(profile);
      }
    }
  }

  function showMessage(message, type) {
    var box = qs('loginMessage');
    if (!box) return;

    box.textContent = message || '';
    box.classList.remove('hidden', 'error', 'success');
    box.classList.add(type === 'success' ? 'success' : 'error');
  }

  function clearMessage() {
    var box = qs('loginMessage');
    if (!box) return;

    box.textContent = '';
    box.classList.add('hidden');
    box.classList.remove('error', 'success');
  }

  function showToast(message, type) {
    if (window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(message, type || 'info');
      return;
    }
    try {
      console.log('[TOAST]', type || 'info', message);
    } catch (err) {}
  }

  function setLoading(isLoading) {
    var btn = qs('loginSubmitBtn');
    if (!btn) return;

    btn.disabled = !!isLoading;
    btn.textContent = isLoading ? 'Memproses...' : 'Masuk';
  }

  function setLogoutLoading(isLoading) {
    var btn = qs('btn-logout');
    if (!btn) return;

    btn.disabled = !!isLoading;
    btn.textContent = isLoading ? 'Keluar...' : 'Keluar';
  }

  function normalizeIdUser(value) {
    return String(value || '').trim().toUpperCase();
  }

  function normalizePassword(value) {
    return String(value || '').trim();
  }

  function validateLoginForm(idUser, password) {
    if (!idUser) return 'ID Kader wajib diisi.';
    if (!password) return 'Password wajib diisi.';
    return '';
  }

  function setupLogo() {
    var logo = qs('loginLogo');
    if (!logo) return;

    var config = getConfig();
    var logoUrl = config.ASSETS && config.ASSETS.LOGO_URL
      ? config.ASSETS.LOGO_URL
      : './assets/img/logo.png';

    logo.src = logoUrl;
  }

  function setupPasswordToggle() {
    var passwordInput = qs('loginPassword');
    var toggleBtn = qs('togglePasswordBtn');

    if (!passwordInput || !toggleBtn || toggleBtn.dataset.bound === '1') return;

    toggleBtn.dataset.bound = '1';

    toggleBtn.addEventListener('click', function () {
      var isPassword = passwordInput.getAttribute('type') === 'password';

      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      toggleBtn.setAttribute(
        'aria-label',
        isPassword ? 'Sembunyikan password' : 'Lihat password'
      );
      toggleBtn.setAttribute(
        'title',
        isPassword ? 'Sembunyikan password' : 'Lihat password'
      );
    });
  }

  function saveProfile(profile) {
    var storage = getStorage();
    var appState = getAppState();
    var keys = getStorageKeys();
    var data = normalizeProfileForDashboard(profile || {});

    if (storage && typeof storage.setProfile === 'function') {
      storage.setProfile(data);
    } else if (storage && typeof storage.set === 'function' && keys.PROFILE) {
      storage.set(keys.PROFILE, data);
    }

    if (storage && typeof storage.setLastGoodProfile === 'function' && isProfileCompleteForDashboard(data)) {
      storage.setLastGoodProfile(data);
    }

    if (appState && typeof appState.setProfile === 'function') {
      appState.setProfile(data);
    }
  }

  function saveBootstrapLite(bootstrapLite) {
    var storage = getStorage();
    var data = bootstrapLite && typeof bootstrapLite === 'object' ? bootstrapLite : {};

    if (!storage) return;

    if (typeof storage.setBootstrapLite === 'function') {
      storage.setBootstrapLite(data);
      return;
    }

    if (typeof storage.set === 'function') {
      storage.set(getBootstrapLiteStorageKey(), data);
    }
  }

  function resetProfileUi() {
    setText('profile-nama', '-');
    setText('profile-unsur', '-');
    setText('profile-id', '-');
    setText('profile-tim', '-');
    setTextAliases(['profile-desa', 'wilayah-desa', 'profile-desa-value'], '-');
    setTextAliases(['profile-dusun', 'wilayah-dusun', 'profile-dusun-value'], '-');
    setTextAliases(['header-kecamatan', 'profile-kecamatan', 'wilayah-kecamatan'], '-');
  }

  function clearLocalSession() {
    var storage = getStorage();
    var keys = getStorageKeys();
    var appState = getAppState();

    if (window.Api && typeof window.Api.clearSessionToken === 'function') {
      window.Api.clearSessionToken();
    }

    if (storage && typeof storage.clearSession === 'function') {
      storage.clearSession();
    } else if (storage && typeof storage.remove === 'function') {
      if (keys.SESSION_TOKEN) storage.remove(keys.SESSION_TOKEN);
      if (keys.PROFILE) storage.remove(keys.PROFILE);
      storage.remove(getBootstrapLiteStorageKey());
    }

    if (appState && typeof appState.setProfile === 'function') {
      appState.setProfile({});
    }
  }

  function extractBootstrapLite(loginResult) {
    var data = (loginResult && loginResult.data) || {};
    return data.bootstrap_lite && typeof data.bootstrap_lite === 'object' ? data.bootstrap_lite : {};
  }

  function extractImmediateProfile(loginResult) {
    var data = (loginResult && loginResult.data) || {};
    var bootstrapLite = extractBootstrapLite(loginResult);

    if (bootstrapLite.profile && typeof bootstrapLite.profile === 'object') return bootstrapLite.profile;
    if (data.profile && typeof data.profile === 'object') return data.profile;
    if (data.session && typeof data.session === 'object') return data.session;

    return {};
  }

  async function resolveProfileAfterLogin(loginResult) {
    var data = (loginResult && loginResult.data) || {};
    var bootstrapLite = extractBootstrapLite(loginResult);

    // 3C-R3: session minimal dari login tidak dianggap profil lengkap.
    // Ambil getMyProfileLite satu kali secara deterministik kecuali login sudah
    // membawa bootstrap_lite.profile/profile yang lengkap.
    var candidate = {};
    if (bootstrapLite && bootstrapLite.profile && typeof bootstrapLite.profile === 'object') {
      candidate = mergeProfileData(candidate, bootstrapLite.profile);
    }
    if (data.profile && typeof data.profile === 'object') {
      candidate = mergeProfileData(candidate, data.profile);
    }
    if (data.session && typeof data.session === 'object') {
      candidate = mergeProfileData(candidate, data.session);
    }

    if (isProfileCompleteForDashboard(candidate)) {
      return candidate;
    }

    if (window.Api && typeof window.Api.getMyProfileLite === 'function') {
      try {
        var profileLiteResult = await window.Api.getMyProfileLite({ source: 'after_login_3c_r4' });
        if (profileLiteResult && profileLiteResult.ok && profileLiteResult.data && Object.keys(profileLiteResult.data).length) {
          return mergeProfileData(candidate, profileLiteResult.data);
        }
      } catch (ignoreProfileLite) {}
    }

    if (isUsefulProfile(candidate)) {
      return normalizeProfileForDashboard(candidate);
    }

    // 3C-R4: refreshBootstrapLite bukan sumber final profil + wilayah.
    // Ia hanya boleh memperbarui bootstrap/session ringan, bukan menimpa
    // hasil final getMyProfileLite. Fallback ini tidak apply profil ke UI.
    if (!window.__TPK_APP_UPDATE_IN_PROGRESS && window.Api && typeof window.Api.refreshBootstrapLite === 'function') {
      try {
        var refreshResult = await window.Api.refreshBootstrapLite({ source: 'after_login_session_only_3c_r4' });
        if (refreshResult && refreshResult.ok) {
          var refreshData = refreshResult.data || {};
          var refreshedBootstrapLite = refreshData.bootstrap_lite || {};
          if (refreshedBootstrapLite && Object.keys(refreshedBootstrapLite).length) {
            saveBootstrapLite(refreshedBootstrapLite);
            if (window.AppBootstrap && typeof window.AppBootstrap.applyBootstrapToUi === 'function') {
              window.AppBootstrap.applyBootstrapToUi({
                app_name: refreshedBootstrapLite.app_name,
                app_version: refreshedBootstrapLite.app_version
              });
            }
          }
        }
      } catch (ignoreRefresh) {}
    }

    return normalizeProfileForDashboard(candidate || {});
  }

  function applyProfileToUi(profile) {
    var data = normalizeProfileForDashboard(profile || {});
    var wilayah = parseWilayahDisplay(data);

    setText('profile-nama', data.nama_kader || data.nama_user || data.nama || '-');
    setText('profile-unsur', data.unsur_tpk || data.unsur || '-');
    setText('profile-id', data.id_user || data.username || '-');
    setText('profile-tim', getDisplayNomorTim(data));
    setTextAliases(['profile-desa', 'wilayah-desa', 'profile-desa-value'], wilayah.desa);
    setTextAliases(['profile-dusun', 'wilayah-dusun', 'profile-dusun-value'], wilayah.dusun);
    setTextAliases(['header-kecamatan', 'profile-kecamatan', 'wilayah-kecamatan'], wilayah.kecamatan);

    if (window.AppBootstrap && typeof window.AppBootstrap.applyProfileToUi === 'function') {
      window.AppBootstrap.applyProfileToUi(data);
    }
  }

  function openDashboard() {
    if (window.Router && typeof window.Router.go === 'function') {
      window.Router.go('dashboard');
      return;
    }

    if (window.AppBootstrap && typeof window.AppBootstrap.openScreen === 'function') {
      window.AppBootstrap.openScreen('dashboard-screen');
      return;
    }

    var screens = document.querySelectorAll('.screen');
    screens.forEach(function (screen) {
      screen.classList.remove('active');
      screen.classList.add('hidden');
    });

    var dashboard = qs('dashboard-screen');
    if (dashboard) {
      dashboard.classList.remove('hidden');
      dashboard.classList.add('active');
    }
  }

  function openLoginScreen() {
    if (window.Router && typeof window.Router.go === 'function') {
      window.Router.go('login');
      return;
    }

    if (window.AppBootstrap && typeof window.AppBootstrap.openScreen === 'function') {
      window.AppBootstrap.openScreen('login-screen');
      return;
    }

    var screens = document.querySelectorAll('.screen');
    screens.forEach(function (screen) {
      screen.classList.remove('active');
      screen.classList.add('hidden');
    });

    var login = qs('login-screen');
    if (login) {
      login.classList.remove('hidden');
      login.classList.add('active');
    }
  }

  async function submitLogin(idUser, password) {
    if (!window.Api || typeof window.Api.login !== 'function') {
      throw new Error('Api.login belum tersedia.');
    }

    return window.Api.login({
      id_user: idUser,
      password: password
    });
  }

  async function hydrateDashboardAfterLogin(loginResult, options) {
    var opts = options || {};
    var finalProfile = getStoredProfile();

    try {
      setLoginHydrationFlag(true, 'profile_lite');
      var resolvedProfile = await resolveProfileAfterLogin(loginResult);

      if (resolvedProfile && Object.keys(resolvedProfile).length) {
        finalProfile = mergeProfileData(getStoredProfile(), resolvedProfile);
        saveProfile(finalProfile);
        applyProfileToUi(finalProfile);
      }

      setLoginHydrationFlag(true, 'dashboard_route');
      await ensureDashboardRouteReady(finalProfile);

      if (window.DashboardView && typeof window.DashboardView.applyDashboardProfile === 'function') {
        window.DashboardView.applyDashboardProfile(finalProfile || {});
      } else if (window.DashboardView && typeof window.DashboardView.refresh === 'function') {
        window.DashboardView.refresh({ skipProfileRefresh: true, source: 'auth_post_login_3c_r4' });
      }

      return finalProfile;
    } catch (err) {
      console.warn('Gagal memuat profil lanjutan setelah login:', err && err.message ? err.message : err);
      return finalProfile;
    } finally {
      if (opts.releaseGuard !== false) {
        setLoginHydrationFlag(false, 'done');
      }
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    if (isLoginSubmitting) return;

    clearMessage();

    var idUser = normalizeIdUser(qs('loginIdUser') && qs('loginIdUser').value);
    var password = normalizePassword(qs('loginPassword') && qs('loginPassword').value);

    var validationMessage = validateLoginForm(idUser, password);
    if (validationMessage) {
      showMessage(validationMessage, 'error');
      return;
    }

    var loginSucceeded = false;

    try {
      isLoginSubmitting = true;
      setLoading(true);
      setLoginHydrationFlag(true, 'login_submit');

      var result = await submitLogin(idUser, password);

      if (!result || result.ok === false) {
  console.log('LOGIN_RESULT', result);
  console.log('LOGIN_STAGE', result && result.data ? result.data.stage : '');
  console.log('LOGIN_ERROR_DETAIL', result && result.data ? result.data.error : '');

  showMessage(
    (result && result.message
      ? result.message + (result.code ? ' [' + result.code + ']' : '')
      : 'Login gagal. Periksa kembali ID dan password.'),
    'error'
  );
  setLoginHydrationFlag(false, 'login_failed');
  return;
}

      loginSucceeded = true;
      var wajibGantiPassword = !!(result.data && result.data.wajib_ganti_password);
      var bootstrapLite = extractBootstrapLite(result);
      var immediateProfile = extractImmediateProfile(result);
      var mergedImmediateProfile = mergeProfileData(getStoredProfile(), immediateProfile);

      // 3C-R3: mulai muat router/bootstrap/ui di latar, tetapi auth.js tetap
      // menjadi pemilik alur post-login agar refreshBootstrapLite tidak dobel.
      loadEnhancedShell('post_login_prepare_3c_r4').catch(function () {});

      if (bootstrapLite && Object.keys(bootstrapLite).length) {
        saveBootstrapLite(bootstrapLite);
        // 3C-R4: jangan apply bootstrapLite sebagai profil final setelah login.
        // Data final profil + wilayah harus dari getMyProfileLite/user_profile_lite.
        if (window.AppBootstrap && typeof window.AppBootstrap.applyBootstrapToUi === 'function') {
          window.AppBootstrap.applyBootstrapToUi({
            app_name: bootstrapLite.app_name,
            app_version: bootstrapLite.app_version
          });
        }
      }

      if (mergedImmediateProfile && Object.keys(mergedImmediateProfile).length) {
        saveProfile(mergedImmediateProfile);
        applyProfileToUi(mergedImmediateProfile);
      }

      showDashboardShellFast();
      await waitNextPaint();

      var hydratedProfile = await hydrateDashboardAfterLogin(result, { releaseGuard: true });

      if (window.DashboardView && typeof window.DashboardView.applyDashboardProfile === 'function') {
        window.DashboardView.applyDashboardProfile(hydratedProfile || mergedImmediateProfile || {});
      }

      if (wajibGantiPassword) {
        showToast('Login berhasil. Akun ini masih perlu ganti password.', 'warning');
      }
    } catch (error) {
      setLoginHydrationFlag(false, 'login_exception');
      console.error('LOGIN_ERROR', error);

      showMessage(
        'Koneksi ke backend gagal atau respons tidak valid.',
        'error'
      );

      if (window.Api && typeof window.Api.reportClientError === 'function') {
        window.Api.reportClientError('LOGIN_ERROR', {
          source: 'auth.js',
          detail: error && error.message ? error.message : String(error)
        });
      }
    } finally {
      if (!loginSucceeded) {
        setLoginHydrationFlag(false, 'login_end_without_success');
      }
      setLoading(false);
      isLoginSubmitting = false;
    }
  }

  async function logout() {
    if (isLogoutInProgress) return;

    isLogoutInProgress = true;
    window.__TPK_LOGOUT_IN_PROGRESS = true;
    setLogoutLoading(true);

    var logoutPromise = Promise.resolve();

    try {
      if (window.Api && typeof window.Api.logout === 'function') {
        logoutPromise = window.Api.logout({}, { keepDeviceId: true });
      }
    } catch (err) {
      console.warn('Logout backend gagal dipicu:', err && err.message ? err.message : err);
    }

    try {
      clearLocalSession();
      resetProfileUi();
      clearMessage();

      var passwordInput = qs('loginPassword');
      if (passwordInput) passwordInput.value = '';

      openLoginScreen();
    } finally {
      Promise.resolve(logoutPromise)
        .catch(function (err) {
          console.warn('Logout backend gagal:', err && err.message ? err.message : err);
        })
        .finally(function () {
          setLogoutLoading(false);
          isLogoutInProgress = false;
          window.__TPK_LOGOUT_IN_PROGRESS = false;
        });
    }
  }

  function bindLogoutButtons() {
    ['btn-logout'].forEach(function (id) {
      var btn = qs(id);
      if (!btn || btn.dataset.bound === '1') return;

      btn.dataset.bound = '1';
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        logout();
      });
    });
  }

  function initLoginPage() {
    var form = qs('loginForm');
    setupLogo();
    setupPasswordToggle();
    bindLogoutButtons();

    if (!form || form.dataset.bound === '1') return;

    form.dataset.bound = '1';
    form.addEventListener('submit', handleLoginSubmit);
  }

  var Auth = {
    init: initLoginPage,
    login: submitLogin,
    logout: logout,
    clearLocalSession: clearLocalSession,
    hydrateDashboardAfterLogin: hydrateDashboardAfterLogin,
    normalizeProfileForDashboard: normalizeProfileForDashboard,
    isProfileCompleteForDashboard: isProfileCompleteForDashboard,
    isLoginHydrationInProgress: function () { return window.__TPK_LOGIN_HYDRATION_IN_PROGRESS === true; },
    isLogoutInProgress: function () { return isLogoutInProgress || window.__TPK_LOGOUT_IN_PROGRESS === true; }
  };

  window.Auth = Auth;

  document.addEventListener('DOMContentLoaded', initLoginPage);
})(window, document);
