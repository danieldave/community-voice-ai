/* Community Voice AI - PETITIONS (v4, by the ByteBusters team at Yewa College)
 * ------------------------------------------------------------------
 * petition.html?from=<letter id>  start a petition from a letter in My Letters
 * petition.html?id=<CODE>         an ONLINE petition (stored with /api/issues)
 * petition.html?local=<id>        a petition collected ON THIS PHONE only
 * Signers give a first name and an area. js/petition-words.js checks both.
 * The signature list can be downloaded as a PDF (made right here on the phone)
 * or printed.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var toast = window.cvToast || function () {};
  var CHECK = window.CVPetitionCheck, clean = window.cvClean || function (x) { return x; };
  var STORE = "cv-petitions", SIGNED = "cv-signed", LOCAL_CAP = 500;
  var q = new URLSearchParams(location.search);
  var current = null;   // { kind, id, title, ask, letter, state, area, createdOn, signatures, cap, owner }

  function get(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast("This phone's storage is full."); return false; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function today() { return window.CVTracker ? CVTracker.today() : new Date().toISOString().slice(0, 10); }
  function nice(iso) { return window.CVTracker ? CVTracker.nice(iso) : iso; }
  function mine() { return get(STORE, []); }
  function remember(p) { var list = mine().filter(function (x) { return !(x.kind === p.kind && x.id === p.id); }); list.unshift(p); put(STORE, list.slice(0, 30)); }
  function show(id) { ["pet-create", "pet-view", "pet-missing"].forEach(function (x) { $(x).classList.toggle("hidden", x !== id); }); }
  function api(body) {
    return fetch("/api/issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "Something went wrong. Please try again."); return d; }); });
  }

  // ---------- 1. start a petition ----------
  function startForm() {
    show("pet-create");
    var st = $("pet-state");
    Object.keys((window.CV_DIRECTORY || { STATES: { Ogun: 1 } }).STATES).forEach(function (s) { var o = document.createElement("option"); o.textContent = s; st.appendChild(o); });
    st.value = "Ogun";
    var from = q.get("from") && window.CVTracker ? CVTracker.find(q.get("from")) : null;
    if (from) {
      $("pet-title").value = (from.subject || "").replace(/^(RE|SUBJECT):\s*/i, "").slice(0, 120);
      $("pet-ask").value = "We ask " + (from.office || "the office") + " to solve this problem and tell the community what will be done and when.";
      if (from.form && from.form.state) st.value = from.form.state;
      $("pet-area").value = (from.form && from.form.area) || "";
      $("pet-letter").value = (from.letter || "").slice(0, 3000);
    }
    fetch("/api/issues?petition=check").then(function (r) { return r.json(); }).then(function (d) {
      if (!d.live) throw new Error("off");
    }).catch(function () { $("pet-mode-online").disabled = true; $("pet-online-off").classList.remove("hidden"); $("pet-mode-local").checked = true; });

    $("pet-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var m = $("pet-form-msg"), title = $("pet-title").value.trim(), ask = $("pet-ask").value.trim();
      if (title.length < 5 || ask.length < 10) { m.textContent = "Give the petition a title and say clearly what you are asking for."; return; }
      if (CHECK.rude(title) || CHECK.rude(ask)) { m.textContent = "Please use polite words. Officials will read this petition."; return; }
      var p = { title: title, ask: ask, letter: clean($("pet-letter").value.trim()), state: $("pet-state").value, area: clean($("pet-area").value.trim()) };
      if (document.querySelector('input[name="pet-mode"]:checked').value === "online") {
        m.textContent = "Creating…";
        api({ action: "petition-create", title: p.title, ask: p.ask, letter: p.letter, state: p.state, area: p.area }).then(function (d) {
          if (!d.created) throw new Error("Online petitions are not switched on right now. Choose \"Collect on this phone\".");
          remember({ kind: "online", id: d.id, owner: d.owner, title: p.title, createdOn: today() });
          location.href = "petition.html?id=" + d.id;
        }).catch(function (err) { m.textContent = err.message; });
      } else {
        var id = "P" + Date.now().toString(36);
        p.kind = "local"; p.id = id; p.createdOn = today(); p.signatures = [];
        remember(p);
        location.href = "petition.html?local=" + id;
      }
    });
  }

  // ---------- 2. show a petition ----------
  function draw() {
    var p = current, n = p.signatures.length, cap = p.cap || LOCAL_CAP;
    show("pet-view");
    $("pet-h1").textContent = "✍️ Petition";
    $("pet-lead").textContent = p.kind === "online" ? "Add your first name and area to support this request. Share the link with neighbours." : "This petition is collected on this phone only. Pass the phone to neighbours so they can add their names.";
    $("pet-tag").innerHTML = p.kind === "online" ? '<span class="pill low"><span class="dot" aria-hidden="true"></span>🌐 Online petition</span>' : '<span class="pill medium"><span class="dot" aria-hidden="true"></span>📱 On this phone only</span>';
    $("pet-title-v").textContent = p.title;
    $("pet-ask-v").textContent = p.ask;
    $("pet-meta-v").textContent = [p.area, p.state].filter(Boolean).join(", ") + (p.createdOn ? " · started " + nice(p.createdOn) : "");
    $("pet-letter-wrap").classList.toggle("hidden", !p.letter);
    $("pet-letter-v").textContent = p.letter || "";
    $("pet-count").textContent = n;
    $("pet-count-label").textContent = (n === 1 ? "signature" : "signatures") + " (up to " + cap + ")";
    $("pet-bar").setAttribute("aria-valuemax", String(cap)); $("pet-bar").setAttribute("aria-valuenow", String(n));
    $("pet-bar").firstElementChild.style.width = Math.min(100, n / cap * 100) + "%";
    $("pet-list").innerHTML = n ? p.signatures.map(function (s) { return "<li><b>" + esc(s.first) + "</b>, " + esc(s.area) + ' <span class="small">' + esc(nice(s.on)) + "</span></li>"; }).join("") : '<li class="small">No signatures yet. Be the first!</li>';
    var link = location.origin + "/petition.html?id=" + p.id;
    var text = p.kind === "online"
      ? "Please support our community petition: \"" + p.title + "\". " + p.ask + " Add your first name and area here: " + link
      : "Community petition: \"" + p.title + "\". " + p.ask + " Come and add your first name and area on my phone.";
    $("pet-wa").href = "https://wa.me/?text=" + encodeURIComponent(text);
    $("pet-copy").classList.toggle("hidden", p.kind !== "online");
    var owned = mine().some(function (x) { return x.kind === p.kind && x.id === p.id && (p.kind === "local" || x.owner); });
    $("pet-delete").classList.toggle("hidden", !owned);
    $("pet-share-note").textContent = p.kind === "online" ? "Anyone with the link can see the title, request, letter and the first names and areas of signers." : "Signatures stay on this phone. Download the PDF before you clear your browser.";
    var signed = get(SIGNED, {});
    if (p.kind === "online" && signed[p.id]) $("sign-msg").textContent = "✓ You signed this petition on this phone.";
    if (n >= cap) { $("sign-form").querySelector("button").disabled = true; $("sign-msg").textContent = "This petition is full. Thank you!"; }
  }

  function loadOnline(id) {
    $("pet-list").innerHTML = '<li class="small">Loading…</li>';
    return fetch("/api/issues?petition=" + encodeURIComponent(id)).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.live) { show("pet-missing"); $("pet-missing-msg").textContent = "Online petitions are not switched on right now. Please try again later."; return; }
      if (!d.found) { show("pet-missing"); return; }
      current = { kind: "online", id: d.id, title: d.title, ask: d.ask, letter: d.letter, state: d.state, area: d.area, createdOn: d.createdOn, cap: d.cap, signatures: d.signatures || [] };
      draw();
    }).catch(function () { show("pet-missing"); $("pet-missing-msg").textContent = "Could not load the petition. Check your internet and try again."; });
  }

  // ---------- 3. sign ----------
  $("sign-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var m = $("sign-msg"), p = current; if (!p) return;
    var who = CHECK.checkSigner($("sign-first").value, $("sign-area").value);
    if (!who.ok) { m.textContent = who.error; return; }
    if (!$("sign-ok").checked) { m.textContent = "Please tick the box to agree that your first name and area will be shown."; return; }
    if (p.kind === "local") {
      var list = mine(), rec = list.filter(function (x) { return x.kind === "local" && x.id === p.id; })[0];
      if (!rec) return;
      var dup = rec.signatures.some(function (s) { return (s.first + "|" + s.area).toLowerCase() === (who.first + "|" + who.area).toLowerCase(); });
      if (dup) { m.textContent = "Someone with this first name and area has already signed."; return; }
      if (rec.signatures.length >= LOCAL_CAP) { m.textContent = "This petition is full."; return; }
      rec.signatures.push({ first: who.first, area: who.area, on: today() });
      if (!put(STORE, list)) return;
      current = rec; $("sign-form").reset(); m.textContent = "✓ Thank you, " + who.first + "! Pass the phone to the next person."; toast("Signature added ✍️"); draw();
      $("sign-first").focus();
      return;
    }
    m.textContent = "Signing…";
    api({ action: "petition-sign", id: p.id, first: who.first, area: who.area }).then(function (d) {
      if (!d.signed) throw new Error("Online petitions are not switched on right now.");
      var s = get(SIGNED, {}); s[p.id] = true; put(SIGNED, s);
      $("sign-form").reset(); toast("Thank you for signing ✍️");
      return loadOnline(p.id).then(function () { $("sign-msg").textContent = "✓ Thank you, " + d.first + "! Your name is on the list."; });
    }).catch(function (err) { m.textContent = err.message; });
  });

  // ---------- 4. share, export, delete ----------
  $("pet-copy").addEventListener("click", function () {
    var link = location.origin + "/petition.html?id=" + current.id;
    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () { toast("Link copied 🔗"); }).catch(function () { prompt("Copy this link:", link); });
  });
  function listLines() {
    var p = current;
    return ["PETITION: " + p.title, "We ask: " + p.ask, (p.area ? p.area + ", " : "") + (p.state || "") + " · " + p.signatures.length + " signatures · exported " + nice(today()),
      p.kind === "online" ? "Collected online with Community Voice AI." : "Collected on one phone with Community Voice AI.",
      "Signers typed their own first name and area; names were not verified.", ""]
      .concat(p.signatures.map(function (s, i) { return (i + 1) + ". " + s.first + ", " + s.area + " (" + s.on + ")"; }));
  }
  $("pet-print").addEventListener("click", function () { $("print-area").textContent = listLines().join("\n"); window.print(); });
  $("pet-pdf").addEventListener("click", function () {
    var blob = makePdf(current);
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "petition-signatures.pdf";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    toast("Signature list downloaded 📄");
  });
  $("pet-delete").addEventListener("click", function () {
    var p = current;
    if (!confirm(p.kind === "online" ? "Delete this petition and all its signatures from our server? This cannot be undone." : "Delete this petition and its signatures from this phone?")) return;
    var done = function () { put(STORE, mine().filter(function (x) { return !(x.kind === p.kind && x.id === p.id); })); location.href = "petition.html"; };
    if (p.kind === "local") return done();
    var me = mine().filter(function (x) { return x.kind === "online" && x.id === p.id; })[0];
    api({ action: "petition-delete", id: p.id, owner: me && me.owner }).then(function (d) { if (d.deleted) done(); else throw new Error("Could not delete right now."); })
      .catch(function (err) { toast(err.message); });
  });

  // ---------- the PDF: written by hand, no library needed ----------
  // Uses the built-in Helvetica font. Letters with accents (Ọ, é) are written without the accent mark.
  function pdfText(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-")
      .replace(/[^\x20-\x7e]/g, "?").replace(/([\\()])/g, "\\$1");
  }
  function wrap(s, max) { var out = [], line = ""; String(s).split(/\s+/).forEach(function (w) { if ((line + " " + w).trim().length > max) { if (line) out.push(line); line = w; } else line = (line + " " + w).trim(); }); if (line) out.push(line); return out; }
  function makePdf(p) {
    var pages = [], ops = [], y = 800;
    function text(x, size, s, bold) { ops.push("BT /" + (bold ? "F2" : "F1") + " " + size + " Tf " + x + " " + y + " Td (" + pdfText(s) + ") Tj ET"); }
    function newPage() { pages.push(ops.join("\n")); ops = []; y = 800; }
    function need(h) { if (y - h < 60) { newPage(); text(50, 9, "Petition: " + p.title.slice(0, 80) + " (continued)"); y -= 22; header(); } }
    function header() { text(50, 10, "No.", true); text(90, 10, "First name", true); text(250, 10, "Area", true); text(470, 10, "Date signed", true); y -= 6; ops.push("50 " + y + " m 545 " + y + " l S"); y -= 14; }
    text(50, 18, "PETITION SIGNATURE LIST", true); y -= 26;
    wrap(p.title, 70).forEach(function (l) { text(50, 13, l, true); y -= 17; });
    y -= 2; wrap("We ask: " + p.ask, 90).forEach(function (l) { text(50, 11, l); y -= 15; });
    y -= 4; text(50, 10, [p.area, p.state].filter(Boolean).join(", ") + "   |   " + p.signatures.length + " signatures   |   exported " + nice(today())); y -= 14;
    text(50, 9, (p.kind === "online" ? "Collected online" : "Collected on one phone") + " with Community Voice AI. Each signer typed their own first name and area; the names were not verified."); y -= 24;
    header();
    p.signatures.forEach(function (s, i) {
      need(16);
      text(50, 10, String(i + 1)); text(90, 10, s.first.slice(0, 26)); text(250, 10, s.area.slice(0, 38)); text(470, 10, s.on); y -= 16;
    });
    if (!p.signatures.length) { text(50, 10, "No signatures yet."); y -= 16; }
    need(40); y -= 14; text(50, 9, "Made with Community Voice AI, built by the ByteBusters team at Yewa College, Ilaro."); newPage();
    // assemble the file
    var objs = [], kids = [];
    objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    pages.forEach(function (content, i) {
      var pageId = 5 + i * 2, contId = 6 + i * 2; kids.push(pageId + " 0 R");
      objs[pageId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + contId + " 0 R >>";
      objs[contId] = "<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream";
    });
    objs[2] = "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + pages.length + " >>";
    var out = "%PDF-1.4\n", offsets = [];
    for (var i = 1; i < objs.length; i++) { offsets[i] = out.length; out += i + " 0 obj\n" + objs[i] + "\nendobj\n"; }
    var xref = out.length;
    out += "xref\n0 " + objs.length + "\n0000000000 65535 f \n";
    for (i = 1; i < objs.length; i++) out += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
    out += "trailer\n<< /Size " + objs.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
    return new Blob([out], { type: "application/pdf" });
  }
  window.CVPetitionPdf = makePdf;

  // ---------- petitions on this phone ----------
  function drawMine() {
    var list = mine(), box = $("pet-mine-list");
    if (!list.length) return;
    box.innerHTML = '<ul class="steps">' + list.map(function (x) {
      var href = x.kind === "online" ? "petition.html?id=" + encodeURIComponent(x.id) : "petition.html?local=" + encodeURIComponent(x.id);
      return '<li><a href="' + href + '">' + esc(x.title) + "</a> " + '<span class="small">' + (x.kind === "online" ? "🌐 online" : "📱 on this phone, " + (x.signatures || []).length + " signatures") + (x.createdOn ? " · " + esc(nice(x.createdOn)) : "") + "</span></li>";
    }).join("") + "</ul>";
  }

  drawMine();
  if (q.get("id")) loadOnline(q.get("id").toUpperCase().slice(0, 8));
  else if (q.get("local")) {
    var rec = mine().filter(function (x) { return x.kind === "local" && x.id === q.get("local"); })[0];
    if (rec) { current = rec; draw(); } else { show("pet-missing"); $("pet-missing-msg").textContent = "This petition was collected on another phone, or it was deleted. Local petitions can only be opened on the phone that collected them."; }
  } else startForm();
})();
