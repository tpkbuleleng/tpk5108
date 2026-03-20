import { initDB, putData, getDataById, deleteData, getAllData, clearStore } from './db.js';
import { downloadMasterData, uploadData } from './sync.js';
import { initAdmin } from './admin.js';

const getEl = (id) => document.getElementById(id);

// ==========================================
// 0. INISIALISASI SETTING TAMPILAN
// ==========================================
const applySettings = () => {
    if(localStorage.getItem('theme') === 'dark') {
        document.body.style.backgroundColor = '#121212'; document.body.style.color = '#ffffff';
    } else {
        document.body.style.backgroundColor = '#f0f4f8'; document.body.style.color = '#333333';
    }
    let fontSize = localStorage.getItem('fontSize') || '16';
    document.documentElement.style.fontSize = fontSize + 'px';
};
applySettings();

// ==========================================
// 1. NAVIGASI LAYAR & JARINGAN
// ==========================================
const tampilkanLayar = (id) => {
    const vSplash = getEl('view-splash'); const vLogin = getEl('view-login'); const vApp = getEl('view-app');
    if (vSplash) { vSplash.classList.remove('active'); vSplash.style.display = 'none'; }
    if (id === 'login') { if (vLogin) vLogin.classList.remove('hidden'); if (vApp) vApp.classList.add('hidden'); }
    else if (id === 'app') { if (vLogin) vLogin.classList.add('hidden'); if (vApp) vApp.classList.remove('hidden'); }
    updateNetworkStatus();
};

const updateNetworkStatus = () => {
    const status = getEl('network-status');
    if (status) { const isOnline = navigator.onLine; status.innerText = isOnline ? 'Online' : 'Offline'; status.style.backgroundColor = isOnline ? '#198754' : '#6c757d'; }
};

// ==========================================
// 2. INISIALISASI APLIKASI & ROUTER (ANTI-F5)
// ==========================================
const initApp = async () => {
    const logoTimeout = setTimeout(() => { tampilkanLayar('login'); }, 3500);
    try {
        await initDB();
        const session = await getDataById('kader_session', 'active_user').catch(() => null);
        clearTimeout(logoTimeout);

        if (session) {
            if (session.role && session.role.includes('ADMIN')) {
                initAdmin(session);
            } else {
                masukKeAplikasi(session);
            }
        }
        else {
            tampilkanLayar('login');
            if (navigator.onLine) { const users = await getAllData('master_user').catch(() => []); if (users.length === 0) await downloadMasterData(); }
        }
    } catch (err) { clearTimeout(logoTimeout); tampilkanLayar('login'); }
};

const masukKeAplikasi = async (session) => {
    window.currentUser = session;
    const allWil = await getAllData('master_tim_wilayah').catch(() => []);
    const wilayahKader = allWil.find(w => String(w.id_tim) === String(session.id_tim));
    const namaKec = wilayahKader && wilayahKader.kecamatan ? wilayahKader.kecamatan.toUpperCase() : "BULELENG";

    const greeting = getEl('user-greeting');
    if (greeting) { greeting.innerHTML = `DASHBOARD KADER<br>KECAMATAN ${namaKec}`; greeting.style.textAlign = 'center'; greeting.style.lineHeight = '1.15'; greeting.style.fontSize = '1.05rem'; }
    const hInfo = document.querySelector('.header-info');
    if (hInfo) { hInfo.style.display = 'flex'; hInfo.style.alignItems = 'center'; hInfo.style.gap = '12px'; hInfo.style.flexDirection = 'row-reverse'; }

    if (getEl('sidebar-nama')) getEl('sidebar-nama').innerText = session.nama;
    if (getEl('sidebar-role')) getEl('sidebar-role').innerText = session.role;

    renderMenu(session.role); renderKonten('dashboard'); tampilkanLayar('app');
};

// ==========================================
// 3. MENU & KONTEN (DASHBOARD KADER)
// ==========================================
const renderMenu = (role) => {
    const container = getEl('dynamic-menu-container'); if (!container) return;
    const menus = [
        { id: 'dashboard', icon: '🏠', label: 'Dashboard' }, { id: 'registrasi', icon: '📝', label: 'Registrasi Sasaran' },
        { id: 'daftar_sasaran', icon: '📋', label: 'Data Sasaran & Riwayat' }, { id: 'pendampingan', icon: '🤝', label: 'Laporan Pendampingan' },
        { id: 'rekap_bulanan', icon: '📊', label: 'Rekap Bulanan' }, { id: 'cetak_pdf', icon: '🖨️', label: 'Cetak PDF' },
        { id: 'bantuan', icon: '🆘', label: 'Bantuan & Edukasi' }, { id: 'setting', icon: '⚙️', label: 'Pengaturan' },
        { id: 'reload_app', icon: '🔁', label: 'Muat Ulang / Reset Layar' }
    ];

    container.innerHTML = menus.map(m => `<a class="menu-item" data-target="${m.id}"><span class="icon">${m.icon}</span> ${m.label}</a>`).join('') + `<hr><a class="menu-item text-danger" id="btnLogout">🚪 Keluar (Hapus Sesi Lokal)</a>`;
    container.style.overflowY = 'auto'; container.style.maxHeight = 'calc(100vh - 180px)'; container.style.paddingBottom = '20px';

    document.querySelectorAll('.menu-item[data-target]').forEach(item => {
        item.onclick = () => {
            getEl('sidebar').classList.remove('active'); getEl('sidebar-overlay').classList.remove('active');
            const target = item.getAttribute('data-target');
            if (target === 'reload_app') { location.reload(true); } else { window.editModeData = null; window.editModeLaporan = null; renderKonten(target); }
        };
    });

    if (getEl('btnLogout')) { getEl('btnLogout').onclick = async () => { if (confirm("🔴 PERINGATAN: Ini akan mengeluarkan Anda dan MENGHAPUS SEMUA DATA UJI COBA (Sasaran & Laporan) di memori HP Anda.\n\nApakah Anda yakin ingin mereset aplikasi?")) { await clearStore('kader_session'); await clearStore('sync_queue'); location.reload(true); } }; }
};

window.mulaiSinkronisasiDashboard = async () => {
    const icon = getEl('icon-sync-dash'); const text = getEl('text-sync-dash'); const card = getEl('card-sync-dashboard');
    if (!navigator.onLine) { alert("❌ Koneksi internet terputus! Sinkronisasi membutuhkan internet."); return; }
    if(icon) icon.innerHTML = '⏳'; if(text) { text.innerHTML = 'SINKRONISASI...'; text.style.color = '#dc3545'; } if(card) card.style.pointerEvents = 'none';
    if(window.jalankanSinkronisasi) { await window.jalankanSinkronisasi(); } else { alert("Sistem sinkronisasi belum siap. Memuat ulang..."); location.reload(); }
};

window.renderKonten = async (target) => {
    const area = getEl('content-area'); if (!area) return; area.innerHTML = '';

    if (target === 'dashboard') {
        const session = window.currentUser;
        area.innerHTML = `
            <div class="animate-fade">
                <div class="card" style="background: linear-gradient(135deg, #0d6efd, #0043a8); color: white; border:none; margin-bottom: 20px; padding: 20px;">
                    <p style="margin:0; opacity: 0.9; font-weight: 800; font-size: 0.85rem;">SELAMAT DATANG,</p><h2 style="margin: 3px 0 10px 0; font-size: 1.4rem; font-weight: 700; line-height: 1.2;">${session.nama}</h2><hr style="margin-bottom: 12px; border: 0; border-top: 1px solid rgba(255,255,255,0.2);"><div id="dash-detail-wilayah">Memuat detail...</div>
                </div>
                <div id="dash-summary" style="background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #eee;">Memuat ringkasan data...</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div class="card" style="text-align:center; padding: 15px 5px; cursor:pointer; border-bottom: 4px solid #0d6efd;" onclick="renderKonten('registrasi')"><div style="font-size: 1.6rem;">📝</div><h3 style="font-size: 0.95rem; margin: 5px 0 0 0;">BARU</h3><p style="font-size: 0.65rem; color: #666; font-weight: bold; margin: 2px 0 0 0;">REGISTRASI</p></div>
                    <div class="card" id="card-sync-dashboard" style="text-align:center; padding: 15px 5px; cursor:pointer; border-bottom: 4px solid orange; background:#fffdf8;" onclick="window.mulaiSinkronisasiDashboard()"><div id="icon-sync-dash" style="font-size: 1.6rem;">🔄</div><h3 id="dash-tunda" style="font-size: 1rem; margin: 5px 0 0 0;">0/0</h3><p id="text-sync-dash" style="font-size: 0.65rem; color: #d63384; font-weight: bold; margin: 2px 0 0 0;">KLIK SINKRON</p></div>
                    <div class="card" style="text-align:center; padding: 15px 5px; cursor:pointer; border-bottom: 4px solid #198754;" onclick="renderKonten('pendampingan')"><div style="font-size: 1.6rem;">🤝</div><h3 style="font-size: 0.95rem; margin: 5px 0 0 0;">LAPOR</h3><p style="font-size: 0.65rem; color: #666; font-weight: bold; margin: 2px 0 0 0;">PENDAMPINGAN</p></div>
                </div>
            </div>`;

        try {
            const [allWil, antrean] = await Promise.all([ getAllData('master_tim_wilayah').catch(()=>[]), getAllData('sync_queue').catch(()=>[]) ]);
            const wilayahKerja = allWil.filter(w => String(w.id_tim) === String(session.id_tim)); const daftarDusun = wilayahKerja.map(w => w.dusun_rw).join(', ') || '-';
            if (getEl('dash-detail-wilayah')) { getEl('dash-detail-wilayah').innerHTML = `<div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; margin-bottom: 12px;">NO. TIM: ${session.nomor_tim || session.id_tim}</div><div style="line-height: 1.25;"><div style="margin-bottom: 6px;"><span style="opacity:0.8; font-size: 0.8rem;">📍 Wilayah Tugas (Dusun/RW):</span><br><span style="font-weight: 600; font-size: 0.9rem;">${daftarDusun}</span></div><div style="margin-bottom: 6px;"><span style="opacity:0.8; font-size: 0.8rem;">🏘️ Desa/Kelurahan:</span><br><span style="font-weight: 600; font-size: 0.9rem;">${wilayahKerja[0]?.desa_kelurahan || '-'}</span></div><div><span style="opacity:0.8; font-size: 0.8rem;">🏛️ Kecamatan:</span><br><span style="font-weight: 600; font-size: 0.9rem;">${wilayahKerja[0]?.kecamatan || '-'}</span></div></div>`; }

            const queueTim = antrean.filter(a => String(a.id_tim) === String(session.id_tim));
            if (getEl('dash-tunda')) getEl('dash-tunda').innerText = `${queueTim.filter(a => a.is_synced).length}/${queueTim.filter(a => !a.is_synced).length}`;

            const regList = queueTim.filter(a => a.tipe_laporan === 'REGISTRASI'); const pendList = queueTim.filter(a => a.tipe_laporan === 'PENDAMPINGAN');
            const cReg = { CATIN: 0, BUMIL: 0, BUFAS: 0, BADUTA: 0 }; const cPend = { CATIN: 0, BUMIL: 0, BUFAS: 0, BADUTA: 0 }; const hariIni = new Date(); hariIni.setHours(0,0,0,0);

            regList.forEach(r => {
                let isAktif = r.status_sasaran !== 'SELESAI';
                if (r.jenis_sasaran === 'CATIN' && r.data_laporan?.tanggal_pernikahan && new Date(r.data_laporan.tanggal_pernikahan) < hariIni) isAktif = false;
                if (r.jenis_sasaran === 'BUFAS' && r.data_laporan?.tgl_persalinan) { const tB = new Date(r.data_laporan.tgl_persalinan); tB.setDate(tB.getDate() + 42); if (hariIni > tB) isAktif = false; }
                if(cReg[r.jenis_sasaran] !== undefined) cReg[r.jenis_sasaran]++;
            });
            pendList.forEach(p => { let j = p.jenis_sasaran_saat_kunjungan || (p.id_sasaran_ref.startsWith('CTN')?'CATIN':p.id_sasaran_ref.startsWith('BML')?'BUMIL':p.id_sasaran_ref.startsWith('BFS')?'BUFAS':'BADUTA'); if(cPend[j] !== undefined) cPend[j]++; });
            if(getEl('dash-summary')){ getEl('dash-summary').innerHTML = `<h4 style="font-size: 0.95rem; color: #555; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">📊 Total Data Kumulatif</h4><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem;"><div><strong style="color:var(--primary);">🎯 Sasaran Terdaftar</strong><ul style="margin: 5px 0 0 15px; padding: 0; color: #444; list-style-type: square;"><li>CATIN: <b>${cReg.CATIN}</b></li><li>BUMIL: <b>${cReg.BUMIL}</b></li><li>BUFAS: <b>${cReg.BUFAS}</b></li><li>BADUTA: <b>${cReg.BADUTA}</b></li></ul></div><div><strong style="color:#198754;">🤝 Kunjungan Pendampingan</strong><ul style="margin: 5px 0 0 15px; padding: 0; color: #444; list-style-type: square;"><li>CATIN: <b>${cPend.CATIN}</b></li><li>BUMIL: <b>${cPend.BUMIL}</b></li><li>BUFAS: <b>${cPend.BUFAS}</b></li><li>BADUTA: <b>${cPend.BADUTA}</b></li></ul></div></div>`; }
        } catch (e) {}

    } else if (target === 'registrasi') {
        const isEdit = window.editModeData != null; const eLabel = isEdit ? `Mengedit Data Sasaran` : `Registrasi Sasaran Baru`;
        area.innerHTML = `
            <div class="animate-fade">
                <h3 style="margin:0; color:var(--primary); font-size:1.3rem;">📝 ${eLabel}</h3>
                ${isEdit ? `<div style="background:#fff3cd; padding:10px; border-radius:5px; margin-bottom:15px; font-size:0.85rem; color:#856404;"><b>Info:</b> ID Sasaran dan Jenis Sasaran tidak dapat diubah.</div>` : ''}
                <form id="form-registrasi" style="background:#fff; padding:15px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                    <div class="form-group">
                        <label style="font-weight:bold;">Jenis Sasaran <span style="color:red">*</span></label>
                        <select name="jenis_sasaran" id="reg-jenis" class="form-control" required ${isEdit ? 'disabled' : ''}>
                            <option value="">-- Pilih Jenis Sasaran --</option><option value="CATIN">Calon Pengantin (CATIN)</option><option value="BUMIL">Ibu Hamil (BUMIL)</option><option value="BUFAS">Ibu Nifas (BUFAS)</option><option value="BADUTA">Anak Baduta (0-23 Bulan)</option>
                        </select>
                    </div>
                    <div id="form-core" style="display:none; margin-top:15px;">
                        <div class="form-group"><label>Nama Sasaran <span style="color:red">*</span></label><input type="text" name="nama_sasaran" id="f_nama" class="form-control" required></div>
                        <div class="form-group"><label>NIK Sasaran <span style="color:red">*</span></label><input type="text" name="nik" id="f_nik" class="form-control" pattern="[0-9]{16}" title="NIK harus 16 digit angka" maxlength="16" minlength="16" oninput="this.value=this.value.replace(/[^0-9]/g,'')" placeholder="16 digit angka" required></div>
                        <div class="form-group"><label>Nama Kepala Keluarga <span style="color:red">*</span></label><input type="text" name="nama_kk" id="f_kk_nama" class="form-control" required></div>
                        <div class="form-group"><label>Nomor KK <span style="color:red">*</span></label><input type="text" name="nomor_kk" id="f_kk_no" class="form-control" pattern="[0-9]{16}" title="Nomor KK harus 16 digit angka" maxlength="16" minlength="16" oninput="this.value=this.value.replace(/[^0-9]/g,'')" placeholder="16 digit angka" required></div>
                        <div class="form-group"><label>Tanggal Lahir Sasaran <span style="color:red">*</span></label><input type="date" name="tanggal_lahir" id="f_tgl" class="form-control" required></div>
                        <div class="form-group"><label>Jenis Kelamin <span style="color:red">*</span></label><select name="jenis_kelamin" id="reg-jk" class="form-control" required><option value="">-- Pilih --</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></div>
                        <div class="form-group"><label>Sumber Air Minum <span style="color:red">*</span></label><select name="sumber_air_minum" id="f_air" class="form-control" required><option value="">-- Pilih --</option><option value="Air Kemasan / Isi Ulang">Air Kemasan / Isi Ulang</option><option value="Ledeng / Pam">Ledeng / Pam</option><option value="Sumur Bor / Pompa">Sumur Bor / Pompa</option><option value="Sumur Terlindung">Sumur Terlindung</option><option value="Sumur Tak Terlindung">Sumur Tak Terlindung</option><option value="Mata Air Terlindung">Mata Air Terlindung</option><option value="Mata Air Tak Terlindung">Mata Air Tak Terlindung</option><option value="Air Permukaan (Sungai/Danau/Waduk/Kolam/Irigasi)">Air Permukaan (Sungai/Danau/Waduk/Kolam/Irigasi)</option><option value="Air Hujan">Air Hujan</option><option value="Lainnya">Lainnya</option></select></div>
                        <div class="form-group"><label>Fasilitas BAB <span style="color:red">*</span></label><select name="fasilitas_bab" id="f_bab" class="form-control" required><option value="">-- Pilih --</option><option value="Jamban Milik Sendiri Dengan Leher Angsa Dan Tangki Septik / Ipal">Jamban Milik Sendiri Dengan Leher Angsa Dan Tangki Septik / Ipal</option><option value="Jamban Pada Mck Komunal Dengan Leher Angsa Dan Tangki Septik / Ipal">Jamban Pada Mck Komunal Dengan Leher Angsa Dan Tangki Septik / Ipal</option><option value="Ya Lainnya">Ya Lainnya</option><option value="Tidak Ada">Tidak Ada</option></select></div>
                        <div class="form-group"><label>Kepemilikan Asuransi Kesehatan <span style="color:red">*</span></label><select name="asuransi_kesehatan" id="f_asuransi" class="form-control" required><option value="">-- Pilih --</option><option value="BPJS PBI">BPJS PBI</option><option value="BPJS Mandiri">BPJS Mandiri</option><option value="Swasta">Swasta</option><option value="Tidak Memiliki">Tidak Memiliki</option></select></div>
                        <div id="specific-fields"></div><div id="pertanyaan-dinamis"></div>

                        <div id="wilayah-domisili" style="margin-top:15px; border-top: 1px dashed #ccc; padding-top:15px;">
                            <div class="form-group"><label>Desa / Kelurahan <span style="color:red">*</span></label><select name="desa" id="reg-desa" class="form-control"></select></div><div class="form-group"><label>Dusun / RW <span style="color:red">*</span></label><select name="dusun" id="reg-dusun" class="form-control"></select></div><div class="form-group"><label>Alamat Lengkap <span style="color:red">*</span></label><textarea name="alamat" id="reg-alamat" class="form-control" rows="2"></textarea></div>
                        </div>

                        <div id="wilayah-catin" style="display:none; padding:10px; background:#e8f4fd; border-radius:6px; border:1px solid #b6d4fe; margin-top:15px;">
                            <label style="font-weight:bold; color:var(--primary); margin-bottom:10px; display:block;">📍 Alamat Domisili Setelah Menikah</label>
                            <div class="form-group"><label>Kabupaten/Kota <span style="color:red">*</span></label><select name="catin_kab" id="catin-kab" class="form-control"></select></div>
                            <div class="form-group"><label>Kecamatan <span style="color:red">*</span></label><select name="catin_kec" id="catin-kec" class="form-control"></select></div>
                            <div class="form-group"><label>Desa/Kelurahan <span style="color:red">*</span></label><select name="catin_desa" id="catin-desa" class="form-control"></select></div>
                            <div class="form-group"><label>Dusun / RW <span style="color:red">*</span></label><select id="catin-dusun-sel" class="form-control" style="display:none;"></select><input type="text" id="catin-dusun-txt" class="form-control" placeholder="Ketik nama Dusun/RW..."></div>
                            <div class="form-group"><label>Alamat Lengkap <span style="color:red">*</span></label><textarea name="catin_alamat" id="catin-alamat" class="form-control" rows="2"></textarea></div>
                        </div>

                        <button type="submit" class="btn btn-primary" style="width:100%; margin-top:15px; font-size:1.1rem; padding:12px;">💾 ${isEdit ? 'Update Data Sasaran' : 'Simpan Sasaran'}</button>
                        ${isEdit ? `<button type="button" class="btn btn-danger" style="width:100%; margin-top:10px; font-size:1rem; padding:10px;" onclick="window.editModeData=null; renderKonten('daftar_sasaran')">❌ Batal Edit</button>` : ''}
                    </div>
                </form>
            </div>`;
        initFormRegistrasi();

    } else if (target === 'daftar_sasaran') { const tpl = getEl('template-daftar-sasaran'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initDaftarSasaran(); }
    } else if (target === 'pendampingan') { const tpl = getEl('template-pendampingan'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initFormPendampingan(); }
    } else if (target === 'rekap_bulanan') { const tpl = getEl('template-rekap'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initRekap(); }
    } else if (target === 'kalkulator') { const tpl = getEl('template-kalkulator'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initKalkulator(); }
    } else if (target === 'cetak_pdf') { const tpl = getEl('template-cetak-pdf'); if(tpl) area.appendChild(tpl.content.cloneNode(true));
    } else if (target === 'setting') { const tpl = getEl('template-setting'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initSetting(); }
    } else if (target === 'bantuan') { const tpl = getEl('template-bantuan'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); const btnCalc = getEl('btn-buka-kalkulator'); if(btnCalc) btnCalc.onclick = () => renderKonten('kalkulator'); } }
};

// ==========================================
// 4. LOGIKA FORM REGISTRASI (TERMASUK MASTER_WILAYAH)
// ==========================================
const getKodeKecamatan = (kec) => {
    if (!kec) return "XXX";
    const map = { 'GEROKGAK': 'GRK', 'SERIRIT': 'SRT', 'BUSUNGBIU': 'BSB', 'BANJAR': 'BJR', 'SUKASADA': 'SKS', 'BULELENG': 'BLL', 'SAWAN': 'SWN', 'KUBUTAMBAHAN': 'KBT', 'TEJAKULA': 'TJK' };
    return map[kec.toUpperCase()] || "XXX";
};

const renderPertanyaanDinamis = (jenis, modul, container, questions) => {
    if (!jenis) { container.innerHTML = ''; return; }
    const filteredQ = questions.filter(q => {
        let lbl = String(q.label_pertanyaan || '').toLowerCase();
        if (lbl.includes('bpjs') || lbl.includes('jkn aktif') || lbl.includes('nama calon') || lbl.includes('nik calon')) return false;
        return String(q.is_active || '').toUpperCase() === 'Y' && String(q.modul || '').toUpperCase() === modul.toUpperCase() && (String(q.jenis_sasaran || '').toUpperCase() === 'UMUM' || String(q.jenis_sasaran || '').toUpperCase() === jenis)
    }).sort((a,b)=> (parseInt(a.urutan)||0) - (parseInt(b.urutan)||0));

    if (filteredQ.length > 0) {
        let html = `<div>`;
        filteredQ.forEach(q => {
            let lbl = String(q.label_pertanyaan || '').toLowerCase();
            let req = String(q.is_required || '').toUpperCase() === 'Y' ? 'required' : ''; let markerReq = req ? '<span style="color:red; font-weight:bold;">*</span>' : '';

            let extraAttr = ''; let tInput = q.tipe_input || 'text';
            if(lbl.includes('nik') || lbl.includes('nomor induk')) { tInput = 'text'; extraAttr = 'pattern="[0-9]{16}" title="NIK harus 16 digit angka" maxlength="16" minlength="16" oninput="this.value=this.value.replace(/[^0-9]/g,\'\')"'; }

            let inputHtml = '';
            if(q.tipe_input === 'select') {
                let opsi = []; try { opsi = JSON.parse(q.opsi_json || '[]'); } catch(e) { }
                inputHtml = `<select name="${q.id_pertanyaan}" id="${q.id_pertanyaan}" class="form-control" ${req}><option value="">-- Pilih Jawaban --</option>${opsi.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`;
            } else {
                let pHolder = tInput === 'number' ? 'Masukkan angka...' : 'Ketik jawaban...';
                inputHtml = `<input type="${tInput}" name="${q.id_pertanyaan}" id="${q.id_pertanyaan}" class="form-control" placeholder="${pHolder}" step="any" ${extraAttr} ${req}>`;
            }
            html += `<div class="form-group" style="margin-bottom: 12px;"><label style="font-weight:600; color:#444; font-size: 0.9rem;">${q.label_pertanyaan} ${markerReq}</label>${inputHtml}</div>`;
        });
        html += `</div>`; container.innerHTML = html;
    } else { container.innerHTML = ''; }
};

const initFormRegistrasi = async () => {
    const session = window.currentUser;
    const allWil = await getAllData('master_tim_wilayah').catch(()=>[]);
    const allWilBali = await getAllData('master_wilayah_bali').catch(()=>[]);
    const masterWilayah = await getAllData('master_wilayah').catch(()=>[]); 

    const tugas = allWil.filter(w => String(w.id_tim) === String(session.id_tim));

    const selJenis = getEl('reg-jenis'); const containerQ = getEl('pertanyaan-dinamis'); const boxCatin = getEl('wilayah-catin'); const boxDomisili = getEl('wilayah-domisili');
    const selDesa = getEl('reg-desa'); const selDusun = getEl('reg-dusun'); const regAlamat = getEl('reg-alamat'); const selJk = getEl('reg-jk');

    if (selDesa && tugas.length > 0) {
        const dDesa = [...new Set(tugas.map(w => w.desa_kelurahan))].filter(Boolean);
        selDesa.innerHTML = '<option value="">-- Pilih Desa --</option>' + dDesa.map(d => `<option value="${d}">${d}</option>`).join('');
        selDesa.onchange = () => { const dDusun = tugas.filter(w => w.desa_kelurahan === selDesa.value); selDusun.innerHTML = '<option value="">-- Pilih Dusun --</option>' + dDusun.map(d => `<option value="${d.dusun_rw}">${d.dusun_rw}</option>`).join(''); };
    }

    const catinKab = getEl('catin-kab'); const catinKec = getEl('catin-kec'); const catinDesa = getEl('catin-desa');
    const catinDusunSel = getEl('catin-dusun-sel'); const catinDusunTxt = getEl('catin-dusun-txt'); const catinAlamat = getEl('catin-alamat');

    if (catinKab && allWilBali.length > 0) {
        const dKab = [...new Set(allWilBali.map(w => w.kabupaten))].filter(Boolean);
        catinKab.innerHTML = '<option value="">-- Pilih Kabupaten --</option>' + dKab.map(d => `<option value="${d}">${d}</option>`).join('');

        catinKab.onchange = () => {
            const fKec = allWilBali.filter(w => w.kabupaten === catinKab.value); const dKec = [...new Set(fKec.map(w => w.kecamatan))].filter(Boolean);
            catinKec.innerHTML = '<option value="">-- Pilih Kecamatan --</option>' + dKec.map(d => `<option value="${d}">${d}</option>`).join(''); catinDesa.innerHTML = '<option value="">-- Pilih Desa --</option>';
            catinDusunTxt.style.display = 'block'; catinDusunTxt.setAttribute('name', 'catin_dusun'); catinDusunSel.style.display = 'none'; catinDusunSel.removeAttribute('name');
        };

        catinKec.onchange = () => {
            const fDesa = allWilBali.filter(w => w.kabupaten === catinKab.value && w.kecamatan === catinKec.value); const dDesa = [...new Set(fDesa.map(w => w.desa_kelurahan))].filter(Boolean);
            catinDesa.innerHTML = '<option value="">-- Pilih Desa --</option>' + dDesa.map(d => `<option value="${d}">${d}</option>`).join('');
        };

        catinDesa.onchange = () => {
            if (catinKab.value.toUpperCase().includes('BULELENG')) {
                const dDusun = masterWilayah.filter(w => String(w.desa_kelurahan).toUpperCase() === String(catinDesa.value).toUpperCase());

                if(dDusun.length > 0) {
                    const uniqueDusun = [...new Set(dDusun.map(w => w.dusun_rw))].filter(Boolean);
                    catinDusunSel.innerHTML = '<option value="">-- Pilih Dusun --</option>' + uniqueDusun.map(d => `<option value="${d}">${d}</option>`).join('');
                    catinDusunSel.style.display = 'block'; catinDusunSel.setAttribute('name', 'catin_dusun'); catinDusunSel.setAttribute('required', 'true');
                    catinDusunTxt.style.display = 'none'; catinDusunTxt.removeAttribute('name'); catinDusunTxt.removeAttribute('required');
                    return;
                }
            }
            catinDusunTxt.style.display = 'block'; catinDusunTxt.setAttribute('name', 'catin_dusun'); catinDusunTxt.setAttribute('required', 'true');
            catinDusunSel.style.display = 'none'; catinDusunSel.removeAttribute('name'); catinDusunSel.removeAttribute('required');
        };
    }

    const questions = await getAllData('master_pertanyaan').catch(()=>[]);
    if (selJenis) {
        selJenis.onchange = () => {
            const jenis = selJenis.value; const core = getEl('form-core'); const spec = getEl('specific-fields');
            if(!jenis) { core.style.display = 'none'; return; } core.style.display = 'block';

            if (selJk) { if (jenis === 'BUMIL' || jenis === 'BUFAS') { selJk.value = 'Perempuan'; selJk.style.pointerEvents = 'none'; selJk.style.backgroundColor = '#e9ecef'; } else { selJk.style.pointerEvents = 'auto'; selJk.style.backgroundColor = '#fff'; } }

            let htmlSpec = '';
            if(jenis === 'CATIN') { htmlSpec = `<div class="form-group"><label>Nama Calon Suami / Istri <span style="color:red">*</span></label><input type="text" name="nama_calon" class="form-control" required></div><div class="form-group"><label>NIK Calon Suami / Istri <span style="color:red">*</span></label><input type="text" name="nik_calon" class="form-control" pattern="[0-9]{16}" title="NIK harus 16 digit angka" maxlength="16" minlength="16" oninput="this.value=this.value.replace(/[^0-9]/g,'')" placeholder="16 digit angka" required></div><div class="form-group"><label>Tanggal Rencana Pernikahan <span style="color:red">*</span></label><input type="date" name="tanggal_pernikahan" class="form-control" required></div><div class="form-group"><label>Perkawinan Ke- <span style="color:red">*</span></label><input type="number" name="perkawinan_ke" class="form-control" required></div><div class="form-group"><label>Berat Badan (Kg)</label><input type="number" name="bb_catin" class="form-control" step="any" placeholder="Cth: 55"></div><div class="form-group"><label>Tinggi Badan (Cm)</label><input type="number" name="tb_catin" class="form-control" step="any" placeholder="Cth: 160"></div><div class="form-group"><label>Bekerja di Luar Negeri <span style="color:red">*</span></label><select name="kerja_luar_negeri" class="form-control" required><option value="">-- Pilih --</option><option value="Pernah">Pernah</option><option value="Sedang">Sedang</option><option value="Akan">Akan</option><option value="Tidak">Tidak</option></select></div>`; }
            else if (jenis === 'BUMIL') { htmlSpec = `<div class="form-group"><label>Kehamilan Ke- <span style="color:red">*</span></label><input type="number" name="kehamilan_ke" class="form-control" required></div><div class="form-group"><label>Berat Badan Sebelum Hamil (Kg)</label><input type="number" name="bb_sebelum_hamil" class="form-control" step="any" placeholder="Cth: 50"></div><div class="form-group"><label>Keinginan Hamil <span style="color:red">*</span></label><select name="keinginan_hamil" class="form-control" required><option value="">-- Pilih --</option><option value="Ingin Hamil Saat ini">Ingin Hamil Saat ini</option><option value="Ingin Hamil setelah >2 th">Ingin Hamil setelah >2 th</option><option value="Tidak Ingin Hamil Lagi">Tidak Ingin Hamil Lagi</option></select></div>`; }
            else if (jenis === 'BUFAS') { htmlSpec = `<div class="form-group"><label>Tanggal Persalinan <span style="color:red">*</span></label><input type="date" name="tgl_persalinan" class="form-control" required></div><div class="form-group"><label>Jumlah Anak Kandung <span style="color:red">*</span></label><input type="number" name="jumlah_anak_kandung" class="form-control" required></div>`; }
            else if (jenis === 'BADUTA') { htmlSpec = `<div class="form-group"><label>Nama Ibu Kandung <span style="color:red">*</span></label><input type="text" name="nama_ibu_kandung" class="form-control" required></div><div class="form-group"><label>Anak Ke- <span style="color:red">*</span></label><input type="number" name="anak_ke" class="form-control" required></div><div class="form-group"><label>Berat Badan Lahir (Kg)</label><input type="number" name="bb_lahir" class="form-control" step="any" placeholder="Cth: 3.2"></div><div class="form-group"><label>Tinggi / Panjang Badan Lahir (Cm)</label><input type="number" name="tb_lahir" class="form-control" step="any" placeholder="Cth: 48"></div>`; }
            spec.innerHTML = htmlSpec;

            if(boxCatin && boxDomisili) {
                if (jenis === 'CATIN') {
                    boxCatin.style.display = 'block'; boxDomisili.style.display = 'none';
                    if(selDesa) selDesa.removeAttribute('required'); if(selDusun) selDusun.removeAttribute('required'); if(regAlamat) regAlamat.removeAttribute('required');
                    if(catinKab) catinKab.setAttribute('required', 'true'); if(catinKec) catinKec.setAttribute('required', 'true'); if(catinDesa) catinDesa.setAttribute('required', 'true');
                    if(catinDusunSel.style.display === 'block') { catinDusunSel.setAttribute('required', 'true'); } else { catinDusunTxt.setAttribute('required', 'true'); }
                    if(catinAlamat) catinAlamat.setAttribute('required', 'true');
                } else {
                    boxCatin.style.display = 'none'; boxDomisili.style.display = 'block';
                    if(selDesa) selDesa.setAttribute('required', 'true'); if(selDusun) selDusun.setAttribute('required', 'true'); if(regAlamat) regAlamat.setAttribute('required', 'true');
                    if(catinKab) catinKab.removeAttribute('required'); if(catinKec) catinKec.removeAttribute('required'); if(catinDesa) catinDesa.removeAttribute('required');
                    catinDusunSel.removeAttribute('required'); catinDusunTxt.removeAttribute('required'); if(catinAlamat) catinAlamat.removeAttribute('required');
                }
            }
            renderPertanyaanDinamis(jenis, 'REGISTRASI', containerQ, questions);

            if(window.editModeData) {
                setTimeout(() => {
                    const eD = window.editModeData;
                    if(getEl('f_nama')) getEl('f_nama').value = eD.nama_sasaran || ''; if(getEl('f_nik')) getEl('f_nik').value = eD.data_laporan?.nik || '';
                    if(getEl('f_kk_nama')) getEl('f_kk_nama').value = eD.data_laporan?.nama_kk || ''; if(getEl('f_kk_no')) getEl('f_kk_no').value = eD.data_laporan?.nomor_kk || '';
                    if(getEl('f_tgl')) getEl('f_tgl').value = eD.data_laporan?.tanggal_lahir || ''; if(getEl('reg-jk')) getEl('reg-jk').value = eD.data_laporan?.jenis_kelamin || '';
                    if(getEl('f_air')) getEl('f_air').value = eD.data_laporan?.sumber_air_minum || ''; if(getEl('f_bab')) getEl('f_bab').value = eD.data_laporan?.fasilitas_bab || '';
                    if(getEl('f_asuransi')) getEl('f_asuransi').value = eD.data_laporan?.asuransi_kesehatan || ''; if(getEl('reg-desa')) getEl('reg-desa').value = eD.desa || '';
                    if(getEl('reg-desa')) getEl('reg-desa').dispatchEvent(new Event('change')); if(getEl('reg-dusun')) setTimeout(()=> { getEl('reg-dusun').value = eD.dusun || ''; }, 100);
                    if(getEl('reg-alamat')) getEl('reg-alamat').value = eD.data_laporan?.alamat || '';

                    for (const [key, value] of Object.entries(eD.data_laporan || {})) { let field = document.querySelector(`[name="${key}"]`); if(field) field.value = value; }
                }, 200);
            }
        };
        if(window.editModeData) { selJenis.value = window.editModeData.jenis_sasaran; selJenis.dispatchEvent(new Event('change')); }
    }

    const formReg = getEl('form-registrasi');
    if (formReg) {
        formReg.onsubmit = async (e) => {
            e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true; btn.innerText = "Menyimpan...";
            try {
                const formData = new FormData(e.target); const jawaban = {}; formData.forEach((val, key) => { jawaban[key] = val; });
                const kecamatan = tugas.length > 0 ? tugas[0].kecamatan : 'TIDAK_DIKETAHUI'; const jenisSasaran = selJenis.value;

                let idSasaran = window.editModeData ? window.editModeData.id : `${{"CATIN":"CTN","BUMIL":"BML","BUFAS":"BFS","BADUTA":"BDT"}[jenisSasaran]}-${getKodeKecamatan(kecamatan)}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
                const desaFinal = jenisSasaran === 'CATIN' ? '-' : selDesa.value; const dusunFinal = jenisSasaran === 'CATIN' ? '-' : selDusun.value;

                if (jawaban.tanggal_lahir) {
                    const tglLahir = new Date(jawaban.tanggal_lahir); const tglDaftar = new Date();
                    let umurTahun = tglDaftar.getFullYear() - tglLahir.getFullYear(); let umurBulan = tglDaftar.getMonth() - tglLahir.getMonth();
                    if (umurBulan < 0 || (umurBulan === 0 && tglDaftar.getDate() < tglLahir.getDate())) { umurTahun--; umurBulan += 12; }
                    jawaban.usia_saat_daftar_tahun = umurTahun; jawaban.usia_saat_daftar_bulan = umurBulan;

                    if (jenisSasaran === 'BUFAS' && jawaban.tgl_persalinan) {
                        const tglSalin = new Date(jawaban.tgl_persalinan); let uTahun = tglSalin.getFullYear() - tglLahir.getFullYear(); let uBulan = tglSalin.getMonth() - tglLahir.getMonth();
                        if (uBulan < 0 || (uBulan === 0 && tglSalin.getDate() < tglLahir.getDate())) { uTahun--; uBulan += 12; }
                        jawaban.usia_saat_melahirkan_tahun = uTahun; jawaban.usia_saat_melahirkan_bulan = uBulan;
                    }
                }
                const createdDate = window.editModeData ? window.editModeData.created_at : new Date().toISOString();
                const laporan = { id: idSasaran, tipe_laporan: 'REGISTRASI', username: session.username, id_tim: session.id_tim, nomor_tim: session.nomor_tim, kecamatan: kecamatan, jenis_sasaran: jenisSasaran, nama_sasaran: jawaban.nama_sasaran, desa: desaFinal, dusun: dusunFinal, data_laporan: jawaban, status_sasaran: 'AKTIF', is_synced: false, created_at: createdDate };

                await putData('sync_queue', laporan); window.editModeData = null; alert(window.editModeData ? `✅ Data berhasil diperbarui!` : `✅ Registrasi berhasil! ID: ${idSasaran}`); renderKonten('daftar_sasaran');
            } catch (err) { alert("Gagal menyimpan form."); } finally { btn.disabled = false; btn.innerText = "💾 Simpan Sasaran"; }
        };
    }
};

// ==========================================
// 5. FITUR DAFTAR SASARAN & DETAIL (KIA DIGITAL)
// ==========================================
window.bukaEditSasaran = async (id) => { const r = await getDataById('sync_queue', id); if(r) { window.editModeData = r; renderKonten('registrasi'); } else { alert('Data tidak ditemukan'); } };
window.bukaEditLaporan = async (idLaporan) => { const r = await getDataById('sync_queue', idLaporan); if(r) { window.editModeLaporan = r; renderKonten('pendampingan'); } else { alert('Data laporan tidak ditemukan'); } };

const initDaftarSasaran = async () => {
    const session = window.currentUser; const filterJenis = getEl('filter-jenis'); const filterStatus = getEl('filter-status'); const list = getEl('list-sasaran');
    const modal = getEl('modal-detail'); const btnTutup = getEl('btn-tutup-modal'); const kontenDetail = getEl('konten-detail');

    if(!list) return;

    const [antrean, masterPertanyaan] = await Promise.all([ getAllData('sync_queue').catch(()=>[]), getAllData('master_pertanyaan').catch(()=>[]) ]);
    const regList = antrean.filter(a => a.tipe_laporan === 'REGISTRASI' && String(a.id_tim) === String(session.id_tim));
    const pendList = antrean.filter(a => a.tipe_laporan === 'PENDAMPINGAN' && String(a.id_tim) === String(session.id_tim));

    const processedList = regList.map(r => {
        let isExpired = r.status_sasaran === 'SELESAI'; let statusRaw = r.status_sasaran || 'AKTIF'; let labelSelesai = '<span style="color: var(--primary); font-weight:bold;">Aktif</span>'; let alasanExpired = 'Selesai';
        const hariIni = new Date(); hariIni.setHours(0,0,0,0);
        if (r.jenis_sasaran === 'CATIN' && r.data_laporan?.tanggal_pernikahan) { const tglNikah = new Date(r.data_laporan.tanggal_pernikahan); if (tglNikah < hariIni) { isExpired = true; statusRaw = 'SELESAI'; alasanExpired = 'Sudah Menikah'; } }
        if (r.jenis_sasaran === 'BUFAS' && r.data_laporan?.tgl_persalinan) { const tglBatas = new Date(r.data_laporan.tgl_persalinan); tglBatas.setDate(tglBatas.getDate() + 42); if (hariIni > tglBatas) { isExpired = true; statusRaw = 'SELESAI'; alasanExpired = 'Masa Nifas > 42 Hari'; } }
        if (isExpired || statusRaw === 'SELESAI') { isExpired = true; statusRaw = 'SELESAI'; if(alasanExpired === 'Selesai') { alasanExpired = r.jenis_sasaran === 'CATIN' ? 'Sudah Menikah' : (r.jenis_sasaran === 'BUMIL' ? 'Sudah Melahirkan' : 'Selesai'); } labelSelesai = `<span style="color: #dc3545; font-weight:bold;">SELESAI (${alasanExpired})</span>`; }
        let jk = r.data_laporan?.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'; let jkDisplay = (r.jenis_sasaran === 'CATIN' || r.jenis_sasaran === 'BADUTA') ? `(${jk})` : '';
        let usiaTh = r.data_laporan?.usia_saat_daftar_tahun !== undefined ? r.data_laporan.usia_saat_daftar_tahun : '-'; let textBaris2 = `${r.jenis_sasaran} ${jkDisplay} ${usiaTh} Th`.trim();
        return { ...r, isExpired, labelSelesai, statusRaw, textBaris2 };
    });

    const renderList = () => {
        const fJ = filterJenis ? filterJenis.value : 'ALL'; const fS = filterStatus ? filterStatus.value : 'ALL';
        let filtered = processedList.filter(r => (fJ === 'ALL' || r.jenis_sasaran === fJ) && (fS === 'ALL' || r.statusRaw === fS));
        if (filtered.length === 0) { list.innerHTML = `<div style="text-align:center; padding:20px; color:#999;">Tidak ada sasaran yang sesuai filter.</div>`; } else {
            list.innerHTML = filtered.map(r => {
                let syncBadge = r.is_synced ? '<span style="color:#198754; font-size:0.75rem; background:#e8f4fd; padding:2px 6px; border-radius:4px; border:1px solid #198754;">✅ Server</span>' : '<span style="color:#fd7e14; font-size:0.75rem; background:#fff3cd; padding:2px 6px; border-radius:4px; border:1px solid #fd7e14;">⏳ Lokal</span>';
                return `
                <div class="sasaran-card" data-id="${r.id}" style="background:${r.isExpired ? '#f8f9fa' : '#fff'}; padding:15px; border-radius:8px; border-left: 4px solid ${r.isExpired ? '#6c757d' : 'var(--primary)'}; opacity: ${r.isExpired ? '0.75' : '1'}; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom:10px;">
                    <div style="font-weight: bold; font-size: 1.15rem; color: #333; text-transform: uppercase;">${r.nama_sasaran || 'Tanpa Nama'}</div>
                    <div style="font-size: 0.95rem; color: #555; font-weight: bold; margin-top: 3px;">${r.textBaris2}</div>
                    <div style="font-size: 0.85rem; color: #666; margin-top: 3px;">📍 ${r.dusun}, ${r.desa}</div>
                    <div style="font-size: 0.9rem; margin-top: 8px; display:flex; justify-content:space-between; align-items:center;"><span>${r.labelSelesai}</span>${syncBadge}</div>
                </div>`
            }).join('');
        }
        document.querySelectorAll('.sasaran-card').forEach(card => card.onclick = () => showDetail(card.getAttribute('data-id')));
    };

    const showDetail = (id) => {
        const r = processedList.find(x => x.id === id); if(!r) return;
        const riwayat = pendList.filter(p => p.id_sasaran_ref === id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        let htmlRiwayat = '';

        if (riwayat.length === 0) {
            htmlRiwayat = '<div style="color:#888; font-size:0.9rem; padding: 15px; background: #fff; border-radius: 8px; text-align:center; border: 1px dashed #ccc;">Belum ada riwayat kunjungan pendampingan.</div>';
        } else if (r.jenis_sasaran === 'BADUTA') {
            htmlRiwayat += `<div style="overflow-x:auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #ddd;">
                <table style="width:100%; border-collapse: collapse; font-size: 0.85rem; text-align:center; min-width:600px;">
                    <thead><tr style="background: var(--primary); color: white;"><th style="padding:10px; border:1px solid #c6c6c6;">Tanggal</th><th style="padding:10px; border:1px solid #c6c6c6;">Usia</th><th style="padding:10px; border:1px solid #c6c6c6;">BB (kg)</th><th style="padding:10px; border:1px solid #c6c6c6;">TB/PB (cm)</th><th style="padding:10px; border:1px solid #c6c6c6;">LK (cm)</th><th style="padding:10px; border:1px solid #c6c6c6;">Status KKA</th><th style="padding:10px; border:1px solid #c6c6c6; text-align:left;">Catatan Lainnya</th></tr></thead><tbody>`;

            riwayat.forEach(p => {
                let tglKunjungan = new Date(p.data_laporan?.tgl_kunjungan || p.created_at); let tglLahir = new Date(r.data_laporan?.tanggal_lahir || new Date());
                let umurBulan = (tglKunjungan.getFullYear() - tglLahir.getFullYear()) * 12; umurBulan -= tglLahir.getMonth(); umurBulan += tglKunjungan.getMonth();
                if (tglKunjungan.getDate() < tglLahir.getDate()) umurBulan--; if (umurBulan < 0) umurBulan = 0;

                let valBB = '-', valTB = '-', valLK = '-', valKKA = p.data_laporan?.evaluasi_kka || '-';
                let catatanLain = `<span style="display:block; margin-bottom:4px;"><b>Hasil Umum:</b> ${p.data_laporan?.catatan || '-'}</span>`;

                for (const [key, value] of Object.entries(p.data_laporan || {})) {
                    if (['id_sasaran', 'tgl_kunjungan', 'catatan', 'evaluasi_kka'].includes(key) || !value) continue;
                    let foundQ = masterPertanyaan.find(mq => String(mq.id_pertanyaan) === String(key));
                    let label = foundQ ? foundQ.label_pertanyaan.toLowerCase() : key.toLowerCase();
                    if (label.includes('berat') || label === 'bb') valBB = value; else if (label.includes('tinggi') || label.includes('panjang') || label.includes('tb') || label.includes('pb')) valTB = value; else if (label.includes('lingkar kepala') || label === 'lk') valLK = value; else { catatanLain += `<small style="display:block; border-top: 1px dashed #ccc; padding-top:3px; margin-top:3px;"><b>${foundQ ? foundQ.label_pertanyaan : key}:</b> ${value}</small>`; }
                }

                let syncIcon = p.is_synced ? '<span style="color:#198754; font-size:0.7rem;">(Server)</span>' : '<span style="color:#fd7e14; font-size:0.7rem;">(Lokal)</span>';
                let kkaStyle = (valKKA.toLowerCase().includes('terlambat') || valKKA.toLowerCase().includes('tidak')) ? 'color:#dc3545; font-weight:bold;' : 'color:#198754; font-weight:bold;';

                htmlRiwayat += `<tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; border:1px solid #eee;">${tglKunjungan.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: '2-digit'})} <br>${syncIcon}<br><span style="color:#0d6efd; cursor:pointer; font-size:0.75rem;" onclick="window.bukaEditLaporan('${p.id}')">✏️ Edit</span></td><td style="padding:10px; border:1px solid #eee; font-weight:bold; font-size:1rem; color:var(--primary);">${umurBulan} Bln</td><td style="padding:10px; border:1px solid #eee;">${valBB}</td><td style="padding:10px; border:1px solid #eee;">${valTB}</td><td style="padding:10px; border:1px solid #eee;">${valLK}</td><td style="padding:10px; border:1px solid #eee; ${kkaStyle}">${valKKA}</td><td style="padding:10px; border:1px solid #eee; text-align:left; line-height:1.3;">${catatanLain}</td></tr>`;
            });
            htmlRiwayat += `</tbody></table></div>`;
        } else {
            htmlRiwayat = riwayat.map(p => {
                let dynamicHtml = '';
                for (const [key, value] of Object.entries(p.data_laporan || {})) {
                    if (['id_sasaran', 'tgl_kunjungan', 'catatan', 'is_melahirkan', 'tgl_persalinan', 'nama_sasaran', 'nama_kk', 'nik', 'jenis_kelamin'].includes(key) || !value) continue;
                    let foundQ = masterPertanyaan.find(mq => String(mq.id_pertanyaan) === String(key));
                    let label = foundQ ? foundQ.label_pertanyaan : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    dynamicHtml += `<div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #eee;"><div style="font-size: 0.75rem; color: #666; font-weight: normal;">${label}</div><div style="font-size: 0.9rem; color: #222; font-weight: 500;">${value}</div></div>`;
                }
                return `<div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden;"><div style="background: #e8f4fd; padding: 10px 15px; border-bottom: 1px solid #cfe2ff; display: flex; justify-content: space-between; align-items: center;"><span style="font-weight: bold; color: #0d6efd; font-size: 0.9rem;">📅 ${new Date(p.data_laporan?.tgl_kunjungan || p.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span><div><span style="font-size: 0.7rem; font-weight: bold; color: ${p.is_synced ? '#198754' : '#fd7e14'}; background: #fff; padding: 3px 8px; border-radius: 12px; border: 1px solid #ddd; margin-right:5px;">${p.is_synced ? '✅ Server' : '⏳ Lokal'}</span><span style="font-size:0.8rem; cursor:pointer;" onclick="window.bukaEditLaporan('${p.id}')">✏️</span></div></div><div style="padding: 15px;"><div style="font-size: 0.8rem; color: #666; margin-bottom: 4px;">Catatan Umum / Hasil:</div><div style="font-size: 0.95rem; color: #333; margin-bottom: ${dynamicHtml ? '15px' : '0'}; background: #f8f9fa; padding: 10px; border-radius: 6px; border-left: 4px solid #0d6efd;">${p.data_laporan?.catatan || '-'}</div>${dynamicHtml ? `<div style="background: #fff; border: 1px solid #f1f1f1; padding: 10px; border-radius: 6px;">${dynamicHtml}</div>` : ''}</div></div>`;
            }).join('');
        }

        let syncStatusHtml = r.is_synced ? '<span style="color:#198754;">✅ Tersinkron (Server)</span>' : '<span style="color:#fd7e14;">⏳ Belum Sinkron (Lokal)</span>';

        kontenDetail.innerHTML = `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd; line-height: 1.4;">
                <div style="font-size: 0.8rem; color: #666; margin-bottom: 4px;">Nama Sasaran</div>
                <div style="font-size: 1.15rem; font-weight: bold; color: #0043a8; margin-bottom: 15px; text-transform: uppercase; background: #ffffff; padding: 10px 12px; border-radius: 6px; border: 1px solid #c6c6c6; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <span>${r.nama_sasaran || '-'}</span>
                    <span style="font-size: 0.85rem; color: #0d6efd; cursor: pointer; text-transform: none; font-weight: normal; background: #e8f4fd; padding: 4px 8px; border-radius: 4px;" onclick="window.bukaEditSasaran('${r.id}')">✏️ (edit)</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                    <div><div style="font-size: 0.8rem; color: #666;">ID / No NIK</div><div style="font-size: 0.95rem; color: #222; font-weight: 500;">${r.id} <br> ${r.data_laporan?.nik || '-'}</div></div>
                    <div><div style="font-size: 0.8rem; color: #666;">Kategori</div><div style="font-size: 0.95rem; color: #222; font-weight: bold;">${r.textBaris2}</div></div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                    <div><div style="font-size: 0.8rem; color: #666;">Status Pendampingan</div><div style="font-size: 0.95rem;">${r.labelSelesai}</div></div>
                    <div><div style="font-size: 0.8rem; color: #666;">Status Sinkronisasi</div><div style="font-size: 0.95rem; font-weight: bold;">${syncStatusHtml}</div></div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                    <div><div style="font-size: 0.8rem; color: #666;">Tgl Lahir ${r.jenis_sasaran === 'BUFAS' ? '/ Salin' : ''}</div><div style="font-size: 0.95rem; color: #222;">${r.data_laporan?.tanggal_lahir || '-'} ${r.jenis_sasaran === 'BUFAS' ? '<br>'+(r.data_laporan?.tgl_persalinan || '-') : ''}</div></div>
                    <div><div style="font-size: 0.8rem; color: #666;">Nama KK ${r.jenis_sasaran === 'BADUTA' ? '/ Ibu' : ''}</div><div style="font-size: 0.95rem; color: #222; font-weight: 500;">${r.data_laporan?.nama_kk || '-'} ${r.jenis_sasaran === 'BADUTA' ? '<br>'+(r.data_laporan?.nama_ibu_kandung || '-') : ''}</div></div>
                </div>
                <div style="font-size: 0.8rem; color: #666;">Alamat Lengkap</div><div style="font-size: 0.95rem; color: #222;">${r.data_laporan?.alamat || '-'}</div>
            </div>
            <h4 style="margin-bottom: 15px; color: #0043a8; background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #c6c6c6; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-weight: 700;">
                ${r.jenis_sasaran === 'BADUTA' ? '📈 Buku KIA/KKA Digital' : 'Riwayat Kunjungan'} (${riwayat.length})
            </h4>
            <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;">${htmlRiwayat}</div>`;
        if(modal) modal.style.display = 'block';
    };

    if(btnTutup) btnTutup.onclick = () => { if(modal) modal.style.display = 'none'; };
    if(filterJenis) filterJenis.onchange = renderList;
    if(filterStatus) filterStatus.onchange = renderList;
    renderList();
};

// ==========================================
// 6. FORM PENDAMPINGAN
// ==========================================
const initFormPendampingan = async () => {
    const session = window.currentUser;
    const selJenis = getEl('pend-jenis'); const selSasaran = getEl('pend-sasaran');
    const infoBox = getEl('pend-info-sasaran'); const containerQ = getEl('form-pendampingan-dinamis');

    const isEditLaporan = window.editModeLaporan != null; const eLaporan = isEditLaporan ? window.editModeLaporan : null;

    if(isEditLaporan) {
        getEl('header-pendampingan').innerHTML = `📝 Mengedit Laporan Pendampingan`;
        getEl('header-pendampingan').insertAdjacentHTML('afterend', `<div style="background:#fff3cd; padding:10px; border-radius:5px; margin-bottom:15px; font-size:0.85rem; color:#856404;"><b>Info:</b> Anda sedang mengedit kunjungan tanggal ${eLaporan.data_laporan.tgl_kunjungan || '-'}.</div>`);
        if(getEl('btn-submit-pendampingan')) getEl('btn-submit-pendampingan').innerHTML = "💾 Update Laporan";
    }

    const [questions, antrean, stdAntro, masterKembang] = await Promise.all([ getAllData('master_pertanyaan').catch(()=>[]), getAllData('sync_queue').catch(()=>[]), getAllData('standar_antropometri').catch(()=>[]), getAllData('master_kembang').catch(()=>[]) ]);
    const regList = antrean.filter(a => a.tipe_laporan === 'REGISTRASI' && String(a.id_tim) === String(session.id_tim) && a.status_sasaran !== 'SELESAI');

    const getKkaData = (umurAnak) => {
        const ages = [...new Set(masterKembang.map(d => parseInt(d.umur_bulan)))].filter(a => !isNaN(a)).sort((a,b)=>a-b);
        let targetUmur = ages.filter(a => a <= umurAnak).pop() || ages[0];
        return masterKembang.filter(k => parseInt(k.umur_bulan) === targetUmur);
    };

    if (selJenis && selSasaran) {
        selJenis.onchange = () => {
            const jenis = selJenis.value; containerQ.innerHTML = ''; if(infoBox) infoBox.style.display = 'none';
            if (!jenis) { selSasaran.innerHTML = '<option value="">-- Pilih Jenis Dahulu --</option>'; selSasaran.disabled = true; return; }
            const activeReg = regList.filter(r => r.jenis_sasaran === jenis);
            selSasaran.innerHTML = activeReg.length === 0 ? `<option value="">-- Tidak ada data --</option>` : '<option value="">-- Pilih Sasaran --</option>' + activeReg.map(r => `<option value="${r.id}">${r.nama_sasaran}</option>`).join('');
            selSasaran.disabled = activeReg.length === 0;
        };

        selSasaran.onchange = () => {
            const sasaran = regList.find(r => r.id === selSasaran.value);
            if (!sasaran) { containerQ.innerHTML = ''; return; }

            if (infoBox) {
                infoBox.style.display = 'block';
                infoBox.innerHTML = `<div style="font-weight:bold; color:#0043a8; margin-bottom: 8px; background: #fff; padding: 6px 12px; border-radius: 6px; border: 1px solid #c6c6c6; text-align:center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">📌 Profil Sasaran Terpilih</div><table style="width:100%; font-size: 0.85rem; background: #fff; padding: 12px; border-radius: 6px; border: 1px solid #ddd; line-height:1.5;"><tr><td style="width:35%; color:#555;">Nama</td><td>: <b>${sasaran.nama_sasaran}</b></td></tr><tr><td style="color:#555;">No. KK</td><td>: ${sasaran.data_laporan?.nomor_kk||'-'}</td></tr><tr><td style="color:#555;">Umur Daftar</td><td>: ${sasaran.data_laporan?.usia_saat_daftar_tahun||'-'} Tahun</td></tr></table>`;
            }

            let idInputBB = null, idInputTB = null;
            const filteredQ = questions.filter(q => String(q.is_active).toUpperCase() === 'Y' && String(q.modul).toUpperCase() === 'PENDAMPINGAN' && (String(q.jenis_sasaran).toUpperCase() === 'UMUM' || String(q.jenis_sasaran).toUpperCase() === sasaran.jenis_sasaran)).sort((a,b)=> parseInt(a.urutan) - parseInt(b.urutan));

            let htmlQ = `<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">`;
            filteredQ.forEach(q => {
                let lbl = (q.label_pertanyaan||'').toLowerCase(); let req = String(q.is_required || '').toUpperCase() === 'Y' ? 'required' : '';
                if(lbl.includes('berat') || lbl==='bb') idInputBB = q.id_pertanyaan; if(lbl.includes('tinggi') || lbl.includes('panjang') || lbl.includes('tb') || lbl.includes('pb')) idInputTB = q.id_pertanyaan;

                let inputHtml = q.tipe_input === 'select' ? `<select name="${q.id_pertanyaan}" id="${q.id_pertanyaan}" class="form-control" ${req}><option value="">-- Pilih --</option>${(JSON.parse(q.opsi_json || '[]')).map(o => `<option value="${o}">${o}</option>`).join('')}</select>` : `<input type="${q.tipe_input}" name="${q.id_pertanyaan}" id="${q.id_pertanyaan}" class="form-control" step="any" ${req}>`;
                htmlQ += `<div class="form-group" style="margin-bottom:12px;"><label style="font-weight:600;">${q.label_pertanyaan} ${req?'<span style="color:red">*</span>':''}</label>${inputHtml}</div>`;
            });
            htmlQ += `</div>`;

            if (sasaran.jenis_sasaran === 'BADUTA' && sasaran.data_laporan.tanggal_lahir) {
                const tL = new Date(sasaran.data_laporan.tanggal_lahir); const tH = new Date();
                let uBln = (tH.getFullYear() - tL.getFullYear()) * 12; uBln -= tL.getMonth(); uBln += tH.getMonth();
                if (tH.getDate() < tL.getDate()) uBln--; if (uBln < 0) uBln = 0;
                let jk = sasaran.data_laporan.jenis_kelamin === 'Laki-laki' ? 'L' : 'P';

                const kkaData = getKkaData(uBln); let listT = "", listP = "";
                kkaData.forEach(k => { let kode = k.kode_aspek ? `[${k.kode_aspek}] ` : ''; listT += `<li><b>${kode}</b>${k.tugas_perkembangan}</li>`; listP += `<li style="margin-bottom:6px;"><b>${kode}</b>${k.pesan_stimulasi}</li>`; });

                htmlQ += `
                    <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; border-left: 4px solid #0d6efd; margin-top: 15px;">
                        <h4 style="margin:0 0 10px 0; color:#0d6efd;">🤖 Asisten Cerdas KKA (Usia: ${uBln} Bln)</h4>
                        <div style="font-size:0.85rem; margin-bottom:10px;"><b>Target Pencapaian:</b><ul style="margin:5px 0; padding-left:15px;">${listT}</ul></div>
                        <div class="form-group"><label style="font-weight:bold;">Apakah anak bisa melakukan SEMUA target di atas?</label><select id="kka_eval" name="evaluasi_kka" class="form-control" required><option value="">-- Evaluasi --</option><option value="Sesuai Umur">✅ Ya, Bisa Semua</option><option value="Terlambat">⚠️ Ada yang belum bisa</option></select></div>
                        <div id="kka_tips_box" style="display:none; background:#fff3cd; padding:10px; border-radius:5px; border:1px solid #ffe69c; font-size:0.8rem; margin-top:10px;"><b style="color:#856404;">💡 Panduan Stimulasi:</b><ul style="margin:5px 0; padding-left:15px; color:#856404;">${listP}</ul></div>
                    </div>
                    <div id="antro_result" style="display:none; background: #fdfdfe; padding: 15px; border-radius: 8px; border: 2px solid #ddd; margin-top: 15px;"></div>`;

                containerQ.innerHTML = htmlQ;
                if(getEl('kka_eval')) getEl('kka_eval').onchange = (e) => getEl('kka_tips_box').style.display = e.target.value === 'Terlambat' ? 'block' : 'none';

                const calcAntro = () => {
                    if(!idInputBB || !idInputTB) return;
                    let b = parseFloat(getEl(idInputBB)?.value); let t = parseFloat(getEl(idInputTB)?.value);
                    if(!b || !t) { getEl('antro_result').style.display = 'none'; return; }

                    let sB="Normal", cB="#198754", sT="Normal", cT="#198754", sP="Normal", cP="#198754";
                    let d_bbu = stdAntro.find(s => s.jenis_kelamin === jk && s.indeks === 'BB_U' && parseInt(s.umur_bulan) === uBln);
                    if(d_bbu) { if(b < parseFloat(d_bbu.min_3_sd)) { sB="Sangat Kurang"; cB="#dc3545"; } else if(b < parseFloat(d_bbu.min_2_sd)) { sB="Kurang"; cB="#fd7e14"; } }

                    let d_tbu = stdAntro.find(s => s.jenis_kelamin === jk && (s.indeks === 'PB_U' || s.indeks === 'TB_U') && parseInt(s.umur_bulan) === uBln);
                    if(d_tbu) { if(t < parseFloat(d_tbu.min_3_sd)) { sT="Sangat Pendek"; cT="#dc3545"; } else if(t < parseFloat(d_tbu.min_2_sd)) { sT="Pendek"; cT="#fd7e14"; } }

                    let rTB = (Math.round(t * 2) / 2).toFixed(1);
                    let d_bbp = stdAntro.find(s => s.jenis_kelamin === jk && (s.indeks === 'BB_PB' || s.indeks === 'BB_TB') && parseFloat(s.tinggi_panjang_cm) === parseFloat(rTB));
                    if(d_bbp) { if(b < parseFloat(d_bbp.min_3_sd)) { sP="Gizi Buruk"; cP="#dc3545"; } else if(b < parseFloat(d_bbp.min_2_sd)) { sP="Gizi Kurang"; cP="#fd7e14"; } }

                    getEl('antro_result').style.display = 'block';
                    getEl('antro_result').innerHTML = `<h5 style="margin:0 0 10px 0; color:#333; text-align:center;">📊 Deteksi Dini Status Gizi</h5><div style="font-size:0.85rem;"><div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:5px;"><span>Berat (BB/U):</span><b style="color:${cB};">${sB}</b></div><div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:5px 0;"><span>Tinggi (PB/U):</span><b style="color:${cT};">${sT}</b></div><div style="display:flex; justify-content:space-between; padding-top:5px;"><span>Proporsi (BB/PB):</span><b style="color:${cP};">${sP}</b></div></div>`;
                };
                if(idInputBB) getEl(idInputBB).addEventListener('input', calcAntro);
                if(idInputTB) getEl(idInputTB).addEventListener('input', calcAntro);

            } else if (sasaran.jenis_sasaran === 'BUMIL') {
                htmlQ += `<div style="background: #fcf1f6; padding: 15px; border-radius: 8px; border-left: 4px solid #d63384; margin-top: 15px;"><div class="form-group"><label style="color:#d63384; font-weight:bold;">Apakah BUMIL sudah melahirkan?</label><select id="is_melahirkan" name="is_melahirkan" class="form-control"><option value="TIDAK">Belum / Tidak</option><option value="YA">Ya, Sudah Melahirkan</option></select></div><div class="form-group hidden" id="box-tgl-lahir" style="margin-bottom:0;"><label style="font-weight:bold;">Tanggal Persalinan</label><input type="date" name="tgl_persalinan" class="form-control"></div></div>`;
                containerQ.innerHTML = htmlQ;
                if(getEl('is_melahirkan')) getEl('is_melahirkan').onchange = (e) => { if(e.target.value === 'YA') getEl('box-tgl-lahir').classList.remove('hidden'); else getEl('box-tgl-lahir').classList.add('hidden'); };
            } else { containerQ.innerHTML = htmlQ; }

            if(window.editModeLaporan) {
                setTimeout(() => {
                    const eL = window.editModeLaporan;
                    for (const [key, value] of Object.entries(eL.data_laporan || {})) {
                        let field = document.querySelector(`[name="${key}"]`);
                        if(field) { field.value = value; field.dispatchEvent(new Event('change')); field.dispatchEvent(new Event('input')); }
                    }
                }, 300);
            }
        };

        if(window.editModeLaporan) {
            selJenis.value = window.editModeLaporan.jenis_sasaran_saat_kunjungan || (window.editModeLaporan.id_sasaran_ref.startsWith('CTN')?'CATIN':window.editModeLaporan.id_sasaran_ref.startsWith('BML')?'BUMIL':window.editModeLaporan.id_sasaran_ref.startsWith('BFS')?'BUFAS':'BADUTA');
            selJenis.dispatchEvent(new Event('change'));
            setTimeout(() => { selSasaran.value = window.editModeLaporan.id_sasaran_ref; selSasaran.dispatchEvent(new Event('change')); selJenis.disabled = true; selSasaran.disabled = true; }, 100);
        }
    }

    const formPend = getEl('form-pendampingan');
    if (formPend) {
        formPend.onsubmit = async (e) => {
            e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true;
            try {
                const formData = new FormData(e.target); const jawaban = {}; formData.forEach((val, key) => jawaban[key] = val);
                if(jawaban.is_melahirkan === 'YA' && jawaban.tgl_persalinan && !window.editModeLaporan) {
                    const oR = await getDataById('sync_queue', jawaban.id_sasaran);
                    if(oR) {
                        oR.status_sasaran = 'SELESAI'; oR.is_synced = false; await putData('sync_queue', oR);
                        const nId = `BFS-${oR.id.split('-')[1]||'XXX'}-${Math.floor(Math.random()*1000000).toString().padStart(6,'0')}`;
                        const nB = JSON.parse(JSON.stringify(oR)); nB.id = nId; nB.jenis_sasaran = 'BUFAS'; nB.status_sasaran = 'AKTIF'; nB.is_synced = false; nB.created_at = new Date().toISOString();
                        await putData('sync_queue', nB); alert("🎉 BUMIL telah melahirkan. Kartu BUFAS baru diterbitkan!");
                    }
                }
                let idLapor = window.editModeLaporan ? window.editModeLaporan.id : `PEND-${Date.now()}`;
                let createdDate = window.editModeLaporan ? window.editModeLaporan.created_at : new Date().toISOString();
                if(window.editModeLaporan) { jawaban.id_sasaran = selSasaran.value; }
                await putData('sync_queue', { id: idLapor, tipe_laporan: 'PENDAMPINGAN', username: session.username, id_tim: session.id_tim, id_sasaran_ref: jawaban.id_sasaran, jenis_sasaran_saat_kunjungan: selJenis.value, data_laporan: jawaban, is_synced: false, created_at: createdDate });

                window.editModeLaporan = null; alert("✅ Laporan Pendampingan Tersimpan!"); renderKonten('daftar_sasaran');
            } catch (err) { alert("Gagal menyimpan."); } finally { btn.disabled = false; }
        };
    }
};

// ==========================================
// 7. FUNGSI REKAP BULANAN
// ==========================================
const initRekap = async () => {
    const session = window.currentUser; const antrean = await getAllData('sync_queue').catch(()=>[]);
    const dataTim = antrean.filter(a => String(a.id_tim) === String(session.id_tim)); const dataKader = dataTim.filter(a => a.username === session.username);
    const calculateStats = (data) => {
        const regList = data.filter(a => a.tipe_laporan === 'REGISTRASI'); const pendList = data.filter(a => a.tipe_laporan === 'PENDAMPINGAN');
        const stats = { CATIN: { aktif: 0, pend: 0 }, BUMIL: { aktif: 0, pend: 0 }, BUFAS: { aktif: 0, pend: 0 }, BADUTA: { aktif: 0, pend: 0 }, TOTAL: { aktif: 0, pend: 0 } };
        const hariIni = new Date(); hariIni.setHours(0,0,0,0);
        regList.forEach(r => {
            let isAktif = r.status_sasaran !== 'SELESAI';
            if (r.jenis_sasaran === 'CATIN' && r.data_laporan?.tanggal_pernikahan) { const tglNikah = new Date(r.data_laporan.tanggal_pernikahan); if (tglNikah < hariIni) isAktif = false; }
            if (r.jenis_sasaran === 'BUFAS' && r.data_laporan?.tgl_persalinan) { const tglBatas = new Date(r.data_laporan.tgl_persalinan); tglBatas.setDate(tglBatas.getDate() + 42); if (hariIni > tglBatas) isAktif = false; }
            if (isAktif && stats[r.jenis_sasaran]) { stats[r.jenis_sasaran].aktif++; stats.TOTAL.aktif++; }
        });
        pendList.forEach(p => {
            let jenis = p.jenis_sasaran_saat_kunjungan;
            if (!jenis && p.id_sasaran_ref) { if (p.id_sasaran_ref.startsWith('CTN')) jenis = 'CATIN'; else if (p.id_sasaran_ref.startsWith('BML')) jenis = 'BUMIL'; else if (p.id_sasaran_ref.startsWith('BFS')) jenis = 'BUFAS'; else if (p.id_sasaran_ref.startsWith('BDT')) jenis = 'BADUTA'; }
            if (jenis && stats[jenis]) { stats[jenis].pend++; stats.TOTAL.pend++; }
        });
        return stats;
    };
    const statsKader = calculateStats(dataKader); const statsTim = calculateStats(dataTim);
    const renderTableRows = (stats) => {
        const rows = ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'].map(j => `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 8px; text-align:left; font-weight:600; color: #444;">${j}</td><td style="padding: 10px 8px;">${stats[j].aktif}</td><td style="padding: 10px 8px;">${stats[j].pend}</td></tr>`).join('');
        const totalRow = `<tr style="background: #e9ecef; font-weight: bold;"><td style="padding: 12px 8px; text-align:left; color: #222;">TOTAL</td><td style="padding: 12px 8px; color: var(--primary); font-size: 1.1rem;">${stats.TOTAL.aktif}</td><td style="padding: 12px 8px; color: #198754; font-size: 1.1rem;">${stats.TOTAL.pend}</td></tr>`;
        return rows + totalRow;
    };
    if (getEl('tbody-rekap-kader')) getEl('tbody-rekap-kader').innerHTML = renderTableRows(statsKader);
    if (getEl('tbody-rekap-tim')) getEl('tbody-rekap-tim').innerHTML = renderTableRows(statsTim);
};

// ==========================================
// 8. FUNGSI KALKULATOR CERDAS
// ==========================================
const initKalkulator = () => {
    const sel = getEl('calc-selector'); const boxHPL = getEl('box-calc-hpl'); const boxIMT = getEl('box-calc-imt'); const boxKKA = getEl('box-calc-kka');
    if (sel) { sel.onchange = () => { boxHPL.style.display = sel.value === 'HPL' ? 'block' : 'none'; boxIMT.style.display = sel.value === 'IMT' ? 'block' : 'none'; boxKKA.style.display = sel.value === 'KKA' ? 'block' : 'none'; }; }
    if (getEl('btn-hitung-hpl')) { getEl('btn-hitung-hpl').onclick = () => { const hpht = getEl('calc-hpht').value; if (!hpht) { alert('Masukkan HPHT terlebih dahulu'); return; } const d = new Date(hpht); d.setDate(d.getDate() + 7); d.setMonth(d.getMonth() - 3); d.setFullYear(d.getFullYear() + 1); getEl('hasil-hpl').innerHTML = `Perkiraan Lahir:<br><span style="font-size:1.5rem;">${d.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</span>`; }; }
    if (getEl('btn-hitung-imt')) { getEl('btn-hitung-imt').onclick = () => { const bb = parseFloat(getEl('calc-bb').value); const tb = parseFloat(getEl('calc-tb').value) / 100; if (!bb || !tb) { alert('Masukkan BB dan TB dengan benar'); return; } const imt = (bb / (tb * tb)).toFixed(1); let status = '', color = ''; if (imt < 18.5) { status = 'Kekurangan Berat Badan'; color = '#dc3545'; } else if (imt <= 24.9) { status = 'Normal (Ideal)'; color = '#198754'; } else if (imt <= 29.9) { status = 'Kelebihan Berat Badan'; color = '#fd7e14'; } else { status = 'Obesitas'; color = '#dc3545'; } getEl('hasil-imt').innerHTML = `IMT Anda: <span style="font-size:1.5rem; color:${color};">${imt}</span><br><span style="color:${color};">${status}</span>`; }; }
    const selKKA = getEl('calc-usia-kka');
    if (selKKA) { selKKA.onchange = () => { const val = selKKA.value; let html = ''; if (val === '0-3') html = '✅ <b>Target KKA 0-3 Bulan:</b><br>- Menatap wajah ibu saat disusui<br>- Tersenyum membalas senyuman<br>- Menggerakkan tangan & kaki aktif'; else if (val === '3-6') html = '✅ <b>Target KKA 3-6 Bulan:</b><br>- Tengkurap dan berbalik sendiri<br>- Meraih benda yang didekatkan<br>- Menoleh ke arah suara'; else if (val === '6-12') html = '✅ <b>Target KKA 6-12 Bulan:</b><br>- Duduk sendiri tanpa sandaran<br>- Mengucapkan ma-ma / pa-pa<br>- Mengambil benda kecil (menjumput)'; else if (val === '12-24') html = '✅ <b>Target KKA 12-24 Bulan:</b><br>- Berjalan sendiri tanpa jatuh<br>- Menyebutkan 3-6 kata bermakna<br>- Menumpuk 2-4 kubus mainan'; if(html) { getEl('hasil-kka').innerHTML = `<div style="background:#e8f4fd; padding:15px; border-radius:8px; border-left:4px solid #0d6efd;">${html}<br><br><i style="font-size:0.75rem; color:#666;">*Jika anak belum bisa melakukan 1 hal di atas, sarankan ke Posyandu/Bidan.</i></div>`; } else { getEl('hasil-kka').innerHTML = ''; } }; }
};

// ==========================================
// 9. PENGATURAN
// ==========================================
const initSetting = () => {
    const session = window.currentUser; if(getEl('set-nama')) getEl('set-nama').value = session.nama; if(getEl('set-id')) getEl('set-id').value = session.username;
    const toggleDark = getEl('toggle-dark-mode'); if (toggleDark) { toggleDark.checked = localStorage.getItem('theme') === 'dark'; toggleDark.onchange = () => { localStorage.setItem('theme', toggleDark.checked ? 'dark' : 'light'); applySettings(); }; }
    const btnMin = getEl('btn-text-min'); const btnPlus = getEl('btn-text-plus');
    if (btnMin && btnPlus) { btnMin.onclick = () => { let size = parseInt(localStorage.getItem('fontSize') || '16'); if (size > 12) { size -= 2; localStorage.setItem('fontSize', size); applySettings(); } }; btnPlus.onclick = () => { let size = parseInt(localStorage.getItem('fontSize') || '16'); if (size < 24) { size += 2; localStorage.setItem('fontSize', size); applySettings(); } }; }
    const formP = getEl('form-ganti-pass'); if(formP) formP.onsubmit = (e) => { e.preventDefault(); alert("Permintaan ganti password disimpan."); e.target.reset(); renderKonten('dashboard'); };
};

// ==========================================
// 10. LOGIN PINTAR (MEMBACA MASTER_ADMIN) 🔥
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();

    const fLogin = getEl('form-login');
    if (fLogin) {
        fLogin.onsubmit = async (e) => {
            e.preventDefault();
            const btn = getEl('btn-login-submit'); const id = getEl('kader-id').value.trim(); const pin = getEl('kader-pin').value.trim();

            if (!id || !pin) return;
            if (btn) { btn.disabled = true; btn.innerText = "Memeriksa..."; }

            try {
                await initDB();
                const allUsers = await getAllData('master_user').catch(() => []);
                const user = allUsers.find(u => String(u.id_pengguna) === id || String(u.id_user) === id || String(u.username) === id || String(u.id) === id);

                if (!user) {
                    alert("❌ ID Pengguna tidak ditemukan. Memaksa sinkronisasi ulang data terbaru...");
                    if(window.jalankanSinkronisasi) await window.jalankanSinkronisasi();
                    if (btn) { btn.disabled = false; btn.innerText = "Masuk"; }
                    return;
                }

                const pinBenar = String(user.password_awal_ref || user.password || user.pin || "");
                if (pinBenar === pin) {
                    let nama = user.nama || user.nama_lengkap || user.username || id;
                    let role = String(user.role_akses || user.role || 'KADER').toUpperCase();
                    let ref_id = user.ref_id || user.id_kader || user.nik || '';
                    let tim = '-', noTim = '-';
                    // 🔥 Membaca scope_kecamatan dari Sheet User Bapak
                    let scopeKec = user.scope_kecamatan || user.kecamatan || user.wilayah || '';

                    if (role.includes('KADER') && ref_id) {
                        const allKader = await getAllData('master_kader').catch(() => []);
                        const k = allKader.find(x => String(x.id_kader) === String(ref_id) || String(x.nik) === String(ref_id));
                        if (k) {
                            nama = k.nama_kader || k.nama || nama; tim = k.id_tim || k.tim || '-';
                            const allTim = await getAllData('master_tim').catch(() => []);
                            const t = allTim.find(x => String(x.id_tim) === String(tim) || String(x.id) === String(tim));
                            noTim = t ? (t.nomor_tim || t.nama_tim || tim) : tim;
                        }
                    }

                    // 🔥 BACA HAK AKSES ABSOLUT DARI MASTER_ADMIN
                    if (role.includes('ADMIN')) {
                        const allAdmin = await getAllData('master_admin').catch(() => []);
                        const admData = allAdmin.find(a => String(a.id_admin) === id || String(a.nama_admin).toLowerCase() === nama.toLowerCase());
                        if (admData) {
                            scopeKec = admData.scope_kecamatan || scopeKec;
                            role = admData.role_admin || role;
                        }
                    }

                    const ses = { id: 'active_user', username: id, role: role, nama: nama, id_tim: tim, nomor_tim: noTim, kecamatan: scopeKec };
                    await putData('kader_session', ses);

                    getEl('kader-id').value = ''; getEl('kader-pin').value = '';

                    if (role.includes('ADMIN')) { initAdmin(ses); } else { masukKeAplikasi(ses); }
                } else { alert("❌ PIN yang Anda masukkan salah!"); }
            } catch (err) { console.error("Kesalahan Login:", err); alert("Kesalahan Sistem: " + err.message); } finally { if (btn) { btn.disabled = false; btn.innerText = "Masuk"; } }
        };
    }
});

const btnMenu = getEl('btn-menu'); const sidebar = getEl('sidebar'); const overlay = getEl('sidebar-overlay');
if (btnMenu && sidebar && overlay) { btnMenu.addEventListener('click', () => { sidebar.classList.add('active'); overlay.classList.add('active'); }); overlay.addEventListener('click', () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); }); }
