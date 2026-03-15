import { putBulkData, getAllData, deleteData } from './db.js';

// ==========================================
// 1. KONFIGURASI URL GOOGLE APPS SCRIPT
// ==========================================
// TODO: Nanti URL ini akan diganti dengan URL Web App dari Google Apps Script Anda.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwJtpJyjLkOT4_emN_AL5LBU-shq5cAgStizwD7jiuodiL2nfduEhAnfZW6dfDQlVpxrA/exec'; 

// ==========================================
// 2. FUNGSI TARIK DATA MASTER (DOWNLOAD)
// ==========================================
export const downloadMasterData = async () => {
    try {
        console.log("Memulai proses download Master Data...");
        
        // Memanggil API Google Sheet kita (menambahkan parameter ?action=getMaster)
        const response = await fetch(`${SCRIPT_URL}?action=getMaster`, {
            method: 'GET',
        });

        if (!response.ok) throw new Error("Gagal terhubung ke server");

        const responseData = await response.json();

        // Menyimpan data dari Google Sheet ke IndexedDB HP Kader secara massal (Bulk Insert)
        if (responseData.master_user) await putBulkData('master_user', responseData.master_user);
        if (responseData.master_kader) await putBulkData('master_kader', responseData.master_kader);
        if (responseData.master_wilayah) await putBulkData('master_wilayah', responseData.master_wilayah);
        if (responseData.master_tim_wilayah) await putBulkData('master_tim_wilayah', responseData.master_tim_wilayah);
        if (responseData.master_pertanyaan) await putBulkData('master_pertanyaan', responseData.master_pertanyaan);

        console.log("✅ Master Data berhasil diunduh dan disimpan di HP!");
        return true;

    } catch (error) {
        console.error("❌ Gagal download Master Data:", error);
        return false;
    }
};

// ==========================================
// 3. FUNGSI KIRIM LAPORAN (UPLOAD)
// ==========================================
export const uploadLaporanTunda = async () => {
    try {
        // Ambil semua data yang masih antre di IndexedDB
        const antreanSync = await getAllData('sync_queue');
        
        if (antreanSync.length === 0) {
            console.log("Tidak ada data laporan yang perlu disinkronkan.");
            return true;
        }

        console.log(`Menemukan ${antreanSync.length} laporan untuk dikirim...`);

        // Kirim data ke Google Sheet menggunakan metode POST
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'uploadLaporan',
                data: antreanSync
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            // Jika Google Sheet membalas "success", hapus data dari antrean di HP
            for (let item of antreanSync) {
                await deleteData('sync_queue', item.id);
            }
            console.log("✅ Semua laporan berhasil dikirim ke server!");
            return true;
        } else {
            throw new Error(result.message || "Server menolak data");
        }

    } catch (error) {
        console.error("❌ Gagal mengirim laporan:", error);
        return false;
    }
};
