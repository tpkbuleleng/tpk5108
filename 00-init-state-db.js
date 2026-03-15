        let editModeSasaranId = null, editModeLaporanId = null, db;
        const NAMA_BULAN = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        // Untuk mode GitHub online, biarkan kosong agar tidak expose kunci statis di frontend.
        const API_KEY = "";
        const BACKEND_URL_KEY = "tpk_backend_url";
        const ADMIN_SUMBER_FILTER_KEY = "admin_sumber_filter";
        const CUTOVER_LOCAL_KEY = "cutover_riil_cleanup_v1";
        const USER_CATALOG_KEY = "tpk_user_catalog_cache_v1";
        const WILAYAH_AKTIF_KEY = "wilayah_kader_aktif_v1";
        const ADMIN_CATALOG_HYDRATE_KEY = "admin_catalog_hydrated_v3";
        const CUTOVER_UJI_IDS = ['TPK01', 'TPK02', 'TPK03', 'TPK04', 'TPK05', 'ADM01'];
        
        const CUTOVER_RIIL_START_DATE = '2026-03-25';
        const CUTOVER_RIIL_LABEL = '25 Maret 2026';
        const DEFAULT_APPS_SCRIPT_URL = "";
        const API_TIMEOUT_MS = 12000;
        const API_TIMEOUT_LOGIN_MS = 12000;
        const KEC_CODE_BY_NAME = {
            GEROKGAK: 'GRK',
            SERIRIT: 'SRT',
            BUSUNGBIU: 'BSB',
            BANJAR: 'BJR',
            BULELENG: 'BLL',
            SUKASADA: 'SKS',
            SAWAN: 'SWN',
            KUBUTAMBAHAN: 'KBT',
            TEJAKULA: 'TJK'
        };
        const KEC_NAME_BY_CODE = Object.keys(KEC_CODE_BY_NAME).reduce((acc, nama) => {
            acc[KEC_CODE_BY_NAME[nama]] = nama;
            return acc;
        }, {});
        let adminDashboardCache = null;
        let adminAttendanceCache = null;
        let rekapPendampinganKaderCache = null;
        let activeAdminViewKey = '';
        let adminCatalogHydrating = false;
        const ROLE_MENU = {
            ADMIN_KECAMATAN: [
                "Dashboard Kecamatan",
                "Rekap Sasaran per Kader",
                "Rekap Sasaran per Desa",
                "Rekap Pendampingan per Kader",
                "Rekap Pendampingan per Desa",
                "Daftar Hadir Pendampingan Kader TPK Kecamatan",
                "Reset Password Kader",
                "Cetak Laporan",
                "Ganti Password"
            ]
        };
        const ADMIN_MENU_META = {
            "Dashboard Kecamatan": "Pantau indikator sasaran, laporan, dan kader aktif.",
            "Rekap Sasaran per Kader": "Bandingkan sebaran sasaran antar kader.",
            "Rekap Sasaran per Desa": "Lihat konsentrasi sasaran di tiap desa.",
            "Rekap Pendampingan per Kader": "Monitoring beban pendampingan bulanan kader.",
            "Rekap Pendampingan per Desa": "Evaluasi intensitas kunjungan per wilayah desa.",
            "Daftar Hadir Pendampingan Kader TPK Kecamatan": "Lihat kehadiran pelaporan pendampingan per kader dan tanggal.",
            "Reset Password Kader": "Pemulihan akses akun kader secara cepat.",
            "Cetak Laporan": "Cetak ringkasan kecamatan siap PDF/arsip.",
            "Ganti Password": "Perbarui keamanan akun admin kecamatan."
        };

        if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

        const request = indexedDB.open("TPK_Buleleng_DB", 2);
        request.onupgradeneeded = e => {
            db = e.target.result;
            if (!db.objectStoreNames.contains('sasaran')) db.createObjectStore('sasaran', { keyPath: 'id_sasaran' });
            if (!db.objectStoreNames.contains('laporan')) db.createObjectStore('laporan', { keyPath: 'id_laporan' });
        };
        request.onsuccess = e => { db = e.target.result; refreshStatusAktifSasaran(); jalankanCutoverRiilLokal(); enforceAdminSumberFilterPolicy(); updateBadgeSinkronisasi(); };

