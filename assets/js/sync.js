import { putData, getAllData, getDataById, clearStore } from './db.js';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZiCcv7MCL21R1VqlOFsx1x_Ax_8yoxVwjIumG3kVYwDSQTfXX9VjQnz2GsAW2ItzAAQ/exec';
const APP_VERSION = '1.0.4';

// 📱 DETEKSI / BUAT DEVICE ID UNTUK BINDING
export const getDeviceId = () => {
    let did = localStorage.getItem('device_id');
    if (!did) {
        did = 'WEB-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem('device_id', did);
    }
    return did;
};

// 🔐 MESIN KRIPTOGRAFI SHA-256
export const generateSignature = async (text) => {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// 🚀 API WRAPPER (STANDAR ENTERPRISE)
export const apiFetch = async (action, payload = {}, sessionToken = '') => {
    const body = {
        action: action,
        payload: payload,
        meta: {
            device_id: getDeviceId(),
            app_version: APP_VERSION,
            request_id: 'REQ-' + Date.now(),
            session_token: sessionToken,
            signature: ''
        }
    };
    
    // Segel Koper Data dengan Signature
    const normalized = JSON.stringify(body);
    body.meta.signature = await generateSignature(normalized);

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(body)
        });
        return await response.json();
    } catch (e) {
        console.error("API Error:", e);
        return { ok: false, status: 'error', message: 'Koneksi ke satelit terputus.' };
    }
};

// 📤 UPLOAD LAPORAN
export const uploadData = async () => {
    const session = await getDataById('kader_session', 'active_user');
    if(!session || !session.token) return { status: false, count: 0 };
    
    const antrean = await getAllData('sync_queue');
    const dataUnsynced = antrean.filter(a => !a.is_synced);
    if(dataUnsynced.length === 0) return { status: true, count: 0 };
    
    const res = await apiFetch('SYNC_BATCH', dataUnsynced, session.token);
    if(res.ok || res.status === 'success') {
        for(let d of dataUnsynced) { 
            d.is_synced = true; 
            await putData('sync_queue', d); 
        }
        return { status: true, count: dataUnsynced.length };
    }
    return { status: false, count: 0 };
};

// 📥 DOWNLOAD SASARAN
export const downloadMasterData = async () => {
    const session = await getDataById('kader_session', 'active_user');
    if(!session || !session.token) return false;

    const res = await apiFetch('PULL_DATA_KADER', { kecamatan: session.kecamatan, id_tim: session.id_tim }, session.token);
    
    if (res.ok || res.status === 'success') {
        const d = res.data;
        if (d && d.length > 0) {
            for (let item of d) { await putData('sync_queue', item); }
        }
        return true;
    }
    return false;
};

window.jalankanSinkronisasi = async () => {
    try {
        const ul = await uploadData();
        if (!ul.status) { alert("❌ Gagal mengirim laporan. Pastikan internet Anda stabil."); return; }
        
        const dl = await downloadMasterData();
        if (ul.status && dl) { 
            let msg = ul.count > 0 ? `✅ Sinkronisasi Sempurna!\n${ul.count} Laporan berhasil dikirim.` : `✅ Sinkronisasi Berhasil!\nData Sasaran sudah diperbarui.`;
            alert(msg); location.reload(); 
        } else if (ul.status && !dl) {
            alert("⚠️ Laporan Anda BERHASIL terkirim, namun gagal menarik data terbaru."); location.reload();
        }
    } catch (e) { alert("❌ Terjadi gangguan sinyal."); }
};
