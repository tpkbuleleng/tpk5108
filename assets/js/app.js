import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData } from './sync.js';

const getEl = (id) => document.getElementById(id);

// 1. NAVIGASI LAYAR
const tampilkanLayar = (id) => {
    const vSplash = getEl('view-splash');
    const vLogin = getEl('view-login');
    const vApp = getEl('view-app');

    // Pastikan Splash Hilang
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

// 2. INISIALISASI
const initApp = async () => {
    try {
        await initDB();
        const session = await getDataById('kader_session', 'active_user');

        if (session) {
            masukKeAplikasi(session);
        } else {
            tampilkanLayar('login');
        }
    } catch (err) {
        console.error(err);
        tampilkanLayar('login');
    }
};

const masukKeAplikasi = async (session) => {
    window.currentUser = session;
    
    // Update Header & Sidebar
    const greeting = getEl('user-greeting');
    if (greeting) greeting.innerText = `DASHBOARD KADER`;

    if (getEl('sidebar-nama')) getEl('sidebar-nama').innerText = session.nama;
    
    renderMenu(session.role);
    renderKonten('dashboard'); 
    tampilkanLayar('app');
};

// 3. MENU & KONTEN
const renderMenu = (role) => {
    const container = getEl('dynamic-menu-container');
    if (!container) return;

    const menus = [
        { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
        { id: 'registrasi', icon: '📝', label: 'Registrasi Sasaran' }
    ];

    container.innerHTML = menus.map(m => `
        <a class="menu-item" onclick="renderKonten('${m.id}')">
            <span>${m.icon}</span> ${m.label}
        </a>
    `).join('') + `<hr><a class="menu-item text-danger" onclick="window.logout()"> Keluar</a>`;
};

window.renderKonten = async (target) => {
    const area = getEl('content-area');
    if (!area) return;

    if (target === 'dashboard') {
        area.innerHTML = `
            <div class="card" style="background: #0d6efd; color: white; padding: 20px;">
                <h2>Selamat Datang, ${window.currentUser.nama}</h2>
                <p>Nomor Tim: ${window.currentUser.nomor_tim}</p>
            </div>`;
    } else if (target === 'registrasi') {
        const temp = getEl('template-registrasi');
        area.innerHTML = '';
        area.appendChild(temp.content.cloneNode(true));
    }
};

// 4. LOGIKA LOGIN (Perbaikan Tombol)
const formLogin = getEl('form-login');
if (formLogin) {
    formLogin.onsubmit = async (e) => {
        e.preventDefault();
        const id = getEl('kader-id').value.trim();
        const pin = getEl('kader-pin').value.trim();

        try {
            const user = await getDataById('master_user', id);
            if (!user) {
                alert("ID tidak terdaftar!");
                return;
            }

            if (user.password_awal_ref.toString() === pin) {
                let nama = user.username;
                let tim = '-';
                
                // Cari Nama Kader
                const k = await getDataById('master_kader', user.ref_id);
                if (k) { nama = k.nama_kader; tim = k.id_tim; }

                const ses = { 
                    id_kader: 'active_user', 
                    username: user.username, 
                    role: user.role_akses, 
                    nama: nama, 
                    id_tim: tim,
                    nomor_tim: tim 
                };

                await putData('kader_session', ses);
                masukKeAplikasi(ses);
            } else {
                alert("PIN Salah!");
            }
        } catch (error) {
            alert("Terjadi kesalahan sistem.");
        }
    };
}

window.logout = async () => {
    if (confirm("Keluar?")) {
        await deleteData('kader_session', 'active_user');
        location.reload();
    }
};

document.addEventListener('DOMContentLoaded', initApp);
