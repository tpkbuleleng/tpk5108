// ==========================================
// PUSAT KOMUNIKASI API (FRONTEND V2.0)
// ==========================================

const CONFIG = {
    // ⚠️ WAJIB GANTI DENGAN URL WEB APP DEPLOYMENT TERBARU BAPAK
    API_URL: 'https://script.google.com/macros/s/AKfycbwZiCcv7MCL21R1VqlOFsx1x_Ax_8yoxVwjIumG3kVYwDSQTfXX9VjQnz2GsAW2ItzAAQ/exec', 
    APP_VERSION: '1.0.5'
};

// 1. Helper: Pembuat ID Unik (Untuk Device ID & Request ID)
function generateUniqueId(prefix = 'ID') {
    return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

// 2. Helper: Mengambil atau Membuat Device ID di HP Kader
function getDeviceId() {
    let deviceId = localStorage.getItem('DEVICE_ID');
    if (!deviceId) {
        deviceId = generateUniqueId('DEV');
        localStorage.setItem('DEVICE_ID', deviceId);
    }
    return deviceId;
}

// 3. FUNGSI INTI: Panggilan API ke Satelit (Backend)
async function apiCall(action, payload = {}, extraMeta = {}) {
    const sessionToken = localStorage.getItem('SESSION_TOKEN') || '';

    // Merakit koper data sesuai standar Backend V65
    const requestBody = {
        action: action,
        payload: payload,
        meta: {
            session_token: sessionToken,
            device_id: getDeviceId(),
            app_version: CONFIG.APP_VERSION,
            request_id: generateUniqueId('REQ'),
            client_timestamp: new Date().toISOString(),
            ...extraMeta // Untuk menyisipkan client_submit_id dll
        }
    };

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, // Pakai text/plain untuk bypass CORS Google
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        // Fitur Canggih: Auto-Update Token jika Backend merespons dengan token baru
        if (data.session_token || data.token) {
            localStorage.setItem('SESSION_TOKEN', data.session_token || data.token);
        }

        // Fitur Canggih: Auto-Logout jika Token Expired / Ditolak Satpam Backend
        if (!data.ok && (data.code === 401 || (data.message && data.message.toLowerCase().includes('token')))) {
            console.warn("Sesi ditolak oleh Backend. Memaksa Logout...");
            forceLogout();
        }

        return data;

    } catch (error) {
        console.error(`[API Error] Action: ${action}`, error);
        return { 
            ok: false, 
            status: 'error', 
            message: 'Gagal terhubung ke server. Periksa koneksi internet Anda.' 
        };
    }
}

// 4. Helper: Logout Paksa & Bersihkan Memori HP
function forceLogout() {
    localStorage.removeItem('SESSION_TOKEN');
    localStorage.removeItem('USER_PROFILE');
    // Arahkan kembali ke halaman login (sesuaikan dengan nama file Bapak)
    window.location.replace('login.html'); 
}

// 5. Helper: Mendapatkan Profil yang sedang Login
function getMyProfile() {
    const profileStr = localStorage.getItem('USER_PROFILE');
    return profileStr ? JSON.parse(profileStr) : null;
}
