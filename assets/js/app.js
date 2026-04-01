(function () {
      }

      Auth.handleLoginSuccess(result);
      await Bootstrap.loadInitialRefs();
      renderDashboard();
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

    Menu.render(profile.role_akses || 'KADER');
    OfflineSync.renderSummary();
  }

  function handleMenuClick(event) {
    const btn = event.target.closest('[data-menu-key]');
    if (!btn) return;

    const key = btn.dataset.menuKey;
    Notifier.show(`Menu ${key} belum dihubungkan ke modul tahap berikutnya.`);
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
})();
