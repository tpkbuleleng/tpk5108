// ==========================================
// 👑 GOD MODE: SUPER ADMIN DASHBOARD (V6 - Full Relational Mapping)
// ==========================================
import { getAllData, clearStore } from './db.js';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';
const SUPER_TOKEN = 'MasterKeyKubuSecure!001';

window.superUsersData = [];
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
    const checkedBoxes = document.querySelectorAll('.chk-user:checked');
    const targetIds = Array.from(checkedBoxes).map(cb => cb.value);
    const totalTarget = targetIds.length;

    if (totalTarget === 0) { alert("Pilih minimal 1 pengguna dengan mencentang kotak di sebelah kiri tabel!"); return; }

    let confirmMsg = ""; let updateType = ""; let newValue = "";
    if (actionType === 'BLOKIR') { confirmMsg = `⚠️ BAHAYA: Anda akan MEMBLOKIR ${totalTarget} akun yang DICENTANG.\n\nKetik kata "YAKIN" (huruf besar) untuk mengeksekusi:`; updateType = 'STATUS'; newValue = 'NONAKTIF'; } 
    else if (actionType === 'AKTIFKAN') { confirmMsg = `Anda akan MENGAKTIFKAN KEMBALI ${totalTarget} akun yang DICENTANG.\n\nKetik kata "YAKIN" untuk mengeksekusi:`; updateType = 'STATUS'; newValue = 'AKTIF'; } 
    else if (actionType === 'RESETPIN') {
        const pinMasal = prompt(`Masukkan PIN BARU untuk ${totalTarget} akun yang DICENTANG (Semua akan memiliki PIN yang sama):`);
        if (!pinMasal || pinMasal.length < 5) { alert("PIN batal / terlalu pendek!"); return; }
        confirmMsg = `⚠️ BAHAYA: Anda akan MERESET PIN ${totalTarget} akun menjadi "${pinMasal}".\n\nKetik kata "YAKIN" (huruf besar) untuk mengeksekusi:`; updateType = 'PIN'; newValue = pinMasal;
    }

    const konfirmasi = prompt(confirmMsg);
    if (konfirmasi !== "YAKIN") { alert("❌ Aksi Massal Dibatalkan."); return; }

    document.getElementById('table-wrapper').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>🚀 MENGEKSEKUSI AKSI MASSAL...</h3><p>Memproses ${totalTarget} data di Google Server. Mohon tunggu...</p></div>`;

    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_BULK_UPDATE_USER', token: SUPER_TOKEN, ids: targetIds, updateType: updateType, newValue: newValue }) });
        const res = await response.json();
        if (res.status === 'success') { alert(`✅ SUKSES! ${res.count} Akun berhasil diperbarui!`); window.renderSuperView('user_management'); } 
        else { alert("❌ Gagal: " + res.message); window.renderSuperView('user_management'); }
    } catch (e) { alert("❌ Kesalahan Jaringan."); window.renderSuperView('user_management'); }
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
            /* Pelebaran min-width karena ada kolom baru */
            .super-table-container { max-height: calc(100vh - 340px); overflow-y: auto; border-radius: 8px; border: 1px solid #eee; background:white; } .super-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; min-width: 1100px; } .super-table th { position: sticky; top: 0; z-index: 10; background: #1a1a2e; color: white; padding: 15px; text-align: left; font-weight:600; box-shadow: 0 2px 4px rgba(0,0,0,0.1); } .super-table td { padding: 12px 15px; border-bottom: 1px solid #eee; color: #444; } .super-table tr:hover td { background: #f8f9fa; }
            .badge-role { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; } .role-kader { background: #e8f4fd; color: #0984e3; } .role-admin { background: #fdf3e8; color: #d35400; } .role-super { background: #fbebf0; color: #e94560; }
            .btn-action { padding: 6px 12px; border: none; border-radius: 4px; font-size: 0.8rem; font-weight: bold; cursor: pointer; margin-right: 5px; transition: opacity 0.2s;} .btn-action:hover { opacity: 0.8; } .btn-edit { background: #fdcb6e; color: #2d3436; } .filter-input { padding:8px 12px; border:1px solid #ccc; border-radius:6px; outline:none; font-family:inherit; } .filter-input:focus { border-color:#0984e3; box-shadow: 0 0 0 2px rgba(9, 132, 227, 0.2); }
            .btn-mass { padding: 8px 15px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; color: white; display: flex; align-items: center; gap: 5px; font-size:0.85rem;}
            .chk-user { cursor:pointer; transform:scale(1.3); accent-color: #0984e3; } #chk-all-users { cursor:pointer; transform:scale(1.3); accent-color: #e94560; }
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
    const searchVal = document.getElementById('flt-search').value.toLowerCase(); 
    const roleVal = document.getElementById('flt-role').value; 
    const kecVal = document.getElementById('flt-kec').value;
    
    // 🔥 HEADER TABEL BARU (Menambahkan No. Tim & Desa)
    let tableHtml = `<table class="super-table"><thead><tr>
        <th style="text-align:center; width:40px;"><input type="checkbox" id="chk-all-users" title="Pilih Semua yang Tampil"></th>
        <th>ID / Username</th><th>Nama Pengguna</th><th>No. Tim</th><th>Desa</th><th>Wilayah/Kecamatan</th><th>Role Akses</th><th>PIN / Password</th><th>Status Akun</th><th>Aksi Eksekutif</th>
    </tr></thead><tbody>`;

    let count = 0;
    window.currentFilteredIds = [];

    window.superUsersData.forEach((u) => {
        const role = String(u.role_akses || u.role || 'KADER').toUpperCase(); 
        const pin = u.password_awal_ref || u.password || u.pin || '***'; 
        const id = u.id_pengguna || u.id_user || u.username || '-'; 
        const nama = u.nama || u.username || '-'; 
        const kec = String(u.scope_kecamatan || u.kecamatan || u.wilayah || 'ALL').toUpperCase(); 
        const currentStatus = String(u.status_akun || 'AKTIF').toUpperCase();
        
        // Ambil data yang sudah di-mapping
        const tim = u._nomor_tim || '-';
        const desa = u._desa || '-';

        // 🔥 SEARCH PINTAR (Sekarang bisa cari berdasarkan Tim atau Desa)
        const matchSearch = id.toLowerCase().includes(searchVal) || 
                            nama.toLowerCase().includes(searchVal) || 
                            tim.toLowerCase().includes(searchVal) || 
                            desa.toLowerCase().includes(searchVal);
                            
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
            if (role.includes('SUPER')) { 
                chkBox = `🔒`; actionButtons = `<span style="font-size:0.8rem; color:#b2bec3; font-style:italic; font-weight:bold;">🛡️ Akses Dilindungi</span>`; 
            } else { 
                chkBox = `<input type="checkbox" class="chk-user" value="${id}">`; 
                actionButtons = `<button class="btn-action btn-edit" onclick="window.superResetPin('${id}', '${nama}')">Reset PIN</button><button class="btn-action" style="background:${toggleColor}; color:white;" onclick="window.superToggleStatus('${id}', '${nama}', '${currentStatus}')">${toggleText}</button>`; 
            }

            tableHtml += `
                <tr style="opacity: ${isAktif ? '1' : '0.6'};">
                    <td style="text-align:center;">${chkBox}</td>
                    <td><b>${id}</b></td><td>${nama}</td>
                    <td><b style="color:#0984e3;">${tim}</b></td>
                    <td>${desa}</td>
                    <td>${kec}</td>
                    <td><span class="badge-role ${badgeClass}">${role}</span></td>
                    <td><code style="background:#eee; padding:3px 6px; border-radius:3px; color:#e94560; font-weight:bold;">${pin}</code></td>
                    <td>${statusUI}</td><td>${actionButtons}</td>
                </tr>`;
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
                <button onclick="alert('Fitur Tambah segera aktif setelah revisi tabel.')" style="background:#0984e3; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer;">+ Tambah Pengguna</button>
            </div>
            
            <div class="super-card" style="padding:0; overflow:hidden;">
                <div style="background:#f8f9fa; padding:15px; border-bottom:1px solid #eee; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                    <input type="text" id="flt-search" class="filter-input" placeholder="🔍 Cari ID/Nama/Desa/Tim..." style="flex:1; min-width:200px;">
                    <select id="flt-role" class="filter-input"><option value="ALL">📋 Semua Role</option><option value="KADER">KADER</option><option value="ADMIN">ADMIN</option></select>
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
        `;

        try {
            // 🔥 Ambil Data Master dari IndexedDB untuk di-Mapping dengan USER_LOGIN
            const [kaderData, timData] = await Promise.all([ getAllData('master_kader').catch(()=>[]), getAllData('master_tim').catch(()=>[]) ]);
            
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'USER_LOGIN' }) });
            const res = await response.json();
            if (res.status === 'success') {
                
                // Proses Mapping Nomor Tim dan Desa ke dalam Data User
                window.superUsersData = res.data.map(u => {
                    let nTim = '-'; let nDesa = String(u.scope_desa || u.desa || u.wilayah_desa || '-').toUpperCase();
                    const role = String(u.role_akses || u.role || 'KADER').toUpperCase();
                    const refId = u.ref_id || u.id_pengguna || u.id_user || u.username;

                    if (role.includes('KADER')) {
                        const k = kaderData.find(kd => kd.id_kader === refId || kd.nik === refId);
                        if (k) {
                            const idTim = k.id_tim || k.tim;
                            const t = timData.find(td => td.id_tim === idTim || td.id === idTim);
                            if (t) nTim = String(t.nomor_tim || t.nama_tim || idTim);
                            if (nDesa === '-' || nDesa === 'ALL') nDesa = String(k.desa || t.desa || nDesa).toUpperCase();
                        }
                    }
                    u._nomor_tim = nTim; u._desa = nDesa;
                    return u;
                });

                const kecSet = new Set(); window.superUsersData.forEach(u => { const k = String(u.scope_kecamatan || u.kecamatan || u.wilayah || '').toUpperCase().trim(); if(k && k !== 'ALL' && k !== 'SEMUA' && k !== '-') kecSet.add(k); });
                const selectKec = document.getElementById('flt-kec'); Array.from(kecSet).sort().forEach(k => { const opt = document.createElement('option'); opt.value = k; opt.innerText = k; selectKec.appendChild(opt); });
                
                window.renderUserTable();
                document.getElementById('flt-search').addEventListener('input', window.renderUserTable);
                document.getElementById('flt-role').addEventListener('change', window.renderUserTable);
                document.getElementById('flt-kec').addEventListener('change', window.renderUserTable);
            } else { document.getElementById('table-wrapper').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Akses Ditolak</h3><p>${res.message}</p></div>`; }
        } catch (error) { document.getElementById('table-wrapper').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Terhubung</h3></div>`; }
    }
};
