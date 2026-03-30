// ==========================================
// OTAK UTAMA FRONTEND (APP.JS - V5.0 ULTIMATE)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// ==========================================
// 1. INISIALISASI & KONTROL TAMPILAN
// ==========================================
async function initApp() {
    setTimeout(() => { cekSesiLogin(); }, 1500);
    setupEventListeners();
}

function cekSesiLogin() {
    const token = localStorage.getItem('SESSION_TOKEN');
    const profileStr = localStorage.getItem('USER_PROFILE');

    document.getElementById('view-splash').classList.add('hidden');
    document.getElementById('view-splash').classList.remove('active');

    if (token && profileStr) {
        tampilkanBeranda(JSON.parse(profileStr));
    } else {
        document.getElementById('view-login').classList.remove('hidden');
        document.getElementById('view-login').classList.add('active');
    }
}

function tampilkanBeranda(profile) {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-login').classList.remove('active');
    
    document.getElementById('view-app').classList.remove('hidden');
    document.getElementById('view-app').classList.add('active');

    document.getElementById('sidebar-nama').innerText = profile.nama || 'Nama User';
    document.getElementById('sidebar-role').innerText = profile.role_akses || 'KADER';
    
    const namaPanggilan = (profile.nama || 'User').split(' ')[0];
    document.getElementById('user-greeting').innerText = `Halo, ${namaPanggilan}`;

    renderMenuSidebar(profile.role_akses);
    renderKonten('rekap'); // Default buka halaman Rekap
}

function renderMenuSidebar(role) {
    const nav = document.getElementById('dynamic-menu-container');
    const roleUpper = String(role).toUpperCase();
    let menuHtml = '';

    menuHtml += `<a href="#" onclick="renderKonten('rekap'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">📊 Dashboard & Rekap</a>`;
    
    // Sembunyikan form input untuk Admin Pusat
    if (roleUpper !== 'ADMIN_KABUPATEN' && roleUpper !== 'SUPER_ADMIN') {
        menuHtml += `<a href="#" onclick="renderKonten('registrasi'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">📝 Registrasi Sasaran</a>`;
        menuHtml += `<a href="#" onclick="renderKonten('pendampingan'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">🤝 Laporan Pendampingan</a>`;
    }
    
    menuHtml += `<a href="#" onclick="renderKonten('daftar-sasaran'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">📋 Daftar Sasaran</a>`;
    menuHtml += `<a href="#" onclick="renderKonten('kalkulator'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">🧮 Kalkulator Cerdas</a>`;
    menuHtml += `<a href="#" onclick="renderKonten('setting'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">⚙️ Pengaturan</a>`;
    
    nav.innerHTML = menuHtml;
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if(sidebar) sidebar.classList.remove('active');
    if(overlay) overlay.classList.remove('active');
}

// ==========================================
// 2. LOGOUT GLOBAL
// ==========================================
window.prosesLogout = async function() {
    if (!confirm('🚪 Yakin ingin Keluar Aplikasi?\n\nJika Anda Kader, pastikan data sinkronisasi Offline sudah terkirim (Status Online Hijau).')) return;
    
    // Beritahu satelit untuk menghancurkan token (Bypass interceptor jika offline)
    try { await window.apiCall('logout', {}, {}, true); } catch(e) { console.log("Logout diabaikan oleh server/offline"); }
    
    // Hapus memori sesi di HP
    localStorage.removeItem('SESSION_TOKEN');
    localStorage.removeItem('USER_PROFILE');
    
    // Refresh halaman agar kembali ke layar Login
    window.location.reload();
};

// ==========================================
// 3. EVENT LISTENERS UTAMA (LOGIN & MENU)
// ==========================================
function setupEventListeners() {
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idUser = document.getElementById('kader-id').value.trim();
            const pin = document.getElementById('kader-pin').value.trim();
            const btnSubmit = document.getElementById('btn-login-submit');

            const originalText = btnSubmit.innerText;
            btnSubmit.innerText = "Memverifikasi...";
            btnSubmit.disabled = true;

            try {
                const res = await apiCall('login', { id_user: idUser, password: pin });
                if (res.ok) {
                    localStorage.setItem('USER_PROFILE', JSON.stringify(res.profile));
                    tampilkanBeranda(res.profile);
                } else {
                    alert("❌ Gagal Login: " + res.message);
                }
            } catch (error) {
                alert("⚠️ Terjadi kesalahan jaringan.");
            } finally {
                btnSubmit.innerText = originalText;
                btnSubmit.disabled = false;
            }
        });
    }

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

// ==========================================
// 4. MESIN PENGGANTI HALAMAN (ROUTER)
// ==========================================
window.renderKonten = function(templateId) {
    const contentArea = document.getElementById('content-area');
    const template = document.getElementById(`template-${templateId}`);
    
    if (!template) {
        contentArea.innerHTML = `<div class="card"><h2>⚠️ Modul dalam perbaikan</h2></div>`;
        return;
    }

    contentArea.innerHTML = '';
    contentArea.appendChild(template.content.cloneNode(true));

    if (templateId === 'rekap') initHalamanRekap();
    if (templateId === 'registrasi') initHalamanRegistrasi();
    if (templateId === 'pendampingan') initHalamanPendampingan();
    if (templateId === 'daftar-sasaran') initHalamanDaftarSasaran();
    if (templateId === 'setting') initHalamanSetting();
    if (templateId === 'kalkulator') initHalamanKalkulator();
}

// ==========================================
// 5. MODUL REKAP / DASHBOARD (MULTI-ROLE)
// ==========================================
async function initHalamanRekap() {
    const profileStr = localStorage.getItem('USER_PROFILE');
    if (!profileStr) return;
    const profile = JSON.parse(profileStr);
    const role = String(profile.role_akses).toUpperCase();

    const tbodyTim = document.getElementById('tbody-rekap-tim');
    const tbodyKader = document.getElementById('tbody-rekap-kader');
    const now = new Date();
    const periodeKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (tbodyTim) tbodyTim.innerHTML = `<tr><td colspan="3" style="padding:20px;">⏳ Menarik data dari Satelit...</td></tr>`;

    try {
        // 🔥 JIKA ADMIN KABUPATEN / SUPER ADMIN
        if (role === 'ADMIN_KABUPATEN' || role === 'SUPER_ADMIN') {
            if (tbodyKader) {
                const boxKader = tbodyKader.closest('div').parentElement;
                if (boxKader) boxKader.style.display = 'none';
            }

            const boxTim = tbodyTim.closest('div').parentElement;
            const titleTim = boxTim.querySelector('h4');
            if (titleTim) titleTim.innerHTML = `<span class="icon">🏢</span> Rekap Total Kabupaten Buleleng`;

            const res = await apiCall('getDashboardSummary', { periode_key: periodeKey });
            
            if (res.ok) {
                const data = res.data;
                const jenisList = ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'];
                let htmlAdmin = '';

                jenisList.forEach(jenis => {
                    const sasaranAktif = data.sasaran_aktif_per_jenis ? (data.sasaran_aktif_per_jenis[jenis] || 0) : 0;
                    htmlAdmin += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding:12px; text-align:left; font-weight:bold; color:#0A2342;">${jenis}</td>
                            <td style="padding:12px;">${sasaranAktif}</td>
                            <td style="padding:12px; color:#888;">(Lihat Detail di Web)</td>
                        </tr>
                    `;
                });

                htmlAdmin += `
                    <tr style="background:#0A2342; color:#fff; font-weight:bold; font-size:1.1rem;">
                        <td style="padding:15px; text-align:left;">TOTAL KABUPATEN</td>
                        <td style="padding:15px; color:#ffc107;">${data.total_sasaran_aktif || 0}</td>
                        <td style="padding:15px; color:#198754; background:#fff;">${data.total_pendampingan_bulan_ini || 0} Lap.</td>
                    </tr>
                `;
                if (tbodyTim) tbodyTim.innerHTML = htmlAdmin;
            } else {
                if (tbodyTim) tbodyTim.innerHTML = `<tr><td colspan="3" style="color:red; padding:20px;">❌ Gagal memuat: ${res.message}</td></tr>`;
            }

        } 
        // 🔥 JIKA KADER / ADMIN KECAMATAN
        else {
            if (tbodyKader) tbodyKader.innerHTML = `<tr><td colspan="3" style="padding:20px; color:#666;">Data individu Anda tergabung di Rekap Tim di bawah.</td></tr>`;

            const res = await apiCall('getRekapBulananTim', { id_tim: profile.id_tim, periode_key: periodeKey });
            if (res.ok) {
                const data = res.data;
                const jenisList = ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'];
                let htmlTim = ''; let totalSasaran = 0; let totalPendampingan = 0;

                jenisList.forEach(jenis => {
                    const sasaranAktif = data.sasaran_per_jenis[jenis] || 0;
                    const pend = data.pendampingan_per_jenis[jenis] || 0;
                    totalSasaran += sasaranAktif; totalPendampingan += pend;

                    htmlTim += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding:12px; text-align:left; font-weight:bold; color:#198754;">${jenis}</td>
                            <td style="padding:12px;">${sasaranAktif}</td>
                            <td style="padding:12px;">${pend}</td>
                        </tr>
                    `;
                });

                htmlTim += `
                    <tr style="background:#e8f4fd; font-weight:bold; font-size:1.1rem;">
                        <td style="padding:15px; text-align:left;">TOTAL TIM</td>
                        <td style="padding:15px; color:#0d6efd;">${totalSasaran}</td>
                        <td style="padding:15px; color:#198754;">${totalPendampingan}</td>
                    </tr>
                `;
                if (tbodyTim) tbodyTim.innerHTML = htmlTim;
            } else {
                if (tbodyTim) tbodyTim.innerHTML = `<tr><td colspan="3" style="color:red; padding:20px;">❌ Gagal memuat: ${res.message}</td></tr>`;
            }
        }
    } catch (error) {
        if (tbodyTim) tbodyTim.innerHTML = `<tr><td colspan="3" style="color:red; padding:20px;">⚠️ Gagal terhubung ke server.</td></tr>`;
    }
}

// ==========================================
// 6. MODUL REGISTRASI SASARAN
// ==========================================
function initHalamanRegistrasi() {
    const formReg = document.getElementById('form-registrasi');
    const selectJenis = document.getElementById('reg-jenis');
    
    if (selectJenis) {
        selectJenis.addEventListener('change', (e) => {
            const val = e.target.value;
            document.getElementById('box-ibu-kandung').style.display = (val === 'BADUTA') ? 'block' : 'none';
            document.getElementById('box-tgl-nikah').style.display = (val === 'CATIN') ? 'block' : 'none';
            document.getElementById('box-tgl-salin-reg').style.display = (val === 'BUFAS') ? 'block' : 'none';
            document.getElementById('wilayah-catin').style.display = (val === 'CATIN') ? 'block' : 'none';
        });
    }

    if (formReg) {
        formReg.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formReg.querySelector('button[type="submit"]');
            const profile = JSON.parse(localStorage.getItem('USER_PROFILE'));
            const formData = new FormData(formReg);
            
            const payload = {
                nama_sasaran: formData.get('nama_sasaran'), nama_kk: formData.get('nama_kk'), jenis_sasaran: formData.get('jenis_sasaran'),
                nik_sasaran: formData.get('nik'), nomor_kk: formData.get('no_kk'), tanggal_lahir: formData.get('tanggal_lahir'),
                jenis_kelamin: formData.get('jenis_kelamin'), alamat: formData.get('alamat'), desa: formData.get('desa') || profile.desa,
                dusun: formData.get('dusun') || profile.dusun, id_tim: profile.id_tim, id_wilayah: profile.desa || profile.id_kecamatan
            };

            const origText = btn.innerText;
            btn.innerText = "⏳ Mengirim Data...";
            btn.disabled = true;

            try {
                const res = await apiCall('registerSasaran', payload);
                if (res.ok) {
                    if (res.data && res.data.duplicate_flag) alert(`⚠️ PERINGATAN POTENSI DUPLIKAT!\nSasaran disimpan, namun sistem mendeteksi kemiripan data di wilayah lain. Admin akan melakukan review.`);
                    else alert(res.message || "✅ Registrasi Sasaran Berhasil!");
                    formReg.reset();
                } else {
                    if (res.duplicate_detected) alert(`❌ REGISTRASI DITOLAK!\nSistem mengunci pendaftaran karena NIK/Identitas ini SUDAH ADA di database.\nAlasan: ${res.reason_code}`);
                    else alert("❌ Gagal: " + res.message);
                }
            } catch (error) { alert("⚠️ Terjadi kesalahan jaringan."); } 
            finally { btn.innerText = origText; btn.disabled = false; }
        });
    }
}

// ==========================================
// 7. MODUL PENDAMPINGAN (LAPORAN)
// ==========================================
async function initHalamanPendampingan() {
    const profile = JSON.parse(localStorage.getItem('USER_PROFILE'));
    const selectJenis = document.getElementById('pend-jenis');
    const selectSasaran = document.getElementById('pend-sasaran');
    const infoSasaran = document.getElementById('pend-info-sasaran');
    const formPendampingan = document.getElementById('form-pendampingan');
    let listSasaranSatelit = [];

    selectSasaran.innerHTML = `<option value="">⏳ Menarik data sasaran dari Satelit...</option>`;
    selectSasaran.disabled = true;

    try {
        const res = await apiCall('getSasaranByTim', { id_tim: profile.id_tim });
        if (res.ok) {
            listSasaranSatelit = res.data.filter(r => r.tipe_laporan === 'REGISTRASI' && String(r.status_sasaran).toUpperCase() === 'AKTIF');
            selectSasaran.innerHTML = `<option value="">-- Pilih Sasaran --</option>`;
            selectSasaran.disabled = false;
        } else selectSasaran.innerHTML = `<option value="">❌ Gagal menarik data sasaran</option>`;
    } catch(e) { selectSasaran.innerHTML = `<option value="">⚠️ Koneksi terputus</option>`; }

    if (selectJenis) {
        selectJenis.addEventListener('change', (e) => {
            const jenis = e.target.value;
            selectSasaran.innerHTML = `<option value="">-- Pilih Sasaran --</option>`;
            infoSasaran.style.display = 'none';
            const filtered = listSasaranSatelit.filter(s => s.jenis_sasaran === jenis);
            filtered.forEach(s => { selectSasaran.innerHTML += `<option value="${s.id}">${s.nama_sasaran} (Dusun: ${s.dusun || '-'})</option>`; });
        });
    }

    if (selectSasaran) {
        selectSasaran.addEventListener('change', (e) => {
            const target = listSasaranSatelit.find(s => s.id === e.target.value);
            if (target) {
                infoSasaran.style.display = 'block';
                infoSasaran.innerHTML = `<strong>👤 ${target.nama_sasaran}</strong><br><small>NIK: ${target.data_laporan.nik || '-'}</small>`;
            } else infoSasaran.style.display = 'none';
        });
    }

    if (formPendampingan) {
        formPendampingan.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formPendampingan.querySelector('button[type="submit"]');
            const formData = new FormData(formPendampingan);
            
            const payload = {
                id_sasaran: formData.get('id_sasaran'), tanggal_pendampingan: formData.get('tgl_kunjungan'),
                keterangan: formData.get('catatan'), jawaban: { status_kunjungan: 'Selesai' }
            };

            const submitId = 'SUB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
            const origText = btn.innerText; btn.innerText = "⏳ Mengirim Laporan..."; btn.disabled = true;

            try {
                const res = await apiCall('submitPendampingan', payload, { client_submit_id: submitId });
                if (res.ok) {
                    if (res.duplicate_submit) alert("⚠️ Laporan ini sudah pernah terkirim bulan ini.");
                    else { alert(res.message || "✅ Laporan Pendampingan Berhasil Disimpan!"); formPendampingan.reset(); infoSasaran.style.display = 'none'; }
                } else alert("❌ Gagal: " + res.message);
            } catch (error) { alert("⚠️ Terjadi kesalahan jaringan."); } 
            finally { btn.innerText = origText; btn.disabled = false; }
        });
    }
}

// ==========================================
// 8. MODUL DAFTAR SASARAN & UBAH STATUS
// ==========================================
let globalDataSasaran = []; 
async function initHalamanDaftarSasaran() {
    const profile = JSON.parse(localStorage.getItem('USER_PROFILE'));
    const listContainer = document.getElementById('list-sasaran');
    const filterJenis = document.getElementById('filter-jenis');
    const filterStatus = document.getElementById('filter-status');
    const roleUpper = String(profile.role_akses).toUpperCase();

    listContainer.innerHTML = `<div style="padding:20px; text-align:center;">⏳ Menarik daftar dari satelit...</div>`;

    try {
        // Jika admin Kabupaten buka, tarik sebagian data master atau bypass (bisa diatur nanti),
        // Sementara kita tembak ke API, Backend sudah menangani filter by role.
        const res = await apiCall('getSasaranByTim', { id_tim: profile.id_tim });
        if (res.ok) {
            globalDataSasaran = res.data.filter(r => r.tipe_laporan === 'REGISTRASI');
            renderListSasaran();
        } else {
            listContainer.innerHTML = `<div style="color:red; text-align:center;">❌ Gagal memuat data: ${res.message}</div>`;
        }
    } catch(e) {
        listContainer.innerHTML = `<div style="color:red; text-align:center;">⚠️ Gagal terhubung ke server.</div>`;
    }

    if (filterJenis) filterJenis.addEventListener('change', renderListSasaran);
    if (filterStatus) filterStatus.addEventListener('change', renderListSasaran);

    const btnTutupModal = document.getElementById('btn-tutup-modal');
    if (btnTutupModal) {
        btnTutupModal.addEventListener('click', () => {
            document.getElementById('modal-detail').style.display = 'none';
        });
    }
}

function renderListSasaran() {
    const listContainer = document.getElementById('list-sasaran');
    const fJenis = document.getElementById('filter-jenis') ? document.getElementById('filter-jenis').value : 'ALL';
    const fStatus = document.getElementById('filter-status') ? document.getElementById('filter-status').value : 'ALL';

    let filtered = globalDataSasaran;
    if (fJenis !== 'ALL') filtered = filtered.filter(s => s.jenis_sasaran === fJenis);
    if (fStatus !== 'ALL') filtered = filtered.filter(s => String(s.status_sasaran).toUpperCase() === fStatus);

    if (filtered.length === 0) {
        listContainer.innerHTML = `<div style="padding:20px; text-align:center; color:#666;">Tidak ada data sasaran.</div>`;
        return;
    }

    let html = '';
    filtered.forEach(s => {
        const badgeColor = String(s.status_sasaran).toUpperCase() === 'AKTIF' ? '#198754' : '#6c757d';
        html += `
            <div style="background:#fff; padding:15px; border-radius:8px; border:1px solid #ddd; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="color:var(--primary); font-size:1.1rem;">${s.nama_sasaran}</strong><br>
                    <span style="font-size:0.85rem; color:#666;">NIK: ${s.data_laporan.nik || '-'} | Jenis: <b>${s.jenis_sasaran}</b></span>
                </div>
                <div style="text-align:right;">
                    <span style="background:${badgeColor}; color:#fff; padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">${s.status_sasaran}</span>
                    <button onclick="window.bukaModalDetail('${s.id}')" style="display:block; margin-top:8px; background:#0d6efd; color:#fff; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:0.8rem;">Lihat Detail</button>
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;
}

window.bukaModalDetail = function(idSasaran) {
    const s = globalDataSasaran.find(x => x.id === idSasaran);
    if (!s) return;

    const modal = document.getElementById('modal-detail');
    const konten = document.getElementById('konten-detail');

    let btnUbahStatus = '';
    if (String(s.status_sasaran).toUpperCase() === 'AKTIF') {
        btnUbahStatus = `
            <hr style="margin:15px 0;">
            <h4 style="color:#d63384; margin-bottom:10px;">⚠️ Ubah Status Sasaran</h4>
            <select id="select-ubah-status" class="form-control" style="margin-bottom:10px;">
                <option value="">-- Pilih Status Baru --</option>
                <option value="SELESAI">Selesai (Lulus / Tuntas)</option>
                <option value="PINDAH">Pindah Domisili</option>
                <option value="MENINGGAL">Meninggal Dunia</option>
            </select>
            <button onclick="window.prosesUbahStatus('${s.id}')" class="btn-primary" style="width:100%; background:#d63384; border:none;">Simpan Perubahan Status</button>
        `;
    }

    konten.innerHTML = `
        <table style="width:100%; font-size:0.9rem; text-align:left; border-collapse: collapse;">
            <tr><th style="padding:8px 0; border-bottom:1px solid #eee; width:40%;">Nama Sasaran</th><td style="border-bottom:1px solid #eee;">: ${s.nama_sasaran}</td></tr>
            <tr><th style="padding:8px 0; border-bottom:1px solid #eee;">NIK</th><td style="border-bottom:1px solid #eee;">: ${s.data_laporan.nik || '-'}</td></tr>
            <tr><th style="padding:8px 0; border-bottom:1px solid #eee;">No KK</th><td style="border-bottom:1px solid #eee;">: ${s.data_laporan.nomor_kk || '-'}</td></tr>
            <tr><th style="padding:8px 0; border-bottom:1px solid #eee;">Jenis Sasaran</th><td style="border-bottom:1px solid #eee;">: <b>${s.jenis_sasaran}</b></td></tr>
            <tr><th style="padding:8px 0; border-bottom:1px solid #eee;">Tanggal Lahir</th><td style="border-bottom:1px solid #eee;">: ${s.data_laporan.tanggal_lahir || '-'}</td></tr>
            <tr><th style="padding:8px 0; border-bottom:1px solid #eee;">Alamat Domisili</th><td style="border-bottom:1px solid #eee;">: ${s.data_laporan.alamat || '-'}, Ds. ${s.desa || '-'}</td></tr>
            <tr><th style="padding:8px 0; border-bottom:1px solid #eee;">Status Saat Ini</th><td style="border-bottom:1px solid #eee;">: <b style="color:#198754;">${s.status_sasaran}</b></td></tr>
        </table>
        ${btnUbahStatus}
    `;
    modal.style.display = 'block';
}

window.prosesUbahStatus = async function(idSasaran) {
    const statusBaru = document.getElementById('select-ubah-status').value;
    if (!statusBaru) { alert("Pilih status baru terlebih dahulu!"); return; }

    if (!confirm(`Yakin mengubah status sasaran menjadi ${statusBaru}? Tindakan ini akan tercatat di riwayat server.`)) return;

    try {
        const res = await apiCall('changeStatusSasaran', { id_sasaran: idSasaran, status_baru: statusBaru, note: 'Diubah melalui Aplikasi HP' });
        if (res.ok) {
            alert(res.message || "✅ Status sasaran berhasil diubah!");
            document.getElementById('modal-detail').style.display = 'none';
            initHalamanDaftarSasaran(); // Refresh daftar
        } else {
            alert("❌ Gagal merubah status: " + res.message);
        }
    } catch(e) {
        alert("⚠️ Terjadi kesalahan jaringan.");
    }
}

// ==========================================
// 9. MODUL PENGATURAN & GANTI PIN
// ==========================================
function initHalamanSetting() {
    const profile = JSON.parse(localStorage.getItem('USER_PROFILE'));
    if (!profile) return;

    const elNama = document.getElementById('set-nama');
    const elId = document.getElementById('set-id');
    
    if (elNama) elNama.value = profile.nama || '';
    if (elId) elId.value = profile.id_user || profile.username || '';

    const formPass = document.getElementById('form-ganti-pass');
    if (formPass) {
        formPass.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputs = formPass.querySelectorAll('input[type="password"]');
            if(inputs.length < 2) return;
            
            const pinLama = inputs[0].value;
            const pinBaru = inputs[1].value;
            const btn = formPass.querySelector('button');

            if(pinBaru.length < 6) { alert("PIN Baru minimal 6 digit!"); return; }

            btn.innerText = "⏳ Memproses..."; btn.disabled = true;
            try {
                const res = await apiCall('changePassword', { current_password: pinLama, new_password: pinBaru });
                if (res.ok) {
                    alert("✅ PIN Berhasil Diperbarui! Silakan gunakan PIN baru untuk login selanjutnya.");
                    formPass.reset();
                } else {
                    alert("❌ Gagal: " + res.message);
                }
            } catch(e) { alert("⚠️ Terjadi kesalahan jaringan."); }
            finally { btn.innerText = "Perbarui PIN"; btn.disabled = false; }
        });
    }
}

// ==========================================
// 10. MODUL KALKULATOR CERDAS
// ==========================================
function initHalamanKalkulator() {
    const selector = document.getElementById('calc-selector');
    if (!selector) return;

    selector.addEventListener('change', (e) => {
        const val = e.target.value;
        document.getElementById('box-calc-hpl').style.display = val === 'HPL' ? 'block' : 'none';
        document.getElementById('box-calc-imt').style.display = val === 'IMT' ? 'block' : 'none';
        document.getElementById('box-calc-kka').style.display = val === 'KKA' ? 'block' : 'none';
    });

    const btnHpl = document.getElementById('btn-hitung-hpl');
    if (btnHpl) {
        btnHpl.addEventListener('click', () => {
            const hpht = document.getElementById('calc-hpht').value;
            if (!hpht) { alert("Masukkan tanggal HPHT!"); return; }
            const date = new Date(hpht);
            date.setDate(date.getDate() + 280);
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById('hasil-hpl').innerText = "Perkiraan Lahir: " + date.toLocaleDateString('id-ID', options);
        });
    }

    const btnImt = document.getElementById('btn-hitung-imt');
    if (btnImt) {
        btnImt.addEventListener('click', () => {
            const bb = parseFloat(document.getElementById('calc-bb').value);
            const tb = parseFloat(document.getElementById('calc-tb').value) / 100;
            if (!bb || !tb) { alert("Masukkan BB dan TB dengan benar!"); return; }
            
            const imt = (bb / (tb * tb)).toFixed(1);
            let status = ''; let color = '';
            if (imt < 18.5) { status = 'Kurus (Kekurangan Berat Badan)'; color = '#dc3545'; }
            else if (imt >= 18.5 && imt < 25) { status = 'Normal (Ideal)'; color = '#198754'; }
            else if (imt >= 25 && imt < 27) { status = 'Gemuk (Overweight)'; color = '#ffc107'; }
            else { status = 'Obesitas'; color = '#dc3545'; }

            document.getElementById('hasil-imt').innerHTML = `IMT: <span style="font-size:1.5rem; color:${color};">${imt}</span><br><span style="color:${color};">${status}</span>`;
        });
    }

    const usiaKka = document.getElementById('calc-usia-kka');
    if (usiaKka) {
        usiaKka.addEventListener('change', (e) => {
            const hasil = document.getElementById('hasil-kka');
            const v = e.target.value;
            if (v === '0-3') hasil.innerHTML = "<b>Target Kembang (0-3 Bln):</b><br>- Mengangkat kepala setinggi 45°<br>- Melihat dan menatap wajah anda<br>- Mengoceh spontan atau bereaksi dengan mengoceh";
            else if (v === '3-6') hasil.innerHTML = "<b>Target Kembang (3-6 Bln):</b><br>- Berbalik dari telungkup ke telentang<br>- Mempertahankan posisi kepala tetap tegak<br>- Meraih benda yang ada di dekatnya";
            else if (v === '6-12') hasil.innerHTML = "<b>Target Kembang (6-12 Bln):</b><br>- Duduk mandiri<br>- Berdiri merambat<br>- Mengucapkan 'Ma-ma' atau 'Pa-pa' tanpa arti";
            else if (v === '12-24') hasil.innerHTML = "<b>Target Kembang (12-24 Bln):</b><br>- Berjalan sendiri<br>- Minum dari gelas<br>- Mencoret-coret menggunakan alat tulis";
            else hasil.innerHTML = '';
        });
    }
}
