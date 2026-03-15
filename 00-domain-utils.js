        function normalisasiDusun(item) {
            if (typeof item === "string") {
                const label = normalisasiTeks(item);
                return { value: label, label };
            }
            if (item && typeof item === "object") {
                const label = normalisasiTeks(item.nama || item.label || item.id);
                const value = normalisasiTeks(item.id || label);
                return { value, label };
            }
            return { value: "", label: "" };
        }

        function parseDateOnly(value) {
            if (!value) return null;
            const dt = new Date(`${value}T00:00:00`);
            return Number.isNaN(dt.getTime()) ? null : dt;
        }

        function toIsoDate(dt) {
            if (!dt) return '';
            return dt.toISOString().slice(0, 10);
        }

        function addDays(dt, days) {
            const x = new Date(dt.getTime());
            x.setDate(x.getDate() + days);
            return x;
        }

        function addMonths(dt, months) {
            const x = new Date(dt.getTime());
            x.setMonth(x.getMonth() + months);
            return x;
        }

        function evaluasiStatusAktif(data, alasan = '') {
            const today = parseDateOnly(toIsoDate(new Date()));
            let endDate = null;

            if (data.jenis === 'CATIN') endDate = parseDateOnly(data.ref_tgl_rencana_menikah || data.detail_khusus?.tgl_menikah);
            if (data.jenis === 'BUMIL') endDate = parseDateOnly(data.ref_tgl_persalinan || '');
            if (data.jenis === 'BUFAS') {
                const tglPersalinan = parseDateOnly(data.ref_tgl_persalinan || data.detail_khusus?.tgl_persalinan);
                if (tglPersalinan) endDate = addDays(tglPersalinan, 42);
            }
            if (data.jenis === 'BADUTA') {
                const tglLahir = parseDateOnly(data.ref_tgl_lahir_anak || data.detail_khusus?.tgl_lahir);
                if (tglLahir) endDate = addMonths(tglLahir, 60);
            }

            if (data.jenis === 'BUMIL' && !endDate) {
                data.status_aktif = 'AKTIF';
                data.tgl_akhir_aktif = '';
                data.alasan_nonaktif = '';
                return data;
            }

            data.tgl_akhir_aktif = endDate ? toIsoDate(endDate) : '';
            if (!endDate) {
                data.status_aktif = 'NONAKTIF';
                data.alasan_nonaktif = alasan || 'Tanggal referensi belum lengkap';
            } else if (today <= endDate) {
                data.status_aktif = 'AKTIF';
                data.alasan_nonaktif = '';
            } else {
                data.status_aktif = 'NONAKTIF';
                data.alasan_nonaktif = alasan || 'Masa aktif sasaran berakhir';
            }
            return data;
        }

        function refreshStatusAktifSasaran() {
            if (!db) return;
            db.transaction(['sasaran'], 'readwrite').objectStore('sasaran').getAll().onsuccess = e => {
                const list = e.target.result || [];
                const tx = db.transaction(['sasaran'], 'readwrite');
                const store = tx.objectStore('sasaran');
                list.forEach(item => {
                    const before = `${item.status_aktif}|${item.tgl_akhir_aktif}|${item.alasan_nonaktif}`;
                    evaluasiStatusAktif(item);
                    const after = `${item.status_aktif}|${item.tgl_akhir_aktif}|${item.alasan_nonaktif}`;
                    if (before !== after) {
                        item.status_sinkron = 0;
                        item.updated_at = new Date().toISOString();
                        store.put(item);
                    }
                });
            };
        }

        function updateBumilEventVisibility() {
            const jenis = document.getElementById('lapor-jenis').value;
            const wrap = document.getElementById('lapor-bumil-event-wrap');
            const tglWrap = document.getElementById('lapor-tgl-persalinan-wrap');
            const eventEl = document.getElementById('lapor-bumil-event');
            const tglEl = document.getElementById('lapor-tgl-persalinan');
            if (jenis === 'BUMIL') {
                wrap.classList.remove('hidden');
            } else {
                wrap.classList.add('hidden');
                tglWrap.classList.add('hidden');
                eventEl.value = '';
                tglEl.required = false;
                tglEl.value = '';
            }
        }

        function isiDefaultTanggalDanBulan() {
            const hariIni = new Date();
            const tanggalField = document.getElementById('lapor-tanggal');
            const bulanField = document.getElementById('lapor-bulan');
            if (!tanggalField.value) tanggalField.value = hariIni.toISOString().slice(0, 10);
            if (!bulanField.value) bulanField.value = NAMA_BULAN[hariIni.getMonth()];
        }

        window.addEventListener('load', () => {
            initBackendUrlFromQuery();
            muatKatalogUserCache();
            setTimeout(() => {
                document.getElementById('splash-screen').classList.add('hidden');
                const userId = localStorage.getItem('id_kader_aktif');
                const tim = localStorage.getItem('id_tim_aktif');
                const nomorTim = localStorage.getItem('nomor_tim_aktif');
                const namaWilayahLengkap = localStorage.getItem('nama_wilayah_lengkap_aktif');
                const wilkerDusun = localStorage.getItem('wilker_dusun_aktif');
                const nama = localStorage.getItem('nama_kader_aktif');
                const kec = localStorage.getItem('kec_kader_aktif');
                const desa = localStorage.getItem('desa_kader_aktif');
                const role = getRoleAktif();

                if (userId && nama) {
                    if (role.startsWith('ADMIN')) {
                        renderInfoAdmin(nama, userId, role, kec);
                        renderAdminMenu(role);
                        openScreen('admin-menu');
                    } else {
                        renderInfoKader(nama, userId, tim, desa, kec, nomorTim, namaWilayahLengkap, wilkerDusun);
                        openScreen('main-menu');
                        refreshStatusAktifSasaran();
                        setTimeout(() => { hydrateKaderWilkerAsync(); }, 10);
                    }
                } else {
                    document.getElementById('login-screen').classList.remove('hidden');
                }
            }, 2000);
        });

        function togglePassword() {
            const pwdInput = document.getElementById('login-password');
            const icon = document.getElementById('toggle-pwd-icon');
            if (pwdInput.type === 'password') {
                pwdInput.type = 'text';
                icon.innerText = 'Sembunyi';
            } else {
                pwdInput.type = 'password';
                icon.innerText = 'Lihat';
            }
        }

