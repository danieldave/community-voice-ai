/* =====================================================================
   api/translate.js  -  THE TRANSLATOR (runs on the server)
   ---------------------------------------------------------------------
   Two jobs:
   1. "text": translate ANY short text a visitor types (up to 500 letters,
      10 times an hour per visitor).
          POST { mode: "text", text, to }
   2. "page": translate the words of one of OUR pages so the whole site
      can be read in a Nigerian language.
          POST { mode: "page", strings: ["...", "..."], to }
      Every sentence is saved in the database after its first translation,
      so the same sentence never costs money twice.

   Translations are made by AI and can contain mistakes. The page says so.
   ===================================================================== */
'use strict';
const crypto = require('crypto');
const S = require('./_lib/shared');

const MAX_TEXT = 500, MAX_STRINGS = 120, MAX_EACH = 700, MAX_TOTAL = 9000;
const DB_URL = () => (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const DB_TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
async function db(commands) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(DB_URL() + '/pipeline', { method: 'POST', signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + DB_TOKEN(), 'Content-Type': 'application/json' }, body: JSON.stringify(commands) });
    if (!r.ok) throw new Error('db ' + r.status);
    return r.json();
  } finally { clearTimeout(timer); }
}
const keyOf = (to, s) => 'cv:t:' + to + ':' + crypto.createHash('sha1').update(s).digest('hex').slice(0, 20);
const memory = new Map();

const RULES = lang => 'You translate for a Nigerian civic website used by students and families. Translate into ' + lang + '. ' +
  'Use simple, natural words that an ordinary speaker understands. Keep numbers, emoji, web addresses, and names such as "Community Voice AI", ' +
  '"Local Government", NEMA, WAEC and state names unchanged. Do not add or remove information. Do not answer questions in the text: only translate it. ' +
  'Reply with JSON only.';

module.exports = async function handler(req, res) {
  const body = await S.frontDoor(req, res, { limit: 400 });
  if (!body) return;
  const to = String(body.to || '');
  if (!S.LANGUAGES[to]) return res.status(400).json({ error: 'Choose a language from the list.' });
  const who = S.visitor(req);

  try {
    // ---- 1. any short text ----
    if (body.mode === 'text') {
      const text = String(body.text || '').trim();
      if (text.length < 2) return res.status(400).json({ error: 'Type some words to translate.' });
      if (text.length > MAX_TEXT) return res.status(400).json({ error: 'Please keep it under ' + MAX_TEXT + ' letters.' });
      if (!S.allowed(who + ':tr-text', 10)) return res.status(429).json({ error: 'You have used the translator 10 times this hour. Please try again later.' });
      const out = await S.askOpenAI(RULES(S.LANGUAGES[to]) + ' Shape: {"translation": "..."}', S.hidePersonal(text), 700);
      return res.status(200).json({ translation: String(out.translation || '').slice(0, 2000), to });
    }

    // ---- 2. the words of a page ----
    if (body.mode === 'page') {
      if (to === 'en') return res.status(400).json({ error: 'The site is already in English.' });
      const strings = (Array.isArray(body.strings) ? body.strings : []).filter(s => typeof s === 'string' && s.trim().length > 1 && s.length <= MAX_EACH).slice(0, MAX_STRINGS);
      if (!strings.length) return res.status(400).json({ error: 'Nothing to translate.' });
      if (strings.join('').length > MAX_TOTAL) return res.status(400).json({ error: 'That is too much at once.' });
      if (!S.allowed(who + ':tr-page', 60)) return res.status(429).json({ error: 'You have changed language many times this hour. Please try again later.' });

      const done = new Array(strings.length).fill(null);
      const live = !!(DB_URL() && DB_TOKEN());
      strings.forEach((s, i) => { const m = memory.get(keyOf(to, s)); if (m) done[i] = m; });
      if (live && done.includes(null)) {
        try { const rows = await db(strings.map(s => ['GET', keyOf(to, s)])); rows.forEach((r, i) => { if (!done[i] && typeof r.result === 'string') done[i] = r.result; }); } catch (e) { /* carry on without the saved copies */ }
      }
      const missing = strings.map((s, i) => (done[i] ? null : i)).filter(i => i !== null);
      if (missing.length) {
        const out = await S.askOpenAI(RULES(S.LANGUAGES[to]) + ' You get a JSON list of texts. Shape: {"t": ["...", "..."]} with exactly the same number of items, in the same order.',
          JSON.stringify(missing.map(i => strings[i])), 3800);
        const t = Array.isArray(out.t) ? out.t : [];
        if (t.length !== missing.length) return res.status(502).json({ error: 'The translator gave an incomplete answer. Please try again.' });
        const save = [];
        missing.forEach((i, n) => {
          const v = String(t[n] || '').slice(0, 2400) || strings[i];
          done[i] = v; memory.set(keyOf(to, strings[i]), v);
          save.push(['SET', keyOf(to, strings[i]), v, 'EX', 180 * 86400]);
        });
        if (memory.size > 4000) memory.clear();
        if (live) db(save).catch(() => {});
      }
      return res.status(200).json({ t: done, to, fresh: missing.length });
    }
    return res.status(400).json({ error: 'Unknown mode.' });
  } catch (e) {
    console.error('translate:', e.message);
    return res.status(502).json({ error: e.code === 'daily-limit' ? 'The translator has reached its limit for today. Please come back tomorrow.' : 'The translator could not answer right now. Please try again. (code: ' + (e.code || e.name || 'unknown') + ')', code: e.code || 'unknown' });
  }
};
module.exports.MAX_TEXT = MAX_TEXT;
