/**
 * ILT Hukum Pascal — penerima hasil siswa (Google Apps Script)
 *
 * Cara pasang: lihat README.md, langkah 1.
 * Ganti PASSWORD_GURU di bawah sebelum dipakai.
 *
 * Website mengirim data setiap kali siswa menekan Periksa:
 *  - sheet "Log Periksa": bertambah satu baris per Periksa;
 *  - sheet "Hasil": satu baris per siswa yang selalu diperbarui. Layar yang belum selesai
 *    otomatis berskor 1 dan berstatus "belum selesai".
 */
const PASSWORD_GURU = 'ganti-password-ini';

const SHEET_HASIL = 'Hasil';
const SHEET_LOG = 'Log Periksa';

const LAYAR = ['t1', 't2', 't3', 'kes', 'pel'];
const NAMA_LAYAR = { t1: 'Tabel 1', t2: 'Tabel 2', t3: 'Tabel 3', kes: 'Kesimpulan', pel: 'Peluang' };
const NAMA_HASIL = { wrong: 'Ada yang salah', incomplete: 'Benar tetapi belum lengkap', complete: 'Benar dan lengkap' };

const HEAD_HASIL = [
  'Terakhir diperbarui', 'ID sesi', 'Nama', 'Kelas', 'No. absen',
  'Mulai', 'Selesai', 'Durasi (menit)',
  'Skor Tabel 1', 'Skor Tabel 2', 'Skor Tabel 3', 'Skor Kesimpulan', 'Skor Peluang',
  'Status Tabel 1', 'Status Tabel 2', 'Status Tabel 3', 'Status Kesimpulan', 'Status Peluang',
  'CRR (IKTP 8)', 'PBR (IKTP 9)',
  'Percobaan T1', 'Percobaan T2', 'Percobaan T3', 'Percobaan Kes', 'Percobaan Pel',
  'Jawaban tepat ditampilkan (percobaan ke-)', 'Jenis kesalahan',
  'Nomor kiriman terakhir', 'Data lengkap (JSON)'
];
const HEAD_LOG = [
  'ID sesi', 'Nama', 'Kelas', 'No. absen', 'Layar', 'Periksa ke-', 'Dihitung sebagai percobaan',
  'Nomor percobaan', 'Waktu', 'Hasil', 'Pernyataan / pilihan (✓/✗)', 'Kode kesalahan',
  'Pesan ditampilkan', 'Jawaban tepat ditampilkan', 'Skor layar'
];

const KOLOM_ID = HEAD_HASIL.indexOf('ID sesi') + 1;
const KOLOM_NOMOR = HEAD_HASIL.indexOf('Nomor kiriman terakhir') + 1;
const KOLOM_JSON = HEAD_HASIL.indexOf('Data lengkap (JSON)') + 1;

function sheet_(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(head);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#e8eeff');
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Sel Google Sheets maksimal 50.000 karakter; bila terlalu panjang, log dilepas (tetap ada di sheet Log Periksa).
function fullJson_(d) {
  const data = Object.assign({}, d);
  delete data.entry;
  delete data.type;
  const full = JSON.stringify(data);
  if (full.length < 49000) return full;
  return JSON.stringify(Object.assign({}, data, { log: [], logTruncated: true }));
}

function barisHasil_(d) {
  const s = d.scores || {}, st = d.status || {}, a = d.attempts || {}, k = d.keyShown || {};
  const kunci = LAYAR.filter(function (id) { return k[id]; })
    .map(function (id) { return NAMA_LAYAR[id] + ': ' + k[id]; }).join('; ');
  return [
    new Date(), d.submissionId, d.nama, d.kelas, d.absen,
    d.startedAt ? new Date(d.startedAt) : '', d.finishedAt ? new Date(d.finishedAt) : '',
    d.durationSec != null ? Math.round(d.durationSec / 6) / 10 : '',
    s.t1, s.t2, s.t3, s.kes, s.pel,
    st.t1, st.t2, st.t3, st.kes, st.pel,
    d.crr, d.pbr,
    a.t1, a.t2, a.t3, a.kes, a.pel,
    kunci || '-', (d.errorCodes || []).join(', '),
    d.seq, fullJson_(d)
  ];
}

function barisLog_(d, l) {
  const isi = l.items
    ? l.items.map(function (it) { return (it.ok ? '✓ ' : '✗ ') + it.text; }).join('\n')
    : Object.keys(l.choice || {}).map(function (q) { return q + ': ' + l.choice[q]; }).join(', ');
  return [
    d.submissionId, d.nama, d.kelas, d.absen, NAMA_LAYAR[l.screen] || l.screen, l.periksa,
    l.counted ? 'ya' : 'tidak', l.counted ? l.attempt : '-',
    l.at ? new Date(l.at) : '', NAMA_HASIL[l.status] || l.status, isi,
    (l.codes || []).join(', '), (l.shown || []).join(', '), l.keyShown ? 'ya' : 'tidak',
    l.score != null ? l.score : '-'
  ];
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (!d.submissionId || !d.nama) return json_({ ok: false, error: 'data tidak lengkap' });

    const hasil = sheet_(SHEET_HASIL, HEAD_HASIL);
    const log = sheet_(SHEET_LOG, HEAD_LOG);

    // Cari baris siswa ini. Website mengirim berurutan dengan nomor kiriman (seq) yang terus naik,
    // jadi kiriman dengan nomor lama adalah kiriman ulang dan diabaikan.
    let baris = -1;
    const last = hasil.getLastRow();
    if (last > 1) {
      const ids = hasil.getRange(2, KOLOM_ID, last - 1, 1).getValues().flat();
      const i = ids.indexOf(d.submissionId);
      if (i !== -1) {
        baris = i + 2;
        const nomor = Number(hasil.getRange(baris, KOLOM_NOMOR).getValue()) || 0;
        if (d.seq <= nomor) return json_({ ok: true, duplicate: true });
      }
    }

    const nilai = barisHasil_(d);
    if (baris === -1) hasil.appendRow(nilai);
    else hasil.getRange(baris, 1, 1, nilai.length).setValues([nilai]);

    if (d.type === 'check' && d.entry) log.appendRow(barisLog_(d, d.entry));

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Dipakai halaman guru (guru.html) untuk membaca semua hasil. */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action !== 'list') return json_({ ok: true, info: 'ILT Pascal aktif' });
  if (p.key !== PASSWORD_GURU) return json_({ ok: false, error: 'password salah' });
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HASIL);
  if (!sh || sh.getLastRow() < 2) return json_({ ok: true, rows: [] });
  const vals = sh.getRange(2, KOLOM_JSON, sh.getLastRow() - 1, 1).getValues();
  const rows = [];
  vals.forEach(function (v) {
    try { rows.push(JSON.parse(v[0])); } catch (err) { /* baris rusak / terpotong dilewati */ }
  });
  return json_({ ok: true, rows: rows });
}
