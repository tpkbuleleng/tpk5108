window.Menu = {
  getMenusByRole(role) {
    const normalizedRole = String(role || '').toUpperCase();

    if (normalizedRole.includes('ADMIN_KABUPATEN')) {
      return [
        { key: 'dashboard-kab', title: 'Dashboard Kabupaten', desc: 'Pantau progres kabupaten' },
        { key: 'monitoring-sasaran', title: 'Monitoring Sasaran', desc: 'Lihat sasaran lintas kecamatan' },
        { key: 'rekap-kab', title: 'Rekap Kabupaten', desc: 'Rekap kabupaten dan kecamatan' }
      ];
    }

    if (normalizedRole.includes('ADMIN_KECAMATAN')) {
      return [
        { key: 'dashboard-kec', title: 'Dashboard Kecamatan', desc: 'Pantau progres kecamatan' },
        { key: 'monitoring-kec', title: 'Monitoring Data', desc: 'Lihat sasaran dan pendampingan' },
        { key: 'rekap-kec', title: 'Rekap Kecamatan', desc: 'Rekap per desa/tim/kader' }
      ];
    }

    return [
      { key: 'registrasi', title: 'Registrasi Sasaran', desc: 'Tambah sasaran baru' },
      { key: 'daftar-sasaran', title: 'Daftar Sasaran', desc: 'Lihat data sasaran tim' },
      { key: 'pendampingan', title: 'Lapor Pendampingan', desc: 'Input laporan pendampingan' },
      { key: 'draft-sync', title: 'Draft & Sinkronisasi', desc: 'Kelola draft offline' },
      { key: 'rekap-saya', title: 'Rekap Saya', desc: 'Lihat statistik kader' },
      { key: 'profil', title: 'Profil', desc: 'Lihat akun dan ganti password' }
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

    UI.setHTML('menu-grid', html);
  }
};
