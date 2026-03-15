import { putBulkData, getAllData, deleteData } from './db.js';

// ==========================================
// 1. KONFIGURASI URL GOOGLE APPS SCRIPT
// ==========================================
// PENTING: Paste URL Web App Anda yang diakhiri dengan /exec di dalam tanda kutip di bawah ini!
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwJtpJyjLkOT4_emN_AL5LBU-shq5cAgStizwD7jiuodiL2nfduEhAnfZW6dfDQlVpxrA/exec'; 

// ==========================================
// 2. FUNGSI TARIK DATA MASTER (DOWNLOAD)
// ==========================================
export const downloadMasterData = async () => {
    try {
        console.log("Memulai proses download Master Data...");
        
        // Kita tambahkan parameter waktu (timestamp) agar browser tidak menggunakan cache lama
        const timestamp = new Date().getTime();
        const fetchUrl = `${SCRIPT_URL}?action=getMaster&t=${timestamp}`;

        // Mengambil data dengan metode GET
        const response = await fetch(fetchUrl, {
            method: 'GET',
            // redirect: 'follow' sangat krusial untuk Google Apps Script karena Google selalu melakukan redirect
            redirect: 'follow' 
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const responseData = await response.json();

        // Menyimpan data massal ke IndexedDB HP Kader
        if (responseData.master_user) await putBulkData('master_user', responseData.master_user);
        if (responseData.master_kader) await putBulkData('master_kader', responseData.master_kader);
        if (responseData.master_wilayah) await putBulkData('master_wilayah', responseData.master_wilayah);
        if (responseData.master_tim_wilayah) await putBulkData('master_tim_wilayah', responseData.master_tim_wilayah);
        if (responseData.master_pertanyaan) await putBulkData('master_pertanyaan', responseData.master_pertanyaan);

        console.log("✅ Master Data berhasil diunduh dan disimpan di HP!");
        return true;

    } catch (error) {
        console.error("❌ Gagal download Master Data:", error);
        if (error.message === 'Failed to fetch') {
            console.error("🚨 INFO CORS: Jika ini error CORS, pastikan Deploy di Google Script diset ke 'Who has access: Anyone' (Siapa saja tanpa perlu login akun Google).");
        }
        return false;
    }
};

// ==========================================
// 3. FUNGSI KIRIM LAPORAN (UPLOAD)
// ==========================================
export const uploadLaporanTunda = async () => {
    try {
        const antreanSync = await getAllData('sync_queue');
        
        if (antreanSync.length === 0) {
            console.log("Tidak ada data laporan yang perlu disinkronkan.");
            return true;
        }

        console.log(`Menemukan ${antreanSync.length} laporan untuk dikirim...`);

        // Mengirim data dengan metode POST
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow',
            // Trik Jitu: Gunakan text/plain agar tidak diblokir oleh sistem keamanan preflight CORS Google
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'uploadLaporan', 
                data: antreanSync
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            // Hapus data dari HP jika server Google membalas "success"
            for (let item of antreanSync) {
                await deleteData('sync_queue', item.id);
            }
            console.log("✅ Semua laporan berhasil dikirim ke server!");
            return true;
        } else {
            throw new Error(result.message || "Server Google menolak data");
        }

    } catch (error) {
        console.error("❌ Gagal mengirim laporan:", error);
        return false;
    }
};
