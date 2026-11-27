/* Community Voice AI — Follow-up Tracker (v2)
 * ------------------------------------------------------------------
 * Many community letters are never followed up, so nothing happens.
 * This file remembers every letter you SEND (on this phone only):
 *   - when you sent it, how, and to which office
 *   - counts the days, and after 14 days says "Follow-up due"
 *   - writes the follow-up letter for you (same problem, tone
 *     "Follow-up", with the date and reference of the first letter)
 *   - lets you mark the status: Sent, Acknowledged or Resolved
 *   - (v4) adds a reminder to your phone's calendar (.ics file)
 *   - (v4) writes a quick follow-up draft with no internet and no AI
 *   - (v4) lets you add a letter you wrote somewhere else
 *   - (v4) turns a letter into a petition (petition.html)
 * Nothing here is sent to any server.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";
  var KEY = "cv-letters", DUE_DAYS = 14;
  var LANGS = { ha: "Hausa", yo: "Yoruba", ig: "Igbo", pcm: "Nigerian Pidgin", ff: "Fulfulde", kr: "Kanuri", tiv: "Tiv", ibb: "Ibibio", efi: "Efik",
    ijc: "Izon (Ijaw)", bin: "Edo (Bini)", nup: "Nupe", urh: "Urhobo", igl: "Igala", idu: "Idoma", igb: "Ebira" };
  window.CV_LANGS = LANGS;

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50))); return true; } catch (e) { return false; } }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function daysSince(iso) { return Math.floor((new Date(today() + "T12:00:00") - new Date(iso + "T12:00:00")) / 86400000); }
  function nice(iso) { return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  // The status keys stay "waiting", "replied", "solved" so letters saved before v4 still work.
  // On screen they are called Sent, Acknowledged and Resolved.
  function wait(l) { var n = Number(l.remindDays); return n >= 3 && n <= 90 ? n : DUE_DAYS; }
  function addDays(iso, n) { var d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function status(l) {
    if (l.status === "solved") return { key: "solved", text: "✅ Resolved", cls: "low" };
    var d = daysSince(l.sentOn), w = wait(l);
    if (l.status === "replied") return d >= w ? { key: "replied", text: "📨 Acknowledged, not yet resolved (" + d + " days)", cls: "medium" } : { key: "replied", text: "📨 Acknowledged", cls: "low" };
    if (d >= w) return { key: "due", text: "🔔 Sent, follow-up due (" + d + " days)", cls: "high" };
    return { key: "waiting", text: "⏳ Sent: day " + d + " of " + w, cls: "medium" };
  }

  // ---- (v4) calendar reminder: a small .ics file that every phone calendar can open ----
  function icsText(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n"); }
  function fold(line) { var out = [], first = true; while (line.length > 73) { out.push((first ? "" : " ") + line.slice(0, 73)); line = line.slice(73); first = false; } out.push((first ? "" : " ") + line); return out.join("\r\n"); }
  function ics(l) {
    var on = addDays(l.sentOn, wait(l)), next = addDays(on, 1), stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    var what = l.subject || (l.form && l.form.problemType) || "community letter";
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ByteBusters Yewa College//Community Voice AI//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT", "UID:" + l.id + "-" + on + "@community-voice-ai", "DTSTAMP:" + stamp, "DTSTART;VALUE=DATE:" + on.replace(/-/g, ""), "DTEND;VALUE=DATE:" + next.replace(/-/g, ""),
      "SUMMARY:" + icsText("Follow up: " + what),
      "DESCRIPTION:" + icsText("You sent this letter on " + nice(l.sentOn) + (l.office ? " to " + l.office : "") + (l.reference ? " (ref " + l.reference + ")" : "") + ". If there is no answer yet, open Community Voice AI > My Letters and write a follow-up."),
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsText("Follow up your community letter"), "TRIGGER:PT9H", "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
    return lines.map(fold).join("\r\n") + "\r\n";
  }
  function download(name, text, type) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function remind(l) { download("follow-up-reminder.ics", ics(l), "text/calendar;charset=utf-8"); }

  // ---- (v4) a follow-up letter written on the phone, no internet and no AI needed ----
  function draft(l) {
    var d = daysSince(l.sentOn), where = l.form ? [l.form.area, l.form.lga, l.form.state].filter(Boolean).join(", ") : "";
    var what = l.subject ? l.subject.replace(/^(RE|SUBJECT):\s*/i, "") : ((l.form && l.form.problemType) || "a community problem");
    return ["[Your address]", nice(today()), "", l.office || "[Office title]", "[Office address]", "", "Dear Sir/Madam,", "",
      "FOLLOW-UP: " + what.toUpperCase(), "",
      "We wrote to your office on " + nice(l.firstSentOn || l.sentOn) + (l.how ? " " + l.how : "") + " about \u201c" + what + "\u201d" + (where ? " in " + where : "") + (l.reference ? " (reference: " + l.reference + ")" : "") + ".",
      "",
      (l.status === "replied" ? "Thank you for acknowledging our letter. However, " + d + " days later, the problem has not yet been solved and it is still affecting our community." : "It is now " + d + " days later and we have not yet received a reply. The problem is still affecting our community."),
      "",
      "We respectfully ask your office to tell us what action will be taken and when. A copy of our first letter is attached for your reference.",
      "", "Thank you for your attention.", "", "Yours faithfully,", "", "", "A Concerned Resident" + (where ? "\n(on behalf of residents of " + where + ")" : "")].join("\n");
  }

  // Called by app.js after the user says "I have sent this letter"
  function add(entry) {
    var list = load();
    entry.id = "L" + Date.now().toString(36);
    entry.status = "waiting";
    list.unshift(entry);
    save(list);
    return entry;
  }
  function update(id, changes) {
    var list = load(), l = list.filter(function (x) { return x.id === id; })[0];
    if (!l) return;
    Object.keys(changes).forEach(function (k) { l[k] = changes[k]; });
    save(list);
  }
  function find(id) { return load().filter(function (x) { return x.id === id; })[0]; }
  function dueCount() { return load().filter(function (l) { return status(l).key === "due"; }).length; }

  // A gentle banner on every page when a follow-up is due
  function banner() {
    var n = dueCount();
    if (!n || document.querySelector(".due-banner") || /letters\.html$/.test(location.pathname)) return;
    var b = document.createElement("a");
    b.className = "due-banner"; b.href = "letters.html";
    b.textContent = "🔔 " + n + " letter" + (n > 1 ? "s" : "") + " waiting past the reminder date. Time to follow up →";
    var header = document.querySelector(".site-header");
    if (header && header.parentNode) header.parentNode.insertBefore(b, header.nextSibling);
    var link = document.querySelector('.nav a[href="letters.html"]');
    if (link && !link.querySelector(".badge")) link.insertAdjacentHTML("beforeend", ' <span class="badge">' + n + "</span>");
  }

  // The "My Letters" page
  function renderList() {
    var box = document.getElementById("letters-list");
    if (!box) return;
    var list = load();
    if (!list.length) {
      box.innerHTML = '<div class="output-empty"><div class="big" aria-hidden="true">📬</div><p>No letters yet. After you write and send a letter, press <strong>I have sent this letter</strong> and it will appear here.</p><a class="btn btn-gold" href="index.html">✍️ Write a letter</a></div>';
      return;
    }
    var counts = { waiting: 0, due: 0, replied: 0, solved: 0 };
    list.forEach(function (l) { counts[status(l).key]++; });
    box.innerHTML = '<div class="tracker-stats">' +
      '<div><b>' + list.length + '</b><span>letters sent</span></div><div><b>' + counts.due + '</b><span>follow-up due</span></div>' +
      '<div><b>' + counts.replied + '</b><span>acknowledged</span></div><div><b>' + counts.solved + '</b><span>resolved</span></div></div>' +
      list.map(function (l) {
        var s = status(l);
        return '<article class="card letter-card" data-id="' + l.id + '">' +
          '<div class="urgency-row"><span class="pill ' + s.cls + '"><span class="dot" aria-hidden="true"></span>' + esc(s.text) + '</span>' + (l.followUps ? '<span class="urgency-reason">' + l.followUps + ' follow-up' + (l.followUps > 1 ? 's' : '') + ' written</span>' : '') + '</div>' +
          '<h3>' + esc(l.subject || (l.form && l.form.problemType) || "Letter") + '</h3>' +
          '<p class="small">' + esc([l.form && l.form.area, l.form && l.form.state].filter(Boolean).join(", ")) + ' · sent ' + esc(nice(l.sentOn)) + (l.how ? ' ' + esc(l.how) : '') + (l.office ? ' to <b>' + esc(l.office) + '</b>' : '') + (l.reference ? ' · ref ' + esc(l.reference) : '') + (s.key !== "solved" ? ' · reminder ' + esc(nice(addDays(l.sentOn, wait(l)))) : '') + '</p>' +
          '<label class="small status-pick">Status <select data-act="status" aria-label="Status of this letter"><option value="waiting"' + (l.status !== "replied" && l.status !== "solved" ? " selected" : "") + '>⏳ Sent</option><option value="replied"' + (l.status === "replied" ? " selected" : "") + '>📨 Acknowledged</option><option value="solved"' + (l.status === "solved" ? " selected" : "") + '>✅ Resolved</option></select></label>' +
          '<div class="actions">' +
            (s.key !== "solved" ? '<button type="button" class="btn btn-gold" data-act="draft">📝 Follow-up draft (one tap)</button>' : '') +
            (s.key !== "solved" && l.form && l.form.problemType && l.form.description ? '<a class="btn btn-outline" href="index.html?followup=' + l.id + '">🔁 Follow-up with AI</a>' : '') +
            (s.key !== "solved" ? '<button type="button" class="btn btn-outline" data-act="remind">📅 Calendar reminder</button>' : '') +
            '<a class="btn btn-outline" href="petition.html?from=' + l.id + '">✍️ Make it a petition</a>' +
            (l.letter ? '<button type="button" class="btn btn-outline" data-act="view">📄 See letter</button>' : '') +
            '<button type="button" class="btn btn-outline" data-act="delete" aria-label="Delete this letter">🗑️ Delete</button>' +
          '</div>' +
          '<div class="draft-box hidden"><label class="label-like" for="draft-' + l.id + '">Your follow-up letter (edit anything)</label><textarea id="draft-' + l.id + '" rows="14"></textarea>' +
            '<div class="actions"><button type="button" class="btn btn-outline" data-act="copy">📋 Copy</button><a class="btn btn-outline" data-act="wa" target="_blank" rel="noopener">💬 WhatsApp</a>' +
            '<button type="button" class="btn btn-outline" data-act="txt">⬇️ Download</button><button type="button" class="btn btn-purple" data-act="sentfu">📬 I sent this follow-up</button></div>' +
            '<p class="small">Written on your phone from the details you saved: no AI and no internet used. Fill in the [brackets] before you send it.</p></div>' + (l.code ? '<div class="official" data-code="' + esc(l.code) + '">🏛️ In the officials\' inbox · tracking code <b>' + esc(l.code) + '</b> · <span>checking for an answer…</span></div>' : '') +
          (l.letter ? '<pre class="letter-view hidden">' + esc(l.letter) + '</pre>' : '') + '</article>';
      }).join("");
    // letters that were shared with the officials' inbox: ask the server what the office answered
    var SAID = { "new": "not opened yet", received: "✅ The office received it", review: "🔎 The office is looking into it", planned: "🛠️ Work is planned", solved: "🎉 The office says it is solved", redirect: "↪️ Passed to the right office" };
    box.querySelectorAll(".official").forEach(function (o) {
      fetch("/api/inbox?code=" + encodeURIComponent(o.getAttribute("data-code"))).then(function (r) { return r.json(); }).then(function (d) {
        var s = o.querySelector("span");
        if (!d.live) { s.textContent = "the inbox is not switched on right now."; return; }
        if (!d.found) { s.textContent = "this copy is no longer stored."; return; }
        s.innerHTML = "<b>" + esc(SAID[d.status] || d.status) + "</b>" + (d.repliedOn ? " (" + esc(nice(d.repliedOn)) + (d.repliedBy ? ", " + esc(d.repliedBy) : "") + ")" : "") + (d.reply ? '<br>“' + esc(d.reply) + '”' : "");
        if (d.status !== "new") o.classList.add("answered");
      }).catch(function () { o.querySelector("span").textContent = "could not check right now."; });
    });
    box.onchange = function (e) {
      var sel = e.target.closest('select[data-act="status"]'); if (!sel) return;
      update(sel.closest("[data-id]").getAttribute("data-id"), { status: sel.value, statusOn: today() });
      if (window.cvToast) cvToast(sel.value === "solved" ? "Marked as resolved 🎉" : sel.value === "replied" ? "Marked as acknowledged 📨" : "Marked as sent ⏳");
      renderList();
    };
    box.onclick = function (e) {
      var b = e.target.closest("[data-act]"); if (!b || b.tagName === "SELECT") return;
      var card = b.closest("[data-id]"), id = card.getAttribute("data-id"), act = b.getAttribute("data-act"), l = find(id);
      var ta = card.querySelector(".draft-box textarea");
      if (act === "view") { card.querySelector(".letter-view").classList.toggle("hidden"); return; }
      if (act === "remind") { remind(l); if (window.cvToast) cvToast("Reminder file downloaded: open it to add it to your calendar 📅"); return; }
      if (act === "draft") { var bx = card.querySelector(".draft-box"); if (!ta.value) ta.value = draft(l); bx.classList.toggle("hidden"); if (!bx.classList.contains("hidden")) ta.focus(); return; }
      if (act === "copy") { (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).catch(function () { ta.select(); document.execCommand("copy"); }); if (window.cvToast) cvToast("Follow-up copied 📋"); return; }
      if (act === "wa") { b.href = "https://wa.me/?text=" + encodeURIComponent(ta.value); return; }
      if (act === "txt") { download("follow-up-letter.txt", ta.value, "text/plain;charset=utf-8"); return; }
      if (act === "sentfu") { update(id, { followUps: (l.followUps || 0) + 1, firstSentOn: l.firstSentOn || l.sentOn, lastFollowUp: today(), sentOn: today(), status: "waiting", followUpLetter: ta.value }); if (window.cvToast) cvToast("Follow-up saved. The reminder clock starts again 🔁"); renderList(); return; }
      if (act === "delete") { if (!confirm("Delete this letter from your list?")) return; save(load().filter(function (x) { return x.id !== id; })); }
      renderList();
    };
  }

  // ---- (v4) "Add a letter I sent" for letters written on paper or somewhere else ----
  function manualForm() {
    var f = document.getElementById("add-form"); if (!f) return;
    var g = function (id) { return document.getElementById(id); };
    g("add-on").value = today();
    if (window.CV_DIRECTORY && g("add-state")) Object.keys(window.CV_DIRECTORY.STATES).forEach(function (st) { var o = document.createElement("option"); o.textContent = st; if (st === "Ogun") o.selected = true; g("add-state").appendChild(o); });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var subject = g("add-subject").value.trim(), office = g("add-office").value.trim(), on = g("add-on").value;
      if (subject.length < 3 || office.length < 3 || !on) { g("add-msg").textContent = "Please fill in what it is about, who it went to and the date."; return; }
      var c = window.cvClean || function (x) { return x; };
      add({ manual: true, subject: subject, office: office, sentOn: on, how: g("add-how").value, reference: c(g("add-ref").value.trim()), remindDays: Number(g("add-remind").value) || DUE_DAYS,
        letter: g("add-letter").value.trim(), form: { state: g("add-state").value, area: c(g("add-area").value.trim()) } });
      f.reset(); g("add-on").value = today(); g("add-msg").textContent = "Saved on this phone ✓";
      if (window.cvToast) cvToast("Letter added to My Letters 📬");
      renderList(); var det = f.closest("details"); if (det) det.open = false;
    });
  }

  window.CVTracker = { add: add, update: update, find: find, load: load, status: status, today: today, nice: nice, DUE_DAYS: DUE_DAYS, ics: ics, remind: remind, draft: draft, addDays: addDays };
  document.addEventListener("DOMContentLoaded", function () { banner(); manualForm(); renderList(); });
})();
