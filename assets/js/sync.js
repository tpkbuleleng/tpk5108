// ==========================================
// KURIR BACKGROUND SYNC (SYNC.JS)
// ==========================================

window.SyncManager = {
    isSyncing: false,

    async trySync() {
        if (this.isSyncing || !navigator.onLine) return;
        
        const queue = await window.DB.getQueue();
        this.updateBadge(queue.length);

        if (queue.length === 0) return;

        this.isSyncing = true;
        console.log(`🚀 Memulai Sinkronisasi: ${queue.length} antrean ditemukan...`);

        for (const item of queue) {
            try {
                // Tembakkan ke API dengan bendera isSyncing = true (Bypass Interceptor)
                const res = await window.apiCall(item.action, item.payload, item.meta, true);

                // Jika sukses ATAU server menolak karena duplikat, hapus dari antrean lokal
                if (res.ok || res.duplicate_submit || res.duplicate_detected || (res.code >= 400 && res.code < 500)) {
                    await window.DB.deleteFromQueue(item.id);
                    console.log(`✅ Antrean ID ${item.id} berhasil diproses.`);
                }
            } catch (err) {
                console.warn(`⚠️ Gagal memproses antrean ID ${item.id}. Berhenti sinkronisasi sementara.`, err);
                break; // Hentikan loop jika koneksi terputus lagi di tengah jalan
            }
        }

        this.isSyncing = false;
        
        // Update badge lagi setelah selesai
        const remainingQueue = await window.DB.getQueue();
        this.updateBadge(remainingQueue.length);
        
        // Jika antrean bersih, refresh otomatis tabel rekap & daftar
        if (remainingQueue.length === 0) {
            console.log('🎉 Semua data offline berhasil tersinkronisasi!');
            if (typeof renderKonten === 'function' && document.getElementById('view-app').classList.contains('active')) {
                 // Refresh halaman aktif diam-diam
                 if (document.getElementById('tbody-rekap-tim')) renderKonten('rekap');
            }
        }
    },

    async updateBadge(queueLength = null) {
        const badge = document.getElementById('network-status');
        if (!badge) return;

        let qLen = queueLength;
        if (qLen === null) {
            const queue = await window.DB.getQueue();
            qLen = queue.length;
        }

        if (qLen > 0) {
            badge.innerText = `Menunggu Sync (${qLen})`;
            badge.className = 'status-badge warning';
            badge.style.background = '#ffc107';
            badge.style.color = '#000';
        } else if (navigator.onLine) {
            badge.innerText = 'Online';
            badge.className = 'status-badge online';
            badge.style.background = '#198754';
            badge.style.color = '#fff';
        } else {
            badge.innerText = 'Offline';
            badge.className = 'status-badge offline';
            badge.style.background = '#dc3545';
            badge.style.color = '#fff';
        }
    }
};

// Pasang Radar Pendeteksi Sinyal Internet
window.addEventListener('online', () => {
    console.log("🌐 Sinyal Kembali Terhubung!");
    window.SyncManager.trySync();
});

window.addEventListener('offline', () => {
    console.log("📡 Sinyal Terputus! Beralih ke Mode Offline.");
    window.SyncManager.updateBadge();
});

// Pancing radar saat aplikasi pertama kali dibuka
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.SyncManager) window.SyncManager.updateBadge();
    }, 2000);
});
