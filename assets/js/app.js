// ==========================================
// OTAK UTAMA FRONTEND (APP.JS - V3.0)
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

    document.getElementById('sidebar-nama').innerText = profile.nama || 'Nama Kader';
    document.getElementById('sidebar-role').innerText = profile.role_akses || 'KADER';
    
    const namaPanggilan = (profile.nama || 'Kader').split(' ')[0];
    document.getElementById('user-greeting').innerText = `Halo, ${namaPanggilan}`;

    renderMenuSidebar();
    renderKonten('rekap'); // Default buka halaman Rekap
}

function renderMenuSidebar() {
    const nav = document.getElementById('dynamic-menu-container');
    nav.innerHTML = `
        <a href="#" onclick="renderKonten('rekap'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">📊 Dashboard & Rekap</a>
        <a href="#" onclick="renderKonten('registrasi'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">📝 Registrasi Sasaran</a>
        <a href="#" onclick="renderKonten('pendampingan'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">🤝 Laporan Pendampingan</a>
        <a href="#" onclick="renderKonten('daftar-sasaran'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">📋 Daftar Sasaran</a>
        <a href="#" onclick="renderKonten('kalkulator'); closeSidebar();" class="nav-item" style="display:block; padding:15px; border-bottom:1px solid #eee; text-decoration:none; color:#333;">🧮 Kalkulator Cerdas</a>
    `;
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if(sidebar) sidebar.classList.remove('active');
    if(overlay) overlay.classList.remove('active');
}

// ==========================================
// 2. EVENT LISTENERS UTAMA (LOGIN & MENU)
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
// 3. MESIN PENGGANTI HALAMAN (ROUTER)
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

    // Router Eksekusi Fungsi
    if (templateId === 'rekap') initHalamanRekap();
    if (templateId === 'registrasi') initHalamanRegistrasi();
    if (templateId === 'pendampingan') initHalamanPendampingan();
}

// ==========================================
// 4. MODUL REKAP / DASHBOARD
// ==========================================
async function initHalamanRekap() {
    const profileStr = localStorage.getItem('USER_PROFILE');
    if (!profileStr) return;
    const profile = JSON.parse(profileStr);

    const tbodyTim = document.getElementById('tbody-rekap-tim');
    const now = new Date();
    const periodeKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (tbodyTim) tbodyTim.innerHTML = `<tr><td colspan="3" style="padding:20px;">⏳ Menarik data dari Satelit...</td></tr>`;

    try {
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
    } catch (error) {
        if (tbodyTim) tbodyTim.innerHTML = `<tr><td colspan="3" style="color:red; padding:20px;">⚠️ Gagal terhubung ke server.</td></tr>`;
    }
}

// ==========================================
// 5. MODUL REGISTRASI SASARAN
// ==========================================
function initHalamanRegistrasi() {
    const formReg = document.getElementById('form-registrasi');
    const selectJenis = document.getElementById('reg-jenis');
    
    // Tampilkan field khusus berdasarkan jenis sasaran
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
            
            // Ambil nilai dari form
            const formData = new FormData(formReg);
            const payload = {
                nama_sasaran: formData.get('nama_sasaran'),
                nama_kk: formData.get('nama_kk'),
                jenis_sasaran: formData.get('jenis_sasaran'),
                nik_sasaran: formData.get('nik'),
                nomor_kk: formData.get('no_kk'),
                tanggal_lahir: formData.get('tanggal_lahir'),
                jenis_kelamin: formData.get('jenis_kelamin'),
                alamat: formData.get('alamat'),
                desa: formData.get('desa') || profile.desa,
                dusun: formData.get('dusun') || profile.dusun,
                id_tim: profile.id_tim,
                id_wilayah: profile.desa || profile.id_kecamatan // Fallback wilayah
            };

            const origText = btn.innerText;
            btn.innerText = "⏳ Mengirim Data ke Satelit...";
            btn.disabled = true;

            try {
                const res = await apiCall('registerSasaran', payload);
                if (res.ok) {
                    if (res.data && res.data.duplicate_flag) {
                        alert(`⚠️ PERINGATAN POTENSI DUPLIKAT!\n\nSasaran berhasil disimpan, namun sistem mendeteksi kemiripan data di kecamatan/desa lain. Admin akan melakukan review.`);
                    } else {
                        alert("✅ Registrasi Sasaran Berhasil!");
                    }
                    formReg.reset();
                    document.getElementById('box-ibu-kandung').style.display = 'none';
                    document.getElementById('box-tgl-nikah').style.display = 'none';
                    document.getElementById('box-tgl-salin-reg').style.display = 'none';
                    document.getElementById('wilayah-catin').style.display = 'none';
                } else {
                    if (res.duplicate_detected) {
                        alert(`❌ REGISTRASI DITOLAK!\n\nSistem mengunci pendaftaran karena NIK/Identitas ini SUDAH ADA di database Kabupaten.\nAlasan: ${res.reason_code}`);
                    } else {
                        alert("❌ Gagal: " + res.message);
                    }
                }
            } catch (error) {
                alert("⚠️ Gagal terhubung ke server.");
            } finally {
                btn.innerText = origText;
                btn.disabled = false;
            }
        });
    }
}

// ==========================================
// 6. MODUL PENDAMPINGAN (LAPORAN)
// ==========================================
async function initHalamanPendampingan() {
    const profile = JSON.parse(localStorage.getItem('USER_PROFILE'));
    const selectJenis = document.getElementById('pend-jenis');
    const selectSasaran = document.getElementById('pend-sasaran');
    const infoSasaran = document.getElementById('pend-info-sasaran');
    const formPendampingan = document.getElementById('form-pendampingan');

    let listSasaranSatelit = [];

    // 1. Tarik Data Sasaran dari Server untuk Tim Ini
    selectSasaran.innerHTML = `<option value="">⏳ Menarik data sasaran dari Satelit...</option>`;
    selectSasaran.disabled = true;

    try {
        const res = await apiCall('getSasaranByTim', { id_tim: profile.id_tim });
        if (res.ok) {
            // Filter hanya registrasi aktif
            listSasaranSatelit = res.data.filter(r => r.tipe_laporan === 'REGISTRASI' && String(r.status_sasaran).toUpperCase() === 'AKTIF');
            selectSasaran.innerHTML = `<option value="">-- Pilih Sasaran --</option>`;
            selectSasaran.disabled = false;
        } else {
            selectSasaran.innerHTML = `<option value="">❌ Gagal menarik data sasaran</option>`;
        }
    } catch(e) {
        selectSasaran.innerHTML = `<option value="">⚠️ Koneksi terputus</option>`;
    }

    // 2. Filter Sasaran berdasarkan Jenis
    if (selectJenis) {
        selectJenis.addEventListener('change', (e) => {
            const jenis = e.target.value;
            selectSasaran.innerHTML = `<option value="">-- Pilih Sasaran --</option>`;
            infoSasaran.style.display = 'none';
            
            const filtered = listSasaranSatelit.filter(s => s.jenis_sasaran === jenis);
            filtered.forEach(s => {
                selectSasaran.innerHTML += `<option value="${s.id}">${s.nama_sasaran} (Dusun: ${s.dusun || '-'})</option>`;
            });
            
            if (filtered.length === 0 && jenis !== "") {
                selectSasaran.innerHTML = `<option value="">Tidak ada sasaran aktif untuk jenis ini</option>`;
            }
        });
    }

    // 3. Tampilkan Info Singkat Saat Sasaran Dipilih
    if (selectSasaran) {
        selectSasaran.addEventListener('change', (e) => {
            const id = e.target.value;
            const target = listSasaranSatelit.find(s => s.id === id);
            if (target) {
                infoSasaran.style.display = 'block';
                infoSasaran.innerHTML = `<strong>👤 ${target.nama_sasaran}</strong><br><small>NIK: ${target.data_laporan.nik || '-'}</small>`;
                
                // TODO: Di masa depan, bangun form dinamis (pertanyaan KB, BB/TB) di sini menggunakan JS
                document.getElementById('form-pendampingan-dinamis').innerHTML = `
                    <div style="background:#fff3cd; padding:10px; border-radius:5px; margin-bottom:15px; font-size:0.85rem;">
                        <i>💡 Form pertanyaan dinamis akan muncul di sini. Saat ini hanya mencatat tanggal & hasil umum.</i>
                    </div>
                `;
            } else {
                infoSasaran.style.display = 'none';
                document.getElementById('form-pendampingan-dinamis').innerHTML = '';
            }
        });
    }

    // 4. Proses Submit Pendampingan
    if (formPendampingan) {
        formPendampingan.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formPendampingan.querySelector('button[type="submit"]');
            
            const formData = new FormData(formPendampingan);
            const payload = {
                id_sasaran: formData.get('id_sasaran'),
                tanggal_pendampingan: formData.get('tgl_kunjungan'),
                keterangan: formData.get('catatan'),
                jawaban: { status_kunjungan: 'Selesai' } // Simulasi jawaban form
            };

            // 🔥 Buat ID Submit Unik untuk Anti-Double Click
            const submitId = 'SUB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

            const origText = btn.innerText;
            btn.innerText = "⏳ Mengirim Laporan...";
            btn.disabled = true;

            try {
                const res = await apiCall('submitPendampingan', payload, { client_submit_id: submitId });
                
                if (res.ok) {
                    if (res.duplicate_submit) {
                        alert("⚠️ Laporan ini sudah pernah terkirim sebelumnya.");
                    } else {
                        alert("✅ Laporan Pendampingan Berhasil Disimpan!");
                        formPendampingan.reset();
                        infoSasaran.style.display = 'none';
                        document.getElementById('form-pendampingan-dinamis').innerHTML = '';
                    }
                } else {
                    alert("❌ Gagal: " + res.message);
                }
            } catch (error) {
                alert("⚠️ Gagal terhubung ke server.");
            } finally {
                btn.innerText = origText;
                btn.disabled = false;
            }
        });
    }
}
