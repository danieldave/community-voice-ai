/* Community Voice AI — Follow-up Tracker (v2)
 * ------------------------------------------------------------------
 * Many community letters are never followed up, so nothing happens.
 * This file remembers every letter you SEND (on this phone only):
 *   - when you sent it, how, and to which office
 *   - counts the days, and after 14 days says "Follow-up due"
 *   - writes the follow-up letter for you (same problem, tone
 *     "Follow-up", with the date and reference of the first letter)
 *   - lets you mark "They replied" or "Solved"
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
  function status(l) {
    if (l.status === "solved") return { key: "solved", text: "✅ Solved", cls: "low" };
    if (l.status === "replied") return { key: "replied", text: "📨 They replied", cls: "low" };
    var d = daysSince(l.sentOn);
    if (d >= DUE_DAYS) return { key: "due", text: "🔔 Follow-up due (" + d + " days)", cls: "high" };
    return { key: "waiting", text: "⏳ Waiting: day " + d + " of " + DUE_DAYS, cls: "medium" };
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
    b.textContent = "🔔 " + n + " letter" + (n > 1 ? "s" : "") + " waiting more than " + DUE_DAYS + " days. Time to follow up →";
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
      '<div><b>' + counts.replied + '</b><span>replied</span></div><div><b>' + counts.solved + '</b><span>solved</span></div></div>' +
      list.map(function (l) {
        var s = status(l);
        return '<article class="card letter-card" data-id="' + l.id + '">' +
          '<div class="urgency-row"><span class="pill ' + s.cls + '"><span class="dot" aria-hidden="true"></span>' + esc(s.text) + '</span>' + (l.followUps ? '<span class="urgency-reason">' + l.followUps + ' follow-up' + (l.followUps > 1 ? 's' : '') + ' written</span>' : '') + '</div>' +
          '<h3>' + esc(l.subject || l.form.problemType) + '</h3>' +
          '<p class="small">' + esc(l.form.area + ", " + l.form.state) + ' · sent ' + esc(nice(l.sentOn)) + (l.how ? ' ' + esc(l.how) : '') + (l.office ? ' to ' + esc(l.office) : '') + (l.reference ? ' · ref ' + esc(l.reference) : '') + '</p>' +
          '<div class="actions">' +
            (s.key !== "solved" ? '<a class="btn btn-gold" href="index.html?followup=' + l.id + '">🔁 Write follow-up</a>' : '') +
            (s.key !== "replied" && s.key !== "solved" ? '<button type="button" class="btn btn-outline" data-act="replied">📨 They replied</button>' : '') +
            (s.key !== "solved" ? '<button type="button" class="btn btn-outline" data-act="solved">✅ Solved</button>' : '<button type="button" class="btn btn-outline" data-act="waiting">↩️ Not solved after all</button>') +
            '<button type="button" class="btn btn-outline" data-act="view">📄 See letter</button>' +
            '<button type="button" class="btn btn-outline" data-act="delete" aria-label="Delete this letter">🗑️</button>' +
          '</div><pre class="letter-view hidden">' + esc(l.letter) + '</pre></article>';
      }).join("");
    box.onclick = function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      var card = b.closest("[data-id]"), id = card.getAttribute("data-id"), act = b.getAttribute("data-act");
      if (act === "view") { card.querySelector(".letter-view").classList.toggle("hidden"); return; }
      if (act === "delete") { if (!confirm("Delete this letter from your list?")) return; save(load().filter(function (x) { return x.id !== id; })); }
      else update(id, { status: act, statusOn: today() });
      renderList();
    };
  }

  window.CVTracker = { add: add, update: update, find: find, load: load, status: status, today: today, nice: nice, DUE_DAYS: DUE_DAYS };
  document.addEventListener("DOMContentLoaded", function () { banner(); renderList(); });
})();
