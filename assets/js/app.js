import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData } from './sync.js';

const getEl = (id) => document.getElementById(id);

// ==========================================
// 1. INISIALISASI APLIKASI
// ==========================================
const initApp = async () => {
    // Pengaman: Jika 3 detik macet, paksa masuk ke login/app
    const failsafe = setTimeout(() => tampilkanLayar('login'), 3000);

    try {
        await initDB();
        const session = await getDataById('kader_session', 'active_user');
        
        clearTimeout(failsafe);
        if (session) {
            masukKeAplikasi(session);
        } else {
            tampilkanLayar('login');
        }

        // Cek data master di background
        const users = await getAllData('master_user');
        if (users.length === 0 && navigator.onLine) {
            await downloadMasterData();
        }
    } catch (err) {
        console.error("Gagal init:", err);
        tampilkanLayar('login');
    }
};

// ==========================================
// 2. NAVIGASI LAYAR
// ==========================================
const tampilkanLayar = (id) => {
    const vSplash = getEl('view-splash');
    const vLogin = getEl('view-login');
    const vApp = getEl('view-app');

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

const masukKeAplikasi = async (session) => {
    window.currentUser = session;
    
    // 1. Ambil data Wilayah & Tim untuk detail Dashboard
    const [allTimWil, allMasterTim] = await Promise.all([
        getAllData('master_tim_wilayah'),
        getAllData('master_tim') // Mengambil data dari MASTER_TIM
    ]);

    const wilayahKader = allTimWil.find(w => w.id_tim === session.id_tim);
    const detailTim = allMasterTim.find(t => t.id_tim === session.id_tim);
    
    const namaKecamatan = wilayahKader ? wilayahKader.kecamatan.toUpperCase() : "";
    // Ambil nomor_tim dari sheet MASTER_TIM
    window.currentUser.nomor_tim = detailTim ? detailTim.nomor_tim : session.id_tim;

    // 2. Update Header
    const greeting = getEl('user-greeting');
    if (greeting) {
        greeting.innerHTML = `DASHBOARD KADER KECAMATAN ${namaKecamatan}`;
    }

    if (getEl('sidebar-nama')) getEl('sidebar-nama').innerText = session.nama;
    if (getEl('sidebar-role')) getEl('sidebar-role').innerText = session.role;
    
    renderMenu(session.role);
    renderKonten('dashboard'); 
    tampilkanLayar('app');
};

// ==========================================
// 3. MENU & KONTEN (DASHBOARD LENGKAP)
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
    } else {
        menus = [{ id: 'dashboard', icon: '🏠', label: 'Dashboard' }];
    }

    container.innerHTML = menus.map(m => `
        <a class="menu-item" data-target="${m.id}">
            <span class="icon">${m.icon}</span> ${m.label}
        </a>
    `).join('') + `<hr><a class="menu-item text-danger" id="btnLogoutSide">🚪 Keluar</a>`;

    document.querySelectorAll('.menu-item[data-target]').forEach(item => {
        item.onclick = () => {
            getEl('sidebar').classList.remove('active');
            getEl('sidebar-overlay').classList.remove('active');
            renderKonten(item.getAttribute('data-target'));
        };
    });
    if (getEl('btnLogoutSide')) getEl('btnLogoutSide').onclick = window.logout;
};

const renderKonten = async (target) => {
    const area = getEl('content-area');
    if (!area) return;

    if (target === 'dashboard') {
        const session = window.currentUser;
        const [allTimWil, antrean] = await Promise.all([
            getAllData('master_tim_wilayah'),
            getAllData('sync_queue')
        ]);

        const wilayahKerja = allTimWil.filter(w => w.id_tim === session.id_tim);
        const daftarDusun = wilayahKerja.map(w => w.dusun_rw).join(', ') || '-';
        const desa = wilayahKerja.length > 0 ? wilayahKerja[0].desa_kelurahan : '-';
        const kec = wilayahKerja.length > 0 ? wilayahKerja[0].kecamatan : '-';

        area.innerHTML = `
            <div class="animate-fade">
                <div class="card" style="background: linear-gradient(135deg, #0d6efd, #0043a8); color: white; border:none; margin-bottom: 20px; padding: 25px; box-shadow: 0 8px 16px rgba(0,0,0,0.1);">
                    <p style="margin:0; opacity: 0.9; font-size: 1rem; font-weight: 800;">SELAMAT DATANG,</p>
                    <h2 style="margin: 5px 0 15px 0; font-size: 1.6rem; font-weight: 700;">${session.nama}</h2>
                    
                    <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 0.9rem; margin-bottom: 20px;">
                        NO. TIM: ${session.nomor_tim}
                    </div>

                    <hr style="margin-bottom: 20px; border: 0; border-top: 1px solid rgba(255,255,255,0.2);">
                    
                    <div style="font-size: 1.1rem; line-height: 1.7;">
                        <div style="margin-bottom: 8px;">
                            📍 <b>Dusun/RW:</b><br><span style="font-size: 1rem; opacity: 0.9;">${daftarDusun}</span>
                        </div>
                        <div style="margin-bottom: 8px;">
                            🏘️ <b>Desa/Kelurahan:</b> ${desa}
                        </div>
                        <div>
                            🏛️ <b>Kecamatan:</b> ${kec}
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="card" style="text-align:center; padding: 20px;">
                        <div style="font-size: 1.8rem; margin-bottom: 5px;">📦</div>
                        <h3 style="font-size: 1.5rem;">${antrean.length}</h3>
                        <p style="font-size: 0.75rem; color: #666; font-weight: bold;">TERTUNDA</p>
                    </div>
                    <div class="card" style="text-align:center; padding: 20px; cursor:pointer;" onclick="renderKonten('registrasi')">
                        <div style="font-size: 1.8rem; margin-bottom: 5px;">📝</div>
                        <h3 style="font-size: 1.5rem; color: var(--primary);">BARU</h3>
                        <p style="font-size: 0.75rem; color: #666; font-weight: bold;">REGISTRASI</p>
                    </div>
                </div>
            </div>`;
    } else {
        area.innerHTML = `<div class="card"><h3>Menu ${target.replace(/_/g, ' ').toUpperCase()}</h3><p>Halaman ini sedang dalam pengembangan.</p></div>`;
    }
};

// ==========================================
// 4. FORM REGISTRASI
// ==========================================
const initFormRegistrasi = async () => {
    const session = window.currentUser;
    const allWil = await getAllData('master_tim_wilayah');
    const tugas = allWil.filter(w => w.id_tim === session.id_tim);

    const selDesa = getEl('reg-desa');
    const selDusun = getEl('reg-dusun');
    
    if (selDesa) {
        const daftarDesa = [...new Set(tugas.map(w => w.desa_kelurahan))];
        selDesa.innerHTML = '<option value="">-- Pilih Desa --</option>' + 
            daftarDesa.map(d => `<option value="${d}">${d}</option>`).join('');

        selDesa.onchange = () => {
            const dusunFiltered = tugas.filter(w => w.desa_kelurahan === selDesa.value);
            selDusun.innerHTML = '<option value="">-- Pilih Dusun --</option>' + 
                dusunFiltered.map(d => `<option value="${d.dusun_rw}">${d.dusun_rw}</option>`).join('');
        };
    }

    const q = await getAllData('master_pertanyaan');
    const containerQ = getEl('pertanyaan-dinamis');
    if (containerQ) {
        containerQ.innerHTML = q.sort((a,b) => a.urutan - b.urutan).map(item => {
            if(item.is_active !== 'Y') return '';
            return `<div class="form-group"><label>${item.label_pertanyaan}</label><input type="text" name="${item.id_pertanyaan}" class="form-control"></div>`;
        }).join('');
    }
};

// ==========================================
// 5. LOGIN, LOGOUT & SIDEBAR
// ==========================================
const fLogin = getEl('form-login');
if (fLogin) {
    fLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = getEl('kader-id').value.trim();
        const pin = getEl('kader-pin').value.trim();
        const user = await getDataById('master_user', id);
        
        if (!user) return alert("ID tidak ditemukan!");
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
    if (confirm("Keluar?")) { await deleteData('kader_session', 'active_user'); location.reload(); }
};

if (getEl('btn-menu')) getEl('btn-menu').onclick = () => { getEl('sidebar').classList.add('active'); getEl('sidebar-overlay').classList.add('active'); };
if (getEl('sidebar-overlay')) getEl('sidebar-overlay').onclick = () => { getEl('sidebar').classList.remove('active'); getEl('sidebar-overlay').classList.remove('active'); };

document.addEventListener('DOMContentLoaded', initApp);
