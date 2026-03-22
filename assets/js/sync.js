import { putData, getAllData } from './db.js';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';

export const uploadData = async () => {
    try {
        const antrean = await getAllData('sync_queue');
        const dataUnsynced = antrean.filter(a => !a.is_synced);
        
        // Jika tidak ada data yang perlu dikirim, laporkan sukses (0 dikirim)
        if(dataUnsynced.length === 0) return { status: true, count: 0 };
        
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(dataUnsynced) });
        const res = await response.json();
        
        if(res.status === 'success') {
            for(let d of dataUnsynced) { 
                d.is_synced = true; 
                await putData('sync_queue', d); 
            }
            return { status: true, count: dataUnsynced.length };
        }
        return { status: false, count: 0 };
    } catch(e) { 
        console.error("Error uploadData:", e);
        return { status: false, count: 0 };
    }
};

export const downloadMasterData = async () => {
    try {
        const response = await fetch(SCRIPT_URL);
        const res = await response.json();
        
        if (res.status === 'success') {
            const d = res.data;
            const stores = [
                'master_kader', 'master_tim', 'master_tim_wilayah', 
                'master_pertanyaan', 'master_wilayah_bali', 'standar_antropometri', 
                'master_kembang', 'master_wilayah', 'master_menu', 'master_widget',
                'master_pkb',
                'master_pengumuman' // 📢 PATCH: Pipa logistik Pusat Siaran berhasil disambung!
            ];
            
            for (let s of stores) {
                if (d[s] && d[s].length > 0) { 
                    await putData(s, d[s]); 
                }
            }
            console.log("Sinkronisasi Master Berhasil"); 
            return true;
        }
        return false;
    } catch (error) { 
        console.error("Error downloadMasterData:", error);
        return false; // Jangan gunakan throw agar tidak menghentikan keseluruhan fungsi
    }
};

window.jalankanSinkronisasi = async () => {
    try {
        // 🔥 TAKTIK BARU: AMANKAN LAPORAN KADER TERLEBIH DAHULU (UPLOAD)
        const ul = await uploadData();
        
        if (!ul.status) {
            alert("❌ Gagal mengirim laporan. Pastikan internet Anda stabil atau Server mungkin sedang sibuk.");
            return; // Hentikan di sini, jangan biarkan UI nge-blank/reload
        }

        // ⬇️ KEMUDIAN, BARU TARIK DATA MASTER (DOWNLOAD)
        const dl = await downloadMasterData();
        
        if (ul.status && dl) { 
            let msg = ul.count > 0 
                ? `✅ Sinkronisasi Sempurna!\n${ul.count} Laporan berhasil diamankan di Server dan Data Aplikasi sudah diperbarui.` 
                : `✅ Sinkronisasi Berhasil!\nData referensi aplikasi sudah diperbarui.`;
            alert(msg); 
            location.reload(); 
        } else if (ul.status && !dl) {
            // Jika upload sukses tapi download gagal, beritahu kader
            alert("⚠️ Laporan Anda BERHASIL terkirim ke Server, namun sistem gagal mengunduh pembaruan wilayah/pertanyaan terbaru karena sinyal lemah.");
            location.reload();
        }
    } catch (e) { 
        alert("❌ Terjadi gangguan sinyal saat melakukan komunikasi dengan satelit (Server)."); 
        // Dihapus: location.reload() agar tidak merusak UX
    }
};
