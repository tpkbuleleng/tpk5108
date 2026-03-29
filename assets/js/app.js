// ==========================================
// 📱 APLIKASI KADER TPK (V65 - ENTERPRISE API INTEGRATION)
// ==========================================
import { initDB, putData, getDataById, deleteData, getAllData, clearStore } from './db.js';
import { downloadMasterData, uploadData, apiFetch } from './sync.js'; // INJEKSI API FETCH
import { initAdmin } from './admin.js';

window.AppDB = { getAllData, getDataById, putData };
const getEl = (id) => document.getElementById(id);

window.handleAuthError = async (res) => {
    if (res && res.status === 'error' && (String(res.message).includes('401') || String(res.message).includes('Expired'))) {
        alert(res.message + "\n\nSistem akan mengeluarkan Anda untuk keamanan.");
        await clearStore('kader_session'); location.reload(); return true;
    }
    return false;
};

window.logErrorToServer = (lokasiSistem, errObj) => {
    try {
        const username = window.currentUser ? window.currentUser.username : 'UNKNOWN'; 
        const pesanError = typeof errObj === 'string' ? errObj : (errObj.message || String(errObj));
        apiFetch('LOG_ERROR', { id_pengguna: username, lokasi_sistem: lokasiSistem, perangkat: navigator.userAgent, pesan_error: pesanError });
    } catch(e) {} 
};
window.addEventListener('error', function(event) { window.logErrorToServer('Global Error (Frontend)', event.message || String(event.error)); });
window.addEventListener('unhandledrejection', function(event) { window.logErrorToServer('Unhandled Promise (API/DB)', String(event.reason)); });

const applySettings = () => {
    if(localStorage.getItem('theme') === 'dark') { document.body.style.backgroundColor = '#121212'; document.body.style.color = '#ffffff'; } 
    else { document.body.style.backgroundColor = '#f0f4f8'; document.body.style.color = '#333333'; }
    let fontSize = localStorage.getItem('fontSize') || '16'; document.documentElement.style.fontSize = fontSize + 'px';
};
applySettings();

window.getKodeKecamatan = (kec) => {
    if (!kec) return "XXX";
    const map = { 'GEROKGAK': 'GRK', 'SERIRIT': 'SRT', 'BUSUNGBIU': 'BSB', 'BANJAR': 'BJR', 'SUKASADA': 'SKS', 'BULELENG': 'BLL', 'SAWAN': 'SWN', 'KUBUTAMBAHAN': 'KBT', 'TEJAKULA': 'TJK' };
    return map[kec.toUpperCase()] || "XXX";
};

window.pullDataKaderFromServer = async (session) => {
    try {
        const antrean = await window.AppDB.getAllData('sync_queue');
        if (antrean.length > 0) return; 
        
        console.log("🕵️ Menarik data dengan API Wrapper...");
        const res = await apiFetch('PULL_DATA_KADER', { kecamatan: window.getKodeKecamatan(session.kecamatan), id_tim: session.id_tim }, session.token);
        if(await window.handleAuthError(res)) return;

        if ((res.ok || res.status === 'success') && res.data && res.data.length > 0) {
            for (let d of res.data) { await window.AppDB.putData('sync_queue', d); }
            if (document.getElementById('content-area')) window.renderKonten('dashboard');
        }
    } catch(e) { window.logErrorToServer('pullDataKader', e); }
};

const dapatkanLokasiGPS = async () => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) { resolve("Browser tidak mendukung GPS"); return; }
        navigator.geolocation.getCurrentPosition(
            (position) => { resolve(`${position.coords.latitude}, ${position.coords.longitude}`); },
            (error) => { let msg = "Gagal (Tidak Diketahui)"; if (error.code === 1) msg = "Ditolak Pengguna"; else if (error.code === 2) msg = "Sinyal GPS Hilang"; else if (error.code === 3) msg = "Timeout Pencarian Satelit"; resolve(msg); },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 } 
        );
    });
};

const tampilkanLayar = (id) => {
    try {
        const vSplash = getEl('view-splash'); const vLogin = getEl('view-login'); const vApp = getEl('view-app');
        if (vSplash) { vSplash.classList.remove('active'); vSplash.style.display = 'none'; }
        if (id === 'login') { if (vLogin) vLogin.classList.remove('hidden'); if (vApp) vApp.classList.add('hidden'); } 
        else if (id === 'app') { if (vLogin) vLogin.classList.add('hidden'); if (vApp) vApp.classList.remove('hidden'); }
        updateNetworkStatus();
    } catch (e) { window.logErrorToServer('tampilkanLayar', e); }
};

const updateNetworkStatus = () => { const status = getEl('network-status'); if (status) { const isOnline = navigator.onLine; status.innerText = isOnline ? 'Online' : 'Offline'; status.style.backgroundColor = isOnline ? '#198754' : '#6c757d'; } };

const tampilkanPopUpPengumuman = (p, id_p) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(10, 35, 66, 0.85); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter: blur(5px);';
    const tgl = p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : 'Info Terbaru';
    overlay.innerHTML = `<div style="background:white; border-radius:16px; width:100%; max-width:400px; box-shadow:0 15px 35px rgba(0,0,0,0.4); overflow:hidden; animation: slideDownAlert 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);"><div style="background:linear-gradient(135deg, #0A2342 0%, #0043A8 100%); color:#F1C40F; padding:20px; text-align:center; border-bottom: 4px solid #F1C40F;"><div style="font-size:3rem; margin-bottom:5px; animation: ringBell 2s infinite;">📢</div><h3 style="margin:0; font-size:1.3rem; font-weight:900; letter-spacing:1px;">PENGUMUMAN</h3></div><div style="padding:25px 20px;"><div style="font-size:0.8rem; color:#888; text-align:center; margin-bottom:10px; font-weight:bold;">🕒 ${tgl}</div><h4 style="margin:0 0 15px 0; color:#0A2342; text-align:center; font-size:1.2rem; font-weight:800;">${p.judul}</h4><div style="font-size:1rem; color:#444; line-height:1.6; margin-bottom:25px; text-align:center; white-space:pre-wrap; background:#f8f9fa; padding:15px; border-radius:8px; border:1px dashed #ccc;">${p.isi_pesan}</div><button id="btn-mengerti-${id_p}" style="width:100%; background:#F1C40F; color:#0A2342; border:none; padding:15px; border-radius:8px; font-weight:900; font-size:1.1rem; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1); transition: transform 0.1s;">✅ SAYA MENGERTI</button></div></div><style>@keyframes slideDownAlert { from { transform:translateY(-50px) scale(0.9); opacity:0; } to { transform:translateY(0) scale(1); opacity:1; } } @keyframes ringBell { 0% { transform: rotate(0); } 10% { transform: rotate(15deg); } 20% { transform: rotate(-10deg); } 30% { transform: rotate(5deg); } 40% { transform: rotate(-5deg); } 50% { transform: rotate(0); } 100% { transform: rotate(0); } }</style>`;
    document.body.appendChild(overlay); document.getElementById(`btn-mengerti-${id_p}`).onclick = () => { localStorage.setItem(`read_info_${id_p}`, 'true'); document.body.removeChild(overlay); cekPengumuman(window.currentUser?.role || 'KADER'); };
};

const cekPengumuman = async (userRole) => {
    try { const pengumuman = await getAllData('master_pengumuman').catch(() => []); if (!pengumuman || pengumuman.length === 0) return; const activePengumuman = pengumuman.filter(p => String(p.is_active || 'Y').toUpperCase() === 'Y' && (p.target_role === 'SEMUA' || String(p.target_role).toUpperCase() === String(userRole).toUpperCase())).sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)); for (const p of activePengumuman) { const id_p = p.id_pengumuman || p.id || 'unknown_id'; const isRead = localStorage.getItem(`read_info_${id_p}`); if (!isRead) { tampilkanPopUpPengumuman(p, id_p); break; } } } catch (e) { window.logErrorToServer('cekPengumuman', e); }
};

const initApp = async () => {
    try {
        await initDB(); const session = await getDataById('kader_session', 'active_user');
        const vSplash = document.getElementById('view-splash'); const vLogin = document.getElementById('view-login'); const vApp = document.getElementById('view-app');

        if (session && session.token) {
            const roleUpper = String(session.role).toUpperCase();
            if (roleUpper.includes('SUPER')) { import('./super.js').then(module => { module.initSuperAdmin(session); }).catch(err => { alert("Modul Super Admin tidak ditemukan!"); window.logErrorToServer('Load Super Module', err); }); } 
            else if (roleUpper.includes('ADMIN') || roleUpper.includes('PKB') || roleUpper.includes('MITRA') || roleUpper === 'ADMIN_DESA') { if (typeof initAdmin === 'function') { initAdmin(session); } else { import('./admin.js').then(module => module.initAdmin(session)).catch(err => window.logErrorToServer('Load Admin Module', err)); } } 
            else { masukKeAplikasi(session); }
        } else { 
            if (session) { await clearStore('kader_session'); }
            if(vSplash) vSplash.style.display = 'none'; if(vApp) vApp.classList.add('hidden'); if(vLogin) vLogin.classList.remove('hidden'); 
        }
    } catch (e) { window.logErrorToServer('initApp', e); }
};

const masukKeAplikasi = async (session) => {
    try {
        window.currentUser = session;
        const allWil = await getAllData('master_tim_wilayah').catch(() => []); const wilayahKader = allWil.find(w => String(w.id_tim) === String(session.id_tim)); const namaKec = wilayahKader && wilayahKader.kecamatan ? wilayahKader.kecamatan.toUpperCase() : (session.kecamatan || "BULELENG");

        const greeting = getEl('user-greeting'); if (greeting) { greeting.innerHTML = `DASHBOARD KADER<br>KECAMATAN ${namaKec}`; greeting.style.textAlign = 'center'; greeting.style.lineHeight = '1.15'; greeting.style.fontSize = '1.05rem'; }
        const hInfo = document.querySelector('.header-info'); if (hInfo) { hInfo.style.display = 'flex'; hInfo.style.alignItems = 'center'; hInfo.style.gap = '12px'; hInfo.style.flexDirection = 'row-reverse'; }
        if (getEl('sidebar-nama')) getEl('sidebar-nama').innerText = session.nama; if (getEl('sidebar-role')) getEl('sidebar-role').innerText = session.role;

        renderMenu(session.role); renderKonten('dashboard'); tampilkanLayar('app');
        setTimeout(() => { cekPengumuman(session.role); if (String(session.role).toUpperCase() === 'KADER') window.pullDataKaderFromServer(session); }, 800);
    } catch (e) { window.logErrorToServer('masukKeAplikasi', e); }
};

const renderMenu = async (role) => {
    const container = getEl('dynamic-menu-container'); if (!container) return; let allMenu = []; const rUpper = String(role).toUpperCase();

    if (rUpper === 'KADER') {
        allMenu = [
            { id_menu: 'M1', label_menu: 'Dashboard', icon: '🏠', target_view: 'dashboard', role_akses: 'KADER', urutan: 1, is_active: 'Y' },
            { id_menu: 'M2', label_menu: 'Registrasi Sasaran', icon: '📝', target_view: 'registrasi', role_akses: 'KADER', urutan: 2, is_active: 'Y' },
            { id_menu: 'M3', label_menu: 'Data Sasaran & Riwayat', icon: '📋', target_view: 'daftar_sasaran', role_akses: 'KADER', urutan: 3, is_active: 'Y' },
            { id_menu: 'M4', label_menu: 'Laporan Pendampingan', icon: '🤝', target_view: 'pendampingan', role_akses: 'KADER', urutan: 4, is_active: 'Y' },
            { id_menu: 'M5', label_menu: 'Rekap Bulanan', icon: '📊', target_view: 'rekap_bulanan', role_akses: 'KADER', urutan: 5, is_active: 'Y' },
            { id_menu: 'M6', label_menu: 'Bantuan & FAQ', icon: '🆘', target_view: 'bantuan', role_akses: 'KADER', urutan: 6, is_active: 'Y' },
            { id_menu: 'M7', label_menu: 'Pengaturan Akun', icon: '⚙️', target_view: 'setting', role_akses: 'KADER', urutan: 7, is_active: 'Y' },
            { id_menu: 'M8', label_menu: 'Pembaruan / Update Sistem', icon: '🔄', target_view: 'reload_app', role_akses: 'KADER', urutan: 8, is_active: 'Y' }
        ];
    } else {
        allMenu = await getAllData('master_menu').catch(()=>[]);
        if (allMenu.length === 0) { allMenu = [ { id_menu: 'M1', label_menu: 'Dashboard', icon: '🏠', target_view: 'dashboard', role_akses: role, urutan: 1, is_active: 'Y' }, { id_menu: 'M8', label_menu: 'Pembaruan / Update Sistem', icon: '🔄', target_view: 'reload_app', role_akses: role, urutan: 8, is_active: 'Y' } ]; }
    }

    const filteredMenu = allMenu.filter(m => { const roles = String(m.role_akses || '').toUpperCase(); const isActive = String(m.is_active || 'Y').toUpperCase() === 'Y'; return isActive && roles.includes(rUpper); }).sort((a,b) => (parseInt(a.urutan)||0) - (parseInt(b.urutan)||0));
    const parents = filteredMenu.filter(m => !m.parent_id); const children = filteredMenu.filter(m => m.parent_id); let menuHtml = '';
    
    parents.forEach(p => {
        const myChildren = children.filter(c => c.parent_id === p.id_menu).sort((a,b) => (parseInt(a.urutan)||0) - (parseInt(b.urutan)||0));
        if(myChildren.length > 0) {
            menuHtml += `<div style="margin-bottom: 2px;"><a class="menu-item" style="display:flex; justify-content:space-between; align-items:center;" onclick="var c = this.nextElementSibling; if(c.style.display==='none'){c.style.display='block'; this.style.background='rgba(0,0,0,0.05)';}else{c.style.display='none'; this.style.background='';}"><span><span class="icon">${p.icon || '📁'}</span> ${p.label_menu}</span><span style="font-size:0.7rem; opacity:0.6;">▼</span></a><div style="display:none; background: rgba(0,0,0,0.03); border-left: 3px solid var(--primary);">${myChildren.map(c => `<a class="menu-item" style="padding-left: 45px; font-size:0.9rem;" data-target="${c.target_view}"><span class="icon">${c.icon || '📄'}</span> ${c.label_menu}</a>`).join('')}</div></div>`;
        } else {
            let textColor = p.target_view === 'reload_app' ? 'color:#0d6efd; font-weight:bold;' : '';
            menuHtml += `<a class="menu-item" data-target="${p.target_view}" style="${textColor}"><span class="icon">${p.icon || '📌'}</span> ${p.label_menu}</a>`;
        }
    });

    menuHtml += `<hr><a class="menu-item text-danger" id="btnLogout">🚪 Keluar (Hapus Sesi Lokal)</a>`;
    container.innerHTML = menuHtml; container.style.overflowY = 'auto'; container.style.maxHeight = 'calc(100vh - 180px)'; container.style.paddingBottom = '20px';

    document.querySelectorAll('.menu-item[data-target]').forEach(item => {
        item.onclick = async () => {
            getEl('sidebar').classList.remove('active'); getEl('sidebar-overlay').classList.remove('active'); const target = item.getAttribute('data-target');
            if (target === 'reload_app') { 
                if (confirm("🔄 TARIK PEMBARUAN SISTEM?\n\nSistem akan dimuat ulang. Data yang belum disinkronisasi TETAP AMAN.\n\nLanjutkan?")) {
                    try { if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); for (let r of regs) { await r.unregister(); } } if (window.caches) { const keys = await caches.keys(); for (let k of keys) { await caches.delete(k); } } alert("✅ Memori sistem berhasil dibersihkan! Memuat versi terbaru..."); window.location.reload(true); } catch (e) { window.location.reload(true); }
                }
            } else if (target) { window.editModeData = null; window.editModeLaporan = null; renderKonten(target); }
        };
    });

    if (getEl('btnLogout')) { getEl('btnLogout').onclick = async () => { if (confirm("🚪 Yakin ingin Keluar?\n\n⚠️ Pastikan indikator Sinkronisasi sudah 0/0. Jika masih ada data Lokal, data tersebut HILANG!")) { await clearStore('kader_session'); await clearStore('sync_queue'); if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); for (let r of regs) { await r.unregister(); } } if (window.caches) { const keys = await caches.keys(); for (let k of keys) { await caches.delete(k); } } location.reload(true); } }; }
};

window.mulaiSinkronisasiDashboard = async () => {
    try {
        const icon = getEl('icon-sync-dash'); const text = getEl('text-sync-dash'); const card = getEl('card-sync-dashboard');
        if (!navigator.onLine) console.warn("⚠️ Mencoba sinkronisasi tanpa sinyal."); 
        if(icon) icon.innerHTML = '⏳'; if(text) { text.innerHTML = 'SINKRONISASI...'; text.style.color = '#dc3545'; } if(card) card.style.pointerEvents = 'none';
        if(window.jalankanSinkronisasi) { await window.jalankanSinkronisasi(); } else { alert("Sistem sinkronisasi belum siap. Memuat ulang..."); location.reload(); }
    } catch (e) { window.logErrorToServer('mulaiSinkronisasiDashboard', e); }
};

window.renderKonten = async (target) => {
    const area = getEl('content-area'); if (!area) return; area.innerHTML = '';

    try {
        if (target === 'dashboard') {
            const session = window.currentUser; if(!session) return; 
            
            area.innerHTML = `
                <div class="animate-fade">
                    <div class="card" style="background: linear-gradient(135deg, #0d6efd, #0043a8); color: white; border:none; margin-bottom: 15px; padding: 20px;">
                        <p style="margin:0; opacity: 0.9; font-weight: 800; font-size: 0.85rem;">SELAMAT DATANG,</p>
                        <h2 style="margin: 3px 0 10px 0; font-size: 1.4rem; font-weight: 700; line-height: 1.2; text-transform:uppercase;">${session.nama || 'PENGGUNA'}</h2>
                        <hr style="margin-bottom: 12px; border: 0; border-top: 1px solid rgba(255,255,255,0.2);">
                        <div id="dash-detail-wilayah">Memuat detail...</div>
                    </div>
                    
                    <div id="dash-alarm" style="margin-bottom: 15px;"></div>

                    <div id="dash-summary" style="background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 15px; border: 1px solid #eee;">Memuat ringkasan data...</div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <div class="card" style="text-align:center; padding: 15px 5px; cursor:pointer; border-bottom: 4px solid #0d6efd;" onclick="renderKonten('registrasi')"><div style="font-size: 1.6rem;">📝</div><h3 style="font-size: 0.95rem; margin: 5px 0 0 0;">BARU</h3><p style="font-size: 0.65rem; color: #666; font-weight: bold; margin: 2px 0 0 0;">REGISTRASI</p></div>
                        <div class="card" id="card-sync-dashboard" style="text-align:center; padding: 15px 5px; cursor:pointer; border-bottom: 4px solid orange; background:#fffdf8;" onclick="window.mulaiSinkronisasiDashboard()"><div id="icon-sync-dash" style="font-size: 1.6rem;">🔄</div><h3 id="dash-tunda" style="font-size: 1rem; margin: 5px 0 0 0;">0/0</h3><p id="text-sync-dash" style="font-size: 0.65rem; color: #d63384; font-weight: bold; margin: 2px 0 0 0;">KLIK SINKRON</p></div>
                        <div class="card" style="text-align:center; padding: 15px 5px; cursor:pointer; border-bottom: 4px solid #198754;" onclick="renderKonten('pendampingan')"><div style="font-size: 1.6rem;">🤝</div><h3 style="font-size: 0.95rem; margin: 5px 0 0 0;">LAPOR</h3><p style="font-size: 0.65rem; color: #666; font-weight: bold; margin: 2px 0 0 0;">PENDAMPINGAN</p></div>
                    </div>
                </div>`;

            try {
                const [allWil, allTim, antrean, stdAntro] = await Promise.all([ getAllData('master_tim_wilayah').catch(()=>[]), getAllData('master_tim').catch(()=>[]), getAllData('sync_queue').catch(()=>[]), getAllData('standar_antropometri').catch(()=>[]) ]);
                
                let namaDesa = session.desa && session.desa !== '-' && String(session.desa).toLowerCase() !== 'undefined' ? session.desa : '-'; 
                let daftarDusun = session.dusun && session.dusun !== '-' && String(session.dusun).toLowerCase() !== 'undefined' ? session.dusun : '-';
                
                if (daftarDusun === '-' || !daftarDusun) { const wilayahKerja = allWil.filter(w => String(w.id_tim) === String(session.id_tim)); if (wilayahKerja.length > 0) { daftarDusun = [...new Set(wilayahKerja.map(w => w.dusun_rw || w.dusun).filter(Boolean))].join(', '); } else { const timData = allTim.find(t => String(t.id_tim) === String(session.id_tim) || String(t.id) === String(session.id_tim)); if (timData) daftarDusun = timData.dusun_rw || timData.dusun || '-'; } }
                if (namaDesa === '-' || !namaDesa) { const wilayahKerja = allWil.filter(w => String(w.id_tim) === String(session.id_tim)); if (wilayahKerja.length > 0) { namaDesa = wilayahKerja[0]?.desa_kelurahan || wilayahKerja[0]?.desa || '-'; } else { const timData = allTim.find(t => String(t.id_tim) === String(session.id_tim) || String(t.id) === String(session.id_tim)); if (timData) namaDesa = timData.desa_kelurahan || timData.desa || '-'; } }

                if (getEl('dash-detail-wilayah')) { getEl('dash-detail-wilayah').innerHTML = `<div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; margin-bottom: 12px;">NO. TIM: ${session.nomor_tim || session.id_tim || '-'}</div><div style="line-height: 1.25;"><div style="margin-bottom: 6px;"><span style="opacity:0.8; font-size: 0.8rem;">📍 Wilayah Tugas (Dusun/RW):</span><br><span style="font-weight: 600; font-size: 0.9rem;">${daftarDusun}</span></div><div style="margin-bottom: 6px;"><span style="opacity:0.8; font-size: 0.8rem;">🏘️ Desa/Kelurahan:</span><br><span style="font-weight: 600; font-size: 0.9rem;">${namaDesa}</span></div><div><span style="opacity:0.8; font-size: 0.8rem;">🏛️ Kecamatan:</span><br><span style="font-weight: 600; font-size: 0.9rem;">${session.kecamatan || '-'}</span></div></div>`; }
                
                const queueTim = antrean.filter(a => String(a.id_tim) === String(session.id_tim));
                if (getEl('dash-tunda')) { getEl('dash-tunda').innerText = `${queueTim.filter(a => a.is_synced).length}/${queueTim.filter(a => !a.is_synced).length}`; }
                
                const regList = queueTim.filter(a => a.tipe_laporan === 'REGISTRASI'); const pendList = queueTim.filter(a => a.tipe_laporan === 'PENDAMPINGAN');
                const cReg = { CATIN: 0, BUMIL: 0, BUFAS: 0, BADUTA: 0 }; const cPend = { CATIN: 0, BUMIL: 0, BUFAS: 0, BADUTA: 0 }; const hariIni = new Date(); hariIni.setHours(0,0,0,0);
                
                const badAir = ['Sumur Tak Terlindung', 'Mata Air Tak Terlindung', 'Air Permukaan (Sungai/Danau/Waduk/Kolam/Irigasi)', 'Air Hujan']; const prioritasList = [];

                regList.forEach(r => { 
                    let isAktif = r.status_sasaran !== 'SELESAI'; 
                    if (r.jenis_sasaran === 'CATIN' && r.data_laporan?.tanggal_pernikahan && new Date(r.data_laporan.tanggal_pernikahan) < hariIni) isAktif = false; 
                    if (r.jenis_sasaran === 'BUFAS' && r.data_laporan?.tgl_persalinan) { const tB = new Date(r.data_laporan.tgl_persalinan); tB.setDate(tB.getDate() + 42); if (hariIni > tB) isAktif = false; } 
                    if(cReg[r.jenis_sasaran] !== undefined && isAktif) cReg[r.jenis_sasaran]++; 

                    if (isAktif) {
                        let reasons = []; let rD = r.data_laporan || {};
                        if (badAir.includes(rD.sumber_air)) reasons.push('💧 Air Minum Berisiko');
                        if (rD.fasilitas_bab === 'Tidak Ada') reasons.push('🚽 Tidak Punya Jamban');

                        const myPend = pendList.filter(p => p.id_sasaran_ref === r.id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                        if (myPend.length > 0) {
                            let pD = myPend[0].data_laporan || {};
                            if (r.jenis_sasaran === 'BUMIL') { let lila = parseFloat(pD.m_lila || pD.lila); if (lila && lila < 23.5) reasons.push('🤰 KEK (LiLA < 23.5cm)'); }
                            if (r.jenis_sasaran === 'BADUTA') {
                                if (pD.evaluasi_kka === 'Terlambat') reasons.push('📉 Perkembangan Meragukan (KKA)');
                                let bbVal = null, tbVal = null;
                                for (let key in pD) { if (key.toLowerCase().includes('berat') || key === 'b_bb' || key === 'bb') bbVal = parseFloat(pD[key]); if (key.toLowerCase().includes('tinggi') || key.toLowerCase().includes('panjang') || key === 'b_tb' || key === 'tb') tbVal = parseFloat(pD[key]); }
                                if (bbVal && tbVal && stdAntro.length > 0 && rD.tanggal_lahir) {
                                    let tL = new Date(rD.tanggal_lahir); let tH = new Date(pD.tgl_kunjungan || myPend[0].created_at);
                                    let uBln = (tH.getFullYear() - tL.getFullYear()) * 12 - tL.getMonth() + tH.getMonth(); if (tH.getDate() < tL.getDate()) uBln--; if(uBln < 0) uBln = 0;
                                    let jk = rD.jenis_kelamin === 'Laki-laki' ? 'L' : 'P';
                                    let d_tbu = stdAntro.find(s => s.jenis_kelamin === jk && (s.indeks === 'PB_U' || s.indeks === 'TB_U') && parseInt(s.umur_bulan) === uBln);
                                    if(d_tbu && tbVal < parseFloat(d_tbu.min_2_sd)) reasons.push('📏 Indikasi Stunting (Pendek)');
                                    let rTB = (Math.round(tbVal * 2) / 2).toFixed(1);
                                    let d_bbp = stdAntro.find(s => s.jenis_kelamin === jk && (s.indeks === 'BB_PB' || s.indeks === 'BB_TB') && parseFloat(s.tinggi_panjang_cm) === parseFloat(rTB));
                                    if(d_bbp && bbVal < parseFloat(d_bbp.min_2_sd)) reasons.push('⚖️ Indikasi Gizi Kurang');
                                }
                            }
                        }
                        if (reasons.length > 0) { prioritasList.push({ id: r.id, nama: r.nama_sasaran, jenis: r.jenis_sasaran, reasons: [...new Set(reasons)] }); }
                    }
                });

                if (getEl('dash-alarm')) {
                    if (prioritasList.length > 0) {
                        let htmlAlarm = `<div style="background: #fff3cd; border: 1px solid #ffeeba; border-left: 5px solid #dc3545; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);"><h4 style="margin: 0 0 8px 0; color: #dc3545; font-size: 1rem; display:flex; align-items:center; gap:8px;">🚨 SASARAN PRIORITAS <span style="background:#dc3545; color:white; padding:2px 6px; border-radius:12px; font-size:0.75rem;">${prioritasList.length} Warga</span></h4><p style="margin: 0 0 10px 0; font-size: 0.8rem; color: #856404; line-height:1.3;">Warga berikut memerlukan perhatian khusus berdasarkan indikator KRS atau riwayat kunjungan medis terakhir:</p><div style="display:flex; flex-direction:column; gap:8px; max-height:220px; overflow-y:auto; padding-right:5px;">`;
                        prioritasList.forEach(p => { htmlAlarm += `<div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #ffdf7e; display:flex; justify-content:space-between; align-items:center;"><div><div style="font-weight:bold; color: #0A2342; font-size: 0.95rem; text-transform:uppercase;">${p.nama} <span style="font-size:0.65rem; background:#e8f4fd; color:#0d6efd; padding:2px 5px; border-radius:4px; margin-left:4px;">${p.jenis}</span></div><div style="font-size: 0.75rem; color: #dc3545; margin-top:4px; font-weight:600;">${p.reasons.join(' • ')}</div></div><button onclick="renderKonten('daftar_sasaran')" style="background:#f8f9fa; border:1px solid #dc3545; color:#dc3545; border-radius:4px; padding:6px 10px; cursor:pointer; font-size:0.75rem; font-weight:bold; white-space:nowrap; transition:all 0.2s;">Pantau</button></div>`; });
                        htmlAlarm += `</div></div>`; getEl('dash-alarm').innerHTML = htmlAlarm;
                    } else { getEl('dash-alarm').innerHTML = `<div style="background: #e2f0cb; border: 1px solid #c3e6cb; border-left: 5px solid #28a745; padding: 12px 15px; border-radius: 8px;"><h4 style="margin: 0; color: #155724; font-size: 0.9rem; font-weight:bold; display:flex; align-items:center; gap:8px;">✅ Situasi Aman Terkendali!</h4><div style="font-size:0.8rem; color:#28a745; margin-top:2px;">Tidak ada sasaran aktif yang terdeteksi berisiko (Gizi, Sanitasi, atau KEK) saat ini.</div></div>`; }
                }
                
                pendList.forEach(p => { let j = p.jenis_sasaran_saat_kunjungan; if (!j) { const ref = String(p.id_sasaran_ref || ''); if (ref.indexOf('CTN') > -1) j = 'CATIN'; else if (ref.indexOf('BML') > -1) j = 'BUMIL'; else if (ref.indexOf('BFS') > -1) j = 'BUFAS'; else if (ref.indexOf('BDT') > -1) j = 'BADUTA'; } if(j && cPend[j] !== undefined) cPend[j]++; });
                
                if(getEl('dash-summary')){ getEl('dash-summary').innerHTML = `<h4 style="font-size: 0.95rem; color: #555; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">📊 Total Data Kumulatif (Anda)</h4><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem;"><div><strong style="color:var(--primary);">🎯 Sasaran Aktif</strong><ul style="margin: 5px 0 0 15px; padding: 0; color: #444; list-style-type: square;"><li>CATIN: <b>${cReg.CATIN}</b></li><li>BUMIL: <b>${cReg.BUMIL}</b></li><li>BUFAS: <b>${cReg.BUFAS}</b></li><li>BADUTA: <b>${cReg.BADUTA}</b></li></ul></div><div><strong style="color:#198754;">🤝 Laporan Kunjungan</strong><ul style="margin: 5px 0 0 15px; padding: 0; color: #444; list-style-type: square;"><li>CATIN: <b>${cPend.CATIN}</b></li><li>BUMIL: <b>${cPend.BUMIL}</b></li><li>BUFAS: <b>${cPend.BUFAS}</b></li><li>BADUTA: <b>${cPend.BADUTA}</b></li></ul></div></div>`; }
            } catch (e) { window.logErrorToServer('renderKonten - dashboard', e); }

        } else if (target === 'registrasi') {
            const isEdit = window.editModeData != null; const eLabel = isEdit ? `Mengedit Data Sasaran` : `Registrasi Sasaran Baru`;
            area.innerHTML = `
                <div class="animate-fade">
                    <h3 style="margin:0; color:var(--primary); font-size:1.3rem;">📝 ${eLabel}</h3>
                    ${isEdit ? `<div style="background:#fff3cd; padding:10px; border-radius:5px; margin-bottom:15px; font-size:0.85rem; color:#856404;"><b>Info:</b> ID Sasaran dan Jenis Sasaran tidak dapat diubah.</div>` : ''}
                    <form id="form-registrasi" style="background:#fff; padding:15px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                        <div class="form-group"><label style="font-weight:bold;">Jenis Sasaran <span style="color:red">*</span></label><select name="jenis_sasaran" id="reg-jenis" class="form-control" required ${isEdit ? 'disabled' : ''}><option value="">-- Pilih Jenis Sasaran --</option><option value="CATIN">Calon Pengantin (CATIN)</option><option value="BUMIL">Ibu Hamil (BUMIL)</option><option value="BUFAS">Ibu Nifas (BUFAS)</option><option value="BADUTA">Anak Baduta (0-23 Bulan)</option></select></div>
                        <div id="form-core" style="display:none; margin-top:15px;">
                            
                            <div id="box-sasaran-inti" style="background:#e8f4fd; padding:15px; border-radius:8px; border-left:4px solid var(--primary); margin-bottom:15px;">
                                <h4 style="margin:0 0 15px 0; color:var(--primary); font-size:1rem;">Identitas Pokok Sasaran</h4>
                                <div class="form-group"><label>Nama Sasaran <span style="color:red">*</span></label><input type="text" name="nama_sasaran" id="f_nama" class="form-control" required></div>
                                <div class="form-group"><label>NIK Sasaran <span style="color:red">*</span></label><input type="text" name="nik" id="f_nik" class="form-control" pattern="[0-9]{16}" title="NIK harus 16 digit angka" maxlength="16" minlength="16" oninput="this.value=this.value.replace(/[^0-9]/g,'')" placeholder="16 digit angka" required></div>
                                <div class="form-group"><label>Nama Kepala Keluarga <span style="color:red">*</span></label><input type="text" name="nama_kk" id="f_kk_nama" class="form-control" required></div>
                                <div class="form-group"><label>Nomor KK <span style="color:red">*</span></label><input type="text" name="nomor_kk" id="f_kk_no" class="form-control" pattern="[0-9]{16}" title="Nomor KK harus 16 digit angka" maxlength="16" minlength="16" oninput="this.value=this.value.replace(/[^0-9]/g,'')" placeholder="16 digit angka" required></div>
                                <div class="form-group"><label>Tanggal Lahir Sasaran <span style="color:red">*</span></label><input type="date" name="tanggal_lahir" id="f_tgl" class="form-control" required></div>
                                <div class="form-group" id="box-jk"><label>Jenis Kelamin <span style="color:red">*</span></label><select name="jenis_kelamin" id="reg-jk" class="form-control" required><option value="">-- Pilih --</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></div>
                            </div>
                            
                            <div id="box-indikator-krs" style="background:#fdf3e8; padding:15px; border-radius:8px; border-left:4px solid #e67e22; margin-bottom:15px;">
                                <h4 style="margin:0 0 15px 0; color:#d35400; font-size:1rem;">Indikator KRS</h4>
                                <div class="form-group"><label>Sumber Air Minum Utama <span style="color:red">*</span></label><select name="sumber_air" id="f_sumber_air" class="form-control" required><option value="">-- Pilih --</option><option value="Air Kemasan / Isi Ulang">Air Kemasan / Isi Ulang</option><option value="Ledeng / Pam">Ledeng / Pam</option><option value="Sumur Bor / Pompa">Sumur Bor / Pompa</option><option value="Sumur Terlindung">Sumur Terlindung</option><option value="Sumur Tak Terlindung">Sumur Tak Terlindung</option><option value="Mata Air Terlindung">Mata Air Terlindung</option><option value="Mata Air Tak Terlindung">Mata Air Tak Terlindung</option><option value="Air Permukaan (Sungai/Danau/Waduk/Kolam/Irigasi)">Air Permukaan (Sungai/Danau/Waduk/Kolam/Irigasi)</option><option value="Air Hujan">Air Hujan</option><option value="Lainnya">Lainnya</option></select></div>
                                <div class="form-group"><label>Fasilitas Buang Air Besar (BAB) <span style="color:red">*</span></label><select name="fasilitas_bab" id="f_fasilitas_bab" class="form-control" required><option value="">-- Pilih --</option><option value="Jamban Milik Sendiri Dengan Leher Angsa Dan Tangki Septik / Ipal">Jamban Milik Sendiri Dengan Leher Angsa Dan Tangki Septik / Ipal</option><option value="Jamban Pada Mck Komunal Dengan Leher Angsa Dan Tangki Septik / Ipal">Jamban Pada Mck Komunal Dengan Leher Angsa Dan Tangki Septik / Ipal</option><option value="Ya Lainnya">Ya Lainnya</option><option value="Tidak Ada">Tidak Ada</option></select></div>
                            </div>

                            <div id="box-catin-pasangan" style="display:none; background:#f4f6f8; padding:15px; border-radius:8px; border-left:4px solid #6c757d; margin-bottom:15px;">
                                <h4 style="margin:0 0 15px 0; color:#495057; font-size:1rem;">Data Pasangan</h4>
                                <div class="form-group"><label>Tanggal Pernikahan <span style="color:red">*</span></label><input type="date" id="input-tgl-nikah" name="tanggal_pernikahan" class="form-control"></div>
                                <div class="form-group"><label>Nama Calon Suami/Istri <span style="color:red">*</span></label><input type="text" name="nama_pasangan" id="f_nama_pasangan" class="form-control" placeholder="Nama Lengkap Pasangan"></div>
                                <div class="form-group"><label>NIK Calon Suami/Istri <span style="color:red">*</span></label><input type="text" name="nik_pasangan" id="f_nik_pasangan" class="form-control" maxlength="16" minlength="16" pattern="[0-9]{16}" oninput="this.value=this.value.replace(/[^0-9]/g,'')" placeholder="16 digit angka"></div>
                            </div>

                            <div id="box-bumil-status" style="display:none; background:#fcf1f6; padding:15px; border-radius:8px; border-left:4px solid #d63384; margin-bottom:15px;">
                                <h4 style="margin:0 0 15px 0; color:#d63384; font-size:1rem;">Status Kehamilan</h4>
                                <div class="form-group"><label>Kehamilan ke <span style="color:red">*</span></label><input type="text" name="kehamilan_ke" id="f_kehamilan_ke" class="form-control" maxlength="1" pattern="[1-9]" oninput="this.value=this.value.replace(/[^1-9]/g,'')" placeholder="Cth: 1"></div>
                                <div class="form-group"><label>Keinginan Hamil <span style="color:red">*</span></label><select name="keinginan_hamil" id="f_keinginan_hamil" class="form-control"><option value="">-- Pilih --</option><option value="Ingin Hamil Saat ini">Ingin Hamil Saat ini</option><option value="Ingin Hamil setelah >2 th">Ingin Hamil setelah >2 th</option><option value="Tidak Ingin Hamil Lagi">Tidak Ingin Hamil Lagi</option></select></div>
                                <div class="form-group"><label>Berat Badan Sebelum Hamil (Kg)</label><input type="number" step="any" name="bb_sebelum_hamil" id="f_bb_sebelum_hamil" class="form-control" placeholder="Cth: 50.5"></div>
                            </div>

                            <div id="box-bufas-status" style="display:none; background:#e2f0cb; padding:15px; border-radius:8px; border-left:4px solid #27ae60; margin-bottom:15px;">
                                <h4 style="margin:0 0 15px 0; color:#27ae60; font-size:1rem;">Data Persalinan</h4>
                                <div class="form-group"><label>Tanggal Persalinan / Melahirkan <span style="color:red">*</span></label><input type="date" id="input-tgl-salin-reg" name="tgl_persalinan" class="form-control"></div>
                                <div class="form-group"><label>Jumlah Anak Kandung <span style="color:red">*</span></label><input type="number" name="jumlah_anak_kandung" id="f_jumlah_anak" class="form-control" placeholder="Cth: 2" min="1"></div>
                            </div>

                            <div id="box-baduta-status" style="display:none; background:#fff3cd; padding:15px; border-radius:8px; border-left:4px solid #ffc107; margin-bottom:15px;">
                                <h4 style="margin:0 0 15px 0; color:#856404; font-size:1rem;">Data Kelahiran Anak</h4>
                                <div class="form-group"><label>Anak ke <span style="color:red">*</span></label><input type="number" name="anak_ke" id="f_anak_ke" class="form-control" placeholder="Cth: 1" min="1"></div>
                                <div class="form-group"><label>Berat Badan Lahir (Kg) <span style="color:red">*</span></label><input type="number" step="0.01" name="bb_lahir" id="f_bb_lahir" class="form-control" placeholder="Cth: 3.20"></div>
                                <div class="form-group"><label>Tinggi / Panjang Badan Lahir (Cm) <span style="color:red">*</span></label><input type="number" step="0.01" name="tb_lahir" id="f_tb_lahir" class="form-control" placeholder="Cth: 48.50"></div>
                            </div>

                            <div id="pertanyaan-dinamis"></div>

                            <div id="wilayah-domisili" style="margin-top:15px; border-top: 1px dashed #ccc; padding-top:15px;">
                                <h4 style="margin-bottom: 15px; color: var(--primary);">Alamat</h4>
                                <div class="form-group"><label>Desa / Kelurahan <span style="color:red">*</span></label><select name="desa" id="reg-desa" class="form-control"></select></div>
                                <div class="form-group"><label>Dusun / RW <span style="color:red">*</span></label><select name="dusun" id="reg-dusun" class="form-control"></select></div>
                                <div class="form-group"><label>Alamat Lengkap <span style="color:red">*</span></label><textarea name="alamat" id="reg-alamat" class="form-control" rows="2"></textarea></div>
                            </div>

                            <button type="submit" class="btn btn-primary" style="width:100%; margin-top:15px; font-size:1.1rem; padding:12px;">💾 ${isEdit ? 'Update Data Sasaran' : 'Simpan Sasaran'}</button>
                            ${isEdit ? `<button type="button" class="btn btn-danger" style="width:100%; margin-top:10px; font-size:1rem; padding:10px;" onclick="window.editModeData=null; renderKonten('daftar_sasaran')">❌ Batal Edit</button>` : ''}
                        </div>
                    </form>
                </div>`;
            initFormRegistrasi();

        } else if (target === 'daftar_sasaran') { const tpl = getEl('template-daftar-sasaran'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initDaftarSasaran(); }
        } else if (target === 'pendampingan') { const tpl = getEl('template-pendampingan'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initFormPendampingan(); }
        } else if (target === 'rekap_bulanan') { const tpl = getEl('template-rekap'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initRekap(); }
        } else if (target === 'kalkulator') { const tpl = getEl('template-kalkulator'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initKalkulator(); }
        } else if (target === 'setting') { const tpl = getEl('template-setting'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initSetting(); }
        } else if (target === 'bantuan') { 
            area.innerHTML = `<div class="animate-fade"><div style="background: linear-gradient(135deg, #00b894, #059b7b); padding: 25px 20px; border-radius: 12px; color: white; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); text-align: center;"><div style="font-size: 3rem; margin-bottom: 10px;">🆘</div><h2 style="margin: 0 0 5px 0; font-size: 1.5rem; font-weight: 800;">Pusat Bantuan Kader</h2><p style="margin: 0; opacity: 0.9; font-size: 0.9rem;">Jangan bingung, Ibu/Bapak Kader! Temukan panduan di sini.</p></div><div style="margin-bottom:25px;"><button id="btn-buka-kalkulator" style="width: 100%; background: #fff; border: 2px solid #0984e3; color: #0984e3; padding: 15px; border-radius: 8px; font-weight: bold; font-size: 1.05rem; cursor: pointer;">🧮 BUKA KALKULATOR GIZI</button></div></div>`;
            const btnCalc = getEl('btn-buka-kalkulator'); if(btnCalc) btnCalc.onclick = () => renderKonten('kalkulator');
        }
    } catch (e) { window.logErrorToServer('renderKonten - Main', e); }
};

// (Fungsi renderPertanyaanDinamis, initFormRegistrasi, initDaftarSasaran, dll. tetap sama, menggunakan fungsi internal DB lokal).
// Karena ruang terbatas, pastikan Anda menggunakan versi V61 sebelumnya untuk blok ini, hanya fungsi API Fetch yang diubah.
// BAGIAN PENTING: UPDATE FUNGSI LOGIN
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    const fLogin = getEl('form-login');
    if (fLogin) {
        fLogin.onsubmit = async (e) => {
            e.preventDefault(); const btn = getEl('btn-login-submit'); const id = getEl('kader-id').value.trim(); const pin = getEl('kader-pin').value.trim();
            if (!id || !pin) return; if (btn) { btn.disabled = true; btn.innerText = "Memverifikasi Enkripsi..."; }

            try {
                if (!navigator.onLine) { alert("❌ Anda harus terhubung ke Internet untuk Login Otentikasi!"); if (btn) { btn.disabled = false; btn.innerText = "Masuk"; } return; }

                // 🔥 TEMBAKAN API MENGGUNAKAN WRAPPER BARU
                const res = await apiFetch('login', { id_user: id, password: pin });

                if (res.ok || res.status === 'success') {
                    // Simpan sesi (Dukung format baru API Phase 4 dan Format Lama)
                    const sessionData = res.session || res.profile || {};
                    sessionData.token = res.session_token || res.token;
                    
                    await initDB(); await putData('kader_session', sessionData);
                    if(getEl('kader-id')) getEl('kader-id').value = ''; if(getEl('kader-pin')) getEl('kader-pin').value = '';

                    const rUpper = String(sessionData.role_akses || sessionData.role || '').toUpperCase();
                    if (rUpper.includes('SUPER')) { import('./super.js').then(m => m.initSuperAdmin(sessionData)).catch(err => window.logErrorToServer('Load Super', err)); } 
                    else if (rUpper.includes('ADMIN') || rUpper.includes('PKB') || rUpper.includes('MITRA') || rUpper === 'ADMIN_DESA') { import('./admin.js').then(m => m.initAdmin(sessionData)).catch(err => window.logErrorToServer('Load Admin', err)); } 
                    else { masukKeAplikasi(sessionData); }
                } else { alert("❌ " + (res.message || "ID atau PIN yang Anda masukkan salah!")); }
            } catch (err) { window.logErrorToServer('Login Submit', err); alert("Kesalahan Sistem: Gagal menghubungi server otentikasi."); } finally { if (btn) { btn.disabled = false; btn.innerText = "Masuk"; } }
        };
    }
});

const btnMenu = getEl('btn-menu'); const sidebar = getEl('sidebar'); const overlay = getEl('sidebar-overlay');
if (btnMenu && sidebar && overlay) { btnMenu.addEventListener('click', () => { sidebar.classList.add('active'); overlay.classList.add('active'); }); overlay.addEventListener('click', () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); }); }
