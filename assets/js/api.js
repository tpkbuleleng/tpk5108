// ==========================================
// PUSAT KOMUNIKASI API & SESSION (API.JS)
// ==========================================

const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbwZiCcv7MCL21R1VqlOFsx1x_Ax_8yoxVwjIumG3kVYwDSQTfXX9VjQnz2GsAW2ItzAAQ/exec',
    APP_VERSION: '1.0.6'
};

function generateUniqueId(prefix = 'ID') {
    return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

function getDeviceId() {
    let deviceId = localStorage.getItem('DEVICE_ID');

    if (!deviceId) {
        deviceId = generateUniqueId('DEV');
        localStorage.setItem('DEVICE_ID', deviceId);
    }

    return deviceId;
}

// ==========================================
// API CALL
// ==========================================
window.apiCall = async function(action, payload = {}, extraMeta = {}, isSyncing = false) {
    const sessionToken = localStorage.getItem('SESSION_TOKEN') || '';

    const requestBody = {
        action: action,
        payload: payload,
        meta: {
            session_token: sessionToken,
            device_id: getDeviceId(),
            app_version: CONFIG.APP_VERSION,
            request_id: generateUniqueId('REQ'),
            client_timestamp: new Date().toISOString(),
            ...extraMeta
        }
    };

    console.log('API REQUEST BODY:', requestBody);

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        console.log('API RESPONSE:', data);

        // simpan token bila ada
        if (data.session_token || data.token) {
            const token = data.session_token || data.token;
            localStorage.setItem('SESSION_TOKEN', token);
        }

        // JANGAN AUTO LOGOUT DULU (debug mode)
        if (!data.ok && Number(data.code) === 401) {
            console.warn('401 diterima, logout dinonaktifkan sementara:', data);
            return data;
        }

        return data;

    } catch (error) {
        console.error('API ERROR:', error);

        return {
            ok: false,
            status: 'error',
            message: 'Gagal terhubung ke server'
        };
    }
};

// ==========================================
// FORCE LOGOUT (DEBUG MODE)
// ==========================================
function forceLogout() {
    console.trace('FORCE LOGOUT DIPANGGIL');

    localStorage.removeItem('SESSION_TOKEN');
    localStorage.removeItem('USER_PROFILE');

    // sementara redirect dimatikan
    // window.location.replace('index.html');
}
