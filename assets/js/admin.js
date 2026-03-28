// ==========================================
// 📊 DASHBOARD SUPERVISOR (V54 - PRECOMPUTE & LAZY LOAD API)
// ==========================================
import { clearStore, getAllData } from './db.js';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZiCcv7MCL21R1VqlOFsx1x_Ax_8yoxVwjIumG3kVYwDSQTfXX9VjQnz2GsAW2ItzAAQ/exec';

window.adminData = { rekapDashboard: [], rekapKader: [], registrasi: [], pendampingan: [], master_kader: [], master_pkb: [], master_tim_wilayah: [], master_menu: [] };
window.adminSession = null; window.currentFilterKec = 'ALL'; window.currentFilterDesa = 'ALL'; window.currentFilterBulan = new Date().getMonth() + 1; window.currentFilterTahun = new Date().getFullYear();

window.getKaderName = (uname) => { if(!uname) return '-'; const kaders = window.adminData.master_kader || []; const found = kaders.find(x => String(x.id) === String(uname) || String(x.id_kader) === String(uname) || String(x.username) === String(uname)); return found ? (found.nama_kader || found.nama_lengkap || found.nama || uname) : uname; };

const getRoleTheme = (roleStr) => {
    const r = String(roleStr).toUpperCase();
    if(r.includes('KABUPATEN')) return { main: '#0043A8', dark: '#0A2342', light: '#E8F4FD', accent: '#F1C40F', text: '#FFFFFF', icon: '#F1C40F', btnText: '#0A2342' }; 
    if(r.includes('KECAMATAN') || r === 'ADMIN') return { main: '#2980B9', dark: '#1A5276', light: '#E8F4FD', accent: '#F1C40F', text: '#FFFFFF', icon: '#FFFFFF', btnText: '#0A2342' }; 
    if(r === 'ADMIN_DESA') return { main: '#B8860B', dark: '#8B6508', light: '#FDF8E7', accent: '#0A2342', text: '#FFFFFF', icon: '#FFFFFF', btnText: '#F1C40F' }; 
    if(r.includes('PKB')) return { main: '#8CA8D1', dark: '#5C7A9E', light: '#F0F4F8', accent: '#0A2342', text: '#0A2342', icon: '#0A2342', btnText: '#F1C40F' }; 
    if(r.includes('MITRA')) return { main: '#F1C40F', dark: '#D4AF37', light: '#FFF8E7', accent: '#0A2342', text: '#0A2342', icon: '#0A2342', btnText: '#F1C40F' }; 
    return { main: '#0A2342', dark: '#051221', light: '#E8F4FD', accent: '#F1C40F', text: '#FFFFFF', icon: '#F1C40F', btnText: '#0A2342' }; 
};

// 🚀 FASE 3: TARIKAN DATA KILAT (HANYA DASHBOARD)
const fetchDashboardSummary = async () => {
    try {
        const url = `${SCRIPT_URL}?action=getDashboardSummary&token=${window.adminSession.token}`;
        const response = await fetch(url);
        const res = await response.json();
        
        if (await window.handleAuthError(res)) return false;

        if (res.status === 'success') {
            window.adminData.rekapDashboard = res.data.dashboard || [];
            window.adminData.rekapKader = res.data.kader || [];
            window.adminData.master_menu = res.data.master_menu || [];
            window.adminData.master_tim_wilayah = res.data.master_tim_wilayah || [];
            // Simpan ke array kosong agar tidak undefined jika dipanggil fungsi lain
            window.adminData.master_kader = window.adminData.rekapKader; 
            return true;
        } return false;
    } catch (e) { console.error("Gagal menarik data:", e); return false; }
};

// 🛑 FASE 3: TARIKAN DATA BERAT (ON-DEMAND)
const fetchRawDataIfNeeded = async () => {
    if (window.adminData.registrasi.length > 0) return true; 
    document.getElementById('admin-content').innerHTML = `<div style="padding:50px; text-align:center; color:var(--th-main);"><div style="font-size:3rem; margin-bottom:15px; animation: spin 2s linear infinite;">⏳</div><h3>Menyedot Data Rinci...</h3><p>Membuka brankas data kecamatan. Harap tunggu...</p></div><style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>`;
    try {
        const url = `${SCRIPT_URL}?action=getAdminData&role=${window.adminSession.role}&kecamatan=${window.adminSession.kecamatan}&token=${window.adminSession.token}`;
        const response = await fetch(url); const res = await response.json();
        if (await window.handleAuthError(res)) return false;
        if (res.status === 'success') {
            let rawReg = res.data.registrasi || []; let rawPend = res.data.pendampingan || []; const roleUpper = String(window.adminSession.role).toUpperCase();
            const isRestrictedByDesa = roleUpper.includes('PKB') || roleUpper === 'ADMIN_DESA';
            if (isRestrictedByDesa) { const allowedDesa = String(window.adminSession.desa || '').toUpperCase().split(',').map(d => d.trim()); if (!allowedDesa.includes('ALL') && !allowedDesa.includes('-') && allowedDesa.length > 0 && allowedDesa[0] !== "") { rawReg = rawReg.filter(r => allowedDesa.includes(String(r.desa || '').toUpperCase())); const allowedIds = new Set(rawReg.map(r => r.id)); rawPend = rawPend.filter(p => allowedIds.has(p.id_sasaran_ref)); } }
            window.adminData.registrasi = rawReg; window.adminData.pendampingan = rawPend;
            return true;
        }
        return false;
    } catch(e) { return false; }
};

const exportToCSV = (filename, rows) => { if(!rows || !rows.length) return; const separator = ','; const keys = Object.keys(rows[0]); const csvContent = keys.join(separator) + '\n' + rows.map(row => { return keys.map(k => { let cell = row[k] === null || row[k] === undefined ? '' : row[k]; cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""'); if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`; return cell; }).join(separator); }).join('\n'); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); if (link.download !== undefined) { const url = URL.createObjectURL(blob); link.setAttribute('href', url); link.setAttribute('download', filename); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); } };
const exportTableToExcel = (tableID, filename = '') => { const table = document.getElementById(tableID); if(!table) return; let tableHTML = table.outerHTML.replace(/<table/g, '<table border="1" style="border-collapse:collapse;"'); const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"></head><body>${tableHTML}</body></html>`; const blob = new Blob([template], { type: 'application/vnd.ms-excel' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename ? filename + '.xls' : 'Rekapan_Laporan.xls'; document.body.appendChild(link); link.click(); document.body.removeChild(link); };

window.renderAdminView = async (target) => {
    const content = document.getElementById('admin-content'); const roleUpper = String(window.adminSession.role).toUpperCase();
    const mapKecRev = { 'GRK': 'GEROKGAK', 'SRT': 'SERIRIT', 'BSB': 'BUSUNGBIU', 'BJR': 'BANJAR', 'SKS': 'SUKASADA', 'BLL': 'BULELENG', 'SWN': 'SAWAN', 'KBT': 'KUBUTAMBAHAN', 'TJK': 'TEJAKULA' };
    
    // Generate Opsi Dropdown Filter
    let optKec = `<option value="ALL">🌍 SEMUA KECAMATAN</option>`; let optDesa = `<option value="ALL">🏘️ SEMUA DESA</option>`;
    const isKabupaten = roleUpper.includes('KABUPATEN') || roleUpper.includes('SUPER') || roleUpper.includes('MITRA'); const isKecamatan = roleUpper.includes('KECAMATAN') || roleUpper === 'ADMIN';
    
    if (isKabupaten) { const listKec = [...new Set(window.adminData.master_tim_wilayah.map(r => r.kecamatan).filter(Boolean))]; listKec.forEach(k => { optKec += `<option value="${k}" ${window.currentFilterKec === k ? 'selected' : ''}>${mapKecRev[k] || k}</option>`; }); const listDesa = [...new Set(window.adminData.master_tim_wilayah.filter(r => window.currentFilterKec === 'ALL' || r.kecamatan === window.currentFilterKec || r.kecamatan === mapKecRev[window.currentFilterKec]).map(r => String(r.desa_kelurahan||'').toUpperCase()).filter(Boolean))]; listDesa.sort().forEach(d => { if(d !== '-') optDesa += `<option value="${d}" ${window.currentFilterDesa === d ? 'selected' : ''}>${d}</option>`; }); } 
    else if (isKecamatan) { optKec = `<option value="${window.currentFilterKec}">${window.adminSession.kecamatan}</option>`; const listDesa = [...new Set(window.adminData.master_tim_wilayah.map(r => String(r.desa_kelurahan||'').toUpperCase()).filter(Boolean))]; listDesa.sort().forEach(d => { if(d !== '-') optDesa += `<option value="${d}" ${window.currentFilterDesa === d ? 'selected' : ''}>${d}</option>`; }); }
    else { optKec = `<option value="${window.currentFilterKec}">${window.adminSession.kecamatan}</option>`; const listDesa = String(window.adminSession.desa || '').toUpperCase().split(',').map(d => d.trim()); optDesa = `<option value="ALL">🏘️ SEMUA DESA</option>` + listDesa.map(d => `<option value="${d}" ${window.currentFilterDesa === d ? 'selected' : ''}>${d}</option>`).join(''); }

    const filterWilayahHTML = `<div style="background: white; padding: 15px 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: flex; gap: 15px; align-items: center; border-left: 4px solid var(--th-main); flex-wrap: wrap;"><div style="font-size: 0.85rem; font-weight: bold; color: #666; white-space: nowrap;">🔍 Filter Wilayah:</div><select id="dash-flt-kec" class="admin-input" style="flex:1; min-width: 150px; font-weight:bold; color:var(--th-dark);" ${isKabupaten ? '' : 'disabled'}>${optKec}</select><select id="dash-flt-desa" class="admin-input" style="flex:1; min-width: 150px; font-weight:bold; color:var(--th-dark);" ${roleUpper.includes('DESA') && String(window.adminSession.desa).indexOf(',') === -1 ? 'disabled' : ''}>${optDesa}</select></div>`;

    // ==========================================
    // RENDER: DASHBOARD (INSTANT LOAD - BACA REKAP_DASHBOARD)
    // ==========================================
    if (target === 'dashboard') {
        let cCatin = 0, cBumil = 0, cBufas = 0, cBaduta = 0, countPrioritas = 0, tLaporan = 0;
        
        let fKecamatan = isKabupaten ? window.currentFilterKec : (mapKecRev[window.adminSession.kecamatan] || window.adminSession.kecamatan || 'ALL');
        if (fKecamatan && fKecamatan !== 'ALL') fKecamatan = (mapKecRev[fKecamatan] || fKecamatan).toUpperCase();
        
        let fDesa = window.currentFilterDesa;
        if (fDesa && fDesa !== 'ALL') fDesa = String(fDesa).toUpperCase().trim();
        
        const allowedDesaPKB = roleUpper.includes('PKB') ? String(window.adminSession.desa || '').toUpperCase().split(',').map(d => d.trim()) : [];

        window.adminData.rekapDashboard.forEach(d => {
            const dKec = String(d.kecamatan || d.kec).toUpperCase();
            const dDesa = String(d.desa).toUpperCase().trim();

            if(fKecamatan !== 'ALL' && dKec !== fKecamatan && dKec !== mapKecRev[fKecamatan]) return;
            if(fDesa !== 'ALL' && dDesa !== fDesa) return;
            if(roleUpper.includes('PKB') && !allowedDesaPKB.includes('ALL') && !allowedDesaPKB.includes('-') && !allowedDesaPKB.includes(dDesa)) return;
            
            cCatin += (parseInt(d.catin_aktif)||0); cBumil += (parseInt(d.bumil_aktif)||0);
            cBufas += (parseInt(d.bufas_aktif)||0); cBaduta += (parseInt(d.baduta_aktif)||0);
            countPrioritas += (parseInt(d.jml_prioritas)||0); tLaporan += (parseInt(d.laporan_bln_ini)||0);
        });

        // Cari Top 5 Kader
        let rankKader = [];
        window.adminData.rekapKader.forEach(k => {
            const kKec = String(k.kecamatan || k.kec).toUpperCase();
            const kDesa = String(k.desa).toUpperCase().trim();

            if(fKecamatan !== 'ALL' && kKec !== fKecamatan && kKec !== mapKecRev[fKecamatan]) return;
            if(fDesa !== 'ALL' && kDesa !== fDesa) return;
            if(roleUpper.includes('PKB') && !allowedDesaPKB.includes('ALL') && !allowedDesaPKB.includes('-') && !allowedDesaPKB.includes(kDesa)) return;

            rankKader.push({ nama: k.nama_kader || k.username, lapor: parseInt(k.laporan_bln_ini)||0 });
        });
        rankKader.sort((a,b) => b.lapor - a.lapor); const topKader = rankKader.slice(0, 5);
        
        let displayDesa = window.adminSession.desa === '-' || window.adminSession.desa === 'ALL' || window.adminSession.desa === '' ? window.adminSession.kecamatan : window.adminSession.desa; if (String(displayDesa).toUpperCase() === 'ALL') displayDesa = 'KABUPATEN BULELENG'; const isTugas = roleUpper.includes('PKB') || roleUpper.includes('KADER'); const labelWilayah = isTugas ? 'Wilayah Tugas:' : 'Wilayah :';
        
        let jmlKader = 0, userAktif = 0, userPasif = 0;
        window.adminData.rekapKader.forEach(k => {
            const kKec = String(k.kecamatan || k.kec).toUpperCase();
            const kDesa = String(k.desa).toUpperCase().trim();

            if(fKecamatan !== 'ALL' && kKec !== fKecamatan && kKec !== mapKecRev[fKecamatan]) return;
            if(fDesa !== 'ALL' && kDesa !== fDesa) return;
            if(roleUpper.includes('PKB') && !allowedDesaPKB.includes('ALL') && !allowedDesaPKB.includes('-') && !allowedDesaPKB.includes(kDesa)) return;

            jmlKader++; if(String(k.status_aktif).toUpperCase() === 'AKTIF') userAktif++; else userPasif++;
        });

        const showMetricAdmin = roleUpper.includes('PKB') || roleUpper.includes('ADMIN_KECAMATAN') || roleUpper.includes('ADMIN_KABUPATEN'); let extraDashboardHTML = ''; 
        if (showMetricAdmin) { extraDashboardHTML = `<div style="margin-bottom:15px; font-weight:bold; color:var(--th-dark); border-left:4px solid var(--th-accent); padding-left:10px;">⚡ Quick Status (Pre-computed Daily)</div><div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:15px; margin-bottom:25px;"><div style="background:white; padding:15px; border-radius:8px; border-bottom:4px solid #dc3545; box-shadow:0 2px 5px rgba(0,0,0,0.05);"><div style="font-size:0.75rem; color:#666; font-weight:bold;">🚨 SASARAN PRIORITAS</div><div style="font-size:1.8rem; font-weight:900; color:#dc3545;">${countPrioritas} <span style="font-size:0.8rem; color:#666; font-weight:normal;">Warga</span></div></div><div style="background:white; padding:15px; border-radius:8px; border-bottom:4px solid var(--th-main); box-shadow:0 2px 5px rgba(0,0,0,0.05);"><div style="font-size:0.75rem; color:#666; font-weight:bold;">👥 JUMLAH KADER</div><div style="font-size:1.8rem; font-weight:900; color:var(--th-main);">${jmlKader} <span style="font-size:0.8rem; color:#666; font-weight:normal;">User</span></div></div><div style="background:white; padding:15px; border-radius:8px; border-bottom:4px solid #198754; box-shadow:0 2px 5px rgba(0,0,0,0.05);"><div style="font-size:0.75rem; color:#666; font-weight:bold;">🟢 KADER AKTIF (BULAN INI)</div><div style="font-size:1.8rem; font-weight:900; color:#198754;">${userAktif} <span style="font-size:0.8rem; color:#666; font-weight:normal;">Login</span></div></div><div style="background:white; padding:15px; border-radius:8px; border-bottom:4px solid #B8860B; box-shadow:0 2px 5px rgba(0,0,0,0.05);"><div style="font-size:0.75rem; color:#666; font-weight:bold;">🟠 KADER PASIF</div><div style="font-size:1.8rem; font-weight:900; color:#B8860B;">${userPasif} <span style="font-size:0.8rem; color:#666; font-weight:normal;">Belum</span></div></div></div>`; }

        const rTotal = cCatin + cBumil + cBufas + cBaduta;
        content.innerHTML = `
            <div class="animate-fade">
                <div style="background:linear-gradient(135deg, var(--th-dark) 0%, var(--th-main) 100%); color:var(--th-text); border-radius:12px; padding:25px; margin-bottom:20px; box-shadow:0 4px 10px rgba(0,0,0,0.15); border-bottom:5px solid var(--th-accent);"><p style="margin:0; color:var(--th-accent); font-weight:800; font-size:0.85rem; letter-spacing:1px; text-transform:uppercase;">MONITORING ${window.adminSession.role}</p><h2 style="margin:5px 0 10px 0; font-size:1.6rem; word-wrap:break-word;">${labelWilayah} ${displayDesa}</h2><p style="margin:0; font-size:0.9rem; opacity:0.9;">Total Terhimpun (Sesuai Filter): <b>${rTotal} Sasaran</b> & <b>${tLaporan} Kunjungan Bulan Ini</b>.</p></div>
                ${filterWilayahHTML} ${extraDashboardHTML}
                <div style="margin-bottom:15px; font-weight:bold; color:var(--th-dark); border-left:4px solid var(--th-accent); padding-left:10px;">📊 Akumulasi Sasaran Terdaftar (Aktif)</div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:25px;">
                    <div style="background:white; padding:20px; border-radius:8px; border-bottom:4px solid var(--th-main); box-shadow:0 2px 5px rgba(0,0,0,0.05);"><div style="font-size:0.8rem; color:#666; font-weight:bold;">👰 CATIN</div><div style="font-size:2rem; font-weight:900; color:var(--th-main);">${cCatin}</div></div>
                    <div style="background:white; padding:20px; border-radius:8px; border-bottom:4px solid #e84393; box-shadow:0 2px 5px rgba(0,0,0,0.05);"><div style="font-size:0.8rem; color:#666; font-weight:bold;">🤰 IBU HAMIL</div><div style="font-size:2rem; font-weight:900; color:#e84393;">${cBumil}</div></div>
                    <div style="background:white; padding:20px; border-radius:8px; border-bottom:4px solid #00b894; box-shadow:0 2px 5px rgba(0,0,0,0.05);"><div style="font-size:0.8rem; color:#666; font-weight:bold;">🤱 IBU NIFAS</div><div style="font-size:2rem; font-weight:900; color:#00b894;">${cBufas}</div></div>
                    <div style="background:white; padding:20px; border-radius:8px; border-bottom:4px solid var(--th-accent); box-shadow:0 2px 5px rgba(0,0,0,0.05);"><div style="font-size:0.8rem; color:#666; font-weight:bold;">👶 BADUTA</div><div style="font-size:2rem; font-weight:900; color:var(--th-dark);">${cBaduta}</div></div>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:15px;">
                    <div style="background:white; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05); border:1px solid #e1e8ed;">
                        <h3 style="margin:0 0 15px 0; font-size:1.1rem; color:var(--th-dark); border-bottom:2px solid var(--th-accent); padding-bottom:10px; display:inline-block;">🏆 Top 5 Kader Teraktif (Bulan Ini)</h3>
                        <div style="margin-top:10px;">${topKader.length === 0 || topKader[0].lapor === 0 ? '<div style="color:#555; text-align:center; padding:20px 0; font-weight:500;">Belum ada laporan masuk.</div>' : ''}${topKader.map((k, idx) => { if(k.lapor === 0) return ''; return `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px dashed #eee; padding-bottom:8px;"><div style="font-size:0.85rem;"><span style="color:var(--th-accent); font-weight:bold; margin-right:5px;">#${idx+1}</span> <b style="color:var(--th-dark);">${k.nama}</b></div><div style="font-size:0.8rem; background:var(--th-light); color:var(--th-main); padding:2px 8px; border-radius:10px; font-weight:bold; border:1px solid var(--th-main);">${k.lapor} Lapor</div></div>` }).join('')}</div>
                    </div>
                </div>
            </div>
        `;
        const btnKec = document.getElementById('dash-flt-kec'); if (btnKec) btnKec.addEventListener('change', () => { window.currentFilterKec = btnKec.value; window.currentFilterDesa = 'ALL'; window.renderAdminView('dashboard'); });
        const btnDesa = document.getElementById('dash-flt-desa'); if (btnDesa) btnDesa.addEventListener('change', () => { window.currentFilterDesa = btnDesa.value; window.renderAdminView('dashboard'); });
    }

    else if (target === 'database_tpk') {
        const ditarik = await fetchRawDataIfNeeded();
        if(!ditarik) return;
        
        content.innerHTML = `
            <div class="animate-fade">
                <div style="background:linear-gradient(135deg, var(--th-dark) 0%, var(--th-main) 100%); padding:25px; border-radius:12px; color:white; margin-bottom:20px; box-shadow:0 4px 10px rgba(0,0,0,0.15); border-bottom:5px solid var(--th-accent);"><h2 style="margin:0 0 5px 0; font-size:1.5rem; font-weight:800; color:var(--th-accent);">👥 Database Tim Pendamping Keluarga</h2><p style="margin:0; opacity:0.9; font-size:0.9rem;">Pusat kendali dan monitoring kapilaritas SDM Kader TPK di wilayah Anda.</p></div>
                <div id="tpk-stats-container" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:15px; margin-bottom:25px;"></div>
                <div style="background:white; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05); margin-bottom:20px; border:1px solid #e1e8ed;"><h4 style="margin:0 0 15px 0; color:var(--th-dark); font-size:1rem; border-bottom:2px solid var(--th-light); padding-bottom:10px;">🔍 Penyaringan Data Kader</h4><div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:15px;"><select id="flt-tpk-kec" class="admin-input" style="font-weight:bold; color:var(--th-dark);"><option value="ALL">🌍 Semua Kecamatan</option></select><select id="flt-tpk-desa" class="admin-input" style="font-weight:bold; color:var(--th-dark);"><option value="ALL">🏘️ Semua Desa/Kelurahan</option></select><select id="flt-tpk-unsur" class="admin-input"><option value="ALL">🎓 Semua Unsur Kader</option><option value="BIDAN">Bidan / Tenaga Kesehatan</option><option value="PKK">Kader PKK</option><option value="KB">Kader KB</option></select><select id="flt-tpk-bpjs" class="admin-input"><option value="ALL">🏥 Status BPJSTK (Semua)</option><option value="YA">Memiliki BPJSTK</option><option value="TIDAK">Belum Memiliki</option></select></div></div>
                <div style="background:white; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05); overflow-x:auto; border:1px solid #e1e8ed;"><table class="admin-table"><thead><tr><th style="padding:12px; border-bottom:2px solid var(--th-accent);">No.</th><th style="padding:12px; border-bottom:2px solid var(--th-accent);">Nama Kader / L/P / No. Tim</th><th style="padding:12px; border-bottom:2px solid var(--th-accent);">Wilayah Tugas</th><th style="padding:12px; border-bottom:2px solid var(--th-accent); text-align:center;">Unsur TPK</th><th style="padding:12px; border-bottom:2px solid var(--th-accent); text-align:center;">BPJSTK</th><th style="padding:12px; border-bottom:2px solid var(--th-accent); text-align:center;">Penyalur MBG</th></tr></thead><tbody id="tbody-database-tpk"><tr><td colspan="6" style="padding:20px; text-align:center; color:#888;">⏳ Memproses data kader...</td></tr></tbody></table></div>
            </div>
        `;

        const masterKader = window.adminData.master_kader || []; const timWilayah = window.adminData.master_tim_wilayah || []; let dataKaderLokal = masterKader;
        if (roleUpper.includes('KECAMATAN') || roleUpper === 'ADMIN') { dataKaderLokal = masterKader.filter(k => String(k.kecamatan).toUpperCase() === String(window.adminSession.kecamatan).toUpperCase()); }
        if (roleUpper === 'ADMIN_DESA' || roleUpper.includes('PKB')) { const allowedDesa = String(window.adminSession.desa || '').toUpperCase().split(',').map(d => d.trim()); if (!allowedDesa.includes('ALL') && !allowedDesa.includes('-') && allowedDesa.length > 0 && allowedDesa[0] !== "") { dataKaderLokal = masterKader.filter(k => allowedDesa.includes(String(k.desa_kelurahan || k.desa).toUpperCase())); } else if (roleUpper.includes('PKB')) { dataKaderLokal = masterKader.filter(k => String(k.kecamatan).toUpperCase() === String(window.adminSession.kecamatan).toUpperCase()); } }

        const elKec = document.getElementById('flt-tpk-kec'); const elDesa = document.getElementById('flt-tpk-desa');
        if (elKec) { const listKec = [...new Set(dataKaderLokal.map(k => k.kecamatan).filter(Boolean))].sort(); elKec.innerHTML = '<option value="ALL">🌍 Semua Kecamatan</option>' + listKec.map(k => `<option value="${k}">${k}</option>`).join(''); if (!roleUpper.includes('KABUPATEN') && !roleUpper.includes('SUPER') && !roleUpper.includes('MITRA')) { elKec.value = window.adminSession.kecamatan; elKec.disabled = true; } }
        if (elDesa) { const listDesa = [...new Set(dataKaderLokal.map(k => k.desa_kelurahan || k.desa).filter(Boolean))].sort(); elDesa.innerHTML = '<option value="ALL">🏘️ Semua Desa/Kelurahan</option>' + listDesa.map(d => `<option value="${d}">${d}</option>`).join(''); if (roleUpper === 'ADMIN_DESA') { elDesa.value = window.adminSession.desa; elDesa.disabled = true; } }

        const renderTableKader = () => {
            const valKec = elKec ? elKec.value : 'ALL'; const valDesa = elDesa ? elDesa.value : 'ALL'; const valUnsur = document.getElementById('flt-tpk-unsur').value; const valBpjs = document.getElementById('flt-tpk-bpjs').value;
            let finalData = dataKaderLokal.filter(k => {
                let matchKec = valKec === 'ALL' || String(k.kecamatan).toUpperCase() === valKec.toUpperCase(); let matchDesa = valDesa === 'ALL' || String(k.desa_kelurahan || k.desa).toUpperCase() === valDesa.toUpperCase();
                let unsurKader = String(k.unsur_tpk || k.unsur || k.unsur_kader || '').toUpperCase(); let matchUnsur = valUnsur === 'ALL' || unsurKader.includes(valUnsur); if (valUnsur === 'BIDAN') matchUnsur = unsurKader.includes('BIDAN') || unsurKader.includes('NAKES');
                let statusBpjs = String(k.bpjs || k.status_bpjs || 'TIDAK').toUpperCase(); let matchBpjs = valBpjs === 'ALL' || (valBpjs === 'YA' ? statusBpjs === 'YA' : statusBpjs !== 'YA');
                return matchKec && matchDesa && matchUnsur && matchBpjs;
            });

            let statNakes=0, statPkk=0, statKb=0, statBpjs=0, statMbg=0;
            finalData.forEach(k => { let u = String(k.unsur_tpk || k.unsur || k.unsur_kader || '').toUpperCase(); if (u.includes('BIDAN') || u.includes('NAKES')) statNakes++; else if (u.includes('PKK')) statPkk++; else if (u.includes('KB')) statKb++; if (String(k.bpjs || k.status_bpjs).toUpperCase() === 'YA') statBpjs++; if (String(k.mbg || k.mengantar_mbg).toUpperCase() === 'YA') statMbg++; });

            document.getElementById('tpk-stats-container').innerHTML = `<div style="background:white; border-bottom:4px solid var(--th-main); padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05); text-align:center;"><div style="font-size:2rem; font-weight:900; color:var(--th-main);">${finalData.length}</div><div style="font-size:0.8rem; font-weight:bold; color:#666;">TOTAL KADER</div></div><div style="background:white; border-bottom:4px solid #198754; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05); text-align:center;"><div style="font-size:1.4rem; font-weight:900; color:#198754;">${statNakes} <span style="font-size:0.9rem; color:#666;">Bidan</span></div><div style="font-size:0.8rem; color:#666; font-weight:bold; margin-top:5px;">${statPkk} PKK | ${statKb} KB</div></div><div style="background:white; border-bottom:4px solid #fd7e14; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05); text-align:center;"><div style="font-size:2rem; font-weight:900; color:#fd7e14;">${statBpjs}</div><div style="font-size:0.8rem; font-weight:bold; color:#666;">PUNYA BPJSTK</div></div><div style="background:white; border-bottom:4px solid #6f42c1; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05); text-align:center;"><div style="font-size:2rem; font-weight:900; color:#6f42c1;">${statMbg}</div><div style="font-size:0.8rem; font-weight:bold; color:#666;">PENYALUR MBG</div></div>`;

            const tbody = document.getElementById('tbody-database-tpk');
            if (finalData.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="padding: 30px; text-align: center; color: #dc3545; font-weight:bold; font-size:1.1rem;">❌ Tidak ada data kader yang cocok dengan filter.</td></tr>'; } 
            else {
                tbody.innerHTML = finalData.map((k, idx) => {
                    let stBpjs = String(k.bpjs || k.status_bpjs).toUpperCase() === 'YA' ? '<span style="background:#e8f4fd; color:var(--th-main); padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold; border:1px solid #b6d4fe;">✅ Terdaftar</span>' : '<span style="background:#fdf3e8; color:#d35400; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold; border:1px solid #fadbd8;">❌ Belum</span>'; let stMbg = String(k.mbg || k.mengantar_mbg).toUpperCase() === 'YA' ? '<span style="background:#e2f0cb; color:#198754; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold; border:1px solid #c3e6cb;">🍲 Penyalur</span>' : '<span style="color:#aaa; font-size:0.8rem; font-weight:bold;">-</span>'; let un = String(k.unsur_tpk || k.unsur || k.unsur_kader || '').toUpperCase(); let badgeUnsur = (un.includes('BIDAN') || un.includes('NAKES')) ? '🏥 Nakes/Bidan' : (un.includes('PKK') ? '👩‍🌾 Kader PKK' : '🔵 Kader KB'); let jk = String(k.jenis_kelamin || '').toUpperCase(); let charJk = (jk === 'LK' || jk === 'LAKI-LAKI') ? 'L' : ((jk === 'PR' || jk === 'PEREMPUAN') ? 'P' : '-'); let myDusun = timWilayah.filter(tw => String(tw.id_tim) === String(k.id_tim)).map(tw => tw.dusun_rw).join(', '); if (!myDusun || myDusun.trim() === '') myDusun = '-';
                    return `<tr><td style="text-align:center; font-weight:bold; color:#666;">${idx + 1}</td><td><div style="font-weight:bold; color:var(--th-main); font-size:1.05rem;">${k.nama_kader || k.nama || '-'}</div><div style="font-size:0.8rem; color:#666; margin-top:4px;">JK: <b style="color:#0A2342;">${charJk}</b> | Tim: <b>${k.nomor_tim || k.id_tim || '-'}</b></div></td><td><div style="font-weight:bold; color:var(--th-dark); font-size:0.95rem;">Kec. ${k.kecamatan || '-'}</div><div style="font-size:0.8rem; color:#666; margin-top:2px;">Desa: <b>${k.desa_kelurahan || k.desa || '-'}</b></div><div style="font-size:0.8rem; color:#888; margin-top:2px;">Dusun: ${myDusun}</div></td><td style="text-align:center;"><span style="background:#f8f9fa; border:1px solid #ced4da; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold; color:#495057;">${badgeUnsur}</span></td><td style="text-align:center;">${stBpjs}</td><td style="text-align:center;">${stMbg}</td></tr>`;
                }).join('');
            }
        };

        ['flt-tpk-kec', 'flt-tpk-desa', 'flt-tpk-unsur', 'flt-tpk-bpjs'].forEach(id => { const el = document.getElementById(id); if(el) el.addEventListener('change', renderTableKader); });
        if (elKec && elDesa && !elKec.disabled) { elKec.addEventListener('change', () => { if(elKec.value === 'ALL') { const listDesa = [...new Set(dataKaderLokal.map(k => k.desa_kelurahan || k.desa).filter(Boolean))].sort(); elDesa.innerHTML = '<option value="ALL">🏘️ Semua Desa/Kelurahan</option>' + listDesa.map(d => `<option value="${d}">${d}</option>`).join(''); } else { const filterD = dataKaderLokal.filter(k => String(k.kecamatan).toUpperCase() === elKec.value.toUpperCase()); const listDesa = [...new Set(filterD.map(k => k.desa_kelurahan || k.desa).filter(Boolean))].sort(); elDesa.innerHTML = '<option value="ALL">🏘️ Semua Desa/Kelurahan</option>' + listDesa.map(d => `<option value="${d}">${d}</option>`).join(''); } renderTableKader(); }); }
        renderTableKader();
    }

    else if (target === 'sasaran') {
        const ditarik = await fetchRawDataIfNeeded();
        if(!ditarik) return;

        let filteredReg = window.adminData.registrasi; 
        if (window.currentFilterKec !== 'ALL') { filteredReg = filteredReg.filter(r => (r.sumber_kecamatan || '').toUpperCase() === window.currentFilterKec || (r.kecamatan || '').toUpperCase() === mapKecRev[window.currentFilterKec]); }
        if (window.currentFilterDesa !== 'ALL') { filteredReg = filteredReg.filter(r => (r.desa || '').toUpperCase() === window.currentFilterDesa); }

        content.innerHTML = `
            <div class="animate-fade">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;"><h2 style="margin:0; font-size:1.4rem; color:var(--th-dark); border-left:4px solid var(--th-accent); padding-left:10px;">📋 Database Sasaran</h2><button class="btn-action" style="background:var(--th-main); color:var(--th-text); border:1px solid var(--th-accent); border-radius:6px; padding:10px 15px; font-size:0.9rem;" onclick="window.exportCSV('sasaran')">📥 Download Excel (CSV)</button></div>
                ${filterWilayahHTML}
                <div style="background:white; padding:15px; border-radius:8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #e1e8ed;"><div style="display:flex; gap:10px; margin-bottom:15px; flex-wrap: wrap;"><input type="text" id="flt-sasaran-nama" class="admin-input" placeholder="Cari Nama/NIK/Desa..." style="flex:2; min-width: 200px;"><select id="flt-sasaran-jenis" class="admin-input" style="flex:1; min-width: 150px;"><option value="ALL">Semua Jenis</option><option value="CATIN">CATIN</option><option value="BUMIL">BUMIL</option><option value="BUFAS">BUFAS</option><option value="BADUTA">BADUTA</option></select></div><div style="overflow-x:auto;"><table class="admin-table"><thead><tr><th>ID Registrasi</th><th>Tgl Daftar</th><th>Jenis</th><th>Nama Sasaran</th><th>Desa / Dusun</th><th>Kader Pendata</th><th>Status</th></tr></thead><tbody id="tbody-sasaran"></tbody></table></div></div>
            </div>
        `;
        const renderTabelSasaran = () => {
            const filterNama = document.getElementById('flt-sasaran-nama').value.toLowerCase(); const filterJenis = document.getElementById('flt-sasaran-jenis').value; const tbody = document.getElementById('tbody-sasaran');
            const filtered = filteredReg.filter(r => { const matchNama = r.nama_sasaran.toLowerCase().includes(filterNama) || (r.id||'').toLowerCase().includes(filterNama) || (r.desa||'').toLowerCase().includes(filterNama); const matchJenis = filterJenis === 'ALL' || r.jenis_sasaran === filterJenis; return matchNama && matchJenis; }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); 
            if(filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#999;">Tidak ada data yang cocok.</td></tr>`; return; }
            tbody.innerHTML = filtered.map(r => { const tgl = new Date(r.created_at).toLocaleDateString('id-ID'); const namaKaderAsli = window.getKaderName(r.username); let statBadge = r.status_sasaran === 'SELESAI' ? `<span style="background:#f8f9fa; color:#6c757d; padding:3px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; border:1px solid #ddd;">SELESAI</span>` : `<span style="background:var(--th-light); color:var(--th-main); padding:3px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; border:1px solid var(--th-main);">AKTIF</span>`; if(r.status_duplikasi && r.status_duplikasi.includes('DUPLIKAT')) statBadge = `<span style="background:#fff3cd; color:#B8860B; padding:3px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; border:1px solid #ffeeba;">⚠️ DUPLIKAT</span>`; return `<tr style="border-bottom:1px solid #eee;"><td><code style="color:var(--th-dark); font-weight:bold;">${r.id}</code></td><td>${tgl}</td><td><b style="color:#B8860B;">${r.jenis_sasaran}</b></td><td style="color:var(--th-main); font-weight:bold;">${r.nama_sasaran}</td><td>${r.desa}<br><span style="font-size:0.75rem; color:#888;">${r.dusun}</span></td><td>${namaKaderAsli}</td><td>${statBadge}</td></tr>`; }).join('');
        };
        document.getElementById('flt-sasaran-nama').addEventListener('input', renderTabelSasaran); document.getElementById('flt-sasaran-jenis').addEventListener('change', renderTabelSasaran); renderTabelSasaran();
        const btnKec = document.getElementById('dash-flt-kec'); if (btnKec) btnKec.addEventListener('change', () => { window.currentFilterKec = btnKec.value; window.currentFilterDesa = 'ALL'; window.renderAdminView('sasaran'); }); const btnDesa = document.getElementById('dash-flt-desa'); if (btnDesa) btnDesa.addEventListener('change', () => { window.currentFilterDesa = btnDesa.value; window.renderAdminView('sasaran'); });
    }

    else if (target === 'pendampingan') {
        const ditarik = await fetchRawDataIfNeeded();
        if(!ditarik) return;

        let filteredPend = window.adminData.pendampingan;
        if (window.currentFilterKec !== 'ALL') { filteredPend = filteredPend.filter(p => (p.sumber_kecamatan || '').toUpperCase() === window.currentFilterKec || (p.kecamatan || '').toUpperCase() === mapKecRev[window.currentFilterKec]); }
        
        content.innerHTML = `
            <div class="animate-fade">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;"><h2 style="margin:0; font-size:1.4rem; color:var(--th-dark); border-left:4px solid var(--th-accent); padding-left:10px;">🤝 Riwayat Pendampingan</h2><button class="btn-action" style="background:var(--th-main); color:var(--th-text); border:1px solid var(--th-accent); border-radius:6px; padding:10px 15px; font-size:0.9rem;" onclick="window.exportCSV('pendampingan')">📥 Download Excel (CSV)</button></div>
                ${filterWilayahHTML}
                <div style="background:white; padding:15px; border-radius:8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #e1e8ed;"><div style="display:flex; gap:10px; margin-bottom:15px; flex-wrap: wrap;"><input type="text" id="flt-pend-nama" class="admin-input" placeholder="Cari ID Sasaran / Petugas..." style="flex:2; min-width: 200px;"></div><div style="overflow-x:auto;"><table class="admin-table"><thead><tr><th>Tgl Kunjungan</th><th>ID Sasaran (Target)</th><th>Kader Pelapor</th><th>Catatan Lapangan</th><th>Lokasi GPS</th></tr></thead><tbody id="tbody-pend"></tbody></table></div></div>
            </div>
        `;
        const renderTabelPend = () => {
            const filterNama = document.getElementById('flt-pend-nama').value.toLowerCase(); const tbody = document.getElementById('tbody-pend');
            const filtered = filteredPend.filter(p => { const matchNama = (p.id_sasaran_ref||'').toLowerCase().includes(filterNama) || (p.username||'').toLowerCase().includes(filterNama); return matchNama; }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
            if(filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">Tidak ada data laporan.</td></tr>`; return; }
            tbody.innerHTML = filtered.map(p => { let rData = {}; try { rData = JSON.parse(p.data_laporan || '{}'); } catch(e){} const tgl = rData.tgl_kunjungan ? new Date(rData.tgl_kunjungan).toLocaleDateString('id-ID') : new Date(p.created_at).toLocaleDateString('id-ID'); const cat = rData.catatan || '-'; const namaKaderAsli = window.getKaderName(p.username); let gpsStr = p.lokasi_gps && p.lokasi_gps !== '-' ? `<a href="https://maps.google.com/?q=${p.lokasi_gps}" target="_blank" style="color:var(--th-main); font-weight:bold; text-decoration:none; font-size:0.8rem;">🗺️ Cek Map</a>` : '<span style="color:#999; font-size:0.8rem;">Tidak Ada</span>'; return `<tr style="border-bottom:1px solid #eee;"><td><b style="color:#B8860B;">${tgl}</b></td><td><code style="color:var(--th-dark); font-weight:bold;">${p.id_sasaran_ref}</code></td><td>${namaKaderAsli}</td><td style="font-size:0.85rem; color:#444;">${cat}</td><td>${gpsStr}</td></tr>`; }).join('');
        };
        document.getElementById('flt-pend-nama').addEventListener('input', renderTabelPend); renderTabelPend();
        const btnKec = document.getElementById('dash-flt-kec'); if (btnKec) btnKec.addEventListener('change', () => { window.currentFilterKec = btnKec.value; window.currentFilterDesa = 'ALL'; window.renderAdminView('pendampingan'); }); const btnDesa = document.getElementById('dash-flt-desa'); if (btnDesa) btnDesa.addEventListener('change', () => { window.currentFilterDesa = btnDesa.value; window.renderAdminView('pendampingan'); });
    }

    else if (target === 'cetak_laporan') {
        const ditarik = await fetchRawDataIfNeeded();
        if(!ditarik) return;
        
        let filteredReg = window.adminData.registrasi; let filteredPend = window.adminData.pendampingan;
        if (window.currentFilterKec !== 'ALL') { filteredReg = filteredReg.filter(r => (r.sumber_kecamatan || '').toUpperCase() === window.currentFilterKec); const allowedIds = new Set(filteredReg.map(r => r.id)); filteredPend = filteredPend.filter(p => allowedIds.has(p.id_sasaran_ref)); }
        if (window.currentFilterDesa !== 'ALL') { filteredReg = filteredReg.filter(r => (r.desa || '').toUpperCase() === window.currentFilterDesa); const allowedIds = new Set(filteredReg.map(r => r.id)); filteredPend = filteredPend.filter(p => allowedIds.has(p.id_sasaran_ref)); }

        const blnNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']; const curDate = new Date(); const curRealMonth = curDate.getMonth() + 1; const curRealYear = curDate.getFullYear(); let maxMonth = parseInt(window.currentFilterTahun) === curRealYear ? curRealMonth : 12; if(parseInt(window.currentFilterTahun) > curRealYear) maxMonth = 12; let optBulan = ''; for(let i=1; i<=maxMonth; i++) { optBulan += `<option value="${i}" ${window.currentFilterBulan == i ? 'selected' : ''}>${blnNames[i-1]}</option>`; } const years = [2026, 2027, 2028, 2029, 2030]; let optTahun = years.map(y => `<option value="${y}" ${window.currentFilterTahun == y ? 'selected' : ''}>${y}</option>`).join('');
        content.innerHTML = `
            <style>@media print { body * { visibility: hidden; } #admin-sidebar, .admin-header, #filter-area-cetak { display: none !important; } #report-print-area, #report-print-area * { visibility: visible; color: black !important; } #report-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 10px; background: white; } #report-print-area table { width: 100%; border-collapse: collapse; } #report-print-area th, #report-print-area td { border: 1px solid black !important; } }</style>
            <div class="animate-fade">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;"><h2 style="margin:0; font-size:1.4rem; color:var(--th-dark); border-left:4px solid var(--th-accent); padding-left:10px;">🖨️ Cetak Laporan Kader</h2><div style="display:flex; gap:10px; flex-wrap: wrap;"><button class="btn-action" style="background:#e94560; color:white; border:none; border-radius:6px; padding:10px 15px; font-size:0.9rem; flex: 1; min-width: 150px;" onclick="window.print()">📄 Unduh PDF (Print)</button><button class="btn-action" style="background:#198754; color:white; border:none; border-radius:6px; padding:10px 15px; font-size:0.9rem; flex: 1; min-width: 150px;" onclick="exportTableToExcel('tabel-rekap-kader', 'Rekap_Kader_${window.currentFilterDesa}_${blnNames[window.currentFilterBulan-1]}')">📥 Unduh Excel (.xls)</button></div></div>
                <div id="filter-area-cetak" style="background: white; padding: 15px 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: flex; gap: 15px; align-items: center; border-left: 4px solid var(--th-main); flex-wrap: wrap;"><div style="font-size: 0.85rem; font-weight: bold; color: #666; white-space: nowrap;">📅 Filter Periode & Wilayah:</div><select id="dash-flt-bulan" class="admin-input" style="flex:1; min-width: 100px;">${optBulan}</select><select id="dash-flt-tahun" class="admin-input" style="flex:1; min-width: 80px;">${optTahun}</select><select id="dash-flt-kec" class="admin-input" style="flex:1; min-width: 120px;" ${isKabupaten ? '' : 'disabled'}>${optKec}</select><select id="dash-flt-desa" class="admin-input" style="flex:1; min-width: 120px;" ${roleUpper.includes('DESA') && String(window.adminSession.desa).indexOf(',') === -1 ? 'disabled' : ''}>${optDesa}</select></div>
                <div style="background:white; padding:20px; border-radius:8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #e1e8ed; overflow-x:auto;"><div id="report-print-area" style="min-width: 800px;"><div style="text-align:center; font-weight:bold; font-size:1.2rem; margin-bottom:20px; color:black;">REKAP HASIL PENDAMPINGAN KADER TPK</div><table style="width: 100%; margin-bottom: 20px; border: none; font-size: 0.9rem; color:black;"><tr><td style="width: 120px; border: none !important; font-weight:bold; padding:2px;">DESA</td><td style="border: none !important; font-weight:bold; padding:2px;">: <span id="r-desa"></span></td></tr><tr><td style="border: none !important; font-weight:bold; padding:2px;">KECAMATAN</td><td style="border: none !important; font-weight:bold; padding:2px;">: <span id="r-kec"></span></td></tr><tr><td style="border: none !important; font-weight:bold; padding:2px;">BULAN</td><td style="border: none !important; font-weight:bold; padding:2px;">: <span id="r-bulan"></span></td></tr></table><table id="tabel-rekap-kader" style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: center; color:black; margin-bottom: 30px;" border="1"><thead><tr><th rowspan="2" style="border: 1px solid black; padding: 8px;">NO</th><th rowspan="2" style="border: 1px solid black; padding: 8px;">NAMA KADER</th><th colspan="4" style="border: 1px solid black; padding: 8px;">JUMLAH SASARAN</th><th colspan="4" style="border: 1px solid black; padding: 8px;">JUMLAH PENDAMPINGAN</th><th rowspan="2" style="border: 1px solid black; padding: 8px;">TOTAL JUMLAH<br>PENDAMPINGAN</th></tr><tr><th style="border: 1px solid black; padding: 5px;">CATIN</th><th style="border: 1px solid black; padding: 5px;">BUMIL</th><th style="border: 1px solid black; padding: 5px;">BUFAS</th><th style="border: 1px solid black; padding: 5px;">BADUTA</th><th style="border: 1px solid black; padding: 5px;">CATIN</th><th style="border: 1px solid black; padding: 5px;">BUMIL</th><th style="border: 1px solid black; padding: 5px;">BUFAS</th><th style="border: 1px solid black; padding: 5px;">BADUTA</th></tr></thead><tbody id="r-tbody"></tbody></table><div style="display:flex; justify-content:flex-end; padding-right:30px; text-align:center; font-size:0.9rem; color:black;"><div style="width: 250px;"><div id="r-tgl-ttd" style="margin-bottom: 5px;">Singaraja, </div><div style="margin-bottom: 60px;">Mengetahui,<br>PKB Pengampu</div><div id="r-nama-pkb" style="font-weight:bold; text-decoration:underline; white-space: nowrap; overflow: visible;">(Nama PKB)</div><div id="r-nip-pkb" style="white-space: nowrap;">NIP. .........................</div></div></div></div></div>
            </div>
        `;
        const renderReport = async () => {
            const m = parseInt(window.currentFilterBulan); const y = parseInt(window.currentFilterTahun); const d = window.currentFilterDesa; const k = window.currentFilterKec;
            document.getElementById('r-desa').innerText = d === 'ALL' ? 'SEMUA DESA' : d; document.getElementById('r-kec').innerText = k === 'ALL' ? 'SEMUA KECAMATAN' : (mapKecRev[k] || k); document.getElementById('r-bulan').innerText = `${blnNames[m-1]} ${y}`;
            let regTarget = filteredReg.filter(r => { return true; }); let pendTarget = filteredPend.filter(p => { let rData = {}; try { rData = JSON.parse(p.data_laporan || '{}'); } catch(e){} const dt = rData.tgl_kunjungan ? new Date(rData.tgl_kunjungan) : new Date(p.created_at); return dt.getMonth() + 1 === m && dt.getFullYear() === y; });
            const kaderMap = {};
            regTarget.forEach(r => { let u = r.username; if(!kaderMap[u]) kaderMap[u] = { sCat:0, sBum:0, sBuf:0, sBad:0, pCat:0, pBum:0, pBuf:0, pBad:0 }; if (r.status_sasaran !== 'SELESAI') { if (r.jenis_sasaran === 'CATIN') kaderMap[u].sCat++; else if (r.jenis_sasaran === 'BUMIL') kaderMap[u].sBum++; else if (r.jenis_sasaran === 'BUFAS') kaderMap[u].sBuf++; else if (r.jenis_sasaran === 'BADUTA') kaderMap[u].sBad++; } });
            pendTarget.forEach(p => { let u = p.username; if(!kaderMap[u]) kaderMap[u] = { sCat:0, sBum:0, sBuf:0, sBad:0, pCat:0, pBum:0, pBuf:0, pBad:0 }; let jns = p.id_sasaran_ref.substring(0,3); if (jns === 'CTN') kaderMap[u].pCat++; else if (jns === 'BML') kaderMap[u].pBum++; else if (jns === 'BFS') kaderMap[u].pBuf++; else if (jns === 'BDT') kaderMap[u].pBad++; });
            const tbody = document.getElementById('r-tbody'); let rowsHtml = ''; let idx = 1;
            for (const [username, data] of Object.entries(kaderMap)) { if(data.sCat===0 && data.sBum===0 && data.sBuf===0 && data.sBad===0 && data.pCat===0 && data.pBum===0 && data.pBuf===0 && data.pBad===0) continue; let kaderName = window.getKaderName(username); const totalPend = data.pCat + data.pBum + data.pBuf + data.pBad; rowsHtml += `<tr><td style="border: 1px solid black; padding: 5px;">${idx++}</td><td style="border: 1px solid black; padding: 5px; text-align:left;">${kaderName}</td><td style="border: 1px solid black; padding: 5px;">${data.sCat || 0}</td><td style="border: 1px solid black; padding: 5px;">${data.sBum || 0}</td><td style="border: 1px solid black; padding: 5px;">${data.sBuf || 0}</td><td style="border: 1px solid black; padding: 5px;">${data.sBad || 0}</td><td style="border: 1px solid black; padding: 5px;">${data.pCat || 0}</td><td style="border: 1px solid black; padding: 5px;">${data.pBum || 0}</td><td style="border: 1px solid black; padding: 5px;">${data.pBuf || 0}</td><td style="border: 1px solid black; padding: 5px;">${data.pBad || 0}</td><td style="border: 1px solid black; padding: 5px; font-weight:bold;">${totalPend || 0}</td></tr>`; }
            if (rowsHtml === '') { rowsHtml = `<tr><td colspan="11" style="border: 1px solid black; padding: 15px; text-align:center;">Tidak ada aktivitas kader pada periode ini.</td></tr>`; } tbody.innerHTML = rowsHtml;
            const lastDay = new Date(y, m, 0).getDate(); document.getElementById('r-tgl-ttd').innerText = `Singaraja, ${lastDay} ${blnNames[m-1]} ${y}`;
            const allPkb = window.adminData.master_pkb || []; let pkbName = '(Nama PKB Pengampu)'; let pkbNip = 'NIP ......................................';
            if (roleUpper.includes('PKB')) { const myPkb = allPkb.find(p => String(p.id) === String(window.adminSession.username) || String(p.id_pkb) === String(window.adminSession.username) || String(p.username) === String(window.adminSession.username)); if(myPkb) { pkbName = myPkb.nama_pkb || myPkb.nama || window.adminSession.nama; pkbNip = 'NIP. ' + (myPkb.nip_pkb || myPkb.nip || '....................'); } else { pkbName = window.adminSession.nama; pkbNip = 'NIP. ' + (window.adminSession.ref_id || '....................'); } } else { if (d !== 'ALL') { const foundPkb = allPkb.find(p => String(p.desa_kelurahan || p.desa || '').toUpperCase().includes(d)); if (foundPkb) { pkbName = foundPkb.nama_pkb || foundPkb.nama || pkbName; pkbNip = 'NIP. ' + (foundPkb.nip_pkb || foundPkb.nip || '....................'); } } }
            document.getElementById('r-nama-pkb').innerText = pkbName; document.getElementById('r-nip-pkb').innerText = pkbNip;
        };
        document.getElementById('dash-flt-bulan').addEventListener('change', (e) => { window.currentFilterBulan = e.target.value; window.renderAdminView('cetak_laporan'); }); document.getElementById('dash-flt-tahun').addEventListener('change', (e) => { window.currentFilterTahun = e.target.value; window.renderAdminView('cetak_laporan'); });
        const btnKec = document.getElementById('dash-flt-kec'); if (btnKec) btnKec.addEventListener('change', () => { window.currentFilterKec = btnKec.value; window.currentFilterDesa = 'ALL'; window.renderAdminView('cetak_laporan'); }); const btnDesa = document.getElementById('dash-flt-desa'); if (btnDesa) btnDesa.addEventListener('change', () => { window.currentFilterDesa = btnDesa.value; window.renderAdminView('cetak_laporan'); }); 
        renderReport();
    }

    else {
        content.innerHTML = `<div class="animate-fade" style="text-align:center; padding: 50px;"><div style="font-size: 4rem; margin-bottom: 15px;">🚧</div><h2 style="color: var(--th-dark); margin-bottom: 10px;">Fitur Sedang Dibangun</h2><p style="color: #666;">Halaman untuk <b>${target}</b> saat ini belum tersedia di panel Supervisor.</p></div>`;
    }
};

export const initAdmin = async (session) => {
    window.adminSession = session; const th = getRoleTheme(session.role); const roleUpper = String(session.role).toUpperCase();
    if(roleUpper.includes('KABUPATEN') || roleUpper.includes('SUPER') || roleUpper.includes('MITRA')) { window.currentFilterKec = 'ALL'; } 
    else { const mapKec = { 'GEROKGAK': 'GRK', 'SERIRIT': 'SRT', 'BUSUNGBIU': 'BSB', 'BANJAR': 'BJR', 'SUKASADA': 'SKS', 'BULELENG': 'BLL', 'SAWAN': 'SWN', 'KUBUTAMBAHAN': 'KBT', 'TEJAKULA': 'TJK' }; window.currentFilterKec = mapKec[String(session.kecamatan).toUpperCase()] || String(session.kecamatan).toUpperCase(); }
    window.currentFilterDesa = 'ALL'; const displayKecamatan = String(session.kecamatan || '').toUpperCase() === 'ALL' ? 'KABUPATEN BULELENG' : session.kecamatan;

    document.body.innerHTML = `
        <div id="admin-root" style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; background:#eef2f5; font-family: 'Segoe UI', sans-serif; overflow: hidden;">
            <style>
                :root { --th-main: ${th.main}; --th-dark: ${th.dark}; --th-light: ${th.light}; --th-accent: ${th.accent}; --th-text: ${th.text}; --th-icon: ${th.icon}; --th-btn-text: ${th.btnText}; }
                #admin-sidebar { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 1000; position: relative; }
                .sidebar-backdrop { display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 999; opacity: 0; transition: opacity 0.3s; }
                #btn-mobile-menu { display: none; background: transparent; border: none; color: var(--th-dark); font-size: 1.8rem; cursor: pointer; padding: 0 15px 0 0; }
                @media (max-width: 768px) { #admin-sidebar { position: fixed; height: 100%; transform: translateX(-100%); } #admin-sidebar.active { transform: translateX(0); } .sidebar-backdrop.active { display: block; opacity: 1; } #btn-mobile-menu { display: block; } }
                .admin-menu-item { padding: 14px 25px; color: var(--th-light); font-weight: 600; cursor: pointer; transition: all 0.2s; border-left: 4px solid transparent; font-size: 0.95rem; display:block; } 
                .admin-menu-item:hover { background: rgba(255,255,255, 0.1); color: var(--th-icon); } 
                .admin-menu-item.active { background: rgba(255,255,255, 0.2); color: var(--th-icon); border-left: 4px solid var(--th-accent); } 
                .sub-menu-item { cursor: pointer; color: var(--th-light); font-weight: 500; transition: all 0.2s; border-bottom:1px solid rgba(255,255,255,0.05); padding: 10px 25px; display:block; }
                .sub-menu-item:hover { background: rgba(255,255,255, 0.1); color: var(--th-accent); }
                .sub-menu-item.active { background: rgba(255,255,255, 0.1); color: var(--th-accent); font-weight: bold; }
                #btn-admin-logout:hover { background: var(--th-accent); color: var(--th-btn-text); }
                .admin-input { padding:10px 12px; border:1px solid #ced4da; border-radius:6px; outline:none; font-family:inherit; } .admin-input:focus { border-color:var(--th-main); box-shadow: 0 0 0 2px rgba(0,0,0, 0.1); }
                .btn-action:hover { opacity: 0.8; transform:translateY(-1px); }
                .admin-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; min-width: 800px; } .admin-table th { position: sticky; top: 0; background: var(--th-dark); color: white; padding: 12px; text-align: left; font-weight:600; border-bottom: 3px solid var(--th-accent); } .admin-table td { padding: 12px; vertical-align: middle; } .admin-table tr:hover td { background: #fcf8ff; }
            </style>
            <div id="sidebar-backdrop" class="sidebar-backdrop"></div>
            <div id="admin-sidebar" style="width:260px; background: linear-gradient(180deg, var(--th-dark) 0%, var(--th-main) 100%); color:var(--th-text); display:flex; flex-direction:column; box-shadow: 2px 0 10px rgba(0,0,0,0.15); flex-shrink: 0;">
                <div style="padding: 25px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align:center;"><div style="font-size: 2.5rem; margin-bottom: 5px;">📡</div><h3 style="margin:0; font-weight:900; line-height:1.2; color:var(--th-accent); letter-spacing:1px;">MONITORING TPK</h3><div style="font-size:0.75rem; color:var(--th-text); font-weight:bold; margin-top:5px; opacity:0.9;">PANEL SUPERVISOR</div></div>
                <div style="flex:1; padding: 10px 0; overflow-y:auto;" id="admin-menu-container"><div style="text-align:center; padding:20px; opacity:0.7;">⏳ Menyusun menu...</div></div>
                <div style="padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);"><div style="font-size:0.8rem; margin-bottom:10px; color:var(--th-text);">Supervisor:<br><b style="color:var(--th-accent); font-size:0.95rem;">${session.nama}</b><br><span style="font-size:0.75rem; opacity:0.8;">${displayKecamatan}</span></div><button id="btn-admin-logout" style="width:100%; background:transparent; color:var(--th-accent); border:1px solid var(--th-accent); padding:10px; border-radius:6px; cursor:pointer; font-weight:bold; transition: all 0.3s;">🔒 Keluar Sistem</button></div>
            </div>
            <div style="flex:1; display:flex; flex-direction:column; overflow:hidden; width:100%;">
                <div class="admin-header" style="background:white; padding: 15px 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); z-index:5; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e1e8ed;"><div style="display:flex; align-items:center;"><button id="btn-mobile-menu">☰</button><h2 id="admin-page-title" style="margin:0; font-size:1.3rem; color:var(--th-dark); font-weight:800;">Memuat Data...</h2></div><button id="btn-admin-refresh" style="background:var(--th-accent); color:var(--th-btn-text); border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.85rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">🔄 Segarkan Data</button></div>
                <div id="admin-content" style="flex:1; padding: 25px; overflow-y:auto; background:#eef2f5;"><div style="padding:50px; text-align:center; color:var(--th-main);"><h3>⏳ Menyedot Ringkasan Data...</h3><p>Mempersiapkan dashboard kilat. Harap tunggu...</p></div></div>
            </div>
        </div>
    `;

    const sidebar = document.getElementById('admin-sidebar'); const backdrop = document.getElementById('sidebar-backdrop'); const btnMenu = document.getElementById('btn-mobile-menu');
    const toggleMenu = () => { sidebar.classList.toggle('active'); backdrop.classList.toggle('active'); }; btnMenu.addEventListener('click', toggleMenu); backdrop.addEventListener('click', toggleMenu);
    document.getElementById('btn-admin-logout').onclick = async () => { if(confirm("🚪 Yakin ingin Keluar Aplikasi?")) { await clearStore('kader_session'); location.reload(); } };
    
    window.handleAuthError = async (res) => { if (res && res.status === 'error' && String(res.message).includes('401')) { alert(res.message + "\n\nSistem akan mengeluarkan Anda untuk keamanan."); await clearStore('kader_session'); location.reload(); return true; } return false; };

    const attachMenuListeners = () => {
        const menuItems = document.querySelectorAll('.admin-menu-item[data-target], .sub-menu-item[data-target]');
        menuItems.forEach(item => { 
            item.onclick = async (e) => { 
                e.stopPropagation(); const activeTarget = item.getAttribute('data-target');
                if (activeTarget === 'reload_app') { if (confirm("🔄 TARIK PEMBARUAN SISTEM?\n\nSistem akan dimuat ulang ke versi terbaru.\n\nLanjutkan?")) { try { if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); for (let r of regs) { await r.unregister(); } } if (window.caches) { const keys = await caches.keys(); for (let k of keys) { await caches.delete(k); } } alert("✅ Memori sistem berhasil dibersihkan! Memuat versi terbaru..."); window.location.reload(true); } catch (e) { window.location.reload(true); } } return; }
                document.querySelectorAll('.admin-menu-item, .sub-menu-item').forEach(m => m.classList.remove('active')); item.classList.add('active'); document.getElementById('admin-page-title').innerText = item.innerText.replace('▼', '').replace(/[^\w\s]/gi, '').trim(); 
                window.renderAdminView(activeTarget); 
                if(window.innerWidth <= 768) { sidebar.classList.remove('active'); backdrop.classList.remove('active'); }
            }; 
        });
    };

    const buildDynamicMenus = () => {
        try {
            const allMenu = window.adminData.master_menu || [];
            let filteredMenu = allMenu.filter(m => { const roles = String(m.role_akses || '').toUpperCase(); const isActive = String(m.is_active || 'Y').toUpperCase() === 'Y'; return isActive && roles.includes(roleUpper); }).sort((a,b) => (parseInt(a.urutan)||0) - (parseInt(b.urutan)||0));
            if (filteredMenu.length === 0) { filteredMenu = [ { id_menu: 'M1', label_menu: 'Dashboard', icon: '📊', target_view: 'dashboard' }, { id_menu: 'M2', label_menu: 'Database Sasaran', icon: '📋', target_view: 'sasaran' }, { id_menu: 'M3', label_menu: 'Riwayat Pendampingan', icon: '🤝', target_view: 'pendampingan' }, { id_menu: 'M4', label_menu: 'Database Kader TPK', icon: '👥', target_view: 'database_tpk' }, { id_menu: 'M5', label_menu: 'Cetak Laporan', icon: '🖨️', target_view: 'cetak_laporan' }, { id_menu: 'M6', label_menu: 'Update Sistem', icon: '🔄', target_view: 'reload_app' } ]; }
            const parents = filteredMenu.filter(m => !m.parent_id); const children = filteredMenu.filter(m => m.parent_id); let menuHtml = '';
            parents.forEach(p => {
                const myChildren = children.filter(c => c.parent_id === p.id_menu).sort((a,b) => (parseInt(a.urutan)||0) - (parseInt(b.urutan)||0));
                if(myChildren.length > 0) { menuHtml += `<div style="margin-bottom: 2px;"><a class="admin-menu-item" style="display:flex; justify-content:space-between; align-items:center;" onclick="var c = this.nextElementSibling; if(c.style.display==='none'){c.style.display='block'; this.style.background='rgba(255,255,255,0.05)';}else{c.style.display='none'; this.style.background='';}"><span>${p.icon || '📁'} ${p.label_menu}</span><span style="font-size:0.7rem; opacity:0.6;">▼</span></a><div style="display:none; background: rgba(0,0,0,0.15); border-left: 3px solid var(--th-accent);">${myChildren.map(c => `<div class="sub-menu-item" data-target="${c.target_view}">${c.icon || '📄'} ${c.label_menu}</div>`).join('')}</div></div>`; } 
                else { let textColor = p.target_view === 'reload_app' ? 'color:var(--th-accent); margin-top:10px; border-top: 1px solid rgba(255,255,255,0.1);' : ''; menuHtml += `<div class="admin-menu-item" data-target="${p.target_view}" style="${textColor}">${p.icon || '📌'} ${p.label_menu}</div>`; }
            });
            const container = document.getElementById('admin-menu-container'); if(container) { container.innerHTML = menuHtml; attachMenuListeners(); }
        } catch(e) { console.error("Menu Builder Error", e); }
    };

    document.getElementById('btn-admin-refresh').onclick = async () => {
        const btn = document.getElementById('btn-admin-refresh'); btn.innerText = "⏳ Menyedot..."; btn.disabled = true;
        window.adminData.registrasi = []; window.adminData.pendampingan = [];
        const success = await fetchDashboardSummary();
        if(success) { buildDynamicMenus(); const activeMenuEl = document.querySelector('.admin-menu-item.active, .sub-menu-item.active'); if(activeMenuEl) window.renderAdminView(activeMenuEl.getAttribute('data-target')); else window.renderAdminView('dashboard'); } else { alert("Gagal menyegarkan data. Periksa koneksi internet."); }
        btn.innerText = "🔄 Segarkan Data"; btn.disabled = false;
    };

    const success = await fetchDashboardSummary();
    if(success) {
        buildDynamicMenus(); document.getElementById('admin-page-title').innerText = 'Dashboard Pemantauan'; window.renderAdminView('dashboard');
        const mDash = document.querySelector('.admin-menu-item[data-target="dashboard"]'); if(mDash) mDash.classList.add('active');
    } else {
        document.getElementById('admin-content').innerHTML = `<div style="padding:50px; text-align:center; color:#e94560;"><h3>❌ Gagal Terhubung ke Satelit</h3><p>Pastikan Anda memiliki koneksi internet yang stabil, lalu klik 'Segarkan Data'.</p></div>`; document.getElementById('admin-page-title').innerText = 'Koneksi Terputus';
    }
};
// === AKHIR DARI KODE ===
