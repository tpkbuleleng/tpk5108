// ==========================================
// 👑 GOD MODE: SUPER ADMIN DASHBOARD
// File Siluman - Hanya dipanggil jika Role = SUPER_ADMIN
// ==========================================
import { getAllData, clearStore } from './db.js';

// 👉 WAJIB SAMA DENGAN URL WEB APP BAPAK
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';

// 🗝️ MASTER KEY (Wajib sama dengan Properties di Google Script)
const SUPER_TOKEN = 'MasterKeyKubuSecure!001';

export const initSuperAdmin = async (session) => {
    const vSplash = document.getElementById('view-splash');
    const vLogin = document.getElementById('view-login');
    const vApp = document.getElementById('view-app');
    
    if(vLogin) vLogin.classList.add('hidden');
    if(vApp) vApp.classList.add('hidden');
    if(vSplash) vSplash.style.display = 'none';

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
                    <div class="super-menu-item" data-target="dashboard">🎛️ Dashboard Utama</div>
                    <div class="super-menu-item active" data-target="user_management">👥 Manajemen Pengguna</div>
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
                        <h2 id="super-page-title" style="margin:0; font-size:1.4rem; color:#1a1a2e; font-weight:800;">Manajemen Pengguna</h2>
                    </div>
                    <div style="font-size:0.8rem; background:#198754; color:white; padding:4px 10px; border-radius:20px; font-weight:bold; letter-spacing:1px;">API SECURED 🔐</div>
                </div>
                <div id="super-content" style="flex:1; padding: 25px; overflow-y:auto; background:#eef2f5;"></div>
            </div>
        </div>

        <div id="super-modal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;">
            <div style="background:white; padding:30px; border-radius:10px; width:90%; max-width:500px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                <h3 id="modal-title" style="margin-top:0; color:#1a1a2e;">Tambah Pengguna Baru</h3>
                <form id="form-super-user">
                    <div style="margin-bottom:15px;">
                        <label style="display:block; font-size:0.85rem; font-weight:bold; color:#666; margin-bottom:5px;">ID Pengguna / Username</label>
                        <input type="text" id="inp-id" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px; box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:15px;">
                        <label style="display:block; font-size:0.85rem; font-weight:bold; color:#666; margin-bottom:5px;">Nama Lengkap</label>
                        <input type="text" id="inp-nama" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px; box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:15px;">
                        <label style="display:block; font-size:0.85rem; font-weight:bold; color:#666; margin-bottom:5px;">PIN / Password Baru</label>
                        <input type="text" id="inp-pin" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px; box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:15px;">
                        <label style="display:block; font-size:0.85rem; font-weight:bold; color:#666; margin-bottom:5px;">Role Akses</label>
                        <select id="inp-role" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px; box-sizing:border-box;">
                            <option value="KADER">KADER TPK</option>
                            <option value="ADMIN_KECAMATAN">ADMIN KECAMATAN</option>
                            <option value="ADMIN_KABUPATEN">ADMIN KABUPATEN</option>
                        </select>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:25px;">
                        <button type="button" id="btn-close-modal" style="padding:10px 20px; border:none; background:#ccc; color:#333; border-radius:5px; cursor:pointer; font-weight:bold;">Batal</button>
                        <button type="submit" id="btn-save-user" style="padding:10px 20px; border:none; background:#0984e3; color:white; border-radius:5px; cursor:pointer; font-weight:bold;">Simpan Pengguna</button>
                    </div>
                </form>
            </div>
        </div>

        <style>
            .super-menu-item { padding: 14px 25px; color: #a5b1c2; font-weight: 600; cursor: pointer; transition: all 0.3s; border-left: 4px solid transparent; font-size: 0.95rem; }
            .super-menu-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
            .super-menu-item.active { background: rgba(233, 69, 96, 0.1); color: #fff; border-left: 4px solid #e94560; }
            .super-card { background: white; border-radius: 10px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #e1e8ed; }
            #btn-super-logout:hover { background: #e94560; color: white; }
            
            /* Tampilan Tabel Super Admin */
            .super-table-container { overflow-x: auto; border-radius: 8px; border: 1px solid #eee; }
            .super-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; min-width: 800px; background:white; }
            .super-table th { background: #1a1a2e; color: white; padding: 15px; text-align: left; font-weight:600; }
            .super-table td { padding: 12px 15px; border-bottom: 1px solid #eee; color: #444; }
            .super-table tr:hover td { background: #f8f9fa; }
            
            .badge-role { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
            .role-kader { background: #e8f4fd; color: #0984e3; }
            .role-admin { background: #fdf3e8; color: #d35400; }
            .role-super { background: #fbebf0; color: #e94560; }
            
            .btn-action { padding: 6px 12px; border: none; border-radius: 4px; font-size: 0.8rem; font-weight: bold; cursor: pointer; margin-right: 5px; }
            .btn-edit { background: #fdcb6e; color: #2d3436; }
            .btn-delete { background: #ff7675; color: white; }

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

    renderSuperView('user_management');
};

const renderSuperView = async (target) => {
    const content = document.getElementById('super-content');
    
    if (target === 'dashboard') {
        content.innerHTML = `<div class="super-card"><h3>Dashboard sedang disiapkan...</h3><p>Silakan buka menu <b>Manajemen Pengguna</b> untuk mencoba API Secure Token.</p></div>`;
    } 
    else if (target === 'user_management') {
        content.innerHTML = `
            <div class="super-card" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
                <div>
                    <h3 style="margin:0; color:#1a1a2e;">Database Pengguna Aktif</h3>
                    <p style="margin:5px 0 0 0; color:#666; font-size:0.9rem;">Menampilkan data langsung dari Google Sheet melalui Secure API.</p>
                </div>
                <button id="btn-add-user" style="background:#0984e3; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 6px rgba(9, 132, 227, 0.3);">
                    + Tambah Pengguna
                </button>
            </div>
            <div class="super-card" id="table-user-container" style="padding:0; overflow:hidden;">
                <div style="padding:50px; text-align:center; color:#666;">
                    <h3 style="margin:0;">⏳ Menghubungi Server...</h3>
                    <p style="font-size:0.9rem;">Membuka gembok dengan Secure Token...</p>
                </div>
            </div>
        `;

        // 🔥 FUNGSI SAKTI: MENGAMBIL DATA DARI SERVER DENGAN TOKEN
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'SECURE_GET_ALL',
                    token: SUPER_TOKEN,
                    sheetName: 'USER_LOGIN'
                })
            });
            const res = await response.json();
            
            if (res.status === 'success') {
                const users = res.data;
                
                let tableHtml = `
                    <div class="super-table-container">
                        <table class="super-table">
                            <thead>
                                <tr>
                                    <th>ID / Username</th>
                                    <th>Nama Pengguna</th>
                                    <th>Role Akses</th>
                                    <th>PIN / Password</th>
                                    <th>Aksi Eksekutif</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                users.forEach((u, index) => {
                    const role = String(u.role_akses || u.role || 'KADER').toUpperCase();
                    let badgeClass = 'role-kader';
                    if(role.includes('ADMIN')) badgeClass = 'role-admin';
                    if(role.includes('SUPER')) badgeClass = 'role-super';
                    
                    const pin = u.password_awal_ref || u.password || u.pin || '***';
                    const id = u.id_pengguna || u.id_user || u.username || '-';
                    const nama = u.nama || u.username || '-';

                    tableHtml += `
                        <tr>
                            <td><b>${id}</b></td>
                            <td>${nama}</td>
                            <td><span class="badge-role ${badgeClass}">${role}</span></td>
                            <td><code style="background:#eee; padding:3px 6px; border-radius:3px; color:#e94560; font-weight:bold;">${pin}</code></td>
                            <td>
                                <button class="btn-action btn-edit" onclick="alert('Fitur Reset PIN untuk ${id} segera hadir di Update V3!')">Reset PIN</button>
                                <button class="btn-action btn-delete" onclick="alert('Fitur Hapus Akun untuk ${id} segera hadir di Update V3!')">Hapus</button>
                            </td>
                        </tr>
                    `;
                });

                tableHtml += `</tbody></table></div>`;
                document.getElementById('table-user-container').innerHTML = tableHtml;

            } else {
                document.getElementById('table-user-container').innerHTML = `
                    <div style="padding:50px; text-align:center; color:#e94560;">
                        <h3>❌ Akses Ditolak oleh Server</h3>
                        <p>${res.message}</p>
                        <small>Pastikan SUPER_ADMIN_TOKEN di Code.gs benar-benar sama dengan di super.js</small>
                    </div>
                `;
            }
        } catch (error) {
            document.getElementById('table-user-container').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Terhubung ke Server</h3><p>Periksa koneksi internet Bapak.</p></div>`;
        }

        // FUNGSI MODAL TAMBAH PENGGUNA
        const modal = document.getElementById('super-modal');
        document.getElementById('btn-add-user').onclick = () => { modal.style.display = 'flex'; };
        document.getElementById('btn-close-modal').onclick = () => { modal.style.display = 'none'; };

        document.getElementById('form-super-user').onsubmit = async (e) => {
            e.preventDefault();
            const btnSave = document.getElementById('btn-save-user');
            btnSave.disabled = true; btnSave.innerText = "Menyimpan...";

            const id = document.getElementById('inp-id').value;
            const nama = document.getElementById('inp-nama').value;
            const pin = document.getElementById('inp-pin').value;
            const role = document.getElementById('inp-role').value;

            // Baris data sesuai susunan kolom USER_LOGIN Bapak
            // Susunan umum: id_pengguna, username, ref_type, ref_id, role_akses, scope_kecamatan, scope_desa, status_akun, password_awal_ref
            // Kita kirim data mentah untuk ditambah oleh API
            const newRowData = [id, nama, 'KADER', id, role, 'ALL', 'ALL', 'AKTIF', pin]; 

            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'SECURE_ADD',
                        token: SUPER_TOKEN,
                        sheetName: 'USER_LOGIN',
                        data: newRowData
                    })
                });
                const res = await response.json();
                if(res.status === 'success') {
                    alert("✅ Pengguna berhasil ditambahkan ke Server Google!");
                    modal.style.display = 'none';
                    document.getElementById('form-super-user').reset();
                    // Render ulang halaman untuk melihat data baru
                    renderSuperView('user_management'); 
                } else {
                    alert("❌ Gagal menyimpan: " + res.message);
                }
            } catch (err) {
                alert("❌ Terjadi kesalahan jaringan.");
            } finally {
                btnSave.disabled = false; btnSave.innerText = "Simpan Pengguna";
            }
        };

    }
    else {
        content.innerHTML = `<div class="super-card"><h3 style="color:#666; text-align:center; margin: 40px 0;">Menu "${target}" sedang dalam tahap konstruksi... 🚧</h3></div>`;
    }
};
