// FORMAT: "ID USER": { nik: "PASSWORD", nama: "NAMA", role: "KADER/ADMIN_KECAMATAN", kec: "KODE KEC", desa: "NAMA DESA", tim: "KODE TIM" }
const dataAkunKader = {
    // KADER AKTIF
    "812001-01001": { nik: "5108010101010001", nama: "Ni Wayan Sari", role: "KADER", kec: "GRK", desa: "Celukan Bawang", tim: "01" },
    "812001-01002": { nik: "5108010101010002", nama: "Kadek Ayu Lestari", role: "KADER", kec: "GRK", desa: "Celukan Bawang", tim: "01" },
    "812001-01003": { nik: "5108010101010003", nama: "Komang Budiarti", role: "KADER", kec: "GRK", desa: "Celukan Bawang", tim: "01" },
    "812001-02004": { nik: "5108010101010004", nama: "Ketut Suwarningsih", role: "KADER", kec: "GRK", desa: "Celukan Bawang", tim: "02" },
    "812002-01005": { nik: "5108020101010005", nama: "Putu Indah Maharani", role: "KADER", kec: "GRK", desa: "TingkatBatu", tim: "01" },

    // USER RIIL / KOMPATIBILITAS (fallback lokal saat backend belum match username)
    "TPK0001": { nik: "GEROKGAK", nama: "Kader TPK0001", role: "KADER", kec: "GRK", desa: "Celukan Bawang", tim: "01" },
    "ADMKEC01": { nik: "1234", nama: "Admin Kecamatan ADMKEC01", role: "ADMIN_KECAMATAN", kec: "GRK", desa: "", tim: "ADM-GRK" },

    // AKUN RIIL SEMENTARA (fallback lokal saat backend 401/unauthorized)
    "TPK0020": { nik: "GEROKGAK", nama: "Kader TPK0020", role: "KADER", kec: "GRK", desa: "Celukan Bawang", tim: "01" },
    "ADMKEC02": { nik: "SERIRIT", nama: "Admin Kecamatan ADMKEC02", role: "ADMIN_KECAMATAN", kec: "SRT", desa: "", tim: "ADM-SRT" }
};
