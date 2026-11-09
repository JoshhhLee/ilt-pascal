/*
 * ISI ILT HUKUM PASCAL
 * ---------------------------------------------------------------
 * Semua teks soal, pilihan kotak, umpan balik, dan kunci ada di file ini.
 * Teks boleh diubah langsung di sini tanpa menyentuh file lain.
 * Placeholder yang diisi otomatis oleh sistem:
 *   {X}, {Y}  -> bagian jembatan / besaran pada pernyataan salah yang pertama
 * Teks bertanda "DRAF" belum ada di file Excel dan perlu dicek.
 */
(function () {
  "use strict";

  const MAIN_QUESTION =
    "Perhatikan gambar jembatan hidrolik! Jembatan ini punya dua badan jembatan yang dinaikkan oleh dua silinder pengangkat. " +
    "Operator menekan piston pompa, lalu kedua daun jembatan terangkat. " +
    "Bagaimana tekanan, gaya, dan jarak gerak pada piston pompa berhubungan dengan silinder pengangkat? " +
    "Berikan alasan jawabanmu dengan menyusun pernyataan pada Tabel 1, 2, dan 3.";

  /* ---------- Gambar ----------
   * x dan y = posisi dalam persen dari lebar dan tinggi gambar.
   * marks  = cincin sorotan saat siswa memilih bagian itu.
   * labels = tulisan besar yang menutupi tulisan pada gambar saat gambar tampil kecil (HP).
   */
  const FIGURE = {
    src: "assets/img/jembatan.webp",
    w: 1671,
    h: 941,
    alt:
      "Jembatan hidrolik. Operator menekan piston pompa seluas 100 cm² dengan gaya 4.000 N. " +
      "Cairan hidrolik mengalir lewat pipa dari piston pompa ke dua silinder pengangkat dengan luas total 5.000 cm². " +
      "Kedua silinder pengangkat mengangkat dua badan jembatan.",
    marks: [
      { k: "operator", x: 6.2, y: 32 },
      { k: "piston", x: 7.8, y: 60 },
      { k: "silinder", x: 35.8, y: 62 },
      { k: "silinder", x: 68.2, y: 62 },
      { k: "badan", x: 38.9, y: 23 },
      { k: "badan", x: 64.3, y: 20 },
    ],
    labels: [
      { t: ["Gaya tekan", "4.000 N"], x: 11.5, y: 13 },
      { t: ["Piston pompa", "100 cm²"], x: 21, y: 58 },
      { t: ["Dua silinder pengangkat,", "luas total 5.000 cm²"], x: 52, y: 56.3 },
      { t: ["Badan jembatan"], x: 36, y: 9 },
      { t: ["Badan jembatan"], x: 71.3, y: 8.5 },
      { t: ["Cairan hidrolik"], x: 51.6, y: 91.8 },
    ],
  };

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* =============================================================
   * TABEL 1. DESKRIPSI SKEMA
   * ============================================================= */
  const PART = {
    operator: { L: "Operator", R: "operator", hl: "operator", jalur: false },
    piston: { L: "Piston pompa", R: "piston pompa", hl: "piston", jalur: true },
    silinder: { L: "Silinder pengangkat", R: "silinder pengangkat", hl: "silinder", jalur: true },
    badan: { L: "Badan jembatan", R: "badan jembatan", hl: "badan", jalur: false },
  };
  const REL1 = { tekan: "menekan", hubung: "terhubung oleh cairan dengan" };

  const T1 = {
    id: "t1",
    kind: "builder",
    short: "Tabel 1",
    title: "Tabel 1. Deskripsi Skema",
    lead: "Perhatikan bagian-bagian jembatan pada gambar. Susun pernyataan tentang bagian yang ditekan operator dan bagian yang terhubung oleh cairan.",
    tip: "Pilih satu kotak dari setiap kolom, lalu tekan “Tambahkan”. Kamu tidak perlu menyusun semua pernyataan yang mungkin. Susun yang menurutmu penting.",
    // Domain Excel: 3 pernyataan "menekan" (subjeknya hanya operator) + 12 "terhubung oleh cairan" = 15.
    // Kotak yang dicoret tidak membocorkan jawaban: operator tetap harus memilih bagian yang ditekannya.
    slots: [
      {
        key: "x", label: "Bagian",
        options: Object.keys(PART).map((k) => ({ v: k, text: PART[k].L, hl: PART[k].hl })),
        disabled: (sel, o) => sel.rel === "tekan" && o.v !== "operator",
      },
      {
        key: "rel", label: "Hubungan",
        options: Object.keys(REL1).map((k) => ({ v: k, text: REL1[k] })),
        disabled: (sel, o) => o.v === "tekan" && !!sel.x && sel.x !== "operator",
      },
      {
        key: "y", label: "Bagian",
        options: Object.keys(PART).map((k) => ({ v: k, text: PART[k].R, hl: PART[k].hl })),
        disabled: (sel, o) => sel.x === o.v,
      },
    ],
    sentence: (it) => `${PART[it.x].L} ${REL1[it.rel]} ${PART[it.y].R}.`,
    evaluate(it) {
      const ctx = { X: PART[it.x].R, Y: PART[it.y].R };
      if (it.rel === "tekan") {
        const ok = it.y === "piston";
        return { ok, type: ok ? null : "K1", cores: ok ? [1] : [], ctx };
      }
      const ok = PART[it.x].jalur && PART[it.y].jalur;
      if (ok) return { ok, type: null, cores: [2], ctx };
      // DRAF: alasan pada kunci untuk pasangan yang memang tidak punya versi tepat.
      const luar = [it.x, it.y].filter((k) => !PART[k].jalur).map((k) => PART[k].R);
      return { ok, type: "K2", cores: [], ctx, why: `${cap(luar.join(" dan "))} tidak berada di jalur cairan hidrolik.` };
    },
    // null = tidak ada versi tepat untuk pasangan ini; kunci menampilkan alasannya saja
    correctFor: (it) => (it.rel === "tekan" ? T1.sentence({ x: "operator", rel: "tekan", y: "piston" }) : null),
    errors: {
      K1: {
        name: "“Menekan” untuk bagian yang tidak ditekan langsung operator",
        1: "Lihat panah gaya tekan operator pada gambar. Apakah panah itu mengenai {Y}?",
        2: "Panah gaya tekan operator pada gambar hanya mengenai satu bagian, dan bagian itu bukan {Y}. Periksa bagian yang ditunjuk panah itu.",
      },
      K2: {
        name: "“Terhubung oleh cairan” untuk bagian yang tidak berada di jalur cairan",
        1: "Telusuri jalur cairan hidrolik pada gambar. Apakah jalur itu sampai ke {X} dan {Y}?",
        2: "Cairan hidrolik hanya mengisi bagian yang dilaluinya pada gambar. Telusuri jalur itu dari awal sampai akhir dan periksa apakah {X} dan {Y} termasuk di dalamnya.",
      },
    },
    cores: [
      {
        id: 1, name: "Bagian yang ditekan operator",
        key: "Operator menekan piston pompa.",
        1: "Masih ada hal penting tentang operator yang belum kamu sebut. Bagian mana yang ditekan operator?",
        2: "Lihat panah gaya tekan operator pada gambar, lalu susun pernyataan tentang bagian yang ditekan operator.",
      },
      {
        id: 2, name: "Hubungan piston pompa dan silinder pengangkat",
        key: "Piston pompa terhubung oleh cairan dengan silinder pengangkat.",
        1: "Masih ada hubungan antara dua bagian jembatan yang belum kamu sebut. Telusuri jalur cairan hidrolik pada gambar.",
        2: "Jalur cairan hidrolik berawal dari piston pompa. Ke bagian mana jalur itu berakhir?",
      },
    ],
    complete:
      "Semua pernyataanmu tepat dan sudah lengkap. Ingat lagi cara yang kamu pakai tadi untuk membaca gambar jembatan. Cara itu akan berguna lagi di Tabel 2.",
    kcrNote:
      "Cocokkan dengan pernyataanmu tadi. Ingat lagi gambar jembatan, lalu perhatikan bagian yang tadi terlewat.",
  };

  /* =============================================================
   * TABEL 2. MEMBANDINGKAN PARAMETER
   * ============================================================= */
  const BENDA = { p: "piston pompa", s: "silinder pengangkat" };
  const BENDA_HL = { p: "piston", s: "silinder" };
  /* val: nilai relatif untuk satu langkah tekan, hanya dipakai untuk menentukan urutannya.
   * Luas 100 : 5.000 cm². Gaya mengikuti luas. Jarak gerak berbanding terbalik dengan luas. */
  const QTY = {
    tekanan: { name: "tekanan", L: (b) => `Tekanan di ${b}`, R: (b) => `tekanan di ${b}`, val: { p: 1, s: 1 }, type: "M1", core: 1 },
    luas: { name: "luas", L: (b) => `Luas ${b}`, R: (b) => `luas ${b}`, val: { p: 100, s: 5000 }, type: "M5", core: 2 },
    gaya: { name: "gaya", L: (b) => `Gaya di ${b}`, R: (b) => `gaya di ${b}`, val: { p: 4000, s: 200000 }, type: "M2", core: 3 },
    volume: { name: "volume cairan yang berpindah", L: (b) => `Volume cairan yang berpindah di ${b}`, R: (b) => `volume cairan yang berpindah di ${b}`, val: { p: 1, s: 1 }, type: "M4", core: 4 },
    jarak: { name: "jarak gerak", L: (b) => `Jarak gerak ${b}`, R: (b) => `jarak gerak ${b}`, val: { p: 50, s: 1 }, type: "M3", core: 5 },
  };
  const SUBJ2 = {};
  Object.keys(QTY).forEach((q) => {
    Object.keys(BENDA).forEach((b) => {
      SUBJ2[q + "_" + b] = { q, b, L: QTY[q].L(BENDA[b]), R: QTY[q].R(BENDA[b]), hl: BENDA_HL[b] };
    });
  });
  const REL2 = { kecil: "lebih kecil dari", sama: "sama besar dengan", besar: "lebih besar dari" };
  const truth2 = (a, b) => {
    const v = QTY[a.q].val[a.b], w = QTY[b.q].val[b.b];
    return v === w ? "sama" : v > w ? "besar" : "kecil";
  };
  const isPair2 = (a, b) => a.q === b.q && a.b !== b.b;

  const T2 = {
    id: "t2",
    kind: "builder",
    short: "Tabel 2",
    title: "Tabel 2. Membandingkan Parameter",
    lead: "Bandingkan tekanan, luas, gaya, volume cairan yang berpindah, dan jarak gerak pada piston pompa dan silinder pengangkat.",
    tip: "Pilih satu kotak dari setiap kolom, lalu tekan “Tambahkan”. Kamu tidak perlu menyusun semua pernyataan yang mungkin. Susun yang menurutmu penting.",
    note: "Catatan: silinder pengangkat berarti kedua silinder bersama. Volume dan jarak gerak dihitung untuk satu langkah tekan.",
    // Semua kotak kanan sengaja tetap bisa dipilih (tidak dicoret) agar jawaban tidak ketahuan.
    // Pernyataan yang membandingkan besaran berbeda (M6) atau besaran dengan dirinya sendiri (M7) dinilai salah.
    slots: [
      { key: "x", label: "Besaran", options: Object.keys(SUBJ2).map((k) => ({ v: k, text: SUBJ2[k].L, hl: SUBJ2[k].hl })) },
      { key: "rel", label: "Hubungan", options: Object.keys(REL2).map((k) => ({ v: k, text: REL2[k] })) },
      { key: "y", label: "Besaran", options: Object.keys(SUBJ2).map((k) => ({ v: k, text: SUBJ2[k].R, hl: SUBJ2[k].hl })) },
    ],
    sentence: (it) => {
      const a = SUBJ2[it.x], b = SUBJ2[it.y];
      // Excel menulis: "Volume cairan yang berpindah di piston pompa sama besar dengan di silinder pengangkat"
      const kanan = a.q === "volume" && b.q === "volume" ? `di ${BENDA[b.b]}` : b.R;
      return `${a.L} ${REL2[it.rel]} ${kanan}.`;
    },
    evaluate(it) {
      const a = SUBJ2[it.x], b = SUBJ2[it.y];
      if (a.q !== b.q) {
        const ctx = { X: QTY[a.q].name, Y: QTY[b.q].name };
        return { ok: false, type: "M6", cores: [], ctx, why: `${cap(ctx.X)} tidak dapat dibandingkan dengan ${ctx.Y}.` };
      }
      if (a.b === b.b)
        return { ok: false, type: "M7", cores: [], ctx: {}, why: "Pernyataan ini membandingkan satu besaran dengan dirinya sendiri." };
      const ok = it.rel === truth2(a, b);
      return { ok, type: ok ? null : QTY[a.q].type, cores: ok ? [QTY[a.q].core] : [], ctx: {} };
    },
    // null = tidak ada versi tepat untuk pasangan ini (M6/M7); kunci menampilkan alasannya saja
    correctFor(it) {
      const a = SUBJ2[it.x], b = SUBJ2[it.y];
      return isPair2(a, b) ? T2.sentence({ x: it.x, rel: truth2(a, b), y: it.y }) : null;
    },
    fixCore(it) {
      const a = SUBJ2[it.x], b = SUBJ2[it.y];
      return isPair2(a, b) ? QTY[a.q].core : null;
    },
    errors: {
      M1: {
        name: "Tekanan dibedakan",
        1: "Ingat hasil Tabel 1: bagaimana piston pompa dan silinder pengangkat terhubung? Apakah cairannya sama?",
        2: "Piston pompa dan silinder pengangkat berada dalam satu cairan yang tertutup. Tekanan yang diberikan pada cairan tertutup diteruskan ke seluruh cairan itu. Pakai aturan ini untuk membandingkan tekanan di kedua bagian.",
      },
      M2: {
        name: "Gaya salah (sama besar atau terbalik)",
        1: "Lihat luas piston pompa dan silinder pengangkat pada gambar. Mana yang lebih luas?",
        2: "Tekanan adalah gaya per satuan luas. Kalau tekanan di kedua bagian sama tetapi luasnya berbeda, bagaimana gaya di masing-masing bagian?",
      },
      M3: {
        name: "Jarak gerak sama atau lebih besar di silinder",
        1: "Bandingkan banyak cairan yang didorong piston pompa dengan banyak cairan yang masuk ke silinder pengangkat.",
        2: "Cairan dalam sistem tertutup tidak bisa dimampatkan. Volume = luas × jarak gerak. Pikirkan hubungan volume cairan, luas, dan jarak gerak kedua bagian.",
      },
      M4: {
        name: "Volume tidak sama",
        1: "Cairan yang keluar dari piston pompa mengalir ke mana? Adakah tempat lain yang bisa dituju cairan itu?",
        2: "Cairan berada dalam sistem tertutup dan tidak bisa dimampatkan. Cairan yang keluar dari satu bagian pasti masuk ke bagian lain. Bandingkan kedua volume itu.",
      },
      M5: {
        name: "Luas salah (terbalik atau sama)",
        1: "Baca angka luas kedua bagian pada gambar, lalu bandingkan.",
        2: "Pada gambar, luas piston pompa 100 cm² dan luas total silinder pengangkat 5.000 cm². Bandingkan kedua angka itu.",
      },
      // DRAF: M6 dan M7 tidak ada di Excel. Muncul karena kotak kanan tidak dicoret.
      M6: {
        name: "Dua besaran yang berbeda dibandingkan",
        1: "Periksa lagi besaran di kiri dan di kanan pernyataanmu. Apakah {X} bisa dibandingkan dengan {Y}?",
        2: "Besaran {X} dan {Y} berbeda, jadi tidak bisa dibandingkan. Bandingkan besaran yang sama pada piston pompa dan silinder pengangkat.",
      },
      M7: {
        name: "Besaran dibandingkan dengan dirinya sendiri",
        1: "Periksa lagi besaran di kiri dan di kanan pernyataanmu. Apakah keduanya berada di bagian jembatan yang berbeda?",
        2: "Pernyataanmu membandingkan satu besaran dengan dirinya sendiri. Bandingkan besaran itu pada piston pompa dan silinder pengangkat.",
      },
    },
    cores: [
      {
        id: 1, name: "Tekanan",
        key: "Tekanan di piston pompa sama besar dengan tekanan di silinder pengangkat.",
        1: "Bandingkan tekanan di piston pompa dan silinder pengangkat.",
        2: "Ingat hasil Tabel 1: bagaimana piston pompa dan silinder pengangkat terhubung? Apa artinya bagi tekanannya?",
      },
      {
        id: 2, name: "Luas",
        key: "Luas silinder pengangkat lebih besar dari luas piston pompa.",
        1: "Bandingkan luas piston pompa dan silinder pengangkat.",
        2: "Baca angka luas kedua bagian pada gambar, lalu bandingkan.",
      },
      {
        id: 3, name: "Gaya",
        key: "Gaya di silinder pengangkat lebih besar dari gaya di piston pompa.",
        1: "Bandingkan gaya di piston pompa dan di silinder pengangkat.",
        2: "Pakai hubungan antara tekanan, luas, dan gaya untuk membandingkan gaya di kedua bagian.",
      },
      {
        id: 4, name: "Volume",
        key: "Volume cairan yang berpindah di piston pompa sama besar dengan di silinder pengangkat.",
        1: "Bandingkan volume cairan yang berpindah di piston pompa dan di silinder pengangkat.",
        2: "Cairan berada dalam sistem tertutup. Pikirkan ke mana cairan dari piston pompa mengalir, lalu bandingkan volumenya.",
      },
      {
        id: 5, name: "Jarak gerak",
        key: "Jarak gerak silinder pengangkat lebih kecil dari jarak gerak piston pompa.",
        1: "Bandingkan jarak gerak piston pompa dan silinder pengangkat dalam satu langkah tekan.",
        2: "Pakai hasil perbandingan volume dan luas. Kalau volume yang berpindah sama tetapi luasnya berbeda, bagaimana jarak geraknya?",
      },
    ],
    complete:
      "Semua pernyataanmu tepat dan sudah lengkap. Ingat lagi cara yang kamu pakai tadi untuk membandingkan piston pompa dan silinder pengangkat. Cara itu akan berguna lagi di Tabel 3.",
    kcrNote:
      "Cocokkan dengan pernyataanmu tadi. Ingat lagi hasil Tabel 1 dan gambar, lalu perhatikan bagian yang tadi terlewat.",
  };

  /* =============================================================
   * TABEL 3. HUBUNGAN ANTARPARAMETER
   * ============================================================= */
  const COND3 = {
    tekanan: { text: "Pada tekanan yang sama,", q1: "luas penampang", q2: "gaya", same: true, type: "N1", core: 1 },
    volume: { text: "Pada volume cairan yang sama,", q1: "luas penampang", q2: "jarak gerak", same: false, type: "N2", core: 2 },
    luas: { text: "Pada luas penampang yang sama,", q1: "gaya", q2: "tekanan", same: true, type: "N3", core: 3 },
  };
  const DIR = { besar: "lebih besar", kecil: "lebih kecil" };
  const flip = (d) => (d === "besar" ? "kecil" : "besar");

  const T3 = {
    id: "t3",
    kind: "builder",
    short: "Tabel 3",
    title: "Tabel 3. Hubungan Antarparameter",
    lead: "Nyatakan hubungan antara luas penampang, gaya, jarak gerak, dan tekanan. Gunakan temuanmu di Tabel 1 dan Tabel 2.",
    tip: "Pilih kondisinya dulu. Besaran [1] dan [2] akan terisi otomatis. Cukup satu pernyataan untuk tiap kondisi.",
    slots: [
      { key: "cond", label: "Kondisi", options: Object.keys(COND3).map((k) => ({ v: k, text: COND3[k].text })) },
      { key: "q1", auto: (sel) => (sel.cond ? COND3[sel.cond].q1 : "besaran [1]") },
      { key: "d1", label: "Arah [1]", options: Object.keys(DIR).map((k) => ({ v: k, text: DIR[k] })) },
      { key: "berarti", fixed: "berarti" },
      { key: "q2", auto: (sel) => (sel.cond ? COND3[sel.cond].q2 : "besaran [2]") },
      { key: "d2", label: "Arah [2]", options: Object.keys(DIR).map((k) => ({ v: k, text: DIR[k] })) },
    ],
    sentence: (it) => {
      const c = COND3[it.cond];
      return `${c.text} ${c.q1} ${DIR[it.d1]} berarti ${c.q2} ${DIR[it.d2]}.`;
    },
    evaluate(it) {
      const c = COND3[it.cond];
      const ok = c.same ? it.d1 === it.d2 : it.d1 !== it.d2;
      return { ok, type: ok ? null : c.type, cores: ok ? [c.core] : [] };
    },
    correctFor(it) {
      const c = COND3[it.cond];
      return T3.sentence({ cond: it.cond, d1: it.d1, d2: c.same ? it.d1 : flip(it.d1) });
    },
    fixCore: (it) => COND3[it.cond].core,
    errors: {
      N1: {
        name: "Arah salah pada “tekanan yang sama”",
        1: "Lihat Tabel 2: tekanan di kedua bagian sama. Silinder pengangkat lebih luas. Gayanya dibanding piston pompa bagaimana?",
        2: "Bandingkan luas dan gaya kedua bagian di Tabel 2. Pernyataanmu harus sesuai dengan temuan itu.",
      },
      N2: {
        name: "Arah salah pada “volume cairan yang sama”",
        1: "Lihat jarak gerak kedua bagian di Tabel 2. Bagian yang lebih luas bergeraknya lebih jauh atau lebih dekat?",
        2: "Volume cairan yang berpindah di kedua bagian sama. Bandingkan luas dan jarak gerak keduanya di Tabel 2. Pernyataanmu harus sesuai dengan temuan itu.",
      },
      N3: {
        name: "Arah salah pada “luas penampang yang sama”",
        1: "Tekanan adalah gaya per satuan luas. Kalau luasnya sama, gaya yang lebih besar membuat tekanan jadi bagaimana?",
        2: "Bayangkan kamu menekan telapak tangan dengan jari, pelan lalu kuat. Luas yang tertekan sama. Tekanan mana yang lebih besar? Sesuaikan pernyataanmu.",
      },
    },
    cores: [
      {
        id: 1, name: "Luas dan gaya",
        key: "Pada tekanan yang sama, luas penampang lebih besar berarti gaya lebih besar.",
        1: "Masih ada hubungan antara luas dan gaya yang belum kamu sebut.",
        2: "Ingat hasil Tabel 2: tekanan di kedua bagian sama. Bagaimana hubungan luas dan gayanya?",
      },
      {
        id: 2, name: "Luas dan jarak gerak",
        key: "Pada volume cairan yang sama, luas penampang lebih besar berarti jarak gerak lebih kecil.",
        1: "Masih ada hubungan antara luas dan jarak gerak yang belum kamu sebut.",
        2: "Ingat hasil Tabel 2: volume cairan yang berpindah di kedua bagian sama. Bagaimana hubungan luas dan jarak geraknya?",
      },
      {
        id: 3, name: "Gaya dan tekanan",
        key: "Pada luas penampang yang sama, gaya lebih besar berarti tekanan lebih besar.",
        1: "Masih ada hubungan antara gaya dan tekanan yang belum kamu sebut.",
        2: "Pikirkan gaya yang berbeda diberikan pada permukaan dengan luas yang sama. Bagaimana hubungan gaya dan tekanannya?",
      },
    ],
    complete:
      "Semua pernyataanmu tepat dan sudah lengkap. Ingat lagi cara yang kamu pakai tadi untuk menemukan hubungan antarbesaran. Cara itu akan berguna lagi untuk menjawab kesimpulan.",
    kcrNote:
      "Cocokkan dengan pernyataanmu tadi. Ingat lagi hasil Tabel 1 dan 2, lalu perhatikan bagian yang tadi terlewat.",
  };

  /* =============================================================
   * KESIMPULAN
   * ============================================================= */
  const KES = {
    id: "kes",
    kind: "choice",
    short: "Kesimpulan",
    title: "Kesimpulan",
    lead: "Gunakan pernyataan-pernyataan yang sudah kamu susun di Tabel 1, 2, dan 3.",
    questions: [
      {
        key: "k",
        prompt: "Operator hanya menekan piston pompa dengan gaya kecil, tetapi silinder pengangkat dapat menghasilkan gaya yang jauh lebih besar karena...",
        options: [
          { v: "a", text: "Tekanan di piston pompa sama dengan tekanan di silinder pengangkat, dan luas silinder pengangkat lebih kecil daripada luas piston pompa." },
          { v: "b", text: "Tekanan di silinder pengangkat lebih besar daripada tekanan di piston pompa, dan luas silinder pengangkat lebih besar daripada luas piston pompa." },
          { v: "c", text: "Tekanan di piston pompa sama dengan tekanan di silinder pengangkat, dan luas silinder pengangkat lebih besar daripada luas piston pompa." },
          { v: "d", text: "Piston pompa bergerak lebih jauh daripada silinder pengangkat, sehingga gaya di silinder pengangkat lebih besar." },
        ],
        answer: "c",
      },
    ],
    // Kode jenis kesalahan untuk laporan guru
    codes: { a: "KS-a", b: "KS-b", d: "KS-d" },
    codeNames: {
      "KS-a": "Kesimpulan a: luas salah",
      "KS-b": "Kesimpulan b: tekanan salah",
      "KS-d": "Kesimpulan d: jarak gerak dianggap menentukan gaya",
    },
    feedback(sel, attempt) {
      const n = attempt >= 2 ? 2 : 1;
      const F = {
        a: {
          1: "Bagian tentang tekanan sudah tepat. Periksa bagian luas. Lihat angka luas kedua bagian pada gambar.",
          2: "Bagian tentang tekanan sudah tepat. Pada gambar, luas piston pompa 100 cm² dan luas total silinder pengangkat 5.000 cm², jadi silinder pengangkat lebih luas.",
        },
        b: {
          1: "Bagian tentang luas sudah tepat. Periksa bagian tekanan. Lihat kembali pernyataan tekanan yang kamu susun di Tabel 2.",
          2: "Bagian tentang luas sudah tepat. Piston pompa dan silinder pengangkat berada dalam satu cairan tertutup, sehingga tekanannya sama (Tabel 2). Yang berbeda adalah gayanya.",
        },
        c: { ok: true, 1: "Tepat. Tekanan di piston pompa sama dengan tekanan di silinder pengangkat. Karena luas silinder pengangkat jauh lebih besar, gaya yang dihasilkannya jauh lebih besar. Sebagai gantinya, silinder pengangkat bergerak lebih pendek daripada piston pompa." },
        d: {
          1: "Lihat kembali Tabel 3. Besaran apa saja yang menentukan gaya di silinder pengangkat?",
          2: "Jarak gerak yang lebih jauh tidak membuat gaya lebih besar. Yang berpengaruh pada gaya adalah tekanan dan luas penampang (Tabel 3). Gunakan keduanya untuk menjelaskan mengapa gaya di silinder pengangkat lebih besar.",
        },
      };
      const f = F[sel.k];
      if (f.ok) return { ok: true, marks: { k: true }, msgs: [{ tone: "ok", text: f[1] }], codes: [] };
      return { ok: false, marks: { k: false }, msgs: [{ tone: "bad", text: f[n] }], codes: [KES.codes[sel.k]] };
    },
    keyText: () => ["c. Tekanan di piston pompa sama dengan tekanan di silinder pengangkat, dan luas silinder pengangkat lebih besar daripada luas piston pompa."],
  };

  /* =============================================================
   * PELUANG
   * ============================================================= */
  const PEL = {
    id: "pel",
    kind: "choice",
    short: "Peluang",
    title: "Peluang",
    lead: "Enam kali pengoperasian jembatan mencatat gaya tekan pada piston pompa saat jembatan mulai terangkat. Hasilnya (N): 4.000 ; 4.000 ; 4.100 ; 4.000 ; 3.900 ; 4.000.",
    data: ["4.000", "4.000", "4.100", "4.000", "3.900", "4.000"],
    unit: "N",
    questions: [
      {
        key: "p1",
        label: "P.1 Jawaban",
        prompt: "Berapa peluang pengoperasian berikutnya memerlukan gaya 4.000 N?",
        // DRAF: teks pilihan a tidak tertulis di Excel, diambil dari umpan baliknya (4/6 atau 2/3).
        options: [
          { v: "a", text: "4/6 atau 2/3" },
          { v: "b", text: "1/3" },
          { v: "c", text: "1/2" },
          { v: "d", text: "Pasti 4.000 N (peluangnya 1)" },
        ],
        answer: "a",
      },
      {
        key: "p2",
        label: "P.2 Alasan",
        prompt: "Alasan jawabanmu:",
        // DRAF: teks pilihan alasan tidak tertulis di Excel, disusun dari umpan baliknya. Kuncinya b sesuai Excel.
        options: [
          { v: "a", text: "Hanya ada dua kemungkinan: gayanya 4.000 N atau bukan 4.000 N." },
          { v: "b", text: "Dari 6 data, ada 4 data yang bernilai 4.000 N." },
          { v: "c", text: "Jembatan dan pompanya sama, jadi gaya yang diperlukan pasti selalu sama." },
          { v: "d", text: "Gaya pada pengoperasian berikutnya tidak bisa diperkirakan karena setiap pengoperasian bisa berbeda." },
        ],
        answer: "b",
      },
    ],
    codeNames: {
      "P1-b": "P.1 b (1/3): tiap nilai dianggap sama peluangnya",
      "P1-c": "P.1 c (1/2): dua kemungkinan",
      "P1-d": "P.1 d (pasti)",
      "P2-ac": "P.2 a/c: alasan tidak memakai data",
      "P2-d": "P.2 d: data dianggap tidak bisa dipakai",
    },
    feedback(sel, attempt) {
      const n = attempt >= 2 ? 2 : 1;
      const p1ok = sel.p1 === "a", p2ok = sel.p2 === "b";
      const P1 = {
        b: { 1: "Hitung berapa kali tiap nilai muncul.", 2: "Nilai yang berbeda tidak otomatis sama peluangnya. Dari 6 data, 4.000 N muncul 4 kali, 4.100 N muncul 1 kali, dan 3.900 N muncul 1 kali." },
        c: { 1: "Gunakan banyaknya data yang muncul, bukan banyaknya pilihan.", 2: "Hasilnya bukan dua kemungkinan yang sama peluangnya. Peluang = banyak data bernilai 4.000 N : seluruh data." },
        d: { 1: "Hitung berapa data yang bernilai 4.000 N dari seluruh data.", 2: "Pengoperasian nyata bisa berbeda tipis dari 4.000 N (ada 3.900 dan 4.100 N), jadi hasilnya tidak pasti 4.000 N." },
      };
      const P2 = {
        a: { 1: "Alasannya belum tepat. Alasan yang tepat memakai data yang diberikan.", 2: "Alasannya belum tepat. Pilih alasan yang menyebut berapa data yang bernilai 4.000 N." },
        d: { 1: "Alasannya belum tepat. Data berulang dapat dipakai untuk memperkirakan peluang.", 2: "Alasannya belum tepat. Pilih alasan yang menyebut berapa data yang bernilai 4.000 N." },
      };
      P2.c = P2.a;
      const codes = [];
      if (!p1ok) codes.push("P1-" + sel.p1);
      if (!p2ok) codes.push(sel.p2 === "d" ? "P2-d" : "P2-ac");
      const marks = { p1: p1ok, p2: p2ok };

      if (p1ok && p2ok)
        return { ok: true, marks, codes, msgs: [{ tone: "ok", text: "Tepat. 4 dari 6 data bernilai 4.000 N, jadi peluangnya 4/6 atau 2/3." }] };
      if (p1ok)
        return { ok: false, marks, codes, msgs: [{ tone: "ok", text: "Jawabanmu tepat." }, { tone: "bad", text: P2[sel.p2][n] }] };
      const msgs = [{ tone: "bad", text: P1[sel.p1][n] }];
      if (p2ok) msgs.push({ tone: "ok", text: "Alasanmu sudah tepat. Gunakan alasan itu untuk menghitung jawabanmu." });
      else if (n === 2) msgs.push({ tone: "bad", text: P2[sel.p2][2] });
      return { ok: false, marks, codes, msgs };
    },
    keyText: () => [
      "P.1 Jawaban: a. 4/6 atau 2/3",
      "P.2 Alasan: b. Dari 6 data, ada 4 data yang bernilai 4.000 N.",
    ],
  };

  /* =============================================================
   * HALAMAN UTAMA
   * ============================================================= */
  const HERO_SUB =
    "Bukan sekadar menjawab. Di sini kamu menyusun sendiri pernyataan dari kotak-kotak pilihan, lalu memeriksanya. " +
    "Kamu punya 3 kesempatan. Jika belum tepat, kamu akan mendapat petunjuk untuk memperbaikinya.";

  const INTRO_STEPS = [
    { t: "Susun pernyataan", d: "Pilih satu kotak dari setiap kolom. Kamu juga bisa menyeret kotak ke tempatnya." },
    { t: "Tambahkan", d: "Masukkan pernyataanmu ke daftar pernyataan. Pernyataan bisa diubah atau dihapus. Kamu boleh memasukkan beberapa pernyataan sekaligus lalu memeriksanya, atau memeriksa satu per satu." },
    { t: "Periksa", d: "Tekan Periksa. Setiap pernyataan akan diberi tanda ✓ atau ✗." },
  ];

  const INTRO_NOTE =
    "Jika percobaan ke-3 masih belum tepat, jawaban yang tepat akan ditampilkan. " +
    "Skor: tepat di percobaan ke-1 = 4, ke-2 atau ke-3 = 3, setelah jawaban yang tepat ditampilkan = 2.";

  window.ILT_CONTENT = {
    MAIN_QUESTION,
    FIGURE,
    SCREENS: [T1, T2, T3, KES, PEL],
    HERO_SUB,
    INTRO_STEPS,
    INTRO_NOTE,
    // Nama jenis kesalahan untuk dasbor guru
    ERROR_NAMES: Object.assign(
      {},
      ...[T1, T2, T3].map((t) => Object.fromEntries(Object.entries(t.errors).map(([k, e]) => [k, e.name]))),
      KES.codeNames,
      PEL.codeNames
    ),
    SCORE_RULE: "Tepat di percobaan ke-1 = 4, ke-2 atau ke-3 = 3, setelah jawaban yang tepat ditampilkan = 2, belum selesai = 1.",
  };
})();
