// ==========================================
// 👑 GOD MODE: SUPER ADMIN DASHBOARD (V27 - PKB ROLE ENABLED)
// ==========================================
import { getAllData, clearStore } from './db.js';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';
const SUPER_TOKEN = 'MasterKeyKubuSecure!001';

window.superUsersData = []; window.superTimData = []; window.currentFilteredIds = [];
window.superKuesionerData = []; window.superMenuData = []; window.superWidgetData = [];
window.superAuditData = []; window.dashAnalyticData = { users: [], logs: [] };
window.currentUser = null;

// ==========================================
// 1. FUNGSI AKSI SUPER ADMIN (GLOBAL)
// ==========================================
window.superResetPin = async (idUser, namaUser) => { const newPin = prompt(`🔐 Reset PIN untuk:\nID: ${idUser}\nNama: ${namaUser}\n\nMasukkan PIN Baru (Min 5 karakter):`); if (!newPin || newPin.length < 5) return; if (!confirm(`Yakin mengubah PIN ${namaUser} menjadi: ${newPin} ?`)) return; try { const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_USER', token: SUPER_TOKEN, id_user: idUser, updateType: 'PIN', newPin: newPin }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ PIN berhasil direset!`); window.renderSuperView('user_management'); } else { alert("❌ Gagal: " + res.message); } } catch (e) { alert("❌ Kesalahan Jaringan."); } };
window.superToggleStatus = async (idUser, namaUser, currentStatus) => { const isAktif = (currentStatus || 'AKTIF').toUpperCase() === 'AKTIF'; const newStatus = isAktif ? 'NONAKTIF' : 'AKTIF'; if (!confirm(`⚠️ PERINGATAN!\nAnda akan ${isAktif ? 'MEMBLOKIR' : 'MENGAKTIFKAN'} akses untuk: ${namaUser}\n\nLanjutkan?`)) return; try { const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_USER', token: SUPER_TOKEN, id_user: idUser, updateType: 'STATUS', newStatus: newStatus }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ Status diubah menjadi ${newStatus}!`); window.renderSuperView('user_management'); } else { alert("❌ Gagal: " + res.message); } } catch (e) { alert("❌ Kesalahan Jaringan."); } };
window.superBulkAction = async (actionType) => { const checkedBoxes = document.querySelectorAll('.chk-user:checked'); const targetIds = Array.from(checkedBoxes).map(cb => cb.value); const totalTarget = targetIds.length; if (totalTarget === 0) { alert("Pilih minimal 1 pengguna!"); return; } let confirmMsg = ""; let updateType = ""; let newValue = ""; if (actionType === 'BLOKIR') { confirmMsg = `⚠️ MEMBLOKIR ${totalTarget} akun. Ketik "YAKIN":`; updateType = 'STATUS'; newValue = 'NONAKTIF'; } else if (actionType === 'AKTIFKAN') { confirmMsg = `MENGAKTIFKAN ${totalTarget} akun. Ketik "YAKIN":`; updateType = 'STATUS'; newValue = 'AKTIF'; } else if (actionType === 'RESETPIN') { const pinMasal = prompt(`PIN BARU untuk ${totalTarget} akun:`); if (!pinMasal || pinMasal.length < 5) return; confirmMsg = `⚠️ MERESET PIN ${totalTarget} akun menjadi "${pinMasal}". Ketik "YAKIN":`; updateType = 'PIN'; newValue = pinMasal; } if (prompt(confirmMsg) !== "YAKIN") return; document.getElementById('table-wrapper').innerHTML = `<div style="padding:50px; text-align:center;"><h3>🚀 MENGEKSEKUSI...</h3></div>`; try { const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_BULK_UPDATE_USER', token: SUPER_TOKEN, ids: targetIds, updateType: updateType, newValue: newValue }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ SUKSES! ${res.count} Akun diperbarui!`); } else { alert("❌ Gagal: " + res.message); } window.renderSuperView('user_management'); } catch (e) { alert("❌ Kesalahan."); window.renderSuperView('user_management'); } };
window.superToggleQuestion = async (idPertanyaan, statusSaatIni) => { const isAktif = (statusSaatIni || 'AKTIF').toUpperCase() === 'AKTIF' || statusSaatIni === 'Y'; const newStatus = isAktif ? 'N' : 'Y'; const aksi = isAktif ? 'MEMATIKAN' : 'MENGHIDUPKAN'; if(!confirm(`⚠️ PERINGATAN!\nAnda akan ${aksi} pertanyaan ini dari HP Kader.\nLanjutkan?`)) return; try { document.getElementById('table-wrapper-q').innerHTML = `<div style="padding:30px; text-align:center;">⏳ Memproses...</div>`; const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_QUESTION', token: SUPER_TOKEN, id_pertanyaan: idPertanyaan, newStatus: newStatus }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ Pertanyaan berhasil diupdate!`); await clearStore('master_pertanyaan'); window.renderSuperView('kuesioner'); } else { alert("❌ Gagal: " + res.message); window.renderSuperView('kuesioner');} } catch(e) { alert("❌ Kesalahan Jaringan."); window.renderSuperView('kuesioner');} };
window.superToggleMenu = async (idMenu, statusSaatIni) => { const isAktif = (statusSaatIni || 'Y').toUpperCase() === 'Y'; const newStatus = isAktif ? 'N' : 'Y'; const aksi = isAktif ? 'MENYEMBUNYIKAN' : 'MEMUNCULKAN'; if(!confirm(`⚠️ PERINGATAN!\nAnda akan ${aksi} menu ini dari Aplikasi.\nLanjutkan?`)) return; try { document.getElementById('table-wrapper-m').innerHTML = `<div style="padding:30px; text-align:center;">⏳ Memproses...</div>`; const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_MENU', token: SUPER_TOKEN, id_menu: idMenu, newStatus: newStatus }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ Status menu berhasil diubah!`); await clearStore('master_menu'); window.renderSuperView('menu_management'); } else { alert("❌ Gagal: " + res.message); window.renderSuperView('menu_management');} } catch(e) { alert("❌ Kesalahan Jaringan."); window.renderSuperView('menu_management');} };
window.superToggleWidget = async (idWidget, statusSaatIni) => { const isAktif = (statusSaatIni || 'Y').toUpperCase() === 'Y'; const newStatus = isAktif ? 'N' : 'Y'; const aksi = isAktif ? 'MENYEMBUNYIKAN' : 'MEMUNCULKAN'; if(!confirm(`⚠️ PERINGATAN!\nAnda akan ${aksi} widget ini dari Aplikasi.\nLanjutkan?`)) return; try { document.getElementById('table-wrapper-w').innerHTML = `<div style="padding:30px; text-align:center;">⏳ Memproses...</div>`; const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_WIDGET', token: SUPER_TOKEN, id_widget: idWidget, newStatus: newStatus }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ Status widget berhasil diubah!`); await clearStore('master_widget'); window.renderSuperView('widget_management'); } else { alert("❌ Gagal: " + res.message); window.renderSuperView('widget_management');} } catch(e) { alert("❌ Kesalahan Jaringan."); window.renderSuperView('widget_management');} };

window.superEditMenu = (id) => {
    const menu = window.superMenuData.find(m => m.id_menu === id); if(!menu) return; window.currentEditMenuId = id;
    document.getElementById('modal-m-title').innerHTML = "✏️ Edit Menu Navigasi"; document.getElementById('btn-submit-m').innerText = "Update Menu";
    document.getElementById('m-icon').value = menu.icon || ''; document.getElementById('m-label').value = menu.label_menu || '';
    const targetSel = document.getElementById('m-target-sel'); const targetCus = document.getElementById('m-target-custom');
    const opts = Array.from(targetSel.options).map(o => o.value);
    if (opts.includes(menu.target_view)) { targetSel.value = menu.target_view; targetCus.style.display = 'none'; targetCus.value = ''; } else { targetSel.value = 'CUSTOM'; targetCus.style.display = 'block'; targetCus.value = menu.target_view || ''; }
    document.getElementById('m-urut').value = menu.urutan || '';
    const parentSelect = document.getElementById('m-parent'); parentSelect.innerHTML = '<option value="">-- Bukan Sub-Menu --</option>';
    window.superMenuData.forEach(m => { if ((!m.parent_id || m.parent_id === '') && m.id_menu !== id) { parentSelect.innerHTML += `<option value="${m.id_menu}">${m.icon || ''} ${m.label_menu}</option>`; } });
    if(menu.parent_id) parentSelect.value = menu.parent_id;
    const roles = (menu.role_akses || '').split(','); document.querySelectorAll('.m-role-chk').forEach(cb => { cb.checked = roles.includes(cb.value); });
    document.getElementById('modal-add-m').style.display = 'flex';
};

window.superEditWidget = (id) => {
    const widget = window.superWidgetData.find(w => w.id_widget === id); if(!widget) return; window.currentEditWidgetId = id;
    document.getElementById('modal-w-title').innerHTML = "✏️ Edit Komponen Halaman"; document.getElementById('btn-submit-w').innerText = "Update Komponen";
    const tHalaman = document.getElementById('w-target-sel'); tHalaman.innerHTML = '<option value="">-- Pilih Halaman / Menu --</option>';
    const defaultTargets = ['dashboard', 'registrasi', 'daftar_sasaran', 'pendampingan', 'rekap_bulanan', 'cetak_pdf', 'bantuan', 'setting'];
    const dynamicTargets = window.superMenuData.map(m => m.target_view).filter(Boolean);
    const uniqueTargets = [...new Set([...defaultTargets, ...dynamicTargets])];
    uniqueTargets.forEach(t => tHalaman.innerHTML += `<option value="${t}">${t}</option>`);
    tHalaman.value = widget.target_halaman || ''; document.getElementById('w-posisi').value = widget.posisi || 'atas';
    document.getElementById('w-tipe').value = 'html';
    document.querySelectorAll('.widget-panel').forEach(p => p.style.display = 'none');
    document.getElementById('panel-html').style.display = 'block';
    document.getElementById('w-konten-html').value = widget.isi_konten || '';
    document.getElementById('modal-add-w').style.display = 'flex';
};

// ==========================================
// 2. FUNGSI RENDER TABEL
// ==========================================
window.renderUserTable = () => {
    const searchVal = document.getElementById('flt-search').value.toLowerCase(); const roleVal = document.getElementById('flt-role').value; const kecVal = document.getElementById('flt-kec').value;
    let tableHtml = `<table class="super-table"><thead><tr><th style="text-align:center; width:40px;"><input type="checkbox" id="chk-all-users" title="Pilih Semua yang Tampil"></th><th>ID / Username</th><th>Nama Pengguna</th><th>No. Tim</th><th>Desa/Kelurahan</th><th>Wilayah/Kecamatan</th><th>Role Akses</th><th>PIN / Password</th><th>Aktivitas Terakhir</th><th>Status & Aksi</th></tr></thead><tbody>`;
    let count = 0; window.currentFilteredIds = [];
    window.superUsersData.forEach((u) => {
        const role = String(u.role_akses || u.role || 'KADER').toUpperCase(); const pin = u.password_awal_ref || u.password || u.pin || '***'; const id = u.id_pengguna || u.id_user || u.username || '-'; const nama = u.nama || u.username || '-'; const kec = String(u._kecamatan || u.scope_kecamatan || u.kecamatan || u.wilayah || 'ALL').toUpperCase(); const currentStatus = String(u.status_akun || 'AKTIF').toUpperCase(); const tim = u._nomor_tim || '-'; const desa = u._desa || '-';
        
        const lastLoginRaw = u.login_terakhir || u.last_login;
        let lastLoginText = '<span style="color:#aaa; font-style:italic;">Belum pernah login</span>';
        if (lastLoginRaw && String(lastLoginRaw).trim() !== '') { const dateObj = new Date(lastLoginRaw); if (!isNaN(dateObj.getTime())) { lastLoginText = `<span style="color:#0984e3; font-weight:bold;">${dateObj.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</span>`; } }
        const failCount = parseInt(u.jumlah_gagal_login) || 0; const failText = failCount > 0 ? `<br><span style="color:#e94560; font-size:0.75rem; font-weight:bold;">⚠️ ${failCount}x Gagal Login</span>` : '';

        const matchSearch = id.toLowerCase().includes(searchVal) || nama.toLowerCase().includes(searchVal) || tim.toLowerCase().includes(searchVal) || desa.toLowerCase().includes(searchVal);
        const matchRole = roleVal === 'ALL' || role.includes(roleVal); const matchKec = kecVal === 'ALL' || kec === kecVal || kec === 'ALL';
        
        if (matchSearch && matchRole && matchKec) {
            count++; if (!role.includes('SUPER')) { window.currentFilteredIds.push(id); }
            
            // 🔥 V27: Tambahkan warna Lencana Khusus untuk PKB (Ungu)
            let badgeClass = role.includes('SUPER') ? 'role-super' : (role.includes('ADMIN') ? 'role-admin' : (role.includes('PKB') ? 'role-pkb' : 'role-kader'));
            
            const isAktif = currentStatus === 'AKTIF'; const statusUI = isAktif ? '<span style="color:#00b894; font-weight:bold; display:block; margin-bottom:5px;">🟢 Aktif</span>' : '<span style="color:#ff7675; font-weight:bold; display:block; margin-bottom:5px;">🔴 Diblokir</span>'; const toggleText = isAktif ? 'Blokir' : 'Aktifkan'; const toggleColor = isAktif ? '#ff7675' : '#00b894';
            let chkBox = ''; let actionButtons = '';
            if (role.includes('SUPER')) { chkBox = `🔒`; actionButtons = `<span style="font-size:0.8rem; color:#b2bec3; font-style:italic; font-weight:bold;">🛡️ Akses Dilindungi</span>`; } else { chkBox = `<input type="checkbox" class="chk-user" value="${id}">`; actionButtons = `<button class="btn-action btn-edit" style="width:100%; margin-bottom:3px;" onclick="window.superResetPin('${id}', '${nama}')">Reset PIN</button><button class="btn-action" style="background:${toggleColor}; color:white; width:100%;" onclick="window.superToggleStatus('${id}', '${nama}', '${currentStatus}')">${toggleText}</button>`; }
            
            tableHtml += `<tr style="opacity: ${isAktif ? '1' : '0.6'};"><td style="text-align:center;">${chkBox}</td><td><b>${id}</b></td><td>${nama}</td><td><b style="color:#0984e3;">${tim}</b></td><td>${desa}</td><td>${kec}</td><td><span class="badge-role ${badgeClass}">${role}</span></td><td><code style="background:#eee; padding:3px 6px; border-radius:3px; color:#e94560; font-weight:bold;">${pin}</code></td><td>${lastLoginText}${failText}</td><td>${statusUI}${actionButtons}</td></tr>`;
        }
    });
    if(count === 0) { tableHtml += `<tr><td colspan="10" style="text-align:center; padding:30px; color:#666;">Tidak ada pengguna yang cocok dengan filter.</td></tr>`; }
    tableHtml += `</tbody></table>`; document.getElementById('table-wrapper').innerHTML = tableHtml;
    const chkAll = document.getElementById('chk-all-users'); if (chkAll) { chkAll.addEventListener('change', (e) => { const boxes = document.querySelectorAll('.chk-user'); boxes.forEach(b => b.checked = e.target.checked); }); }
    const lblCount = document.getElementById('lbl-count'); if(lblCount) lblCount.innerText = `${count} Pengguna`;
};

window.renderKuesionerTable = () => {
    const filterKat = document.getElementById('flt-kategori-q').value.toUpperCase();
    let tableHtml = `<table class="super-table"><thead><tr><th width="12%">ID Form</th><th width="15%">Posisi (Modul -> Sasaran)</th><th width="15%">Grup & Urutan</th><th width="30%">Teks Pertanyaan</th><th width="10%">Tipe Jawaban</th><th width="8%">Sifat</th><th width="10%">Aksi</th></tr></thead><tbody>`;
    let count = 0;
    window.superKuesionerData.forEach(q => {
        const id = q.id_pertanyaan || q.id || '-'; const modul = String(q.modul || '-').toUpperCase(); const kat = String(q.jenis_sasaran || q.kategori_sasaran || q.kategori || '-').toUpperCase(); const grup = q.grup_pertanyaan || '-'; const urutG = q.urutan_grup || '-'; const teks = q.label_pertanyaan || q.teks_pertanyaan || q.pertanyaan || '-'; const tipe = String(q.tipe_input || q.tipe_jawaban || q.tipe || '-').toUpperCase();
        const opsi = q.opsi_json || q.pilihan_jawaban ? `<div style="font-size:0.75rem; color:#888; margin-top:5px; background:#f1f2f6; padding:4px; border-radius:4px;">Opsi: ${q.opsi_json || q.pilihan_jawaban}</div>` : '';
        const wajib = String(q.is_required || q.wajib || 'Y').toUpperCase() === 'Y' || String(q.is_required || q.wajib || 'Y').toUpperCase() === 'YA' ? '<span style="color:#d63031; font-weight:bold;">Wajib *</span>' : '<span style="color:#636e72;">Opsional</span>';
        const status = String(q.is_active || q.status || q.status_pertanyaan || 'Y').toUpperCase();
        const kondisiLabel = q.kondisi_tampil ? `<div style="font-size:0.75rem; color:#d35400; margin-top:5px; padding:4px; background:#fdf3e8; border-radius:4px; border:1px dashed #fadbd8;">👁️ Muncul Jika: <b>${q.kondisi_tampil}</b></div>` : '';
        if (filterKat === 'ALL' || kat === filterKat) { count++; const isAktif = status === 'AKTIF' || status === 'Y'; const bgRow = isAktif ? 'transparent' : '#fdfaf6'; const textStatus = isAktif ? '🟢 Aktif' : '🔴 Mati'; const btnColor = isAktif ? '#ff7675' : '#00b894'; const btnText = isAktif ? 'Matikan' : 'Hidupkan';
            tableHtml += `<tr style="background:${bgRow}; opacity: ${isAktif ? '1' : '0.6'};"><td><code>${id}</code></td><td><span class="badge-role role-kader" style="display:block; margin-bottom:3px; text-align:center;">${modul}</span><span class="badge-role role-admin" style="display:block; text-align:center;">${kat}</span></td><td><span style="font-size:0.7rem; color:#666; font-weight:bold;">Urutan Tampil: ${urutG}</span><br><b>${grup}</b></td><td><b>${teks}</b>${opsi}${kondisiLabel}</td><td><code style="color:#0984e3;">${tipe}</code></td><td>${wajib}</td><td><div style="font-size:0.7rem; font-weight:bold; margin-bottom:5px;">${textStatus}</div><button class="btn-action" style="background:${btnColor}; color:white; width:100%;" onclick="window.superToggleQuestion('${id}', '${status}')">${btnText}</button></td></tr>`;
        }
    });
    if(count === 0) tableHtml += `<tr><td colspan="7" style="text-align:center; padding:30px; color:#666;">Belum ada pertanyaan untuk kategori ini.</td></tr>`;
    tableHtml += `</tbody></table>`; document.getElementById('table-wrapper-q').innerHTML = tableHtml; document.getElementById('lbl-count-q').innerText = `${count} Pertanyaan`;
};

window.renderMenuTable = () => {
    let tableHtml = `<table class="super-table"><thead><tr><th width="10%">Urutan</th><th width="20%">Nama Menu</th><th width="15%">Aksi Aplikasi (ID)</th><th width="35%">Target Role (Bisa Melihat)</th><th width="10%">Status</th><th width="10%">Aksi</th></tr></thead><tbody>`;
    let count = 0;
    let sortedMenus = [...window.superMenuData].sort((a,b) => { if(a.parent_id === b.parent_id) return (parseInt(a.urutan)||0) - (parseInt(b.urutan)||0); return (a.parent_id || '').localeCompare(b.parent_id || ''); });
    sortedMenus.forEach(m => {
        if(!m.id_menu) return; count++; const id = m.id_menu; const isChild = m.parent_id && m.parent_id !== ''; const parentName = isChild ? (window.superMenuData.find(p => p.id_menu === m.parent_id)?.label_menu || 'Induk Unknown') : '';
        const label = isChild ? `<span style="color:#aaa;">↳ (Anak dari ${parentName})</span><br>${m.icon || '📌'} ${m.label_menu}` : `<b style="font-size:1.05rem;">${m.icon || '📌'} ${m.label_menu}</b>`;
        const target = m.target_view || '-'; const role = (m.role_akses || 'KADER').toUpperCase().replace(/,/g, ', '); const status = String(m.is_active || 'Y').toUpperCase();
        const isAktif = status === 'Y'; const bgRow = isChild ? (isAktif ? '#f8fafd' : '#f1f2f6') : (isAktif ? 'transparent' : '#fdfaf6'); const textStatus = isAktif ? '🟢 Muncul' : '🔴 Sembunyi'; const btnColor = isAktif ? '#ff7675' : '#00b894'; const btnText = isAktif ? 'Sembunyikan' : 'Munculkan';
        tableHtml += `<tr style="background:${bgRow}; opacity: ${isAktif ? '1' : '0.6'};"><td style="font-weight:bold; font-size:1.1rem; color:#0984e3; text-align:center;">${m.urutan || 0}</td><td style="color:#2c3e50;">${label}</td><td><code>${target}</code></td><td><div style="font-size:0.75rem; background:#eef2f5; padding:4px 8px; border-radius:4px; display:inline-block; border:1px solid #dcdde1;">${role}</div></td><td><b>${textStatus}</b></td><td style="display:flex; flex-direction:column; gap:5px;"><button class="btn-action btn-edit" style="width:100%;" onclick="window.superEditMenu('${id}')">✏️ Edit</button><button class="btn-action" style="background:${btnColor}; color:white; width:100%;" onclick="window.superToggleMenu('${id}', '${status}')">${btnText}</button></td></tr>`;
    });
    if(count === 0) tableHtml += `<tr><td colspan="6" style="text-align:center; padding:30px; color:#666;">Database Menu masih kosong.</td></tr>`; tableHtml += `</tbody></table>`; document.getElementById('table-wrapper-m').innerHTML = tableHtml; document.getElementById('lbl-count-m').innerText = `${count} Menu Aktif`;
};

window.renderWidgetTable = () => {
    let tableHtml = `<table class="super-table"><thead><tr><th width="15%">Target Halaman</th><th width="10%">Posisi</th><th width="15%">Tipe Terbaca</th><th width="40%">Isi Konten (Preview)</th><th width="10%">Status</th><th width="10%">Aksi</th></tr></thead><tbody>`;
    let count = 0;
    window.superWidgetData.forEach(w => {
        if(!w.id_widget) return; count++; const id = w.id_widget; const target = w.target_halaman || '-'; const posisi = w.posisi || '-'; const tipe = w.tipe || 'html';
        const konten = (w.isi_konten || '').substring(0, 80) + '...'; const status = String(w.is_active || 'Y').toUpperCase();
        const isAktif = status === 'Y'; const bgRow = isAktif ? 'transparent' : '#fdfaf6'; const textStatus = isAktif ? '🟢 Aktif' : '🔴 Mati'; const btnColor = isAktif ? '#ff7675' : '#00b894'; const btnText = isAktif ? 'Matikan' : 'Hidupkan';
        tableHtml += `<tr style="background:${bgRow}; opacity: ${isAktif ? '1' : '0.6'};"><td><b><code style="color:#e94560;">${target}</code></b></td><td><span style="background:#e8f4fd; color:#0984e3; padding:3px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">${posisi.toUpperCase()}</span></td><td>${tipe.toUpperCase()}</td><td><div style="font-size:0.8rem; background:#eee; padding:5px; border-radius:4px; font-family:monospace; color:#555; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${konten.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></td><td><b>${textStatus}</b></td><td style="display:flex; flex-direction:column; gap:5px;"><button class="btn-action btn-edit" style="width:100%;" onclick="window.superEditWidget('${id}')">✏️ Edit</button><button class="btn-action" style="background:${btnColor}; color:white; width:100%;" onclick="window.superToggleWidget('${id}', '${status}')">${btnText}</button></td></tr>`;
    });
    if(count === 0) tableHtml += `<tr><td colspan="6" style="text-align:center; padding:30px; color:#666;">Database Widget Injeksi masih kosong.</td></tr>`; tableHtml += `</tbody></table>`; document.getElementById('table-wrapper-w').innerHTML = tableHtml; document.getElementById('lbl-count-w').innerText = `${count} Widget Aktif`;
};

window.renderAuditTable = () => {
    const fltWaktu = document.getElementById('log-flt-waktu').value;
    const fltAksi = document.getElementById('log-flt-aksi').value;
    const searchVal = document.getElementById('log-flt-search').value.toLowerCase();

    const now = new Date();
    let limitDate = new Date('2000-01-01');
    if (fltWaktu === 'TODAY') limitDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (fltWaktu === '7D') limitDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    else if (fltWaktu === '30D') limitDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    let tableHtml = `<table class="super-table"><thead><tr><th width="15%">Waktu Sistem</th><th width="25%">Pengguna & Wilayah (Cross-Ref)</th><th width="15%">Aksi / Status</th><th width="45%">Detail Keterangan</th></tr></thead><tbody>`;
    let count = 0;

    const sortedLog = [...window.superAuditData].sort((a,b) => new Date(b.waktu) - new Date(a.waktu));

    sortedLog.forEach(log => {
        const dt = new Date(log.waktu);
        if (isNaN(dt.getTime()) || dt < limitDate) return; 

        const aksi = String(log.aksi).toUpperCase();
        
        if (fltAksi !== 'ALL') {
            if (fltAksi === 'LOGIN_SUKSES' && !aksi.includes('SUKSES')) return;
            if (fltAksi === 'LOGIN_GAGAL' && !aksi.includes('GAGAL')) return;
            if (fltAksi === 'ADMIN' && aksi.includes('LOGIN')) return;
        }

        let userName = log.target || '-';
        let userWilayah = '-';
        const u = window.superUsersData.find(x => x.id_pengguna === log.target || x.username === log.target || x.id_user === log.target);
        if (u) {
            userName = `<b>${u.nama || u.username}</b><br><code style="font-size:0.75rem; background:#eee; padding:2px 4px; border-radius:3px; color:#555;">ID: ${log.target}</code>`;
            userWilayah = `${u._desa || '-'}, ${u._kecamatan || '-'}`;
        } else {
            userName = `<b>ID Tidak Dikenal</b><br><code style="font-size:0.75rem; background:#eee; padding:2px 4px; border-radius:3px; color:#555;">${log.target}</code>`;
        }

        const detailStr = String(log.detail || '').toLowerCase();
        const targetStr = String(log.target || '').toLowerCase();
        if (searchVal && !detailStr.includes(searchVal) && !targetStr.includes(searchVal) && !userName.toLowerCase().includes(searchVal) && !userWilayah.toLowerCase().includes(searchVal)) return;

        count++;
        let badgeColor = '#0984e3'; 
        if(aksi.includes('TAMBAH') || aksi.includes('SUKSES')) badgeColor = '#198754';
        else if(aksi.includes('STATUS') || aksi.includes('RESET')) badgeColor = '#fdcb6e';
        else if(aksi.includes('HAPUS') || aksi.includes('BLOKIR') || aksi.includes('GAGAL')) badgeColor = '#e94560';

        tableHtml += `
            <tr>
                <td style="color:#666; font-size:0.85rem;">${dt.toLocaleString('id-ID')}</td>
                <td><div style="line-height:1.3;">${userName}</div><div style="font-size:0.75rem; color:#888; margin-top:5px; font-weight:bold;">📍 ${userWilayah}</div></td>
                <td><span style="background:${badgeColor}; color:${badgeColor==='#fdcb6e'?'#333':'white'}; padding:3px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold;">${aksi}</span></td>
                <td style="color:#444; font-size:0.85rem; line-height:1.4;">${log.detail || '-'}</td>
            </tr>
        `;
    });

    if (count === 0) tableHtml += `<tr><td colspan="4" style="text-align:center; padding:30px; color:#666;">Tidak ada log yang cocok dengan pencarian/filter.</td></tr>`;
    
    tableHtml += `</tbody></table>`;
    
    const wrp = document.getElementById('table-wrapper-log');
    if(wrp) wrp.innerHTML = tableHtml;
    
    const lbl = document.getElementById('lbl-count-log');
    if(lbl) lbl.innerText = `${count} Log Ditemukan`;
};

// ==========================================
// 3. INISIALISASI KERANGKA (SKELETON)
// ==========================================
export const initSuperAdmin = async (session) => {
    window.currentUser = session;
    const vSplash = document.getElementById('view-splash'); const vLogin = document.getElementById('view-login'); const vApp = document.getElementById('view-app');
    if(vLogin) vLogin.classList.add('hidden'); if(vApp) vApp.classList.add('hidden'); if(vSplash) vSplash.style.display = 'none';

    document.body.innerHTML = `
        <div id="super-root" style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; background:#eef2f5; font-family: 'Segoe UI', sans-serif; overflow: hidden;">
            <div id="super-sidebar-overlay" style="display:none; position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:99;"></div>
            <div id="super-sidebar" style="width:280px; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); color:white; display:flex; flex-direction:column; box-shadow: 4px 0 10px rgba(0,0,0,0.15); z-index:100; flex-shrink: 0; transition: transform 0.3s ease;">
                <div style="padding: 25px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align:center;"><div style="font-size: 3rem; margin-bottom: 10px;">👑</div><h3 style="margin:0; font-weight:900; line-height:1.2; letter-spacing:1px;"><span style="font-size:1.1rem; color:#e94560; display:block;">PUSAT KENDALI</span><span style="font-size:1.3rem; color:#ffffff; display:block;">SUPER ADMIN</span></h3></div>
                <div style="flex:1; padding: 20px 0; overflow-y:auto; min-height:0;">
                    <div class="super-menu-item active" data-target="dashboard">🎛️ Dashboard Utama</div>
                    <div class="super-menu-item" data-target="user_management">👥 Manajemen Pengguna</div>
                    <div class="super-menu-item" data-target="kuesioner">📋 Master Kuesioner (Form)</div>
                    <div class="super-menu-item" data-target="menu_management">🎚️ Manajemen Menu (RBAC)</div>
                    <div class="super-menu-item" data-target="widget_management">🧩 Pabrik Halaman (Widget)</div>
                    <div class="super-menu-item" data-target="referensi">🏗️ Master Wilayah & Referensi</div>
                    <div class="super-menu-item" data-target="audit_trail">🛡️ Audit Log & Keamanan</div>
                </div>
                <div style="padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);"><div style="font-size:0.8rem; margin-bottom:10px; color:#adb5bd;">Dewa Sistem:<br><b style="color:#e94560;">${session.nama}</b></div><button id="btn-super-logout" style="width:100%; background:transparent; color:#e94560; border:1px solid #e94560; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold; transition: all 0.3s;">🔒 Cabut Akses (Keluar)</button></div>
            </div>
            <div style="flex:1; display:flex; flex-direction:column; overflow
