import { putBulkData, getAllData, deleteData } from './db.js';

// ==========================================
// 1. KONFIGURASI URL GOOGLE APPS SCRIPT
// ==========================================
// URL Web App murni Anda (Tanpa /u/1/ dan berakhiran /exec)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec'; 

// ==========================================
// 2. FUNGSI TARIK DATA MASTER (DOWNLOAD)
// ==========================================
export const downloadMasterData = async () => {
    try {
        console.log("Memulai proses download Master Data...");
        
        // Tambahkan parameter waktu agar browser selalu mengambil data terbaru dari server (tidak memakai cache)
        const timestamp = new Date().getTime();
        const fetchUrl = `${SCRIPT_URL}?action=getMaster&t=${timestamp}`;

        // Mengambil data dengan metode fetch paling aman untuk Google Script
        const response = await fetch(fetchUrl, {
            method: 'GET',
            redirect: 'follow' 
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const responseData = await response.json();

        // Jika script Google merespons dengan error yang ditangkap oleh try...catch di Code.gs
        if (responseData.status === "error") {
            console.error("Error dari Google Script:", responseData.message);
            alert("Terjadi kesalahan di Server: " + responseData.message);
            return false;
        }

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

        // Mengirim data ke Google menggunakan tipe text/plain untuk mengakali pemblokiran CORS
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow',
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
            // Hapus data dari antrean HP jika server Google membalas "success"
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
