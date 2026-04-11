var SasaranService = {
  /**
   * Ambil daftar sasaran berdasarkan tim user login atau payload id_tim
   */
  getSasaranByTim_(payload, auth, meta) {
    try {
      var bookKey = this.resolveBookKey_(payload, auth);
      var idTim = this.resolveIdTim_(payload, auth);

      if (!idTim) {
        return ResponseHelper.validationError_(
          'id_tim tidak ditemukan',
          [{ field: 'id_tim', message: 'ID tim wajib tersedia' }],
          { request_id: meta && meta.request_id ? meta.request_id : '' }
        );
      }

      var rows = SheetRepo.getAllObjects(bookKey, APP_CONFIG.SHEETS.SASARAN, false);

      var result = rows.filter(function(r) {
        return String(r.id_tim || '').trim() === String(idTim).trim();
      });

      if (payload && payload.status_sasaran) {
        var status = String(payload.status_sasaran).trim().toUpperCase();
        result = result.filter(function(r) {
          return String(r.status_sasaran || '').trim().toUpperCase() === status;
        });
      }

      if (payload && payload.jenis_sasaran) {
        var jenis = String(payload.jenis_sasaran).trim().toUpperCase();
        result = result.filter(function(r) {
          return String(r.jenis_sasaran || '').trim().toUpperCase() === jenis;
        });
      }

      result.sort(function(a, b) {
        var aa = new Date(a.updated_at || a.tanggal_register || 0).getTime();
        var bb = new Date(b.updated_at || b.tanggal_register || 0).getTime();
        return bb - aa;
      });

      AuditLogService.writeLog_({
        id_user: auth && auth.id_user ? auth.id_user : '',
        role: auth && auth.role_akses ? auth.role_akses : '',
        action: 'getSasaranByTim',
        status: 'SUCCESS',
        device_id: meta && meta.device_id ? meta.device_id : '',
        request_id: meta && meta.request_id ? meta.request_id : '',
        note: 'Jumlah sasaran: ' + result.length
      });

      return ResponseHelper.success_(
        {
          book_key: bookKey,
          id_tim: idTim,
          total: result.length,
          items: result
        },
        'Daftar sasaran berhasil diambil',
        { request_id: meta && meta.request_id ? meta.request_id : '' }
      );
    } catch (e) {
      AuditLogService.writeLog_({
        id_user: auth && auth.id_user ? auth.id_user : '',
        role: auth && auth.role_akses ? auth.role_akses : '',
        action: 'getSasaranByTim',
        status: 'ERROR',
        device_id: meta && meta.device_id ? meta.device_id : '',
        request_id: meta && meta.request_id ? meta.request_id : '',
        note: String(e)
      });

      return ResponseHelper.serverError_(
        'Gagal mengambil daftar sasaran',
        { request_id: meta && meta.request_id ? meta.request_id : '' },
        { error: String(e) }
      );
    }
  },

  /**
   * Cari sasaran sederhana
   */
  searchSasaran_(payload, auth, meta) {
    try {
      var bookKey = this.resolveBookKey_(payload, auth);
      var keyword = String(payload && payload.keyword ? payload.keyword : '').trim().toLowerCase();

      if (!keyword) {
        return ResponseHelper.validationError_(
          'Keyword pencarian wajib diisi',
          [{ field: 'keyword', message: 'Keyword wajib diisi' }],
          { request_id: meta && meta.request_id ? meta.request_id : '' }
        );
      }

      var rows = SheetRepo.getAllObjects(bookKey, APP_CONFIG.SHEETS.SASARAN, false);
      var filtered = rows.filter(function(r) {
        return [
          r.id_sasaran,
          r.nama_sasaran,
          r.nik_sasaran,
          r.nomor_kk,
          r.jenis_sasaran
        ].some(function(v) {
          return String(v || '').toLowerCase().indexOf(keyword) !== -1;
        });
      });

      return ResponseHelper.success_(
        {
          total: filtered.length,
          items: filtered
        },
        'Hasil pencarian sasaran',
        { request_id: meta && meta.request_id ? meta.request_id : '' }
      );
    } catch (e) {
      return ResponseHelper.serverError_(
        'Gagal mencari sasaran',
        { request_id: meta && meta.request_id ? meta.request_id : '' },
        { error: String(e) }
      );
    }
  },

  /**
   * Detail sasaran by id
   */
  getSasaranDetail_(payload, auth, meta) {
    try {
      var bookKey = this.resolveBookKey_(payload, auth);
      var idSasaran = String(payload && payload.id_sasaran ? payload.id_sasaran : '').trim();

      if (!idSasaran) {
        return ResponseHelper.validationError_(
          'id_sasaran wajib diisi',
          [{ field: 'id_sasaran', message: 'ID sasaran wajib diisi' }],
          { request_id: meta && meta.request_id ? meta.request_id : '' }
        );
      }

      var row = SheetRepo.findOneByField(
        bookKey,
        APP_CONFIG.SHEETS.SASARAN,
        'id_sasaran',
        idSasaran,
        false
      );

      if (!row) {
        return ResponseHelper.notFound_(
          'Sasaran tidak ditemukan',
          { request_id: meta && meta.request_id ? meta.request_id : '' }
        );
      }

      return ResponseHelper.success_(
        row,
        'Detail sasaran berhasil diambil',
        { request_id: meta && meta.request_id ? meta.request_id : '' }
      );
    } catch (e) {
      return ResponseHelper.serverError_(
        'Gagal mengambil detail sasaran',
        { request_id: meta && meta.request_id ? meta.request_id : '' },
        { error: String(e) }
      );
    }
  },

  /**
   * Update sasaran
   * Versi awal: kader boleh update field terbatas
   */
  updateSasaran_(payload, auth, meta) {
    try {
      var bookKey = this.resolveBookKey_(payload, auth);
      var idSasaran = String(payload && payload.id_sasaran ? payload.id_sasaran : '').trim();

      if (!idSasaran) {
        return ResponseHelper.validationError_(
          'id_sasaran wajib diisi',
          [{ field: 'id_sasaran', message: 'ID sasaran wajib diisi' }],
          { request_id: meta && meta.request_id ? meta.request_id : '' }
        );
      }

      var existing = SheetRepo.findOneByField(
        bookKey,
        APP_CONFIG.SHEETS.SASARAN,
        'id_sasaran',
        idSasaran,
        false
      );

      if (!existing) {
        return ResponseHelper.notFound_(
          'Sasaran tidak ditemukan',
          { request_id: meta && meta.request_id ? meta.request_id : '' }
        );
      }

      var authIdUser = auth && auth.id_user ? String(auth.id_user).trim() : '';
      var authRole = auth && auth.role_akses ? String(auth.role_akses).trim().toUpperCase() : '';

      // KADER hanya boleh edit sasaran miliknya sendiri
      if (authRole === 'KADER') {
        var registeredBy = String(existing.registered_by || '').trim();
        if (registeredBy && authIdUser && registeredBy !== authIdUser) {
          return ResponseHelper.forbidden_(
            'Anda tidak berhak mengedit sasaran milik user lain',
            { request_id: meta && meta.request_id ? meta.request_id : '' }
          );
        }
      }

      var allowedFields = [
        'nama_sasaran',
        'nik_sasaran',
        'nomor_kk',
        'tanggal_lahir',
        'jenis_kelamin',
        'alamat',
        'status_sasaran',
        'data_laporan',
        'lokasi_gps'
      ];

      var updates = {};

      allowedFields.forEach(function(field) {
        if (payload && Object.prototype.hasOwnProperty.call(payload, field)) {
          updates[field] = payload[field];
        }
      });

      updates.updated_at = new Date();
      updates.updated_by = payload && payload.updated_by ? payload.updated_by : authIdUser;

      var updated = SheetRepo.updateRowByField(
        bookKey,
        APP_CONFIG.SHEETS.SASARAN,
        'id_sasaran',
        idSasaran,
        updates
      );

      if (!updated) {
        return ResponseHelper.error_(
          'Gagal memperbarui data sasaran',
          400,
          { request_id: meta && meta.request_id ? meta.request_id : '' }
        );
      }

      // Tulis riwayat status bila status berubah
      if (
        Object.prototype.hasOwnProperty.call(updates, 'status_sasaran') &&
        String(existing.status_sasaran || '').trim() !== String(updates.status_sasaran || '').trim()
      ) {
        var historyRow = {
          id_riwayat: 'RST-' + new Date().getTime(),
          id_sasaran: idSasaran,
          status_lama: existing.status_sasaran || '',
          status_baru: updates.status_sasaran || '',
          changed_at: new Date(),
          changed_by: updates.updated_by || authIdUser,
          catatan: payload && payload.catatan ? payload.catatan : 'Update status dari API'
        };

        try {
          SheetRepo.appendObject(bookKey, APP_CONFIG.SHEETS.SASARAN_STATUS_HISTORY, historyRow);
        } catch (historyErr) {
          // jangan gagalkan update utama hanya karena log riwayat gagal
        }
      }

      AuditLogService.writeLog_({
        id_user: authIdUser,
        role: authRole,
        action: 'updateSasaran',
        status: 'SUCCESS',
        device_id: meta && meta.device_id ? meta.device_id : '',
        request_id: meta && meta.request_id ? meta.request_id : '',
        note: 'Update sasaran berhasil: ' + idSasaran
      });

      return ResponseHelper.success_(
        {
          updated: true,
          id_sasaran: idSasaran,
          changed_fields: Object.keys(updates)
        },
        'Sasaran berhasil diupdate',
        { request_id: meta && meta.request_id ? meta.request_id : '' }
      );
    } catch (e) {
      AuditLogService.writeLog_({
        id_user: auth && auth.id_user ? auth.id_user : '',
        role: auth && auth.role_akses ? auth.role_akses : '',
        action: 'updateSasaran',
        status: 'ERROR',
        device_id: meta && meta.device_id ? meta.device_id : '',
        request_id: meta && meta.request_id ? meta.request_id : '',
        note: String(e)
      });

      return ResponseHelper.serverError_(
        'Gagal update sasaran',
        { request_id: meta && meta.request_id ? meta.request_id : '' },
        { error: String(e) }
      );
    }
  },

  /**
   * Registrasi sasaran baru
   * Backend mengambil identitas user/tim dari auth, bukan percaya payload client.
   */
  registerSasaran_(payload, auth, meta) {
    try {
      payload = this.getEffectivePayload_(payload);
      meta = meta || {};
      auth = auth || {};

      var effectivePayload = payload;
      var bookKey = this.resolveBookKey_(payload, auth);
      var idTim = this.resolveRegisterIdTim_(payload, auth);
      var idUser = String(auth.id_user || '').trim();
      var role = String(auth.role_akses || auth.role || '').trim().toUpperCase();
      var requestId = meta && meta.request_id ? meta.request_id : '';
      var clientSubmitId = String(this.getPayloadValue_(payload, 'client_submit_id') || '').trim();
      var syncSource = String(this.getPayloadValue_(payload, 'sync_source') || 'ONLINE').trim().toUpperCase();

      if (!idUser) {
        return ResponseHelper.unauthorized_(
          'Session login tidak valid',
          { request_id: requestId }
        );
      }

      if (!idTim) {
        return ResponseHelper.validationError_(
          'id_tim tidak ditemukan',
          [{ field: 'id_tim', message: 'ID tim wajib tersedia dari session login' }],
          { request_id: requestId }
        );
      }

      if (!clientSubmitId) {
        clientSubmitId = 'REG-' + new Date().getTime();
      }

      var normalized = this.normalizeRegisterPayload_(payload, auth);
      var validation = this.validateRegisterPayload_(normalized);
      if (!validation.ok) {
        AuditLogService.writeLog_({
          id_user: idUser,
          role: role,
          action: 'registerSasaran',
          status: 'VALIDATION_ERROR',
          device_id: meta && meta.device_id ? meta.device_id : '',
          request_id: requestId,
          note: validation.errors.map(function (x) { return x.message; }).join(' | ')
        });

        return ResponseHelper.validationError_(
          'Validasi registrasi sasaran gagal',
          validation.errors,
          { request_id: requestId }
        );
      }

      var rows = SheetRepo.getAllObjects(bookKey, APP_CONFIG.SHEETS.SASARAN, false) || [];

      var existingByClientSubmit = rows.find(function (r) {
        return String(r.client_submit_id || '').trim() === clientSubmitId;
      });
      if (existingByClientSubmit) {
        return ResponseHelper.success_(
          {
            id_sasaran: existingByClientSubmit.id_sasaran || '',
            idempotent: true,
            total: 1
          },
          'Permintaan registrasi ini sudah pernah diproses',
          { request_id: requestId }
        );
      }

      var duplicate = this.detectDuplicateSasaran_(rows, normalized);
      if (duplicate.blocked) {
        AuditLogService.writeLog_({
          id_user: idUser,
          role: role,
          action: 'registerSasaran',
          status: 'DUPLICATE_BLOCKED',
          device_id: meta && meta.device_id ? meta.device_id : '',
          request_id: requestId,
          note: duplicate.duplicate_note || 'Duplikasi terdeteksi'
        });

        return ResponseHelper.validationError_(
          'Data sasaran terindikasi duplikat',
          [{ field: duplicate.field || 'nik_sasaran', message: duplicate.duplicate_note || 'Data duplikat terdeteksi' }],
          { request_id: requestId }
        );
      }

      var record = this.buildRegisterSasaranRecord_(effectivePayload, normalized, auth, meta, {
        book_key: bookKey,
        id_tim: idTim,
        client_submit_id: clientSubmitId,
        sync_source: syncSource,
        duplicate: duplicate
      });

      SheetRepo.appendObject(bookKey, APP_CONFIG.SHEETS.SASARAN, record);

      AuditLogService.writeLog_({
        id_user: idUser,
        role: role,
        action: 'registerSasaran',
        status: 'SUCCESS',
        device_id: meta && meta.device_id ? meta.device_id : '',
        request_id: requestId,
        note: 'Registrasi sasaran berhasil: ' + record.id_sasaran
      });

      return ResponseHelper.success_(
        {
          id_sasaran: record.id_sasaran,
          status_sasaran: record.status_sasaran,
          id_tim: record.id_tim,
          sync_source: record.sync_source,
          duplicate_level: record.duplicate_level,
          duplicate_note: record.duplicate_note,
          is_duplicate_flag: record.is_duplicate_flag
        },
        'Registrasi sasaran berhasil',
        { request_id: requestId }
      );
    } catch (e) {
      AuditLogService.writeLog_({
        id_user: auth && auth.id_user ? auth.id_user : '',
        role: auth && auth.role_akses ? auth.role_akses : '',
        action: 'registerSasaran',
        status: 'ERROR',
        device_id: meta && meta.device_id ? meta.device_id : '',
        request_id: meta && meta.request_id ? meta.request_id : '',
        note: String(e)
      });

      return ResponseHelper.serverError_(
        'Gagal registrasi sasaran',
        { request_id: meta && meta.request_id ? meta.request_id : '' },
        { error: String(e) }
      );
    }
  },

  resolveRegisterIdTim_(payload, auth) {
    var role = String(auth && (auth.role_akses || auth.role) ? (auth.role_akses || auth.role) : '').trim().toUpperCase();
    var payloadIdTim = String(this.getPayloadValue_(payload, 'id_tim') || '').trim();

    if (role === 'KADER') {
      var authIdTim = this.resolveIdTim_(null, auth);
      if (authIdTim) return authIdTim;

      // Fallback kompatibilitas sementara:
      // jika middleware belum mengirim id_tim ke auth context,
      // gunakan id_tim dari payload agar alur registrasi tetap berjalan.
      // Setelah auth context stabil, fallback ini sebaiknya dihapus.
      if (payloadIdTim) return payloadIdTim;

      return '';
    }

    return this.resolveIdTim_(payload, auth);
  },

  normalizeRegisterPayload_(payload, auth) {
    payload = this.getEffectivePayload_(payload);
    auth = auth || {};

    var lokasiGps = payload.lokasi_gps || null;
    if (lokasiGps && typeof lokasiGps !== 'object') {
      lokasiGps = null;
    }

    return {
      jenis_sasaran: String(payload.jenis_sasaran || '').trim().toUpperCase(),
      nama_sasaran: this.normalizeText_(payload.nama_sasaran),
      nama_kepala_keluarga: this.normalizeText_(payload.nama_kepala_keluarga),
      nama_ibu_kandung: this.normalizeText_(payload.nama_ibu_kandung),
      nik_sasaran: this.digitsOnly_(payload.nik_sasaran || payload.nik).slice(0, 16),
      nomor_kk: this.digitsOnly_(payload.nomor_kk).slice(0, 16),
      jenis_kelamin: String(payload.jenis_kelamin || '').trim().toUpperCase(),
      tanggal_lahir: String(payload.tanggal_lahir || '').trim(),
      alamat: this.normalizeText_(payload.alamat),
      nama_kecamatan: this.normalizeText_(payload.nama_kecamatan || auth.nama_kecamatan || auth.kecamatan),
      nama_desa: this.normalizeText_(payload.nama_desa || auth.desa_kelurahan || auth.nama_desa),
      nama_dusun: this.normalizeText_(payload.nama_dusun || auth.dusun_rw || auth.nama_dusun),
      lokasi_gps: lokasiGps,
      extra_payload: payload.data_laporan && typeof payload.data_laporan === 'object' ? payload.data_laporan : {},
      dynamic_fields: payload.dynamic_fields && typeof payload.dynamic_fields === 'object' ? payload.dynamic_fields : {}
    };
  },

  validateRegisterPayload_(data) {
    var errors = [];
    var age = this.calculateAge_(data.tanggal_lahir);

    function add(field, message) {
      errors.push({ field: field, message: message });
    }

    if (!data.jenis_sasaran) {
      add('jenis_sasaran', 'Jenis sasaran wajib dipilih');
    } else if (['CATIN', 'BUMIL', 'BUFAS', 'BADUTA'].indexOf(data.jenis_sasaran) === -1) {
      add('jenis_sasaran', 'Jenis sasaran tidak valid');
    }

    if (!data.nama_sasaran) {
      add('nama_sasaran', 'Nama sasaran wajib diisi');
    } else if (data.nama_sasaran.length < 3) {
      add('nama_sasaran', 'Nama sasaran terlalu pendek');
    }

    if (!data.nama_kepala_keluarga) {
      add('nama_kepala_keluarga', 'Nama kepala keluarga wajib diisi');
    }

    if (!data.nik_sasaran) {
      add('nik_sasaran', 'NIK wajib diisi');
    } else if (data.nik_sasaran.length !== 16) {
      add('nik_sasaran', 'NIK harus 16 digit');
    }

    if (!data.nomor_kk) {
      add('nomor_kk', 'Nomor KK wajib diisi');
    } else if (data.nomor_kk.length !== 16) {
      add('nomor_kk', 'Nomor KK harus 16 digit');
    }

    if (data.jenis_kelamin && ['L', 'P'].indexOf(data.jenis_kelamin) === -1) {
      add('jenis_kelamin', 'Jenis kelamin tidak valid');
    }

    if (data.tanggal_lahir) {
      if (!age.valid) {
        add('tanggal_lahir', 'Tanggal lahir tidak valid atau melebihi hari ini');
      }
    }

    if (!data.nama_desa) {
      add('nama_desa', 'Desa/Kelurahan wajib dipilih');
    }

    if (!data.nama_dusun) {
      add('nama_dusun', 'Dusun/RW wajib dipilih');
    }

    if (data.jenis_sasaran === 'BADUTA') {
      if (!data.nama_ibu_kandung) {
        add('nama_ibu_kandung', 'Nama ibu kandung wajib diisi untuk BADUTA');
      }
      if (!data.tanggal_lahir || !age.valid) {
        add('tanggal_lahir', 'Tanggal lahir BADUTA wajib diisi');
      } else if (age.total_bulan > 24) {
        add('tanggal_lahir', 'BADUTA harus berusia 0 sampai 24 bulan');
      }
    }

    if (data.jenis_sasaran === 'BUMIL') {
      if (data.jenis_kelamin && data.jenis_kelamin !== 'P') {
        add('jenis_kelamin', 'BUMIL wajib berjenis kelamin perempuan');
      }
      if (age.valid && (age.umur_tahun < 10 || age.umur_tahun > 55)) {
        add('tanggal_lahir', 'Usia BUMIL harus masuk akal dan tidak lebih dari 55 tahun');
      }
    }

    if (data.jenis_sasaran === 'BUFAS') {
      if (data.jenis_kelamin && data.jenis_kelamin !== 'P') {
        add('jenis_kelamin', 'BUFAS wajib berjenis kelamin perempuan');
      }
      if (age.valid && (age.umur_tahun < 10 || age.umur_tahun > 55)) {
        add('tanggal_lahir', 'Usia BUFAS harus masuk akal dan tidak lebih dari 55 tahun');
      }
    }

    if (data.jenis_sasaran === 'CATIN' && age.valid && age.total_bulan < 120) {
      add('tanggal_lahir', 'Usia CATIN terlalu rendah');
    }

    return {
      ok: errors.length === 0,
      errors: errors,
      age: age
    };
  },

  detectDuplicateSasaran_(rows, data) {
    rows = rows || [];
    var nik = String(data.nik_sasaran || '').trim();
    var kk = String(data.nomor_kk || '').trim();
    var nama = this.normalizeKey_(data.nama_sasaran);
    var tgl = String(data.tanggal_lahir || '').trim();
    var alamat = this.normalizeKey_(data.alamat);

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      var exNik = this.digitsOnly_(r.nik_sasaran || r.nik).slice(0, 16);
      var exKk = this.digitsOnly_(r.nomor_kk).slice(0, 16);
      var exNama = this.normalizeKey_(r.nama_sasaran);
      var exTgl = String(r.tanggal_lahir || '').trim();
      var exAlamat = this.normalizeKey_(r.alamat);

      if (nik && nik !== '9999999999999999' && exNik && exNik === nik) {
        return {
          blocked: true,
          field: 'nik_sasaran',
          is_duplicate_flag: true,
          duplicate_level: 'HIGH',
          duplicate_note: 'NIK sudah terdaftar pada sasaran lain.'
        };
      }

      if (kk && exKk === kk && nama && exNama === nama && tgl && exTgl === tgl) {
        return {
          blocked: true,
          field: 'nomor_kk',
          is_duplicate_flag: true,
          duplicate_level: 'HIGH',
          duplicate_note: 'Nomor KK, nama sasaran, dan tanggal lahir sudah terdaftar.'
        };
      }

      if (nama && exNama === nama && tgl && exTgl === tgl && alamat && exAlamat === alamat) {
        return {
          blocked: false,
          field: 'nama_sasaran',
          is_duplicate_flag: true,
          duplicate_level: 'MEDIUM',
          duplicate_note: 'Nama, tanggal lahir, dan alamat sangat mirip dengan data yang sudah ada.'
        };
      }
    }

    return {
      blocked: false,
      is_duplicate_flag: false,
      duplicate_level: '',
      duplicate_note: ''
    };
  },

  buildRegisterSasaranRecord_(payload, data, auth, meta, ctx) {
    payload = this.getEffectivePayload_(payload);
    auth = auth || {};
    meta = meta || {};
    ctx = ctx || {};

    var now = new Date();
    var validation = this.validateRegisterPayload_(data);
    var idSasaran = this.generateSasaranId_(ctx.book_key);
    var idUser = String(auth.id_user || '').trim();
    var statusSasaran = 'AKTIF';
    var extraData = {
      nama_kepala_keluarga: data.nama_kepala_keluarga,
      nama_ibu_kandung: data.nama_ibu_kandung,
      nama_kecamatan: data.nama_kecamatan,
      nama_desa: data.nama_desa,
      nama_dusun: data.nama_dusun,
      dynamic_fields: data.dynamic_fields || {},
      extra_payload: data.extra_payload || {}
    };

    return {
      id_sasaran: idSasaran,
      nama_sasaran: data.nama_sasaran,
      nik_sasaran: data.nik_sasaran,
      nomor_kk: data.nomor_kk,
      jenis_sasaran: data.jenis_sasaran,
      tanggal_lahir: data.tanggal_lahir,
      jenis_kelamin: data.jenis_kelamin,
      id_tim: ctx.id_tim || '',
      nama_tim: auth.nama_tim || auth.nomor_tim || auth.id_tim || '',
      id_wilayah: auth.id_wilayah || auth.id_wilayah_tugas || payload.id_wilayah || '',
      alamat: data.alamat,
      status_sasaran: statusSasaran,
      tanggal_register: now,
      registered_by: idUser,
      updated_at: now,
      updated_by: idUser,
      unique_key: Utilities.getUuid(),
      nama_normalized: this.normalizeKey_(data.nama_sasaran),
      alamat_normalized: this.normalizeKey_(data.alamat),
      is_duplicate_flag: ctx.duplicate && ctx.duplicate.is_duplicate_flag ? 'TRUE' : 'FALSE',
      duplicate_level: ctx.duplicate && ctx.duplicate.duplicate_level ? ctx.duplicate.duplicate_level : '',
      duplicate_note: ctx.duplicate && ctx.duplicate.duplicate_note ? ctx.duplicate.duplicate_note : '',
      data_laporan: JSON.stringify(extraData),
      lokasi_gps: data.lokasi_gps ? JSON.stringify(data.lokasi_gps) : '',
      client_submit_id: ctx.client_submit_id || '',
      sync_source: ctx.sync_source || 'ONLINE',
      umur_tahun_saat_register: validation.age && validation.age.umur_tahun != null ? validation.age.umur_tahun : '',
      umur_bulan_saat_register: validation.age && validation.age.total_bulan != null ? validation.age.total_bulan : ''
    };
  },

  generateSasaranId_(bookKey) {
    var prefix = String(bookKey || 'TPK').trim().toUpperCase() || 'TPK';
    return 'SAS-' + prefix + '-' + new Date().getTime();
  },

  normalizeText_(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  },

  normalizeKey_(value) {
    return this.normalizeText_(value).toLowerCase();
  },

  digitsOnly_(value) {
    return String(value == null ? '' : value).replace(/\D+/g, '');
  },

  parseDate_(value) {
    var s = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var p = s.split('-');
    var y = Number(p[0]);
    var m = Number(p[1]);
    var d = Number(p[2]);
    var dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
      return null;
    }
    dt.setHours(0, 0, 0, 0);
    return dt;
  },

  calculateAge_(tanggalLahir) {
    var dob = this.parseDate_(tanggalLahir);
    if (!dob) {
      return { valid: false, umur_tahun: null, umur_bulan: null, total_bulan: null };
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dob.getTime() > today.getTime()) {
      return { valid: false, umur_tahun: null, umur_bulan: null, total_bulan: null };
    }

    var years = today.getFullYear() - dob.getFullYear();
    var months = today.getMonth() - dob.getMonth();
    var days = today.getDate() - dob.getDate();

    if (days < 0) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return {
      valid: true,
      umur_tahun: years,
      umur_bulan: months,
      total_bulan: (years * 12) + months
    };
  },


  getEffectivePayload_(payload) {
    var current = payload || {};
    var depth = 0;

    while (current && current.data && typeof current.data === 'object' && !Array.isArray(current.data) && depth < 3) {
      var child = current.data;
      current = Object.assign({}, child, current);
      delete current.data;
      depth += 1;
    }

    return current || {};
  },

  getPayloadValue_(payload, key) {
    var current = payload || {};
    var depth = 0;

    while (current && typeof current === 'object' && depth < 4) {
      if (Object.prototype.hasOwnProperty.call(current, key) && current[key] !== '' && current[key] != null) {
        return current[key];
      }
      current = current.data && typeof current.data === 'object' ? current.data : null;
      depth += 1;
    }

    return '';
  },

  resolveBookKey_(payload, auth) {
    var payloadBookKey = this.getPayloadValue_(payload, 'book_key');
    if (payloadBookKey) {
      return String(payloadBookKey).trim().toUpperCase();
    }

    if (auth && auth.kode_kecamatan) {
      return String(auth.kode_kecamatan).trim().toUpperCase();
    }

    if (auth && auth.book_key) {
      return String(auth.book_key).trim().toUpperCase();
    }

    if (auth && auth.session && auth.session.kode_kecamatan) {
      return String(auth.session.kode_kecamatan).trim().toUpperCase();
    }

    if (auth && auth.session && auth.session.book_key) {
      return String(auth.session.book_key).trim().toUpperCase();
    }

    if (auth && auth.profile && auth.profile.kode_kecamatan) {
      return String(auth.profile.kode_kecamatan).trim().toUpperCase();
    }

    if (auth && auth.profile && auth.profile.book_key) {
      return String(auth.profile.book_key).trim().toUpperCase();
    }

    if (auth && auth.user && auth.user.kode_kecamatan) {
      return String(auth.user.kode_kecamatan).trim().toUpperCase();
    }

    if (auth && auth.user && auth.user.book_key) {
      return String(auth.user.book_key).trim().toUpperCase();
    }

    if (auth && auth.data && auth.data.book_key) {
      return String(auth.data.book_key).trim().toUpperCase();
    }

    return 'TJK';
  },

  resolveIdTim_(payload, auth) {
    var payloadIdTim = this.getPayloadValue_(payload, 'id_tim');
    if (payloadIdTim) return String(payloadIdTim).trim();
    if (auth && auth.id_tim) return String(auth.id_tim).trim();
    if (auth && auth.session && auth.session.id_tim) return String(auth.session.id_tim).trim();
    if (auth && auth.profile && auth.profile.id_tim) return String(auth.profile.id_tim).trim();
    if (auth && auth.user && auth.user.id_tim) return String(auth.user.id_tim).trim();
    if (auth && auth.data && auth.data.id_tim) return String(auth.data.id_tim).trim();
    return '';
  }
};
