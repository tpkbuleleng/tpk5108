        function renderInfoKader(nama, idKader, kodeTim, desa, kec, nomorTim = '', namaWilayahLengkap = '', wilkerDusun = '') {
            const timTampil = normalisasiTeks(nomorTim || kodeTim || '-');
            const lokasiTampil = normalisasiTeks(namaWilayahLengkap || ((desa && kec) ? `Desa ${desa}, Kec. ${kec}` : 'Wilayah belum diatur'));
            const dusunTampil = normalisasiTeks(wilkerDusun);
            const dusunHtml = dusunTampil
                ? `<br><span style="font-size: 12px; color: #4a5f75; display: inline-block; margin-top: 4px;">Dusun/RW: ${dusunTampil}</span>`
                : '';
            document.getElementById('kader-info-display').innerHTML =
                `<span style="font-size: 16px; color: var(--primary-blue); font-weight:800;">${nama}</span><br>Tim: ${timTampil}<br><span style="font-size: 13px; color: #555; display: inline-block; margin-top: 5px; background: #eef7ff; padding: 2px 8px; border-radius: 4px; border: 1px solid #b3d7ff;">${lokasiTampil}</span>${dusunHtml}`;
        }

        function renderInfoAdmin(nama, idUser, role, kec) {
            document.getElementById('admin-info-display').innerHTML =
                `<span style="font-size: 16px; color: var(--primary-blue); font-weight:800;">${nama}</span><br>${idUser} | ${role}<br><span style="font-size: 13px; color: #555; display: inline-block; margin-top: 5px; background: #eef7ff; padding: 2px 8px; border-radius: 4px; border: 1px solid #b3d7ff;">Kecamatan ${kec || '-'}</span>`;
        }

        function renderAdminMenu(role) {
            const menu = ROLE_MENU[role] || [];
            document.getElementById('admin-menu-grid').innerHTML = menu.map(item => {
                const safeItem = item.replace(/'/g, '');
                const deskripsi = ADMIN_MENU_META[item] || 'Akses fitur administrasi kecamatan.';
                return `
                    <button class="menu-btn admin-menu-btn" type="button" onclick="handleAdminMenuClick('${safeItem}')">
                        <span class="admin-menu-main">${item}</span>
                        <span class="admin-menu-sub">${deskripsi}</span>
                        <span class="admin-menu-arrow">></span>
                    </button>
                `;
            }).join('') || "<p style='text-align:center;color:#666;'>Menu admin belum tersedia.</p>";
            if ((role || '').startsWith('ADMIN')) setTimeout(() => { hydrateAdminKatalogFromMasterWilayah(false); }, 10);
        }

        function handleAdminMenuClick(namaMenu) {
            if (namaMenu === 'Dashboard Kecamatan') return bukaAdminDashboard();
            if (namaMenu === 'Rekap Sasaran per Kader') return bukaAdminRekapSasaranPerKader();
            if (namaMenu === 'Rekap Sasaran per Desa') return bukaAdminRekapSasaranPerDesa();
            if (namaMenu === 'Rekap Pendampingan per Kader') return bukaAdminRekapPendampinganPerKader();
            if (namaMenu === 'Rekap Pendampingan per Desa') return bukaAdminRekapPendampinganPerDesa();
            if (namaMenu === 'Daftar Hadir Pendampingan Kader TPK Kecamatan') return bukaAdminDaftarHadirPendampingan();
            if (namaMenu === 'Reset Password Kader') return bukaAdminResetPasswordKader();
            if (namaMenu === 'Cetak Laporan') return cetakLaporanAdmin();
            if (namaMenu === 'Ganti Password') return bukaAdminGantiPassword();
            return tampilkanNotifAdmin(`Fitur \"${namaMenu}\" belum tersedia.`, 'notif-warning');
        }

        function tampilkanNotifAdmin(msg, cls) {
            const n = document.getElementById('notif-box-admin');
            n.innerText = msg;
            n.className = `notif ${cls}`;
            n.classList.remove('hidden');
            setTimeout(() => n.classList.add('hidden'), 3500);
        }

        function renderAdminSummaryCard() {
            const target = document.getElementById('admin-summary-text');
            if (!target) return;
            if (getRoleAktif().startsWith('ADMIN')) hydrateAdminKatalogFromMasterWilayah(false);
            if (!db) {
                target.innerText = 'Menunggu database lokal siap...';
                return;
            }
            bacaDataAdmin(({ sasaran, laporan, kecamatan }) => {
                const aktif = sasaran.filter(s => s.status_aktif === 'AKTIF').length;
                const bulanIni = NAMA_BULAN[new Date().getMonth()];
                const laporanBulanIni = laporan.filter(l => l.bulan === bulanIni).length;
                const mode = getAdminSumberFilter();
                const sourceControl = buildAdminSumberFilterControl('onAdminSumberFilterChange', 'admin-sumber-filter-menu');
                const sourceBlock = sourceControl
                    ? `<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">${sourceControl}<span style="font-size:12px; color:#5f748a;">Mode aktif: <b>${mode}</b></span></div>`
                    : `<div style="font-size:12px; color:#5f748a;">Mode aktif: <b>${mode}</b></div>`;
                target.innerHTML = `
                    <div style="margin-bottom:8px;">Kecamatan: <b>${kecamatan || '-'}</b></div>
                    <div style="margin-bottom:8px;">Total sasaran: <b>${sasaran.length}</b> (${aktif} aktif)</div>
                    <div style="margin-bottom:10px;">Laporan bulan ${bulanIni}: <b>${laporanBulanIni}</b></div>
                    ${sourceBlock}
                `;
            });
        }

        function fiturAdminBelumTersedia(namaFitur) {
            tampilkanNotifAdmin(`Fitur \"${namaFitur}\" sedang disiapkan.`, 'notif-warning');
        }

        function bukaAdminReportScreen(title, html) {
            document.getElementById('admin-report-title').innerText = title;
            const sourceControl = buildAdminSumberFilterControl('onAdminSumberFilterChange', 'admin-sumber-filter-report');
            const toolbarInner = sourceControl
                ? `<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    ${sourceControl}
                    <span style="font-size:12px; color:#5f748a;">Filter ini berlaku untuk seluruh dashboard/rekap admin.</span>
                </div>`
                : `<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <span style="font-size:12px; color:#5f748a;">Mode data admin terkunci: <b>RIIL</b>.</span>
                </div>`;
            document.getElementById('admin-report-toolbar').innerHTML = `
                ${toolbarInner}
            `;
            document.getElementById('admin-report-content').innerHTML = html;
            openScreen('admin-report-screen');
        }

        function bacaDataAdmin(callback) {
            if (!db) return tampilkanNotifAdmin('Database lokal belum siap.', 'notif-warning');
            const kec = getKecamatanAktif();
            const tx = db.transaction(['sasaran', 'laporan'], 'readonly');
            const reqS = tx.objectStore('sasaran').getAll();
            const reqL = tx.objectStore('laporan').getAll();
            tx.oncomplete = () => {
                const sasaranRaw = (reqS.result || []).filter(x => isKecamatanMatch(x.kecamatan, kec));
                const laporanRaw = (reqL.result || []).filter(x => isKecamatanMatch(x.kecamatan, kec));
                const sasaran = applyAdminCutoverDateFilter(applyAdminSumberFilter(sasaranRaw));
                const laporan = applyAdminCutoverDateFilter(applyAdminSumberFilter(laporanRaw));
                callback({ sasaran, laporan, kecamatan: kec, sumber_filter: getAdminSumberFilter() });
            };
            tx.onerror = () => tampilkanNotifAdmin('Gagal membaca data lokal.', 'notif-warning');
        }

        function renderGroupList(items, keyLabel, valLabel, emptyMessage) {
            if (!items.length) return `<p style='text-align:center;color:#777;font-size:14px;'>${emptyMessage}</p>`;
            const rows = items.map((it, idx) =>
                `<tr><td>${idx + 1}</td><td>${it.key}</td><td style="text-align:right;"><b>${it.value}</b></td></tr>`
            ).join('');
            return `
                <div style="overflow:auto;">
                    <table class="admin-table">
                        <thead><tr><th>No</th><th>${keyLabel}</th><th>${valLabel}</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        }

        function buildGroupCount(data, keyFn) {
            const map = {};
            data.forEach(item => {
                const key = normalisasiTeks(keyFn(item)) || '-';
                map[key] = (map[key] || 0) + 1;
            });
            return Object.keys(map).map(k => ({ key: k, value: map[k] })).sort((a, b) => b.value - a.value);
        }

        function namaKader(idKader) {
            return dataAkunKader[idKader]?.nama || idKader || '-';
        }

        function getKaderIdsBySourceFilter(kecamatan) {
            const mode = getAdminSumberFilter();
            return Object.keys(dataAkunKader || {}).filter((id) => {
                const akun = dataAkunKader[id] || {};
                if (normalisasiTeks(akun.role).toUpperCase() !== 'KADER') return false;
                if (!isKecamatanMatch(akun.kec, kecamatan)) return false;
                const sumber = tentukanSumberData(id);
                return mode === 'ALL' ? true : sumber === mode;
            });
        }

        function getPeriodeBulanList() {
            const now = new Date();
            const list = [];
            const seen = {};
            for (let i = 0; i < 12; i += 1) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const bulan = NAMA_BULAN[d.getMonth()];
                if (!seen[bulan]) {
                    list.push(bulan);
                    seen[bulan] = true;
                }
            }
            return list;
        }

        function resolveBulanLaporan(item) {
            const bulan = normalisasiTeks(item?.bulan);
            if (bulan && NAMA_BULAN.includes(bulan)) return bulan;
            const tanggal = normalisasiTeks(item?.tanggal);
            if (/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
                const dt = new Date(`${tanggal}T00:00:00`);
                if (!Number.isNaN(dt.getTime())) return NAMA_BULAN[dt.getMonth()];
            }
            return '';
        }

        function buildPeriodeOptions(selectedBulan) {
            return getPeriodeBulanList().map(bulan =>
                `<option value="${bulan}" ${bulan === selectedBulan ? 'selected' : ''}>${bulan}</option>`
            ).join('');
        }

        function getPeriodeBulanTahunList() {
            const now = new Date();
            const list = [];
            for (let i = 0; i < 12; i += 1) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const bulan = NAMA_BULAN[d.getMonth()];
                const tahun = d.getFullYear();
                const value = `${bulan}|${tahun}`;
                list.push({ bulan, tahun, value, label: `${bulan} ${tahun}` });
            }
            return list;
        }

        function parsePeriodeBulanTahun(value) {
            const fallback = new Date();
            const parts = normalisasiTeks(value).split('|');
            const bulan = NAMA_BULAN.includes(parts[0]) ? parts[0] : NAMA_BULAN[fallback.getMonth()];
            const tahun = Number.parseInt(parts[1], 10) || fallback.getFullYear();
            return { bulan, tahun, value: `${bulan}|${tahun}` };
        }

        function buildPeriodeBulanTahunOptions(selectedValue) {
            return getPeriodeBulanTahunList().map(item =>
                `<option value="${item.value}" ${item.value === selectedValue ? 'selected' : ''}>${item.label}</option>`
            ).join('');
        }

        function resolveTahunLaporan(item) {
            const tanggal = normalisasiTeks(item?.tanggal);
            if (/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return Number.parseInt(tanggal.slice(0, 4), 10);
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(tanggal)) return Number.parseInt(tanggal.slice(6, 10), 10);
            return null;
        }

        function renderAdminReportLive(title, html) {
            document.getElementById('admin-report-title').innerText = title;
            const toolbar = document.getElementById('admin-report-toolbar');
            if (toolbar) {
                const sourceControl = buildAdminSumberFilterControl('onAdminSumberFilterChange', 'admin-sumber-filter-report');
                const toolbarInner = sourceControl
                    ? `<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                        ${sourceControl}
                        <span style="font-size:12px; color:#5f748a;">Filter ini berlaku untuk seluruh dashboard/rekap admin.</span>
                    </div>`
                    : `<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                        <span style="font-size:12px; color:#5f748a;">Mode data admin terkunci: <b>RIIL</b>.</span>
                    </div>`;
                toolbar.innerHTML = `
                    ${toolbarInner}
                `;
            }
            document.getElementById('admin-report-content').innerHTML = html;
            openScreen('admin-report-screen');
        }

        async function bukaAdminDashboard() {
            activeAdminViewKey = 'dashboard';
            await hydrateAdminKatalogFromMasterWilayah(true);
            bacaDataAdmin(({ sasaran, laporan, kecamatan }) => {
                adminDashboardCache = { sasaran, laporan, kecamatan };
                renderAdminDashboardByPeriod(NAMA_BULAN[new Date().getMonth()]);
            });
        }

        function renderAdminDashboardByPeriod(bulanDipilih) {
            if (!adminDashboardCache) return;
            const { sasaran, laporan, kecamatan } = adminDashboardCache;
            const selectedBulan = NAMA_BULAN.includes(bulanDipilih) ? bulanDipilih : NAMA_BULAN[new Date().getMonth()];
            const totalSasaran = sasaran.length;
            const aktif = sasaran.filter(s => normalisasiTeks(s.status_aktif).toUpperCase() === 'AKTIF').length;
            const nonaktif = totalSasaran - aktif;
            const jenisList = ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'];
            const laporanPeriode = laporan.filter(l => resolveBulanLaporan(l) === selectedBulan);
            const totalLaporanPeriode = laporanPeriode.length;
            const totalLaporanSemua = laporan.length;
            const kaderIdsCatalog = getKaderIdsBySourceFilter(kecamatan);
            const modeSumber = getAdminSumberFilter();
            const totalKaderSet = new Set(kaderIdsCatalog);
            const totalTimSet = new Set(
                kaderIdsCatalog
                    .map(id => normalisasiTeks((dataAkunKader[id] || {}).tim))
                    .filter(Boolean)
            );

            [...sasaran, ...laporan].forEach((item) => {
                if (!item) return;
                if (!isKecamatanMatch(item.kecamatan, kecamatan)) return;
                const sumber = normalizeSumberData(item.sumber_data, item.id_kader);
                if (modeSumber !== 'ALL' && sumber !== modeSumber) return;

                const idKader = normalisasiTeks(item.id_kader);
                const idTim = normalisasiTeks(item.id_tim);
                if (idKader) totalKaderSet.add(idKader);
                if (idTim) totalTimSet.add(idTim);
            });

            const totalKader = totalKaderSet.size;
            const totalTim = totalTimSet.size;
            const totalJenis = jenisList.length;

            const jenisRows = jenisList.map(j => {
                const jumlah = sasaran.filter(s => normalisasiTeks(s.jenis).toUpperCase() === j).length;
                const persen = totalSasaran ? Math.round((jumlah / totalSasaran) * 100) : 0;
                return { jenis: j, jumlah, persen };
            });
            const htmlJenis = jenisRows.map(row => `
                <div class="exec-progress-row">
                    <div class="exec-progress-head"><span>${row.jenis}</span><span>${row.jumlah} sasaran (${row.persen}%)</span></div>
                    <div class="exec-progress-track"><div class="exec-progress-fill" style="width:${row.persen}%;"></div></div>
                </div>
            `).join('');

            const sasaranTerlaporSet = new Set(laporanPeriode.map(l => normalisasiTeks(l.id_sasaran)).filter(Boolean));
            const cakupanRows = jenisList.map(jenis => {
                const sasaranJenis = sasaran.filter(s => normalisasiTeks(s.jenis).toUpperCase() === jenis);
                const totalJenisSasaran = sasaranJenis.length;
                const terlapor = sasaranJenis.filter(s => sasaranTerlaporSet.has(normalisasiTeks(s.id_sasaran))).length;
                const persen = totalJenisSasaran ? Math.round((terlapor / totalJenisSasaran) * 100) : 0;
                return { jenis, terlapor, totalJenisSasaran, persen };
            });
            const sasaranTerlaporPeriode = cakupanRows.reduce((acc, row) => acc + row.terlapor, 0);
            const coveragePendampingan = totalSasaran ? Math.round((sasaranTerlaporPeriode / totalSasaran) * 100) : 0;
            const aktifRate = totalSasaran ? Math.round((aktif / totalSasaran) * 100) : 0;
            const rasioLaporan = totalSasaran ? (totalLaporanPeriode / totalSasaran).toFixed(2) : '0.00';
            const topKader = buildGroupCount(laporanPeriode, l => namaKader(l.id_kader)).slice(0, 5);
            const topKaderRows = topKader.map((row, i) => `<tr><td>${i + 1}. ${row.key}</td><td>${row.value}</td></tr>`).join('') || '<tr><td>Belum ada data laporan</td><td>0</td></tr>';
            const htmlCakupan = cakupanRows.map(row => `
                <div class="exec-chart-row">
                    <div class="exec-chart-label">${row.jenis}</div>
                    <div class="exec-chart-track"><div class="exec-chart-fill" style="width:${row.persen}%;"></div></div>
                    <div class="exec-chart-value">${row.terlapor}/${row.totalJenisSasaran} (${row.persen}%)</div>
                </div>
            `).join('');
            const updateAt = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

            const html = `
                <div class="exec-hero">
                    <div>
                        <div class="exec-kicker">Dashboard Kecamatan</div>
                        <div class="exec-title">Kecamatan ${kecamatan || '-'}</div>
                        <div class="exec-subtitle">Ringkasan indikator lapangan kader dan sasaran aktif. Pembaruan terakhir ${updateAt}.</div>
                    </div>
                    <div class="exec-pill">Periode ${selectedBulan}</div>
                </div>
                <div class="exec-period">
                    <label for="admin-periode-dashboard">Periode Laporan</label>
                    <select id="admin-periode-dashboard" onchange="renderAdminDashboardByPeriod(this.value)">
                        ${buildPeriodeOptions(selectedBulan)}
                    </select>
                </div>
                <div class="exec-kpi-grid">
                    <div class="exec-kpi-card primary"><div class="exec-kpi-label">Total Sasaran</div><div class="exec-kpi-value">${totalSasaran}</div><div class="exec-kpi-foot">${aktif} aktif | ${nonaktif} nonaktif</div></div>
                    <div class="exec-kpi-card"><div class="exec-kpi-label">Laporan ${selectedBulan}</div><div class="exec-kpi-value">${totalLaporanPeriode}</div><div class="exec-kpi-foot">Total seluruh laporan: ${totalLaporanSemua}</div></div>
                    <div class="exec-kpi-card"><div class="exec-kpi-label">Jumlah Tim</div><div class="exec-kpi-value">${totalTim}</div><div class="exec-kpi-foot">Tim aktif di kecamatan</div></div>
                    <div class="exec-kpi-card"><div class="exec-kpi-label">Jumlah Kader</div><div class="exec-kpi-value">${totalKader}</div><div class="exec-kpi-foot">Kader terdaftar</div></div>
                    <div class="exec-kpi-card"><div class="exec-kpi-label">Jenis Sasaran</div><div class="exec-kpi-value">${totalJenis}</div><div class="exec-kpi-foot">${jenisList.join(' | ')}</div></div>
                    <div class="exec-kpi-card"><div class="exec-kpi-label">Rasio Laporan/Sasaran</div><div class="exec-kpi-value">${rasioLaporan}</div><div class="exec-kpi-foot">Periode ${selectedBulan}</div></div>
                </div>
                <div class="exec-split-grid">
                    <div class="exec-panel">
                        <h4>Distribusi Sasaran per Jenis</h4>
                        ${htmlJenis}
                    </div>
                    <div class="exec-panel">
                        <h4>Cakupan Sasaran Terlapor per Jenis</h4>
                        <div class="exec-chart-list">${htmlCakupan}</div>
                    </div>
                    <div class="exec-panel">
                        <h4>Indikator Operasional</h4>
                        <table class="exec-mini-table">
                            <tr><td>Persentase sasaran aktif</td><td>${aktifRate}%</td></tr>
                            <tr><td>Cakupan sasaran terlapor</td><td>${coveragePendampingan}%</td></tr>
                            <tr><td>Sasaran terlapor (${selectedBulan})</td><td>${sasaranTerlaporPeriode}</td></tr>
                            <tr><td>Laporan periode ${selectedBulan}</td><td>${totalLaporanPeriode}</td></tr>
                        </table>
                        <h4 style="margin-top: 14px;">Top 5 Kader (${selectedBulan})</h4>
                        <table class="exec-mini-table">${topKaderRows}</table>
                    </div>
                </div>
            `;
            renderAdminReportLive('Dashboard Kecamatan', html);
        }

        function buildJenisBreakdownTable(data, keyFn, jenisFn, keyLabel, totalLabel, emptyMessage) {
            if (!data.length) return `<p style='text-align:center;color:#777;font-size:14px;'>${emptyMessage}</p>`;
            const jenisList = ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'];
            const map = {};
            data.forEach(item => {
                const key = normalisasiTeks(keyFn(item)) || '-';
                const jenis = normalisasiTeks(jenisFn(item)).toUpperCase();
                if (!map[key]) map[key] = { CATIN: 0, BUMIL: 0, BUFAS: 0, BADUTA: 0, total: 0 };
                if (jenisList.includes(jenis)) map[key][jenis] += 1;
                map[key].total += 1;
            });
            const rows = Object.keys(map)
                .map((key) => ({ key, ...map[key] }))
                .sort((a, b) => b.total - a.total)
                .map((row, idx) => `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${row.key}</td>
                        <td style="text-align:center;">${row.CATIN}</td>
                        <td style="text-align:center;">${row.BUMIL}</td>
                        <td style="text-align:center;">${row.BUFAS}</td>
                        <td style="text-align:center;">${row.BADUTA}</td>
                        <td style="text-align:right;"><b>${row.total}</b></td>
                    </tr>
                `).join('');
            return `
                <div style="overflow:auto;">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>${keyLabel}</th>
                                <th>CATIN</th>
                                <th>BUMIL</th>
                                <th>BUFAS</th>
                                <th>BADUTA</th>
                                <th>${totalLabel}</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        }

        function extractDayNumber(tanggalText) {
            const t = normalisasiTeks(tanggalText);
            if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return parseInt(t.slice(8, 10), 10);
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(t)) return parseInt(t.slice(0, 2), 10);
            return null;
        }

        function getAttendanceDesaId(kaderId) {
            const info = dataAkunKader[kaderId] || {};
            const explicit = normalisasiTeks(info.id_desa || info.kode_desa || info.desa_id);
            if (explicit) return explicit;
            const parsed = normalisasiTeks(kaderId).match(/^(\d{6,})-/);
            return parsed ? parsed[1] : '';
        }

        function getAttendanceKaderSeq(kaderId) {
            const parsed = normalisasiTeks(kaderId).match(/-(\d+)$/);
            if (parsed) return parseInt(parsed[1], 10);
            const numericOnly = normalisasiTeks(kaderId).match(/^(\d+)$/);
            return numericOnly ? parseInt(numericOnly[1], 10) : Number.MAX_SAFE_INTEGER;
        }

        function sortKaderByDesaAndId(a, b) {
            const desaA = getAttendanceDesaId(a) || 'ZZZZZZ';
            const desaB = getAttendanceDesaId(b) || 'ZZZZZZ';
            if (desaA !== desaB) return desaA.localeCompare(desaB, 'id', { numeric: true });
            const seqA = getAttendanceKaderSeq(a);
            const seqB = getAttendanceKaderSeq(b);
            if (seqA !== seqB) return seqA - seqB;
            return normalisasiTeks(a).localeCompare(normalisasiTeks(b), 'id', { numeric: true });
        }

        function getDefaultAttendancePrintDate(selectedYear, selectedBulan) {
            const monthIdx = NAMA_BULAN.indexOf(selectedBulan);
            const lastDay = new Date(selectedYear, monthIdx + 1, 0);
            const y = lastDay.getFullYear();
            const m = String(lastDay.getMonth() + 1).padStart(2, '0');
            const d = String(lastDay.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        function formatTanggalCetakIndonesia(isoDate) {
            const t = normalisasiTeks(isoDate);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return '';
            const [y, m, d] = t.split('-');
            const monthName = NAMA_BULAN[parseInt(m, 10) - 1] || m;
            return `${d} ${monthName} ${y}`;
        }

        function getAttendanceFilterState() {
            const bulan = normalisasiTeks(document.getElementById('admin-periode-hadir')?.value) || NAMA_BULAN[new Date().getMonth()];
            const desa = normalisasiTeks(document.getElementById('admin-desa-hadir')?.value) || 'ALL';
            const cetakTanggal = normalisasiTeks(document.getElementById('admin-cetak-tanggal-hadir')?.value);
            return { bulan, desa, cetakTanggal };
        }

        function getAttendanceDataByFilter(bulanDipilih, desaDipilih = 'ALL') {
            if (!adminAttendanceCache) return {
                rows: [],
                desaList: [],
                daysInMonth: 31,
                selectedYear: new Date().getFullYear(),
                selectedBulan: NAMA_BULAN[new Date().getMonth()],
                selectedDesa: 'ALL',
                totalMelapor: 0,
                totalLaporan: 0,
                kecamatan: ''
            };
            const { laporan, kecamatan } = adminAttendanceCache;
            const selectedBulan = NAMA_BULAN.includes(bulanDipilih) ? bulanDipilih : NAMA_BULAN[new Date().getMonth()];
            const laporanBulan = laporan.filter(l => resolveBulanLaporan(l) === selectedBulan);
            const tahunList = laporanBulan.map(l => resolveTahunLaporan(l)).filter(Boolean);
            const selectedYear = tahunList.length ? Math.max(...tahunList) : new Date().getFullYear();
            const laporanPeriode = laporanBulan.filter(l => {
                const y = resolveTahunLaporan(l);
                return y === null || y === selectedYear;
            });

            const kaderIdsAll = Object.keys(dataAkunKader)
                .filter(id =>
                    normalisasiTeks(dataAkunKader[id].role).toUpperCase() === 'KADER' &&
                    isKecamatanMatch(dataAkunKader[id].kec, kecamatan)
                )
                .sort(sortKaderByDesaAndId);

            const desaMap = {};
            kaderIdsAll.forEach(id => {
                const desa = normalisasiTeks(dataAkunKader[id].desa);
                if (!desa) return;
                const desaId = getAttendanceDesaId(id);
                if (!desaMap[desa]) desaMap[desa] = { desa, desaId: desaId || 'ZZZZZZ' };
                if (desaId && desaId < desaMap[desa].desaId) desaMap[desa].desaId = desaId;
            });
            const desaList = Object.values(desaMap)
                .sort((a, b) => {
                    if (a.desaId !== b.desaId) return a.desaId.localeCompare(b.desaId, 'id', { numeric: true });
                    return a.desa.localeCompare(b.desa, 'id');
                })
                .map(x => x.desa);

            const selectedDesa = desaList.includes(normalisasiTeks(desaDipilih)) ? normalisasiTeks(desaDipilih) : 'ALL';
            const kaderIds = (selectedDesa === 'ALL'
                ? kaderIdsAll
                : kaderIdsAll.filter(id => normalisasiTeks(dataAkunKader[id].desa) === selectedDesa))
                .sort(sortKaderByDesaAndId);
            const kaderSet = new Set(kaderIds);

            const laporanByKader = {};
            laporanPeriode.forEach(item => {
                const idKader = normalisasiTeks(item.id_kader);
                if (!idKader || !kaderSet.has(idKader)) return;
                if (!laporanByKader[idKader]) laporanByKader[idKader] = {};
                const day = extractDayNumber(item.tanggal);
                if (day) laporanByKader[idKader][day] = true;
            });

            const monthIdx = NAMA_BULAN.indexOf(selectedBulan);
            const daysInMonth = new Date(selectedYear, monthIdx + 1, 0).getDate();
            const rows = kaderIds.map((idKader, idx) => {
                const info = dataAkunKader[idKader] || {};
                const dayMap = laporanByKader[idKader] || {};
                let totalHari = 0;
                const dayFlags = {};
                for (let d = 1; d <= daysInMonth; d += 1) {
                    const hadir = !!dayMap[d];
                    dayFlags[d] = hadir;
                    if (hadir) totalHari += 1;
                }
                return {
                    no: idx + 1,
                    idKader,
                    nama: namaKader(idKader),
                    tim: normalisasiTeks(info.tim) || '-',
                    desa: normalisasiTeks(info.desa) || '-',
                    dayFlags,
                    totalHari
                };
            });

            const totalMelapor = rows.filter(r => r.totalHari > 0).length;
            return {
                rows,
                desaList,
                daysInMonth,
                selectedYear,
                selectedBulan,
                selectedDesa,
                totalMelapor,
                totalLaporan: laporanPeriode.filter(l => {
                    const idKader = normalisasiTeks(l.id_kader);
                    return idKader && kaderSet.has(idKader);
                }).length,
                kecamatan
            };
        }

        function renderAdminAttendanceByPeriod(bulanDipilih, desaDipilih = 'ALL', cetakTanggalDipilih = '') {
            const data = getAttendanceDataByFilter(bulanDipilih, desaDipilih);
            const dayHeader = Array.from({ length: data.daysInMonth }, (_, i) => `<th style="text-align:center; min-width:30px;">${i + 1}</th>`).join('');
            const rowsHtml = data.rows.map(r => {
                const dayCols = Array.from({ length: data.daysInMonth }, (_, i) => {
                    const d = i + 1;
                    return `<td style="text-align:center;">${r.dayFlags[d] ? '&#9679;' : ''}</td>`;
                }).join('');
                return `
                    <tr>
                        <td style="text-align:center;">${r.no}</td>
                        <td>${r.nama}</td>
                        <td>${r.tim}</td>
                        <td>${r.desa}</td>
                        ${dayCols}
                    </tr>
                `;
            }).join('');
            const desaOptions = ['<option value="ALL">Semua Desa/Kelurahan</option>']
                .concat(data.desaList.map(d => `<option value="${d}" ${data.selectedDesa === d ? 'selected' : ''}>${d}</option>`))
                .join('');
            const defaultCetakTanggal = getDefaultAttendancePrintDate(data.selectedYear, data.selectedBulan);
            const selectedCetakTanggal = data.selectedDesa === 'ALL'
                ? (normalisasiTeks(cetakTanggalDipilih) || normalisasiTeks(document.getElementById('admin-cetak-tanggal-hadir')?.value) || defaultCetakTanggal)
                : '';
            const cetakTanggalControl = data.selectedDesa === 'ALL'
                ? `
                    <label for="admin-cetak-tanggal-hadir">Tanggal Cetak</label>
                    <input id="admin-cetak-tanggal-hadir" type="date" value="${selectedCetakTanggal}" style="padding:10px 12px;border:1px solid #cfe0f2;border-radius:10px;font-size:14px;background:#f7fbff;color:#2c567f;">
                  `
                : '';

            const html = `
                <div class="exec-hero exec-hero-compact">
                    <div>
                        <div class="exec-kicker">Monitoring Kehadiran</div>
                        <div class="exec-title">Daftar Hadir Pendampingan Kader TPK Kecamatan ${data.kecamatan || '-'}</div>
                        <div class="exec-subtitle">Titik hitam menunjukkan tanggal kader mengirim laporan pendampingan.</div>
                    </div>
                    <div class="exec-pill">${data.selectedBulan} ${data.selectedYear}</div>
                </div>
                <div class="exec-period">
                    <label for="admin-periode-hadir">Periode Bulan</label>
                    <select id="admin-periode-hadir" onchange="renderAdminAttendanceByPeriod(this.value, getAttendanceFilterState().desa, getAttendanceFilterState().cetakTanggal)">
                        ${buildPeriodeOptions(data.selectedBulan)}
                    </select>
                    <label for="admin-desa-hadir">Desa/Kelurahan</label>
                    <select id="admin-desa-hadir" onchange="renderAdminAttendanceByPeriod(getAttendanceFilterState().bulan, this.value, getAttendanceFilterState().cetakTanggal)">
                        ${desaOptions}
                    </select>
                    ${cetakTanggalControl}
                    <button type="button" class="btn-primary" style="width:auto; margin-top:0; padding:10px 14px;" onclick="cetakDaftarHadirPendampingan()">Cetak Daftar Hadir</button>
                </div>
                <div class="exec-chip-grid">
                    <div class="exec-chip"><div class="exec-chip-label">Total Kader</div><div class="exec-chip-value">${data.rows.length}</div></div>
                    <div class="exec-chip"><div class="exec-chip-label">Kader Melapor</div><div class="exec-chip-value">${data.totalMelapor}</div></div>
                    <div class="exec-chip"><div class="exec-chip-label">Total Laporan</div><div class="exec-chip-value">${data.totalLaporan}</div></div>
                </div>
                <div class="exec-panel">
                    <h4>Daftar Hadir Bulan ${data.selectedBulan} ${data.selectedYear}</h4>
                    <div style="overflow:auto;">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th rowspan="2">No</th>
                                    <th rowspan="2">Nama Kader</th>
                                    <th rowspan="2">Tim</th>
                                    <th rowspan="2">Desa/Kelurahan</th>
                                    <th colspan="${data.daysInMonth}" style="text-align:center;">Tanggal Pendampingan</th>
                                </tr>
                                <tr>${dayHeader}</tr>
                            </thead>
                            <tbody>${rowsHtml || `<tr><td colspan="${4 + data.daysInMonth}" style="text-align:center;">Belum ada data kader.</td></tr>`}</tbody>
                        </table>
                    </div>
                </div>
            `;
            renderAdminReportLive(`Daftar Hadir Pendampingan Kader TPK Kecamatan ${data.kecamatan || '-'}`, html);
        }

        function cetakDaftarHadirPendampingan() {
            const filter = getAttendanceFilterState();
            const data = getAttendanceDataByFilter(filter.bulan, filter.desa);
            const dayHeader = Array.from({ length: data.daysInMonth }, (_, i) => `<th class="center">${i + 1}</th>`).join('');
            const rowsHtml = data.rows.map(r => {
                const dayCols = Array.from({ length: data.daysInMonth }, (_, i) => {
                    const d = i + 1;
                    return `<td class="center ${r.dayFlags[d] ? 'day-hit' : ''}">${r.dayFlags[d] ? '<span class="day-dot">●</span>' : ''}</td>`;
                }).join('');
                return `<tr><td class="center">${r.no}</td><td>${r.desa}</td><td>${r.nama}</td><td class="center">${r.tim}</td>${dayCols}</tr>`;
            }).join('') || `<tr><td colspan="${4 + data.daysInMonth}" class="center">Belum ada data kader.</td></tr>`;

            const desaLabel = data.selectedDesa === 'ALL' ? 'SEMUA DESA/KELURAHAN' : data.selectedDesa.toUpperCase();
            const showFooter = data.selectedDesa === 'ALL';
            const defaultCetakTanggal = getDefaultAttendancePrintDate(data.selectedYear, data.selectedBulan);
            const cetakTanggalFmt = formatTanggalCetakIndonesia(
                showFooter ? (normalisasiTeks(filter.cetakTanggal) || defaultCetakTanggal) : ''
            );
            const footerHtml = showFooter ? `
                <div style="height:22px;"></div>
                <div style="border-top:1px solid #777; margin:0 0 16px;"></div>
                <table style="width:100%; border:none; border-collapse:collapse;">
                    <tr>
                        <td style="width:50%; border:none; text-align:center; font-size:16px; line-height:1.6;">
                            Mengetahui,<br>
                            Kepala Dinas PMDPPKB Kabupaten Buleleng<br><br><br>
                            <b><u>Drs. Made Supartawan,MM</u></b><br>
                            NIP. 19730707 199302 1 002
                        </td>
                        <td style="width:50%; border:none; text-align:center; font-size:16px; line-height:1.6;">
                            Singaraja, ${cetakTanggalFmt}<br>
                            PPTK PPKB<br>
                            Dinas PMDPPKB Kabupaten Buleleng<br><br>
                            <b><u>Bdn. Nyoman Mandayani,SST Keb, M.A.P</u></b><br>
                            NIP. 19730813 199203 2 003
                        </td>
                    </tr>
                </table>
            ` : '';
            const html = `
                <html>
                <head>
                    <title>Cetak Daftar Hadir</title>
                    <style>
                        body { font-family: 'Times New Roman', serif; padding: 12px; color: #000; }
                        .title { text-align: center; font-weight: 700; font-size: 22px; margin: 0; }
                        .subtitle { text-align: center; font-weight: 700; font-size: 22px; margin: 2px 0 10px; }
                        .meta { margin: 8px 0 10px; font-size: 13px; font-weight: 700; }
                        .meta div { margin: 2px 0; }
                        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                        th, td { border: 1px solid #000; font-size: 11px; padding: 3px 2px; }
                        th { background: #d8ecff; font-weight: 700; }
                        .center { text-align: center; }
                        .day-hit { background: #e9f7ff; }
                        .day-dot { font-size: 22px; font-weight: 700; line-height: 1; display: inline-block; transform: translateY(1px); }
                        @media print { @page { size: landscape; margin: 8mm; } body { padding: 0; } }
                    </style>
                </head>
                <body>
                    <h1 class="title">DAFTAR HADIR OPERASIONAL PENDAMPINGAN KELUARGA RISIKO STUNTING OLEH KADER TPK</h1>
                    <div class="subtitle">KABUPATEN BULELENG</div>
                    <div class="meta">
                        <div>KECAMATAN : ${data.kecamatan || '-'}</div>
                        <div>DESA/KELURAHAN : ${desaLabel}</div>
                        <div>BULAN : ${data.selectedBulan}</div>
                        <div>TAHUN : ${data.selectedYear}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th rowspan="2" class="center" style="width:28px;">NO</th>
                                <th rowspan="2" class="center" style="width:95px;">DESA</th>
                                <th rowspan="2" class="center" style="width:110px;">NAMA KADER</th>
                                <th rowspan="2" class="center" style="width:38px;">TIM</th>
                                <th colspan="${data.daysInMonth}" class="center">TANGGAL PENDAMPINGAN</th>
                            </tr>
                            <tr>${dayHeader}</tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                    ${footerHtml}
                </body>
                </html>
            `;
            const w = window.open('', '_blank');
            if (!w) return tampilkanNotifAdmin('Popup diblokir browser. Izinkan popup untuk cetak.', 'notif-warning');
            w.document.write(html);
            w.document.close();
            w.focus();
            w.print();
        }

        function bukaAdminDaftarHadirPendampingan() {
            activeAdminViewKey = 'daftar_hadir';
            bacaDataAdmin(({ laporan, kecamatan }) => {
                adminAttendanceCache = { laporan, kecamatan };
                renderAdminAttendanceByPeriod(NAMA_BULAN[new Date().getMonth()], 'ALL');
            });
        }

