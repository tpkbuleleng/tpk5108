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

// Elemen Sidebar & Menu
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
        console.log("Database TPK Buleleng Siap!");
        
        // Pantau status jaringan (Online/Offline)
        updateNetworkStatus();
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);

        // Cek apakah ada sesi login aktif di HP
        const session = await getDataById('kader_session', 'active_user');

        // LOGIKA SPLASH SCREEN: Tahan animasi selama 1.5 detik
        setTimeout(async () => {
            // 1. Matikan Splash Screen dan tampilkan layar yang sesuai (agar tidak blank putih)
            viewSplash.classList.remove('active');
            
            if (session) {
                tampilkanLayar('app');
                masukKeAplikasi(session);
            } else {
                tampilkanLayar('login'); 
            }

            // 2. Cek Master Data (Jika HP baru pertama kali buka aplikasi)
            const users = await getAllData('master_user');
            if (users.length === 0) {
                if (navigator.onLine) {
                    const btnLogin = document.getElementById('btn-login-submit');
                    if(btnLogin) {
                        btnLogin.innerText = "Mengunduh Data Master...";
                        btnLogin.disabled = true;
                    }
                    
                    // Proses sedot data dari Google Sheet
                    console.log("Mulai mengunduh data awal...");
                    const sukses = await downloadMasterData();
                    
                    if(btnLogin) {
                        btnLogin.innerText = sukses ? "Masuk" : "Gagal Download Data";
                        btnLogin.disabled = false;
                        if(!sukses) alert("Gagal mengunduh data. Pastikan URL Web App di sync.js sudah benar.");
                    }
                } else {
                    alert("Aplikasi baru diinstal. Harap nyalakan internet untuk sinkronisasi pertama kali.");
                }
            }
        }, 1500); // Waktu tampil splash screen (1.5 detik)

    } catch (error) {
        console.error("Gagal inisialisasi:", error);
    }
};

// ==========================================
// 3. LOGIKA LOGIN (Validasi Offline via Database)
// ==========================================
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const inputId = document.getElementById('kader-id').value.trim();
    const inputPin = document.getElementById('kader-pin').value.trim();

    try {
        const user = await getDataById('master_user', inputId);

        if (!user) {
            alert("ID Pengguna tidak terdaftar!");
            return;
        }

        // SESUAIKAN: Menggunakan kolom password_awal_ref dari Sheet USER_LOGIN
        const passSistem = user.password_awal_ref ? user.password_awal_ref.toString() : "";

        if (passSistem !== inputPin) {
            alert("Password / PIN salah!");
            return;
        }

        // Ambil Nama untuk Profil Sidebar
        let namaTampil = user.username;
        let idTim = '-';

        if (user.role_akses === 'KADER') {
            const kader = await getDataById('master_kader', user.ref_id);
            if (kader) {
                namaTampil = kader.nama_kader;
                idTim = kader.id_tim;
            }
        }

        const sessionData = {
            id_kader: 'active_user', 
            username: user.username,
            role: user.role_akses, // KADER, ADMIN_KECAMATAN, dll
            nama: namaTampil,
            id_tim: idTim,
            login_time: new Date().toISOString()
        };

        await putData('kader_session', sessionData);
        masukKeAplikasi(sessionData);

    } catch (error) {
        console.error("Login Error:", error);
        alert("Terjadi kesalahan sistem saat login.");
    }
});

// ==========================================
// 4. MANAJEMEN LAYAR & SIDEBAR
// ==========================================
const tampilkanLayar = (layar) => {
    // Sembunyikan semua layar dulu
    viewSplash.classList.remove('active');
    viewLogin.classList.remove('active');
    viewApp.classList.remove('active');

    // Tampilkan yang diminta
    if (layar === 'login') {
        viewLogin.classList.add('active');
    } else if (layar === 'app') {
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
    window.currentUser = sessionData; // Simpan data user di global memory
    
    // Update Teks Header & Profil di Sidebar
    userGreeting.innerText = sessionData.role === 'Kader' ? 'Dashboard Kader' : `Dashboard ${sessionData.role}`;
    sidebarNama.innerText = sessionData.nama;
    sidebarRole.innerText = sessionData.role;

    // Tampilkan menu berdasarkan jabatannya
    renderMenuBerdasarkanRole(sessionData.role);
    tampilkanLayar('app');
};

// ==========================================
// 5. DATA MENU DINAMIS (Role-Based Access Control)
// ==========================================
const renderMenuBerdasarkanRole = (role) => {
    let daftarMenu = [];

    // Gunakan .toUpperCase() untuk mitigasi perbedaan besar/kecil huruf di Excel
    const roleUser = role.toUpperCase();

    if (roleUser === 'KADER') {
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
    } else if (roleUser === 'ADMIN_KECAMATAN') {
        daftarMenu = [
            { id: 'dashboard_kec', icon: '🏛️', label: 'Dashboard Kecamatan' },
            { id: 'rekap_sasaran_kader', icon: '📊', label: 'Rekap Sasaran per Kader' },
            { id: 'rekap_sasaran_desa', icon: '🗺️', label: 'Rekap Sasaran per Desa' },
            { id: 'rekap_lapor_kader', icon: '📋', label: 'Rekap Pendampingan per Kader' },
            { id: 'rekap_lapor_desa', icon: '📁', label: 'Rekap Pendampingan per Desa' },
            { id: 'reset_pass_kader', icon: '🔑', label: 'Reset Password Kader' }
        ];
    } else if (roleUser === 'ADMIN_KABUPATEN') {
        daftarMenu = [
            { id: 'dashboard_kab', icon: '🏢', label: 'Dashboard Kabupaten' },
            { id: 'rekap_kecamatan', icon: '📈', label: 'Rekap per Kecamatan' },
            { id: 'monitoring', icon: '🎯', label: 'Monitoring Capaian' }
        ];
    } else if (roleUser === 'SUPER_ADMIN') {
        daftarMenu = [
            { id: 'dashboard_sys', icon: '🖥️', label: 'Dashboard Sistem' },
            { id: 'kelola_akun', icon: '👥', label: 'Kelola Akun' },
            { id: 'master_wilayah', icon: '🗺️', label: 'Master Wilayah' },
            { id: 'log_aktivitas', icon: '⏱️', label: 'Log Aktivitas' },
            { id: 'pengaturan', icon: '⚙️', label: 'Pengaturan Sistem' }
        ];
    }

    // ... sisa kode penyuntikan HTML (innerHTML) tetap sama ...

    // Suntikkan kode HTML menu ke dalam Sidebar
    let htmlMenu = '';
    daftarMenu.forEach(menu => {
        htmlMenu += `<a class="menu-item" data-target="${menu.id}">
                        <span class="icon">${menu.icon}</span> 
                        <span class="label">${menu.label}</span>
                     </a>`;
    });
    
    // Tambah menu Ganti Password & Logout di paling bawah
    htmlMenu += `<hr style="border: 0; border-top: 1px solid var(--border); margin: 10px 0;">`;
    htmlMenu += `<a class="menu-item" data-target="ganti_password"><span class="icon">🔒</span> <span class="label">Ganti Password</span></a>`;
    htmlMenu += `<a class="menu-item text-danger" style="color: #dc3545;" onclick="logout()"><span class="icon">🚪</span> <span class="label">Keluar / Logout</span></a>`;

    menuContainer.innerHTML = htmlMenu;

    // Pasang fungsi klik untuk setiap tombol menu
    document.querySelectorAll('.menu-item[data-target]').forEach(item => {
        item.addEventListener('click', (e) => {
            // Hapus warna biru (active) dari semua menu
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            // Berikan warna biru ke menu yang diklik
            item.classList.add('active');
            
            // Otomatis tutup sidebar setelah diklik (khusus di layar HP)
            if(window.innerWidth < 768) toggleSidebar();
            
            // Ganti konten di tengah layar
            renderKonten(item.getAttribute('data-target'));
        });
    });

    // Otomatis klik menu pertama saat baru masuk
    if(document.querySelector('.menu-item')) {
        document.querySelector('.menu-item').click();
    }
};

const renderKonten = (target) => {
    // Area ini nanti akan kita isi dengan Form Registrasi, Laporan, dll.
    contentArea.innerHTML = `
        <div class="card" style="animation: fadeIn 0.3s ease-in-out;">
            <h3 style="color: var(--primary); margin-bottom: 10px;">Menu: ${target.replace(/_/g, ' ').toUpperCase()}</h3>
            <p>Halaman ini sedang dalam tahap pengembangan. Nanti form dan datanya akan muncul di sini.</p>
        </div>
    `;
};

// ==========================================
// 6. UTILITAS JARINGAN & LAINNYA
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

// Fungsi Logout Global
window.logout = async () => {
    if (confirm("Yakin ingin keluar?")) {
        await deleteData('kader_session', 'active_user');
        window.location.reload(); // Refresh halaman agar bersih total
    }
};

// Fungsi Toggle Lihat Password Global
window.togglePasswordVisibility = () => {
    const pinInput = document.getElementById('kader-pin');
    const toggleIcon = document.querySelector('.toggle-password');
    if (pinInput.type === 'password') {
        pinInput.type = 'text';
        toggleIcon.textContent = '🙈'; // Ikon mata tertutup
    } else {
        pinInput.type = 'password';
        toggleIcon.textContent = '👁️'; // Ikon mata terbuka
    }
};

// Jalankan sistem saat file dimuat
document.addEventListener('DOMContentLoaded', initApp);
