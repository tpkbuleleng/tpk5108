// ==========================================
// 👑 GOD MODE: SUPER ADMIN DASHBOARD
// File Siluman - Hanya dipanggil jika Role = SUPER_ADMIN
// ==========================================
import { getAllData, clearStore } from './db.js';

export const initSuperAdmin = async (session) => {
    // Sembunyikan semua layar dasar
    const vSplash = document.getElementById('view-splash');
    const vLogin = document.getElementById('view-login');
    const vApp = document.getElementById('view-app');
    
    if(vLogin) vLogin.classList.add('hidden');
    if(vApp) vApp.classList.add('hidden');
    if(vSplash) vSplash.style.display = 'none';

    // 🔥 KERANGKA UI SUPER ADMIN (Warna Gelap Eksekutif)
    document.body.innerHTML = `
        <div id="super-root" style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; background:#eef2f5; font-family: 'Segoe UI', sans-serif; overflow: hidden;">
            
            <div id="super-sidebar-overlay" style="display:none; position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:99;"></div>
            
            <div id="super-sidebar" style="width:280px; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); color:white; display:flex; flex-direction:column; box-shadow: 4px 0 10px rgba(0,0,0,0.15); z-index:100; flex-shrink: 0; transition: transform 0.3s ease;">
                <div style="padding: 25px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align:center;">
                    <div style="font-size: 3rem; margin-bottom: 10px;">👑</div>
                    <h3 style="margin:0; font-weight:900; line-height:1.2; letter-spacing:1px;">
                        <span style="font-size:1.1rem; color:#e94560; display:block;">PUSAT KENDALI</span>
                        <span style="font-size:1.3rem; color:#ffffff; display:block;">SUPER ADMIN</span>
                    </h3>
                </div>
                
                <div style="flex:1; padding: 20px 0; overflow-y:auto; min-height:0;">
                    <div class="super-menu-item active" data-target="dashboard">🎛️ Dashboard Utama</div>
                    <div class="super-menu-item" data-target="user_management">👥 Manajemen Pengguna</div>
                    <div class="super-menu-item" data-target="kuesioner">📋 Master Kuesioner (Form)</div>
                    <div class="super-menu-item" data-target="referensi">🏗️ Master Wilayah & Referensi</div>
                    <div class="super-menu-item" data-target="audit_trail">🛡️ Audit Log & Keamanan</div>
                </div>
                
                <div style="padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);">
                    <div style="font-size:0.8rem; margin-bottom:10px; color:#adb5bd;">Dewa Sistem:<br><b style="color:#e94560;">${session.nama}</b></div>
                    <button id="btn-super-logout" style="width:100%; background:transparent; color:#e94560; border:1px solid #e94560; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold; transition: all 0.3s;">🔒 Cabut Akses (Keluar)</button>
                </div>
            </div>
            
            <div style="flex:1; display:flex; flex-direction:column; overflow:hidden; width:100%;">
                <div style="background:white; padding: 15px 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); z-index:5; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <button id="btn-toggle-super" style="background:none; border:none; font-size:1.6rem; cursor:pointer; color:#1a1a2e; padding:0; line-height:1;">☰</button>
                        <h2 id="super-page-title" style="margin:0; font-size:1.4rem; color:#1a1a2e; font-weight:800;">Dashboard Utama</h2>
                    </div>
                    <div style="font-size:0.8rem; background:#198754; color:white; padding:4px 10px; border-radius:20px; font-weight:bold; letter-spacing:1px;">SYSTEM SECURED</div>
                </div>
                <div id="super-content" style="flex:1; padding: 25px; overflow-y:auto; background:#eef2f5;"></div>
            </div>
        </div>

        <style>
            .super-menu-item { padding: 14px 25px; color: #a5b1c2; font-weight: 600; cursor: pointer; transition: all 0.3s; border-left: 4px solid transparent; font-size: 0.95rem; }
            .super-menu-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
            .super-menu-item.active { background: rgba(233, 69, 96, 0.1); color: #fff; border-left: 4px solid #e94560; }
            .super-card { background: white; border-radius: 10px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #e1e8ed; }
            #btn-super-logout:hover { background: #e94560; color: white; }
            
            @media (max-width: 1024px) {
                #super-sidebar { position: absolute; top:0; bottom:0; left:0; transform: translateX(-100%); }
                #super-sidebar.mobile-active { transform: translateX(0); }
                #super-sidebar-overlay.mobile-active { display: block !important; }
            }
            @media (min-width: 1025px) {
                #super-sidebar.desktop-collapsed { margin-left: -280px; }
            }
        </style>
    `;

    // Navigasi & Toggle Sidebar
    document.getElementById('btn-toggle-super').onclick = () => {
        const sidebar = document.getElementById('super-sidebar');
        const overlay = document.getElementById('super-sidebar-overlay');
        if (window.innerWidth <= 1024) { sidebar.classList.toggle('mobile-active'); overlay.classList.toggle('mobile-active'); } 
        else { sidebar.classList.toggle('desktop-collapsed'); }
    };
    
    document.getElementById('super-sidebar-overlay').onclick = () => {
        document.getElementById('super-sidebar').classList.remove('mobile-active');
        document.getElementById('super-sidebar-overlay').classList.remove('mobile-active');
    };

    document.getElementById('btn-super-logout').onclick = async () => { 
        if(confirm("Tutup Sesi Super Admin dan kunci sistem?")) { 
            await clearStore('kader_session'); location.reload(); 
        } 
    };

    const menuItems = document.querySelectorAll('.super-menu-item');
    menuItems.forEach(item => {
        item.onclick = () => {
            menuItems.forEach(m => m.classList.remove('active')); item.classList.add('active');
            document.getElementById('super-page-title').innerText = item.innerText.replace(/[^\w\s]/gi, '').trim();
            if (window.innerWidth <= 1024) {
                document.getElementById('super-sidebar').classList.remove('mobile-active');
                document.getElementById('super-sidebar-overlay').classList.remove('mobile-active');
            }
            renderSuperView(item.getAttribute('data-target'));
        };
    });

    renderSuperView('dashboard');
};

const renderSuperView = async (target) => {
    const content = document.getElementById('super-content');
    
    if (target === 'dashboard') {
        // Tarik data dasar dari IndexedDB (Untuk Kader, Tim, dll)
        const [kader, tim, wilayah] = await Promise.all([
            getAllData('master_kader').catch(()=>[]),
            getAllData('master_tim').catch(()=>[]),
            getAllData('master_wilayah').catch(()=>[])
        ]);

        content.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 25px;">
                <div class="super-card" style="border-top: 5px solid #0984e3;">
                    <div style="font-size:0.9rem; color:#636e72; font-weight:bold; text-transform:uppercase;">Total Kader TPK</div>
                    <div style="font-size:2.5rem; font-weight:900; color:#2d3436; margin-top:5px;">${kader.length}</div>
                </div>
                <div class="super-card" style="border-top: 5px solid #00b894;">
                    <div style="font-size:0.9rem; color:#636e72; font-weight:bold; text-transform:uppercase;">Total Tim Terbentuk</div>
                    <div style="font-size:2.5rem; font-weight:900; color:#2d3436; margin-top:5px;">${tim.length}</div>
                </div>
                <div class="super-card" style="border-top: 5px solid #fdcb6e;">
                    <div style="font-size:0.9rem; color:#636e72; font-weight:bold; text-transform:uppercase;">Total Dusun Terjangkau</div>
                    <div style="font-size:2.5rem; font-weight:900; color:#2d3436; margin-top:5px;">${wilayah.length}</div>
                </div>
            </div>
            
            <div class="super-card" style="margin-bottom: 25px;">
                <h3 style="margin-top:0; color:#1a1a2e;">🚀 Status Sistem Saat Ini</h3>
                <p style="color:#666; line-height:1.6;">
                    Selamat datang di Pusat Kendali (God Mode). Saat ini, aplikasi telah dikunci dengan <b>Security Level: Tinggi</b>. 
                    Seluruh tabel rahasia (USER_LOGIN dan MASTER_ADMIN) tidak lagi disimpan di memori perangkat, melainkan diverifikasi langsung di server Google.
                </p>
                <div style="background:#e8f4fd; padding:15px; border-radius:8px; border-left:4px solid #0984e3; margin-top:15px;">
                    <b style="color:#0984e3;">Tugas Selanjutnya:</b><br>
                    Untuk dapat mengelola Pengguna (Menambah Kader/Admin), kita perlu membuatkan API Khusus (Secure Token) di Google Script agar Super Admin bisa menarik dan mengedit data USER_LOGIN dengan aman.
                </div>
            </div>
        `;
    } 
    else if (target === 'user_management') {
        content.innerHTML = `
            <div class="super-card" style="text-align:center; padding: 50px 20px;">
                <h2 style="color:#1a1a2e; margin-top:0;">🛡️ Akses Database Pengguna Terkunci</h2>
                <p style="color:#666; max-width:600px; margin: 10px auto;">Karena alasan keamanan tingkat tinggi yang baru saja kita terapkan, data PIN dan Password seluruh pengguna saat ini dilindungi ketat di Server Google.</p>
                <button style="background:#e94560; color:white; border:none; padding:12px 25px; border-radius:6px; font-weight:bold; font-size:1rem; margin-top:20px; cursor:pointer; box-shadow: 0 4px 6px rgba(233, 69, 96, 0.3);">
                    Minta Kode Otorisasi API ke Server
                </button>
            </div>
        `;
    }
    else {
        content.innerHTML = `<div class="super-card"><h3 style="color:#666; text-align:center; margin: 40px 0;">Menu "${target}" sedang dalam tahap konstruksi... 🚧</h3></div>`;
    }
};
