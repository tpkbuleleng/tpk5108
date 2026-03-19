// ==========================================
// MESIN DASHBOARD ADMIN (EXECUTIVE CONTROL PANEL)
// ==========================================
import { deleteData } from './db.js';

// 👉 WAJIB SAMAKAN URL INI DENGAN DI SYNC.JS
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';

// 🔥 Penerjemah Nama Kecamatan -> Kode 3 Huruf untuk Server
const getKodeKecamatan = (kec) => {
    if (!kec) return "";
    const map = { 'GEROKGAK': 'GRK', 'SERIRIT': 'SRT', 'BUSUNGBIU': 'BSB', 'BANJAR': 'BJR', 'SUKASADA': 'SKS', 'BULELENG': 'BLL', 'SAWAN': 'SWN', 'KUBUTAMBAHAN': 'KBT', 'TEJAKULA': 'TJK' };
    return map[kec.toUpperCase()] || kec.toUpperCase(); 
};

export const initAdmin = async (session) => {
    // 1. Tampilkan Splash Screen Bawaan agar Konsisten
    const vSplash = document.getElementById('view-splash');
    const vLogin = document.getElementById('view-login');
    const vApp = document.getElementById('view-app');
    
    if(vLogin) vLogin.classList.add('hidden');
    if(vApp) vApp.classList.add('hidden');
    if(vSplash) { 
        vSplash.style.display = 'flex'; 
        vSplash.classList.remove('hidden'); 
        vSplash.classList.add('active'); 
        
        const textLoad = vSplash.querySelector('p') || vSplash.querySelector('div');
        if(textLoad) textLoad.innerHTML = "<b style='font-size:1.1rem; color:var(--primary);'>Memuat Ruang Kontrol Eksekutif...</b><br><small style='color:#666;'>Menyedot data live dari Server Google</small>";
    }

    if (!window.Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        document.head.appendChild(script);
    }

    // 3. Tarik Data Segar dari Server (Menggunakan Kode Kecamatan yang Benar)
    try {
        const kodeKec = getKodeKecamatan(session.kecamatan);
        const url = `${SCRIPT_URL}?action=getAdminData&role=${session.role}&kecamatan=${kodeKec}`;
        const response = await fetch(url);
        const res = await response.json();
        
        if (res.status === 'success') {
            window.adminData = res.data;
            
            // Format string JSON
            window.adminData.registrasi.forEach(r => { try { r.data_json = JSON.parse(r.data_laporan || '{}'); } catch(e) { r.data_json = {}; } });
            window.adminData.pendampingan.forEach(p => { try { p.data_json = JSON.parse(p.data_laporan || '{}'); } catch(e) { p.data_json = {}; } });
            
            // Inisialisasi Filter Global
            window.adminFilterMonth = 'ALL';
            window.adminFilterKec = 'ALL';
            window.adminFilterDesa = 'ALL';
            window.adminFilterJenis = 'ALL';
            window.adminFilterMetric = 'ALL'; // ALL, AKTIF, SELESAI, TERDAMPINGI
            
            setTimeout(() => {
                if(vSplash) vSplash.style.display = 'none'; 
                renderAdminUI(session); 
            }, 800); 
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
    const lvlAdmin = session.role.includes('KAB') ? 'KABUPATEN BULELENG' : `KECAMATAN ${session.kecamatan.toUpperCase()}`;

    document.body.innerHTML = `
        <div id="admin-root" style="display:flex; height:100vh; width:100vw; background:#f4f6f9; font-family: 'Segoe UI', sans-serif;">
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
            
            /* Animasi Kotak Interaktif */
            .metric-card { cursor: pointer; transition: all 0.2s ease; opacity: 0.5; filter: grayscale(50%); border: 2px solid transparent;}
            .metric-card:hover { opacity: 0.8; transform: translateY(-2px); }
            .metric-card.active { opacity: 1; filter: grayscale(0%); transform: translateY(-4px); box-shadow: 0 8px 15px rgba(0,0,0,0.1); border-color: currentColor; }
            
            .filter-select { padding:8px 12px; border:1px solid #ccc; border-radius:6px; font-weight:bold; color:#333; cursor:pointer; background:#fff; font-size:0.85rem; box-shadow:0 1px 2px rgba(0,0,0,0.05); outline:none; }
            .filter-select:focus { border-color: #0d6efd; }
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
            renderView(item.getAttribute('data-target'), session); // 🔥 Pass Session ke renderView
        };
    });

    const dataDup = window.adminData.registrasi.filter(r => r.status_duplikasi && r.status_duplikasi.includes('DUPLIKAT'));
    document.getElementById('badge-dup').innerText = dataDup.length;

    renderView('dash', session); // 🔥 Pass Session ke renderView awal
};

// Fungsi Pemicu Klik Kartu Metrik
window.setAdminMetric = (metric) => {
    window.adminFilterMetric = window.adminFilterMetric === metric ? 'ALL' : metric; 
    
    // Temukan session dari HTML jika perlu, atau andalkan re-render dari elemen aktif
    const activeMenu = document.querySelector('.admin-menu-item.active');
    if(activeMenu) activeMenu.click(); 
};

// ==========================================
// RENDER HALAMAN SPESIFIK ADMIN
// ==========================================
const renderView = (target, session) => {
    const content = document.getElementById('admin-content');
    const data = window.adminData;
    const isKabupaten = session.role.toUpperCase().includes('KAB'); // 🔥 Cek apakah Admin Kabupaten

    if (target === 'dash') {
        // --- 1. PERSIAPAN DATA FILTER DROPDOWN ---
        const monthSet = new Set(); const kecSet = new Set(); const desaSet = new Set();
        
        data.registrasi.forEach(r => { 
            let t = String(r.created_at || '').trim(); if (t.length >= 7) monthSet.add(t.substring(0,7));
            if(r.sumber_kecamatan) kecSet.add(r.sumber_kecamatan);
            if(r.desa && r.desa !== '-') desaSet.add(r.desa);
        });
        
        data.pendampingan.forEach(p => { 
            let t = String(p.data_json?.tgl_kunjungan || p.created_at || '').trim(); if(t.length >= 7) monthSet.add(t.substring(0,7)); 
        });

        // Format Opsi Dropdown
        const optBulan = Array.from(monthSet).sort().reverse().map(m => `<option value="${m}">${m}</option>`).join('');
        const optKec = Array.from(kecSet).sort().map(k => `<option value="${k}">${k}</option>`).join('');
        const optDesa = Array.from(desaSet).sort().map(d => `<option value="${d}">${d}</option>`).join('');

        // 🔥 LOGIKA KUNCI FILTER KECAMATAN
        let filterKecHtml = '';
        if (isKabupaten) {
            filterKecHtml = `<select id="flt-kec" class="filter-select"><option value="ALL">🏛️ Semua Kecamatan</option>${optKec}</select>`;
        } else {
            // Tampilan Lencana Terkunci untuk Admin Kecamatan
            filterKecHtml = `<div style="padding:8px 12px; border:1px solid #ccc; border-radius:6px; background:#e9ecef; font-weight:bold; color:#666; font-size:0.85rem; box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);">🔒 KEC. ${session.kecamatan.toUpperCase()}</div>`;
            window.adminFilterKec = 'ALL'; // Reset filter internal karena datanya sudah otomatis milik dia saja
        }

        // --- 2. TERAPKAN FILTER DROPDOWN KEDUA DATA ---
        const fM = window.adminFilterMonth; const fK = window.adminFilterKec; 
        const fD = window.adminFilterDesa; const fJ = window.adminFilterJenis;

        let regBase = data.registrasi.filter(r => {
            let m = String(r.created_at || '').substring(0,7);
            let matchM = (fM === 'ALL') || (m === fM);
            let matchK = (fK === 'ALL') || (r.sumber_kecamatan === fK || r.kecamatan === fK);
            let matchD = (fD === 'ALL') || (r.desa === fD);
            let matchJ = (fJ === 'ALL') || (r.jenis_sasaran === fJ);
            return matchM && matchK && matchD && matchJ;
        });

        let pendBase = data.pendampingan.filter(p => {
            let t = String(p.data_json?.tgl_kunjungan || p.created_at || '').substring(0,7);
            return fM === 'ALL' || t === fM; 
        });

        // --- 3. KALKULASI KONDISI UMUM SASARAN (BARIS ATAS) ---
        const hI = new Date(); hI.setHours(0,0,0,0);
        let countSelesai = 0, countAktif = 0;
        
        regBase.forEach(r => {
            let isExp = r.status_sasaran === 'SELESAI';
            if (r.jenis_sasaran === 'CATIN' && r.data_json?.tanggal_pernikahan && new Date(r.data_json.tanggal_pernikahan) < hI) isExp = true;
            if (r.jenis_sasaran === 'BUFAS' && r.data_json?.tgl_persalinan) { const tB = new Date(r.data_json.tgl_persalinan); tB.setDate(tB.getDate() + 42); if (hI > tB) isExp = true; }
            
            r._isExpired = isExp; 
            if(isExp) countSelesai++; else countAktif++;
        });

        const idTerdampingi = new Set(pendBase.map(p => p.id_sasaran_ref));
        let countTerdampingi = regBase.filter(r => idTerdampingi.has(r.id)).length;

        // --- 4. TERAPKAN FILTER KOTAK INTERAKTIF (METRIC) KE DATA ---
        let finalReg = regBase;
        const actMetric = window.adminFilterMetric;
        if (actMetric === 'AKTIF') finalReg = regBase.filter(r => !r._isExpired);
        else if (actMetric === 'SELESAI') finalReg = regBase.filter(r => r._isExpired);
        else if (actMetric === 'TERDAMPINGI') finalReg = regBase.filter(r => idTerdampingi.has(r.id));

        // --- 5. KALKULASI DISTRIBUSI BERDASARKAN JENIS (BARIS BAWAH) DARI DATA FINAL ---
        let tCatin = 0, tBumil = 0, tBufas = 0, tBaduta = 0;
        finalReg.forEach(r => {
            if(r.jenis_sasaran === 'CATIN') tCatin++; else if(r.jenis_sasaran === 'BUMIL') tBumil++; 
            else if(r.jenis_sasaran === 'BUFAS') tBufas++; else if(r.jenis_sasaran === 'BADUTA') tBaduta++;
        });

        // 🔥 LAYOUT HTML DASHBOARD
        content.innerHTML = `
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-bottom: 20px; flex-wrap:wrap;">
                <select id="flt-bulan" class="filter-select"><option value="ALL">📅 Semua Bulan</option>${optBulan}</select>
                ${filterKecHtml}
                <select id="flt-desa" class="filter-select"><option value="ALL">🏘️ Semua Desa</option>${optDesa}</select>
                <select id="flt-jenis" class="filter-select"><option value="ALL">🎯 Semua Sasaran</option>
                    <option value="CATIN">CATIN</option><option value="BUMIL">BUMIL</option><option value="BUFAS">BUFAS</option><option value="BADUTA">BADUTA</option>
                </select>
            </div>

            <h4 style="margin:0 0 10px 0; color:#555; font-size:1rem;">Kondisi Umum Sasaran (Klik Kotak untuk Filter Data)</h4>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 25px;">
                <div class="admin-card metric-card ${actMetric==='ALL'?'active':''}" style="color:#0043a8;" onclick="window.setAdminMetric('ALL')">
                    <div style="font-size:0.85rem; font-weight:bold; text-transform:uppercase;">Total Terdaftar</div>
                    <div style="font-size:2.2rem; font-weight:800; margin-top:5px;">${regBase.length}</div>
                </div>
                <div class="admin-card metric-card ${actMetric==='AKTIF'?'active':''}" style="color:#198754;" onclick="window.setAdminMetric('AKTIF')">
                    <div style="font-size:0.85rem; font-weight:bold; text-transform:uppercase;">Sasaran Aktif</div>
                    <div style="font-size:2.2rem; font-weight:800; margin-top:5px;">${countAktif}</div>
                </div>
                <div class="admin-card metric-card ${actMetric==='SELESAI'?'active':''}" style="color:#6c757d;" onclick="window.setAdminMetric('SELESAI')">
                    <div style="font-size:0.85rem; font-weight:bold; text-transform:uppercase;">Selesai / Expired</div>
                    <div style="font-size:2.2rem; font-weight:800; margin-top:5px;">${countSelesai}</div>
                </div>
                <div class="admin-card metric-card ${actMetric==='TERDAMPINGI'?'active':''}" style="color:#fd7e14;" onclick="window.setAdminMetric('TERDAMPINGI')">
                    <div style="font-size:0.85rem; font-weight:bold; text-transform:uppercase;">Terdampingi</div>
                    <div style="font-size:2.2rem; font-weight:800; margin-top:5px;">${countTerdampingi}</div>
                </div>
            </div>

            <h4 style="margin:0 0 10px 0; color:#555; font-size:1rem;">Rincian Berdasarkan Jenis <span style="font-weight:normal; font-size:0.85rem;">(Difilter dari: ${actMetric === 'ALL' ? 'Total Terdaftar' : actMetric})</span></h4>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
                <div class="admin-card" style="border-left: 4px solid #6f42c1; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:0.9rem; color:#666; font-weight:bold;">CATIN</div><div style="font-size:1.8rem; font-weight:800; color:#6f42c1;">${tCatin}</div>
                </div>
                <div class="admin-card" style="border-left: 4px solid #d63384; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:0.9rem; color:#666; font-weight:bold;">BUMIL</div><div style="font-size:1.8rem; font-weight:800; color:#d63384;">${tBumil}</div>
                </div>
                <div class="admin-card" style="border-left: 4px solid #20c997; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:0.9rem; color:#666; font-weight:bold;">BUFAS</div><div style="font-size:1.8rem; font-weight:800; color:#20c997;">${tBufas}</div>
                </div>
                <div class="admin-card" style="border-left: 4px solid #0dcaf0; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:0.9rem; color:#666; font-weight:bold;">BADUTA</div><div style="font-size:1.8rem; font-weight:800; color:#0dcaf0;">${tBaduta}</div>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                <div class="admin-card"><h4 style="margin:0 0 15px 0; color:#333;">Proporsi Demografi</h4><canvas id="chartPie" height="200"></canvas></div>
                <div class="admin-card"><h4 style="margin:0 0 15px 0; color:#333;">Distribusi Area (Kecamatan/Desa)</h4><canvas id="chartBar" height="100"></canvas></div>
            </div>
        `;

        // Atur nilai dropdown ke state tersimpan
        document.getElementById('flt-bulan').value = window.adminFilterMonth;
        if(isKabupaten) document.getElementById('flt-kec').value = window.adminFilterKec;
        document.getElementById('flt-desa').value = window.adminFilterDesa;
        document.getElementById('flt-jenis').value = window.adminFilterJenis;

        // Pasang Event Listener
        document.querySelectorAll('.filter-select').forEach(el => {
            el.addEventListener('change', function() {
                window.adminFilterMonth = document.getElementById('flt-bulan').value;
                if(isKabupaten) window.adminFilterKec = document.getElementById('flt-kec').value;
                window.adminFilterDesa = document.getElementById('flt-desa').value;
                window.adminFilterJenis = document.getElementById('flt-jenis').value;
                
                const activeMenu = document.querySelector('.admin-menu-item.active');
                if(activeMenu) activeMenu.click(); // Re-render otomatis dengan session yg tetap
            });
        });

        // Eksekusi Grafik Pie
        if(window.myChartPie) window.myChartPie.destroy();
        window.myChartPie = new Chart(document.getElementById('chartPie'), {
            type: 'doughnut', data: { labels: ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'], datasets: [{ data: [tCatin, tBumil, tBufas, tBaduta], backgroundColor: ['#6f42c1', '#d63384', '#20c997', '#0dcaf0'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        // Eksekusi Grafik Batang
        const areaStats = {};
        finalReg.forEach(r => { const a = r.desa !== '-' ? r.desa : (r.sumber_kecamatan || 'Lainnya'); areaStats[a] = (areaStats[a] || 0) + 1; });
        
        if(window.myChartBar) window.myChartBar.destroy();
        window.myChartBar = new Chart(document.getElementById('chartBar'), {
            type: 'bar', data: { labels: Object.keys(areaStats), datasets: [{ label: 'Jumlah Sasaran', data: Object.values(areaStats), backgroundColor: '#0d6efd' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });

    } else if (target === 'duplikat') {
        const dDup = data.registrasi.filter(r => r.status_duplikasi && r.status_duplikasi.includes('DUPLIKAT'));
        let htmlTable = '';
        if (dDup.length === 0) {
            htmlTable = `<div style="text-align:center; padding: 40px; color:#198754; font-size:1.2rem; font-weight:bold;">🎉 Luar Biasa! Tidak ada indikasi data ganda di wilayah ini.</div>`;
        } else {
            htmlTable = `<table class="admin-table"><thead><tr><th>ID Sasaran</th><th>Tgl Daftar</th><th>Tim Pelapor</th><th>Nama Sasaran (Kategori)</th><th>Keterangan Peringatan</th><th>Aksi</th></tr></thead><tbody>
                        ${dDup.map(r => `<tr><td><b>${r.id}</b></td><td>${new Date(r.created_at).toLocaleDateString('id-ID')}</td><td>${r.id_tim}</td><td><span style="font-weight:bold; color:#0043a8;">${r.nama_sasaran}</span><br><small style="color:#666;">${r.jenis_sasaran} | NIK: ${r.data_json?.nik||'-'}</small></td><td><div style="background:#fff3cd; color:#856404; padding:6px; border-radius:4px; font-size:0.8rem; font-weight:bold;">${r.status_duplikasi}</div></td><td><button style="background:#0d6efd; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;" onclick="alert('Fitur Resolusi & Penggabungan Data sedang dalam pengembangan.')">Tindaklanjuti</button></td></tr>`).join('')}
                    </tbody></table>`;
        }
        content.innerHTML = `<div class="admin-card"><p style="color:#666; margin-top:0;">Berikut adalah data yang terindikasi didaftarkan lebih dari satu kali oleh tim yang berbeda berdasarkan kecocokan NIK atau Nama/Tgl Lahir.</p>${htmlTable}</div>`;

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
                            ${data.registrasi.map(r => `<tr><td>${r.id}</td><td><b>${r.jenis_sasaran}</b></td><td>${r.nama_sasaran}</td><td>${r.data_json?.nomor_kk||'-'}<br><small>${r.data_json?.nik||'-'}</small></td><td>${r.desa}</td><td>${r.status_sasaran === 'SELESAI' ? '<span style="color:#dc3545; font-weight:bold;">Selesai</span>' : '<span style="color:#198754; font-weight:bold;">Aktif</span>'}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
        document.getElementById('admin-search').addEventListener('keyup', function() {
            const filter = this.value.toLowerCase(); const rows = document.getElementById('table-master').getElementsByTagName('tr');
            for (let i = 1; i < rows.length; i++) { const text = rows[i].innerText.toLowerCase(); rows[i].style.display = text.includes(filter) ? '' : 'none'; }
        });
    }
};
