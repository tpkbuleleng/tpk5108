import { putBulkData, getAllData, deleteData } from './db.js';

// URL Web App murni Anda yang sudah sukses
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec'; 

export const downloadMasterData = async () => {
    try {
        console.log("Memulai proses download Master Data...");
        const timestamp = new Date().getTime();
        const fetchUrl = `${SCRIPT_URL}?action=getMaster&t=${timestamp}`;

        const response = await fetch(fetchUrl, {
            method: 'GET',
            redirect: 'follow' 
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const responseData = await response.json();

        if (responseData.status === "error") {
            console.error("Error dari Google Script:", responseData.message);
            alert("Terjadi kesalahan di Server: " + responseData.message);
            return false;
        }

        // --- FILTER SAKTI: Membuang baris Excel yang kosong / tidak ada ID-nya ---
        const bersihkanData = (dataArray) => {
            if (!Array.isArray(dataArray)) return [];
            return dataArray.filter(item => {
                const keys = Object.keys(item);
                if (keys.length === 0) return false;
                // Asumsi: Kolom pertama di Excel (A1) adalah ID/Username. Jika kosong, buang barisnya.
                const primaryKey = keys[0]; 
                return item[primaryKey] !== null && item[primaryKey] !== undefined && item[primaryKey].toString().trim() !== "";
            });
        };

        // Simpan ke HP menggunakan data yang sudah disaring
        if (responseData.master_user) await putBulkData('master_user', bersihkanData(responseData.master_user));
        if (responseData.master_kader) await putBulkData('master_kader', bersihkanData(responseData.master_kader));
        if (responseData.master_wilayah) await putBulkData('master_wilayah', bersihkanData(responseData.master_wilayah));
        if (responseData.master_tim_wilayah) await putBulkData('master_tim_wilayah', bersihkanData(responseData.master_tim_wilayah));
        if (responseData.master_pertanyaan) await putBulkData('master_pertanyaan', bersihkanData(responseData.master_pertanyaan));

        console.log("✅ Master Data berhasil diunduh dan disimpan di HP!");
        return true;

    } catch (error) {
        console.error("❌ Gagal download Master Data:", error);
        return false;
    }
};

export const uploadLaporanTunda = async () => {
    try {
        const antreanSync = await getAllData('sync_queue');
        
        if (antreanSync.length === 0) return true;

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'uploadLaporan', data: antreanSync })
        });

        const result = await response.json();

        if (result.status === 'success') {
            for (let item of antreanSync) await deleteData('sync_queue', item.id);
            return true;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("❌ Gagal mengirim laporan:", error);
        return false;
    }
};
