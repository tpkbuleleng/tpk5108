// ==========================================
// PUSAT KOMUNIKASI API & INTERCEPTOR (API.JS)
// ==========================================

const CONFIG = {
    // ⚠️ WAJIB GANTI DENGAN URL WEB APP DEPLOYMENT TERBARU BAPAK
    API_URL: 'https://script.google.com/macros/s/AKfycbxxxxxxx/exec', 
    APP_VERSION: '1.0.5'
};

function generateUniqueId(prefix = 'ID') {
    return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

function getDeviceId() {
    let deviceId = localStorage.getItem('DEVICE_ID');
    if (!deviceId) { deviceId = generateUniqueId('DEV'); localStorage.setItem('DEVICE_ID', deviceId); }
    return deviceId;
}

// Tambahan isSyncing = false agar saat SyncManager bekerja, ia tidak berputar tanpa henti
window.apiCall = async function(action, payload = {}, extraMeta = {}, isSyncing = false) {
    const sessionToken = localStorage.getItem('SESSION_TOKEN') || '';

    // Daftarkan fungsi-fungsi yang BOLEH disimpan ke laci offline (Fungsi Write/Tulis)
    const actionBisaOffline = ['submitPendampingan', 'registerSasaran', 'updateSasaran', 'changeStatusSasaran'];
    const isActionOffline = actionBisaOffline.includes(action);

    // 🔥 SMART INTERCEPTOR: Jika tidak ada sinyal internet & fungsi ini boleh offline
    if (!navigator.onLine && isActionOffline && !isSyncing) {
        await window.DB.saveToQueue(action, payload, extraMeta);
        if (window.SyncManager) window.SyncManager.updateBadge();
        console.log(`[Offline] ${action} masuk ke laci IndexedDB.`);
        // Bohongi app.js bahwa semua beres
        return { ok: true, status: 'success', message: 'Tersimpan Offline! Data akan dikirim otomatis saat sinyal kembali.', data: { duplicate_flag: false } };
    }

    const requestBody = {
        action: action, payload: payload,
        meta: { session_token: sessionToken, device_id: getDeviceId(), app_version: CONFIG.APP_VERSION, request_id: generateUniqueId('REQ'), client_timestamp: new Date().toISOString(), ...extraMeta }
    };

    try {
        const response = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(requestBody) });
        const data = await response.json();

        if (data.session_token || data.token) localStorage.setItem('SESSION_TOKEN', data.session_token || data.token);
        if (!data.ok && (data.code === 401 || (data.message && data.message.toLowerCase().includes('token')))) { console.warn("Sesi ditolak. Logout..."); forceLogout(); }

        return data;

    } catch (error) {
        // 🔥 SMART INTERCEPTOR: Jika fetch GAGAL (karena sinyal mati di tengah jalan atau CORS putus)
        if (isActionOffline && !isSyncing) {
            await window.DB.saveToQueue(action, payload, extraMeta);
            if (window.SyncManager) window.SyncManager.updateBadge();
            console.log(`[Fetch Error Intercepted] ${action} masuk ke laci IndexedDB.`);
            return { ok: true, status: 'success', message: 'Tersimpan Offline! Jaringan tidak stabil, data masuk ke antrean.', data: { duplicate_flag: false } };
        }
        
        console.error(`[API Error] Action: ${action}`, error);
        if (isSyncing) throw error; // Lempar error agar SyncManager tahu sedang putus koneksi
        return { ok: false, status: 'error', message: 'Gagal terhubung ke server. Periksa internet Anda.' };
    }
}

function forceLogout() {
    localStorage.removeItem('SESSION_TOKEN'); localStorage.removeItem('USER_PROFILE');
    window.location.replace('index.html'); 
}
