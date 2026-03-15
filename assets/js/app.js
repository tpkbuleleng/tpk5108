import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData, uploadLaporanTunda } from './sync.js';

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

// ==========================================
// 2. FUNGSI INISIALISASI APLIKASI
// ==========================================
const initApp = async () => {
    try {
        await initDB();
        console.log("Database TPK Buleleng Siap!");

        // Cek status jaringan saat ini
        updateNetworkStatus();
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);

        // CEK 1: Apakah ini HP baru yang belum pernah download Master Data?
        const users = await getAllData('master_user');
        if (users.length === 0) {
            if (navigator.onLine) {
                console.log("Master data kosong, melakukan sinkronisasi awal...");
                // Ganti tulisan tombol login agar kader tahu sedang proses
                const btnLogin = formLogin.querySelector('button');
                btnLogin.innerText = "Mengunduh Data Master...";
                btnLogin.disabled = true;
                
                await downloadMasterData();
                
                btnLogin.innerText = "Masuk";
                btnLogin.disabled = false;
            } else {
                alert("Perhatian: Aplikasi baru diinstal. Anda harus terhubung ke internet untuk sinkronisasi pertama kali!");
            }
        }

        // CEK 2: Apakah kader sudah login sebelumnya? (Sesi aktif)
        const session = await getDataById('kader_session', 'active_user');
        if (session) {
            masukKeAplikasi(session);
        } else {
            tampilkanLayar('login');
        }

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
        // 1. Cari user di tabel master_user
        const user = await getDataById('master_user', inputId);

        if (!user) {
            alert("ID Pengguna tidak terdaftar di sistem!");
            return;
        }

        // 2. Validasi PIN/Password
        if (user.password.toString() !== inputPin) {
            alert("PIN/Password salah!");
            return;
        }

        // 3. Jika login sukses, ambil data detail Kader dari tabel master_kader
        const detailKader = await getDataById('master_kader', user.id_referensi);

        if (!detailKader) {
            alert("Data detail kader tidak ditemukan. Hubungi Admin.");
            return;
        }

        // 4. Buat Sesi Login
        const sessionData = {
            id_kader: 'active_user', 
            username: user.username,
            kode_kader: detailKader.id_kader,
            nama: detailKader.nama_kader,
            id_tim: detailKader.id_tim, // Sangat penting untuk filter wilayah nanti
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

// Logout global
window.logout = async () => {
    if (confirm("Yakin ingin keluar?")) {
        await deleteData('kader_session', 'active_user');
        tampilkanLayar('login');
    }
};

// ==========================================
// 4. NAVIGASI BAWAH & MANAJEMEN LAYAR
// ==========================================
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        renderKonten(item.getAttribute('data-target'));
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

const masukKeAplikasi = (sessionData) => {
    userGreeting.innerText = `Halo, ${sessionData.nama}!`;
    tampilkanLayar('app');
    
    // Simpan data session di memory global untuk dipakai di form lain
    window.currentUser = sessionData; 
    
    document.querySelector('[data-target="home"]').click();
};

const renderKonten = (target) => {
    if (target === 'home') {
        contentArea.innerHTML = `
            <div class="card summary-card">
                <h3>Antrean Sinkronisasi</h3>
                <p class="big-number" id="pending-sync-count">0</p>
                <button class="btn-secondary" id="btn-sync-now" onclick="jalankanSinkronisasi()">🔄 Sinkronkan Sekarang</button>
            </div>
            <div class="card">
                <h3>Informasi Profil</h3>
                <p><b>Nama:</b> ${window.currentUser.nama}</p>
                <p><b>ID Tim:</b> ${window.currentUser.id_tim}</p>
                <p style="margin-top:10px; font-size: 0.85rem; color: #666;">
                   Pastikan Anda melakukan sinkronisasi secara berkala saat mendapat sinyal internet.
                </p>
            </div>
        `;
        updateSyncCount();
    } else if (target === 'registrasi') {
        contentArea.innerHTML = `<div class="card"><h3>📝 Form Registrasi Sasaran</h3><p>Segera hadir di tahap selanjutnya...</p></div>`;
    } else if (target === 'lapor') {
        contentArea.innerHTML = `<div class="card"><h3>📋 Form Lapor Pendampingan</h3><p>Segera hadir di tahap selanjutnya...</p></div>`;
    } else if (target === 'data') {
        contentArea.innerHTML = `<div class="card"><h3>📁 Data Tersimpan</h3><p>Daftar data sasaran dan laporan Anda...</p></div>`;
    }
};

// ==========================================
// 5. UTILITAS JARINGAN & SINKRONISASI
// ==========================================
const updateNetworkStatus = () => {
    if (navigator.onLine) {
        networkStatus.textContent = 'Online';
        networkStatus.className = 'status-badge online';
    } else {
        networkStatus.textContent = 'Offline Mode';
        networkStatus.className = 'status-badge offline';
    }
    updateSyncCount(); // Update warna tombol saat sinyal berubah
};

const updateSyncCount = async () => {
    const queue = await getAllData('sync_queue');
    const countElement = document.getElementById('pending-sync-count');
    const btnSync = document.getElementById('btn-sync-now');
    
    if (countElement && btnSync) {
        countElement.innerText = queue.length;
        if (navigator.onLine) {
            btnSync.className = 'btn-primary';
            btnSync.disabled = false;
        } else {
            btnSync.className = 'btn-secondary';
            btnSync.disabled = true;
            btnSync.innerText = '⚠️ Koneksi Terputus';
        }
    }
};

// Fungsi yang dipanggil saat tombol "Sinkronkan Sekarang" diklik
window.jalankanSinkronisasi = async () => {
    const btnSync = document.getElementById('btn-sync-now');
    btnSync.innerText = '⏳ Sedang Proses...';
    btnSync.disabled = true;

    try {
        // 1. Upload data yang masih ngantre di HP
        await uploadLaporanTunda();
        
        // 2. Download Master Data terbaru (siapa tahu ada user/wilayah/pertanyaan baru)
        await downloadMasterData();

        alert("✅ Sinkronisasi Berhasil!");
    } catch (error) {
        alert("❌ Sinkronisasi Gagal. Coba lagi saat sinyal lebih baik.");
    } finally {
        btnSync.innerText = '🔄 Sinkronkan Sekarang';
        btnSync.disabled = false;
        updateSyncCount(); // Refresh angka antrean
    }
};

// Jalankan aplikasi saat file siap
document.addEventListener('DOMContentLoaded', initApp);
