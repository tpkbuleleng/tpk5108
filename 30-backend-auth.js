        function initBackendUrlFromQuery() {
            const params = new URLSearchParams(window.location.search || '');
            const apiUrl = normalisasiTeks(params.get('api'));
            if (apiUrl) localStorage.setItem(BACKEND_URL_KEY, apiUrl);
        }

        function isLocalRuntimeHost() {
            const host = (window.location.hostname || '').toLowerCase();
            return host === 'localhost' || host === '127.0.0.1';
        }

        function getBackendUrl() {
            const params = new URLSearchParams(window.location.search || '');
            const queryUrl = normalisasiTeks(params.get('api'));
            if (queryUrl) return queryUrl;

            if (isLocalRuntimeHost()) return '/api';

            const saved = normalisasiTeks(localStorage.getItem(BACKEND_URL_KEY));
            return saved || DEFAULT_APPS_SCRIPT_URL || '';
        }

        async function postBackendAction(action, payload = {}, options = {}) {
            const backendUrl = getBackendUrl();
            if (!backendUrl) {
                throw new Error('URL backend belum diatur. Buka aplikasi dengan ?api=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec');
            }
            const isCrossOriginAbsolute = /^https?:\/\//i.test(backendUrl) && !backendUrl.startsWith(window.location.origin);
            const headersPrimary = isCrossOriginAbsolute
                ? { 'Content-Type': 'text/plain;charset=utf-8' }   // hindari preflight CORS di Apps Script
                : { 'Content-Type': 'application/json' };

            const baseTimeout = Number(options.timeoutMs) > 0
                ? Number(options.timeoutMs)
                : (action === 'login' ? API_TIMEOUT_LOGIN_MS : API_TIMEOUT_MS);
            const maxRetries = Number.isInteger(options.maxRetries)
                ? Math.max(0, options.maxRetries)
                : (action === 'login' ? 1 : 0);

            const buildRequestPayload = () => {
                const req = { action, ...payload };
                if (!req.api_key && API_KEY) req.api_key = API_KEY;
                if (action !== 'login' && !req.session_token) {
                    const token = normalisasiTeks(localStorage.getItem('backend_session_token'));
                    if (token) req.session_token = token;
                }
                return req;
            };

            const executeFetch = async (url, headers, timeoutMs) => {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), timeoutMs);
                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(buildRequestPayload()),
                    signal: controller.signal
                }).finally(() => {
                    clearTimeout(timer);
                });

                const text = await response.text();
                let data = null;
                try {
                    data = text ? JSON.parse(text) : null;
                } catch (e) {
                    throw new Error('Respon backend bukan JSON valid.');
                }
                if (!response.ok) throw new Error((data && (data.message || data.pesan)) || ('HTTP ' + response.status));
                if (!data || (data.ok !== true && data.status !== 'ok' && data.status !== 'sukses')) {
                    throw new Error((data && (data.message || data.pesan)) || ('Aksi ' + action + ' gagal'));
                }
                return data;
            };

            const executeWithRetry = async (url, headers) => {
                let lastError = null;
                for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
                    const timeoutNow = baseTimeout + (attempt * 8000);
                    try {
                        return await executeFetch(url, headers, timeoutNow);
                    } catch (error) {
                        const timeoutLike = error?.name === 'AbortError' || /timeout/i.test(String(error?.message || ''));
                        if (timeoutLike && attempt < maxRetries) {
                            continue;
                        }
                        if (error?.name === 'AbortError') {
                            const timeoutErr = new Error('Timeout koneksi backend.');
                            timeoutErr.code = 'TIMEOUT';
                            lastError = timeoutErr;
                        } else {
                            lastError = error;
                        }
                        break;
                    }
                }
                throw lastError || new Error('Gagal terhubung ke backend.');
            };

            try {
                return await executeWithRetry(backendUrl, headersPrimary);
            } catch (error) {
                // Jika panggilan direct ke Apps Script terkena CORS/network error,
                // fallback otomatis ke proxy lokal /api agar request tetap same-origin.
                const rawError = String(error?.message || '').toLowerCase();
                const isNetworkLike = rawError.startsWith('networkerror') || rawError.includes('failed to fetch');
                if (isCrossOriginAbsolute && (isNetworkLike || error?.code === 'TIMEOUT')) {
                    try {
                        return await executeWithRetry('/api', { 'Content-Type': 'application/json' });
                    } catch (proxyErr) {
                        throw proxyErr;
                    }
                }
                throw error;
            }
        }

        function simpanSessionAktif({ idKader, nama, kodeTim, nomorTim, namaWilayahLengkap, wilkerDusun, kec, desa, role, username, namaPkbPengampu, nipPkbPengampu, kecKode, backendUserId, backendSessionToken }) {
            localStorage.setItem('id_kader_aktif', normalisasiTeks(idKader));
            localStorage.setItem('nama_kader_aktif', normalisasiTeks(nama));
            localStorage.setItem('id_tim_aktif', normalisasiTeks(kodeTim));
            localStorage.setItem('nomor_tim_aktif', normalisasiTeks(nomorTim || kodeTim));
            localStorage.setItem('kec_kader_aktif', normalisasiTeks(kec));
            localStorage.setItem('kec_kode_aktif', normalisasiTeks(kecKode || normalisasiKodeKecamatan(kec)));
            localStorage.setItem('desa_kader_aktif', normalisasiTeks(desa));
            localStorage.setItem('nama_wilayah_lengkap_aktif', normalisasiTeks(
                namaWilayahLengkap || ((desa && kec) ? `Desa ${desa}, Kec. ${kec}` : '')
            ));
            localStorage.setItem('wilker_dusun_aktif', normalisasiTeks(wilkerDusun));
            localStorage.setItem('role_aktif', normalisasiTeks(role || 'KADER'));
            if (username) localStorage.setItem('username_login_aktif', normalisasiTeks(username));
            if (backendUserId) localStorage.setItem('backend_user_id_aktif', normalisasiTeks(backendUserId));
            else localStorage.removeItem('backend_user_id_aktif');
            if (backendSessionToken) localStorage.setItem('backend_session_token', normalisasiTeks(backendSessionToken));
            else localStorage.removeItem('backend_session_token');
            if (namaPkbPengampu !== undefined) localStorage.setItem('nama_pkb_pengampu', normalisasiTeks(namaPkbPengampu));
            if (nipPkbPengampu !== undefined) localStorage.setItem('nip_pkb_pengampu', normalisasiTeks(nipPkbPengampu));
            enforceAdminSumberFilterPolicy();
        }

        async function autentikasiViaBackend(inputId, inputPassword) {
            const login = await postBackendAction('login', { username: inputId, password: inputPassword }, { timeoutMs: API_TIMEOUT_LOGIN_MS, maxRetries: 0 });
            const user = login.user || {};
            const roleUser = normalisasiTeks(user.role_akses || login.role_akses || login.role || 'KADER').toUpperCase();
            const backendSessionToken = normalisasiTeks(login.session_token || login.token || login.access_token || login.sessionToken);
            const backendUserId = normalisasiTeks(user.id_user || user.user_id || user.id || inputId);

            if (roleUser === 'KADER') {
                const quickProfile = login.profile || {};
                const quickScope = login.scope || {};
                const quickDusun = Array.isArray(quickScope.dusun_ids) ? quickScope.dusun_ids : [];
                const quickLocalId = resolveLocalUserId(user.username_login || inputId) || resolveLocalUserId(inputId);
                const quickLocal = quickLocalId ? (dataAkunKader[quickLocalId] || {}) : {};
                const quickIdKader = normalisasiTeks(
                    quickProfile.id_kader || quickProfile.user_id || user.ref_id || user.id_user || inputId
                );
                let quickTim = normalisasiTeks(
                    quickProfile.tim_id || quickProfile.id_tim || user.id_tim || user.ref_tim || quickLocal.tim
                );
                const quickKecCode = normalisasiKodeKecamatan(quickScope.kecamatan_code || quickProfile.kecamatan || user.scope_kecamatan || quickLocal.kec);
                const quickKecNama = normalisasiNamaKecamatan(quickScope.kecamatan_code || quickProfile.kecamatan || user.scope_kecamatan || quickLocal.kec || quickKecCode);
                const quickScopeDesa = splitTokenList(quickScope.scope_desa || user.scope_desa);
                const quickDesa = normalisasiTeks(quickProfile.desa_kelurahan || quickScopeDesa[0] || quickScope.scope_desa || user.scope_desa || quickLocal.desa);
                const quickDesaFinal = normalisasiTeks(quickDesa || quickScopeDesa[0]);
                let quickWilayah = quickDusun.map((d) => {
                    const val = normalisasiTeks(d);
                    return {
                        kecCode: quickKecCode,
                        kecNama: quickKecNama,
                        desa: quickDesaFinal,
                        idWilayah: val,
                        dusunLabel: val
                    };
                }).filter(w => w.idWilayah);
                quickWilayah = filterWilayahByScope(quickWilayah, {
                    kecCode: quickKecCode,
                    desaList: quickScopeDesa.length ? quickScopeDesa : quickDesaFinal
                });
                if (!quickWilayah.length && (quickKecCode || quickKecNama)) {
                    quickWilayah = buildFallbackWilayahDariStatic(quickKecCode || quickKecNama, quickDesaFinal);
                }
                const quickWilkerDusun = buildWilkerDusunText(quickWilayah, quickDesaFinal);
                if (!quickTim) quickTim = '-';

                // Fast path: cukup data dari action login untuk masuk aplikasi dengan cepat.
                if (quickIdKader && (quickKecCode || quickKecNama)) {
                    return {
                        ok: true,
                        mode: 'backend',
                        role: 'KADER',
                        session: {
                            idKader: quickIdKader,
                            nama: normalisasiTeks(quickProfile.nama || quickProfile.nama_kader || user.username_login || inputId),
                            kodeTim: quickTim,
                            nomorTim: normalisasiTeks(quickProfile.nomor_tim || quickProfile.nama_tim || quickTim),
                            namaWilayahLengkap: normalisasiTeks(
                                quickProfile.nama_wilayah_lengkap || quickScope.nama_wilayah_lengkap || `Desa ${quickDesaFinal}, Kec. ${quickKecNama}`
                            ),
                            wilkerDusun: quickWilkerDusun,
                            kec: quickKecNama,
                            kecKode: quickKecCode,
                            desa: quickDesaFinal,
                            role: 'KADER',
                            username: normalisasiTeks(user.username_login || inputId),
                            wilayahList: quickWilayah,
                            backendUserId,
                            backendSessionToken
                        }
                    };
                }

                const [profil, wilayah] = await Promise.all([
                    postBackendAction('profil-saya', { id_user: user.id_user }, { timeoutMs: 12000, maxRetries: 0 }),
                    postBackendAction('wilayah-kerja', { id_user: user.id_user }, { timeoutMs: 12000, maxRetries: 0 })
                ]);

                let timResp = { tim: {}, saya: {} };
                const profilData = profil.profil || {};
                const desaScope = splitTokenList(user.scope_desa || profilData.scope_desa || '');
                const kecScopeCode = normalisasiKodeKecamatan(
                    user.scope_kecamatan || profilData.scope_kecamatan || profilData.kecamatan || quickScope.kecamatan_code || quickKecCode
                );

                let wilayahList = ekstrakWilayahDariResponse(wilayah, kecScopeCode, desaScope[0] || '');
                wilayahList = filterWilayahByScope(wilayahList, {
                    kecCode: kecScopeCode,
                    desaList: desaScope
                });

                let kodeTim = normalisasiTeks(profilData.id_tim || user.id_tim || user.ref_tim);
                if (!kodeTim || !wilayahList.length) {
                    try {
                        timResp = await postBackendAction('tim-saya', { id_user: user.id_user }, { timeoutMs: 12000, maxRetries: 0 });
                    } catch (e) {
                        timResp = { tim: {}, saya: {} };
                    }
                }

                const timData = timResp.tim || {};
                const saya = timResp.saya || {};
                if (!kodeTim) kodeTim = normalisasiTeks(saya.id_tim || timData.id_tim || timData.nomor_tim || quickTim || '-');
                const kecRaw = normalisasiTeks(
                    profilData.kecamatan || timData.kecamatan || user.scope_kecamatan || quickScope.kecamatan_code
                );
                const kecKode = normalisasiKodeKecamatan(kecScopeCode || kecRaw || quickKecCode);
                const kecUser = normalisasiNamaKecamatan(kecRaw || kecKode);

                const desaProfil = normalisasiTeks(
                    profilData.desa_kelurahan || profilData.scope_desa || user.scope_desa
                );
                const desaTim = normalisasiTeks(timData.desa_kelurahan || saya.desa_kelurahan);

                const wilayahDariTim = ekstrakWilayahDariTimResponse(timResp, kecKode || kecUser, desaTim || desaProfil);
                if (wilayahDariTim.length) {
                    wilayahList = filterWilayahByScope(
                        [...wilayahList, ...wilayahDariTim],
                        { kecCode: kecKode || kecUser, desaList: desaScope.length ? desaScope : [desaProfil, desaTim] }
                    );
                }

                if (!wilayahList.length) {
                    wilayahList = buildFallbackWilayahDariStatic(kecKode || kecUser, desaProfil || desaTim || quickDesa);
                }

                const desaFinal = pilihDesaPalingSesuai(wilayahList, [desaScope.join(','), desaProfil, desaTim, quickDesa]);
                const wilkerDusun = buildWilkerDusunText(wilayahList, desaFinal || desaProfil || desaTim || quickDesa);
                const idKader = normalisasiTeks(profilData.id_kader || user.ref_id || user.id_user || inputId);

                if (!idKader) throw new Error('ID kader backend belum tersedia.');

                return {
                    ok: true,
                    mode: 'backend',
                    role: 'KADER',
                    session: {
                        idKader,
                        nama: normalisasiTeks(
                            profilData.nama_kader || saya.nama_kader || quickProfile.nama || user.username_login || user.id_user || inputId
                        ),
                        kodeTim: kodeTim || '-',
                        nomorTim: normalisasiTeks(profilData.nomor_tim || timData.nomor_tim || saya.nomor_tim || kodeTim || '-'),
                        namaWilayahLengkap: normalisasiTeks(
                            profilData.nama_wilayah_lengkap || timData.nama_wilayah_lengkap || `Desa ${desaFinal || desaProfil || desaTim || quickDesa}, Kec. ${kecUser}`
                        ),
                        wilkerDusun,
                        kec: kecUser,
                        kecKode,
                        desa: desaFinal || desaProfil || desaTim || quickDesa,
                        role: 'KADER',
                        username: normalisasiTeks(user.username_login || inputId),
                        wilayahList,
                        backendUserId,
                        backendSessionToken
                    }
                };
            }
            const quickProfile = login.profile || {};
            const quickScope = login.scope || {};
            const namaAdmin = normalisasiTeks(
                quickProfile.nama_admin || quickProfile.nama || user.username_login || user.id_user || inputId
            );
            const kecAdmin = normalisasiTeks(
                quickProfile.scope_kecamatan || quickProfile.kecamatan || user.scope_kecamatan || quickScope.kecamatan_code
            );
            const idAdmin = normalisasiTeks(quickProfile.id_admin || user.ref_id || user.id_user || inputId);

            return {
                ok: true,
                mode: 'backend',
                role: roleUser,
                session: {
                    idKader: idAdmin,
                    nama: namaAdmin,
                    kodeTim: '-',
                    kec: kecAdmin,
                    kecKode: normalisasiKodeKecamatan(kecAdmin),
                    desa: normalisasiTeks(quickProfile.scope_desa || user.scope_desa),
                    role: roleUser,
                    username: normalisasiTeks(user.username_login || inputId),
                    namaPkbPengampu: normalisasiTeks(quickProfile.nama_pkb_pengampu || quickProfile.nama_pengampu),
                    nipPkbPengampu: normalisasiTeks(quickProfile.nip_pkb_pengampu || quickProfile.nip_pengampu),
                    backendUserId,
                    backendSessionToken
                }
            };
        }

        function simpanPasswordOverride(userId, newPassword) {
            const overrides = getPasswordOverrides();
            overrides[userId] = newPassword;
            localStorage.setItem('password_overrides', JSON.stringify(overrides));
        }

