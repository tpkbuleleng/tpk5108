import { putData, getAllData } from './db.js';

// 👉 WAJIB SAMA DENGAN URL DI admin.js dan Code.gs
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';

export const downloadMasterData = async () => {
    try {
        const response = await fetch(SCRIPT_URL);
        const res = await response.json();
        if (res.status === 'success') {
            const d = res.data;
            // 🔥 Ambil 10 Sheet sekaligus
            const stores = [
                'master_user', 'master_kader', 'master_tim', 'master_tim_wilayah', 
                'master_pertanyaan', 'master_wilayah_bali', 'standar_antropometri', 
                'master_kembang', 'master_wilayah', 'master_admin'
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
        console.error("Gagal sinkron:", error);
        throw error;
    }
};

export const uploadData = async () => {
    try {
        const antrean = await getAllData('sync_queue');
        const dataUnsynced = antrean.filter(a => !a.is_synced);
        if(dataUnsynced.length === 0) return true;
        
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(dataUnsynced)
        });
        const res = await response.json();
        if(res.status === 'success') {
            for(let d of dataUnsynced) {
                d.is_synced = true;
                await putData('sync_queue', d);
            }
            return true;
        }
        return false;
    } catch(e) {
        console.error("Gagal upload:", e);
        throw e;
    }
};

window.jalankanSinkronisasi = async () => {
    try {
        const dl = await downloadMasterData();
        const ul = await uploadData();
        if(dl) {
            alert("✅ Sinkronisasi Berhasil!");
            location.reload();
        }
    } catch (e) {
        alert("❌ Gagal Sinkronisasi. Pastikan internet Bapak stabil.");
        location.reload();
    }
};
