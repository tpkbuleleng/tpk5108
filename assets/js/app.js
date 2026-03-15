// Mengimpor fungsi dari otak database kita
import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';

// ==========================================
// 1. DEKLARASI ELEMEN UI
// ==========================================
const viewLogin = document.getElementById('view-login');
const viewApp = document.getElementById('view-app');
const formLogin = document.getElementById('form-login');
const userGreeting = document.getElementById('user-greeting');
const networkStatus = document.getElementById('network-status');
const navItems = document.querySelectorAll('.nav-item');
const contentArea = document.getElementById('content-area');
const pendingSyncCount = document.getElementById('pending-sync-count');

// ==========================================
// 2. FUNGSI INISIALISASI APLIKASI
// ==========================================
const initApp = async () => {
    try {
        // Nyalakan database
        await initDB();
        console.log("Database TPK Buleleng Siap!");

        // Cek apakah kader sudah login sebelumnya (Offline Login Check)
        const session = await getDataById('kader_session', 'active_user');
        
        if (session) {
            // Jika sudah login, langsung masuk ke aplikasi
            masukKeAplikasi(session.nama);
        } else {
            // Jika belum, pastikan ada di layar login
            tampilkanLayar('login');
        }

        // Cek status jaringan saat ini
        updateNetworkStatus();
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);

        // Update jumlah antrean sinkronisasi
        updateSyncCount();

    } catch (error) {
        console.error("Gagal inisialisasi aplikasi:", error);
        alert("Terjadi kesalahan sistem. Pastikan browser Anda mendukung IndexedDB.");
    }
};

// ==========================================
// 3. LOGIKA LOGIN & LOGOUT (BISA OFFLINE)
// ==========================================
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const kaderId = document.getElementById('kader-id').value;
    const kaderPin = document.getElementById('kader-pin').value;

    // TODO: Di versi produksi, Anda bisa mencocokkan ini dengan data master kader yang di-cache.
    // Untuk sekarang, kita asumsikan login berhasil jika PIN diisi (Simulasi).
    if (kaderId && kaderPin.length >= 4) {
        const userData = {
            id_kader: 'active_user', // Key statis untuk sesi aktif
            username: kaderId,
            nama: `Kader ${kaderId.toUpperCase()}`,
            login_time: new Date().toISOString()
        };

        // Simpan sesi ke IndexedDB agar besok tidak perlu login lagi
        await putData('kader_session', userData);
        
        // Reset form dan masuk
        formLogin.reset();
        masukKeAplikasi(userData.nama);
    } else {
        alert("ID atau PIN tidak valid!");
    }
});

// Jadikan fungsi logout global agar bisa dipanggil dari tombol HTML (onclick="logout()")
window.logout = async () => {
    const konfirmasi = confirm("Yakin ingin keluar?");
    if (konfirmasi) {
        // Hapus sesi dari database
        await deleteData('kader_session', 'active_user');
        tampilkanLayar('login');
    }
};

// ==========================================
// 4. NAVIGASI BAWAH & MANAJEMEN LAYAR
// ==========================================
navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Hapus class active dari semua tombol nav
        navItems.forEach(nav => nav.classList.remove('active'));
        // Tambahkan class active ke tombol yang diklik
        item.classList.add('active');

        // Ganti konten berdasarkan target
        const target = item.getAttribute('data-target');
        renderKonten(target);
    });
});

const tampilkanLayar = (layar) => {
    if (layar === 'login') {
        viewApp.classList.remove('active');
        viewLogin.classList.add('active');
    } else {
        viewLogin.classList.remove('active');
        viewApp.classList.add('active');
    }
};

const masukKeAplikasi = (namaKader) => {
    userGreeting.innerText = `Halo, ${namaKader}!`;
    tampilkanLayar('app');
    
    // Default ke beranda saat baru masuk
    document.querySelector('[data-target="home"]').click();
};

const renderKonten = (target) => {
    // Di sini nantinya kita memuat form registrasi atau form lapor.
    // Sementara kita gunakan placeholder:
    if (target === 'home') {
        contentArea.innerHTML = `
            <div class="card summary-card">
                <h3>Belum Disinkronisasi</h3>
                <p class="big-number" id="pending-sync-count">0</p>
                <button class="btn-secondary" id="btn-sync-now">Sinkronkan Sekarang</button>
            </div>
            <div class="card">
                <h3>Info Kader</h3>
                <p>Anda sedang berada di mode: <b>${navigator.onLine ? 'Online' : 'Offline'}</b>. Seluruh data yang Anda input akan disimpan aman di perangkat ini.</p>
            </div>
        `;
        updateSyncCount(); // Segarkan angka saat kembali ke home
    } else if (target === 'registrasi') {
        contentArea.innerHTML = `<div class="card"><h3>📝 Form Registrasi Sasaran</h3><p>Form input akan dimuat di sini...</p></div>`;
    } else if (target === 'lapor') {
        contentArea.innerHTML = `<div class="card"><h3>📋 Form Lapor Pendampingan</h3><p>Form lapor akan dimuat di sini...</p></div>`;
    } else if (target === 'data') {
        contentArea.innerHTML = `<div class="card"><h3>📁 Data Tersimpan</h3><p>Daftar sasaran akan dimuat di sini...</p></div>`;
    }
};

// ==========================================
// 5. UTILITAS JARINGAN & DATA
// ==========================================
const updateNetworkStatus = () => {
    if (navigator.onLine) {
        networkStatus.textContent = 'Online';
        networkStatus.classList.remove('offline');
        networkStatus.classList.add('online');
    } else {
        networkStatus.textContent = 'Offline Mode';
        networkStatus.classList.remove('online');
        networkStatus.classList.add('offline');
    }
};

const updateSyncCount = async () => {
    try {
        const queue = await getAllData('sync_queue');
        const countElement = document.getElementById('pending-sync-count');
        if (countElement) {
            countElement.innerText = queue.length;
            // Jika ada antrean dan sedang online, ubah warna tombol
            const btnSync = document.getElementById('btn-sync-now');
            if (btnSync) {
                if (queue.length > 0 && navigator.onLine) {
                    btnSync.className = 'btn-primary';
                } else {
                    btnSync.className = 'btn-secondary';
                }
            }
        }
    } catch (error) {
        console.error("Gagal menghitung antrean:", error);
    }
};

// ==========================================
// JALANKAN APLIKASI
// ==========================================
document.addEventListener('DOMContentLoaded', initApp);