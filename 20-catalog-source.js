        function muatKatalogUserCache() {
            try {
                const cache = JSON.parse(localStorage.getItem(USER_CATALOG_KEY) || '{}');
                Object.keys(cache || {}).forEach((id) => {
                    if (!id) return;
                    dataAkunKader[id] = { ...(dataAkunKader[id] || {}), ...(cache[id] || {}) };
                });
            } catch (e) {
                console.warn('Gagal membaca cache katalog user:', e);
            }
        }

        function simpanKatalogUserCache() {
            try {
                localStorage.setItem(USER_CATALOG_KEY, JSON.stringify(dataAkunKader || {}));
            } catch (e) {
                console.warn('Gagal menyimpan cache katalog user:', e);
            }
        }

        function extractArrayFromResponse(resp) {
            const kandidat = [
                resp,
                resp?.data,
                resp?.rows,
                resp?.items,
                resp?.list,
                resp?.master_kader,
                resp?.masterKader,
                resp?.master_wilayah,
                resp?.masterWilayah,
                resp?.wilayah,
                resp?.result
            ];
            for (const item of kandidat) {
                if (Array.isArray(item)) return item;
            }
            return [];
        }

        function getAdminUserIdForApi() {
            return normalisasiTeks(
                localStorage.getItem('backend_user_id_aktif')
                || localStorage.getItem('username_login_aktif')
                || localStorage.getItem('id_kader_aktif')
            );
        }

        async function fetchRowsBackendForAdminKader(kecAktif) {
            const idUser = getAdminUserIdForApi();
            const payloads = [
                { id_user: idUser, username_login: idUser, username: idUser, user_id: idUser, kecamatan: kecAktif, scope_kecamatan: kecAktif, mode: 'RIIL' },
                { id_user: idUser, username_login: idUser, username: idUser, user_id: idUser, mode: 'RIIL' },
                { id_user: idUser, kecamatan: kecAktif, mode: 'RIIL' },
                { id_user: idUser, mode: 'RIIL' },
                { username_login: idUser, kecamatan: kecAktif, mode: 'RIIL' },
                { username_login: idUser, mode: 'RIIL' },
                { kecamatan: kecAktif, mode: 'RIIL' }
            ];
            const actions = [
                'master-kader',
                'master.kader',
                'master-wilayah',
                'bootstrap',
                'master.bootstrap'
            ];

            for (const payload of payloads) {
                for (const action of actions) {
                    try {
                        const resp = await postBackendAction(action, payload, { timeoutMs: 12000, maxRetries: 0 });
                        const rows = extractArrayFromResponse(resp);
                        if (rows.length) return rows;
                    } catch (e) {
                        // lanjut ke kandidat berikutnya
                    }
                }
            }
            return [];
        }

        async function hydrateAdminKatalogFromMasterWilayah(force = false) {
            if (!getRoleAktif().startsWith('ADMIN')) return;
            if (adminCatalogHydrating) return;
            const kecAktif = getKecamatanAktif();
            const lockKey = `${ADMIN_CATALOG_HYDRATE_KEY}_${normalisasiKodeKecamatan(kecAktif) || normalisasiTeks(kecAktif).toUpperCase()}`;
            if (!force && localStorage.getItem(lockKey) === '1') return;

            adminCatalogHydrating = true;
            try {
                const rows = await fetchRowsBackendForAdminKader(kecAktif);
                let changed = 0;
                let matched = 0;

                rows.forEach((r) => {
                    const row = r || {};
                    const id = normalisasiTeks(
                        row.id_kader || row.username_login || row.id_user || row.user_id || row.id || row.kode_kader || row.user
                    ).toUpperCase();
                    if (!id) return;

                    const roleRaw = normalisasiTeks(row.role_akses || row.role || row.level_akses || row.jenis_user).toUpperCase();
                    const timRaw = normalisasiTeks(row.id_tim || row.tim_id || row.nomor_tim || row.tim || row.kode_tim);
                    const desaRaw = normalisasiTeks(row.desa_kelurahan || row.desa || row.nama_desa || row.scope_desa);
                    const role = roleRaw || ((timRaw || desaRaw) ? 'KADER' : '');
                    if (role && role !== 'KADER') return;

                    const kecRaw = normalisasiTeks(
                        row.kecamatan || row.nama_kecamatan || row.scope_kecamatan || row.kec || row.kecamatan_code || row.kec_code
                    );
                    if (!isKecamatanMatch(kecRaw, kecAktif)) return;
                    matched += 1;

                    dataAkunKader[id] = {
                        ...(dataAkunKader[id] || {}),
                        nama: normalisasiTeks(row.nama_kader || row.nama || row.nama_user || dataAkunKader[id]?.nama || id),
                        role: 'KADER',
                        kec: normalisasiNamaKecamatan(kecRaw),
                        desa: desaRaw || normalisasiTeks(dataAkunKader[id]?.desa),
                        tim: timRaw || normalisasiTeks(dataAkunKader[id]?.tim),
                        nomor_tim: normalisasiTeks(row.nomor_tim || timRaw || dataAkunKader[id]?.nomor_tim)
                    };
                    changed += 1;
                });

                if (changed > 0) {
                    simpanKatalogUserCache();
                    renderAdminSummaryCard();
                    if (!document.getElementById('admin-report-screen').classList.contains('hidden')) refreshActiveAdminView();
                }
                if (rows.length > 0 || matched > 0) {
                    localStorage.setItem(lockKey, '1');
                } else {
                    localStorage.removeItem(lockKey);
                }
            } catch (e) {
                console.warn('Hydrate katalog admin dari master-wilayah gagal:', e);
                localStorage.removeItem(lockKey);
            } finally {
                adminCatalogHydrating = false;
            }
        }

        function cacheUserDariSession(sesi) {
            const id = normalisasiTeks(sesi?.idKader).toUpperCase();
            if (!id) return;
            const role = normalisasiTeks(sesi?.role || 'KADER').toUpperCase();
            dataAkunKader[id] = {
                ...(dataAkunKader[id] || {}),
                nik: normalisasiTeks(dataAkunKader[id]?.nik),
                nama: normalisasiTeks(sesi?.nama) || normalisasiTeks(dataAkunKader[id]?.nama) || id,
                role,
                kec: normalisasiTeks(sesi?.kec) || normalisasiTeks(dataAkunKader[id]?.kec),
                desa: normalisasiTeks(sesi?.desa) || normalisasiTeks(dataAkunKader[id]?.desa),
                tim: normalisasiTeks(sesi?.kodeTim) || normalisasiTeks(dataAkunKader[id]?.tim),
                nomor_tim: normalisasiTeks(sesi?.nomorTim) || normalisasiTeks(dataAkunKader[id]?.nomor_tim),
                nama_wilayah_lengkap: normalisasiTeks(sesi?.namaWilayahLengkap) || normalisasiTeks(dataAkunKader[id]?.nama_wilayah_lengkap),
                wilker_dusun: normalisasiTeks(sesi?.wilkerDusun) || normalisasiTeks(dataAkunKader[id]?.wilker_dusun)
            };
            simpanKatalogUserCache();
        }

        function getRoleAktif() {
            return normalisasiTeks(localStorage.getItem('role_aktif')) || 'KADER';
        }

        function getKecamatanAktif() {
            return normalisasiTeks(localStorage.getItem('kec_kader_aktif'));
        }

        function isKecamatanMatch(value, target) {
            const t = normalisasiTeks(target);
            if (!t) return true;
            const v = normalisasiTeks(value);
            const codeT = normalisasiKodeKecamatan(t);
            const codeV = normalisasiKodeKecamatan(v);
            if (codeT && codeV) return codeT === codeV;
            return v.toUpperCase() === t.toUpperCase();
        }

        function getPasswordOverrides() {
            try {
                return JSON.parse(localStorage.getItem('password_overrides') || '{}');
            } catch (e) {
                return {};
            }
        }

        function isUjiUserId(userId) {
            const id = normalisasiTeks(userId).toUpperCase();
            return CUTOVER_UJI_IDS.includes(id);
        }

        function tentukanSumberData(userId) {
            const id = normalisasiTeks(userId).toUpperCase();
            if (isUjiUserId(id)) return 'UJI';

            const profil = dataAkunKader[id] || {};
            const penanda = `${normalisasiTeks(profil.nama)} ${normalisasiTeks(profil.catatan)}`.toLowerCase();
            if (penanda.includes('uji') || penanda.includes('uat')) return 'UJI';

            return 'RIIL';
        }

        function isUjiRecord(item) {
            if (!item) return false;
            const sumber = normalizeSumberData(item.sumber_data, item.id_kader);
            return sumber === 'UJI' || isUjiUserId(item.id_kader);
        }

        function jalankanCutoverRiilLokal() {
            if (!db) return;
            if (localStorage.getItem(CUTOVER_LOCAL_KEY) === '1') return;

            const bersihkanStore = (storeName) => new Promise((resolve) => {
                let deleted = 0;
                const tx = db.transaction([storeName], 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.openCursor();
                req.onsuccess = (ev) => {
                    const cursor = ev.target.result;
                    if (!cursor) return;
                    if (isUjiRecord(cursor.value)) {
                        cursor.delete();
                        deleted += 1;
                    }
                    cursor.continue();
                };
                tx.oncomplete = () => resolve(deleted);
                tx.onerror = () => resolve(deleted);
            });

            Promise.all([bersihkanStore('sasaran'), bersihkanStore('laporan')]).then(([delS, delL]) => {
                const overrides = getPasswordOverrides();
                CUTOVER_UJI_IDS.forEach((id) => {
                    delete overrides[id];
                    delete dataAkunKader[id];
                });
                localStorage.setItem('password_overrides', JSON.stringify(overrides));
                simpanKatalogUserCache();
                localStorage.setItem(CUTOVER_LOCAL_KEY, '1');

                if (delS > 0 || delL > 0) {
                    console.info(`Cutover RIIL: hapus data UJI lokal sasaran=${delS}, laporan=${delL}`);
                    updateBadgeSinkronisasi();
                }
            });
        }

        function normalizeSumberData(value, fallbackUserId) {
            const sumber = normalisasiTeks(value).toUpperCase();
            if (sumber === 'UJI' || sumber === 'RIIL') return sumber;
            return tentukanSumberData(fallbackUserId);
        }

        function parseDateOnlyForCutover(value) {
            const v = normalisasiTeks(value);
            if (!v) return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
            if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return `${v.slice(6, 10)}-${v.slice(3, 5)}-${v.slice(0, 2)}`;
            return '';
        }

        function isCutoverRiilActive() {
            const todayIso = toIsoDate(new Date());
            return todayIso >= CUTOVER_RIIL_START_DATE;
        }

        function isAdminSourceLocked() {
            const role = getRoleAktif().toUpperCase();
            if (role === 'SUPER_ADMIN') return false;
            if (role.startsWith('ADMIN')) return true;
            return isCutoverRiilActive();
        }

        function getForcedAdminSumberFilter() {
            return isAdminSourceLocked() ? 'RIIL' : '';
        }

        function resolveRecordDateForCutover(item) {
            if (!item) return '';
            const tanggal = parseDateOnlyForCutover(item.tanggal || item.tanggal_input || item.tgl_input);
            if (tanggal) return tanggal;
            const stamp = parseDateOnlyForCutover(item.created_at || item.updated_at);
            if (stamp) return stamp;
            return '';
        }

        function applyAdminCutoverDateFilter(items) {
            const rows = items || [];
            if (!isAdminSourceLocked()) return rows;
            return rows.filter((item) => {
                const d = resolveRecordDateForCutover(item);
                return d && d >= CUTOVER_RIIL_START_DATE;
            });
        }

        function enforceAdminSumberFilterPolicy() {
            const forced = getForcedAdminSumberFilter();
            if (forced) {
                localStorage.setItem(ADMIN_SUMBER_FILTER_KEY, forced);
                return;
            }
            localStorage.setItem(ADMIN_SUMBER_FILTER_KEY, normalizeAdminSumberFilter(localStorage.getItem(ADMIN_SUMBER_FILTER_KEY) || 'ALL'));
        }
        function normalizeAdminSumberFilter(value) {
            const forced = getForcedAdminSumberFilter();
            if (forced) return forced;
            const v = normalisasiTeks(value).toUpperCase();
            if (v === 'UJI' || v === 'RIIL') return v;
            return 'ALL';
        }

        function getAdminSumberFilter() {
            return normalizeAdminSumberFilter(localStorage.getItem(ADMIN_SUMBER_FILTER_KEY) || 'ALL');
        }

        function setAdminSumberFilter(value) {
            const forced = getForcedAdminSumberFilter();
            if (forced) {
                localStorage.setItem(ADMIN_SUMBER_FILTER_KEY, forced);
                return;
            }
            localStorage.setItem(ADMIN_SUMBER_FILTER_KEY, normalizeAdminSumberFilter(value));
        }

        function applyAdminSumberFilter(items) {
            const mode = getAdminSumberFilter();
            if (mode === 'ALL') return items || [];
            return (items || []).filter(item => normalizeSumberData(item?.sumber_data, item?.id_kader) === mode);
        }

        function buildAdminSumberFilterControl(onChangeFnName, selectId = 'admin-sumber-filter') {
            return '';
        }

        function refreshActiveAdminView() {
            switch (activeAdminViewKey) {
                case 'dashboard':
                    return bukaAdminDashboard();
                case 'rekap_sasaran_kader':
                    return bukaAdminRekapSasaranPerKader();
                case 'rekap_sasaran_desa':
                    return bukaAdminRekapSasaranPerDesa();
                case 'rekap_pendampingan_kader':
                    return bukaAdminRekapPendampinganPerKader();
                case 'rekap_pendampingan_desa':
                    return bukaAdminRekapPendampinganPerDesa();
                case 'daftar_hadir':
                    return bukaAdminDaftarHadirPendampingan();
                default:
                    return renderAdminSummaryCard();
            }
        }

        function onAdminSumberFilterChange(value) {
            setAdminSumberFilter(value);
            renderAdminSummaryCard();
            if (!document.getElementById('admin-report-screen').classList.contains('hidden')) refreshActiveAdminView();
        }

        function getEffectivePassword(userId, defaultPassword) {
            const overrides = getPasswordOverrides();
            return normalisasiTeks(overrides[userId]) || normalisasiTeks(defaultPassword);
        }

        function canonicalizeUserId(value) {
            return normalisasiTeks(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
        }

        function isLocalPasswordMatch(userId, defaultPassword, inputPassword) {
            const input = normalisasiTeks(inputPassword);
            if (!input) return false;

            const overrides = getPasswordOverrides();
            const kandidat = [
                normalisasiTeks(overrides[userId]),
                normalisasiTeks(defaultPassword)
            ].filter(Boolean);

            return Array.from(new Set(kandidat)).includes(input);
        }

        function getLocalLoginCandidateIds(inputId) {
            const inputRaw = normalisasiTeks(inputId);
            const raw = inputRaw.toUpperCase();
            const set = new Set([inputRaw, raw]);
            const rawCanonical = canonicalizeUserId(inputRaw);

            const tpkMatch = raw.match(/^TPK0*(\d{1,4})$/);
            if (tpkMatch) {
                const n = parseInt(tpkMatch[1], 10);
                if (!Number.isNaN(n)) {
                    set.add(`TPK${String(n).padStart(2, '0')}`);
                    set.add(`TPK${String(n).padStart(4, '0')}`);
                }
            }

            const admKecMatch = raw.match(/^ADMKEC0*(\d{1,4})$/);
            if (admKecMatch) {
                const n = parseInt(admKecMatch[1], 10);
                if (!Number.isNaN(n)) {
                    set.add(`ADM${String(n).padStart(2, '0')}`);
                    set.add(`ADMKEC${String(n).padStart(2, '0')}`);
                }
            }

            Object.keys(dataAkunKader || {}).forEach((id) => {
                if (canonicalizeUserId(id) === rawCanonical) set.add(id);
            });

            return Array.from(set);
        }

        function resolveLocalUserId(candidateId) {
            const wanted = canonicalizeUserId(candidateId);
            return Object.keys(dataAkunKader || {}).find(id => canonicalizeUserId(id) === wanted) || '';
        }
