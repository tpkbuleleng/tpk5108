// ==========================================
// 👑 GOD MODE: SUPER ADMIN DASHBOARD (V44 - FINAL PATCHED)
// ==========================================
import { getAllData, clearStore } from './db.js';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-nJkkQqSW3PZivNO0C0gfuoptfZhZ4uiGh1mslxpctrQqf7C1c9KPRbxRazL09RJugA/exec';
const SUPER_TOKEN = 'MasterKeyKubuSecure!001';

window.superUsersData = []; window.superTimData = []; window.currentFilteredIds = [];
window.superKuesionerData = []; window.superMenuData = []; window.superWidgetData = [];
window.superAuditData = []; window.superErrorData = []; window.superPengumumanData = []; 
window.dashAnalyticData = { users: [], logs: [] };
window.currentUser = null; window.activeAuditTab = 'CCTV'; 

const catatErrorSistem = (lokasi, error) => { if(window.logErrorToServer) window.logErrorToServer(`SuperAdmin: ${lokasi}`, error); else console.error(`[${lokasi}]`, error); };

// ==========================================
// 1. FUNGSI AKSI SUPER ADMIN (GLOBAL)
// ==========================================
window.superResetPin = async (idUser, namaUser) => { const newPin = prompt(`🔐 Reset PIN untuk:\nID: ${idUser}\nNama: ${namaUser}\n\nMasukkan PIN Baru (Min 5 karakter):`); if (!newPin || newPin.length < 5) return; if (!confirm(`Yakin mengubah PIN ${namaUser} menjadi: ${newPin} ?`)) return; try { const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_USER', token: SUPER_TOKEN, id_user: idUser, updateType: 'PIN', newPin: newPin }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ PIN berhasil direset!`); window.renderSuperView('user_management'); } else { alert("❌ Gagal: " + res.message); } } catch (e) { catatErrorSistem('superResetPin', e); alert("❌ Kesalahan Jaringan."); } };
window.superToggleStatus = async (idUser, namaUser, currentStatus) => { const isAktif = (currentStatus || 'AKTIF').toUpperCase() === 'AKTIF'; const newStatus = isAktif ? 'NONAKTIF' : 'AKTIF'; if (!confirm(`⚠️ PERINGATAN!\nAnda akan ${isAktif ? 'MEMBLOKIR' : 'MENGAKTIFKAN'} akses untuk: ${namaUser}\n\nLanjutkan?`)) return; try { const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_USER', token: SUPER_TOKEN, id_user: idUser, updateType: 'STATUS', newStatus: newStatus }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ Status diubah menjadi ${newStatus}!`); window.renderSuperView('user_management'); } else { alert("❌ Gagal: " + res.message); } } catch (e) { catatErrorSistem('superToggleStatus', e); alert("❌ Kesalahan Jaringan."); } };
window.superBulkAction = async (actionType) => { const checkedBoxes = document.querySelectorAll('.chk-user:checked'); const targetIds = Array.from(checkedBoxes).map(cb => cb.value); const totalTarget = targetIds.length; if (totalTarget === 0) { alert("Pilih minimal 1 pengguna!"); return; } let confirmMsg = ""; let updateType = ""; let newValue = ""; if (actionType === 'BLOKIR') { confirmMsg = `⚠️ MEMBLOKIR ${totalTarget} akun. Ketik "YAKIN":`; updateType = 'STATUS'; newValue = 'NONAKTIF'; } else if (actionType === 'AKTIFKAN') { confirmMsg = `MENGAKTIFKAN ${totalTarget} akun. Ketik "YAKIN":`; updateType = 'STATUS'; newValue = 'AKTIF'; } else if (actionType === 'RESETPIN') { const pinMasal = prompt(`PIN BARU untuk ${totalTarget} akun:`); if (!pinMasal || pinMasal.length < 5) return; confirmMsg = `⚠️ MERESET PIN ${totalTarget} akun menjadi "${pinMasal}". Ketik "YAKIN":`; updateType = 'PIN'; newValue = pinMasal; } if (prompt(confirmMsg) !== "YAKIN") return; document.getElementById('table-wrapper').innerHTML = `<div style="padding:50px; text-align:center; color:#0043A8;"><h3>🚀 MENGEKSEKUSI...</h3></div>`; try { const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_BULK_UPDATE_USER', token: SUPER_TOKEN, ids: targetIds, updateType: updateType, newValue: newValue }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ SUKSES! ${res.count} Akun diperbarui!`); } else { alert("❌ Gagal: " + res.message); } window.renderSuperView('user_management'); } catch (e) { catatErrorSistem('superBulkAction', e); alert("❌ Kesalahan."); window.renderSuperView('user_management'); } };
window.superToggleQuestion = async (idPertanyaan, statusSaatIni) => { const isAktif = (statusSaatIni || 'AKTIF').toUpperCase() === 'AKTIF' || statusSaatIni === 'Y'; const newStatus = isAktif ? 'N' : 'Y'; const aksi = isAktif ? 'MEMATIKAN' : 'MENGHIDUPKAN'; if(!confirm(`⚠️ PERINGATAN!\nAnda akan ${aksi} pertanyaan ini dari HP Kader.\nLanjutkan?`)) return; try { document.getElementById('table-wrapper-q').innerHTML = `<div style="padding:30px; text-align:center; color:#0043A8;">⏳ Memproses...</div>`; const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_QUESTION', token: SUPER_TOKEN, id_pertanyaan: idPertanyaan, newStatus: newStatus }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ Pertanyaan berhasil diupdate!`); await clearStore('master_pertanyaan'); window.renderSuperView('kuesioner'); } else { alert("❌ Gagal: " + res.message); window.renderSuperView('kuesioner');} } catch(e) { catatErrorSistem('superToggleQuestion', e); alert("❌ Kesalahan Jaringan."); window.renderSuperView('kuesioner');} };
window.superToggleMenu = async (idMenu, statusSaatIni) => { const isAktif = (statusSaatIni || 'Y').toUpperCase() === 'Y'; const newStatus = isAktif ? 'N' : 'Y'; const aksi = isAktif ? 'MENYEMBUNYIKAN' : 'MEMUNCULKAN'; if(!confirm(`⚠️ PERINGATAN!\nAnda akan ${aksi} menu ini dari Aplikasi.\nLanjutkan?`)) return; try { document.getElementById('table-wrapper-m').innerHTML = `<div style="padding:30px; text-align:center; color:#0043A8;">⏳ Memproses...</div>`; const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_MENU', token: SUPER_TOKEN, id_menu: idMenu, newStatus: newStatus }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ Status menu berhasil diubah!`); await clearStore('master_menu'); window.renderSuperView('menu_management'); } else { alert("❌ Gagal: " + res.message); window.renderSuperView('menu_management');} } catch(e) { catatErrorSistem('superToggleMenu', e); alert("❌ Kesalahan Jaringan."); window.renderSuperView('menu_management');} };
window.superToggleWidget = async (idWidget, statusSaatIni) => { const isAktif = (statusSaatIni || 'Y').toUpperCase() === 'Y'; const newStatus = isAktif ? 'N' : 'Y'; const aksi = isAktif ? 'MENYEMBUNYIKAN' : 'MEMUNCULKAN'; if(!confirm(`⚠️ PERINGATAN!\nAnda akan ${aksi} widget ini dari Aplikasi.\nLanjutkan?`)) return; try { document.getElementById('table-wrapper-w').innerHTML = `<div style="padding:30px; text-align:center; color:#0043A8;">⏳ Memproses...</div>`; const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_WIDGET', token: SUPER_TOKEN, id_widget: idWidget, newStatus: newStatus }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ Status widget berhasil diubah!`); await clearStore('master_widget'); window.renderSuperView('widget_management'); } else { alert("❌ Gagal: " + res.message); window.renderSuperView('widget_management');} } catch(e) { catatErrorSistem('superToggleWidget', e); alert("❌ Kesalahan Jaringan."); window.renderSuperView('widget_management');} };
window.superTogglePengumuman = async (idPengumuman, statusSaatIni) => { const isAktif = (statusSaatIni || 'Y').toUpperCase() === 'Y'; const newStatus = isAktif ? 'N' : 'Y'; const aksi = isAktif ? 'MENARIK/MEMATIKAN' : 'MENYIARKAN'; if(!confirm(`⚠️ PERINGATAN!\nAnda akan ${aksi} pengumuman ini.\nLanjutkan?`)) return; try { document.getElementById('table-wrapper-p').innerHTML = `<div style="padding:30px; text-align:center; color:#0043A8;">⏳ Memproses...</div>`; const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_PENGUMUMAN', token: SUPER_TOKEN, id_pengumuman: idPengumuman, newStatus: newStatus }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ Status pengumuman berhasil diubah!`); window.renderSuperView('pengumuman'); } else { alert("❌ Gagal: " + res.message); window.renderSuperView('pengumuman');} } catch(e) { catatErrorSistem('superTogglePengumuman', e); alert("❌ Kesalahan Jaringan."); window.renderSuperView('pengumuman');} };

window.superEditMenu = (id) => { const menu = window.superMenuData.find(m => m.id_menu === id); if(!menu) return; window.currentEditMenuId = id; document.getElementById('modal-m-title').innerHTML = "✏️ Edit Menu Navigasi"; document.getElementById('btn-submit-m').innerText = "Update Menu"; document.getElementById('m-icon').value = menu.icon || ''; document.getElementById('m-label').value = menu.label_menu || ''; const targetSel = document.getElementById('m-target-sel'); const targetCus = document.getElementById('m-target-custom'); const opts = Array.from(targetSel.options).map(o => o.value); if (opts.includes(menu.target_view)) { targetSel.value = menu.target_view; targetCus.style.display = 'none'; targetCus.value = ''; } else { targetSel.value = 'CUSTOM'; targetCus.style.display = 'block'; targetCus.value = menu.target_view || ''; } document.getElementById('m-urut').value = menu.urutan || ''; const parentSelect = document.getElementById('m-parent'); parentSelect.innerHTML = '<option value="">-- Bukan Sub-Menu --</option>'; window.superMenuData.forEach(m => { if ((!m.parent_id || m.parent_id === '') && m.id_menu !== id) { parentSelect.innerHTML += `<option value="${m.id_menu}">${m.icon || ''} ${m.label_menu}</option>`; } }); if(menu.parent_id) parentSelect.value = menu.parent_id; const roles = (menu.role_akses || '').split(','); document.querySelectorAll('.m-role-chk').forEach(cb => { cb.checked = roles.includes(cb.value); }); document.getElementById('modal-add-m').style.display = 'flex'; };
window.superEditWidget = (id) => { const widget = window.superWidgetData.find(w => w.id_widget === id); if(!widget) return; window.currentEditWidgetId = id; document.getElementById('modal-w-title').innerHTML = "✏️ Edit Komponen Halaman"; document.getElementById('btn-submit-w').innerText = "Update Komponen"; const tHalaman = document.getElementById('w-target-sel'); if(tHalaman) { tHalaman.innerHTML = '<option value="">-- Pilih Halaman / Menu --</option>'; const defaultTargets = ['dashboard', 'registrasi', 'daftar_sasaran', 'pendampingan', 'rekap_bulanan', 'cetak_pdf', 'bantuan', 'setting']; const dynamicTargets = window.superMenuData.map(m => m.target_view).filter(Boolean); const uniqueTargets = [...new Set([...defaultTargets, ...dynamicTargets])]; uniqueTargets.forEach(t => tHalaman.innerHTML += `<option value="${t}">${t}</option>`); tHalaman.value = widget.target_halaman || ''; } document.getElementById('w-posisi').value = widget.posisi || 'atas'; document.getElementById('w-tipe').value = 'html'; document.querySelectorAll('.widget-panel').forEach(p => p.style.display = 'none'); document.getElementById('panel-html').style.display = 'block'; document.getElementById('w-konten-html').value = widget.isi_konten || ''; document.getElementById('modal-add-w').style.display = 'flex'; };

window.superEksporDataCenter = async () => {
    const btn = document.getElementById('btn-ekspor-dc');
    const dFrom = document.getElementById('dc-date-from').value;
    const dTo = document.getElementById('dc-date-to').value;
    const isReg = document.getElementById('dc-chk-reg').checked;
    const isPend = document.getElementById('dc-chk-pend').checked;
    if(!isReg && !isPend) { alert("Pilih minimal 1 jenis data (Registrasi / Pendampingan)!"); return; }
    btn.disabled = true; btn.innerText = "⏳ Sedang Menyatukan Data 9 Kecamatan...";
    
    try {
        const url = `${SCRIPT_URL}?action=getAdminData&role=KABUPATEN`; 
        const response = await fetch(url);
        const res = await response.json();
        
        if (res.status === 'success') {
            let regData = res.data.registrasi || [];
            let pendData = res.data.pendampingan || [];
            
            if (dFrom || dTo) {
                const limitF = dFrom ? new Date(dFrom) : new Date('2000-01-01');
                const limitT = dTo ? new Date(dTo) : new Date('2099-12-31');
                limitF.setHours(0,0,0,0); limitT.setHours(23,59,59,999);
                
                regData = regData.filter(r => { const d = new Date(r.created_at); return d >= limitF && d <= limitT; });
                pendData = pendData.filter(p => { 
                    let rData = {}; try { rData = JSON.parse(p.data_laporan || '{}'); } catch(e){}
                    const d = rData.tgl_kunjungan ? new Date(rData.tgl_kunjungan) : new Date(p.created_at);
                    return d >= limitF && d <= limitT; 
                });
            }
            
            if(isReg && regData.length > 0) {
                const flatReg = regData.map(r => {
                    let detail = {}; try { detail = JSON.parse(r.data_laporan || '{}'); } catch(e){}
                    return { Kecamatan: r.sumber_kecamatan, ID_Registrasi: r.id, Tgl_Daftar: r.created_at, Kader_Pendata: r.username, Tim: r.id_tim, Jenis: r.jenis_sasaran, Nama: r.nama_sasaran, Desa: r.desa, Dusun: r.dusun, NIK: detail.nik || '', No_KK: detail.nomor_kk || '', Tgl_Lahir: detail.tanggal_lahir || '', Usia_Tahun: detail.usia_saat_daftar_tahun || '', Status: r.status_sasaran };
                });
                exportToCSV('DataCenter_Registrasi_TPK.csv', flatReg);
            }
            
            if(isPend && pendData.length > 0) {
                const flatPend = pendData.map(p => {
                    let detail = {}; try { detail = JSON.parse(p.data_laporan || '{}'); } catch(e){}
                    return { Kecamatan: p.sumber_kecamatan, ID_Laporan: p.id, Tgl_Input: p.created_at, Kader_Pelapor: p.username, Target_Sasaran: p.id_sasaran_ref, Tgl_Kunjungan: detail.tgl_kunjungan || '', Catatan: detail.catatan || '', Lokasi_GPS: p.lokasi_gps || '' };
                });
                exportToCSV('DataCenter_Pendampingan_TPK.csv', flatPend);
            }
            
            if((isReg && regData.length === 0) && (isPend && pendData.length === 0)) { alert("Data pada rentang tanggal tersebut kosong."); }
            else { alert("✅ Data berhasil diunduh!"); }
        } else { alert("❌ Gagal menyedot data: " + res.message); }
    } catch(e) { catatErrorSistem('DataCenter Export', e); alert("Terjadi kesalahan jaringan/timeout."); }
    
    btn.disabled = false; btn.innerText = "💾 Tarik & Download Excel (CSV)";
};

const exportToCSV = (filename, rows) => {
    if(!rows || !rows.length) return;
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent = keys.join(separator) + '\n' + rows.map(row => {
            return keys.map(k => {
                let cell = row[k] === null || row[k] === undefined ? '' : row[k];
                cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
                if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
                return cell;
            }).join(separator);
        }).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url); link.setAttribute('download', filename);
        link.style.visibility = 'hidden'; document.body.appendChild(link);
        link.click(); document.body.removeChild(link);
    }
};

// ==========================================
// 2. FUNGSI RENDER TABEL (SAFE MODE / ANTI NULL)
// ==========================================
window.renderUserTable = () => {
    try {
        const searchEl = document.getElementById('flt-search');
        const roleEl = document.getElementById('flt-role');
        const kecEl = document.getElementById('flt-kec'); // PATCH: ID Diperbaiki
        
        if (!searchEl || !roleEl || !kecEl) return;
        
        const searchVal = searchEl.value.toLowerCase(); 
        const roleVal = roleEl.value; 
        const kecVal = kecEl.value;
        
        let tableHtml = `<table class="super-table"><thead><tr><th style="text-align:center; width:40px;"><input type="checkbox" id="chk-all-users" title="Pilih Semua yang Tampil"></th><th>ID / Username</th><th>Nama Pengguna</th><th>No. Tim</th><th>Desa/Kelurahan</th><th>Wilayah/Kecamatan</th><th>Role Akses</th><th>PIN / Password</th><th>Aktivitas Terakhir</th><th>Status & Aksi</th></tr></thead><tbody>`;
        let count = 0; window.currentFilteredIds = [];
        window.superUsersData.forEach((u) => {
            const role = String(u.role_akses || u.role || 'KADER').toUpperCase(); const pin = u.password_awal_ref || u.password || u.pin || '***'; const id = u.id_pengguna || u.id_user || u.username || '-'; const nama = u.nama || u.username || '-'; const kec = String(u._kecamatan || u.scope_kecamatan || u.kecamatan || u.wilayah || 'ALL').toUpperCase(); const currentStatus = String(u.status_akun || 'AKTIF').toUpperCase(); const tim = u._nomor_tim || '-'; const desa = u._desa || '-';
            const lastLoginRaw = u.login_terakhir || u.last_login; let lastLoginText = '<span style="color:#aaa; font-style:italic;">Belum pernah login</span>';
            if (lastLoginRaw && String(lastLoginRaw).trim() !== '') { const dateObj = new Date(lastLoginRaw); if (!isNaN(dateObj.getTime())) { lastLoginText = `<span style="color:#0043A8; font-weight:bold;">${dateObj.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</span>`; } }
            const failCount = parseInt(u.jumlah_gagal_login) || 0; const failText = failCount > 0 ? `<br><span style="color:#e94560; font-size:0.75rem; font-weight:bold;">⚠️ ${failCount}x Gagal Login</span>` : '';

            const matchSearch = id.toLowerCase().includes(searchVal) || nama.toLowerCase().includes(searchVal) || tim.toLowerCase().includes(searchVal) || desa.toLowerCase().includes(searchVal);
            const matchRole = roleVal === 'ALL' || role.includes(roleVal); const matchKec = kecVal === 'ALL' || kec === kecVal || kec === 'ALL';
            
            if (matchSearch && matchRole && matchKec) {
                count++; if (!role.includes('SUPER')) { window.currentFilteredIds.push(id); }
                let badgeClass = 'role-kader'; if (role.includes('SUPER')) badgeClass = 'role-super'; else if (role.includes('KABUPATEN')) badgeClass = 'role-adminkab'; else if (role.includes('KECAMATAN') || role === 'ADMIN') badgeClass = 'role-adminkec'; else if (role.includes('DESA')) badgeClass = 'role-desa'; else if (role.includes('PKB')) badgeClass = 'role-pkb'; else if (role.includes('MITRA')) badgeClass = 'role-mitra';
                
                const isAktif = currentStatus === 'AKTIF'; const statusUI = isAktif ? '<span style="color:#198754; font-weight:bold; display:block; margin-bottom:5px;">🟢 Aktif</span>' : '<span style="color:#e94560; font-weight:bold; display:block; margin-bottom:5px;">🔴 Diblokir</span>'; const toggleText = isAktif ? 'Blokir' : 'Aktifkan'; const toggleColor = isAktif ? '#e94560' : '#198754';
                let chkBox = ''; let actionButtons = '';
                if (role.includes('SUPER')) { chkBox = `🔒`; actionButtons = `<span style="font-size:0.8rem; color:#b2bec3; font-style:italic; font-weight:bold;">🛡️ Akses Dilindungi</span>`; } else { chkBox = `<input type="checkbox" class="chk-user" value="${id}">`; actionButtons = `<button class="btn-action btn-edit" style="width:100%; margin-bottom:3px;" onclick="window.superResetPin('${id}', '${nama}')">Reset PIN</button><button class="btn-action" style="background:${toggleColor}; color:white; width:100%;" onclick="window.superToggleStatus('${id}', '${nama}', '${currentStatus}')">${toggleText}</button>`; }
                tableHtml += `<tr style="opacity: ${isAktif ? '1' : '0.6'};"><td style="text-align:center;">${chkBox}</td><td><b>${id}</b></td><td>${nama}</td><td><b style="color:#0043A8;">${tim}</b></td><td>${desa}</td><td>${kec}</td><td><span class="badge-role ${badgeClass}">${role}</span></td><td><code style="background:#eee; padding:3px 6px; border-radius:3px; color:#e94560; font-weight:bold;">${pin}</code></td><td>${lastLoginText}${failText}</td><td>${statusUI}${actionButtons}</td></tr>`;
            }
        });
        if(count === 0) { tableHtml += `<tr><td colspan="10" style="text-align:center; padding:30px; color:#666;">Tidak ada pengguna yang cocok dengan filter.</td></tr>`; }
        tableHtml += `</tbody></table>`; 
        
        const wrapEl = document.getElementById('table-wrapper');
        if(wrapEl) wrapEl.innerHTML = tableHtml;
        
        const chkAll = document.getElementById('chk-all-users'); if (chkAll) { chkAll.addEventListener('change', (e) => { const boxes = document.querySelectorAll('.chk-user'); boxes.forEach(b => b.checked = e.target.checked); }); }
        const lblCount = document.getElementById('lbl-count'); if(lblCount) lblCount.innerText = `${count} Pengguna`;
    } catch (e) { catatErrorSistem('renderUserTable', e); }
};

window.renderKuesionerTable = () => { 
    try { 
        const fltKatEl = document.getElementById('flt-kategori-q');
        if (!fltKatEl) return;
        const filterKat = fltKatEl.value.toUpperCase(); 
        
        let tableHtml = `<table class="super-table"><thead><tr><th width="12%">ID Form</th><th width="15%">Posisi (Modul -> Sasaran)</th><th width="15%">Grup & Urutan</th><th width="30%">Teks Pertanyaan</th><th width="10%">Tipe Jawaban</th><th width="8%">Sifat</th><th width="10%">Aksi</th></tr></thead><tbody>`; let count = 0; 
        window.superKuesionerData.forEach(q => { const id = q.id_pertanyaan || q.id || '-'; const modul = String(q.modul || '-').toUpperCase(); const kat = String(q.jenis_sasaran || q.kategori_sasaran || q.kategori || '-').toUpperCase(); const grup = q.grup_pertanyaan || '-'; const urutG = q.urutan_grup || '-'; const teks = q.label_pertanyaan || q.teks_pertanyaan || q.pertanyaan || '-'; const tipe = String(q.tipe_input || q.tipe_jawaban || q.tipe || '-').toUpperCase(); const opsi = q.opsi_json || q.pilihan_jawaban ? `<div style="font-size:0.75rem; color:#888; margin-top:5px; background:#f1f2f6; padding:4px; border-radius:4px;">Opsi: ${q.opsi_json || q.pilihan_jawaban}</div>` : ''; const wajib = String(q.is_required || q.wajib || 'Y').toUpperCase() === 'Y' || String(q.is_required || q.wajib || 'Y').toUpperCase() === 'YA' ? '<span style="color:#d63031; font-weight:bold;">Wajib *</span>' : '<span style="color:#636e72;">Opsional</span>'; const status = String(q.is_active || q.status || q.status_pertanyaan || 'Y').toUpperCase(); const kondisiLabel = q.kondisi_tampil ? `<div style="font-size:0.75rem; color:#d35400; margin-top:5px; padding:4px; background:#fdf3e8; border-radius:4px; border:1px dashed #fadbd8;">👁️ Muncul Jika: <b>${q.kondisi_tampil}</b></div>` : ''; 
        if (filterKat === 'ALL' || kat === filterKat) { count++; const isAktif = status === 'AKTIF' || status === 'Y'; const bgRow = isAktif ? 'transparent' : '#fdfaf6'; const textStatus = isAktif ? '🟢 Aktif' : '🔴 Mati'; const btnColor = isAktif ? '#e94560' : '#198754'; const btnText = isAktif ? 'Matikan' : 'Hidupkan'; tableHtml += `<tr style="background:${bgRow}; opacity: ${isAktif ? '1' : '0.6'};"><td><code>${id}</code></td><td><span class="badge-role role-kader" style="display:block; margin-bottom:3px; text-align:center;">${modul}</span><span class="badge-role role-adminkec" style="display:block; text-align:center;">${kat}</span></td><td><span style="font-size:0.7rem; color:#666; font-weight:bold;">Urutan Tampil: ${urutG}</span><br><b>${grup}</b></td><td><b>${teks}</b>${opsi}${kondisiLabel}</td><td><code style="color:#0043A8;">${tipe}</code></td><td>${wajib}</td><td><div style="font-size:0.7rem; font-weight:bold; margin-bottom:5px;">${textStatus}</div><button class="btn-action" style="background:${btnColor}; color:white; width:100%;" onclick="window.superToggleQuestion('${id}', '${status}')">${btnText}</button></td></tr>`; } }); 
        if(count === 0) tableHtml += `<tr><td colspan="7" style="text-align:center; padding:30px; color:#666;">Belum ada pertanyaan untuk kategori ini.</td></tr>`; tableHtml += `</tbody></table>`; 
        
        const wrapEl = document.getElementById('table-wrapper-q'); if(wrapEl) wrapEl.innerHTML = tableHtml; 
        const lblEl = document.getElementById('lbl-count-q'); if(lblEl) lblEl.innerText = `${count} Pertanyaan`; 
    } catch(e) { catatErrorSistem('renderKuesionerTable', e); } 
};

window.renderMenuTable = () => { 
    try { 
        let tableHtml = `<table class="super-table"><thead><tr><th width="10%">Urutan</th><th width="20%">Nama Menu</th><th width="15%">Aksi Aplikasi (ID)</th><th width="35%">Target Role (Bisa Melihat)</th><th width="10%">Status</th><th width="10%">Aksi</th></tr></thead><tbody>`; let count = 0; let sortedMenus = [...window.superMenuData].sort((a,b) => { if(a.parent_id === b.parent_id) return (parseInt(a.urutan)||0) - (parseInt(b.urutan)||0); return (a.parent_id || '').localeCompare(b.parent_id || ''); }); 
        sortedMenus.forEach(m => { if(!m.id_menu) return; count++; const id = m.id_menu; const isChild = m.parent_id && m.parent_id !== ''; const parentName = isChild ? (window.superMenuData.find(p => p.id_menu === m.parent_id)?.label_menu || 'Induk Unknown') : ''; const label = isChild ? `<span style="color:#aaa;">↳ (Anak dari ${parentName})</span><br>${m.icon || '📌'} ${m.label_menu}` : `<b style="font-size:1.05rem;">${m.icon || '📌'} ${m.label_menu}</b>`; const target = m.target_view || '-'; const role = (m.role_akses || 'KADER').toUpperCase().replace(/,/g, ', '); const status = String(m.is_active || 'Y').toUpperCase(); const isAktif = status === 'Y'; const bgRow = isChild ? (isAktif ? '#f8fafd' : '#f1f2f6') : (isAktif ? 'transparent' : '#fdfaf6'); const textStatus = isAktif ? '🟢 Muncul' : '🔴 Sembunyi'; const btnColor = isAktif ? '#e94560' : '#198754'; const btnText = isAktif ? 'Sembunyikan' : 'Munculkan'; tableHtml += `<tr style="background:${bgRow}; opacity: ${isAktif ? '1' : '0.6'};"><td style="font-weight:bold; font-size:1.1rem; color:#0043A8; text-align:center;">${m.urutan || 0}</td><td style="color:#2c3e50;">${label}</td><td><code>${target}</code></td><td><div style="font-size:0.75rem; background:#eef2f5; padding:4px 8px; border-radius:4px; display:inline-block; border:1px solid #dcdde1;">${role}</div></td><td><b>${textStatus}</b></td><td style="display:flex; flex-direction:column; gap:5px;"><button class="btn-action btn-edit" style="width:100%;" onclick="window.superEditMenu('${id}')">✏️ Edit</button><button class="btn-action" style="background:${btnColor}; color:white; width:100%;" onclick="window.superToggleMenu('${id}', '${status}')">${btnText}</button></td></tr>`; }); 
        if(count === 0) tableHtml += `<tr><td colspan="6" style="text-align:center; padding:30px; color:#666;">Database Menu masih kosong.</td></tr>`; tableHtml += `</tbody></table>`; 
        
        const wrapEl = document.getElementById('table-wrapper-m'); if(wrapEl) wrapEl.innerHTML = tableHtml; 
        const lblEl = document.getElementById('lbl-count-m'); if(lblEl) lblEl.innerText = `${count} Menu Aktif`; 
    } catch(e) { catatErrorSistem('renderMenuTable', e); } 
};

window.renderWidgetTable = () => { 
    try { 
        let tableHtml = `<table class="super-table"><thead><tr><th width="15%">Target Halaman</th><th width="10%">Posisi</th><th width="15%">Tipe Terbaca</th><th width="40%">Isi Konten (Preview)</th><th width="10%">Status</th><th width="10%">Aksi</th></tr></thead><tbody>`; let count = 0; 
        window.superWidgetData.forEach(w => { if(!w.id_widget) return; count++; const id = w.id_widget; const target = w.target_halaman || '-'; const posisi = w.posisi || '-'; const tipe = w.tipe || 'html'; const konten = (w.isi_konten || '').substring(0, 80) + '...'; const status = String(w.is_active || 'Y').toUpperCase(); const isAktif = status === 'Y'; const bgRow = isAktif ? 'transparent' : '#fdfaf6'; const textStatus = isAktif ? '🟢 Aktif' : '🔴 Mati'; const btnColor = isAktif ? '#e94560' : '#198754'; const btnText = isAktif ? 'Matikan' : 'Hidupkan'; tableHtml += `<tr style="background:${bgRow}; opacity: ${isAktif ? '1' : '0.6'};"><td><b><code style="color:#e94560;">${target}</code></b></td><td><span style="background:#e8f4fd; color:#0043A8; padding:3px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">${posisi.toUpperCase()}</span></td><td>${tipe.toUpperCase()}</td><td><div style="font-size:0.8rem; background:#eee; padding:5px; border-radius:4px; font-family:monospace; color:#555; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${konten.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></td><td><b>${textStatus}</b></td><td style="display:flex; flex-direction:column; gap:5px;"><button class="btn-action btn-edit" style="width:100%;" onclick="window.superEditWidget('${id}')">✏️ Edit</button><button class="btn-action" style="background:${btnColor}; color:white; width:100%;" onclick="window.superToggleWidget('${id}', '${status}')">${btnText}</button></td></tr>`; }); 
        if(count === 0) tableHtml += `<tr><td colspan="6" style="text-align:center; padding:30px; color:#666;">Database Widget Injeksi masih kosong.</td></tr>`; tableHtml += `</tbody></table>`; 
        
        const wrapEl = document.getElementById('table-wrapper-w'); if(wrapEl) wrapEl.innerHTML = tableHtml; 
        const lblEl = document.getElementById('lbl-count-w'); if(lblEl) lblEl.innerText = `${count} Widget Aktif`; 
    } catch(e) { catatErrorSistem('renderWidgetTable', e); } 
};

window.renderAuditTable = () => { 
    try { 
        if (window.activeAuditTab === 'ERROR') {
            const searchEl = document.getElementById('log-flt-search');
            if (!searchEl) return;
            
            let tableHtml = `<table class="super-table"><thead><tr><th width="15%">Waktu Sistem (WITA)</th><th width="15%">ID Pengguna</th><th width="20%">Lokasi Kerusakan</th><th width="20%">Info Perangkat</th><th width="30%">Pesan Error (Terminal Log)</th></tr></thead><tbody>`;
            let count = 0; const searchVal = searchEl.value.toLowerCase(); const sortedErr = [...window.superErrorData].sort((a,b) => new Date(b.waktu) - new Date(a.waktu));
            sortedErr.forEach(err => { const dt = new Date(err.waktu); if (isNaN(dt.getTime())) return; const usr = String(err.id_pengguna).toLowerCase(); const loc = String(err.lokasi_sistem).toLowerCase(); const msg = String(err.pesan_error).toLowerCase(); if (searchVal && !usr.includes(searchVal) && !loc.includes(searchVal) && !msg.includes(searchVal)) return; count++; tableHtml += `<tr><td style="color:#666; font-size:0.85rem;">${dt.toLocaleString('id-ID')}</td><td><b style="color:#e94560;">${err.id_pengguna || '-'}</b></td><td><b style="color:#0A2342; font-size:0.85rem;">${err.lokasi_sistem || '-'}</b></td><td><div style="font-size:0.7rem; color:#666; max-height:45px; overflow:hidden;" title="${err.perangkat}">${err.perangkat || '-'}</div></td><td><code style="font-size:0.8rem; color:#d63031; background:#fbebf0; padding:4px 6px; border-radius:4px; display:block; white-space:pre-wrap; word-break:break-all;">${err.pesan_error || '-'}</code></td></tr>`; });
            if (count === 0) tableHtml += `<tr><td colspan="5" style="text-align:center; padding:40px; color:#198754; font-size:1.1rem; font-weight:bold;">✅ Mesin Bersih! Tidak ada Error yang terekam.</td></tr>`; tableHtml += `</tbody></table>`;
            
            const wrp = document.getElementById('table-wrapper-log'); if(wrp) wrp.innerHTML = tableHtml; 
            const lbl = document.getElementById('lbl-count-log'); if(lbl) lbl.innerText = `${count} Kerusakan Ditemukan`; 
            return;
        }

        const waktuEl = document.getElementById('log-flt-waktu');
        const aksiEl = document.getElementById('log-flt-aksi');
        const searchEl = document.getElementById('log-flt-search');
        if (!waktuEl || !aksiEl || !searchEl) return;

        const fltWaktu = waktuEl.value; const fltAksi = aksiEl.value; const searchVal = searchEl.value.toLowerCase(); const now = new Date(); let limitDate = new Date('2000-01-01'); if (fltWaktu === 'TODAY') limitDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); else if (fltWaktu === '7D') limitDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); else if (fltWaktu === '30D') limitDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); let tableHtml = `<table class="super-table"><thead><tr><th width="15%">Waktu Sistem</th><th width="25%">Pengguna & Wilayah (Cross-Ref)</th><th width="15%">Aksi / Status</th><th width="45%">Detail Keterangan</th></tr></thead><tbody>`; let count = 0; const sortedLog = [...window.superAuditData].sort((a,b) => new Date(b.waktu) - new Date(a.waktu)); 
        sortedLog.forEach(log => { const dt = new Date(log.waktu); if (isNaN(dt.getTime()) || dt < limitDate) return; const aksi = String(log.aksi).toUpperCase(); if (fltAksi !== 'ALL') { if (fltAksi === 'LOGIN_SUKSES' && !aksi.includes('SUKSES')) return; if (fltAksi === 'LOGIN_GAGAL' && !aksi.includes('GAGAL')) return; if (fltAksi === 'ADMIN' && aksi.includes('LOGIN')) return; } let userName = log.target || '-'; let userWilayah = '-'; const u = window.superUsersData.find(x => x.id_pengguna === log.target || x.username === log.target || x.id_user === log.target); if (u) { userName = `<b>${u.nama || u.username}</b><br><code style="font-size:0.75rem; background:#eee; padding:2px 4px; border-radius:3px; color:#555;">ID: ${log.target}</code>`; userWilayah = `${u._desa || '-'}, ${u._kecamatan || '-'}`; } else { userName = `<b>ID Tidak Dikenal</b><br><code style="font-size:0.75rem; background:#eee; padding:2px 4px; border-radius:3px; color:#555;">${log.target}</code>`; } const detailStr = String(log.detail || '').toLowerCase(); const targetStr = String(log.target || '').toLowerCase(); if (searchVal && !detailStr.includes(searchVal) && !targetStr.includes(searchVal) && !userName.toLowerCase().includes(searchVal) && !userWilayah.toLowerCase().includes(searchVal)) return; count++; let badgeColor = '#0043A8'; if(aksi.includes('TAMBAH') || aksi.includes('SUKSES')) badgeColor = '#198754'; else if(aksi.includes('STATUS') || aksi.includes('RESET')) badgeColor = '#F1C40F'; else if(aksi.includes('HAPUS') || aksi.includes('BLOKIR') || aksi.includes('GAGAL')) badgeColor = '#e94560'; tableHtml += `<tr><td style="color:#666; font-size:0.85rem;">${dt.toLocaleString('id-ID')}</td><td><div style="line-height:1.3;">${userName}</div><div style="font-size:0.75rem; color:#888; margin-top:5px; font-weight:bold;">📍 ${userWilayah}</div></td><td><span style="background:${badgeColor}; color:${badgeColor==='#F1C40F'?'#0A2342':'white'}; padding:3px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold;">${aksi}</span></td><td style="color:#444; font-size:0.85rem; line-height:1.4;">${log.detail || '-'}</td></tr>`; }); 
        if (count === 0) tableHtml += `<tr><td colspan="4" style="text-align:center; padding:30px; color:#666;">Tidak ada log yang cocok dengan pencarian/filter.</td></tr>`; tableHtml += `</tbody></table>`; 
        
        const wrp = document.getElementById('table-wrapper-log'); if(wrp) wrp.innerHTML = tableHtml; 
        const lbl = document.getElementById('lbl-count-log'); if(lbl) lbl.innerText = `${count} Log Ditemukan`; 
    } catch(e) { catatErrorSistem('renderAuditTable', e); } 
};

window.renderPengumumanTable = () => {
    try {
        let tableHtml = `<table class="super-table"><thead><tr><th width="15%">Waktu Terbit</th><th width="20%">Judul Siaran</th><th width="35%">Isi Pesan</th><th width="15%">Target Audience</th><th width="15%">Status & Aksi</th></tr></thead><tbody>`;
        let count = 0;
        const sortedP = [...window.superPengumumanData].sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));
        sortedP.forEach(p => {
            if(!p.id_pengumuman) return;
            count++;
            const tgl = new Date(p.tanggal).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
            const judul = p.judul || '-';
            const isi = p.isi_pesan || '-';
            const target = p.target_role || 'SEMUA';
            const status = String(p.is_active || 'Y').toUpperCase();
            
            const isAktif = status === 'Y';
            const bgRow = isAktif ? 'transparent' : '#fdfaf6';
            const textStatus = isAktif ? '🟢 Tersiar (Live)' : '🔴 Ditarik';
            const btnColor = isAktif ? '#e94560' : '#198754';
            const btnText = isAktif ? 'Tarik Pesan' : 'Siarkan Ulang';
            
            tableHtml += `<tr style="background:${bgRow}; opacity: ${isAktif ? '1' : '0.6'};">
                <td><span style="font-size:0.8rem; color:#666;">${tgl}</span><br><code style="font-size:0.7rem; color:#0984e3;">${p.id_pengumuman}</code></td>
                <td><b style="color:#0A2342;">${judul}</b></td>
                <td><div style="font-size:0.85rem; color:#444; line-height:1.4;">${isi}</div></td>
                <td><span class="badge-role role-admin">${target}</span></td>
                <td><div style="font-size:0.75rem; font-weight:bold; margin-bottom:5px;">${textStatus}</div><button class="btn-action" style="background:${btnColor}; color:white; width:100%;" onclick="window.superTogglePengumuman('${p.id_pengumuman}', '${status}')">${btnText}</button></td>
            </tr>`;
        });
        if(count === 0) tableHtml += `<tr><td colspan="5" style="text-align:center; padding:30px; color:#666;">Belum ada pengumuman yang disiarkan.</td></tr>`;
        tableHtml += `</tbody></table>`;
        const wrp = document.getElementById('table-wrapper-p'); if(wrp) wrp.innerHTML = tableHtml;
        const lbl = document.getElementById('lbl-count-p'); if(lbl) lbl.innerText = `${count} Pengumuman`;
    } catch(e) { catatErrorSistem('renderPengumumanTable', e); }
};

// ==========================================
// 3. INISIALISASI KERANGKA (SKELETON)
// ==========================================
export const initSuperAdmin = async (session) => {
    try {
        window.currentUser = session;
        const vSplash = document.getElementById('view-splash'); const vLogin = document.getElementById('view-login'); const vApp = document.getElementById('view-app');
        if(vLogin) vLogin.classList.add('hidden'); if(vApp) vApp.classList.add('hidden'); if(vSplash) vSplash.style.display = 'none';

        document.body.innerHTML = `
            <div id="super-root" style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; background:#eef2f5; font-family: 'Segoe UI', sans-serif; overflow: hidden;">
                <div id="super-sidebar-overlay" style="display:none; position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:99;"></div>
                <div id="super-sidebar" style="width:280px; background: linear-gradient(180deg, #0A2342 0%, #0043A8 100%); color:white; display:flex; flex-direction:column; box-shadow: 4px 0 10px rgba(0,0,0,0.15); z-index:100; flex-shrink: 0; transition: transform 0.3s ease;">
                    <div style="padding: 25px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align:center;"><div style="font-size: 3rem; margin-bottom: 10px;">👑</div><h3 style="margin:0; font-weight:900; line-height:1.2; letter-spacing:1px;"><span style="font-size:1.1rem; color:#F1C40F; display:block;">PUSAT KENDALI</span><span style="font-size:1.3rem; color:#ffffff; display:block;">SUPER ADMIN</span></h3></div>
                    <div style="flex:1; padding: 20px 0; overflow-y:auto; min-height:0;">
                        <div class="super-menu-item active" data-target="dashboard">🎛️ Dashboard Utama</div>
                        <div class="super-menu-item" data-target="pengumuman">📢 Pusat Siaran (Broadcast)</div>
                        <div class="super-menu-item" data-target="user_management">👥 Manajemen Pengguna</div>
                        <div class="super-menu-item" data-target="kuesioner">📋 Master Kuesioner (Form)</div>
                        <div class="super-menu-item" data-target="menu_management">🎚️ Manajemen Menu (RBAC)</div>
                        <div class="super-menu-item" data-target="widget_management">🧩 Pabrik Halaman (Widget)</div>
                        <div class="super-menu-item" data-target="ekspor_data">💾 Data Center (Ekspor)</div>
                        <div class="super-menu-item" data-target="referensi">🏗️ Master Wilayah & Referensi</div>
                        <div class="super-menu-item" data-target="audit_trail">🛡️ Audit Log & Keamanan</div>
                    </div>
                    <div style="padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);"><div style="font-size:0.8rem; margin-bottom:10px; color:#E8F4FD;">Dewa Sistem:<br><b style="color:#F1C40F; font-size:0.95rem;">${session.nama}</b></div><button id="btn-super-logout" style="width:100%; background:transparent; color:#F1C40F; border:1px solid #F1C40F; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold; transition: all 0.3s;">🔒 Cabut Akses (Keluar)</button></div>
                </div>
                <div style="flex:1; display:flex; flex-direction:column; overflow:hidden; width:100%;">
                    <div style="background:white; padding: 15px 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); z-index:5; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:15px;"><button id="btn-toggle-super" style="background:none; border:none; font-size:1.6rem; cursor:pointer; color:#0A2342; padding:0; line-height:1;">☰</button><h2 id="super-page-title" style="margin:0; font-size:1.4rem; color:#0A2342; font-weight:800;">Dashboard Utama</h2></div>
                        <div style="font-size:0.8rem; background:#198754; color:white; padding:4px 10px; border-radius:20px; font-weight:bold; letter-spacing:1px;">API SECURED 🔐</div>
                    </div>
                    <div id="super-content" style="flex:1; padding: 25px; overflow-y:auto; background:#eef2f5;"></div>
                </div>
            </div>

            <style>
                .super-menu-item { padding: 14px 25px; color: #E8F4FD; font-weight: 600; cursor: pointer; transition: all 0.3s; border-left: 4px solid transparent; font-size: 0.95rem; } 
                .super-menu-item:hover { background: rgba(241, 196, 15, 0.1); color: #F1C40F; } 
                .super-menu-item.active { background: rgba(241, 196, 15, 0.2); color: #F1C40F; border-left: 4px solid #F1C40F; } 
                .super-card { background: white; border-radius: 10px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #e1e8ed; } 
                #btn-super-logout:hover { background: #F1C40F; color: #0A2342; }
                .super-table-container { max-height: calc(100vh - 280px); overflow-y: auto; border-radius: 8px; border: 1px solid #eee; background:white; } .super-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; min-width: 1100px; } .super-table th { position: sticky; top: 0; z-index: 10; background: #0A2342; color: white; padding: 15px; text-align: left; font-weight:600; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-bottom: 3px solid #F1C40F; } .super-table td { padding: 12px 15px; border-bottom: 1px solid #eee; color: #444; vertical-align: top;} .super-table tr:hover td { background: #f8f9fa; }
                
                .badge-role { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; text-transform:uppercase; border: 1px solid transparent; } 
                .role-kader { background: #E8F4FD; color: #2980B9; border-color: #b6d4fe; } 
                .role-adminkab { background: #0043A8; color: #F1C40F; border-color: #0043A8; } 
                .role-adminkec { background: #2980B9; color: #FFFFFF; border-color: #2980B9; } 
                .role-desa { background: #F1C40F; color: #0A2342; border-color: #F1C40F; } 
                .role-pkb { background: #B8860B; color: #FFFFFF; border-color: #B8860B; } 
                .role-mitra { background: #FFF8E7; color: #2980B9; border-color: #D4AF37; } 
                .role-super { background: #0A2342; color: #F1C40F; border-color: #F1C40F; } 
                
                .btn-action { padding: 6px 12px; border: none; border-radius: 4px; font-size: 0.8rem; font-weight: bold; cursor: pointer; margin-right: 5px; transition: opacity 0.2s;} .btn-action:hover { opacity: 0.8; } .btn-edit { background: #F1C40F; color: #0A2342; } .filter-input { padding:8px 12px; border:1px solid #ccc; border-radius:6px; outline:none; font-family:inherit; } .filter-input:focus { border-color:#0043A8; box-shadow: 0 0 0 2px rgba(0, 67, 168, 0.2); }
                .btn-mass { padding: 8px 15px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; color: white; display: flex; align-items: center; gap: 5px; font-size:0.85rem;}
                .chk-user { cursor:pointer; transform:scale(1.3); accent-color: #0043A8; } #chk-all-users { cursor:pointer; transform:scale(1.3); accent-color: #e94560; } #btn-clear-search:hover { color: #e94560 !important; }
                .quick-link-btn:hover { background: #e8f4fd !important; border-color: #0043A8 !important; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05); }
                .emoji-item { cursor:pointer; font-size:1.5rem; text-align:center; padding:5px; border-radius:5px; transition:background 0.2s; } .emoji-item:hover { background:#e8f4fd; }
                @media (max-width: 1024px) { #super-sidebar { position: absolute; top:0; bottom:0; left:0; transform: translateX(-100%); } #super-sidebar.mobile-active { transform: translateX(0); } #super-sidebar-overlay.mobile-active { display: block !important; } } @media (min-width: 1025px) { #super-sidebar.desktop-collapsed { margin-left: -280px; } }
            </style>
        `;

        document.getElementById('btn-toggle-super').onclick = () => { const s = document.getElementById('super-sidebar'); const o = document.getElementById('super-sidebar-overlay'); if (window.innerWidth <= 1024) { s.classList.toggle('mobile-active'); o.classList.toggle('mobile-active'); } else { s.classList.toggle('desktop-collapsed'); } };
        document.getElementById('super-sidebar-overlay').onclick = () => { document.getElementById('super-sidebar').classList.remove('mobile-active'); document.getElementById('super-sidebar-overlay').classList.remove('mobile-active'); };
        document.getElementById('btn-super-logout').onclick = async () => { if(confirm("Tutup Sesi Super Admin dan kunci sistem?")) { await clearStore('kader_session'); location.reload(); } };

        const menuItems = document.querySelectorAll('.super-menu-item');
        menuItems.forEach(item => { item.onclick = () => { menuItems.forEach(m => m.classList.remove('active')); item.classList.add('active'); document.getElementById('super-page-title').innerText = item.innerText.replace(/[^\w\s]/gi, '').trim(); if (window.innerWidth <= 1024) { document.getElementById('super-sidebar').classList.remove('mobile-active'); document.getElementById('super-sidebar-overlay').classList.remove('mobile-active'); } window.renderSuperView(item.getAttribute('data-target')); }; });

        window.renderSuperView('dashboard');
    } catch(e) { catatErrorSistem('initSuperAdmin', e); }
};

// ==========================================
// 4. PENGENDALI TAMPILAN MENU (ROUTER)
// ==========================================
const EMOJI_LIST = ['📊','🏠','📝','🤝','🖨️','🆘','⚙️','🔁','📋','📈','📌','🗓️','👨‍👩‍👧‍👦','👶','🤰','👰','🏥','📢','⚠️','✅','🔥','🌟','💡','🔍','📁','📑'];

window.renderSuperView = async (target) => {
    const content = document.getElementById('super-content');
    
    try {
        if (target === 'dashboard') { 
            content.innerHTML = `
                <div class="animate-fade">
                    <div class="super-card" style="background: linear-gradient(135deg, #0A2342 0%, #0043A8 100%); color: white; margin-bottom: 20px; border: none; padding: 25px 30px; border-bottom: 5px solid #F1C40F;">
                        <h2 style="margin:0 0 5px 0; font-size:1.6rem; color:#F1C40F;">Selamat Datang, ${window.currentUser?.nama || 'Komandan'}! 🚀</h2>
                        <p style="margin:0; opacity:0.9; font-size:0.95rem;">Pusat Kendali Utama (God Mode) Sistem Pendataan Kader TPK.</p>
                    </div>

                    <div class="super-card" style="margin-bottom: 20px; padding: 15px; border-left: 4px solid #F1C40F;">
                        <div style="font-size:0.85rem; font-weight:bold; color:#0A2342; margin-bottom:10px;">🔍 FILTER STATISTIK PENGGUNAAN APLIKASI</div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                            <select id="dash-flt-waktu" class="filter-input"><option value="ALL">🗓️ Sepanjang Masa</option><option value="TODAY">⏳ Hari Ini</option><option value="7D">📅 7 Hari Terakhir</option><option value="30D">📆 30 Hari Terakhir</option></select>
                            <select id="dash-flt-role" class="filter-input"><option value="ALL">👥 Semua Role</option><option value="KADER">Kader TPK</option><option value="PKB">PKB / Supervisor</option><option value="ADMIN_DESA">Admin Desa/Kelurahan</option><option value="ADMIN">Admin Kecamatan</option><option value="MITRA">Mitra Kerja</option><option value="SUPER">Super Admin</option></select>
                            <select id="dash-flt-kec" class="filter-input"><option value="ALL">🌍 Semua Kecamatan</option></select>
                            <select id="dash-flt-desa" class="filter-input"><option value="ALL">🏘️ Semua Desa</option></select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 20px;">
                        <div class="super-card" style="border-left: 5px solid #0043A8; display:flex; flex-direction:column; justify-content:center; padding: 15px;">
                            <div style="font-size:0.8rem; color:#666; font-weight:bold;">PENGGUNA AKTIF (PERNAH LOGIN)</div>
                            <div id="st-aktif" style="font-size:2rem; font-weight:900; color:#0043A8; margin-top:5px;">⏳</div>
                        </div>
                        <div class="super-card" style="border-left: 5px solid #B8860B; display:flex; flex-direction:column; justify-content:center; padding: 15px;">
                            <div style="font-size:0.8rem; color:#666; font-weight:bold;">PASIF (BELUM PERNAH LOGIN)</div>
                            <div id="st-pasif" style="font-size:2rem; font-weight:900; color:#B8860B; margin-top:5px;">⏳</div>
                        </div>
                        <div class="super-card" style="border-left: 5px solid #198754; display:flex; flex-direction:column; justify-content:center; padding: 15px;">
                            <div style="font-size:0.8rem; color:#666; font-weight:bold;">TOTAL LOGIN BERHASIL</div>
                            <div id="st-sukses" style="font-size:2rem; font-weight:900; color:#198754; margin-top:5px;">⏳</div>
                        </div>
                        <div class="super-card" style="border-left: 5px solid #e94560; display:flex; flex-direction:column; justify-content:center; padding: 15px;">
                            <div style="font-size:0.8rem; color:#666; font-weight:bold;">TOTAL LOGIN GAGAL</div>
                            <div id="st-gagal" style="font-size:2rem; font-weight:900; color:#e94560; margin-top:5px;">⏳</div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
                        <div class="super-card" style="text-align:center; padding:15px; border-bottom: 3px solid #0043A8;"><div style="font-size:0.75rem; color:#666; font-weight:bold;">TOTAL AKUN</div><div id="dash-count-user" style="font-size:1.5rem; font-weight:900; color:#0A2342;">⏳</div></div>
                        <div class="super-card" style="text-align:center; padding:15px; border-bottom: 3px solid #F1C40F;"><div style="font-size:0.75rem; color:#666; font-weight:bold;">KUESIONER</div><div id="dash-count-q" style="font-size:1.5rem; font-weight:900; color:#0A2342;">⏳</div></div>
                        <div class="super-card" style="text-align:center; padding:15px; border-bottom: 3px solid #0043A8;"><div style="font-size:0.75rem; color:#666; font-weight:bold;">MENU AKTIF</div><div id="dash-count-m" style="font-size:1.5rem; font-weight:900; color:#0A2342;">⏳</div></div>
                        <div class="super-card" style="text-align:center; padding:15px; border-bottom: 3px solid #F1C40F;"><div style="font-size:0.75rem; color:#666; font-weight:bold;">WIDGET INJEKSI</div><div id="dash-count-w" style="font-size:1.5rem; font-weight:900; color:#0A2342;">⏳</div></div>
                    </div>

                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
                        <div class="super-card">
                            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #F1C40F; padding-bottom:10px; margin-bottom:15px;">
                                <h3 style="margin:0; color:#0A2342;">🛡️ Log Keamanan Terakhir (CCTV)</h3>
                                <button style="background:none; border:none; color:#0043A8; cursor:pointer; font-weight:bold; font-size:0.85rem;" onclick="document.querySelector('[data-target=audit_trail]').click()">Lihat Detail & Filter</button>
                            </div>
                            <div id="dash-audit-list"><div style="text-align:center; color:#999; padding:20px;">Menarik data CCTV dari satelit... ⏳</div></div>
                        </div>
                        
                        <div style="display:flex; flex-direction:column; gap:15px;">
                            <div class="super-card" style="border-top: 4px solid #e94560;">
                                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px;">
                                    <h3 style="margin:0; color:#e94560; font-size:1.1rem;">🚨 Radar Anomali (Error)</h3>
                                    <button style="background:none; border:none; color:#e94560; cursor:pointer; font-weight:bold; font-size:0.8rem;" onclick="document.querySelector('[data-target=audit_trail]').click(); setTimeout(()=>document.getElementById('btn-tab-error').click(), 500);">Buka Black Box</button>
                                </div>
                                <div id="dash-error-list"><div style="text-align:center; color:#999; padding:20px;">Membaca sinyal anomali... ⏳</div></div>
                            </div>
                            
                            <div class="super-card">
                                <h3 style="margin-top:0; color:#0A2342; border-bottom:2px solid #F1C40F; padding-bottom:10px;">⚡ Aksi Cepat</h3>
                                <div style="display:grid; grid-template-columns: 1fr; gap:10px; margin-top:15px;">
                                    <button class="quick-link-btn" onclick="document.querySelector('[data-target=pengumuman]').click()" style="padding:12px; background:#f8f9fa; border:1px solid #ddd; border-radius:8px; cursor:pointer; text-align:left; font-weight:bold; color:#0A2342; transition:all 0.2s;">📢 Buat Pengumuman</button>
                                    <button class="quick-link-btn" onclick="document.querySelector('[data-target=ekspor_data]').click()" style="padding:12px; background:#f8f9fa; border:1px solid #ddd; border-radius:8px; cursor:pointer; text-align:left; font-weight:bold; color:#0A2342; transition:all 0.2s;">💾 Ekspor Data Excel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const renderAnalytics = () => {
                if (window.dashAnalyticData.users.length === 0) return;
                
                const wktEl = document.getElementById('dash-flt-waktu');
                const roleEl = document.getElementById('dash-flt-role');
                const kecEl = document.getElementById('dash-flt-kec');
                const desaEl = document.getElementById('dash-flt-desa');
                
                if (!wktEl || !roleEl || !kecEl || !desaEl) return; 

                const fltWaktu = wktEl.value; 
                const fltRole = roleEl.value; 
                const fltKec = kecEl.value; 
                const fltDesa = desaEl.value;
                
                const now = new Date(); let limitDate = new Date('2000-01-01');
                if (fltWaktu === 'TODAY') limitDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                else if (fltWaktu === '7D') limitDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                else if (fltWaktu === '30D') limitDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

                let filteredUsers = window.dashAnalyticData.users.filter(u => {
                    const r = String(u.role_akses || u.role || '').toUpperCase(); const k = String(u._kecamatan || u.scope_kecamatan || u.kecamatan || '').toUpperCase(); const d = String(u._desa || u.scope_desa || u.desa_kelurahan || '').toUpperCase();
                    let matchRole = fltRole === 'ALL' || r.includes(fltRole); let matchKec = fltKec === 'ALL' || k === fltKec; 
                    let matchDesa = fltDesa === 'ALL' || d.includes(fltDesa);
                    return matchRole && matchKec && matchDesa;
                });

                let cAktif = 0; let cPasif = 0;
                filteredUsers.forEach(u => { const tLogin = u.login_terakhir || u.last_login; if (tLogin && String(tLogin).trim() !== '') { const dt = new Date(tLogin); if (!isNaN(dt.getTime()) && dt >= limitDate) cAktif++; else cPasif++; } else { cPasif++; } });

                let cSukses = 0; let cGagal = 0;
                const validUserIds = new Set(filteredUsers.map(u => String(u.id_user || u.id_pengguna || u.username)));
                window.dashAnalyticData.logs.forEach(log => {
                    const act = String(log.aksi).toUpperCase();
                    if (act.includes('LOGIN')) { const dt = new Date(log.waktu); if (!isNaN(dt.getTime()) && dt >= limitDate) { if (validUserIds.has(String(log.target))) { if (act.includes('SUKSES')) cSukses++; else if (act.includes('GAGAL')) cGagal++; } } }
                });

                document.getElementById('dash-count-user').innerText = filteredUsers.length; document.getElementById('st-aktif').innerText = cAktif; document.getElementById('st-pasif').innerText = cPasif; document.getElementById('st-sukses').innerText = cSukses; document.getElementById('st-gagal').innerText = cGagal;
            };

            const loadDashboardData = async () => {
                const sheetsAset = [ { name: 'MASTER_PERTANYAAN', id: 'dash-count-q' }, { name: 'MASTER_MENU', id: 'dash-count-m' }, { name: 'MASTER_WIDGET', id: 'dash-count-w' } ];
                sheetsAset.forEach(s => { fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: s.name }) }).then(r => r.json()).then(res => { if(res.status === 'success') { let el = document.getElementById(s.id); if(el) el.innerText = res.data.length; } }).catch(e => { catatErrorSistem(`Load Dashboard - ${s.name}`, e); }); });

                try {
                    const [resU, resT, resK, resA, resP] = await Promise.all([
                        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'USER_LOGIN' }) }).then(r => r.json()),
                        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_TIM' }) }).then(r => r.json()),
                        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_KADER' }) }).then(r => r.json()),
                        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_AUDIT', token: SUPER_TOKEN }) }).then(r => r.json()),
                        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_PKB' }) }).then(r => r.json())
                    ]);

                    if (resU.status === 'success') {
                        const rawUsers = resU.data || []; const timData = resT.data || []; const kaderData = resK.data || []; const pkbData = resP.data || [];
                        window.dashAnalyticData.users = rawUsers.map(u => {
                            let nKec = String(u.scope_kecamatan || u.kecamatan || 'ALL').toUpperCase(); let nDesa = String(u.scope_desa || u.desa_kelurahan || u.desa || '-').toUpperCase(); const role = String(u.role_akses || u.role || 'KADER').toUpperCase(); const refId = u.ref_id || u.id_pengguna || u.id_user || u.username;
                            if (role.includes('KADER')) { const k = kaderData.find(kd => String(kd.id_kader) === String(refId) || String(kd.nik) === String(refId)); if (k) { const idTim = k.id_tim || k.tim; const t = timData.find(td => String(td.id_tim) === String(idTim) || String(td.id) === String(idTim)); if (t) { let d = t.desa_kelurahan || t.desa || k.desa_kelurahan || k.desa || nDesa; nDesa = String(d).toUpperCase(); let c = t.kecamatan || t.wilayah || k.kecamatan || nKec; nKec = String(c).toUpperCase(); } } }
                            if (role.includes('PKB')) { if(nDesa === '-' || nDesa === '') { const p = pkbData.find(pk => String(pk.id_pkb) === String(refId) || String(pk.nip_pkb) === String(refId)); if (p) { nKec = String(p.kecamatan || nKec).toUpperCase(); nDesa = String(p.desa_kelurahan || p.desa || nDesa).toUpperCase(); } } }
                            if (nDesa === 'UNDEFINED' || nDesa === '') nDesa = '-'; u._desa = nDesa; u._kecamatan = nKec; return u;
                        });

                        window.superUsersData = window.dashAnalyticData.users; 

                        const kecSet = new Set(); window.dashAnalyticData.users.forEach(u => { const k = u._kecamatan.trim(); if(k && k !== 'ALL' && k !== 'SEMUA' && k !== '-') kecSet.add(k); });
                        const selKec = document.getElementById('dash-flt-kec'); 
                        if(selKec) {
                            Array.from(kecSet).sort().forEach(k => { selKec.innerHTML += `<option value="${k}">${k}</option>`; });
                            const selDesa = document.getElementById('dash-flt-desa');
                            selKec.onchange = () => {
                                if(!selDesa) return;
                                selDesa.innerHTML = '<option value="ALL">🏘️ Semua Desa</option>'; const valKec = selKec.value;
                                if (valKec !== 'ALL') { 
                                    const dSet = new Set(); 
                                    window.dashAnalyticData.users.forEach(u => { if(u._kecamatan === valKec && u._desa !== '-') { u._desa.split(',').forEach(dx => dSet.add(dx.trim())); } }); 
                                    Array.from(dSet).sort().forEach(d => { selDesa.innerHTML += `<option value="${d}">${d}</option>`; }); 
                                }
                                renderAnalytics(); 
                            };
                            
                            const wktEl = document.getElementById('dash-flt-waktu');
                            const roleEl = document.getElementById('dash-flt-role');
                            if(wktEl) wktEl.onchange = renderAnalytics; 
                            if(roleEl) roleEl.onchange = renderAnalytics; 
                            selDesa.onchange = renderAnalytics;
                        }

                        if(resA.status === 'success') {
                            window.dashAnalyticData.logs = resA.data || [];
                            window.superErrorData = resA.error_data || [];
                            
                            const dashList = document.getElementById('dash-audit-list');
                            if(dashList) {
                                if(window.dashAnalyticData.logs.length === 0) { dashList.innerHTML = `<div style="text-align:center; color:#999; padding:20px;">Belum ada rekaman aktivitas.</div>`; } else {
                                    const top5 = [...window.dashAnalyticData.logs].slice(0, 5);
                                    dashList.innerHTML = top5.map(log => {
                                        const time = new Date(log.waktu).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}); const aksi = String(log.aksi).toUpperCase(); let badgeColor = '#0043A8'; if(aksi.includes('TAMBAH') || aksi.includes('SUKSES')) badgeColor = '#198754'; else if(aksi.includes('STATUS') || aksi.includes('RESET')) badgeColor = '#F1C40F'; else if(aksi.includes('HAPUS') || aksi.includes('BLOKIR') || aksi.includes('GAGAL')) badgeColor = '#e94560';
                                        return `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f1f1f1;"><div><b style="font-size:0.75rem; color:${badgeColor};">[${aksi}]</b> <span style="font-size:0.9rem; color:#0A2342; margin-left:5px; font-weight:bold;">${log.target}</span><div style="font-size:0.75rem; color:#888; margin-top:2px;">${log.detail}</div></div><div style="font-size:0.8rem; color:#aaa; font-weight:bold;">${time}</div></div>`;
                                    }).join('');
                                }
                            }

                            const errList = document.getElementById('dash-error-list');
                            if(errList) {
                                if(window.superErrorData.length === 0) { 
                                    errList.innerHTML = `<div style="text-align:center; color:#198754; padding:20px; font-weight:bold;">✅ Sistem Sehat (0 Kerusakan)</div>`; 
                                } else {
                                    const top5Err = [...window.superErrorData].slice(0, 3);
                                    errList.innerHTML = top5Err.map(e => `
                                        <div style="padding:10px 0; border-bottom:1px dashed #f1f1f1;">
                                            <div style="display:flex; justify-content:space-between;">
                                                <b style="font-size:0.8rem; color:#e94560;">👤 ${e.id_pengguna}</b>
                                                <span style="font-size:0.7rem; color:#888;">${new Date(e.waktu).toLocaleTimeString('id-ID')}</span>
                                            </div>
                                            <div style="font-size:0.85rem; color:#0A2342; font-weight:bold; margin-top:3px;">${e.lokasi_sistem}</div>
                                            <div style="font-size:0.75rem; color:#666; margin-top:2px; line-height:1.2;">${e.pesan_error}</div>
                                        </div>
                                    `).join('');
                                }
                            }
                        }
                        renderAnalytics();
                    }
                } catch (e) { catatErrorSistem("Dashboard Analytics Parallel Fetch", e); }
            };
            loadDashboardData();
        }

        else if (target === 'pengumuman') {
            content.innerHTML = `
                <div class="super-card" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; border-left:4px solid #F1C40F;">
                    <div><h3 style="margin:0; color:#0A2342;">📢 Pusat Siaran (Broadcast)</h3><p style="margin:5px 0 0 0; color:#666; font-size:0.9rem;">Kirimkan pesan Pop-Up langsung ke layar HP seluruh Kader atau pengguna lainnya.</p></div>
                    <button id="btn-show-add-p" style="background:#0043A8; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 6px rgba(0, 67, 168, 0.3);">+ Buat Siaran Baru</button>
                </div>
                <div class="super-card" style="padding:0; overflow:hidden;">
                    <div style="background:#f8f9fa; padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size:0.85rem; color:#856404; font-weight:bold;">💡 Pengumuman aktif akan muncul sebagai Pop-Up setiap kali target masuk ke aplikasi.</div>
                        <div style="font-size:0.85rem; font-weight:bold; color:#0A2342; background:#F1C40F; padding:8px 12px; border-radius:6px;" id="lbl-count-p">0 Pengumuman</div>
                    </div>
                    <div id="table-wrapper-p" class="super-table-container"><div style="padding:50px; text-align:center; color:#0043A8;"><h3>⏳ Menyedot Riwayat Siaran...</h3></div></div>
                </div>

                <div id="modal-add-p" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;">
                    <div style="background:white; padding:30px; border-radius:10px; width:90%; max-width:600px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                        <h3 style="margin:top:0; color:#0A2342; border-bottom:2px solid #F1C40F; padding-bottom:10px;">📢 Buat Siaran Pengumuman Baru</h3>
                        <div style="margin-bottom:15px;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Judul Pengumuman</label><input type="text" id="p-judul" class="filter-input" placeholder="Cth: MAINTENANCE SERVER" style="width:100%; box-sizing:border-box;" required></div>
                        <div style="margin-bottom:15px;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Target Penerima (Role)</label><select id="p-target" class="filter-input" style="width:100%; box-sizing:border-box;"><option value="SEMUA">Semua Pengguna (Kader, PKB, dll)</option><option value="KADER">Hanya Kader Lapangan</option><option value="PKB">Hanya Penyuluh KB (PKB)</option></select></div>
                        <div style="margin-bottom:20px;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Isi Pesan Lengkap</label><textarea id="p-isi" class="filter-input" rows="4" placeholder="Ketik instruksi atau pengumuman di sini..." style="width:100%; box-sizing:border-box;" required></textarea></div>
                        <div style="display:flex; justify-content:flex-end; gap:10px;"><button type="button" id="btn-close-p" style="padding:10px 20px; border:none; background:#eee; color:#333; border-radius:5px; cursor:pointer; font-weight:bold;">Batal</button><button type="button" id="btn-submit-p" style="padding:10px 20px; border:none; background:#0043A8; color:white; border-radius:5px; cursor:pointer; font-weight:bold;">Siarkan Sekarang 🚀</button></div>
                    </div>
                </div>
            `;
            
            try {
                const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_PENGUMUMAN' }) });
                const res = await response.json();
                if(res.status === 'success') {
                    window.superPengumumanData = res.data || [];
                    window.renderPengumumanTable();
                    
                    const modalP = document.getElementById('modal-add-p');
                    document.getElementById('btn-show-add-p').onclick = () => { document.getElementById('p-judul').value = ''; document.getElementById('p-isi').value = ''; document.getElementById('p-target').value = 'SEMUA'; modalP.style.display = 'flex'; };
                    document.getElementById('btn-close-p').onclick = () => modalP.style.display = 'none';
                    document.getElementById('btn-submit-p').onclick = async () => {
                        const judul = document.getElementById('p-judul').value.trim(); const isi = document.getElementById('p-isi').value.trim(); const target = document.getElementById('p-target').value;
                        if(!judul || !isi) { alert("Judul dan isi tidak boleh kosong!"); return; }
                        
                        const btnSubmit = document.getElementById('btn-submit-p'); btnSubmit.innerText = "Menyiarkan..."; btnSubmit.disabled = true;
                        const newId = `INFO-${Date.now()}`;
                        const payloadData = { id_pengumuman: newId, tanggal: new Date().toISOString(), judul: judul, isi_pesan: isi, target_role: target, is_active: 'Y' };
                        
                        try {
                            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_ADD_PENGUMUMAN', token: SUPER_TOKEN, data: payloadData }) }); const res = await response.json();
                            if(res.status === 'success') { alert("✅ Pengumuman berhasil disiarkan!"); modalP.style.display = 'none'; window.renderSuperView('pengumuman'); } else { alert("❌ Gagal: " + res.message); }
                        } catch(e) { alert("❌ Kesalahan Jaringan."); } finally { btnSubmit.innerText = "Siarkan Sekarang 🚀"; btnSubmit.disabled = false; }
                    };
                } else { document.getElementById('table-wrapper-p').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Mengunduh Data</h3></div>`; }
            } catch(e) { document.getElementById('table-wrapper-p').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Kesalahan Jaringan</h3></div>`; }
        }

        else if (target === 'user_management') {
            content.innerHTML = `
                <div class="super-card" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; border-left:4px solid #F1C40F;">
                    <div><h3 style="margin:0; color:#0A2342;">Database Pengguna Aktif</h3><p style="margin:5px 0 0 0; color:#666; font-size:0.9rem;">Menampilkan data langsung dari Google Sheet melalui Secure API.</p></div>
                    <button id="btn-show-add" style="background:#0043A8; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 6px rgba(0, 67, 168, 0.3);">+ Tambah Pengguna</button>
                </div>
                
                <div class="super-card" style="padding:0; overflow:hidden;">
                    <div style="background:#f8f9fa; padding:15px; border-bottom:1px solid #eee; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                        <div style="position: relative; flex: 1; min-width: 200px;"><input type="text" id="flt-search" class="filter-input" placeholder="🔍 Cari ID/Nama/Desa/Tim..." style="width: 100%; padding-right: 35px; box-sizing: border-box;"><button id="btn-clear-search" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 1.3rem; font-weight: bold; color: #aaa; cursor: pointer; display: none; padding: 0;" title="Bersihkan Pencarian">×</button></div>
                        <select id="flt-role" class="filter-input"><option value="ALL">📋 Semua Role</option><option value="KADER">KADER</option><option value="ADMIN_DESA">ADMIN DESA</option><option value="PKB">PKB / Penyuluh</option><option value="ADMIN_KECAMATAN">ADMIN KECAMATAN</option><option value="ADMIN_KABUPATEN">ADMIN KABUPATEN</option><option value="MITRA">MITRA KERJA</option></select>
                        <select id="flt-kec" class="filter-input"><option value="ALL">🌍 Semua Wilayah</option></select>
                        <div style="font-size:0.85rem; font-weight:bold; color:#0A2342; background:#F1C40F; padding:8px 12px; border-radius:6px;" id="lbl-count">0 Pengguna</div>
                    </div>
                    <div style="background:#fff3cd; padding:10px 15px; border-bottom:1px solid #ffeeba; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.85rem; color:#856404; font-weight:bold;">⚠️ AKSI MASSAL:</span>
                        <div style="display:flex; gap:8px;"><button class="btn-mass" style="background:#e94560;" onclick="window.superBulkAction('BLOKIR')">🛑 Blokir Terpilih</button><button class="btn-mass" style="background:#198754;" onclick="window.superBulkAction('AKTIFKAN')">🟢 Aktifkan Terpilih</button><button class="btn-mass" style="background:#F1C40F; color:#0A2342;" onclick="window.superBulkAction('RESETPIN')">🔑 Reset PIN Terpilih</button></div>
                    </div>
                    <div id="table-wrapper" class="super-table-container"><div style="padding:50px; text-align:center; color:#0043A8;"><h3 style="margin:0;">⏳ Menghubungi Server & Mapping Data...</h3></div></div>
                </div>

                <div id="modal-add-user" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;">
                    <div style="background:white; padding:30px; border-radius:10px; width:90%; max-width:550px; max-height:90vh; overflow-y:auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                        <h3 style="margin-top:0; color:#0A2342; border-bottom:2px solid #F1C40F; padding-bottom:10px;">➕ Tambah Pengguna Baru</h3>
                        <div style="margin-bottom:15px;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">ID Pengguna / Kunci Masuk</label><input type="text" id="add-id" class="filter-input" placeholder="Cth: TPK9999 / PKB001 / MITRA001" style="width:100%; box-sizing:border-box;" required></div>
                        <div style="margin-bottom:15px;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Nama Lengkap Pengguna</label><input type="text" id="add-nama" class="filter-input" placeholder="Nama Asli" style="width:100%; box-sizing:border-box;" required></div>
                        <div style="display:flex; gap:10px; margin-bottom:15px;">
                            <div style="flex:1;">
                                <label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Role Akses</label>
                                <select id="add-role" class="filter-input" style="width:100%; box-sizing:border-box;">
                                    <option value="KADER">KADER TPK</option>
                                    <option value="ADMIN_DESA" style="color:#16a085; font-weight:bold;">ADMIN DESA / KELURAHAN</option>
                                    <option value="PKB" style="color:#6f42c1; font-weight:bold;">PKB (Penyuluh KB)</option>
                                    <option value="ADMIN_KECAMATAN">ADMIN KECAMATAN</option>
                                    <option value="ADMIN_KABUPATEN">ADMIN KABUPATEN</option>
                                    <option value="MITRA" style="color:#e67e22; font-weight:bold;">MITRA KERJA</option>
                                </select>
                            </div>
                            <div style="flex:1;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Cakupan Wilayah</label><select id="add-kec" class="filter-input" style="width:100%; box-sizing:border-box;"><option value="GEROKGAK">GEROKGAK</option><option value="SERIRIT">SERIRIT</option><option value="BUSUNGBIU">BUSUNGBIU</option><option value="BANJAR">BANJAR</option><option value="BULELENG">BULELENG</option><option value="SUKASADA">SUKASADA</option><option value="SAWAN">SAWAN</option><option value="KUBUTAMBAHAN">KUBUTAMBAHAN</option><option value="TEJAKULA">TEJAKULA</option><option value="ALL">ALL</option></select></div>
                        </div>
                        <div id="panel-kader-area" style="display:block; background:#e8f4fd; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #b6d4fe;">
                            <p id="lbl-penempatan" style="margin:0 0 10px 0; font-size:0.85rem; font-weight:bold; color:#0043A8;">📍 Penempatan Tugas</p>
                            <label id="lbl-desa-1" style="display:block; font-size:0.8rem; color:#666; margin-bottom:5px;">1. Pilih Desa / Kelurahan</label><select id="add-desa" class="filter-input" style="width:100%; box-sizing:border-box; margin-bottom:10px;"><option value="">-- Pilih Desa --</option></select>
                            <div id="box-desa-pkb" style="display:none;">
                                <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:5px;">2. Pilih Desa / Kelurahan Binaan 2 <span style="color:red; font-weight:bold;">(Wajib)</span></label><select id="add-desa-2" class="filter-input" style="width:100%; box-sizing:border-box; margin-bottom:10px;"><option value="">-- Pilih Desa --</option></select>
                                <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:5px;">3. Pilih Desa / Kelurahan Binaan 3 (Opsional)</label><select id="add-desa-3" class="filter-input" style="width:100%; box-sizing:border-box; margin-bottom:10px;"><option value="">-- Pilih Desa --</option></select>
                                <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:5px;">4. Pilih Desa / Kelurahan Binaan 4 (Opsional)</label><select id="add-desa-4" class="filter-input" style="width:100%; box-sizing:border-box; margin-bottom:10px;"><option value="">-- Pilih Desa --</option></select>
                                <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:5px;">5. Pilih Desa / Kelurahan Binaan 5 (Opsional)</label><select id="add-desa-5" class="filter-input" style="width:100%; box-sizing:border-box; margin-bottom:10px;"><option value="">-- Pilih Desa --</option></select>
                            </div>
                            <div id="box-add-tim">
                                <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:5px;">2. Pilih Tim / Dusun</label><select id="add-tim" class="filter-input" style="width:100%; box-sizing:border-box;"><option value="">-- Pilih Tim / Dusun --</option></select>
                                <div style="font-size:0.7rem; color:#888; margin-top:5px; font-style:italic;">*Sistem otomatis membuat profil ini di Database Master.</div>
                            </div>
                        </div>
                        <div style="margin-bottom:25px;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">PIN / Password Awal</label><input type="text" id="add-pin" class="filter-input" placeholder="Minimal 5 karakter" style="width:100%; box-sizing:border-box;" required></div>
                        <div style="display:flex; justify-content:flex-end; gap:10px;"><button type="button" id="btn-close-add" style="padding:10px 20px; border:none; background:#eee; color:#333; border-radius:5px; cursor:pointer; font-weight:bold;">Batal</button><button type="button" id="btn-submit-add" style="padding:10px 20px; border:none; background:#0043A8; color:white; border-radius:5px; cursor:pointer; font-weight:bold;">Simpan ke Server</button></div>
                    </div>
                </div>
            `;
            try {
                let kaderData = await getAllData('master_kader').catch(()=>[]); let timData = await getAllData('master_tim').catch(()=>[]); let pkbData = await getAllData('master_pkb').catch(()=>[]);
                
                if (kaderData.length === 0 || timData.length === 0) {
                    const wrp = document.getElementById('table-wrapper');
                    if(wrp) wrp.innerHTML = `<div style="padding:50px; text-align:center; color:#0043A8;"><h3 style="margin:0;">📥 Mengunduh Peta Wilayah...</h3><p>Menyelaraskan data dari Server Google.</p></div>`;
                    try {
                        const [resK, resT, resP] = await Promise.all([
                            fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_KADER' }) }).then(r => r.json()),
                            fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_TIM' }) }).then(r => r.json()),
                            fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_PKB' }) }).then(r => r.json())
                        ]);
                        if(resK.status === 'success') kaderData = resK.data || [];
                        if(resT.status === 'success') timData = resT.data || [];
                        if(resP.status === 'success') pkbData = resP.data || [];
                    } catch(e) { catatErrorSistem('Fetch Master Mapping', e); }
                }

                window.superTimData = timData || [];
                const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'USER_LOGIN' }) });
                const res = await response.json();
                
                if (res.status === 'success') {
                    window.superUsersData = res.data.map(u => {
                        let nTim = '-'; let nDesa = String(u.scope_desa || u.desa_kelurahan || u.desa || u.wilayah_desa || '-').toUpperCase(); const role = String(u.role_akses || u.role || 'KADER').toUpperCase(); const refId = u.ref_id || u.id_pengguna || u.id_user || u.username;
                        if (role.includes('KADER')) { const k = kaderData.find(kd => String(kd.id_kader) === String(refId) || String(kd.nik) === String(refId)); if (k) { const idTim = k.id_tim || k.tim; const t = timData.find(td => String(td.id_tim) === String(idTim) || String(td.id) === String(idTim)); if (t) { nTim = String(t.nomor_tim || t.nama_tim || idTim); let d = t.desa_kelurahan || t.desa || k.desa_kelurahan || k.desa || nDesa; nDesa = String(d).toUpperCase(); } } }
                        if (role.includes('PKB')) { const p = pkbData.find(pk => String(pk.id_pkb) === String(refId) || String(pk.nip_pkb) === String(refId)); if (p) { nDesa = String(p.desa_kelurahan || p.desa || nDesa).toUpperCase(); } }
                        if (nDesa === 'UNDEFINED' || nDesa === '') nDesa = '-'; u._nomor_tim = nTim; u._desa = nDesa; return u;
                    });
                    
                    const kecSet = new Set(); window.superUsersData.forEach(u => { const k = String(u.scope_kecamatan || u.kecamatan || u.wilayah || '').toUpperCase().trim(); if(k && k !== 'ALL' && k !== 'SEMUA' && k !== '-') kecSet.add(k); });
                    const selectKec = document.getElementById('flt-kec');
                    
                    if(selectKec){ 
                        Array.from(kecSet).sort().forEach(k => { const opt = document.createElement('option'); opt.value = k; opt.innerText = k; selectKec.appendChild(opt); });
                    }
                    
                    const searchInput = document.getElementById('flt-search'); const clearBtn = document.getElementById('btn-clear-search');
                    window.renderUserTable(); 
                    
                    if(searchInput) {
                        searchInput.addEventListener('input', () => { clearBtn.style.display = searchInput.value ? 'block' : 'none'; window.renderUserTable(); }); 
                        clearBtn.addEventListener('click', () => { searchInput.value = ''; clearBtn.style.display = 'none'; searchInput.focus(); window.renderUserTable(); }); 
                    }
                    
                    const fltRole = document.getElementById('flt-role'); if(fltRole) fltRole.addEventListener('change', window.renderUserTable); 
                    if(selectKec) selectKec.addEventListener('change', window.renderUserTable);

                    const modalAdd = document.getElementById('modal-add-user'); const roleSelect = document.getElementById('add-role'); const formKecSelect = document.getElementById('add-kec'); const panelKader = document.getElementById('panel-kader-area'); const formDesaSelect = document.getElementById('add-desa'); const timSelect = document.getElementById('add-tim');
                    document.getElementById('btn-show-add').onclick = () => { if(roleSelect.value === 'KADER') populateDesaDropdown(); modalAdd.style.display = 'flex'; }; document.getElementById('btn-close-add').onclick = () => modalAdd.style.display = 'none';
                    const populateDesaDropdown = () => {
                        const selectedKec = formKecSelect.value; const defOpt = '<option value="">-- Pilih Desa / Kelurahan --</option>';
                        formDesaSelect.innerHTML = defOpt; document.getElementById('add-desa-2').innerHTML = defOpt; document.getElementById('add-desa-3').innerHTML = defOpt; document.getElementById('add-desa-4').innerHTML = defOpt; document.getElementById('add-desa-5').innerHTML = defOpt;
                        timSelect.innerHTML = '<option value="">-- Pilih Tim / Dusun --</option>'; 
                        if (!selectedKec || selectedKec === 'ALL') return; 
                        const desaSet = new Set();
                        window.superTimData.forEach(t => { const k = String(t.kecamatan || t.wilayah || '').toUpperCase(); if (k === selectedKec) { const d = String(t.desa_kelurahan || t.desa || '').toUpperCase(); if (d && d !== 'UNDEFINED' && d !== '-') desaSet.add(d); } }); 
                        Array.from(desaSet).sort().forEach(d => { const opt = `<option value="${d}">${d}</option>`; formDesaSelect.innerHTML += opt; document.getElementById('add-desa-2').innerHTML += opt; document.getElementById('add-desa-3').innerHTML += opt; document.getElementById('add-desa-4').innerHTML += opt; document.getElementById('add-desa-5').innerHTML += opt; });
                    };
                    const populateTimDropdown = () => {
                        const selectedKec = formKecSelect.value; const selectedDesa = formDesaSelect.value; timSelect.innerHTML = '<option value="">-- Pilih Tim / Dusun --</option>'; if (!selectedDesa) return;
                        const filteredTim = window.superTimData.filter(t => { const k = String(t.kecamatan || t.wilayah || '').toUpperCase(); const d = String(t.desa_kelurahan || t.desa || '').toUpperCase(); return k === selectedKec && d === selectedDesa; }); filteredTim.sort((a,b) => String(a.nama_tim || a.nomor_tim).localeCompare(String(b.nama_tim || b.nomor_tim))); filteredTim.forEach(t => { const idTim = t.id_tim || t.id; const namaTim = t.nama_tim || t.nomor_tim || idTim; const dusun = t.dusun_rw || t.dusun || '-'; const label = `${namaTim} (Dusun: ${dusun})`; const opt = document.createElement('option'); opt.value = idTim; opt.setAttribute('data-desa', selectedDesa); opt.setAttribute('data-dusun', dusun); opt.innerText = label; timSelect.appendChild(opt); });
                    };
                    roleSelect.addEventListener('change', () => { 
                        const boxPkb = document.getElementById('box-desa-pkb'); const lblDesa1 = document.getElementById('lbl-desa-1');
                        if (roleSelect.value === 'ADMIN_KABUPATEN') { formKecSelect.value = 'ALL'; formKecSelect.style.backgroundColor = '#e9ecef'; formKecSelect.style.pointerEvents = 'none'; panelKader.style.display = 'none'; } 
                        else if (roleSelect.value === 'ADMIN_KECAMATAN' || roleSelect.value === 'MITRA') { formKecSelect.style.backgroundColor = 'white'; formKecSelect.style.pointerEvents = 'auto'; if(formKecSelect.value === 'ALL' && roleSelect.value === 'ADMIN_KECAMATAN') formKecSelect.value = 'GEROKGAK'; panelKader.style.display = 'none'; } 
                        else if (roleSelect.value === 'ADMIN_DESA') { formKecSelect.style.backgroundColor = 'white'; formKecSelect.style.pointerEvents = 'auto'; if(formKecSelect.value === 'ALL') formKecSelect.value = 'GEROKGAK'; panelKader.style.display = 'block'; document.getElementById('box-add-tim').style.display = 'none'; boxPkb.style.display = 'none'; document.getElementById('lbl-penempatan').innerHTML = "📍 Wilayah Admin Desa"; lblDesa1.innerHTML = "1. Pilih Desa / Kelurahan <span style='color:red; font-weight:bold;'>(Wajib)</span>"; populateDesaDropdown(); } 
                        else if (roleSelect.value === 'PKB') { formKecSelect.style.backgroundColor = 'white'; formKecSelect.style.pointerEvents = 'auto'; if(formKecSelect.value === 'ALL') formKecSelect.value = 'GEROKGAK'; panelKader.style.display = 'block'; document.getElementById('box-add-tim').style.display = 'none'; boxPkb.style.display = 'block'; document.getElementById('lbl-penempatan').innerHTML = "📍 Wilayah Binaan PKB"; lblDesa1.innerHTML = "1. Pilih Desa / Kelurahan Binaan 1 <span style='color:red; font-weight:bold;'>(Wajib)</span>"; populateDesaDropdown(); } 
                        else { formKecSelect.style.backgroundColor = 'white'; formKecSelect.style.pointerEvents = 'auto'; if(formKecSelect.value === 'ALL') formKecSelect.value = 'GEROKGAK'; panelKader.style.display = 'block'; document.getElementById('box-add-tim').style.display = 'block'; boxPkb.style.display = 'none'; document.getElementById('lbl-penempatan').innerHTML = "📍 Penempatan Tugas Kader"; lblDesa1.innerHTML = "1. Pilih Desa / Kelurahan"; populateDesaDropdown(); } 
                    }); 
                    formKecSelect.addEventListener('change', () => { if(roleSelect.value === 'KADER' || roleSelect.value === 'PKB' || roleSelect.value === 'ADMIN_DESA') populateDesaDropdown(); }); formDesaSelect.addEventListener('change', populateTimDropdown);
                    document.getElementById('btn-submit-add').onclick = async () => {
                        const id = document.getElementById('add-id').value.trim(); const nama = document.getElementById('add-nama').value.trim(); const role = document.getElementById('add-role').value; const kec = document.getElementById('add-kec').value.trim().toUpperCase(); const pin = document.getElementById('add-pin').value.trim();
                        if(!id || !nama || !kec || !pin) { alert("⚠️ Mohon isi semua kolom dasar!"); return; } 
                        let payloadKader = null; let finalDesa = '';
                        if (role === 'KADER') { if(!formDesaSelect.value || !timSelect.value) { alert("⚠️ Mohon lengkapi pilihan Desa dan Tim penugasan kader!"); return; } finalDesa = formDesaSelect.value; const selectedOpt = timSelect.options[timSelect.selectedIndex]; payloadKader = { id_kader: id, nik: id, id_pengguna: id, nama: nama, nama_kader: nama, nama_lengkap: nama, id_tim: timSelect.value, tim: timSelect.value, desa: selectedOpt.getAttribute('data-desa'), desa_kelurahan: selectedOpt.getAttribute('data-desa'), dusun: selectedOpt.getAttribute('data-dusun'), dusun_rw: selectedOpt.getAttribute('data-dusun') }; }
                        else if (role === 'ADMIN_DESA') { if(!formDesaSelect.value) { alert("⚠️ Mohon pilih Desa/Kelurahan!"); return; } finalDesa = formDesaSelect.value; }
                        else if (role === 'PKB') { const d1 = formDesaSelect.value; const d2 = document.getElementById('add-desa-2').value; const d3 = document.getElementById('add-desa-3').value; const d4 = document.getElementById('add-desa-4').value; const d5 = document.getElementById('add-desa-5').value; if(!d1 || !d2) { alert("⚠️ Mohon lengkapi minimal Desa Binaan 1 dan 2 untuk PKB!"); return; } const arrDesa = [d1, d2, d3, d4, d5].filter(Boolean); finalDesa = [...new Set(arrDesa)].join(', '); }
                        const btnSubmit = document.getElementById('btn-submit-add'); btnSubmit.innerText = "Menyimpan & Sinkronisasi..."; btnSubmit.disabled = true;
                        const payloadData = { id_user: id, id_pengguna: id, username: id, nama: nama, nama_lengkap: nama, role_akses: role, role: role, scope_kecamatan: kec, kecamatan: kec, scope_desa: finalDesa, password: pin, password_awal_ref: pin, pin: pin, status_akun: 'AKTIF', status: 'AKTIF', ref_type: role, ref_id: id };
                        try { const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_ADD_USER', token: SUPER_TOKEN, data: payloadData, data_kader: payloadKader }) }); const res = await response.json(); if(res.status === 'success') { alert("✅ Pengguna berhasil ditambahkan!"); document.getElementById('modal-add-user').style.display = 'none'; document.getElementById('table-wrapper').innerHTML = `<div style="padding:50px; text-align:center; color:#0043A8;"><h3>🔄 MENYINKRONKAN DATABASE...</h3><p>Memuat data terbaru dari Google Server.</p></div>`; await clearStore('master_kader'); await clearStore('master_tim'); setTimeout(() => { window.renderSuperView('user_management'); }, 1000); } else { alert("❌ Gagal menyimpan: " + res.message); } } catch(e) { catatErrorSistem('Simpan User Baru', e); alert("❌ Kesalahan Jaringan."); } finally { btnSubmit.innerText = "Simpan ke Server"; btnSubmit.disabled = false; }
                    };
                } else { 
                    const wrp = document.getElementById('table-wrapper');
                    if(wrp) wrp.innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Akses Ditolak</h3><p>${res.message}</p></div>`; 
                }
            } catch (error) { 
                catatErrorSistem('Menu Manajemen Pengguna', error); 
                const wrp = document.getElementById('table-wrapper');
                if(wrp) wrp.innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Terhubung</h3></div>`; 
            }
        }
        
        else if (target === 'kuesioner') { 
            content.innerHTML = `<div class="super-card" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; border-left:4px solid #F1C40F;"><div><h3 style="margin:0; color:#0A2342;">Pabrik Kuesioner Dinamis</h3><p style="margin:5px 0 0 0; color:#666; font-size:0.9rem;">Ubah form di sini, dan form di HP seluruh kader akan berubah otomatis.</p></div><button id="btn-show-add-q" style="background:#0043A8; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 6px rgba(0, 67, 168, 0.3);">+ Tambah Pertanyaan</button></div><div class="super-card" style="padding:0; overflow:hidden;"><div style="background:#f8f9fa; padding:15px; border-bottom:1px solid #eee; display:flex; gap:10px; flex-wrap:wrap; align-items:center;"><strong style="color:#0A2342;">Filter Sasaran:</strong><select id="flt-kategori-q" class="filter-input" style="min-width:200px;"><option value="ALL">📋 Semua Formulir</option><option value="CATIN">👰 Formulir CATIN</option><option value="BUMIL">🤰 Formulir IBU HAMIL</option><option value="BUFAS">🤱 Formulir IBU NIFAS</option><option value="BADUTA">👶 Formulir BADUTA</option><option value="UMUM">🏘️ Formulir UMUM / LINGKUNGAN</option></select><div style="font-size:0.85rem; font-weight:bold; color:#0A2342; background:#F1C40F; padding:8px 12px; border-radius:6px;" id="lbl-count-q">0 Pertanyaan</div></div><div id="table-wrapper-q" class="super-table-container"><div style="padding:50px; text-align:center; color:#0043A8;"><h3>⏳ Menyedot Kuesioner dari Server...</h3></div></div></div><div id="modal-add-q" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;"><div style="background:white; padding:30px; border-radius:10px; width:90%; max-width:600px; max-height:90vh; overflow-y:auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2);"><h3 style="margin:top:0; color:#0A2342; border-bottom:2px solid #F1C40F; padding-bottom:10px;">➕ Rakit Pertanyaan Baru</h3><div style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:15px; border: 1px solid #e1e8ed;"><p style="margin:0 0 10px 0; font-size:0.85rem; font-weight:bold; color:#0043A8;">1. Tentukan Posisi Pertanyaan (Penempatan)</p><div style="display:flex; gap:10px; margin-bottom:10px;"><div style="flex:1;"><label style="display:block; font-size:0.8rem; font-weight:bold; margin-bottom:5px;">Modul (Fase)</label><select id="q-modul" class="filter-input" style="width:100%; box-sizing:border-box;"><option value="REGISTRASI">REGISTRASI (Pendataan Awal)</option><option value="PENDAMPINGAN">PENDAMPINGAN (Kunjungan Rutin)</option></select></div><div style="flex:1;"><label style="display:block; font-size:0.8rem; font-weight:bold; margin-bottom:5px;">Jenis Sasaran</label><select id="q-kat" class="filter-input" style="width:100%; box-sizing:border-box;"><option value="BUMIL">IBU HAMIL</option><option value="CATIN">CATIN</option><option value="BUFAS">IBU NIFAS</option><option value="BADUTA">BADUTA</option><option value="UMUM">UMUM / KELUARGA</option></select></div></div><div style="display:flex; gap:10px;"><div style="flex:2;"><label style="display:block; font-size:0.8rem; font-weight:bold; margin-bottom:5px;">Grup (Judul Kelompok)</label><input type="text" id="q-grup" class="filter-input" placeholder="Cth: Antropometri" style="width:100%; box-sizing:border-box;" required></div><div style="flex:1;"><label style="display:block; font-size:0.8rem; font-weight:bold; margin-bottom:5px;">Urutan Tampil Grup</label><input type="number" id="q-urut-grup" class="filter-input" placeholder="Angka: 1, 2.." style="width:100%; box-sizing:border-box;" required></div></div></div><div style="margin-bottom:15px;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">2. Teks Pertanyaan Lengkap</label><textarea id="q-teks" class="filter-input" rows="2" placeholder="Cth: Apakah ibu rutin meminum tablet tambah darah?" style="width:100%; box-sizing:border-box;" required></textarea></div><div style="display:flex; gap:10px; margin-bottom:15px;"><div style="flex:1;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">3. Tipe Input Sistem</label><select id="q-tipe" class="filter-input" style="width:100%; box-sizing:border-box;"><option value="select">PILIHAN (Dropdown/Radio)</option><option value="text">TEKS BEBAS (Huruf)</option><option value="number">ANGKA (Kalkulator Stunting)</option><option value="date">TANGGAL (Kalender)</option></select></div><div style="flex:1;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Sifat Jawaban</label><select id="q-wajib" class="filter-input" style="width:100%; box-sizing:border-box;"><option value="Y">Wajib Diisi (*)</option><option value="N">Opsional (Boleh Kosong)</option></select></div></div><div id="panel-opsi" style="display:block; background:#fff3cd; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #ffeeba;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px; color:#856404;">Pilihan Jawaban (Pisahkan dengan Koma)</label><input type="text" id="q-opsi" class="filter-input" placeholder="Cth: Ya, Tidak, Kadang-kadang" style="width:100%; box-sizing:border-box;"></div><div style="background:#fdf3e8; padding:15px; border-radius:8px; margin-bottom:20px; border: 1px dashed #e67e22;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px; color:#d35400;">4. Logika Percabangan (Opsional)</label><input type="text" id="q-kondisi" class="filter-input" placeholder="Cth: Q-PEN-BDT-1234=Ya" style="width:100%; box-sizing:border-box;"><div style="font-size:0.75rem; color:#888; margin-top:5px;">*Format: <b>ID_PERTANYAAN_INDUK=JAWABAN</b>.<br>Kosongkan jika selalu tampil.</div></div><div style="display:flex; justify-content:flex-end; gap:10px;"><button type="button" id="btn-close-q" style="padding:10px 20px; border:none; background:#eee; color:#333; border-radius:5px; cursor:pointer; font-weight:bold;">Batal</button><button type="button" id="btn-submit-q" style="padding:10px 20px; border:none; background:#0043A8; color:white; border-radius:5px; cursor:pointer; font-weight:bold;">Simpan ke Server</button></div></div></div>`;
            try {
                const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_PERTANYAAN' }) }); const res = await response.json();
                if (res.status === 'success') { window.superKuesionerData = res.data; window.renderKuesionerTable(); document.getElementById('flt-kategori-q').addEventListener('change', window.renderKuesionerTable); const modalQ = document.getElementById('modal-add-q'); const tipeSelect = document.getElementById('q-tipe'); const panelOpsi = document.getElementById('panel-opsi'); document.getElementById('btn-show-add-q').onclick = () => { modalQ.style.display = 'flex'; }; document.getElementById('btn-close-q').onclick = () => modalQ.style.display = 'none'; tipeSelect.addEventListener('change', () => { panelOpsi.style.display = tipeSelect.value === 'select' ? 'block' : 'none'; }); document.getElementById('btn-submit-q').onclick = async () => { const modul = document.getElementById('q-modul').value; const kat = document.getElementById('q-kat').value; const grup = document.getElementById('q-grup').value.trim(); const urutGrup = document.getElementById('q-urut-grup').value; const teks = document.getElementById('q-teks').value.trim(); const tipe = document.getElementById('q-tipe').value; const wajib = document.getElementById('q-wajib').value; const opsiRaw = tipe === 'select' ? document.getElementById('q-opsi').value.trim() : ''; const kondisiRaw = document.getElementById('q-kondisi').value.trim(); if(!grup || !urutGrup) { alert("⚠️ Grup Pertanyaan dan Angka Urutannya harus diisi!"); return; } if(!teks) { alert("⚠️ Teks Pertanyaan tidak boleh kosong!"); return; } if(tipe === 'select' && !opsiRaw) { alert("⚠️ Karena tipenya PILIHAN, Anda harus memasukkan opsi jawabannya!"); return; } const btnSubmit = document.getElementById('btn-submit-q'); btnSubmit.innerText = "Menembak ke Server..."; btnSubmit.disabled = true; let jsonOpsi = ''; if (tipe === 'select' && opsiRaw) { const arrOpsi = opsiRaw.split(',').map(item => item.trim()).filter(item => item !== ''); jsonOpsi = JSON.stringify(arrOpsi); } const prefix = modul === 'REGISTRASI' ? 'Q-REG' : 'Q-PEN'; const mid = kat === 'BUMIL' ? 'BML' : (kat === 'CATIN' ? 'CTN' : (kat === 'BUFAS' ? 'BFS' : (kat === 'BADUTA' ? 'BDT' : 'UMM'))); const newId = `${prefix}-${mid}-${Date.now().toString().slice(-4)}`; const payloadQ = { id_pertanyaan: newId, modul: modul, jenis_sasaran: kat, grup_pertanyaan: grup, urutan_grup: urutGrup, label_pertanyaan: teks, tipe_input: tipe, opsi_json: jsonOpsi, is_required: wajib, is_active: 'Y', kondisi_tampil: kondisiRaw }; try { const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_ADD_QUESTION', token: SUPER_TOKEN, data: payloadQ }) }); const res = await response.json(); if(res.status === 'success') { alert("✅ Kuesioner Percabangan berhasil mengudara!"); modalQ.style.display = 'none'; document.getElementById('table-wrapper-q').innerHTML = `<div style="padding:50px; text-align:center; color:#0984e3;"><h3>🔄 MENYINKRONKAN KUESIONER...</h3></div>`; await clearStore('master_pertanyaan'); setTimeout(() => { window.renderSuperView('kuesioner'); }, 1000); } else { alert("❌ Gagal menyimpan: " + res.message); } } catch(e) { catatErrorSistem('Simpan Kuesioner', e); alert("❌ Kesalahan Jaringan."); } finally { btnSubmit.innerText = "Simpan ke Server"; btnSubmit.disabled = false; } }; } else { document.getElementById('table-wrapper-q').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Membaca Kuesioner</h3><p>${res.message}</p></div>`; }
            } catch (error) { catatErrorSistem('Menu Kuesioner', error); document.getElementById('table-wrapper-q').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Terhubung</h3></div>`; }
        }
        
        else if (target === 'menu_management') { 
            content.innerHTML = `<div class="super-card" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; border-left:4px solid #F1C40F;"><div><h3 style="margin:0; color:#0A2342;">Pabrik Menu (Hak Akses)</h3><p style="margin:5px 0 0 0; color:#666; font-size:0.9rem;">Buat, atur urutan, dan tentukan siapa yang boleh melihat menu ini.</p></div><button id="btn-show-add-m" style="background:#0043A8; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 6px rgba(0, 67, 168, 0.3);">+ Tambah Menu Baru</button></div><div class="super-card" style="padding:0; overflow:hidden;"><div style="background:#f8f9fa; padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;"><div style="font-size:0.85rem; color:#856404; font-weight:bold;">💡 Menu akan muncul secara otomatis di layar target berdasarkan hak aksesnya.</div><div style="font-size:0.85rem; font-weight:bold; color:#0A2342; background:#F1C40F; padding:8px 12px; border-radius:6px;" id="lbl-count-m">0 Menu</div></div><div id="table-wrapper-m" class="super-table-container"><div style="padding:50px; text-align:center; color:#0043A8;"><h3>⏳ Menyedot Data Menu...</h3></div></div></div><div id="modal-add-m" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;"><div style="background:white; padding:30px; border-radius:10px; width:90%; max-width:650px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);"><h3 id="modal-m-title" style="margin-top:0; color:#0A2342; border-bottom:2px solid #F1C40F; padding-bottom:10px;">➕ Buat Menu Navigasi Baru</h3><div style="display:flex; gap:15px; margin-bottom:15px;"><div style="flex:1; position:relative;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Icon (Pilih)</label><input type="text" id="m-icon" class="filter-input" placeholder="Klik 👉" style="width:100%; box-sizing:border-box; cursor:pointer; text-align:center; font-size:1.2rem;" readonly required><div id="emoji-picker" style="display:none; position:absolute; top:100%; left:0; background:white; border:1px solid #ddd; border-radius:8px; padding:10px; width:220px; grid-template-columns:repeat(6, 1fr); gap:5px; z-index:10; box-shadow:0 5px 15px rgba(0,0,0,0.2);"></div></div><div style="flex:4;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Nama Menu (Label)</label><input type="text" id="m-label" class="filter-input" placeholder="Cth: Rekap Bulanan" style="width:100%; box-sizing:border-box;" required></div></div><div style="display:flex; gap:15px; margin-bottom:15px; background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #eee;"><div style="flex:2;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px; color:#0043A8;">Target Aplikasi (Aksi)</label><select id="m-target-sel" class="filter-input" style="width:100%; box-sizing:border-box; margin-bottom:5px;"><option value="dashboard">🏠 Beranda (dashboard)</option><option value="registrasi">📝 Registrasi Sasaran (registrasi)</option><option value="daftar_sasaran">📋 Data Sasaran (daftar_sasaran)</option><option value="pendampingan">🤝 Pendampingan (pendampingan)</option><option value="rekap_bulanan">📊 Rekap Bulanan (rekap_bulanan)</option><option value="cetak_pdf">🖨️ Cetak PDF (cetak_pdf)</option><option value="bantuan">🆘 Bantuan (bantuan)</option><option value="setting">⚙️ Pengaturan (setting)</option><option value="reload_app">🔁 Muat Ulang (reload_app)</option><option value="CUSTOM" style="font-weight:bold; color:#e94560;">✨ Buat Halaman Kosong (Ketik Nama)</option></select><input type="text" id="m-target-custom" class="filter-input" placeholder="Cth: rekap_krs" style="width:100%; box-sizing:border-box; display:none; border-color:#e94560;"></div><div style="flex:2;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Menu Induk (Sub-Menu)</label><select id="m-parent" class="filter-input" style="width:100%; box-sizing:border-box;"><option value="">-- Bukan Sub-Menu --</option></select></div><div style="flex:1;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Urutan</label><input type="number" id="m-urut" class="filter-input" placeholder="1, 2.." style="width:100%; box-sizing:border-box;" required></div></div><div style="background:#e8f4fd; padding:15px; border-radius:8px; margin-bottom:20px; border:1px solid #b6d4fe;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:10px; color:#0043A8;">Hak Akses (Siapa yang boleh lihat?)</label><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:0.9rem;"><label><input type="checkbox" class="m-role-chk" value="KADER"> Kader Lapangan</label><label><input type="checkbox" class="m-role-chk" value="ADMIN_DESA"> Admin Desa/Kel.</label><label><input type="checkbox" class="m-role-chk" value="PKB"> Penyuluh KB</label><label><input type="checkbox" class="m-role-chk" value="ADMIN_KECAMATAN"> Admin Kecamatan</label><label><input type="checkbox" class="m-role-chk" value="ADMIN_KABUPATEN"> Admin Kabupaten</label><label><input type="checkbox" class="m-role-chk" value="MITRA"> Mitra Kerja</label></div></div><div style="display:flex; justify-content:flex-end; gap:10px;"><button type="button" id="btn-close-m" style="padding:10px 20px; border:none; background:#eee; color:#333; border-radius:5px; cursor:pointer; font-weight:bold;">Batal</button><button type="button" id="btn-submit-m" style="padding:10px 20px; border:none; background:#0043A8; color:white; border-radius:5px; cursor:pointer; font-weight:bold;">Simpan Menu</button></div></div></div>`;
            try {
                const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_MENU' }) }); const res = await response.json();
                if (res.status === 'success') { window.superMenuData = res.data; window.renderMenuTable(); const modalM = document.getElementById('modal-add-m'); const iconInput = document.getElementById('m-icon'); const picker = document.getElementById('emoji-picker'); picker.innerHTML = EMOJI_LIST.map(e => `<div class="emoji-item" onclick="document.getElementById('m-icon').value='${e}'; document.getElementById('emoji-picker').style.display='none';">${e}</div>`).join(''); iconInput.onclick = () => picker.style.display = picker.style.display === 'none' ? 'grid' : 'none'; const targetSel = document.getElementById('m-target-sel'); const targetCus = document.getElementById('m-target-custom'); targetSel.onchange = () => { if(targetSel.value === 'CUSTOM') { targetCus.style.display = 'block'; targetCus.required = true; } else { targetCus.style.display = 'none'; targetCus.required = false; } }; document.getElementById('btn-show-add-m').onclick = () => { window.currentEditMenuId = null; document.getElementById('modal-m-title').innerText = "➕ Buat Menu Navigasi Baru"; document.getElementById('btn-submit-m').innerText = "Simpan Menu"; iconInput.value = ''; document.getElementById('m-label').value = ''; targetSel.value = 'dashboard'; targetSel.dispatchEvent(new Event('change')); document.getElementById('m-urut').value = ''; document.querySelectorAll('.m-role-chk').forEach(cb => cb.checked = false); const parentSelect = document.getElementById('m-parent'); parentSelect.innerHTML = '<option value="">-- Bukan Sub-Menu --</option>'; window.superMenuData.forEach(m => { if (!m.parent_id || m.parent_id === '') { parentSelect.innerHTML += `<option value="${m.id_menu}">${m.icon || ''} ${m.label_menu}</option>`; } }); modalM.style.display = 'flex'; }; document.getElementById('btn-close-m').onclick = () => { modalM.style.display = 'none'; picker.style.display = 'none'; }; document.getElementById('btn-submit-m').onclick = async () => { const icon = iconInput.value.trim(); const label = document.getElementById('m-label').value.trim(); let targetView = targetSel.value === 'CUSTOM' ? targetCus.value.trim().toLowerCase() : targetSel.value; const parentId = document.getElementById('m-parent').value; const urut = document.getElementById('m-urut').value; const checkedRoles = Array.from(document.querySelectorAll('.m-role-chk:checked')).map(cb => cb.value); if(checkedRoles.length === 0) { alert("⚠️ Pilih minimal 1 Role Hak Akses!"); return; } const roleString = checkedRoles.join(','); if(!label || !targetView || !urut) { alert("⚠️ Mohon isi form dengan lengkap!"); return; } const btnSubmit = document.getElementById('btn-submit-m'); btnSubmit.innerText = "Menyimpan..."; btnSubmit.disabled = true; const isEdit = window.currentEditMenuId != null; const newId = isEdit ? window.currentEditMenuId : `MENU-${Date.now().toString().slice(-5)}`; const actionType = isEdit ? 'SECURE_EDIT_MENU_DATA' : 'SECURE_ADD_MENU'; const payloadM = { id_menu: newId, label_menu: label, icon: icon, target_view: targetView, parent_id: parentId, role_akses: roleString, urutan: urut, is_active: 'Y' }; if (isEdit) { const origMenu = window.superMenuData.find(m => m.id_menu === newId); payloadM.is_active = origMenu ? origMenu.is_active : 'Y'; } try { const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: actionType, token: SUPER_TOKEN, data: payloadM }) }); const res = await response.json(); if(res.status === 'success') { alert(isEdit ? "✅ Menu berhasil diupdate!" : "✅ Menu baru berhasil dibuat!"); modalM.style.display = 'none'; document.getElementById('table-wrapper-m').innerHTML = `<div style="padding:50px; text-align:center; color:#0984e3;"><h3>🔄 MENYINKRONKAN...</h3></div>`; await clearStore('master_menu'); setTimeout(() => { window.renderSuperView('menu_management'); }, 1000); } else { alert("❌ Gagal menyimpan: " + res.message); } } catch(e) { catatErrorSistem('Simpan Menu', e); alert("❌ Kesalahan Jaringan."); } finally { btnSubmit.innerText = "Simpan Menu"; btnSubmit.disabled = false; } }; } else { document.getElementById('table-wrapper-m').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Membaca Menu</h3><p>${res.message}</p></div>`; }
            } catch (error) { catatErrorSistem('Menu Manajemen Menu', error); document.getElementById('table-wrapper-m').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Terhubung</h3></div>`; }
        }
        
        else if (target === 'widget_management') { 
            content.innerHTML = `
                <div class="super-card" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; border-left:4px solid #F1C40F;">
                    <div><h3 style="margin:0; color:#0A2342;">Pabrik Halaman & Widget</h3><p style="margin:5px 0 0 0; color:#666; font-size:0.9rem;">Rakit halaman dari nol, sisipkan tombol cetak, banner, atau teks pengumuman ke halaman manapun.</p></div>
                    <button id="btn-show-add-w" style="background:#0043A8; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 6px rgba(0, 67, 168, 0.3);">+ Tambah Komponen Baru</button>
                </div>
                <div class="super-card" style="padding:0; overflow:hidden;">
                    <div style="background:#f8f9fa; padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size:0.85rem; color:#856404; font-weight:bold;">💡 Widget ini akan menempel otomatis di bagian Atas/Bawah halaman yang dituju.</div>
                        <div style="font-size:0.85rem; font-weight:bold; color:#0A2342; background:#F1C40F; padding:8px 12px; border-radius:6px;" id="lbl-count-w">0 Widget</div>
                    </div>
                    <div id="table-wrapper-w" class="super-table-container"><div style="padding:50px; text-align:center; color:#0043A8;"><h3>⏳ Menyedot Data Widget...</h3></div></div>
                </div>
                <div id="modal-add-w" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;">
                    <div style="background:white; padding:30px; border-radius:10px; width:90%; max-width:650px; max-height:90vh; overflow-y:auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                        <h3 id="modal-w-title" style="margin-top:0; color:#0A2342; border-bottom:2px solid #F1C40F; padding-bottom:10px;">➕ Buat Komponen Halaman</h3>
                        <div style="display:flex; gap:10px; margin-bottom:15px; background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #ddd;">
                            <div style="flex:2;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Pilih Target Halaman <span style="color:red">*</span></label><select id="w-target-sel" class="filter-input" style="width:100%; box-sizing:border-box;"><option value="">-- Sedang memuat halaman... --</option></select></div>
                            <div style="flex:1;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Posisi Tempel</label><select id="w-posisi" class="filter-input" style="width:100%; box-sizing:border-box;"><option value="atas">⬆️ ATAS</option><option value="bawah">⬇️ BAWAH</option></select></div>
                        </div>
                        <div style="margin-bottom:15px;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px; color:#0043A8;">Pilih Tipe Komponen Builder</label><select id="w-tipe" class="filter-input" style="width:100%; box-sizing:border-box; border-color:#0043A8; font-weight:bold;"><option value="teks">Teks / Pengumuman / Paragraf</option><option value="tombol">Tombol Aksi (Button)</option><option value="banner">Gambar Banner (Image)</option><option value="html">⚙️ Koding Bebas (Advanced HTML)</option></select></div>
                        <div id="panel-teks" class="widget-panel" style="display:block; background:#eef2f5; padding:15px; border-radius:8px; border-left:4px solid #0043A8; margin-bottom:20px;">
                            <div style="margin-bottom:10px;"><label style="font-size:0.8rem; font-weight:bold;">Isi Teks / Pengumuman</label><textarea id="w-txt-isi" class="filter-input" rows="3" style="width:100%; box-sizing:border-box;"></textarea></div>
                            <div style="display:flex; gap:10px;"><div style="flex:1;"><label style="font-size:0.8rem; font-weight:bold;">Ukuran Teks</label><select id="w-txt-ukuran" class="filter-input" style="width:100%;"><option value="0.9rem">Kecil</option><option value="1.1rem" selected>Sedang</option><option value="1.5rem">Besar (Judul)</option></select></div><div style="flex:1;"><label style="font-size:0.8rem; font-weight:bold;">Warna Teks</label><select id="w-txt-warna" class="filter-input" style="width:100%;"><option value="#0A2342">Navy Gelap</option><option value="#0043A8">Biru Primary</option><option value="#e94560">Merah Danger</option><option value="#198754">Hijau Success</option></select></div><div style="flex:1;"><label style="font-size:0.8rem; font-weight:bold;">Posisi (Align)</label><select id="w-txt-align" class="filter-input" style="width:100%;"><option value="left">Kiri</option><option value="center">Tengah</option></select></div></div>
                            <div style="margin-top:10px;"><label style="font-size:0.85rem; font-weight:bold; cursor:pointer;"><input type="checkbox" id="w-txt-alert"> Jadikan Kotak Peringatan (Emas)</label></div>
                        </div>
                        <div id="panel-tombol" class="widget-panel" style="display:none; background:#e8f4fd; padding:15px; border-radius:8px; border-left:4px solid #198754; margin-bottom:20px;">
                            <div style="display:flex; gap:10px; margin-bottom:10px;"><div style="flex:2;"><label style="font-size:0.8rem; font-weight:bold;">Tulisan di Tombol</label><input type="text" id="w-btn-teks" class="filter-input" placeholder="Cth: 🖨️ Cetak PDF" style="width:100%; box-sizing:border-box;"></div><div style="flex:1;"><label style="font-size:0.8rem; font-weight:bold;">Warna Tombol</label><select id="w-btn-warna" class="filter-input" style="width:100%;"><option value="#0043A8">Biru (Primary)</option><option value="#198754">Hijau (Success)</option><option value="#F1C40F">Emas (Warning)</option></select></div></div>
                            <div><label style="font-size:0.8rem; font-weight:bold;">Aksi Saat Diklik</label><select id="w-btn-aksi" class="filter-input" style="width:100%; box-sizing:border-box;"><option value="print">Cetak Halaman Ini (Print)</option><option value="https://google.com">Buka Link URL (Contoh: Buka Dashboard Looker Studio)</option></select></div>
                            <input type="text" id="w-btn-url" class="filter-input" placeholder="Masukkan Link http://..." style="width:100%; box-sizing:border-box; margin-top:5px; display:none;">
                        </div>
                        <div id="panel-banner" class="widget-panel" style="display:none; background:#fdf3e8; padding:15px; border-radius:8px; border-left:4px solid #F1C40F; margin-bottom:20px;">
                            <div style="margin-bottom:10px;"><label style="font-size:0.8rem; font-weight:bold;">Link URL Gambar (.jpg / .png)</label><input type="text" id="w-ban-url" class="filter-input" placeholder="https://..." style="width:100%; box-sizing:border-box;"></div>
                            <div><label style="font-size:0.8rem; font-weight:bold;">Link Tujuan (Jika gambar diklik) - Opsional</label><input type="text" id="w-ban-link" class="filter-input" placeholder="https://..." style="width:100%; box-sizing:border-box;"></div>
                        </div>
                        <div id="panel-html" class="widget-panel" style="display:none; margin-bottom:20px;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px; color:#555;">Kode HTML (Advanced)</label><textarea id="w-konten-html" class="filter-input" rows="6" placeholder="Ketik kode <div>, <button>, atau <iframe> di sini..." style="width:100%; box-sizing:border-box; font-family:monospace; background:#0A2342; color:#F1C40F;"></textarea></div>
                        <div style="display:flex; justify-content:flex-end; gap:10px;"><button type="button" id="btn-close-w" style="padding:10px 20px; border:none; background:#eee; color:#333; border-radius:5px; cursor:pointer; font-weight:bold;">Batal</button><button type="button" id="btn-submit-w" style="padding:10px 20px; border:none; background:#0043A8; color:white; border-radius:5px; cursor:pointer; font-weight:bold;">Generate & Simpan</button></div>
                    </div>
                </div>
            `;
            try {
                const [resW, resM] = await Promise.all([ fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_WIDGET' }) }).then(r => r.json()), fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_MENU' }) }).then(r => r.json()) ]);
                if (resW.status === 'success') { 
                    window.superWidgetData = resW.data; 
                    if(resM.status === 'success') window.superMenuData = resM.data; 
                    window.renderWidgetTable(); 
                    const modalW = document.getElementById('modal-add-w'); const tHalaman = document.getElementById('w-target-sel'); const wTipe = document.getElementById('w-tipe'); const panels = document.querySelectorAll('.widget-panel'); 
                    const populateTarget = () => { 
                        if(tHalaman) {
                            tHalaman.innerHTML = '<option value="">-- Pilih Halaman / Menu --</option>'; 
                            const defaultTargets = ['dashboard', 'registrasi', 'daftar_sasaran', 'pendampingan', 'rekap_bulanan', 'cetak_pdf', 'bantuan', 'setting']; 
                            const dynamicTargets = window.superMenuData.map(m => m.target_view).filter(Boolean); 
                            const uniqueTargets = [...new Set([...defaultTargets, ...dynamicTargets])]; 
                            uniqueTargets.forEach(t => tHalaman.innerHTML += `<option value="${t}">${t}</option>`); 
                        }
                    }; 
                    populateTarget(); 
                    if(wTipe) wTipe.onchange = () => { panels.forEach(p => p.style.display = 'none'); document.getElementById(`panel-${wTipe.value}`).style.display = 'block'; }; 
                    const btnAksi = document.getElementById('w-btn-aksi'); if(btnAksi) btnAksi.onchange = () => { document.getElementById('w-btn-url').style.display = btnAksi.value === 'print' ? 'none' : 'block'; }; 
                    const btnAddW = document.getElementById('btn-show-add-w');
                    if(btnAddW) btnAddW.onclick = () => { window.currentEditWidgetId = null; populateTarget(); document.getElementById('modal-w-title').innerText = "➕ Buat Komponen Halaman"; document.getElementById('btn-submit-w').innerText = "Generate & Simpan"; if(tHalaman) tHalaman.value = ''; document.getElementById('w-posisi').value = 'atas'; if(wTipe){ wTipe.value = 'teks'; wTipe.dispatchEvent(new Event('change'));} document.getElementById('w-txt-isi').value=''; document.getElementById('w-btn-teks').value=''; document.getElementById('w-ban-url').value=''; document.getElementById('w-konten-html').value=''; if(modalW) modalW.style.display = 'flex'; }; 
                    if(document.getElementById('btn-close-w')) document.getElementById('btn-close-w').onclick = () => { if(modalW) modalW.style.display = 'none'; };
                    
                    const btnSubmitW = document.getElementById('btn-submit-w');
                    if(btnSubmitW) btnSubmitW.onclick = async () => {
                        const target = tHalaman ? tHalaman.value.trim() : ''; const posisi = document.getElementById('w-posisi').value; const tipe = wTipe ? wTipe.value : 'teks'; let finalKonten = ''; 
                        if(!target) { alert("⚠️ Mohon pilih Target Halaman!"); return; } 
                        if (tipe === 'html') { finalKonten = document.getElementById('w-konten-html').value.trim(); if(!finalKonten) { alert("⚠️ Kode HTML tidak boleh kosong!"); return; } } 
                        else if (tipe === 'tombol') { const tTeks = document.getElementById('w-btn-teks').value.trim(); const tWarna = document.getElementById('w-btn-warna').value; const tAksi = document.getElementById('w-btn-aksi').value; const tUrl = document.getElementById('w-btn-url').value.trim(); if(!tTeks) { alert("⚠️ Tulisan di tombol tidak boleh kosong!"); return; } let actCode = tAksi === 'print' ? 'window.print()' : `window.open('${tUrl || tAksi}', '_blank')`; let txtColor = tWarna === '#F1C40F' ? '#0A2342' : 'white'; finalKonten = `<button style="width:100%; padding:15px; background:${tWarna}; color:${txtColor}; border:none; border-radius:8px; font-weight:bold; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1);" onclick="${actCode}">${tTeks}</button>`; } 
                        else if (tipe === 'teks') { const txtIsi = document.getElementById('w-txt-isi').value.replace(/\n/g, '<br>'); const txtUkuran = document.getElementById('w-txt-ukuran').value; const txtWarna = document.getElementById('w-txt-warna').value; const txtAlign = document.getElementById('w-txt-align').value; const isAlert = document.getElementById('w-txt-alert').checked; if(!txtIsi) { alert("⚠️ Isi teks tidak boleh kosong!"); return; } if(isAlert) { finalKonten = `<div style="background:#FFF8E7; padding:15px; border-radius:8px; border-left:5px solid #F1C40F; text-align:${txtAlign}; font-size:${txtUkuran}; color:#B8860B; margin-bottom:15px;">${txtIsi}</div>`; } else { finalKonten = `<div style="text-align:${txtAlign}; font-size:${txtUkuran}; color:${txtWarna}; margin-bottom:15px; line-height:1.5; font-weight:bold;">${txtIsi}</div>`; } } 
                        else if (tipe === 'banner') { const bUrl = document.getElementById('w-ban-url').value.trim(); const bLink = document.getElementById('w-ban-link').value.trim(); if(!bUrl) { alert("⚠️ Link gambar tidak boleh kosong!"); return; } const imgHtml = `<img src="${bUrl}" style="width:100%; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.1); display:block; margin-bottom:15px;">`; finalKonten = bLink ? `<a href="${bLink}" target="_blank">${imgHtml}</a>` : imgHtml; } 
                        
                        btnSubmitW.innerText = "Menyimpan..."; btnSubmitW.disabled = true; 
                        const isEdit = window.currentEditWidgetId != null; const newId = isEdit ? window.currentEditWidgetId : `WIDGET-${Date.now().toString().slice(-5)}`; const actionType = isEdit ? 'SECURE_EDIT_WIDGET_DATA' : 'SECURE_ADD_WIDGET'; 
                        const payloadW = { id_widget: newId, target_halaman: target, posisi: posisi, tipe: tipe, isi_konten: finalKonten, is_active: 'Y' }; 
                        if (isEdit) { const origW = window.superWidgetData.find(w => w.id_widget === newId); payloadW.is_active = origW ? origW.is_active : 'Y'; } 
                        
                        try { 
                            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: actionType, token: SUPER_TOKEN, data: payloadW }) }); const res = await response.json(); 
                            if(res.status === 'success') { alert(isEdit ? "✅ Komponen berhasil diupdate!" : "✅ Komponen berhasil dipasang!"); if(modalW) modalW.style.display = 'none'; const wrp = document.getElementById('table-wrapper-w'); if(wrp) wrp.innerHTML = `<div style="padding:50px; text-align:center; color:#0043A8;"><h3>🔄 MENYINKRONKAN...</h3></div>`; await clearStore('master_widget'); setTimeout(() => { window.renderSuperView('widget_management'); }, 1000); } 
                            else { alert("❌ Gagal menyimpan: " + res.message); } 
                        } catch(e) { catatErrorSistem('Simpan Widget', e); alert("❌ Kesalahan Jaringan."); } finally { btnSubmitW.innerText = "Generate & Simpan"; btnSubmitW.disabled = false; } 
                    };
                } else { 
                    const wrp = document.getElementById('table-wrapper-w'); 
                    if(wrp) wrp.innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Membaca Widget</h3><p>${res.message}</p></div>`; 
                }
            } catch (error) { 
                catatErrorSistem('Menu Widget', error); 
                const wrp = document.getElementById('table-wrapper-w'); 
                if(wrp) wrp.innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Terhubung</h3></div>`; 
            }
        }
        
        else if (target === 'ekspor_data') {
            content.innerHTML = `
                <div class="super-card" style="margin-bottom:20px; border-left:4px solid #F1C40F;">
                    <h3 style="margin:0; color:#0A2342;">💾 Data Center (Ekspor Excel/CSV)</h3>
                    <p style="margin:5px 0 0 0; color:#666; font-size:0.9rem;">Tarik gabungan data dari seluruh 9 Kecamatan Buleleng dalam satu file.</p>
                </div>
                <div class="super-card">
                    <div style="display:flex; gap:15px; flex-wrap:wrap; margin-bottom:20px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Mulai Tanggal (Tgl Daftar/Kunjungan)</label>
                            <input type="date" id="dc-date-from" class="filter-input" style="width:100%; box-sizing:border-box;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">Sampai Tanggal</label>
                            <input type="date" id="dc-date-to" class="filter-input" style="width:100%; box-sizing:border-box;">
                        </div>
                    </div>
                    <div style="background:#e8f4fd; padding:15px; border-radius:8px; border:1px solid #b6d4fe; margin-bottom:20px;">
                        <label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:10px; color:#0043A8;">Pilih Jenis Data yang Ditarik:</label>
                        <div style="display:flex; gap:20px;">
                            <label style="cursor:pointer; font-weight:bold; color:#333;"><input type="checkbox" id="dc-chk-reg" checked style="transform:scale(1.2); margin-right:8px; accent-color:#0043A8;"> Data Registrasi Sasaran</label>
                            <label style="cursor:pointer; font-weight:bold; color:#333;"><input type="checkbox" id="dc-chk-pend" checked style="transform:scale(1.2); margin-right:8px; accent-color:#0043A8;"> Data Laporan Pendampingan</label>
                        </div>
                    </div>
                    <button id="btn-ekspor-dc" style="background:#198754; color:white; border:none; padding:15px; width:100%; border-radius:8px; font-weight:bold; font-size:1.1rem; cursor:pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: opacity 0.3s;" onclick="window.superEksporDataCenter()">💾 Tarik & Download Excel (CSV)</button>
                </div>
            `;
        }

        else if (target === 'referensi') {
            content.innerHTML = `
                <div class="super-card" style="margin-bottom:20px; border-left:4px solid #F1C40F;">
                    <h3 style="margin:0; color:#0A2342;">🏗️ Master Wilayah & Referensi Tim</h3>
                    <p style="margin:5px 0 0 0; color:#666; font-size:0.9rem;">Peta wilayah penugasan (Kecamatan, Desa, Dusun, dan Tim Kader).</p>
                </div>
                <div class="super-card">
                    <div style="background:#FFF8E7; padding:15px; border-radius:8px; border-left:5px solid #F1C40F; color:#B8860B; margin-bottom:15px;">
                        <b>⚠️ INFO:</b> Untuk menjaga integritas data hirarki, penambahan atau perubahan Master Wilayah dan Referensi Tim saat ini hanya bisa diatur secara aman melalui <a href="https://docs.google.com/spreadsheets/d/1KIEyfN4BVd2nQDeMI71wxt_jVnAivudqGAo99MQzopQ/edit" target="_blank" style="color:#0043A8; font-weight:bold;">Google Sheet Master Database</a>.
                    </div>
                    <div id="table-wrapper-ref" class="super-table-container"><div style="padding:40px; text-align:center; color:#0043A8;">⏳ Menarik data wilayah dari server...</div></div>
                </div>
            `;
            
            try {
                if(window.superTimData.length === 0) {
                    const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_TIM' }) });
                    const res = await response.json();
                    if(res.status === 'success') window.superTimData = res.data || [];
                }
                
                let html = `<table class="super-table"><thead><tr><th>Kecamatan</th><th>Desa/Kelurahan</th><th>Dusun/RW</th><th>ID Tim</th><th>Nama Tim</th></tr></thead><tbody>`;
                let tData = [...window.superTimData].sort((a,b) => {
                    if((a.kecamatan||'') === (b.kecamatan||'')) return String(a.desa_kelurahan||'').localeCompare(String(b.desa_kelurahan||''));
                    return String(a.kecamatan||'').localeCompare(String(b.kecamatan||''));
                });

                if (tData.length > 0) {
                    tData.forEach(t => {
                        html += `<tr>
                            <td><span style="background:#e8f4fd; padding:3px 8px; border-radius:4px; font-size:0.8rem; color:#0043A8; font-weight:bold;">${t.kecamatan || t.wilayah || '-'}</span></td>
                            <td><b style="color:#0A2342;">${t.desa_kelurahan || t.desa || '-'}</b></td>
                            <td>${t.dusun_rw || t.dusun || '-'}</td>
                            <td><code style="color:#e94560;">${t.id_tim || t.id || '-'}</code></td>
                            <td>${t.nama_tim || t.nomor_tim || '-'}</td>
                        </tr>`;
                    });
                } else {
                    html += `<tr><td colspan="5" style="text-align:center; padding:30px; color:#999;">Data wilayah kosong atau belum dimuat.</td></tr>`;
                }
                html += `</tbody></table>`;
                
                setTimeout(() => { const wrp = document.getElementById('table-wrapper-ref'); if(wrp) wrp.innerHTML = html; }, 300);
            } catch(e) { catatErrorSistem('Menu Referensi', e); document.getElementById('table-wrapper-ref').innerHTML = `<div style="padding:40px; text-align:center; color:#e94560;">❌ Gagal menarik data wilayah.</div>`; }
        }

        else if (target === 'audit_trail') {
            content.innerHTML = `
                <div class="super-card" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; border-left:4px solid #F1C40F;">
                    <div><h3 style="margin:0; color:#0A2342;">🛡️ Audit Log & Keamanan</h3><p style="margin:5px 0 0 0; color:#666; font-size:0.9rem;">Rekaman CCTV aktivitas pengguna dan kotak hitam (Black Box) error sistem.</p></div>
                    <div style="display:flex; gap:10px; background:#eef2f5; padding:5px; border-radius:8px;">
                        <button id="btn-tab-cctv" style="padding:8px 15px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; background:${window.activeAuditTab === 'CCTV' ? '#0A2342' : 'transparent'}; color:${window.activeAuditTab === 'CCTV' ? '#F1C40F' : '#666'}; transition:all 0.3s;">🎥 CCTV Log Aktivitas</button>
                        <button id="btn-tab-error" style="padding:8px 15px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; background:${window.activeAuditTab === 'ERROR' ? '#e94560' : 'transparent'}; color:${window.activeAuditTab === 'ERROR' ? 'white' : '#666'}; transition:all 0.3s;">🚨 Radar Error (Black Box)</button>
                    </div>
                </div>

                <div class="super-card" style="padding:0; overflow:hidden;">
                    <div id="filter-area-log" style="background:#f8f9fa; padding:15px; border-bottom:1px solid #eee; display:flex; gap:10px; flex-wrap:wrap; align-items:center;"></div>
                    <div id="table-wrapper-log" class="super-table-container"><div style="padding:50px; text-align:center; color:#0043A8;"><h3>⏳ Memutar Rekaman CCTV...</h3></div></div>
                </div>
            `;

            const renderFilters = () => {
                const fltArea = document.getElementById('filter-area-log');
                if(window.activeAuditTab === 'CCTV') {
                    fltArea.innerHTML = `
                        <div style="position: relative; flex: 1; min-width: 200px;"><input type="text" id="log-flt-search" class="filter-input" placeholder="🔍 Cari ID/Nama/Detail..." style="width: 100%; box-sizing: border-box;"></div>
                        <select id="log-flt-waktu" class="filter-input"><option value="ALL">🗓️ Semua Waktu</option><option value="TODAY">⏳ Hari Ini</option><option value="7D">📅 7 Hari Terakhir</option><option value="30D">📆 30 Hari Terakhir</option></select>
                        <select id="log-flt-aksi" class="filter-input"><option value="ALL">Semua Aksi</option><option value="LOGIN_SUKSES">Login Sukses</option><option value="LOGIN_GAGAL">Login Gagal</option><option value="TAMBAH">Tambah Data</option><option value="HAPUS">Hapus Data</option><option value="UPDATE">Update Data</option></select>
                        <div style="font-size:0.85rem; font-weight:bold; color:#0A2342; background:#F1C40F; padding:8px 12px; border-radius:6px;" id="lbl-count-log">0 Log</div>
                    `;
                    document.getElementById('log-flt-search').addEventListener('input', window.renderAuditTable);
                    document.getElementById('log-flt-waktu').addEventListener('change', window.renderAuditTable);
                    document.getElementById('log-flt-aksi').addEventListener('change', window.renderAuditTable);
                } else {
                    fltArea.innerHTML = `
                        <div style="position: relative; flex: 1; min-width: 200px;"><input type="text" id="log-flt-search" class="filter-input" placeholder="🔍 Cari ID/Lokasi/Pesan Error..." style="width: 100%; box-sizing: border-box;"></div>
                        <div style="font-size:0.85rem; font-weight:bold; color:white; background:#e94560; padding:8px 12px; border-radius:6px;" id="lbl-count-log">0 Error</div>
                    `;
                    document.getElementById('log-flt-search').addEventListener('input', window.renderAuditTable);
                }
            };

            const switchTab = (tab) => {
                window.activeAuditTab = tab;
                const btnCCTV = document.getElementById('btn-tab-cctv');
                const btnError = document.getElementById('btn-tab-error');
                if(tab === 'CCTV') {
                    btnCCTV.style.background = '#0A2342'; btnCCTV.style.color = '#F1C40F';
                    btnError.style.background = 'transparent'; btnError.style.color = '#666';
                } else {
                    btnError.style.background = '#e94560'; btnError.style.color = 'white';
                    btnCCTV.style.background = 'transparent'; btnCCTV.style.color = '#666';
                }
                renderFilters();
                window.renderAuditTable();
            };

            document.getElementById('btn-tab-cctv').onclick = () => switchTab('CCTV');
            document.getElementById('btn-tab-error').onclick = () => switchTab('ERROR');

            try {
                if(window.superUsersData.length === 0) {
                    const resU = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'USER_LOGIN' }) }).then(r=>r.json());
                    if(resU.status === 'success') window.superUsersData = resU.data || [];
                }

                const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_AUDIT', token: SUPER_TOKEN }) });
                const res = await response.json();
                
                if (res.status === 'success') {
                    window.superAuditData = res.data || [];
                    window.superErrorData = res.error_data || [];
                    renderFilters();
                    window.renderAuditTable();
                } else {
                    document.getElementById('table-wrapper-log').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Membuka CCTV</h3><p>${res.message}</p></div>`;
                }
            } catch(e) {
                catatErrorSistem('Menu Audit Log', e);
                document.getElementById('table-wrapper-log').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Sambungan Terputus</h3></div>`;
            }
        }

    } catch(e) { catatErrorSistem(`Global Routing [${target}]`, e); }
};
