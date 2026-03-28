import { putData, getAllData, getDataById } from './db.js';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZiCcv7MCL21R1VqlOFsx1x_Ax_8yoxVwjIumG3kVYwDSQTfXX9VjQnz2GsAW2ItzAAQ/exec';

export const uploadData = async () => {
    try {
        // 1. Ambil Sesi dan Token JWT dari Memori Lokal
        const session = await getDataById('kader_session', 'active_user');
        if(!session || !session.token) return { status: false, count: 0 };

        const antrean = await getAllData('sync_queue');
        const dataUnsynced = antrean.filter(a => !a.is_synced);
        
        // Jika tidak ada data yang perlu dikirim, laporkan sukses (0 dikirim)
        if(dataUnsynced.length === 0) return { status: true, count: 0 };
        
        // 🔥 INJEKSI TOKEN KE DALAM SETIAP LAPORAN (AGAR LOLOS MIDDLEWARE)
        const payloadToSend = dataUnsynced.map(item => {
            return { ...item, token: session.token };
        });

        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payloadToSend) });
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
        // 1. Ambil Sesi dan Token JWT
        const session = await getDataById('kader_session', 'active_user');
        if(!session || !session.token) return false;

        // 🔥 INJEKSI TOKEN KE DALAM URL (GET REQUEST)
        const response = await fetch(`${SCRIPT_URL}?token=${session.token}`);
        const res = await response.json();
        
        // 🛡️ Tangkap jika ditendang oleh Middleware (Token Expired/Salah)
        if (res.status === 'error' && String(res.message).includes('401')) {
            console.error("Akses Ditolak: Token JWT Invalid");
            return false;
        }

        if (res.status === 'success') {
            const d = res.data;
            const stores = [
                'master_kader', 'master_tim', 'master_tim_wilayah', 
                'master_pertanyaan', 'master_wilayah_bali', 'standar_antropometri', 
                'master_kembang', 'master_wilayah', 'master_menu', 'master_widget',
                'master_pkb', 'master_pengumuman'
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
        return false;
    }
};

window.jalankanSinkronisasi = async () => {
    try {
        const ul = await uploadData();
        
        if (!ul.status) {
            alert("❌ Gagal mengirim laporan. Pastikan internet Anda stabil atau Server mungkin sedang sibuk.");
            return; 
        }

        const dl = await downloadMasterData();
        
        if (ul.status && dl) { 
            let msg = ul.count > 0 
                ? `✅ Sinkronisasi Sempurna!\n${ul.count} Laporan berhasil diamankan di Server dan Data Aplikasi sudah diperbarui.` 
                : `✅ Sinkronisasi Berhasil!\nData referensi aplikasi sudah diperbarui.`;
            alert(msg); 
            location.reload(); 
        } else if (ul.status && !dl) {
            alert("⚠️ Laporan Anda BERHASIL terkirim, namun sistem gagal mengunduh pembaruan wilayah terbaru.\n\nKemungkinan Token Sesi Anda kadaluarsa atau sinyal lemah. Silakan Logout dan Login kembali.");
            location.reload();
        }
    } catch (e) { 
        alert("❌ Terjadi gangguan sinyal saat melakukan komunikasi dengan satelit (Server)."); 
    }
};
