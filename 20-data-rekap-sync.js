        function bukaMenuData() {
            if (getRoleAktif().startsWith('ADMIN')) return tampilkanNotifAdmin('Menu ini hanya untuk kader.', 'notif-warning');
            openScreen('data-screen');
            document.getElementById('filter-sasaran').value = 'ALL';
            document.getElementById('filter-laporan').value = 'ALL';
            renderDataSasaran();
            renderDataLaporan();
        }

        function renderDataSasaran() {
            const filter = document.getElementById('filter-sasaran').value;
            db.transaction(['sasaran'], 'readonly').objectStore('sasaran').getAll().onsuccess = e => {
                let list = e.target.result;
                const timAktif = localStorage.getItem('id_tim_aktif');
                const kecAktif = localStorage.getItem('kec_kader_aktif');
                list = list.filter(s => s.id_tim === timAktif && s.kecamatan === kecAktif);
                if (filter !== 'ALL') list = list.filter(s => s.jenis === filter);
                document.getElementById('list-sasaran').innerHTML = list.map(s => {
                    const aktifLabel = s.status_aktif === 'AKTIF' ? 'Aktif' : 'Nonaktif';
                    const akhir = s.tgl_akhir_aktif ? ` | Akhir: ${s.tgl_akhir_aktif}` : '';
                    return `<div class="list-mode-item"><div class="list-title"><span class="badge-jenis">${s.jenis}</span> ${s.nama}</div><div class="list-subtitle">${s.id_sasaran}</div><div class="list-text">${s.dusun} | ${aktifLabel}${akhir}</div><div class="list-actions"><span class="${s.status_sinkron === 0 ? 'status-0' : 'status-1'}">${s.status_sinkron === 0 ? 'Belum Sync' : 'Sudah Sync'}</span><button onclick="editSasaran('${s.id_sasaran}')" class="btn-edit-small">Edit</button></div></div>`;
                }).join('') || "<p style='color:#777; font-size:14px; text-align:center;'>Tidak ada data sasaran.</p>";
            };
        }

        function renderDataLaporan() {
            const filter = document.getElementById('filter-laporan').value;
            db.transaction(['sasaran'], 'readonly').objectStore('sasaran').getAll().onsuccess = es => {
                const sDict = {};
                es.target.result.forEach(s => sDict[s.id_sasaran] = s.jenis);
                db.transaction(['laporan'], 'readonly').objectStore('laporan').getAll().onsuccess = el => {
                    let list = el.target.result;
                    const timAktif = localStorage.getItem('id_tim_aktif');
                    const kecAktif = localStorage.getItem('kec_kader_aktif');
                    list = list.filter(l => l.id_tim === timAktif && l.kecamatan === kecAktif);
                    list.forEach(l => l.jenis = l.jenis || sDict[l.id_sasaran] || 'UNKN');
                    if (filter !== 'ALL') list = list.filter(l => l.jenis === filter);
                    document.getElementById('list-laporan').innerHTML = list.map(l =>
                        `<div class="list-mode-item"><div class="list-title"><span class="badge-jenis">${l.jenis}</span> ${l.bulan}</div><div class="list-subtitle">${l.id_sasaran}</div><div class="list-text">Tgl: ${l.tanggal}${l.tgl_persalinan ? ` | Persalinan: ${l.tgl_persalinan}` : ''}</div><div class="list-actions"><span class="${l.status_sinkron === 0 ? 'status-0' : 'status-1'}">${l.status_sinkron === 0 ? 'Belum Sync' : 'Sudah Sync'}</span><button onclick="editLaporan('${l.id_laporan}')" class="btn-edit-small">Edit</button></div></div>`
                    ).join('') || "<p style='color:#777; font-size:14px; text-align:center;'>Tidak ada data laporan.</p>";
                };
            };
        }

        function bukaMenuRekap() {
            if (getRoleAktif().startsWith('ADMIN')) return tampilkanNotifAdmin('Menu ini hanya untuk kader.', 'notif-warning');
            openScreen('rekap-screen');
            db.transaction(['sasaran'], 'readonly').objectStore('sasaran').getAll().onsuccess = e => {
                const timAktif = localStorage.getItem('id_tim_aktif');
                const kecAktif = localStorage.getItem('kec_kader_aktif');
                const s = e.target.result.filter(x => x.id_tim === timAktif && x.kecamatan === kecAktif);
                const sDict = {};
                s.forEach(x => sDict[x.id_sasaran] = x.jenis);
                db.transaction(['laporan'], 'readonly').objectStore('laporan').getAll().onsuccess = ev => {
                    const l = ev.target.result.filter(x => x.id_tim === timAktif && x.kecamatan === kecAktif);
                    l.forEach(x => x.jenis = x.jenis || sDict[x.id_sasaran] || 'UNKNOWN');
                    document.getElementById('rekap-content').innerHTML = `<h3 style="color:var(--primary-blue); font-size:17px;">Total Sasaran: ${s.length} Orang</h3><p style="margin-top:6px; font-size:13px; color:#555; line-height:1.6;">BUMIL: <b>${s.filter(x => x.jenis === 'BUMIL').length}</b> &nbsp;|&nbsp; CATIN: <b>${s.filter(x => x.jenis === 'CATIN').length}</b><br>BUFAS: <b>${s.filter(x => x.jenis === 'BUFAS').length}</b> &nbsp;|&nbsp; BADUTA: <b>${s.filter(x => x.jenis === 'BADUTA').length}</b></p><hr style="margin:18px 0; border:0.5px solid #e1e5ea;"><h3 style="color:var(--primary-blue); font-size:17px;">Total Laporan: ${l.length} Dokumen</h3><p style="margin-top:6px; font-size:13px; color:#555; line-height:1.6;">BUMIL: <b>${l.filter(x => x.jenis === 'BUMIL').length}</b> &nbsp;|&nbsp; CATIN: <b>${l.filter(x => x.jenis === 'CATIN').length}</b><br>BUFAS: <b>${l.filter(x => x.jenis === 'BUFAS').length}</b> &nbsp;|&nbsp; BADUTA: <b>${l.filter(x => x.jenis === 'BADUTA').length}</b></p>`;
                };
            };
        }

        function updateBadgeSinkronisasi() {
            let count = 0;
            db.transaction(['sasaran'], 'readonly').objectStore('sasaran').getAll().onsuccess = e => {
                count += e.target.result.filter(i => i.status_sinkron === 0).length;
                db.transaction(['laporan'], 'readonly').objectStore('laporan').getAll().onsuccess = ev => {
                    count += ev.target.result.filter(i => i.status_sinkron === 0).length;
                    const b = document.getElementById('sync-badge');
                    if (count > 0) { b.innerText = count; b.classList.remove('hidden'); }
                    else b.classList.add('hidden');
                };
            };
        }

        function prosesSinkronisasi() {
            if (getRoleAktif().startsWith('ADMIN')) return tampilkanNotifAdmin('Menu ini hanya untuk kader.', 'notif-warning');
            if (!navigator.onLine) return tampilkanNotif("Anda sedang offline. Cari sinyal internet dulu.", "notif-warning");
            document.getElementById('sync-text').innerText = "Menyinkronkan...";
            document.getElementById('sync-loader').style.display = 'block';
            document.getElementById('btn-sync-ui').disabled = true;

            const payload = { sasaran: [], laporan: [] };

            db.transaction(['sasaran'], 'readonly').objectStore('sasaran').getAll().onsuccess = e => {
                payload.sasaran = e.target.result.filter(i => i.status_sinkron === 0);
                db.transaction(['laporan'], 'readonly').objectStore('laporan').getAll().onsuccess = ev => {
                    payload.laporan = ev.target.result.filter(i => i.status_sinkron === 0);

                    payload.sasaran = payload.sasaran.map(item => ({
                        ...item,
                        sumber_data: normalizeSumberData(item.sumber_data, item.id_kader)
                    }));
                    payload.laporan = payload.laporan.map(item => ({
                        ...item,
                        sumber_data: normalizeSumberData(item.sumber_data, item.id_kader)
                    }));

                    if (payload.sasaran.length === 0 && payload.laporan.length === 0) {
                        resetTombolSync();
                        return tampilkanNotif("Semua data sudah tersinkron.", "notif-success");
                    }

                    postBackendAction('sync.push', payload, { timeoutMs: 30000, maxRetries: 1 })
                    .then(result => {
                        if (result.status === "sukses" || result.status === "ok" || result.ok === true) {
                            const trx = db.transaction(['sasaran', 'laporan'], 'readwrite');
                            payload.sasaran.forEach(s => { s.status_sinkron = 1; trx.objectStore('sasaran').put(s); });
                            payload.laporan.forEach(l => { l.status_sinkron = 1; trx.objectStore('laporan').put(l); });

                            trx.oncomplete = () => {
                                tampilkanNotif("Berhasil sinkron ke server.", "notif-success");
                                resetTombolSync();
                                updateBadgeSinkronisasi();
                                if (!document.getElementById('data-screen').classList.contains('hidden')) {
                                    renderDataSasaran();
                                    renderDataLaporan();
                                }
                            };
                        } else {
                            throw new Error(result.message || result.pesan || "Gagal menyimpan di server Google.");
                        }
                    })
                    .catch(error => {
                        const pesan = error.name === "AbortError" ? "Permintaan timeout. Coba sinkron lagi." : error.message;
                        tampilkanNotif("Gagal sinkron: " + pesan, "notif-warning");
                        resetTombolSync();
                    });
                };
            };
        }

        function resetTombolSync() {
            document.getElementById('sync-text').innerText = "5. SINKRONISASI DATA";
            document.getElementById('sync-loader').style.display = 'none';
            document.getElementById('btn-sync-ui').disabled = false;
        }

        function tampilkanNotif(msg, cls) {
            const n = document.getElementById('notif-box');
            n.innerText = msg;
            n.className = `notif ${cls}`;
            n.classList.remove('hidden');
            setTimeout(() => n.classList.add('hidden'), 3500);
        }
    
