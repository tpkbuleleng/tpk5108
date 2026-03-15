import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData } from './sync.js';

// ==========================================
// 1. ELEMEN UI (Gunakan Selector yang Aman)
// ==========================================
const getEl = (id) => document.getElementById(id);

// ==========================================
// 2. INISIALISASI APLIKASI
// ==========================================
const initApp = async () => {
    try {
        console.log("Inisialisasi Database...");
        await initDB();
        
        // Pantau Koneksi
        updateNetworkStatus();
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);

        const session = await getDataById('kader_session', 'active_user');

        // SPLASH SCREEN TIMER
        setTimeout(async () => {
            const viewSplash = getEl('view-splash');
            if (viewSplash) viewSplash.classList.remove('active');
            
            if (session) {
                console.log("Sesi ditemukan, masuk aplikasi...");
                masukKeAplikasi(session);
            } else {
                console.log("Sesi tidak ada, ke layar login...");
                tampilkanLayar('login');
            }

            // Download Data Master jika kosong
            const users = await getAllData('master_user');
            if (users.length === 0 && navigator.onLine) {
                const btnLogin = getEl('btn-login-submit');
                if(btnLogin) btnLogin.innerText = "Mengunduh Data...";
                await downloadMasterData();
                if(btnLogin) btnLogin.innerText = "Masuk";
            }
        }, 1500);
    } catch (err) { 
        console.error("Gagal inisialisasi aplikasi:", err);
        // Jika error berat, paksa ke login agar tidak stuck putih
        tampilkanLayar('login');
    }
};

// ==========================================
// 3. LOGIKA LOGIN
// ==========================================
const formLogin = getEl('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idInput = getEl('kader-id').value.trim();
        const passInput = getEl('kader-pin').value.trim();

        try {
            const user = await getDataById('master_user', idInput);

            if (!user) return alert("ID tidak terdaftar!");
            
            // Cek password sesuai header USER_LOGIN Anda
            const passBenar = user.password_awal_ref ? user.password_awal_ref.toString() : "";
            if (passBenar !== passInput) return alert("Password Salah!");

            let namaTampil = user.username;
            let idTim = '-';

            if (user.role_akses === 'KADER') {
                const detail = await getDataById('master_kader', user.ref_id);
                if (detail) {
                    namaTampil = detail.nama_kader;
                    idTim = detail.id_tim;
                }
            }

            const session = {
                id_kader: 'active_user',
                username: user.username,
                role: user.role_akses,
                nama: namaTampil,
                id_tim: idTim
            };

            await putData('kader_session', session);
            masukKeAplikasi(session);
        } catch (err) {
            alert("Error login: " + err.message);
        }
    });
}

// ==========================================
// 4. NAVIGATION & SIDEBAR
// ==========================================
const masukKeAplikasi = (session) => {
    window.currentUser = session;
    const greeting = getEl('user-greeting');
    const sideNama = getEl('sidebar-nama');
    const sideRole = document.getElementById('sidebar-role');

    if (greeting) greeting.innerText = `Dashboard ${session.role}`;
    if (sideNama) sideNama.innerText = session.nama;
    if (sideRole) sideRole.innerText = session.role;
    
    renderMenu(session.role);
    tampilkanLayar('app');
};

const renderMenu = (role) => {
    const menuContainer = getEl('dynamic-menu-container');
    if (!menuContainer) return;

    let menus = [];
    const r = role ? role.toUpperCase() : "";

    if (r === 'KADER') {
        menus = [
            { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
            { id: 'registrasi', icon: '📝', label: 'Registrasi Sasaran' },
            { id: 'pendampingan', icon: '🤝', label: 'Pendampingan' },
            { id: 'sinkronisasi', icon: '🔄', label: 'Sinkronisasi' }
        ];
    } else {
        // Default Super Admin / Other Roles
        menus = [
            { id: 'dashboard_sys', icon: '🖥️', label: 'Dashboard Sistem' },
            { id: 'kelola_akun', icon: '👥', label: 'Kelola Akun' },
            { id: 'master_wilayah', icon: '🗺️', label: 'Master Wilayah' }
        ];
    }

    let html = menus.map(m => `
        <a class="menu-item" data-target="${m.id}">
            <span class="icon">${m.icon}</span> ${m.label}
        </a>
    `).join('');
    
    html += `<hr><a class="menu-item text-danger" id="btn-logout-side">🚪 Keluar</a>`;
    menuContainer.innerHTML = html;

    // Event Logout
    const btnLogout = getEl('btn-logout-side');
    if(btnLogout) btnLogout.onclick = logout;

    // Event Klik Menu
    document.querySelectorAll('.menu-item[data-target]').forEach(item => {
        item.onclick = () => {
            const target = item.getAttribute('data-target');
            toggleSidebar(false);
            renderKonten(target);
        };
    });
};

const renderKonten = (target) => {
    const contentArea = getEl('content-area');
    if (!contentArea) return;

    if (target === 'registrasi') {
        const template = getEl('template-registrasi');
        if (template) {
            contentArea.innerHTML = '';
            contentArea.appendChild(template.content.cloneNode(true));
            initFormRegistrasi();
        }
    } else {
        contentArea.innerHTML = `
            <div class="card">
                <h3>Menu ${target.toUpperCase()}</h3>
                <p>Halaman ini sedang dalam pengembangan.</p>
            </div>`;
    }
};

// ==========================================
// 5. LOGIKA FORM REGISTRASI
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

        // Load Pertanyaan
        const questions = await getAllData('master_pertanyaan');
        if (containerQ) {
            containerQ.innerHTML = questions.sort((a,b) => a.urutan - b.urutan).map(q => {
                if(q.is_active !== 'Y') return '';
                let input = `<input type="text" name="${q.id_pertanyaan}" class="form-control" ${q.is_required === 'Y'?'required':''}>`;
                return `<div class="form-group"><label>${q.label_pertanyaan}</label>${input}</div>`;
            }).join('');
        }
    } catch (err) { console.error("Gagal load form:", err); }
};

// ==========================================
// 6. UTILS (Perbaikan Navigasi Layar)
// ==========================================
const tampilkanLayar = (id) => {
    const viewLogin = getEl('view-login');
    const viewApp = getEl('view-app');
    
    if (viewLogin && viewApp) {
        if (id === 'login') {
            viewLogin.classList.remove('hidden');
            viewApp.classList.add('hidden');
        } else {
            viewLogin.classList.add('hidden');
            viewApp.classList.remove('hidden');
        }
    }
};

const toggleSidebar = (show) => {
    const sidebar = getEl('sidebar');
    const overlay = getEl('sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('active', show);
        overlay.classList.toggle('active', show);
    }
};

const updateNetworkStatus = () => {
    const status = getEl('network-status');
    if (status) {
        status.innerText = navigator.onLine ? 'Online' : 'Offline Mode';
        status.className = 'status-badge ' + (navigator.onLine ? 'online' : 'offline');
    }
};

window.logout = async () => {
    if(confirm("Keluar dari aplikasi?")) {
        await deleteData('kader_session', 'active_user');
        location.reload();
    }
};

// Event Listeners Dasar
const btnMenu = getEl('btn-menu');
if (btnMenu) btnMenu.onclick = () => toggleSidebar(true);

const sidebarOverlay = getEl('sidebar-overlay');
if (sidebarOverlay) sidebarOverlay.onclick = () => toggleSidebar(false);

document.addEventListener('DOMContentLoaded', initApp);
