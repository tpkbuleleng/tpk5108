// ==========================================
// 👑 GOD MODE: SUPER ADMIN DASHBOARD (V32 FIXED - KABEL TERSAMBUNG)
// ==========================================
import { getAllData, clearStore } from './db.js';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';
const SUPER_TOKEN = 'MasterKeyKubuSecure!001';

window.superUsersData = []; window.superTimData = []; window.currentFilteredIds = [];
window.superKuesionerData = []; window.superMenuData = []; window.superWidgetData = [];
window.superAuditData = []; window.dashAnalyticData = { users: [], logs: [] };
window.currentUser = null;

const catatErrorSistem = (lokasi, error) => { if(window.logErrorToServer) window.logErrorToServer(`SuperAdmin: ${lokasi}`, error); else console.error(`[${lokasi}]`, error); };

// ==========================================
// 1. FUNGSI AKSI SUPER ADMIN (GLOBAL)
// ==========================================
window.superResetPin = async (idUser, namaUser) => { const newPin = prompt(`🔐 Reset PIN untuk:\nID: ${idUser}\nNama: ${namaUser}\n\nMasukkan PIN Baru (Min 5 karakter):`); if (!newPin || newPin.length < 5) return; if (!confirm(`Yakin mengubah PIN ${namaUser} menjadi: ${newPin} ?`)) return; try { const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_USER', token: SUPER_TOKEN, id_user: idUser, updateType: 'PIN', newPin: newPin }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ PIN berhasil direset!`); window.renderSuperView('user_management'); } else { alert("❌ Gagal: " + res.message); } } catch (e) { catatErrorSistem('superResetPin', e); alert("❌ Kesalahan Jaringan."); } };
window.superToggleStatus = async (idUser, namaUser, currentStatus) => { const isAktif = (currentStatus || 'AKTIF').toUpperCase() === 'AKTIF'; const newStatus = isAktif ? 'NONAKTIF' : 'AKTIF'; if (!confirm(`⚠️ PERINGATAN!\nAnda akan ${isAktif ? 'MEMBLOKIR' : 'MENGAKTIFKAN'} akses untuk: ${namaUser}\n\nLanjutkan?`)) return; try { const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_USER', token: SUPER_TOKEN, id_user: idUser, updateType: 'STATUS', newStatus: newStatus }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ Status diubah menjadi ${newStatus}!`); window.renderSuperView('user_management'); } else { alert("❌ Gagal: " + res.message); } } catch (e) { catatErrorSistem('superToggleStatus', e); alert("❌ Kesalahan Jaringan."); } };
window.superBulkAction = async (actionType) => { const checkedBoxes = document.querySelectorAll('.chk-user:checked'); const targetIds = Array.from(checkedBoxes).map(cb => cb.value); const totalTarget = targetIds.length; if (totalTarget === 0) { alert("Pilih minimal 1 pengguna!"); return; } let confirmMsg = ""; let updateType = ""; let newValue = ""; if (actionType === 'BLOKIR') { confirmMsg = `⚠️ MEMBLOKIR ${totalTarget} akun. Ketik "YAKIN":`; updateType = 'STATUS'; newValue = 'NONAKTIF'; } else if (actionType === 'AKTIFKAN') { confirmMsg = `MENGAKTIFKAN ${totalTarget} akun. Ketik "YAKIN":`; updateType = 'STATUS'; newValue = 'AKTIF'; } else if (actionType === 'RESETPIN') { const pinMasal = prompt(`PIN BARU untuk ${totalTarget} akun:`); if (!pinMasal || pinMasal.length < 5) return; confirmMsg = `⚠️ MERESET PIN ${totalTarget} akun menjadi "${pinMasal}". Ketik "YAKIN":`; updateType = 'PIN'; newValue = pinMasal; } if (prompt(confirmMsg) !== "YAKIN") return; document.getElementById('table-wrapper').innerHTML = `<div style="padding:50px; text-align:center;"><h3>🚀 MENGEKSEKUSI...</h3></div>`; try { const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_BULK_UPDATE_USER', token: SUPER_TOKEN, ids: targetIds, updateType: updateType, newValue: newValue }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ SUKSES! ${res.count} Akun diperbarui!`); } else { alert("❌ Gagal: " + res.message); } window.renderSuperView('user_management'); } catch (e) { catatErrorSistem('superBulkAction', e); alert("❌ Kesalahan."); window.renderSuperView('user_management'); } };
window.superToggleQuestion = async (idPertanyaan, statusSaatIni) => { const isAktif = (statusSaatIni || 'AKTIF').toUpperCase() === 'AKTIF' || statusSaatIni === 'Y'; const newStatus = isAktif ? 'N' : 'Y'; const aksi = isAktif ? 'MEMATIKAN' : 'MENGHIDUPKAN'; if(!confirm(`⚠️ PERINGATAN!\nAnda akan ${aksi} pertanyaan ini dari HP Kader.\nLanjutkan?`)) return; try { document.getElementById('table-wrapper-q').innerHTML = `<div style="padding:30px; text-align:center;">⏳ Memproses...</div>`; const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_QUESTION', token: SUPER_TOKEN, id_pertanyaan: idPertanyaan, newStatus: newStatus }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ Pertanyaan berhasil diupdate!`); await clearStore('master_pertanyaan'); window.renderSuperView('kuesioner'); } else { alert("❌ Gagal: " + res.message); window.renderSuperView('kuesioner');} } catch(e) { catatErrorSistem('superToggleQuestion', e); alert("❌ Kesalahan Jaringan."); window.renderSuperView('kuesioner');} };
window.superToggleMenu = async (idMenu, statusSaatIni) => { const isAktif = (statusSaatIni || 'Y').toUpperCase() === 'Y'; const newStatus = isAktif ? 'N' : 'Y'; const aksi = isAktif ? 'MENYEMBUNYIKAN' : 'MEMUNCULKAN'; if(!confirm(`⚠️ PERINGATAN!\nAnda akan ${aksi} menu ini dari Aplikasi.\nLanjutkan?`)) return; try { document.getElementById('table-wrapper-m').innerHTML = `<div style="padding:30px; text-align:center;">⏳ Memproses...</div>`; const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_MENU', token: SUPER_TOKEN, id_menu: idMenu, newStatus: newStatus }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ Status menu berhasil diubah!`); await clearStore('master_menu'); window.renderSuperView('menu_management'); } else { alert("❌ Gagal: " + res.message); window.renderSuperView('menu_management');} } catch(e) { catatErrorSistem('superToggleMenu', e); alert("❌ Kesalahan Jaringan."); window.renderSuperView('menu_management');} };
window.superToggleWidget = async (idWidget, statusSaatIni) => { const isAktif = (statusSaatIni || 'Y').toUpperCase() === 'Y'; const newStatus = isAktif ? 'N' : 'Y'; const aksi = isAktif ? 'MENYEMBUNYIKAN' : 'MEMUNCULKAN'; if(!confirm(`⚠️ PERINGATAN!\nAnda akan ${aksi} widget ini dari Aplikasi.\nLanjutkan?`)) return; try { document.getElementById('table-wrapper-w').innerHTML = `<div style="padding:30px; text-align:center;">⏳ Memproses...</div>`; const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_UPDATE_WIDGET', token: SUPER_TOKEN, id_widget: idWidget, newStatus: newStatus }) }); const res = await response.json(); if (res.status === 'success') { alert(`✅ Status widget berhasil diubah!`); await clearStore('master_widget'); window.renderSuperView('widget_management'); } else { alert("❌ Gagal: " + res.message); window.renderSuperView('widget_management');} } catch(e) { catatErrorSistem('superToggleWidget', e); alert("❌ Kesalahan Jaringan."); window.renderSuperView('widget_management');} };

window.superEditMenu = (id) => { const menu = window.superMenuData.find(m => m.id_menu === id); if(!menu) return; window.currentEditMenuId = id; document.getElementById('modal-m-title').innerHTML = "✏️ Edit Menu Navigasi"; document.getElementById('btn-submit-m').innerText = "Update Menu"; document.getElementById('m-icon').value = menu.icon || ''; document.getElementById('m-label').value = menu.label_menu || ''; const targetSel = document.getElementById('m-target-sel'); const targetCus = document.getElementById('m-target-custom'); const opts = Array.from(targetSel.options).map(o => o.value); if (opts.includes(menu.target_view)) { targetSel.value = menu.target_view; targetCus.style.display = 'none'; targetCus.value = ''; } else { targetSel.value = 'CUSTOM'; targetCus.style.display = 'block'; targetCus.value = menu.target_view || ''; } document.getElementById('m-urut').value = menu.urutan || ''; const parentSelect = document.getElementById('m-parent'); parentSelect.innerHTML = '<option value="">-- Bukan Sub-Menu --</option>'; window.superMenuData.forEach(m => { if ((!m.parent_id || m.parent_id === '') && m.id_menu !== id) { parentSelect.innerHTML += `<option value="${m.id_menu}">${m.icon || ''} ${m.label_menu}</option>`; } }); if(menu.parent_id) parentSelect.value = menu.parent_id; const roles = (menu.role_akses || '').split(','); document.querySelectorAll('.m-role-chk').forEach(cb => { cb.checked = roles.includes(cb.value); }); document.getElementById('modal-add-m').style.display = 'flex'; };
window.superEditWidget = (id) => { const widget = window.superWidgetData.find(w => w.id_widget === id); if(!widget) return; window.currentEditWidgetId = id; document.getElementById('modal-w-title').innerHTML = "✏️ Edit Komponen Halaman"; document.getElementById('btn-submit-w').innerText = "Update Komponen"; const tHalaman = document.getElementById('w-target-sel'); tHalaman.innerHTML = '<option value="">-- Pilih Halaman / Menu --</option>'; const defaultTargets = ['dashboard', 'registrasi', 'daftar_sasaran', 'pendampingan', 'rekap_bulanan', 'cetak_pdf', 'bantuan', 'setting']; const dynamicTargets = window.superMenuData.map(m => m.target_view).filter(Boolean); const uniqueTargets = [...new Set([...defaultTargets, ...dynamicTargets])]; uniqueTargets.forEach(t => tHalaman.innerHTML += `<option value="${t}">${t}</option>`); tHalaman.value = widget.target_halaman || ''; document.getElementById('w-posisi').value = widget.posisi || 'atas'; document.getElementById('w-tipe').value = 'html'; document.querySelectorAll('.widget-panel').forEach(p => p.style.display = 'none'); document.getElementById('panel-html').style.display = 'block'; document.getElementById('w-konten-html').value = widget.isi_konten || ''; document.getElementById('modal-add-w').style.display = 'flex'; };

// ==========================================
// 2. FUNGSI RENDER TABEL USER
// ==========================================
window.renderUserTable = () => {
    try {
        const searchVal = document.getElementById('flt-search').value.toLowerCase(); const roleVal = document.getElementById('flt-role').value; const kecVal = document.getElementById('flt-kec').value;
        let tableHtml = `<table class="super-table"><thead><tr><th style="text-align:center; width:40px;"><input type="checkbox" id="chk-all-users" title="Pilih Semua yang Tampil"></th><th>ID / Username</th><th>Nama Pengguna</th><th>No. Tim</th><th>Desa/Kelurahan</th><th>Wilayah/Kecamatan</th><th>Role Akses</th><th>PIN / Password</th><th>Aktivitas Terakhir</th><th>Status & Aksi</th></tr></thead><tbody>`;
        let count = 0; window.currentFilteredIds = [];
        window.superUsersData.forEach((u) => {
            const role = String(u.role_akses || u.role || 'KADER').toUpperCase(); const pin = u.password_awal_ref || u.password || u.pin || '***'; const id = u.id_pengguna || u.id_user || u.username || '-'; const nama = u.nama || u.username || '-'; const kec = String(u._kecamatan || u.scope_kecamatan || u.kecamatan || u.wilayah || 'ALL').toUpperCase(); const currentStatus = String(u.status_akun || 'AKTIF').toUpperCase(); const tim = u._nomor_tim || '-'; const desa = u._desa || '-';
            const lastLoginRaw = u.login_terakhir || u.last_login; let lastLoginText = '<span style="color:#aaa; font-style:italic;">Belum pernah login</span>';
            if (lastLoginRaw && String(lastLoginRaw).trim() !== '') { const dateObj = new Date(lastLoginRaw); if (!isNaN(dateObj.getTime())) { lastLoginText = `<span style="color:#0984e3; font-weight:bold;">${dateObj.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</span>`; } }
            const failCount = parseInt(u.jumlah_gagal_login) || 0; const failText = failCount > 0 ? `<br><span style="color:#e94560; font-size:0.75rem; font-weight:bold;">⚠️ ${failCount}x Gagal Login</span>` : '';

            const matchSearch = id.toLowerCase().includes(searchVal) || nama.toLowerCase().includes(searchVal) || tim.toLowerCase().includes(searchVal) || desa.toLowerCase().includes(searchVal);
            const matchRole = roleVal === 'ALL' || role.includes(roleVal); const matchKec = kecVal === 'ALL' || kec === kecVal || kec === 'ALL';
            
            if (matchSearch && matchRole && matchKec) {
                count++; if (!role.includes('SUPER')) { window.currentFilteredIds.push(id); }
                
                let badgeClass = role.includes('SUPER') ? 'role-super' : (role === 'ADMIN_DESA' ? 'role-desa' : (role.includes('ADMIN') ? 'role-admin' : (role.includes('PKB') ? 'role-pkb' : (role.includes('MITRA') ? 'role-mitra' : 'role-kader'))));
                
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
    } catch (e) { catatErrorSistem('renderUserTable', e); }
};

window.renderKuesionerTable = () => { try { const filterKat = document.getElementById('flt-kategori-q').value.toUpperCase(); let tableHtml = `<table class="super-table"><thead><tr><th width="12%">ID Form</th><th width="15%">Posisi (Modul -> Sasaran)</th><th width="15%">Grup & Urutan</th><th width="30%">Teks Pertanyaan</th><th width="10%">Tipe Jawaban</th><th width="8%">Sifat</th><th width="10%">Aksi</th></tr></thead><tbody>`; let count = 0; window.superKuesionerData.forEach(q => { const id = q.id_pertanyaan || q.id || '-'; const modul = String(q.modul || '-').toUpperCase(); const kat = String(q.jenis_sasaran || q.kategori_sasaran || q.kategori || '-').toUpperCase(); const grup = q.grup_pertanyaan || '-'; const urutG = q.urutan_grup || '-'; const teks = q.label_pertanyaan || q.teks_pertanyaan || q.pertanyaan || '-'; const tipe = String(q.tipe_input || q.tipe_jawaban || q.tipe || '-').toUpperCase(); const opsi = q.opsi_json || q.pilihan_jawaban ? `<div style="font-size:0.75rem; color:#888; margin-top:5px; background:#f1f2f6; padding:4px; border-radius:4px;">Opsi: ${q.opsi_json || q.pilihan_jawaban}</div>` : ''; const wajib = String(q.is_required || q.wajib || 'Y').toUpperCase() === 'Y' || String(q.is_required || q.wajib || 'Y').toUpperCase() === 'YA' ? '<span style="color:#d63031; font-weight:bold;">Wajib *</span>' : '<span style="color:#636e72;">Opsional</span>'; const status = String(q.is_active || q.status || q.status_pertanyaan || 'Y').toUpperCase(); const kondisiLabel = q.kondisi_tampil ? `<div style="font-size:0.75rem; color:#d35400; margin-top:5px; padding:4px; background:#fdf3e8; border-radius:4px; border:1px dashed #fadbd8;">👁️ Muncul Jika: <b>${q.kondisi_tampil}</b></div>` : ''; if (filterKat === 'ALL' || kat === filterKat) { count++; const isAktif = status === 'AKTIF' || status === 'Y'; const bgRow = isAktif ? 'transparent' : '#fdfaf6'; const textStatus = isAktif ? '🟢 Aktif' : '🔴 Mati'; const btnColor = isAktif ? '#ff7675' : '#00b894'; const btnText = isAktif ? 'Matikan' : 'Hidupkan'; tableHtml += `<tr style="background:${bgRow}; opacity: ${isAktif ? '1' : '0.6'};"><td><code>${id}</code></td><td><span class="badge-role role-kader" style="display:block; margin-bottom:3px; text-align:center;">${modul}</span><span class="badge-role role-admin" style="display:block; text-align:center;">${kat}</span></td><td><span style="font-size:0.7rem; color:#666; font-weight:bold;">Urutan Tampil: ${urutG}</span><br><b>${grup}</b></td><td><b>${teks}</b>${opsi}${kondisiLabel}</td><td><code style="color:#0984e3;">${tipe}</code></td><td>${wajib}</td><td><div style="font-size:0.7rem; font-weight:bold; margin-bottom:5px;">${textStatus}</div><button class="btn-action" style="background:${btnColor}; color:white; width:100%;" onclick="window.superToggleQuestion('${id}', '${status}')">${btnText}</button></td></tr>`; } }); if(count === 0) tableHtml += `<tr><td colspan="7" style="text-align:center; padding:30px; color:#666;">Belum ada pertanyaan untuk kategori ini.</td></tr>`; tableHtml += `</tbody></table>`; document.getElementById('table-wrapper-q').innerHTML = tableHtml; document.getElementById('lbl-count-q').innerText = `${count} Pertanyaan`; } catch(e) { catatErrorSistem('renderKuesionerTable', e); } };
window.renderMenuTable = () => { try { let tableHtml = `<table class="super-table"><thead><tr><th width="10%">Urutan</th><th width="20%">Nama Menu</th><th width="15%">Aksi Aplikasi (ID)</th><th width="35%">Target Role (Bisa Melihat)</th><th width="10%">Status</th><th width="10%">Aksi</th></tr></thead><tbody>`; let count = 0; let sortedMenus = [...window.superMenuData].sort((a,b) => { if(a.parent_id === b.parent_id) return (parseInt(a.urutan)||0) - (parseInt(b.urutan)||0); return (a.parent_id || '').localeCompare(b.parent_id || ''); }); sortedMenus.forEach(m => { if(!m.id_menu) return; count++; const id = m.id_menu; const isChild = m.parent_id && m.parent_id !== ''; const parentName = isChild ? (window.superMenuData.find(p => p.id_menu === m.parent_id)?.label_menu || 'Induk Unknown') : ''; const label = isChild ? `<span style="color:#aaa;">↳ (Anak dari ${parentName})</span><br>${m.icon || '📌'} ${m.label_menu}` : `<b style="font-size:1.05rem;">${m.icon || '📌'} ${m.label_menu}</b>`; const target = m.target_view || '-'; const role = (m.role_akses || 'KADER').toUpperCase().replace(/,/g, ', '); const status = String(m.is_active || 'Y').toUpperCase(); const isAktif = status === 'Y'; const bgRow = isChild ? (isAktif ? '#f8fafd' : '#f1f2f6') : (isAktif ? 'transparent' : '#fdfaf6'); const textStatus = isAktif ? '🟢 Muncul' : '🔴 Sembunyi'; const btnColor = isAktif ? '#ff7675' : '#00b894'; const btnText = isAktif ? 'Sembunyikan' : 'Munculkan'; tableHtml += `<tr style="background:${bgRow}; opacity: ${isAktif ? '1' : '0.6'};"><td style="font-weight:bold; font-size:1.1rem; color:#0984e3; text-align:center;">${m.urutan || 0}</td><td style="color:#2c3e50;">${label}</td><td><code>${target}</code></td><td><div style="font-size:0.75rem; background:#eef2f5; padding:4px 8px; border-radius:4px; display:inline-block; border:1px solid #dcdde1;">${role}</div></td><td><b>${textStatus}</b></td><td style="display:flex; flex-direction:column; gap:5px;"><button class="btn-action btn-edit" style="width:100%;" onclick="window.superEditMenu('${id}')">✏️ Edit</button><button class="btn-action" style="background:${btnColor}; color:white; width:100%;" onclick="window.superToggleMenu('${id}', '${status}')">${btnText}</button></td></tr>`; }); if(count === 0) tableHtml += `<tr><td colspan="6" style="text-align:center; padding:30px; color:#666;">Database Menu masih kosong.</td></tr>`; tableHtml += `</tbody></table>`; document.getElementById('table-wrapper-m').innerHTML = tableHtml; document.getElementById('lbl-count-m').innerText = `${count} Menu Aktif`; } catch(e) { catatErrorSistem('renderMenuTable', e); } };
window.renderWidgetTable = () => { try { let tableHtml = `<table class="super-table"><thead><tr><th width="15%">Target Halaman</th><th width="10%">Posisi</th><th width="15%">Tipe Terbaca</th><th width="40%">Isi Konten (Preview)</th><th width="10%">Status</th><th width="10%">Aksi</th></tr></thead><tbody>`; let count = 0; window.superWidgetData.forEach(w => { if(!w.id_widget) return; count++; const id = w.id_widget; const target = w.target_halaman || '-'; const posisi = w.posisi || '-'; const tipe = w.tipe || 'html'; const konten = (w.isi_konten || '').substring(0, 80) + '...'; const status = String(w.is_active || 'Y').toUpperCase(); const isAktif = status === 'Y'; const bgRow = isAktif ? 'transparent' : '#fdfaf6'; const textStatus = isAktif ? '🟢 Aktif' : '🔴 Mati'; const btnColor = isAktif ? '#ff7675' : '#00b894'; const btnText = isAktif ? 'Matikan' : 'Hidupkan'; tableHtml += `<tr style="background:${bgRow}; opacity: ${isAktif ? '1' : '0.6'};"><td><b><code style="color:#e94560;">${target}</code></b></td><td><span style="background:#e8f4fd; color:#0984e3; padding:3px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">${posisi.toUpperCase()}</span></td><td>${tipe.toUpperCase()}</td><td><div style="font-size:0.8rem; background:#eee; padding:5px; border-radius:4px; font-family:monospace; color:#555; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${konten.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></td><td><b>${textStatus}</b></td><td style="display:flex; flex-direction:column; gap:5px;"><button class="btn-action btn-edit" style="width:100%;" onclick="window.superEditWidget('${id}')">✏️ Edit</button><button class="btn-action" style="background:${btnColor}; color:white; width:100%;" onclick="window.superToggleWidget('${id}', '${status}')">${btnText}</button></td></tr>`; }); if(count === 0) tableHtml += `<tr><td colspan="6" style="text-align:center; padding:30px; color:#666;">Database Widget Injeksi masih kosong.</td></tr>`; tableHtml += `</tbody></table>`; document.getElementById('table-wrapper-w').innerHTML = tableHtml; document.getElementById('lbl-count-w').innerText = `${count} Widget Aktif`; } catch(e) { catatErrorSistem('renderWidgetTable', e); } };
window.renderAuditTable = () => { try { const fltWaktu = document.getElementById('log-flt-waktu').value; const fltAksi = document.getElementById('log-flt-aksi').value; const searchVal = document.getElementById('log-flt-search').value.toLowerCase(); const now = new Date(); let limitDate = new Date('2000-01-01'); if (fltWaktu === 'TODAY') limitDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); else if (fltWaktu === '7D') limitDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); else if (fltWaktu === '30D') limitDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); let tableHtml = `<table class="super-table"><thead><tr><th width="15%">Waktu Sistem</th><th width="25%">Pengguna & Wilayah (Cross-Ref)</th><th width="15%">Aksi / Status</th><th width="45%">Detail Keterangan</th></tr></thead><tbody>`; let count = 0; const sortedLog = [...window.superAuditData].sort((a,b) => new Date(b.waktu) - new Date(a.waktu)); sortedLog.forEach(log => { const dt = new Date(log.waktu); if (isNaN(dt.getTime()) || dt < limitDate) return; const aksi = String(log.aksi).toUpperCase(); if (fltAksi !== 'ALL') { if (fltAksi === 'LOGIN_SUKSES' && !aksi.includes('SUKSES')) return; if (fltAksi === 'LOGIN_GAGAL' && !aksi.includes('GAGAL')) return; if (fltAksi === 'ADMIN' && aksi.includes('LOGIN')) return; } let userName = log.target || '-'; let userWilayah = '-'; const u = window.superUsersData.find(x => x.id_pengguna === log.target || x.username === log.target || x.id_user === log.target); if (u) { userName = `<b>${u.nama || u.username}</b><br><code style="font-size:0.75rem; background:#eee; padding:2px 4px; border-radius:3px; color:#555;">ID: ${log.target}</code>`; userWilayah = `${u._desa || '-'}, ${u._kecamatan || '-'}`; } else { userName = `<b>ID Tidak Dikenal</b><br><code style="font-size:0.75rem; background:#eee; padding:2px 4px; border-radius:3px; color:#555;">${log.target}</code>`; } const detailStr = String(log.detail || '').toLowerCase(); const targetStr = String(log.target || '').toLowerCase(); if (searchVal && !detailStr.includes(searchVal) && !targetStr.includes(searchVal) && !userName.toLowerCase().includes(searchVal) && !userWilayah.toLowerCase().includes(searchVal)) return; count++; let badgeColor = '#0984e3'; if(aksi.includes('TAMBAH') || aksi.includes('SUKSES')) badgeColor = '#198754'; else if(aksi.includes('STATUS') || aksi.includes('RESET')) badgeColor = '#fdcb6e'; else if(aksi.includes('HAPUS') || aksi.includes('BLOKIR') || aksi.includes('GAGAL')) badgeColor = '#e94560'; tableHtml += `<tr><td style="color:#666; font-size:0.85rem;">${dt.toLocaleString('id-ID')}</td><td><div style="line-height:1.3;">${userName}</div><div style="font-size:0.75rem; color:#888; margin-top:5px; font-weight:bold;">📍 ${userWilayah}</div></td><td><span style="background:${badgeColor}; color:${badgeColor==='#fdcb6e'?'#333':'white'}; padding:3px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold;">${aksi}</span></td><td style="color:#444; font-size:0.85rem; line-height:1.4;">${log.detail || '-'}</td></tr>`; }); if (count === 0) tableHtml += `<tr><td colspan="4" style="text-align:center; padding:30px; color:#666;">Tidak ada log yang cocok dengan pencarian/filter.</td></tr>`; tableHtml += `</tbody></table>`; const wrp = document.getElementById('table-wrapper-log'); if(wrp) wrp.innerHTML = tableHtml; const lbl = document.getElementById('lbl-count-log'); if(lbl) lbl.innerText = `${count} Log Ditemukan`; } catch(e) { catatErrorSistem('renderAuditTable', e); } };

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
                <div style="flex:1; display:flex; flex-direction:column; overflow:hidden; width:100%;">
                    <div style="background:white; padding: 15px 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); z-index:5; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:15px;"><button id="btn-toggle-super" style="background:none; border:none; font-size:1.6rem; cursor:pointer; color:#1a1a2e; padding:0; line-height:1;">☰</button><h2 id="super-page-title" style="margin:0; font-size:1.4rem; color:#1a1a2e; font-weight:800;">Dashboard Utama</h2></div>
                        <div style="font-size:0.8rem; background:#198754; color:white; padding:4px 10px; border-radius:20px; font-weight:bold; letter-spacing:1px;">API SECURED 🔐</div>
                    </div>
                    <div id="super-content" style="flex:1; padding: 25px; overflow-y:auto; background:#eef2f5;"></div>
                </div>
            </div>

            <style>
                .super-menu-item { padding: 14px 25px; color: #a5b1c2; font-weight: 600; cursor: pointer; transition: all 0.3s; border-left: 4px solid transparent; font-size: 0.95rem; } .super-menu-item:hover { background: rgba(255,255,255,0.05); color: #fff; } .super-menu-item.active { background: rgba(233, 69, 96, 0.1); color: #fff; border-left: 4px solid #e94560; } .super-card { background: white; border-radius: 10px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #e1e8ed; } #btn-super-logout:hover { background: #e94560; color: white; }
                .super-table-container { max-height: calc(100vh - 280px); overflow-y: auto; border-radius: 8px; border: 1px solid #eee; background:white; } .super-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; min-width: 1100px; } .super-table th { position: sticky; top: 0; z-index: 10; background: #1a1a2e; color: white; padding: 15px; text-align: left; font-weight:600; box-shadow: 0 2px 4px rgba(0,0,0,0.1); } .super-table td { padding: 12px 15px; border-bottom: 1px solid #eee; color: #444; vertical-align: top;} .super-table tr:hover td { background: #f8f9fa; }
                .badge-role { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; text-transform:uppercase; } .role-kader { background: #e8f4fd; color: #0984e3; } .role-admin { background: #fdf3e8; color: #d35400; } .role-super { background: #fbebf0; color: #e94560; } .role-pkb { background: #f3e8ff; color: #6f42c1; } .role-mitra { background: #fff3cd; color: #d35400; } .role-desa { background: #e2fbf5; color: #16a085; }
                .btn-action { padding: 6px 12px; border: none; border-radius: 4px; font-size: 0.8rem; font-weight: bold; cursor: pointer; margin-right: 5px; transition: opacity 0.2s;} .btn-action:hover { opacity: 0.8; } .btn-edit { background: #fdcb6e; color: #2d3436; } .filter-input { padding:8px 12px; border:1px solid #ccc; border-radius:6px; outline:none; font-family:inherit; } .filter-input:focus { border-color:#0984e3; box-shadow: 0 0 0 2px rgba(9, 132, 227, 0.2); }
                .btn-mass { padding: 8px 15px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; color: white; display: flex; align-items: center; gap: 5px; font-size:0.85rem;}
                .chk-user { cursor:pointer; transform:scale(1.3); accent-color: #0984e3; } #chk-all-users { cursor:pointer; transform:scale(1.3); accent-color: #e94560; } #btn-clear-search:hover { color: #e94560 !important; }
                .quick-link-btn:hover { background: #eef2f5 !important; border-color: #0984e3 !important; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05); }
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
                    <div class="super-card" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; margin-bottom: 20px; border: none; padding: 25px 30px;">
                        <h2 style="margin:0 0 5px 0; font-size:1.6rem;">Selamat Datang, ${window.currentUser?.nama || 'Komandan'}! 🚀</h2>
                        <p style="margin:0; opacity:0.8; font-size:0.95rem;">Pusat Kendali Utama (God Mode) Sistem Pendataan Kader TPK.</p>
                    </div>

                    <div class="super-card" style="margin-bottom: 20px; padding: 15px;">
                        <div style="font-size:0.85rem; font-weight:bold; color:#e94560; margin-bottom:10px;">🔍 FILTER STATISTIK PENGGUNAAN APLIKASI</div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                            <select id="dash-flt-waktu" class="filter-input"><option value="ALL">🗓️ Sepanjang Masa</option><option value="TODAY">⏳ Hari Ini</option><option value="7D">📅 7 Hari Terakhir</option><option value="30D">📆 30 Hari Terakhir</option></select>
                            <select id="dash-flt-role" class="filter-input"><option value="ALL">👥 Semua Role</option><option value="KADER">Kader TPK</option><option value="PKB">PKB / Supervisor</option><option value="ADMIN_DESA">Admin Desa/Kelurahan</option><option value="ADMIN">Admin Kecamatan</option><option value="MITRA">Mitra Kerja</option><option value="SUPER">Super Admin</option></select>
                            <select id="dash-flt-kec" class="filter-input"><option value="ALL">🌍 Semua Kecamatan</option></select>
                            <select id="dash-flt-desa" class="filter-input"><option value="ALL">🏘️ Semua Desa</option></select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 20px;">
                        <div class="super-card" style="border-left: 5px solid #0984e3; display:flex; flex-direction:column; justify-content:center; padding: 15px;">
                            <div style="font-size:0.8rem; color:#666; font-weight:bold;">PENGGUNA AKTIF (PERNAH LOGIN)</div>
                            <div id="st-aktif" style="font-size:2rem; font-weight:900; color:#0984e3; margin-top:5px;">⏳</div>
                        </div>
                        <div class="super-card" style="border-left: 5px solid #636e72; display:flex; flex-direction:column; justify-content:center; padding: 15px;">
                            <div style="font-size:0.8rem; color:#666; font-weight:bold;">PASIF (BELUM PERNAH LOGIN)</div>
                            <div id="st-pasif" style="font-size:2rem; font-weight:900; color:#636e72; margin-top:5px;">⏳</div>
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
                        <div class="super-card" style="text-align:center; padding:15px;"><div style="font-size:0.75rem; color:#666; font-weight:bold;">TOTAL AKUN</div><div id="dash-count-user" style="font-size:1.5rem; font-weight:900; color:#2c3e50;">⏳</div></div>
                        <div class="super-card" style="text-align:center; padding:15px;"><div style="font-size:0.75rem; color:#666; font-weight:bold;">KUESIONER</div><div id="dash-count-q" style="font-size:1.5rem; font-weight:900; color:#2c3e50;">⏳</div></div>
                        <div class="super-card" style="text-align:center; padding:15px;"><div style="font-size:0.75rem; color:#666; font-weight:bold;">MENU AKTIF</div><div id="dash-count-m" style="font-size:1.5rem; font-weight:900; color:#2c3e50;">⏳</div></div>
                        <div class="super-card" style="text-align:center; padding:15px;"><div style="font-size:0.75rem; color:#666; font-weight:bold;">WIDGET INJEKSI</div><div id="dash-count-w" style="font-size:1.5rem; font-weight:900; color:#2c3e50;">⏳</div></div>
                    </div>

                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
                        <div class="super-card">
                            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px;">
                                <h3 style="margin:0; color:#1a1a2e;">🛡️ Log Keamanan Terakhir (CCTV)</h3>
                                <button style="background:none; border:none; color:#0984e3; cursor:pointer; font-weight:bold; font-size:0.85rem;" onclick="document.querySelector('[data-target=audit_trail]').click()">Lihat Detail & Filter</button>
                            </div>
                            <div id="dash-audit-list"><div style="text-align:center; color:#999; padding:20px;">Menarik data CCTV dari satelit... ⏳</div></div>
                        </div>
                        <div class="super-card">
                            <h3 style="margin-top:0; color:#1a1a2e; border-bottom:1px solid #eee; padding-bottom:10px;">⚡ Aksi Cepat</h3>
                            <div style="display:grid; grid-template-columns: 1fr; gap:10px; margin-top:15px;">
                                <button class="quick-link-btn" onclick="document.querySelector('[data-target=user_management]').click()" style="padding:15px; background:#f8f9fa; border:1px solid #ddd; border-radius:8px; cursor:pointer; text-align:left; font-weight:bold; color:#333; transition:all 0.2s;">👥 Kelola Pengguna</button>
                                <button class="quick-link-btn" onclick="document.querySelector('[data-target=kuesioner]').click()" style="padding:15px; background:#f8f9fa; border:1px solid #ddd; border-radius:8px; cursor:pointer; text-align:left; font-weight:bold; color:#333; transition:all 0.2s;">📋 Rakit Kuesioner</button>
                                <button class="quick-link-btn" onclick="document.querySelector('[data-target=widget_management]').click()" style="padding:15px; background:#f8f9fa; border:1px solid #ddd; border-radius:8px; cursor:pointer; text-align:left; font-weight:bold; color:#333; transition:all 0.2s;">🧩 Buat Widget</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const renderAnalytics = () => {
                if (window.dashAnalyticData.users.length === 0) return;
                const fltWaktu = document.getElementById('dash-flt-waktu').value; const fltRole = document.getElementById('dash-flt-role').value; const fltKec = document.getElementById('dash-flt-kec').value; const fltDesa = document.getElementById('dash-flt-desa').value;
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
                        const rawUsers = resU.data || []; const tims = resT.data || []; const kaders = resK.data || []; const pkbs = resP.data || [];
                        window.dashAnalyticData.users = rawUsers.map(u => {
                            let nKec = String(u.scope_kecamatan || u.kecamatan || 'ALL').toUpperCase(); let nDesa = String(u.scope_desa || u.desa_kelurahan || u.desa || '-').toUpperCase(); const role = String(u.role_akses || u.role || 'KADER').toUpperCase(); const refId = u.ref_id || u.id_pengguna || u.id_user || u.username;
                            
                            if (role.includes('KADER')) { const k = kaders.find(kd => String(kd.id_kader) === String(refId) || String(kd.nik) === String(refId)); if (k) { const idTim = k.id_tim || k.tim; const t = tims.find(td => String(td.id_tim) === String(idTim) || String(td.id) === String(idTim)); if (t) { let d = t.desa_kelurahan || t.desa || k.desa_kelurahan || k.desa || nDesa; nDesa = String(d).toUpperCase(); let c = t.kecamatan || t.wilayah || k.kecamatan || nKec; nKec = String(c).toUpperCase(); } } }
                            
                            if (role.includes('PKB')) {
                                if(nDesa === '-' || nDesa === '') {
                                    const p = pkbs.find(pk => String(pk.id_pkb) === String(refId) || String(pk.nip_pkb) === String(refId));
                                    if (p) { nKec = String(p.kecamatan || nKec).toUpperCase(); nDesa = String(p.desa_kelurahan || p.desa || nDesa).toUpperCase(); }
                                }
                            }

                            if (nDesa === 'UNDEFINED' || nDesa === '') nDesa = '-'; u._desa = nDesa; u._kecamatan = nKec; return u;
                        });

                        window.superUsersData = window.dashAnalyticData.users; 

                        const kecSet = new Set(); window.dashAnalyticData.users.forEach(u => { const k = u._kecamatan.trim(); if(k && k !== 'ALL' && k !== 'SEMUA' && k !== '-') kecSet.add(k); });
                        const selKec = document.getElementById('dash-flt-kec'); Array.from(kecSet).sort().forEach(k => { selKec.innerHTML += `<option value="${k}">${k}</option>`; });
                        const selDesa = document.getElementById('dash-flt-desa');
                        selKec.onchange = () => {
                            selDesa.innerHTML = '<option value="ALL">🏘️ Semua Desa</option>'; const valKec = selKec.value;
                            if (valKec !== 'ALL') { 
                                const dSet = new Set(); 
                                window.dashAnalyticData.users.forEach(u => { 
                                    if(u._kecamatan === valKec && u._desa !== '-') {
                                        u._desa.split(',').forEach(dx => dSet.add(dx.trim()));
                                    } 
                                }); 
                                Array.from(dSet).sort().forEach(d => { selDesa.innerHTML += `<option value="${d}">${d}</option>`; }); 
                            }
                            renderAnalytics(); 
                        };

                        document.getElementById('dash-flt-waktu').onchange = renderAnalytics; document.getElementById('dash-flt-role').onchange = renderAnalytics; selDesa.onchange = renderAnalytics;

                        if(resA.status === 'success') {
                            window.dashAnalyticData.logs = resA.data || [];
                            const dashList = document.getElementById('dash-audit-list');
                            if(dashList) {
                                if(window.dashAnalyticData.logs.length === 0) { dashList.innerHTML = `<div style="text-align:center; color:#999; padding:20px;">Belum ada rekaman aktivitas.</div>`; } else {
                                    const top5 = [...window.dashAnalyticData.logs].slice(0, 5);
                                    dashList.innerHTML = top5.map(log => {
                                        const time = new Date(log.waktu).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}); const aksi = String(log.aksi).toUpperCase(); let badgeColor = '#0984e3'; if(aksi.includes('TAMBAH') || aksi.includes('SUKSES')) badgeColor = '#198754'; else if(aksi.includes('STATUS') || aksi.includes('RESET')) badgeColor = '#fdcb6e'; else if(aksi.includes('HAPUS') || aksi.includes('BLOKIR') || aksi.includes('GAGAL')) badgeColor = '#e94560';
                                        return `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f1f1f1;"><div><b style="font-size:0.75rem; color:${badgeColor};">[${aksi}]</b> <span style="font-size:0.9rem; color:#333; margin-left:5px; font-weight:bold;">${log.target}</span><div style="font-size:0.75rem; color:#888; margin-top:2px;">${log.detail}</div></div><div style="font-size:0.8rem; color:#aaa; font-weight:bold;">${time}</div></div>`;
                                    }).join('');
                                }
                            }
                        }
                        renderAnalytics();
                    }
                } catch (e) { catatErrorSistem("Dashboard Analytics Parallel Fetch", e); }
            };
            loadDashboardData();
        }

        // --- 🛡️ MENU AUDIT LOG ---
        else if (target === 'audit_trail') {
            content.innerHTML = `
                <div class="super-card" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
                    <div><h3 style="margin:0; color:#1a1a2e;">🛡️ Audit Log & Rincian CCTV</h3><p style="margin:5px 0 0 0; color:#666; font-size:0.9rem;">Rincian aktivitas pengguna dan log keamanan sistem.</p></div>
                </div>
                
                <div class="super-card" style="padding:0; overflow:hidden;">
                    <div style="background:#f8f9fa; padding:15px; border-bottom:1px solid #eee; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                        <div style="position: relative; flex: 1; min-width: 200px;"><input type="text" id="log-flt-search" class="filter-input" placeholder="🔍 Cari Nama / ID / Keterangan..." style="width: 100%; box-sizing: border-box;"></div>
                        <select id="log-flt-waktu" class="filter-input"><option value="ALL">🗓️ Sepanjang Masa</option><option value="TODAY">⏳ Hari Ini</option><option value="7D">📅 7 Hari Terakhir</option><option value="30D">📆 30 Hari Terakhir</option></select>
                        <select id="log-flt-aksi" class="filter-input"><option value="ALL">⚡ Semua Aktivitas</option><option value="LOGIN_SUKSES">✅ Login Berhasil</option><option value="LOGIN_GAGAL">❌ Login Gagal</option><option value="ADMIN">🛡️ Aksi Super Admin</option></select>
                        <div style="font-size:0.85rem; font-weight:bold; color:#666; background:#fff; padding:8px 12px; border:1px solid #ddd; border-radius:6px;" id="lbl-count-log">0 Log</div>
                    </div>
                    <div id="table-wrapper-log" class="super-table-container"><div style="padding:50px; text-align:center; color:#666;"><h3>⏳ Menyedot Rekaman CCTV...</h3></div></div>
                </div>
            `;

            try {
                const [resA, resU, resT, resK, resP] = await Promise.all([
                    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_AUDIT', token: SUPER_TOKEN }) }).then(r => r.json()),
                    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'USER_LOGIN' }) }).then(r => r.json()),
                    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_TIM' }) }).then(r => r.json()),
                    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_KADER' }) }).then(r => r.json()),
                    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'MASTER_PKB' }) }).then(r => r.json())
                ]);

                if(resA.status === 'success' && resU.status === 'success') {
                    window.superAuditData = resA.data || [];
                    const rawUsers = resU.data || []; const tims = resT.data || []; const kaders = resK.data || []; const pkbs = resP.data || [];
                    
                    window.superUsersData = rawUsers.map(u => {
                        let nKec = String(u.scope_kecamatan || u.kecamatan || 'ALL').toUpperCase(); let nDesa = String(u.scope_desa || u.desa_kelurahan || u.desa || '-').toUpperCase(); const role = String(u.role_akses || u.role || 'KADER').toUpperCase(); const refId = u.ref_id || u.id_pengguna || u.id_user || u.username;
                        if (role.includes('KADER')) { const k = kaders.find(kd => String(kd.id_kader) === String(refId) || String(kd.nik) === String(refId)); if (k) { const idTim = k.id_tim || k.tim; const t = tims.find(td => String(td.id_tim) === String(idTim) || String(td.id) === String(idTim)); if (t) { let d = t.desa_kelurahan || t.desa || k.desa_kelurahan || k.desa || nDesa; nDesa = String(d).toUpperCase(); let c = t.kecamatan || t.wilayah || k.kecamatan || nKec; nKec = String(c).toUpperCase(); } } }
                        if (role.includes('PKB')) { if(nDesa === '-' || nDesa === '') { const p = pkbs.find(pk => String(pk.id_pkb) === String(refId) || String(pk.nip_pkb) === String(refId)); if (p) { nKec = String(p.kecamatan || nKec).toUpperCase(); nDesa = String(p.desa_kelurahan || p.desa || nDesa).toUpperCase(); } } }
                        if (nDesa === 'UNDEFINED' || nDesa === '') nDesa = '-'; u._desa = nDesa; u._kecamatan = nKec; return u;
                    });

                    window.renderAuditTable();
                    document.getElementById('log-flt-waktu').addEventListener('change', window.renderAuditTable);
                    document.getElementById('log-flt-aksi').addEventListener('change', window.renderAuditTable);
                    document.getElementById('log-flt-search').addEventListener('input', window.renderAuditTable);

                } else { document.getElementById('table-wrapper-log').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Mengunduh Log</h3><p>Server menolak koneksi. Coba Muat Ulang.</p></div>`; }
            } catch(e) { catatErrorSistem('Menu Audit Trail', e); document.getElementById('table-wrapper-log').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Izin Akses Tertahan (Koneksi Terputus)</h3><p>Google meminta Otorisasi Izin Ulang untuk mengakses Database CCTV Bapak.<br><br><b>Solusi Cepat:</b> Buka Tab <code>Code.gs</code> di App Script, klik <b>Jalankan</b>, lalu klik <b>Tinjau Izin</b> (Review Permissions).</p></div>`; }
        }
        
        // --- 👥 MENU MANAJEMEN PENGGUNA ---
        else if (target === 'user_management') {
            content.innerHTML = `
                <div class="super-card" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
                    <div><h3 style="margin:0; color:#1a1a2e;">Database Pengguna Aktif</h3><p style="margin:5px 0 0 0; color:#666; font-size:0.9rem;">Menampilkan data langsung dari Google Sheet melalui Secure API.</p></div>
                    <button id="btn-show-add" style="background:#0984e3; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 6px rgba(9, 132, 227, 0.3);">+ Tambah Pengguna</button>
                </div>
                
                <div class="super-card" style="padding:0; overflow:hidden;">
                    <div style="background:#f8f9fa; padding:15px; border-bottom:1px solid #eee; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                        <div style="position: relative; flex: 1; min-width: 200px;"><input type="text" id="flt-search" class="filter-input" placeholder="🔍 Cari ID/Nama/Desa/Tim..." style="width: 100%; padding-right: 35px; box-sizing: border-box;"><button id="btn-clear-search" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 1.3rem; font-weight: bold; color: #aaa; cursor: pointer; display: none; padding: 0;" title="Bersihkan Pencarian">&times;</button></div>
                        <select id="flt-role" class="filter-input"><option value="ALL">📋 Semua Role</option><option value="KADER">KADER</option><option value="ADMIN_DESA">ADMIN DESA</option><option value="PKB">PKB / Penyuluh</option><option value="ADMIN_KECAMATAN">ADMIN KECAMATAN</option><option value="ADMIN_KABUPATEN">ADMIN KABUPATEN</option><option value="MITRA">MITRA KERJA</option></select>
                        <select id="flt-kec" class="filter-input" id="flt-kec-container"><option value="ALL">🌍 Semua Wilayah</option></select>
                        <div style="font-size:0.85rem; font-weight:bold; color:#666; background:#fff; padding:8px 12px; border:1px solid #ddd; border-radius:6px;" id="lbl-count">0 Pengguna</div>
                    </div>
                    <div style="background:#fff3cd; padding:10px 15px; border-bottom:1px solid #ffeeba; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.85rem; color:#856404; font-weight:bold;">⚠️ AKSI MASSAL:</span>
                        <div style="display:flex; gap:8px;"><button class="btn-mass" style="background:#e94560;" onclick="window.superBulkAction('BLOKIR')">🛑 Blokir Terpilih</button><button class="btn-mass" style="background:#00b894;" onclick="window.superBulkAction('AKTIFKAN')">🟢 Aktifkan Terpilih</button><button class="btn-mass" style="background:#fdcb6e; color:#333;" onclick="window.superBulkAction('RESETPIN')">🔑 Reset PIN Terpilih</button></div>
                    </div>
                    <div id="table-wrapper" class="super-table-container"><div style="padding:50px; text-align:center; color:#666;"><h3 style="margin:0;">⏳ Menghubungi Server & Mapping Data...</h3></div></div>
                </div>

                <div id="modal-add-user" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;">
                    <div style="background:white; padding:30px; border-radius:10px; width:90%; max-width:550px; max-height:90vh; overflow-y:auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                        <h3 style="margin-top:0; color:#1a1a2e; border-bottom:2px solid #eee; padding-bottom:10px;">➕ Tambah Pengguna Baru</h3>
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
                        <div id="panel-kader-area" style="display:block; background:#eef2f5; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #dcdde1;">
                            <p id="lbl-penempatan" style="margin:0 0 10px 0; font-size:0.85rem; font-weight:bold; color:#0984e3;">📍 Penempatan Tugas</p>
                            
                            <label id="lbl-desa-1" style="display:block; font-size:0.8rem; color:#666; margin-bottom:5px;">1. Pilih Desa / Kelurahan</label>
                            <select id="add-desa" class="filter-input" style="width:100%; box-sizing:border-box; margin-bottom:10px;"><option value="">-- Pilih Desa --</option></select>
                            
                            <div id="box-desa-pkb" style="display:none;">
                                <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:5px;">2. Pilih Desa / Kelurahan Binaan 2 <span style="color:red; font-weight:bold;">(Wajib)</span></label>
                                <select id="add-desa-2" class="filter-input" style="width:100%; box-sizing:border-box; margin-bottom:10px;"><option value="">-- Pilih Desa --</option></select>

                                <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:5px;">3. Pilih Desa / Kelurahan Binaan 3 (Opsional)</label>
                                <select id="add-desa-3" class="filter-input" style="width:100%; box-sizing:border-box; margin-bottom:10px;"><option value="">-- Pilih Desa --</option></select>

                                <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:5px;">4. Pilih Desa / Kelurahan Binaan 4 (Opsional)</label>
                                <select id="add-desa-4" class="filter-input" style="width:100%; box-sizing:border-box; margin-bottom:10px;"><option value="">-- Pilih Desa --</option></select>

                                <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:5px;">5. Pilih Desa / Kelurahan Binaan 5 (Opsional)</label>
                                <select id="add-desa-5" class="filter-input" style="width:100%; box-sizing:border-box; margin-bottom:10px;"><option value="">-- Pilih Desa --</option></select>
                            </div>

                            <div id="box-add-tim">
                                <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:5px;">2. Pilih Tim / Dusun</label><select id="add-tim" class="filter-input" style="width:100%; box-sizing:border-box;"><option value="">-- Pilih Tim / Dusun --</option></select>
                                <div style="font-size:0.7rem; color:#888; margin-top:5px; font-style:italic;">*Sistem otomatis membuat profil ini di Database Master.</div>
                            </div>
                        </div>
                        <div style="margin-bottom:25px;"><label style="display:block; font-size:0.85rem; font-weight:bold; margin-bottom:5px;">PIN / Password Awal</label><input type="text" id="add-pin" class="filter-input" placeholder="Minimal 5 karakter" style="width:100%; box-sizing:border-box;" required></div>
                        <div style="display:flex; justify-content:flex-end; gap:10px;"><button type="button" id="btn-close-add" style="padding:10px 20px; border:none; background:#eee; color:#333; border-radius:5px; cursor:pointer; font-weight:bold;">Batal</button><button type="button" id="btn-submit-add" style="padding:10px 20px; border:none; background:#0984e3; color:white; border-radius:5px; cursor:pointer; font-weight:bold;">Simpan ke Server</button></div>
                    </div>
                </div>
            `;

            try {
                let kaderData = await getAllData('master_kader').catch(()=>[]); let timData = await getAllData('master_tim').catch(()=>[]); let pkbData = await getAllData('master_pkb').catch(()=>[]);
                if (kaderData.length === 0 || timData.length === 0) {
                    document.getElementById('table-wrapper').innerHTML = `<div style="padding:50px; text-align:center; color:#0984e3;"><h3 style="margin:0;">📥 Mengunduh Peta Wilayah...</h3><p>Menyelaraskan data dari Server Google.</p></div>`;
                    const masterReq = await fetch(SCRIPT_URL); const masterRes = await masterReq.json();
                    if(masterRes.status === 'success') { kaderData = masterRes.data.master_kader || []; timData = masterRes.data.master_tim || []; pkbData = masterRes.data.master_pkb || [];}
                }
                window.superTimData = timData || [];

                const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_GET_ALL', token: SUPER_TOKEN, sheetName: 'USER_LOGIN' }) });
                const res = await response.json();
                
                if (res.status === 'success') {
                    window.superUsersData = res.data.map(u => {
                        let nTim = '-'; let nDesa = String(u.scope_desa || u.desa_kelurahan || u.desa || u.wilayah_desa || '-').toUpperCase(); const role = String(u.role_akses || u.role || 'KADER').toUpperCase(); const refId = u.ref_id || u.id_pengguna || u.id_user || u.username;
                        
                        // 🔥 V32 PERBAIKAN: Menggunakan kaderData dan timData yang benar
                        if (role.includes('KADER')) { const k = kaderData.find(kd => String(kd.id_kader) === String(refId) || String(kd.nik) === String(refId)); if (k) { const idTim = k.id_tim || k.tim; const t = timData.find(td => String(td.id_tim) === String(idTim) || String(td.id) === String(idTim)); if (t) { nTim = String(t.nomor_tim || t.nama_tim || idTim); let d = t.desa_kelurahan || t.desa || k.desa_kelurahan || k.desa || nDesa; nDesa = String(d).toUpperCase(); } } }
                        if (role.includes('PKB')) { const p = pkbData.find(pk => String(pk.id_pkb) === String(refId) || String(pk.nip_pkb) === String(refId)); if (p) { nDesa = String(p.desa_kelurahan || p.desa || nDesa).toUpperCase(); } }
                        
                        if (nDesa === 'UNDEFINED' || nDesa === '') nDesa = '-'; u._nomor_tim = nTim; u._desa = nDesa; return u;
                    });

                    const kecSet = new Set(); window.superUsersData.forEach(u => { const k = String(u.scope_kecamatan || u.kecamatan || u.wilayah || '').toUpperCase().trim(); if(k && k !== 'ALL' && k !== 'SEMUA' && k !== '-') kecSet.add(k); });
                    const selectKec = document.getElementById('flt-kec'); Array.from(kecSet).sort().forEach(k => { const opt = document.createElement('option'); opt.value = k; opt.innerText = k; selectKec.appendChild(opt); });
                    
                    const searchInput = document.getElementById('flt-search'); const clearBtn = document.getElementById('btn-clear-search');
                    window.renderUserTable(); searchInput.addEventListener('input', () => { clearBtn.style.display = searchInput.value ? 'block' : 'none'; window.renderUserTable(); }); clearBtn.addEventListener('click', () => { searchInput.value = ''; clearBtn.style.display = 'none'; searchInput.focus(); window.renderUserTable(); }); document.getElementById('flt-role').addEventListener('change', window.renderUserTable); document.getElementById('flt-kec').addEventListener('change', window.renderUserTable);

                    const modalAdd = document.getElementById('modal-add-user'); const roleSelect = document.getElementById('add-role'); const formKecSelect = document.getElementById('add-kec'); const panelKader = document.getElementById('panel-kader-area'); const formDesaSelect = document.getElementById('add-desa'); const timSelect = document.getElementById('add-tim');
                    document.getElementById('btn-show-add').onclick = () => { if(roleSelect.value === 'KADER') populateDesaDropdown(); modalAdd.style.display = 'flex'; }; document.getElementById('btn-close-add').onclick = () => modalAdd.style.display = 'none';

                    const populateDesaDropdown = () => {
                        const selectedKec = formKecSelect.value; 
                        const defOpt = '<option value="">-- Pilih Desa / Kelurahan --</option>';
                        formDesaSelect.innerHTML = defOpt; document.getElementById('add-desa-2').innerHTML = defOpt; document.getElementById('add-desa-3').innerHTML = defOpt; document.getElementById('add-desa-4').innerHTML = defOpt; document.getElementById('add-desa-5').innerHTML = defOpt;
                        timSelect.innerHTML = '<option value="">-- Pilih Tim / Dusun --</option>'; 
                        if (!selectedKec || selectedKec === 'ALL') return; 
                        const desaSet = new Set();
                        window.superTimData.forEach(t => { const k = String(t.kecamatan || t.wilayah || '').toUpperCase(); if (k === selectedKec) { const d = String(t.desa_kelurahan || t.desa || '').toUpperCase(); if (d && d !== 'UNDEFINED' && d !== '-') desaSet.add(d); } }); 
                        Array.from(desaSet).sort().forEach(d => { 
                            const opt = `<option value="${d}">${d}</option>`;
                            formDesaSelect.innerHTML += opt; document.getElementById('add-desa-2').innerHTML += opt; document.getElementById('add-desa-3').innerHTML += opt; document.getElementById('add-desa-4').innerHTML += opt; document.getElementById('add-desa-5').innerHTML += opt;
                        });
                    };

                    const populateTimDropdown = () => {
                        const selectedKec = formKecSelect.value; const selectedDesa = formDesaSelect.value; timSelect.innerHTML = '<option value="">-- Pilih Tim / Dusun --</option>'; if (!selectedDesa) return;
                        const filteredTim = window.superTimData.filter(t => { const k = String(t.kecamatan || t.wilayah || '').toUpperCase(); const d = String(t.desa_kelurahan || t.desa || '').toUpperCase(); return k === selectedKec && d === selectedDesa; }); filteredTim.sort((a,b) => String(a.nama_tim || a.nomor_tim).localeCompare(String(b.nama_tim || b.nomor_tim))); filteredTim.forEach(t => { const idTim = t.id_tim || t.id; const namaTim = t.nama_tim || t.nomor_tim || idTim; const dusun = t.dusun_rw || t.dusun || '-'; const label = `${namaTim} (Dusun: ${dusun})`; const opt = document.createElement('option'); opt.value = idTim; opt.setAttribute('data-desa', selectedDesa); opt.setAttribute('data-dusun', dusun); opt.innerText = label; timSelect.appendChild(opt); });
                    };

                    roleSelect.addEventListener('change', () => { 
                        const boxPkb = document.getElementById('box-desa-pkb');
                        const lblDesa1 = document.getElementById('lbl-desa-1');

                        if (roleSelect.value === 'ADMIN_KABUPATEN') { 
                            formKecSelect.value = 'ALL'; formKecSelect.style.backgroundColor = '#e9ecef'; formKecSelect.style.pointerEvents = 'none'; panelKader.style.display = 'none'; 
                        } else if (roleSelect.value === 'ADMIN_KECAMATAN' || roleSelect.value === 'MITRA') { 
                            formKecSelect.style.backgroundColor = 'white'; formKecSelect.style.pointerEvents = 'auto'; 
                            if(formKecSelect.value === 'ALL' && roleSelect.value === 'ADMIN_KECAMATAN') formKecSelect.value = 'GEROKGAK'; 
                            panelKader.style.display = 'none'; 
                        } else if (roleSelect.value === 'ADMIN_DESA') { 
                            formKecSelect.style.backgroundColor = 'white'; formKecSelect.style.pointerEvents = 'auto'; if(formKecSelect.value === 'ALL') formKecSelect.value = 'GEROKGAK'; 
                            panelKader.style.display = 'block'; document.getElementById('box-add-tim').style.display = 'none'; 
                            boxPkb.style.display = 'none'; document.getElementById('lbl-penempatan').innerHTML = "📍 Wilayah Admin Desa"; 
                            lblDesa1.innerHTML = "1. Pilih Desa / Kelurahan <span style='color:red; font-weight:bold;'>(Wajib)</span>"; populateDesaDropdown(); 
                        } else if (roleSelect.value === 'PKB') { 
                            formKecSelect.style.backgroundColor = 'white'; formKecSelect.style.pointerEvents = 'auto'; if(formKecSelect.value === 'ALL') formKecSelect.value = 'GEROKGAK'; 
                            panelKader.style.display = 'block'; document.getElementById('box-add-tim').style.display = 'none'; 
                            boxPkb.style.display = 'block'; document.getElementById('lbl-penempatan').innerHTML = "📍 Wilayah Binaan PKB"; 
                            lblDesa1.innerHTML = "1. Pilih Desa / Kelurahan Binaan 1 <span style='color:red; font-weight:bold;'>(Wajib)</span>"; populateDesaDropdown(); 
                        } else { 
                            formKecSelect.style.backgroundColor = 'white'; formKecSelect.style.pointerEvents = 'auto'; if(formKecSelect.value === 'ALL') formKecSelect.value = 'GEROKGAK'; 
                            panelKader.style.display = 'block'; document.getElementById('box-add-tim').style.display = 'block'; 
                            boxPkb.style.display = 'none'; document.getElementById('lbl-penempatan').innerHTML = "📍 Penempatan Tugas Kader"; 
                            lblDesa1.innerHTML = "1. Pilih Desa / Kelurahan"; populateDesaDropdown(); 
                        } 
                    }); 
                    
                    formKecSelect.addEventListener('change', () => { if(roleSelect.value === 'KADER' || roleSelect.value === 'PKB' || roleSelect.value === 'ADMIN_DESA') populateDesaDropdown(); }); formDesaSelect.addEventListener('change', populateTimDropdown);

                    document.getElementById('btn-submit-add').onclick = async () => {
                        const id = document.getElementById('add-id').value.trim(); const nama = document.getElementById('add-nama').value.trim(); const role = document.getElementById('add-role').value; const kec = document.getElementById('add-kec').value.trim().toUpperCase(); const pin = document.getElementById('add-pin').value.trim();
                        if(!id || !nama || !kec || !pin) { alert("⚠️ Mohon isi semua kolom dasar!"); return; } 
                        
                        let payloadKader = null; let finalDesa = '';

                        if (role === 'KADER') { 
                            if(!formDesaSelect.value || !timSelect.value) { alert("⚠️ Mohon lengkapi pilihan Desa dan Tim penugasan kader!"); return; } 
                            finalDesa = formDesaSelect.value;
                            const selectedOpt = timSelect.options[timSelect.selectedIndex]; payloadKader = { id_kader: id, nik: id, id_pengguna: id, nama: nama, nama_kader: nama, nama_lengkap: nama, id_tim: timSelect.value, tim: timSelect.value, desa: selectedOpt.getAttribute('data-desa'), desa_kelurahan: selectedOpt.getAttribute('data-desa'), dusun: selectedOpt.getAttribute('data-dusun'), dusun_rw: selectedOpt.getAttribute('data-dusun') }; 
                        }
                        else if (role === 'ADMIN_DESA') { 
                            if(!formDesaSelect.value) { alert("⚠️ Mohon pilih Desa/Kelurahan!"); return; } 
                            finalDesa = formDesaSelect.value;
                        }
                        else if (role === 'PKB') { 
                            const d1 = formDesaSelect.value; const d2 = document.getElementById('add-desa-2').value; const d3 = document.getElementById('add-desa-3').value; const d4 = document.getElementById('add-desa-4').value; const d5 = document.getElementById('add-desa-5').value;
                            if(!d1 || !d2) { alert("⚠️ Mohon lengkapi minimal Desa Binaan 1 dan 2 untuk PKB!"); return; } 
                            const arrDesa = [d1, d2, d3, d4, d5].filter(Boolean); finalDesa = [...new Set(arrDesa)].join(', ');
                        }

                        const btnSubmit = document.getElementById('btn-submit-add'); btnSubmit.innerText = "Menyimpan & Sinkronisasi..."; btnSubmit.disabled = true;
                        
                        const payloadData = { id_user: id, id_pengguna: id, username: id, nama: nama, nama_lengkap: nama, role_akses: role, role: role, scope_kecamatan: kec, kecamatan: kec, scope_desa: finalDesa, password: pin, password_awal_ref: pin, pin: pin, status_akun: 'AKTIF', status: 'AKTIF', ref_type: role, ref_id: id };

                        try {
                            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'SECURE_ADD_USER', token: SUPER_TOKEN, data: payloadData, data_kader: payloadKader }) }); const res = await response.json();
                            if(res.status === 'success') { alert("✅ Pengguna berhasil ditambahkan!"); modalAdd.style.display = 'none'; await clearStore('master_kader'); await clearStore('master_tim'); document.getElementById('table-wrapper').innerHTML = `<div style="padding:50px; text-align:center; color:#0984e3;"><h3>🔄 MENYINKRONKAN DATABASE...</h3><p>Memuat data terbaru dari Google Server.</p></div>`; setTimeout(() => { window.renderSuperView('user_management'); }, 1000); } else { alert("❌ Gagal menyimpan: " + res.message); }
                        } catch(e) { catatErrorSistem('Simpan User Baru', e); alert("❌ Kesalahan Jaringan."); } finally { btnSubmit.innerText = "Simpan ke Server"; btnSubmit.disabled = false; }
                    };

                } else { document.getElementById('table-wrapper').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Akses Ditolak</h3><p>${res.message}</p></div>`; }
            } catch (error) { catatErrorSistem('Menu Manajemen Pengguna', error); document.getElementById('table-wrapper').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Terhubung</h3></div>`; }
        }
        
    } catch(e) { catatErrorSistem(`Global Routing [${target}]`, e); }
};
