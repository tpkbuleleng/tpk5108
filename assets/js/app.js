import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData } from './sync.js';

const getEl = (id) => document.getElementById(id);

// --- FUNGSI NAVIGASI LAYAR ---
const tampilkanLayar = (id) => {
    console.log("Berpindah ke layar:", id);
    const vSplash = getEl('view-splash');
    const vLogin = getEl('view-login');
    const vApp = getEl('view-app');

    // Sembunyikan Splash secara paksa
    if (vSplash) {
        vSplash.classList.remove('active');
        vSplash.style.display = 'none'; // Tambahan pengaman
    }

    if (id === 'login') {
        if (vLogin) vLogin.classList.remove('hidden');
        if (vApp) vApp.classList.add('hidden');
    } else if (id === 'app') {
        if (vLogin) vLogin.classList.add('hidden');
        if (vApp) vApp.classList.remove('hidden');
    }
};

// --- INISIALISASI APLIKASI ---
const initApp = async () => {
    // FAILSAFE: Jika dalam 4 detik masih stuck di logo, paksa ke login
    const logoTimeout = setTimeout(() => {
        const vSplash = getEl('view-splash');
        if (vSplash && vSplash.classList.contains('active')) {
            console.warn("Failsafe: Splash screen terlalu lama, memaksa pindah.");
            tampilkanLayar('login');
        }
    }, 4000);

    try {
        console.log("Inisialisasi Database...");
        await initDB();
        
        const session = await getDataById('kader_session', 'active_user');

        if (session) {
            console.log("Sesi aktif ditemukan.");
            masukKeAplikasi(session);
        } else {
            console.log("Tidak ada sesi, cek data master...");
            tampilkanLayar('login');
            
            // Cek apakah data master sudah ada, jika belum download di background
            const users = await getAllData('master_user');
            if (users.length === 0 && navigator.onLine) {
                console.log("Data master kosong, mengunduh...");
                await downloadMasterData();
            }
        }
        clearTimeout(logoTimeout); // Matikan failsafe jika sukses
    } catch (err) {
        console.error("Gagal inisialisasi:", err);
        clearTimeout(logoTimeout);
        tampilkanLayar('login');
    }
};

const masukKeAplikasi = (session) => {
    window.currentUser = session;
    
    if (getEl('user-greeting')) getEl('user-greeting').innerText = `Dashboard ${session.role}`;
    if (getEl('sidebar-nama')) getEl('sidebar-nama').innerText = session.nama;
    if (getEl('sidebar-role')) getEl('sidebar-role').innerText = session.role;
    
    renderMenu(session.role);
    tampilkanLayar('app');
};

// --- LOGIKA LOGIN ---
const formLogin = getEl('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = getEl('btn-login-submit');
        btn.disabled = true;
        btn.innerText = "Memproses...";

        const idInput = getEl('kader-id').value.trim();
        const passInput = getEl('kader-pin').value.trim();

        try {
            const user = await getDataById('master_user', idInput);
            if (!user) {
                alert("ID tidak terdaftar!");
                btn.disabled = false; btn.innerText = "Masuk";
                return;
            }

            const passBenar = user.password_awal_ref ? user.password_awal_ref.toString() : "";
            if (passBenar === passInput) {
                let namaTampil = user.username;
                let idTim = '-';

                if (user.role_akses === 'KADER') {
                    const detail = await getDataById('master_kader', user.ref_id);
                    if (detail) {
                        namaTampil = detail.nama_kader;
                        idTim = detail.id_tim;
                    }
                }

                const sessionData = {
                    id_kader: 'active_user',
                    username: user.username,
                    role: user.role_akses,
                    nama: namaTampil,
                    id_tim: idTim
                };

                await putData('kader_session', sessionData);
                masukKeAplikasi(sessionData);
            } else {
                alert("Password salah!");
                btn.disabled = false; btn.innerText = "Masuk";
            }
        } catch (err) {
            alert("Error: " + err.message);
            btn.disabled = false; btn.innerText = "Masuk";
        }
    });
}

// --- MENU & KONTEN ---
const renderMenu = (role) => {
    const container = getEl('dynamic-menu-container');
    if (!container) return;
    const r = role ? role.toUpperCase() : "";

    const menus = (r === 'KADER') ? [
        { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
        { id: 'registrasi', icon: '📝', label: 'Registrasi' },
        { id: 'sinkronisasi', icon: '🔄', label: 'Sinkronisasi' }
    ] : [
        { id: 'dashboard_sys', icon: '🖥️', label: 'Dashboard Sistem' },
        { id: 'master_wilayah', icon: '🗺️', label: 'Master Wilayah' }
    ];

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

const renderKonten = (target) => {
    const area = getEl('content-area');
    if (!area) return;
    if (target === 'registrasi') {
        const temp = getEl('template-registrasi');
        area.innerHTML = '';
        area.appendChild(temp.content.cloneNode(true));
    } else {
        area.innerHTML = `<div class="content-card"><h3>Menu ${target.toUpperCase()}</h3></div>`;
    }
};

window.logout = async () => {
    if (confirm("Keluar?")) {
        await deleteData('kader_session', 'active_user');
        location.reload();
    }
};

// Event Sidebar
if (getEl('btn-menu')) getEl('btn-menu').onclick = () => {
    getEl('sidebar').classList.add('active');
    getEl('sidebar-overlay').classList.add('active');
};
if (getEl('sidebar-overlay')) getEl('sidebar-overlay').onclick = () => {
    getEl('sidebar').classList.remove('active');
    getEl('sidebar-overlay').classList.remove('active');
};

document.addEventListener('DOMContentLoaded', initApp);
