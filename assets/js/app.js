(function () {
  const els = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheElements();
    bindEvents();
    applyInitialValues();
    registerServiceWorker();
    updateNetworkStatus();
    Router.toSplash();

    await delay(1200);

    if (Session.isLoggedIn()) {
      renderDashboard();
      Router.toDashboard();
      Bootstrap.loadInitialRefs();
      SasaranList.init();
    } else {
      Router.toLogin();
    }

    OfflineSync.renderSummary();
    RekapKaderScreen.ensureDefaultMonth?.();
  }

  function cacheElements() {
    els.loginForm = document.getElementById('login-form');
    els.passwordInput = document.getElementById('login-password');
    els.togglePassword = document.getElementById('toggle-password');
    els.backendUrlGroup = document.getElementById('backend-url-group');
    els.backendUrl = document.getElementById('backend-url');
    els.btnToggleBackend = document.getElementById('btn-toggle-backend');
    els.btnLogout = document.getElementById('btn-logout');
    els.btnSyncNow = document.getElementById('btn-sync-now');

    els.btnBackDashboardFromList = document.getElementById('btn-back-dashboard-from-list');
    els.btnBackListFromDetail = document.getElementById('btn-back-list-from-detail');
    els.btnRefreshSasaran = document.getElementById('btn-refresh-sasaran');
    els.keywordFilter = document.getElementById('filter-keyword-sasaran');
    els.jenisFilter = document.getElementById('filter-jenis-sasaran');
    els.statusFilter = document.getElementById('filter-status-sasaran');
    els.btnGoToPendampingan = document.getElementById('btn-go-to-pendampingan');
    els.btnGoToEditSasaran = document.getElementById('btn-go-to-edit-sasaran');

    els.btnBackFromRegistrasi = document.getElementById('btn-back-from-registrasi');
    els.regForm = document.getElementById('registrasi-form');
    els.regJenis = document.getElementById('reg-jenis-sasaran');
    els.regNik = document.getElementById('reg-nik');
    els.regNoKk = document.getElementById('reg-no-kk');
    els.btnSaveRegDraft = document.getElementById('btn-save-reg-draft');
    els.btnResetRegistrasi = document.getElementById('btn-reset-registrasi');

    els.btnBackFromPendampingan = document.getElementById('btn-back-from-pendampingan');
    els.pendampinganForm = document.getElementById('pendampingan-form');
    els.penTanggal = document.getElementById('pen-tanggal');
    els.penStatusKunjungan = document.getElementById('pen-status-kunjungan');
    els.penCatatanUmum = document.getElementById('pen-catatan-umum');
    els.penEditReason = document.getElementById('pen-edit-reason');
    els.btnSavePenDraft = document.getElementById('btn-save-pen-draft');
    els.btnResetPendampingan = document.getElementById('btn-reset-pendampingan');

    els.btnBackFromSync = document.getElementById('btn-back-from-sync');
    els.btnSyncAllScreen = document.getElementById('btn-sync-all-screen');
    els.btnRefreshSyncScreen = document.getElementById('btn-refresh-sync-screen');
    els.syncFilterAction = document.getElementById('sync-filter-action');
    els.syncFilterStatus = document.getElementById('sync-filter-status');
    els.syncFilterKeyword = document.getElementById('sync-filter-keyword');

    els.btnBackFromRekap = document.getElementById('btn-back-from-rekap');
    els.btnLoadRekap = document.getElementById('btn-load-rekap');
  }

  function bindEvents() {
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    els.passwordInput?.addEventListener('input', (e) => {
      e.target.value = Validators.digitsOnly(e.target.value).slice(0, 16);
    });

    els.togglePassword?.addEventListener('click', () => {
      const isPassword = els.passwordInput.type === 'password';
      els.passwordInput.type = isPassword ? 'text' : 'password';
    });

    els.btnToggleBackend?.addEventListener('click', () => {
      els.backendUrlGroup.classList.toggle('hidden');
    });

    els.backendUrl?.addEventListener('change', (e) => {
      const url = String(e.target.value || '').trim();
      StorageHelper.set(APP_CONFIG.STORAGE_KEYS.API_URL, url);
      Notifier.show('URL backend disimpan.');
    });

    els.loginForm?.addEventListener('submit', handleLoginSubmit);
    els.btnLogout?.addEventListener('click', handleLogout);
    els.btnSyncNow?.addEventListener('click', async () => {
      await OfflineSync.syncAll();
      SyncScreen.render?.();
      updateDashboardDraftCount();
    });

    els.btnBackDashboardFromList?.addEventListener('click', () => Router.toDashboard());
    els.btnBackListFromDetail?.addEventListener('click', () => Router.toSasaranList());
    els.btnRefreshSasaran?.addEventListener('click', () => SasaranList.loadAndRender());

    els.keywordFilter?.addEventListener('input', debounce(() => SasaranList.loadAndRender(), 400));
    els.jenisFilter?.addEventListener('change', () => SasaranList.loadAndRender());
    els.statusFilter?.addEventListener('change', () => SasaranList.loadAndRender());

    els.btnGoToPendampingan?.addEventListener('click', async () => {
      await PendampinganForm.openCreate();
    });

    els.btnGoToEditSasaran?.addEventListener('click', () => {
      SasaranDetail.openEditSelected();
    });

    els.btnBackFromRegistrasi?.addEventListener('click', () => {
      const mode = RegistrasiState.getMode();
      if (mode === 'edit') {
        Router.toSasaranDetail();
      } else {
        Router.toDashboard();
      }
    });

    els.regJenis?.addEventListener('change', async (e) => {
      await RegistrasiForm.loadDynamicFields(e.target.value);
      RegistrasiForm.renderValidation();
      RegistrasiForm.autosaveDraft();
    });

    els.regNik?.addEventListener('input', (e) => {
      e.target.value = Validators.digitsOnly(e.target.value).slice(0, 16);
      RegistrasiForm.renderValidation();
      RegistrasiForm.autosaveDraft();
    });

    els.regNoKk?.addEventListener('input', (e) => {
      e.target.value = Validators.digitsOnly(e.target.value).slice(0, 16);
      RegistrasiForm.renderValidation();
      RegistrasiForm.autosaveDraft();
    });

    els.regForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await RegistrasiForm.submit();
      updateDashboardDraftCount();
    });

    els.btnSaveRegDraft?.addEventListener('click', () => {
      const data = RegistrasiForm.collectFormData();
      DraftManager.saveRegistrasiDraft(data);
      Notifier.show('Draft registrasi disimpan lokal.');
    });

    els.btnResetRegistrasi?.addEventListener('click', () => {
      RegistrasiForm.resetForm();
      RegistrasiForm.prefillScope();
      RegistrasiForm.applyModeUI();
      DraftManager.clearRegistrasiDraft();
      RegistrasiForm.renderValidation();
      Notifier.show('Form registrasi direset.');
    });

    document.getElementById('registrasi-form')?.addEventListener('input', debounce(() => {
      RegistrasiForm.renderValidation();
      RegistrasiForm.autosaveDraft();
    }, 400));

    els.btnBackFromPendampingan?.addEventListener('click', () => {
      Router.toSasaranDetail();
    });

    els.pendampinganForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await PendampinganForm.submit();
      updateDashboardDraftCount();
    });

    els.btnSavePenDraft?.addEventListener('click', () => {
      if (PendampinganState.getMode() === 'edit') {
        Notifier.show('Draft edit pendampingan tidak disimpan offline.');
        return;
      }
      const data = PendampinganForm.collectFormData();
      PendampinganDraft.saveLocal(data);
      Notifier.show('Draft pendampingan disimpan lokal.');
    });

    els.btnResetPendampingan?.addEventListener('click', async () => {
      const mode = PendampinganState.getMode();

      PendampinganForm.resetForm();
      PendampinganForm.applyModeUI();
      PendampinganForm.renderHeader(SasaranState.getSelected() || PendampinganState.getEditItem() || {});

      if (mode === 'edit') {
        const editItem = PendampinganState.getEditItem() || {};
        await PendampinganForm.loadDynamicFields(editItem.jenis_sasaran || '');
        PendampinganForm.fillForm(editItem);
        PendampinganForm.fillDynamicFields(editItem.extra_fields || {});
      } else {
        PendampinganForm.prefillIdentity();
        await PendampinganForm.loadDynamicFields((SasaranState.getSelected() || {}).jenis_sasaran || '');
        PendampinganDraft.clearLocal();
      }

      PendampinganForm.renderValidation();
      Notifier.show('Form pendampingan direset.');
    });

    document.getElementById('pendampingan-form')?.addEventListener('input', debounce(() => {
      PendampinganForm.renderValidation();
      if (PendampinganState.getMode() === 'create') {
        PendampinganForm.autosaveDraft();
      }
    }, 400));

    els.btnBackFromSync?.addEventListener('click', () => Router.toDashboard());
    els.btnSyncAllScreen?.addEventListener('click', async () => {
      await OfflineSync.syncAll();
      SyncScreen.render();
      updateDashboardDraftCount();
    });
    els.btnRefreshSyncScreen?.addEventListener('click', () => SyncScreen.render());
    els.syncFilterAction?.addEventListener('change', () => SyncScreen.render());
    els.syncFilterStatus?.addEventListener('change', () => SyncScreen.render());
    els.syncFilterKeyword?.addEventListener('input', debounce(() => SyncScreen.render(), 300));

    els.btnBackFromRekap?.addEventListener('click', () => Router.toDashboard());
    els.btnLoadRekap?.addEventListener('click', async () => {
      await RekapKaderScreen.load();
    });

    document.addEventListener('click', handleDocumentClick);
  }

  function applyInitialValues() {
    UI.setText('app-version', APP_CONFIG.APP_VERSION);
    if (els.backendUrl) {
      els.backendUrl.value = StorageHelper.get(APP_CONFIG.STORAGE_KEYS.API_URL, APP_CONFIG.API_URL || '');
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    Notifier.clearMessageBox('login-message');

    const idKader = document.getElementById('login-id-kader').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!Validators.isRequired(idKader)) {
      return Notifier.setMessageBox('login-message', 'ID Kader wajib diisi.', true);
    }

    if (!Validators.isPassword16(password)) {
      return Notifier.setMessageBox('login-message', 'Password harus 16 digit angka.', true);
    }

    UI.setLoading('btn-login', true, 'Sedang masuk...');

    try {
      const result = await Auth.login(idKader, password);
      if (!result?.ok) {
        throw new Error(result?.message || 'Login gagal.');
      }

      Auth.handleLoginSuccess(result);
      await Bootstrap.loadInitialRefs();

      renderDashboard();

      try {
        const dash = await DashboardService.getDashboardKaderSummary();
        if (dash?.ok) {
          applyDashboardSummary(dash.data || {});
        }
      } catch (_) {}

      await SasaranList.loadAndRender();
      Router.toDashboard();
      Notifier.show('Login berhasil.');
    } catch (err) {
      Notifier.setMessageBox('login-message', err.message, true);
    } finally {
      UI.setLoading('btn-login', false);
    }
  }

  function handleLogout() {
    Auth.logout();
    SasaranState.clearSelected();
    PendampinganState.reset?.();
    Notifier.show('Anda telah keluar dari aplikasi.');
  }

  function renderDashboard() {
    const profile = Session.getProfile() || {};

    UI.setText('topbar-subtitle', profile.role_akses || 'Dashboard');
    UI.setText('profile-nama', profile.nama_kader || profile.nama || '-');
    UI.setText('profile-role', profile.role_akses || '-');
    UI.setText('profile-id', profile.id_kader || '-');
    UI.setText('profile-tim', profile.nama_tim || '-');
    UI.setText('profile-wilayah', profile.nama_wilayah || profile.nama_kecamatan || '-');
    UI.setText('stat-sasaran', String(profile.jumlah_sasaran || 0));
    UI.setText('stat-pendampingan', String(profile.jumlah_pendampingan || 0));

    updateDashboardDraftCount();
    Menu.render(profile.role_akses || 'KADER');
    OfflineSync.renderSummary();
  }

  function applyDashboardSummary(data) {
    UI.setText('stat-sasaran', String(data.jumlah_sasaran || 0));
    UI.setText('stat-pendampingan', String(data.jumlah_pendampingan || 0));
    updateDashboardDraftCount(data.jumlah_draft_pending);
  }

  function updateDashboardDraftCount(explicitValue) {
    const value = explicitValue != null ? explicitValue : OfflineSync.getQueue().length;
    UI.setText('stat-draft', String(value || 0));
  }

  async function handleDocumentClick(event) {
    const menuBtn = event.target.closest('[data-menu-key]');
    if (menuBtn) {
      const key = menuBtn.dataset.menuKey;
      return handleMenuNavigation(key);
    }

    const detailBtn = event.target.closest('[data-open-sasaran-detail]');
    if (detailBtn) {
      const idSasaran = detailBtn.dataset.openSasaranDetail;
      return SasaranDetail.openById(idSasaran);
    }

    const pilihBtn = event.target.closest('[data-pilih-sasaran]');
    if (pilihBtn) {
      const idSasaran = pilihBtn.dataset.pilihSasaran;
      const item = SasaranList.findById(idSasaran);
      if (item) {
        SasaranState.setSelected(item);
        Notifier.show(`Sasaran ${item.nama_sasaran || item.nama || idSasaran} dipilih.`);
      }
      return;
    }

    const editPendampinganBtn = event.target.closest('[data-edit-pendampingan]');
    if (editPendampinganBtn) {
      const idPendampingan = editPendampinganBtn.dataset.editPendampingan;
      await PendampinganForm.openEdit(idPendampingan);
      return;
    }

    const retryBtn = event.target.closest('[data-sync-retry-id]');
    if (retryBtn) {
      await OfflineSync.retryOne(retryBtn.dataset.syncRetryId);
      SyncScreen.render();
      updateDashboardDraftCount();
      return;
    }

    const deleteBtn = event.target.closest('[data-sync-delete-id]');
    if (deleteBtn) {
      OfflineSync.removeById(deleteBtn.dataset.syncDeleteId);
      SyncScreen.render();
      updateDashboardDraftCount();
      Notifier.show('Draft dihapus dari antrean lokal.');
    }
  }

  async function handleMenuNavigation(key) {
    switch (key) {
      case 'registrasi':
        await RegistrasiForm.openCreate();
        break;

      case 'daftar-sasaran':
        Router.toSasaranList();
        await SasaranList.loadAndRender();
        break;

      case 'pendampingan': {
        const selected = SasaranState.getSelected();
        if (!selected) {
          Router.toSasaranList();
          Notifier.show('Pilih sasaran terlebih dahulu sebelum membuat pendampingan.');
          await SasaranList.loadAndRender();
          return;
        }
        await PendampinganForm.openCreate();
        break;
      }

      case 'draft-sync':
        Router.toSyncScreen();
        SyncScreen.render();
        break;

      case 'rekap-saya':
        Router.toRekapKader();
        await RekapKaderScreen.load();
        break;

      default:
        Notifier.show(`Menu ${key} akan diaktifkan pada tahap berikutnya.`);
    }
  }

  function updateNetworkStatus() {
    const online = navigator.onLine;
    const badge = document.getElementById('network-badge');
    if (!badge) return;

    badge.textContent = online ? 'Online' : 'Offline';
    badge.className = online ? 'badge badge-success' : 'badge badge-warning';
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
      await navigator.serviceWorker.register('./service-worker.js');
      console.log('Service worker registered');
    } catch (err) {
      console.warn('Service worker gagal didaftarkan:', err);
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function debounce(fn, wait = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  }
})();
