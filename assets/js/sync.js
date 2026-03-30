// ==========================================
// SYNC MANAGER (SYNC.JS)
// ==========================================

window.SyncManager = {
    isSyncing: false,

    async updateBadge() {
        try {
            const count = await window.DB.getQueueCount();
            console.log('Jumlah antrean offline:', count);
        } catch (err) {
            console.warn('Badge queue gagal diperbarui:', err);
        }
    },

    async syncNow() {
        if (this.isSyncing) return;
        if (!navigator.onLine) return;

        this.isSyncing = true;

        try {
            const items = await window.DB.getAllQueue();

            if (!items.length) {
                await this.updateBadge();
                return;
            }

            for (const item of items) {
                try {
                    const res = await window.apiCall(
                        item.action,
                        item.payload || {},
                        item.meta || {},
                        true
                    );

                    if (res && res.ok) {
                        await window.DB.deleteQueueItem(item.id);
                    }
                } catch (e) {
                    console.warn('Sync item gagal, akan dicoba lagi:', item.id, e);
                }
            }

            await this.updateBadge();
        } catch (err) {
            console.error('syncNow error:', err);
        } finally {
            this.isSyncing = false;
        }
    },

    init() {
        this.updateBadge();

        window.addEventListener('online', () => {
            console.log('Koneksi kembali online, mulai sinkronisasi...');
            this.syncNow();
        });

        setInterval(() => {
            if (navigator.onLine) this.syncNow();
        }, 15000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.SyncManager) {
        window.SyncManager.init();
    }
});
