import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData } from './sync.js';

const getEl = (id) => document.getElementById(id);

// --- FUNGSI NAVIGASI LAYAR (Kunci Perbaikan) ---
const tampilkanLayar = (id) => {
    const vSplash = getEl('view-splash');
    const vLogin = getEl('view-login');
    const vApp = getEl('view-app');

    // Sembunyikan semua dulu
    if (vSplash) vSplash.classList.remove('active');
    if (vLogin) vLogin.classList.add('hidden');
    if (vApp) vApp.classList.add('hidden');

    // Tampilkan yang dipilih
    if (id === 'login') {
        vLogin.classList.remove('hidden');
    } else if (id === 'app') {
        vApp.classList.remove('hidden');
    } else if (id === 'splash') {
        vSplash.classList.add('active');
    }
};

const initApp = async () => {
    try {
        await initDB();
        updateNetworkStatus();

        // Cek apakah sudah ada user yang login
        const session = await getDataById('kader_session', 'active_user');

        // Beri waktu splash screen tampil sebentar
        setTimeout(() => {
            if (session) {
                masukKeAplikasi(session);
            } else {
                tampilkanLayar('login');
            }
        }, 1500);

        // Download data master jika database kosong (Background process)
        const users = await getAllData('master_user');
        if (users.length === 0 && navigator.onLine) {
            await downloadMasterData();
        }
    } catch (err) {
        console.error("Init Error:", err);
        tampilkanLayar('login');
    }
};

const masukKeAplikasi = (session) => {
    window.currentUser = session;
    
    // Update UI Header & Sidebar
    if (getEl('user-greeting')) getEl('user-greeting').innerText = `Dashboard ${session.role}`;
    if (getEl('sidebar-nama')) getEl('sidebar-nama').innerText = session.nama;
    if (getEl('sidebar-role')) getEl('sidebar-role').innerText = session.role;
    
    renderMenu(session.role);
    tampilkanLayar('app'); // Pindah ke layar utama
};

// --- LOGIKA FORM LOGIN ---
const formLogin = getEl('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = getEl('btn-login-submit');
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Memproses...";

        const idInput = getEl('kader-id').value.trim();
        const passInput = getEl('kader-pin').value.trim();

        try {
            const user = await getDataById('master_user', idInput);

            if (!user) {
                alert("ID Pengguna tidak ditemukan!");
                btnSubmit.disabled = false;
                btnSubmit.innerText = "Masuk";
                return;
            }

            const passBenar = user.password_awal_ref ? user.password_awal_ref.toString() : "";
            
            if (passBenar === passInput) {
                // Login Berhasil
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
                btnSubmit.disabled = false;
                btnSubmit.innerText = "Masuk";
            }
        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan sistem.");
            btnSubmit.disabled = false;
            btnSubmit.innerText = "Masuk";
        }
    });
}

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

    // Event Klik Menu
    document.querySelectorAll('.menu-item[data-target]').forEach(item => {
        item.onclick = () => {
            const target = item.getAttribute('data-target');
            getEl('sidebar').classList.remove('active');
            getEl('sidebar-overlay').classList.remove('active');
            renderKonten(target);
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
        // Fungsi initFormRegistrasi bisa dipanggil di sini
    } else {
        area.innerHTML = `<div class="content-card"><h3>Menu ${target.toUpperCase()}</h3><p>Dalam pengembangan.</p></div>`;
    }
};

// --- UTILS ---
const updateNetworkStatus = () => {
    const status = getEl('network-status');
    if (status) {
        status.innerText = navigator.onLine ? 'Online' : 'Offline';
        status.className = 'status-badge ' + (navigator.onLine ? 'online' : 'offline');
    }
};

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

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
document.addEventListener('DOMContentLoaded', initApp);
