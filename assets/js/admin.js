// ==========================================
// 📊 DASHBOARD SUPERVISOR (V38 - DYNAMIC THEME FIXED CONTRAST - PATCH KABUPATEN)
// ==========================================
import { clearStore } from './db.js';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';

window.adminData = { registrasi: [], pendampingan: [] };
window.adminSession = null;

// 🔥 V38: Menambahkan variabel btnText khusus agar tidak tabrakan (Kamuflase)
const getRoleTheme = (roleStr) => {
    const r = String(roleStr).toUpperCase();
    if(r.includes('KABUPATEN')) return { main: '#0043A8', dark: '#0A2342', light: '#E8F4FD', accent: '#F1C40F', text: '#FFFFFF', icon: '#F1C40F', btnText: '#0A2342' }; 
    if(r.includes('KECAMATAN') || r === 'ADMIN') return { main: '#2980B9', dark: '#1A5276', light: '#E8F4FD', accent: '#F1C40F', text: '#FFFFFF', icon: '#FFFFFF', btnText: '#0A2342' }; 
    if(r === 'ADMIN_DESA') return { main: '#B8860B', dark: '#8B6508', light: '#FDF8E7', accent: '#0A2342', text: '#FFFFFF', icon: '#FFFFFF', btnText: '#F1C40F' }; 
    if(r.includes('PKB')) return { main: '#8CA8D1', dark: '#5C7A9E', light: '#F0F4F8', accent: '#0A2342', text: '#0A2342', icon: '#0A2342', btnText: '#F1C40F' }; 
    if(r.includes('MITRA')) return { main: '#F1C40F', dark: '#D4AF37', light: '#FFF8E7', accent: '#0A2342', text: '#0A2342', icon: '#0A2342', btnText: '#F1C40F' }; 
    return { main: '#0A2342', dark: '#051221', light: '#E8F4FD', accent: '#F1C40F', text: '#FFFFFF', icon: '#F1C40F', btnText: '#0A2342' }; 
};

const fetchAdminData = async () => {
    try {
        const url = `${SCRIPT_URL}?action=getAdminData&role=${window.adminSession.role}&kecamatan=${window.adminSession.kecamatan}`;
        const response = await fetch(url);
        const res = await response.json();
        
        if (res.status === 'success') {
            let rawReg = res.data.registrasi || [];
            let rawPend = res.data.pendampingan || [];
            const roleUpper = String(window.adminSession.role).toUpperCase();
            
            const isRestrictedByDesa = roleUpper.includes('PKB') || roleUpper === 'ADMIN_DESA';
            if (isRestrictedByDesa) {
                const allowedDesa = String(window.adminSession.desa || '').toUpperCase().split(',').map(d => d.trim());
                if (!allowedDesa.includes('ALL') && !allowedDesa.includes('-') && allowedDesa.length > 0 && allowedDesa[0] !== "") {
                    rawReg = rawReg.filter(r => allowedDesa.includes(String(r.desa || '').toUpperCase()));
                    const allowedIds = new Set(rawReg.map(r => r.id));
                    rawPend = rawPend.filter(p => allowedIds.has(p.id_sasaran_ref));
                }
            }
            window.adminData.registrasi = rawReg;
            window.adminData.pendampingan = rawPend;
            return true;
        }
        return false;
    } catch (e) { console.error("Gagal menarik data:", e); return false; }
};

const exportToCSV = (filename, rows) => {
    if(!rows || !rows.length) return;
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent = keys.join(separator) + '\n' + rows.map(row => {
            return keys.map(k => {
                let cell = row[k] === null || row[k] === undefined ? '' : row[k];
                cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
                if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
                return cell;
            }).join(separator);
        }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url); link.setAttribute('download', filename);
        link.style.visibility = 'hidden'; document.body.appendChild(link);
        link.click(); document.body.removeChild(link);
    }
};

window.renderAdminView = async (target) => {
    const content = document.getElementById('admin-content');
    
    if (target === 'dashboard') {
        const reg = window.adminData.registrasi;
        const pend = window.adminData.pendampingan;
        
        let cCatin = 0, cBumil = 0, cBufas = 0, cBaduta = 0;
        let pCatin = 0, pBumil = 0, pBufas = 0, pBaduta = 0;

        reg.forEach(r => {
            if(r.status_duplikasi && r.status_duplikasi.includes('DUPLIKAT')) return; 
            if(r.jenis_sasaran === 'CATIN') cCatin++;
            else if(r.jenis_sasaran === 'BUMIL') cBumil++;
            else if(r.jenis_sasaran === 'BUFAS') cBufas++;
            else if(r.jenis_sasaran === 'BADUTA') cBaduta++;
        });

        const kaderKinerja = {};
        pend.forEach(p => {
            let jenis = p.id_sasaran_ref.substring(0,3);
            if(jenis === 'CTN') pCatin++; else if(jenis === 'BML') pBumil++; else if(jenis === 'BFS') pBufas++; else if(jenis === 'BDT') pBaduta++;
            if(!kaderKinerja[p.username]) kaderKinerja[p.username] = 0;
            kaderKinerja[p.username]++;
        });

        const topKader = Object.entries(kaderKinerja).sort((a,b) => b[1] - a[1]).slice(0, 5);
        
        // 🔥 PATCH KAMUFLASE DASHBOARD
        let displayDesa = window.adminSession.desa === '-' || window.adminSession.desa === 'ALL' || window.adminSession.desa === '' ? window.adminSession.kecamatan : window.adminSession.desa;
        if (String(displayDesa).toUpperCase() === 'ALL') {
            displayDesa = 'KABUPATEN BULELENG';
        }

        content.innerHTML = `
            <div class="animate-fade">
                <div style="background: linear-gradient(135deg, var(--th-dark) 0%, var(--th-main) 100%); color: var(--th-text); border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); border-bottom: 5px solid var(--th-accent);">
                    <p style="margin:0; color: var(--th-accent); font-weight: 800; font-size: 0.85rem; letter-spacing:1px; text-transform:uppercase;">RADAR ${window.adminSession.role}</p>
                    <h2 style="margin: 5px 0 10px 0; font-size: 1.6rem; word-wrap: break-word;">Wilayah: ${displayDesa}</h2>
                    <p style="margin:0; font-size:0.9rem; opacity:0.9;">Total Data Terhimpun: <b>${reg.length} Sasaran</b> & <b>${pend.length} Kunjungan</b>.</p>
                </div>

                <div style="margin-bottom: 15px; font-weight: bold; color: var(--th-dark); border-left: 4px solid var(--th-accent); padding-left: 10px;">📊 Akumulasi Sasaran Terdaftar</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                    <div style="background: white; padding: 20px; border-radius: 8px; border-bottom: 4px solid var(--th-main); box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size:0.8rem; color:#666; font-weight:bold;">👰 CATIN</div>
                        <div style="font-size:2rem; font-weight:900; color:var(--th-main);">${cCatin}</div>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 8px; border-bottom: 4px solid #e84393; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size:0.8rem; color:#666; font-weight:bold;">🤰 IBU HAMIL</div>
                        <div style="font-size:2rem; font-weight:900; color:#e84393;">${cBumil}</div>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 8px; border-bottom: 4px solid #00b894; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size:0.8rem; color:#666; font-weight:bold;">🤱 IBU NIFAS</div>
                        <div style="font-size:2rem; font-weight:900; color:#00b894;">${cBufas}</div>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 8px; border-bottom: 4px solid var(--th-accent); box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size:0.8rem; color:#666; font-weight:bold;">👶 BADUTA</div>
                        <div style="font-size:2rem; font-weight:900; color:var(--th-dark);">${cBaduta}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #e1e8ed;">
                        <h3 style="margin:0 0 15px 0; font-size:1.1rem; color:var(--th-dark); border-bottom:2px solid var(--th-accent); padding-bottom:10px; display:inline-block;">📈 Statistik Laporan Kunjungan</h3>
                        <table style="width:100%; border-collapse: collapse; font-size:0.9rem; margin-top:10px;">
                            <tr style="background:#f8f9fa;"><th style="padding:10px; text-align:left; border-bottom:1px solid #ddd; color:var(--th-dark);">Kategori</th><th style="padding:10px; text-align:right; border-bottom:1px solid #ddd; color:var(--th-dark);">Jml Laporan Masuk</th></tr>
                            <tr><td style="padding:10px; border-bottom:1px solid #eee;">Calon Pengantin (CATIN)</td><td style="padding:10px; text-align:right; border-bottom:1px solid #eee; font-weight:bold;">${pCatin}</td></tr>
                            <tr><td style="padding:10px; border-bottom:1px solid #eee;">Ibu Hamil (BUMIL)</td><td style="padding:10px; text-align:right; border-bottom:1px solid #eee; font-weight:bold;">${pBumil}</td></tr>
                            <tr><td style="padding:10px; border-bottom:1px solid #eee;">Ibu Nifas (BUFAS)</td><td style="padding:10px; text-align:right; border-bottom:1px solid #eee; font-weight:bold;">${pBufas}</td></tr>
                            <tr><td style="padding:10px; border-bottom:1px solid #eee;">Baduta (0-23 Bulan)</td><td style="padding:10px; text-align:right; border-bottom:1px solid #eee; font-weight:bold;">${pBaduta}</td></tr>
                            <tr style="background:var(--th-light);"><td style="padding:10px; font-weight:bold; color:var(--th-dark);">TOTAL LAPORAN</td><td style="padding:10px; text-align:right; font-weight:bold; color:var(--th-main); font-size:1.1rem;">${pend.length}</td></tr>
                        </table>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #e1e8ed;">
                        <h3 style="margin:0 0 15px 0; font-size:1.1rem; color:var(--th-dark); border-bottom:2px solid var(--th-accent); padding-bottom:10px; display:inline-block;">🏆 Top 5 Kader Teraktif</h3>
                        <div style="margin-top:10px;">
                        ${topKader.length === 0 ? '<div style="color:#555; text-align:center; padding:20px 0; font-weight:500;">Belum ada laporan masuk.</div>' : ''}
                        ${topKader.map((k, idx) => `
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px dashed #eee; padding-bottom:8px;">
                                <div style="font-size:0.85rem;"><span style="color:var(--th-accent); font-weight:bold; margin-right:5px;">#${idx+1}</span> <b style="color:var(--th-dark);">${k[0]}</b></div>
                                <div style="font-size:0.8rem; background:var(--th-light); color:var(--th-main); padding:2px 8px; border-radius:10px; font-weight:bold; border:1px solid var(--th-main);">${k[1]} Lapor</div>
                            </div>
                        `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    else if (target === 'sasaran') {
        const reg = window.adminData.registrasi;
        content.innerHTML = `
            <div class="animate-fade">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                    <h2 style="margin:0; font-size:1.4rem; color:var(--th-dark); border-left:4px solid var(--th-accent); padding-left:10px;">📋 Database Sasaran</h2>
                    <button class="btn-action" style="background:var(--th-main); color:var(--th-text); border:1px solid var(--th-accent); border-radius:6px; padding:10px 15px; font-size:0.9rem;" onclick="window.exportCSV('sasaran')">📥 Download Excel (CSV)</button>
                </div>
                <div style="background:white; padding:15px; border-radius:8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #e1e8ed;">
                    <div style="display:flex; gap:10px; margin-bottom:15px;">
                        <input type="text" id="flt-sasaran-nama" class="admin-input" placeholder="Cari Nama/NIK/Desa..." style="flex:2;">
                        <select id="flt-sasaran-jenis" class="admin-input" style="flex:1;">
                            <option value="ALL">Semua Jenis</option><option value="CATIN">CATIN</option><option value="BUMIL">BUMIL</option><option value="BUFAS">BUFAS</option><option value="BADUTA">BADUTA</option>
                        </select>
                    </div>
                    <div style="overflow-x:auto;">
                        <table class="admin-table">
                            <thead><tr><th>ID Registrasi</th><th>Tgl Daftar</th><th>Jenis</th><th>Nama Sasaran</th><th>Desa / Dusun</th><th>Kader Pendata</th><th>Status</th></tr></thead>
                            <tbody id="tbody-sasaran"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const renderTabelSasaran = () => {
            const filterNama = document.getElementById('flt-sasaran-nama').value.toLowerCase();
            const filterJenis = document.getElementById('flt-sasaran-jenis').value;
            const tbody = document.getElementById('tbody-sasaran');
            
            const filtered = reg.filter(r => {
                const matchNama = r.nama_sasaran.toLowerCase().includes(filterNama) || (r.id||'').toLowerCase().includes(filterNama) || (r.desa||'').toLowerCase().includes(filterNama);
                const matchJenis = filterJenis === 'ALL' || r.jenis_sasaran === filterJenis;
                return matchNama && matchJenis;
            }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); 

            if(filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#999;">Tidak ada data yang cocok.</td></tr>`; return; }

            tbody.innerHTML = filtered.map(r => {
                const tgl = new Date(r.created_at).toLocaleDateString('id-ID');
                let statBadge = r.status_sasaran === 'SELESAI' ? `<span style="background:#f8f9fa; color:#6c757d; padding:3px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; border:1px solid #ddd;">SELESAI</span>` : `<span style="background:var(--th-light); color:var(--th-main); padding:3px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; border:1px solid var(--th-main);">AKTIF</span>`;
                if(r.status_duplikasi && r.status_duplikasi.includes('DUPLIKAT')) statBadge = `<span style="background:#fff3cd; color:#B8860B; padding:3px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; border:1px solid #ffeeba;">⚠️ DUPLIKAT</span>`;
                
                return `<tr style="border-bottom:1px solid #eee;">
                    <td><code style="color:var(--th-dark); font-weight:bold;">${r.id}</code></td>
                    <td>${tgl}</td>
                    <td><b style="color:#B8860B;">${r.jenis_sasaran}</b></td>
                    <td style="color:var(--th-main); font-weight:bold;">${r.nama_sasaran}</td>
                    <td>${r.desa}<br><span style="font-size:0.75rem; color:#888;">${r.dusun}</span></td>
                    <td>${r.username}</td>
                    <td>${statBadge}</td>
                </tr>`;
            }).join('');
        };

        document.getElementById('flt-sasaran-nama').addEventListener('input', renderTabelSasaran);
        document.getElementById('flt-sasaran-jenis').addEventListener('change', renderTabelSasaran);
        renderTabelSasaran();
    }

    else if (target === 'pendampingan') {
        const pend = window.adminData.pendampingan;
        content.innerHTML = `
            <div class="animate-fade">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                    <h2 style="margin:0; font-size:1.4rem; color:var(--th-dark); border-left:4px solid var(--th-accent); padding-left:10px;">🤝 Riwayat Pendampingan</h2>
                    <button class="btn-action" style="background:var(--th-main); color:var(--th-text); border:1px solid var(--th-accent); border-radius:6px; padding:10px 15px; font-size:0.9rem;" onclick="window.exportCSV('pendampingan')">📥 Download Excel (CSV)</button>
                </div>
                <div style="background:white; padding:15px; border-radius:8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #e1e8ed;">
                    <div style="display:flex; gap:10px; margin-bottom:15px;">
                        <input type="text" id="flt-pend-nama" class="admin-input" placeholder="Cari ID Sasaran / Petugas..." style="flex:2;">
                    </div>
                    <div style="overflow-x:auto;">
                        <table class="admin-table">
                            <thead><tr><th>Tgl Kunjungan</th><th>ID Sasaran (Target)</th><th>Kader Pelapor</th><th>Catatan Lapangan</th><th>Lokasi GPS</th></tr></thead>
                            <tbody id="tbody-pend"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const renderTabelPend = () => {
            const filterNama = document.getElementById('flt-pend-nama').value.toLowerCase();
            const tbody = document.getElementById('tbody-pend');
            
            const filtered = pend.filter(p => {
                const matchNama = (p.id_sasaran_ref||'').toLowerCase().includes(filterNama) || (p.username||'').toLowerCase().includes(filterNama);
                return matchNama;
            }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

            if(filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">Tidak ada data laporan.</td></tr>`; return; }

            tbody.innerHTML = filtered.map(p => {
                let rData = {}; try { rData = JSON.parse(p.data_laporan || '{}'); } catch(e){}
                const tgl = rData.tgl_kunjungan ? new Date(rData.tgl_kunjungan).toLocaleDateString('id-ID') : new Date(p.created_at).toLocaleDateString('id-ID');
                const cat = rData.catatan || '-';
                
                let gpsStr = p.lokasi_gps && p.lokasi_gps !== '-' ? `<a href="https://maps.google.com/?q=${p.lokasi_gps}" target="_blank" style="color:var(--th-main); font-weight:bold; text-decoration:none; font-size:0.8rem;">🗺️ Cek Map</a>` : '<span style="color:#999; font-size:0.8rem;">Tidak Ada</span>';

                return `<tr style="border-bottom:1px solid #eee;">
                    <td><b style="color:#B8860B;">${tgl}</b></td>
                    <td><code style="color:var(--th-dark); font-weight:bold;">${p.id_sasaran_ref}</code></td>
                    <td>${p.username}</td>
                    <td style="font-size:0.85rem; color:#444;">${cat}</td>
                    <td>${gpsStr}</td>
                </tr>`;
            }).join('');
        };

        document.getElementById('flt-pend-nama').addEventListener('input', renderTabelPend);
        renderTabelPend();
    }
};

window.exportCSV = (jenis) => {
    if(jenis === 'sasaran') {
        const data = window.adminData.registrasi.map(r => {
            let detail = {}; try { detail = JSON.parse(r.data_laporan || '{}'); } catch(e){}
            return { ID_Registrasi: r.id, Tanggal_Daftar: r.created_at, Kader_Pendata: r.username, No_Tim: r.id_tim, Jenis_Sasaran: r.jenis_sasaran, Nama_Sasaran: r.nama_sasaran, Desa: r.desa, Dusun: r.dusun, NIK: detail.nik || '', No_KK: detail.nomor_kk || '', Tanggal_Lahir: detail.tanggal_lahir || '', Usia_Tahun: detail.usia_saat_daftar_tahun || '', Alamat_Lengkap: detail.alamat || detail.catin_alamat || '', Status_Aktif: r.status_sasaran };
        });
        exportToCSV('Data_Sasaran_TPK.csv', data);
    } else if (jenis === 'pendampingan') {
        const data = window.adminData.pendampingan.map(p => {
            let detail = {}; try { detail = JSON.parse(p.data_laporan || '{}'); } catch(e){}
            return { ID_Laporan: p.id, Waktu_Input: p.created_at, Kader_Pelapor: p.username, ID_Sasaran: p.id_sasaran_ref, Tgl_Kunjungan: detail.tgl_kunjungan || '', Catatan_Hasil: detail.catatan || '', Lokasi_GPS: p.lokasi_gps || '' };
        });
        exportToCSV('Data_Pendampingan_TPK.csv', data);
    }
};

// ==========================================
// 4. INISIALISASI KERANGKA (SKELETON)
// ==========================================
export const initAdmin = async (session) => {
    window.adminSession = session;
    const th = getRoleTheme(session.role);
    
    // 🔥 PATCH KAMUFLASE SIDEBAR
    const displayKecamatan = String(session.kecamatan || '').toUpperCase() === 'ALL' ? 'KABUPATEN BULELENG' : session.kecamatan;

    document.body.innerHTML = `
        <div id="admin-root" style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; background:#eef2f5; font-family: 'Segoe UI', sans-serif; overflow: hidden;">
            <style>
                :root {
                    --th-main: ${th.main};
                    --th-dark: ${th.dark};
                    --th-light: ${th.light};
                    --th-accent: ${th.accent};
                    --th-text: ${th.text};
                    --th-icon: ${th.icon};
                    --th-btn-text: ${th.btnText};
                }
                .admin-menu-item { padding: 14px 25px; color: var(--th-light); font-weight: 600; cursor: pointer; transition: all 0.2s; border-left: 4px solid transparent; font-size: 0.95rem; } 
                .admin-menu-item:hover { background: rgba(255,255,255, 0.1); color: var(--th-icon); } 
                .admin-menu-item.active { background: rgba(255,255,255, 0.2); color: var(--th-icon); border-left: 4px solid var(--th-accent); } 
                #btn-admin-logout:hover { background: var(--th-accent); color: var(--th-btn-text); }
                .admin-input { padding:10px 12px; border:1px solid #ced4da; border-radius:6px; outline:none; font-family:inherit; } 
                .admin-input:focus { border-color:var(--th-main); box-shadow: 0 0 0 2px rgba(0,0,0, 0.1); }
                .btn-action:hover { opacity: 0.8; transform:translateY(-1px); }
                .admin-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; min-width: 800px; } 
                .admin-table th { position: sticky; top: 0; background: var(--th-dark); color: white; padding: 12px; text-align: left; font-weight:600; border-bottom: 3px solid var(--th-accent); } 
                .admin-table td { padding: 12px; vertical-align: middle; } 
                .admin-table tr:hover td { background: #fcf8ff; }
            </style>

            <div id="admin-sidebar" style="width:260px; background: linear-gradient(180deg, var(--th-dark) 0%, var(--th-main) 100%); color:var(--th-text); display:flex; flex-direction:column; box-shadow: 2px 0 10px rgba(0,0,0,0.15); z-index:100; flex-shrink: 0;">
                <div style="padding: 25px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align:center;">
                    <div style="font-size: 2.5rem; margin-bottom: 5px;">📡</div>
                    <h3 style="margin:0; font-weight:900; line-height:1.2; color:var(--th-accent); letter-spacing:1px;">RADAR TPK</h3>
                    <div style="font-size:0.75rem; color:var(--th-text); font-weight:bold; margin-top:5px; opacity:0.9;">PANEL SUPERVISOR</div>
                </div>
                <div style="flex:1; padding: 20px 0; overflow-y:auto;">
                    <div class="admin-menu-item active" data-target="dashboard">📊 Dashboard Pemantauan</div>
                    <div class="admin-menu-item" data-target="sasaran">📋 Database Sasaran</div>
                    <div class="admin-menu-item" data-target="pendampingan">🤝 Riwayat Pendampingan</div>
                </div>
                <div style="padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);">
                    <div style="font-size:0.8rem; margin-bottom:10px; color:var(--th-text);">Supervisor:<br><b style="color:var(--th-accent); font-size:0.95rem;">${session.nama}</b><br><span style="font-size:0.75rem; opacity:0.8;">${displayKecamatan}</span></div>
                    <button id="btn-admin-logout" style="width:100%; background:transparent; color:var(--th-accent); border:1px solid var(--th-accent); padding:10px; border-radius:6px; cursor:pointer; font-weight:bold; transition: all 0.3s;">🔒 Keluar Sistem</button>
                </div>
            </div>
            <div style="flex:1; display:flex; flex-direction:column; overflow:hidden; width:100%;">
                <div style="background:white; padding: 15px 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); z-index:5; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e1e8ed;">
                    <h2 id="admin-page-title" style="margin:0; font-size:1.3rem; color:var(--th-dark); font-weight:800;">Memuat Data...</h2>
                    <button id="btn-admin-refresh" style="background:var(--th-accent); color:var(--th-btn-text); border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.85rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">🔄 Segarkan Data</button>
                </div>
                <div id="admin-content" style="flex:1; padding: 25px; overflow-y:auto; background:#eef2f5;">
                    <div style="padding:50px; text-align:center; color:var(--th-main);"><h3>⏳ Menyedot Data dari Satelit Pusat...</h3><p>Tunggu sebentar ya, Bapak/Ibu.</p></div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-admin-logout').onclick = async () => { if(confirm("Keluar dari Panel Supervisor?")) { await clearStore('kader_session'); location.reload(); } };
    
    const menuItems = document.querySelectorAll('.admin-menu-item');
    menuItems.forEach(item => { 
        item.onclick = () => { 
            menuItems.forEach(m => m.classList.remove('active')); 
            item.classList.add('active'); 
            document.getElementById('admin-page-title').innerText = item.innerText.replace(/[^\w\s]/gi, '').trim(); 
            window.renderAdminView(item.getAttribute('data-target')); 
        }; 
    });

    document.getElementById('btn-admin-refresh').onclick = async () => {
        const btn = document.getElementById('btn-admin-refresh');
        btn.innerText = "⏳ Menyedot..."; btn.disabled = true;
        const success = await fetchAdminData();
        if(success) {
            const activeMenu = document.querySelector('.admin-menu-item.active').getAttribute('data-target');
            window.renderAdminView(activeMenu);
        } else {
            alert("Gagal menyegarkan data. Periksa koneksi internet.");
        }
        btn.innerText = "🔄 Segarkan Data"; btn.disabled = false;
    };

    const success = await fetchAdminData();
    if(success) {
        document.getElementById('admin-page-title').innerText = 'Dashboard Pemantauan';
        window.renderAdminView('dashboard');
    } else {
        document.getElementById('admin-content').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Terhubung ke Satelit</h3><p>Pastikan Anda memiliki koneksi internet yang stabil, lalu klik 'Segarkan Data'.</p></div>`;
        document.getElementById('admin-page-title').innerText = 'Koneksi Terputus';
    }
};
