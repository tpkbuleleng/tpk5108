        function renderAdminRekapScreen(options) {
            const title = options.title;
            const subtitle = options.subtitle;
            const grouped = options.grouped || [];
            const keyLabel = options.keyLabel;
            const valueLabel = options.valueLabel;
            const emptyMessage = options.emptyMessage;
            const card1Label = options.card1Label;
            const card1Value = options.card1Value;
            const card2Label = options.card2Label;
            const card2Value = options.card2Value;
            const card3Label = options.card3Label;
            const card3Value = options.card3Value;
            const tableTitle = options.tableTitle || 'Detail Rekap';
            const topItem = grouped[0];
            const topText = options.topText || (topItem ? `${topItem.key} (${topItem.value})` : '-');
            const secondaryTitle = options.secondaryTitle || '';
            const secondaryHtml = options.secondaryHtml || '';
            return `
                <div class="exec-hero exec-hero-compact">
                    <div>
                        <div class="exec-kicker">Analitik Rekap</div>
                        <div class="exec-title">${title}</div>
                        <div class="exec-subtitle">${subtitle}</div>
                    </div>
                    <div class="exec-pill">Top: ${topText}</div>
                </div>
                <div class="exec-chip-grid">
                    <div class="exec-chip"><div class="exec-chip-label">${card1Label}</div><div class="exec-chip-value">${card1Value}</div></div>
                    <div class="exec-chip"><div class="exec-chip-label">${card2Label}</div><div class="exec-chip-value">${card2Value}</div></div>
                    <div class="exec-chip"><div class="exec-chip-label">${card3Label}</div><div class="exec-chip-value">${card3Value}</div></div>
                </div>
                <div class="exec-panel">
                    <h4>${tableTitle}</h4>
                    ${renderGroupList(grouped, keyLabel, valueLabel, emptyMessage)}
                </div>
                ${secondaryTitle ? `<div class="exec-panel"><h4>${secondaryTitle}</h4>${secondaryHtml}</div>` : ''}
            `;
        }

        function bukaAdminRekapSasaranPerKader() {
            activeAdminViewKey = 'rekap_sasaran_kader';
            bacaDataAdmin(({ sasaran }) => {
                const grouped = buildGroupCount(sasaran, s => namaKader(s.id_kader));
                const total = sasaran.length;
                const entitas = grouped.length;
                const rata = entitas ? (total / entitas).toFixed(1) : '0.0';
                const jenisTable = buildJenisBreakdownTable(
                    sasaran,
                    s => namaKader(s.id_kader),
                    s => s.jenis,
                    'Kader',
                    'Total Sasaran',
                    'Belum ada data sasaran.'
                );
                const html = renderAdminRekapScreen({
                    title: 'Rekap Sasaran per Kader',
                    subtitle: 'Distribusi beban registrasi sasaran antar kader di kecamatan.',
                    grouped,
                    keyLabel: 'Kader',
                    valueLabel: 'Jumlah Sasaran',
                    emptyMessage: 'Belum ada data sasaran.',
                    card1Label: 'Total Sasaran',
                    card1Value: total,
                    card2Label: 'Jumlah Kader Tercatat',
                    card2Value: entitas,
                    card3Label: 'Rata-rata per Kader',
                    card3Value: rata,
                    tableTitle: 'Detail Sebaran Sasaran',
                    secondaryTitle: 'Detail Jenis Sasaran per Kader',
                    secondaryHtml: jenisTable
                });
                bukaAdminReportScreen('Rekap Sasaran per Kader', html);
            });
        }

        function bukaAdminRekapSasaranPerDesa() {
            activeAdminViewKey = 'rekap_sasaran_desa';
            bacaDataAdmin(({ sasaran }) => {
                const grouped = buildGroupCount(sasaran, s => s.desa || '-');
                const total = sasaran.length;
                const entitas = grouped.length;
                const rata = entitas ? (total / entitas).toFixed(1) : '0.0';
                const jenisTable = buildJenisBreakdownTable(
                    sasaran,
                    s => s.desa || '-',
                    s => s.jenis,
                    'Desa/Kelurahan',
                    'Total Sasaran',
                    'Belum ada data sasaran.'
                );
                const html = renderAdminRekapScreen({
                    title: 'Rekap Sasaran per Desa',
                    subtitle: 'Peta konsentrasi sasaran berdasarkan desa/kelurahan.',
                    grouped,
                    keyLabel: 'Desa',
                    valueLabel: 'Jumlah Sasaran',
                    emptyMessage: 'Belum ada data sasaran.',
                    card1Label: 'Total Sasaran',
                    card1Value: total,
                    card2Label: 'Jumlah Desa Tercatat',
                    card2Value: entitas,
                    card3Label: 'Rata-rata per Desa',
                    card3Value: rata,
                    tableTitle: 'Detail Sebaran Sasaran per Desa',
                    secondaryTitle: 'Detail Jenis Sasaran per Desa',
                    secondaryHtml: jenisTable
                });
                bukaAdminReportScreen('Rekap Sasaran per Desa', html);
            });
        }

        function getRekapPendampinganFilterState() {
            const defaultPeriod = getPeriodeBulanTahunList()[0]?.value || `${NAMA_BULAN[new Date().getMonth()]}|${new Date().getFullYear()}`;
            return {
                periode: normalisasiTeks(document.getElementById('rekap-kader-periode')?.value) || defaultPeriod,
                desa: normalisasiTeks(document.getElementById('rekap-kader-desa')?.value) || 'ALL',
                kader: normalisasiTeks(document.getElementById('rekap-kader-nama')?.value) || ''
            };
        }

        function onFilterRekapPendampinganPerKader(changedField) {
            const state = getRekapPendampinganFilterState();
            if (changedField === 'desa') state.kader = '';
            renderRekapPendampinganPerKader(state.periode, state.desa, state.kader);
        }

        function getRekapPendampinganPerKaderRows(periodeValue, desaFilter, kaderFilter) {
            if (!rekapPendampinganKaderCache) return { rows: [], grouped: [], laporanPeriode: [], bulan: '', tahun: new Date().getFullYear(), desaFilter: 'ALL', kaderFilter: '', desaList: [], kaderListFiltered: [], kecamatan: '' };
            const { sasaran, laporan, kecamatan } = rekapPendampinganKaderCache;
            const period = parsePeriodeBulanTahun(periodeValue);
            const jenisList = ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'];
            const laporanPeriode = laporan.filter(l => {
                const bulan = resolveBulanLaporan(l);
                const tahun = resolveTahunLaporan(l);
                return bulan === period.bulan && (tahun === null || tahun === period.tahun);
            });
            const laporanByKader = {};
            laporanPeriode.forEach(item => {
                const id = normalisasiTeks(item.id_kader);
                if (!id) return;
                if (!laporanByKader[id]) laporanByKader[id] = [];
                laporanByKader[id].push(item);
            });
            const sasaranByKader = {};
            sasaran.forEach(item => {
                const id = normalisasiTeks(item.id_kader);
                if (!id) return;
                if (!sasaranByKader[id]) sasaranByKader[id] = [];
                sasaranByKader[id].push(item);
            });

            const kaderIdsAll = Object.keys(dataAkunKader)
                .filter(id =>
                    normalisasiTeks(dataAkunKader[id].role).toUpperCase() === 'KADER' &&
                    isKecamatanMatch(dataAkunKader[id].kec, kecamatan)
                )
                .sort((a, b) => namaKader(a).localeCompare(namaKader(b), 'id'));
            const desaList = [...new Set(
                kaderIdsAll.map(id => normalisasiTeks(dataAkunKader[id].desa)).filter(Boolean)
            )].sort((a, b) => a.localeCompare(b, 'id'));

            const desaFilterClean = (normalisasiTeks(desaFilter) && normalisasiTeks(desaFilter) !== 'ALL') ? normalisasiTeks(desaFilter) : 'ALL';
            const kaderListFiltered = (desaFilterClean === 'ALL')
                ? kaderIdsAll
                : kaderIdsAll.filter(id => normalisasiTeks(dataAkunKader[id].desa) === desaFilterClean);

            const kaderFilterClean = kaderListFiltered.includes(normalisasiTeks(kaderFilter)) ? normalisasiTeks(kaderFilter) : '';
            const kaderIds = kaderFilterClean ? [kaderFilterClean] : kaderListFiltered;

            const rows = kaderIds.map((idKader, idx) => {
                const dataSasaran = sasaranByKader[idKader] || [];
                const dataLaporan = laporanByKader[idKader] || [];
                const countJenis = (arr, jenis) => arr.filter(x => normalisasiTeks(x.jenis).toUpperCase() === jenis).length;
                const sasaranJenis = {};
                const pendampinganJenis = {};
                jenisList.forEach(j => {
                    sasaranJenis[j] = countJenis(dataSasaran, j);
                    pendampinganJenis[j] = countJenis(dataLaporan, j);
                });
                const totalPendampingan = jenisList.reduce((sum, j) => sum + pendampinganJenis[j], 0);
                return {
                    no: idx + 1,
                    idKader,
                    namaKader: namaKader(idKader),
                    sasaranJenis,
                    pendampinganJenis,
                    totalPendampingan
                };
            });

            const grouped = rows
                .filter(r => r.totalPendampingan > 0)
                .map(r => ({ key: r.namaKader, value: r.totalPendampingan }))
                .sort((a, b) => b.value - a.value);

            return {
                rows,
                grouped,
                laporanPeriode,
                bulan: period.bulan,
                tahun: period.tahun,
                desaFilter: desaFilterClean,
                kaderFilter: kaderFilterClean,
                desaList,
                kaderListFiltered,
                kecamatan
            };
        }

        function renderRekapPendampinganPerKader(periodeValue, desaFilter = 'ALL', kaderFilter = '') {
            if (!rekapPendampinganKaderCache) return;
            const period = parsePeriodeBulanTahun(periodeValue);
            const computed = getRekapPendampinganPerKaderRows(period.value, desaFilter, kaderFilter);
            const rows = computed.rows;
            const grouped = computed.grouped;
            const total = computed.laporanPeriode.length;
            const entitas = grouped.length;
            const rata = entitas ? (total / entitas).toFixed(1) : '0.0';

            const dataLaporanPerKader = rows.flatMap(r => {
                const list = [];
                ['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'].forEach(jenis => {
                    for (let i = 0; i < r.pendampinganJenis[jenis]; i += 1) list.push({ kader: r.namaKader, jenis });
                });
                return list;
            });
            const jenisTable = buildJenisBreakdownTable(
                dataLaporanPerKader,
                x => x.kader,
                x => x.jenis,
                'Kader',
                'Total Laporan',
                'Belum ada data laporan.'
            );

            const desaOptions = ['<option value="ALL">Semua Desa/Kelurahan</option>']
                .concat(computed.desaList.map(d => `<option value="${d}" ${computed.desaFilter === d ? 'selected' : ''}>${d}</option>`))
                .join('');
            const kaderOptions = ['<option value="">Semua Kader</option>']
                .concat(computed.kaderListFiltered.map(id => `<option value="${id}" ${computed.kaderFilter === id ? 'selected' : ''}>${namaKader(id)}</option>`))
                .join('');

            const filterInfo = [
                `Desa: ${computed.desaFilter === 'ALL' ? 'Semua Desa/Kelurahan' : computed.desaFilter}`,
                `Kader: ${computed.kaderFilter ? namaKader(computed.kaderFilter) : 'Semua Kader'}`,
                `Periode: ${computed.bulan} ${computed.tahun}`
            ].join(' | ');

            const periodPanel = `
                <div class="exec-panel" style="margin-bottom: 12px;">
                    <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                        <label for="rekap-kader-periode" style="font-weight:700; color:#2f4c69;">Periode</label>
                        <select id="rekap-kader-periode" class="block-filter" style="border:1px solid #cfe0f2; background:#f7fbff; color:#2c567f; font-size:14px; padding:8px 10px;" onchange="onFilterRekapPendampinganPerKader('periode')">
                            ${buildPeriodeBulanTahunOptions(period.value)}
                        </select>
                        <label for="rekap-kader-desa" style="font-weight:700; color:#2f4c69;">Desa/Kelurahan</label>
                        <select id="rekap-kader-desa" class="block-filter" style="border:1px solid #cfe0f2; background:#f7fbff; color:#2c567f; font-size:14px; padding:8px 10px; min-width:200px;" onchange="onFilterRekapPendampinganPerKader('desa')">
                            ${desaOptions}
                        </select>
                        <label for="rekap-kader-nama" style="font-weight:700; color:#2f4c69;">Nama Kader</label>
                        <select id="rekap-kader-nama" class="block-filter" style="border:1px solid #cfe0f2; background:#f7fbff; color:#2c567f; font-size:14px; padding:8px 10px; min-width:220px;" onchange="onFilterRekapPendampinganPerKader('kader')">
                            ${kaderOptions}
                        </select>
                        <button type="button" class="btn-primary" style="width:auto; margin-top:0; padding:10px 14px;" onclick="cetakPdfRekapPendampinganPerKader()">Cetak PDF Rekap Pendampingan per Kader</button>
                    </div>
                    <div style="margin-top:8px; color:#4f6378; font-size:13px;">${filterInfo}</div>
                </div>
            `;

            const html = periodPanel + renderAdminRekapScreen({
                title: 'Rekap Pendampingan per Kader',
                subtitle: `Monitoring intensitas laporan pendampingan per kader pada periode ${computed.bulan} ${computed.tahun}.`,
                grouped,
                keyLabel: 'Kader',
                valueLabel: 'Jumlah Laporan',
                emptyMessage: 'Belum ada data laporan pada filter terpilih.',
                card1Label: 'Total Laporan',
                card1Value: total,
                card2Label: 'Kader Melapor',
                card2Value: entitas,
                card3Label: 'Rata-rata per Kader',
                card3Value: rata,
                tableTitle: 'Detail Pendampingan per Kader',
                secondaryTitle: 'Detail Jenis Sasaran pada Pendampingan per Kader',
                secondaryHtml: jenisTable
            });

            bukaAdminReportScreen('Rekap Pendampingan per Kader', html);
        }

        function bukaAdminRekapPendampinganPerKader() {
            activeAdminViewKey = 'rekap_pendampingan_kader';
            bacaDataAdmin(({ sasaran, laporan, kecamatan }) => {
                rekapPendampinganKaderCache = { sasaran, laporan, kecamatan };
                const defaultPeriod = getPeriodeBulanTahunList()[0]?.value || `${NAMA_BULAN[new Date().getMonth()]}|${new Date().getFullYear()}`;
                renderRekapPendampinganPerKader(defaultPeriod, 'ALL', '');
            });
        }

        function cetakPdfRekapPendampinganPerKader() {
            if (!rekapPendampinganKaderCache) return tampilkanNotifAdmin('Data rekap belum siap.', 'notif-warning');
            const filter = getRekapPendampinganFilterState();
            const computed = getRekapPendampinganPerKaderRows(filter.periode, filter.desa, filter.kader);
            const { rows, bulan, tahun, kecamatan, desaFilter, kaderFilter } = computed;
            const minRows = 20;
            const outputRows = rows.slice(0);
            while (outputRows.length < minRows) {
                outputRows.push({
                    no: outputRows.length + 1,
                    namaKader: '',
                    sasaranJenis: { CATIN: '', BUMIL: '', BUFAS: '', BADUTA: '' },
                    pendampinganJenis: { CATIN: '', BUMIL: '', BUFAS: '', BADUTA: '' },
                    totalPendampingan: ''
                });
            }

            let desaLabel = desaFilter === 'ALL' ? 'Semua Desa/Kelurahan' : desaFilter;
            if (desaFilter === 'ALL' && kaderFilter) desaLabel = normalisasiTeks(dataAkunKader[kaderFilter]?.desa) || desaLabel;
            const monthIdx = NAMA_BULAN.indexOf(bulan);
            const akhirBulan = new Date(tahun, monthIdx + 1, 0);
            const tanggalTtd = `${akhirBulan.getDate()} ${NAMA_BULAN[akhirBulan.getMonth()]} ${akhirBulan.getFullYear()}`;
            const namaPkb = normalisasiTeks(localStorage.getItem('nama_pkb_pengampu') || localStorage.getItem('ttd_nama_pkb_pengampu')) || 'Nama PKB Pengampu';
            const nipPkb = normalisasiTeks(localStorage.getItem('nip_pkb_pengampu') || localStorage.getItem('ttd_nip_pkb_pengampu')) || '........................';

            const htmlRows = outputRows.map(r => `
                <tr>
                    <td class="center">${r.no}</td>
                    <td>${r.namaKader || ''}</td>
                    <td class="center">${r.sasaranJenis.CATIN}</td>
                    <td class="center">${r.sasaranJenis.BUMIL}</td>
                    <td class="center">${r.sasaranJenis.BUFAS}</td>
                    <td class="center">${r.sasaranJenis.BADUTA}</td>
                    <td class="center">${r.pendampinganJenis.CATIN}</td>
                    <td class="center">${r.pendampinganJenis.BUMIL}</td>
                    <td class="center">${r.pendampinganJenis.BUFAS}</td>
                    <td class="center">${r.pendampinganJenis.BADUTA}</td>
                    <td class="center">${r.totalPendampingan}</td>
                </tr>
            `).join('');

            const html = `
                <html>
                <head>
                    <title>REKAPAN HASIL PENDAMPINGAN KADER TPK</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 18px; color: #000; }
                        .title { text-align: center; font-weight: 700; margin-bottom: 10px; font-size: 16px; }
                        .meta { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                        .meta td { padding: 2px 4px; font-size: 13px; }
                        .wrap { width: 100%; overflow: hidden; }
                        table.report { width: 100%; border-collapse: collapse; table-layout: fixed; }
                        table.report th, table.report td { border: 1px solid #000; padding: 4px 5px; font-size: 12px; }
                        table.report th { background: #d8ecff; font-weight: 700; }
                        .center { text-align: center; }
                        .right { text-align: right; }
                        .sign { margin-top: 20px; width: 100%; border-collapse: collapse; }
                        .sign td { font-size: 13px; padding: 2px 4px; }
                        @media print {
                            @page { size: landscape; margin: 10mm; }
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="title">REKAPAN HASIL PENDAMPINGAN KADER TPK</div>
                    <table class="meta">
                        <tr><td style="width:140px;"><b>DESA</b></td><td style="width:14px;">:</td><td>${desaLabel}</td></tr>
                        <tr><td><b>KECAMATAN</b></td><td>:</td><td>${kecamatan || '-'}</td></tr>
                        <tr><td><b>BULAN/TAHUN</b></td><td>:</td><td>${bulan} ${tahun}</td></tr>
                    </table>
                    <div class="wrap">
                        <table class="report">
                            <colgroup>
                                <col style="width:4%;">
                                <col style="width:16%;">
                                <col style="width:6%;">
                                <col style="width:6%;">
                                <col style="width:6%;">
                                <col style="width:7%;">
                                <col style="width:6%;">
                                <col style="width:6%;">
                                <col style="width:6%;">
                                <col style="width:7%;">
                                <col style="width:14%;">
                            </colgroup>
                            <thead>
                                <tr>
                                    <th rowspan="2" class="center">NO</th>
                                    <th rowspan="2" class="center">NAMA KADER</th>
                                    <th colspan="4" class="center">JUMLAH SASARAN</th>
                                    <th colspan="4" class="center">JUMLAH PENDAMPINGAN</th>
                                    <th rowspan="2" class="center">TOTAL JUMLAH PENDAMPINGAN</th>
                                </tr>
                                <tr>
                                    <th class="center">CATIN</th>
                                    <th class="center">BUMIL</th>
                                    <th class="center">BUFAS</th>
                                    <th class="center">BADUTA</th>
                                    <th class="center">CATIN</th>
                                    <th class="center">BUMIL</th>
                                    <th class="center">BUFAS</th>
                                    <th class="center">BADUTA</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${htmlRows}
                                <tr><td class="center">DST</td><td colspan="10"></td></tr>
                            </tbody>
                        </table>
                    </div>
                    <table class="sign">
                        <tr><td class="right">Singaraja, ${tanggalTtd}</td></tr>
                        <tr><td class="right">Pelapor</td></tr>
                        <tr><td style="height:50px;"></td></tr>
                        <tr><td class="right">(${namaPkb})</td></tr>
                        <tr><td class="right">NIP ${nipPkb}</td></tr>
                    </table>
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

        function bukaAdminRekapPendampinganPerDesa() {
            activeAdminViewKey = 'rekap_pendampingan_desa';
            bacaDataAdmin(({ sasaran, laporan }) => {
                const sasaranById = {};
                sasaran.forEach(s => sasaranById[s.id_sasaran] = s);
                const grouped = buildGroupCount(laporan, l => sasaranById[l.id_sasaran]?.desa || '-');
                const total = laporan.length;
                const entitas = grouped.length;
                const rata = entitas ? (total / entitas).toFixed(1) : '0.0';
                const jenisTable = buildJenisBreakdownTable(
                    laporan,
                    l => sasaranById[l.id_sasaran]?.desa || '-',
                    l => l.jenis || sasaranById[l.id_sasaran]?.jenis,
                    'Desa/Kelurahan',
                    'Total Laporan',
                    'Belum ada data laporan.'
                );
                const html = renderAdminRekapScreen({
                    title: 'Rekap Pendampingan per Desa',
                    subtitle: 'Evaluasi kepadatan aktivitas pendampingan di tiap desa.',
                    grouped,
                    keyLabel: 'Desa',
                    valueLabel: 'Jumlah Laporan',
                    emptyMessage: 'Belum ada data laporan.',
                    card1Label: 'Total Laporan',
                    card1Value: total,
                    card2Label: 'Desa Tercakup',
                    card2Value: entitas,
                    card3Label: 'Rata-rata per Desa',
                    card3Value: rata,
                    tableTitle: 'Detail Pendampingan per Desa',
                    secondaryTitle: 'Detail Jenis Sasaran pada Pendampingan per Desa',
                    secondaryHtml: jenisTable
                });
                bukaAdminReportScreen('Rekap Pendampingan per Desa', html);
            });
        }

        async function bukaAdminResetPasswordKader() {
            const kec = getKecamatanAktif();
            await hydrateAdminKatalogFromMasterWilayah(true);
            bacaDataAdmin(({ sasaran, laporan }) => {
                const set = new Set(
                    Object.keys(dataAkunKader || {}).filter(id =>
                        normalisasiTeks(dataAkunKader[id]?.role).toUpperCase() === 'KADER' &&
                        isKecamatanMatch(dataAkunKader[id]?.kec, kec)
                    )
                );
                [...sasaran, ...laporan].forEach(item => {
                    const idKader = normalisasiTeks(item?.id_kader);
                    if (idKader) set.add(idKader);
                });

                const opsi = Array.from(set)
                    .sort((a, b) => a.localeCompare(b, 'id'))
                    .map(id => {
                        const nama = normalisasiTeks(dataAkunKader[id]?.nama) || id;
                        return `<option value="${id}">${id} - ${nama}</option>`;
                    })
                    .join('');

                document.getElementById('admin-form-title').innerText = 'Reset Password Kader';
                document.getElementById('admin-form-content').innerHTML = `
                    <div class="form-group"><label>Pilih Kader</label><select id="adm-reset-user">${opsi || '<option value="">Tidak ada kader</option>'}</select></div>
                    <div class="form-group"><label>Password Baru (4-64 karakter)</label><input id="adm-reset-pass" type="password" value="1234" minlength="4" maxlength="64"></div>
                    <button class="btn-primary" type="button" onclick="simpanResetPasswordKader()">Simpan Reset Password</button>
                `;
                openScreen('admin-form-screen');
            });
        }

        function simpanResetPasswordKader() {
            const userId = normalisasiTeks(document.getElementById('adm-reset-user')?.value);
            const newPass = normalisasiTeks(document.getElementById('adm-reset-pass')?.value);
            if (!userId) return tampilkanNotifAdmin('Pilih kader terlebih dahulu.', 'notif-warning');
            if (!/^\S{4,64}$/.test(newPass)) return tampilkanNotifAdmin('Password harus 4-64 karakter tanpa spasi.', 'notif-warning');
            simpanPasswordOverride(userId, newPass);
            tampilkanNotifAdmin(`Password ${userId} berhasil direset.`, 'notif-success');
            openScreen('admin-menu');
        }

        function bukaAdminGantiPassword() {
            document.getElementById('admin-form-title').innerText = 'Ganti Password Admin';
            document.getElementById('admin-form-content').innerHTML = `
                <div class="form-group"><label>Password Saat Ini</label><input id="adm-old-pass" type="password" minlength="4" maxlength="64"></div>
                <div class="form-group"><label>Password Baru</label><input id="adm-new-pass" type="password" minlength="4" maxlength="64"></div>
                <div class="form-group"><label>Konfirmasi Password Baru</label><input id="adm-new-pass2" type="password" minlength="4" maxlength="64"></div>
                <button class="btn-primary" type="button" onclick="simpanGantiPasswordAdmin()">Simpan Password Baru</button>
            `;
            openScreen('admin-form-screen');
        }

        function simpanGantiPasswordAdmin() {
            const userId = localStorage.getItem('id_kader_aktif');
            const oldPass = normalisasiTeks(document.getElementById('adm-old-pass')?.value);
            const newPass = normalisasiTeks(document.getElementById('adm-new-pass')?.value);
            const newPass2 = normalisasiTeks(document.getElementById('adm-new-pass2')?.value);
            const defaultPass = dataAkunKader[userId]?.nik || '';
            const currentPass = getEffectivePassword(userId, defaultPass);

            if (oldPass !== currentPass) return tampilkanNotifAdmin('Password saat ini tidak sesuai.', 'notif-warning');
            if (!/^\S{4,64}$/.test(newPass)) return tampilkanNotifAdmin('Password baru harus 4-64 karakter tanpa spasi.', 'notif-warning');
            if (newPass !== newPass2) return tampilkanNotifAdmin('Konfirmasi password tidak sama.', 'notif-warning');

            simpanPasswordOverride(userId, newPass);
            tampilkanNotifAdmin('Password admin berhasil diperbarui.', 'notif-success');
            openScreen('admin-menu');
        }

        function cetakLaporanAdmin() {
            bacaDataAdmin(({ sasaran, laporan, kecamatan }) => {
                const sasaranById = {};
                sasaran.forEach(s => sasaranById[s.id_sasaran] = s);
                const sasaranPerKader = buildGroupCount(sasaran, s => namaKader(s.id_kader));
                const laporanPerKader = buildGroupCount(laporan, l => namaKader(l.id_kader));
                const sasaranPerDesa = buildGroupCount(sasaran, s => s.desa || '-');
                const laporanPerDesa = buildGroupCount(laporan, l => sasaranById[l.id_sasaran]?.desa || '-');
                const renderRows = items => items.map((it, idx) => `<tr><td>${idx + 1}</td><td>${it.key}</td><td>${it.value}</td></tr>`).join('') || '<tr><td colspan="3">Tidak ada data</td></tr>';
                const html = `
                    <html><head><title>Cetak Laporan Admin</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;}h1{font-size:20px;}h2{font-size:16px;margin-top:18px;}table{width:100%;border-collapse:collapse;margin-top:8px;}th,td{border:1px solid #ccc;padding:8px;font-size:12px;text-align:left;}th{background:#f5f5f5;}</style></head>
                    <body>
                        <h1>Laporan Admin Kecamatan ${kecamatan || '-'}</h1>
                        <p>Tanggal cetak: ${new Date().toLocaleString()}</p>
                        <table>
                            <tr><th>Metrik</th><th>Nilai</th></tr>
                            <tr><td>Total Sasaran</td><td>${sasaran.length}</td></tr>
                            <tr><td>Sasaran Aktif</td><td>${sasaran.filter(s => s.status_aktif === 'AKTIF').length}</td></tr>
                            <tr><td>Sasaran Nonaktif</td><td>${sasaran.filter(s => s.status_aktif !== 'AKTIF').length}</td></tr>
                            <tr><td>Total Laporan</td><td>${laporan.length}</td></tr>
                        </table>
                        <h2>Rekap Sasaran Kader</h2>
                        <table><tr><th>No</th><th>Kader</th><th>Jumlah</th></tr>${renderRows(sasaranPerKader)}</table>
                        <h2>Rekap Pendampingan Kader</h2>
                        <table><tr><th>No</th><th>Kader</th><th>Jumlah</th></tr>${renderRows(laporanPerKader)}</table>
                        <h2>Rekap Sasaran Desa</h2>
                        <table><tr><th>No</th><th>Desa</th><th>Jumlah</th></tr>${renderRows(sasaranPerDesa)}</table>
                        <h2>Rekap Pendampingan Desa</h2>
                        <table><tr><th>No</th><th>Desa</th><th>Jumlah</th></tr>${renderRows(laporanPerDesa)}</table>
                    </body></html>
                `;
                const w = window.open('', '_blank');
                if (!w) return tampilkanNotifAdmin('Popup diblokir browser. Izinkan popup untuk cetak.', 'notif-warning');
                w.document.write(html);
                w.document.close();
                w.focus();
                w.print();
            });
        }

