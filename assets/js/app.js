import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData, uploadLaporanTunda } from './sync.js';

// ==========================================
// 1. DEKLARASI ELEMEN UI
// ==========================================
const viewSplash = document.getElementById('view-splash');
const viewLogin = document.getElementById('view-login');
const viewApp = document.getElementById('view-app');
const formLogin = document.getElementById('form-login');
const userGreeting = document.getElementById('user-greeting');
const networkStatus = document.getElementById('network-status');
const contentArea = document.getElementById('content-area');

// Elemen Sidebar
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const btnMenu = document.getElementById('btn-menu');
const sidebarNama = document.getElementById('sidebar-nama');
const sidebarRole = document.getElementById('sidebar-role');
const menuContainer = document.getElementById('dynamic-menu-container');

// ==========================================
// 2. FUNGSI INISIALISASI & SPLASH SCREEN
// ==========================================
const initApp = async () => {
    try {
        await initDB();
        
        updateNetworkStatus();
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);

        // Cek Sesi Login di Database HP
        const session = await getDataById('kader_session', 'active_user');

        // SPLASH SCREEN LOGIC: Beri jeda 1.5 detik agar animasi terlihat
        setTimeout(async () => {
            // Tutup Splash Screen
            viewSplash.classList.remove('active');
            
            // Cek Master Data (Jika belum pernah download)
            const users = await getAllData('master_user');
            if (users.length === 0 && navigator.onLine) {
                const btnLogin = document.getElementById('btn-login-submit');
                if(btnLogin) {
                    btnLogin.innerText = "Mengunduh Data Master...";
                    btnLogin.disabled = true;
                }
                await downloadMasterData();
                if(btnLogin) {
                    btnLogin.innerText = "Masuk";
                    btnLogin.disabled = false;
                }
            }

            // Arahkan ke halaman yang tepat
            if (session) {
                masukKeAplikasi(session);
            } else {
                tampilkanLayar('login');
            }
        }, 1500); // 1500 ms = 1.5 detik

    } catch (error) {
        console.error("Gagal inisialisasi:", error);
    }
};

// ==========================================
// 3. LOGIKA LOGIN & SIDES MENU (RBAC)
// ==========================================
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const inputId = document.getElementById('kader-id').value.trim();
    const inputPin = document.getElementById('kader-pin').value.trim();

    try {
        const user = await getDataById('master_user', inputId);

        if (!user) return alert("ID Pengguna tidak terdaftar!");
        if (user.password.toString() !== inputPin) return alert("PIN/Password salah!");

        // Ambil nama dari tabel kader atau set default untuk Admin
        let namaPengguna = user.username;
        let idTim = '-';
        
        if (user.role === 'Kader') {
            const detailKader = await getDataById('master_kader', user.id_referensi);
            if (detailKader) {
                namaPengguna = detailKader.nama_kader;
                idTim = detailKader.id_tim;
            }
        } else {
            // Untuk Admin (Bisa disesuaikan jika punya tabel master_admin)
            namaPengguna = user.username.toUpperCase(); 
        }

        const sessionData = {
            id_kader: 'active_user', 
            username: user.username,
            role: user.role, // PERAN SANGAT PENTING
            nama: namaPengguna,
            id_tim: idTim,
            login_time: new Date().toISOString()
        };

        await putData('kader_session', sessionData);
        formLogin.reset();
        masukKeAplikasi(sessionData);

    } catch (error) {
        console.error("Error saat login:", error);
        alert("Terjadi kesalahan sistem saat login.");
    }
});

// ==========================================
// 4. MANAJEMEN LAYAR & SIDEBAR
// ==========================================
const tampilkanLayar = (layar) => {
    viewSplash.classList.remove('active');
    if (layar === 'login') {
        viewApp.classList.remove('active');
        viewLogin.classList.add('active');
    } else {
        viewLogin.classList.remove('active');
        viewApp.classList.add('active');
    }
};

const toggleSidebar = () => {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
};

btnMenu.addEventListener('click', toggleSidebar);
sidebarOverlay.addEventListener('click', toggleSidebar);

const masukKeAplikasi = (sessionData) => {
    window.currentUser = sessionData; 
    
    // Update Header & Profil Sidebar
    userGreeting.innerText = sessionData.role === 'Kader' ? 'Dashboard Kader' : `Dashboard ${sessionData.role}`;
    sidebarNama.innerText = sessionData.nama;
    sidebarRole.innerText = sessionData.role;

    // Render Menu sesuai Jabatan
    renderMenuBerdasarkanRole(sessionData.role);
    tampilkanLayar('app');
};

// ==========================================
// 5. DATA MENU DINAMIS (Berdasarkan Spesifikasi Anda)
// ==========================================
const renderMenuBerdasarkanRole = (role) => {
    let daftarMenu = [];

    if (role === 'Kader') {
        daftarMenu = [
            { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
            { id: 'profil', icon: '👤', label: 'Profil Saya' },
            { id: 'tim', icon: '👥', label: 'Tim Saya' },
            { id: 'wilayah', icon: '🗺️', label: 'Wilayah Kerja' },
            { id: 'registrasi', icon: '📝', label: 'Registrasi Sasaran' },
            { id: 'daftar_sasaran', icon: '📋', label: 'Daftar Sasaran' },
            { id: 'pendampingan', icon: '🤝', label: 'Pendampingan' },
            { id: 'rekap_kader', icon: '📊', label: 'Rekap Bulanan Kader' },
            { id: 'rekap_tim', icon: '📈', label: 'Rekap Bulanan Tim' },
            { id: 'sinkronisasi', icon: '🔄', label: 'Sinkronisasi Data' },
            { id: 'cetak', icon: '🖨️', label: 'Cetak PDF' }
        ];
    } else if (role === 'Admin Kecamatan') {
        daftarMenu = [
            { id: 'dashboard_kec', icon: '🏛️', label: 'Dashboard Kecamatan' },
            { id: 'rekap_sasaran_kader', icon: '📊', label: 'Rekap Sasaran per Kader' },
            { id: 'rekap_sasaran_desa', icon: '🗺️', label: 'Rekap Sasaran per Desa' },
            { id: 'rekap_lapor_kader', icon: '📋', label: 'Rekap Pendampingan per Kader' },
            { id: 'rekap_lapor_desa', icon: '📁', label: 'Rekap Pendampingan per Desa' },
            { id: 'reset_pass_kader', icon: '🔑', label: 'Reset Password Kader' }
        ];
    } else if (role === 'Admin Kabupaten') {
        daftarMenu = [
            { id: 'dashboard_kab', icon: '🏢', label: 'Dashboard Kabupaten' },
            { id: 'rekap_kecamatan', icon: '📈', label: 'Rekap per Kecamatan' },
            { id: 'rekap_desa', icon: '📊', label: 'Rekap per Desa' },
            { id: 'monitoring', icon: '🎯', label: 'Monitoring Capaian' }
        ];
    } else {
        // Super Admin
        daftarMenu = [
            { id: 'dashboard_sys', icon: '🖥️', label: 'Dashboard Sistem' },
            { id: 'kelola_akun', icon: '👥', label: 'Kelola Akun' },
            { id: 'master_wilayah', icon: '🗺️', label: 'Master Wilayah' },
            { id: 'log_aktivitas', icon: '⏱️', label: 'Log Aktivitas' },
            { id: 'pengaturan', icon: '⚙️', label: 'Pengaturan Sistem' }
        ];
    }

    // Suntikkan HTML ke Sidebar
    let htmlMenu = '';
    daftarMenu.forEach(menu => {
        htmlMenu += `<a class="menu-item" data-target="${menu.id}">
                        <span class="icon">${menu.icon}</span> 
                        <span class="label">${menu.label}</span>
                     </a>`;
    });
    
    // Tambah menu ganti password & logout di paling bawah untuk semua role
    htmlMenu += `<hr style="border: 0; border-top: 1px solid #ddd; margin: 10px 0;">`;
    htmlMenu += `<a class="menu-item" data-target="ganti_password"><span class="icon">🔒</span> <span class="label">Ganti Password</span></a>`;
    htmlMenu += `<a class="menu-item text-danger" onclick="logout()"><span class="icon">🚪</span> <span class="label">Keluar / Logout</span></a>`;

    menuContainer.innerHTML = htmlMenu;

    // Pasang Event Listener ke tombol menu baru
    document.querySelectorAll('.menu-item[data-target]').forEach(item => {
        item.addEventListener('click', (e) => {
            // Hapus status active dari semua menu
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            
            // Tutup sidebar setelah diklik (khusus mode HP)
            if(window.innerWidth < 768) toggleSidebar();
            
            // Tampilkan konten
            renderKonten(item.getAttribute('data-target'));
        });
    });

    // Otomatis klik menu pertama (Dashboard)
    if(document.querySelector('.menu-item')) {
        document.querySelector('.menu-item').click();
    }
};

const renderKonten = (target) => {
    // Placeholder untuk konten
    contentArea.innerHTML = `
        <div class="card" style="animation: fadeIn 0.3s ease-in-out;">
            <h3>Menu: ${target.replace(/_/g, ' ').toUpperCase()}</h3>
            <p>Halaman ini sedang dalam tahap pengembangan.</p>
        </div>
    `;
};

// ==========================================
// 6. UTILITAS LAINNYA
// ==========================================
const updateNetworkStatus = () => {
    if (navigator.onLine) {
        networkStatus.textContent = 'Online';
        networkStatus.className = 'status-badge online';
    } else {
        networkStatus.textContent = 'Offline Mode';
        networkStatus.className = 'status-badge offline';
    }
};

window.logout = async () => {
    if (confirm("Yakin ingin keluar?")) {
        await deleteData('kader_session', 'active_user');
        window.location.reload(); // Refresh halaman untuk reset state
    }
};

document.addEventListener('DOMContentLoaded', initApp);
