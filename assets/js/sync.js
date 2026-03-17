import { putData, getAllData, clearStore, deleteData } from './db.js';

// 👉 PASTIKAN URL INI SUDAH MERUPAKAN VERSI DEPLOY TERBARU DARI GOOGLE SCRIPT
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';

export const downloadMasterData = async () => {
    try {
        if (!navigator.onLine) return false;
        const response = await fetch(SCRIPT_URL);
        const result = await response.json();

        if (result.status === 'success') {
            const d = result.data;
            
            // SUNTIKAN TURBO 3: Menyimpan data ke DB HP secara paralel (bersamaan) bukan antre
            await clearStore('master_user'); await Promise.all(d.master_user.map(item => putData('master_user', item)));
            await clearStore('master_kader'); await Promise.all(d.master_kader.map(item => putData('master_kader', item)));
            await clearStore('master_tim'); await Promise.all(d.master_tim.map(item => putData('master_tim', item)));
            await clearStore('master_tim_wilayah'); await Promise.all(d.master_tim_wilayah.map(item => putData('master_tim_wilayah', item)));
            await clearStore('master_pertanyaan'); await Promise.all(d.master_pertanyaan.map(item => putData('master_pertanyaan', item)));
            await clearStore('master_wilayah_bali'); await Promise.all(d.master_wilayah_bali.map(item => putData('master_wilayah_bali', item)));
            
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

        // SUNTIKAN TURBO 4: Kirim SEMUA laporan (Array) dalam 1 KALI ketukan server!
        const response = await fetch(SCRIPT_URL, {
            method: 'POST', 
            body: JSON.stringify(pending),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Ubah status menjadi synced secara paralel
            await Promise.all(pending.map(data => {
                data.is_synced = true;
                return putData('sync_queue', data);
            }));
        }
        
    } catch (error) { console.error("Error upload:", error); }
};

window.jalankanSinkronisasi = async () => {
    const btn = document.querySelector('[data-target="sync_manual"]');
    
    // Memberi tahu Kader apa yang sedang terjadi agar tidak bosan
    if(btn) btn.innerHTML = '<span class="icon">⏳</span> Mengunggah Laporan...';
    await uploadData(); 
    
    if(btn) btn.innerHTML = '<span class="icon">⏳</span> Mengunduh Data Terbaru...';
    await downloadMasterData(); 
    
    if(btn) btn.innerHTML = '<span class="icon">✅</span> Selesai!';
    setTimeout(() => { location.reload(true); }, 800); 
};
