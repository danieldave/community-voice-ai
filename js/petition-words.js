/* Community Voice AI - PETITION CHECKS (used in the browser AND on the server)
 * ------------------------------------------------------------------
 * A neighbour who signs a petition gives only a FIRST NAME and an AREA.
 * This file checks both, the same way on the phone and on our server:
 *   - first name: one word, letters only (no numbers, so no phone numbers)
 *   - area: a short place name, never a long number
 *   - no rude words (English, Pidgin and Yoruba insults are blocked)
 * There is no human moderator, so this filter and the limits on the
 * server (signatures per hour, most signatures per petition) keep it clean.
 * To block another word, add it to WORDS in lower case.
 * ------------------------------------------------------------------ */
(function (root) {
  "use strict";
  // whole words only for short ones, so real names like "Dickson" or "Cockburn" are not blocked
  var WHOLE = ["ass", "dick", "cock", "prick", "twat", "slut", "whore", "mumu", "olodo", "werey", "oloshi", "olosho", "agbaya", "ashawo", "ashewo", "omoale", "bastard", "idiot", "stupid", "fool", "hoe"];
  // these are blocked even inside another word
  var INSIDE = ["fuck", "fuk", "shit", "bitch", "asshole", "pussy", "cunt", "nigger", "nigga", "faggot", "motherf", "wanker", "dickhead", "penis", "vagina", "porn", "sex"];
  var LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

  function fold(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[013457@$!]/g, function (c) { return LEET[c]; });
  }
  function rude(text) {
    var f = fold(text);
    var joined = f.replace(/[^a-z]/g, "");
    if (INSIDE.some(function (w) { return joined.indexOf(w) !== -1; })) return true;
    var words = f.split(/[^a-z]+/).filter(Boolean);
    return words.some(function (w) { return WHOLE.indexOf(w) !== -1; }) || WHOLE.indexOf(joined) !== -1;
  }
  function tidy(s, max) { return String(s == null ? "" : s).replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max); }

  // returns { ok: true, first, area } or { ok: false, error }
  function checkSigner(first, area) {
    first = tidy(first, 40); area = tidy(area, 60);
    if (!/^[\p{L}][\p{L}'’.-]{1,29}$/u.test(first)) return { ok: false, error: "Type your first name only: one word, letters only (2 to 30 letters)." };
    if (area.length < 2 || area.length > 40 || !/^[\p{L}\d][\p{L}\d '’.,/-]*$/u.test(area)) return { ok: false, error: "Type your area or street name (2 to 40 letters)." };
    if (/\d{4,}/.test(area)) return { ok: false, error: "Please do not put numbers like phone numbers in the area." };
    if (rude(first) || rude(area)) return { ok: false, error: "Please use polite words. This petition will be read by officials." };
    return { ok: true, first: first.charAt(0).toUpperCase() + first.slice(1), area: area };
  }

  var api = { checkSigner: checkSigner, rude: rude, tidy: tidy };
  if (typeof module === "object" && module.exports) module.exports = api; else root.CVPetitionCheck = api;
})(typeof window !== "undefined" ? window : globalThis);
