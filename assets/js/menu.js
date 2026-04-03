window.Menu = {
  getMenusByRole(role) {
    const normalizedRole = String(role || '').toUpperCase();

    if (normalizedRole.includes('ADMIN_KABUPATEN')) {
      return [
        { key: 'dashboard-kab', title: 'Dashboard Kabupaten', desc: 'Pantau progres kabupaten' },
        { key: 'monitoring-sasaran', title: 'Monitoring Sasaran', desc: 'Lihat sasaran lintas kecamatan' },
        { key: 'rekap-kab', title: 'Rekap Kabupaten', desc: 'Rekap kabupaten dan kecamatan' },
        { key: 'sinkronisasi', title: 'Sinkronisasi', desc: 'Sinkronkan data offline' },
        { key: 'profil', title: 'Profil', desc: 'Lihat akun dan pengaturan' },
        { key: 'bantuan', title: 'Bantuan', desc: 'Panduan penggunaan aplikasi' }
      ];
    }

    if (normalizedRole.includes('ADMIN_KECAMATAN')) {
      return [
        { key: 'dashboard-kec', title: 'Dashboard Kecamatan', desc: 'Pantau progres kecamatan' },
        { key: 'monitoring-kec', title: 'Monitoring Data', desc: 'Lihat sasaran dan pendampingan' },
        { key: 'rekap-kec', title: 'Rekap Kecamatan', desc: 'Rekap per desa/tim/kader' },
        { key: 'sinkronisasi', title: 'Sinkronisasi', desc: 'Sinkronkan data offline' },
        { key: 'profil', title: 'Profil', desc: 'Lihat akun dan pengaturan' },
        { key: 'bantuan', title: 'Bantuan', desc: 'Panduan penggunaan aplikasi' }
      ];
    }

    return [
      { key: 'registrasi', title: 'Registrasi Sasaran', desc: 'Tambah sasaran baru' },
      { key: 'daftar-sasaran', title: 'Daftar Sasaran', desc: 'Lihat data sasaran tim' },
      { key: 'pendampingan', title: 'Lapor Pendampingan', desc: 'Input laporan pendampingan' },
      { key: 'draft-sync', title: 'Draft & Sinkronisasi', desc: 'Kelola draft offline' },
      { key: 'rekap-saya', title: 'Rekap Saya', desc: 'Lihat statistik kader' },
      { key: 'profil', title: 'Profil', desc: 'Lihat akun dan ganti password' },
      { key: 'sinkronisasi', title: 'Sinkronisasi', desc: 'Sinkronkan data offline' },
      { key: 'bantuan', title: 'Bantuan', desc: 'Panduan penggunaan aplikasi' }
    ];
  },

  render(role) {
    const menus = this.getMenusByRole(role);

    const html = menus.map(menu => `
      <button class="menu-card" data-menu-key="${menu.key}">
        <h4>${menu.title}</h4>
        <p class="muted-text">${menu.desc}</p>
      </button>
    `).join('');

    if (window.UI && typeof window.UI.setHTML === 'function') {
      window.UI.setHTML('menu-grid', html);
      this.attachEvents();
      return;
    }

    const target = document.getElementById('menu-grid');
    if (target) {
      target.innerHTML = html;
      this.attachEvents();
    }
  },

  attachEvents() {
    const buttons = document.querySelectorAll('[data-menu-key]');

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.getAttribute('data-menu-key');
        this.handleMenuClick(key);
      });
    });
  },

  handleMenuClick(key) {
    switch (key) {
      case 'sinkronisasi':
        alert('Sinkronisasi data akan dijalankan.');
        break;

      case 'bantuan':
        alert('Panduan penggunaan aplikasi akan disambungkan pada tahap berikutnya.');
        break;

      case 'profil':
        alert('Halaman profil akan disambungkan pada tahap berikutnya.');
        break;

      case 'rekap-saya':
        alert('Menu Rekap Saya akan disambungkan pada tahap berikutnya.');
        break;

      case 'registrasi':
        alert('Menu Registrasi Sasaran akan disambungkan pada tahap berikutnya.');
        break;

      case 'daftar-sasaran':
        alert('Menu Daftar Sasaran akan disambungkan pada tahap berikutnya.');
        break;

      case 'pendampingan':
        alert('Menu Lapor Pendampingan akan disambungkan pada tahap berikutnya.');
        break;

      case 'draft-sync':
        alert('Menu Draft & Sinkronisasi akan disambungkan pada tahap berikutnya.');
        break;

      case 'dashboard-kab':
      case 'monitoring-sasaran':
      case 'rekap-kab':
      case 'dashboard-kec':
      case 'monitoring-kec':
      case 'rekap-kec':
        alert('Menu ini akan disambungkan pada tahap berikutnya.');
        break;

      default:
        alert('Menu belum tersedia.');
        break;
    }
  }
};
