// ==========================================
// 👑 GOD MODE: SUPER ADMIN DASHBOARD (V8.1 - Cascading Dropdown)
// ==========================================
import { getAllData, clearStore } from './db.js';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';
const SUPER_TOKEN = 'MasterKeyKubuSecure!001';

window.superUsersData = [];
window.superTimData = []; 
window.currentFilteredIds = [];

window.superResetPin = async (idUser, namaUser) => {
    const newPin = prompt(`🔐 Reset PIN untuk Pengguna:\nID: ${idUser}\nNama: ${namaUser}\n\nMasukkan PIN Baru (Min 5 karakter):`);
    if (!newPin || newPin.length < 5) return;
    if (!confirm(`Anda yakin mengubah PIN ${namaUser} menjadi: ${newPin} ?`)) return;
    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_USER', token: SUPER_TOKEN, id_user: idUser, updateType: 'PIN', newPin: newPin }) });
        const res = await response.json(); if (res.status === 'success') { alert(`✅ PIN berhasil direset!`); window.renderSuperView('user_management'); } else { alert("❌ Gagal: " + res.message); }
    } catch (e) { alert("❌ Kesalahan Jaringan."); }
};
window.superToggleStatus = async (idUser, namaUser, currentStatus) => {
    const isAktif = (currentStatus || 'AKTIF').toUpperCase() === 'AKTIF';
    const newStatus = isAktif ? 'NONAKTIF' : 'AKTIF';
    if (!confirm(`⚠️ PERINGATAN!\nAnda akan ${isAktif ? 'MEMBLOKIR' : 'MENGAKTIFKAN'} akses untuk: ${namaUser}\n\nLanjutkan?`)) return;
    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_USER', token: SUPER_TOKEN, id_user: idUser, updateType: 'STATUS', newStatus: newStatus }) });
        const res = await response.json(); if (res.status === 'success') { alert(`✅ Status diubah menjadi ${newStatus}!`); window.renderSuperView('user_management'); } else { alert("❌ Gagal: " + res.message); }
    } catch (e) { alert("❌ Kesalahan Jaringan."); }
};
window.superBulkAction = async (actionType) => {
    const checkedBoxes = document.querySelectorAll('.chk-user:checked'); const targetIds = Array.from(checkedBoxes).map(cb => cb.value); const totalTarget = targetIds.length;
    if (totalTarget === 0) { alert("Pilih minimal 1 pengguna!"); return; }
    let confirmMsg = ""; let updateType = ""; let newValue = "";
    if (actionType === 'BLOKIR') { confirmMsg = `⚠️ MEMBLOKIR ${totalTarget} akun. Ketik "YAKIN":`; updateType = 'STATUS'; newValue = 'NONAKTIF'; } else if (actionType === 'AKTIFKAN') { confirmMsg = `MENGAKTIFKAN ${totalTarget} akun. Ketik "YAKIN":`; updateType = 'STATUS'; newValue = 'AKTIF'; } else if (actionType === 'RESETPIN') { const pinMasal = prompt(`PIN BARU untuk ${totalTarget} akun:`); if (!pinMasal || pinMasal.length < 5) return; confirmMsg = `⚠️ MERESET PIN ${totalTarget} akun menjadi "${pinMasal}". Ketik "YAKIN":`; updateType = 'PIN'; newValue = pinMasal; }
    if (prompt(confirmMsg) !== "YAKIN") return;
    document.getElementById('table-wrapper').innerHTML = `<div style="padding:50px; text-align:center;"><h3>🚀 MENGEKSEKUSI...</h3></div>`;
    try { const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_BULK_UPDATE_USER', token: SUPER_TOKEN, ids: targetIds, updateType: updateType, newValue: newValue }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ SUKSES! ${res.count} Akun diperbarui!`); } else { alert("❌ Gagal: " + res.message); } window.renderSuperView('user_management'); } catch (e) { alert("❌ Kesalahan."); window.renderSuperView('user_management'); }
};

export const initSuperAdmin = async (session) => {
    const vSplash = document.getElementById('view-splash'); const vLogin = document.getElementById('view-login'); const vApp = document.getElementById('view-app');
    if(vLogin) vLogin.classList.add('hidden'); if(vApp) vApp.classList.add('hidden'); if(vSplash) vSplash.style.display = 'none';

    document.body.innerHTML = `
        <div id="super-root" style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; background:#eef2f5; font-family: 'Segoe UI', sans-serif; overflow: hidden;">
            <div id="super-sidebar-overlay" style="display:none; position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:99;"></div>
            <div id="super-sidebar" style="width:280px; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); color:white; display:flex; flex-direction:column; box-shadow: 4px 0 10px rgba(0,0,0,0.15); z-index:100; flex-shrink: 0; transition: transform 0.3s ease;">
                <div style="padding: 25px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align:center;"><div style="font-size: 3rem; margin-bottom: 10px;">👑</div><h3 style="margin:0; font-weight:900; line-height:1.2; letter-spacing:1px;"><span style="font-size:1.1rem; color:#e94560; display:block;">PUSAT KENDALI</span><span style="font-size:1.3rem; color:#ffffff; display:block;">SUPER ADMIN</span></h3></div>
                <div style="flex:1; padding: 20px 0; overflow-y:auto; min-height:0;">
                    <div class="super-menu-item" data-target="dashboard">🎛️ Dashboard Utama</div>
                    <div class="super-menu-item active" data-target="user_management">👥 Manajemen Pengguna</div>
                    <div class="super-menu-item" data-target="kuesioner">📋 Master Kuesioner (Form)</div>
                    <div class="super-menu-item" data-target="referensi">🏗️ Master Wilayah & Referensi</div>
                    <div class="super-menu-item" data-target="audit_trail">🛡️ Audit Log & Keamanan</div>
                </div>
                <div style="padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);"><div style="font-size:0.8rem; margin-bottom:10px; color:#adb5bd;">Dewa Sistem:<br><b style="color:#e94560;">${session.nama}</b></div><button id="btn-super-logout" style="width:100%; background:transparent; color:#e94560; border:1px solid #e94560; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold; transition: all 0.3s;">🔒 Cabut Akses (Keluar)</button></div>
            </div>
            
            <div style="flex:1; display:flex; flex-direction:column; overflow:hidden; width:100%;">
                <div style="background:white; padding: 15px 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); z-index:5; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:15px;"><button id="btn-toggle-super" style="background:none; border:none; font-size:1.6rem; cursor:pointer; color:#1a1a2e; padding:0; line-height:1;">☰</button><h2 id="super-page-title" style="margin:0; font-size:1.4rem; color:#1a1a2e; font-weight:800;">Manajemen Pengguna</h2></div>
                    <div style="font-size:0.8rem; background:#198754; color:white; padding:4px 10px; border-radius:20px; font-weight:bold; letter-spacing:1px;">API SECURED 🔐</div>
                </div>
                <div id="super-content" style="flex:1; padding: 25px; overflow-y:auto; background:#eef2f5;"></div>
            </div>
        </div>

        <style>
            .super-menu-item { padding: 14px 25px; color: #a5b1c2; font-weight: 600; cursor: pointer; transition: all 0.3s; border-left: 4px solid transparent; font-size: 0.95rem; } .super-menu-item:hover { background: rgba(255,255,255,0.05); color: #fff; } .super-menu-item.active { background: rgba(233, 69, 96, 0.1); color: #fff; border-left: 4px solid #e94560; } .super-card { background: white; border-radius: 10px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #e1e8ed; } #btn-super-logout:hover { background: #e94560; color: white; }
            .super-table-container { max-height: calc(100vh - 340px); overflow-y: auto; border-radius: 8px; border: 1px solid #eee; background:white; } .super-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; min-width: 1100px; } .super-table th { position: sticky; top: 0; z-index: 10; background: #1a1a2e; color: white; padding: 15px; text-align: left; font-weight:600; box-shadow: 0 2px 4px rgba(0,0,0,0.1); } .super-table td { padding: 12px 15px; border-bottom: 1px solid #eee; color: #444; } .super-table tr:hover td { background: #f8f9fa; }
            .badge-role { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; } .role-kader { background: #e8f4fd; color: #0984e3; } .role-admin { background: #fdf3e8; color: #d35400; } .role-super { background: #fbebf0; color: #e94560; }
            .btn-action { padding: 6px 12px; border: none; border-radius: 4px; font-size: 0.8rem; font-weight: bold; cursor: pointer; margin-right: 5px; transition: opacity 0.2s;} .btn-action:hover { opacity: 0.8; } .btn-edit { background: #fdcb6e; color: #2d3436; } .filter-input { padding:8px 12px; border:1px solid #ccc; border-radius:6px; outline:none; font-family:inherit; } .filter-input:focus { border-color:#0984e3; box-shadow: 0 0 0 2px rgba(9, 132, 227, 0.2); }
            .btn-mass { padding: 8px 15px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; color: white; display: flex; align-items: center; gap: 5px; font-size:0.85rem;}
            .chk-user { cursor:pointer; transform:scale(1.3); accent-color: #0984e3; } #chk-all-users { cursor:pointer; transform:scale(1.3); accent-color: #e94560; }
            #btn-clear-search:hover { color: #e94560 !important; }
            @media (max-width: 1024px) { #super-sidebar { position: absolute; top:0; bottom:0; left:0; transform: translateX(-100%); } #super-sidebar.mobile-active { transform: translateX(0); } #super-sidebar-overlay.mobile-active { display: block !important; } } @media (min-width: 1025px) { #super-sidebar.desktop-collapsed { margin-left: -280px; } }
        </style>
    `;

    document.getElementById('btn-toggle-super').onclick = () => { const s = document.getElementById('super-sidebar'); const o = document.getElementById('super-sidebar-overlay'); if (window.innerWidth <= 1024) { s.classList.toggle('mobile-active'); o.classList.toggle('mobile-active'); } else { s.classList.toggle('desktop-collapsed'); } };
    document.getElementById('super-sidebar-overlay').onclick = () => { document.getElementById('super-sidebar').classList.remove('mobile-active'); document.getElementById('super-sidebar-overlay').classList.remove('mobile-active'); };
    document.getElementById('btn-super-logout').onclick = async () => { if(confirm("Tutup Sesi Super Admin dan kunci sistem?")) { await clearStore('kader_session'); location.reload(); } };

    const menuItems = document.querySelectorAll('.super-menu-item');
    menuItems.forEach(item => { item.onclick = () => { menuItems.forEach(m => m.classList.remove('active')); item.classList.add('active'); document.getElementById('super-page-title').innerText = item.innerText.replace(/[^\w\s]/gi, '').trim(); if (window.innerWidth <= 1024) { document.getElementById('super-sidebar').classList.remove('mobile-active'); document.getElementById('super-sidebar-overlay').classList.remove('mobile-active'); } window.renderSuperView(item.getAttribute('data-target')); }; });

    window.renderSuperView('user_management');
};

window.renderUserTable = () => {
    const searchVal = document.getElementById('flt-search').value.toLowerCase(); const roleVal = document.getElementById('flt-role').value; const kecVal = document.getElementById('flt-kec').value;
    let tableHtml = `<table class="super-table"><thead><tr><th style="text-align:center; width:40px;"><input type="checkbox" id="chk-all-users" title="Pilih Semua yang Tampil"></th><th>ID / Username</th><th>Nama Pengguna</th><th>No. Tim</th><th>Desa/Kelurahan</th><th>Wilayah/Kecamatan</th><th>Role Akses</th><th>PIN / Password</th><th>Status Akun</th><th>Aksi Eksekutif</th></tr></thead><tbody>`;

    let count = 0; window.currentFilteredIds = [];
    window.superUsersData.forEach((u) => {
        const role = String(u.role_akses || u.role || 'KADER').toUpperCase(); const pin = u.password_awal_ref || u.password || u.pin || '***'; const id = u.id_pengguna || u.id_user || u.username || '-'; const nama = u.nama || u.username || '-'; const kec = String(u.scope_kecamatan || u.kecamatan || u.wilayah || 'ALL').toUpperCase(); const currentStatus = String(u.status_akun || 'AKTIF').toUpperCase();
        const tim = u._nomor_tim || '-'; const desa = u._desa || '-';

        const matchSearch = id.toLowerCase().includes(searchVal) || nama.toLowerCase().includes(searchVal) || tim.toLowerCase().includes(searchVal) || desa.toLowerCase().includes(searchVal);
        const matchRole = roleVal === 'ALL' || role.includes(roleVal);
        const matchKec = kecVal === 'ALL' || kec === kecVal || kec === 'ALL';

        if (matchSearch && matchRole && matchKec) {
            count++;
            if (!role.includes('SUPER')) { window.currentFilteredIds.push(id); }

            let badgeClass = role.includes('ADMIN') ? 'role-admin' : (role.includes('SUPER') ? 'role-super' : 'role-kader');
            const isAktif = currentStatus === 'AKTIF';
            const statusUI = isAktif ? '<span style="color:#00b894; font-weight:bold;">🟢 Aktif</span>' : '<span style="color:#ff7675; font-weight:bold;">🔴 Diblokir</span>';
            const toggleText = isAktif ? 'Blokir' : 'Aktifkan';
            const toggleColor = isAktif ? '#ff7675' : '#00b894';

            let chkBox = ''; let actionButtons = '';
            if (role.includes('SUPER')) { chkBox = `🔒`; actionButtons = `<span style="font-size:0.8rem; color:#b2bec3; font-style:italic; font-weight:bold;">🛡️ Akses Dilindungi</span>`; } 
            else { chkBox = `<input type="checkbox" class="chk-user" value="${id}">`; actionButtons = `<button class="btn-action btn-edit" onclick="window.superResetPin('${id}', '${nama}')">Reset PIN</button><button class="btn-action" style="background:${toggleColor}; color:white;" onclick="window.superToggleStatus('${id}', '${nama}', '${currentStatus}')">${toggleText}</button>`; }

            tableHtml += `<tr style="opacity: ${isAktif ? '1' : '0.6'};"><td style="text-align:center;">${chkBox}</td><td><b>${id}</b></td><td>${nama}</td><td><b style="color:#0984e3;">${tim}</b></td><td>${desa}</td><td>${kec}</td><td><span class="badge-role ${badgeClass}">${role}</span></td><td><code style="background:#eee; padding:3px 6px; border-radius:3px; color:#e94560; font-weight:bold;">${pin}</code></td><td>${statusUI}</td><td>${actionButtons}</td></tr>`;
        }
    });

    if(count === 0) { tableHtml += `<tr><td colspan="10" style="text-align:center; padding:30px; color:#666;">Tidak ada pengguna yang cocok dengan filter.</td></tr>`; }
    tableHtml += `</tbody></table>`;
    document.getElementById('table-wrapper').innerHTML = tableHtml;
    
    const chkAll = document.getElementById('chk-all-users');
    if (chkAll) { chkAll.addEventListener('change', (e) => { const boxes = document.querySelectorAll('.chk-user'); boxes.forEach(b => b.checked = e.target.checked); }); }
    const lblCount = document.getElementById('lbl-count'); if(lblCount) lblCount.innerText = `${count} Pengguna`;
};

window.renderSuperView = async (target) => {
    const content = document.getElementById('super-content');
    if (target === 'dashboard') { content.innerHTML = `<div class="super-card"><h3>Dashboard sedang disiapkan...</h3><p>Silakan buka menu <b>Manajemen Pengguna</b>.</p></div>`; } 
    else if (target === 'user_management') {
        content.innerHTML = `
            <div class="super-card" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
                <div><h3 style="margin:0; color:#1a1a2e;">Database Pengguna Aktif</h3><p style="margin:5px 0 0 0; color:#666; font-size:0.9rem;">Menampilkan data langsung dari Google Sheet melalui Secure API.</p></div>
                <button id="btn-show-add" style="background:#0984e3; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 6px rgba(9, 132, 227, 0.3);">+ Tambah Pengguna</button>
            </div>
            
            <div class="super-card" style="padding:0; overflow:hidden;">
                <div style="background:#f8f9fa; padding:15px; border-bottom:1px solid #eee; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                    <div style="position: relative; flex: 1; min-width: 200px;">
                        <input type="text" id="flt-search" class="filter-input" placeholder="🔍 Cari ID/Nama/Desa/Tim..." style="width: 100%; padding-right: 35px; box-sizing: border-box;">
                        <button id="btn-clear-search" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 1.3rem; font-weight: bold; color: #aaa; cursor: pointer; display: none; padding: 0;" title="Bersihkan Pencarian">&times;</button>
                    </div>
                    <select id="flt-role" class="filter-input"><option value="ALL">📋 Semua Role</option><option value="KADER">KADER</option><option value="ADMIN_KECAMATAN">ADMIN KECAMATAN</option><option value="ADMIN_KABUPATEN">ADMIN KABUPATEN</option></select>
                    <select id="flt-kec" class="filter-input" id="flt-kec-container"><option value="ALL">🌍 Semua Wilayah</option></select>
                    <div style="font-size:0.85rem; font-weight:bold; color:#666; background:#fff; padding:8px 12px; border:1px solid #ddd; border-radius:6px;" id="lbl-count">0 Pengguna</div>
                </div>

                <div style="background:#fff3cd; padding:10px 15px; border-bottom:1px solid #ffeeba; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.85rem; color:#856404; font-weight:bold;">⚠️ AKSI MASSAL (Centang kotak di tabel, lalu klik tombol):</span>
                    <div style="display:flex; gap:8px;">
                        <button class="btn-mass" style="background:#e94560;" onclick="window.superBulkAction('BLOKIR')">🛑 Blokir Terpilih</button>
                        <button class="btn-mass" style="background:#00b894;" onclick="window.superBulkAction('AKTIFKAN')">🟢 Aktifkan Terpilih</button>
                        <button class="btn-mass" style="background:#fdcb6e; color:#333;" onclick="window.superBulkAction('RESETPIN')">🔑 Reset PIN Terpilih</button>
                    </div>
                </div>

                <div id="table-wrapper" class="super-table-container"><div style="padding:50px; text-align:center; color:#666;"><h3 style="margin:0;">⏳ Menghubungi Server & Mapping Data...</h3></div></div>
            </div>

            <div id="modal-add-user" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;">
                <div style="background:white; padding:30px; border-radius:10px; width:90%; max-width:480px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                    <h3 style="margin-top:0; color:#1a1a2e; border-bottom:2px solid #eee; padding-bottom:10px;">➕ Tambah Pengguna Baru</h3>
                    
                    <div style="margin-bottom:15px;">
                        <label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">ID Pengguna / Kunci Masuk</label>
                        <input type="text" id="add-id" class="filter-input" placeholder="Cth: TPK9999 / ADM-SGR" style="width:100%; box-sizing:border-box;" required>
                    </div>
                    <div style="margin-bottom:15px;">
                        <label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Nama Lengkap Pengguna</label>
                        <input type="text" id="add-nama" class="filter-input" placeholder="Nama Asli" style="width:100%; box-sizing:border-box;" required>
                    </div>
                    <div style="display:flex; gap:10px; margin-bottom:15px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Role Akses</label>
                            <select id="add-role" class="filter-input" style="width:100%; box-sizing:border-box;">
                                <option value="KADER">KADER TPK</option>
                                <option value="ADMIN_KECAMATAN">ADMIN KECAMATAN</option>
                                <option value="ADMIN_KABUPATEN">ADMIN KABUPATEN</option>
                            </select>
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Cakupan Wilayah</label>
                            <select id="add-kec" class="filter-input" style="width:100%; box-sizing:border-box;">
                                <option value="GEROKGAK">GEROKGAK</option>
                                <option value="SERIRIT">SERIRIT</option>
                                <option value="BUSUNGBIU">BUSUNGBIU</option>
                                <option value="BANJAR">BANJAR</option>
                                <option value="BULELENG">BULELENG</option>
                                <option value="SUKASADA">SUKASADA</option>
                                <option value="SAWAN">SAWAN</option>
                                <option value="KUBUTAMBAHAN">KUBUTAMBAHAN</option>
                                <option value="TEJAKULA">TEJAKULA</option>
                                <option value="ALL">ALL (Semua Wilayah)</option>
                            </select>
                        </div>
                    </div>

                    <div id="panel-kader-area" style="display:block; background:#eef2f5; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #dcdde1;">
                        <p style="margin:0 0 10px 0; font-size:0.85rem; font-weight:bold; color:#0984e3;">📍 Penempatan Tugas Kader</p>
                        
                        <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:5px;">1. Pilih Desa / Kelurahan</label>
                        <select id="add-desa" class="filter-input" style="width:100%; box-sizing:border-box; margin-bottom:10px;">
                            <option value="">-- Pilih Desa --</option>
                        </select>

                        <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:5px;">2. Pilih Tim / Dusun</label>
                        <select id="add-tim" class="filter-input" style="width:100%; box-sizing:border-box;">
                            <option value="">-- Pilih Tim / Dusun --</option>
                        </select>

                        <div style="font-size:0.7rem; color:#888; margin-top:5px; font-style:italic;">*Sistem otomatis membuat profil kader ini di MASTER_KADER.</div>
                    </div>

                    <div style="margin-bottom:25px;">
                        <label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">PIN / Password Awal</label>
                        <input type="text" id="add-pin" class="filter-input" placeholder="Minimal 5 karakter" style="width:100%; box-sizing:border-box;" required>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button type="button" id="btn-close-add" style="padding:10px 20px; border:none; background:#eee; color:#333; border-radius:5px; cursor:pointer; font-weight:bold;">Batal</button>
                        <button type="button" id="btn-submit-add" style="padding:10px 20px; border:none; background:#0984e3; color:white; border-radius:5px; cursor:pointer; font-weight:bold;">Simpan ke Server</button>
                    </div>
                </div>
            </div>
        `;

        try {
            const [kaderData, timData] = await Promise.all([ getAllData('master_kader').catch(()=>[]), getAllData('master_tim').catch(()=>[]) ]);
            window.superTimData = timData || [];

            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'USER_LOGIN' }) });
            const res = await response.json();
            if (res.status === 'success') {
                
                window.superUsersData = res.data.map(u => {
                    let nTim = '-'; let nDesa = String(u.scope_desa || u.desa_kelurahan || u.desa || u.wilayah_desa || '-').toUpperCase();
                    const role = String(u.role_akses || u.role || 'KADER').toUpperCase();
                    const refId = u.ref_id || u.id_pengguna || u.id_user || u.username;

                    if (role.includes('KADER')) {
                        const k = kaderData.find(kd => String(kd.id_kader) === String(refId) || String(kd.nik) === String(refId));
                        if (k) {
                            const idTim = k.id_tim || k.tim;
                            const t = timData.find(td => String(td.id_tim) === String(idTim) || String(td.id) === String(idTim));
                            if (t) { nTim = String(t.nomor_tim || t.nama_tim || idTim); let d = t.desa_kelurahan || t.desa || k.desa_kelurahan || k.desa || nDesa; nDesa = String(d).toUpperCase(); }
                        }
                    }
                    if (nDesa === 'UNDEFINED' || nDesa === '') nDesa = '-';
                    u._nomor_tim = nTim; u._desa = nDesa; return u;
                });

                const kecSet = new Set(); window.superUsersData.forEach(u => { const k = String(u.scope_kecamatan || u.kecamatan || u.wilayah || '').toUpperCase().trim(); if(k && k !== 'ALL' && k !== 'SEMUA' && k !== '-') kecSet.add(k); });
                const selectKec = document.getElementById('flt-kec'); Array.from(kecSet).sort().forEach(k => { const opt = document.createElement('option'); opt.value = k; opt.innerText = k; selectKec.appendChild(opt); });
                
                const searchInput = document.getElementById('flt-search'); const clearBtn = document.getElementById('btn-clear-search');
                window.renderUserTable();
                searchInput.addEventListener('input', () => { clearBtn.style.display = searchInput.value ? 'block' : 'none'; window.renderUserTable(); });
                clearBtn.addEventListener('click', () => { searchInput.value = ''; clearBtn.style.display = 'none'; searchInput.focus(); window.renderUserTable(); });
                document.getElementById('flt-role').addEventListener('change', window.renderUserTable); document.getElementById('flt-kec').addEventListener('change', window.renderUserTable);

                // 🔥 LOGIKA CASCADING DROPDOWN (BERTINGKAT)
                const modalAdd = document.getElementById('modal-add-user');
                const roleSelect = document.getElementById('add-role');
                const formKecSelect = document.getElementById('add-kec');
                const panelKader = document.getElementById('panel-kader-area');
                const formDesaSelect = document.getElementById('add-desa');
                const timSelect = document.getElementById('add-tim');

                document.getElementById('btn-show-add').onclick = () => {
                    if(roleSelect.value === 'KADER') populateDesaDropdown();
                    modalAdd.style.display = 'flex';
                };
                document.getElementById('btn-close-add').onclick = () => modalAdd.style.display = 'none';

                // 1. Ekstrak Desa berdasarkan Kecamatan
                const populateDesaDropdown = () => {
                    const selectedKec = formKecSelect.value;
                    formDesaSelect.innerHTML = '<option value="">-- Pilih Desa / Kelurahan --</option>';
                    timSelect.innerHTML = '<option value="">-- Pilih Tim / Dusun --</option>'; // Reset tim

                    if (!selectedKec || selectedKec === 'ALL') return;

                    const desaSet = new Set();
                    window.superTimData.forEach(t => {
                        const k = String(t.kecamatan || t.wilayah || '').toUpperCase();
                        if (k === selectedKec) {
                            const d = String(t.desa_kelurahan || t.desa || '').toUpperCase();
                            if (d && d !== 'UNDEFINED' && d !== '-') desaSet.add(d);
                        }
                    });

                    Array.from(desaSet).sort().forEach(d => {
                        const opt = document.createElement('option');
                        opt.value = d; opt.innerText = d;
                        formDesaSelect.appendChild(opt);
                    });
                };

                // 2. Ekstrak Tim berdasarkan Desa
                const populateTimDropdown = () => {
                    const selectedKec = formKecSelect.value;
                    const selectedDesa = formDesaSelect.value;

                    timSelect.innerHTML = '<option value="">-- Pilih Tim / Dusun --</option>';
                    if (!selectedDesa) return;

                    const filteredTim = window.superTimData.filter(t => {
                        const k = String(t.kecamatan || t.wilayah || '').toUpperCase();
                        const d = String(t.desa_kelurahan || t.desa || '').toUpperCase();
                        return k === selectedKec && d === selectedDesa;
                    });

                    filteredTim.sort((a,b) => String(a.nama_tim || a.nomor_tim).localeCompare(String(b.nama_tim || b.nomor_tim)));

                    filteredTim.forEach(t => {
                        const idTim = t.id_tim || t.id;
                        const namaTim = t.nama_tim || t.nomor_tim || idTim;
                        const dusun = t.dusun_rw || t.dusun || '-';
                        const label = `${namaTim} (Dusun: ${dusun})`;
                        
                        const opt = document.createElement('option');
                        opt.value = idTim;
                        opt.setAttribute('data-desa', selectedDesa);
                        opt.setAttribute('data-dusun', dusun);
                        opt.innerText = label;
                        timSelect.appendChild(opt);
                    });
                };

                // Event Listeners untuk interaksi bertingkat
                roleSelect.addEventListener('change', () => {
                    if (roleSelect.value === 'ADMIN_KABUPATEN') {
                        formKecSelect.value = 'ALL'; formKecSelect.style.backgroundColor = '#e9ecef'; formKecSelect.style.pointerEvents = 'none'; 
                        panelKader.style.display = 'none'; 
                    } else if (roleSelect.value === 'ADMIN_KECAMATAN') {
                        formKecSelect.style.backgroundColor = 'white'; formKecSelect.style.pointerEvents = 'auto'; 
                        if(formKecSelect.value === 'ALL') formKecSelect.value = 'GEROKGAK';
                        panelKader.style.display = 'none'; 
                    } else {
                        formKecSelect.style.backgroundColor = 'white'; formKecSelect.style.pointerEvents = 'auto'; 
                        if(formKecSelect.value === 'ALL') formKecSelect.value = 'GEROKGAK';
                        panelKader.style.display = 'block'; 
                        populateDesaDropdown();
                    }
                });

                formKecSelect.addEventListener('change', () => { if(roleSelect.value === 'KADER') populateDesaDropdown(); });
                formDesaSelect.addEventListener('change', populateTimDropdown);

                // PROSES SIMPAN KE SERVER
                document.getElementById('btn-submit-add').onclick = async () => {
                    const id = document.getElementById('add-id').value.trim();
                    const nama = document.getElementById('add-nama').value.trim();
                    const role = document.getElementById('add-role').value;
                    const kec = document.getElementById('add-kec').value.trim().toUpperCase();
                    const pin = document.getElementById('add-pin').value.trim();

                    if(!id || !nama || !kec || !pin) { alert("⚠️ Mohon isi semua kolom dasar!"); return; }

                    let payloadKader = null;

                    if (role === 'KADER') {
                        if(!formDesaSelect.value || !timSelect.value) { alert("⚠️ Mohon lengkapi pilihan Desa dan Tim penugasan kader!"); return; }
                        const selectedOpt = timSelect.options[timSelect.selectedIndex];
                        
                        payloadKader = {
                            id_kader: id,  
                            nama: nama,
                            id_tim: timSelect.value,
                            desa: selectedOpt.getAttribute('data-desa'),
                            dusun: selectedOpt.getAttribute('data-dusun')
                        };
                    }

                    const btnSubmit = document.getElementById('btn-submit-add');
                    btnSubmit.innerText = "Menyimpan..."; btnSubmit.disabled = true;

                    const payloadData = { id_user: id, username: nama, role_akses: role, scope_kecamatan: kec, password: pin, status_akun: 'AKTIF' };

                    try {
                        const response = await fetch(SCRIPT_URL, {
                            method: 'POST',
                            body: JSON.stringify({ 
                                action: 'SECURE_ADD_USER', token: SUPER_TOKEN, data: payloadData, data_kader: payloadKader 
                            })
                        });
                        const res = await response.json();
                        if(res.status === 'success') {
                            alert("✅ Pengguna berhasil ditambahkan dan di-mapping!");
                            modalAdd.style.display = 'none';
                            await clearStore('master_kader'); 
                            window.renderSuperView('user_management'); 
                        } else { alert("❌ Gagal menyimpan: " + res.message); }
                    } catch(e) { alert("❌ Kesalahan Jaringan."); } 
                    finally { btnSubmit.innerText = "Simpan ke Server"; btnSubmit.disabled = false; }
                };

            } else { document.getElementById('table-wrapper').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Akses Ditolak</h3><p>${res.message}</p></div>`; }
        } catch (error) { document.getElementById('table-wrapper').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Terhubung</h3></div>`; }
    }
};
