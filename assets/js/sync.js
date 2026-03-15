import { putBulkData, getAllData, deleteData } from './db.js';

// TODO: PASTE URL WEB APP ANDA DI SINI
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyoznaGrtmZdz5FhtS4mxi4-FjKEVY9CybbvV8E30JSct-RYTth61mNyXRrdB89day7lA/exec'; 

export const downloadMasterData = async () => {
    try {
        console.log("Memulai proses download Master Data...");
        const fetchUrl = `${SCRIPT_URL}?action=getMaster`;

        // Menggunakan fetch paling standar tanpa header tambahan untuk menghindari preflight CORS
        const response = await fetch(fetchUrl);

        if (!response.ok) throw new Error("Gagal terhubung ke server");

        const responseData = await response.json();

        // Cek apakah server Google mengirimkan pesan error (dari try...catch di Code.gs)
        if (responseData.status === "error") {
            console.error("Error dari Google Script:", responseData.message);
            alert("Terjadi kesalahan di Google Sheet: " + responseData.message);
            return false;
        }

        // Simpan data jika sukses
        if (responseData.master_user) await putBulkData('master_user', responseData.master_user);
        if (responseData.master_kader) await putBulkData('master_kader', responseData.master_kader);
        if (responseData.master_wilayah) await putBulkData('master_wilayah', responseData.master_wilayah);
        if (responseData.master_tim_wilayah) await putBulkData('master_tim_wilayah', responseData.master_tim_wilayah);
        if (responseData.master_pertanyaan) await putBulkData('master_pertanyaan', responseData.master_pertanyaan);

        console.log("✅ Master Data berhasil diunduh!");
        return true;

    } catch (error) {
        console.error("❌ Gagal download:", error);
        return false;
    }
};

export const uploadLaporanTunda = async () => {
    // ... (Kode uploadLaporanTunda biarkan sama seperti sebelumnya) ...
};
