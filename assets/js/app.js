const renderKonten = async (target) => {
    const area = getEl('content-area');
    if (!area) return;

    if (target === 'dashboard') {
        // Ambil data antrean untuk statistik sederhana
        const antrean = await getAllData('sync_queue') || [];
        
        area.innerHTML = `
            <div class="animate-fade">
                <div class="card" style="background: linear-gradient(135deg, #0d6efd, #0043a8); color: white; margin-bottom: 20px; border:none;">
                    <p style="margin:0; opacity: 0.9;">Selamat Datang,</p>
                    <h2 style="margin: 5px 0; font-size: 1.5rem;">${window.currentUser.nama}</h2>
                    <p style="margin:0; font-size: 0.8rem; opacity: 0.7;">Tim: ${window.currentUser.id_tim}</p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="card" style="text-align: center; padding: 20px;">
                        <div style="font-size: 1.5rem; margin-bottom: 5px;">📦</div>
                        <h3 style="margin:0;">${antrean.length}</h3>
                        <p style="font-size: 0.7rem; color: #666; margin:0;">Laporan Tertunda</p>
                    </div>
                    <div class="card" style="text-align: center; padding: 20px; cursor: pointer;" onclick="document.querySelector('[data-target=\'registrasi\']').click()">
                        <div style="font-size: 1.5rem; margin-bottom: 5px;">➕</div>
                        <h3 style="margin:0;">Baru</h3>
                        <p style="font-size: 0.7rem; color: #666; margin:0;">Tambah Sasaran</p>
                    </div>
                </div>
            </div>
        `;
    } else if (target === 'registrasi') {
        const temp = getEl('template-registrasi');
        area.innerHTML = '';
        area.appendChild(temp.content.cloneNode(true));
        initFormRegistrasi(); // Memuat desa/dusun otomatis
    } else {
        area.innerHTML = `<div class="content-card"><h3>Menu ${target.toUpperCase()}</h3><p>Halaman sedang disiapkan.</p></div>`;
    }
};
