# ILT Hukum Pascal

Interactive Learning Task (ILT) berbasis web untuk materi **Hukum Pascal** pada jembatan hidrolik.
Siswa menyusun pernyataan dari kotak-kotak pilihan, mendapat umpan balik bertahap, lalu melihat skornya sendiri.
Data terkirim ke Google Sheets setiap kali siswa menekan Periksa dan bisa dilihat guru di halaman dasbor.

| Halaman | Untuk | Isi |
|---|---|---|
| `index.html` | Siswa | Pengantar → Tabel 1 → Tabel 2 → Tabel 3 → Kesimpulan → Peluang → Hasil |
| `guru.html` | Guru | Rekap skor, kesalahan paling sering, rincian tiap siswa, unduh CSV |

Tidak perlu instalasi atau *build*: semua file statis (HTML, CSS, JavaScript).

**Website:** https://joshhhlee.github.io/ilt-pascal/ · **Dasbor guru:** https://joshhhlee.github.io/ilt-pascal/guru.html

---

## Langkah 1 — Siapkan Google Sheets (sekali saja)

ILT ini memakai Google Sheet dan Apps Script **sendiri**, terpisah dari ILT Hidrostatis.

1. Buka [sheets.new](https://sheets.new) untuk membuat Google Sheet baru, beri nama misalnya **Hasil ILT Pascal**.
2. Menu **Ekstensi → Apps Script**.
3. Klik di kotak kode, tekan Ctrl+A lalu Delete.
4. Buka `guru.html`, tekan **Salin kode Apps Script**, lalu tempel di kotak kode dengan Ctrl+V.
5. Di baris `const PASSWORD_GURU = 'ganti-password-ini';`, ganti `ganti-password-ini` dengan password guru yang kamu inginkan.
6. Klik **Simpan** (ikon disket).
7. Klik **Terapkan → Deployment baru**.
   - Ikon roda gigi → pilih **Aplikasi web**.
   - *Jalankan sebagai*: **Saya**.
   - *Yang memiliki akses*: **Siapa saja**.
   - Klik **Terapkan**, lalu izinkan akses saat diminta (pilih akun Google-mu → *Lanjutan* → *Buka … (tidak aman)* → *Izinkan*).
8. Salin **URL aplikasi web** (berakhiran `/exec`).

> Sheet **Hasil** (satu baris per siswa, selalu diperbarui) dan **Log Periksa** (satu baris per Periksa) dibuat otomatis saat Periksa pertama.
> Bila `Code.gs` diubah lagi, pakai **Terapkan → Kelola deployment → Edit → Versi baru** supaya URL-nya tetap sama.

## Langkah 2 — Hubungkan website ke Sheet

Buka `assets/js/config.js` dan tempel URL tadi:

```js
window.ILT_CONFIG = {
  scriptUrl: "https://script.google.com/macros/s/XXXX/exec",
  maxAttempts: 3,            // jawaban tepat tampil bila percobaan ke-3 masih salah
  freeIncompleteChecks: 3,   // "belum lengkap" yang tidak dihitung percobaan
};
```

Selama `scriptUrl` masih kosong, website tetap bisa dicoba: hasil hanya tersimpan di perangkat siswa (bisa diunduh sebagai file `.json`, lalu diimpor di dasbor guru).

---

## Mengubah teks soal dan umpan balik

Semua teks ada di **`assets/js/content.js`**: soal, pilihan kotak, pesan umpan balik (K1–K3, M1–M7, N1–N3), hal inti, jawaban yang tepat, serta pilihan Kesimpulan dan Peluang.
Ubah teks di dalam tanda kutip saja. Placeholder `{X}` dan `{Y}` diisi otomatis oleh sistem.

## Aturan yang dipakai

Isi soal mengikuti file `Skema Interactive Learning Task Pascal.xlsx`. File itu lebih lama daripada revisi ILT Hidrostatis, jadi **aturan percobaan, skor, dan penyimpanan data mengikuti revisi terakhir ILT Hidrostatis**.

- Siswa mengerjakan berurutan. Tidak ada batas waktu, pertanyaan keyakinan, atau refleksi.
- **Percobaan hanya dihitung** bila Periksa menemukan minimal satu ✗. Pernyataan ✓ tetap di daftar.
- ✗ pertama = pertanyaan pengarah, ✗ kedua = penjelasan + pertanyaan pengarah, ✗ ketiga = **jawaban yang tepat** ditampilkan dan layar terkunci.
- Tabel 1–3: bila semua ✓ tetapi belum lengkap, tidak dihitung sampai 3 kali per layar. Mulai yang ke-4, setiap Periksa seperti itu dihitung 1 percobaan.
- Pesan belum lengkap memakai tingkat 1 bila belum ada percobaan terhitung, tingkat 2 bila sudah ada.
- Pernyataan ✗ dikelompokkan per jenis kesalahan; jenis yang sama hanya satu pesan, **maksimal dua pesan** per Periksa.
- Umpan balik dan jawaban yang tepat **tidak pernah muncul bersamaan**.
- **Skor per layar**: 0 percobaan terhitung = 4, 1 atau 2 = 3, jawaban yang tepat ditampilkan = 2, belum selesai = 1.
- **CRR (IKTP 8)** = rata-rata skor Tabel 1, 2, 3, dan Kesimpulan (dibulatkan). **PBR (IKTP 9)** = skor Peluang.

Pemeriksaan sudah dicek terhadap file Excel:

| Tabel | Pernyataan | Benar | Hal inti | Keterangan |
|---|---|---|---|---|
| 1 | 15 sesuai Excel, 24 bisa disusun | 3 | 2 | K1 2, K2 10; “menekan” dengan subjek selain operator (K3) 9 |
| 2 | 30 sesuai Excel, 300 bisa disusun | 10 | 5 | M1–M5 masing-masing 4; besaran berbeda (M6) 240; besaran dengan dirinya sendiri (M7) 30 |
| 3 | 12 | 6 | 3 | N1–N3 masing-masing 2 |

## Yang masih perlu dicek pemilik penelitian

Teks yang tidak ada di Excel ditandai `DRAF` di `content.js`.

1. **Pilihan P.1 (a) dan P.2 (a–d) di Peluang** tidak tertulis di Excel. Teksnya disusun dari umpan balik. Kunci P.1 = a dan P.2 = b mengikuti Excel.
2. **Pesan M6 dan M7** (Tabel 2), **pesan K3** (Tabel 1), dan **alasan pada kunci Tabel 1** untuk K2 dan K3. K3 muncul karena kotak “menekan” tidak lagi dicoret. Termasuk K3: “Silinder pengangkat menekan badan jembatan”, yang dinilai salah karena kunci Excel hanya menerima operator sebagai subjek “menekan”.
3. **Baris “P.1 a, P.2 b atau c”** di sheet Peluang dibaca sebagai “P.2 a atau c”, karena kunci P.2 adalah b.
4. **Sisa teks dari ILT sebelumnya di Excel**: “gambar pipa-U”, “tiga hal inti” (Tabel 1 punya 2) dan “empat hal inti” (Tabel 2 punya 5). Yang dipakai adalah kunci pada masing-masing sheet.
5. **Tabel 3, sel D18** menulis “gaya → jarak dorong”; yang dipakai adalah kunci di sheet yang sama (“luas penampang → jarak gerak”).

## Struktur folder

```
index.html            halaman siswa
guru.html             dasbor guru
assets/css/           tampilan
assets/img/           gambar jembatan hidrolik
assets/js/config.js   pengaturan (URL Sheet, jumlah percobaan)
assets/js/content.js  semua teks & aturan ILT
assets/js/app.js      logika halaman siswa
assets/js/guru.js     logika dasbor guru
apps-script/Code.gs   penerima data di Google Sheets
```
