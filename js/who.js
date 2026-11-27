/* Community Voice AI - "Who to send it to" page (v4)
 * Shows the office titles from js/ogun-offices.js for the LGA you pick.
 * Details YOU fill in (address, phone...) are saved on this phone only (localStorage "cv-who-notes").
 * Nothing on this page is sent to our server. */
(function () {
  "use strict";
  var D = window.CV_OGUN, $ = function (id) { return document.getElementById(id); };
  var toast = window.cvToast || function () {};
  var NOTES = "cv-who-notes", PICK = "cv-who";
  var LABELS = { holder: "Name of office holder (optional)", address: "Address", phone: "Phone (from an official source)", email: "Email (from an official source)", checkedOn: "Date you checked", source: "Where you checked (e.g. visited the office, ogunstate.gov.ng)" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function get(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast("Could not save on this phone (storage full?)"); } }
  var notes = get(NOTES, {}), pick = get(PICK, {});
  var lgaSel = $("who-lga"), ward = $("who-ward"), area = $("who-area");
  (window.CVLGAS ? CVLGAS.names(D.STATE) : []).forEach(function (n) { var o = document.createElement("option"); o.textContent = n; lgaSel.appendChild(o); });
  if (pick.lga) lgaSel.value = pick.lga; ward.value = pick.ward || ""; area.value = pick.area || "";

  function short(lga) { return lga.replace(/\s*\(.*\)$/, ""); }
  function fill(t, lga) {
    return t.replace(/\{LGA\}/g, lga ? short(lga) : "[your LGA]").replace(/\{WARD\}/g, ward.value.trim() || "[your ward]").replace(/\{AREA\}/g, area.value.trim() || "[your community]");
  }
  function keyOf(lga, id) { return (lga || "any") + "|" + id; }

  function render() {
    var lga = lgaSel.value, box = $("who-list");
    put(PICK, { lga: lga, ward: ward.value.trim(), area: area.value.trim() });
    if (!lga) { box.innerHTML = '<div class="output-empty"><div class="big" aria-hidden="true">🗺️</div><p>Choose your Local Government Area above to see who to write to.</p></div>'; return; }
    var groups = [];
    D.OFFICES.forEach(function (o) { if (groups.indexOf(o.group) === -1) groups.push(o.group); });
    box.innerHTML = groups.map(function (g) {
      return '<h2 class="h2">' + esc(g) + '</h2><div class="who-grid">' + D.OFFICES.filter(function (o) { return o.group === g; }).map(function (o) {
        var k = keyOf(lga, o.id), mine = notes[k] || {}, known = D.KNOWN[k] || {};
        var have = D.FIELDS.filter(function (f) { return f !== "checkedOn" && f !== "source" && (mine[f] || known[f]); });
        return '<article class="card who-card" data-id="' + o.id + '">' +
          '<h3>' + esc(fill(o.title, lga)) + '</h3>' +
          '<p><b>Handles:</b> ' + esc(o.handles) + '</p>' +
          '<p class="label-like">Address the letter to:</p><pre class="who-to" data-no-translate>' + esc(fill(o.to, lga)) + (mine.address || known.address ? "\n" + esc(mine.address || known.address) : "\n[office address: check locally]") + '</pre>' +
          '<p><b>Where:</b> ' + esc(o.where) + '</p>' +
          '<p class="verify">⚠️ <b>Verify locally:</b> ' + esc(o.verify) + '</p>' +
          (known.checkedOn ? '<p class="small known">✔️ Checked by the ByteBusters team on ' + esc(known.checkedOn) + (known.source ? " (" + esc(known.source) + ")" : "") + '. Still verify locally.</p>' : '') +
          (have.length ? '<ul class="who-known" data-no-translate>' + have.map(function (f) { return '<li><b>' + esc(LABELS[f].replace(/ \(.*\)$/, "")) + ':</b> ' + esc(mine[f] || known[f]) + (mine[f] ? ' <span class="small">(filled by you on this phone: check before sending)</span>' : '') + '</li>'; }).join("") + '</ul>' : '') +
          '<details class="who-edit"><summary>✏️ Add details you have checked</summary><div class="who-fields">' +
            D.FIELDS.map(function (f) { return '<div class="field"><label for="w-' + o.id + '-' + f + '">' + esc(LABELS[f]) + '</label><input type="' + (f === "checkedOn" ? "date" : "text") + '" id="w-' + o.id + '-' + f + '" data-f="' + f + '" maxlength="' + (f === "address" ? 160 : 80) + '" value="' + esc(mine[f] || "") + '"></div>'; }).join("") +
            '<button type="button" class="btn btn-purple" data-act="save">💾 Save on this phone</button></div></details>' +
          '<div class="actions"><button type="button" class="btn btn-outline" data-act="copy">📋 Copy address</button>' +
            '<a class="btn btn-gold" href="index.html?recipient=' + encodeURIComponent(o.recipient) + '&state=' + encodeURIComponent(D.STATE) + '&lga=' + encodeURIComponent(lga) + '&office=' + encodeURIComponent(fill(o.title, lga)) + '#main">✍️ Write to this office</a>' +
            (o.guide ? '<a class="btn btn-outline" href="' + o.guide + '">📘 Guide</a>' : '') +
            (o.link ? '<a class="btn btn-outline" href="' + o.link + '" target="_blank" rel="noopener noreferrer">🌐 Official site</a>' : '') + '</div>' +
          '</article>';
      }).join("") + '</div>';
    }).join("");
  }

  $("who-list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var card = b.closest("[data-id]"), id = card.getAttribute("data-id"), k = keyOf(lgaSel.value, id);
    if (b.getAttribute("data-act") === "copy") {
      var t = card.querySelector(".who-to").textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(function () {}); toast("Address copied 📋"); return;
    }
    var rec = {};
    card.querySelectorAll("[data-f]").forEach(function (i) { var v = i.value.trim(); if (v) rec[i.getAttribute("data-f")] = v.slice(0, 160); });
    if (Object.keys(rec).length) notes[k] = rec; else delete notes[k];
    put(NOTES, notes); toast("Saved on this phone ✓"); render();
  });
  lgaSel.addEventListener("change", render);
  [ward, area].forEach(function (el) { el.addEventListener("input", render); });   // typing updates the titles; leaving the box does not redraw

  // ---- share a checked list ----
  function msg(t) { $("who-msg").textContent = t; }
  $("who-export").addEventListener("click", function () {
    if (!Object.keys(notes).length) { msg("You have not saved any details yet."); return; }
    var data = { app: "community-voice-ai", kind: "who-to-send-to", state: D.STATE, exported: new Date().toISOString().slice(0, 10), note: "Details typed by a user. Check before sending.", notes: notes };
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); a.download = "who-to-send-to-ogun.json";
    document.body.appendChild(a); a.click(); a.remove(); msg("List downloaded.");
  });
  $("who-import").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return;
    if (f.size > 200000) { msg("That file is too big to be a list from this page."); return; }
    f.text().then(function (txt) {
      var d = JSON.parse(txt), n = 0;
      if (!d || d.kind !== "who-to-send-to" || typeof d.notes !== "object") throw new Error("bad");
      Object.keys(d.notes).forEach(function (k) {
        var id = k.split("|")[1]; if (!D.OFFICES.some(function (o) { return o.id === id; })) return;
        var r = {}; D.FIELDS.forEach(function (fl) { var v = d.notes[k] && d.notes[k][fl]; if (typeof v === "string" && v.trim()) r[fl] = v.trim().slice(0, 160); });
        if (Object.keys(r).length) { notes[k] = r; n++; }
      });
      put(NOTES, notes); render(); msg("Loaded " + n + " office" + (n === 1 ? "" : "s") + ". Remember: check before sending.");
    }).catch(function () { msg("That file is not a list from this page."); });
    e.target.value = "";
  });
  $("who-wa").addEventListener("click", function () {
    var lga = lgaSel.value; if (!lga) { msg("Choose your LGA first."); return; }
    var lines = ["Who to send community letters to: " + short(lga) + ", Ogun State", "(Office titles from Community Voice AI. Verify locally before sending.)", ""];
    D.OFFICES.forEach(function (o) { var m = notes[keyOf(lga, o.id)] || {}; lines.push("• " + fill(o.title, lga) + (m.address ? " | " + m.address : "") + (m.phone ? " | " + m.phone + " (check before using)" : "")); });
    lines.push("", location.origin + "/who-to-send-to.html");
    window.open("https://wa.me/?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
  });
  $("who-clear").addEventListener("click", function () { if (!confirm("Remove all the details you typed on this page?")) return; notes = {}; put(NOTES, notes); render(); msg("Cleared."); });
  render();
})();
