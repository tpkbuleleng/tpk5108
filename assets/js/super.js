// ==========================================
// 👑 PUSAT KENDALI SUPER ADMIN (V63 - JWT SECURITY PATCH)
// ==========================================
import { clearStore } from './db.js';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZiCcv7MCL21R1VqlOFsx1x_Ax_8yoxVwjIumG3kVYwDSQTfXX9VjQnz2GsAW2ItzAAQ/exec';

window.superSession = null;
window.superData = { audit: [], error_log: [], users: [] };

// 🔥 MESIN API SUPER ADMIN (OTOMATIS INJEK TOKEN JWT)
const apiSuper = async (action, extraData = {}) => {
    try {
        const payload = { action: action, token: window.superSession.token, ...extraData };
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await response.json();
        
        // AUTO-KICK JIKA TOKEN MATI
        if (res.status === 'error' && String(res.message).includes('401')) {
            alert("🔒 Akses Ditolak! Sesi Super Admin telah kadaluarsa atau sistem diperbarui.\n\nSistem akan mengeluarkan Anda.");
            await clearStore('kader_session'); location.reload(); return null;
        }
        return res;
    } catch (e) {
        console.error("API Super Error:", e); return null;
    }
};

const fetchSuperData = async () => {
    const res = await apiSuper('SECURE_GET_AUDIT');
    if (res && res.status === 'success') {
        window.superData.audit = res.data || [];
        window.superData.error_log = res.error_data || [];
        return true;
    }
    return false;
};

const renderSuperContent = async (target) => {
    const content = document.getElementById('super-content');
    if (!content) return;

    if (target === 'dashboard') {
        const audit = window.superData.audit; const errLog = window.superData.error_log;
        let cAktif = 0, cPasif = 0, cSukses = 0, cGagal = 0;
        
        // Kalkulasi Statistik dari Audit Log
        const userMap = {};
        audit.forEach(a => {
            if(a.aksi === 'LOGIN SUKSES') { cSukses++; userMap[a.target] = true; }
            if(a.aksi === 'LOGIN GAGAL') cGagal++;
        });
        cAktif = Object.keys(userMap).length; 

        content.innerHTML = `
            <div class="animate-fade">
                <div style="background: linear-gradient(135deg, #0A2342 0%, #0043A8 100%); color: #F1C40F; border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); border-bottom: 5px solid #F1C40F;">
                    <h2 style="margin: 0 0 10px 0; font-size: 1.8rem;">Selamat Datang, ${window.superSession.nama}! 🚀</h2>
                    <p style="margin:0; font-size:1rem; color:white;">Pusat Kendali Utama (God Mode) Sistem Pendataan Kader TPK.</p>
                </div>

                <div style="background: white; padding: 15px 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 4px solid #F1C40F;">
                    <div style="font-size: 0.85rem; font-weight: bold; color: #666; margin-bottom:10px;">🔍 FILTER STATISTIK PENGGUNAAN APLIKASI</div>
                    <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                        <select class="admin-input" style="flex:1; min-width:150px;"><option>🗓️ Sepanjang Masa</option></select>
                        <select class="admin-input" style="flex:1; min-width:150px;"><option>👥 Semua Role</option></select>
                        <select class="admin-input" style="flex:1; min-width:150px;"><option>🌍 Semua Kecamatan</option></select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #0043A8; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size:0.75rem; color:#666; font-weight:bold;">PENGGUNA AKTIF (PERNAH LOGIN)</div><div style="font-size:2rem; font-weight:900; color:#0043A8;">${cAktif}</div>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #F1C40F; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size:0.75rem; color:#666; font-weight:bold;">PASIF (BELUM PERNAH LOGIN)</div><div style="font-size:2rem; font-weight:900; color:#F1C40F;">-</div>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #198754; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size:0.75rem; color:#666; font-weight:bold;">TOTAL LOGIN BERHASIL</div><div style="font-size:2rem; font-weight:900; color:#198754;">${cSukses}</div>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size:0.75rem; color:#666; font-weight:bold;">TOTAL LOGIN GAGAL</div><div style="font-size:2rem; font-weight:900; color:#dc3545;">${cGagal}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; align-items: start;">
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-top: 4px solid #0043A8;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px;">
                            <h3 style="margin:0; font-size:1.1rem; color:#0A2342;">🛡️ Log Keamanan Terakhir (CCTV)</h3>
                            <span style="font-size:0.8rem; color:#0043A8; cursor:pointer; font-weight:bold;" onclick="document.querySelector('[data-target=\\'audit\\']').click()">Lihat Detail & Filter</span>
                        </div>
                        <div style="max-height:300px; overflow-y:auto; padding-right:10px;">
                            ${audit.slice(0, 10).map(a => `
                                <div style="font-size:0.85rem; padding:8px 0; border-bottom:1px dashed #eee; display:flex; justify-content:space-between;">
                                    <div><span style="color:#888; margin-right:10px;">${new Date(a.waktu).toLocaleString('id-ID')}</span> <b style="color:#0A2342;">${a.target}</b></div>
                                    <div style="color:${a.aksi.includes('SUKSES') ? '#198754' : (a.aksi.includes('GAGAL') ? '#dc3545' : '#0043A8')}; font-weight:bold;">${a.aksi}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div>
                        <div style="background: #fffdf8; border: 1px solid #ffe69c; padding: 20px; border-radius: 8px; border-top: 4px solid #dc3545; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom:20px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ffe69c; padding-bottom:10px; margin-bottom:15px;">
                                <h3 style="margin:0; font-size:1.1rem; color:#dc3545;">🚨 Radar Anomali (Error)</h3>
                                <span style="font-size:0.8rem; color:#dc3545; cursor:pointer; font-weight:bold;" onclick="document.querySelector('[data-target=\\'audit\\']').click()">Buka Black Box</span>
                            </div>
                            <div style="text-align:center;">
                                <div style="font-size:3rem; font-weight:900; color:#dc3545;">${errLog.length}</div>
                                <div style="font-size:0.85rem; color:#856404; font-weight:bold;">Kerusakan Ditemukan</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } 
    else if (target === 'audit') {
        const audit = window.superData.audit; const errLog = window.superData.error_log;
        content.innerHTML = `
            <div class="animate-fade">
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 5px solid #F1C40F; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center;">
                    <div><h2 style="margin: 0 0 5px 0; color: #0A2342; font-size:1.4rem;">🛡️ Audit Log & Keamanan</h2><p style="margin:0; font-size:0.9rem; color:#666;">Rekaman CCTV aktivitas pengguna dan kotak hitam (Black Box) error sistem.</p></div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-action" style="background:#eef2f5; color:#0A2342; border:1px solid #ced4da; padding:8px 15px; border-radius:6px; font-weight:bold;">🎥 CCTV Log Aktivitas</button>
                        <button class="btn-action" style="background:#dc3545; color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold;">🚨 Radar Error (Black Box)</button>
                    </div>
                </div>

                <div style="background: white; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); overflow:hidden; border: 1px solid #e1e8ed;">
                    <div style="padding: 15px; background: #f8f9fa; border-bottom: 1px solid #e1e8ed; display:flex; gap:15px; align-items:center;">
                        <input type="text" class="admin-input" placeholder="🔍 Cari ID/Lokasi/Pesan Error..." style="flex:1;">
                        <div style="background:#dc3545; color:white; padding:8px 15px; border-radius:6px; font-weight:bold; font-size:0.85rem;">${errLog.length} Kerusakan Ditemukan</div>
                    </div>
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.85rem; text-align:left;">
                            <thead style="background:#0A2342; color:white;"><tr><th style="padding:12px; border-bottom:3px solid #F1C40F;">Waktu Sistem (WITA)</th><th style="padding:12px; border-bottom:3px solid #F1C40F;">ID Pengguna</th><th style="padding:12px; border-bottom:3px solid #F1C40F;">Lokasi Kerusakan</th><th style="padding:12px; border-bottom:3px solid #F1C40F;">Info Perangkat</th><th style="padding:12px; border-bottom:3px solid #F1C40F;">Pesan Error (Terminal Log)</th></tr></thead>
                            <tbody>
                                ${errLog.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding:30px; font-size:1.1rem; color:#198754; font-weight:bold;">✅ Mesin Bersih! Tidak ada Error yang terekam.</td></tr>` : 
                                errLog.map(e => `
                                    <tr style="border-bottom:1px solid #eee;">
                                        <td style="padding:12px; color:#666;">${new Date(e.waktu).toLocaleString('id-ID')}</td>
                                        <td style="padding:12px; font-weight:bold; color:#dc3545;">${e.id_pengguna || '-'}</td>
                                        <td style="padding:12px; font-weight:bold; color:#0A2342;">${e.lokasi_sistem || '-'}</td>
                                        <td style="padding:12px; font-size:0.75rem; color:#888; max-width:200px; word-wrap:break-word;">${e.perangkat || '-'}</td>
                                        <td style="padding:12px;"><div style="background:#fcf1f6; color:#d63384; padding:6px 10px; border-radius:4px; font-family:monospace;">${e.pesan_error || '-'}</div></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } else {
        content.innerHTML = `<div class="animate-fade" style="text-align:center; padding: 50px;"><div style="font-size: 4rem; margin-bottom: 15px;">🚧</div><h2 style="color: #0A2342; margin-bottom: 10px;">Fitur Super Admin Sedang Dibangun</h2><p style="color: #666;">Halaman untuk <b>${target}</b> akan segera hadir.</p></div>`;
    }
};

export const initSuperAdmin = async (session) => {
    window.superSession = session;
    document.body.innerHTML = `
        <div style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; background:#eef2f5; font-family: 'Segoe UI', sans-serif; overflow: hidden;">
            <style>
                .super-menu { padding: 15px 25px; color: #E8F4FD; font-weight: 600; cursor: pointer; transition: all 0.2s; border-left: 4px solid transparent; font-size: 0.95rem; display:flex; align-items:center; gap:10px; } 
                .super-menu:hover { background: rgba(255,255,255, 0.1); color: #F1C40F; } 
                .super-menu.active { background: rgba(255,255,255, 0.2); color: #F1C40F; border-left: 4px solid #F1C40F; } 
                .admin-input { padding:10px 12px; border:1px solid #ced4da; border-radius:6px; outline:none; font-family:inherit; } 
                .admin-input:focus { border-color:#0043A8; box-shadow: 0 0 0 2px rgba(0,67,168, 0.2); }
                .btn-action:hover { opacity: 0.8; transform:translateY(-1px); cursor:pointer; }
            </style>
            <div style="width:260px; background: #0A2342; color:white; display:flex; flex-direction:column; box-shadow: 2px 0 10px rgba(0,0,0,0.2); z-index:10;">
                <div style="padding: 25px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align:center;">
                    <div style="font-size: 3rem; margin-bottom: 5px;">👑</div>
                    <h3 style="margin:0; font-weight:900; line-height:1.2; color:#F1C40F; letter-spacing:1px;">PUSAT KENDALI</h3>
                    <div style="font-size:1rem; color:white; font-weight:bold; margin-top:2px;">SUPER ADMIN</div>
                </div>
                <div style="flex:1; padding: 15px 0; overflow-y:auto;">
                    <div class="super-menu active" data-target="dashboard">🎛️ Dashboard Utama</div>
                    <div class="super-menu" data-target="broadcast">📢 Pusat Siaran (Broadcast)</div>
                    <div class="super-menu" data-target="users">👥 Manajemen Pengguna</div>
                    <div class="super-menu" data-target="kuesioner">📋 Master Kuesioner (Form)</div>
                    <div class="super-menu" data-target="rbac">🎚️ Manajemen Menu (RBAC)</div>
                    <div class="super-menu" data-target="widget">🧩 Pabrik Halaman (Widget)</div>
                    <div class="super-menu" data-target="ekspor">💾 Data Center (Ekspor)</div>
                    <div class="super-menu" data-target="wilayah">🗺️ Master Wilayah & Referensi</div>
                    <div class="super-menu" data-target="audit">🛡️ Audit Log & Keamanan</div>
                </div>
                <div style="padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3);">
                    <div style="font-size:0.8rem; margin-bottom:10px; color:white;">Dewa Sistem:<br><b style="color:#F1C40F; font-size:0.95rem;">${session.nama}</b></div>
                    <button id="btn-super-logout" style="width:100%; background:transparent; color:#F1C40F; border:1px solid #F1C40F; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold; transition: all 0.3s;">🔒 Cabut Akses (Keluar)</button>
                </div>
            </div>
            <div style="flex:1; display:flex; flex-direction:column; overflow:hidden; width:100%;">
                <div style="background:white; padding: 15px 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); z-index:5; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e1e8ed;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <h2 id="super-page-title" style="margin:0; font-size:1.3rem; color:#0A2342; font-weight:800;">Menghubungkan ke Satelit...</h2>
                    </div>
                    <div style="background:#198754; color:white; padding:5px 12px; border-radius:20px; font-size:0.8rem; font-weight:bold; letter-spacing:1px;">API SECURED 🔒</div>
                </div>
                <div id="super-content" style="flex:1; padding: 25px; overflow-y:auto; background:#eef2f5;">
                    <div style="padding:50px; text-align:center; color:#0A2342;">
                        <div style="font-size:3rem; margin-bottom:15px; animation: spin 2s linear infinite;">⏳</div>
                        <h3>Verifikasi Enkripsi & Token...</h3>
                    </div>
                </div>
            </div>
        </div>
        <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
    `;

    document.getElementById('btn-super-logout').onclick = async () => { if(confirm("🚪 Yakin ingin memutus koneksi God Mode?")) { await clearStore('kader_session'); location.reload(); } };
    
    document.querySelectorAll('.super-menu').forEach(item => { 
        item.onclick = () => { 
            document.querySelectorAll('.super-menu').forEach(m => m.classList.remove('active')); 
            item.classList.add('active'); 
            document.getElementById('super-page-title').innerText = item.innerText.replace(/[^\w\s\(\)]/gi, '').trim(); 
            renderSuperContent(item.getAttribute('data-target')); 
        }; 
    });

    const success = await fetchSuperData();
    if(success) {
        document.getElementById('super-page-title').innerText = 'Dashboard Utama';
        renderSuperContent('dashboard');
    } else {
        document.getElementById('super-content').innerHTML = `<div style="padding:50px; text-align:center; color:#dc3545;"><h3>❌ Gagal Terhubung ke Satelit</h3><p>Sesi JWT ditolak atau koneksi terputus.</p></div>`;
        document.getElementById('super-page-title').innerText = 'Akses Ditolak';
    }
};
