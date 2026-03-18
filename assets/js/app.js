import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData, uploadData } from './sync.js';

const getEl = (id) => document.getElementById(id);

// ==========================================
// 0. INISIALISASI SETTING TAMPILAN
// ==========================================
const applySettings = () => {
    if(localStorage.getItem('theme') === 'dark') {
        document.body.style.backgroundColor = '#121212';
        document.body.style.color = '#ffffff';
    } else {
        document.body.style.backgroundColor = '#f0f4f8';
        document.body.style.color = '#333333';
    }
    let fontSize = localStorage.getItem('fontSize') || '16';
    document.documentElement.style.fontSize = fontSize + 'px';
};
applySettings();

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
    const logoTimeout = setTimeout(() => { tampilkanLayar('login'); }, 3500);
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
    const wilayahKader = allWil.find(w => String(w.id_tim) === String(session.id_tim));
    const namaKec = wilayahKader && wilayahKader.kecamatan ? wilayahKader.kecamatan.toUpperCase() : "BULELENG";

    const greeting = getEl('user-greeting');
    if (greeting) {
        greeting.innerHTML = `DASHBOARD KADER<br>KECAMATAN ${namaKec}`;
        greeting.style.textAlign = 'center';
        greeting.style.lineHeight = '1.15';
        greeting.style.fontSize = '1.05rem';
    }
    const hInfo = document.querySelector('.header-info');
    if (hInfo) {
        hInfo.style.display = 'flex';
        hInfo.style.alignItems = 'center';
        hInfo.style.gap = '12px';
        hInfo.style.flexDirection = 'row-reverse'; 
    }

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
        { id: 'rekap_bulanan', icon: '📊', label: 'Rekap Bulanan' },
        { id: 'cetak_pdf', icon: '🖨️', label: 'Cetak PDF' },
        { id: 'bantuan', icon: '🆘', label: 'Bantuan & Edukasi' },
        { id: 'setting', icon: '⚙️', label: 'Pengaturan' },
        { id: 'sync_manual', icon: '🔄', label: 'Sinkronisasi Data' },
        { id: 'reload_app', icon: '🔁', label: 'Muat Ulang Layar' }
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
            
            const target = item.getAttribute('data-target');
            if(target === 'sync_manual') {
                if(window.jalankanSinkronisasi) window.jalankanSinkronisasi();
            } else if (target === 'reload_app') {
                location.reload(true);
            } else {
                renderKonten(target);
            }
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
                <div class="card" style="background: linear-gradient(135deg, #0d6efd, #0043a8); color: white; border:none; margin-bottom: 20px; padding: 20px;">
                    <p style="margin:0; opacity: 0.9; font-weight: 800; font-size: 0.85rem;">SELAMAT DATANG,</p>
                    <h2 style="margin: 3px 0 10px 0; font-size: 1.4rem; font-weight: 700; line-height: 1.2;">${session.nama}</h2>
                    <hr style="margin-bottom: 12px; border: 0; border-top: 1px solid rgba(255,255,255,0.2);">
                    <div id="dash-detail-wilayah">Memuat detail...</div>
                </div>
                
                <div id="dash-summary" style="background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #eee;">
                    Memuat ringkasan data...
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div class="card" style="text-align:center; padding: 15px 5px; cursor:pointer; border-bottom: 4px solid #0d6efd;" onclick="renderKonten('registrasi')">
                        <div style="font-size: 1.6rem;">📝</div>
                        <h3 style="font-size: 0.95rem; margin: 5px 0 0 0;">BARU</h3>
                        <p style="font-size: 0.65rem; color: #666; font-weight: bold; margin: 2px 0 0 0;">REGISTRASI</p>
                    </div>
                    
                    <div class="card" style="text-align:center; padding: 15px 5px; border-bottom: 4px solid orange;">
                        <div style="font-size: 1.6rem;">📦</div>
                        <h3 id="dash-tunda" style="font-size: 1rem; margin: 5px 0 0 0;">0/0</h3>
                        <p style="font-size: 0.65rem; color: #666; font-weight: bold; margin: 2px 0 0 0;">DATA SINKRON</p>
                    </div>
                    
                    <div class="card" style="text-align:center; padding: 15px 5px; cursor:pointer; border-bottom: 4px solid #198754;" onclick="renderKonten('pendampingan')">
                        <div style="font-size: 1.6rem;">🤝</div>
                        <h3 style="font-size: 0.95rem; margin: 5px 0 0 0;">LAPOR</h3>
                        <p style="font-size: 0.65rem; color: #666; font-weight: bold; margin: 2px 0 0 0;">PENDAMPINGAN</p>
                    </div>
                </div>
            </div>`;

        try {
            const [allWil, antrean] = await Promise.all([
                getAllData('master_tim_wilayah').catch(()=>[]),
                getAllData('sync_queue').catch(()=>[])
            ]);
            
            const wilayahKerja = allWil.filter(w => String(w.id_tim) === String(session.id_tim));
            const daftarDusun = wilayahKerja.map(w => w.dusun_rw).join(', ') || '-';
            
            if (getEl('dash-detail-wilayah')) {
                getEl('dash-detail-wilayah').innerHTML = `
                    <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; margin-bottom: 12px;">
                        NO. TIM: ${session.nomor_tim || session.id_tim}
                    </div>
                    <div style="line-height: 1.25;">
                        <div style="margin-bottom: 6px;"><span style="opacity:0.8; font-size: 0.8rem;">📍 Wilayah Tugas (Dusun/RW):</span><br><span style="font-weight: 600; font-size: 0.9rem;">${daftarDusun}</span></div>
                        <div style="margin-bottom: 6px;"><span style="opacity:0.8; font-size: 0.8rem;">🏘️ Desa/Kelurahan:</span><br><span style="font-weight: 600; font-size: 0.9rem;">${wilayahKerja[0]?.desa_kelurahan || '-'}</span></div>
                        <div><span style="opacity:0.8; font-size: 0.8rem;">🏛️ Kecamatan:</span><br><span style="font-weight: 600; font-size: 0.9rem;">${wilayahKerja[0]?.kecamatan || '-'}</span></div>
                    </div>`;
            }
            
            const queueTim = antrean.filter(a => String(a.id_tim) === String(session.id_tim));
            const syncedCount = queueTim.filter(a => a.is_synced).length;
            const pendingCount = queueTim.filter(a => !a.is_synced).length;
            
            if (getEl('dash-tunda')) getEl('dash-tunda').innerText = `${syncedCount}/${pendingCount}`;

            const regList = queueTim.filter(a => a.tipe_laporan === 'REGISTRASI');
            const pendList = queueTim.filter(a => a.tipe_laporan === 'PENDAMPINGAN');
            
            const cReg = { CATIN: 0, BUMIL: 0, BUFAS: 0, BADUTA: 0 };
            const cPend = { CATIN: 0, BUMIL: 0, BUFAS: 0, BADUTA: 0 };

            const hariIni = new Date(); hariIni.setHours(0,0,0,0);

            regList.forEach(r => { 
                let isAktif = r.status_sasaran !== 'SELESAI';
                if (r.jenis_sasaran === 'CATIN' && r.data_laporan?.tanggal_pernikahan) {
                    const tglNikah = new Date(r.data_laporan.tanggal_pernikahan);
                    if (tglNikah < hariIni) isAktif = false;
                }
                if (r.jenis_sasaran === 'BUFAS' && r.data_laporan?.tgl_persalinan) {
                    const tglBatas = new Date(r.data_laporan.tgl_persalinan);
                    tglBatas.setDate(tglBatas.getDate() + 42); 
                    if (hariIni > tglBatas) isAktif = false;
                }
                if(cReg[r.jenis_sasaran] !== undefined) cReg[r.jenis_sasaran]++; 
            });

            pendList.forEach(p => {
                let jenis = p.jenis_sasaran_saat_kunjungan;
                if (!jenis && p.id_sasaran_ref) {
                    if (p.id_sasaran_ref.startsWith('CTN')) jenis = 'CATIN';
                    else if (p.id_sasaran_ref.startsWith('BML')) jenis = 'BUMIL';
                    else if (p.id_sasaran_ref.startsWith('BFS')) jenis = 'BUFAS';
                    else if (p.id_sasaran_ref.startsWith('BDT')) jenis = 'BADUTA';
                }
                if(jenis && cPend[jenis] !== undefined) cPend[jenis]++;
            });

            if(getEl('dash-summary')){
                getEl('dash-summary').innerHTML = `
                    <h4 style="font-size: 0.95rem; color: #555; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">📊 Total Data Kumulatif</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem;">
                        <div>
                            <strong style="color:var(--primary);">🎯 Sasaran Terdaftar</strong>
                            <ul style="margin: 5px 0 0 15px; padding: 0; color: #444; list-style-type: square;">
                                <li>CATIN: <b>${cReg.CATIN}</b></li>
                                <li>BUMIL: <b>${cReg.BUMIL}</b></li>
                                <li>BUFAS: <b>${cReg.BUFAS}</b></li>
                                <li>BADUTA: <b>${cReg.BADUTA}</b></li>
                            </ul>
                        </div>
                        <div>
                            <strong style="color:#198754;">🤝 Kunjungan Pendampingan</strong>
                            <ul style="margin: 5px 0 0 15px; padding: 0; color: #444; list-style-type: square;">
                                <li>CATIN: <b>${cPend.CATIN}</b></li>
                                <li>BUMIL: <b>${cPend.BUMIL}</b></li>
                                <li>BUFAS: <b>${cPend.BUFAS}</b></li>
                                <li>BADUTA: <b>${cPend.BADUTA}</b></li>
                            </ul>
                        </div>
                    </div>`;
            }

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
    } else if (target === 'rekap_bulanan') { 
        const tpl = getEl('template-rekap');
        if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initRekap(); }
    } else if (target === 'cetak_pdf') {
        const tpl = getEl('template-cetak-pdf');
        if(tpl) area.appendChild(tpl.content.cloneNode(true));
    } else if (target === 'setting') {
        const tpl = getEl('template-setting');
        if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initSetting(); }
    } else if (target === 'bantuan') {
        const tpl = getEl('template-bantuan');
        if(tpl) area.appendChild(tpl.content.cloneNode(true));
    } else if (target === 'kalkulator') {
        const tpl = getEl('template-kalkulator');
        if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initKalkulator(); }
    }
};

// ==========================================
// 4. LOGIKA FORM DINAMIS & KODE KECAMATAN
// ==========================================
const getKodeKecamatan = (kec) => {
    if (!kec) return "XXX";
    const map = {
        'GEROKGAK': 'GRK', 'SERIRIT': 'SRT', 'BUSUNGBIU': 'BSB',
        'BANJAR': 'BJR', 'SUKASADA': 'SKS', 'BULELENG': 'BLL',
        'SAWAN': 'SWN', 'KUBUTAMBAHAN': 'KBT', 'TEJAKULA': 'TJK'
    };
    return map[kec.toUpperCase()] || "XXX";
};

const renderPertanyaanDinamis = (jenis, modul, container, questions) => {
    if (!jenis) { container.innerHTML = ''; return; }
    
    const filteredQ = questions.filter(q => 
        String(q.is_active || '').toUpperCase() === 'Y' && 
        String(q.modul || '').toUpperCase() === modul.toUpperCase() &&
        (String(q.jenis_sasaran || '').toUpperCase() === 'UMUM' || String(q.jenis_sasaran || '').toUpperCase() === jenis)
    ).sort((a,b)=> (parseInt(a.urutan)||0) - (parseInt(b.urutan)||0));

    if (filteredQ.length > 0) {
        let html = `<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-top: 4px solid var(--primary); margin-top: 20px;">
                    <h4 style="margin-top:0; margin-bottom:15px; color:var(--primary); font-size: 1.1rem;">📝 Formulir Kuesioner Lanjutan</h4>`;
        
        filteredQ.forEach(q => {
            let req = String(q.is_required || '').toUpperCase() === 'Y' ? 'required' : '';
            let markerReq = req ? '<span style="color:red; font-weight:bold;">*</span>' : '';
            let inputHtml = '';
            
            if(q.tipe_input === 'select') {
                let opsi = [];
                try { opsi = JSON.parse(q.opsi_json || '[]'); } catch(e) { }
                let opsiHtml = opsi.map(o => `<option value="${o}">${o}</option>`).join('');
                inputHtml = `<select name="${q.id_pertanyaan}" class="form-control" ${req}><option value="">-- Pilih Jawaban --</option>${opsiHtml}</select>`;
            } else {
                let pHolder = q.tipe_input === 'number' ? 'Masukkan angka...' : 'Ketik jawaban...';
                inputHtml = `<input type="${q.tipe_input || 'text'}" name="${q.id_pertanyaan}" class="form-control" placeholder="${pHolder}" step="any" ${req}>`;
            }
            
            html += `<div class="form-group" style="margin-bottom: 12px;">
                        <label style="font-weight:600; color:#444; font-size: 0.9rem;">${q.label_pertanyaan} ${markerReq}</label>
                        ${inputHtml}
                     </div>`;
        });
        html += `</div>`;
        container.innerHTML = html;
    } else { container.innerHTML = ''; }
};

const initFormRegistrasi = async () => {
    const session = window.currentUser;
    const allWil = await getAllData('master_tim_wilayah').catch(()=>[]);
    const allWilBali = await getAllData('master_wilayah_bali').catch(()=>[]); 
    const tugas = allWil.filter(w => String(w.id_tim) === String(session.id_tim));
    
    const selJenis = getEl('reg-jenis');
    const containerQ = getEl('pertanyaan-dinamis');
    const boxCatin = getEl('wilayah-catin');
    const boxDomisili = getEl('wilayah-domisili');

    const boxIbu = getEl('box-ibu-kandung');
    const inputIbu = getEl('input-ibu-kandung');
    const boxNikah = getEl('box-tgl-nikah');
    const inputNikah = getEl('input-tgl-nikah');
    const boxSalinReg = getEl('box-tgl-salin-reg');
    const inputSalinReg = getEl('input-tgl-salin-reg');

    const selDesa = getEl('reg-desa');
    const selDusun = getEl('reg-dusun');
    const regAlamat = getEl('reg-alamat');
    const selJk = document.querySelector('select[name="jenis_kelamin"]');

    if (selDesa && tugas.length > 0) {
        const dDesa = [...new Set(tugas.map(w => w.desa_kelurahan))].filter(Boolean);
        selDesa.innerHTML = '<option value="">-- Pilih Desa --</option>' + dDesa.map(d => `<option value="${d}">${d}</option>`).join('');
        selDesa.onchange = () => {
            const dDusun = tugas.filter(w => w.desa_kelurahan === selDesa.value);
            selDusun.innerHTML = '<option value="">-- Pilih Dusun --</option>' + dDusun.map(d => `<option value="${d.dusun_rw}">${d.dusun_rw}</option>`).join('');
        };
    }

    const catinKab = getEl('catin-kab');
    const catinKec = getEl('catin-kec');
    const catinDesa = getEl('catin-desa');

    if (catinKab && allWilBali.length > 0) {
        const dKab = [...new Set(allWilBali.map(w => w.kabupaten))].filter(Boolean);
        catinKab.innerHTML = '<option value="">-- Pilih Kabupaten --</option>' + dKab.map(d => `<option value="${d}">${d}</option>`).join('');
        catinKab.onchange = () => {
            const fKec = allWilBali.filter(w => w.kabupaten === catinKab.value);
            const dKec = [...new Set(fKec.map(w => w.kecamatan))].filter(Boolean);
            catinKec.innerHTML = '<option value="">-- Pilih Kecamatan --</option>' + dKec.map(d => `<option value="${d}">${d}</option>`).join('');
            catinDesa.innerHTML = '<option value="">-- Pilih Desa --</option>'; 
        };
        catinKec.onchange = () => {
            const fDesa = allWilBali.filter(w => w.kabupaten === catinKab.value && w.kecamatan === catinKec.value);
            const dDesa = [...new Set(fDesa.map(w => w.desa_kelurahan))].filter(Boolean);
            catinDesa.innerHTML = '<option value="">-- Pilih Desa --</option>' + dDesa.map(d => `<option value="${d}">${d}</option>`).join('');
        };
    }

    const questions = await getAllData('master_pertanyaan').catch(()=>[]);
    
    if (selJenis && containerQ) {
        selJenis.onchange = () => {
            const jenis = selJenis.value;
            
            if (selJk) {
                if (jenis === 'BUMIL' || jenis === 'BUFAS') {
                    selJk.value = 'Perempuan'; selJk.style.pointerEvents = 'none'; selJk.style.backgroundColor = '#e9ecef'; 
                } else {
                    selJk.style.pointerEvents = 'auto'; selJk.style.backgroundColor = '#fff'; 
                }
            }

            if(boxIbu && inputIbu) {
                if(jenis === 'BADUTA') { boxIbu.style.display = 'block'; inputIbu.setAttribute('required', 'true'); } 
                else { boxIbu.style.display = 'none'; inputIbu.removeAttribute('required'); inputIbu.value = ''; }
            }
            if(boxNikah && inputNikah) {
                if(jenis === 'CATIN') { boxNikah.style.display = 'block'; inputNikah.setAttribute('required', 'true'); } 
                else { boxNikah.style.display = 'none'; inputNikah.removeAttribute('required'); inputNikah.value = ''; }
            }
            if(boxSalinReg && inputSalinReg) {
                if(jenis === 'BUFAS') { boxSalinReg.style.display = 'block'; inputSalinReg.setAttribute('required', 'true'); } 
                else { boxSalinReg.style.display = 'none'; inputSalinReg.removeAttribute('required'); inputSalinReg.value = ''; }
            }
            if(boxCatin && boxDomisili) {
                if (jenis === 'CATIN') {
                    boxCatin.style.display = 'block'; boxDomisili.style.display = 'none';
                    if(selDesa) selDesa.removeAttribute('required'); if(selDusun) selDusun.removeAttribute('required');
                    if(regAlamat) regAlamat.removeAttribute('required'); if(catinKab) catinKab.setAttribute('required', 'true');
                    if(catinKec) catinKec.setAttribute('required', 'true'); if(catinDesa) catinDesa.setAttribute('required', 'true');
                } else {
                    boxCatin.style.display = 'none'; boxDomisili.style.display = 'block';
                    if(selDesa) selDesa.setAttribute('required', 'true'); if(selDusun) selDusun.setAttribute('required', 'true');
                    if(regAlamat) regAlamat.setAttribute('required', 'true'); if(catinKab) catinKab.removeAttribute('required');
                    if(catinKec) catinKec.removeAttribute('required'); if(catinDesa) catinDesa.removeAttribute('required');
                }
            }
            renderPertanyaanDinamis(jenis, 'REGISTRASI', containerQ, questions);
        };
    }

    const formReg = getEl('form-registrasi');
    if (formReg) {
        formReg.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button'); btn.disabled = true; btn.innerText = "Menyimpan...";
            try {
                const formData = new FormData(e.target);
                const jawaban = {}; formData.forEach((val, key) => { jawaban[key] = val; });
                
                const kecamatan = tugas.length > 0 ? tugas[0].kecamatan : 'TIDAK_DIKETAHUI';
                const jenisSasaran = selJenis.value;
                let prefix = "REG";
                if (jenisSasaran === 'CATIN') prefix = "CTN";
                else if (jenisSasaran === 'BUMIL') prefix = "BML";
                else if (jenisSasaran === 'BUFAS') prefix = "BFS";
                else if (jenisSasaran === 'BADUTA') prefix = "BDT";
                
                const kodeKec = getKodeKecamatan(kecamatan);
                const angkaUnik = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                const idSasaran = `${prefix}-${kodeKec}-${angkaUnik}`;
                
                const desaFinal = jenisSasaran === 'CATIN' ? '-' : selDesa.value;
                const dusunFinal = jenisSasaran === 'CATIN' ? '-' : selDusun.value;

                if (jawaban.tanggal_lahir) {
                    const tglLahir = new Date(jawaban.tanggal_lahir);
                    const tglDaftar = new Date();
                    let umurTahun = tglDaftar.getFullYear() - tglLahir.getFullYear();
                    let umurBulan = tglDaftar.getMonth() - tglLahir.getMonth();
                    if (umurBulan < 0 || (umurBulan === 0 && tglDaftar.getDate() < tglLahir.getDate())) {
                        umurTahun--; umurBulan += 12;
                    }
                    jawaban.usia_saat_daftar_tahun = umurTahun;
                    jawaban.usia_saat_daftar_bulan = umurBulan;
                    
                    if (jenisSasaran === 'BUFAS' && jawaban.tgl_persalinan) {
                        const tglSalin = new Date(jawaban.tgl_persalinan);
                        let uTahun = tglSalin.getFullYear() - tglLahir.getFullYear();
                        let uBulan = tglSalin.getMonth() - tglLahir.getMonth();
                        if (uBulan < 0 || (uBulan === 0 && tglSalin.getDate() < tglLahir.getDate())) { uTahun--; uBulan += 12; }
                        jawaban.usia_saat_melahirkan_tahun = uTahun;
                        jawaban.usia_saat_melahirkan_bulan = uBulan;
                    }
                }

                const laporan = {
                    id: idSasaran,
                    tipe_laporan: 'REGISTRASI', username: session.username, 
                    id_tim: session.id_tim, nomor_tim: session.nomor_tim,
                    kecamatan: kecamatan, jenis_sasaran: jenisSasaran, 
                    nama_sasaran: jawaban.nama_sasaran, desa: desaFinal, dusun: dusunFinal,
                    data_laporan: jawaban, status_sasaran: 'AKTIF',
                    is_synced: false, created_at: new Date().toISOString()
                };
                
                await putData('sync_queue', laporan);
                alert(`✅ Registrasi berhasil! ID Sasaran: ${idSasaran}`);
                renderKonten('dashboard');
            } catch (err) { alert("Gagal menyimpan form."); } finally { btn.disabled = false; btn.innerText = "💾 Simpan Registrasi"; }
        };
    }
};

// ==========================================
// 5. FITUR DAFTAR SASARAN & DETAIL POP-UP (UPDATE KIA/KKA DIGITAL)
// ==========================================
const initDaftarSasaran = async () => {
    const session = window.currentUser;
    const filterJenis = getEl('filter-jenis');
    const filterStatus = getEl('filter-status');
    const list = getEl('list-sasaran');
    
    const modal = getEl('modal-detail');
    const btnTutup = getEl('btn-tutup-modal');
    const kontenDetail = getEl('konten-detail');

    if(!list) return;
    
    const antrean = await getAllData('sync_queue').catch(()=>[]);
    const masterPertanyaan = await getAllData('master_pertanyaan').catch(()=>[]);
    
    const regList = antrean.filter(a => a.tipe_laporan === 'REGISTRASI' && String(a.id_tim) === String(session.id_tim));
    const pendList = antrean.filter(a => a.tipe_laporan === 'PENDAMPINGAN' && String(a.id_tim) === String(session.id_tim));
    
    const processedList = regList.map(r => {
        let isExpired = r.status_sasaran === 'SELESAI';
        let statusRaw = r.status_sasaran || 'AKTIF';
        let labelSelesai = '<span style="color: var(--primary); font-weight:bold;">Aktif</span>';
        let alasanExpired = 'Selesai';
        
        const hariIni = new Date(); hariIni.setHours(0,0,0,0);

        if (r.jenis_sasaran === 'CATIN' && r.data_laporan && r.data_laporan.tanggal_pernikahan) {
            const tglNikah = new Date(r.data_laporan.tanggal_pernikahan);
            if (tglNikah < hariIni) { isExpired = true; statusRaw = 'SELESAI'; alasanExpired = 'Sudah Menikah'; }
        }
        
        if (r.jenis_sasaran === 'BUFAS' && r.data_laporan && r.data_laporan.tgl_persalinan) {
            const tglBatas = new Date(r.data_laporan.tgl_persalinan);
            tglBatas.setDate(tglBatas.getDate() + 42); 
            if (hariIni > tglBatas) { isExpired = true; statusRaw = 'SELESAI'; alasanExpired = 'Masa Nifas > 42 Hari'; }
        }
        
        if (isExpired || statusRaw === 'SELESAI') {
            isExpired = true; statusRaw = 'SELESAI';
            if(alasanExpired === 'Selesai') { alasanExpired = r.jenis_sasaran === 'CATIN' ? 'Sudah Menikah' : (r.jenis_sasaran === 'BUMIL' ? 'Sudah Melahirkan' : 'Selesai'); }
            labelSelesai = `<span style="color: #dc3545; font-weight:bold;">SELESAI (${alasanExpired})</span>`;
        }
        
        let jk = r.data_laporan?.jenis_kelamin === 'Laki-laki' ? 'L' : 'P';
        let jkDisplay = (r.jenis_sasaran === 'CATIN' || r.jenis_sasaran === 'BADUTA') ? `(${jk})` : '';
        let usiaTh = r.data_laporan?.usia_saat_daftar_tahun !== undefined ? r.data_laporan.usia_saat_daftar_tahun : '-';
        let textBaris2 = `${r.jenis_sasaran} ${jkDisplay} ${usiaTh} Th`.trim();

        return { ...r, isExpired, labelSelesai, statusRaw, textBaris2 };
    });

    const renderList = () => {
        const fJ = filterJenis ? filterJenis.value : 'ALL';
        const fS = filterStatus ? filterStatus.value : 'ALL';
        
        let filtered = processedList.filter(r => {
            let matchJ = fJ === 'ALL' || r.jenis_sasaran === fJ;
            let matchS = fS === 'ALL' || r.statusRaw === fS;
            return matchJ && matchS;
        });

        if (filtered.length === 0) { 
            list.innerHTML = `<div style="text-align:center; padding:20px; color:#999;">Tidak ada sasaran yang sesuai filter.</div>`; 
        } else { 
            list.innerHTML = filtered.map(r => `
                <div class="sasaran-card" data-id="${r.id}" style="background:${r.isExpired ? '#f8f9fa' : '#fff'}; padding:15px; border-radius:8px; border-left: 4px solid ${r.isExpired ? '#6c757d' : 'var(--primary)'}; opacity: ${r.isExpired ? '0.75' : '1'}; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="font-weight: bold; font-size: 1.15rem; color: #333; text-transform: uppercase;">${r.nama_sasaran || 'Tanpa Nama'}</div>
                    <div style="font-size: 0.95rem; color: #555; font-weight: bold; margin-top: 3px;">${r.textBaris2}</div>
                    <div style="font-size: 0.85rem; color: #666; margin-top: 3px;">📍 ${r.dusun}, ${r.desa}</div>
                    <div style="font-size: 0.9rem; margin-top: 6px;">${r.labelSelesai}</div>
                </div>`).join(''); 
        }

        document.querySelectorAll('.sasaran-card').forEach(card => {
            card.onclick = () => showDetail(card.getAttribute('data-id'));
        });
    };

    const showDetail = (id) => {
        const r = processedList.find(x => x.id === id);
        if(!r) return;
        
        const riwayat = pendList.filter(p => p.id_sasaran_ref === id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        let htmlRiwayat = '';

        if (riwayat.length === 0) {
            htmlRiwayat = '<div style="color:#888; font-size:0.9rem; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align:center; border: 1px dashed #ccc;">Belum ada riwayat kunjungan pendampingan.</div>';
        
        } else if (r.jenis_sasaran === 'BADUTA') {
            htmlRiwayat += `<div style="overflow-x:auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #ddd;">
                <table style="width:100%; border-collapse: collapse; font-size: 0.85rem; text-align:center; min-width:600px;">
                    <thead>
                        <tr style="background: var(--primary); color: white;">
                            <th style="padding:10px; border:1px solid #c6c6c6;">Tanggal</th>
                            <th style="padding:10px; border:1px solid #c6c6c6;">Usia</th>
                            <th style="padding:10px; border:1px solid #c6c6c6;">BB (kg)</th>
                            <th style="padding:10px; border:1px solid #c6c6c6;">TB/PB (cm)</th>
                            <th style="padding:10px; border:1px solid #c6c6c6;">LK (cm)</th>
                            <th style="padding:10px; border:1px solid #c6c6c6;">Status KKA</th>
                            <th style="padding:10px; border:1px solid #c6c6c6; text-align:left;">Catatan Lainnya</th>
                        </tr>
                    </thead>
                    <tbody>`;

            riwayat.forEach(p => {
                let tglKunjungan = new Date(p.data_laporan?.tgl_kunjungan || p.created_at);
                let tglLahir = new Date(r.data_laporan?.tanggal_lahir || new Date());
                
                let umurBulan = (tglKunjungan.getFullYear() - tglLahir.getFullYear()) * 12;
                umurBulan -= tglLahir.getMonth();
                umurBulan += tglKunjungan.getMonth();
                if (tglKunjungan.getDate() < tglLahir.getDate()) umurBulan--;
                if (umurBulan < 0) umurBulan = 0;

                let valBB = '-', valTB = '-', valLK = '-', valKKA = '-';
                let catatanLain = `<span style="display:block; margin-bottom:4px;"><b>Hasil Umum:</b> ${p.data_laporan?.catatan || '-'}</span>`;

                for (const [key, value] of Object.entries(p.data_laporan || {})) {
                    if (['id_sasaran', 'tgl_kunjungan', 'catatan', 'evaluasi_kka'].includes(key)) continue;
                    if (!value) continue;

                    let label = key;
                    let foundQ = masterPertanyaan.find(mq => String(mq.id_pertanyaan) === String(key));
                    
                    if(foundQ) label = foundQ.label_pertanyaan.toLowerCase();
                    else label = key.toLowerCase();

                    if (label.includes('berat') || label === 'bb') valBB = value;
                    else if (label.includes('tinggi') || label.includes('panjang') || label.includes('tb') || label.includes('pb')) valTB = value;
                    else if (label.includes('lingkar kepala') || label === 'lk') valLK = value;
                    else if (label.includes('perkembangan') || label.includes('kka') || label.includes('sesuai umur')) valKKA = value;
                    else {
                        catatanLain += `<small style="display:block; border-top: 1px dashed #ccc; padding-top:3px; margin-top:3px;"><b>${foundQ ? foundQ.label_pertanyaan : key}:</b> ${value}</small>`;
                    }
                }

                // Cek apakah ada asisten KKA yang diisi
                if (p.data_laporan?.evaluasi_kka) valKKA = p.data_laporan.evaluasi_kka;

                let syncIcon = p.is_synced ? '<span style="color:#198754; font-size:0.7rem;">(Server)</span>' : '<span style="color:#fd7e14; font-size:0.7rem;">(Lokal)</span>';
                let kkaStyle = (valKKA.toLowerCase().includes('terlambat') || valKKA.toLowerCase().includes('tidak')) ? 'color:#dc3545; font-weight:bold;' : 'color:#198754; font-weight:bold;';

                htmlRiwayat += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding:10px; border:1px solid #eee;">${tglKunjungan.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: '2-digit'})} <br>${syncIcon}</td>
                        <td style="padding:10px; border:1px solid #eee; font-weight:bold; font-size:1rem; color:var(--primary);">${umurBulan} Bln</td>
                        <td style="padding:10px; border:1px solid #eee;">${valBB}</td>
                        <td style="padding:10px; border:1px solid #eee;">${valTB}</td>
                        <td style="padding:10px; border:1px solid #eee;">${valLK}</td>
                        <td style="padding:10px; border:1px solid #eee; ${kkaStyle}">${valKKA}</td>
                        <td style="padding:10px; border:1px solid #eee; text-align:left; line-height:1.3;">${catatanLain}</td>
                    </tr>`;
            });

            htmlRiwayat += `</tbody></table></div>`;

        } else {
            htmlRiwayat = riwayat.map(p => {
                let dynamicHtml = '';
                for (const [key, value] of Object.entries(p.data_laporan || {})) {
                    if (['id_sasaran', 'tgl_kunjungan', 'catatan', 'is_melahirkan', 'tgl_persalinan', 'nama_sasaran', 'nama_kk', 'nik', 'jenis_kelamin'].includes(key)) continue;
                    
                    let label = key;
                    let foundQ = masterPertanyaan.find(mq => String(mq.id_pertanyaan) === String(key));
                    
                    if(foundQ) {
                        label = foundQ.label_pertanyaan;
                    } else {
                        if(key.startsWith('q_')) {
                            let qId = key.replace('q_', '');
                            let fQ2 = masterPertanyaan.find(mq => String(mq.id_pertanyaan) === String(qId));
                            if(fQ2) label = fQ2.label_pertanyaan;
                            else continue; 
                        } else {
                            label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        }
                    }

                    dynamicHtml += `
                        <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
                            <div style="font-size: 0.75rem; color: #666; font-weight: normal;">${label}</div>
                            <div style="font-size: 0.9rem; color: #222; font-weight: 500;">${value || '-'}</div>
                        </div>`;
                }

                return `
                <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden;">
                    <div style="background: #e8f4fd; padding: 10px 15px; border-bottom: 1px solid #cfe2ff; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; color: #0d6efd; font-size: 0.9rem;">📅 ${new Date(p.data_laporan?.tgl_kunjungan || p.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                        <span style="font-size: 0.7rem; font-weight: bold; color: ${p.is_synced ? '#198754' : '#fd7e14'}; background: #fff; padding: 3px 8px; border-radius: 12px; border: 1px solid #ddd;">
                            ${p.is_synced ? '✅ Server' : '⏳ Lokal'}
                        </span>
                    </div>
                    <div style="padding: 15px;">
                        <div style="font-size: 0.8rem; color: #666; margin-bottom: 4px;">Catatan Umum / Hasil:</div>
                        <div style="font-size: 0.95rem; color: #333; margin-bottom: ${dynamicHtml ? '15px' : '0'}; background: #f8f9fa; padding: 10px; border-radius: 6px; border-left: 4px solid #0d6efd;">
                            ${p.data_laporan?.catatan || '-'}
                        </div>
                        ${dynamicHtml ? `<div style="background: #fff; border: 1px solid #f1f1f1; padding: 10px; border-radius: 6px;">${dynamicHtml}</div>` : ''}
                    </div>
                </div>`;
            }).join('');
        }

        kontenDetail.innerHTML = `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd; line-height: 1.4;">
                <div style="font-size: 0.8rem; color: #666;">Nama Sasaran</div>
                <div style="font-size: 1.15rem; font-weight: bold; color: #222; margin-bottom: 12px; text-transform: uppercase;">${r.nama_sasaran || '-'}</div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                    <div>
                        <div style="font-size: 0.8rem; color: #666;">ID Sasaran / NIK</div>
                        <div style="font-size: 0.95rem; color: #222; font-weight: 500;">${r.id} <br> ${r.data_laporan?.nik || '-'}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; color: #666;">Kategori</div>
                        <div style="font-size: 0.95rem; color: #222; font-weight: bold;">${r.textBaris2}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                    <div>
                        <div style="font-size: 0.8rem; color: #666;">Status Pendampingan</div>
                        <div style="font-size: 0.95rem;">${r.labelSelesai}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; color: #666;">Tgl Lahir ${r.jenis_sasaran === 'BUFAS' ? '/ Salin' : ''}</div>
                        <div style="font-size: 0.95rem; color: #222;">${r.data_laporan?.tanggal_lahir || '-'} ${r.jenis_sasaran === 'BUFAS' ? '<br>'+(r.data_laporan?.tgl_persalinan || '-') : ''}</div>
                    </div>
                </div>

                <div style="font-size: 0.8rem; color: #666;">Nama KK ${r.jenis_sasaran === 'BADUTA' ? '/ Ibu Kandung' : ''}</div>
                <div style="font-size: 0.95rem; color: #222; margin-bottom: 12px;">${r.data_laporan?.nama_kk || '-'} ${r.jenis_sasaran === 'BADUTA' ? ' / ' + (r.data_laporan?.nama_ibu_kandung || '-') : ''}</div>

                <div style="font-size: 0.8rem; color: #666;">Alamat</div>
                <div style="font-size: 0.95rem; color: #222;">${r.data_laporan?.alamat || '-'}</div>
            </div>
            
            <h4 style="margin-bottom: 15px; color: var(--primary); border-bottom: 2px solid #ddd; padding-bottom: 5px;">
                ${r.jenis_sasaran === 'BADUTA' ? '📈 Buku KIA/KKA Digital' : 'Riwayat Kunjungan'} (${riwayat.length})
            </h4>
            <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
                ${htmlRiwayat}
            </div>
        `;
        
        if(modal) modal.style.display = 'block';
    };

    if(btnTutup) btnTutup.onclick = () => { if(modal) modal.style.display = 'none'; };
    if(filterJenis) filterJenis.onchange = renderList;
    if(filterStatus) filterStatus.onchange = renderList;

    renderList(); 
};

// ==========================================
// 6. FORM PENDAMPINGAN + ASISTEN KKA OTOMATIS
// ==========================================
const initFormPendampingan = async () => {
    const session = window.currentUser;
    const selJenis = getEl('pend-jenis');
    const selSasaran = getEl('pend-sasaran');
    const infoBox = getEl('pend-info-sasaran');
    const containerQ = getEl('form-pendampingan-dinamis');
    const masterPertanyaan = await getAllData('master_pertanyaan').catch(()=>[]);
    
    const antrean = await getAllData('sync_queue').catch(()=>[]);
    const regList = antrean.filter(a => a.tipe_laporan === 'REGISTRASI' && String(a.id_tim) === String(session.id_tim));
    
    if (selJenis && selSasaran) { 
        
        selJenis.onchange = () => {
            const jenis = selJenis.value;
            containerQ.innerHTML = '';
            if(infoBox) infoBox.style.display = 'none';
            
            if (!jenis) {
                selSasaran.innerHTML = '<option value="">-- Pilih Jenis Dahulu --</option>';
                selSasaran.disabled = true;
                return;
            }

            const activeRegList = regList.filter(r => {
                if (r.jenis_sasaran !== jenis) return false;
                if (r.status_sasaran === 'SELESAI') return false; 
                
                const hariIni = new Date(); hariIni.setHours(0,0,0,0);

                if (r.jenis_sasaran === 'CATIN' && r.data_laporan && r.data_laporan.tanggal_pernikahan) {
                    const tglNikah = new Date(r.data_laporan.tanggal_pernikahan);
                    if (tglNikah < hariIni) return false; 
                }

                if (r.jenis_sasaran === 'BUFAS' && r.data_laporan && r.data_laporan.tgl_persalinan) {
                    const tglBatas = new Date(r.data_laporan.tgl_persalinan);
                    tglBatas.setDate(tglBatas.getDate() + 42);
                    if (hariIni > tglBatas) return false;
                }

                return true; 
            });

            if (activeRegList.length === 0) {
                selSasaran.innerHTML = `<option value="">-- Tidak ada data ${jenis} aktif --</option>`;
                selSasaran.disabled = true;
            } else {
                selSasaran.innerHTML = '<option value="">-- Pilih Sasaran --</option>' + 
                activeRegList.map(r => `<option value="${r.id}">${r.nama_sasaran || r.jenis_sasaran} - ${r.dusun}</option>`).join(''); 
                selSasaran.disabled = false;
            }
        };

        selSasaran.onchange = () => {
            const sasaranId = selSasaran.value;
            const sasaranData = regList.find(r => r.id === sasaranId);
            
            if (sasaranData && infoBox) {
                const dl = sasaranData.data_laporan || {};
                const usiaTahun = dl.usia_saat_daftar_tahun !== undefined ? dl.usia_saat_daftar_tahun : '-';
                
                infoBox.style.display = 'block';
                infoBox.innerHTML = `
                    <div style="font-weight:bold; color:#0d6efd; margin-bottom: 8px; font-size: 0.95rem;">📌 Data Profil Sasaran</div>
                    <table style="width:100%; font-size: 0.85rem; line-height: 1.5;">
                        <tr><td style="width:35%; color:#555;">Nama</td><td>: <b>${sasaranData.nama_sasaran || '-'}</b></td></tr>
                        <tr><td style="color:#555;">Nama KK</td><td>: ${dl.nama_kk || '-'}</td></tr>
                        <tr><td style="color:#555;">NIK</td><td>: ${dl.nik || '-'}</td></tr>
                        <tr><td style="color:#555;">J. Kelamin</td><td>: ${dl.jenis_kelamin || '-'}</td></tr>
                        <tr><td style="color:#555;">Usia Daftar</td><td>: ${usiaTahun} Tahun</td></tr>
                    </table>
                `;
            } else if (infoBox) {
                infoBox.style.display = 'none';
            }

            renderPertanyaanDinamis(selJenis.value, 'PENDAMPINGAN', containerQ, masterPertanyaan);

            // ==========================================
            // KEAJAIBAN ASISTEN KKA OTOMATIS (KHUSUS BADUTA)
            // ==========================================
            if (sasaranData && sasaranData.jenis_sasaran === 'BADUTA') {
                const tglLahir = new Date(sasaranData.data_laporan.tanggal_lahir);
                const tglHariIni = new Date();
                let umurBulan = (tglHariIni.getFullYear() - tglLahir.getFullYear()) * 12;
                umurBulan -= tglLahir.getMonth();
                umurBulan += tglHariIni.getMonth();
                if (tglHariIni.getDate() < tglLahir.getDate()) umurBulan--;
                if (umurBulan < 0) umurBulan = 0;

                let kkaTarget = "";
                let kkaTips = "";

                if (umurBulan <= 3) {
                    kkaTarget = "1. Menatap wajah ibu<br>2. Tersenyum membalas senyum<br>3. Menggerakkan tangan & kaki aktif";
                    kkaTips = "Sering tatap mata bayi, ajak tersenyum dan bicara. Gantung mainan berwarna cerah di atasnya.";
                } else if (umurBulan <= 6) {
                    kkaTarget = "1. Tengkurap dan berbalik sendiri<br>2. Meraih benda yang didekatkan<br>3. Menoleh ke arah suara";
                    kkaTips = "Letakkan mainan sedikit di luar jangkauannya saat tengkurap agar anak mau bergerak meraihnya. Panggil namanya dari arah samping.";
                } else if (umurBulan <= 9) {
                    kkaTarget = "1. Duduk mandiri tanpa bersandar<br>2. Memungut benda kecil dengan ibu jari & telunjuk (menjumput)<br>3. Mengucapkan ma-ma / pa-pa";
                    kkaTips = "Beri anak benda kecil yang aman (seperti potongan biskuit) untuk diambil. Ajak bicara dengan artikulasi jelas (ma-ma, pa-pa).";
                } else if (umurBulan <= 12) {
                    kkaTarget = "1. Berdiri berpegangan<br>2. Berjalan dengan dituntun<br>3. Menunjuk benda yang diinginkan";
                    kkaTips = "Bantu anak berdiri dengan menopang tubuhnya atau biarkan berpegangan di kursi kuat. Sering bacakan buku bergambar dan minta anak menunjuk.";
                } else if (umurBulan <= 18) {
                    kkaTarget = "1. Berjalan mandiri tanpa jatuh<br>2. Minum sendiri dari gelas tanpa tumpah<br>3. Mencoret-coret dengan alat tulis";
                    kkaTips = "Sediakan kertas dan krayon/pensil tumpul. Latih kemandirian dengan memberi kesempatan minum dan makan sendiri walau berantakan.";
                } else {
                    kkaTarget = "1. Berlari tanpa jatuh<br>2. Menyebut 3-6 kata bermakna<br>3. Menumpuk 2-4 kubus mainan";
                    kkaTips = "Ajak anak bernyanyi dan menyebut anggota tubuh. Beri mainan balok/kotak aman untuk disusun.";
                }

                const badutaHtml = `
                    <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; border-left: 4px solid #0d6efd; margin-top: 15px;">
                        <h4 style="margin:0 0 10px 0; color:#0d6efd;">🤖 Asisten Cerdas KIA/KKA (Usia: ${umurBulan} Bulan)</h4>
                        <div style="font-size:0.85rem; margin-bottom:10px;">
                            <b>Target KKA Bulan Ini:</b><br>${kkaTarget}
                        </div>
                        <div class="form-group">
                            <label style="font-weight:bold;">Apakah anak bisa melakukan SEMUA target di atas?</label>
                            <select id="kka_eval" name="evaluasi_kka" class="form-control" required>
                                <option value="">-- Pilih Hasil Evaluasi --</option>
                                <option value="Sesuai">✅ Ya, Bisa Semua (Sesuai Umur)</option>
                                <option value="Terlambat">⚠️ Ada yang belum bisa (Terlambat)</option>
                            </select>
                        </div>
                        <div id="kka_tips_box" style="display:none; background:#fff3cd; padding:10px; border-radius:5px; border:1px solid #ffe69c; font-size:0.8rem; margin-top:10px;">
                            <b style="color:#856404;">💡 Tips Stimulasi Kader:</b><br>
                            <span style="color:#856404;">${kkaTips}<br><br><i>*Sarankan ibu untuk terus melatih anak di rumah dan wajib konsultasi ke Bidan/Posyandu.</i></span>
                        </div>
                        <hr style="border:0; border-top:1px solid #cfe2ff; margin:15px 0;">
                        <div style="font-size:0.85rem; color:#666;">
                            <i>*Masukkan angka BB dan TB di form atas untuk deteksi Stunting otomatis (Fitur segera hadir setelah sinkronisasi Antropometri).</i>
                        </div>
                    </div>
                `;
                
                containerQ.insertAdjacentHTML('beforeend', badutaHtml);

                const kkaEvalEl = getEl('kka_eval');
                if(kkaEvalEl) {
                    kkaEvalEl.onchange = (e) => {
                        getEl('kka_tips_box').style.display = e.target.value === 'Terlambat' ? 'block' : 'none';
                    };
                }
            }

            // LOGIKA TAMBAHAN KHUSUS BUMIL (Apakah Sudah Melahirkan)
            if(sasaranData && sasaranData.jenis_sasaran === 'BUMIL') {
                const bumilHtml = `
                    <div style="background: #fcf1f6; padding: 15px; border-radius: 8px; border-left: 4px solid #d63384; margin-top: 15px;">
                        <div class="form-group" style="margin-bottom: 10px;">
                            <label style="color:#d63384; font-weight:bold;">Apakah Ibu Hamil ini sudah melahirkan?</label>
                            <select id="is_melahirkan" name="is_melahirkan" class="form-control">
                                <option value="TIDAK">Belum / Tidak</option>
                                <option value="YA">Ya, Sudah Melahirkan</option>
                            </select>
                        </div>
                        <div class="form-group hidden" id="box-tgl-lahir" style="margin-bottom:0;">
                            <label style="font-weight:bold;">Tanggal Persalinan</label>
                            <input type="date" name="tgl_persalinan" class="form-control">
                        </div>
                    </div>`;
                
                containerQ.insertAdjacentHTML('beforeend', bumilHtml);
                    
                const isMelahirkanEl = getEl('is_melahirkan');
                if(isMelahirkanEl) {
                    isMelahirkanEl.onchange = (e) => {
                        if(e.target.value === 'YA') getEl('box-tgl-lahir').classList.remove('hidden');
                        else getEl('box-tgl-lahir').classList.add('hidden');
                    };
                }
            }
        };
    }
    
    const formPend = getEl('form-pendampingan');
    if (formPend) {
        formPend.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button'); btn.disabled = true;
            const jenisKunjungan = selJenis.value;
            try {
                const formData = new FormData(e.target);
                const jawaban = {}; formData.forEach((val, key) => { jawaban[key] = val; });
                
                if(jawaban.is_melahirkan === 'YA' && jawaban.tgl_persalinan) {
                    const originalReg = await getDataById('sync_queue', jawaban.id_sasaran);
                    if(originalReg) {
                        let uTahun = 0, uBulan = 0;
                        if(originalReg.data_laporan && originalReg.data_laporan.tanggal_lahir) {
                            const tglLahir = new Date(originalReg.data_laporan.tanggal_lahir);
                            const tglSalin = new Date(jawaban.tgl_persalinan);
                            uTahun = tglSalin.getFullYear() - tglLahir.getFullYear();
                            uBulan = tglSalin.getMonth() - tglLahir.getMonth();
                            if (uBulan < 0 || (uBulan === 0 && tglSalin.getDate() < tglLahir.getDate())) {
                                uTahun--; uBulan += 12;
                            }
                            originalReg.data_laporan.usia_saat_melahirkan_tahun = uTahun;
                            originalReg.data_laporan.usia_saat_melahirkan_bulan = uBulan;
                            originalReg.data_laporan.tgl_persalinan = jawaban.tgl_persalinan;
                        }
                        
                        originalReg.status_sasaran = 'SELESAI'; 
                        originalReg.is_synced = false; 
                        await putData('sync_queue', originalReg);
                        
                        const kodeKec = originalReg.id.split('-')[1] || 'XXX';
                        const newId = `BFS-${kodeKec}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
                        const newBufas = JSON.parse(JSON.stringify(originalReg)); 
                        newBufas.id = newId;
                        newBufas.jenis_sasaran = 'BUFAS';
                        newBufas.status_sasaran = 'AKTIF';
                        newBufas.is_synced = false;
                        newBufas.created_at = new Date().toISOString();
                        newBufas.data_laporan.usia_saat_daftar_tahun = uTahun;
                        newBufas.data_laporan.usia_saat_daftar_bulan = uBulan;
                        
                        await putData('sync_queue', newBufas);
                        alert("🎉 Selamat! Ibu hamil telah melahirkan. Data BUMIL ditutup otomatis dan Kartu BUFAS baru telah diterbitkan!");
                    }
                }

                const laporan = { 
                    id: `PEND-${Date.now()}`, 
                    tipe_laporan: 'PENDAMPINGAN', 
                    username: session.username, id_tim: session.id_tim,
                    id_sasaran_ref: jawaban.id_sasaran, 
                    jenis_sasaran_saat_kunjungan: jenisKunjungan, 
                    data_laporan: jawaban,
                    is_synced: false, created_at: new Date().toISOString() 
                };
                await putData('sync_queue', laporan);
                alert("✅ Laporan Pendampingan tersimpan di HP!"); renderKonten('dashboard');
            } catch (err) { alert("Gagal menyimpan."); } finally { btn.disabled = false; }
        };
    }
};

// ==========================================
// 7. FUNGSI REKAP BULANAN
// ==========================================
const initRekap = async () => {
    const session = window.currentUser;
    const antrean = await getAllData('sync_queue').catch(()=>[]);

    const dataTim = antrean.filter(a => String(a.id_tim) === String(session.id_tim));
    const dataKader = dataTim.filter(a => a.username === session.username);

    const calculateStats = (data) => {
        const regList = data.filter(a => a.tipe_laporan === 'REGISTRASI');
        const pendList = data.filter(a => a.tipe_laporan === 'PENDAMPINGAN');

        const stats = {
            CATIN: { aktif: 0, pend: 0 }, BUMIL: { aktif: 0, pend: 0 },
            BUFAS: { aktif: 0, pend: 0 }, BADUTA: { aktif: 0, pend: 0 },
            TOTAL: { aktif: 0, pend: 0 }
        };

        const hariIni = new Date(); hariIni.setHours(0,0,0,0);

        regList.forEach(r => {
            let isAktif = r.status_sasaran !== 'SELESAI';
            if (r.jenis_sasaran === 'CATIN' && r.data_laporan?.tanggal_pernikahan) {
                const tglNikah = new Date(r.data_laporan.tanggal_pernikahan);
                if (tglNikah < hariIni) isAktif = false;
            }
            if (r.jenis_sasaran === 'BUFAS' && r.data_laporan?.tgl_persalinan) {
                const tglBatas = new Date(r.data_laporan.tgl_persalinan);
                tglBatas.setDate(tglBatas.getDate() + 42); 
                if (hariIni > tglBatas) isAktif = false;
            }
            if (isAktif && stats[r.jenis_sasaran]) {
                stats[r.jenis_sasaran].aktif++; stats.TOTAL.aktif++;
            }
        });

        pendList.forEach(p => {
            let jenis = p.jenis_sasaran_saat_kunjungan;
            if (!jenis && p.id_sasaran_ref) {
                if (p.id_sasaran_ref.startsWith('CTN')) jenis = 'CATIN';
                else if (p.id_sasaran_ref.startsWith('BML')) jenis = 'BUMIL';
                else if (p.id_sasaran_ref.startsWith('BFS')) jenis = 'BUFAS';
                else if (p.id_sasaran_ref.startsWith('BDT')) jenis = 'BADUTA';
            }
            if (jenis && stats[jenis]) {
                stats[jenis].pend++; stats.TOTAL.pend++;
            }
        });

        return stats;
    };

    const statsKader = calculateStats(dataKader);
    const statsTim = calculateStats(dataTim);

    const renderTableRows = (stats) => {
        const rows = ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'].map(j => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 8px; text-align:left; font-weight:600; color: #444;">${j}</td>
                <td style="padding: 10px 8px;">${stats[j].aktif}</td>
                <td style="padding: 10px 8px;">${stats[j].pend}</td>
            </tr>
        `).join('');
        const totalRow = `
            <tr style="background: #e9ecef; font-weight: bold;">
                <td style="padding: 12px 8px; text-align:left; color: #222;">TOTAL</td>
                <td style="padding: 12px 8px; color: var(--primary); font-size: 1.1rem;">${stats.TOTAL.aktif}</td>
                <td style="padding: 12px 8px; color: #198754; font-size: 1.1rem;">${stats.TOTAL.pend}</td>
            </tr>
        `;
        return rows + totalRow;
    };

    if (getEl('tbody-rekap-kader')) getEl('tbody-rekap-kader').innerHTML = renderTableRows(statsKader);
    if (getEl('tbody-rekap-tim')) getEl('tbody-rekap-tim').innerHTML = renderTableRows(statsTim);
};

// ==========================================
// 8. FUNGSI PENGATURAN & KALKULATOR
// ==========================================
const initSetting = () => {
    const session = window.currentUser;
    if(getEl('set-nama')) getEl('set-nama').value = session.nama;
    if(getEl('set-id')) getEl('set-id').value = session.username;

    const toggleDark = getEl('toggle-dark-mode');
    if (toggleDark) {
        toggleDark.checked = localStorage.getItem('theme') === 'dark';
        toggleDark.onchange = () => {
            localStorage.setItem('theme', toggleDark.checked ? 'dark' : 'light');
            applySettings();
        };
    }

    const btnMin = getEl('btn-text-min');
    const btnPlus = getEl('btn-text-plus');
    if (btnMin && btnPlus) {
        btnMin.onclick = () => {
            let size = parseInt(localStorage.getItem('fontSize') || '16');
            if (size > 12) { size -= 2; localStorage.setItem('fontSize', size); applySettings(); }
        };
        btnPlus.onclick = () => {
            let size = parseInt(localStorage.getItem('fontSize') || '16');
            if (size < 24) { size += 2; localStorage.setItem('fontSize', size); applySettings(); }
        };
    }
    
    const formP = getEl('form-ganti-pass');
    if(formP) formP.onsubmit = (e) => { e.preventDefault(); alert("Permintaan ganti password disimpan."); e.target.reset(); renderKonten('dashboard'); };
};

const initKalkulator = () => {
    const sel = getEl('calc-selector');
    const boxHPL = getEl('box-calc-hpl');
    const boxIMT = getEl('box-calc-imt');
    const boxKKA = getEl('box-calc-kka');

    if (sel) {
        sel.onchange = () => {
            boxHPL.style.display = sel.value === 'HPL' ? 'block' : 'none';
            boxIMT.style.display = sel.value === 'IMT' ? 'block' : 'none';
            boxKKA.style.display = sel.value === 'KKA' ? 'block' : 'none';
        };
    }

    if (getEl('btn-hitung-hpl')) {
        getEl('btn-hitung-hpl').onclick = () => {
            const hpht = getEl('calc-hpht').value;
            if (!hpht) { alert('Masukkan HPHT terlebih dahulu'); return; }
            const d = new Date(hpht);
            d.setDate(d.getDate() + 7);
            d.setMonth(d.getMonth() - 3);
            d.setFullYear(d.getFullYear() + 1);
            getEl('hasil-hpl').innerHTML = `Perkiraan Lahir:<br><span style="font-size:1.5rem;">${d.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</span>`;
        };
    }

    if (getEl('btn-hitung-imt')) {
        getEl('btn-hitung-imt').onclick = () => {
            const bb = parseFloat(getEl('calc-bb').value);
            const tb = parseFloat(getEl('calc-tb').value) / 100;
            if (!bb || !tb) { alert('Masukkan BB dan TB dengan benar'); return; }
            
            const imt = (bb / (tb * tb)).toFixed(1);
            let status = '', color = '';
            if (imt < 18.5) { status = 'Kekurangan Berat Badan'; color = '#dc3545'; }
            else if (imt <= 24.9) { status = 'Normal (Ideal)'; color = '#198754'; }
            else if (imt <= 29.9) { status = 'Kelebihan Berat Badan'; color = '#fd7e14'; }
            else { status = 'Obesitas'; color = '#dc3545'; }
            
            getEl('hasil-imt').innerHTML = `IMT Anda: <span style="font-size:1.5rem; color:${color};">${imt}</span><br><span style="color:${color};">${status}</span>`;
        };
    }

    const selKKA = getEl('calc-usia-kka');
    if (selKKA) {
        selKKA.onchange = () => {
            const val = selKKA.value;
            let html = '';
            if (val === '0-3') html = '✅ <b>Target KKA 0-3 Bulan:</b><br>- Menatap wajah ibu saat disusui<br>- Tersenyum membalas senyuman<br>- Menggerakkan tangan & kaki aktif';
            else if (val === '3-6') html = '✅ <b>Target KKA 3-6 Bulan:</b><br>- Tengkurap dan berbalik sendiri<br>- Meraih benda yang didekatkan<br>- Menoleh ke arah suara';
            else if (val === '6-12') html = '✅ <b>Target KKA 6-12 Bulan:</b><br>- Duduk sendiri tanpa sandaran<br>- Mengucapkan ma-ma / pa-pa<br>- Mengambil benda kecil (menjumput)';
            else if (val === '12-24') html = '✅ <b>Target KKA 12-24 Bulan:</b><br>- Berjalan sendiri tanpa jatuh<br>- Menyebutkan 3-6 kata bermakna<br>- Menumpuk 2-4 kubus mainan';
            
            if(html) {
                getEl('hasil-kka').innerHTML = `<div style="background:#e8f4fd; padding:15px; border-radius:8px; border-left:4px solid #0d6efd;">${html}<br><br><i style="font-size:0.75rem; color:#666;">*Jika anak belum bisa melakukan 1 hal di atas, sarankan ke Posyandu/Bidan.</i></div>`;
            } else {
                getEl('hasil-kka').innerHTML = '';
            }
        };
    }
};

// ==========================================
// 9. LOGIN PINTAR
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
                await initDB();
                const allUsers = await getAllData('master_user').catch(() => []);
                const user = allUsers.find(u => 
                    String(u.id_pengguna) === id || String(u.id_user) === id || 
                    String(u.username) === id || String(u.id) === id
                );
                
                if (!user) {
                    alert("❌ ID Pengguna tidak ditemukan. Pastikan data sudah di-sinkronisasi.");
                    if (btn) { btn.disabled = false; btn.innerText = "Masuk"; }
                    return;
                }

                const pinBenar = String(user.password_awal_ref || user.password || user.pin || "");
                if (pinBenar === pin) {
                    let nama = user.nama || user.nama_lengkap || user.username || id;
                    let role = String(user.role_akses || user.role || 'KADER').toUpperCase();
                    let ref_id = user.ref_id || user.id_kader || user.nik || '';
                    let tim = '-', noTim = '-';
                    
                    if (role.includes('KADER') && ref_id) {
                        const allKader = await getAllData('master_kader').catch(() => []);
                        const k = allKader.find(x => String(x.id_kader) === String(ref_id) || String(x.nik) === String(ref_id));
                        if (k) { 
                            nama = k.nama_kader || k.nama || nama; 
                            tim = k.id_tim || k.tim || '-'; 
                            
                            const allTim = await getAllData('master_tim').catch(() => []);
                            const t = allTim.find(x => String(x.id_tim) === String(tim) || String(x.id) === String(tim));
                            noTim = t ? (t.nomor_tim || t.nama_tim || tim) : tim;
                        }
                    }

                    const ses = { id_kader: 'active_user', username: id, role: role, nama: nama, id_tim: tim, nomor_tim: noTim };
                    await putData('kader_session', ses);
                    
                    getEl('kader-id').value = ''; getEl('kader-pin').value = '';
                    masukKeAplikasi(ses);
                } else { alert("❌ PIN yang Anda masukkan salah!"); }
            } catch (err) {
                console.error("Kesalahan Login:", err);
                alert("Kesalahan Sistem: " + err.message);
            } finally { if (btn) { btn.disabled = false; btn.innerText = "Masuk"; } }
        };
    }
});

window.logout = async () => { 
    if (confirm("Keluar dari aplikasi? Data sasaran belum sinkron tetap aman di HP.")) { 
        await deleteData('kader_session', 'active_user'); 
        location.reload(); 
    }
};

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

const btnMenu = getEl('btn-menu');
const sidebar = getEl('sidebar');
const overlay = getEl('sidebar-overlay');

if (btnMenu && sidebar && overlay) {
    btnMenu.addEventListener('click', () => { sidebar.classList.add('active'); overlay.classList.add('active'); });
    overlay.addEventListener('click', () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); });
}
