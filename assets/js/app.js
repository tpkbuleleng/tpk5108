import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData } from './sync.js';

// ==========================================
// 1. ELEMEN UI
// ==========================================
const viewSplash = document.getElementById('view-splash');
const viewLogin = document.getElementById('view-login');
const viewApp = document.getElementById('view-app');
const contentArea = document.getElementById('content-area');
const menuContainer = document.getElementById('dynamic-menu-container');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// ==========================================
// 2. INISIALISASI APLIKASI
// ==========================================
const initApp = async () => {
    try {
        await initDB();
        
        // Pantau Koneksi
        updateNetworkStatus();
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);

        const session = await getDataById('kader_session', 'active_user');

        setTimeout(async () => {
            viewSplash.classList.remove('active');
            
            if (session) {
                masukKeAplikasi(session);
            } else {
                tampilkanLayar('login');
            }

            // Cek Master Data di latar belakang
            const users = await getAllData('master_user');
            if (users.length === 0 && navigator.onLine) {
                const btnLogin = document.getElementById('btn-login-submit');
                if(btnLogin) btnLogin.innerText = "Mengunduh Data...";
                await downloadMasterData();
                if(btnLogin) btnLogin.innerText = "Masuk";
            }
        }, 1500);
    } catch (err) { console.error(err); }
};

// ==========================================
// 3. LOGIKA LOGIN (RBAC)
// ==========================================
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idInput = document.getElementById('kader-id').value.trim();
    const passInput = document.getElementById('kader-pin').value.trim();

    const user = await getDataById('master_user', idInput);

    if (!user) return alert("ID tidak terdaftar!");
    
    // Gunakan header 'password_awal_ref' sesuai Sheet Anda
    const passBenar = user.password_awal_ref ? user.password_awal_ref.toString() : "";
    if (passBenar !== passInput) return alert("Password Salah!");

    let namaTampil = user.username;
    let idTim = '-';

    // Cari detail jika Role adalah KADER
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
        role: user.role_akses, // KADER, ADMIN_KECAMATAN, SUPER_ADMIN, dll
        nama: namaTampil,
        id_tim: idTim
    };

    await putData('kader_session', session);
    masukKeAplikasi(session);
});

// ==========================================
// 4. NAVIGATION & SIDEBAR
// ==========================================
const masukKeAplikasi = (session) => {
    window.currentUser = session;
    document.getElementById('user-greeting').innerText = `Dashboard ${session.role}`;
    document.getElementById('sidebar-nama').innerText = session.nama;
    document.getElementById('sidebar-role').innerText = session.role;
    
    renderMenu(session.role);
    tampilkanLayar('app');
};

const renderMenu = (role) => {
    let menus = [];
    const r = role.toUpperCase();

    if (r === 'KADER') {
        menus = [
            { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
            { id: 'registrasi', icon: '📝', label: 'Registrasi Sasaran' },
            { id: 'pendampingan', icon: '🤝', label: 'Pendampingan' },
            { id: 'sinkronisasi', icon: '🔄', label: 'Sinkronisasi' }
        ];
    } else if (r === 'SUPER_ADMIN') {
        menus = [
            { id: 'dashboard_sys', icon: '🖥️', label: 'Dashboard Sistem' },
            { id: 'kelola_akun', icon: '👥', label: 'Kelola Akun' },
            { id: 'master_wilayah', icon: '🗺️', label: 'Master Wilayah' }
        ];
    } // Tambahkan else if untuk role lain sesuai kebutuhan

    let html = menus.map(m => `
        <a class="menu-item" data-target="${m.id}">
            <span class="icon">${m.icon}</span> ${m.label}
        </a>
    `).join('');
    
    html += `<hr><a class="menu-item text-danger" onclick="logout()">🚪 Keluar</a>`;
    menuContainer.innerHTML = html;

    document.querySelectorAll('.menu-item[data-target]').forEach(item => {
        item.onclick = () => {
            const target = item.getAttribute('data-target');
            toggleSidebar(false);
            renderKonten(target);
        };
    });
};

const renderKonten = (target) => {
    if (target === 'registrasi') {
        const template = document.getElementById('template-registrasi');
        contentArea.innerHTML = '';
        contentArea.appendChild(template.content.cloneNode(true));
        initFormRegistrasi();
    } else {
        contentArea.innerHTML = `<div class="card"><h3>Menu ${target.toUpperCase()}</h3><p>Halaman sedang dikembangkan.</p></div>`;
    }
};

// ==========================================
// 5. LOGIKA FORM REGISTRASI (AUTO-FILTER)
// ==========================================
const initFormRegistrasi = async () => {
    const session = window.currentUser;
    const allWilayahTim = await getAllData('master_tim_wilayah');
    const wilayahTugas = allWilayahTim.filter(w => w.id_tim === session.id_tim);

    const selDesa = document.getElementById('reg-desa');
    const selDusun = document.getElementById('reg-dusun');
    const containerQ = document.getElementById('pertanyaan-dinamis');

    // Load Desa
    const daftarDesa = [...new Set(wilayahTugas.map(w => w.desa_kelurahan))];
    selDesa.innerHTML = '<option value="">-- Pilih Desa --</option>' + 
        daftarDesa.map(d => `<option value="${d}">${d}</option>`).join('');

    selDesa.onchange = () => {
        const dusunFiltered = wilayahTugas.filter(w => w.desa_kelurahan === selDesa.value);
        selDusun.innerHTML = '<option value="">-- Pilih Dusun --</option>' + 
            dusunFiltered.map(d => `<option value="${d.dusun_rw}">${d.dusun_rw}</option>`).join('');
    };

    // Load Pertanyaan Dinamis
    const questions = await getAllData('master_pertanyaan');
    containerQ.innerHTML = questions.sort((a,b) => a.urutan - b.urutan).map(q => {
        if(q.is_active !== 'Y') return '';
        let input = `<input type="text" name="${q.id_pertanyaan}" class="form-control" ${q.is_required === 'Y'?'required':''}>`;
        if(q.tipe_input === 'SELECT'){
            const opsi = JSON.parse(q.opsi_json || '[]');
            input = `<select name="${q.id_pertanyaan}" class="form-control">${opsi.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>`;
        }
        return `<div class="form-group"><label>${q.label_pertanyaan}</label>${input}</div>`;
    }).join('');
};

// ==========================================
// 6. UTILS
// ==========================================
const tampilkanLayar = (id) => {
    viewLogin.classList.toggle('hidden', id !== 'login');
    viewApp.classList.toggle('hidden', id !== 'app');
};

const toggleSidebar = (show) => {
    sidebar.classList.toggle('active', show);
    sidebarOverlay.classList.toggle('active', show);
};

const updateNetworkStatus = () => {
    const status = document.getElementById('network-status');
    status.innerText = navigator.onLine ? 'Online' : 'Offline Mode';
    status.className = 'status-badge ' + (navigator.onLine ? 'online' : 'offline');
};

window.logout = async () => {
    if(confirm("Keluar?")) {
        await deleteData('kader_session', 'active_user');
        location.reload();
    }
};

document.getElementById('btn-menu').onclick = () => toggleSidebar(true);
sidebarOverlay.onclick = () => toggleSidebar(false);

document.addEventListener('DOMContentLoaded', initApp);
