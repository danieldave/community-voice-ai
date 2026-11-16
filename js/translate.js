/* Community Voice AI - THE LANGUAGE BUTTON (on every page)
 * ------------------------------------------------------------------
 * 🌍 Language does two things:
 *   1. Changes the words of the WHOLE SITE into a Nigerian language.
 *      Your choice is remembered, so every page you open follows it.
 *   2. Translates ANY short text you type (up to 500 letters).
 * The translating is done by AI on our server (api/translate.js).
 * AI can make mistakes, so the page always says "Translated by AI"
 * and gives a button to go back to English.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";
  var LANGS = { en: "English", yo: "Yorùbá", ha: "Hausa", ig: "Igbo", pcm: "Naijá (Pidgin)", ff: "Fulfulde", kr: "Kanuri", tiv: "Tiv", ibb: "Ibibio", efi: "Efik",
    ijc: "Izon (Ijaw)", bin: "Edo (Bini)", nup: "Nupe", urh: "Urhobo", igl: "Igala", idu: "Idoma", igb: "Ebira" };
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, CODE: 1, PRE: 1, NOSCRIPT: 1, SVG: 1 };
  var originals = [];            // [{node, text}] so we can go back to English
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  function el(tag, attrs, html) { var x = document.createElement(tag); for (var k in attrs) x.setAttribute(k, attrs[k]); if (html) x.innerHTML = html; return x; }

  // ---------- the button and its panel ----------
  var css = el("style", {}, ".trb{font:700 14px Inter,Arial,sans-serif;border:1.5px solid rgba(255,255,255,.55);background:rgba(255,255,255,.14);color:#fff;border-radius:99px;padding:7px 12px;cursor:pointer;margin-left:auto;white-space:nowrap}" +
    ".trp{position:fixed;z-index:9999;right:10px;top:64px;width:min(360px,calc(100vw - 20px));background:#fff;color:#1f1a4d;border-radius:18px;box-shadow:0 18px 50px rgba(20,10,60,.35);padding:16px;font:15px/1.5 Inter,Arial,sans-serif;max-height:82vh;overflow:auto}" +
    ".trp h3{font:800 16px Poppins,Inter,sans-serif;margin:0 0 6px}.trp select,.trp textarea{width:100%;font:inherit;padding:10px;border-radius:10px;border:1.5px solid #d9d2f2;background:#fff;color:#1f1a4d}" +
    ".trp button{font:800 14px Inter,sans-serif;border:0;border-radius:10px;padding:10px 14px;background:#5b34c9;color:#fff;cursor:pointer;margin-top:8px}.trp button.g{background:#efe9ff;color:#3b2a8c}" +
    ".trp hr{border:0;border-top:1px solid #e6e0f7;margin:14px 0}.trp .o{background:#f4f0ff;border-radius:10px;padding:10px;margin-top:8px;white-space:pre-wrap;min-height:20px}.trp small{color:#5d5a7a;display:block;margin-top:6px}" +
    ".trn{position:sticky;top:0;z-index:50;background:#fff3c4;color:#3d2c00;font:600 14px Inter,Arial,sans-serif;padding:8px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.trn button{font:800 13px Inter,sans-serif;border:0;border-radius:8px;padding:6px 10px;background:#3d2c00;color:#fff;cursor:pointer}" +
    "@media print{.trb,.trp,.trn{display:none!important}}");
  document.head.appendChild(css);
  var btn = el("button", { type: "button", "class": "trb", "aria-haspopup": "dialog", "aria-expanded": "false", "data-no-translate": "" }, "🌍 Language");
  var host = document.querySelector(".tools") || document.querySelector("header.bar") || document.querySelector("header") || document.body;
  host.appendChild(btn);
  var opts = Object.keys(LANGS).map(function (k) { return '<option value="' + k + '">' + LANGS[k] + "</option>"; }).join("");
  var panel = el("div", { "class": "trp", role: "dialog", "aria-label": "Language", hidden: "", "data-no-translate": "" },
    '<button type="button" class="g" id="tr-x" aria-label="Close" style="float:right;margin:0;padding:4px 10px">✕</button><h3>🌍 Read this site in your language</h3><select id="tr-site" aria-label="Site language">' + opts + '</select><button type="button" id="tr-apply">Change the whole site</button>' +
    '<small id="tr-site-msg" aria-live="polite">Your choice is remembered on every page.</small><hr>' +
    '<h3>✍️ Translate any text</h3><textarea id="tr-in" rows="3" maxlength="500" placeholder="Type or paste up to 500 letters"></textarea>' +
    '<select id="tr-to" aria-label="Translate into">' + opts + '</select><button type="button" id="tr-go">Translate</button> <button type="button" class="g" id="tr-copy" hidden>Copy</button>' +
    '<div class="o" id="tr-out" aria-live="polite"></div><small>Translated by AI. It can make mistakes: check important letters with someone who speaks the language. Do not type private details.</small>');
  document.body.appendChild(panel);
  var $ = function (id) { return document.getElementById(id); };
  btn.onclick = function () { var open = panel.hasAttribute("hidden"); open ? panel.removeAttribute("hidden") : panel.setAttribute("hidden", ""); btn.setAttribute("aria-expanded", open); };
  $("tr-x").onclick = function () { panel.setAttribute("hidden", ""); btn.setAttribute("aria-expanded", "false"); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { panel.setAttribute("hidden", ""); btn.setAttribute("aria-expanded", "false"); } });

  function post(body) {
    return fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "The translator is not available right now."); return d; }); });
  }

  // ---------- 2. translate any text ----------
  $("tr-to").value = get("cv-lang") && get("cv-lang") !== "en" ? get("cv-lang") : "yo";
  $("tr-go").onclick = function () {
    var text = $("tr-in").value.trim(); if (text.length < 2) { $("tr-out").textContent = "Type some words first."; return; }
    $("tr-out").textContent = "Translating…"; $("tr-copy").hidden = true;
    post({ mode: "text", text: text, to: $("tr-to").value }).then(function (d) { $("tr-out").textContent = d.translation; $("tr-copy").hidden = false; })
      .catch(function (e) { $("tr-out").textContent = e.message; });
  };
  $("tr-copy").onclick = function () { if (navigator.clipboard) navigator.clipboard.writeText($("tr-out").textContent).then(function () { $("tr-copy").textContent = "Copied ✓"; setTimeout(function () { $("tr-copy").textContent = "Copy"; }, 1500); }); };

  // ---------- 1. the whole site ----------
  function textNodes() {
    var root = document.querySelector("main") || document.body, out = [];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      var p = n.parentElement; if (!p || !/[A-Za-z]{2}/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      for (var a = p; a && a !== document.body; a = a.parentElement) { if (SKIP[a.tagName] || a.hasAttribute("data-no-translate") || a.isContentEditable) return NodeFilter.FILTER_REJECT; }
      return NodeFilter.FILTER_ACCEPT; } });
    while (walker.nextNode()) out.push(walker.currentNode);
    return out;
  }
  function notice(lang) {
    var old = document.querySelector(".trn"); if (old) old.remove();
    if (!lang) return;
    var n = el("div", { "class": "trn", "data-no-translate": "", role: "status" }, "🌍 This page is shown in " + LANGS[lang] + ", translated by AI. It can contain mistakes. <button type=\"button\">Show English</button>");
    n.querySelector("button").onclick = function () { restore(); set("cv-lang", null); $("tr-site").value = "en"; };
    document.body.insertBefore(n, document.body.firstChild);
  }
  function restore() { originals.forEach(function (o) { o.node.nodeValue = o.text; }); originals = []; document.documentElement.lang = "en-NG"; notice(null); }
  function apply(lang) {
    restore();
    if (lang === "en") { set("cv-lang", null); $("tr-site-msg").textContent = "The site is in English."; return; }
    var nodes = textNodes(), cacheKey = "cv-tr:" + lang, cache = {};
    try { cache = JSON.parse(get(cacheKey) || "{}"); } catch (e) {}
    var need = [], seen = {};
    nodes.forEach(function (n) { var t = n.nodeValue.trim(); if (t.length > 700 || cache[t] || seen[t]) return; seen[t] = 1; need.push(t); });
    var batches = [], cur = [], size = 0;
    need.forEach(function (t) { if (cur.length >= 60 || size + t.length > 5000) { batches.push(cur); cur = []; size = 0; } cur.push(t); size += t.length; });
    if (cur.length) batches.push(cur);
    $("tr-site-msg").textContent = need.length ? "Translating this page… (" + need.length + " pieces)" : "Done.";
    function paint() {
      nodes.forEach(function (n) { var raw = n.nodeValue, t = raw.trim(); if (!cache[t]) return;
        originals.push({ node: n, text: raw }); n.nodeValue = raw.replace(t, cache[t]); });
      document.documentElement.lang = lang; notice(lang); set("cv-lang", lang);
      try { var keys = Object.keys(cache); if (keys.length > 1500) { var small = {}; keys.slice(-1500).forEach(function (k) { small[k] = cache[k]; }); cache = small; } set(cacheKey, JSON.stringify(cache)); } catch (e) {}
    }
    var chain = Promise.resolve();
    batches.forEach(function (b) { chain = chain.then(function () { return post({ mode: "page", strings: b, to: lang }).then(function (d) { b.forEach(function (t, i) { if (d.t[i]) cache[t] = d.t[i]; }); }); }); });
    chain.then(function () { paint(); $("tr-site-msg").textContent = "Done. Every page you open will be in " + LANGS[lang] + "."; })
      .catch(function (e) { paint(); $("tr-site-msg").textContent = e.message; });
  }
  $("tr-apply").onclick = function () { apply($("tr-site").value); };
  var saved = get("cv-lang");
  if (saved && LANGS[saved] && saved !== "en") { $("tr-site").value = saved; if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { apply(saved); }); else apply(saved); }
})();
