window.FormMapper = {
  getFormIdByJenis(jenis) {
    const map = {
      CATIN: 'FRM0002',
      BUMIL: 'FRM0003',
      BUFAS: 'FRM0004',
      BADUTA: 'FRM0005'
    };

    return map[String(jenis || '').toUpperCase()] || 'FRM0001';
  },

  getDefaultDynamicFields(jenis) {
    const key = String(jenis || '').toUpperCase();

    const defaults = {
      CATIN: [
        {
          question_code: 'tanggal_rencana_nikah',
          label: 'Tanggal Rencana Nikah',
          type: 'date',
          required: false
        },
        {
          question_code: 'status_pemeriksaan',
          label: 'Status Pemeriksaan',
          type: 'text',
          required: false
        },
        {
          question_code: 'catatan_khusus',
          label: 'Catatan Khusus',
          type: 'textarea',
          required: false
        }
      ],

      BUMIL: [
        {
          question_code: 'usia_kehamilan',
          label: 'Usia Kehamilan',
          type: 'number',
          required: false,
          placeholder: 'Contoh: 24'
        },
        {
          question_code: 'hpht',
          label: 'HPHT',
          type: 'date',
          required: false
        },
        {
          question_code: 'risiko_kehamilan',
          label: 'Risiko Kehamilan',
          type: 'text',
          required: false
        }
      ],

      BUFAS: [
        {
          question_code: 'tanggal_persalinan',
          label: 'Tanggal Persalinan',
          type: 'date',
          required: false
        },
        {
          question_code: 'kondisi_ibu',
          label: 'Kondisi Ibu',
          type: 'text',
          required: false
        },
        {
          question_code: 'kondisi_bayi',
          label: 'Kondisi Bayi',
          type: 'text',
          required: false
        }
      ],

      BADUTA: [
        {
          question_code: 'umur_anak_bulan',
          label: 'Umur Anak (bulan)',
          type: 'number',
          required: false
        },
        {
          question_code: 'status_asi',
          label: 'Status ASI',
          type: 'text',
          required: false
        },
        {
          question_code: 'status_imunisasi',
          label: 'Status Imunisasi',
          type: 'text',
          required: false
        }
      ]
    };

    return defaults[key] || [];
  },

  buildPayload(formData, mode = 'create', editItem = null) {
    const safeMode = String(mode || 'create').toLowerCase();
    const jenisSasaran = String(formData?.jenis_sasaran || editItem?.jenis_sasaran || '').toUpperCase();

    return {
      mode: safeMode,
      form_id: this.getFormIdByJenis(jenisSasaran),

      id_sasaran:
        formData?.id_sasaran ||
        editItem?.id_sasaran ||
        editItem?.id ||
        '',

      jenis_sasaran: jenisSasaran,
      nama_sasaran: formData?.nama_sasaran || editItem?.nama_sasaran || '',
      nik: formData?.nik || formData?.nik_sasaran || editItem?.nik || editItem?.nik_sasaran || '',
      nomor_kk: formData?.nomor_kk || editItem?.nomor_kk || '',
      jenis_kelamin: formData?.jenis_kelamin || editItem?.jenis_kelamin || '',
      tanggal_lahir: formData?.tanggal_lahir || editItem?.tanggal_lahir || '',

      id_tim: formData?.id_tim || editItem?.id_tim || '',
      nama_tim: formData?.nama_tim || editItem?.nama_tim || '',

      nama_kecamatan: formData?.nama_kecamatan || editItem?.nama_kecamatan || '',
      nama_desa: formData?.nama_desa || editItem?.nama_desa || '',
      nama_dusun: formData?.nama_dusun || editItem?.nama_dusun || '',
      alamat: formData?.alamat || editItem?.alamat || '',

      status_sasaran: formData?.status_sasaran || editItem?.status_sasaran || 'AKTIF',

      extra_fields: formData?.extra_fields || {},
      extra_fields_json: JSON.stringify(formData?.extra_fields || {})
    };
  }
};
