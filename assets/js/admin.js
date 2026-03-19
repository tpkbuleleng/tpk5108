// ==========================================
// MESIN DASHBOARD ADMIN (EXECUTIVE CONTROL PANEL)
// ==========================================
import { deleteData } from './db.js';

// 👉 WAJIB SAMAKAN URL INI DENGAN DI SYNC.JS
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';

export const initAdmin = async (session) => {
    // 1. Bersihkan seluruh antarmuka Mobile (Layar HP)
    document.body.innerHTML = `
        <div id="admin-root" style="display:flex; height:100vh; width:100vw; background:#f4f6f9; font-family: 'Segoe UI', sans-serif;">
            <div style="margin:auto; text-align:center;">
                <div style="font-size: 3rem; margin-bottom:15px;">🌐</div>
                <h2 style="color:#0043a8; margin:0 0 10px 0;">Mempersiapkan Ruang Kontrol...</h2>
                <p style="color:#666; font-weight:bold;">Menyedot data real-time dari Server Google. Mohon tunggu ⏳</p>
            </div>
        </div>
    `;

    // 2. Suntikkan Library Grafik (Chart.js) secara otomatis
    if (!window.Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        document.head.appendChild(script);
    }

    // 3. Tarik Data Segar dari Server
    try {
        const url = `${SCRIPT_URL}?action=getAdminData&role=${session.role}&kecamatan=${session.kecamatan || ''}`;
        const response = await fetch(url);
        const res = await response.json();
        
        if (res.status === 'success') {
            window.adminData = res.data;
            
            // Ekstrak string JSON agar mudah dibaca oleh tabel
            window.adminData.registrasi.forEach(r => { try { r.data_json = JSON.parse(r.data_laporan || '{}'); } catch(e) { r.data_json = {}; } });
            window.adminData.pendampingan.forEach(p => { try { p.data_json = JSON.parse(p.data_laporan || '{}'); } catch(e) { p.data_json = {}; } });
            
            setTimeout(() => renderAdminUI(session), 600); // Jeda sejenak agar Chart.js selesai dimuat
        } else {
            alert("❌ Gagal memuat data dari server: " + res.message); location.reload();
        }
    } catch(e) {
        alert("❌ Koneksi terputus. Pastikan internet Bapak stabil."); location.reload();
    }
};

// ==========================================
// RENDER ANTARMUKA DESKTOP ADMIN
// ==========================================
const renderAdminUI = (session) => {
    const root = document.getElementById('admin-root');
    const lvlAdmin = session.role.includes('KAB') ? 'KABUPATEN BULELENG' : `KECAMATAN ${session.kecamatan.toUpperCase()}`;

    root.innerHTML = `
        <div style="width:260px; background:#001f3f; color:white; display:flex; flex-direction:column; box-shadow: 2px 0 5px rgba(0,0,0,0.1); z-index:10;">
            <div style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align:center;">
                <h3 style="margin:0; font-size:1.2rem; font-weight:800; color:#4ea8de;">DASHBOARD PIMPINAN</h3>
                <div style="font-size:0.8rem; color:#adb5bd; margin-top:5px; font-weight:bold;">${lvlAdmin}</div>
            </div>
            
            <div style="flex:1; padding: 20px 0; overflow-y:auto;">
                <div class="admin-menu-item active" data-target="dash">📊 Ringkasan Eksekutif</div>
                <div class="admin-menu-item" data-target="duplikat" style="position:relative;">
                    ⚠️ Resolusi Duplikat
                    <span id="badge-dup" style="background:#dc3545; color:white; padding:2px 6px; border-radius:10px; font-size:0.7rem; position:absolute; right:15px; top:12px;">0</span>
                </div>
                <div class="admin-menu-item" data-target="database">🗄️ Master Live Database</div>
            </div>
            
            <div style="padding: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                <div style="font-size:0.8rem; margin-bottom:10px; color:#adb5bd;">Login sebagai: <br><b style="color:white;">${session.nama}</b></div>
                <button id="btn-admin-logout" style="width:100%; background:#dc3545; color:white; border:none; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold;">Keluar Aplikasi</button>
            </div>
        </div>

        <div style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
            <div style="background:white; padding: 15px 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); z-index:5; display:flex; justify-content:space-between; align-items:center;">
                <h2 id="admin-page-title" style="margin:0; font-size:1.4rem; color:#333;">Ringkasan Eksekutif</h2>
                <div style="font-size:0.85rem; color:#666; font-weight:bold;">Status Data: <span style="color:#198754;">🟢 Real-Time Tersinkron</span></div>
            </div>
            
            <div id="admin-content" style="flex:1; padding: 30px; overflow-y:auto; background:#f4f6f9;">
                </div>
        </div>

        <style>
            .admin-menu-item { padding: 12px 20px; color: #adb5bd; font-weight: 600; cursor: pointer; transition: all 0.3s; border-left: 4px solid transparent; }
            .admin-menu-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
            .admin-menu-item.active { background: rgba(255,255,255,0.1); color: #fff; border-left: 4px solid #4ea8de; }
            .admin-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); border: 1px solid #e9ecef; }
            .admin-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
            .admin-table th { background: #0043a8; color: white; padding: 12px; text-align: left; }
            .admin-table td { padding: 12px; border-bottom: 1px solid #eee; color: #444; }
            .admin-table tr:hover td { background: #f8f9fa; }
        </style>
    `;

    document.getElementById('btn-admin-logout').onclick = async () => {
        if(confirm("Keluar dari Dashboard Admin?")) { await deleteData('kader_session', 'active_user'); location.reload(); }
    };

    const menuItems = document.querySelectorAll('.admin-menu-item');
    menuItems.forEach(item => {
        item.onclick = () => {
            menuItems.forEach(m => m.classList.remove('active')); item.classList.add('active');
            document.getElementById('admin-page-title').innerText = item.innerText.replace(/[0-9]/g, '').replace('⚠️', '').trim();
            renderView(item.getAttribute('data-target'));
        };
    });

    // Kalkulasi Badge Peringatan Duplikat
    const dataDup = window.adminData.registrasi.filter(r => r.status_duplikasi && r.status_duplikasi.includes('DUPLIKAT'));
    document.getElementById('badge-dup').innerText = dataDup.length;

    // Load halaman awal
    renderView('dash');
};

// ==========================================
// RENDER HALAMAN SPESIFIK ADMIN
// ==========================================
const renderView = (target) => {
    const content = document.getElementById('admin-content');
    const data = window.adminData;

    if (target === 'dash') {
        // 1. Hitung Statistik Utama
        let tCatin = 0, tBumil = 0, tBufas = 0, tBaduta = 0;
        data.registrasi.forEach(r => {
            if(r.status_sasaran !== 'SELESAI') {
                if(r.jenis_sasaran === 'CATIN') tCatin++; else if(r.jenis_sasaran === 'BUMIL') tBumil++; 
                else if(r.jenis_sasaran === 'BUFAS') tBufas++; else if(r.jenis_sasaran === 'BADUTA') tBaduta++;
            }
        });
        const tSasaran = tCatin + tBumil + tBufas + tBaduta;

        content.innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
                <div class="admin-card" style="border-left: 5px solid #0d6efd;">
                    <div style="font-size:0.85rem; color:#666; font-weight:bold; text-transform:uppercase;">Total Sasaran Aktif</div>
                    <div style="font-size:2rem; font-weight:800; color:#0d6efd; margin-top:5px;">${tSasaran}</div>
                </div>
                <div class="admin-card" style="border-left: 5px solid #d63384;">
                    <div style="font-size:0.85rem; color:#666; font-weight:bold; text-transform:uppercase;">Ibu Hamil Aktif</div>
                    <div style="font-size:2rem; font-weight:800; color:#d63384; margin-top:5px;">${tBumil}</div>
                </div>
                <div class="admin-card" style="border-left: 5px solid #fd7e14;">
                    <div style="font-size:0.85rem; color:#666; font-weight:bold; text-transform:uppercase;">Baduta (0-23 Bln)</div>
                    <div style="font-size:2rem; font-weight:800; color:#fd7e14; margin-top:5px;">${tBaduta}</div>
                </div>
                <div class="admin-card" style="border-left: 5px solid #198754;">
                    <div style="font-size:0.85rem; color:#666; font-weight:bold; text-transform:uppercase;">Total Pendampingan</div>
                    <div style="font-size:2rem; font-weight:800; color:#198754; margin-top:5px;">${data.pendampingan.length}</div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                <div class="admin-card">
                    <h4 style="margin:0 0 15px 0; color:#333;">Demografi Sasaran</h4>
                    <canvas id="chartPie" height="250"></canvas>
                </div>
                <div class="admin-card">
                    <h4 style="margin:0 0 15px 0; color:#333;">Distribusi Berdasarkan Area</h4>
                    <canvas id="chartBar" height="120"></canvas>
                </div>
            </div>
        `;

        // Eksekusi Grafik Donat
        new Chart(document.getElementById('chartPie'), {
            type: 'doughnut',
            data: { labels: ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'], datasets: [{ data: [tCatin, tBumil, tBufas, tBaduta], backgroundColor: ['#6f42c1', '#d63384', '#20c997', '#fd7e14'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        // Eksekusi Grafik Batang (Hitung area dinamis)
        const areaStats = {};
        data.registrasi.forEach(r => { const a = r.sumber_kecamatan || r.desa || 'Unknown'; areaStats[a] = (areaStats[a] || 0) + 1; });
        
        new Chart(document.getElementById('chartBar'), {
            type: 'bar',
            data: { labels: Object.keys(areaStats), datasets: [{ label: 'Jumlah Sasaran', data: Object.values(areaStats), backgroundColor: '#0d6efd' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });

    } else if (target === 'duplikat') {
        const dDup = data.registrasi.filter(r => r.status_duplikasi && r.status_duplikasi.includes('DUPLIKAT'));
        
        let htmlTable = '';
        if (dDup.length === 0) {
            htmlTable = `<div style="text-align:center; padding: 40px; color:#198754; font-size:1.2rem; font-weight:bold;">🎉 Luar Biasa! Tidak ada indikasi data ganda di wilayah ini.</div>`;
        } else {
            htmlTable = `
                <table class="admin-table">
                    <thead><tr><th>ID Sasaran</th><th>Tgl Daftar</th><th>Tim Pelapor</th><th>Nama Sasaran (Kategori)</th><th>Keterangan Peringatan</th><th>Aksi</th></tr></thead>
                    <tbody>
                        ${dDup.map(r => `
                            <tr>
                                <td><b>${r.id}</b></td>
                                <td>${new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                                <td>${r.id_tim}</td>
                                <td><span style="font-weight:bold; color:#0043a8;">${r.nama_sasaran}</span><br><small style="color:#666;">${r.jenis_sasaran} | NIK: ${r.data_json?.nik||'-'}</small></td>
                                <td><div style="background:#fff3cd; color:#856404; padding:6px; border-radius:4px; font-size:0.8rem; font-weight:bold;">${r.status_duplikasi}</div></td>
                                <td><button style="background:#0d6efd; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;" onclick="alert('Fitur Resolusi & Penggabungan Data sedang dalam pengembangan.')">Tindaklanjuti</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        content.innerHTML = `
            <div class="admin-card">
                <p style="color:#666; margin-top:0;">Berikut adalah data yang terindikasi didaftarkan lebih dari satu kali oleh tim yang berbeda berdasarkan kecocokan NIK atau Nama/Tgl Lahir.</p>
                ${htmlTable}
            </div>
        `;

    } else if (target === 'database') {
        content.innerHTML = `
            <div class="admin-card">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                    <h4 style="margin:0; color:#333;">Tabel Registrasi Sasaran Master</h4>
                    <input type="text" id="admin-search" placeholder="Cari Nama atau NIK..." style="padding:6px 12px; border:1px solid #ccc; border-radius:4px; width:250px;">
                </div>
                <div style="overflow-x:auto;">
                    <table class="admin-table" id="table-master">
                        <thead><tr><th>ID</th><th>Kategori</th><th>Nama Sasaran</th><th>No. KK / NIK</th><th>Desa</th><th>Status</th></tr></thead>
                        <tbody>
                            ${data.registrasi.map(r => `
                                <tr>
                                    <td>${r.id}</td><td><b>${r.jenis_sasaran}</b></td>
                                    <td>${r.nama_sasaran}</td><td>${r.data_json?.nomor_kk||'-'}<br><small>${r.data_json?.nik||'-'}</small></td>
                                    <td>${r.desa}</td><td>${r.status_sasaran === 'SELESAI' ? '<span style="color:#dc3545; font-weight:bold;">Selesai</span>' : '<span style="color:#198754; font-weight:bold;">Aktif</span>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Fitur Pencarian Live (Live Search)
        document.getElementById('admin-search').addEventListener('keyup', function() {
            const filter = this.value.toLowerCase(); const rows = document.getElementById('table-master').getElementsByTagName('tr');
            for (let i = 1; i < rows.length; i++) {
                const text = rows[i].innerText.toLowerCase();
                rows[i].style.display = text.includes(filter) ? '' : 'none';
            }
        });
    }
};
