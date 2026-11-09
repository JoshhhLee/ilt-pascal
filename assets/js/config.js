/*
 * PENGATURAN ILT
 * scriptUrl : URL Web App Google Apps Script (lihat README, langkah 1).
 *             Biarkan kosong untuk uji coba: hasil hanya tersimpan di perangkat siswa.
 * maxAttempts : banyak percobaan terhitung per layar. Percobaan hanya dihitung bila Periksa
 *               menemukan minimal satu ✗. Bila percobaan terakhir masih salah, jawaban yang
 *               tepat ditampilkan dan layar dianggap selesai.
 * freeIncompleteChecks : (Tabel 1–3) banyak Periksa "benar tetapi belum lengkap" yang tidak
 *               dihitung sebagai percobaan. Mulai yang berikutnya, setiap Periksa seperti itu
 *               dihitung sebagai 1 percobaan.
 */
window.ILT_CONFIG = {
  scriptUrl: "",
  maxAttempts: 3,
  freeIncompleteChecks: 3,
};
