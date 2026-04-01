(function () {
    UI.setText('stat-pendampingan', String(profile.jumlah_pendampingan || 0));

    Menu.render(profile.role_akses || 'KADER');
    OfflineSync.renderSummary();
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
    }
  }

  async function handleMenuNavigation(key) {
    switch (key) {
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
        Notifier.show('Modul pendampingan akan disambungkan pada tahap berikutnya.');
        break;
      }
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
