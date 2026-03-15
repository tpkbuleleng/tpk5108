import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData } from './sync.js';

const getEl = (id) => document.getElementById(id);

// ==========================================
// 1. INISIALISASI APLIKASI
// ==========================================
const initApp = async () => {
    // Pengaman: Jika 3 detik macet, paksa masuk ke login/app
    const failsafe = setTimeout(() => tampilkanLayar('login'), 3000);

    try {
        await initDB();
        const session = await getDataById('kader_session', 'active_user');
        
        clearTimeout(failsafe);
        if (session) {
            masukKeAplikasi(session);
        } else {
            tampilkanLayar('login');
        }

        // Cek data master di background
        const users = await getAllData('master_user');
        if (users.length === 0 && navigator.onLine) {
            await downloadMasterData();
        }
    } catch (err) {
        console.error("Gagal init:", err);
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
    
    if (getEl('user-greeting')) getEl('user-greeting').innerText = `Dashboard ${session.role}`;
    if (getEl('sidebar-nama')) getEl('sidebar-nama').innerText = session.nama;
    if (getEl('sidebar-role')) getEl('sidebar-role').innerText = session.role;
    
    renderMenu(session.role);
    renderKonten('dashboard'); 
    tampilkanLayar('app');
};

// ==========================================
// 3. MENU & KONTEN (DASHBOARD LENGKAP)
// ==========================================
const renderMenu = (role) => {
    const container = getEl('dynamic-menu-container');
    if (!container) return;

    const r = role ? role.toUpperCase() : "";
    const menus = (r === 'KADER') ? [
        { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
        { id: 'registrasi', icon: '📝', label: 'Registrasi' },
        { id: 'sinkronisasi', icon: '🔄', label: 'Sinkronisasi' }
    ] : [
        { id: 'dashboard_sys', icon: '🖥️', label: 'Sistem' },
        { id: 'master_wilayah', icon: '🗺️', label: 'Wilayah' }
    ];

    container.innerHTML = menus.map(m => `
        <a class="menu-item" data-target="${m.id}">
            <span class="icon">${m.icon}</span> ${m.label}
        </a>
    `).join('') + `<hr><a class="menu-item text-danger" id="btnLogoutSide">🚪 Keluar</a>`;

    document.querySelectorAll('.menu-item[data-target]').forEach(item => {
        item.onclick = () => {
            getEl('sidebar').classList.remove('active');
            getEl('sidebar-overlay').classList.remove('active');
            renderKonten(item.getAttribute('data-target'));
        };
    });
    if (getEl('btnLogoutSide')) getEl('btnLogoutSide').onclick = window.logout;
};

const renderKonten = async (target) => {
    const area = getEl('content-area');
    if (!area) return;

    if (target === 'dashboard') {
        area.innerHTML = `<div style="padding:20px; text-align:center;">Memuat Dashboard...</div>`;
        
        const session = window.currentUser;
        const [allTimWil, antrean] = await Promise.all([
            getAllData('master_tim_wilayah'),
            getAllData('sync_queue')
        ]);

        const wilayahKerja = allTimWil.filter(w => w.id_tim === session.id_tim);
        const daftarDusun = wilayahKerja.map(w => w.dusun_rw).join(', ') || '-';
        const desa = wilayahKerja.length > 0 ? wilayahKerja[0].desa_kelurahan : '-';
        const kec = wilayahKerja.length > 0 ? wilayahKerja[0].kecamatan : '-';

        area.innerHTML = `
            <div class="animate-fade">
                <div class="card" style="background: linear-gradient(135deg, #0d6efd, #0043a8); color: white; border:none; margin-bottom: 20px; padding: 25px;">
                    <p style="margin:0; opacity: 0.8; font-size: 0.9rem;">Selamat Datang,</p>
                    <h2 style="margin: 5px 0; font-size: 1.5rem;">${session.nama}</h2>
                    <p style="margin:0; font-size: 0.8rem; opacity: 0.7;">No. Tim: ${session.id_tim}</p>
                    <hr style="margin: 15px 0; border:0; border-top:1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 0.85rem; line-height: 1.6;">
                        <div>📍 <b>Dusun:</b> ${daftarDusun}</div>
                        <div>🏘️ <b>Desa:</b> ${desa}</div>
                        <div>🏛️ <b>Kec:</b> ${kec}</div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="card" style="text-align:center;">
                        <div style="font-size: 1.5rem;">📦</div>
                        <h3>${antrean.length}</h3>
                        <p style="font-size: 0.7rem; color: #666;">TERTUNDA</p>
                    </div>
                    <div class="card" style="text-align:center; cursor:pointer;" onclick="renderKonten('registrasi')">
                        <div style="font-size: 1.5rem;">➕</div>
                        <h3>BARU</h3>
                        <p style="font-size: 0.7rem; color: #666;">REGISTRASI</p>
                    </div>
                </div>
            </div>`;
    } else if (target === 'registrasi') {
        const temp = getEl('template-registrasi');
        area.innerHTML = '';
        area.appendChild(temp.content.cloneNode(true));
        initFormRegistrasi();
    }
};

// ==========================================
// 4. FORM REGISTRASI
// ==========================================
const initFormRegistrasi = async () => {
    const session = window.currentUser;
    const allWil = await getAllData('master_tim_wilayah');
    const tugas = allWil.filter(w => w.id_tim === session.id_tim);

    const selDesa = getEl('reg-desa');
    const selDusun = getEl('reg-dusun');
    
    if (selDesa) {
        const daftarDesa = [...new Set(tugas.map(w => w.desa_kelurahan))];
        selDesa.innerHTML = '<option value="">-- Pilih Desa --</option>' + 
            daftarDesa.map(d => `<option value="${d}">${d}</option>`).join('');

        selDesa.onchange = () => {
            const dusunFiltered = tugas.filter(w => w.desa_kelurahan === selDesa.value);
            selDusun.innerHTML = '<option value="">-- Pilih Dusun --</option>' + 
                dusunFiltered.map(d => `<option value="${d.dusun_rw}">${d.dusun_rw}</option>`).join('');
        };
    }

    const q = await getAllData('master_pertanyaan');
    const containerQ = getEl('pertanyaan-dinamis');
    if (containerQ) {
        containerQ.innerHTML = q.sort((a,b) => a.urutan - b.urutan).map(item => {
            if(item.is_active !== 'Y') return '';
            return `<div class="form-group"><label>${item.label_pertanyaan}</label><input type="text" name="${item.id_pertanyaan}" class="form-control"></div>`;
        }).join('');
    }
};

// ==========================================
// 5. LOGIN, LOGOUT & SIDEBAR
// ==========================================
const fLogin = getEl('form-login');
if (fLogin) {
    fLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = getEl('kader-id').value.trim();
        const pin = getEl('kader-pin').value.trim();
        const user = await getDataById('master_user', id);
        
        if (!user) return alert("ID tidak ditemukan!");
        const pBenar = user.password_awal_ref ? user.password_awal_ref.toString() : "";
        
        if (pBenar === pin) {
            let nama = user.username, tim = '-';
            if (user.role_akses === 'KADER') {
                const d = await getDataById('master_kader', user.ref_id);
                if (d) { nama = d.nama_kader; tim = d.id_tim; }
            }
            const ses = { id_kader: 'active_user', username: user.username, role: user.role_akses, nama, id_tim: tim };
            await putData('kader_session', ses);
            masukKeAplikasi(ses);
        } else { alert("PIN salah!"); }
    });
}

window.logout = async () => {
    if (confirm("Keluar?")) { await deleteData('kader_session', 'active_user'); location.reload(); }
};

if (getEl('btn-menu')) getEl('btn-menu').onclick = () => { getEl('sidebar').classList.add('active'); getEl('sidebar-overlay').classList.add('active'); };
if (getEl('sidebar-overlay')) getEl('sidebar-overlay').onclick = () => { getEl('sidebar').classList.remove('active'); getEl('sidebar-overlay').classList.remove('active'); };

document.addEventListener('DOMContentLoaded', initApp);
