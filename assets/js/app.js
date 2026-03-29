// ==========================================
// OTAK UTAMA FRONTEND (APP.JS - V2.0)
// ==========================================
// Pastikan file ini dipanggil dengan type="module" di index.html
// dan pastikan api.js sudah dimuat sebelumnya!

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// 1. INISIALISASI APLIKASI (SPLASH SCREEN & CEK SESI)
async function initApp() {
    // Tahan Splash Screen 1.5 detik agar elegan
    setTimeout(() => {
        cekSesiLogin();
    }, 1500);
    
    setupEventListeners();
}

function cekSesiLogin() {
    const token = localStorage.getItem('SESSION_TOKEN');
    const profileStr = localStorage.getItem('USER_PROFILE');

    // Sembunyikan Splash
    document.getElementById('view-splash').classList.add('hidden');
    document.getElementById('view-splash').classList.remove('active');

    if (token && profileStr) {
        // Jika sudah punya kunci (Token), langsung masuk ke Beranda
        const profile = JSON.parse(profileStr);
        tampilkanBeranda(profile);
    } else {
        // Jika belum, tampilkan form Login
        document.getElementById('view-login').classList.remove('hidden');
        document.getElementById('view-login').classList.add('active');
    }
}

// 2. KONTROL TAMPILAN BERANDA & SIDEBAR
function tampilkanBeranda(profile) {
    // Sembunyikan Login, Tampilkan App
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-login').classList.remove('active');
    
    document.getElementById('view-app').classList.remove('hidden');
    document.getElementById('view-app').classList.add('active');

    // Update UI Profil di Header & Sidebar
    document.getElementById('sidebar-nama').innerText = profile.nama || 'Nama Kader';
    document.getElementById('sidebar-role').innerText = profile.role_akses || 'KADER';
    
    // Ambil nama panggilan (kata pertama)
    const namaPanggilan = (profile.nama || 'Kader').split(' ')[0];
    document.getElementById('user-greeting').innerText = `Halo, ${namaPanggilan}`;

    // Render navigasi Sidebar
    renderMenuSidebar();

    // Tampilkan halaman rekap/dashboard sebagai halaman default
    renderKonten('rekap');
}

function renderMenuSidebar() {
    const nav = document.getElementById('dynamic-menu-container');
    // Memanfaatkan fungsi renderKonten() untuk memanggil <template> dari index.html
    nav.innerHTML = `
        <a href="#" onclick="renderKonten('rekap'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">📊 Dashboard & Rekap</a>
        <a href="#" onclick="renderKonten('registrasi'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">📝 Registrasi Sasaran</a>
        <a href="#" onclick="renderKonten('daftar-sasaran'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">📋 Daftar Sasaran</a>
        <a href="#" onclick="renderKonten('pendampingan'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">🤝 Laporan Pendampingan</a>
        <a href="#" onclick="renderKonten('kalkulator'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">🧮 Kalkulator Cerdas</a>
        <a href="#" onclick="renderKonten('setting'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">⚙️ Pengaturan</a>
    `;
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if(sidebar) sidebar.classList.remove('active');
    if(overlay) overlay.classList.remove('active');
}

// 3. EVENT LISTENERS UTAMA (TOMBOL & FORM)
function setupEventListeners() {
    // --- A. LOGIKA LOGIN MENGGUNAKAN API BARU ---
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const idUser = document.getElementById('kader-id').value.trim();
            const pin = document.getElementById('kader-pin').value.trim();
            const btnSubmit = document.getElementById('btn-login-submit');

            const originalText = btnSubmit.innerText;
            btnSubmit.innerText = "Memverifikasi Sandi...";
            btnSubmit.disabled = true;

            try {
                // Panggil Mesin Satelit!
                const res = await apiCall('login', { id_user: idUser, password: pin });
                
                if (res.ok) {
                    // Simpan identitas ke memori HP
                    localStorage.setItem('USER_PROFILE', JSON.stringify(res.profile));
                    tampilkanBeranda(res.profile);
                } else {
                    alert("❌ Gagal Login: " + res.message);
                }
            } catch (error) {
                console.error("Login Error:", error);
                alert("⚠️ Terjadi kesalahan jaringan. Pastikan Anda terhubung ke internet.");
            } finally {
                btnSubmit.innerText = originalText;
                btnSubmit.disabled = false;
            }
        });
    }

    // --- B. KONTROL SIDEBAR (BURGER MENU) ---
    const btnMenu = document.getElementById('btn-menu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (btnMenu && sidebar && overlay) {
        btnMenu.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
        overlay.addEventListener('click', closeSidebar);
    }
}

// 4. MESIN PENGGANTI HALAMAN (TEMPLATE ROUTING)
// Jadikan fungsi global agar bisa dipanggil dari atribut onclick di HTML
window.renderKonten = function(templateId) {
    const contentArea = document.getElementById('content-area');
    const template = document.getElementById(`template-${templateId}`);
    
    if (!template) {
        contentArea.innerHTML = `<div class="card"><h2>⚠️ Modul dalam perbaikan</h2></div>`;
        return;
    }

    // Kloning template dan tempel ke layar utama
    contentArea.innerHTML = '';
    contentArea.appendChild(template.content.cloneNode(true));

    // Panggil logika khusus berdasarkan halaman yang dibuka
    if (templateId === 'rekap') {
        initHalamanRekap();
    }
    // Catatan: initHalamanRegistrasi() & initHalamanPendampingan() akan kita buat di Tahap 3
}

// ==========================================
// 5. MODUL REKAP / DASHBOARD (OTOMATIS API)
// ==========================================
async function initHalamanRekap() {
    const profileStr = localStorage.getItem('USER_PROFILE');
    if (!profileStr) return;
    const profile = JSON.parse(profileStr);

    const tbodyTim = document.getElementById('tbody-rekap-tim');
    const tbodyKader = document.getElementById('tbody-rekap-kader');
    
    // Tentukan periode bulan ini otomatis
    const now = new Date();
    const bln = String(now.getMonth() + 1).padStart(2, '0');
    const thn = now.getFullYear();
    const periodeKey = `${thn}-${bln}`;

    // Tampilkan animasi Loading
    if (tbodyTim) tbodyTim.innerHTML = `<tr><td colspan="3" style="padding:20px;">⏳ Menarik data langsung dari Satelit Kabupaten...</td></tr>`;
    if (tbodyKader) tbodyKader.innerHTML = `<tr><td colspan="3" style="padding:20px;">⏳ Memuat...</td></tr>`;

    try {
        // 🔥 PANGGIL API DASHBOARD (Super Cepat!)
        const res = await apiCall('getRekapBulananTim', { 
            id_tim: profile.id_tim,
            periode_key: periodeKey 
        });

        if (res.ok) {
            const data = res.data;
            const jenisList = ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'];
            
            let htmlTim = '';
            let totalSasaran = 0;
            let totalPendampingan = 0;

            jenisList.forEach(jenis => {
                const sasaranAktif = data.sasaran_per_jenis[jenis] || 0;
                const pend = data.pendampingan_per_jenis[jenis] || 0;
                
                totalSasaran += sasaranAktif;
                totalPendampingan += pend;

                htmlTim += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding:12px; text-align:left; font-weight:bold; color:#198754;">${jenis}</td>
                        <td style="padding:12px;">${sasaranAktif}</td>
                        <td style="padding:12px;">${pend}</td>
                    </tr>
                `;
            });

            // Tambahkan Baris Total
            htmlTim += `
                <tr style="background:#e8f4fd; font-weight:bold; font-size:1.1rem;">
                    <td style="padding:15px; text-align:left;">TOTAL TIM</td>
                    <td style="padding:15px; color:#0d6efd;">${totalSasaran}</td>
                    <td style="padding:15px; color:#198754;">${totalPendampingan}</td>
                </tr>
            `;

            if (tbodyTim) tbodyTim.innerHTML = htmlTim;
            
            // Info untuk tabel kader
            if (tbodyKader) tbodyKader.innerHTML = `<tr><td colspan="3" style="padding:20px; color:#666;">Data rekapitulasi individu telah dilebur ke dalam Rekap Tim (Lihat tabel di bawah).</td></tr>`;

        } else {
            if (tbodyTim) tbodyTim.innerHTML = `<tr><td colspan="3" style="color:red; padding:20px;">❌ Gagal memuat data: ${res.message}</td></tr>`;
        }
    } catch (error) {
        console.error("Rekap Error:", error);
        if (tbodyTim) tbodyTim.innerHTML = `<tr><td colspan="3" style="color:red; padding:20px;">⚠️ Gagal terhubung ke server. Periksa jaringan Anda.</td></tr>`;
    }
}
