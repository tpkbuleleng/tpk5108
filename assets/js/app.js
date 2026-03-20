// ==========================================
// 10. LOGIN PINTAR (MEMBACA MASTER_ADMIN) 🔥
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();

    const fLogin = getEl('form-login');
    if (fLogin) {
        fLogin.onsubmit = async (e) => {
            e.preventDefault(); 
            const btn = getEl('btn-login-submit'); const id = getEl('kader-id').value.trim(); const pin = getEl('kader-pin').value.trim();

            if (!id || !pin) return;
            if (btn) { btn.disabled = true; btn.innerText = "Memeriksa..."; }

            try {
                await initDB();
                const allUsers = await getAllData('master_user').catch(() => []);
                const user = allUsers.find(u => String(u.id_pengguna) === id || String(u.id_user) === id || String(u.username) === id || String(u.id) === id);
                
                if (!user) { 
                    alert("❌ ID Pengguna tidak ditemukan. Memaksa sinkronisasi ulang data terbaru..."); 
                    if(window.jalankanSinkronisasi) await window.jalankanSinkronisasi(); 
                    if (btn) { btn.disabled = false; btn.innerText = "Masuk"; } 
                    return; 
                }

                const pinBenar = String(user.password_awal_ref || user.password || user.pin || "");
                if (pinBenar === pin) {
                    let nama = user.nama || user.nama_lengkap || user.username || id; 
                    let role = String(user.role_akses || user.role || 'KADER').toUpperCase(); 
                    let ref_id = user.ref_id || user.id_kader || user.nik || ''; 
                    let tim = '-', noTim = '-';
                    // 🔥 Membaca scope_kecamatan dari Sheet User Bapak
                    let scopeKec = user.scope_kecamatan || user.kecamatan || user.wilayah || ''; 
                    
                    if (role.includes('KADER') && ref_id) {
                        const allKader = await getAllData('master_kader').catch(() => []);
                        const k = allKader.find(x => String(x.id_kader) === String(ref_id) || String(x.nik) === String(ref_id));
                        if (k) { 
                            nama = k.nama_kader || k.nama || nama; tim = k.id_tim || k.tim || '-'; 
                            const allTim = await getAllData('master_tim').catch(() => []);
                            const t = allTim.find(x => String(x.id_tim) === String(tim) || String(x.id) === String(tim));
                            noTim = t ? (t.nomor_tim || t.nama_tim || tim) : tim;
                        }
                    }

                    // 🔥 BACA HAK AKSES ABSOLUT DARI MASTER_ADMIN
                    if (role.includes('ADMIN')) {
                        const allAdmin = await getAllData('master_admin').catch(() => []);
                        const admData = allAdmin.find(a => String(a.id_admin) === id || String(a.nama_admin).toLowerCase() === nama.toLowerCase());
                        if (admData) {
                            scopeKec = admData.scope_kecamatan || scopeKec;
                            role = admData.role_admin || role;
                        }
                    }

                    const ses = { id: 'active_user', username: id, role: role, nama: nama, id_tim: tim, nomor_tim: noTim, kecamatan: scopeKec };
                    await putData('kader_session', ses);
                    
                    getEl('kader-id').value = ''; getEl('kader-pin').value = ''; 
                    
                    if (role.includes('ADMIN')) { initAdmin(ses); } else { masukKeAplikasi(ses); }
                } else { alert("❌ PIN yang Anda masukkan salah!"); }
            } catch (err) { console.error("Kesalahan Login:", err); alert("Kesalahan Sistem: " + err.message); } finally { if (btn) { btn.disabled = false; btn.innerText = "Masuk"; } }
        };
    }
});

const btnMenu = getEl('btn-menu'); const sidebar = getEl('sidebar'); const overlay = getEl('sidebar-overlay');
if (btnMenu && sidebar && overlay) { btnMenu.addEventListener('click', () => { sidebar.classList.add('active'); overlay.classList.add('active'); }); overlay.addEventListener('click', () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); }); }
