        function openScreen(id) { document.querySelectorAll('.container').forEach(el => el.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); if (id === 'admin-menu') renderAdminSummaryCard(); window.scrollTo(0, 0); }
        function kembaliKeMenu() { if (getRoleAktif().startsWith('ADMIN')) openScreen('admin-menu'); else openScreen('main-menu'); updateBadgeSinkronisasi(); }
        function logoutKader() { if (confirm("Yakin ingin keluar dari akun ini?")) { ['id_kader_aktif','nama_kader_aktif','id_tim_aktif','nomor_tim_aktif','nama_wilayah_lengkap_aktif','wilker_dusun_aktif','kec_kader_aktif','kec_kode_aktif','desa_kader_aktif','role_aktif','nama_pkb_pengampu','nip_pkb_pengampu','backend_user_id_aktif','backend_session_token', WILAYAH_AKTIF_KEY].forEach(k => localStorage.removeItem(k)); location.reload(); } }

        document.getElementById('login-form').addEventListener('submit', async e => {
            e.preventDefault();

            const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.innerText : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Memproses...';
            }

            try {
                const inputIdRaw = normalisasiTeks(document.getElementById('id-kader').value);
                const inputPassword = document.getElementById('login-password').value;
                const kandidatLogin = getLocalLoginCandidateIds(inputIdRaw);
                const params = new URLSearchParams(window.location.search || '');
                const allowLocalFallback = isLocalRuntimeHost() || params.get('allowLocal') === '1';
                let backendErrorMessage = '';
                localStorage.removeItem(WILAYAH_AKTIF_KEY);
                localStorage.removeItem('desa_kader_aktif');
                localStorage.removeItem('nomor_tim_aktif');
                localStorage.removeItem('nama_wilayah_lengkap_aktif');
                localStorage.removeItem('wilker_dusun_aktif');
                const loginLocalFallback = () => {
                    const matchedLocalId = kandidatLogin
                        .map(id => resolveLocalUserId(id))
                        .find(id => id && dataAkunKader[id] && isLocalPasswordMatch(id, dataAkunKader[id].nik, inputPassword));
                    if (!matchedLocalId) return false;

                    const dataKader = dataAkunKader[matchedLocalId];
                    const namaUser = normalisasiTeks(dataKader.nama);
                    const roleUser = normalisasiTeks(dataKader.role || 'KADER');
                    const kodeTim = normalisasiTeks(dataKader.tim || (matchedLocalId.includes('-') ? matchedLocalId.split('-')[1].substring(0, 2) : ''));
                    const kecUser = normalisasiTeks(dataKader.kec);
                    const desaUser = normalisasiTeks(dataKader.desa);

                    simpanSessionAktif({
                        idKader: matchedLocalId,
                        nama: namaUser,
                        kodeTim,
                        nomorTim: normalisasiTeks(dataKader.nomor_tim || kodeTim),
                        namaWilayahLengkap: normalisasiTeks(dataKader.nama_wilayah_lengkap || ((desaUser && kecUser) ? `Desa ${desaUser}, Kec. ${kecUser}` : '')),
                        wilkerDusun: normalisasiTeks(dataKader.wilker_dusun),
                        kec: kecUser,
                        kecKode: normalisasiKodeKecamatan(kecUser),
                        desa: desaUser,
                        role: roleUser,
                        username: matchedLocalId
                    });
                    cacheUserDariSession({
                        idKader: matchedLocalId,
                        nama: namaUser,
                        kodeTim,
                        nomorTim: normalisasiTeks(dataKader.nomor_tim || kodeTim),
                        namaWilayahLengkap: normalisasiTeks(dataKader.nama_wilayah_lengkap || ((desaUser && kecUser) ? `Desa ${desaUser}, Kec. ${kecUser}` : '')),
                        wilkerDusun: normalisasiTeks(dataKader.wilker_dusun),
                        kec: kecUser,
                        desa: desaUser,
                        role: roleUser
                    });

                    if (roleUser.startsWith('ADMIN')) {
                        simpanWilayahKaderAktif([]);
                        renderInfoAdmin(namaUser, matchedLocalId, roleUser, kecUser);
                        renderAdminMenu(roleUser);
                        openScreen('admin-menu');
                    } else {
                        simpanWilayahKaderAktif(buildFallbackWilayahDariStatic(kecUser, desaUser));
                        renderInfoKader(
                            namaUser,
                            matchedLocalId,
                            kodeTim,
                            desaUser,
                            kecUser,
                            normalisasiTeks(dataKader.nomor_tim || kodeTim),
                            normalisasiTeks(dataKader.nama_wilayah_lengkap || ((desaUser && kecUser) ? `Desa ${desaUser}, Kec. ${kecUser}` : '')),
                            normalisasiTeks(dataKader.wilker_dusun)
                        );
                        openScreen('main-menu');
                        refreshStatusAktifSasaran();
                        updateBadgeSinkronisasi();
                        setTimeout(() => { hydrateKaderWilkerAsync(); }, 10);
                    }
                    return true;
                };

                for (const kandidatId of kandidatLogin) {
                    try {
                        const authBackend = await autentikasiViaBackend(kandidatId, inputPassword);
                        if (authBackend && authBackend.ok) {
                            const sesi = authBackend.session;
                            simpanSessionAktif({
                                idKader: sesi.idKader,
                                nama: sesi.nama,
                                kodeTim: sesi.kodeTim,
                                nomorTim: sesi.nomorTim,
                                namaWilayahLengkap: sesi.namaWilayahLengkap,
                                wilkerDusun: sesi.wilkerDusun,
                                kec: sesi.kec,
                                kecKode: sesi.kecKode,
                                desa: sesi.desa,
                                role: sesi.role,
                                username: sesi.username,
                                backendUserId: sesi.backendUserId,
                                backendSessionToken: sesi.backendSessionToken
                            });
                            cacheUserDariSession(sesi);
                            if ((sesi.role || '').startsWith('ADMIN')) simpanWilayahKaderAktif([]);
                            else simpanWilayahKaderAktif(sesi.wilayahList || []);

                            if ((sesi.role || '').startsWith('ADMIN')) {
                                renderInfoAdmin(sesi.nama, sesi.idKader, sesi.role, sesi.kec);
                                renderAdminMenu(sesi.role);
                                openScreen('admin-menu');
                            } else {
                                renderInfoKader(
                                    sesi.nama,
                                    sesi.idKader,
                                    sesi.kodeTim,
                                    sesi.desa,
                                    sesi.kec,
                                    sesi.nomorTim,
                                    sesi.namaWilayahLengkap,
                                    sesi.wilkerDusun
                                );
                                openScreen('main-menu');
                                refreshStatusAktifSasaran();
                                updateBadgeSinkronisasi();
                                setTimeout(() => { hydrateKaderWilkerAsync(); }, 10);
                            }
                            return;
                        }
                    } catch (error) {
                        backendErrorMessage = normalisasiTeks(error?.message) || backendErrorMessage;
                        console.warn('Login backend gagal, kandidat:', kandidatId, error);
                        const low = backendErrorMessage.toLowerCase();
                        const authError = low.includes('tidak ditemukan') || low.includes('akun') || low.includes('password') || low.includes('salah');
                        if (!authError) break;
                    }
                }

                if (allowLocalFallback && loginLocalFallback()) return;

                const detail = backendErrorMessage ? `\nInfo backend: ${backendErrorMessage}` : '';
                const hint401 = backendErrorMessage.includes('(401)') || backendErrorMessage.toLowerCase().includes('unauthorized')
                    ? '\nPeriksa deployment Apps Script: akses Web App harus diizinkan.'
                    : '';
                alert(`Login gagal. ID pengguna tidak ditemukan atau password salah.${detail}${hint401}`);
            } catch (err) {
                console.error('Error proses login:', err);
                alert(`Terjadi error saat proses login.\n${normalisasiTeks(err?.message || err)}`);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText || 'Masuk Aplikasi';
                }
            }
        });

        async function bukaMenuRegistrasi() {
            if (getRoleAktif().startsWith('ADMIN')) return tampilkanNotifAdmin('Menu ini hanya untuk kader.', 'notif-warning');
            document.getElementById('form-registrasi').reset();
            document.getElementById('pertanyaan-khusus').classList.add('hidden');
            document.getElementById('btn-submit-sasaran').innerText = "Simpan Sasaran";
            document.getElementById('judul-form-sasaran').innerText = "Registrasi Sasaran Baru";
            editModeSasaranId = null;

            const kec = localStorage.getItem('kec_kader_aktif');
            const desa = localStorage.getItem('desa_kader_aktif');
            const kecSelect = document.getElementById('reg-kecamatan');
            const desaSelect = document.getElementById('reg-desa');
            const grupKecamatan = kecSelect.closest('.form-group');

            if (grupKecamatan) grupKecamatan.classList.add('hidden');

            let kecCode = normalisasiKodeKecamatan(localStorage.getItem('kec_kode_aktif') || kec);
            if (!kecCode) {
                const wilayahTersimpan = muatWilayahKaderAktif();
                kecCode = wilayahTersimpan.length ? normalisasiKodeKecamatan(wilayahTersimpan[0].kecCode) : '';
            }
            if (!kecCode && Object.keys(dataWilayah || {}).length) {
                kecCode = Object.keys(dataWilayah)[0];
            }

            const namaKec = normalisasiNamaKecamatan(kec || kecCode);
            kecSelect.innerHTML = '';
            const kecOpt = document.createElement('option');
            kecOpt.value = kecCode;
            kecOpt.textContent = namaKec || kecCode || '-';
            kecSelect.appendChild(kecOpt);
            kecSelect.value = kecCode;
            kecSelect.disabled = true;

            await refreshWilayahAktifDariBackendIfNeeded(false);
            ubahKecamatan();
            if (desa) {
                const adaDesa = Array.from(desaSelect.options || []).some(opt => opt.value === desa);
                if (adaDesa) desaSelect.value = desa;
            }
            ubahDesa();
            const dusunSelect = document.getElementById('reg-dusun');
            if (dusunSelect.options.length <= 1) {
                await refreshWilayahAktifDariBackendIfNeeded(true);
                ubahKecamatan();
                if (desa) {
                    const adaDesa = Array.from(desaSelect.options || []).some(opt => opt.value === desa);
                    if (adaDesa) desaSelect.value = desa;
                }
                ubahDesa();
            }

            openScreen('registrasi-screen');
        }

