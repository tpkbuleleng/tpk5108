        function ubahKecamatan() {
            const kecSelect = document.getElementById('reg-kecamatan');
            let kec = normalisasiKodeKecamatan(kecSelect.value);
            if (!kec) {
                kec = normalisasiKodeKecamatan(localStorage.getItem('kec_kode_aktif') || localStorage.getItem('kec_kader_aktif'));
                if (kec) kecSelect.value = kec;
            }
            const desa = document.getElementById('reg-desa');
            const dusun = document.getElementById('reg-dusun');
            desa.innerHTML = '<option value="">-- Pilih Desa/Kelurahan --</option>';
            dusun.innerHTML = '<option value="">-- Pilih Desa Dulu --</option>';
            desa.disabled = true;
            dusun.disabled = true;

            const scopedMap = getMapWilayahScoped(kec);
            const scopedDesa = Object.keys(scopedMap);

            if (scopedDesa.length > 0) {
                scopedDesa.forEach((namaDesa) => {
                    const opt = document.createElement('option');
                    opt.value = namaDesa;
                    opt.textContent = namaDesa;
                    desa.appendChild(opt);
                });
                desa.disabled = scopedDesa.length === 1;
                if (scopedDesa.length === 1) desa.value = scopedDesa[0];
            } else {
                const desaAktif = normalisasiTeks(localStorage.getItem('desa_kader_aktif'));
                if (desaAktif) {
                    const opt = document.createElement('option');
                    opt.value = desaAktif;
                    opt.textContent = desaAktif;
                    desa.appendChild(opt);
                    desa.value = desaAktif;
                    desa.disabled = true;
                } else {
                    const opt = document.createElement('option');
                    opt.value = '';
                    opt.textContent = '-- Wilayah desa belum termuat, klik ulang menu Registrasi --';
                    desa.appendChild(opt);
                }
            }
            handleJenisSasaran(false);
        }

        function ubahDesa() {
            const kec = document.getElementById('reg-kecamatan').value;
            const desa = document.getElementById('reg-desa').value;
            const dusun = document.getElementById('reg-dusun');
            dusun.innerHTML = '<option value="">-- Pilih Banjar/RW --</option>';
            dusun.disabled = true;

            const scopedMap = getMapWilayahScoped(kec);
            const scopedDusun = (scopedMap[desa] || []).filter(d => d.value && d.label);

            if (scopedDusun.length > 0) {
                dusun.disabled = false;
                scopedDusun.forEach((d) => {
                    const opt = document.createElement('option');
                    opt.value = d.value;
                    opt.textContent = d.label;
                    dusun.appendChild(opt);
                });
                if (scopedDusun.length === 1) dusun.value = scopedDusun[0].value;
            } else if (kec && desa && dataWilayah[kec] && dataWilayah[kec][desa]) {
                dusun.disabled = false;
                dataWilayah[kec][desa].forEach(item => {
                    const dusunItem = normalisasiDusun(item);
                    if (!dusunItem.value || !dusunItem.label) return;
                    const opt = document.createElement('option');
                    opt.value = dusunItem.value;
                    opt.textContent = dusunItem.label;
                    dusun.appendChild(opt);
                });
            } else {
                const statisByDesa = cariDusunStatisByDesa(desa, kec);
                if (statisByDesa.length) {
                    dusun.disabled = false;
                    statisByDesa.forEach((d) => {
                        const opt = document.createElement('option');
                        opt.value = d.value;
                        opt.textContent = d.label;
                        dusun.appendChild(opt);
                    });
                } else {
                    const opt = document.createElement('option');
                    opt.value = '';
                    opt.textContent = '-- Data dusun tim belum termuat, klik ulang menu Registrasi --';
                    dusun.appendChild(opt);
                }
            }
            handleJenisSasaran(false);
        }

        function handleJenisSasaran(isEditMode = false) {
            const kec = document.getElementById('reg-kecamatan').value;
            const jenis = document.getElementById('reg-jenis').value;
            const idField = document.getElementById('reg-id');
            const cont = document.getElementById('pertanyaan-khusus');
            const konten = document.getElementById('konten-khusus');
            if (!isEditMode && !editModeSasaranId) idField.value = (kec && jenis) ? `${jenis}-${kec}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` : "";
            let html = "";
            if (jenis && pertanyaanKhusus[jenis]) {
                pertanyaanKhusus[jenis].forEach(tanya => {
                    const req = tanya.required ? "required" : "";
                    const bintang = tanya.required ? " *" : " (Ops)";
                    html += `<div class="form-group"><label>${tanya.label}${bintang}</label>`;
                    if (tanya.type === "select") {
                        html += `<select name="${tanya.id_input}" ${req}><option value="">-- Pilih --</option>`;
                        tanya.options.forEach(opt => html += `<option value="${opt}">${opt}</option>`);
                        html += `</select></div>`;
                    } else {
                        html += `<input type="${tanya.type}" name="${tanya.id_input}" ${tanya.step ? `step="${tanya.step}"` : ""} ${req}></div>`;
                    }
                });
            }
            if (html !== "") { konten.innerHTML = html; cont.classList.remove('hidden'); }
            else { cont.classList.add('hidden'); konten.innerHTML = ""; }
        }

        document.getElementById('form-registrasi').addEventListener('submit', e => {
            e.preventDefault();
            const dropDusun = document.getElementById('reg-dusun');
            const selectedDusunText = dropDusun.selectedIndex >= 0 ? dropDusun.options[dropDusun.selectedIndex].text : "";
            const detailKhusus = {};
            document.querySelectorAll('#konten-khusus input, #konten-khusus select').forEach(el => detailKhusus[el.name] = el.value);

            const data = {
                id_kader: localStorage.getItem('id_kader_aktif'),
                id_tim: localStorage.getItem('id_tim_aktif'),
                id_sasaran: document.getElementById('reg-id').value,
                kecamatan: normalisasiTeks(localStorage.getItem('kec_kader_aktif') || document.getElementById('reg-kecamatan').value),
                desa: document.getElementById('reg-desa').value,
                dusun: selectedDusunText,
                id_wilayah: dropDusun.value,
                jenis: document.getElementById('reg-jenis').value,
                nik: document.getElementById('reg-nik').value,
                nama: document.getElementById('reg-nama').value,
                status_sinkron: 0,
                detail_khusus: detailKhusus,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                tgl_mulai_aktif: toIsoDate(new Date()),
                ref_tgl_rencana_menikah: normalisasiTeks(detailKhusus.tgl_menikah),
                ref_tgl_persalinan: normalisasiTeks(detailKhusus.tgl_persalinan),
                ref_tgl_lahir_anak: normalisasiTeks(detailKhusus.tgl_lahir),
                tgl_akhir_aktif: '',
                status_aktif: 'AKTIF',
                alasan_nonaktif: '',
                sumber_data: tentukanSumberData(localStorage.getItem('id_kader_aktif'))
            };
            if (!normalisasiTeks(data.id_sasaran)) {
                return tampilkanNotif("ID sasaran belum terbentuk. Pilih dusun dan jenis sasaran.", "notif-warning");
            }
            evaluasiStatusAktif(data);
            db.transaction(['sasaran'], 'readonly').objectStore('sasaran').getAll().onsuccess = eAll => {
                const adaNikSama = eAll.target.result.find(s => s.nik === data.nik && s.id_sasaran !== editModeSasaranId);
                if (adaNikSama) return tampilkanNotif("NIK sudah terdaftar pada sasaran lain.", "notif-warning");
                db.transaction(['sasaran'], 'readwrite').objectStore('sasaran')[editModeSasaranId ? 'put' : 'add'](data).onsuccess = () => {
                    tampilkanNotif(editModeSasaranId ? "Sasaran diupdate." : "Sasaran disimpan.", "notif-success");
                    batalFormSasaran();
                };
            };
        });

        function batalFormSasaran() { editModeSasaranId = null; kembaliKeMenu(); }

        function editSasaran(id) {
            db.transaction(['sasaran'], 'readonly').objectStore('sasaran').get(id).onsuccess = e => {
                const data = e.target.result;
                editModeSasaranId = id;
                document.getElementById('judul-form-sasaran').innerText = "Update Sasaran";
                document.getElementById('btn-submit-sasaran').innerText = "Update Data";
                document.getElementById('reg-id').value = data.id_sasaran;
                document.getElementById('reg-nik').value = data.nik;
                document.getElementById('reg-nama').value = data.nama;

                const kecSelect = document.getElementById('reg-kecamatan');
                const desaSelect = document.getElementById('reg-desa');
                const grupKecamatan = kecSelect.closest('.form-group');
                if (grupKecamatan) grupKecamatan.classList.add('hidden');
                const kecCode = normalisasiKodeKecamatan(data.kecamatan || localStorage.getItem('kec_kode_aktif') || localStorage.getItem('kec_kader_aktif'));
                const namaKec = normalisasiNamaKecamatan(data.kecamatan || kecCode);
                kecSelect.innerHTML = '';
                const optKec = document.createElement('option');
                optKec.value = kecCode;
                optKec.textContent = namaKec || kecCode || '-';
                kecSelect.appendChild(optKec);
                kecSelect.value = kecCode;
                ubahKecamatan();
                kecSelect.disabled = true;
                desaSelect.value = data.desa;
                ubahDesa();

                document.getElementById('reg-dusun').value = data.id_wilayah ? data.id_wilayah : data.dusun;
                document.getElementById('reg-jenis').value = data.jenis;
                handleJenisSasaran(true);
                setTimeout(() => {
                    for (const key in data.detail_khusus) {
                        const el = document.querySelector(`[name="${key}"]`);
                        if (el) el.value = data.detail_khusus[key];
                    }
                }, 100);
                openScreen('registrasi-screen');
            };
        }

        function bukaMenuLapor() {
            if (getRoleAktif().startsWith('ADMIN')) return tampilkanNotifAdmin('Menu ini hanya untuk kader.', 'notif-warning');
            document.getElementById('form-laporan').reset();
            document.getElementById('lapor-jenis').value = '';
            document.getElementById('lapor-sasaran-id').innerHTML = '<option value="">-- Pilih Jenis Sasaran Dulu --</option>';
            document.getElementById('lapor-sasaran-id').disabled = true;
            updateBumilEventVisibility();
            isiDefaultTanggalDanBulan();
            openScreen('lapor-screen');
        }

        document.getElementById('lapor-tanggal').addEventListener('change', e => {
            if (!e.target.value) return;
            const tanggal = new Date(e.target.value);
            if (!Number.isNaN(tanggal.getTime())) document.getElementById('lapor-bulan').value = NAMA_BULAN[tanggal.getMonth()];
        });
        document.getElementById('lapor-bumil-event').addEventListener('change', e => {
            const wrap = document.getElementById('lapor-tgl-persalinan-wrap');
            const field = document.getElementById('lapor-tgl-persalinan');
            if (e.target.value === 'PERSALINAN') {
                wrap.classList.remove('hidden');
                field.required = true;
            } else {
                wrap.classList.add('hidden');
                field.required = false;
                field.value = '';
            }
        });

        function filterSasaranLapor() {
            refreshStatusAktifSasaran();
            updateBumilEventVisibility();

            const jenis = document.getElementById('lapor-jenis').value;
            const sel = document.getElementById('lapor-sasaran-id');
            if (!jenis) {
                sel.innerHTML = '<option value="">-- Pilih Jenis Sasaran Dulu --</option>';
                sel.disabled = true;
                return;
            }

            const timAktif = localStorage.getItem('id_tim_aktif');
            const kecAktif = localStorage.getItem('kec_kader_aktif');
            db.transaction(['sasaran'], 'readonly').objectStore('sasaran').getAll().onsuccess = e => {
                const list = e.target.result.filter(s => s.jenis === jenis && s.status_aktif === 'AKTIF' && s.id_tim === timAktif && s.kecamatan === kecAktif);
                sel.disabled = false;
                if (list.length === 0) sel.innerHTML = '<option value="">-- Tidak ada sasaran aktif untuk jenis ini --</option>';
                else {
                    sel.innerHTML = '<option value="">-- Pilih Sasaran --</option>';
                    list.forEach(s => sel.innerHTML += `<option value="${s.id_sasaran}">${s.nama}</option>`);
                }
            };
        }
        function prosesTransisiBumilKeBufas(idSasaranBumil, tglPersalinan, callback) {
            db.transaction(['sasaran'], 'readonly').objectStore('sasaran').getAll().onsuccess = e => {
                const semua = e.target.result || [];
                const bumil = semua.find(s => s.id_sasaran === idSasaranBumil);
                if (!bumil) return callback('Sasaran BUMIL tidak ditemukan.');

                const tx = db.transaction(['sasaran'], 'readwrite');
                const store = tx.objectStore('sasaran');

                bumil.ref_tgl_persalinan = tglPersalinan;
                bumil.updated_at = new Date().toISOString();
                bumil.status_sinkron = 0;
                evaluasiStatusAktif(bumil, 'Transisi otomatis ke BUFAS');
                bumil.status_aktif = 'NONAKTIF';
                bumil.tgl_akhir_aktif = tglPersalinan;
                store.put(bumil);

                const existingBufas = semua.find(s => s.jenis === 'BUFAS' && s.id_parent_sasaran === bumil.id_sasaran && s.nik === bumil.nik);
                if (!existingBufas) {
                    const idBufas = `BUFAS-${bumil.kecamatan}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                    const bufas = {
                        id_kader: bumil.id_kader,
                        id_tim: bumil.id_tim,
                        id_sasaran: idBufas,
                        kecamatan: bumil.kecamatan,
                        desa: bumil.desa,
                        dusun: bumil.dusun,
                        id_wilayah: bumil.id_wilayah,
                        jenis: 'BUFAS',
                        nik: bumil.nik,
                        nama: bumil.nama,
                        detail_khusus: { tgl_persalinan: tglPersalinan, metode_kb: 'Belum Pakai KB' },
                        ref_tgl_rencana_menikah: '',
                        ref_tgl_persalinan: tglPersalinan,
                        ref_tgl_lahir_anak: '',
                        tgl_mulai_aktif: toIsoDate(new Date()),
                        tgl_akhir_aktif: '',
                        status_aktif: 'AKTIF',
                        alasan_nonaktif: '',
                        id_parent_sasaran: bumil.id_sasaran,
                        status_sinkron: 0,
                        sumber_data: normalizeSumberData(bumil.sumber_data, bumil.id_kader),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    evaluasiStatusAktif(bufas);
                    store.add(bufas);
                }

                tx.oncomplete = () => callback('');
                tx.onerror = () => callback('Gagal menyimpan transisi BUMIL ke BUFAS.');
            };
        }

        document.getElementById('form-laporan').addEventListener('submit', e => {
            e.preventDefault();
            const jenis = document.getElementById('lapor-jenis').value;
            const eventBumil = document.getElementById('lapor-bumil-event').value;
            const tglPersalinan = document.getElementById('lapor-tgl-persalinan').value;

            if (jenis === 'BUMIL' && eventBumil === 'PERSALINAN' && !tglPersalinan) {
                return tampilkanNotif('Tanggal persalinan wajib diisi untuk event BUMIL.', 'notif-warning');
            }

            const data = {
                id_kader: localStorage.getItem('id_kader_aktif'),
                id_tim: localStorage.getItem('id_tim_aktif'),
                kecamatan: localStorage.getItem('kec_kader_aktif'),
                id_laporan: editModeLaporanId || "REP-" + Date.now(),
                jenis: jenis,
                id_sasaran: document.getElementById('lapor-sasaran-id').value,
                tanggal: document.getElementById('lapor-tanggal').value,
                bulan: document.getElementById('lapor-bulan').value,
                status: document.getElementById('lapor-status').value,
                edukasi: document.getElementById('lapor-edukasi').value,
                catatan: document.getElementById('lapor-catatan').value,
                bumil_event: eventBumil,
                tgl_persalinan: tglPersalinan,
                status_sinkron: 0,
                sumber_data: tentukanSumberData(localStorage.getItem('id_kader_aktif')),
                updated_at: new Date().toISOString()
            };

            db.transaction(['laporan'], 'readwrite').objectStore('laporan')[editModeLaporanId ? 'put' : 'add'](data).onsuccess = () => {
                const selesai = () => {
                    tampilkanNotif(editModeLaporanId ? "Laporan diupdate." : "Laporan disimpan.", "notif-success");
                    editModeLaporanId = null;
                    kembaliKeMenu();
                };

                if (jenis === 'BUMIL' && eventBumil === 'PERSALINAN' && tglPersalinan) {
                    prosesTransisiBumilKeBufas(data.id_sasaran, tglPersalinan, (err) => {
                        if (err) return tampilkanNotif(err, 'notif-warning');
                        tampilkanNotif('Transisi otomatis BUMIL ke BUFAS berhasil.', 'notif-success');
                        selesai();
                    });
                } else {
                    selesai();
                }
            };
        });

        function batalFormLaporan() {
            document.getElementById('form-laporan').reset();
            document.getElementById('btn-submit-laporan').innerText = "Simpan Laporan";
            document.getElementById('judul-form-laporan').innerText = "Lapor Pendampingan";
            editModeLaporanId = null;
            updateBumilEventVisibility();
            filterSasaranLapor();
            kembaliKeMenu();
        }

        function editLaporan(id) {
            db.transaction(['laporan'], 'readonly').objectStore('laporan').get(id).onsuccess = e => {
                const data = e.target.result;
                editModeLaporanId = id;
                document.getElementById('judul-form-laporan').innerText = "Update Laporan";
                document.getElementById('btn-submit-laporan').innerText = "Update Data";
                db.transaction(['sasaran'], 'readonly').objectStore('sasaran').getAll().onsuccess = es => {
                    const objSasaran = es.target.result.find(s => s.id_sasaran === data.id_sasaran);
                    const jenis = objSasaran ? objSasaran.jenis : (data.jenis || "");
                    document.getElementById('lapor-jenis').value = jenis;
                    const sel = document.getElementById('lapor-sasaran-id');
                    sel.disabled = false;
                    sel.innerHTML = '<option value="">-- Pilih Sasaran --</option>';
                    es.target.result.filter(s => s.jenis === jenis).forEach(s => sel.innerHTML += `<option value="${s.id_sasaran}">${s.nama}</option>`);
                    document.getElementById('lapor-sasaran-id').value = data.id_sasaran;
                    document.getElementById('lapor-tanggal').value = data.tanggal || "";
                    document.getElementById('lapor-bulan').value = data.bulan || "";
                    document.getElementById('lapor-status').value = data.status || "";
                    document.getElementById('lapor-edukasi').value = data.edukasi || "";
                    document.getElementById('lapor-catatan').value = data.catatan || "";
                    document.getElementById('lapor-bumil-event').value = data.bumil_event || "";
                    document.getElementById('lapor-tgl-persalinan').value = data.tgl_persalinan || "";
                    updateBumilEventVisibility();
                    document.getElementById('lapor-bumil-event').dispatchEvent(new Event('change'));
                    openScreen('lapor-screen');
                };
            };
        }

