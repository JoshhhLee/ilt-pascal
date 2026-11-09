/* ILT Hukum Pascal — dasbor guru */
(function () {
  "use strict";

  const C = window.ILT_CONTENT;
  const CFG = window.ILT_CONFIG;
  const CFG_MAX = CFG.maxAttempts || 3; // data contoh mengikuti aturan percobaan di config.js
  const CFG_FREE = CFG.freeIncompleteChecks || 3;
  const CODE_URL = "apps-script/Code.gs";
  const SCREENS = C.SCREENS;
  const $app = document.getElementById("app");
  const PW_KEY = "ilt-pascal-guru-pw"; // berbeda dari ILT lain di domain yang sama

  const G = { rows: [], demo: false, source: "", kelas: "", q: "", sort: "waktu", loading: false, error: "" };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const fmt1 = (n) => n.toFixed(1).replace(".", ",");
  const fmtDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };
  const minutes = (r) => (r.durationSec != null ? Math.round(r.durationSec / 60) : null);
  // File .json versi lama belum punya r.status: skor di atas 1 berarti layar itu selesai
  const statusOf = (r, id) => (r.status ? r.status[id] : r.scores[id] > 1 ? "selesai" : "belum selesai");
  const finishedLabel = (r) =>
    r.finishedAt ? fmtDate(r.finishedAt)
      : SCREENS.every((s) => statusOf(r, s.id) === "selesai") ? "Belum dikirim" : "Belum selesai";

  /* ---------------- sumber data ---------------- */
  async function loadServer(pw) {
    G.loading = true; G.error = ""; render();
    try {
      const url = `${CFG.scriptUrl}?action=list&key=${encodeURIComponent(pw)}`;
      const res = await fetch(url);
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "gagal memuat");
      G.rows = j.rows; G.demo = false; G.source = "Google Sheets";
      try { sessionStorage.setItem(PW_KEY, pw); } catch (e) { /* abaikan */ }
    } catch (err) {
      G.error = err.message === "password salah" ? "Password salah." : "Tidak bisa memuat data: " + err.message;
      try { sessionStorage.removeItem(PW_KEY); } catch (e) { /* abaikan */ }
    }
    G.loading = false; render();
  }

  function importFiles(files) {
    Promise.all([...files].map((f) => f.text().then((t) => JSON.parse(t)).catch(() => null))).then((list) => {
      const ok = list.flat().filter((r) => r && r.submissionId);
      const have = new Set(G.rows.map((r) => r.submissionId));
      ok.forEach((r) => { if (!have.has(r.submissionId)) G.rows.push(r); });
      if (!G.source) G.source = "file impor";
      toast(`${ok.length} file hasil diimpor.`);
      render();
    });
  }

  // Data contoh untuk melihat tampilan dasbor sebelum server diatur
  function demoRows() {
    const names = ["Aditya Pratama", "Bunga Lestari", "Citra Maharani", "Dimas Saputra", "Eka Wulandari", "Fajar Nugroho",
      "Gita Permata", "Hafiz Ramadhan", "Intan Sari", "Joko Susilo", "Kirana Putri", "Lutfi Hakim", "Maya Anggraini",
      "Nanda Kurniawan", "Oki Setiawan", "Putri Ayu", "Rizky Firmansyah", "Salsa Nabila", "Taufik Hidayat",
      "Umi Kalsum", "Vina Oktaviani", "Wahyu Hidayat", "Yusuf Maulana", "Zahra Aulia"];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const combos = (scr) => {
      const keys = scr.slots.filter((s) => s.options);
      let out = [{}];
      keys.forEach((s) => {
        const next = [];
        out.forEach((o) => s.options.forEach((opt) => {
          const it = { ...o, [s.key]: opt.v };
          if (!s.disabled || !s.disabled(it, opt)) next.push(it);
        }));
        out = next;
      });
      return out;
    };
    return names.map((nama, i) => {
      const skill = 0.35 + rnd() * 0.6;
      const start = new Date(Date.UTC(2026, 9, 28, 1, 0) + i * 37000);
      let t = start.getTime();
      const scores = {}, attempts = {}, keyShown = {}, status = {}, log = [];
      // Beberapa siswa contoh belum selesai saat kelas berakhir
      const stopAt = i % 8 === 5 ? 2 + (i % 3) : SCREENS.length;
      SCREENS.forEach((scr, si) => {
        if (si >= stopAt) { attempts[scr.id] = 0; keyShown[scr.id] = null; scores[scr.id] = 1; status[scr.id] = "belum selesai"; return; }
        let done = false, checks = 0, n = 0, incomplete = 0, solved = false;
        while (!done) {
          checks++; t += (40 + rnd() * 130) * 1000;
          const p = skill + n * 0.2;
          let st, fields;
          if (scr.kind === "builder") {
            const all = combos(scr).map((it) => ({ it, r: scr.evaluate(it) }));
            const good = all.filter((x) => x.r.ok), bad = all.filter((x) => !x.r.ok && !/^M[67]$/.test(x.r.type));
            const k = 2 + Math.floor(rnd() * 3);
            const chosen = [];
            for (let j = 0; j < k; j++) chosen.push(rnd() < p ? pick(good) : pick(bad));
            const uniq = [...new Map(chosen.map((x) => [scr.sentence(x.it), x])).values()];
            const wrong = uniq.filter((x) => !x.r.ok);
            const covered = new Set(uniq.filter((x) => x.r.ok).flatMap((x) => x.r.cores));
            st = wrong.length ? "wrong" : rnd() < p ? "complete" : "incomplete";
            if (st === "complete") scr.cores.forEach((c) => covered.add(c.id));
            const codes = [...new Set(wrong.map((x) => x.r.type))];
            fields = {
              items: uniq.map((x) => ({ text: scr.sentence(x.it), ok: x.r.ok, type: x.r.type })),
              codes: wrong.length ? codes : scr.cores.filter((c) => !covered.has(c.id)).map((c) => "B" + c.id),
              shown: st === "complete" ? ["C"] : codes.slice(0, 2),
            };
          } else {
            const sel = {};
            scr.questions.forEach((q) => { sel[q.key] = rnd() < p ? q.answer : pick(q.options.filter((o) => o.v !== q.answer)).v; });
            const r = scr.feedback(sel, n + 1);
            st = r.ok ? "complete" : "wrong";
            fields = { choice: sel, codes: r.codes, shown: r.codes.length ? r.codes : ["C"] };
          }
          const counted = st === "wrong" || (st === "incomplete" && ++incomplete > CFG_FREE);
          if (counted) n++;
          const key = counted && n >= CFG_MAX;
          solved = st === "complete";
          done = solved || key;
          log.push(Object.assign(fields, {
            screen: scr.id, periksa: checks, counted, attempt: counted ? n : null, at: new Date(t).toISOString(), status: st,
            keyShown: key, shown: key ? ["KCR"] : fields.shown, done, score: done ? (solved ? (n === 0 ? 4 : 3) : 2) : null,
          }));
        }
        attempts[scr.id] = n;
        scores[scr.id] = solved ? (n === 0 ? 4 : 3) : 2;
        keyShown[scr.id] = solved ? null : CFG_MAX;
        status[scr.id] = "selesai";
      });
      const crr = Math.round((scores.t1 + scores.t2 + scores.t3 + scores.kes) / 4);
      const finished = stopAt === SCREENS.length;
      return {
        submissionId: "demo-" + i, nama: nama + " (contoh)", kelas: i % 2 ? "XI IPA 1" : "XI IPA 2", absen: String(i + 1),
        startedAt: start.toISOString(), finishedAt: finished ? new Date(t).toISOString() : null, lastAt: new Date(t).toISOString(),
        durationSec: finished ? Math.round((t - start.getTime()) / 1000) : null,
        scores, attempts, keyShown, status, crr, pbr: scores.pel,
        errorCodes: [...new Set(log.flatMap((l) => l.codes).filter((c) => !/^B\d$/.test(c)))],
        log,
      };
    });
  }

  /* ---------------- tampilan ---------------- */
  function filtered() {
    const q = G.q.trim().toLowerCase();
    let rows = G.rows.filter((r) => (!G.kelas || r.kelas === G.kelas) && (!q || (r.nama || "").toLowerCase().includes(q)));
    const by = {
      waktu: (a, b) => new Date(b.finishedAt || b.lastAt || 0) - new Date(a.finishedAt || a.lastAt || 0),
      nama: (a, b) => a.nama.localeCompare(b.nama, "id"),
      crr: (a, b) => b.crr - a.crr || b.pbr - a.pbr,
      crrAsc: (a, b) => a.crr - b.crr || a.pbr - b.pbr,
    }[G.sort];
    return rows.sort(by);
  }

  function render() {
    $app.innerHTML = G.rows.length ? dashboard() : login();
  }

  function login() {
    const hasServer = !!CFG.scriptUrl;
    return `
<header class="topbar"><div class="brand"><span class="brand-mark">G</span><span><b>Dasbor Guru</b> · ILT Pascal</span></div></header>
<main class="g-login enter">
  <div class="card">
    <h1>Hasil siswa</h1>
    <p class="muted">Lihat skor, percobaan, dan jenis kesalahan siswa.</p>
    ${hasServer ? `
    <form id="pwForm">
      <label>Password guru<input type="password" name="pw" autocomplete="current-password" required></label>
      ${G.error ? `<p class="form-err">${esc(G.error)}</p>` : ""}
      <button class="btn-primary big" ${G.loading ? "disabled" : ""}>${G.loading ? "Memuat…" : "Masuk"}</button>
    </form>` : `
    <div class="g-warn">
      <b>Website belum dihubungkan ke Google Sheets.</b>
      <p>Kolom password baru muncul setelah ILT ini punya Google Sheet sendiri (langkahnya sama dengan Bab 4 Buku Panduan ILT Hidrostatis, tetapi Google Sheet dan kodenya dibuat baru untuk Pascal). Sementara itu, hasil siswa hanya tersimpan di perangkat masing-masing. Kamu tetap bisa melihat data contoh atau mengimpor file hasil siswa di bawah ini.</p>
      <div class="g-warn-act">
        <button class="btn-ghost small" data-act="copyCode">Salin kode Apps Script</button>
        <button class="btn-ghost small" data-act="showCode">Tampilkan kode</button>
      </div>
    </div>`}
    <div class="g-alt">
      <button class="btn-ghost" data-act="demo">Lihat data contoh</button>
      <label class="btn-ghost file-btn">Impor file hasil (.json)<input type="file" accept=".json,application/json" multiple data-import hidden></label>
    </div>
  </div>
</main>`;
  }

  function dashboard() {
    const rows = filtered();
    const kelasList = [...new Set(G.rows.map((r) => r.kelas))].sort();
    const n = rows.length;
    const keyPct = n ? Math.round((rows.filter((r) => SCREENS.some((s) => r.keyShown && r.keyShown[s.id])).length / n) * 100) : 0;

    // rata-rata skor per bagian
    const perScreen = SCREENS.map((s) => ({ s, v: avg(rows.map((r) => r.scores[s.id] || 1)), first: rows.filter((r) => r.scores[s.id] === 4).length }));
    // frekuensi kesalahan: banyak siswa yang pernah melakukan
    const freq = {};
    rows.forEach((r) => (r.errorCodes || []).forEach((c) => { freq[c] = (freq[c] || 0) + 1; }));
    const errs = Object.entries(freq).sort((a, b) => b[1] - a[1]);

    return `
<header class="topbar">
  <div class="brand"><span class="brand-mark">G</span><span><b>Dasbor Guru</b> · ILT Pascal</span></div>
  <div class="grow"></div>
  <div class="top-right">
    ${G.demo ? `<span class="g-badge">Data contoh</span>` : `<span class="g-badge src">${esc(G.source)}</span>`}
    ${!G.demo && CFG.scriptUrl ? `<button class="btn-ghost small" data-act="refresh">Muat ulang</button>` : ""}
    <button class="btn-ghost small" data-act="logout">Keluar</button>
  </div>
</header>
<main class="g-main enter">
  <div class="g-tools">
    <select data-filter="kelas" aria-label="Filter kelas"><option value="">Semua kelas</option>${kelasList.map((k) => `<option ${k === G.kelas ? "selected" : ""}>${esc(k)}</option>`).join("")}</select>
    <input type="search" data-filter="q" placeholder="Cari nama siswa…" value="${esc(G.q)}" aria-label="Cari nama">
    <select data-filter="sort" aria-label="Urutkan">
      ${[["waktu", "Terbaru"], ["nama", "Nama A–Z"], ["crr", "CRR tertinggi"], ["crrAsc", "CRR terendah"]].map(([v, t]) => `<option value="${v}" ${G.sort === v ? "selected" : ""}>${t}</option>`).join("")}
    </select>
    <div class="grow"></div>
    <label class="btn-ghost small file-btn">Impor .json<input type="file" accept=".json,application/json" multiple data-import hidden></label>
    <button class="btn-primary" data-act="csv">Unduh Excel (CSV)</button>
  </div>

  <section class="g-tiles">
    <div class="g-tile"><span>Siswa</span><b>${n}</b></div>
    <div class="g-tile"><span>Rata-rata CRR</span><b>${fmt1(avg(rows.map((r) => r.crr)))}<small>/4</small></b></div>
    <div class="g-tile"><span>Rata-rata PBR</span><b>${fmt1(avg(rows.map((r) => r.pbr)))}<small>/4</small></b></div>
    <div class="g-tile"><span>Pernah ditunjukkan jawaban</span><b>${keyPct}<small>%</small></b></div>
    <div class="g-tile"><span>Rata-rata durasi</span><b>${Math.round(avg(rows.map(minutes).filter((x) => x != null)))}<small> mnt</small></b></div>
  </section>

  <section class="g-grid">
    <div class="card">
      <h2>Rata-rata skor per bagian</h2>
      <p class="muted small">Skala 1–4. Angka kanan: siswa yang tepat di percobaan pertama.</p>
      <div class="bars">${perScreen.map(({ s, v, first }) => `
        <div class="bar-row"><span class="bar-name">${esc(s.short)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(v / 4) * 100}%"></span></span>
          <b class="bar-val">${fmt1(v)}</b><span class="bar-extra">${first}/${n}</span></div>`).join("")}
      </div>
    </div>
    <div class="card">
      <h2>Kesalahan yang paling sering</h2>
      <p class="muted small">Banyak siswa yang pernah melakukan jenis kesalahan ini.</p>
      ${errs.length ? `<div class="bars">${errs.slice(0, 10).map(([c, k]) => `
        <div class="bar-row err"><span class="bar-name"><b>${esc(c)}</b> ${esc(C.ERROR_NAMES[c] || "")}</span>
          <span class="bar-track"><span class="bar-fill warn" style="width:${(k / n) * 100}%"></span></span>
          <b class="bar-val">${Math.round((k / n) * 100)}%</b><span class="bar-extra">${k}</span></div>`).join("")}</div>`
        : `<p class="empty-note">Belum ada kesalahan tercatat.</p>`}
    </div>
  </section>

  <section class="card g-table-card">
    <h2>Daftar siswa</h2>
    <div class="g-table-wrap">
      <table class="g-table">
        <thead><tr><th>Nama</th><th>Kelas</th>${SCREENS.map((s) => `<th class="c">${esc(s.short)}</th>`).join("")}<th class="c">CRR</th><th class="c">PBR</th><th class="c">Durasi</th><th>Selesai</th></tr></thead>
        <tbody>${rows.map((r) => `
          <tr data-act="detail" data-id="${esc(r.submissionId)}" tabindex="0">
            <td><b>${esc(r.nama)}</b>${r.absen ? `<span class="muted"> · ${esc(r.absen)}</span>` : ""}</td>
            <td>${esc(r.kelas)}</td>
            ${SCREENS.map((s) => `<td class="c"><span class="sc s${r.scores[s.id]}" title="${statusOf(r, s.id) === "selesai" ? `${r.attempts[s.id]} percobaan terhitung${r.keyShown && r.keyShown[s.id] ? ", jawaban tepat ditampilkan" : ""}` : "belum selesai"}">${r.scores[s.id]}</span></td>`).join("")}
            <td class="c"><b>${r.crr}</b></td><td class="c"><b>${r.pbr}</b></td>
            <td class="c">${minutes(r) != null ? minutes(r) + "'" : "-"}</td>
            <td class="muted">${finishedLabel(r)}</td>
          </tr>`).join("")}</tbody>
      </table>
    </div>
    <p class="note">Skor: 4 = tepat di percobaan ke-1, 3 = ke-2 atau ke-3, 2 = jawaban yang tepat ditampilkan, 1 = belum selesai. Klik baris untuk melihat rincian.</p>
  </section>
</main>`;
  }

  function detail(r) {
    const blocks = SCREENS.map((s) => {
      const logs = (r.log || []).filter((l) => l.screen === s.id);
      const body = logs.length ? logs.map((l) => {
        const lines = l.items
          ? l.items.map((it) => `<li class="${it.ok ? "ok" : "bad"}"><span>${it.ok ? "✓" : "✗"}</span>${esc(it.text)}${it.type ? ` <em>${esc(it.type)}</em>` : ""}</li>`).join("")
          : Object.entries(l.choice || {}).map(([q, v]) => `<li><span>•</span>${esc(q.toUpperCase())}: ${esc(v)}</li>`).join("");
        return `<div class="att">
          <div class="att-head"><b>Periksa ${l.periksa ?? l.attempt}</b><span>${l.counted === false ? "Tidak dihitung" : `Percobaan ke-${l.attempt}`}</span><span class="st ${l.status}">${{ complete: "Tepat & lengkap", incomplete: "Belum lengkap", wrong: "Ada yang salah" }[l.status] || l.status}</span>${l.keyShown ? `<span class="st key">Jawaban tepat ditampilkan</span>` : ""}</div>
          <ul>${lines}</ul>
          ${l.shown && l.shown.length ? `<p class="muted small">Pesan: ${esc(l.shown.join(", "))}</p>` : ""}
        </div>`;
      }).join("") : `<p class="muted small">Belum dikerjakan.</p>`;
      return `<details class="d-screen" ${logs.length ? "open" : ""}><summary><b>${esc(s.title)}${statusOf(r, s.id) === "selesai" ? "" : " · belum selesai"}</b><span class="sc s${r.scores[s.id]}">${r.scores[s.id]}</span></summary>${body}</details>`;
    }).join("");
    modal(`
      <h2>${esc(r.nama)}</h2>
      <p class="muted">${esc(r.kelas)}${r.absen ? " · No. " + esc(r.absen) : ""} · ${fmtDate(r.startedAt)} – ${finishedLabel(r)}</p>
      <div class="d-scores"><span>CRR <b>${r.crr}</b></span><span>PBR <b>${r.pbr}</b></span></div>
      ${blocks}`);
  }

  function csv() {
    const rows = filtered();
    const head = ["Nama", "Kelas", "No. absen", "Mulai", "Selesai", "Durasi (menit)",
      ...SCREENS.map((s) => "Skor " + s.short), ...SCREENS.map((s) => "Status " + s.short), "CRR", "PBR",
      ...SCREENS.map((s) => "Percobaan " + s.short), "Jawaban tepat ditampilkan", "Jenis kesalahan"];
    const cell = (v) => {
      const s = String(v ?? "");
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [head, ...rows.map((r) => [
      r.nama, r.kelas, r.absen, fmtDate(r.startedAt), finishedLabel(r),
      r.durationSec != null ? fmt1(r.durationSec / 60) : "",
      ...SCREENS.map((s) => r.scores[s.id]), ...SCREENS.map((s) => statusOf(r, s.id)), r.crr, r.pbr,
      ...SCREENS.map((s) => r.attempts[s.id]),
      SCREENS.filter((s) => r.keyShown && r.keyShown[s.id]).map((s) => `${s.short} (${r.keyShown[s.id]})`).join(", "),
      (r.errorCodes || []).join(", "),
    ])].map((l) => l.map(cell).join(";"));
    // Pemisah ";" sesuai pengaturan Excel berbahasa Indonesia
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hasil-ILT-pascal${G.kelas ? "-" + G.kelas.replace(/\s+/g, "") : ""}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function fetchCode() {
    const res = await fetch(CODE_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("gagal memuat");
    return res.text();
  }

  async function showCode() {
    try {
      const code = await fetchCode();
      modal(`<h2>Kode Apps Script</h2>
        <p class="muted">Klik di dalam kotak, tekan Ctrl+A, lalu Ctrl+C. Setelah itu tempel di editor Apps Script.</p>
        <textarea class="code-box" readonly spellcheck="false" aria-label="Kode Apps Script">${esc(code)}</textarea>`);
    } catch (err) {
      toast("Kode gagal dimuat. Periksa internet lalu coba lagi.");
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(await fetchCode());
      toast("Kode tersalin. Tempel di editor Apps Script (Ctrl+V).");
    } catch (err) {
      showCode(); // browser menolak menyalin otomatis: tampilkan kodenya untuk disalin manual
    }
  }

  /* ---------------- modal & toast ---------------- */
  function modal(inner) {
    closeModal();
    const m = document.createElement("div");
    m.className = "modal-back";
    m.innerHTML = `<div class="modal wide" role="dialog" aria-modal="true"><button class="icon-btn modal-x" data-act="closeModal" aria-label="Tutup">✕</button>${inner}</div>`;
    m.addEventListener("click", (e) => { if (e.target === m) closeModal(); });
    document.body.appendChild(m);
    document.body.classList.add("noscroll");
  }
  function closeModal() {
    document.querySelectorAll(".modal-back").forEach((m) => m.remove());
    document.body.classList.remove("noscroll");
  }
  let tt;
  function toast(msg) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ---------------- events ---------------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    switch (b.dataset.act) {
      case "demo": G.rows = demoRows(); G.demo = true; G.source = "contoh"; render(); break;
      case "refresh": { let pw = ""; try { pw = sessionStorage.getItem(PW_KEY) || ""; } catch (e2) { /* abaikan */ } if (pw) loadServer(pw); break; }
      case "logout": G.rows = []; G.demo = false; G.source = ""; try { sessionStorage.removeItem(PW_KEY); } catch (e2) { /* abaikan */ } render(); break;
      case "csv": csv(); break;
      case "copyCode": copyCode(); break;
      case "showCode": showCode(); break;
      case "detail": detail(G.rows.find((r) => r.submissionId === b.dataset.id)); break;
      case "closeModal": closeModal(); break;
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
    if (e.key === "Enter" && e.target.matches && e.target.matches("tr[data-act]")) e.target.click();
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "pwForm") return;
    e.preventDefault();
    loadServer(new FormData(e.target).get("pw"));
  });
  document.addEventListener("input", (e) => {
    const f = e.target.dataset && e.target.dataset.filter;
    if (f === "q") {
      G.q = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const el = document.querySelector('[data-filter="q"]');
      el.focus(); el.setSelectionRange(pos, pos);
    }
  });
  document.addEventListener("change", (e) => {
    const f = e.target.dataset && e.target.dataset.filter;
    if (f === "kelas") { G.kelas = e.target.value; render(); }
    if (f === "sort") { G.sort = e.target.value; render(); }
    if (e.target.matches && e.target.matches("[data-import]")) importFiles(e.target.files);
  });

  render();
  let saved = "";
  try { saved = sessionStorage.getItem(PW_KEY) || ""; } catch (e) { /* abaikan */ }
  if (saved && CFG.scriptUrl) loadServer(saved);
})();
