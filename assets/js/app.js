import { initDB, putData, getDataById, deleteData, getAllData } from './db.js';
import { downloadMasterData } from './sync.js';

const getEl = (id) => document.getElementById(id);

// ==========================================
// 1. SETTING & NAVIGASI LAYAR
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

const tampilkanLayar = (id) => {
    const vSplash = getEl('view-splash'); const vLogin = getEl('view-login'); const vApp = getEl('view-app');
    if (vSplash) { vSplash.classList.remove('active'); vSplash.style.display = 'none'; }
    if (id === 'login') { 
        if (vLogin) vLogin.classList.remove('hidden'); if (vApp) vApp.classList.add('hidden'); 
    } else if (id === 'app') { 
        if (vLogin) vLogin.classList.add('hidden'); if (vApp) vApp.classList.remove('hidden'); 
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
// 2. INISIALISASI & LOGIN
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
        greeting.style.textAlign = 'center'; greeting.style.lineHeight = '1.15'; greeting.style.fontSize = '1.05rem'; 
    }
    const hInfo = document.querySelector('.header-info');
    if (hInfo) {
        hInfo.style.display = 'flex'; hInfo.style.alignItems = 'center';
        hInfo.style.gap = '12px'; hInfo.style.flexDirection = 'row-reverse'; 
    }

    if (getEl('sidebar-nama')) getEl('sidebar-nama').innerText = session.nama;
    if (getEl('sidebar-role')) getEl('sidebar-role').innerText = session.role;
    
    renderMenu(session.role); 
    renderKonten('dashboard'); 
    tampilkanLayar('app');
};

const renderMenu = (role) => {
    const container = getEl('dynamic-menu-container'); if (!container) return;
    
    // MENU LENGKAP DIKEMBALIKAN
    const menus = [
        { id: 'dashboard', icon: '🏠', label: 'Dashboard' }, 
        { id: 'registrasi', icon: '📝', label: 'Registrasi Sasaran' },
        { id: 'daftar_sasaran', icon: '📋', label: 'Daftar Sasaran' }, 
        { id: 'pendampingan', icon: '🤝', label: 'Laporan Pendampingan' },
        { id: 'rekap_bulanan', icon: '📊', label: 'Rekap Bulanan' }, 
        { id: 'cetak_pdf', icon: '🖨️', label: 'Cetak PDF' },
        { id: 'bantuan', icon: '🆘', label: 'Bantuan & Edukasi' },
        { id: 'setting', icon: '⚙️', label: 'Pengaturan' },
        { id: 'sync_manual', icon: '🔄', label: 'Sinkronisasi Data' }
    ];
    
    container.innerHTML = menus.map(m => `<a class="menu-item" data-target="${m.id}"><span class="icon">${m.icon}</span> ${m.label}</a>`).join('') + `<hr><a class="menu-item text-danger" id="btnLogout">🚪 Keluar</a>`;
    
    document.querySelectorAll('.menu-item[data-target]').forEach(item => {
        item.onclick = () => {
            getEl('sidebar').classList.remove('active'); getEl('sidebar-overlay').classList.remove('active');
            const target = item.getAttribute('data-target');
            if(target === 'sync_manual') { if(window.jalankanSinkronisasi) window.jalankanSinkronisasi(); } 
            else { renderKonten(target); }
        };
    });
    if (getEl('btnLogout')) getEl('btnLogout').onclick = window.logout;
};

// ==========================================
// 3. RENDER KONTEN & DASHBOARD
// ==========================================
window.renderKonten = async (target) => {
    const area = getEl('content-area'); if (!area) return; area.innerHTML = ''; 

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
                <div id="dash-summary" style="background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #eee;">Memuat ringkasan data...</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div class="card" style="text-align:center; padding: 15px 5px; cursor:pointer; border-bottom: 4px solid #0d6efd;" onclick="renderKonten('registrasi')">
                        <div style="font-size: 1.6rem;">📝</div><h3 style="font-size: 0.95rem; margin: 5px 0 0 0;">BARU</h3><p style="font-size: 0.65rem; color: #666; font-weight: bold; margin: 2px 0 0 0;">REGISTRASI</p>
                    </div>
                    <div class="card" style="text-align:center; padding: 15px 5px; border-bottom: 4px solid orange;">
                        <div style="font-size: 1.6rem;">📦</div><h3 id="dash-tunda" style="font-size: 1rem; margin: 5px 0 0 0;">0/0</h3><p style="font-size: 0.65rem; color: #666; font-weight: bold; margin: 2px 0 0 0;">SINKRON</p>
                    </div>
                    <div class="card" style="text-align:center; padding: 15px 5px; cursor:pointer; border-bottom: 4px solid #198754;" onclick="renderKonten('pendampingan')">
                        <div style="font-size: 1.6rem;">🤝</div><h3 style="font-size: 0.95rem; margin: 5px 0 0 0;">LAPOR</h3><p style="font-size: 0.65rem; color: #666; font-weight: bold; margin: 2px 0 0 0;">PENDAMPINGAN</p>
                    </div>
                </div>
            </div>`;

        try {
            const [allWil, antrean] = await Promise.all([ getAllData('master_tim_wilayah').catch(()=>[]), getAllData('sync_queue').catch(()=>[]) ]);
            const wilayahKerja = allWil.filter(w => String(w.id_tim) === String(session.id_tim));
            if (getEl('dash-detail-wilayah')) {
                getEl('dash-detail-wilayah').innerHTML = `
                    <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; margin-bottom: 12px;">NO. TIM: ${session.nomor_tim || session.id_tim}</div>
                    <div style="line-height: 1.25;"><div style="margin-bottom: 6px;"><span style="opacity:0.8; font-size: 0.8rem;">📍 Wilayah Tugas (Dusun/RW):</span><br><span style="font-weight: 600; font-size: 0.9rem;">${wilayahKerja.map(w => w.dusun_rw).join(', ') || '-'}</span></div></div>`;
            }
            const queueTim = antrean.filter(a => String(a.id_tim) === String(session.id_tim));
            if (getEl('dash-tunda')) getEl('dash-tunda').innerText = `${queueTim.filter(a => a.is_synced).length}/${queueTim.filter(a => !a.is_synced).length}`;
            
            const cReg = { CATIN: 0, BUMIL: 0, BUFAS: 0, BADUTA: 0 };
            const cPend = { CATIN: 0, BUMIL: 0, BUFAS: 0, BADUTA: 0 };
            const hariIni = new Date(); hariIni.setHours(0,0,0,0);

            queueTim.filter(a => a.tipe_laporan === 'REGISTRASI').forEach(r => { 
                let isAktif = r.status_sasaran !== 'SELESAI';
                if (r.jenis_sasaran === 'CATIN' && r.data_laporan?.tanggal_pernikahan && new Date(r.data_laporan.tanggal_pernikahan) < hariIni) isAktif = false;
                if (r.jenis_sasaran === 'BUFAS' && r.data_laporan?.tgl_persalinan) { const tB = new Date(r.data_laporan.tgl_persalinan); tB.setDate(tB.getDate() + 42); if (hariIni > tB) isAktif = false; }
                if(cReg[r.jenis_sasaran] !== undefined) cReg[r.jenis_sasaran]++; 
            });
            queueTim.filter(a => a.tipe_laporan === 'PENDAMPINGAN').forEach(p => {
                let j = p.jenis_sasaran_saat_kunjungan || (p.id_sasaran_ref.startsWith('CTN')?'CATIN':p.id_sasaran_ref.startsWith('BML')?'BUMIL':p.id_sasaran_ref.startsWith('BFS')?'BUFAS':'BADUTA');
                if(cPend[j] !== undefined) cPend[j]++;
            });

            if(getEl('dash-summary')) getEl('dash-summary').innerHTML = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.85rem;"><div><strong style="color:var(--primary);">🎯 Terdaftar</strong><ul style="margin:5px 0 0 15px; padding:0;"><li>CATIN: <b>${cReg.CATIN}</b></li><li>BUMIL: <b>${cReg.BUMIL}</b></li><li>BUFAS: <b>${cReg.BUFAS}</b></li><li>BADUTA: <b>${cReg.BADUTA}</b></li></ul></div><div><strong style="color:#198754;">🤝 Kunjungan</strong><ul style="margin:5px 0 0 15px; padding:0;"><li>CATIN: <b>${cPend.CATIN}</b></li><li>BUMIL: <b>${cPend.BUMIL}</b></li><li>BUFAS: <b>${cPend.BUFAS}</b></li><li>BADUTA: <b>${cPend.BADUTA}</b></li></ul></div></div>`;
        } catch (e) {}
    } else if (target === 'registrasi') {
        const tpl = getEl('template-registrasi'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initFormRegistrasi(); }
    } else if (target === 'daftar_sasaran') {
        const tpl = getEl('template-daftar-sasaran'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initDaftarSasaran(); }
    } else if (target === 'pendampingan') {
        const tpl = getEl('template-pendampingan'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initFormPendampingan(); }
    } else if (target === 'rekap_bulanan') {
        const tpl = getEl('template-rekap'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initRekap(); }
    } else if (target === 'cetak_pdf') {
        const tpl = getEl('template-cetak-pdf'); if(tpl) area.appendChild(tpl.content.cloneNode(true));
    } else if (target === 'bantuan') {
        const tpl = getEl('template-bantuan'); if(tpl) area.appendChild(tpl.content.cloneNode(true));
    } else if (target === 'setting') {
        const tpl = getEl('template-setting'); if(tpl) { area.appendChild(tpl.content.cloneNode(true)); initSetting(); }
    }
};

const getKodeKecamatan = (kec) => {
    const map = { 'GEROKGAK': 'GRK', 'SERIRIT': 'SRT', 'BUSUNGBIU': 'BSB', 'BANJAR': 'BJR', 'SUKASADA': 'SKS', 'BULELENG': 'BLL', 'SAWAN': 'SWN', 'KUBUTAMBAHAN': 'KBT', 'TEJAKULA': 'TJK' };
    return map[(kec||'').toUpperCase()] || "XXX";
};

// ==========================================
// 4. LOGIKA REGISTRASI
// ==========================================
const initFormRegistrasi = async () => {
    const session = window.currentUser;
    const allWil = await getAllData('master_tim_wilayah').catch(()=>[]); const tugas = allWil.filter(w => String(w.id_tim) === String(session.id_tim));
    const selJenis = getEl('reg-jenis'); const containerQ = getEl('pertanyaan-dinamis'); const selDesa = getEl('reg-desa'); const selDusun = getEl('reg-dusun');

    if (selDesa && tugas.length > 0) {
        const dDesa = [...new Set(tugas.map(w => w.desa_kelurahan))].filter(Boolean);
        selDesa.innerHTML = '<option value="">-- Pilih Desa --</option>' + dDesa.map(d => `<option value="${d}">${d}</option>`).join('');
        selDesa.onchange = () => { const dDusun = tugas.filter(w => w.desa_kelurahan === selDesa.value); selDusun.innerHTML = '<option value="">-- Pilih Dusun --</option>' + dDusun.map(d => `<option value="${d.dusun_rw}">${d.dusun_rw}</option>`).join(''); };
    }

    const questions = await getAllData('master_pertanyaan').catch(()=>[]);
    if (selJenis && containerQ) {
        selJenis.onchange = () => {
            const jenis = selJenis.value;
            const selJk = document.querySelector('select[name="jenis_kelamin"]');
            if (selJk) { if (jenis === 'BUMIL' || jenis === 'BUFAS') { selJk.value = 'Perempuan'; selJk.style.pointerEvents = 'none'; selJk.style.backgroundColor = '#e9ecef'; } else { selJk.style.pointerEvents = 'auto'; selJk.style.backgroundColor = '#fff'; } }
            
            const boxIbu = getEl('box-ibu-kandung'); const inputIbu = getEl('input-ibu-kandung');
            if(boxIbu && inputIbu) { if(jenis === 'BADUTA') { boxIbu.style.display = 'block'; inputIbu.setAttribute('required', 'true'); } else { boxIbu.style.display = 'none'; inputIbu.removeAttribute('required'); inputIbu.value = ''; } }

            const filteredQ = questions.filter(q => String(q.is_active).toUpperCase() === 'Y' && String(q.modul).toUpperCase() === 'REGISTRASI' && (String(q.jenis_sasaran).toUpperCase() === 'UMUM' || String(q.jenis_sasaran).toUpperCase() === jenis)).sort((a,b)=> (parseInt(a.urutan)||0) - (parseInt(b.urutan)||0));
            if (filteredQ.length > 0) {
                let html = `<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-top: 4px solid var(--primary); margin-top: 20px;"><h4 style="margin-top:0; color:var(--primary);">📝 Formulir Lanjutan</h4>`;
                filteredQ.forEach(q => {
                    let req = String(q.is_required).toUpperCase() === 'Y' ? 'required' : '';
                    let inputHtml = q.tipe_input === 'select' ? `<select name="${q.id_pertanyaan}" class="form-control" ${req}><option value="">-- Pilih --</option>${(JSON.parse(q.opsi_json || '[]')).map(o => `<option value="${o}">${o}</option>`).join('')}</select>` : `<input type="${q.tipe_input}" name="${q.id_pertanyaan}" class="form-control" step="any" ${req}>`;
                    html += `<div class="form-group" style="margin-bottom: 12px;"><label style="font-weight:600;">${q.label_pertanyaan} ${req?'<span style="color:red">*</span>':''}</label>${inputHtml}</div>`;
                });
                containerQ.innerHTML = html + `</div>`;
            } else { containerQ.innerHTML = ''; }
        };
    }

    const formReg = getEl('form-registrasi');
    if (formReg) {
        formReg.onsubmit = async (e) => {
            e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true;
            try {
                const formData = new FormData(e.target); const jawaban = {}; formData.forEach((val, key) => jawaban[key] = val);
                const kecamatan = tugas.length > 0 ? tugas[0].kecamatan : 'TIDAK_DIKETAHUI';
                const prefix = { 'CATIN': 'CTN', 'BUMIL': 'BML', 'BUFAS': 'BFS', 'BADUTA': 'BDT' }[selJenis.value] || 'REG';
                const idSasaran = `${prefix}-${getKodeKecamatan(kecamatan)}-${Math.floor(Math.random()*1000000).toString().padStart(6,'0')}`;
                
                if (jawaban.tanggal_lahir) {
                    const tL = new Date(jawaban.tanggal_lahir); const tD = new Date();
                    let uT = tD.getFullYear() - tL.getFullYear(); let uB = tD.getMonth() - tL.getMonth();
                    if (uB < 0 || (uB === 0 && tD.getDate() < tL.getDate())) { uT--; uB += 12; }
                    jawaban.usia_saat_daftar_tahun = uT; jawaban.usia_saat_daftar_bulan = uB;
                }
                await putData('sync_queue', { id: idSasaran, tipe_laporan: 'REGISTRASI', username: session.username, id_tim: session.id_tim, nomor_tim: session.nomor_tim, kecamatan: kecamatan, jenis_sasaran: selJenis.value, nama_sasaran: jawaban.nama_sasaran, desa: selDesa.value, dusun: selDusun.value, data_laporan: jawaban, status_sasaran: 'AKTIF', is_synced: false, created_at: new Date().toISOString() });
                alert(`✅ Registrasi berhasil! ID: ${idSasaran}`); renderKonten('dashboard');
            } catch (err) { alert("Gagal menyimpan."); } finally { btn.disabled = false; }
        };
    }
};

// ==========================================
// 5. LOGIKA PENDAMPINGAN (DENGAN KECERDASAN BUATAN KKA & ANTROPOMETRI)
// ==========================================
const initFormPendampingan = async () => {
    const session = window.currentUser;
    const selJenis = getEl('pend-jenis'); const selSasaran = getEl('pend-sasaran');
    const infoBox = getEl('pend-info-sasaran'); const containerQ = getEl('form-pendampingan-dinamis');
    
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
                infoBox.innerHTML = `<div style="font-weight:bold; color:#0d6efd; margin-bottom: 8px;">📌 Profil Sasaran</div><table style="width:100%; font-size: 0.85rem;"><tr><td style="width:35%;">Nama</td><td>: <b>${sasaran.nama_sasaran}</b></td></tr><tr><td>NIK</td><td>: ${sasaran.data_laporan?.nik||'-'}</td></tr><tr><td>Umur Daftar</td><td>: ${sasaran.data_laporan?.usia_saat_daftar_tahun||'-'} Thn</td></tr></table>`;
            }

            let idInputBB = null, idInputTB = null;
            const filteredQ = questions.filter(q => String(q.is_active).toUpperCase() === 'Y' && String(q.modul).toUpperCase() === 'PENDAMPINGAN' && (String(q.jenis_sasaran).toUpperCase() === 'UMUM' || String(q.jenis_sasaran).toUpperCase() === sasaran.jenis_sasaran)).sort((a,b)=> parseInt(a.urutan) - parseInt(b.urutan));

            let htmlQ = `<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">`;
            filteredQ.forEach(q => {
                let lbl = (q.label_pertanyaan||'').toLowerCase();
                if(lbl.includes('berat') || lbl==='bb') idInputBB = q.id_pertanyaan;
                if(lbl.includes('tinggi') || lbl.includes('panjang') || lbl.includes('tb') || lbl.includes('pb')) idInputTB = q.id_pertanyaan;
                
                let inputHtml = q.tipe_input === 'select' ? `<select name="${q.id_pertanyaan}" id="${q.id_pertanyaan}" class="form-control"><option value="">-- Pilih --</option>${(JSON.parse(q.opsi_json || '[]')).map(o => `<option value="${o}">${o}</option>`).join('')}</select>` : `<input type="${q.tipe_input}" name="${q.id_pertanyaan}" id="${q.id_pertanyaan}" class="form-control" step="any">`;
                htmlQ += `<div class="form-group"><label><b>${q.label_pertanyaan}</b></label>${inputHtml}</div>`;
            });
            htmlQ += `</div>`;
            
            // LOGIKA CERDAS BADUTA (KKA + DETEKSI STUNTING)
            if (sasaran.jenis_sasaran === 'BADUTA' && sasaran.data_laporan.tanggal_lahir) {
                const tL = new Date(sasaran.data_laporan.tanggal_lahir); const tH = new Date();
                let uBln = (tH.getFullYear() - tL.getFullYear()) * 12; uBln -= tL.getMonth(); uBln += tH.getMonth();
                if (tH.getDate() < tL.getDate()) uBln--; if (uBln < 0) uBln = 0;
                let jk = sasaran.data_laporan.jenis_kelamin === 'Laki-laki' ? 'L' : 'P';

                // 1. KARTU PINTAR KKA
                const kkaData = getKkaData(uBln);
                let listT = "", listP = "";
                kkaData.forEach(k => {
                    let kode = k.kode_aspek ? `[${k.kode_aspek}] ` : '';
                    listT += `<li><b>${kode}</b>${k.tugas_perkembangan}</li>`; listP += `<li style="margin-bottom:6px;"><b>${kode}</b>${k.pesan_stimulasi}</li>`;
                });

                htmlQ += `
                    <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; border-left: 4px solid #0d6efd; margin-top: 15px;">
                        <h4 style="margin:0 0 10px 0; color:#0d6efd;">🤖 Asisten Cerdas KKA (Usia: ${uBln} Bln)</h4>
                        <div style="font-size:0.85rem; margin-bottom:10px;"><b>Target Pencapaian:</b><ul style="margin:5px 0; padding-left:15px;">${listT}</ul></div>
                        <div class="form-group">
                            <label style="font-weight:bold;">Apakah anak bisa melakukan SEMUA target di atas?</label>
                            <select id="kka_eval" name="evaluasi_kka" class="form-control" required>
                                <option value="">-- Evaluasi --</option><option value="Sesuai">✅ Ya, Bisa Semua</option><option value="Terlambat">⚠️ Ada yang belum bisa</option>
                            </select>
                        </div>
                        <div id="kka_tips_box" style="display:none; background:#fff3cd; padding:10px; border-radius:5px; border:1px solid #ffe69c; font-size:0.8rem; margin-top:10px;">
                            <b style="color:#856404;">💡 Panduan Stimulasi:</b><ul style="margin:5px 0; padding-left:15px; color:#856404;">${listP}</ul>
                        </div>
                    </div>
                    <div id="antro_result" style="display:none; background: #fdfdfe; padding: 15px; border-radius: 8px; border: 2px solid #ddd; margin-top: 15px;"></div>`;
                
                containerQ.innerHTML = htmlQ;
                if(getEl('kka_eval')) getEl('kka_eval').onchange = (e) => getEl('kka_tips_box').style.display = e.target.value === 'Terlambat' ? 'block' : 'none';

                // 2. DETEKTOR STUNTING OTOMATIS
                const calcAntro = () => {
                    if(!idInputBB || !idInputTB) return;
                    let b = parseFloat(getEl(idInputBB)?.value); let t = parseFloat(getEl(idInputTB)?.value);
                    if(!b || !t) { getEl('antro_result').style.display = 'none'; return; }

                    let sB="Normal", cB="#198754", sT="Normal", cT="#198754", sP="Normal", cP="#198754";

                    // BB/U
                    let d_bbu = stdAntro.find(s => s.jenis_kelamin === jk && s.indeks === 'BB_U' && parseInt(s.umur_bulan) === uBln);
                    if(d_bbu) { if(b < parseFloat(d_bbu.min_3_sd)) { sB="Sangat Kurang"; cB="#dc3545"; } else if(b < parseFloat(d_bbu.min_2_sd)) { sB="Kurang"; cB="#fd7e14"; } }

                    // PB/U atau TB/U
                    let d_tbu = stdAntro.find(s => s.jenis_kelamin === jk && (s.indeks === 'PB_U' || s.indeks === 'TB_U') && parseInt(s.umur_bulan) === uBln);
                    if(d_tbu) { if(t < parseFloat(d_tbu.min_3_sd)) { sT="Sangat Pendek (Severely Stunted)"; cT="#dc3545"; } else if(t < parseFloat(d_tbu.min_2_sd)) { sT="Pendek (Stunted)"; cT="#fd7e14"; } }

                    // BB/PB atau BB/TB
                    let rTB = (Math.round(t * 2) / 2).toFixed(1);
                    let d_bbp = stdAntro.find(s => s.jenis_kelamin === jk && (s.indeks === 'BB_PB' || s.indeks === 'BB_TB') && parseFloat(s.tinggi_panjang_cm) === parseFloat(rTB));
                    if(d_bbp) { if(b < parseFloat(d_bbp.min_3_sd)) { sP="Gizi Buruk (Severely Wasted)"; cP="#dc3545"; } else if(b < parseFloat(d_bbp.min_2_sd)) { sP="Gizi Kurang (Wasted)"; cP="#fd7e14"; } }

                    getEl('antro_result').style.display = 'block';
                    getEl('antro_result').innerHTML = `<h5 style="margin:0 0 10px 0; color:#333; text-align:center;">📊 Deteksi Dini Status Gizi</h5><div style="font-size:0.8rem;"><div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:5px;"><span>Berat (BB/U):</span><b style="color:${cB};">${sB}</b></div><div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:5px 0;"><span>Tinggi (PB/U):</span><b style="color:${cT};">${sT}</b></div><div style="display:flex; justify-content:space-between; padding-top:5px;"><span>Proporsi (BB/PB):</span><b style="color:${cP};">${sP}</b></div></div>`;
                };
                if(idInputBB) getEl(idInputBB).addEventListener('input', calcAntro);
                if(idInputTB) getEl(idInputTB).addEventListener('input', calcAntro);

            } else if (sasaran.jenis_sasaran === 'BUMIL') {
                htmlQ += `<div style="background: #fcf1f6; padding: 15px; border-radius: 8px; border-left: 4px solid #d63384; margin-top: 15px;"><div class="form-group"><label style="color:#d63384; font-weight:bold;">Apakah BUMIL sudah melahirkan?</label><select id="is_melahirkan" name="is_melahirkan" class="form-control"><option value="TIDAK">Belum / Tidak</option><option value="YA">Ya, Sudah Melahirkan</option></select></div><div class="form-group hidden" id="box-tgl-lahir" style="margin-bottom:0;"><label style="font-weight:bold;">Tanggal Persalinan</label><input type="date" name="tgl_persalinan" class="form-control"></div></div>`;
                containerQ.innerHTML = htmlQ;
                if(getEl('is_melahirkan')) getEl('is_melahirkan').onchange = (e) => { if(e.target.value === 'YA') getEl('box-tgl-lahir').classList.remove('hidden'); else getEl('box-tgl-lahir').classList.add('hidden'); };
            } else { containerQ.innerHTML = htmlQ; }
        };
    }
    
    const formPend = getEl('form-pendampingan');
    if (formPend) {
        formPend.onsubmit = async (e) => {
            e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true;
            try {
                const formData = new FormData(e.target); const jawaban = {}; formData.forEach((val, key) => jawaban[key] = val);
                
                if(jawaban.is_melahirkan === 'YA' && jawaban.tgl_persalinan) {
                    const oR = await getDataById('sync_queue', jawaban.id_sasaran);
                    if(oR) {
                        oR.status_sasaran = 'SELESAI'; oR.is_synced = false; await putData('sync_queue', oR);
                        const nId = `BFS-${oR.id.split('-')[1]||'XXX'}-${Math.floor(Math.random()*1000000).toString().padStart(6,'0')}`;
                        const nB = JSON.parse(JSON.stringify(oR)); nB.id = nId; nB.jenis_sasaran = 'BUFAS'; nB.status_sasaran = 'AKTIF'; nB.is_synced = false; nB.created_at = new Date().toISOString();
                        await putData('sync_queue', nB); alert("🎉 BUMIL telah melahirkan. Kartu BUFAS baru diterbitkan!");
                    }
                }
                await putData('sync_queue', { id: `PEND-${Date.now()}`, tipe_laporan: 'PENDAMPINGAN', username: session.username, id_tim: session.id_tim, id_sasaran_ref: jawaban.id_sasaran, jenis_sasaran_saat_kunjungan: selJenis.value, data_laporan: jawaban, is_synced: false, created_at: new Date().toISOString() });
                alert("✅ Laporan Pendampingan Tersimpan!"); renderKonten('dashboard');
            } catch (err) { alert("Gagal menyimpan."); } finally { btn.disabled = false; }
        };
    }
};

// ==========================================
// 6. DAFTAR SASARAN & TABEL KIA DIGITAL
// ==========================================
const initDaftarSasaran = async () => {
    const session = window.currentUser; const filterJenis = getEl('filter-jenis'); const filterStatus = getEl('filter-status'); const list = getEl('list-sasaran');
    const modal = getEl('modal-detail'); const btnTutup = getEl('btn-tutup-modal'); const kontenDetail = getEl('konten-detail');
    if(!list) return;
    
    const [antrean, masterPertanyaan] = await Promise.all([ getAllData('sync_queue').catch(()=>[]), getAllData('master_pertanyaan').catch(()=>[]) ]);
    const regList = antrean.filter(a => a.tipe_laporan === 'REGISTRASI' && String(a.id_tim) === String(session.id_tim));
    const pendList = antrean.filter(a => a.tipe_laporan === 'PENDAMPINGAN' && String(a.id_tim) === String(session.id_tim));
    
    const processedList = regList.map(r => {
        let isExp = r.status_sasaran === 'SELESAI', sRaw = r.status_sasaran || 'AKTIF', lSls = '<span style="color:var(--primary); font-weight:bold;">Aktif</span>', hI = new Date(); hI.setHours(0,0,0,0);
        if (r.jenis_sasaran === 'CATIN' && r.data_laporan?.tanggal_pernikahan && new Date(r.data_laporan.tanggal_pernikahan) < hI) { isExp = true; sRaw = 'SELESAI'; }
        if (r.jenis_sasaran === 'BUFAS' && r.data_laporan?.tgl_persalinan) { const tB = new Date(r.data_laporan.tgl_persalinan); tB.setDate(tB.getDate() + 42); if (hI > tB) { isExp = true; sRaw = 'SELESAI'; } }
        if (isExp || sRaw === 'SELESAI') { isExp = true; sRaw = 'SELESAI'; lSls = `<span style="color:#dc3545; font-weight:bold;">SELESAI</span>`; }
        return { ...r, isExpired: isExp, labelSelesai: lSls, statusRaw: sRaw };
    });

    const renderList = () => {
        const fJ = filterJenis ? filterJenis.value : 'ALL'; const fS = filterStatus ? filterStatus.value : 'ALL';
        let filtered = processedList.filter(r => (fJ === 'ALL' || r.jenis_sasaran === fJ) && (fS === 'ALL' || r.statusRaw === fS));
        list.innerHTML = filtered.length === 0 ? `<div style="text-align:center; padding:20px; color:#999;">Kosong</div>` : filtered.map(r => `
            <div class="sasaran-card" data-id="${r.id}" style="background:${r.isExpired ? '#f8f9fa' : '#fff'}; padding:15px; border-radius:8px; border-left: 4px solid ${r.isExpired ? '#6c757d' : 'var(--primary)'}; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom:10px;">
                <div style="font-weight: bold; font-size: 1.15rem; color: #333;">${r.nama_sasaran}</div>
                <div style="font-size: 0.95rem; color: #555; font-weight: bold;">${r.jenis_sasaran}</div>
                <div style="font-size: 0.85rem; color: #666;">📍 ${r.dusun}, ${r.desa}</div>
                <div style="font-size: 0.9rem; margin-top: 6px;">${r.labelSelesai}</div>
            </div>`).join(''); 
        document.querySelectorAll('.sasaran-card').forEach(c => c.onclick = () => showDetail(c.getAttribute('data-id')));
    };

    const showDetail = (id) => {
        const r = processedList.find(x => x.id === id); if(!r) return;
        const riwayat = pendList.filter(p => p.id_sasaran_ref === id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        let htmlR = '';

        if (riwayat.length === 0) {
            htmlR = '<div style="color:#888; padding: 15px; text-align:center;">Belum ada riwayat.</div>';
        } else if (r.jenis_sasaran === 'BADUTA') {
            htmlR += `<div style="overflow-x:auto; background: #fff; border: 1px solid #ddd;"><table style="width:100%; border-collapse: collapse; font-size: 0.85rem; text-align:center; min-width:600px;"><thead><tr style="background: var(--primary); color: white;"><th style="padding:10px; border:1px solid #ddd;">Tgl</th><th style="padding:10px; border:1px solid #ddd;">Usia</th><th style="padding:10px; border:1px solid #ddd;">BB/TB/LK</th><th style="padding:10px; border:1px solid #ddd;">Status KKA</th><th style="padding:10px; border:1px solid #ddd;">Catatan</th></tr></thead><tbody>`;
            riwayat.forEach(p => {
                let tK = new Date(p.data_laporan?.tgl_kunjungan || p.created_at), tL = new Date(r.data_laporan?.tanggal_lahir || new Date());
                let uB = (tK.getFullYear() - tL.getFullYear()) * 12; uB -= tL.getMonth(); uB += tK.getMonth(); if (tK.getDate() < tL.getDate()) uB--;
                
                let vB='-', vT='-', vL='-', vKKA= p.data_laporan?.evaluasi_kka || '-', cL = '';
                for (const [key, value] of Object.entries(p.data_laporan || {})) {
                    if (['id_sasaran', 'tgl_kunjungan', 'catatan', 'evaluasi_kka'].includes(key) || !value) continue;
                    let foundQ = masterPertanyaan.find(mq => String(mq.id_pertanyaan) === String(key));
                    let lbl = foundQ ? foundQ.label_pertanyaan.toLowerCase() : key.toLowerCase();
                    if (lbl.includes('berat') || lbl === 'bb') vB = value; else if (lbl.includes('tinggi') || lbl.includes('panjang') || lbl.includes('tb') || lbl.includes('pb')) vT = value; else if (lbl.includes('lingkar') || lbl === 'lk') vL = value; else { cL += `<small style="display:block;"><b>${foundQ?foundQ.label_pertanyaan:key}:</b> ${value}</small>`; }
                }
                let kkaS = vKKA.toLowerCase().includes('terlambat') ? 'color:#dc3545; font-weight:bold;' : 'color:#198754; font-weight:bold;';
                htmlR += `<tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; border:1px solid #eee;">${tK.toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'2-digit'})}</td><td style="padding:10px; border:1px solid #eee; font-weight:bold; color:var(--primary);">${uB<0?0:uB} Bln</td><td style="padding:10px; border:1px solid #eee;">${vB}kg / ${vT}cm / ${vL}cm</td><td style="padding:10px; border:1px solid #eee; ${kkaS}">${vKKA}</td><td style="padding:10px; border:1px solid #eee; text-align:left;">${cL}</td></tr>`;
            });
            htmlR += `</tbody></table></div>`;
        } else {
            htmlR = riwayat.map(p => {
                let dH = '';
                for (const [key, value] of Object.entries(p.data_laporan || {})) {
                    if (['id_sasaran', 'tgl_kunjungan', 'catatan', 'is_melahirkan', 'tgl_persalinan', 'nama_sasaran', 'nama_kk', 'nik', 'jenis_kelamin'].includes(key)) continue;
                    let fQ = masterPertanyaan.find(mq => String(mq.id_pertanyaan) === String(key));
                    dH += `<div style="margin-bottom: 4px; border-bottom: 1px solid #eee; font-size:0.85rem;"><b>${fQ?fQ.label_pertanyaan:key}:</b> ${value||'-'}</div>`;
                }
                return `<div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px;"><div style="background: #e8f4fd; padding: 10px; font-weight: bold;">📅 ${new Date(p.data_laporan?.tgl_kunjungan || p.created_at).toLocaleDateString('id-ID')}</div><div style="padding: 10px;">${dH}</div></div>`;
            }).join('');
        }

        kontenDetail.innerHTML = `<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;"><h4>${r.nama_sasaran} (${r.jenis_sasaran})</h4><p style="font-size:0.9rem;">ID: ${r.id}<br>Status: ${r.labelSelesai}</p></div><h4 style="color:var(--primary); border-bottom: 2px solid #ddd; padding-bottom: 5px;">Riwayat Kunjungan (${riwayat.length})</h4><div style="max-height: 400px; overflow-y: auto;">${htmlR}</div>`;
        if(modal) modal.style.display = 'block';
    };

    if(btnTutup) btnTutup.onclick = () => { if(modal) modal.style.display = 'none'; };
    if(filterJenis) filterJenis.onchange = renderList;
    if(filterStatus) filterStatus.onchange = renderList;
    renderList(); 
};

// ==========================================
// 7. FUNGSI REKAP & PENGATURAN
// ==========================================
const initRekap = async () => { 
    // Logika Rekap Standar Disederhanakan 
};

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
};

// ==========================================
// 8. LOGIN PINTAR & INISIALISASI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();

    const fLogin = getEl('form-login');
    if (fLogin) {
        fLogin.onsubmit = async (e) => {
            e.preventDefault(); // Mencegah Halaman Ter-refresh
            const btn = getEl('btn-login-submit');
            const id = getEl('kader-id').value.trim();
            const pin = getEl('kader-pin').value.trim();

            if (!id || !pin) return;
            if (btn) { btn.disabled = true; btn.innerText = "Memeriksa..."; }

            try {
                await initDB();
                const allUsers = await getAllData('master_user').catch(() => []);
                const user = allUsers.find(u => 
                    String(u.id_pengguna) === id || String(u.id_user) === id || String(u.username) === id || String(u.id) === id
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
                            nama = k.nama_kader || k.nama || nama; tim = k.id_tim || k.tim || '-'; 
                            const allTim = await getAllData('master_tim').catch(() => []);
                            const t = allTim.find(x => String(x.id_tim) === String(tim) || String(x.id) === String(tim));
                            noTim = t ? (t.nomor_tim || t.nama_tim || tim) : tim;
                        }
                    }

                    // SUNTIKAN UTAMA: WAJIB ADA id: 'active_user' agar tidak logout saat refresh
                    const ses = { id: 'active_user', username: id, role: role, nama: nama, id_tim: tim, nomor_tim: noTim };
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

// ==========================================
// 9. KENDALI MENU HAMBURGER (SIDEBAR)
// ==========================================
const btnMenu = getEl('btn-menu');
const sidebar = getEl('sidebar');
const overlay = getEl('sidebar-overlay');

if (btnMenu && sidebar && overlay) {
    btnMenu.addEventListener('click', () => { 
        sidebar.classList.add('active'); 
        overlay.classList.add('active'); 
    });
    overlay.addEventListener('click', () => { 
        sidebar.classList.remove('active'); 
        overlay.classList.remove('active'); 
    });
}
