const renderKonten = async (target) => {
    const area = getEl('content-area');
    if (!area) return;

    const renderKonten = async (target) => {
    const area = getEl('content-area');
    if (!area) return;

    if (target === 'dashboard') {
        const session = window.currentUser;
        
        // 1. Ambil data Wilayah Kerja dari TIM_WILAYAH
        const semuaTimWilayah = await getAllData('master_tim_wilayah') || [];
        const wilayahKerja = semuaTimWilayah.filter(w => w.id_tim === session.id_tim);
        
        // Ambil daftar dusun (misal: "Dusun A, Dusun B")
        const daftarDusun = wilayahKerja.map(w => w.dusun_rw).join(', ') || 'Belum diatur';
        
        // Ambil data Desa & Kecamatan (dari entri pertama wilayah kerja)
        const desa = wilayahKerja.length > 0 ? wilayahKerja[0].desa_kelurahan : '-';
        const kec = wilayahKerja.length > 0 ? wilayahKerja[0].kecamatan : '-';

        // 2. Ambil statistik laporan tertunda
        const antrean = await getAllData('sync_queue') || [];
        
        area.innerHTML = `
            <div class="animate-fade">
                <div class="card" style="background: linear-gradient(135deg, #0d6efd, #0043a8); color: white; border:none; margin-bottom: 20px; padding: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <p style="margin:0; opacity: 0.8; font-size: 0.9rem;">Selamat Datang,</p>
                            <h2 style="margin: 5px 0; font-size: 1.6rem; letter-spacing: 0.5px;">${session.nama}</h2>
                            <span style="background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 20px; font-size: 0.75rem;">
                                No. Tim: ${session.id_tim}
                            </span>
                        </div>
                        <div style="font-size: 2.5rem; opacity: 0.3;">👤</div>
                    </div>
                    
                    <hr style="margin: 20px 0; border: 0; border-top: 1px solid rgba(255,255,255,0.1);">
                    
                    <div style="display: grid; grid-template-columns: 1fr; gap: 10px; font-size: 0.85rem;">
                        <div style="display: flex; gap: 10px;">
                            <span style="opacity: 0.7; min-width: 80px;">📍 Dusun/RW:</span>
                            <span style="font-weight: 500;">${daftarDusun}</span>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <span style="opacity: 0.7; min-width: 80px;">🏘️ Desa:</span>
                            <span style="font-weight: 500;">${desa}</span>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <span style="opacity: 0.7; min-width: 80px;">🏛️ Kec/Kab:</span>
                            <span style="font-weight: 500;">${kec}, BULELENG</span>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="card" style="text-align: center; padding: 20px; border-top: 4px solid orange;">
                        <div style="font-size: 1.5rem; margin-bottom: 5px;">📦</div>
                        <h3 style="margin:0;">${antrean.length}</h3>
                        <p style="font-size: 0.7rem; color: #6c757d; font-weight: 600;">TERTUNDA</p>
                    </div>
                    <div class="card" style="text-align: center; padding: 20px; cursor: pointer; border-top: 4px solid var(--primary);" 
                         onclick="document.querySelector('[data-target=\\'registrasi\\']').click()">
                        <div style="font-size: 1.5rem; margin-bottom: 5px;">➕</div>
                        <h3 style="margin:0;">BARU</h3>
                        <p style="font-size: 0.7rem; color: #6c757d; font-weight: 600;">REGISTRASI</p>
                    </div>
                </div>
            </div>`;
    } 
    // ... bagian else if registrasi tetap sama ...
};
    } else if (target === 'registrasi') {
        const temp = getEl('template-registrasi');
        area.innerHTML = '';
        area.appendChild(temp.content.cloneNode(true));
        initFormRegistrasi(); // Memuat desa/dusun otomatis
    } else {
        area.innerHTML = `<div class="content-card"><h3>Menu ${target.toUpperCase()}</h3><p>Halaman sedang disiapkan.</p></div>`;
    }
};
