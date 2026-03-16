import { putData, getAllData, clearStore, deleteData } from './db.js';

// 👉 GANTI DENGAN URL WEB APP DARI GOOGLE SCRIPT BAPAK
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';

export const downloadMasterData = async () => {
    try {
        if (!navigator.onLine) return false;
        const response = await fetch(SCRIPT_URL);
        const result = await response.json();

        if (result.status === 'success') {
            const d = result.data;
            await clearStore('master_user'); for (let item of d.master_user) await putData('master_user', item);
            await clearStore('master_kader'); for (let item of d.master_kader) await putData('master_kader', item);
            await clearStore('master_tim'); for (let item of d.master_tim) await putData('master_tim', item);
            await clearStore('master_tim_wilayah'); for (let item of d.master_tim_wilayah) await putData('master_tim_wilayah', item);
            await clearStore('master_pertanyaan'); for (let item of d.master_pertanyaan) await putData('master_pertanyaan', item);
            await clearStore('master_wilayah_bali'); for (let item of d.master_wilayah_bali) await putData('master_wilayah_bali', item);
            return true;
        } else { return false; }
    } catch (error) { return false; }
};

export const uploadData = async () => {
    if (!navigator.onLine) return;
    try {
        const queue = await getAllData('sync_queue');
        const pending = queue.filter(q => !q.is_synced);
        if (pending.length === 0) return;

        for (let data of pending) {
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST', body: JSON.stringify(data),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
                });
                const result = await response.json();
                if (result.status === 'success') {
                    data.is_synced = true;
                    await putData('sync_queue', data); 
                }
            } catch (err) { console.error("Gagal koneksi:", err); }
        }
    } catch (error) { console.error("Error upload:", error); }
};

window.jalankanSinkronisasi = async () => {
    const btn = document.querySelector('[data-target="sync_manual"]');
    if(btn) btn.innerHTML = '<span class="icon">⏳</span> Sedang Sinkron...';
    
    // Proses berjalan senyap tanpa alert
    await uploadData(); 
    await downloadMasterData(); 
    
    if(btn) btn.innerHTML = '<span class="icon">✅</span> Selesai!';
    setTimeout(() => { location.reload(); }, 500); // Otomatis refresh cepat
};
