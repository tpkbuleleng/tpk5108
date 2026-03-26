// ==========================================
// 🏢 ADMIN & PKB DASHBOARD (V53 - AUTO FILTER PATCH)
// ==========================================
import { getAllData, putData, clearStore } from './db.js';

// Pastikan SCRIPT_URL ini sama persis dengan yang ada di app.js dan super.js
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx0_deS9S3tfxkhCW1zzg8lxZGnQZzpxfw3btNAuTCsSBsBsgaN4kqJ1TpbHnBNZrOrfA/exec';

window.adminData = { registrasi: [], pendampingan: [] };
window.masterKader = [];
window.masterTim = [];
window.masterPkb = [];
window.currentUser = null;

// Variabel memori agar pilihan filter tidak hilang saat layar dirender ulang
window.currentFilterBulan = new Date().getMonth() + 1;
window.currentFilterTahun = new Date().getFullYear();
window.currentFilterDesa = 'ALL';

const catatErrorSistem = (lokasi, error) => { 
    if(window.logErrorToServer) window.logErrorToServer(`Admin: ${lokasi}`, error); 
    else console.error(`[${lokasi}]`, error); 
};

// ==========================================
// 1. FUNGSI PENARIKAN DATA (SINKRONISASI SERVER)
// ==========================================
window.fetchAdminData = async (forceRefresh = false) => {
    const btnRefresh = document.getElementById('btn-refresh-admin');
    if (btnRefresh) { btnRefresh.innerText = "⏳ Menyegarkan..."; btnRefresh.disabled = true; }
    
    try {
        const session = window.currentUser;
        const role = String(session.role || session.role_akses || '').toUpperCase();
        const kec = String(session.kecamatan || session.scope_kecamatan || '').toUpperCase();
        
        // Cek Cache Lokal Dulu Jika Tidak Dipaksa Refresh
        if (!forceRefresh) {
            const cachedReg = await getAllData('admin_registrasi').catch(()=>[]);
            const cachedPend = await getAllData('admin_pendampingan').catch(()=>[]);
            const mKader = await getAllData('master_kader').catch(()=>[]);
            const mTim = await getAllData('master_tim').catch(()=>[]);
            const mPkb = await getAllData('master_pkb').catch(()=>[]);
            
            if (cachedReg.length > 0 || cachedPend.length > 0) {
                window.adminData.registrasi = cachedReg;
                window.adminData.pendampingan = cachedPend;
                window.masterKader = mKader;
                window.masterTim = mTim;
                window.masterPkb = mPkb;
                if (btnRefresh) { btnRefresh.innerText = "🔄 Segarkan Data"; btnRefresh.disabled = false; }
                return true;
            }
        }

        // Tarik Data dari Server (Satelit)
        const url = `${SCRIPT_URL}?action=getAdminData&role=${role}&kecamatan=${kec}`;
        const [resAdmin, resKader, resTim, resPkb] = await Promise.all([
            fetch(url).then(r => r.json()).catch(() => ({status:'error'})),
            fetch(SCRIPT_URL, { method:'POST', body: JSON.stringify({action:'SECURE_GET_ALL', sheetName:'MASTER_KADER'}) }).then(r=>r.json()).catch(()=>({status:'error'})),
            fetch(SCRIPT_URL, { method:'POST', body: JSON.stringify({action:'SECURE_GET_ALL', sheetName:'MASTER_TIM'}) }).then(r=>r.json()).catch(()=>({status:'error'})),
            fetch(SCRIPT_URL, { method:'POST', body: JSON.stringify({action:'SECURE_GET_ALL', sheetName:'MASTER_PKB'}) }).then(r=>r.json()).catch(()=>({status:'error'}))
        ]);

        if (resAdmin.status === 'success') {
            window.adminData.registrasi = resAdmin.data.registrasi || [];
            window.adminData.pendampingan = resAdmin.data.pendampingan || [];
            await clearStore('admin_registrasi'); await clearStore('admin_pendampingan');
            for(let r of window.adminData.registrasi) await putData('admin_registrasi', r);
            for(let p of window.adminData.pendampingan) await putData('admin_pendampingan', p);
        }
        if (resKader.status === 'success') { window.masterKader = resKader.data || []; await clearStore('master_kader'); for(let k of window.masterKader) await putData('master_kader', k); }
        if (resTim.status === 'success') { window.masterTim = resTim.data || []; await clearStore('master_tim'); for(let t of window.masterTim) await putData('master_tim', t); }
        if (resPkb.status === 'success') { window.masterPkb = resPkb.data || []; await clearStore('master_pkb'); for(let p of window.masterPkb) await putData('master_pkb', p); }
        
        if (btnRefresh) { btnRefresh.innerText = "🔄 Segarkan Data"; btnRefresh.disabled = false; }
        return true;
    } catch (e) {
        catatErrorSistem('fetchAdminData', e);
        if (btnRefresh) { btnRefresh.innerText = "❌ Gagal Menyegarkan"; setTimeout(()=> {btnRefresh.innerText="🔄 Segarkan Data"; btnRefresh.disabled=false;}, 3000); }
        return false;
    }
};

// ==========================================
// 2. FILTER & CROSS-REFERENCE DATA
// ==========================================
const getFilteredData = () => {
    const session = window.currentUser;
    const role = String(session.role).toUpperCase();
    const scopeDesa = String(session.desa || '').toUpperCase();
    let rData = window.adminData.registrasi;
    let pData = window.adminData.pendampingan;

    // Filter Berdasarkan Hak Akses (Role)
    if (role.includes('DESA') || role.includes('PKB')) {
        const arrDesa = scopeDesa.split(',').map(d => d.trim()).filter(Boolean);
        if (arrDesa.length > 0 && scopeDesa !== 'ALL' && scopeDesa !== '-') {
            rData = rData.filter(r => {
                const rDesa = String(r.desa || '').toUpperCase();
                return arrDesa.includes(rDesa);
            });
            pData = pData.filter(p => {
                const sasaranRef = rData.find(r => r.id === p.id_sasaran_ref);
                if (sasaranRef) return true;
                return false;
            });
        }
    }
    
    // Filter Berdasarkan Dropdown Desa (Jika ada di tampilan)
    if (window.currentFilterDesa !== 'ALL') {
        rData = rData.filter(r => String(r.desa || '').toUpperCase() === window.currentFilterDesa);
        pData = pData.filter(p => {
            const sasaranRef = rData.find(r => r.id === p.id_sasaran_ref);
            return sasaranRef ? true : false;
        });
    }

    return { registrasi: rData, pendampingan: pData };
};

// ==========================================
// 3. ROUTER TAMPILAN ADMIN (RENDER VIEW)
// ==========================================
window.renderAdminView = async (target) => {
    const content = document.getElementById('admin-content');
    if(!content) return;
    
    try {
        const data = getFilteredData();
        const regData = data.registrasi;
        const pendData = data.pendampingan;
        const session = window.currentUser;
        
        if (target === 'dashboard') {
            content.innerHTML = `
                <div class="animate-fade">
                    <div class="admin-card" style="background: linear-gradient(135deg, #0A2342 0%, #2980B9 100%); color: white; margin-bottom: 20px; border-left: 5px solid #F1C40F;">
                        <h2 style="margin:0 0 5px 0; font-size:1.5rem;">Selamat Datang, ${session.nama}!</h2>
                        <p style="margin:0; opacity:0.9; font-size:0.9rem;">Anda masuk sebagai <b>${session.role}</b> Wilayah ${session.desa !== '-' ? session.desa : session.kecamatan}.</p>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 20px;">
                        <div class="admin-card" style="border-left: 5px solid #F1C40F; text-align:center;">
                            <div style="font-size:0.85rem; color:#666; font-weight:bold; margin-bottom:5px;">TOTAL SASARAN TERDAFTAR</div>
                            <div style="font-size:2.2rem; font-weight:900; color:#0A2342;">${regData.length}</div>
                        </div>
                        <div class="admin-card" style="border-left: 5px solid #198754; text-align:center;">
                            <div style="font-size:0.85rem; color:#666; font-weight:bold; margin-bottom:5px;">TOTAL LAPORAN PENDAMPINGAN</div>
                            <div style="font-size:2.2rem; font-weight:900; color:#198754;">${pendData.length}</div>
                        </div>
                    </div>

                    <div class="admin-card">
                        <h3 style="margin-top:0; color:#0A2342; border-bottom:2px solid #eee; padding-bottom:10px;">📊 Rincian Sasaran</h3>
                        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; text-align:center;">
                            <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #ddd;">
                                <div style="font-size:1.5rem;">👰</div>
                                <div style="font-weight:bold; color:#0043A8; font-size:1.2rem;">${regData.filter(r=>String(r.jenis_sasaran).includes('CATIN')).length}</div>
                                <div style="font-size:0.75rem; color:#666;">CATIN</div>
                            </div>
                            <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #ddd;">
                                <div style="font-size:1.5rem;">🤰</div>
                                <div style="font-weight:bold; color:#0043A8; font-size:1.2rem;">${regData.filter(r=>String(r.jenis_sasaran).includes('BUMIL')).length}</div>
                                <div style="font-size:0.75rem; color:#666;">IBU HAMIL</div>
                            </div>
                            <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #ddd;">
                                <div style="font-size:1.5rem;">🤱</div>
                                <div style="font-weight:bold; color:#0043A8; font-size:1.2rem;">${regData.filter(r=>String(r.jenis_sasaran).includes('BUFAS')).length}</div>
                                <div style="font-size:0.75rem; color:#666;">IBU NIFAS</div>
                            </div>
                            <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #ddd;">
                                <div style="font-size:1.5rem;">👶</div>
                                <div style="font-weight:bold; color:#0043A8; font-size:1.2rem;">${regData.filter(r=>String(r.jenis_sasaran).includes('BADUTA')).length}</div>
                                <div style="font-size:0.75rem; color:#666;">BADUTA</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        else if (target === 'daftar_sasaran') {
            content.innerHTML = `
                <div class="admin-card" style="margin-bottom:15px;">
                    <h3 style="margin:0 0 15px 0; color:#0A2342;">📋 Daftar Sasaran TPK</h3>
                    <div style="display:flex; gap:10px; margin-bottom:15px;">
                        <input type="text" id="flt-cari" class="admin-input" placeholder="🔍 Cari Nama / NIK..." style="flex:1;">
                        <select id="flt-jenis" class="admin-input" style="width:150px;">
                            <option value="ALL">Semua Jenis</option><option value="CATIN">CATIN</option><option value="BUMIL">BUMIL</option><option value="BUFAS">BUFAS</option><option value="BADUTA">BADUTA</option>
                        </select>
                    </div>
                    <div class="admin-table-container">
                        <table class="admin-table" id="tbl-sasaran">
                            <thead><tr><th>Tgl Daftar</th><th>ID Sasaran</th><th>Nama Sasaran</th><th>Jenis</th><th>Desa</th><th>Tim TPK</th></tr></thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            `;
            
            const renderTbl = () => {
                const cari = document.getElementById('flt-cari').value.toLowerCase();
                const jenis = document.getElementById('flt-jenis').value;
                const tbody = document.querySelector('#tbl-sasaran tbody');
                let html = ''; let count = 0;
                
                const sortedReg = [...regData].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                
                sortedReg.forEach(r => {
                    const jns = String(r.jenis_sasaran || '').toUpperCase();
                    const nm = String(r.nama_sasaran || '').toLowerCase();
                    const id = String(r.id || '').toLowerCase();
                    if ((jenis === 'ALL' || jns.includes(jenis)) && (nm.includes(cari) || id.includes(cari))) {
                        count++;
                        const tgl = new Date(r.created_at).toLocaleDateString('id-ID');
                        let tData = window.masterTim.find(t => t.id_tim === r.id_tim) || {};
                        let nTim = tData.nama_tim || tData.nomor_tim || r.id_tim || '-';
                        html += `<tr><td>${tgl}</td><td><code>${r.id}</code></td><td><b>${r.nama_sasaran}</b></td><td>${r.jenis_sasaran}</td><td>${r.desa || '-'}</td><td>${nTim}</td></tr>`;
                    }
                });
                if(count === 0) html = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">Tidak ada data ditemukan.</td></tr>`;
                tbody.innerHTML = html;
            };
            
            renderTbl();
            document.getElementById('flt-cari').addEventListener('input', renderTbl);
            document.getElementById('flt-jenis').addEventListener('change', renderTbl);
        }

        else if (target === 'cetak_laporan') {
            // Setup Filter Desa Dropdown
            let optDesa = '';
            if (session.role.includes('PKB') || session.role.includes('DESA')) {
                const arrDesa = session.desa.split(',').map(d=>d.trim()).filter(Boolean);
                if (arrDesa.length > 1) {
                    optDesa = `<select id="dash-flt-desa" class="admin-input"><option value="ALL">Semua Desa Binaan</option>${arrDesa.map(d => `<option value="${d}">${d}</option>`).join('')}</select>`;
                } else if (arrDesa.length === 1) {
                    optDesa = `<select id="dash-flt-desa" class="admin-input" disabled><option value="${arrDesa[0]}">${arrDesa[0]}</option></select>`;
                    window.currentFilterDesa = arrDesa[0];
                }
            } else {
                const desaSet = new Set(window.adminData.registrasi.map(r => String(r.desa || '').toUpperCase()));
                const dList = Array.from(desaSet).filter(d => d !== '' && d !== '-' && d !== 'UNDEFINED').sort();
                optDesa = `<select id="dash-flt-desa" class="admin-input"><option value="ALL">Seluruh Desa (Kecamatan)</option>${dList.map(d => `<option value="${d}">${d}</option>`).join('')}</select>`;
            }

            content.innerHTML = `
                <div class="no-print admin-card" style="margin-bottom:15px; display:flex; gap:10px; align-items:center; background:#e8f4fd; border-left:4px solid #0043A8;">
                    <strong style="color:#0A2342;">Filter Laporan:</strong>
                    <select id="dash-flt-bulan" class="admin-input">
                        ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => `<option value="${m}" ${m == window.currentFilterBulan ? 'selected' : ''}>Bulan ${m}</option>`).join('')}
                    </select>
                    <select id="dash-flt-tahun" class="admin-input">
                        ${[2024,2025,2026,2027].map(y => `<option value="${y}" ${y == window.currentFilterTahun ? 'selected' : ''}>${y}</option>`).join('')}
                    </select>
                    ${optDesa}
                    <button style="background:#198754; color:white; border:none; padding:8px 15px; border-radius:5px; font-weight:bold; cursor:pointer; margin-left:auto;" onclick="window.print()">🖨️ Cetak PDF / Kertas</button>
                </div>

                <div id="print-area" style="background:white; padding:30px; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
                    <div style="text-align:center; margin-bottom:20px; border-bottom:2px solid #333; padding-bottom:10px;">
                        <h2 style="margin:0; font-size:1.3rem;">REKAPITULASI HASIL PENDAMPINGAN TIM PENDAMPING KELUARGA (TPK)</h2>
                        <h3 style="margin:5px 0 0 0; font-size:1.1rem;">KECAMATAN ${session.kecamatan}</h3>
                        <p style="margin:5px 0 0 0; font-size:0.9rem;" id="lbl-periode-cetak">Bulan: -</p>
                    </div>
                    
                    <div style="overflow-x:auto;">
                        <table class="admin-table print-table" style="width:100%; border-collapse:collapse; font-size:0.8rem; border:1px solid #000;" border="1">
                            <thead>
                                <tr style="background:#eee; text-align:center;">
                                    <th rowspan="2">No</th><th rowspan="2">Desa</th><th rowspan="2">Tim</th>
                                    <th colspan="2">Catin</th><th colspan="2">Bumil</th><th colspan="2">Bufas</th><th colspan="2">Baduta</th>
                                </tr>
                                <tr style="background:#eee; text-align:center;">
                                    <th>Terdaftar</th><th>Didampingi</th><th>Terdaftar</th><th>Didampingi</th><th>Terdaftar</th><th>Didampingi</th><th>Terdaftar</th><th>Didampingi</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-cetak"></tbody>
                        </table>
                    </div>

                    <div style="margin-top:40px; display:flex; justify-content:flex-end;">
                        <div style="text-align:center; width:250px;">
                            <p style="margin:0 0 60px 0;">Mengetahui,<br>Penyuluh KB / Pembina Wilayah</p>
                            <b id="ttd-nama-pkb" style="text-decoration:underline;">NAMA PKB</b>
                            <p style="margin:0;">NIP. <span id="ttd-nip-pkb">-</span></p>
                        </div>
                    </div>
                </div>
            `;

            // Set Dropdown Value Sesuai State
            const fltDesaEl = document.getElementById('dash-flt-desa');
            if (fltDesaEl && window.currentFilterDesa) { fltDesaEl.value = window.currentFilterDesa; }

            // 🔥 FIX BUG V53: EVENT LISTENER LANGSUNG RENDER ULANG LAYAR PENUH
            const triggerRerender = () => {
                window.currentFilterBulan = parseInt(document.getElementById('dash-flt-bulan').value);
                window.currentFilterTahun = parseInt(document.getElementById('dash-flt-tahun').value);
                if (document.getElementById('dash-flt-desa')) {
                    window.currentFilterDesa = document.getElementById('dash-flt-desa').value;
                }
                window.renderAdminView('cetak_laporan'); // Render ulang langsung menggunakan data di RAM
            };

            document.getElementById('dash-flt-bulan').addEventListener('change', triggerRerender);
            document.getElementById('dash-flt-tahun').addEventListener('change', triggerRerender);
            if (fltDesaEl) fltDesaEl.addEventListener('change', triggerRerender);

            // LOGIKA PEMBUATAN TABEL REKAP
            const fBulan = window.currentFilterBulan;
            const fTahun = window.currentFilterTahun;
            
            document.getElementById('lbl-periode-cetak').innerText = `Bulan: ${fBulan} Tahun: ${fTahun} ${window.currentFilterDesa !== 'ALL' ? ' | Desa: '+window.currentFilterDesa : ''}`;

            // Cari PKB untuk TTD (Sesuai Filter Desa saat ini)
            let ttdNama = ".....................................";
            let ttdNIP = ".....................................";
            if (session.role.includes('PKB')) {
                ttdNama = session.nama;
                const p = window.masterPkb.find(pk => pk.id_pkb === session.username || pk.nip_pkb === session.username);
                if(p) ttdNIP = p.nip_pkb || '-';
            } else if (window.currentFilterDesa !== 'ALL') {
                const targetPkb = window.masterPkb.find(p => String(p.desa_kelurahan||'').toUpperCase().includes(window.currentFilterDesa));
                if(targetPkb) { ttdNama = targetPkb.nama_pkb || targetPkb.nama || '-'; ttdNIP = targetPkb.nip_pkb || targetPkb.nip || '-'; }
            }
            document.getElementById('ttd-nama-pkb').innerText = ttdNama;
            document.getElementById('ttd-nip-pkb').innerText = ttdNIP;

            const tbody = document.getElementById('tbody-cetak');
            let html = '';
            
            // Kelompokkan data pendaftaran dan pendampingan berdasarkan Tim & Desa
            let mapTim = {};
            
            regData.forEach(r => {
                const dt = new Date(r.created_at);
                // Hanya hitung jika bulan/tahun daftar <= bulan filter (akumulatif s/d bulan tersebut)
                if (dt.getFullYear() > fTahun || (dt.getFullYear() === fTahun && (dt.getMonth()+1) > fBulan)) return;
                
                let tData = window.masterTim.find(t => t.id_tim === r.id_tim) || {};
                let tKey = r.id_tim || 'UNKNOWN';
                let tName = tData.nama_tim || tData.nomor_tim || tKey;
                let dName = r.desa || tData.desa_kelurahan || '-';

                if(!mapTim[tKey]) mapTim[tKey] = { desa: dName, nama: tName, c_reg:0, c_pend:0, m_reg:0, m_pend:0, f_reg:0, f_pend:0, b_reg:0, b_pend:0 };
                
                const jns = String(r.jenis_sasaran).toUpperCase();
                if(jns.includes('CATIN')) mapTim[tKey].c_reg++;
                else if(jns.includes('BUMIL')) mapTim[tKey].m_reg++;
                else if(jns.includes('BUFAS')) mapTim[tKey].f_reg++;
                else if(jns.includes('BADUTA')) mapTim[tKey].b_reg++;
            });

            pendData.forEach(p => {
                let pData = {}; try{ pData = JSON.parse(p.data_laporan || '{}'); }catch(e){}
                const dt = pData.tgl_kunjungan ? new Date(pData.tgl_kunjungan) : new Date(p.created_at);
                
                // Pendampingan harus tepat di bulan dan tahun filter
                if(dt.getFullYear() !== fTahun || (dt.getMonth()+1) !== fBulan) return;

                let tKey = p.id_tim || 'UNKNOWN';
                let ref = regData.find(r => r.id === p.id_sasaran_ref);
                if(!ref) return;

                if(!mapTim[tKey]) {
                    let tData = window.masterTim.find(t => t.id_tim === tKey) || {};
                    mapTim[tKey] = { desa: ref.desa || tData.desa_kelurahan || '-', nama: tData.nama_tim||tKey, c_reg:0, c_pend:0, m_reg:0, m_pend:0, f_reg:0, f_pend:0, b_reg:0, b_pend:0 };
                }

                const jns = String(ref.jenis_sasaran).toUpperCase();
                if(jns.includes('CATIN')) mapTim[tKey].c_pend++;
                else if(jns.includes('BUMIL')) mapTim[tKey].m_pend++;
                else if(jns.includes('BUFAS')) mapTim[tKey].f_pend++;
                else if(jns.includes('BADUTA')) mapTim[tKey].b_pend++;
            });

            const keys = Object.keys(mapTim).sort((a,b) => mapTim[a].desa.localeCompare(mapTim[b].desa));
            let no = 1;
            let sum = { cr:0, cp:0, mr:0, mp:0, fr:0, fp:0, br:0, bp:0 };

            if(keys.length === 0) {
                html = `<tr><td colspan="11" style="text-align:center; padding:20px; color:#999;">Data kosong pada bulan dan wilayah ini.</td></tr>`;
            } else {
                keys.forEach(k => {
                    const row = mapTim[k];
                    sum.cr += row.c_reg; sum.cp += row.c_pend;
                    sum.mr += row.m_reg; sum.mp += row.m_pend;
                    sum.fr += row.f_reg; sum.fp += row.f_pend;
                    sum.br += row.b_reg; sum.bp += row.b_pend;
                    
                    html += `<tr style="text-align:center;">
                        <td>${no++}</td><td style="text-align:left;">${row.desa}</td><td style="text-align:left;">${row.nama}</td>
                        <td>${row.c_reg}</td><td>${row.c_pend}</td>
                        <td>${row.m_reg}</td><td>${row.m_pend}</td>
                        <td>${row.f_reg}</td><td>${row.f_pend}</td>
                        <td>${row.b_reg}</td><td>${row.b_pend}</td>
                    </tr>`;
                });
                html += `<tr style="font-weight:bold; background:#e8f4fd; text-align:center;">
                    <td colspan="3">JUMLAH TOTAL</td>
                    <td>${sum.cr}</td><td>${sum.cp}</td>
                    <td>${sum.mr}</td><td>${sum.mp}</td>
                    <td>${sum.fr}</td><td>${sum.fp}</td>
                    <td>${sum.br}</td><td>${sum.bp}</td>
                </tr>`;
            }
            tbody.innerHTML = html;
        }

    } catch(e) { catatErrorSistem('renderAdminView', e); }
};

// ==========================================
// 4. INISIALISASI (BOOTSTRAP) ADMIN APP
// ==========================================
export const initAdmin = async (session) => {
    window.currentUser = session;
    
    // Hide UI Lama
    document.getElementById('view-splash').style.display = 'none';
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-app').classList.add('hidden');

    // Suntik CSS Spesifik Admin
    const style = document.createElement('style');
    style.innerHTML = `
        .admin-sidebar { width:250px; background:#0A2342; color:white; display:flex; flex-direction:column; height:100vh; position:fixed; left:0; top:0; z-index:100; transition: transform 0.3s; }
        .admin-main { margin-left:250px; display:flex; flex-direction:column; min-height:100vh; background:#eef2f5; transition: margin-left 0.3s; }
        .admin-menu-item { padding:15px 20px; cursor:pointer; font-weight:bold; color:#E8F4FD; border-left:4px solid transparent; transition:all 0.2s; }
        .admin-menu-item:hover, .admin-menu-item.active { background:rgba(255,255,255,0.1); color:#F1C40F; border-left:4px solid #F1C40F; }
        .admin-card { background:white; padding:20px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.05); }
        .admin-table { width:100%; border-collapse:collapse; font-size:0.9rem; }
        .admin-table th, .admin-table td { padding:12px; border-bottom:1px solid #eee; text-align:left; }
        .admin-table th { background:#f8f9fa; color:#0A2342; font-weight:bold; }
        .admin-input { padding:8px 12px; border:1px solid #ccc; border-radius:5px; font-family:inherit; }
        @media print { 
            .admin-sidebar { display:none !important; } 
            .admin-main { margin-left:0 !important; padding:0 !important; background:white !important; }
            .no-print { display:none !important; }
            .print-table th, .print-table td { border: 1px solid #000 !important; padding: 6px !important; color: #000 !important;}
            #print-area { box-shadow:none !important; padding:0 !important; }
        }
        @media (max-width: 768px) {
            .admin-sidebar { transform: translateX(-100%); }
            .admin-sidebar.show { transform: translateX(0); }
            .admin-main { margin-left: 0; }
        }
    `;
    document.head.appendChild(style);

    // Bangun HTML Kerangka Admin
    document.body.innerHTML += `
        <div class="admin-sidebar" id="admin-sidebar">
            <div style="padding:20px; text-align:center; border-bottom:1px solid rgba(255,255,255,0.1);">
                <div style="font-size:2rem; margin-bottom:5px;">🏢</div>
                <h3 style="margin:0; color:#F1C40F; font-size:1.1rem;">DASHBOARD ${session.role.split('_')[0]}</h3>
            </div>
            <div style="flex:1; overflow-y:auto; padding:15px 0;">
                <div class="admin-menu-item active" data-target="dashboard">🏠 Beranda Ringkasan</div>
                <div class="admin-menu-item" data-target="daftar_sasaran">📋 Daftar Sasaran TPK</div>
                <div class="admin-menu-item" data-target="cetak_laporan">🖨️ Cetak Laporan</div>
            </div>
            <div style="padding:20px; text-align:center; border-top:1px solid rgba(255,255,255,0.1);">
                <button id="btn-admin-logout" style="width:100%; padding:10px; background:transparent; border:1px solid #F1C40F; color:#F1C40F; border-radius:5px; cursor:pointer; font-weight:bold;">🚪 Keluar (Logout)</button>
            </div>
        </div>
        <div class="admin-main">
            <div class="no-print" style="background:white; padding:15px 20px; box-shadow:0 2px 5px rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center; z-index:10;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <button id="btn-admin-toggle" style="background:none; border:none; font-size:1.5rem; cursor:pointer; padding:0; color:#0A2342;">☰</button>
                    <h2 id="admin-title" style="margin:0; font-size:1.2rem; color:#0A2342;">Beranda Ringkasan</h2>
                </div>
                <button id="btn-refresh-admin" style="background:#0043A8; color:white; border:none; padding:8px 15px; border-radius:5px; font-weight:bold; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1);">🔄 Segarkan Data</button>
            </div>
            <div id="admin-content" style="padding:20px; flex:1; overflow-y:auto;"></div>
        </div>
    `;

    // Event Listener Navigasi
    document.getElementById('btn-admin-toggle').onclick = () => document.getElementById('admin-sidebar').classList.toggle('show');
    document.getElementById('btn-admin-logout').onclick = async () => { if(confirm("Keluar dari sistem?")) { await clearStore('kader_session'); location.reload(); } };
    
    let currentActiveMenu = 'dashboard';
    const menuItems = document.querySelectorAll('.admin-menu-item');
    menuItems.forEach(item => {
        item.onclick = () => {
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            currentActiveMenu = item.getAttribute('data-target');
            document.getElementById('admin-title').innerText = item.innerText.replace(/[^\w\s]/gi, '').trim();
            if(window.innerWidth <= 768) document.getElementById('admin-sidebar').classList.remove('show');
            window.renderAdminView(currentActiveMenu);
        };
    });

    document.getElementById('btn-refresh-admin').onclick = async () => {
        const success = await window.fetchAdminData(true);
        if (success) window.renderAdminView(currentActiveMenu);
    };

    // Muat data awal (Dari Cache lalu layar)
    await window.fetchAdminData(false);
    window.renderAdminView('dashboard');
    
    // Auto Update di Latar Belakang
    setTimeout(() => { window.fetchAdminData(true).then(()=> window.renderAdminView(currentActiveMenu)); }, 1500);
};
