// Data Pertanyaan Khusus untuk Sasaran
const pertanyaanKhusus = {
    "CATIN": [
        { id_input: "lila", label: "Ukuran LiLA (cm)", type: "number", step: "0.1", required: true, options: null },
        { id_input: "tgl_menikah", label: "Rencana Tanggal Menikah", type: "date", step: null, required: false, options: null }
    ],
    "BUMIL": [
        { id_input: "gravida", label: "Gravida (Kehamilan Ke-Berapa)", type: "number", step: null, required: true, options: null },
        { id_input: "tensi", label: "Tensi Darah (Sistolik/Diastolik)", type: "text", step: null, required: true, options: null }
    ],
    "BUFAS": [
        { id_input: "metode_kb", label: "Metode KB Pasca Persalinan", type: "select", step: null, required: true, options: ["IUD", "Suntik", "Pil", "Implan", "Belum Pakai KB"] }
    ],
    "BADUTA": [
        { id_input: "berat_lahir", label: "Berat Badan Lahir (gram)", type: "number", step: null, required: true, options: null },
        { id_input: "panjang_lahir", label: "Panjang Badan Lahir (cm)", type: "number", step: "0.1", required: true, options: null }
    ]
};
