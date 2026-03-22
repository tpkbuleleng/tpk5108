import { initDB, putData, getDataById, deleteData, getAllData, clearStore } from './db.js';
import { downloadMasterData, uploadData } from './sync.js';
import { initAdmin } from './admin.js';

// 🔥 EKSPOS DATABASE KE GLOBAL
window.AppDB = { getAllData, getDataById, putData };
const getEl = (id) => document.getElementById(id);
const SCRIPT_URL_GLOBAL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';

// ==========================================
// 🔥 V30: SISTEM SARAF PERASA (SILENT ERROR TRACKER)
// ==========================================
window.logErrorToServer = (lokasiSistem, errObj) => {
    try {
        const username = window.currentUser ? window.currentUser.username : 'UNKNOWN';
        const perangkat = navigator.userAgent;
        const pesanError = typeof errObj === 'string' ? errObj : (errObj.message || String(errObj));
        
        fetch(SCRIPT_URL_GLOBAL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'LOG_ERROR', 
                id_pengguna: username, 
                lokasi_sistem: lokasiSistem, 
                perangkat: perangkat, 
                pesan_error: pesanError 
            })
        }).catch(e => {}); 
    } catch(e) {} 
};

// Penjaring Kesalahan Skala Global
window.addEventListener('error', function(event) { 
    window.logErrorToServer('Global Error (Frontend)', event.message || String(event.error)); 
});
window.addEventListener('unhandledrejection', function(event) { 
    window.logErrorToServer('Unhandled Promise (API/DB)', String(event.reason)); 
});

// ==========================================
// 0. INISIALISASI SETTING TAMPILAN
// ==========================================
const applySettings = () => {
    if(localStorage.getItem('theme') === 'dark') { 
        document.body.style.backgroundColor = '#121212'; 
        document.body.style.color = '#ffffff'; 
    } else { 
        document.body.style.backgroundColor = '#f0f4f8'; 
        document.body.style.color = '#333333'; 
    }
    let fontSize = localStorage.getItem('fontSize') || '16'; 
    document.documentElement.style.fontSize = fontSize + 'px';
};
applySettings();

const dapatkanLokasiGPS = async () => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) { 
            resolve("Browser tidak mendukung GPS"); 
            return; 
        }
        navigator.geolocation.getCurrentPosition(
            (position) => { resolve(`${position.coords.latitude}, ${position.coords.longitude}`); },
            (error) => { 
                let msg = "Gagal (Tidak Diketahui)"; 
                if (error.code === 1) msg = "Ditolak Pengguna"; 
                else if (error.code === 2) msg = "Sinyal GPS Hilang"; 
                else if (error.code === 3) msg = "Timeout Pencarian Satelit"; 
                resolve(msg); 
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 } 
        );
    });
};

const tampilkanLayar = (id) => {
    try {
        const vSplash = getEl('view-splash'); 
        const vLogin = getEl('view-login'); 
        const vApp = getEl('view-app');

        if (vSplash) { 
            vSplash.classList.remove('active'); 
            vSplash.style.display = 'none'; 
        }
        
        if (id === 'login') { 
            if (vLogin) vLogin.classList.remove('hidden'); 
            if (vApp) vApp.classList.add('hidden'); 
        } else if (id === 'app') { 
            if (vLogin) vLogin.classList.add('hidden'); 
            if (vApp) vApp.classList.remove('hidden'); 
        }
        updateNetworkStatus();
    } catch (e) { 
        window.logErrorToServer('tampilkanLayar', e); 
    }
};

const updateNetworkStatus = () => {
    const status = getEl('network-status');
    if (status) { 
        const isOnline = navigator.onLine; 
        status.innerText = isOnline ? 'Online' : 'Offline'; 
        status.style.backgroundColor = isOnline ? '#198754' : '#6c757d'; 
    }
};

// ==========================================
// 🔥 V42: ANTENA PENERIMA PENGUMUMAN (BROADCAST)
// ==========================================
const tampilkanPopUpPengumuman = (p, id_p) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(10, 35, 66, 0.85); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter: blur(5px);';
    
    const tgl = p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : 'Info Terbaru';
    
    overlay.innerHTML = `
        <div style="background:white; border-radius:16px; width:100%; max-width:400px; box-shadow:0 15px 35px rgba(0,0,0,0.4); overflow:hidden; animation: slideDownAlert 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <div style="background:linear-gradient(135deg, #0A2342 0%, #0043A8 100%); color:#F1C40F; padding:20px; text-align:center; border-bottom: 4px solid #F1C40F;">
                <div style="font-size:3rem; margin-bottom:5px; animation: ringBell 2s infinite;">📢</div>
                <h3 style="margin:0; font-size:1.3rem; font-weight:900; letter-spacing:1px;">PENGUMUMAN</h3>
            </div>
            <div style="padding:25px 20px;">
                <div style="font-size:0.8rem; color:#888; text-align:center; margin-bottom:10px; font-weight:bold;">🕒 ${tgl}</div>
                <h4 style="margin:0 0 15px 0; color:#0A2342; text-align:center; font-size:1.2rem; font-weight:800;">${p.judul}</h4>
                <div style="font-size:1rem; color:#444; line-height:1.6; margin-bottom:25px; text-align:center; white-space:pre-wrap; background:#f8f9fa; padding:15px; border-radius:8px; border:1px dashed #ccc;">${p.isi_pesan}</div>
                <button id="btn-mengerti-${id_p}" style="width:100%; background:#F1C40F; color:#0A2342; border:none; padding:15px; border-radius:8px; font-weight:900; font-size:1.1rem; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1); transition: transform 0.1s;">✅ SAYA MENGERTI</button>
            </div>
        </div>
        <style>
            @keyframes slideDownAlert { from { transform:translateY(-50px) scale(0.9); opacity:0; } to { transform:translateY(0) scale(1); opacity:1; } }
            @keyframes ringBell { 0% { transform: rotate(0); } 10% { transform: rotate(15deg); } 20% { transform: rotate(-10deg); } 30% { transform: rotate(5deg); } 40% { transform: rotate(-5deg); } 50% { transform: rotate(0); } 100% { transform: rotate(0); } }
        </style>
    `;
    document.body.appendChild(overlay);

    document.getElementById(`btn-mengerti-${id_p}`).onclick = () => {
        localStorage.setItem(`read_info_${id_p}`, 'true');
        document.body.removeChild(overlay);
        cekPengumuman(window.currentUser.role); // Cek apakah ada pengumuman lain yang antre
    };
};

const cekPengumuman = async (userRole) => {
    try {
        const pengumuman = await getAllData('master_pengumuman').catch(() => []);
        if (!pengumuman || pengumuman.length === 0) return;

        const activePengumuman = pengumuman.filter(p => 
            String(p.is_active || 'Y').toUpperCase() === 'Y' &&
            (p.target_role === 'SEMUA' || String(p.target_role).toUpperCase() === String(userRole).toUpperCase())
        ).sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)); // Yang terbaru duluan

        for (const p of activePengumuman) {
            const id_p = p.id_pengumuman || p.id || 'unknown_id';
            const isRead = localStorage.getItem(`read_info_${id_p}`);
            if (!isRead) {
                tampilkanPopUpPengumuman(p, id_p);
                break; // Tampilkan satu per satu, tidak langsung berjejer
            }
        }
    } catch (e) { 
        window.logErrorToServer('cekPengumuman', e); 
    }
};

// ==========================================
// 2. INISIALISASI APLIKASI & ROUTER PINTAR
// ==========================================
const initApp = async () => {
    try {
        await initDB();
        const session = await getDataById('kader_session', 'active_user');
        
        const vSplash = document.getElementById('view-splash'); 
        const vLogin = document.getElementById('view-login'); 
        const vApp = document.getElementById('view-app');

        if (session) {
            const roleUpper = String(session.role).toUpperCase();
            
            if (roleUpper.includes('SUPER')) {
                import('./super.js')
                    .then(module => { module.initSuperAdmin(session); })
                    .catch(err => { 
                        alert("Modul Super Admin tidak ditemukan!"); 
                        window.logErrorToServer('Load Super Module', err); 
                    });
            } 
            else if (roleUpper.includes('ADMIN') || roleUpper.includes('PKB') || roleUpper.includes('MITRA') || roleUpper === 'ADMIN_DESA') {
                if (typeof initAdmin === 'function') { 
                    initAdmin(session); 
                } else { 
                    import('./admin.js')
                        .then(module => module.initAdmin(session))
                        .catch(err => window.logErrorToServer('Load Admin Module', err)); 
                }
            } 
            else { 
                masukKeAplikasi(session); 
            }
        } else {
            if(vSplash) vSplash.style.display = 'none';
            if(vApp) vApp.classList.add('hidden');
            if(vLogin) vLogin.classList.remove('hidden');
        }
    } catch (e) { 
        window.logErrorToServer('initApp', e); 
    }
};

const masukKeAplikasi = async (session) => {
    try {
        window.currentUser = session;
        const allWil = await getAllData('master_tim_wilayah').catch(() => []);
        const wilayahKader = allWil.find(w => String(w.id_tim) === String(session.id_tim));
        const namaKec = wilayahKader && wilayahKader.kecamatan ? wilayahKader.kecamatan.toUpperCase() : (session.kecamatan || "BULELENG");

        const greeting = getEl('user-greeting');
        if (greeting) { 
            greeting.innerHTML = `DASHBOARD KADER<br>KECAMATAN ${namaKec}`; 
            greeting.style.textAlign = 'center'; 
            greeting.style.lineHeight = '1.15'; 
            greeting.style.fontSize = '1.05rem'; 
        }
        
        const hInfo = document.querySelector('.header-info');
        if (hInfo) { 
            hInfo.style.display = 'flex'; 
            hInfo.style.alignItems = 'center'; 
            hInfo.style.gap = '12px'; 
            hInfo.style.flexDirection = 'row-reverse'; 
        }

        if (getEl('sidebar-nama')) getEl('sidebar-nama').innerText = session.nama;
        if (getEl('sidebar-role')) getEl('sidebar-role').innerText = session.role;

        renderMenu(session.role); 
        renderKonten('dashboard'); 
        tampilkanLayar('app');

        // 🔥 TRIGGER RADAR PENGUMUMAN SETELAH DASHBOARD MUNCUL
        setTimeout(() => { cekPengumuman(session.role); }, 800);

    } catch (e) { 
        window.logErrorToServer('masukKeAplikasi', e); 
    }
};

// ==========================================
// 3. PABRIK SUB-MENU (STANDAR KADER ONLY)
// ==========================================
const renderMenu = async (role) => {
    const container = getEl('dynamic-menu-container'); 
    if (!container) return;
    
    let allMenu = [];
    const rUpper = String(role).toUpperCase();

    // 🔥 KUNCI MATI MENU KADER (ABAIKAN DATABASE MASTER MENU)
    if (rUpper === 'KADER') {
        allMenu = [
            { id_menu: 'M1', label_menu: 'Dashboard', icon: '🏠', target_view: 'dashboard', role_akses: 'KADER', urutan: 1, is_active: 'Y' },
            { id_menu: 'M2', label_menu: 'Registrasi Sasaran', icon: '📝', target_view: 'registrasi', role_akses: 'KADER', urutan: 2, is_active: 'Y' },
            { id_menu: 'M3', label_menu: 'Data Sasaran & Riwayat', icon: '📋', target_view: 'daftar_sasaran', role_akses: 'KADER', urutan: 3, is_active: 'Y' },
            { id_menu: 'M4', label_menu: 'Laporan Pendampingan', icon: '🤝', target_view: 'pendampingan', role_akses: 'KADER', urutan: 4, is_active: 'Y' },
            { id_menu: 'M5', label_menu: 'Rekap Bulanan', icon: '📊', target_view: 'rekap_bulanan', role_akses: 'KADER', urutan: 5, is_active: 'Y' },
            { id_menu: 'M6', label_menu: 'Bantuan & FAQ', icon: '🆘', target_view: 'bantuan', role_akses: 'KADER', urutan: 6, is_active: 'Y' },
            { id_menu: 'M7', label_menu: 'Pengaturan Akun', icon: '⚙️', target_view: 'setting', role_akses: 'KADER', urutan: 7, is_active: 'Y' },
            { id_menu: 'M8', label_menu: 'Muat Ulang Aplikasi', icon: '🔁', target_view: 'reload_app', role_akses: 'KADER', urutan: 8, is_active: 'Y' }
        ];
    } else {
        // Untuk role lain, tarik dari database master_menu
        allMenu = await getAllData('master_menu').catch(()=>[]);
        // Fallback jika kosong untuk non-kader
        if (allMenu.length === 0) {
            allMenu = [
                { id_menu: 'M1', label_menu: 'Dashboard', icon: '🏠', target_view: 'dashboard', role_akses: role, urutan: 1, is_active: 'Y' },
                { id_menu: 'M8', label_menu: 'Muat Ulang Aplikasi', icon: '🔁', target_view: 'reload_app', role_akses: role, urutan: 8, is_active: 'Y' }
            ];
        }
    }

    const filteredMenu = allMenu.filter(m => {
        const roles = String(m.role_akses || '').toUpperCase();
        const isActive = String(m.is_active || 'Y').toUpperCase() === 'Y';
        return isActive && roles.includes(rUpper);
    }).sort((a,b) => (parseInt(a.urutan)||0) - (parseInt(b.urutan)||0));

    const parents = filteredMenu.filter(m => !m.parent_id);
    const children = filteredMenu.filter(m => m.parent_id);

    let menuHtml = '';
    parents.forEach(p => {
        const myChildren = children.filter(c => c.parent_id === p.id_menu).sort((a,b) => (parseInt(a.urutan)||0) - (parseInt(b.urutan)||0));
        
        if(myChildren.length > 0) {
            menuHtml += `
                <div style="margin-bottom: 2px;">
                    <a class="menu-item" style="display:flex; justify-content:space-between; align-items:center;" 
                       onclick="var c = this.nextElementSibling; if(c.style.display==='none'){c.style.display='block'; this.style.background='rgba(0,0,0,0.05)';}else{c.style.display='none'; this.style.background='';}">
                        <span><span class="icon">${p.icon || '📁'}</span> ${p.label_menu}</span>
                        <span style="font-size:0.7rem; opacity:0.6;">▼</span>
                    </a>
                    <div style="display:none; background: rgba(0,0,0,0.03); border-left: 3px solid var(--primary);">
                        ${myChildren.map(c => `
                            <a class="menu-item" style="padding-left: 45px; font-size:0.9rem;" data-target="${c.target_view}">
                                <span class="icon">${c.icon || '📄'}</span> ${c.label_menu}
                            </a>
                        `).join('')}
                    </div>
                </div>`;
        } else {
            menuHtml += `<a class="menu-item" data-target="${p.target_view}"><span class="icon">${p.icon || '📌'}</span> ${p.label_menu}</a>`;
        }
    });

    container.innerHTML = menuHtml + `<hr><a class="menu-item text-danger" id="btnLogout">🚪 Keluar (Hapus Sesi Lokal)</a>`;
    container.style.overflowY = 'auto'; 
    container.style.maxHeight = 'calc(100vh - 180px)'; 
    container.style.paddingBottom = '20px';

    document.querySelectorAll('.menu-item[data-target]').forEach(item => {
        item.onclick = () => {
            getEl('sidebar').classList.remove('active'); 
            getEl('sidebar-overlay').classList.remove('active');
            
            const target = item.getAttribute('data-target');
            if (target === 'reload_app') { 
                location.reload(true); 
            } else if (target) { 
                window.editModeData = null; 
                window.editModeLaporan = null; 
                renderKonten(target); 
            }
        };
    });

    if (getEl('btnLogout')) { 
        getEl('btnLogout').onclick = async () => { 
            if (confirm("🔴 PERINGATAN: Ini akan mengeluarkan Anda dan MENGHAPUS SEMUA DATA UJI COBA (Sasaran & Laporan) di memori HP Anda.\n\nApakah Anda yakin ingin mereset aplikasi?")) { 
                await clearStore('kader_session'); 
                await clearStore('sync_queue'); 
                location.reload(true); 
            } 
        }; 
    }
};

window.mulaiSinkronisasiDashboard = async () => {
    try {
        const icon = getEl('icon-sync-dash'); 
        const text = getEl('text-sync-dash'); 
        const card = getEl('card-sync-dashboard');
        
        if (!navigator.onLine) { 
            console.warn("⚠️ Sinyal internet dilaporkan mati oleh sistem operasi, namun aplikasi tetap akan mencoba menembus koneksi server."); 
        }
        
        if(icon) icon.innerHTML = '⏳'; 
        if(text) { text.innerHTML = 'SINKRONISASI...'; text.style.color = '#dc3545'; } 
        if(card) card.style.pointerEvents = 'none';
        
        if(window.jalankanSinkronisasi) { 
            await window.jalankanSinkronisasi(); 
        } else { 
            alert("Sistem sinkronisasi belum siap. Memuat ulang..."); 
            location.reload(); 
        }
    } catch (e) { 
        window.logErrorToServer('mulaiSinkronisasiDashboard', e); 
    }
};

window.renderKonten = async (target) => {
    const area = getEl('content-area'); 
    if (!area) return; 
    area.innerHTML = '';

    try {
        if (target === 'dashboard') {
            const session = window.currentUser;
            area.innerHTML = `
                <div class="animate-fade">
                    <div class="card" style="background: linear-gradient(135deg, #0d6efd, #0043a8); color: white; border:none; margin-bottom: 20px; padding: 20px;">
                        <p style="margin:0; opacity: 0.9; font-weight: 800; font-size: 0.85rem;">SELAMAT DATANG,</p>
                        <h2 style="margin: 3px 0 10px 0; font-size: 1.4rem; font-weight: 700; line-height: 1.2; text-transform:uppercase;">${session.nama}</h2>
                        <hr style="margin-bottom: 12px; border: 0; border-top: 1px solid rgba(255,255,255,0.2);">
                        <div id="dash-detail-wilayah">Memuat detail...</div>
                    </div>
                    
                    <div id="dash-summary" style="background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #eee;">
                        Memuat ringkasan data...
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <div class="card" style="text-align:center; padding: 15px 5px; cursor:pointer; border-bottom: 4px solid #0d6efd;" onclick="renderKonten('registrasi')">
                            <div style="font-size: 1.6rem;">📝</div>
                            <h3 style="font-size: 0.95rem; margin: 5px 0 0 0;">BARU</h3>
                            <p style="font-size: 0.65rem; color: #666; font-weight: bold; margin: 2px 0 0 0;">REGISTRASI</p>
                        </div>
                        <div class="card" id="card-sync-dashboard" style="text-align:center; padding: 15px 5px; cursor:pointer; border-bottom: 4px solid orange; background:#fffdf8;" onclick="window.mulaiSinkronisasiDashboard()">
                            <div id="icon-sync-dash" style="font-size: 1.6rem;">🔄</div>
                            <h3 id="dash-tunda" style="font-size: 1rem; margin: 5px 0 0 0;">0/0</h3>
                            <p id="text-sync-dash" style="font-size: 0.65rem; color: #d63384; font-weight: bold; margin: 2px 0 0 0;">KLIK SINKRON</p>
                        </div>
                        <div class="card" style="text-align:center; padding: 15px 5px; cursor:pointer; border-bottom: 4px solid #198754;" onclick="renderKonten('pendampingan')">
                            <div style="font-size: 1.6rem;">🤝</div>
                            <h3 style="font-size: 0.95rem; margin: 5px 0 0 0;">LAPOR</h3>
                            <p style="font-size: 0.65rem; color: #666; font-weight: bold; margin: 2px 0 0 0;">PENDAMPINGAN</p>
                        </div>
                    </div>
                </div>`;

            try {
                const [allWil, allTim, antrean] = await Promise.all([ 
                    getAllData('master_tim_wilayah').catch(()=>[]), 
                    getAllData('master_tim').catch(()=>[]), 
                    getAllData('sync_queue').catch(()=>[]) 
                ]);
                
                let namaDesa = session.desa && session.desa !== '-' && String(session.desa).toLowerCase() !== 'undefined' ? session.desa : '-'; 
                let daftarDusun = session.dusun && session.dusun !== '-' && String(session.dusun).toLowerCase() !== 'undefined' ? session.dusun : '-';
                
                if (daftarDusun === '-' || !daftarDusun) { 
                    const wilayahKerja = allWil.filter(w => String(w.id_tim) === String(session.id_tim)); 
                    if (wilayahKerja.length > 0) { 
                        daftarDusun = [...new Set(wilayahKerja.map(w => w.dusun_rw || w.dusun).filter(Boolean))].join(', '); 
                    } else { 
                        const timData = allTim.find(t => String(t.id_tim) === String(session.id_tim) || String(t.id) === String(session.id_tim)); 
                        if (timData) daftarDusun = timData.dusun_rw || timData.dusun || '-'; 
                    } 
                }
                
                if (namaDesa === '-' || !namaDesa) { 
                    const wilayahKerja = allWil.filter(w => String(w.id_tim) === String(session.id_tim)); 
                    if (wilayahKerja.length > 0) { 
                        namaDesa = wilayahKerja[0]?.desa_kelurahan || wilayahKerja[0]?.desa || '-'; 
                    } else { 
                        const timData = allTim.find(t => String(t.id_tim) === String(session.id_tim) || String(t.id) === String(session.id_tim)); 
                        if (timData) namaDesa = timData.desa_kelurahan || timData.desa || '-'; 
                    } 
                }

                if (getEl('dash-detail-wilayah')) { 
                    getEl('dash-detail-wilayah').innerHTML = `
                        <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; margin-bottom: 12px;">
                            NO. TIM: ${session.nomor_tim || session.id_tim}
                        </div>
                        <div style="line-height: 1.25;">
                            <div style="margin-bottom: 6px;">
                                <span style="opacity:0.8; font-size: 0.8rem;">📍 Wilayah Tugas (Dusun/RW):</span><br>
                                <span style="font-weight: 600; font-size: 0.9rem;">${daftarDusun}</span>
                            </div>
                            <div style="margin-bottom: 6px;">
                                <span style="opacity:0.8; font-size: 0.8rem;">🏘️ Desa/Kelurahan:</span><br>
                                <span style="font-weight: 600; font-size: 0.9rem;">${namaDesa}</span>
                            </div>
                            <div>
                                <span style="opacity:0.8; font-size: 0.8rem;">🏛️ Kecamatan:</span><br>
                                <span style="font-weight: 600; font-size: 0.9rem;">${session.kecamatan || '-'}</span>
                            </div>
                        </div>`; 
                }
                
                const queueTim = antrean.filter(a => String(a.id_tim) === String(session.id_tim));
                if (getEl('dash-tunda')) {
                    getEl('dash-tunda').innerText = `${queueTim.filter(a => a.is_synced).length}/${queueTim.filter(a => !a.is_synced).length}`;
                }
                
                const regList = queueTim.filter(a => a.tipe_laporan === 'REGISTRASI'); 
                const pendList = queueTim.filter(a => a.tipe_laporan === 'PENDAMPINGAN');
                
                const cReg = { CATIN: 0, BUMIL: 0, BUFAS: 0, BADUTA: 0 }; 
                const cPend = { CATIN: 0, BUMIL: 0, BUFAS: 0, BADUTA: 0 }; 
                const hariIni = new Date(); 
                hariIni.setHours(0,0,0,0);
                
                regList.forEach(r => { 
                    let isAktif = r.status_sasaran !== 'SELESAI'; 
                    if (r.jenis_sasaran === 'CATIN' && r.data_laporan?.tanggal_pernikahan && new Date(r.data_laporan.tanggal_pernikahan) < hariIni) isAktif = false; 
                    if (r.jenis_sasaran === 'BUFAS' && r.data_laporan?.tgl_persalinan) { 
                        const tB = new Date(r.data_laporan.tgl_persalinan); 
                        tB.setDate(tB.getDate() + 42); 
                        if (hariIni > tB) isAktif = false; 
                    } 
                    if(cReg[r.jenis_sasaran] !== undefined && isAktif) cReg[r.jenis_sasaran]++; 
                });
                
                pendList.forEach(p => { 
                    let j = p.jenis_sasaran_saat_kunjungan || (p.id_sasaran_ref.startsWith('CTN')?'CATIN':p.id_sasaran_ref.startsWith('BML')?'BUMIL':p.id_sasaran_ref.startsWith('BFS')?'BUFAS':'BADUTA'); 
                    if(cPend[j] !== undefined) cPend[j]++; 
                });
                
                if(getEl('dash-summary')){ 
                    getEl('dash-summary').innerHTML = `
                        <h4 style="font-size: 0.95rem; color: #555; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">📊 Total Data Kumulatif</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem;">
                            <div>
                                <strong style="color:var(--primary);">🎯 Sasaran Terdaftar</strong>
                                <ul style="margin: 5px 0 0 15px; padding: 0; color: #444; list-style-type: square;">
                                    <li>CATIN: <b>${cReg.CATIN}</b></li>
                                    <li>BUMIL: <b>${cReg.BUMIL}</b></li>
                                    <li>BUFAS: <b>${cReg.BUFAS}</b></li>
                                    <li>BADUTA: <b>${cReg.BADUTA}</b></li>
                                </ul>
                            </div>
                            <div>
                                <strong style="color:#198754;">🤝 Kunjungan Pendampingan</strong>
                                <ul style="margin: 5px 0 0 15px; padding: 0; color: #444; list-style-type: square;">
                                    <li>CATIN: <b>${cPend.CATIN}</b></li>
                                    <li>BUMIL: <b>${cPend.BUMIL}</b></li>
                                    <li>BUFAS: <b>${cPend.BUFAS}</b></li>
                                    <li>BADUTA: <b>${cPend.BADUTA}</b></li>
                                </ul>
                            </div>
                        </div>`; 
                }
            } catch (e) { window.logErrorToServer('renderKonten - dashboard', e); }

        } else if (target === 'registrasi') {
            const isEdit = window.editModeData != null; 
            const eLabel = isEdit ? `Mengedit Data Sasaran` : `Registrasi Sasaran Baru`;
            area.innerHTML = `
                <div class="animate-fade">
                    <h3 style="margin:0; color:var(--primary); font-size:1.3rem;">📝 ${eLabel}</h3>
                    ${isEdit ? `<div style="background:#fff3cd; padding:10px; border-radius:5px; margin-bottom:15px; font-size:0.85rem; color:#856404;"><b>Info:</b> ID Sasaran dan Jenis Sasaran tidak dapat diubah.</div>` : ''}
                    <form id="form-registrasi" style="background:#fff; padding:15px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                        <div class="form-group">
                            <label style="font-weight:bold;">Jenis Sasaran <span style="color:red">*</span></label>
                            <select name="jenis_sasaran" id="reg-jenis" class="form-control" required ${isEdit ? 'disabled' : ''}>
                                <option value="">-- Pilih Jenis Sasaran --</option>
                                <option value="CATIN">Calon Pengantin (CATIN)</option>
                                <option value="BUMIL">Ibu Hamil (BUMIL)</option>
                                <option value="BUFAS">Ibu Nifas (BUFAS)</option>
                                <option value="BADUTA">Anak Baduta (0-23 Bulan)</option>
                            </select>
                        </div>
                        <div id="form-core" style="display:none; margin-top:15px;">
                            
                            <div id="box-sasaran-inti" style="background:#e8f4fd; padding:15px; border-radius:8px; border-left:4px solid var(--primary); margin-bottom:15px;">
                                <h4 style="margin:0 0 15px 0; color:var(--primary); font-size:1rem;">Identitas Pokok Sasaran</h4>
                                <div class="form-group"><label>Nama Sasaran <span style="color:red">*</span></label><input type="text" name="nama_sasaran" id="f_nama" class="form-control" required></div>
                                <div class="form-group"><label>NIK Sasaran <span style="color:red">*</span></label><input type="text" name="nik" id="f_nik" class="form-control" pattern="[0-9]{16}" title="NIK harus 16 digit angka" maxlength="16" minlength="16" oninput="this.value=this.value.replace(/[^0-9]/g,'')" placeholder="16 digit angka" required></div>
                                <div class="form-group"><label>Nama Kepala Keluarga <span style="color:red">*</span></label><input type="text" name="nama_kk" id="f_kk_nama" class="form-control" required></div>
                                <div class="form-group"><label>Nomor KK <span style="color:red">*</span></label><input type="text" name="nomor_kk" id="f_kk_no" class="form-control" pattern="[0-9]{16}" title="Nomor KK harus 16 digit angka" maxlength="16" minlength="16" oninput="this.value=this.value.replace(/[^0-9]/g,'')" placeholder="16 digit angka" required></div>
                                <div class="form-group"><label>Tanggal Lahir Sasaran <span style="color:red">*</span></label><input type="date" name="tanggal_lahir" id="f_tgl" class="form-control" required></div>
                                <div class="form-group"><label>Jenis Kelamin <span style="color:red">*</span></label><select name="jenis_kelamin" id="reg-jk" class="form-control" required><option value="">-- Pilih --</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></div>
                            </div>

                            <div id="pertanyaan-dinamis"></div>

                            <div id="wilayah-domisili" style="margin-top:15px; border-top: 1px dashed #ccc; padding-top:15px;">
                                <div class="form-group"><label>Desa / Kelurahan <span style="color:red">*</span></label><select name="desa" id="reg-desa" class="form-control"></select></div>
                                <div class="form-group"><label>Dusun / RW <span style="color:red">*</span></label><select name="dusun" id="reg-dusun" class="form-control"></select></div>
                                <div class="form-group"><label>Alamat Lengkap <span style="color:red">*</span></label><textarea name="alamat" id="reg-alamat" class="form-control" rows="2"></textarea></div>
                            </div>

                            <div id="wilayah-catin" style="display:none; padding:10px; background:#e8f4fd; border-radius:6px; border:1px solid #b6d4fe; margin-top:15px;">
                                <label style="font-weight:bold; color:var(--primary); margin-bottom:10px; display:block;">📍 Alamat Domisili Setelah Menikah</label>
                                <div class="form-group"><label>Kabupaten/Kota <span style="color:red">*</span></label><select name="catin_kab" id="catin-kab" class="form-control"></select></div>
                                <div class="form-group"><label>Kecamatan <span style="color:red">*</span></label><select name="catin_kec" id="catin-kec" class="form-control"></select></div>
                                <div class="form-group"><label>Desa/Kelurahan <span style="color:red">*</span></label><select name="catin_desa" id="catin-desa" class="form-control"></select></div>
                                <div class="form-group"><label>Dusun / RW <span style="color:red">*</span></label><select id="catin-dusun-sel" class="form-control" style="display:none;"></select><input type="text" id="catin-dusun-txt" class="form-control" placeholder="Ketik nama Dusun/RW..."></div>
                                <div class="form-group"><label>Alamat Lengkap <span style="color:red">*</span></label><textarea name="catin_alamat" id="catin-alamat" class="form-control" rows="2"></textarea></div>
                            </div>

                            <button type="submit" class="btn btn-primary" style="width:100%; margin-top:15px; font-size:1.1rem; padding:12px;">💾 ${isEdit ? 'Update Data Sasaran' : 'Simpan Sasaran'}</button>
                            ${isEdit ? `<button type="button" class="btn btn-danger" style="width:100%; margin-top:10px; font-size:1rem; padding:10px;" onclick="window.editModeData=null; renderKonten('daftar_sasaran')">❌ Batal Edit</button>` : ''}
                        </div>
                    </form>
                </div>`;
            initFormRegistrasi();

        } else if (target === 'daftar_sasaran') { 
            const tpl = getEl('template-daftar-sasaran'); 
            if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initDaftarSasaran(); }
        } else if (target === 'pendampingan') { 
            const tpl = getEl('template-pendampingan'); 
            if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initFormPendampingan(); }
        } else if (target === 'rekap_bulanan') { 
            const tpl = getEl('template-rekap'); 
            if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initRekap(); }
        } else if (target === 'kalkulator') { 
            const tpl = getEl('template-kalkulator'); 
            if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initKalkulator(); }
        } else if (target === 'cetak_pdf') { 
            const tpl = getEl('template-cetak-pdf'); 
            if(tpl) area.appendChild(tpl.content.cloneNode(true));
        } else if (target === 'setting') { 
            const tpl = getEl('template-setting'); 
            if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initSetting(); }
        } else if (target === 'bantuan') { 
            area.innerHTML = `
                <div class="animate-fade">
                    <div style="background: linear-gradient(135deg, #00b894, #059b7b); padding: 25px 20px; border-radius: 12px; color: white; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 10px;">🆘</div>
                        <h2 style="margin: 0 0 5px 0; font-size: 1.5rem; font-weight: 800;">Pusat Bantuan Kader</h2>
                        <p style="margin: 0; opacity: 0.9; font-size: 0.9rem;">Jangan bingung, Ibu/Bapak Kader! Temukan semua jawaban dari kendala aplikasi di sini.</p>
                    </div>

                    <div style="margin-bottom:20px;">
                        <button id="btn-buka-kalkulator" style="width: 100%; background: #fff; border: 2px solid #0984e3; color: #0984e3; padding: 15px; border-radius: 8px; font-weight: bold; font-size: 1.05rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 2px 4px rgba(9, 132, 227, 0.1);">
                            🧮 BUKA KALKULATOR GIZI & HPL
                        </button>
                    </div>

                    <h3 style="color:#2c3e50; font-size:1.1rem; margin-bottom:15px; padding-bottom:5px; border-bottom:2px solid #eee;">❓ Pertanyaan Sering Ditanya (FAQ)</h3>

                    <div class="faq-container">
                        <button class="faq-question">🔄 Apa fungsi tombol "SINKRONISASI"?</button>
                        <div class="faq-answer">
                            <p>Tombol <b>SINKRONISASI</b> itu ibarat "Tukang Pos".</p>
                            <p>Aplikasi ini dirancang bisa bekerja tanpa sinyal (Offline). Jadi, data yang Ibu masukkan akan disimpan dulu di dalam HP.</p>
                            <p><b>Cara pakainya:</b><br>
                            1. Saat ada sinyal (di balai desa/rumah), tekan SINKRONISASI untuk mengirim data Ibu ke dinas.<br>
                            2. Jika angka di tombol sudah berubah menjadi <b>0/0</b>, artinya semua data sudah aman terkirim!</p>
                        </div>

                        <button class="faq-question">📡 Bagaimana jika saat mendata warga sinyal saya hilang?</button>
                        <div class="faq-answer">
                            <p><b>Lanjut saja mendata, Bu! Tidak perlu panik.</b> 😊</p>
                            <p>Aplikasi ini kebal terhadap sinyal hilang. Isi form seperti biasa lalu klik "Simpan". Data akan aman tertidur di HP Ibu. Nanti pas sudah sampai di tempat yang ada sinyal / WiFi, tinggal klik SINKRONISASI.</p>
                        </div>

                        <button class="faq-question">📍 Kenapa saya disuruh menyalakan Lokasi (GPS)?</button>
                        <div class="faq-answer">
                            <p>Sistem akan meminta izin lokasi Ibu tepat saat tombol "Simpan" ditekan.</p>
                            <p>Ini digunakan sebagai <b>Bukti Digital (CCTV Lapangan)</b> bahwa Ibu benar-benar turun ke rumah warga saat melakukan pendampingan, bukan mengisi data dari rumah. Cukup klik "Izinkan" atau "Allow" jika HP meminta izin ya!</p>
                        </div>

                        <button class="faq-question">🤰 BUMIL yang saya dampingi sudah melahirkan, bagaimana cara lapornya?</button>
                        <div class="faq-answer">
                            <p>Wah, selamat! Caranya sangat mudah:</p>
                            <ol style="padding-left:20px; margin-top:5px;">
                                <li>Buka menu <b>Lapor Pendampingan</b>.</li>
                                <li>Pilih nama BUMIL tersebut.</li>
                                <li>Akan muncul pertanyaan: <i>"Apakah BUMIL sudah melahirkan?"</i></li>
                                <li>Pilih <b>YA</b>, lalu masukkan tanggal lahir si bayi.</li>
                            </ol>
                            <p>Selesai! Sistem akan otomatis mematikan kartu BUMIL-nya, dan membuatkan kartu <b>BUFAS (Ibu Nifas)</b> baru secara otomatis untuk Ibu dampingi selanjutnya.</p>
                        </div>

                        <button class="faq-question">📉 Jika hasil ukur Baduta berwarna Merah, apa artinya?</button>
                        <div class="faq-answer">
                            <p>Aplikasi ini sudah ditanami otak pintar buatan Kemenkes RI.</p>
                            <p>Jika saat Ibu memasukkan Berat dan Tinggi anak lalu muncul warna <b>Merah (Kekurangan Gizi / Pendek)</b>, itu adalah alarm peringatan (Warning)! 🚨</p>
                            <p>Segera sarankan orang tua bayi untuk membawa anaknya ke Posyandu atau Bidan Desa terdekat hari itu juga untuk mendapat pemeriksaan medis.</p>
                        </div>

                        <button class="faq-question">✏️ Saya salah ketik nama/data, apakah bisa diperbaiki?</button>
                        <div class="faq-answer">
                            <p>Sangat bisa! Kesalahan adalah hal yang wajar.</p>
                            <p>Buka menu <b>Data Sasaran & Riwayat</b>, cari nama warga yang salah, klik namanya, lalu klik tulisan biru <b>✏️ (edit)</b> di pojok kanan atas nama mereka.</p>
                            <p style="color:#d63384; font-size:0.85rem;"><b>Catatan:</b> Jika data sudah terlanjur di-Sinkronisasi ke pusat, Ibu tetap bisa mengeditnya. Nanti sistem akan otomatis menimpa data yang lama di Dinas.</p>
                        </div>
                    </div>

                    <div style="margin-top:30px; text-align:center; padding:15px; background:#f8f9fa; border-radius:8px; border: 1px dashed #ccc;">
                        <p style="margin:0; font-size:0.85rem; color:#666;">Masih kebingungan?<br>Silakan hubungi <b>Admin Kecamatan</b> atau <b>PKB (Penyuluh KB)</b> di wilayah Ibu.</p>
                    </div>
                </div>

                <style>
                    .faq-question { background-color: #fff; color: #333; cursor: pointer; padding: 18px; width: 100%; text-align: left; border: 1px solid #ddd; border-radius: 8px; outline: none; transition: 0.3s; font-weight: bold; font-size: 0.95rem; margin-bottom: 8px; display: flex; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                    .faq-question:hover { background-color: #f1f7fd; border-color: #0984e3; }
                    .faq-question.active { background-color: #0984e3; color: white; border-color: #0984e3; }
                    .faq-answer { padding: 0 18px; display: none; background-color: #fdfdfd; overflow: hidden; border-left: 3px solid #0984e3; border-bottom: 1px solid #eee; border-right: 1px solid #eee; border-radius: 0 0 8px 8px; margin-top: -8px; margin-bottom: 15px; font-size: 0.9rem; line-height: 1.6; color: #444; padding-top: 15px; padding-bottom: 15px; box-shadow: 0 2px 3px rgba(0,0,0,0.05); }
                    .faq-answer p { margin-top: 0; margin-bottom: 10px; }
                </style>
            `;

            document.querySelectorAll('.faq-question').forEach(btn => {
                btn.onclick = () => {
                    btn.classList.toggle('active');
                    const panel = btn.nextElementSibling;
                    if (panel.style.display === "block") { panel.style.display = "none"; } 
                    else { panel.style.display = "block"; }
                }
            });
            const btnCalc = getEl('btn-buka-kalkulator'); 
            if(btnCalc) btnCalc.onclick = () => renderKonten('kalkulator');
        }

        try {
            const allWidgets = await getAllData('master_widget').catch(()=>[]);
            const activeWidgets = allWidgets.filter(w => String(w.is_active || 'Y').toUpperCase() === 'Y' && String(w.target_halaman).toLowerCase() === target.toLowerCase());
            
            if (activeWidgets.length > 0) {
                let htmlAtas = ''; let htmlBawah = '';
                activeWidgets.forEach(w => {
                    const content = w.tipe === 'html' ? w.isi_konten : `<div style="background:#fff3cd; padding:12px; border-radius:6px; border-left:4px solid #ffc107; font-size:0.9rem; color:#856404; margin-bottom:15px; line-height:1.4;">${w.isi_konten}</div>`;
                    if(w.posisi === 'bawah') htmlBawah += `<div style="margin-top:15px; width:100%;">${content}</div>`;
                    else htmlAtas += `<div style="margin-bottom:15px; width:100%;">${content}</div>`;
                });

                const injectAndExecute = (htmlString, position) => {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = htmlString;
                    const scripts = tempDiv.querySelectorAll('script');
                    scripts.forEach(s => {
                        const newScript = document.createElement('script');
                        newScript.text = s.innerHTML;
                        s.parentNode.removeChild(s); 
                        document.body.appendChild(newScript);
                    });
                    if(position === 'atas') { 
                        while(tempDiv.firstChild) area.insertBefore(tempDiv.firstChild, area.firstChild); 
                    } else { 
                        while(tempDiv.firstChild) area.appendChild(tempDiv.firstChild); 
                    }
                };

                if(htmlAtas) injectAndExecute(htmlAtas, 'atas');
                if(htmlBawah) injectAndExecute(htmlBawah, 'bawah');
            }
        } catch(e) { window.logErrorToServer('renderKonten - Widget Inject', e); }
    } catch (e) { window.logErrorToServer('renderKonten - Main', e); }
};

// ==========================================
// 4. LOGIKA KUESIONER DINAMIS (CASCADING & KONDISIONAL)
// ==========================================
const getKodeKecamatan = (kec) => {
    if (!kec) return "XXX";
    const map = { 'GEROKGAK': 'GRK', 'SERIRIT': 'SRT', 'BUSUNGBIU': 'BSB', 'BANJAR': 'BJR', 'SUKASADA': 'SKS', 'BULELENG': 'BLL', 'SAWAN': 'SWN', 'KUBUTAMBAHAN': 'KBT', 'TEJAKULA': 'TJK' };
    return map[kec.toUpperCase()] || "XXX";
};

const renderPertanyaanDinamis = (jenis, modul, container, questions) => {
    try {
        if (!jenis) { container.innerHTML = ''; return; }
        
        const filteredQ = questions.filter(q => {
            let status = String(q.is_active || q.status || 'Y').toUpperCase();
            let sasaran = String(q.jenis_sasaran || '').toUpperCase();
            let mdl = String(q.modul || '').toUpperCase();
            return (status === 'Y' || status === 'AKTIF') && 
                   mdl === modul.toUpperCase() && 
                   (sasaran === 'UMUM' || sasaran === jenis);
        }).sort((a,b)=> (parseInt(a.urutan)||0) - (parseInt(b.urutan)||0));

        if (filteredQ.length > 0) {
            const grouped = {};
            filteredQ.forEach(q => {
                let grup = q.grup_pertanyaan || 'Informasi Tambahan';
                let urutG = parseInt(q.urutan_grup); if (isNaN(urutG)) urutG = 999; 
                if(!grouped[grup]) { grouped[grup] = { urutan_grup: urutG, questions: [] }; }
                grouped[grup].questions.push(q);
            });

            const groupArray = Object.keys(grouped).map(k => ({ nama_grup: k, ...grouped[k] }));
            groupArray.sort((a, b) => a.urutan_grup - b.urutan_grup);

            let html = ``;
            groupArray.forEach(g => {
                html += `<div style="background:#fff; border:1px solid #e1e8ed; padding:15px; border-radius:8px; margin-bottom:15px; box-shadow:0 1px 2px rgba(0,0,0,0.05);">`;
                html += `<h4 style="margin:0 0 15px 0; color:#2c3e50; font-size:1rem; border-bottom:1px solid #eee; padding-bottom:5px;">📋 ${g.nama_grup}</h4>`;
                
                g.questions.forEach(q => {
                    let lbl = q.label_pertanyaan || q.teks_pertanyaan || 'Pertanyaan Tanpa Judul';
                    let isReq = String(q.is_required || q.wajib || 'Y').toUpperCase() === 'Y' || String(q.is_required || q.wajib || 'Y').toUpperCase() === 'YA';
                    let req = isReq ? 'required' : ''; 
                    let markerReq = req ? '<span style="color:red; font-weight:bold;">*</span>' : '';
                    let tInput = String(q.tipe_input || q.tipe_jawaban || 'text').toLowerCase();
                    let inputHtml = '';
                    
                    if(tInput === 'select' || tInput === 'pilihan') {
                        let opsi = []; 
                        try { 
                            const opsiRaw = q.opsi_json || q.pilihan_jawaban || '[]';
                            if(opsiRaw.startsWith('[')) { opsi = JSON.parse(opsiRaw); } 
                            else { opsi = opsiRaw.split(',').map(s=>s.trim()); }
                        } catch(e) {}
                        inputHtml = `<select name="${q.id_pertanyaan}" id="${q.id_pertanyaan}" class="form-control" ${req}><option value="">-- Pilih Jawaban --</option>${opsi.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`;
                    } else if(tInput === 'date' || tInput === 'tanggal') {
                        inputHtml = `<input type="date" name="${q.id_pertanyaan}" id="${q.id_pertanyaan}" class="form-control" ${req}>`;
                    } else {
                        let pHolder = tInput === 'number' || tInput === 'angka' ? 'Masukkan angka...' : 'Ketik jawaban...';
                        let typeReal = tInput === 'number' || tInput === 'angka' ? 'number' : 'text';
                        inputHtml = `<input type="${typeReal}" name="${q.id_pertanyaan}" id="${q.id_pertanyaan}" class="form-control" placeholder="${pHolder}" step="any" ${req}>`;
                    }

                    let kondisiTampil = q.kondisi_tampil ? q.kondisi_tampil.trim() : '';
                    let displayStyle = kondisiTampil ? 'display:none;' : 'display:block;';
                    
                    html += `<div class="form-group conditional-wrapper" id="wrap_${q.id_pertanyaan}" data-condition="${kondisiTampil}" data-required="${isReq}" style="${displayStyle} margin-bottom: 12px; padding: 10px; background: #fdfdfd; border-left: 3px solid #0984e3; border-radius: 4px;">
                                <label style="font-weight:600; color:#444; font-size: 0.9rem;">${lbl} ${markerReq}</label>
                                ${inputHtml}
                             </div>`;
                });
                html += `</div>`;
            });
            container.innerHTML = html;

            const evaluateConditions = () => {
                const wrappers = container.querySelectorAll('.conditional-wrapper[data-condition]');
                wrappers.forEach(wrapper => {
                    const condition = wrapper.getAttribute('data-condition');
                    if (!condition) return;
                    
                    const parts = condition.split('=');
                    if (parts.length !== 2) return;
                    
                    const parentId = parts[0].trim();
                    const reqValue = parts[1].trim().toLowerCase();
                    
                    const parentInput = container.querySelector(`[name="${parentId}"]`);
                    if (parentInput) {
                        const parentVal = parentInput.value.trim().toLowerCase();
                        const inputElement = wrapper.querySelector('input, select');
                        const isRequiredOrig = wrapper.getAttribute('data-required') === 'true';

                        if (parentVal === reqValue) {
                            wrapper.style.display = 'block';
                            if (inputElement && isRequiredOrig) inputElement.setAttribute('required', 'true');
                        } else {
                            wrapper.style.display = 'none';
                            if (inputElement) {
                                inputElement.removeAttribute('required');
                                if(inputElement.value !== '') { 
                                    inputElement.value = ''; 
                                    inputElement.dispatchEvent(new Event('change')); 
                                }
                            }
                        }
                    }
                });
            };

            container.addEventListener('change', evaluateConditions); 
            // 🔥 PATCH 2: Event Listener `input` dihapus dari seluruh kontainer agar tidak memicu memory leak / UI lag saat kader mengetik
            setTimeout(evaluateConditions, 400);
        } else { 
            container.innerHTML = ''; 
        }
    } catch(e) { window.logErrorToServer('renderPertanyaanDinamis', e); }
};

const initFormRegistrasi = async () => {
    try {
        const session = window.currentUser;
        const allWil = await getAllData('master_tim_wilayah').catch(()=>[]);
        const allWilBali = await getAllData('master_wilayah_bali').catch(()=>[]);
        const masterWilayah = await getAllData('master_wilayah').catch(()=>[]); 

        const tugas = allWil.filter(w => String(w.id_tim) === String(session.id_tim));

        const selJenis = getEl('reg-jenis'); 
        const containerQ = getEl('pertanyaan-dinamis'); 
        const boxCatin = getEl('wilayah-catin'); 
        const boxDomisili = getEl('wilayah-domisili');
        const selDesa = getEl('reg-desa'); 
        const selDusun = getEl('reg-dusun'); 
        const regAlamat = getEl('reg-alamat'); 
        const selJk = getEl('reg-jk');

        if (selDesa && tugas.length > 0) {
            const dDesa = [...new Set(tugas.map(w => w.desa_kelurahan))].filter(Boolean);
            selDesa.innerHTML = '<option value="">-- Pilih Desa --</option>' + dDesa.map(d => `<option value="${d}">${d}</option>`).join('');
            selDesa.onchange = () => { 
                const dDusun = tugas.filter(w => w.desa_kelurahan === selDesa.value); 
                selDusun.innerHTML = '<option value="">-- Pilih Dusun --</option>' + dDusun.map(d => `<option value="${d.dusun_rw}">${d.dusun_rw}</option>`).join(''); 
            };
        }

        const catinKab = getEl('catin-kab'); 
        const catinKec = getEl('catin-kec'); 
        const catinDesa = getEl('catin-desa');
        const catinDusunSel = getEl('catin-dusun-sel'); 
        const catinDusunTxt = getEl('catin-dusun-txt'); 
        const catinAlamat = getEl('catin-alamat');

        if (catinKab && allWilBali.length > 0) {
            const dKab = [...new Set(allWilBali.map(w => w.kabupaten))].filter(Boolean);
            catinKab.innerHTML = '<option value="">-- Pilih Kabupaten --</option>' + dKab.map(d => `<option value="${d}">${d}</option>`).join('');

            catinKab.onchange = () => {
                const fKec = allWilBali.filter(w => w.kabupaten === catinKab.value); 
                const dKec = [...new Set(fKec.map(w => w.kecamatan))].filter(Boolean);
                catinKec.innerHTML = '<option value="">-- Pilih Kecamatan --</option>' + dKec.map(d => `<option value="${d}">${d}</option>`).join(''); 
                catinDesa.innerHTML = '<option value="">-- Pilih Desa --</option>';
                catinDusunTxt.style.display = 'block'; 
                catinDusunTxt.setAttribute('name', 'catin_dusun'); 
                catinDusunSel.style.display = 'none'; 
                catinDusunSel.removeAttribute('name');
            };

            catinKec.onchange = () => {
                const fDesa = allWilBali.filter(w => w.kabupaten === catinKab.value && w.kecamatan === catinKec.value); 
                const dDesa = [...new Set(fDesa.map(w => w.desa_kelurahan))].filter(Boolean);
                catinDesa.innerHTML = '<option value="">-- Pilih Desa --</option>' + dDesa.map(d => `<option value="${d}">${d}</option>`).join('');
            };

            catinDesa.onchange = () => {
                if (catinKab.value.toUpperCase().includes('BULELENG')) {
                    const dDusun = masterWilayah.filter(w => String(w.desa_kelurahan).toUpperCase() === String(catinDesa.value).toUpperCase());
                    if(dDusun.length > 0) {
                        const uniqueDusun = [...new Set(dDusun.map(w => w.dusun_rw))].filter(Boolean);
                        catinDusunSel.innerHTML = '<option value="">-- Pilih Dusun --</option>' + uniqueDusun.map(d => `<option value="${d}">${d}</option>`).join('');
                        catinDusunSel.style.display = 'block'; 
                        catinDusunSel.setAttribute('name', 'catin_dusun'); 
                        catinDusunSel.setAttribute('required', 'true');
                        catinDusunTxt.style.display = 'none'; 
                        catinDusunTxt.removeAttribute('name'); 
                        catinDusunTxt.removeAttribute('required');
                        return;
                    }
                }
                catinDusunTxt.style.display = 'block'; 
                catinDusunTxt.setAttribute('name', 'catin_dusun'); 
                catinDusunTxt.setAttribute('required', 'true');
                catinDusunSel.style.display = 'none'; 
                catinDusunSel.removeAttribute('name'); 
                catinDusunSel.removeAttribute('required');
            };
        }

        const questions = await getAllData('master_pertanyaan').catch(()=>[]);
        
        if (selJenis) {
            selJenis.onchange = () => {
                const jenis = selJenis.value; 
                const core = getEl('form-core'); 
                if(!jenis) { core.style.display = 'none'; return; } 
                core.style.display = 'block';

                if (selJk) { 
                    if (jenis === 'BUMIL' || jenis === 'BUFAS') { 
                        selJk.value = 'Perempuan'; 
                        selJk.style.pointerEvents = 'none'; 
                        selJk.style.backgroundColor = '#e9ecef'; 
                    } else { 
                        selJk.style.pointerEvents = 'auto'; 
                        selJk.style.backgroundColor = '#fff'; 
                    } 
                }

                if(boxCatin && boxDomisili) {
                    if (jenis === 'CATIN') {
                        boxCatin.style.display = 'block'; 
                        boxDomisili.style.display = 'none';
                        if(selDesa) selDesa.removeAttribute('required'); 
                        if(selDusun) selDusun.removeAttribute('required'); 
                        if(regAlamat) regAlamat.removeAttribute('required');
                        if(catinKab) catinKab.setAttribute('required', 'true'); 
                        if(catinKec) catinKec.setAttribute('required', 'true'); 
                        if(catinDesa) catinDesa.setAttribute('required', 'true');
                        if(catinDusunSel.style.display === 'block') { 
                            catinDusunSel.setAttribute('required', 'true'); 
                        } else { 
                            catinDusunTxt.setAttribute('required', 'true'); 
                        }
                        if(catinAlamat) catinAlamat.setAttribute('required', 'true');
                    } else {
                        boxCatin.style.display = 'none'; 
                        boxDomisili.style.display = 'block';
                        if(selDesa) selDesa.setAttribute('required', 'true'); 
                        if(selDusun) selDusun.setAttribute('required', 'true'); 
                        if(regAlamat) regAlamat.setAttribute('required', 'true');
                        if(catinKab) catinKab.removeAttribute('required'); 
                        if(catinKec) catinKec.removeAttribute('required'); 
                        if(catinDesa) catinDesa.removeAttribute('required');
                        catinDusunSel.removeAttribute('required'); 
                        catinDusunTxt.removeAttribute('required'); 
                        if(catinAlamat) catinAlamat.removeAttribute('required');
                    }
                }

                renderPertanyaanDinamis(jenis, 'REGISTRASI', containerQ, questions);

                if(window.editModeData) {
                    setTimeout(() => {
                        const eD = window.editModeData;
                        if(getEl('f_nama')) getEl('f_nama').value = eD.nama_sasaran || ''; 
                        if(getEl('f_nik')) getEl('f_nik').value = eD.data_laporan?.nik || '';
                        if(getEl('f_kk_nama')) getEl('f_kk_nama').value = eD.data_laporan?.nama_kk || ''; 
                        if(getEl('f_kk_no')) getEl('f_kk_no').value = eD.data_laporan?.nomor_kk || '';
                        if(getEl('f_tgl')) getEl('f_tgl').value = eD.data_laporan?.tanggal_lahir || ''; 
                        if(getEl('reg-jk')) getEl('reg-jk').value = eD.data_laporan?.jenis_kelamin || '';
                        if(getEl('reg-desa')) getEl('reg-desa').value = eD.desa || '';
                        if(getEl('reg-desa')) getEl('reg-desa').dispatchEvent(new Event('change')); 
                        if(getEl('reg-dusun')) setTimeout(()=> { getEl('reg-dusun').value = eD.dusun || ''; }, 100);
                        if(getEl('reg-alamat')) getEl('reg-alamat').value = eD.data_laporan?.alamat || '';

                        for (const [key, value] of Object.entries(eD.data_laporan || {})) { 
                            let field = document.querySelector(`[name="${key}"]`); 
                            if(field) { field.value = value; field.dispatchEvent(new Event('change')); } 
                        }
                    }, 300);
                }
            };
            if(window.editModeData) { 
                selJenis.value = window.editModeData.jenis_sasaran; 
                selJenis.dispatchEvent(new Event('change')); 
            }
        }

        const formReg = getEl('form-registrasi');
        if (formReg) {
            formReg.onsubmit = async (e) => {
                e.preventDefault(); 
                const btn = e.target.querySelector('button'); 
                btn.disabled = true; 
                
                btn.innerText = "📍 Mencari Titik Koordinat...";
                const gpsLocation = await dapatkanLokasiGPS();
                btn.innerText = "⏳ Membungkus Data...";

                try {
                    const formData = new FormData(e.target); 
                    const jawaban = {}; 
                    formData.forEach((val, key) => { jawaban[key] = val; });
                    
                    const kecamatan = session.kecamatan || 'BULELENG'; 
                    const jenisSasaran = selJenis.value;

                    let idSasaran = window.editModeData ? window.editModeData.id : `${{"CATIN":"CTN","BUMIL":"BML","BUFAS":"BFS","BADUTA":"BDT"}[jenisSasaran]}-${getKodeKecamatan(kecamatan)}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
                    const desaFinal = jenisSasaran === 'CATIN' ? '-' : selDesa.value; 
                    const dusunFinal = jenisSasaran === 'CATIN' ? '-' : selDusun.value;

                    if (jawaban.tanggal_lahir) {
                        const tglLahir = new Date(jawaban.tanggal_lahir); 
                        const tglDaftar = new Date();
                        let umurTahun = tglDaftar.getFullYear() - tglLahir.getFullYear(); 
                        let umurBulan = tglDaftar.getMonth() - tglLahir.getMonth();
                        if (umurBulan < 0 || (umurBulan === 0 && tglDaftar.getDate() < tglLahir.getDate())) { 
                            umurTahun--; 
                            umurBulan += 12; 
                        }
                        jawaban.usia_saat_daftar_tahun = umurTahun; 
                        jawaban.usia_saat_daftar_bulan = umurBulan;
                    }
                    const createdDate = window.editModeData ? window.editModeData.created_at : new Date().toISOString();
                    
                    const laporan = { 
                        id: idSasaran, 
                        tipe_laporan: 'REGISTRASI', 
                        username: session.username, 
                        id_tim: session.id_tim, 
                        nomor_tim: session.nomor_tim, 
                        kecamatan: kecamatan, 
                        jenis_sasaran: jenisSasaran, 
                        nama_sasaran: jawaban.nama_sasaran, 
                        desa: desaFinal, 
                        dusun: dusunFinal, 
                        data_laporan: jawaban, 
                        status_sasaran: 'AKTIF', 
                        is_synced: false, 
                        created_at: createdDate, 
                        lokasi_gps: gpsLocation 
                    };

                    await putData('sync_queue', laporan); 
                    window.editModeData = null; 
                    alert(window.editModeData ? `✅ Data berhasil diperbarui!` : `✅ Registrasi berhasil! ID: ${idSasaran}`); 
                    renderKonten('daftar_sasaran');
                } catch (err) { 
                    window.logErrorToServer('formReg.onsubmit', err); 
                    alert("Gagal menyimpan form."); 
                } finally { 
                    btn.disabled = false; 
                    btn.innerText = "💾 Simpan Sasaran"; 
                }
            };
        }
    } catch(e) { window.logErrorToServer('initFormRegistrasi', e); }
};

// ==========================================
// 5. FITUR DAFTAR SASARAN & DETAIL
// ==========================================
window.bukaEditSasaran = async (id) => { 
    const r = await getDataById('sync_queue', id); 
    if(r) { window.editModeData = r; renderKonten('registrasi'); } 
    else { alert('Data tidak ditemukan'); } 
};

window.bukaEditLaporan = async (idLaporan) => { 
    const r = await getDataById('sync_queue', idLaporan); 
    if(r) { window.editModeLaporan = r; renderKonten('pendampingan'); } 
    else { alert('Data laporan tidak ditemukan'); } 
};

const initDaftarSasaran = async () => {
    try {
        const session = window.currentUser; 
        const filterJenis = getEl('filter-jenis'); 
        const filterStatus = getEl('filter-status'); 
        const list = getEl('list-sasaran');
        const modal = getEl('modal-detail'); 
        const btnTutup = getEl('btn-tutup-modal'); 
        const kontenDetail = getEl('konten-detail');

        if(!list) return;

        const [antrean, masterPertanyaan] = await Promise.all([ 
            getAllData('sync_queue').catch(()=>[]), 
            getAllData('master_pertanyaan').catch(()=>[]) 
        ]);
        
        const regList = antrean.filter(a => a.tipe_laporan === 'REGISTRASI' && String(a.id_tim) === String(session.id_tim));
        const pendList = antrean.filter(a => a.tipe_laporan === 'PENDAMPINGAN' && String(a.id_tim) === String(session.id_tim));

        const processedList = regList.map(r => {
            let isExpired = r.status_sasaran === 'SELESAI'; 
            let statusRaw = r.status_sasaran || 'AKTIF'; 
            let labelSelesai = '<span style="color: var(--primary); font-weight:bold;">Aktif</span>'; 
            let alasanExpired = 'Selesai';
            
            const hariIni = new Date(); 
            hariIni.setHours(0,0,0,0);
            
            let tglNikahRaw = r.data_laporan?.tanggal_pernikahan;
            for (const key in r.data_laporan) { 
                if(key.toLowerCase().includes('nikah')) tglNikahRaw = r.data_laporan[key]; 
            }
            if (r.jenis_sasaran === 'CATIN' && tglNikahRaw) { 
                const tglNikah = new Date(tglNikahRaw); 
                if (tglNikah < hariIni) { 
                    isExpired = true; statusRaw = 'SELESAI'; alasanExpired = 'Sudah Menikah'; 
                } 
            }
            
            let tglSalinRaw = r.data_laporan?.tgl_persalinan;
            for (const key in r.data_laporan) { 
                if(key.toLowerCase().includes('salin') || key.toLowerCase().includes('lahir')) tglSalinRaw = r.data_laporan[key]; 
            }
            if (r.jenis_sasaran === 'BUFAS' && tglSalinRaw) { 
                const tglBatas = new Date(tglSalinRaw); 
                tglBatas.setDate(tglBatas.getDate() + 42); 
                if (hariIni > tglBatas) { 
                    isExpired = true; statusRaw = 'SELESAI'; alasanExpired = 'Masa Nifas > 42 Hari'; 
                } 
            }
            
            if (isExpired || statusRaw === 'SELESAI') { 
                isExpired = true; 
                statusRaw = 'SELESAI'; 
                if(alasanExpired === 'Selesai') { 
                    alasanExpired = r.jenis_sasaran === 'CATIN' ? 'Sudah Menikah' : (r.jenis_sasaran === 'BUMIL' ? 'Sudah Melahirkan' : 'Selesai'); 
                } 
                labelSelesai = `<span style="color: #dc3545; font-weight:bold;">SELESAI (${alasanExpired})</span>`; 
            }
            
            let jk = r.data_laporan?.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'; 
            let jkDisplay = (r.jenis_sasaran === 'CATIN' || r.jenis_sasaran === 'BADUTA') ? `(${jk})` : '';
            let usiaTh = r.data_laporan?.usia_saat_daftar_tahun !== undefined ? r.data_laporan.usia_saat_daftar_tahun : '-'; 
            let textBaris2 = `${r.jenis_sasaran} ${jkDisplay} ${usiaTh} Th`.trim();
            
            return { ...r, isExpired, labelSelesai, statusRaw, textBaris2 };
        });

        const renderList = () => {
            const fJ = filterJenis ? filterJenis.value : 'ALL'; 
            const fS = filterStatus ? filterStatus.value : 'ALL';
            let filtered = processedList.filter(r => (fJ === 'ALL' || r.jenis_sasaran === fJ) && (fS === 'ALL' || r.statusRaw === fS));
            
            if (filtered.length === 0) { 
                list.innerHTML = `<div style="text-align:center; padding:20px; color:#999;">Tidak ada sasaran yang sesuai filter.</div>`; 
            } else {
                list.innerHTML = filtered.map(r => {
                    let syncBadge = r.is_synced ? '<span style="color:#198754; font-size:0.75rem; background:#e8f4fd; padding:2px 6px; border-radius:4px; border:1px solid #198754;">✅ Server</span>' : '<span style="color:#fd7e14; font-size:0.75rem; background:#fff3cd; padding:2px 6px; border-radius:4px; border:1px solid #fd7e14;">⏳ Lokal</span>';
                    return `
                    <div class="sasaran-card" data-id="${r.id}" style="background:${r.isExpired ? '#f8f9fa' : '#fff'}; padding:15px; border-radius:8px; border-left: 4px solid ${r.isExpired ? '#6c757d' : 'var(--primary)'}; opacity: ${r.isExpired ? '0.75' : '1'}; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom:10px;">
                        <div style="font-weight: bold; font-size: 1.15rem; color: #333; text-transform: uppercase;">${r.nama_sasaran || 'Tanpa Nama'}</div>
                        <div style="font-size: 0.95rem; color: #555; font-weight: bold; margin-top: 3px;">${r.textBaris2}</div>
                        <div style="font-size: 0.85rem; color: #666; margin-top: 3px;">📍 ${r.dusun}, ${r.desa}</div>
                        <div style="font-size: 0.9rem; margin-top: 8px; display:flex; justify-content:space-between; align-items:center;"><span>${r.labelSelesai}</span>${syncBadge}</div>
                    </div>`
                }).join('');
            }
            document.querySelectorAll('.sasaran-card').forEach(card => card.onclick = () => showDetail(card.getAttribute('data-id')));
        };

        const showDetail = (id) => {
            const r = processedList.find(x => x.id === id); 
            if(!r) return;
            const riwayat = pendList.filter(p => p.id_sasaran_ref === id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
            let htmlRiwayat = '';

            if (riwayat.length === 0) {
                htmlRiwayat = '<div style="color:#888; font-size:0.9rem; padding: 15px; background: #fff; border-radius: 8px; text-align:center; border: 1px dashed #ccc;">Belum ada riwayat kunjungan pendampingan.</div>';
            } else if (r.jenis_sasaran === 'BADUTA') {
                htmlRiwayat += `<div style="overflow-x:auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #ddd;">
                    <table style="width:100%; border-collapse: collapse; font-size: 0.85rem; text-align:center; min-width:600px;">
                        <thead>
                            <tr style="background: var(--primary); color: white;">
                                <th style="padding:10px; border:1px solid #c6c6c6;">Tanggal</th>
                                <th style="padding:10px; border:1px solid #c6c6c6;">Usia</th>
                                <th style="padding:10px; border:1px solid #c6c6c6;">BB (kg)</th>
                                <th style="padding:10px; border:1px solid #c6c6c6;">TB/PB (cm)</th>
                                <th style="padding:10px; border:1px solid #c6c6c6;">LK (cm)</th>
                                <th style="padding:10px; border:1px solid #c6c6c6;">Status KKA</th>
                                <th style="padding:10px; border:1px solid #c6c6c6; text-align:left;">Catatan Lainnya</th>
                            </tr>
                        </thead>
                        <tbody>`;

                riwayat.forEach(p => {
                    let tglKunjungan = new Date(p.data_laporan?.tgl_kunjungan || p.created_at); 
                    let tglLahir = new Date(r.data_laporan?.tanggal_lahir || new Date());
                    let umurBulan = (tglKunjungan.getFullYear() - tglLahir.getFullYear()) * 12; 
                    umurBulan -= tglLahir.getMonth(); 
                    umurBulan += tglKunjungan.getMonth();
                    if (tglKunjungan.getDate() < tglLahir.getDate()) umurBulan--; 
                    if (umurBulan < 0) umurBulan = 0;

                    let valBB = '-', valTB = '-', valLK = '-', valKKA = '-';
                    let catatanLain = '';

                    for (const [key, value] of Object.entries(p.data_laporan || {})) {
                        if (['id_sasaran', 'tgl_kunjungan', 'catatan'].includes(key) || !value) continue;
                        let foundQ = masterPertanyaan.find(mq => String(mq.id_pertanyaan) === String(key));
                        let label = foundQ ? foundQ.label_pertanyaan.toLowerCase() : key.toLowerCase();
                        
                        if (label.includes('berat') || label === 'bb') valBB = value; 
                        else if (label.includes('tinggi') || label.includes('panjang') || label.includes('tb') || label.includes('pb')) valTB = value; 
                        else if (label.includes('lingkar kepala') || label === 'lk') valLK = value; 
                        else if (label.includes('kka') || label.includes('perkembangan')) valKKA = value;
                        else { 
                            catatanLain += `<small style="display:block; border-top: 1px dashed #ccc; padding-top:3px; margin-top:3px;"><b>${foundQ ? foundQ.label_pertanyaan : key}:</b> ${value}</small>`; 
                        }
                    }
                    
                    if (p.data_laporan?.catatan) {
                        catatanLain = `<span style="display:block; margin-bottom:4px;"><b>Hasil Umum:</b> ${p.data_laporan.catatan}</span>` + catatanLain;
                    }

                    let syncIcon = p.is_synced ? '<span style="color:#198754; font-size:0.7rem;">(Server)</span>' : '<span style="color:#fd7e14; font-size:0.7rem;">(Lokal)</span>';
                    let kkaStyle = (valKKA.toLowerCase().includes('terlambat') || valKKA.toLowerCase().includes('tidak') || valKKA.toLowerCase().includes('meragukan')) ? 'color:#dc3545; font-weight:bold;' : 'color:#198754; font-weight:bold;';

                    htmlRiwayat += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding:10px; border:1px solid #eee;">${tglKunjungan.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: '2-digit'})} <br>${syncIcon}<br><span style="color:#0d6efd; cursor:pointer; font-size:0.75rem;" onclick="window.bukaEditLaporan('${p.id}')">✏️ Edit</span></td>
                            <td style="padding:10px; border:1px solid #eee; font-weight:bold; font-size:1rem; color:var(--primary);">${umurBulan} Bln</td>
                            <td style="padding:10px; border:1px solid #eee;">${valBB}</td>
                            <td style="padding:10px; border:1px solid #eee;">${valTB}</td>
                            <td style="padding:10px; border:1px solid #eee;">${valLK}</td>
                            <td style="padding:10px; border:1px solid #eee; ${kkaStyle}">${valKKA}</td>
                            <td style="padding:10px; border:1px solid #eee; text-align:left; line-height:1.3;">${catatanLain}</td>
                        </tr>`;
                });
                htmlRiwayat += `</tbody></table></div>`;
            } else {
                htmlRiwayat = riwayat.map(p => {
                    let dynamicHtml = '';
                    for (const [key, value] of Object.entries(p.data_laporan || {})) {
                        if (['id_sasaran', 'tgl_kunjungan', 'catatan', 'is_melahirkan', 'tgl_persalinan', 'nama_sasaran', 'nama_kk', 'nik', 'jenis_kelamin'].includes(key) || !value) continue;
                        let foundQ = masterPertanyaan.find(mq => String(mq.id_pertanyaan) === String(key));
                        let label = foundQ ? foundQ.label_pertanyaan : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        dynamicHtml += `
                            <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
                                <div style="font-size: 0.75rem; color: #666; font-weight: normal;">${label}</div>
                                <div style="font-size: 0.9rem; color: #222; font-weight: 500;">${value}</div>
                            </div>`;
                    }
                    return `
                        <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden;">
                            <div style="background: #e8f4fd; padding: 10px 15px; border-bottom: 1px solid #cfe2ff; display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: bold; color: #0d6efd; font-size: 0.9rem;">📅 ${new Date(p.data_laporan?.tgl_kunjungan || p.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                                <div>
                                    <span style="font-size: 0.7rem; font-weight: bold; color: ${p.is_synced ? '#198754' : '#fd7e14'}; background: #fff; padding: 3px 8px; border-radius: 12px; border: 1px solid #ddd; margin-right:5px;">${p.is_synced ? '✅ Server' : '⏳ Lokal'}</span>
                                    <span style="font-size:0.8rem; cursor:pointer;" onclick="window.bukaEditLaporan('${p.id}')">✏️</span>
                                </div>
                            </div>
                            <div style="padding: 15px;">
                                <div style="font-size: 0.8rem; color: #666; margin-bottom: 4px;">Catatan Umum / Hasil:</div>
                                <div style="font-size: 0.95rem; color: #333; margin-bottom: ${dynamicHtml ? '15px' : '0'}; background: #f8f9fa; padding: 10px; border-radius: 6px; border-left: 4px solid #0d6efd;">${p.data_laporan?.catatan || '-'}</div>
                                ${dynamicHtml ? `<div style="background: #fff; border: 1px solid #f1f1f1; padding: 10px; border-radius: 6px;">${dynamicHtml}</div>` : ''}
                            </div>
                        </div>`;
                }).join('');
            }

            let syncStatusHtml = r.is_synced ? '<span style="color:#198754;">✅ Tersinkron (Server)</span>' : '<span style="color:#fd7e14;">⏳ Belum Sinkron (Lokal)</span>';

            // 🔥 PATCH 4: Pengecekan DOM sebelum injeksi HTML
            if (kontenDetail) {
                kontenDetail.innerHTML = `
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd; line-height: 1.4;">
                        <div style="font-size: 0.8rem; color: #666; margin-bottom: 4px;">Nama Sasaran</div>
                        <div style="font-size: 1.15rem; font-weight: bold; color: #0043a8; margin-bottom: 15px; text-transform: uppercase; background: #ffffff; padding: 10px 12px; border-radius: 6px; border: 1px solid #c6c6c6; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            <span>${r.nama_sasaran || '-'}</span>
                            <span style="font-size: 0.85rem; color: #0d6efd; cursor: pointer; text-transform: none; font-weight: normal; background: #e8f4fd; padding: 4px 8px; border-radius: 4px;" onclick="window.bukaEditSasaran('${r.id}')">✏️ (edit)</span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                            <div>
                                <div style="font-size: 0.8rem; color: #666;">ID / No NIK</div>
                                <div style="font-size: 0.95rem; color: #222; font-weight: 500;">${r.id} <br> ${r.data_laporan?.nik || '-'}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.8rem; color: #666;">Kategori</div>
                                <div style="font-size: 0.95rem; color: #222; font-weight: bold;">${r.textBaris2}</div>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                            <div>
                                <div style="font-size: 0.8rem; color: #666;">Status Pendampingan</div>
                                <div style="font-size: 0.95rem;">${r.labelSelesai}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.8rem; color: #666;">Status Sinkronisasi</div>
                                <div style="font-size: 0.95rem; font-weight: bold;">${syncStatusHtml}</div>
                            </div>
                        </div>
                        <div style="font-size: 0.8rem; color: #666;">Alamat Lengkap</div>
                        <div style="font-size: 0.95rem; color: #222;">${r.data_laporan?.alamat || '-'}</div>
                    </div>
                    <h4 style="margin-bottom: 15px; color: #0043a8; background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #c6c6c6; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-weight: 700;">
                        ${r.jenis_sasaran === 'BADUTA' ? '📈 Buku KIA/KKA Digital' : 'Riwayat Kunjungan'} (${riwayat.length})
                    </h4>
                    <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;">${htmlRiwayat}</div>`;
            }
            if(modal) modal.style.display = 'block';
        };

        if(btnTutup) btnTutup.onclick = () => { if(modal) modal.style.display = 'none'; };
        if(filterJenis) filterJenis.onchange = renderList;
        if(filterStatus) filterStatus.onchange = renderList;
        renderList();
    } catch(e) { window.logErrorToServer('initDaftarSasaran', e); }
};

// ==========================================
// 6. FORM PENDAMPINGAN DINAMIS
// ==========================================
const initFormPendampingan = async () => {
    try {
        const session = window.currentUser;
        const selJenis = getEl('pend-jenis'); 
        const selSasaran = getEl('pend-sasaran');
        const infoBox = getEl('pend-info-sasaran'); 
        const containerQ = getEl('form-pendampingan-dinamis');

        const isEditLaporan = window.editModeLaporan != null; 
        const eLaporan = isEditLaporan ? window.editModeLaporan : null;

        if(isEditLaporan) {
            getEl('header-pendampingan').innerHTML = `📝 Mengedit Laporan Pendampingan`;
            getEl('header-pendampingan').insertAdjacentHTML('afterend', `<div style="background:#fff3cd; padding:10px; border-radius:5px; margin-bottom:15px; font-size:0.85rem; color:#856404;"><b>Info:</b> Anda sedang mengedit kunjungan tanggal ${eLaporan.data_laporan.tgl_kunjungan || '-'}.</div>`);
            if(getEl('btn-submit-pendampingan')) getEl('btn-submit-pendampingan').innerHTML = "💾 Update Laporan";
        }

        const [questions, antrean, stdAntro, masterKembang] = await Promise.all([ 
            getAllData('master_pertanyaan').catch(()=>[]), 
            getAllData('sync_queue').catch(()=>[]), 
            getAllData('standar_antropometri').catch(()=>[]), 
            getAllData('master_kembang').catch(()=>[]) 
        ]);
        
        const regList = antrean.filter(a => a.tipe_laporan === 'REGISTRASI' && String(a.id_tim) === String(session.id_tim) && a.status_sasaran !== 'SELESAI');

        const getKkaData = (umurAnak) => {
            const ages = [...new Set(masterKembang.map(d => parseInt(d.umur_bulan)))].filter(a => !isNaN(a)).sort((a,b)=>a-b);
            let targetUmur = ages.filter(a => a <= umurAnak).pop() || ages[0];
            return masterKembang.filter(k => parseInt(k.umur_bulan) === targetUmur);
        };

        if (selJenis && selSasaran) {
            selJenis.onchange = () => {
                const jenis = selJenis.value; 
                containerQ.innerHTML = ''; 
                if(infoBox) infoBox.style.display = 'none';
                
                if (!jenis) { 
                    selSasaran.innerHTML = '<option value="">-- Pilih Jenis Dahulu --</option>'; 
                    selSasaran.disabled = true; 
                    return; 
                }
                
                const activeReg = regList.filter(r => r.jenis_sasaran === jenis);
                selSasaran.innerHTML = activeReg.length === 0 ? `<option value="">-- Tidak ada data --</option>` : '<option value="">-- Pilih Sasaran --</option>' + activeReg.map(r => `<option value="${r.id}">${r.nama_sasaran}</option>`).join('');
                selSasaran.disabled = activeReg.length === 0;
            };

            selSasaran.onchange = () => {
                const sasaran = regList.find(r => r.id === selSasaran.value);
                if (!sasaran) { containerQ.innerHTML = ''; return; }

                if (infoBox) {
                    infoBox.style.display = 'block';
                    infoBox.innerHTML = `
                        <div style="font-weight:bold; color:#0043a8; margin-bottom: 8px; background: #fff; padding: 6px 12px; border-radius: 6px; border: 1px solid #c6c6c6; text-align:center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">📌 Profil Sasaran Terpilih</div>
                        <table style="width:100%; font-size: 0.85rem; background: #fff; padding: 12px; border-radius: 6px; border: 1px solid #ddd; line-height:1.5;">
                            <tr><td style="width:35%; color:#555;">Nama</td><td>: <b>${sasaran.nama_sasaran}</b></td></tr>
                            <tr><td style="color:#555;">No. KK</td><td>: ${sasaran.data_laporan?.nomor_kk||'-'}</td></tr>
                            <tr><td style="color:#555;">Umur Daftar</td><td>: ${sasaran.data_laporan?.usia_saat_daftar_tahun||'-'} Tahun</td></tr>
                        </table>`;
                }

                renderPertanyaanDinamis(sasaran.jenis_sasaran, 'PENDAMPINGAN', containerQ, questions);

                setTimeout(() => {
                    if (sasaran.jenis_sasaran === 'BADUTA' && sasaran.data_laporan.tanggal_lahir) {
                        const tL = new Date(sasaran.data_laporan.tanggal_lahir); 
                        const tH = new Date();
                        let uBln = (tH.getFullYear() - tL.getFullYear()) * 12; 
                        uBln -= tL.getMonth(); 
                        uBln += tH.getMonth();
                        if (tH.getDate() < tL.getDate()) uBln--; 
                        if (uBln < 0) uBln = 0;
                        let jk = sasaran.data_laporan.jenis_kelamin === 'Laki-laki' ? 'L' : 'P';

                        const kkaData = getKkaData(uBln); 
                        let listT = "", listP = "";
                        kkaData.forEach(k => { 
                            let kode = k.kode_aspek ? `[${k.kode_aspek}] ` : ''; 
                            listT += `<li><b>${kode}</b>${k.tugas_perkembangan}</li>`; 
                            listP += `<li style="margin-bottom:6px;"><b>${kode}</b>${k.pesan_stimulasi}</li>`; 
                        });

                        let idInputBB = null, idInputTB = null;
                        const inputs = containerQ.querySelectorAll('input');
                        inputs.forEach(inp => {
                            const lbl = inp.previousElementSibling?.innerText.toLowerCase() || '';
                            if(lbl.includes('berat') || lbl==='bb*') idInputBB = inp.id;
                            if(lbl.includes('tinggi') || lbl.includes('panjang') || lbl.includes('tb') || lbl.includes('pb')) idInputTB = inp.id;
                        });

                        const widgetKKA = `
                            <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; border-left: 4px solid #0d6efd; margin-top: 15px;">
                                <h4 style="margin:0 0 10px 0; color:#0d6efd;">🤖 Asisten Cerdas KKA (Usia: ${uBln} Bln)</h4>
                                <div style="font-size:0.85rem; margin-bottom:10px;"><b>Target Pencapaian:</b><ul style="margin:5px 0; padding-left:15px;">${listT}</ul></div>
                                <div class="form-group">
                                    <label style="font-weight:bold;">Sesuai KKA, apakah perkembangan normal?</label>
                                    <select id="kka_eval" name="evaluasi_kka" class="form-control" required>
                                        <option value="">-- Evaluasi --</option>
                                        <option value="Sesuai Umur">✅ Ya, Sesuai Umur</option>
                                        <option value="Terlambat">⚠️ Meragukan / Terlambat</option>
                                    </select>
                                </div>
                                <div id="kka_tips_box" style="display:none; background:#fff3cd; padding:10px; border-radius:5px; border:1px solid #ffe69c; font-size:0.8rem; margin-top:10px;">
                                    <b style="color:#856404;">💡 Panduan Stimulasi:</b>
                                    <ul style="margin:5px 0; padding-left:15px; color:#856404;">${listP}</ul>
                                </div>
                            </div>
                            <div id="antro_result" style="display:none; background: #fdfdfe; padding: 15px; border-radius: 8px; border: 2px solid #ddd; margin-top: 15px;"></div>`;
                        
                        containerQ.insertAdjacentHTML('beforeend', widgetKKA);

                        if(getEl('kka_eval')) getEl('kka_eval').onchange = (e) => {
                            getEl('kka_tips_box').style.display = (e.target.value === 'Terlambat' || e.target.value === 'Meragukan') ? 'block' : 'none';
                        };

                        const calcAntro = () => {
                            if(!idInputBB || !idInputTB) return;
                            let b = parseFloat(getEl(idInputBB)?.value); 
                            let t = parseFloat(getEl(idInputTB)?.value);
                            if(!b || !t) { getEl('antro_result').style.display = 'none'; return; }

                            let sB="Normal", cB="#198754", sT="Normal", cT="#198754", sP="Normal", cP="#198754";
                            let d_bbu = stdAntro.find(s => s.jenis_kelamin === jk && s.indeks === 'BB_U' && parseInt(s.umur_bulan) === uBln);
                            if(d_bbu) { 
                                if(b < parseFloat(d_bbu.min_3_sd)) { sB="Sangat Kurang"; cB="#dc3545"; } 
                                else if(b < parseFloat(d_bbu.min_2_sd)) { sB="Kurang"; cB="#fd7e14"; } 
                            }

                            let d_tbu = stdAntro.find(s => s.jenis_kelamin === jk && (s.indeks === 'PB_U' || s.indeks === 'TB_U') && parseInt(s.umur_bulan) === uBln);
                            if(d_tbu) { 
                                if(t < parseFloat(d_tbu.min_3_sd)) { sT="Sangat Pendek"; cT="#dc3545"; } 
                                else if(t < parseFloat(d_tbu.min_2_sd)) { sT="Pendek"; cT="#fd7e14"; } 
                            }

                            let rTB = (Math.round(t * 2) / 2).toFixed(1);
                            let d_bbp = stdAntro.find(s => s.jenis_kelamin === jk && (s.indeks === 'BB_PB' || s.indeks === 'BB_TB') && parseFloat(s.tinggi_panjang_cm) === parseFloat(rTB));
                            if(d_bbp) { 
                                if(b < parseFloat(d_bbp.min_3_sd)) { sP="Gizi Buruk"; cP="#dc3545"; } 
                                else if(b < parseFloat(d_bbp.min_2_sd)) { sP="Gizi Kurang"; cP="#fd7e14"; } 
                            }

                            getEl('antro_result').style.display = 'block';
                            getEl('antro_result').innerHTML = `
                                <h5 style="margin:0 0 10px 0; color:#333; text-align:center;">📊 Deteksi Dini Status Gizi</h5>
                                <div style="font-size:0.85rem;">
                                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:5px;"><span>Berat (BB/U):</span><b style="color:${cB};">${sB}</b></div>
                                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:5px 0;"><span>Tinggi (PB/U):</span><b style="color:${cT};">${sT}</b></div>
                                    <div style="display:flex; justify-content:space-between; padding-top:5px;"><span>Proporsi (BB/PB):</span><b style="color:${cP};">${sP}</b></div>
                                </div>`;
                        };
                        
                        if(idInputBB) getEl(idInputBB).addEventListener('input', calcAntro);
                        if(idInputTB) getEl(idInputTB).addEventListener('input', calcAntro);
                    } 
                    else if (sasaran.jenis_sasaran === 'BUMIL') {
                        const widgetLahir = `
                            <div style="background: #fcf1f6; padding: 15px; border-radius: 8px; border-left: 4px solid #d63384; margin-top: 15px;">
                                <div class="form-group">
                                    <label style="color:#d63384; font-weight:bold;">Apakah BUMIL sudah melahirkan?</label>
                                    <select id="is_melahirkan" name="is_melahirkan" class="form-control">
                                        <option value="TIDAK">Belum / Tidak</option>
                                        <option value="YA">Ya, Sudah Melahirkan</option>
                                    </select>
                                </div>
                                <div class="form-group hidden" id="box-tgl-lahir" style="margin-bottom:0;">
                                    <label style="font-weight:bold;">Tanggal Persalinan</label>
                                    <input type="date" name="tgl_persalinan" class="form-control">
                                </div>
                            </div>`;
                        containerQ.insertAdjacentHTML('beforeend', widgetLahir);
                        if(getEl('is_melahirkan')) {
                            getEl('is_melahirkan').onchange = (e) => { 
                                if(e.target.value === 'YA') getEl('box-tgl-lahir').classList.remove('hidden'); 
                                else getEl('box-tgl-lahir').classList.add('hidden'); 
                            };
                        }
                    }

                    if(window.editModeLaporan) {
                        const eL = window.editModeLaporan;
                        for (const [key, value] of Object.entries(eL.data_laporan || {})) {
                            let field = document.querySelector(`[name="${key}"]`);
                            if(field) { 
                                field.value = value; 
                                field.dispatchEvent(new Event('change')); 
                                field.dispatchEvent(new Event('input')); 
                            }
                        }
                    }
                }, 300);
            };

            if(window.editModeLaporan) {
                selJenis.value = window.editModeLaporan.jenis_sasaran_saat_kunjungan || (window.editModeLaporan.id_sasaran_ref.startsWith('CTN')?'CATIN':window.editModeLaporan.id_sasaran_ref.startsWith('BML')?'BUMIL':window.editModeLaporan.id_sasaran_ref.startsWith('BFS')?'BUFAS':'BADUTA');
                selJenis.dispatchEvent(new Event('change'));
                setTimeout(() => { 
                    selSasaran.value = window.editModeLaporan.id_sasaran_ref; 
                    selSasaran.dispatchEvent(new Event('change')); 
                    selJenis.disabled = true; 
                    selSasaran.disabled = true; 
                }, 300);
            }
        }

        const formPend = getEl('form-pendampingan');
        if (formPend) {
            formPend.onsubmit = async (e) => {
                e.preventDefault(); 
                const btn = e.target.querySelector('button'); 
                btn.disabled = true;
                
                btn.innerText = "📍 Mencari Titik Koordinat...";
                const gpsLocation = await dapatkanLokasiGPS();
                btn.innerText = "⏳ Membungkus Data...";

                try {
                    const formData = new FormData(e.target); 
                    const jawaban = {}; 
                    formData.forEach((val, key) => jawaban[key] = val);
                    
                    if(jawaban.is_melahirkan === 'YA' && jawaban.tgl_persalinan && !window.editModeLaporan) {
                        const oR = await getDataById('sync_queue', selSasaran.value);
                        if(oR) {
                            oR.status_sasaran = 'SELESAI'; 
                            oR.is_synced = false; 
                            await putData('sync_queue', oR);
                            
                            const nId = `BFS-${oR.id.split('-')[1]||'XXX'}-${Math.floor(Math.random()*1000000).toString().padStart(6,'0')}`;
                            const nB = JSON.parse(JSON.stringify(oR)); 
                            nB.id = nId; 
                            nB.jenis_sasaran = 'BUFAS'; 
                            nB.status_sasaran = 'AKTIF'; 
                            nB.is_synced = false; 
                            nB.created_at = new Date().toISOString();
                            
                            await putData('sync_queue', nB); 
                            alert("🎉 BUMIL telah melahirkan. Kartu BUFAS baru diterbitkan!");
                        }
                    }
                    
                    let idLapor = window.editModeLaporan ? window.editModeLaporan.id : `PEND-${Date.now()}`;
                    let createdDate = window.editModeLaporan ? window.editModeLaporan.created_at : new Date().toISOString();
                    if(window.editModeLaporan) { jawaban.id_sasaran = selSasaran.value; }
                    
                    await putData('sync_queue', { 
                        id: idLapor, 
                        tipe_laporan: 'PENDAMPINGAN', 
                        username: session.username, 
                        id_tim: session.id_tim, 
                        id_sasaran_ref: jawaban.id_sasaran || selSasaran.value, 
                        jenis_sasaran_saat_kunjungan: selJenis.value, 
                        data_laporan: jawaban, 
                        is_synced: false, 
                        created_at: createdDate, 
                        lokasi_gps: gpsLocation 
                    });

                    window.editModeLaporan = null; 
                    alert("✅ Laporan Pendampingan Tersimpan!"); 
                    renderKonten('daftar_sasaran');
                } catch (err) { 
                    window.logErrorToServer('formPend.onsubmit', err); 
                    alert("Gagal menyimpan."); 
                } finally { 
                    btn.disabled = false; 
                }
            };
        }
    } catch(e) { window.logErrorToServer('initFormPendampingan', e); }
};

// ==========================================
// 7. FUNGSI REKAP BULANAN
// ==========================================
const initRekap = async () => {
    try {
        const session = window.currentUser; 
        const antrean = await getAllData('sync_queue').catch(()=>[]);
        const dataTim = antrean.filter(a => String(a.id_tim) === String(session.id_tim)); 
        const dataKader = dataTim.filter(a => a.username === session.username);
        
        const calculateStats = (data) => {
            const regList = data.filter(a => a.tipe_laporan === 'REGISTRASI'); 
            const pendList = data.filter(a => a.tipe_laporan === 'PENDAMPINGAN');
            const stats = { CATIN: { aktif: 0, pend: 0 }, BUMIL: { aktif: 0, pend: 0 }, BUFAS: { aktif: 0, pend: 0 }, BADUTA: { aktif: 0, pend: 0 }, TOTAL: { aktif: 0, pend: 0 } };
            const hariIni = new Date(); 
            hariIni.setHours(0,0,0,0);
            
            regList.forEach(r => {
                let isAktif = r.status_sasaran !== 'SELESAI';
                if (r.jenis_sasaran === 'CATIN' && r.data_laporan?.tanggal_pernikahan) { 
                    const tglNikah = new Date(r.data_laporan.tanggal_pernikahan); 
                    if (tglNikah < hariIni) isAktif = false; 
                }
                if (r.jenis_sasaran === 'BUFAS' && r.data_laporan?.tgl_persalinan) { 
                    const tglBatas = new Date(r.data_laporan.tgl_persalinan); 
                    tglBatas.setDate(tglBatas.getDate() + 42); 
                    if (hariIni > tglBatas) isAktif = false; 
                }
                if (isAktif && stats[r.jenis_sasaran]) { 
                    stats[r.jenis_sasaran].aktif++; 
                    stats.TOTAL.aktif++; 
                }
            });
            
            pendList.forEach(p => {
                let jenis = p.jenis_sasaran_saat_kunjungan;
                if (!jenis && p.id_sasaran_ref) { 
                    if (p.id_sasaran_ref.startsWith('CTN')) jenis = 'CATIN'; 
                    else if (p.id_sasaran_ref.startsWith('BML')) jenis = 'BUMIL'; 
                    else if (p.id_sasaran_ref.startsWith('BFS')) jenis = 'BUFAS'; 
                    else if (p.id_sasaran_ref.startsWith('BDT')) jenis = 'BADUTA'; 
                }
                if (jenis && stats[jenis]) { 
                    stats[jenis].pend++; 
                    stats.TOTAL.pend++; 
                }
            });
            return stats;
        };
        
        const statsKader = calculateStats(dataKader); 
        const statsTim = calculateStats(dataTim);
        
        const renderTableRows = (stats) => {
            const rows = ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'].map(j => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px 8px; text-align:left; font-weight:600; color: #444;">${j}</td>
                    <td style="padding: 10px 8px;">${stats[j].aktif}</td>
                    <td style="padding: 10px 8px;">${stats[j].pend}</td>
                </tr>`).join('');
            const totalRow = `
                <tr style="background: #e9ecef; font-weight: bold;">
                    <td style="padding: 12px 8px; text-align:left; color: #222;">TOTAL</td>
                    <td style="padding: 12px 8px; color: var(--primary); font-size: 1.1rem;">${stats.TOTAL.aktif}</td>
                    <td style="padding: 12px 8px; color: #198754; font-size: 1.1rem;">${stats.TOTAL.pend}</td>
                </tr>`;
            return rows + totalRow;
        };
        
        if (getEl('tbody-rekap-kader')) getEl('tbody-rekap-kader').innerHTML = renderTableRows(statsKader);
        if (getEl('tbody-rekap-tim')) getEl('tbody-rekap-tim').innerHTML = renderTableRows(statsTim);
    } catch(e) { window.logErrorToServer('initRekap', e); }
};

// ==========================================
// 8. FUNGSI KALKULATOR CERDAS
// ==========================================
const initKalkulator = () => {
    try {
        const sel = getEl('calc-selector'); 
        const boxHPL = getEl('box-calc-hpl'); 
        const boxIMT = getEl('box-calc-imt'); 
        const boxKKA = getEl('box-calc-kka');
        
        if (sel) { 
            sel.onchange = () => { 
                boxHPL.style.display = sel.value === 'HPL' ? 'block' : 'none'; 
                boxIMT.style.display = sel.value === 'IMT' ? 'block' : 'none'; 
                boxKKA.style.display = sel.value === 'KKA' ? 'block' : 'none'; 
            }; 
        }
        
        if (getEl('btn-hitung-hpl')) { 
            getEl('btn-hitung-hpl').onclick = () => { 
                const hpht = getEl('calc-hpht').value; 
                if (!hpht) { alert('Masukkan HPHT terlebih dahulu'); return; } 
                const d = new Date(hpht); 
                d.setDate(d.getDate() + 7); 
                d.setMonth(d.getMonth() - 3); 
                d.setFullYear(d.getFullYear() + 1); 
                getEl('hasil-hpl').innerHTML = `Perkiraan Lahir:<br><span style="font-size:1.5rem;">${d.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</span>`; 
            }; 
        }
        
        if (getEl('btn-hitung-imt')) { 
            getEl('btn-hitung-imt').onclick = () => { 
                const bb = parseFloat(getEl('calc-bb').value); 
                const tb = parseFloat(getEl('calc-tb').value) / 100; 
                if (!bb || !tb) { alert('Masukkan BB dan TB dengan benar'); return; } 
                const imt = (bb / (tb * tb)).toFixed(1); 
                let status = '', color = ''; 
                if (imt < 18.5) { status = 'Kekurangan Berat Badan'; color = '#dc3545'; } 
                else if (imt <= 24.9) { status = 'Normal (Ideal)'; color = '#198754'; } 
                else if (imt <= 29.9) { status = 'Kelebihan Berat Badan'; color = '#fd7e14'; } 
                else { status = 'Obesitas'; color = '#dc3545'; } 
                getEl('hasil-imt').innerHTML = `IMT Anda: <span style="font-size:1.5rem; color:${color};">${imt}</span><br><span style="color:${color};">${status}</span>`; 
            }; 
        }
        
        const selKKA = getEl('calc-usia-kka');
        if (selKKA) { 
            selKKA.onchange = () => { 
                const val = selKKA.value; 
                let html = ''; 
                if (val === '0-3') html = '✅ <b>Target KKA 0-3 Bulan:</b><br>- Menatap wajah ibu saat disusui<br>- Tersenyum membalas senyuman<br>- Menggerakkan tangan & kaki aktif'; 
                else if (val === '3-6') html = '✅ <b>Target KKA 3-6 Bulan:</b><br>- Tengkurap dan berbalik sendiri<br>- Meraih benda yang didekatkan<br>- Menoleh ke arah suara'; 
                else if (val === '6-12') html = '✅ <b>Target KKA 6-12 Bulan:</b><br>- Duduk sendiri tanpa sandaran<br>- Mengucapkan ma-ma / pa-pa<br>- Mengambil benda kecil (menjumput)'; 
                else if (val === '12-24') html = '✅ <b>Target KKA 12-24 Bulan:</b><br>- Berjalan sendiri tanpa jatuh<br>- Menyebutkan 3-6 kata bermakna<br>- Menumpuk 2-4 kubus mainan'; 
                if(html) { 
                    getEl('hasil-kka').innerHTML = `<div style="background:#e8f4fd; padding:15px; border-radius:8px; border-left:4px solid #0d6efd;">${html}<br><br><i style="font-size:0.75rem; color:#666;">*Jika anak belum bisa melakukan 1 hal di atas, sarankan ke Posyandu/Bidan.</i></div>`; 
                } else { 
                    getEl('hasil-kka').innerHTML = ''; 
                } 
            }; 
        }
    } catch(e) { window.logErrorToServer('initKalkulator', e); }
};

// ==========================================
// 9. PENGATURAN
// ==========================================
const initSetting = () => {
    try {
        const session = window.currentUser; 
        if(getEl('set-nama')) getEl('set-nama').value = session.nama; 
        if(getEl('set-id')) getEl('set-id').value = session.username;
        
        const toggleDark = getEl('toggle-dark-mode'); 
        if (toggleDark) { 
            toggleDark.checked = localStorage.getItem('theme') === 'dark'; 
            toggleDark.onchange = () => { 
                localStorage.setItem('theme', toggleDark.checked ? 'dark' : 'light'); 
                applySettings(); 
            }; 
        }
        
        const btnMin = getEl('btn-text-min'); 
        const btnPlus = getEl('btn-text-plus');
        if (btnMin && btnPlus) { 
            btnMin.onclick = () => { 
                let size = parseInt(localStorage.getItem('fontSize') || '16'); 
                if (size > 12) { size -= 2; localStorage.setItem('fontSize', size); applySettings(); } 
            }; 
            btnPlus.onclick = () => { 
                let size = parseInt(localStorage.getItem('fontSize') || '16'); 
                if (size < 24) { size += 2; localStorage.setItem('fontSize', size); applySettings(); } 
            }; 
        }
        
        const formP = getEl('form-ganti-pass'); 
        if(formP) {
            formP.onsubmit = (e) => { 
                e.preventDefault(); 
                alert("Permintaan ganti password disimpan."); 
                e.target.reset(); 
                renderKonten('dashboard'); 
            };
        }
    } catch(e) { window.logErrorToServer('initSetting', e); }
};

// ==========================================
// 10. LOGIN PINTAR VIA SERVER
// ==========================================
const SCRIPT_URL_LOGIN = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';

document.addEventListener('DOMContentLoaded', () => {
    initApp();

    const fLogin = getEl('form-login');
    if (fLogin) {
        fLogin.onsubmit = async (e) => {
            e.preventDefault();
            const btn = getEl('btn-login-submit'); 
            const id = getEl('kader-id').value.trim(); 
            const pin = getEl('kader-pin').value.trim();

            if (!id || !pin) return;
            if (btn) { btn.disabled = true; btn.innerText = "Memverifikasi ke Server..."; }

            try {
                if (!navigator.onLine) { 
                    alert("❌ Anda harus terhubung ke Internet untuk melakukan Login Otentikasi!"); 
                    if (btn) { btn.disabled = false; btn.innerText = "Masuk"; } 
                    return; 
                }

                const infoPerangkat = navigator.userAgent;
                const infoLokasi = "Lokasi Disembunyikan"; 

                const response = await fetch(SCRIPT_URL_LOGIN, { 
                    method: 'POST', 
                    body: JSON.stringify({ 
                        action: 'LOGIN', 
                        id: id, 
                        pin: pin, 
                        perangkat: infoPerangkat, 
                        lokasi: infoLokasi 
                    }) 
                });
                
                const res = await response.json();

                if (res.status === 'success') {
                    await initDB(); 
                    await putData('kader_session', res.session);
                    
                    if(getEl('kader-id')) getEl('kader-id').value = ''; 
                    if(getEl('kader-pin')) getEl('kader-pin').value = '';

                    const rUpper = String(res.session.role).toUpperCase();
                    if (rUpper.includes('SUPER')) { 
                        import('./super.js').then(module => { 
                            module.initSuperAdmin(res.session); 
                        }).catch(err => { 
                            alert("❌ Modul Super Admin tidak ditemukan!"); 
                            window.logErrorToServer('Login - Load Super', err); 
                        }); 
                    } 
                    else if (rUpper.includes('ADMIN') || rUpper.includes('PKB') || rUpper.includes('MITRA') || rUpper === 'ADMIN_DESA') { 
                        if (typeof initAdmin === 'function') { 
                            initAdmin(res.session); 
                        } else { 
                            import('./admin.js').then(module => 
                                module.initAdmin(res.session)
                            ).catch(err => window.logErrorToServer('Login - Load Admin', err)); 
                        }
                    } 
                    else { 
                        masukKeAplikasi(res.session); 
                    }
                } else { 
                    alert("❌ " + (res.message || "ID atau PIN yang Anda masukkan salah!")); 
                }
            } catch (err) { 
                window.logErrorToServer('Login Submit', err); 
                alert("Kesalahan Sistem: Gagal menghubungi server otentikasi."); 
            } finally { 
                if (btn) { btn.disabled = false; btn.innerText = "Masuk"; } 
            }
        };
    }
});

// Sidebar Toggles
const btnMenu = getEl('btn-menu'); 
const sidebar = getEl('sidebar'); 
const overlay = getEl('sidebar-overlay');
if (btnMenu && sidebar && overlay) { 
    btnMenu.addEventListener('click', () => { 
        sidebar.classList.add('active'); 
        overlay.classList.add('active'); 
    }); 
    overlay.addEventListener('click', () => { 
        sidebar.classList.remove('active'); 
        overlay.classList.remove('active'); 
    }); 
}
