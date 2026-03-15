        function normalisasiTeks(text) {
            return (text || "").toString().trim();
        }

        function normalisasiKodeKecamatan(value) {
            const raw = normalisasiTeks(value).toUpperCase();
            if (!raw) return '';
            if (KEC_NAME_BY_CODE[raw]) return raw;
            if (KEC_CODE_BY_NAME[raw]) return KEC_CODE_BY_NAME[raw];
            for (const nama in KEC_CODE_BY_NAME) {
                if (raw.includes(nama)) return KEC_CODE_BY_NAME[nama];
            }
            return '';
        }

        function normalisasiNamaKecamatan(value) {
            const code = normalisasiKodeKecamatan(value);
            if (code) return KEC_NAME_BY_CODE[code] || code;
            return normalisasiTeks(value).toUpperCase();
        }

        function isKodeWilayahLike(value) {
            const v = normalisasiTeks(value).toUpperCase();
            if (!v) return false;
            return /^[A-Z]{1,3}\d{3,}$/.test(v);
        }

        function simpanWilayahKaderAktif(items) {
            try {
                const safe = Array.isArray(items) ? items : [];
                localStorage.setItem(WILAYAH_AKTIF_KEY, JSON.stringify(safe));
            } catch (e) {
                console.warn('Gagal menyimpan wilayah kader aktif:', e);
            }
        }

        function muatWilayahKaderAktif() {
            try {
                const raw = JSON.parse(localStorage.getItem(WILAYAH_AKTIF_KEY) || '[]');
                return Array.isArray(raw) ? raw : [];
            } catch (e) {
                return [];
            }
        }

        function splitTokenList(value) {
            const raw = normalisasiTeks(value);
            if (!raw) return [];
            return raw
                .split(/[;,|\r\n]+/)
                .map(v => normalisasiTeks(v))
                .filter(Boolean);
        }

        function getGeoLookupCache() {
            if (window.__tpkGeoLookupCache) return window.__tpkGeoLookupCache;
            const desaSet = new Set();
            Object.keys(dataWilayah || {}).forEach((kecCode) => {
                Object.keys(dataWilayah[kecCode] || {}).forEach((desaNama) => {
                    const up = normalisasiTeks(desaNama).toUpperCase();
                    if (up) desaSet.add(up);
                });
            });
            const kecSet = new Set(Object.keys(KEC_CODE_BY_NAME || {}));
            Object.keys(KEC_NAME_BY_CODE || {}).forEach((code) => {
                const nama = normalisasiTeks(KEC_NAME_BY_CODE[code]).toUpperCase();
                if (nama) kecSet.add(nama);
                if (code) kecSet.add(code.toUpperCase());
            });
            window.__tpkGeoLookupCache = { desaSet, kecSet };
            return window.__tpkGeoLookupCache;
        }

        function filterWilayahByScope(wilayahList, scope = {}) {
            const rows = Array.isArray(wilayahList) ? wilayahList : [];
            if (!rows.length) return [];

            const kecCode = normalisasiKodeKecamatan(scope.kecCode || scope.kecamatan || '');
            const desaList = Array.isArray(scope.desaList) ? scope.desaList : splitTokenList(scope.desaList || '');
            const desaSet = new Set(desaList.map(d => normalisasiTeks(d).toUpperCase()).filter(Boolean));

            let filtered = rows.filter((w) => {
                const rowKec = normalisasiKodeKecamatan(w.kecCode || w.kecNama || w.kecamatan || '');
                if (kecCode && rowKec && rowKec !== kecCode) return false;

                const rowDesa = normalisasiTeks(w.desa).toUpperCase();
                if (desaSet.size && rowDesa && !desaSet.has(rowDesa)) return false;
                return true;
            });

            if (!filtered.length) filtered = rows;
            return filtered.map((w) => ({
                ...w,
                kecCode: normalisasiKodeKecamatan(w.kecCode || w.kecNama || w.kecamatan || kecCode),
                kecNama: normalisasiNamaKecamatan(w.kecNama || w.kecamatan || w.kecCode || kecCode)
            }));
        }

        function pilihDesaPalingSesuai(wilayahList, preferred = []) {
            const rows = Array.isArray(wilayahList) ? wilayahList : [];
            if (!rows.length) return '';

            const pref = preferred
                .flatMap((v) => splitTokenList(v))
                .map(v => normalisasiTeks(v).toUpperCase())
                .filter(Boolean);

            const desaCounter = {};
            rows.forEach((w) => {
                const desa = normalisasiTeks(w.desa);
                if (!desa) return;
                const key = desa.toUpperCase();
                if (!desaCounter[key]) desaCounter[key] = { nama: desa, count: 0 };
                desaCounter[key].count += 1;
            });

            for (const nama of pref) {
                if (desaCounter[nama]) return desaCounter[nama].nama;
            }

            const sorted = Object.values(desaCounter).sort((a, b) => b.count - a.count || a.nama.localeCompare(b.nama));
            return sorted.length ? sorted[0].nama : '';
        }

        function buildWilkerDusunText(wilayahList, desaAktif = '') {
            const rows = Array.isArray(wilayahList) ? wilayahList : [];
            if (!rows.length) return '';
            const desaUpper = normalisasiTeks(desaAktif).toUpperCase();
            const labels = [];
            const seen = new Set();
            rows.forEach((w) => {
                const label = normalisasiTeks(w.dusunLabel || w.idWilayah);
                if (!label) return;
                const upper = label.toUpperCase();
                if (desaUpper && upper === desaUpper) return;
                if (seen.has(upper)) return;
                seen.add(upper);
                labels.push(label);
            });
            if (!labels.length) return '';
            if (labels.length <= 4) return labels.join(', ');
            return `${labels.slice(0, 4).join(', ')} (+${labels.length - 4})`;
        }

        function splitNamaWilayahLengkapToDusun(value) {
            const raw = normalisasiTeks(value);
            if (!raw) return [];
            return raw
                .split(/[;|]+/)
                .map((item) => {
                    const txt = normalisasiTeks(item);
                    if (!txt) return '';
                    const first = txt.split(',').map(v => normalisasiTeks(v)).filter(Boolean)[0] || '';
                    return normalisasiTeks(first);
                })
                .filter(Boolean);
        }

        function isBukanLabelDusun(label, desa = '', kec = '') {
            const up = normalisasiTeks(label).toUpperCase();
            if (!up) return true;
            const geo = getGeoLookupCache();
            const desaUp = normalisasiTeks(desa).toUpperCase();
            const kecUp = normalisasiTeks(kec).toUpperCase();
            if (desaUp && up === desaUp) return true;
            if (kecUp && up === kecUp) return true;
            if (geo.desaSet.has(up) || geo.kecSet.has(up)) return true;
            if (up.includes('BULELENG - BALI') || up.includes(' - BALI') || up === 'BALI') return true;
            if (up.includes('KABUPATEN') || up.includes('PROVINSI')) return true;
            if (up.startsWith('DESA ') || up.startsWith('KECAMATAN ')) return true;
            if (up.includes(',') && (up.includes('KABUPATEN') || up.includes('PROVINSI') || up.includes('BALI'))) return true;
            return false;
        }

        function ekstrakWilayahDariResponse(wilayahResp, fallbackKec, fallbackDesa) {
            const sumber = [];
            if (Array.isArray(wilayahResp)) sumber.push(...wilayahResp);
            if (Array.isArray(wilayahResp?.wilayah)) sumber.push(...wilayahResp.wilayah);
            if (Array.isArray(wilayahResp?.data)) sumber.push(...wilayahResp.data);

            const splitTokens = (value) => {
                const raw = normalisasiTeks(value);
                if (!raw) return [];
                if (!/[;,|\r\n]/.test(raw)) return [raw];
                return raw.split(/[;,|\r\n]+/).map(v => normalisasiTeks(v)).filter(Boolean);
            };

            const hasil = [];
            sumber.forEach((row) => {
                const r = row || {};
                const kecRaw = normalisasiTeks(
                    r.kecamatan || r.nama_kecamatan || r.scope_kecamatan || fallbackKec
                );
                const desa = normalisasiTeks(
                    r.desa_kelurahan || r.desa || r.nama_desa || r.scope_desa || fallbackDesa
                );
                const kandidatDusun = [
                    r.dusun_rw, r.dusun, r.banjar_rw, r.nama_wilayah, r.wilayah,
                    r.nama_dusun, r.nama_dusun_rw, r.banjar_dinas_rw, r.wilker, r.wilayah_kerja
                ];
                const kandidatId = [
                    r.id_wilayah, r.kode_wilayah, r.id_dusun, r.id_wilker, r.kode_dusun
                ];
                const kecCode = normalisasiKodeKecamatan(kecRaw);

                let semuaDusun = kandidatDusun.flatMap(splitTokens).filter(Boolean);
                if (!semuaDusun.length) {
                    semuaDusun = [
                        ...splitNamaWilayahLengkapToDusun(r.nama_wilayah_lengkap),
                        ...splitNamaWilayahLengkapToDusun(r.wilayah_lengkap)
                    ];
                }
                const semuaId = kandidatId.flatMap(splitTokens).filter(Boolean);
                const maxLen = Math.max(semuaDusun.length, semuaId.length, 1);
                for (let i = 0; i < maxLen; i += 1) {
                    const dusunLabel = normalisasiTeks(semuaDusun[i] || semuaDusun[0] || semuaId[i] || semuaId[0]);
                    const idWilayah = normalisasiTeks(semuaId[i] || semuaId[0] || dusunLabel);
                    if (!desa || !dusunLabel) continue;
                    if (isBukanLabelDusun(dusunLabel, desa, kecRaw || kecCode)) continue;
                    hasil.push({
                        kecCode,
                        kecNama: normalisasiNamaKecamatan(kecRaw || kecCode),
                        desa,
                        idWilayah,
                        dusunLabel
                    });
                }
            });

            const uniq = new Map();
            hasil.forEach((w) => {
                const key = `${w.kecCode}|${w.desa}|${w.idWilayah}|${w.dusunLabel}`.toUpperCase();
                if (!uniq.has(key)) uniq.set(key, w);
            });
            return Array.from(uniq.values());
        }

        function ekstrakWilayahDariTimResponse(timResp, fallbackKec, fallbackDesa) {
            const splitTokens = (value) => {
                const raw = normalisasiTeks(value);
                if (!raw) return [];
                if (!/[;,|\r\n]/.test(raw)) return [raw];
                return raw.split(/[;,|\r\n]+/).map(v => normalisasiTeks(v)).filter(Boolean);
            };

            const sumber = [];
            if (timResp && typeof timResp === 'object') sumber.push(timResp);
            if (timResp?.saya) sumber.push(timResp.saya);
            if (timResp?.tim) sumber.push(timResp.tim);
            if (Array.isArray(timResp?.anggota)) sumber.push(...timResp.anggota);
            if (Array.isArray(timResp?.tim?.anggota)) sumber.push(...timResp.tim.anggota);
            if (Array.isArray(timResp?.data)) sumber.push(...timResp.data);

            const hasil = [];
            sumber.forEach((r) => {
                const row = r || {};
                const kecRaw = normalisasiTeks(
                    row.kecamatan || row.nama_kecamatan || row.scope_kecamatan || fallbackKec
                );
                const desa = normalisasiTeks(
                    row.desa_kelurahan || row.desa || row.nama_desa || row.scope_desa || fallbackDesa
                );
                if (!desa) return;

                const kandidat = [
                    row.dusun_rw, row.dusun, row.banjar_rw, row.nama_wilayah, row.wilayah,
                    row.w1, row.w2, row.w3, row.w4,
                    row.wilker_1, row.wilker_2, row.wilker_3, row.wilker_4,
                    row.wilker1, row.wilker2, row.wilker3, row.wilker4
                ];

                const kecCode = normalisasiKodeKecamatan(kecRaw);
                let semuaDusun = kandidat.flatMap(splitTokens).filter(Boolean);
                if (!semuaDusun.length) {
                    semuaDusun = [
                        ...splitNamaWilayahLengkapToDusun(row.nama_wilayah_lengkap),
                        ...splitNamaWilayahLengkapToDusun(row.wilayah_lengkap)
                    ];
                }
                semuaDusun.forEach((dusun) => {
                    const label = normalisasiTeks(dusun);
                    if (!label) return;
                    if (isBukanLabelDusun(label, desa, kecRaw || kecCode)) return;
                    hasil.push({
                        kecCode,
                        kecNama: normalisasiNamaKecamatan(kecRaw || kecCode),
                        desa,
                        idWilayah: label,
                        dusunLabel: label
                    });
                });
            });

            const uniq = new Map();
            hasil.forEach((w) => {
                const key = `${w.kecCode}|${w.desa}|${w.idWilayah}|${w.dusunLabel}`.toUpperCase();
                if (!uniq.has(key)) uniq.set(key, w);
            });
            return Array.from(uniq.values());
        }

        function buildFallbackWilayahDariStatic(kecRaw, desaRaw) {
            const kecCode = normalisasiKodeKecamatan(kecRaw);
            if (!kecCode || !dataWilayah[kecCode]) return [];

            const daftarDesa = desaRaw && dataWilayah[kecCode][desaRaw]
                ? [desaRaw]
                : Object.keys(dataWilayah[kecCode] || {});

            const out = [];
            daftarDesa.forEach((desa) => {
                (dataWilayah[kecCode][desa] || []).forEach((item) => {
                    const dusun = normalisasiDusun(item);
                    if (!dusun.value || !dusun.label) return;
                    out.push({
                        kecCode,
                        kecNama: normalisasiNamaKecamatan(kecCode),
                        desa,
                        idWilayah: dusun.value,
                        dusunLabel: dusun.label
                    });
                });
            });
            return out;
        }

        function getMapWilayahScoped(kecCode) {
            const code = normalisasiKodeKecamatan(kecCode);
            const semua = muatWilayahKaderAktif();
            const rowsByKec = semua.filter((w) => {
                const rowCode = normalisasiKodeKecamatan(w.kecCode || w.kecNama || w.kecamatan || '');
                if (!code) return true;
                return !!rowCode && rowCode === code;
            });
            const rowsTanpaKec = semua.filter((w) => !normalisasiKodeKecamatan(w.kecCode || w.kecNama || w.kecamatan || ''));
            const rows = rowsByKec.length ? rowsByKec : rowsTanpaKec;
            const map = {};
            rows.forEach((w) => {
                const desa = normalisasiTeks(w.desa);
                if (!desa) return;
                const value = normalisasiTeks(w.idWilayah) || normalisasiTeks(w.dusunLabel);
                const label = normalisasiTeks(w.dusunLabel) || value;
                if (!value || !label) return;
                if (!map[desa]) map[desa] = [];
                map[desa].push({
                    value,
                    label
                });
            });

            Object.keys(map).forEach((desa) => {
                const uniq = new Map();
                map[desa].forEach((d) => {
                    const key = `${d.value}|${d.label}`.toUpperCase();
                    if (!uniq.has(key)) uniq.set(key, d);
                });
                const all = Array.from(uniq.values()).filter((d) => !isBukanLabelDusun(d.label, desa, code));
                const hasHumanLabel = all.some((d) => !isKodeWilayahLike(d.label));
                map[desa] = hasHumanLabel
                    ? all.filter((d) => !isKodeWilayahLike(d.label))
                    : all;
            });

            return map;
        }

        function cariDusunStatisByDesa(desa, kecHint = '') {
            const target = normalisasiTeks(desa).toUpperCase();
            if (!target) return [];
            const kodeKec = normalisasiKodeKecamatan(kecHint);
            const kandidatKec = kodeKec
                ? [kodeKec]
                : Object.keys(dataWilayah || {});
            for (const kecCode of kandidatKec) {
                const desaMap = dataWilayah[kecCode] || {};
                for (const namaDesa of Object.keys(desaMap)) {
                    if (normalisasiTeks(namaDesa).toUpperCase() !== target) continue;
                    return (desaMap[namaDesa] || []).map((item) => {
                        const dusun = normalisasiDusun(item);
                        return { value: dusun.value, label: dusun.label };
                    }).filter(d => d.value && d.label);
                }
            }
            return [];
        }

        async function refreshWilayahAktifDariBackendIfNeeded(force = false) {
            const existing = muatWilayahKaderAktif();
            const hasDusun = existing.some((w) => normalisasiTeks(w.idWilayah || w.dusunLabel));
            if (!force && hasDusun) return existing;

            const idUser = normalisasiTeks(
                localStorage.getItem('backend_user_id_aktif')
                || localStorage.getItem('username_login_aktif')
                || localStorage.getItem('id_kader_aktif')
            );
            const kec = normalisasiTeks(localStorage.getItem('kec_kader_aktif'));
            const desa = normalisasiTeks(localStorage.getItem('desa_kader_aktif'));
            if (!idUser) return existing;

            try {
                let timResp = null;
                const wilayahResp = await postBackendAction('wilayah-kerja', { id_user: idUser }, { timeoutMs: 10000, maxRetries: 0 });
                let list = ekstrakWilayahDariResponse(wilayahResp, kec, '');
                list = filterWilayahByScope(list, {
                    kecCode: kec,
                    desaList: desa
                });

                if (!list.length) {
                    timResp = await postBackendAction('tim-saya', { id_user: idUser }, { timeoutMs: 10000, maxRetries: 0 });
                    const dariTim = ekstrakWilayahDariTimResponse(timResp, kec, '');
                    list = filterWilayahByScope(dariTim, {
                        kecCode: kec,
                        desaList: desa
                    });
                }

                if (!list.length) list = buildFallbackWilayahDariStatic(kec, desa);
                if (list.length) {
                    simpanWilayahKaderAktif(list);
                    return list;
                }
            } catch (e) {
                console.warn('Refresh wilayah backend gagal:', e);
            }
            return existing;
        }

        async function hydrateKaderWilkerAsync() {
            if (getRoleAktif().startsWith('ADMIN')) return;
            try {
                const list = await refreshWilayahAktifDariBackendIfNeeded(true);
                if (!Array.isArray(list) || !list.length) return;
                const nama = normalisasiTeks(localStorage.getItem('nama_kader_aktif'));
                const id = normalisasiTeks(localStorage.getItem('id_kader_aktif'));
                const tim = normalisasiTeks(localStorage.getItem('id_tim_aktif'));
                const nomorTim = normalisasiTeks(localStorage.getItem('nomor_tim_aktif'));
                const desa = normalisasiTeks(localStorage.getItem('desa_kader_aktif'));
                const kec = normalisasiTeks(localStorage.getItem('kec_kader_aktif'));
                const wilayahLengkap = normalisasiTeks(localStorage.getItem('nama_wilayah_lengkap_aktif'));
                const dusunText = buildWilkerDusunText(list, desa);
                if (dusunText) localStorage.setItem('wilker_dusun_aktif', dusunText);
                if (nama && id) {
                    renderInfoKader(
                        nama,
                        id,
                        tim,
                        desa,
                        kec,
                        nomorTim,
                        wilayahLengkap,
                        dusunText || normalisasiTeks(localStorage.getItem('wilker_dusun_aktif'))
                    );
                }
            } catch (e) {
                console.warn('Hydrate wilker kader gagal:', e);
            }
        }

