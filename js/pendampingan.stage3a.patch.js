
(function (window, document) {
  'use strict';

  var DRAFT_KEY = 'tpk_pendampingan_draft';

  function byId(id) { return document.getElementById(id); }
  function s(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function upper(v) { return s(v).toUpperCase(); }
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getSelected() {
    if (window.AppState && typeof window.AppState.getSelectedSasaran === 'function') {
      var x = window.AppState.getSelectedSasaran() || {};
      if (x && Object.keys(x).length) return x;
    }
    if (window.Storage && typeof window.Storage.get === 'function' && window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS) {
      var key = window.APP_CONFIG.STORAGE_KEYS.SELECTED_SASARAN || 'tpk_selected_sasaran';
      var y = window.Storage.get(key, {}) || {};
      if (y && Object.keys(y).length) return y;
    }
    try { return JSON.parse(localStorage.getItem('tpk_selected_sasaran') || '{}'); } catch (_) { return {}; }
  }

  function getAgeMonthsFromSelected() {
    var selected = getSelected();
    var raw = s(selected.tanggal_lahir);
    if (!raw) return null;
    var dt = new Date(raw);
    if (isNaN(dt.getTime())) return null;
    var now = new Date();
    var months = (now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth());
    if (now.getDate() < dt.getDate()) months -= 1;
    return months < 0 ? 0 : months;
  }

  function getPendampinganDraft() {
    try {
      var raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      return raw && raw.data ? raw.data : null;
    } catch (_) {
      return null;
    }
  }

  function yesNoOptions() {
    return ['Ya', 'Tidak'];
  }

  function jknTypeOptions() {
    return ['BPJS PBI', 'BPJS Non-PBI', 'Swasta', 'Tidak tahu'];
  }

  function bansosStatusOptions() {
    return ['Ya, sudah mendapatkan bansos', 'Tidak'];
  }

  function bansosJenisOptions() {
    return ['PKH', 'BPNT/Sembako', 'BLT', 'Bantuan Lokal Desa', 'Lainnya'];
  }

  function mbgFreqOptions() {
    return ['1 hari', '2 hari', '3 hari', '4 hari', '5 hari', '6 hari', '7 hari'];
  }

  function kbJenisOptions() {
    return ['Pil', 'Suntik', 'Implan', 'IUD', 'Kondom', 'MOW/MOP', 'Lainnya'];
  }

  function sakitOptions() {
    return ['Tidak Ada', 'Hipertensi', 'Diabetes', 'Anemia', 'Lainnya'];
  }

  function imunisasiOptionsByAgeMonths(months) {
    if (months == null) {
      return ['HB0', 'BCG', 'Polio', 'DPT-HB-Hib', 'Campak-Rubella', 'Lainnya', 'Belum diketahui'];
    }
    if (months <= 1) return ['HB0', 'BCG', 'Polio 1'];
    if (months <= 3) return ['BCG', 'Polio 1', 'DPT-HB-Hib 1', 'Polio 2'];
    if (months <= 5) return ['DPT-HB-Hib 2', 'Polio 3', 'DPT-HB-Hib 3', 'Polio 4'];
    if (months <= 9) return ['IPV', 'Campak-Rubella'];
    if (months <= 18) return ['DPT-HB-Hib Lanjutan', 'Campak-Rubella Lanjutan'];
    return ['Campak-Rubella Lanjutan', 'Imunisasi tambahan sesuai usia', 'Belum diketahui'];
  }

  function field(id, label, type, required, opts) {
    opts = opts || {};
    return {
      id: id,
      label: label,
      type: type,
      required: !!required,
      options: opts.options || [],
      placeholder: opts.placeholder || '',
      help_text: opts.help_text || '',
      min: opts.min,
      max: opts.max,
      readonly: !!opts.readonly,
      section: opts.section || '',
      show_if: opts.show_if || null,
      calc: opts.calc || null
    };
  }

  function buildQuestionBank(jenis) {
    var j = upper(jenis);
    var common = [
      field('kepesertaan_jkn', 'Kepesertaan JKN', 'select', true, {
        options: yesNoOptions(),
        help_text: 'Status JKN sasaran.',
        section: 'Pendampingan Umum'
      }),
      field('jenis_jkn', 'Jenis JKN', 'select', false, {
        options: jknTypeOptions(),
        help_text: 'Diisi jika sasaran memiliki JKN.',
        section: 'Pendampingan Umum',
        show_if: { source: 'kepesertaan_jkn', equals: 'Ya' }
      }),
      field('memberikan_kie', 'Memberikan KIE/Penyuluhan', 'select', true, {
        options: yesNoOptions(),
        help_text: 'Penyuluhan pada kunjungan.',
        section: 'Pendampingan Umum'
      }),
      field('memfasilitasi_rujukan', 'Memfasilitasi Rujukan', 'select', true, {
        options: yesNoOptions(),
        help_text: 'Rujukan pada kunjungan.',
        section: 'Pendampingan Umum'
      }),
      field('pemberian_bansos', 'Pemberian Bansos', 'select', true, {
        options: bansosStatusOptions(),
        help_text: 'Bansos oleh TPK.',
        section: 'Pendampingan Umum'
      }),
      field('jenis_bansos', 'Jenis Bansos', 'select', false, {
        options: bansosJenisOptions(),
        help_text: 'Diisi jika bansos diberikan.',
        section: 'Pendampingan Umum',
        show_if: { source: 'pemberian_bansos', equals: 'Ya, sudah mendapatkan bansos' }
      }),
      field('catatan_pendampingan', 'Catatan Pendampingan', 'textarea', false, {
        placeholder: 'Catatan kunjungan',
        section: 'Pendampingan Umum'
      })
    ];

    if (j === 'BADUTA') {
      return [
        field('berat_badan', 'Berat Badan', 'number', true, {
          placeholder: 'Masukkan kg',
          help_text: 'Berat badan saat kunjungan.',
          min: 1, max: 30, section: 'Skrining BADUTA'
        }),
        field('panjang_tinggi_badan', 'Panjang/Tinggi Badan', 'number', true, {
          placeholder: 'Masukkan cm',
          help_text: 'Panjang/Tinggi badan saat kunjungan.',
          min: 30, max: 130, section: 'Skrining BADUTA'
        }),
        field('imunisasi_relevan', 'Imunisasi Relevan', 'select', false, {
          options: imunisasiOptionsByAgeMonths(getAgeMonthsFromSelected()),
          help_text: 'Tampilkan selektif sesuai umur/riwayat.',
          section: 'Skrining BADUTA'
        }),
        field('mbg_diterima', 'MBG Diterima', 'select', true, {
          options: yesNoOptions(),
          help_text: 'Status MBG sasaran.',
          section: 'MBG 3B'
        }),
        field('frekuensi_mbg', 'Frekuensi MBG', 'select', false, {
          options: mbgFreqOptions(),
          help_text: 'Diisi jika MBG diterima.',
          section: 'MBG 3B',
          show_if: { source: 'mbg_diterima', equals: 'Ya' }
        })
      ].concat(common);
    }

    if (j === 'BUMIL') {
      return [
        field('usia_hamil_minggu', 'Usia Kehamilan (Minggu)', 'number', true, {
          placeholder: 'Contoh: 24',
          min: 1, max: 45, section: 'Skrining BUMIL'
        }),
        field('periksa_tbjj', 'Melakukan Pengukuran TBJJ', 'select', true, {
          options: yesNoOptions(), section: 'Skrining BUMIL'
        }),
        field('hasil_tbjj', 'Hasil TBJJ (gram)', 'number', false, {
          placeholder: 'Contoh: 1200',
          min: 100, max: 6000,
          section: 'Skrining BUMIL',
          show_if: { source: 'periksa_tbjj', equals: 'Ya' }
        }),
        field('periksa_tfu', 'Melakukan Pengukuran TFU', 'select', true, {
          options: yesNoOptions(), section: 'Skrining BUMIL'
        }),
        field('hasil_tfu', 'Hasil TFU', 'number', false, {
          placeholder: 'Contoh: 28',
          min: 1, max: 60,
          section: 'Skrining BUMIL',
          show_if: { source: 'periksa_tfu', equals: 'Ya' }
        }),
        field('berat_badan', 'Berat Badan (Kg)', 'number', true, {
          placeholder: 'Masukkan kg', min: 25, max: 200, section: 'Skrining BUMIL'
        }),
        field('tinggi_badan', 'Tinggi Badan (Cm)', 'number', true, {
          placeholder: 'Masukkan cm', min: 100, max: 220, section: 'Skrining BUMIL'
        }),
        field('imt', 'IMT', 'number', false, {
          placeholder: 'Otomatis', readonly: true, section: 'Skrining BUMIL',
          calc: 'imt'
        }),
        field('periksa_hb', 'Melakukan Pemeriksaan HB', 'select', true, {
          options: yesNoOptions(), section: 'Skrining BUMIL'
        }),
        field('kadar_hb', 'Kadar HB', 'number', false, {
          placeholder: 'Contoh: 11.2', min: 1, max: 20,
          section: 'Skrining BUMIL',
          show_if: { source: 'periksa_hb', equals: 'Ya' }
        }),
        field('lila', 'LILA (Cm)', 'number', true, {
          placeholder: 'Contoh: 23.5', min: 1, max: 60, section: 'Skrining BUMIL'
        }),
        field('riwayat_penyakit', 'Riwayat Penyakit', 'select', false, {
          options: sakitOptions(), section: 'Skrining BUMIL'
        }),
        field('rokok_atau_asap', 'Merokok/Terpapar Asap Rokok', 'select', true, {
          options: yesNoOptions(), section: 'Skrining BUMIL'
        }),
        field('dapat_ttd', 'Sudah Mendapatkan TTD', 'select', true, {
          options: yesNoOptions(), section: 'Pendampingan Umum'
        }),
        field('minum_ttd', 'Sudah Meminum TTD', 'select', false, {
          options: yesNoOptions(), section: 'Pendampingan Umum',
          show_if: { source: 'dapat_ttd', equals: 'Ya' }
        }),
        field('mbg_diterima', 'MBG Diterima', 'select', true, {
          options: yesNoOptions(), section: 'MBG 3B'
        }),
        field('frekuensi_mbg', 'Frekuensi MBG', 'select', false, {
          options: mbgFreqOptions(), section: 'MBG 3B',
          show_if: { source: 'mbg_diterima', equals: 'Ya' }
        }),
        field('frekuensi_menu_basah', 'Frekuensi Menu Basah', 'select', false, {
          options: mbgFreqOptions(), section: 'MBG 3B',
          show_if: { source: 'mbg_diterima', equals: 'Ya' }
        }),
        field('pemberian_upf', 'Pemberian Makanan UPF', 'select', false, {
          options: ['Masih', 'Tidak'], section: 'MBG 3B',
          show_if: { source: 'mbg_diterima', equals: 'Ya' }
        }),
        field('distribusi_mbg_tpk', 'Frekuensi Distribusi MBG oleh TPK', 'select', false, {
          options: mbgFreqOptions(), section: 'MBG 3B',
          show_if: { source: 'mbg_diterima', equals: 'Ya' }
        })
      ].concat(common);
    }

    if (j === 'BUFAS') {
      return [
        field('kondisi_ibu', 'Kondisi Ibu', 'select', true, {
          options: ['Baik', 'Perlu Pemantauan', 'Perlu Rujukan'],
          section: 'Skrining BUFAS'
        }),
        field('asi_eksklusif', 'ASI Eksklusif', 'select', true, {
          options: yesNoOptions(), section: 'Skrining BUFAS'
        }),
        field('vitamin_a_nifas', 'Mendapat Vitamin A Nifas', 'select', true, {
          options: yesNoOptions(), section: 'Skrining BUFAS'
        }),
        field('kb_pasca_persalinan', 'KB Pasca Persalinan', 'select', true, {
          options: yesNoOptions(), section: 'Skrining BUFAS'
        }),
        field('jenis_kb', 'Jenis KB', 'select', false, {
          options: kbJenisOptions(), section: 'Skrining BUFAS',
          show_if: { source: 'kb_pasca_persalinan', equals: 'Ya' }
        }),
        field('mbg_diterima', 'MBG Diterima', 'select', true, {
          options: yesNoOptions(), section: 'MBG 3B'
        }),
        field('frekuensi_mbg', 'Frekuensi MBG', 'select', false, {
          options: mbgFreqOptions(), section: 'MBG 3B',
          show_if: { source: 'mbg_diterima', equals: 'Ya' }
        })
      ].concat(common);
    }

    return [
      field('pemeriksaan_kesehatan', 'Pemeriksaan Kesehatan', 'select', true, {
        options: yesNoOptions(), section: 'Pendampingan CATIN'
      }),
      field('edukasi_gizi', 'Edukasi Gizi', 'select', true, {
        options: yesNoOptions(), section: 'Pendampingan CATIN'
      }),
      field('konsumsi_ttd', 'Konsumsi TTD', 'select', false, {
        options: yesNoOptions(), section: 'Pendampingan CATIN'
      })
    ].concat(common);
  }

  function getVisibleFields(fields, answers) {
    return (fields || []).filter(function (f) {
      if (!f.show_if) return true;
      return s(answers[f.show_if.source]) === s(f.show_if.equals);
    });
  }

  function readCustomValue(field) {
    var el = byId('dyn-pen-' + field.id);
    if (!el) return '';
    if (field.type === 'checkbox') return !!el.checked;
    return s(el.value);
  }

  function setCustomValue(field, value) {
    var el = byId('dyn-pen-' + field.id);
    if (!el) return;
    if (field.type === 'checkbox') {
      el.checked = !!value;
      return;
    }
    el.value = value == null ? '' : String(value);
  }

  function getAnswers(fields) {
    var out = {};
    (fields || []).forEach(function (f) {
      if (f.type === 'section') return;
      out[f.id] = readCustomValue(f);
    });

    var bb = parseFloat(String(out.berat_badan || '').replace(',', '.'));
    var tb = parseFloat(String(out.tinggi_badan || out.panjang_tinggi_badan || '').replace(',', '.'));
    if (!isNaN(bb) && !isNaN(tb) && tb > 0 && byId('dyn-pen-imt')) {
      var imt = bb / Math.pow(tb / 100, 2);
      out.imt = imt.toFixed(2);
      byId('dyn-pen-imt').value = out.imt;
    }
    return out;
  }

  function renderField(field, value, visible) {
    var hiddenStyle = visible ? '' : ' style="display:none"';
    var help = field.help_text ? '<small class="muted-text">' + esc(field.help_text) + '</small>' : '';
    var requiredMark = field.required ? ' *' : '';
    var inputHtml = '';

    if (field.type === 'textarea') {
      inputHtml = '<textarea id="dyn-pen-' + esc(field.id) + '" data-qid="' + esc(field.id) + '"' +
        (field.placeholder ? ' placeholder="' + esc(field.placeholder) + '"' : '') +
        ' rows="3">' + esc(value || '') + '</textarea>';
    } else if (field.type === 'select') {
      inputHtml = '<select id="dyn-pen-' + esc(field.id) + '" data-qid="' + esc(field.id) + '">' +
        '<option value="">Pilih</option>' +
        (field.options || []).map(function (opt) {
          var ov = typeof opt === 'object' ? String(opt.value || opt.label || '') : String(opt);
          var ol = typeof opt === 'object' ? String(opt.label || opt.value || '') : String(opt);
          var sel = String(value || '') === ov ? ' selected' : '';
          return '<option value="' + esc(ov) + '"' + sel + '>' + esc(ol) + '</option>';
        }).join('') +
        '</select>';
    } else {
      var step = field.id === 'imt' || field.id === 'kadar_hb' || field.id === 'lila' ? ' step="0.01"' : '';
      var readonly = field.readonly ? ' readonly' : '';
      var min = field.min != null ? ' min="' + esc(field.min) + '"' : '';
      var max = field.max != null ? ' max="' + esc(field.max) + '"' : '';
      inputHtml = '<input id="dyn-pen-' + esc(field.id) + '" data-qid="' + esc(field.id) + '" type="number"' +
        (field.placeholder ? ' placeholder="' + esc(field.placeholder) + '"' : '') +
        step + readonly + min + max + ' value="' + esc(value || '') + '" />';
    }

    return '<div class="form-group" data-qwrap="' + esc(field.id) + '"' + hiddenStyle + '>' +
      '<label for="dyn-pen-' + esc(field.id) + '">' + esc(field.label) + requiredMark + '</label>' +
      inputHtml + help + '</div>';
  }

  function renderQuestionBank(jenis, values) {
    var fields = buildQuestionBank(jenis);
    var answers = values || {};
    var sections = [];
    fields.forEach(function (f) {
      var name = f.section || 'Lainnya';
      var found = sections.find(function (x) { return x.name === name; });
      if (!found) {
        found = { name: name, items: [] };
        sections.push(found);
      }
      found.items.push(f);
    });

    var html = sections.map(function (section) {
      var visibleFields = getVisibleFields(section.items, answers);
      var body = section.items.map(function (f) {
        return renderField(f, answers[f.id], visibleFields.indexOf(f) >= 0);
      }).join('');
      return '<div class="card" style="margin-top:12px;">' +
        '<div class="section-header"><h3>' + esc(section.name) + '</h3></div>' +
        '<div class="filters-grid">' + body + '</div>' +
      '</div>';
    }).join('');

    var container = byId('pendampingan-dynamic-fields');
    if (container) container.innerHTML = html;
    return fields;
  }

  function applyRules(fields) {
    var answers = getAnswers(fields);
    (fields || []).forEach(function (f) {
      var wrap = document.querySelector('[data-qwrap="' + CSS.escape(f.id) + '"]');
      if (!wrap) return;
      var visible = true;
      if (f.show_if) {
        visible = s(answers[f.show_if.source]) === s(f.show_if.equals);
      }
      wrap.style.display = visible ? '' : 'none';
      var el = byId('dyn-pen-' + f.id);
      if (el) {
        if (!visible) {
          if (el.tagName === 'SELECT') el.value = '';
          else if (el.type === 'checkbox') el.checked = false;
          else if (!f.readonly) el.value = '';
        }
      }
    });

    if (byId('dyn-pen-imt')) {
      var bb = parseFloat(String(answers.berat_badan || '').replace(',', '.'));
      var tb = parseFloat(String(answers.tinggi_badan || '').replace(',', '.'));
      if (!isNaN(bb) && !isNaN(tb) && tb > 0) {
        byId('dyn-pen-imt').value = (bb / Math.pow(tb / 100, 2)).toFixed(2);
      } else {
        byId('dyn-pen-imt').value = '';
      }
    }
  }

  function bindRuleListeners(fields, PV) {
    (fields || []).forEach(function (f) {
      var el = byId('dyn-pen-' + f.id);
      if (!el || el.dataset.ruleBound === '1') return;
      el.dataset.ruleBound = '1';
      el.addEventListener('input', function () {
        applyRules(fields);
        if (PV && typeof PV.renderValidation === 'function') PV.renderValidation();
      });
      el.addEventListener('change', function () {
        applyRules(fields);
        if (PV && typeof PV.renderValidation === 'function') PV.renderValidation();
      });
    });
  }

  function validateCustom(fields, data) {
    var issues = [];
    var answers = (data && data.extra_fields) || {};
    var visibleFields = getVisibleFields(fields, answers);

    visibleFields.forEach(function (f) {
      var value = answers[f.id];
      if (f.required && !s(value)) {
        issues.push({ type: 'error', text: f.label + ' wajib diisi.' });
      }
    });

    if (s(answers.periksa_hb) === 'Ya' && !s(answers.kadar_hb)) {
      issues.push({ type: 'error', text: 'Kadar HB wajib diisi jika pemeriksaan HB dilakukan.' });
    }
    if (s(answers.pemberian_bansos) === 'Ya, sudah mendapatkan bansos' && !s(answers.jenis_bansos)) {
      issues.push({ type: 'error', text: 'Jenis bansos wajib diisi jika bansos sudah didapat.' });
    }
    if (s(answers.mbg_diterima) === 'Tidak') {
      ['frekuensi_mbg', 'frekuensi_menu_basah', 'pemberian_upf', 'distribusi_mbg_tpk'].forEach(function (key) {
        if (s(answers[key])) {
          issues.push({ type: 'error', text: 'Field MBG turunan harus kosong jika MBG tidak diterima.' });
        }
      });
    }

    return issues;
  }

  function renderValidationBox(PV, issues) {
    var html = '<ul class="validation-list">' + issues.map(function (issue) {
      return '<li class="validation-item-' + esc(issue.type) + '">' + esc(issue.text) + '</li>';
    }).join('') + '</ul>';
    var box = byId('pendampingan-validation-box');
    if (box) box.innerHTML = html;
  }

  function patchPendampinganQuestionBank() {
    var PV = window.PendampinganView;
    if (!PV || PV.__stage3aPatched) return false;
    PV.__stage3aPatched = true;

    PV._questionBankFields = [];

    var origLoad = PV.loadDynamicFields;
    PV.loadDynamicFields = async function (jenisSasaran) {
      // keep original for compatibility, but replace output with curated bank
      try { if (origLoad) await origLoad.apply(this, arguments); } catch (_) {}
      var draft = getPendampinganDraft();
      var values = draft && draft.extra_fields ? draft.extra_fields : {};
      this._questionBankFields = renderQuestionBank(jenisSasaran || (getSelected().jenis_sasaran || ''), values);
      applyRules(this._questionBankFields);
      bindRuleListeners(this._questionBankFields, this);
      return this._questionBankFields;
    };

    var origCollect = PV.collectFormData;
    PV.collectFormData = function () {
      var data = origCollect.apply(this, arguments);
      var fields = this._questionBankFields || [];
      data.extra_fields = getAnswers(fields);
      return data;
    };

    var origFill = PV.fillDynamicFields;
    PV.fillDynamicFields = function (itemOrExtra) {
      var extra = itemOrExtra && itemOrExtra.extra_fields ? itemOrExtra.extra_fields : itemOrExtra;
      extra = extra && typeof extra === 'object' ? extra : {};
      var fields = this._questionBankFields || [];
      fields.forEach(function (f) { setCustomValue(f, extra[f.id]); });
      applyRules(fields);
      if (typeof origFill === 'function') {
        try { origFill.apply(this, arguments); } catch (_) {}
      }
    };

    var origTryLoadDraft = PV.tryLoadDraftForSelected;
    PV.tryLoadDraftForSelected = function () {
      if (typeof origTryLoadDraft === 'function') {
        try { origTryLoadDraft.apply(this, arguments); } catch (_) {}
      }
      var draft = getPendampinganDraft();
      if (!draft || !draft.extra_fields) return;
      var fields = this._questionBankFields || [];
      fields.forEach(function (f) { setCustomValue(f, draft.extra_fields[f.id]); });
      applyRules(fields);
    };

    PV.validate = function (data) {
      var issues = [];
      var mode = (typeof this.getMode === 'function' ? this.getMode() : null); // not available, keep existing semantics
      if (!s(data.id_sasaran)) issues.push({ type: 'error', text: 'ID sasaran tidak ditemukan. Pilih sasaran kembali.' });
      if (!s(data.jenis_sasaran)) issues.push({ type: 'error', text: 'Jenis sasaran tidak tersedia.' });
      if (!s(data.tanggal_pendampingan)) issues.push({ type: 'error', text: 'Tanggal pendampingan wajib diisi.' });
      if (!s(data.id_tim)) issues.push({ type: 'error', text: 'ID tim tidak tersedia pada sesi login/data sasaran.' });
      if (!s(data.id_user) && !s(data.id_kader)) issues.push({ type: 'error', text: 'ID pengguna login tidak tersedia.' });
      if (!s(data.status_kunjungan)) issues.push({ type: 'warn', text: 'Status kunjungan belum dipilih.' });

      issues = issues.concat(validateCustom(this._questionBankFields || [], data));
      if (!issues.some(function (x) { return x.type === 'error'; })) {
        issues.push({ type: 'ok', text: 'Validasi dasar pendampingan lolos.' });
      }
      return issues;
    };

    PV.renderValidation = function () {
      var data = this.collectFormData();
      var issues = this.validate(data);
      renderValidationBox(this, issues);
    };

    return true;
  }

  function waitPatch() {
    if (patchPendampinganQuestionBank()) return;
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (patchPendampinganQuestionBank() || tries > 120) {
        window.clearInterval(timer);
      }
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitPatch);
  } else {
    waitPatch();
  }
})(window, document);
