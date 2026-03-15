const pertanyaanKhusus = {
    "CATIN": [
        { id_input: "lila", label: "Ukuran LiLA (cm)", type: "number", step: "0.1", required: true, options: null },
        { id_input: "tgl_menikah", label: "Tanggal Rencana Menikah", type: "date", step: null, required: true, options: null }
    ],
    "BUMIL": [
        { id_input: "gravida", label: "Gravida (Kehamilan Ke-Berapa)", type: "number", step: null, required: true, options: null },
        { id_input: "tensi", label: "Tensi Darah (Sistolik/Diastolik)", type: "text", step: null, required: true, options: null }
    ],
    "BUFAS": [
        { id_input: "tgl_persalinan", label: "Tanggal Persalinan", type: "date", step: null, required: true, options: null },
        { id_input: "metode_kb", label: "Metode KB Pasca Persalinan", type: "select", step: null, required: true, options: ["IUD", "Suntik", "Pil", "Implan", "Belum Pakai KB"] }
    ],
    "BADUTA": [
        { id_input: "tgl_lahir", label: "Tanggal Lahir Anak", type: "date", step: null, required: true, options: null },
        { id_input: "berat_lahir", label: "Berat Badan Lahir (gram)", type: "number", step: null, required: true, options: null },
        { id_input: "panjang_lahir", label: "Panjang Badan Lahir (cm)", type: "number", step: "0.1", required: true, options: null }
    ]
};
