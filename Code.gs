const CFG = {
  sheets: {
    USERS: 'users',
    MASTER_WILAYAH: 'master_wilayah',
    MASTER_PERTANYAAN: 'master_pertanyaan',
    SASARAN: 'sasaran',
    LAPORAN: 'laporan',
    SESSIONS: 'sessions'
  },
  apiKey: 'DEV-KEY-TPK26',
  cutover: {
    ujiIds: ['TPK01', 'TPK02', 'TPK03', 'TPK04', 'TPK05', 'ADM01']
  }
};

function doGet(e) {
  const action = (e.parameter.action || 'health').toLowerCase();
  return route_(action, e.parameter || {}, null);
}

function doPost(e) {
  const body = JSON.parse((e.postData && e.postData.contents) || '{}');
  const action = String(body.action || '').toLowerCase();
  return route_(action, {}, body);
}

function route_(action, query, body) {
  try {
    if (action === 'health') return json_({ status: 'ok', now: new Date().toISOString() });
    if (action === 'auth.login') return actionLogin_(body || query);
    if (action === 'master.bootstrap') return actionBootstrap_(body || query);
    if (action === 'sync.push') return actionSyncPush_(body || query);
    if (action === 'cutover.cleanup-uji') return actionCutoverCleanupUji_(body || query);
    return json_({ status: 'error', pesan: 'Action tidak dikenal' });
  } catch (err) {
    return json_({ status: 'error', pesan: err.message });
  }
}

function actionCutoverCleanupUji_(payload) {
  if (!isAuthorized_(payload)) return json_({ status: 'error', pesan: 'Unauthorized' });
  return json_(runCutoverCleanupRiilOnly());
}

function actionLogin_(payload) {
  const username = String(payload.username || payload.id_kader || '').trim().toUpperCase();
  const password = String(payload.password || payload.nik || '').trim();
  if (!username || !password) return json_({ status: 'error', pesan: 'username/password wajib' });

  const users = getUsers_();
  const u = users[username];
  if (!u || !u.is_active) return json_({ status: 'error', pesan: 'Akun tidak ditemukan/nonaktif' });
  if (String(u.password).trim() !== password) return json_({ status: 'error', pesan: 'Password salah' });

  const role = u.role || 'KADER';
  const token = Utilities.getUuid();
  upsertSession_(token, username, role, u.kecamatan || '', u.tim_id || '');

  return json_({
    status: 'ok',
    session_token: token,
    role: role,
    profile: { user_id: username, nama: u.nama || '', kecamatan: u.kecamatan || '', tim_id: u.tim_id || '' },
    scope: {
      scope_type: role === 'KADER' ? 'TEAM_DUSUN' : 'KECAMATAN',
      kecamatan_code: u.kecamatan || '',
      tim_id: u.tim_id || '',
      dusun_ids: parseJsonSafe_(u.dusun_ids, [])
    }
  });
}

function actionBootstrap_(payload) {
  if (!isAuthorized_(payload)) return json_({ status: 'error', pesan: 'Unauthorized' });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const wilayah = readRows_(ss.getSheetByName(CFG.sheets.MASTER_WILAYAH));
  const pertanyaan = readRows_(ss.getSheetByName(CFG.sheets.MASTER_PERTANYAAN));
  return json_({ status: 'ok', master_wilayah: wilayah, master_pertanyaan: pertanyaan, version: new Date().toISOString() });
}

function actionSyncPush_(payload) {
  if (!isAuthorized_(payload)) return json_({ status: 'error', pesan: 'Unauthorized' });
  const sasaran = Array.isArray(payload.sasaran) ? payload.sasaran : [];
  const laporan = Array.isArray(payload.laporan) ? payload.laporan : [];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shS = ss.getSheetByName(CFG.sheets.SASARAN);
  const shL = ss.getSheetByName(CFG.sheets.LAPORAN);

  const now = new Date();
  const rowsS = sasaran.map(s => [now, s.id_sasaran, s.id_kader, s.id_tim, s.kecamatan, s.desa, s.id_wilayah, s.dusun, s.jenis, s.nik, s.nama, JSON.stringify(s.detail_khusus || {}), s.status_aktif || '', s.tgl_mulai_aktif || '', s.tgl_akhir_aktif || '']);
  const rowsL = laporan.map(l => [now, l.id_laporan, l.id_kader, l.id_tim, l.kecamatan, l.jenis, l.id_sasaran, l.tanggal, l.bulan, l.status, l.edukasi, l.catatan, l.bumil_event || '', l.tgl_persalinan || '']);

  appendRows_(shS, rowsS);
  appendRows_(shL, rowsL);

  const autoBufas = buildAutoBufasRows_(laporan);
  appendRows_(shS, autoBufas);

  return json_({ status: 'sukses', count_sasaran: rowsS.length + autoBufas.length, count_laporan: rowsL.length });
}

function buildAutoBufasRows_(laporanList) {
  const now = new Date();
  const out = [];
  laporanList.forEach(l => {
    if (String(l.jenis) !== 'BUMIL') return;
    if (String(l.bumil_event) !== 'PERSALINAN') return;
    if (!l.tgl_persalinan || !l.id_sasaran) return;

    const idBufas = 'BUFAS-' + String(l.kecamatan || '') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
    const detail = { tgl_persalinan: l.tgl_persalinan, metode_kb: 'Belum Pakai KB' };
    const tglMulai = l.tgl_persalinan;
    const tglAkhir = addDaysIso_(l.tgl_persalinan, 42);

    out.push([now, idBufas, l.id_kader, l.id_tim, l.kecamatan, '', '', '', 'BUFAS', '', '', JSON.stringify(detail), 'AKTIF', tglMulai, tglAkhir]);
  });
  return out;
}

function isAuthorized_(payload) {
  const key = String(payload.api_key || '').trim();
  if (key && key === CFG.apiKey) return true;
  const token = String(payload.session_token || '').trim();
  if (!token) return false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessions = readRows_(ss.getSheetByName(CFG.sheets.SESSIONS));
  return sessions.some(s => String(s.session_token || '') === token);
}

function upsertSession_(token, userId, role, kec, tim) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CFG.sheets.SESSIONS);
  appendRows_(sh, [[new Date(), token, userId, role, kec, tim]]);
}

function getUsers_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rows = readRows_(ss.getSheetByName(CFG.sheets.USERS));
  const map = {};
  rows.forEach(r => {
    const id = String(r.user_id || '').toUpperCase();
    if (!id) return;
    map[id] = {
      nama: r.nama || '',
      password: r.password || '',
      role: r.role || 'KADER',
      kecamatan: r.kecamatan || '',
      tim_id: r.tim_id || '',
      dusun_ids: r.dusun_ids || '[]',
      is_active: String(r.is_active || 'TRUE').toUpperCase() !== 'FALSE'
    };
  });
  return map;
}

function readRows_(sheet) {
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (!values.length) return [];
  const headers = values[0].map(h => String(h).trim());
  return values.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

function appendRows_(sheet, rows) {
  if (!sheet || !rows || !rows.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function addDaysIso_(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseJsonSafe_(text, fallback) {
  try { return JSON.parse(text); } catch (e) { return fallback; }
}

function runCutoverCleanupRiilOnly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const report = {
    status: 'ok',
    timestamp: ts,
    backup: {},
    deleted: {}
  };

  const targets = [
    CFG.sheets.USERS,
    CFG.sheets.SASARAN,
    CFG.sheets.LAPORAN,
    CFG.sheets.SESSIONS
  ];

  targets.forEach((sheetName) => {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return;
    const backupName = backupSheet_(ss, sh, ts);
    report.backup[sheetName] = backupName;
    report.deleted[sheetName] = purgeUjiRows_(sh, sheetName);
  });

  Logger.log(JSON.stringify(report));
  return report;
}

function backupSheet_(ss, sheet, suffix) {
  const base = `BK_${sheet.getName()}_${suffix}`;
  const safe = base.length > 99 ? base.slice(0, 99) : base;
  const copy = sheet.copyTo(ss).setName(safe);
  ss.setActiveSheet(copy);
  ss.moveActiveSheet(ss.getNumSheets());
  return safe;
}

function purgeUjiRows_(sheet, logicalName) {
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return 0;

  const headers = values[0].map((h) => String(h || '').trim());
  const idx = {};
  headers.forEach((h, i) => { idx[h] = i; });

  const keep = [values[0]];
  let deleted = 0;
  for (let r = 1; r < values.length; r += 1) {
    const row = values[r];
    if (isUjiRowBySheet_(row, idx, logicalName)) {
      deleted += 1;
      continue;
    }
    keep.push(row);
  }

  sheet.clearContents();
  sheet.getRange(1, 1, keep.length, keep[0].length).setValues(keep);
  return deleted;
}

function isUjiRowBySheet_(row, idx, sheetName) {
  const getVal = (keys) => {
    for (let i = 0; i < keys.length; i += 1) {
      if (idx[keys[i]] !== undefined) return String(row[idx[keys[i]]] || '').trim();
    }
    return '';
  };

  const sumberData = getVal(['sumber_data', 'SUMBER_DATA']).toUpperCase();
  const idUser = getVal(['user_id', 'id_user', 'username_login', 'USER_ID', 'ID_USER', 'USERNAME_LOGIN']).toUpperCase();
  const idKader = getVal(['id_kader', 'ID_KADER']).toUpperCase();
  const nama = getVal(['nama', 'nama_kader', 'nama_admin', 'NAMA', 'NAMA_KADER', 'NAMA_ADMIN']).toLowerCase();
  const catatan = getVal(['catatan', 'CATATAN']).toLowerCase();

  const byId = CFG.cutover.ujiIds.includes(idUser) || CFG.cutover.ujiIds.includes(idKader);
  const byText = nama.indexOf('uji') >= 0 || nama.indexOf('uat') >= 0 || catatan.indexOf('uji') >= 0 || catatan.indexOf('uat') >= 0;
  const bySumber = sumberData === 'UJI';

  if (sheetName === CFG.sheets.USERS) return byId || byText;
  if (sheetName === CFG.sheets.SASARAN || sheetName === CFG.sheets.LAPORAN) return byId || bySumber || byText;
  if (sheetName === CFG.sheets.SESSIONS) return byId;
  return byId || bySumber || byText;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function seedTestUsers() {
  throw new Error('Mode RIIL aktif. Fungsi seed user uji dinonaktifkan.');
}

