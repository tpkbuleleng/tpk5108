(function (window, document) {
  'use strict';

  function getRoot(rootArg) {
    return rootArg || document.getElementById('module-root') || document.getElementById('content-root') || document.getElementById('app-content');
  }

  function readProfile() {
    try {
      if (window.AppState && typeof window.AppState.getProfile === 'function') {
        return window.AppState.getProfile() || {};
      }
    } catch (err) {}
    try {
      if (window.Storage && typeof window.Storage.getProfile === 'function') {
        return window.Storage.getProfile() || {};
      }
    } catch (err2) {}
    return {};
  }

  function render(routeName, rootArg) {
    var root = getRoot(rootArg);
    if (!root) return;
    var p = readProfile();
    var rows = [
      ['Nama Kader', p.nama_kader || p.nama_user || p.nama || '-'],
      ['ID User', p.id_user || '-'],
      ['Unsur TPK', p.unsur_tpk || p.unsur || '-'],
      ['Nomor Tim', p.nomor_tim || p.nomor_tim_display || p.id_tim || '-'],
      ['Kecamatan', p.nama_kecamatan || p.kecamatan || '-'],
      ['Desa/Kelurahan', p.desa_kelurahan || p.nama_desa || '-'],
      ['Dusun/RW', p.dusun_rw || p.nama_dusun || '-'],
      ['Nomor WA', p.nomor_wa || '-']
    ];

    root.innerHTML = '<div class="tpk-card"><h3>Profil Saya</h3><table style="width:100%;border-collapse:collapse;">' +
      rows.map(function (row) {
        return '<tr><td style="padding:8px 10px;font-weight:600;width:200px;border-bottom:1px solid #e5e7eb;">' + row[0] + '</td>' +
          '<td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">' + row[1] + '</td></tr>';
      }).join('') +
      '</table></div>';
  }

  window.ProfileView = { render: render, show: render, init: render };
})(window, document);
