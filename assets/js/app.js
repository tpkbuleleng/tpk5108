import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData } from './sync.js';

// Helper agar tidak error jika elemen tidak ditemukan
const getEl = (id) => document.getElementById(id);

const initApp = async () => {
    try {
        console.log("Memulai Database...");
        await initDB();
        
        // Cek Sesi
        const session = await getDataById('kader_session', 'active_user');
        
        // Timer Splash Screen
        setTimeout(() => {
            const splash = getEl('view-splash');
            if (splash) splash.style.display = 'none'; // Paksa sembunyi
            
            if (session) {
                console.log("Masuk sebagai:", session.nama);
                masukKeAplikasi(session);
            } else {
                tampilkanLayar('login');
            }
        }, 1500);

    } catch (err) {
        console.error("Kritis:", err);
        // Jika DB gagal, tetap tampilkan login agar tidak putih
        const splash = getEl('view-splash');
        if (splash) splash.style.display = 'none';
        tampilkanLayar('login');
    }
};

// Fungsi Pindah Layar yang Kuat
const tampilkanLayar = (id) => {
    const vLogin = getEl('view-login');
    const vApp = getEl('view-app');
    const vSplash = getEl('view-splash');

    // Sembunyikan Splash secara paksa
    if (vSplash) vSplash.style.display = 'none';

    if (id === 'login') {
        if (vLogin) vLogin.classList.remove('hidden');
        if (vApp) vApp.classList.add('hidden');
        console.log("Layar Login tampil sekarang.");
    } else if (id === 'app') {
        if (vLogin) vLogin.classList.add('hidden');
        if (vApp) vApp.classList.remove('hidden');
        console.log("Layar Aplikasi tampil sekarang.");
    }
};

const masukKeAplikasi = (session) => {
    window.currentUser = session;
    const greeting = getEl('user-greeting');
    if (greeting) greeting.innerText = `Dashboard ${session.role}`;
    
    // Set profil sidebar
    if (getEl('sidebar-nama')) getEl('sidebar-nama').innerText = session.nama;
    if (getEl('sidebar-role')) getEl('sidebar-role').innerText = session.role;
    
    renderMenu(session.role);
    tampilkanLayar('app');
};

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
    `).join('') + `<hr><a class="menu-item text-danger" onclick="logout()">🚪 Keluar</a>`;

    document.querySelectorAll('.menu-item[data-target]').forEach(item => {
        item.onclick = () => {
            toggleSidebar(false);
            renderKonten(item.getAttribute('data-target'));
        };
    });
};

const renderKonten = (target) => {
    const area = getEl('content-area');
    if (!area) return;

    if (target === 'registrasi') {
        const temp = getEl('template-registrasi');
        if (temp) {
            area.innerHTML = '';
            area.appendChild(temp.content.cloneNode(true));
            // Panggil init form nanti jika sudah muncul
        }
    } else {
        area.innerHTML = `<div class="card"><h3>Menu ${target.toUpperCase()}</h3></div>`;
    }
};

const toggleSidebar = (show) => {
    const sb = getEl('sidebar');
    const ov = getEl('sidebar-overlay');
    if (sb && ov) {
        sb.classList.toggle('active', show);
        ov.classList.toggle('active', show);
    }
};

// Event dasar
if (getEl('btn-menu')) getEl('btn-menu').onclick = () => toggleSidebar(true);
if (getEl('sidebar-overlay')) getEl('sidebar-overlay').onclick = () => toggleSidebar(false);

window.logout = async () => {
    await deleteData('kader_session', 'active_user');
    location.reload();
};

document.addEventListener('DOMContentLoaded', initApp);
