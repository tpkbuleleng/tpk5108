import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData } from './sync.js';

const getEl = (id) => document.getElementById(id);

// ==========================================
// 1. NAVIGASI LAYAR (SANGAT KRUSIAL)
// ==========================================
const tampilkanLayar = (id) => {
    const vSplash = getEl('view-splash');
    const vLogin = getEl('view-login');
    const vApp = getEl('view-app');

    // Paksa hapus splash screen
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

// ==========================================
// 2. INISIALISASI APLIKASI
// ==========================================
const initApp = async () => {
    // FAILSAFE: Jika 3 detik macet, paksa masuk ke login
    const logoTimeout = setTimeout(() => tampilkanLayar('login'), 3500);

    try {
        await initDB();
        const session = await getDataById('kader_session', 'active_user');

        if (session) {
            clearTimeout(logoTimeout);
            masukKeAplikasi(session);
        } else {
            clearTimeout(logoTimeout);
            tampilkanLayar('login');
            
            // Cek Master Data di background
            const users = await getAllData('master_user');
            if (users.length === 0 && navigator.onLine) {
                await downloadMasterData();
            }
        }
    } catch (err) {
        console.error("Gagal init:", err);
        tampilkanLayar('login');
    }
};

const masukKeAplikasi = async (session) => {
    window.currentUser = session;
    
    // Ambil detail Kecamatan dari data wilayah
    const semuaTimWilayah = await getAllData('master_tim_wilayah') || [];
    const wilayahKader = semuaTimWilayah.find(w => w.id_tim === session.id_tim);
    const namaKecamatan = wilayahKader ? wilayahKader.kecamatan.toUpperCase() : "";

    // Set Header
    const greeting = getEl('user-greeting');
    if (greeting) greeting.innerHTML = `DASHBOARD KADER KECAMATAN ${namaKecamatan}`;

    if (getEl('sidebar-nama')) getEl('sidebar-nama').innerText = session.nama;
    if (getEl('sidebar-role')) getEl('sidebar-role').innerText = session.role;
    
    renderMenu(session.role);
    renderKonten('dashboard'); 
    tampilkanLayar('app');
};

// ==========================================
// 3. MENU & KONTEN (ROLE KADER LENGKAP)
// ==========================================
const renderMenu = (role) => {
    const container = getEl('dynamic-menu-container');
    if (!container) return;

    let menus = [];
    if (role.toUpperCase() === 'KADER') {
        menus = [
            { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
            { id: 'registrasi', icon: '📝', label: 'Registrasi Sasaran' },
            { id: 'daftar_sasaran', icon: '📋', label: 'Daftar Sasaran' },
            { id: 'pendampingan', icon: '🤝', label: 'Laporan Pendampingan' },
            { id: 'rekap_kader', icon: '📊', label: 'Rekap Bulanan Kader' },
            { id: 'rekap_tim', icon: '📈', label: 'Rekap Bulanan Tim' },
            { id: 'cetak_pdf', icon: '🖨️', label: 'Cetak PDF' },
            { id: 'ganti_pass', icon: '🔑', label: 'Ganti Password' }
        ];
    }

    container.innerHTML = menus.map(m => `
        <a class="menu-item" data-target="${m.id}">
            <span class="icon">${m.icon}</span> ${m.label}
        </a>
    `).join('') + `<hr><a class="menu-item text-danger" id="btnLogout">🚪 Keluar</a>`;

    document.querySelectorAll('.menu-item[data-target]').forEach(item => {
        item.onclick = () => {
            getEl('sidebar').classList.remove('active');
            getEl('sidebar-overlay').classList.remove('active');
            renderKonten(item.getAttribute('data-target'));
        };
    });
    if (getEl('btnLogout')) getEl('btnLogout').onclick = window.logout;
};

const renderKonten = async (target) => {
    const area = getEl('content-area');
    if (!area) return;

    if (target === 'dashboard') {
        // Tampilkan loading sebentar
        area.innerHTML = `<div style="padding:20px; text-align:center; opacity:0.5;">Memuat profil...</div>`;
        
        const session = window.currentUser;
        
        try {
            // Ambil data satu per satu agar jika satu gagal, yang lain tidak ikut macet
            const allWil = await getAllData('master_tim_wilayah') || [];
            const allTim = await getAllData('master_tim') || [];
            const antrean = await getAllData('sync_queue') || [];

            const wilayahKerja = allWil.filter(w => w.id_tim === session.id_tim);
            const detailTim = allTim.find(t => t.id_tim === session.id_tim);
            
            // Logika Fallback: Jika nomor_tim tidak ada, pakai id_tim
            const noTim = detailTim ? (detailTim.nomor_tim || session.id_tim) : session.id_tim;
            const daftarDusun = wilayahKerja.map(w => w.dusun_rw).join(', ') || 'Data wilayah belum sinkron';
            const desa = wilayahKerja.length > 0 ? wilayahKerja[0].desa_kelurahan : '-';
            const kec = wilayahKerja.length > 0 ? wilayahKerja[0].kecamatan : '-';

            area.innerHTML = `
                <div class="animate-fade">
                    <div class="card" style="background: linear-gradient(135deg, #0d6efd, #0043a8); color: white; border:none; margin-bottom: 20px; padding: 25px; box-shadow: 0 8px 16px rgba(0,0,0,0.1);">
                        <p style="margin:0; opacity: 0.9; font-size: 1rem; font-weight: 800;">SELAMAT DATANG,</p>
                        <h2 style="margin: 5px 0 15px 0; font-size: 1.6rem; font-weight: 700; text-transform: uppercase;">${session.nama}</h2>
                        
                        <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 0.9rem; margin-bottom: 20px;">
                            NO. TIM: ${noTim}
                        </div>

                        <hr style="margin-bottom: 20px; border: 0; border-top: 1px solid rgba(255,255,255,0.2);">
                        
                        <div style="font-size: 1.1rem; line-height: 1.7;">
                            <div style="margin-bottom: 12px;">
                                <span style="opacity:0.8;">📍 Dusun/RW:</span><br>
                                <span style="font-weight: 500;">${daftarDusun}</span>
                            </div>
                            <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
                                <span style="opacity:0.8;">🏘️ Desa/Kelurahan:</span>
                                <span style="font-weight: 600;">${desa}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="opacity:0.8;">🏛️ Kecamatan:</span>
                                <span style="font-weight: 600;">${kec}</span>
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="card" style="text-align:center; padding: 20px; border-bottom: 4px solid #fd7e14;">
                            <div style="font-size: 1.8rem; margin-bottom: 5px;">📦</div>
                            <h3 style="font-size: 1.5rem; margin:0;">${antrean.length}</h3>
                            <p style="font-size: 0.75rem; color: #666; font-weight: bold; margin:0;">TERTUNDA</p>
                        </div>
                        <div class="card" style="text-align:center; padding: 20px; cursor:pointer; border-bottom: 4px solid #0d6efd;" onclick="renderKonten('registrasi')">
                            <div style="font-size: 1.8rem; margin-bottom: 5px;">📝</div>
                            <h3 style="font-size: 1.5rem; color: #0d6efd; margin:0;">BARU</h3>
                            <p style="font-size: 0.75rem; color: #666; font-weight: bold; margin:0;">REGISTRASI</p>
                        </div>
                    </div>
                </div>`;
        } catch (err) {
            area.innerHTML = `<div class="card" style="text-align:center; padding:30px;">
                <p>Gagal memuat profil. Silakan coba sinkronisasi data.</p>
                <button class="btn-primary" onclick="location.reload()">Refresh Halaman</button>
            </div>`;
        }
    } else if (target === 'registrasi') {
        const temp = getEl('template-registrasi');
        if (temp) {
            area.innerHTML = '';
            area.appendChild(temp.content.cloneNode(true));
            // Tambahkan pemicu init form registrasi di sini
            if (typeof initFormRegistrasi === "function") initFormRegistrasi();
        }
    } else {
        area.innerHTML = `
            <div class="card" style="text-align:center; padding:40px;">
                <div style="font-size: 3rem; margin-bottom: 15px;">🚧</div>
                <h3>Menu ${target.replace(/_/g, ' ').toUpperCase()}</h3>
                <p style="color:#666;">Halaman ini sedang dalam tahap pengembangan sistem.</p>
                <button class="btn-primary" style="margin-top:20px; max-width:200px;" onclick="renderKonten('dashboard')">Kembali ke Dashboard</button>
            </div>`;
    }
};

// ==========================================
// 4. LOGIN & LOGOUT
// ==========================================
const fLogin = getEl('form-login');
if (fLogin) {
    fLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = getEl('kader-id').value.trim();
        const pin = getEl('kader-pin').value.trim();
        const user = await getDataById('master_user', id);
        
        if (!user) return alert("ID tidak terdaftar!");
        const pBenar = user.password_awal_ref ? user.password_awal_ref.toString() : "";
        
        if (pBenar === pin) {
            let nama = user.username, tim = '-';
            if (user.role_akses === 'KADER') {
                const d = await getDataById('master_kader', user.ref_id);
                if (d) { nama = d.nama_kader; tim = d.id_tim; }
            }
            const ses = { id_kader: 'active_user', username: user.username, role: user.role_akses, nama, id_tim: tim };
            await putData('kader_session', ses);
            masukKeAplikasi(ses);
        } else { alert("PIN salah!"); }
    });
}

window.logout = async () => {
    if (confirm("Keluar dari aplikasi?")) {
        await deleteData('kader_session', 'active_user');
        location.reload();
    }
};

// Sidebar Events
if (getEl('btn-menu')) getEl('btn-menu').onclick = () => { getEl('sidebar').classList.add('active'); getEl('sidebar-overlay').classList.add('active'); };
if (getEl('sidebar-overlay')) getEl('sidebar-overlay').onclick = () => { getEl('sidebar').classList.remove('active'); getEl('sidebar-overlay').classList.remove('active'); };

document.addEventListener('DOMContentLoaded', initApp);
