/* ILT Hukum Pascal — aplikasi siswa */
(function () {
  "use strict";

  const C = window.ILT_CONTENT;
  const CFG = window.ILT_CONFIG;
  // Harus berbeda dari ILT lain: semua ILT berada di satu domain sehingga berbagi localStorage
  const STORE_KEY = "ilt-pascal-v1";
  const SCREENS = C.SCREENS;
  const ORDER = ["intro", ...SCREENS.map((s) => s.id), "done"];
  const BY_ID = Object.fromEntries(SCREENS.map((s) => [s.id, s]));
  const $app = document.getElementById("app");

  /* ---------------- state ---------------- */
  const uid = () =>
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

  function fresh() {
    return {
      v: 1, sessionId: uid(), student: null,
      startedAt: null, finishedAt: null,
      screen: "intro", data: {}, seq: 0, outbox: [], submitted: false, sendState: null,
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* mode privat */ }
  }
  let S = load() || fresh();

  function sd(id) {
    return S.data[id] || (S.data[id] = {
      items: [], sel: {}, checks: 0, attempts: 0, incomplete: 0, keyShown: null, done: false,
      score: null, feedback: null, log: [],
    });
  }

  /* ---------------- helpers ---------------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fill = (str, ctx) => String(str)
    .replace(/\{X\}/g, ctx.X ?? "").replace(/\{Y\}/g, ctx.Y ?? "");

  let toastTimer;
  function toast(msg) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  const ICON = {
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bad: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    hint: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    key: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    img: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v12h14V9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 13h10M12 13V4M8 4h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /* ---------------- gambar jembatan hidrolik ---------------- */
  function figure() {
    const F = C.FIGURE;
    const pos = (o) => `left:${o.x}%;top:${o.y}%`;
    const marks = F.marks.map((m) => `<span class="fig-mark fig-mark-${m.k}" style="${pos(m)}"></span>`).join("");
    // Label besar menggantikan tulisan pada gambar saat gambar tampil kecil (diatur CSS @container)
    const labels = F.labels.map((l) => `<span class="fig-lb" style="${pos(l)}" aria-hidden="true">${l.t.map(esc).join("<br>")}</span>`).join("");
    return `<div class="bridge"><img src="${F.src}" width="${F.w}" height="${F.h}" decoding="sync" alt="${esc(F.alt)}">${marks}${labels}</div>`;
  }

  // Sorot bagian jembatan pada gambar sesuai kotak yang dipilih
  let hoverHL = null;
  function applyHL() {
    const set = new Set();
    const id = S.screen;
    const scr = BY_ID[id];
    if (scr && scr.kind === "builder") {
      const sel = sd(id).sel;
      scr.slots.forEach((sl) => {
        if (!sl.options || !sel[sl.key]) return;
        const o = sl.options.find((o) => o.v === sel[sl.key]);
        if (o && o.hl) set.add(o.hl);
      });
    }
    if (hoverHL) set.add(hoverHL);
    const keys = [...new Set(C.FIGURE.marks.map((m) => m.k))];
    document.querySelectorAll(".bridge").forEach((el) => {
      keys.forEach((k) => el.classList.toggle("hl-" + k, set.has(k)));
    });
  }

  /* ---------------- kerangka halaman ---------------- */
  let lastScreen = null;
  function render() {
    const id = S.screen;
    document.body.dataset.screen = id;
    let html = topbar();
    if (id === "intro") html += introView();
    else if (id === "done") html += doneView();
    else html += taskLayout(BY_ID[id]);
    $app.innerHTML = html;
    // Animasi masuk hanya saat berpindah layar, bukan di setiap klik
    if (id === lastScreen) $app.querySelectorAll(".enter").forEach((el) => el.classList.remove("enter"));
    lastScreen = id;
    measureSticky();
    applyHL();
    save();
  }

  function topbar() {
    const idx = ORDER.indexOf(S.screen);
    const steps = SCREENS.map((s, i) => {
      const pos = i + 1;
      const d = S.data[s.id];
      const cls = S.screen === s.id ? "current" : d && d.done ? "done" : pos < idx ? "done" : "";
      return `<li class="step ${cls}"><span class="step-n">${d && d.done && S.screen !== s.id ? ICON.ok : pos}</span><span class="step-t">${esc(s.short)}</span></li>`;
    }).join("");
    const showSteps = S.screen !== "intro";
    return `
<header class="topbar">
  <div class="brand"><span class="brand-mark" aria-hidden="true">${ICON.img}</span><span><b>ILT</b> Pascal</span></div>
  ${showSteps ? `<ol class="stepper" aria-label="Kemajuan">${steps}</ol>` : `<div class="grow"></div>`}
  <div class="top-right">
    ${S.student && !S.submitted ? `<button class="btn-ghost small" data-act="exit">Keluar</button>` : ""}
  </div>
</header>
${showSteps && S.screen !== "done" ? `<div class="progress"><span style="width:${Math.round(((idx - 1) / SCREENS.length) * 100)}%"></span></div>` : ""}`;
  }

  /* ---------------- layar 0: pengantar ---------------- */
  function introView() {
    const parts = [
      ["Tabel 1", "Mendeskripsikan gambar"],
      ["Tabel 2", "Membandingkan besaran pada piston pompa dan silinder pengangkat"],
      ["Tabel 3", "Hubungan antarbesaran"],
      ["Kesimpulan", "Memilih alasan yang tepat"],
      ["Peluang", "Membaca data pengoperasian jembatan"],
    ];
    const st = S.student || {};
    return `
<main class="intro enter">
  <section class="hero">
    <div class="hero-text">
      <p class="eyebrow">Interactive Learning Task · Fisika</p>
      <h1>Hukum Pascal</h1>
      <p class="hero-sub">${esc(C.HERO_SUB)}</p>
      <div class="question-card">
        <div class="qc-label">Soal utama</div>
        <p>${esc(C.MAIN_QUESTION)}</p>
      </div>
    </div>
    <figure class="hero-fig">${figure()}<figcaption>Jembatan hidrolik</figcaption></figure>
  </section>

  <section class="how">
    <h2>Cara mengerjakan</h2>
    <ol class="how-steps">
      ${C.INTRO_STEPS.map((s, i) => `<li><span class="how-n">${i + 1}</span><div><b>${esc(s.t)}</b><p>${esc(s.d)}</p></div></li>`).join("")}
    </ol>
    <div class="demo" aria-hidden="true">
      <span class="demo-chip c1">Batu</span><span class="demo-chip c2">lebih berat dari</span><span class="demo-chip c3">kapas</span>
      <span class="demo-check">${ICON.ok}</span>
    </div>
  </section>

  <section class="plan">
    <h2>Yang akan kamu kerjakan</h2>
    <ol class="plan-list">${parts.map((p, i) => `<li><span class="plan-n">${i + 1}</span><b>${p[0]}</b><span>${p[1]}</span></li>`).join("")}</ol>
    <p class="note">${esc(C.INTRO_NOTE)}</p>
  </section>

  <section class="start card">
    <h2>Isi identitasmu</h2>
    <form id="startForm" novalidate>
      <label>Nama lengkap<input name="nama" autocomplete="name" required value="${esc(st.nama)}" placeholder="contoh: Siti Rahmawati"></label>
      <div class="row2">
        <label>Kelas<input name="kelas" required value="${esc(st.kelas)}" placeholder="contoh: XI IPA 2"></label>
        <label>No. absen<input name="absen" inputmode="numeric" value="${esc(st.absen)}" placeholder="contoh: 17"></label>
      </div>
      <p class="form-err" id="formErr" role="alert"></p>
      <button class="btn-primary big" type="submit">Mulai ${ICON.arrow}</button>
    </form>
  </section>
</main>`;
  }

  /* ---------------- layar tugas ---------------- */
  function taskLayout(scr) {
    return `
<main class="layout enter">
  <aside class="side">
    <div class="card fig-card">${figure()}<div class="fig-foot"><p class="fig-cap">Bagian yang kamu pilih akan tersorot di gambar.</p><button class="btn-ghost small" data-act="showFig">Perbesar</button></div></div>
    ${notesCard()}
  </aside>
  <section class="task">
    <div class="task-head">
      <p class="eyebrow">Bagian ${SCREENS.indexOf(scr) + 1} dari ${SCREENS.length}</p>
      <h1>${esc(scr.title)}</h1>
      <div class="question-card">
        <div class="qc-label">Soal utama</div>
        <p>${esc(C.MAIN_QUESTION)}</p>
      </div>
      <p class="lead">${esc(scr.lead)}</p>
      ${scr.id === "pel" ? dataStrip(scr) : ""}
    </div>
    ${figDock()}
    ${scr.kind === "builder" ? builderView(scr) : choiceView(scr)}
  </section>
</main>`;
  }

  // HP/tablet: gambar kecil yang ikut menempel di atas layar selama siswa bernalar
  // (di laptop gambar sudah selalu tampil di kolom kiri, jadi ini disembunyikan lewat CSS)
  function figDock() {
    if (S.figHidden) {
      return `<div class="fig-dock closed"><span class="fd-ic">${ICON.img}</span><span class="fd-t">Gambar disembunyikan</span>
        <button class="btn-ghost small" data-act="figToggle">Tampilkan gambar</button></div>`;
    }
    return `<div class="fig-dock">${figure()}
      <div class="fd-btns">
        <button class="btn-ghost small" data-act="showFig">Perbesar</button>
        <button class="btn-ghost small" data-act="figToggle">Sembunyikan</button>
      </div></div>`;
  }

  // Tinggi top bar + gambar yang menempel, supaya scrollIntoView tidak tertutup keduanya
  function measureSticky() {
    const root = document.documentElement.style;
    const tb = document.querySelector(".topbar");
    const dock = document.querySelector(".fig-dock");
    root.setProperty("--topbar-h", (tb ? tb.offsetHeight : 0) + "px");
    root.setProperty("--dock-h", (dock && dock.offsetParent ? dock.offsetHeight : 0) + "px");
  }
  window.addEventListener("resize", measureSticky);

  function dataStrip(scr) {
    return `<div class="datastrip" aria-label="Data gaya tekan">${scr.data.map((v, i) => `<span class="datum" style="--i:${i}"><small>Ke-${i + 1}</small>${v}</span>`).join("")}<span class="unit">${esc(scr.unit)}</span></div>`;
  }

  // Ringkasan pernyataan benar dari tabel sebelumnya
  function notesCard() {
    const blocks = SCREENS.filter((s) => s.kind === "builder" && s.id !== S.screen)
      .map((s) => {
        const d = S.data[s.id];
        if (!d || !d.done) return "";
        const ok = d.items.filter((it) => it.status === "ok").map((it) => s.sentence(it));
        if (d.keyShown) d.kcrCores && d.kcrCores.forEach((k) => ok.includes(k) || ok.push(k));
        if (!ok.length) return "";
        return `<details open><summary>${esc(s.short)}</summary><ul>${ok.map((t) => `<li>${ICON.ok}<span>${esc(t)}</span></li>`).join("")}</ul></details>`;
      }).join("");
    if (!blocks) return "";
    return `<div class="card notes"><h3>Catatanmu</h3>${blocks}</div>`;
  }

  /* ---------- penyusun pernyataan ---------- */
  function builderView(scr) {
    const d = sd(scr.id);
    const locked = d.done;
    const optSlots = scr.slots.filter((s) => s.options);
    const ready = optSlots.every((s) => d.sel[s.key]);

    const strip = scr.slots.map((sl) => {
      if (sl.fixed) return `<span class="word">${esc(sl.fixed)}</span>`;
      if (sl.auto) return `<span class="word auto ${d.sel.cond ? "" : "ph"}">${esc(sl.auto(d.sel))}</span>`;
      const o = sl.options.find((o) => o.v === d.sel[sl.key]);
      return o
        ? `<button class="slot filled" data-act="unpick" data-slot="${sl.key}" data-drop="${sl.key}" title="Ketuk untuk mengosongkan">${esc(o.text)}</button>`
        : `<span class="slot empty" data-drop="${sl.key}">${esc(sl.label)}</span>`;
    }).join("");

    const groups = optSlots.map((sl, gi) => `
      <div class="group">
        <div class="group-label"><span>${gi + 1}</span>${esc(sl.label)}</div>
        <div class="chips">${sl.options.map((o) => {
          const dis = sl.disabled && sl.disabled(d.sel, o);
          const on = d.sel[sl.key] === o.v;
          return `<button class="chip ${on ? "on" : ""}" draggable="${dis ? "false" : "true"}" data-act="pick" data-slot="${sl.key}" data-v="${o.v}" ${o.hl ? `data-hl="${o.hl}"` : ""} ${dis ? "disabled" : ""} aria-pressed="${on}">${esc(o.text)}</button>`;
        }).join("")}</div>
      </div>`).join("");

    const items = d.items.map((it, i) => `
      <li class="item ${it.status || "new"}">
        <span class="item-badge" aria-label="${it.status === "ok" ? "benar" : it.status === "bad" ? "salah" : "belum diperiksa"}">${it.status === "ok" ? ICON.ok : it.status === "bad" ? ICON.bad : i + 1}</span>
        <span class="item-text">${esc(scr.sentence(it))}</span>
        ${locked ? "" : `<span class="item-act">
          <button class="icon-btn" data-act="edit" data-i="${i}" aria-label="Ubah pernyataan">${ICON.edit}</button>
          <button class="icon-btn" data-act="remove" data-i="${i}" aria-label="Hapus pernyataan">${ICON.x}</button></span>`}
      </li>`).join("");

    return `
${locked ? "" : `
<div class="card builder">
  <div class="card-head"><h2>Susun pernyataan</h2><span class="tip-toggle" tabindex="0" title="${esc(scr.tip)}">?</span></div>
  <p class="tip">${esc(scr.tip)}</p>
  <div class="strip ${ready ? "ready" : ""}" aria-live="polite">${strip}</div>
  <div class="groups">${groups}</div>
  ${scr.note ? `<p class="note">${esc(scr.note)}</p>` : ""}
  <div class="row-actions">
    <button class="btn-ghost" data-act="clearSel" ${Object.keys(d.sel).length ? "" : "disabled"}>Kosongkan</button>
    <button class="btn-primary" data-act="add" ${ready ? "" : "disabled"}>+ Tambahkan pernyataan</button>
  </div>
</div>`}
<div class="card answers">
  <div class="card-head"><h2>Daftar pernyataan</h2><span class="count">${d.items.length}</span></div>
  ${d.items.length ? `<ol class="items">${items}</ol>` : `<p class="empty-note">Belum ada pernyataan. Susun pernyataan di atas, lalu tekan “Tambahkan pernyataan”.</p>`}
</div>
${checkBlock(scr, d)}`;
  }

  /* ---------- pilihan ganda (Kesimpulan, Peluang) ---------- */
  function choiceView(scr) {
    const d = sd(scr.id);
    const locked = d.done;
    const qs = scr.questions.map((q) => {
      const mark = d.feedback && d.feedback.marks ? d.feedback.marks[q.key] : undefined;
      return `
      <div class="card q">
        ${q.label ? `<div class="q-label">${esc(q.label)}</div>` : ""}
        <h2 class="q-prompt">${esc(q.prompt)}</h2>
        <div class="options" role="radiogroup" aria-label="${esc(q.prompt)}">
          ${q.options.map((o) => {
            const on = d.sel[q.key] === o.v;
            const st = on && mark !== undefined && d.feedback.selSnap && d.feedback.selSnap[q.key] === o.v ? (mark ? "ok" : "bad") : "";
            return `<button class="option ${on ? "on" : ""} ${st}" role="radio" aria-checked="${on}" data-act="choose" data-q="${q.key}" data-v="${o.v}" ${locked ? "disabled" : ""}>
              <span class="opt-letter">${st === "ok" ? ICON.ok : st === "bad" ? ICON.bad : o.v}</span><span>${esc(o.text)}</span></button>`;
          }).join("")}
        </div>
      </div>`;
    }).join("");
    return qs + checkBlock(scr, d);
  }

  /* ---------- periksa, umpan balik ---------- */
  function checkBlock(scr, d) {
    const nextLabel = ORDER[ORDER.indexOf(scr.id) + 1] === "done" ? "Lihat hasil" : "Lanjut";
    const fb = d.feedback ? feedbackView(d.feedback) : "";
    if (d.done) {
      return `${fb}<div class="next-bar"><button class="btn-primary big" data-act="next">${nextLabel} ${ICON.arrow}</button></div>`;
    }
    return `
${fb}
<div class="card checkcard">
  <div class="check-row">
    <span class="attempt-note">${d.attempts ? `Percobaan ${d.attempts} dari ${CFG.maxAttempts}` : `Kesempatan: ${CFG.maxAttempts} percobaan`}</span>
    <button class="btn-primary big" data-act="check">Periksa</button>
  </div>
</div>`;
  }

  function feedbackView(fb) {
    const msgs = fb.msgs.map((m) => `
      <div class="msg ${m.tone}"><span class="msg-ic">${ICON[m.tone] || ICON.hint}</span><p>${esc(m.text)}</p></div>`).join("");
    const kcr = fb.kcr ? `
      <div class="kcr">
        <div class="kcr-head">${ICON.key}<b>${esc(fb.kcr.title)}</b></div>
        ${fb.kcr.fixes && fb.kcr.fixes.length ? `<ul class="kcr-list">${fb.kcr.fixes.map((f) => `<li><s>${esc(f.from)}</s>${f.to ? `<span>${esc(f.to)}</span>` : `<em>${esc(f.why)}</em>`}</li>`).join("")}</ul>` : ""}
        ${fb.kcr.lines && fb.kcr.lines.length ? `<ul class="kcr-list plain">${fb.kcr.lines.map((t) => `<li><span>${esc(t)}</span></li>`).join("")}</ul>` : ""}
        ${fb.kcr.note ? `<p class="kcr-note">${esc(fb.kcr.note)}</p>` : ""}
      </div>` : "";
    const title = fb.status === "complete" ? "Hebat!"
      : fb.kcr ? (fb.status === "incomplete" ? "Belum lengkap" : "Belum tepat")
      : fb.status === "incomplete" ? "Hampir lengkap" : "Coba periksa lagi";
    const label = fb.counted ? `Percobaan ke-${fb.attempt}` : fb.status === "incomplete" ? "Tidak dihitung sebagai percobaan" : "";
    return `
<div class="card feedback ${fb.status}" id="feedback" aria-live="polite">
  <div class="fb-head"><span class="fb-title">${title}</span><span class="fb-att">${label}</span></div>
  ${msgs}${kcr}
</div>`;
  }

  /* ---------------- pemeriksaan ---------------- */
  // Aturan percobaan: hanya Periksa yang menemukan ✗ yang dihitung. "Benar tetapi belum lengkap"
  // tidak dihitung sampai batas freeIncompleteChecks, mulai yang berikutnya dihitung 1 percobaan.
  function applyCheck(d, status) {
    let counted = status === "wrong";
    if (status === "incomplete") {
      d.incomplete++;
      counted = d.incomplete > CFG.freeIncompleteChecks;
    }
    d.checks++;
    if (counted) d.attempts++;
    const showKey = counted && d.attempts >= CFG.maxAttempts;
    if (status === "complete") { d.score = d.attempts === 0 ? 4 : 3; d.done = true; }
    else if (showKey) { d.keyShown = d.attempts; d.score = 2; d.done = true; }
    return { counted, showKey };
  }

  // Satu catatan per Periksa; dikirim ke Google Sheets saat itu juga
  function record(scr, d, fields) {
    const entry = Object.assign({
      screen: scr.id, periksa: d.checks, attempt: fields.counted ? d.attempts : null,
      at: new Date().toISOString(), done: d.done, score: d.done ? d.score : null,
    }, fields);
    d.log.push(entry);
    if (CFG.scriptUrl) S.outbox.push({ type: "check", seq: ++S.seq, entry });
  }

  function checkBuilder(scr) {
    const d = sd(scr.id);
    if (!d.items.length) return toast("Susun minimal satu pernyataan dulu, ya.");
    // Pesan tingkat 1 selama belum ada percobaan terhitung, tingkat 2 bila sudah ada
    const n = d.attempts === 0 ? 1 : 2;
    const res = d.items.map((it) => ({ it, r: scr.evaluate(it) }));
    res.forEach(({ it, r }) => { it.status = r.ok ? "ok" : "bad"; });
    const wrong = res.filter((x) => !x.r.ok);
    const covered = new Set(res.filter((x) => x.r.ok).flatMap((x) => x.r.cores));
    const missing = scr.cores.filter((c) => !covered.has(c.id));

    let status, msgs = [];
    const types = [];
    wrong.forEach((w) => { if (!types.find((t) => t.type === w.r.type)) types.push({ type: w.r.type, first: w }); });
    if (wrong.length) {
      status = "wrong";
      types.slice(0, 2).forEach(({ type, first }) => {
        const ctx = first.r.ctx || { X: first.it.x, Y: first.it.y };
        msgs.push({ tone: "bad", code: type, text: fill(scr.errors[type][n], ctx) });
      });
    } else if (missing.length) {
      status = "incomplete";
      msgs.push({ tone: "ok", code: "OK", text: "Pernyataanmu tepat." });
      missing.slice(0, 2).forEach((c) => msgs.push({ tone: "hint", code: "B" + c.id, text: c[n] }));
    } else {
      status = "complete";
      msgs.push({ tone: "ok", code: "C", text: scr.complete });
    }

    const { counted, showKey } = applyCheck(d, status);
    let kcr = null;
    if (showKey) {
      // to = null: tidak ada versi tepat untuk pernyataan itu (mis. tekanan vs gaya); tampilkan alasannya
      const fixes = wrong.map((w) => ({ from: scr.sentence(w.it), to: scr.correctFor(w.it), why: w.r.why || "" }));
      const fixedTo = new Set(fixes.map((f) => f.to));
      // Hal inti yang sudah terwakili oleh perbaikan di atas tidak ditulis dua kali
      const fixedCores = new Set(wrong.map((w) => (scr.fixCore ? scr.fixCore(w.it) : null)));
      kcr = {
        title: "Pernyataan yang tepat",
        fixes,
        lines: missing.filter((c) => !fixedTo.has(c.key) && !fixedCores.has(c.id)).map((c) => c.key),
        note: scr.kcrNote,
      };
      d.kcrCores = missing.map((c) => c.key);
      // Kunci menggantikan umpan balik (tidak muncul bersamaan); hanya pesan "sudah tepat" yang tersisa
      msgs = msgs.filter((m) => m.tone === "ok");
    }

    d.feedback = { attempt: d.attempts, counted, status, msgs, kcr };
    record(scr, d, {
      counted, status,
      items: res.map(({ it, r }) => ({ text: scr.sentence(it), ok: r.ok, type: r.type })),
      codes: types.map((t) => t.type).concat(wrong.length ? [] : missing.map((c) => "B" + c.id)),
      shown: msgs.map((m) => m.code).concat(kcr ? ["KCR"] : []),
      keyShown: !!kcr,
    });
    afterCheck();
  }

  function checkChoice(scr) {
    const d = sd(scr.id);
    const unanswered = scr.questions.filter((q) => !d.sel[q.key]);
    if (unanswered.length) return toast(scr.questions.length > 1 ? "Pilih jawaban dan alasannya dulu, ya." : "Pilih salah satu jawaban dulu, ya.");
    const r = scr.feedback(d.sel, d.attempts + 1);
    const status = r.ok ? "complete" : "wrong";
    const { counted, showKey } = applyCheck(d, status);
    const kcr = showKey ? { title: "Jawaban yang tepat", lines: scr.keyText() } : null;
    // Kunci menggantikan umpan balik (tidak muncul bersamaan); hanya pesan "sudah tepat" yang tersisa
    const msgs = kcr ? r.msgs.filter((m) => m.tone === "ok") : r.msgs;
    d.feedback = { attempt: d.attempts, counted, status, msgs, marks: r.marks, selSnap: { ...d.sel }, kcr };
    record(scr, d, {
      counted, status,
      choice: { ...d.sel }, codes: r.codes, shown: kcr ? ["KCR"] : r.codes.length ? r.codes : ["C"], keyShown: !!kcr,
    });
    afterCheck();
  }

  function afterCheck() {
    render();
    const fb = document.getElementById("feedback");
    if (fb) {
      fb.classList.add("pop");
      fb.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    flush();
  }

  function go(id) {
    S.screen = id;
    if (id === "done" && !S.finishedAt) S.finishedAt = new Date().toISOString();
    hoverHL = null;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------- layar selesai ---------------- */
  function results(session) {
    const scores = {}, attempts = {}, keyShown = {}, status = {};
    SCREENS.forEach((s) => {
      const d = session.data[s.id];
      // Layar tanpa catatan selesai: skor 1, status "belum selesai"
      scores[s.id] = d && d.score != null ? d.score : 1;
      attempts[s.id] = d ? d.attempts : 0;
      keyShown[s.id] = d && d.keyShown ? d.keyShown : null;
      status[s.id] = d && d.done ? "selesai" : "belum selesai";
    });
    const crr = Math.round((scores.t1 + scores.t2 + scores.t3 + scores.kes) / 4);
    const pbr = scores.pel;
    return { scores, attempts, keyShown, status, crr, pbr };
  }

  function doneView() {
    const R = results(S);
    const nama = S.student ? S.student.nama.split(" ")[0] : "";
    const rows = SCREENS.map((s) => {
      const sc = R.scores[s.id];
      const d = S.data[s.id];
      const note = !d || !d.done ? "Belum selesai" : d.keyShown ? "Jawaban yang tepat ditampilkan" : `Tepat di percobaan ke-${d.attempts + 1}`;
      return `<li class="res-row s${sc}">
        <span class="res-name">${esc(s.short)}</span>
        <span class="res-note">${note}</span>
        <span class="pips" aria-label="Skor ${sc} dari 4">${[1, 2, 3, 4].map((k) => `<i class="${k <= sc ? "on" : ""}"></i>`).join("")}</span>
        <b class="res-score">${sc}</b>
      </li>`;
    }).join("");
    const offline = !CFG.scriptUrl;
    const st = S.sendState;
    return `
<main class="finish enter">
  <section class="done-hero">
    <div class="burst" aria-hidden="true">${"<i></i>".repeat(12)}</div>
    <p class="eyebrow">Selesai</p>
    <h1>Kerja bagus${nama ? ", " + esc(nama) : ""}!</h1>
    <p class="hero-sub">Ini hasil penalaranmu di setiap bagian.</p>
  </section>

  <section class="res-grid">
    <div class="card big-score">
      <span class="bs-label">Penalaran ilmiah</span>
      <b class="bs-val">${R.crr}<small>/4</small></b>
      <span class="bs-sub">Rata-rata Tabel 1–3 dan Kesimpulan (CRR)</span>
    </div>
    <div class="card big-score alt">
      <span class="bs-label">Penalaran peluang</span>
      <b class="bs-val">${R.pbr}<small>/4</small></b>
      <span class="bs-sub">Skor bagian Peluang (PBR)</span>
    </div>
  </section>

  <section class="card">
    <h2>Rincian per bagian</h2>
    <ol class="res-list">${rows}</ol>
    <p class="note">${esc(C.SCORE_RULE)}</p>
  </section>

  <section class="card send">
    ${S.submitted
      ? `<div class="sent">${ICON.ok}<div><b>${offline ? "Hasil tersimpan di perangkat ini" : "Hasilmu sudah terkirim ke guru"}</b><p class="muted">${offline ? "Mode uji coba: server guru belum diatur. Unduh file hasil di bawah bila diperlukan." : "Terima kasih sudah mengerjakan dengan sungguh-sungguh."}</p></div></div>
         <div class="row-actions"><button class="btn-ghost" data-act="download">Unduh file hasil</button><button class="btn-primary" data-act="newStudent">Selesai</button></div>`
      : `<p>Tekan tombol di bawah untuk mengirim hasilmu ke guru.</p>
         ${st && st.error ? `<p class="form-err">Gagal mengirim: ${esc(st.error)}. Periksa internet lalu coba lagi, atau unduh file hasil dan serahkan ke guru.</p>` : ""}
         <div class="row-actions">
           ${st && st.error ? `<button class="btn-ghost" data-act="download">Unduh file hasil</button>` : ""}
           <button class="btn-primary big" data-act="submit" ${st && st.sending ? "disabled" : ""}>${st && st.sending ? "Mengirim…" : "Kirim ke guru"}</button>
         </div>`}
  </section>
</main>`;
  }

  function payload(session, item) {
    const R = results(session);
    const log = SCREENS.flatMap((s) => (session.data[s.id] ? session.data[s.id].log : []));
    const codes = [...new Set(log.flatMap((l) => (l.codes || []).filter((c) => !/^B\d$/.test(c))))];
    const start = session.startedAt ? new Date(session.startedAt) : null;
    const end = session.finishedAt ? new Date(session.finishedAt) : null;
    return {
      submissionId: session.sessionId,
      type: item ? item.type : "file", seq: item ? item.seq : session.seq, entry: item ? item.entry : null,
      nama: session.student.nama, kelas: session.student.kelas, absen: session.student.absen || "",
      startedAt: session.startedAt, finishedAt: session.finishedAt,
      lastAt: log.length ? log[log.length - 1].at : session.startedAt,
      durationSec: start && end ? Math.round((end - start) / 1000) : null,
      scores: R.scores, attempts: R.attempts, keyShown: R.keyShown, status: R.status,
      crr: R.crr, pbr: R.pbr,
      errorCodes: codes,
      log,
    };
  }

  /* ---------------- pengiriman ke Google Sheets ----------------
   * Setiap Periksa masuk antrean dan dikirim berurutan. Bila internet putus, antrean
   * tersimpan di perangkat dan dikirim lagi otomatis. Nomor kiriman (seq) mencegah data ganda.
   */
  async function post(body) {
    try {
      const res = await fetch(CFG.scriptUrl, { method: "POST", body });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "server menolak data");
    } catch (err) {
      // Bila respons tidak bisa dibaca (CORS), kirim ulang tanpa membaca respons.
      if (!(err instanceof TypeError)) throw err;
      await fetch(CFG.scriptUrl, { method: "POST", body, mode: "no-cors" });
    }
  }

  async function drain(session) {
    try {
      while (session.outbox.length) {
        await post(JSON.stringify(payload(session, session.outbox[0])));
        session.outbox.shift();
        if (session === S) save();
      }
      return null;
    } catch (err) {
      return err instanceof TypeError ? "tidak ada koneksi" : err.message;
    }
  }

  let flushing = null;
  function flush() {
    if (!CFG.scriptUrl) return Promise.resolve(null);
    if (!flushing) flushing = drain(S).finally(() => { flushing = null; });
    return flushing;
  }
  window.addEventListener("online", flush);
  setInterval(flush, 20000);

  async function submit() {
    if (!CFG.scriptUrl) { S.submitted = true; S.sendState = null; render(); return; }
    if (!S.outbox.some((x) => x.type === "finish")) S.outbox.push({ type: "finish", seq: ++S.seq, entry: null });
    S.sendState = { sending: true }; render();
    const error = await flush();
    if (S.outbox.length) { S.sendState = { error: error || "coba lagi" }; return render(); }
    S.submitted = true; S.sendState = null;
    render();
  }

  function download() {
    const p = payload(S, null);
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hasil-ILT-${(p.kelas || "").replace(/\s+/g, "")}-${(p.nama || "siswa").replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------------- modal ---------------- */
  function modal(inner, cls) {
    closeModal();
    const m = document.createElement("div");
    m.className = "modal-back";
    m.innerHTML = `<div class="modal ${cls || ""}" role="dialog" aria-modal="true"><button class="icon-btn modal-x" data-act="closeModal" aria-label="Tutup">${ICON.x}</button>${inner}</div>`;
    m.addEventListener("click", (e) => { if (e.target === m) closeModal(); });
    document.body.appendChild(m);
    document.body.classList.add("noscroll");
  }
  function closeModal() {
    document.querySelectorAll(".modal-back").forEach((m) => m.remove());
    document.body.classList.remove("noscroll");
  }

  /* ---------------- interaksi ---------------- */
  function pick(scr, slot, v) {
    const d = sd(scr.id);
    if (d.sel[slot] === v) delete d.sel[slot];
    else d.sel[slot] = v;
    // Bila pilihan kiri membuat pilihan kanan tidak sah, kosongkan pilihan kanan
    scr.slots.forEach((sl) => {
      if (sl.disabled && d.sel[sl.key]) {
        const o = sl.options.find((o) => o.v === d.sel[sl.key]);
        if (sl.disabled(d.sel, o)) delete d.sel[sl.key];
      }
    });
    render();
  }

  function addItem(scr) {
    const d = sd(scr.id);
    const it = {};
    scr.slots.filter((s) => s.options).forEach((s) => { it[s.key] = d.sel[s.key]; });
    const text = scr.sentence(it);
    if (d.items.some((x) => scr.sentence(x) === text)) return toast("Pernyataan itu sudah ada di daftarmu.");
    d.items.push(it);
    d.sel = {};
    render();
    const list = document.querySelector(".items li:last-child");
    if (list) list.classList.add("just-added");
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    const scr = BY_ID[S.screen];
    const d = scr ? sd(scr.id) : null;
    switch (act) {
      case "pick": pick(scr, b.dataset.slot, b.dataset.v); break;
      case "unpick": delete d.sel[b.dataset.slot]; render(); break;
      case "clearSel": d.sel = {}; render(); break;
      case "add": addItem(scr); break;
      case "remove": d.items.splice(+b.dataset.i, 1); render(); break;
      case "edit": {
        const it = d.items.splice(+b.dataset.i, 1)[0];
        d.sel = Object.fromEntries(Object.entries(it).filter(([k]) => k !== "status"));
        render();
        const strip = document.querySelector(".builder");
        if (strip) strip.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
      case "choose": d.sel[b.dataset.q] = b.dataset.v; render(); break;
      case "check": scr.kind === "builder" ? checkBuilder(scr) : checkChoice(scr); break;
      case "next": go(ORDER[ORDER.indexOf(S.screen) + 1]); break;
      case "showFig":
        modal(`<div class="fig-modal">${figure()}</div><p class="fig-hint">Geser gambar ke samping untuk melihat bagian lain.</p>${notesCard()}`, "fig");
        applyHL();
        break;
      case "figToggle": S.figHidden = !S.figHidden; render(); break;
      case "closeModal": closeModal(); break;
      case "submit": submit(); break;
      case "download": download(); break;
      case "exit":
        modal(`<h2>Keluar dari tugas?</h2><p>Semua jawabanmu di perangkat ini akan dihapus dan tugas dimulai dari awal.</p>
          <div class="row-actions"><button class="btn-ghost" data-act="closeModal">Batal</button><button class="btn-danger" data-act="reset">Ya, hapus & keluar</button></div>`);
        break;
      case "newStudent":
      case "reset":
        closeModal();
        S = fresh(); render(); window.scrollTo(0, 0);
        break;
    }
  });

  document.addEventListener("submit", (e) => {
    if (e.target.id !== "startForm") return;
    e.preventDefault();
    const f = new FormData(e.target);
    const nama = (f.get("nama") || "").trim(), kelas = (f.get("kelas") || "").trim(), absen = (f.get("absen") || "").trim();
    if (!nama || !kelas) {
      document.getElementById("formErr").textContent = "Nama lengkap dan kelas wajib diisi.";
      return;
    }
    S.student = { nama, kelas, absen };
    S.startedAt = new Date().toISOString();
    go(SCREENS[0].id);
  });

  // Sorot bagian jembatan saat kotak disentuh / disorot
  document.addEventListener("pointerover", (e) => {
    const c = e.target.closest("[data-hl]");
    const v = c ? c.dataset.hl : null;
    if (v !== hoverHL) { hoverHL = v; applyHL(); }
  });
  document.addEventListener("focusin", (e) => {
    const c = e.target.closest && e.target.closest("[data-hl]");
    if (c) { hoverHL = c.dataset.hl; applyHL(); }
  });

  // Seret kotak ke tempatnya (desktop)
  let dragging = null;
  document.addEventListener("dragstart", (e) => {
    const c = e.target.closest && e.target.closest(".chip");
    if (!c) return;
    dragging = { slot: c.dataset.slot, v: c.dataset.v };
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", c.textContent);
    document.querySelectorAll(`[data-drop="${dragging.slot}"]`).forEach((s) => s.classList.add("drop-ok"));
  });
  document.addEventListener("dragend", () => {
    dragging = null;
    document.querySelectorAll(".drop-ok,.drop-over").forEach((s) => s.classList.remove("drop-ok", "drop-over"));
  });
  document.addEventListener("dragover", (e) => {
    const t = e.target.closest && e.target.closest("[data-drop]");
    if (t && dragging && t.dataset.drop === dragging.slot) { e.preventDefault(); t.classList.add("drop-over"); }
  });
  document.addEventListener("dragleave", (e) => {
    const t = e.target.closest && e.target.closest("[data-drop]");
    if (t) t.classList.remove("drop-over");
  });
  document.addEventListener("drop", (e) => {
    const t = e.target.closest && e.target.closest("[data-drop]");
    if (!t || !dragging || t.dataset.drop !== dragging.slot) return;
    e.preventDefault();
    const scr = BY_ID[S.screen];
    const d = sd(scr.id);
    d.sel[dragging.slot] = null;
    pick(scr, dragging.slot, dragging.v);
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  // Layar yang tidak dikenal (mis. data lama) kembali ke pengantar
  if (!ORDER.includes(S.screen) || (!S.student && S.screen !== "intro")) S.screen = "intro";
  render();
  flush();
  if (S.student && S.screen !== "intro" && S.screen !== "done") toast(`Melanjutkan tugasmu, ${S.student.nama.split(" ")[0]}.`);
})();
