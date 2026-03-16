import { putData, getAllData, clearStore, deleteData } from './db.js';

// 👉 GANTI DENGAN URL WEB APP DARI GOOGLE SCRIPT BAPAK (HARUS DIAPIT TANDA KUTIP)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEmmn0wMJmC1OHij9JUxm8EIT2xW1AuV0597EYCWDIxG_nkpZYBPx1EGiNYe6OjEHniw/exec';

// 1. Fungsi Narik Data (Download Master)
export const downloadMasterData = async () => {
    try {
        if (!navigator.onLine) {
            alert('❌ Tidak ada koneksi internet. Gagal mengunduh data Master.');
            return false;
        }

        console.log("Memulai unduh data master...");
        const response = await fetch(SCRIPT_URL);
        const result = await response.json();

        if (result.status === 'success') {
            const d = result.data;
            
            // Bersihkan kamar lama, masukkan data baru satu per satu
            await clearStore('master_user');
            for (let item of d.master_user) await putData('master_user', item);
            
            await clearStore('master_kader');
            for (let item of d.master_kader) await putData('master_kader', item);
            
            await clearStore('master_tim');
            for (let item of d.master_tim) await putData('master_tim', item);
            
            await clearStore('master_tim_wilayah');
            for (let item of d.master_tim_wilayah) await putData('master_tim_wilayah', item);
            
            await clearStore('master_pertanyaan');
            for (let item of d.master_pertanyaan) await putData('master_pertanyaan', item);
            
            // Data Dropdown Wilayah CATIN
            await clearStore('master_wilayah_bali');
            for (let item of d.master_wilayah_bali) await putData('master_wilayah_bali', item);

            console.log("✅ Data Master berhasil diperbarui.");
            return true;
        } else {
            console.error("Gagal menarik data:", result.message);
            return false;
        }
    } catch (error) {
        console.error("Terjadi kesalahan sinkronisasi:", error);
        return false;
    }
};

// 2. Fungsi Dorong Data (Upload Antrean)
export const uploadData = async () => {
    if (!navigator.onLine) {
        alert("❌ Perangkat sedang Offline. Tunggu hingga internet menyala.");
        return;
    }

    try {
        const queue = await getAllData('sync_queue');
        if (queue.length === 0) {
            alert("✨ Tidak ada data tertunda. Semua sudah sinkron.");
            return;
        }

        let berhasil = 0;
        let gagal = 0;

        for (let data of queue) {
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' } // text/plain hindari error CORS
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    await deleteData('sync_queue', data.id); // Hapus dari HP jika berhasil masuk Server
                    berhasil++;
                } else {
                    gagal++;
                    console.error("Gagal kirim:", result.message);
                }
            } catch (err) {
                gagal++;
                console.error("Gagal koneksi:", err);
            }
        }

        alert(`🔄 Sinkronisasi Selesai!\n✅ Berhasil: ${berhasil}\n❌ Gagal: ${gagal}`);
        
    } catch (error) {
        alert("Terjadi kesalahan sistem saat proses unggah.");
    }
};

// 3. Tombol Eksekusi dari Sidebar
window.jalankanSinkronisasi = async () => {
    const btn = document.querySelector('[data-target="sync_manual"]');
    if(btn) btn.innerHTML = '<span class="icon">⏳</span> Sedang Sinkron...';
    
    // Alur: Upload Data Tertunda dulu, baru Download Data Master terbaru
    await uploadData(); 
    await downloadMasterData(); 
    
    if(btn) btn.innerHTML = '<span class="icon">🔄</span> Sinkronisasi Data';
    
    alert("✅ Proses Sinkronisasi Selesai! Aplikasi akan dimuat ulang.");
    location.reload(); // Refresh aplikasi agar data wilayah langsung muncul
};
