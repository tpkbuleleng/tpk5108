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
        { id: 'ganti_pass', icon: '🔑', label: 'Ganti Password' },
        { id: 'sync_manual', icon: '🔄', label: 'Sinkronisasi Data' },
        { id: 'reload_app', icon: '🔁', label: 'Muat Ulang Layar' } // <--- INI TAMBAHAN BARUNYA
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
                <div class="card" style="background: linear-gradient(135deg, #0d6efd, #0043a8); color: white; border:none; margin-bottom: 20px; padding: 25px;">
                    <p style="margin:0; opacity: 0.9; font-weight: 800;">SELAMAT DATANG,</p>
                    <h2 style="margin: 5px 0 15px 0; font-size: 1.6rem; font-weight: 700;">${session.nama}</h2>
                    <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 0.9rem; margin-bottom: 20px;">
                        NO. TIM: ${session.nomor_tim || session.id_tim}
                    </div>
                    <hr style="margin-bottom: 20px; border: 0; border-top: 1px solid rgba(255,255,255,0.2);">
                    <div id="dash-detail-wilayah" style="font-size: 1.1rem; line-height: 1.7;">Memuat detail...</div>
                </div>
                
                <div id="dash-summary" style="background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #eee;">
                    Memuat ringkasan data...
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="card" style="text-align:center; padding: 20px; border-bottom: 4px solid orange;">
                        <div style="font-size: 1.8rem;">📦</div>
                        <h3 id="dash-tunda">0</h3>
                        <p style="font-size: 0.75rem; color: #666; font-weight: bold;">TERTUNDA SINKRON</p>
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
            
            const wilayahKerja = allWil.filter(w => String(w.id_tim) === String(session.id_tim));
            const daftarDusun = wilayahKerja.map(w => w.dusun_rw).join(', ') || '-';
            const pendingQueue = antrean.filter(a => !a.is_synced);
            
            if (getEl('dash-detail-wilayah')) {
                getEl('dash-detail-wilayah').innerHTML = `
                    <div style="margin-bottom: 12px;"><span style="opacity:0.8; font-size: 0.9rem;">📍 Wilayah Tugas (Dusun/RW):</span><br><span style="font-weight: 500;">${daftarDusun}</span></div>
                    <div style="margin-bottom: 8px;"><span style="opacity:0.8; font-size: 0.9rem;">🏘️ Desa/Kelurahan:</span><br><span style="font-weight: 600;">${wilayahKerja[0]?.desa_kelurahan || '-'}</span></div>
                    <div><span style="opacity:0.8; font-size: 0.9rem;">🏛️ Kecamatan:</span><br><span style="font-weight: 600;">${wilayahKerja[0]?.kecamatan || '-'}</span></div>`;
            }
            if (getEl('dash-tunda')) getEl('dash-tunda').innerText = pendingQueue.length;

            // LOGIKA REKAP KUMULATIF DASHBOARD
            const queueTim = antrean.filter(a => String(a.id_tim) === String(session.id_tim));
            const regList = queueTim.filter(a => a.tipe_laporan === 'REGISTRASI');
            const pendList = queueTim.filter(a => a.tipe_laporan === 'PENDAMPINGAN');
            
            const cReg = { CATIN: 0, BUMIL: 0, BUFAS: 0, BADUTA: 0 };
            const cPend = { CATIN: 0, BUMIL: 0, BUFAS: 0, BADUTA: 0 };

            regList.forEach(r => { if(cReg[r.jenis_sasaran] !== undefined) cReg[r.jenis_sasaran]++; });
            pendList.forEach(p => {
                const ref = regList.find(r => r.id === p.id_sasaran_ref);
                if(ref && cPend[ref.jenis_sasaran] !== undefined) cPend[ref.jenis_sasaran]++;
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
    } else if (target === 'rekap_kader' || target === 'rekap_tim') {
        const tpl = getEl('template-rekap');
        if(tpl) { 
            area.appendChild(tpl.content.cloneNode(true)); 
            if(getEl('judul-rekap')) getEl('judul-rekap').innerText = target === 'rekap_kader' ? '📊 Rekap Bulanan Kader' : '📈 Rekap Bulanan Tim';
            initRekap();
        }
    } else if (target === 'cetak_pdf') {
        const tpl = getEl('template-cetak-pdf');
        if(tpl) area.appendChild(tpl.content.cloneNode(true));
    } else if (target === 'ganti_pass') {
        const tpl = getEl('template-ganti-pass');
        if(tpl) area.appendChild(tpl.content.cloneNode(true));
        const formP = getEl('form-ganti-pass');
        if(formP) formP.onsubmit = (e) => { e.preventDefault(); alert("Permintaan ganti password disimpan."); e.target.reset(); renderKonten('dashboard'); };
    }
};

// ==========================================
// 4. LOGIKA FORM DINAMIS & ID UNIK
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

const initFormRegistrasi = async () => {
    const session = window.currentUser;
    const allWil = await getAllData('master_tim_wilayah').catch(()=>[]);
    const allWilBali = await getAllData('master_wilayah_bali').catch(()=>[]); 
    const tugas = allWil.filter(w => String(w.id_tim) === String(session.id_tim));
    
    const selJenis = getEl('reg-jenis');
    const containerQ = getEl('pertanyaan-dinamis');
    const boxCatin = getEl('wilayah-catin');
    const boxDomisili = getEl('wilayah-domisili');

    // Element Tambahan Baru
    const boxIbu = getEl('box-ibu-kandung');
    const inputIbu = getEl('input-ibu-kandung');
    const boxNikah = getEl('box-tgl-nikah');
    const inputNikah = getEl('input-tgl-nikah');

    const selDesa = getEl('reg-desa');
    const selDusun = getEl('reg-dusun');
    const regAlamat = getEl('reg-alamat');

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
            
            // Logika Tampil / Sembunyi Dinamis Tambahan
            if(boxIbu && inputIbu) {
                if(jenis === 'BADUTA') {
                    boxIbu.style.display = 'block';
                    inputIbu.setAttribute('required', 'true');
                } else {
                    boxIbu.style.display = 'none';
                    inputIbu.removeAttribute('required');
                    inputIbu.value = '';
                }
            }

            if(boxNikah && inputNikah) {
                if(jenis === 'CATIN') {
                    boxNikah.style.display = 'block';
                    inputNikah.setAttribute('required', 'true');
                } else {
                    boxNikah.style.display = 'none';
                    inputNikah.removeAttribute('required');
                    inputNikah.value = '';
                }
            }

            if(boxCatin && boxDomisili) {
                if (jenis === 'CATIN') {
                    boxCatin.style.display = 'block';
                    boxDomisili.style.display = 'none';
                    if(selDesa) selDesa.removeAttribute('required');
                    if(selDusun) selDusun.removeAttribute('required');
                    if(regAlamat) regAlamat.removeAttribute('required');
                    if(catinKab) catinKab.setAttribute('required', 'true');
                    if(catinKec) catinKec.setAttribute('required', 'true');
                    if(catinDesa) catinDesa.setAttribute('required', 'true');
                } else {
                    boxCatin.style.display = 'none';
                    boxDomisili.style.display = 'block';
                    if(selDesa) selDesa.setAttribute('required', 'true');
                    if(selDusun) selDusun.setAttribute('required', 'true');
                    if(regAlamat) regAlamat.setAttribute('required', 'true');
                    if(catinKab) catinKab.removeAttribute('required');
                    if(catinKec) catinKec.removeAttribute('required');
                    if(catinDesa) catinDesa.removeAttribute('required');
                }
            }

            if (!jenis) { containerQ.innerHTML = ''; return; }
            
            const filteredQ = questions.filter(q => String(q.is_active || '').toUpperCase() === 'Y' && (String(q.kategori_sasaran).toUpperCase() === 'UMUM' || String(q.kategori_sasaran).toUpperCase() === jenis)).sort((a,b)=>a.urutan - b.urutan);
            if (filteredQ.length > 0) {
                containerQ.innerHTML = `<h4 style="margin-bottom:10px; color:var(--primary);">Pertanyaan Khusus ${jenis}</h4>` + 
                    filteredQ.map(q => `
                        <div class="form-group">
                            <label>${q.label_pertanyaan}</label>
                            <input type="${q.tipe_input || 'text'}" name="q_${q.id_pertanyaan}" class="form-control" required>
                        </div>`).join('');
            } else { containerQ.innerHTML = ''; }
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

                const laporan = {
                    id: idSasaran,
                    tipe_laporan: 'REGISTRASI', 
                    username: session.username, 
                    id_tim: session.id_tim, 
                    nomor_tim: session.nomor_tim,
                    kecamatan: kecamatan, 
                    jenis_sasaran: jenisSasaran, 
                    nama_sasaran: jawaban.nama_sasaran, 
                    desa: desaFinal, 
                    dusun: dusunFinal,
                    data_laporan: jawaban,
                    is_synced: false, 
                    created_at: new Date().toISOString()
                };
                
                await putData('sync_queue', laporan);
                alert(`✅ Registrasi berhasil! ID Sasaran: ${idSasaran}`);
                renderKonten('dashboard');
            } catch (err) { alert("Gagal menyimpan form."); } finally { btn.disabled = false; btn.innerText = "💾 Simpan Registrasi"; }
        };
    }
};

const initDaftarSasaran = async () => {
    const session = window.currentUser;
    const list = getEl('list-sasaran');
    if(!list) return;
    
    const antrean = await getAllData('sync_queue').catch(()=>[]);
    const regList = antrean.filter(a => a.tipe_laporan === 'REGISTRASI' && String(a.id_tim) === String(session.id_tim));
    
    if (regList.length === 0) { 
        list.innerHTML = `<div style="text-align:center; padding:20px; color:#999;">Belum ada sasaran yang diregistrasi oleh Tim Anda.</div>`; 
    } else { 
        list.innerHTML = regList.map(r => {
            // LOGIKA KEDALUWARSA CATIN
            let isExpired = false;
            let labelSelesai = '';
            
            if (r.jenis_sasaran === 'CATIN' && r.data_laporan && r.data_laporan.tanggal_pernikahan) {
                const tglNikah = new Date(r.data_laporan.tanggal_pernikahan);
                const hariIni = new Date();
                hariIni.setHours(0,0,0,0); // Set jam ke 00:00 agar akurat hitung hari
                
                if (tglNikah < hariIni) {
                    isExpired = true;
                    labelSelesai = `<div style="color: #dc3545; font-weight:bold; font-size:0.8rem; margin-top:5px; padding: 4px; background: #f8d7da; border-radius: 4px; display: inline-block;">🔒 SELESAI (Sudah Menikah)</div>`;
                }
            }

            // TAMPILAN KARTU
            return `
            <div style="background:${isExpired ? '#f8f9fa' : '#f4f7f6'}; padding:15px; border-radius:8px; border-left: 4px solid ${isExpired ? '#6c757d' : 'var(--primary)'}; margin-bottom: 10px; opacity: ${isExpired ? '0.7' : '1'};">
                <div style="font-weight: bold; font-size: 1.15rem; color: #333; text-transform: uppercase;">
                    ${r.nama_sasaran || 'Tanpa Nama'}
                </div>
                <div style="font-size: 0.85rem; color: ${isExpired ? '#6c757d' : 'var(--primary)'}; font-weight: bold; margin-top: 2px;">
                    [${r.id}] ${r.jenis_sasaran}
                </div>
                <div style="font-size: 0.9rem; color: #555; margin-top: 6px;">📍 ${r.dusun}, ${r.desa}</div>
                ${labelSelesai}
                <div style="font-size: 0.8rem; color:#888; margin-top: 8px;">
                    ${r.is_synced ? '✅ Tersinkron' : '⏳ Belum Sinkron'} | ${new Date(r.created_at).toLocaleString('id-ID')}
                </div>
            </div>`;
        }).join(''); 
    }
};

const initFormPendampingan = async () => {
    const session = window.currentUser;
    const selSasaran = getEl('pend-sasaran');
    const containerQ = getEl('form-pendampingan-dinamis');
    
    const antrean = await getAllData('sync_queue').catch(()=>[]);
    const regList = antrean.filter(a => a.tipe_laporan === 'REGISTRASI' && String(a.id_tim) === String(session.id_tim));
    
    if (selSasaran) { 
        // LOGIKA FILTER DROPDOWN PENDAMPINGAN (SEMBUNYIKAN YANG KEDALUWARSA)
        const activeRegList = regList.filter(r => {
            if (r.jenis_sasaran === 'CATIN' && r.data_laporan && r.data_laporan.tanggal_pernikahan) {
                const tglNikah = new Date(r.data_laporan.tanggal_pernikahan);
                const hariIni = new Date(); hariIni.setHours(0,0,0,0);
                return tglNikah >= hariIni; // Hanya tampilkan jika Tgl Nikah masih nanti/hari ini
            }
            return true; // Tampilkan yang lain (BUMIL, BUFAS, BADUTA)
        });

        selSasaran.innerHTML = '<option value="">-- Pilih Sasaran --</option>' + 
        activeRegList.map(r => `<option value="${r.id}">[${r.id}] ${r.nama_sasaran || r.jenis_sasaran} - ${r.dusun}</option>`).join(''); 
        
        selSasaran.onchange = () => {
            const sasaranId = selSasaran.value;
            const sasaranData = activeRegList.find(r => r.id === sasaranId);
            if(sasaranData && sasaranData.jenis_sasaran === 'BUMIL') {
                containerQ.innerHTML = `
                    <div class="form-group">
                        <label style="color:var(--primary);">Apakah Ibu Hamil ini sudah melahirkan?</label>
                        <select id="is_melahirkan" name="is_melahirkan" class="form-control">
                            <option value="TIDAK">Belum / Tidak</option>
                            <option value="YA">Ya, Sudah Melahirkan</option>
                        </select>
                    </div>
                    <div class="form-group hidden" id="box-tgl-lahir">
                        <label>Tanggal Persalinan</label>
                        <input type="date" name="tgl_persalinan" class="form-control">
                    </div>`;
                    
                getEl('is_melahirkan').onchange = (e) => {
                    if(e.target.value === 'YA') getEl('box-tgl-lahir').classList.remove('hidden');
                    else getEl('box-tgl-lahir').classList.add('hidden');
                };
            } else {
                containerQ.innerHTML = '';
            }
        };
    }
    
    const formPend = getEl('form-pendampingan');
    if (formPend) {
        formPend.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button'); btn.disabled = true;
            try {
                const formData = new FormData(e.target);
                const jawaban = {}; formData.forEach((val, key) => { jawaban[key] = val; });
                
                if(jawaban.is_melahirkan === 'YA' && jawaban.tgl_persalinan) {
                    const originalReg = await getDataById('sync_queue', jawaban.id_sasaran);
                    if(originalReg) {
                        originalReg.jenis_sasaran = 'BUFAS';
                        await putData('sync_queue', originalReg);
                        alert("🎉 Selamat! Ibu ini telah melahirkan dan otomatis pindah ke daftar BUFAS.");
                    }
                }

                const laporan = { 
                    id: `PEND-${Date.now()}`, 
                    tipe_laporan: 'PENDAMPINGAN', 
                    username: session.username, 
                    id_tim: session.id_tim,
                    id_sasaran_ref: jawaban.id_sasaran, 
                    data_laporan: jawaban,
                    is_synced: false,
                    created_at: new Date().toISOString() 
                };
                await putData('sync_queue', laporan);
                alert("✅ Laporan Pendampingan tersimpan di HP!"); renderKonten('dashboard');
            } catch (err) { alert("Gagal menyimpan."); } finally { btn.disabled = false; }
        };
    }
};

const initRekap = async () => {
    const session = window.currentUser;
    const antrean = await getAllData('sync_queue').catch(()=>[]);
    const dataTim = antrean.filter(a => String(a.id_tim) === String(session.id_tim));
    
    if(getEl('rekap-total')) getEl('rekap-total').innerText = dataTim.filter(a => a.tipe_laporan === 'REGISTRASI').length;
    if(getEl('rekap-pend')) getEl('rekap-pend').innerText = dataTim.filter(a => a.tipe_laporan === 'PENDAMPINGAN').length;
};

// ==========================================
// 5. LOGIN PINTAR (ADAPTIVE HEADER)
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

// ==========================================
// 6. KONTROL SIDEBAR (MENU SAMPING)
// ==========================================
const btnMenu = getEl('btn-menu');
const sidebar = getEl('sidebar');
const overlay = getEl('sidebar-overlay');

if (btnMenu && sidebar && overlay) {
    btnMenu.addEventListener('click', () => { sidebar.classList.add('active'); overlay.classList.add('active'); });
    overlay.addEventListener('click', () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); });
}
