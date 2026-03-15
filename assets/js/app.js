import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData } from './sync.js';

const getEl = (id) => document.getElementById(id);

// ==========================================
// 1. NAVIGASI LAYAR & JARINGAN
// ==========================================
const tampilkanLayar = (id) => {
    const vSplash = getEl('view-splash');
    const vLogin = getEl('view-login');
    const vApp = getEl('view-app');

    if (vSplash) { vSplash.classList.remove('active'); vSplash.style.display = 'none'; }
    if (id === 'login') {
        if (vLogin) vLogin.classList.remove('hidden');
        if (vApp) vApp.classList.add('hidden');
    } else if (id === 'app') {
        if (vLogin) vLogin.classList.add('hidden');
        if (vApp) vApp.classList.remove('hidden');
    }
    updateNetworkStatus();
};

const updateNetworkStatus = () => {
    const status = getEl('network-status');
    if (status) {
        const isOnline = navigator.onLine;
        status.innerText = isOnline ? 'Online' : 'Offline';
        status.style.backgroundColor = isOnline ? '#198754' : '#6c757d';
    }
};

// ==========================================
// 2. INISIALISASI APLIKASI
// ==========================================
const initApp = async () => {
    const logoTimeout = setTimeout(() => { tampilkanLayar('login'); }, 4000);
    try {
        await initDB();
        const session = await getDataById('kader_session', 'active_user').catch(() => null);
        clearTimeout(logoTimeout);
        if (session) {
            masukKeAplikasi(session);
        } else {
            tampilkanLayar('login');
            if (navigator.onLine) {
                const users = await getAllData('master_user').catch(() => []);
                if (users.length === 0) await downloadMasterData();
            }
        }
    } catch (err) { clearTimeout(logoTimeout); tampilkanLayar('login'); }
};

const masukKeAplikasi = async (session) => {
    window.currentUser = session;
    const allWil = await getAllData('master_tim_wilayah').catch(() => []);
    const wilayahKader = allWil.find(w => w.id_tim === session.id_tim);
    const namaKec = wilayahKader ? wilayahKader.kecamatan.toUpperCase() : "BULELENG";

    const greeting = getEl('user-greeting');
    if (greeting) greeting.innerHTML = `DASHBOARD KADER KECAMATAN ${namaKec}`;
    if (getEl('sidebar-nama')) getEl('sidebar-nama').innerText = session.nama;
    if (getEl('sidebar-role')) getEl('sidebar-role').innerText = session.role;
    
    renderMenu(session.role);
    renderKonten('dashboard'); 
    tampilkanLayar('app');
};

// ==========================================
// 3. MENU & KONTEN (DASHBOARD)
// ==========================================
const renderMenu = (role) => {
    const container = getEl('dynamic-menu-container');
    if (!container) return;

    const menus = [
        { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
        { id: 'registrasi', icon: '📝', label: 'Registrasi Sasaran' },
        { id: 'daftar_sasaran', icon: '📋', label: 'Daftar Sasaran' },
        { id: 'pendampingan', icon: '🤝', label: 'Laporan Pendampingan' },
        { id: 'rekap_kader', icon: '📊', label: 'Rekap Bulanan Kader' },
        { id: 'rekap_tim', icon: '📈', label: 'Rekap Bulanan Tim' },
        { id: 'cetak_pdf', icon: '🖨️', label: 'Cetak PDF' },
        { id: 'ganti_pass', icon: '🔑', label: 'Ganti Password' }
    ];

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

window.renderKonten = async (target) => {
    const area = getEl('content-area');
    if (!area) return;
    area.innerHTML = ''; 

    if (target === 'dashboard') {
        const session = window.currentUser;
        area.innerHTML = `
            <div class="animate-fade">
                <div class="card" style="background: linear-gradient(135deg, #0d6efd, #0043a8); color: white; border:none; margin-bottom: 20px; padding: 25px;">
                    <p style="margin:0; opacity: 0.9; font-weight: 800;">SELAMAT DATANG,</p>
                    <h2 style="margin: 5px 0 15px 0; font-size: 1.6rem; font-weight: 700;">${session.nama}</h2>
                    <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 0.9rem; margin-bottom: 20px;">
                        NO. TIM: ${session.nomor_tim || session.id_tim}
                    </div>
                    <hr style="margin-bottom: 20px; border: 0; border-top: 1px solid rgba(255,255,255,0.2);">
                    <div id="dash-detail-wilayah" style="font-size: 1.1rem; line-height: 1.7;">Memuat detail...</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="card" style="text-align:center; padding: 20px; border-bottom: 4px solid orange;">
                        <div style="font-size: 1.8rem;">📦</div>
                        <h3 id="dash-tunda">0</h3>
                        <p style="font-size: 0.75rem; color: #666; font-weight: bold;">TERTUNDA</p>
                    </div>
                    <div class="card" style="text-align:center; padding: 20px; cursor:pointer; border-bottom: 4px solid #0d6efd;" onclick="renderKonten('registrasi')">
                        <div style="font-size: 1.8rem;">📝</div>
                        <h3>BARU</h3>
                        <p style="font-size: 0.75rem; color: #666; font-weight: bold;">REGISTRASI</p>
                    </div>
                </div>
            </div>`;

        try {
            const [allWil, antrean] = await Promise.all([
                getAllData('master_tim_wilayah').catch(()=>[]),
                getAllData('sync_queue').catch(()=>[])
            ]);
            const wilayahKerja = allWil.filter(w => w.id_tim === session.id_tim);
            const daftarDusun = wilayahKerja.map(w => w.dusun_rw).join(', ') || '-';
            
            if (getEl('dash-detail-wilayah')) {
                getEl('dash-detail-wilayah').innerHTML = `
                    <div style="margin-bottom: 12px;"><span style="opacity:0.8; font-size: 0.9rem;">📍 Dusun/RW:</span><br><span style="font-weight: 500;">${daftarDusun}</span></div>
                    <div style="margin-bottom: 8px;"><span style="opacity:0.8; font-size: 0.9rem;">🏘️ Desa/Kelurahan:</span><br><span style="font-weight: 600;">${wilayahKerja[0]?.desa_kelurahan || '-'}</span></div>
                    <div><span style="opacity:0.8; font-size: 0.9rem;">🏛️ Kecamatan:</span><br><span style="font-weight: 600;">${wilayahKerja[0]?.kecamatan || '-'}</span></div>`;
            }
            if (getEl('dash-tunda')) getEl('dash-tunda').innerText = antrean.length;
        } catch (e) { console.error(e); }

    } else if (target === 'registrasi') {
        const tpl = getEl('template-registrasi');
        if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initFormRegistrasi(); }
    } else if (target === 'daftar_sasaran') {
        const tpl = getEl('template-daftar-sasaran');
        if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initDaftarSasaran(); }
    } else if (target === 'pendampingan') {
        const tpl = getEl('template-pendampingan');
        if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initFormPendampingan(); }
    } else if (target === 'rekap_kader' || target === 'rekap_tim') {
        const tpl = getEl('template-rekap');
        if(tpl) { 
            area.appendChild(tpl.content.cloneNode(true)); 
            if(getEl('judul-rekap')) getEl('judul-rekap').innerText = target === 'rekap_kader' ? '📊 Rekap Bulanan Kader' : '📈 Rekap Bulanan Tim';
            initRekap();
        }
    } else {
        area.innerHTML = `<div class="card" style="text-align:center; padding:30px;"><h3>Menu ${target.replace('_',' ').toUpperCase()}</h3><p>Segera Hadir.</p></div>`;
    }
};

// ==========================================
// 4. LOGIKA FORM DINAMIS (4 JENIS SASARAN)
// ==========================================
const initFormRegistrasi = async () => {
    const session = window.currentUser;
    const allWil = await getAllData('master_tim_wilayah').catch(()=>[]);
    const tugas = allWil.filter(w => w.id_tim === session.id_tim);
    
    const selJenis = getEl('reg-jenis');
    const selDesa = getEl('reg-desa');
    const selDusun = getEl('reg-dusun');
    const containerQ = getEl('pertanyaan-dinamis');

    // 1. Setup Dropdown Wilayah
    if (selDesa && tugas.length > 0) {
        const dDesa = [...new Set(tugas.map(w => w.desa_kelurahan))];
        selDesa.innerHTML = '<option value="">-- Pilih Desa --</option>' + dDesa.map(d => `<option value="${d}">${d}</option>`).join('');
        selDesa.onchange = () => {
            const dDusun = tugas.filter(w => w.desa_kelurahan === selDesa.value);
            selDusun.innerHTML = '<option value="">-- Pilih Dusun --</option>' + dDusun.map(d => `<option value="${d.dusun_rw}">${d.dusun_rw}</option>`).join('');
        };
    }

    // 2. Setup Pertanyaan Dinamis
    const questions = await getAllData('master_pertanyaan').catch(()=>[]);
    if (selJenis && containerQ) {
        selJenis.onchange = () => {
            const jenis = selJenis.value;
            if (!jenis) { containerQ.innerHTML = ''; return; }
            const filteredQ = questions.filter(q => q.is_active === 'Y' && (q.kategori_sasaran === 'UMUM' || q.kategori_sasaran === jenis)).sort((a,b)=>a.urutan - b.urutan);
            containerQ.innerHTML = `<h4 style="margin-bottom:10px; color:var(--primary);">Formulir ${jenis}</h4>` + 
                filteredQ.map(q => `<div class="form-group"><label>${q.label_pertanyaan}</label><input type="text" name="q_${q.id_pertanyaan}" class="form-control" required></div>`).join('');
        };
    }

    // 3. Simpan Form ke Antrean
    const formReg = getEl('form-registrasi');
    if (formReg) {
        formReg.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button'); btn.disabled = true; btn.innerText = "Menyimpan...";
            try {
                const formData = new FormData(e.target);
                const jawaban = {}; formData.forEach((val, key) => { jawaban[key] = val; });
                const kecamatan = tugas.length > 0 ? tugas[0].kecamatan : 'TIDAK_DIKETAHUI';
                const laporan = {
                    id: `REG-${Date.now()}`, tipe_laporan: 'REGISTRASI', username: session.username, nomor_tim: session.nomor_tim,
                    kecamatan: kecamatan, jenis_sasaran: selJenis.value, desa: selDesa.value, dusun: selDusun.value,
                    data_laporan: jawaban, created_at: new Date().toISOString()
                };
                await putData('sync_queue', laporan);
                alert(`✅ Registrasi ${laporan.jenis_sasaran} tersimpan di HP!`);
                renderKonten('dashboard');
            } catch (err) { alert("Gagal menyimpan form."); } finally { btn.disabled = false; btn.innerText = "💾 Simpan Registrasi"; }
        };
    }
};

const initDaftarSasaran = async () => {
    const list = getEl('list-sasaran');
    if(!list) return;
    const antrean = await getAllData('sync_queue').catch(()=>[]);
    const regList = antrean.filter(a => a.tipe_laporan === 'REGISTRASI');
    if (regList.length === 0) { list.innerHTML = `<div style="text-align:center; padding:20px; color:#999;">Belum ada sasaran yang diregistrasi di HP ini.</div>`; } 
    else { list.innerHTML = regList.map(r => `<div style="background:#f4f7f6; padding:15px; border-radius:8px; border-left: 4px solid var(--primary);"><strong>${r.jenis_sasaran}</strong> - ${r.desa} (${r.dusun})<div style="font-size:0.8rem; color:#666;">${new Date(r.created_at).toLocaleString('id-ID')}</div></div>`).join(''); }
};

const initFormPendampingan = async () => {
    const selSasaran = getEl('pend-sasaran');
    const antrean = await getAllData('sync_queue').catch(()=>[]);
    const regList = antrean.filter(a => a.tipe_laporan === 'REGISTRASI');
    if (selSasaran) { selSasaran.innerHTML = '<option value="">-- Pilih Sasaran --</option>' + regList.map(r => `<option value="${r.id}">${r.jenis_sasaran} (${r.dusun})</option>`).join(''); }
    const formPend = getEl('form-pendampingan');
    if (formPend) {
        formPend.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button'); btn.disabled = true;
            try {
                const formData = new FormData(e.target);
                const jawaban = {}; formData.forEach((val, key) => { jawaban[key] = val; });
                const laporan = { id: `PEND-${Date.now()}`, tipe_laporan: 'PENDAMPINGAN', username: window.currentUser.username, id_sasaran_ref: jawaban.id_sasaran, data_laporan: jawaban, created_at: new Date().toISOString() };
                await putData('sync_queue', laporan);
                alert("✅ Laporan Pendampingan tersimpan di HP!"); renderKonten('dashboard');
            } catch (err) { alert("Gagal menyimpan."); } finally { btn.disabled = false; }
        };
    }
};

const initRekap = async () => {
    const antrean = await getAllData('sync_queue').catch(()=>[]);
    if(getEl('rekap-total')) getEl('rekap-total').innerText = antrean.filter(a => a.tipe_laporan === 'REGISTRASI').length;
    if(getEl('rekap-pend')) getEl('rekap-pend').innerText = antrean.filter(a => a.tipe_laporan === 'PENDAMPINGAN').length;
};

// ==========================================
// 5. LOGIN TAHAN BANTING (DIJAMIN TIDAK ERROR)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();

    const fLogin = getEl('form-login');
    if (fLogin) {
        fLogin.onsubmit = async (e) => {
            e.preventDefault();
            const btn = getEl('btn-login-submit');
            const id = getEl('kader-id').value.trim();
            const pin = getEl('kader-pin').value.trim();

            if (!id || !pin) return;
            if (btn) { btn.disabled = true; btn.innerText = "Memeriksa..."; }

            try {
                // Pastikan DB Siap
                await initDB();
                
                // Cari User dengan perlindungan error (catch)
                const user = await getDataById('master_user', id).catch(() => null);
                
                if (!user) {
                    alert("❌ ID Pengguna tidak ditemukan. Pastikan koneksi internet menyala saat pertama kali login.");
                    if (btn) { btn.disabled = false; btn.innerText = "Masuk"; }
                    return;
                }

                // Amankan pembacaan PIN
                const pinBenar = user.password_awal_ref ? String(user.password_awal_ref) : "";
                
                if (pinBenar === pin) {
                    let nama = user.username, tim = '-', noTim = '-';
                    
                    // Amankan pencarian data Kader & Tim
                    if (user.role_akses === 'KADER' && user.ref_id) {
                        const k = await getDataById('master_kader', user.ref_id).catch(() => null);
                        if (k) { 
                            nama = k.nama_kader || nama; 
                            tim = k.id_tim || '-'; 
                            const t = await getDataById('master_tim', tim).catch(() => null);
                            noTim = t ? (t.nomor_tim || tim) : tim;
                        }
                    }
                    
                    const ses = { id_kader: 'active_user', username: user.username, role: user.role_akses, nama, id_tim: tim, nomor_tim: noTim };
                    await putData('kader_session', ses);
                    
                    getEl('kader-id').value = ''; getEl('kader-pin').value = '';
                    masukKeAplikasi(ses);
                } else {
                    alert("❌ PIN yang Anda masukkan salah!");
                }
            } catch (err) {
                console.error("Kesalahan Login:", err);
                alert("Kesalahan Sistem: " + err.message); // Tampilkan pesan error aslinya
            } finally {
                if (btn) { btn.disabled = false; btn.innerText = "Masuk"; }
            }
        };
    }
});

window.logout = async () => { 
    if (confirm("Keluar dari aplikasi? Data Anda yang belum tersinkronisasi akan tetap aman.")) { 
        await deleteData('kader_session', 'active_user'); 
        location.reload(); 
    }
};

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
