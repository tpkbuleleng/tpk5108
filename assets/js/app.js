import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData } from './sync.js';

// Helper agar tidak error jika elemen tidak ditemukan
const getEl = (id) => document.getElementById(id);

// ==========================================
// 1. INISIALISASI APLIKASI
// ==========================================
const initApp = async () => {
    // Failsafe: Paksa hilangkan splash screen setelah 4 detik jika macet
    const failsafe = setTimeout(() => tampilkanLayar('login'), 4000);

    try {
        console.log("Memulai Database...");
        await initDB();
        
        const session = await getDataById('kader_session', 'active_user');
        
        setTimeout(() => {
            clearTimeout(failsafe);
            if (session) {
                masukKeAplikasi(session);
            } else {
                tampilkanLayar('login');
            }
        }, 1500);

        // Download Data Master di latar belakang jika kosong
        const users = await getAllData('master_user');
        if (users.length === 0 && navigator.onLine) {
            await downloadMasterData();
        }
    } catch (err) {
        console.error("Gagal inisialisasi:", err);
        tampilkanLayar('login');
    }
};

// ==========================================
// 2. NAVIGASI LAYAR
// ==========================================
const tampilkanLayar = (id) => {
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
};

const masukKeAplikasi = (session) => {
    window.currentUser = session;
    
    const greeting = getEl('user-greeting');
    const sideNama = getEl('sidebar-nama');
    const sideRole = getEl('sidebar-role');

    if (greeting) greeting.innerText = `Dashboard ${session.role}`;
    if (sideNama) sideNama.innerText = session.nama;
    if (sideRole) sideRole.innerText = session.role;
    
    renderMenu(session.role);
    renderKonten('dashboard'); 
    tampilkanLayar('app');
};

// ==========================================
// 3. MENU & KONTEN (Fungsi yang dicari)
// ==========================================
const renderMenu = (role) => {
    const container = getEl('dynamic-menu-container');
    if (!container) return;

    let menus = [];
    const r = role ? role.toUpperCase() : "";

    if (r === 'KADER') {
        menus = [
            { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
            { id: 'registrasi', icon: '📝', label: 'Registrasi Sasaran' },
            { id: 'sinkronisasi', icon: '🔄', label: 'Sinkronisasi' }
        ];
    } else {
        menus = [
            { id: 'dashboard_sys', icon: '🖥️', label: 'Dashboard Sistem' },
            { id: 'master_wilayah', icon: '🗺️', label: 'Master Wilayah' }
        ];
    }

    container.innerHTML = menus.map(m => `
        <a class="menu-item" data-target="${m.id}">
            <span class="icon">${m.icon}</span> ${m.label}
        </a>
    `).join('') + `<hr><a class="menu-item text-danger" id="btnLogout">🚪 Keluar</a>`;

    document.querySelectorAll('.menu-item[data-target]').forEach(item => {
        item.onclick = () => {
            getEl('sidebar').classList.remove('active');
            getEl('sidebar-overlay').classList.remove('active');
            renderKonten(item.getAttribute('data-target'));
        };
    });

    if (getEl('btnLogout')) getEl('btnLogout').onclick = window.logout;
};

const renderKonten = async (target) => {
    const area = getEl('content-area');
    if (!area) return;

    if (target === 'dashboard') {
        const antrean = await getAllData('sync_queue') || [];
        area.innerHTML = `
            <div class="animate-fade">
                <div class="card" style="background: linear-gradient(135deg, #0d6efd, #0043a8); color: white; border:none; margin-bottom: 20px;">
                    <p style="margin:0; opacity: 0.8;">Selamat Datang,</p>
                    <h2 style="margin: 5px 0;">${window.currentUser.nama}</h2>
                    <p style="margin:0; font-size: 0.8rem; opacity: 0.7;">Tim: ${window.currentUser.id_tim}</p>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="card" style="text-align: center; padding: 20px;">
                        <div style="font-size: 1.5rem;">📦</div>
                        <h3>${antrean.length}</h3>
                        <p style="font-size: 0.7rem; color: #666;">Tertunda</p>
                    </div>
                    <div class="card" style="text-align: center; padding: 20px; cursor: pointer;" onclick="document.querySelector('[data-target=\\'registrasi\\']').click()">
                        <div style="font-size: 1.5rem;">➕</div>
                        <h3>Baru</h3>
                        <p style="font-size: 0.7rem; color: #666;">Registrasi</p>
                    </div>
                </div>
            </div>`;
    } else if (target === 'registrasi') {
        const temp = getEl('template-registrasi');
        area.innerHTML = '';
        area.appendChild(temp.content.cloneNode(true));
        initFormRegistrasi();
    } else {
        area.innerHTML = `<div class="content-card"><h3>Menu ${target.toUpperCase()}</h3><p>Halaman sedang disiapkan.</p></div>`;
    }
};

// ==========================================
// 4. LOGIKA FORM REGISTRASI
// ==========================================
const initFormRegistrasi = async () => {
    try {
        const session = window.currentUser;
        const allWilayahTim = await getAllData('master_tim_wilayah');
        const wilayahTugas = allWilayahTim.filter(w => w.id_tim === session.id_tim);

        const selDesa = getEl('reg-desa');
        const selDusun = getEl('reg-dusun');
        const containerQ = getEl('pertanyaan-dinamis');

        if (selDesa) {
            const daftarDesa = [...new Set(wilayahTugas.map(w => w.desa_kelurahan))];
            selDesa.innerHTML = '<option value="">-- Pilih Desa --</option>' + 
                daftarDesa.map(d => `<option value="${d}">${d}</option>`).join('');

            selDesa.onchange = () => {
                const dusunFiltered = wilayahTugas.filter(w => w.desa_kelurahan === selDesa.value);
                if (selDusun) {
                    selDusun.innerHTML = '<option value="">-- Pilih Dusun --</option>' + 
                        dusunFiltered.map(d => `<option value="${d.dusun_rw}">${d.dusun_rw}</option>`).join('');
                }
            };
        }

        const questions = await getAllData('master_pertanyaan');
        if (containerQ) {
            containerQ.innerHTML = questions.sort((a,b) => a.urutan - b.urutan).map(q => {
                if(q.is_active !== 'Y') return '';
                return `<div class="form-group"><label>${q.label_pertanyaan}</label><input type="text" name="${q.id_pertanyaan}" class="form-control" ${q.is_required === 'Y'?'required':''}></div>`;
            }).join('');
        }
    } catch (err) { console.error(err); }
};

// ==========================================
// 5. LOGIN, LOGOUT & SIDEBAR
// ==========================================
const formLogin = getEl('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idInput = getEl('kader-id').value.trim();
        const passInput = getEl('kader-pin').value.trim();

        const user = await getDataById('master_user', idInput);
        if (!user) return alert("ID tidak ditemukan!");
        
        const passBenar = user.password_awal_ref ? user.password_awal_ref.toString() : "";
        if (passBenar === passInput) {
            let namaTampil = user.username;
            let idTim = '-';

            if (user.role_akses === 'KADER') {
                const detail = await getDataById('master_kader', user.ref_id);
                if (detail) { namaTampil = detail.nama_kader; idTim = detail.id_tim; }
            }

            const sessionData = { id_kader: 'active_user', username: user.username, role: user.role_akses, nama: namaTampil, id_tim: idTim };
            await putData('kader_session', sessionData);
            masukKeAplikasi(sessionData);
        } else { alert("Password salah!"); }
    });
}

window.logout = async () => {
    if (confirm("Keluar dari aplikasi?")) {
        await deleteData('kader_session', 'active_user');
        location.reload();
    }
};

if (getEl('btn-menu')) getEl('btn-menu').onclick = () => {
    getEl('sidebar').classList.add('active');
    getEl('sidebar-overlay').classList.add('active');
};
if (getEl('sidebar-overlay')) getEl('sidebar-overlay').onclick = () => {
    getEl('sidebar').classList.remove('active');
    getEl('sidebar-overlay').classList.remove('active');
};

document.addEventListener('DOMContentLoaded', initApp);
